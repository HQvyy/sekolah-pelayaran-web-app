import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ContentService } from './content.service';
import { CurrentUser, RequestUser } from '../auth/current-user.decorator';
import { UploadThrottleGuard } from '../../common/throttle/upload-throttle.guard';
import { CONTENT_RULES } from './content.rules';

interface PngDimensions {
  width: number;
  height: number;
}

// Validasi dimensi tanpa dependensi native: PNG (IHDR) dan JPEG (SOF).
// Lebih dari cukup untuk batas 1920×1080; bukan pemeriksaan malware.
function pngDimensions(buffer: Buffer): PngDimensions | null {
  if (buffer.length < 24) return null;
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < 8; index += 1) {
    if (buffer[index] !== signature[index]) return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function jpegDimensions(buffer: Buffer): PngDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    // SOF0–SOF3, SOF5–SOF15 (tanpa DHT/DAC): berisi dimensi.
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xcf);
    if (isStartOfFrame) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

@ApiTags('content')
@ApiBearerAuth()
@Controller()
export class ThumbnailController {
  constructor(private readonly content: ContentService) {}

  @Post('materials/:materialId/thumbnail')
  @HttpCode(HttpStatus.OK)
  @UseGuards(UploadThrottleGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: CONTENT_RULES.THUMBNAIL_MAX_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Unggah thumbnail JPG/PNG ≤2 MB, ≤1920×1080 (manager)',
  })
  async upload(
    @CurrentUser() actor: RequestUser,
    @Param('materialId') materialId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() _body: Record<string, unknown>,
  ) {
    void _body;
    if (!file) throw new BadRequestException('Berkas thumbnail wajib diunggah.');
    if (!CONTENT_RULES.THUMBNAIL_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Thumbnail harus JPG atau PNG.');
    }
    const dimensions =
      file.mimetype === 'image/png'
        ? pngDimensions(file.buffer)
        : jpegDimensions(file.buffer);
    if (!dimensions) {
      throw new BadRequestException('Berkas gambar tidak dapat dibaca.');
    }
    if (
      dimensions.width > CONTENT_RULES.THUMBNAIL_MAX_WIDTH ||
      dimensions.height > CONTENT_RULES.THUMBNAIL_MAX_HEIGHT
    ) {
      throw new BadRequestException(
        `Dimensi maksimal ${CONTENT_RULES.THUMBNAIL_MAX_WIDTH}x${CONTENT_RULES.THUMBNAIL_MAX_HEIGHT}.`,
      );
    }
    // Path internal — file fisik ditangani storage lokal Tahap 4
    // (object storage menunggu keputusan infra; lihat README).
    const safeName = `${materialId}-${Date.now()}.${file.mimetype === 'image/png' ? 'png' : 'jpg'}`;
    const stored = await this.content.setThumbnail(
      actor,
      materialId,
      `thumbnails/${safeName}`,
    );
    return {
      data: {
        materialId: stored.id,
        thumbnailPath: stored.thumbnailPath,
        width: dimensions.width,
        height: dimensions.height,
        scanStatus: CONTENT_RULES.SCAN_STATUS,
      },
      meta: null,
    };
  }
}
