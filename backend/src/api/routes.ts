/**
 * API Router — main entry point for all routes
 * Implemented by AGENT-BACKEND-API
 * See /docs/API_CONTRACT.md for full endpoint specification
 */

import { Router } from 'express';

export const apiRouter = Router();

// TODO (AGENT-BACKEND-API): Import and mount controllers
// import { routesController } from './controllers/routesController';
// import { deliveriesController } from './controllers/deliveriesController';
// import { driversController } from './controllers/driversController';
// import { vehiclesController } from './controllers/vehiclesController';

// Placeholder — AGENT-BACKEND-API will replace this
apiRouter.get('/status', (_req, res) => {
  res.json({
    message: 'GERVIFRAIS API — AGENT-BACKEND-API implementation pending',
    version: '1.0.0',
  });
});

// Route stubs (AGENT-BACKEND-API implements these)
// apiRouter.use('/routes', routesController);
// apiRouter.use('/deliveries', deliveriesController);
// apiRouter.use('/drivers', driversController);
// apiRouter.use('/vehicles', vehiclesController);
