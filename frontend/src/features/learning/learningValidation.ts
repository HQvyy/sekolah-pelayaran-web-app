export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;
export const THUMBNAIL_MAX_WIDTH = 1920;
export const THUMBNAIL_MAX_HEIGHT = 1080;
const THUMBNAIL_TYPES = ["image/jpeg", "image/png"];

export interface ThumbnailValidation {
  ok: boolean;
  message?: string;
}

export function validateThumbnailType(file: File): ThumbnailValidation {
  if (!THUMBNAIL_TYPES.includes(file.type)) {
    return { ok: false, message: "Thumbnail harus JPG atau PNG sesuai PRD." };
  }
  if (file.size > THUMBNAIL_MAX_BYTES) {
    return { ok: false, message: "Ukuran thumbnail maksimal 2 MB sesuai PRD." };
  }
  return { ok: true };
}

export function validateThumbnailDimensions(width: number, height: number): ThumbnailValidation {
  if (width > THUMBNAIL_MAX_WIDTH || height > THUMBNAIL_MAX_HEIGHT) {
    return { ok: false, message: "Dimensi thumbnail maksimal 1920x1080 sesuai PRD." };
  }
  return { ok: true };
}

export function readThumbnailDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const result = { width: image.naturalWidth, height: image.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Berkas thumbnail tidak dapat dibaca."));
    };
    image.src = url;
  });
}

export async function validateThumbnailFile(file: File): Promise<ThumbnailValidation> {
  const basic = validateThumbnailType(file);
  if (!basic.ok) return basic;
  try {
    const dimensions = await readThumbnailDimensions(file);
    return validateThumbnailDimensions(dimensions.width, dimensions.height);
  } catch {
    return { ok: false, message: "Berkas thumbnail tidak valid atau rusak." };
  }
}
