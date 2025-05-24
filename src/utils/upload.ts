import multer from "multer";

const storage = multer.memoryStorage();

export const makeSingleUploadMiddleware = (field: string) =>
  multer({ storage }).single(field);
