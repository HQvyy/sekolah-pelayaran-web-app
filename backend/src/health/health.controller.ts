import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from '../common/envelope';

// Liveness: proses aplikasi hidup. Tanpa dependency eksternal,
// tanpa data sensitif.
@ApiTags('operational')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Liveness check aplikasi' })
  health() {
    return ok({
      status: 'ok',
      time: new Date().toISOString(),
    });
  }
}
