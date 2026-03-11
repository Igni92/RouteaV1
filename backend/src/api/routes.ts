/**
 * API Router — Main entry point for all GERVIFRAIS REST endpoints
 * AGENT-BACKEND-API
 *
 * See /docs/API_CONTRACT.md for full endpoint specification.
 */

import { Router } from 'express';
import multer from 'multer';

import { authenticate } from '../middleware/auth';
import { authRateLimit, apiRateLimit } from '../middleware/rateLimit';
import {
  validateLogin,
  validateSignup,
  validateCreateRoute,
  validateOptimizeRoute,
  validateCreateDelivery,
  validateDeliveryEvent,
  validateCreateDriver,
  validateDriverRating,
  validateCreateVehicle,
  validateCreateReceptionWindow,
} from '../middleware/validation';

import { authController } from './controllers/authController';
import { routesController } from './controllers/routesController';
import { deliveriesController } from './controllers/deliveriesController';
import { driversController } from './controllers/driversController';
import { vehiclesController } from './controllers/vehiclesController';

export const apiRouter = Router();

// ── Multer for file uploads (in-memory storage) ───────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  },
});

// ── Status endpoint (no auth) ─────────────────────────────────────────────────

apiRouter.get('/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      service: 'GERVIFRAIS API',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
    },
  });
});

// ── Authentication (no auth required) ────────────────────────────────────────

apiRouter.post('/auth/signup', authRateLimit, validateSignup, authController.signup);
apiRouter.post('/auth/login', authRateLimit, validateLogin, authController.login);
apiRouter.post('/auth/logout', authenticate, authController.logout);

// ── Routes management ─────────────────────────────────────────────────────────

apiRouter.get('/routes', authenticate, apiRateLimit, routesController.list);
apiRouter.post('/routes', authenticate, apiRateLimit, validateCreateRoute, routesController.create);
apiRouter.get('/routes/:id', authenticate, apiRateLimit, routesController.getById);
apiRouter.patch('/routes/:id', authenticate, apiRateLimit, routesController.update);
apiRouter.post('/routes/:id/optimize', authenticate, apiRateLimit, validateOptimizeRoute, routesController.optimize);
apiRouter.delete('/routes/:id', authenticate, apiRateLimit, routesController.delete);

// ── Deliveries ────────────────────────────────────────────────────────────────

apiRouter.get('/deliveries', authenticate, apiRateLimit, deliveriesController.list);
apiRouter.post('/deliveries', authenticate, apiRateLimit, validateCreateDelivery, deliveriesController.create);
apiRouter.patch('/deliveries/:id', authenticate, apiRateLimit, deliveriesController.update);
apiRouter.post(
  '/deliveries/:id/events',
  authenticate,
  apiRateLimit,
  validateDeliveryEvent,
  deliveriesController.createEvent,
);
apiRouter.post(
  '/deliveries/:id/proof',
  authenticate,
  apiRateLimit,
  upload.fields([
    { name: 'photo_marchandise', maxCount: 1 },
    { name: 'photo_bl_tamonne', maxCount: 1 },
  ]),
  deliveriesController.uploadProof,
);

// ── Drivers ───────────────────────────────────────────────────────────────────

apiRouter.get('/drivers', authenticate, apiRateLimit, driversController.list);
apiRouter.post('/drivers', authenticate, apiRateLimit, validateCreateDriver, driversController.create);
apiRouter.get('/drivers/:id', authenticate, apiRateLimit, driversController.getById);
// GPS stream is a WebSocket upgrade — handled in server.ts, not here
apiRouter.post(
  '/drivers/:id/rating',
  authenticate,
  apiRateLimit,
  validateDriverRating,
  driversController.submitRating,
);

// ── Vehicles ──────────────────────────────────────────────────────────────────

apiRouter.get('/vehicles', authenticate, apiRateLimit, vehiclesController.list);
apiRouter.post('/vehicles', authenticate, apiRateLimit, validateCreateVehicle, vehiclesController.create);
apiRouter.patch('/vehicles/:id', authenticate, apiRateLimit, vehiclesController.update);

// ── Dashboard KPIs ────────────────────────────────────────────────────────────

apiRouter.get('/dashboard/kpi', authenticate, apiRateLimit, (_req, res) => {
  // TODO (AGENT-DATABASE): aggregate KPIs from DB
  res.json({
    success: true,
    data: {
      date: new Date().toISOString().slice(0, 10),
      total_deliveries: 0,
      completed: 0,
      in_progress: 0,
      pending: 0,
      failed: 0,
      delayed: 0,
      on_time_rate: 0,
    },
  });
});
