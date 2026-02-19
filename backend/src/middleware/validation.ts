/**
 * Input Validation Middleware — GERVIFRAIS
 * AGENT-BACKEND-API
 *
 * Lightweight schema validation using pure TypeScript.
 * No external validation library to keep dependencies minimal.
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

// ── Validation helpers ────────────────────────────────────────────────────────

export function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ── Validation schema type ────────────────────────────────────────────────────

type FieldRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: unknown) => string | null;  // return error string or null
};

type Schema = Record<string, FieldRule>;

function validateSchema(body: Record<string, unknown>, schema: Schema): string[] {
  const errors: string[] = [];

  for (const [field, rule] of Object.entries(schema)) {
    const value = body[field];
    const missing = value === undefined || value === null || value === '';

    if (rule.required && missing) {
      errors.push(`${field} is required`);
      continue;
    }

    if (missing) continue; // optional field not provided — skip

    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${field} must be a ${rule.type}`);
        continue;
      }
    }

    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
      }
    }

    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be >= ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must be <= ${rule.max}`);
      }
    }

    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) errors.push(customError);
    }
  }

  return errors;
}

// ── Validation middleware factory ─────────────────────────────────────────────

export function validate(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors = validateSchema(req.body as Record<string, unknown>, schema);
    if (errors.length > 0) {
      next(new ValidationError(errors));
      return;
    }
    next();
  };
}

// ── Pre-built validators for common endpoints ─────────────────────────────────

export const validateLogin = validate({
  email: { required: true, type: 'string', custom: (v) => isValidEmail(v as string) ? null : 'email is invalid' },
  password: { required: true, type: 'string', minLength: 8 },
});

export const validateSignup = validate({
  email: { required: true, type: 'string', custom: (v) => isValidEmail(v as string) ? null : 'email is invalid' },
  password: { required: true, type: 'string', minLength: 8 },
  company_id: { required: true, type: 'string', custom: (v) => isValidUUID(v as string) ? null : 'company_id must be a valid UUID' },
  role: { type: 'string', enum: ['manager', 'admin'] },
});

export const validateCreateRoute = validate({
  date: { required: true, type: 'string', custom: (v) => isValidDate(v as string) ? null : 'date must be YYYY-MM-DD' },
  driver_id: { required: true, type: 'string', custom: (v) => isValidUUID(v as string) ? null : 'driver_id must be a valid UUID' },
  vehicle_id: { required: true, type: 'string', custom: (v) => isValidUUID(v as string) ? null : 'vehicle_id must be a valid UUID' },
});

export const validateOptimizeRoute = validate({
  delivery_ids: { required: true, type: 'array' },
  num_drivers: { type: 'number', min: 1 },
});

export const validateCreateDelivery = validate({
  reception_window_id: { required: true, type: 'string', custom: (v) => isValidUUID(v as string) ? null : 'reception_window_id must be a UUID' },
  client_deadline: { required: true, type: 'string', custom: (v) => isValidTime(v as string) ? null : 'client_deadline must be HH:MM' },
  address: { required: true, type: 'string', minLength: 5 },
  latitude: { required: true, type: 'number', min: -90, max: 90 },
  longitude: { required: true, type: 'number', min: -180, max: 180 },
  weight_kg: { type: 'number', min: 0 },
  estimated_time_at_site: { type: 'number', min: 1 },
  priority: { type: 'number', min: 1, max: 5 },
});

export const validateDeliveryEvent = validate({
  event_type: {
    required: true,
    type: 'string',
    enum: ['departed', 'arrived', 'completed', 'failed', 'delayed', 'problem'],
  },
  driver_id: { required: true, type: 'string', custom: (v) => isValidUUID(v as string) ? null : 'driver_id must be a UUID' },
  latitude: { type: 'number', min: -90, max: 90 },
  longitude: { type: 'number', min: -180, max: 180 },
});

export const validateCreateDriver = validate({
  name: { required: true, type: 'string', minLength: 2 },
  phone: { required: true, type: 'string', minLength: 8 },
  license_number: { required: true, type: 'string', minLength: 5 },
  email: { type: 'string', custom: (v) => !v || isValidEmail(v as string) ? null : 'email is invalid' },
  vehicle_id: { type: 'string', custom: (v) => !v || isValidUUID(v as string) ? null : 'vehicle_id must be a UUID' },
});

export const validateDriverRating = validate({
  delivery_id: { required: true, type: 'string', custom: (v) => isValidUUID(v as string) ? null : 'delivery_id must be a UUID' },
  efficiency_score: { required: true, type: 'number', min: 1, max: 5 },
  punctuality_score: { required: true, type: 'number', min: 1, max: 5 },
  time_at_site_score: { required: true, type: 'number', min: 1, max: 5 },
  incident_score: { required: true, type: 'number', min: 1, max: 5 },
});

export const validateCreateVehicle = validate({
  registration_plate: { required: true, type: 'string', minLength: 2 },
  brand: { required: true, type: 'string', minLength: 2 },
  model: { required: true, type: 'string', minLength: 1 },
  year: { required: true, type: 'number', min: 1990, max: 2030 },
  capacity_kg: { required: true, type: 'number', min: 1 },
  status: { type: 'string', enum: ['active', 'maintenance', 'retired'] },
});

export const validateCreateReceptionWindow = validate({
  store_name: { required: true, type: 'string', minLength: 2 },
  store_address: { required: true, type: 'string', minLength: 5 },
  store_lat: { required: true, type: 'number', min: -90, max: 90 },
  store_lng: { required: true, type: 'number', min: -180, max: 180 },
  open_time: { required: true, type: 'string', custom: (v) => isValidTime(v as string) ? null : 'open_time must be HH:MM' },
  close_time: { required: true, type: 'string', custom: (v) => isValidTime(v as string) ? null : 'close_time must be HH:MM' },
  days_of_week: { required: true, type: 'array' },
});
