import { Request, Response, NextFunction } from 'express';
import { prisma } from '@libs/prisma';
import { AppError } from '@utils/errorHandler';
import {
  generateAccessToken,
  TokenPayload
} from '@utils/jwtUtils';
import * as tokenService from '../services/tokenService';

/**
 * Authentication Controller
 * 
 * This module handles authentication-related operations:
 * - JWT token generation after Google OAuth authentication
 * - Token refresh for continuing sessions
 * - User logout and token revocation
 * - Getting current user information
 * 
 * Implementation follows SOLID principles with single responsibility
 * for each function.
 */

/**
 * Generates JWT tokens after successful Google OAuth authentication
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const handleGoogleAuthSuccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User should be attached by Passport
    if (!req.user || !('id' in req.user)) {
      throw new AppError('Authentication failed', 401);
    }

    const user = req.user as any;

    // Generate token payload
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Generate access token
    const { accessToken, expiresIn } = generateAccessToken(tokenPayload);

    // Generate and store refresh token
    await tokenService.issueRefreshToken(user.id, res);

    // Return tokens
    return res.status(200).json({
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        secondName: user.secondName,
        profilePic: user.profilePic,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refreshes access token using refresh token cookie
 * 
 * Implements token rotation for security - each time a refresh token
 * is used, a new refresh token is issued.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      throw new AppError('Refresh token not provided', 401);
    }

    // Rotate refresh token (validates, deletes old token, issues new token)
    const userId = await tokenService.rotateRefreshToken(refreshToken, res);

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Generate token payload
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    // Generate new access token
    const { accessToken, expiresIn } = generateAccessToken(tokenPayload);

    // Return new access token
    return res.status(200).json({
      accessToken,
      expiresIn
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current authenticated user's information
 * 
 * @param req - Express request object (with user attached by authenticate middleware)
 * @param res - Express response object
 * @param next - Express next function
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User should be attached by authenticate middleware
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }

    // Get user data from database (to get the most up-to-date information)
    const dbUser = await prisma.users.findUnique({
      where: { id: (req.user as any).id }
    });

    if (!dbUser) {
      throw new AppError('User not found', 404);
    }

    // Return user data (excluding sensitive information)
    return res.status(200).json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        secondName: dbUser.secondName,
        profilePic: dbUser.profilePic,
        role: dbUser.role,
        newUser: dbUser.newUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs out a user by invalidating the refresh token
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get refresh token from cookies
    const refreshToken = req.cookies.refreshToken;
    
    // Invalidate refresh token if it exists
    if (refreshToken) {
      await tokenService.invalidateRefreshToken(refreshToken, res);
    } else {
      // Just clear the cookie if no token exists
      tokenService.clearRefreshTokenCookie(res);
    }

    // Return success message
    return res.status(200).json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to clear refresh token cookie
const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth/refresh'
  });
}; 