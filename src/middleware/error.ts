import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";

export default (
  err: AppError,
  req: Request,
  res: Response,
  _: NextFunction
) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      message: err.message,
      appCode: err.appCode,
      details: err.details || null,
    },
  });
};
