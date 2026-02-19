/**
 * GERVIFRAIS — Shared TypeScript Types
 * IMMUTABLE — Created by AGENT-DATABASE
 * Consumed by: backend, frontend-manager, app-driver
 *
 * These types are derived 1:1 from /backend/src/db/schema.sql
 * Do not modify — if schema changes, AGENT-DATABASE must issue a new version.
 *
 * Version: 1.0.0
 */

// =============================================================================
// Enums & Union Types
// =============================================================================

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

/** Matches CHECK constraint in delivery_events table */
export type DeliveryEventType =
  | 'departed'
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

// =============================================================================
// Base Entity
// =============================================================================

export interface BaseEntity {
  id: string;          // UUID v4
  created_at: string;  // ISO 8601 (TIMESTAMPTZ)
  updated_at: string;  // ISO 8601 (TIMESTAMPTZ)
}

// =============================================================================
// Table 1: company
// =============================================================================
export interface Company extends BaseEntity {
  name: string;
  address: string;
  phone: string;
  rgpd_accepted: boolean;
  rgpd_accepted_at: string | null;  // ISO 8601
  subscription_tier: SubscriptionTier;
}

export interface CreateCompanyInput {
  name: string;
  address: string;
  phone: string;
  rgpd_accepted?: boolean;
  subscription_tier?: SubscriptionTier;
}

// =============================================================================
// Table 2: users  (managers / admins — password_hash excluded from type)
// =============================================================================
export interface User extends BaseEntity {
  email: string;
  company_id: string;
  role: UserRole;
  fcm_token: string | null;
  last_login_at: string | null;  // ISO 8601
}

export interface CreateUserInput {
  email: string;
  password: string;   // plain — hashed before DB insert
  company_id: string;
  role?: UserRole;
}

// =============================================================================
// Table 3: vehicles
// =============================================================================
export interface Vehicle extends BaseEntity {
  company_id: string;
  registration_plate: string;
  brand: string;
  model: string;
  year: number;
  capacity_kg: number;
  status: VehicleStatus;
  last_maintenance_date: string | null;  // ISO date "YYYY-MM-DD"
  next_maintenance_date: string | null;
  notes: string | null;
}

export interface CreateVehicleInput {
  company_id: string;
  registration_plate: string;
  brand: string;
  model: string;
  year: number;
  capacity_kg: number;
  status?: VehicleStatus;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  notes?: string;
}

// =============================================================================
// Table 4: drivers
// =============================================================================
export interface Driver extends BaseEntity {
  company_id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicle_id: string | null;
  license_number: string;
  rating: number;        // 0.00–5.00 rolling average
  rgpd_consent: boolean;
  rgpd_consent_at: string | null;  // ISO 8601
  fcm_token: string | null;        // Firebase push token (driver app)
  is_active: boolean;
}

export interface CreateDriverInput {
  company_id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_id?: string;
  license_number: string;
  rgpd_consent?: boolean;
}

// =============================================================================
// Table 5: reception_windows
// =============================================================================
export interface ReceptionWindow extends BaseEntity {
  company_id: string;
  store_name: string;
  store_address: string;
  store_lat: number;    // NUMERIC(10,7) — use for route optimization
  store_lng: number;
  store_phone: string | null;
  store_email: string | null;
  open_time: string;    // "HH:MM" (TIME without timezone)
  close_time: string;   // "HH:MM"
  days_of_week: DayOfWeek[];
  is_active: boolean;
}

export interface CreateReceptionWindowInput {
  company_id: string;
  store_name: string;
  store_address: string;
  store_lat: number;
  store_lng: number;
  store_phone?: string;
  store_email?: string;
  open_time: string;
  close_time: string;
  days_of_week: DayOfWeek[];
}

// =============================================================================
// Table 6: deliveries
// =============================================================================
export interface Delivery extends BaseEntity {
  company_id: string;
  order_id: string | null;
  reception_window_id: string;
  client_deadline: string;        // "HH:MM" — must complete delivery by this time
  address: string;
  latitude: number;
  longitude: number;
  weight_kg: number | null;       // for vehicle capacity validation
  estimated_time_at_site: number; // minutes
  status: DeliveryStatus;
  priority: number;               // 1 (highest) to 5 (lowest)
  notes: string | null;
}

