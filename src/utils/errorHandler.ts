export class AppError extends Error {
  statusCode: number;
  appCode: string;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    appCode?: string,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.appCode = appCode || "unknown";
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const parsePrismaError = (err: any): AppError => {
  if (err.name === "ZodError") {
    return new AppError("Validation failed", 400, err.errors);
  }

  // TODO: Add more error codes

  return new AppError(err.message || "Unknown error", 500, err.meta);
};
