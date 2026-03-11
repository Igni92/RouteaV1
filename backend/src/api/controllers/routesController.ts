/**
 * Routes Controller — CRUD + Optimize
 * AGENT-BACKEND-API
 */

import { Request, Response, NextFunction } from 'express';
import { RouteOptimizationService } from '../../services/routeOptimization';
import { NotFoundError, BusinessRuleError, AppError } from '../../middleware/errorHandler';
import type { CreateRouteInput, Route } from '../../../../shared/types';

// Re-used optimization service (stateless, no DB dependency for algorithm)
const optimizationService = new RouteOptimizationService([]);

export const routesController = {
  /**
   * GET /api/routes
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, status, driver_id, page = '1', per_page = '20' } = req.query as Record<string, string>;
      const companyId = req.user!.company_id;

      console.log(`[ROUTES] List routes for company ${companyId}`, { date, status, driver_id });

      // TODO (AGENT-DATABASE): query from DB
      // const { data, total } = await db.routes.findAll({ company_id: companyId, date, status, driver_id, page, per_page });
      res.json({
        success: true,
        data: [],
        total: 0,
        page: parseInt(page),
        per_page: parseInt(per_page),
        has_more: false,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/routes
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.company_id;
      const input = req.body as CreateRouteInput;

      console.log(`[ROUTES] Create route for company ${companyId}`, input);

      // TODO (AGENT-DATABASE): check driver and vehicle belong to company, create route
      // const route = await db.routes.create({ ...input, company_id: companyId });
      const stubRoute: Partial<Route> = {
        id: crypto.randomUUID(),
        company_id: companyId,
        date: input.date,
        driver_id: input.driver_id,
        vehicle_id: input.vehicle_id,
        deliveries_ordered: input.deliveries_ordered ?? [],
        status: 'planned',
        started_at: null,
        completed_at: null,
        estimated_total_km: null,
        estimated_total_minutes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      res.status(201).json({ success: true, data: stubRoute });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/routes/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;

      console.log(`[ROUTES] Get route ${id} for company ${companyId}`);

      // TODO (AGENT-DATABASE): fetch route with driver + vehicle join
      // const route = await db.routes.findByIdWithDetails(id, companyId);
      // if (!route) throw new NotFoundError('Route');
      throw new NotFoundError('Route');
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/routes/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;

      console.log(`[ROUTES] Update route ${id}`, req.body);

      // TODO (AGENT-DATABASE): update route
      // const updated = await db.routes.update(id, companyId, req.body);
      // if (!updated) throw new NotFoundError('Route');
      throw new NotFoundError('Route');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/routes/:id/optimize
   * Calls RouteOptimizationService and updates deliveries_ordered.
   */
  async optimize(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;
      const { delivery_ids, num_drivers = 1 } = req.body as {
        delivery_ids: string[];
        num_drivers?: number;
      };

      if (!Array.isArray(delivery_ids) || delivery_ids.length === 0) {
        throw new AppError(400, 'delivery_ids must be a non-empty array', 'VALIDATION_ERROR');
      }

      console.log(`[ROUTES] Optimize route ${id} with ${delivery_ids.length} deliveries`);

      // TODO (AGENT-DATABASE): fetch deliveries with reception windows joined
      // const deliveries = await db.deliveries.findByIdsWithWindows(delivery_ids, companyId);
      // const result = await optimizationService.optimizeRoutes(deliveries, num_drivers);
      // await db.routes.update(id, companyId, { deliveries_ordered: result.routes[0]?.deliveries_ordered });

      // Stub response
      res.json({
        success: true,
        data: {
          route: { id, deliveries_ordered: delivery_ids },
          optimization_result: {
            feasibility: 'VALID',
            estimated_total_km: 0,
            estimated_total_minutes: 0,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/routes/:id
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;

      console.log(`[ROUTES] Delete route ${id}`);

      // TODO (AGENT-DATABASE): check status before delete
      // const route = await db.routes.findById(id, companyId);
      // if (!route) throw new NotFoundError('Route');
      // if (route.status !== 'planned') throw new BusinessRuleError('Cannot delete a route that is in_progress or completed');
      // await db.routes.delete(id, companyId);

      res.json({ success: true, data: { message: 'Route deleted', id } });
    } catch (err) {
      next(err);
    }
  },
};
