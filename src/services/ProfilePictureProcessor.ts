import sharp, { Sharp } from "sharp";
import { AppError, ErrorAppCode } from "@utils/errorHandler";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_DIMENSION = 1024;
const MIN_DIMENSION = 128;
const OUTPUT_DIMENSION = 128;

function getMimeTypeFromBuffer(buffer: Buffer): string | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer
      .slice(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buffer.slice(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "image/jpeg";
  }
  // WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    buffer.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
    buffer.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))
  ) {
    return "image/webp";
  }
  return null;
}

export class ProfilePictureProcessor {
  static OUTPUT_DIMENSION = OUTPUT_DIMENSION;

  async process(inputBuffer: Buffer): Promise<Buffer> {
    if (inputBuffer.length > MAX_FILE_SIZE) {
      throw new AppError(
        "File size exceeds 3MB limit.",
        400,
        ErrorAppCode.ValidationFailed
      );
    }

    const mimeType = getMimeTypeFromBuffer(inputBuffer);
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new AppError(
        "Unsupported file type. Only PNG, JPEG, and WEBP are allowed.",
        400,
        ErrorAppCode.ValidationFailed
      );
    }

    let image: Sharp;
    try {
      image = sharp(inputBuffer, { failOnError: true });
    } catch {
      throw new AppError(
        "Invalid image format.",
        400,
        ErrorAppCode.ValidationFailed
      );
    }
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new AppError(
        "Image metadata is missing width or height.",
        400,
        ErrorAppCode.ValidationFailed
      );
    }
    if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
      throw new AppError(
        `Image dimensions must not exceed ${MAX_DIMENSION}x${MAX_DIMENSION}.`,
        400,
        ErrorAppCode.ValidationFailed
      );
    }
    if (metadata.width < MIN_DIMENSION || metadata.height < MIN_DIMENSION) {
      throw new AppError(
        `Image dimensions must be at least ${MIN_DIMENSION}x${MIN_DIMENSION}.`,
        400,
        ErrorAppCode.ValidationFailed
      );
    }

    if (metadata.hasAlpha) {
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });
      const channels = info.channels;
      if (channels === 4) {
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] !== 255) {
            // If alpha channel is not fully opaque, convert to RGB
            image = image.removeAlpha();
            break;
          }
        }
      }
    }

    const processedBuffer = await image
      .resize(OUTPUT_DIMENSION, OUTPUT_DIMENSION, { fit: "cover" })
      .jpeg({ quality: 90 })
      .toBuffer();

    if (processedBuffer.length > MAX_FILE_SIZE) {
      throw new AppError(
        "Processed image exceeds 3MB limit.",
        400,
        ErrorAppCode.ValidationFailed
      );
    }

    return processedBuffer;
  }
}
