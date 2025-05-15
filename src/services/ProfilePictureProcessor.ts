import sharp, { Sharp } from 'sharp';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_DIMENSION = 2096;
const MIN_DIMENSION = 128;
const OUTPUT_DIMENSION = 128;

function getMimeTypeFromBuffer(buffer: Buffer): string | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer.slice(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
    return 'image/jpeg';
  }
  // WEBP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    buffer.slice(0, 4).equals(Buffer.from([0x52, 0x49, 0x46, 0x46])) &&
    buffer.slice(8, 12).equals(Buffer.from([0x57, 0x45, 0x42, 0x50]))
  ) {
    return 'image/webp';
  }
  return null;
}

export class ProfilePictureProcessor {
  static OUTPUT_DIMENSION = OUTPUT_DIMENSION;

  async process(inputBuffer: Buffer): Promise<Buffer> {
    if (inputBuffer.length > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 3MB limit.');
    }

    const mimeType = getMimeTypeFromBuffer(inputBuffer);
    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error('Unsupported file type. Only PNG, JPEG, and WEBP are allowed.');
    }

    let image: Sharp;
    try {
      image = sharp(inputBuffer, { failOnError: true });
    } catch {
      throw new Error('Invalid image data.');
    }
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions.');
    }
    if (
      metadata.width > MAX_DIMENSION ||
      metadata.height > MAX_DIMENSION
    ) {
      throw new Error('Image dimensions exceed 2096x2096.');
    }
    if (
      metadata.width < MIN_DIMENSION ||
      metadata.height < MIN_DIMENSION
    ) {
      throw new Error('Image dimensions must be at least 128x128.');
    }

    if (metadata.hasAlpha) {
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
      const channels = info.channels;
      if (channels === 4) {
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] !== 255) {
            throw new Error('Image contains transparent pixels.');
          }
        }
      }
    }

    const processedBuffer = await image
      .resize(OUTPUT_DIMENSION, OUTPUT_DIMENSION, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toBuffer();

    if (processedBuffer.length > MAX_FILE_SIZE) {
      throw new Error('Processed image exceeds 3MB limit.');
    }

    return processedBuffer;
  }
} 