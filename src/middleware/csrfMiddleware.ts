import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from '@utils/errorHandler';

/**
 * CSRF Protection Middleware
 * 
 * This module provides CSRF protection using the double submit cookie pattern:
 * 1. A CSRF token is generated and set as both a cookie and returned in the response
 * 2. Frontend must include this token in subsequent requests as a header
 * 3. Middleware validates that the token in the header matches the cookie
 * 
 * Security features:
 * - Uses cryptographically secure random tokens
 * - Implements double submit cookie pattern
 * - Provides protection against CSRF attacks
 */

// Generate a cryptographically secure random token
const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to generate and set CSRF token
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const setCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  // Generate new token
  const csrfToken = generateCsrfToken();
  
  // Set as cookie
  res.cookie('csrf-token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Also attach to response for frontend to access
  res.locals.csrfToken = csrfToken;
  
  next();
};

/**
 * Middleware to validate CSRF token
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Skip validation for GET, HEAD, OPTIONS requests as they should be safe
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }
    
    // Get token from header and cookie
    const tokenFromHeader = req.headers['x-csrf-token'] as string;
    const tokenFromCookie = req.cookies['csrf-token'];
    
    // Validate tokens exist and match
    if (!tokenFromHeader || !tokenFromCookie) {
      throw new AppError('CSRF token missing', 403);
    }
    
    if (tokenFromHeader !== tokenFromCookie) {
      throw new AppError('CSRF token invalid', 403);
    }
    
    next();
  } catch (error) {
    next(error);
  }
}; 