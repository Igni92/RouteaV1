/**
 * Deliveries Controller — CRUD + Events + Proof
 * AGENT-BACKEND-API
 */

import { Request, Response, NextFunction } from 'express';
import { NotFoundError, BusinessRuleError, AppError } from '../../middleware/errorHandler';
import { DeliveryProofService } from '../../services/deliveryProofService';
import { NotificationService } from '../../services/notificationService';
import type { CreateDeliveryInput, CreateDeliveryEventInput } from '../../../../shared/types';

const proofService = new DeliveryProofService();
const notificationService = new NotificationService();

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['assigned'],
  assigned: ['in_route'],
  in_route: ['arrived'],
  arrived: ['completed', 'failed'],
  completed: [],
  failed: [],
};

export const deliveriesController = {
  /**
   * GET /api/deliveries
   */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        route_id, status, date,
        page = '1', per_page = '50',
      } = req.query as Record<string, string>;
      const companyId = req.user!.company_id;

      console.log(`[DELIVERIES] List for company ${companyId}`, { route_id, status, date });

      // TODO (AGENT-DATABASE): query with reception_windows joined
      // const { data, total } = await db.deliveries.findAll({ company_id: companyId, ...filters });
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
   * POST /api/deliveries
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.company_id;
      const input = req.body as CreateDeliveryInput;

      console.log(`[DELIVERIES] Create for company ${companyId}`, input);

      // Business rule: client_deadline must not be before open_time
      // TODO (AGENT-DATABASE): fetch reception_window and validate
      // const window = await db.receptionWindows.findById(input.reception_window_id, companyId);
      // if (!window) throw new NotFoundError('ReceptionWindow');
      // if (timeToMinutes(input.client_deadline) < timeToMinutes(window.open_time)) {
      //   throw new BusinessRuleError('client_deadline cannot be before reception window open_time');
      // }

      // TODO: insert delivery into DB
      const stubDelivery = {
        id: crypto.randomUUID(),
        company_id: companyId,
        ...input,
        status: 'pending',
        weight_kg: input.weight_kg ?? null,
        estimated_time_at_site: input.estimated_time_at_site ?? 15,
        priority: input.priority ?? 3,
        notes: input.notes ?? null,
        order_id: input.order_id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      res.status(201).json({ success: true, data: stubDelivery });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /api/deliveries/:id
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;

      console.log(`[DELIVERIES] Update ${id}`, req.body);

      // TODO (AGENT-DATABASE): update delivery (only if status is pending/assigned)
      throw new NotFoundError('Delivery');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deliveries/:id/events
   */
  async createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;
      const input = req.body as CreateDeliveryEventInput;

      console.log(`[DELIVERIES] Event for delivery ${id}: ${input.event_type}`);

      // TODO (AGENT-DATABASE): validate delivery exists, check status transition
      // const delivery = await db.deliveries.findById(id, companyId);
      // if (!delivery) throw new NotFoundError('Delivery');

      // Validate status transition
      // const currentStatus = delivery.status;
      // const newStatus = eventToStatus(input.event_type);
      // if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      //   throw new BusinessRuleError(`Invalid status transition: ${currentStatus} → ${newStatus}`);
      // }

      // Insert event and update delivery status
      // const event = await db.deliveryEvents.create({ ...input, delivery_id: id });
      // await db.deliveries.updateStatus(id, newStatus);

      // Trigger notifications for incidents/delays
      if (input.event_type === 'problem') {
        // TODO: get manager FCM tokens and driver name
        // await notificationService.notifyIncident(managerTokens, driverName, storeName, input.notes ?? '', id);
        console.log('[DELIVERIES] Incident notification triggered (stub)');
      }

      // TODO: broadcast WsDeliveryUpdate via GPSTrackingService
      const stubEvent = {
        id: crypto.randomUUID(),
        delivery_id: id,
        driver_id: input.driver_id,
        route_id: input.route_id ?? null,
        event_type: input.event_type,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        notes: input.notes ?? null,
        timestamp: input.timestamp ?? new Date().toISOString(),
      };

      res.status(201).json({ success: true, data: stubEvent });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/deliveries/:id/proof
   * Handles multipart/form-data with up to 2 photos
   */
  async uploadProof(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.company_id;
      const { driver_id } = req.body as { driver_id: string };

      if (!driver_id) {
        throw new AppError(400, 'driver_id is required', 'VALIDATION_ERROR');
      }

      // Access uploaded files from multer
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      if (!files || (!files['photo_marchandise'] && !files['photo_bl_tamonne'])) {
        throw new AppError(400, 'At least one photo is required', 'VALIDATION_ERROR');
      }

      const photosInput: Parameters<DeliveryProofService['uploadProofPhotos']>[2] = {};

      if (files['photo_marchandise']?.[0]) {
        const f = files['photo_marchandise'][0];
        photosInput.marchandise = {
          buffer: f.buffer,
          mimeType: f.mimetype,
          size: f.size,
        };
      }

      if (files['photo_bl_tamonne']?.[0]) {
        const f = files['photo_bl_tamonne'][0];
        photosInput.bl_tamonne = {
          buffer: f.buffer,
          mimeType: f.mimetype,
          size: f.size,
        };
      }

      console.log(`[DELIVERIES] Uploading proof for delivery ${id}`);
      const uploadResult = await proofService.uploadProofPhotos(id, driver_id, photosInput);

      // TODO (AGENT-DATABASE): upsert delivery_proofs record
      // await db.deliveryProofs.upsert(uploadResult.delivery_proof_input);

      res.status(201).json({
        success: true,
        data: {
          delivery_proof: uploadResult.delivery_proof_input,
          photo_marchandise_url: uploadResult.delivery_proof_input.photo_marchandise_url ?? null,
          photo_bl_tamonne_url: uploadResult.delivery_proof_input.photo_bl_tamonne_url ?? null,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
