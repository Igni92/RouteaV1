/**
 * Drivers Controller — CRUD + GPS + Rating
 * AGENT-BACKEND-API
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ConflictError, BusinessRuleError, AppError } from '../../middleware/errorHandler';
import type { CreateDriverInput, UpsertDriverRatingInput } from '../../../../shared/types';

export const driversController = {
  /**
   * GET /api/drivers
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { is_active, page = '1', per_page = '20' } = req.query as Record<string, string>;
      const companyId = req.user!.company_id;

      console.log(`[DRIVERS] List drivers for company ${companyId}`);

      // TODO (AGENT-DATABASE): query drivers
      // const { data, total } = await db.drivers.findAll({ company_id: companyId, is_active, page, per_page });
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
   * POST /api/drivers
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.company_id;
      const input = req.body as CreateDriverInput;

      console.log(`[DRIVERS] Create driver: ${input.name}`);

      // TODO (AGENT-DATABASE): check unique phone + license_number, insert driver
      const stubDriver = {
        id: crypto.randomUUID(),
        company_id: companyId,
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        vehicle_id: input.vehicle_id ?? null,
        license_number: input.license_number,
        rating: 0,
        rgpd_consent: input.rgpd_consent ?? false,
        rgpd_consent_at: input.rgpd_consent ? new Date().toISOString() : null,
        fcm_token: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      res.status(201).json({ success: true, data: stubDriver });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/drivers/:id
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;

      console.log(`[DRIVERS] Get driver ${id}`);

      // TODO (AGENT-DATABASE): fetch driver
      throw new NotFoundError('Driver');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/drivers/:id/rating
   */
  async submitRating(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;
      const input = req.body as UpsertDriverRatingInput;

      console.log(`[DRIVERS] Submit rating for driver ${id}`);

      // Validate score ranges
      const scores = [input.efficiency_score, input.punctuality_score, input.time_at_site_score, input.incident_score];
      for (const score of scores) {
        if (score < 1 || score > 5) {
          throw new AppError(400, 'All scores must be between 1 and 5', 'VALIDATION_ERROR');
        }
      }

      // TODO (AGENT-DATABASE): check delivery exists + belongs to driver, upsert rating, recalculate avg
      // const avgRating = (efficiency + punctuality + time_at_site + incident) / 4;
      // await db.drivers.updateRating(id, avgRating);

      const avgRating =
        (input.efficiency_score + input.punctuality_score +
          input.time_at_site_score + input.incident_score) / 4;

      const stubRating = {
        id: crypto.randomUUID(),
        delivery_id: input.delivery_id,
        driver_id: id,
        efficiency_score: input.efficiency_score,
        punctuality_score: input.punctuality_score,
        time_at_site_score: input.time_at_site_score,
        incident_score: input.incident_score,
        manager_override: false,
        notes: input.notes ?? null,
        rated_at: new Date().toISOString(),
      };

      res.status(201).json({
        success: true,
        data: {
          rating: stubRating,
          new_average: Math.round(avgRating * 100) / 100,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
