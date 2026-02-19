/**
 * Rate Limiting Middleware — GERVIFRAIS
 * AGENT-BACKEND-API
 *
 * Simple in-memory rate limiter for auth endpoints.
 * For production, replace with Redis-backed rate limiting (e.g., rate-limiter-flexible).
 */

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

function getKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Factory: creates a rate limiter middleware.
 *
 * @param maxRequests   max requests per window
 * @param windowMs      window size in milliseconds
 * @param message       error message
 */
export function rateLimit(
  maxRequests: number,
  windowMs: number,
  message = 'Too many requests — please try again later',
) {
  // Clean up expired entries periodically
  setInterval(cleanupExpired, windowMs).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = getKey(req);
    const now = Date.now();

    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    existing.count += 1;

    if (existing.count > maxRequests) {
      const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after_seconds: retryAfter,
      });
      return;
    }

    next();
  };
}

/** Pre-built: strict limiter for auth endpoints (5 req / 15 min) */
export const authRateLimit = rateLimit(
  5,
  15 * 60 * 1000,
  'Too many login attempts — please wait 15 minutes',
);

/** Pre-built: standard API limiter (100 req / min) */
export const apiRateLimit = rateLimit(100, 60 * 1000);

/** Pre-built: GPS update limiter (600 req / min — one per 100ms per IP) */
export const gpsRateLimit = rateLimit(600, 60 * 1000);