export interface CreateDeliveryInput {
  company_id: string;
  reception_window_id: string;
  client_deadline: string;
  address: string;
  latitude: number;
  longitude: number;
  weight_kg?: number;
  estimated_time_at_site?: number;
  priority?: number;
  notes?: string;
  order_id?: string;
}

/** Delivery with reception_window joined (from v_delivery_summary view) */
export interface DeliveryWithWindow extends Delivery {
  reception_windows: Pick<ReceptionWindow,
    'store_name' | 'store_address' | 'store_phone' |
    'store_lat' | 'store_lng' | 'open_time' | 'close_time'
  >;
}

// =============================================================================
// Table 7: routes
// =============================================================================
export interface Route extends BaseEntity {
  company_id: string;
  date: string;                     // "YYYY-MM-DD"
  driver_id: string;
  vehicle_id: string;
  deliveries_ordered: string[];     // ordered array of delivery UUIDs
  status: RouteStatus;
  started_at: string | null;        // ISO 8601
  completed_at: string | null;      // ISO 8601
  estimated_total_km: number | null;
  estimated_total_minutes: number | null;
}

export interface CreateRouteInput {
  company_id: string;
  date: string;
  driver_id: string;
  vehicle_id: string;
  deliveries_ordered?: string[];
}

/** Route with driver + vehicle joined */
export interface RouteWithDetails extends Route {
  drivers: Pick<Driver, 'name' | 'phone' | 'fcm_token'>;
  vehicles: Pick<Vehicle, 'registration_plate' | 'brand' | 'model'>;
}

// =============================================================================
// Table 8: delivery_events  (immutable — no updated_at)
// =============================================================================
export interface DeliveryEvent {
  id: string;
  delivery_id: string;
  driver_id: string;
  route_id: string | null;
  event_type: DeliveryEventType;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  timestamp: string;  // ISO 8601
}

export interface CreateDeliveryEventInput {
  delivery_id: string;
  driver_id: string;
  route_id?: string;
  event_type: DeliveryEventType;
  latitude?: number;
  longitude?: number;
  notes?: string;
  timestamp?: string;
}

// =============================================================================
// Table 9: delivery_proofs
// =============================================================================
export interface DeliveryProof {
  id: string;
  delivery_id: string;
  driver_id: string;
  photo_marchandise_url: string | null;  // S3 signed URL
  photo_bl_tamonne_url: string | null;   // S3 signed URL
  uploaded_at: string;   // ISO 8601
  synced_at: string | null;
}

export interface UpsertDeliveryProofInput {
  delivery_id: string;
  driver_id: string;
  photo_marchandise_url?: string;
  photo_bl_tamonne_url?: string;
  synced_at?: string;
}

// =============================================================================
// Table 10: driver_ratings
// =============================================================================
export interface DriverRating {
  id: string;
  delivery_id: string;
  driver_id: string;
  efficiency_score: number;    // 1.00–5.00
  punctuality_score: number;   // 1.00–5.00
  time_at_site_score: number;  // 1.00–5.00
  incident_score: number;      // 1.00–5.00 (5 = zero incidents)
  manager_override: boolean;
  notes: string | null;
  rated_at: string;  // ISO 8601
}

export interface UpsertDriverRatingInput {
  delivery_id: string;
  driver_id: string;
  efficiency_score: number;
  punctuality_score: number;
  time_at_site_score: number;
  incident_score: number;
  notes?: string;
}

// =============================================================================
// Table 11: gps_logs
// =============================================================================
export interface GpsLog {
  id: string;
  driver_id: string;
  route_id: string | null;
  latitude: number;
  longitude: number;
  accuracy: number | null;  // meters
  speed: number | null;     // km/h
  sequence: number;         // for deduplication (unique per driver)
  timestamp: string;        // ISO 8601 — client-side timestamp
  created_at: string;       // ISO 8601 — server receive timestamp
}

