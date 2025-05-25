import rateLimit from "express-rate-limit";
import { AppError, ErrorAppCode } from "@utils/errorHandler";
import { buildErrorResponse } from "@middleware/error";

export const profileUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5, // max uploads per hour
  message: buildErrorResponse(
    new AppError(
      "Too many uploads, please try again later",
      429,
      ErrorAppCode.RateLimitExceeded
    )
  ),
  // Try limit per user, else fallback to IP
  keyGenerator: (req, res) => {
    if (req.user && req.user.id) {
      return String(req.user.id);
    }
    if (req.ip) {
      return req.ip;
    }
    return "unknown";
  },
});
