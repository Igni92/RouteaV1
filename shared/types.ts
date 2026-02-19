/**
 * GERVIFRAIS — Shared TypeScript Types
 * IMMUTABLE after creation.
 * Owned by: AGENT-DATABASE
 * Consumed by: backend, frontend-manager, app-driver
 *
 * AGENT-DATABASE will replace this skeleton with the full type definitions
 * derived from the PostgreSQL schema in /docs/DATABASE_SCHEMA.md
 *
 * Version: 0.1.0 (skeleton — awaiting AGENT-DATABASE)
 */

// ── Enums & Unions ────────────────────────────────────────────────────────────

export type UserRole = 'manager' | 'admin';

export type SubscriptionTier = '80_euros' | '150_euros';

export type VehicleStatus = 'active' | 'maintenance' | 'retired';

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'in_route'
  | 'arrived'
  | 'completed'
  | 'failed';

export type RouteStatus = 'planned' | 'in_progress' | 'completed';

export type DeliveryEventType =
  | 'arrived'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'problem';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

// ── Base Entity ───────────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string; // UUID
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

// ── Core Domain Entities ──────────────────────────────────────────────────────
// TODO (AGENT-DATABASE): Replace with full type definitions

export interface Company extends BaseEntity {
  name: string;
  address: string;
  phone: string;
  rgpd_accepted: boolean;
  subscription_tier: SubscriptionTier;
}

export interface User extends BaseEntity {
  email: string;
  company_id: string;
  role: UserRole;
}

export interface Vehicle extends BaseEntity {
  company_id: string;
  registration_plate: string;
  brand: string;
  model: string;
  year: number;
  capacity_kg: number;
  status: VehicleStatus;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
}

export interface Driver extends BaseEntity {
  company_id: string;
  name: string;
  phone: string;
  email: string;
  vehicle_id: string | null;
  license_number: string;
  rating: number; // 0-5
  rgpd_consent: boolean;
}

export interface ReceptionWindow extends BaseEntity {
  company_id: string;
  store_name: string;
  store_address: string;
  store_phone: string;
  store_email: string;
  open_time: string; // "HH:MM"
  close_time: string; // "HH:MM"
  days_of_week: DayOfWeek[];
}

export interface Delivery extends BaseEntity {
  company_id: string;
  order_id: string | null;
  reception_window_id: string;
  client_deadline: string; // "HH:MM"
  address: string;
  latitude: number;
  longitude: number;
  estimated_time_at_site: number; // minutes
  status: DeliveryStatus;
  priority: number; // 1-5
}

export interface Route extends BaseEntity {
  company_id: string;
  date: string; // "YYYY-MM-DD"
  driver_id: string;
  vehicle_id: string;
  deliveries_ordered: string[]; // ordered array of delivery UUIDs
  status: RouteStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface DeliveryEvent {
  id: string;
  delivery_id: string;
  driver_id: string;
  event_type: DeliveryEventType;
  latitude: number;
  longitude: number;
  notes: string | null;
  timestamp: string; // ISO 8601
}

export interface DeliveryProof {
  id: string;
  delivery_id: string;
  photo_marchandise_url: string;
  photo_bl_tamonne_url: string;
  uploaded_at: string;
  synced_at: string | null;
}

export interface DriverRating {
  id: string;
  delivery_id: string;
  driver_id: string;
  efficiency_score: number; // 1-5
  punctuality_score: number; // 1-5
  time_at_site_score: number; // 1-5
  incident_score: number; // 1-5
  notes: string | null;
  rated_at: string;
}

export interface GpsLog {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  accuracy: number; // meters
  speed: number; // km/h
  timestamp: string; // ISO 8601
}

// ── WebSocket Message Types ───────────────────────────────────────────────────

export interface WsDriverLocation {
  type: 'driver_location';
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed: number;
  sequence: number;
  timestamp: string;
}

export interface WsDeliveryUpdate {
  type: 'delivery_update';
  delivery_id: string;
  status: DeliveryStatus;
  timestamp: string;
}

export interface WsNotification {
  type: 'notification';
  level: 'info' | 'warning' | 'error';
  message: string;
  driver_id?: string;
  delivery_id?: string;
  timestamp: string;
}

export type WsMessage = WsDriverLocation | WsDeliveryUpdate | WsNotification;

// ── Algorithm Types ───────────────────────────────────────────────────────────

export interface RouteInput {
  deliveries: Delivery[];
  drivers: Driver[];
  vehicles: Vehicle[];
  date: string;
  depot_lat: number;
  depot_lng: number;
}

export interface OptimizedRoute {
  driver_id: string;
  vehicle_id: string;
  deliveries_ordered: string[]; // UUIDs in visit order
  estimated_total_km: number;
  estimated_total_minutes: number;
}

export type FeasibilityStatus = 'VALID' | 'INVALID';

export interface FeasibilityResult {
  status: FeasibilityStatus;
  errors: FeasibilityError[];
}

export interface FeasibilityError {
  delivery_id: string;
  constraint: 'reception_window' | 'client_deadline' | 'vehicle_capacity';
  message: string;
}

// ── API Response Wrappers ─────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ── Auth Types ────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JwtPayload {
  user_id: string;
  company_id: string;
  role: UserRole;
  iat: number;
  exp: number;
}
