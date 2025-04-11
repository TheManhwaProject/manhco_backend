import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { AppError } from './errorHandler';

/**
 * JWT Authentication Utilities
 * 
 * This module handles all JWT-related functionality including:
 * - Access token generation (30 minute lifespan)
 * - Refresh token generation (30 day lifespan)
 * - Token verification
 * - Token refresh with rotation for security
 * 
 * Security features:
 * - Tokens contain minimal required data
 * - Refresh tokens are stored as HttpOnly cookies
 * - Implementation follows OWASP security guidelines
 */

// Token expiration times (in seconds)
const ACCESS_TOKEN_EXPIRES_IN = 30 * 60; // 30 minutes
const REFRESH_TOKEN_EXPIRES_IN = 30 * 24 * 60 * 60; // 30 days

// Interfaces for token payloads
export interface TokenPayload {
  userId: number;
  email: string;
  role?: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Generates an access token containing user information
 * 
 * @param payload - User information to include in the token
 * @returns Access token and expiration data
 */
export const generateAccessToken = (payload: TokenPayload): TokenResponse => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new AppError('JWT access secret not configured', 500);
  }

  const token = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  return {
    accessToken: token,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN
  };
};

/**
 * Generates a refresh token for token rotation
 * 
 * @param userId - User ID to associate with the refresh token
 * @returns Refresh token string
 */
export const generateRefreshToken = (userId: number): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new AppError('JWT refresh secret not configured', 500);
  }

  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

/**
 * Sets a refresh token as an HttpOnly cookie
 * 
 * @param res - Express response object
 * @param token - Refresh token to set
 */
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_EXPIRES_IN * 1000, // Convert to milliseconds
    path: '/api/v1/auth/refresh'
  });
};

/**
 * Verifies an access token and returns the decoded payload
 * 
 * @param token - Access token to verify
 * @returns Decoded token payload
 * @throws AppError if token is invalid
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new AppError('JWT access secret not configured', 500);
  }

  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token expired', 401);
    }
    throw new AppError('Invalid access token', 401);
  }
};

/**
 * Verifies a refresh token and returns the user ID
 * 
 * @param token - Refresh token to verify
 * @returns User ID from the token
 * @throws AppError if token is invalid
 */
export const verifyRefreshToken = (token: string): number => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new AppError('JWT refresh secret not configured', 500);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET) as { userId: number };
    return decoded.userId;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expired', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }
};

/**
 * Clears the refresh token cookie
 * 
 * @param res - Express response object
 */
export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh'
  });
}; 