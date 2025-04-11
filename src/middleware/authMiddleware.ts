import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '@utils/jwtUtils';
import { AppError } from '@utils/errorHandler';
import { isRoleAllowed } from '@utils/roleUtils';

/**
 * Authentication Middleware
 * 
 * This module provides middleware functions for:
 * - Protecting routes from unauthorized access
 * - Verifying user roles for access control including role hierarchy
 * - Extracting user information from JWT tokens
 * 
 * Implementation follows SOLID principles with single responsibility
 * for each middleware function.
 */

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware to protect routes requiring authentication
 * 
 * Verifies the JWT in the Authorization header and attaches
 * the decoded user information to the request object.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authorization header missing or invalid', 401);
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const decodedToken = verifyAccessToken(token);
    
    // Attach user info to request
    req.user = decodedToken;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory function to create middleware for exact role-based access control
 * 
 * This middleware only grants access if the user has one of the exact specified roles.
 * It does not consider role hierarchy.
 * 
 * @param roles - Array of roles allowed to access the route
 * @returns Middleware function for exact role verification
 */
export const requireExactRoles = (roles: string[]): (req: Request, res: Response, next: NextFunction) => void => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Must be used after authenticate middleware
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Check if user has any of the required roles
      if (!req.user.role || !roles.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Factory function to create middleware for hierarchical role-based access control
 * 
 * This middleware grants access if the user has one of the specified roles
 * OR any role with higher priority in the hierarchy.
 * 
 * @param roles - Array of minimum roles allowed to access the route
 * @returns Middleware function for hierarchical role verification
 */
export const requireRoles = (roles: string[]): (req: Request, res: Response, next: NextFunction) => void => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Must be used after authenticate middleware
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      // Check if user has required role or higher
      if (!req.user.role || !isRoleAllowed(req.user.role, roles, true)) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Optional authentication middleware
 * 
 * Attempts to authenticate the user but continues even if authentication fails.
 * Useful for routes that can be accessed by both authenticated and unauthenticated users.
 * 
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authenticating
    }

    // Extract and verify token
    const token = authHeader.split(' ')[1];
    const decodedToken = verifyAccessToken(token);
    
    // Attach user info to request
    req.user = decodedToken;
    next();
  } catch (error) {
    // Continue without authenticating if token is invalid
    next();
  }
}; 