export interface InsertGpsLogInput {
  driver_id: string;
  route_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  sequence: number;
  timestamp: string;
}

// =============================================================================
// WebSocket Message Types
// =============================================================================

export interface WsDriverLocation {
  type: 'driver_location';
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  sequence: number;
  timestamp: string;
}

export interface WsDeliveryUpdate {
  type: 'delivery_update';
  delivery_id: string;
  status: DeliveryStatus;
  driver_id: string;
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

export interface WsRouteUpdate {
  type: 'route_update';
  route_id: string;
  status: RouteStatus;
  driver_id: string;
  timestamp: string;
}

export type WsMessage =
  | WsDriverLocation
  | WsDeliveryUpdate
  | WsNotification
  | WsRouteUpdate;

// =============================================================================
// Route Optimization Algorithm Types  (used by AGENT-ALGO)
// =============================================================================

export interface RouteInput {
  deliveries: Delivery[];
  drivers: Driver[];
  vehicles: Vehicle[];
  date: string;
  depot_lat: number;   // GERVIFRAIS HQ: 48.7627
  depot_lng: number;   // GERVIFRAIS HQ: 2.3486
}

export interface OptimizedRoute {
  driver_id: string;
  vehicle_id: string;
  deliveries_ordered: string[];     // delivery UUIDs in visit order
  estimated_total_km: number;
  estimated_total_minutes: number;
}

export interface OptimizationResult {
  routes: OptimizedRoute[];
  feasibility: FeasibilityResult;
  computed_at: string;  // ISO 8601
}

export type FeasibilityStatus = 'VALID' | 'INVALID';

export interface FeasibilityResult {
  status: FeasibilityStatus;
  errors: FeasibilityError[];
}

export interface FeasibilityError {
  delivery_id: string;
  store_name?: string;
  constraint:
    | 'reception_window_open'
    | 'reception_window_close'
    | 'client_deadline'
    | 'vehicle_capacity';
  message: string;
  expected?: string;
  actual?: string;
}

/** Intermediate type for algo computation */
export interface DeliveryWithTiming extends Delivery {
  reception_window: ReceptionWindow;
  estimated_arrival_time: string;   // "HH:MM"
  estimated_departure_time: string; // "HH:MM"
  is_feasible: boolean;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string[];
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// =============================================================================
// Authentication Types
// =============================================================================

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;    // seconds
  token_type: 'Bearer';
}

export interface JwtPayload {
  user_id: string;
  company_id: string;
  role: UserRole;
  email: string;
  iat: number;
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  fcm_token?: string;  // optional: update driver/user FCM token on login
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// =============================================================================
// Dashboard / UI Aggregated Types  (used by frontend-manager)
// =============================================================================

export interface DailyKPI {
  date: string;
  total_deliveries: number;
  completed: number;
  in_progress: number;
  pending: number;
  failed: number;
  delayed: number;
  on_time_rate: number;  // 0–1 (e.g., 0.85 = 85%)
}

export interface DriverMapMarker {
  driver_id: string;
  driver_name: string;
  lat: number;
  lng: number;
  status: 'online' | 'offline' | 'delivering';
  current_delivery_id: string | null;
  last_update: string;  // ISO 8601
}

export interface RouteProgress {
  route_id: string;
  driver: Pick<Driver, 'id' | 'name' | 'phone'>;
  vehicle: Pick<Vehicle, 'id' | 'registration_plate' | 'brand' | 'model'>;
  total_stops: number;
  completed_stops: number;
  current_delivery: DeliveryWithWindow | null;
  status: RouteStatus;
}

// =============================================================================
// Driver App Types  (used by app-driver)
// =============================================================================

export interface DriverRouteDetail {
  route: Route;
  deliveries: DeliveryWithWindow[];
  current_delivery_index: number;
}

export interface DeliveryStatusUpdate {
  delivery_id: string;
  event_type: DeliveryEventType;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

// =============================================================================
// Redis Cache Types  (used by GPSTrackingService)
// =============================================================================

export interface RedisDriverLocation {
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  sequence: number;
  timestamp: string;
  route_id: string | null;
}
