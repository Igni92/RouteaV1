/**
 * Vehicles Controller — CRUD
 * AGENT-BACKEND-API
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, ConflictError } from '../../middleware/errorHandler';
import type { CreateVehicleInput } from '../../../../shared/types';

export const vehiclesController = {
  /**
   * GET /api/vehicles
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.query as Record<string, string>;
      const companyId = req.user!.company_id;

      console.log(`[VEHICLES] List for company ${companyId}`, { status });

      // TODO (AGENT-DATABASE): query vehicles
      res.json({ success: true, data: [] });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/vehicles
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.company_id;
      const input = req.body as CreateVehicleInput;

      console.log(`[VEHICLES] Create: ${input.registration_plate}`);

      // TODO (AGENT-DATABASE): check unique registration_plate, insert
      const stubVehicle = {
        id: crypto.randomUUID(),
        company_id: companyId,
        registration_plate: input.registration_plate,
        brand: input.brand,
        model: input.model,
        year: input.year,
        capacity_kg: input.capacity_kg,
        status: input.status ?? 'active',
        last_maintenance_date: input.last_maintenance_date ?? null,
        next_maintenance_date: input.next_maintenance_date ?? null,
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      res.status(201).json({ success: true, data: stubVehicle });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/vehicles/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;

      console.log(`[VEHICLES] Update ${id}`, req.body);

      // TODO (AGENT-DATABASE): update vehicle
      throw new NotFoundError('Vehicle');
    } catch (err) {
      next(err);
    }
  },
};
