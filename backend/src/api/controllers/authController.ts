/**
 * Auth Controller — Login, Signup, Logout
 * AGENT-BACKEND-API
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { env } from '../../config/env';
import { AppError, ConflictError, NotFoundError } from '../../middleware/errorHandler';
import type { LoginRequest, LoginResponse, AuthTokens, JwtPayload } from '../../../../shared/types';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '1h';
const REFRESH_TOKEN_TTL = '7d';
const ACCESS_EXPIRES_IN = 3600; // seconds

function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp'>): AuthTokens {
  const access_token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refresh_token = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
  return {
    access_token,
    refresh_token,
    expires_in: ACCESS_EXPIRES_IN,
    token_type: 'Bearer',
  };
}

export const authController = {
  /**
   * POST /api/auth/signup
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, company_id, role = 'manager', fcm_token } = req.body as {
        email: string;
        password: string;
        company_id: string;
        role?: 'manager' | 'admin';
        fcm_token?: string;
      };

      console.log(`[AUTH] Signup attempt: ${email}`);

      // TODO (AGENT-DATABASE): check if email already exists via db.users.findByEmail(email)
      // For now, stub — real implementation needs DB models
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      // TODO (AGENT-DATABASE): create user in DB
      // const user = await db.users.create({ email, password_hash, company_id, role, fcm_token });
      const stubUser = {
        id: crypto.randomUUID(),
        email,
        company_id,
        role,
        fcm_token: fcm_token ?? null,
        last_login_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const tokens = generateTokens({
        user_id: stubUser.id,
        company_id: stubUser.company_id,
        role: stubUser.role,
        email: stubUser.email,
      });

      console.log(`[AUTH] User created: ${stubUser.id}`);
      res.status(201).json({ success: true, data: { user: stubUser, tokens } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      console.log(`[AUTH] Login attempt: ${email}`);

      // TODO (AGENT-DATABASE): fetch user from DB
      // const user = await db.users.findByEmail(email);
      // if (!user) throw new AppError(401, 'Invalid credentials', 'AUTH_INVALID');
      // const valid = await bcrypt.compare(password, user.password_hash);
      // if (!valid) throw new AppError(401, 'Invalid credentials', 'AUTH_INVALID');

      // Stub response for now — real DB integration pending AGENT-DATABASE
      throw new AppError(501, 'DB integration pending — AGENT-DATABASE required', 'NOT_IMPLEMENTED');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a stateless JWT system, logout is handled client-side by discarding the token.
      // For server-side invalidation, maintain a token blocklist in Redis.
      // TODO: add token to Redis blocklist
      console.log(`[AUTH] Logout: user ${req.user?.user_id}`);
      res.json({ success: true, data: { message: 'Logged out successfully' } });
    } catch (err) {
      next(err);
    }
  },
};
