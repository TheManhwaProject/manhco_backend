import { prisma } from "@libs/prisma";
import { generateRefreshToken, setRefreshTokenCookie } from "@utils/jwtUtils";
import { Response } from "express";
import { AppError, ErrorAppCode } from "@utils/errorHandler";

/**
 * Token Service
 *
 * This service handles refresh token management including:
 * - Storage of refresh tokens in the database
 * - Token rotation for security
 * - Cleanup of expired tokens
 *
 * Implements security best practices:
 * - One user can have multiple valid refresh tokens (multiple devices)
 * - Tokens are rotated whenever used for security
 * - Expired tokens are automatically cleaned up
 * - Tokens are invalidated on logout
 */

const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Stores a refresh token in the database
 *
 * @param userId - User ID associated with the token
 * @param token - Refresh token string
 * @returns Created refresh token record
 */
export const storeRefreshToken = async (userId: number, token: string) => {
  // Calculate expiration date (30 days from now)
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + REFRESH_TOKEN_EXPIRES_IN);

  // Store token in database
  return await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });
};

/**
 * Issues a new refresh token for a user and sets it as an HTTP-only cookie
 *
 * @param userId - User ID to issue token for
 * @param res - Express response object to set cookie on
 * @returns Stored refresh token record
 */
export const issueRefreshToken = async (userId: number, res: Response) => {
  // Generate new refresh token
  const token = generateRefreshToken(userId);

  // Store token in database
  const storedToken = await storeRefreshToken(userId, token);

  // Set token as HttpOnly cookie
  setRefreshTokenCookie(res, token);

  return storedToken;
};

/**
 * Rotates a refresh token for security
 *
 * @param oldToken - Existing refresh token to rotate
 * @param res - Express response object to set new cookie on
 * @returns User ID associated with the token
 */
export const rotateRefreshToken = async (oldToken: string, res: Response) => {
  // Find token in database
  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
  });

  if (!tokenRecord) {
    throw new AppError("Invalid refresh token", 401, ErrorAppCode.Unauthorised);
  }

  // Check if token is expired
  if (new Date() > tokenRecord.expiresAt) {
    // Delete expired token
    await prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });
    throw new AppError("Refresh token expired", 401, ErrorAppCode.Unauthorised);
  }

  // Delete old token for security
  await prisma.refreshToken.delete({
    where: { id: tokenRecord.id },
  });

  // Issue new token
  await issueRefreshToken(tokenRecord.userId, res);

  return tokenRecord.userId;
};

/**
 * Invalidates a refresh token on logout
 *
 * @param token - Refresh token to invalidate
 * @param res - Express response object to clear cookie from
 */
export const invalidateRefreshToken = async (token: string, res: Response) => {
  // Remove token from database
  await prisma.refreshToken.deleteMany({
    where: { token },
  });

  // Clear cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth/refresh",
  });
};

/**
 * Cleans up expired refresh tokens
 */
export const cleanupExpiredTokens = async () => {
  // Remove all expired tokens
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth/refresh",
  });
};
