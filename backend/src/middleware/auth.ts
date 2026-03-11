/**
 * Authentication Middleware — JWT Validation
 * AGENT-BACKEND-API
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../../../shared/types';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Validates the JWT Bearer token in the Authorization header.
 * Attaches the decoded payload to `req.user`.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Missing authorization header',
      code: 'AUTH_MISSING',
    });
    return;
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'AUTH_EXPIRED',
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'AUTH_INVALID',
      });
    }
  }
}

/**
 * Require a specific role.
 * Must be used after `authenticate`.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated', code: 'AUTH_MISSING' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Required role: ${roles.join(' or ')}`,
        code: 'AUTH_FORBIDDEN',
      });
      return;
    }
    next();
  };
}

/**
 * Validate a WebSocket JWT token (used for WS upgrade).
 * Returns the decoded payload or null.
 */
export function validateWsToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
