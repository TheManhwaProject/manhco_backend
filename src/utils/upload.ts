import multer from "multer";
import { AppError, ErrorAppCode } from "@utils/errorHandler";

type UploadOptions = {
  maxSizeMB?: number;
  allowedMimeTypes?: string[];
};

export const makeSingleUploadMiddleware = (
  field: string,
  options: UploadOptions = {}
) => {
  const { maxSizeMB = 5, allowedMimeTypes } = options;

  const storage = multer.memoryStorage();

  const fileFilter = allowedMimeTypes
    ? (req: any, file: Express.Multer.File, cb: any) => {
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new AppError(
              `Invalid file type. Allowed types: ${allowedMimeTypes.join(
                ", "
              )}`,
              400,
              ErrorAppCode.ValidationFailed
            ),
            false
          );
        }
      }
    : undefined;

  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter,
  }).single(field);
};
