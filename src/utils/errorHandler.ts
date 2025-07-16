// type for appcodes
export enum ErrorAppCode {
  Unknown = "unknown",
  ServerError = "server_error",
  ValidationFailed = "validation_failed",
  UserNotFound = "user_not_found",
  UserAlreadyExists = "user_already_exists",
  MissingNSFWPolicy = "missing_nsfw_policy",
  CountryBanned = "country_banned",
  CountryLimited = "country_limited",
  BirthdayRequired = "birthday_required",
  Underage = "underage",
  Unauthorised = "unauthorised",
  InsufficientPermissions = "insufficient_permissions",
  BadInput = "bad_input",
  
  // Manhwa-specific errors
  ManhwaNotFound = "manhwa_not_found",
  ManhwaSearchFailed = "manhwa_search_failed",
  ExternalApiError = "external_api_error",
  RateLimitExceeded = "rate_limit_exceeded",
  InvalidManhwaData = "invalid_manhwa_data",
  SyncFailed = "sync_failed",
  ImageProcessingFailed = "image_processing_failed",
  ContentFilterRequired = "content_filter_required", // For adult content
  PaginationLimitExceeded = "pagination_limit_exceeded", // For 10k limit
  InvalidContent = "invalid_content", // For non-Korean content
}

export class AppError extends Error {
  statusCode: number;
  appCode: ErrorAppCode;
  details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    appCode: ErrorAppCode,
    details?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.appCode = appCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const parsePrismaError = (err: any): AppError => {
  if (err.name === "ZodError") {
    return new AppError("Validation failed", 400, ErrorAppCode.BadInput);
  }

  // TODO: Add more error codes

  return new AppError(err.message || "Unknown error", 500, err.meta);
};

/**
 * Convert a string to an ErrorAppCode enum value
 */
function toAppCode(value: string): ErrorAppCode | null {
  if (value in ErrorAppCode) {
    return ErrorAppCode[value as keyof typeof ErrorAppCode];
  }
  return null;
}
