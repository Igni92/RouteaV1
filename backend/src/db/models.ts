/**
 * GERVIFRAIS — Database Models
 * Supabase client + typed CRUD helpers for all 11 tables.
 * Created by: AGENT-DATABASE
 *
 * Usage (server-side, bypasses RLS):
 *   import { CompanyModel, DriverModel, DeliveryModel } from './models';
 *   const drivers = await DriverModel.findByCompany(companyId);
 *
 * All methods use the SERVICE_ROLE key — RLS is bypassed intentionally.
 * Auth/authorization is enforced at the API controller layer.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import type {
  Company,
  User,
  Vehicle,
  Driver,
  ReceptionWindow,
  Delivery,
  Route,
  DeliveryEvent,
  DeliveryProof,
  DriverRating,
  GpsLog,
  DeliveryStatus,
  RouteStatus,
  VehicleStatus,
  UserRole,
} from '../../../shared/types';

// =============================================================================
// Supabase client (service role — bypasses RLS)
// =============================================================================
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

// =============================================================================
// Base helpers
// =============================================================================

class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly table: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

function handleError(table: string, operation: string, error: unknown): never {
  const msg = error instanceof Error ? error.message : String(error);
  throw new DatabaseError(`[${table}.${operation}] ${msg}`, table, operation, error);
}

// =============================================================================
// MODEL 1: CompanyModel
// =============================================================================
export const CompanyModel = {
  async findById(id: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('company')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('company', 'findById', error);
    return data as Company | null;
  },

  async create(input: Omit<Company, 'id' | 'created_at' | 'updated_at'>): Promise<Company> {
    const { data, error } = await supabase
      .from('company')
      .insert(input)
      .select()
      .single();
    if (error) handleError('company', 'create', error);
    return data as Company;
  },

  async update(id: string, input: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>): Promise<Company> {
    const { data, error } = await supabase
      .from('company')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('company', 'update', error);
    return data as Company;
  },
};

// =============================================================================
// MODEL 2: UserModel
// =============================================================================
export const UserModel = {
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('users', 'findById', error);
    return data as User | null;
  },

  async findByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    if (error && error.code !== 'PGRST116') handleError('users', 'findByEmail', error);
    return data as (User & { password_hash: string }) | null;
  },

  async findByCompany(companyId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, company_id, role, fcm_token, last_login_at, created_at, updated_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) handleError('users', 'findByCompany', error);
    return (data ?? []) as User[];
  },

  async create(input: {
    email: string;
    password_hash: string;
    company_id: string;
    role: UserRole;
  }): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({ ...input, email: input.email.toLowerCase() })
      .select('id, email, company_id, role, fcm_token, last_login_at, created_at, updated_at')
      .single();
    if (error) handleError('users', 'create', error);
    return data as User;
  },

  async updateLastLogin(id: string, fcmToken?: string): Promise<void> {
    const update: Record<string, unknown> = { last_login_at: new Date().toISOString() };
    if (fcmToken) update['fcm_token'] = fcmToken;
    const { error } = await supabase.from('users').update(update).eq('id', id);
    if (error) handleError('users', 'updateLastLogin', error);
  },
};

// =============================================================================
// MODEL 3: VehicleModel
// =============================================================================
export const VehicleModel = {
  async findByCompany(companyId: string, status?: VehicleStatus): Promise<Vehicle[]> {
    let query = supabase
      .from('vehicles')
      .select('*')
      .eq('company_id', companyId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('brand');
    if (error) handleError('vehicles', 'findByCompany', error);
    return (data ?? []) as Vehicle[];
  },

  async findById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('vehicles', 'findById', error);
    return data as Vehicle | null;
  },

  async create(input: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(input)
      .select()
      .single();
    if (error) handleError('vehicles', 'create', error);
    return data as Vehicle;
  },

  async update(id: string, input: Partial<Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>>): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('vehicles', 'update', error);
    return data as Vehicle;
  },
};

// =============================================================================
// MODEL 4: DriverModel
// =============================================================================
export const DriverModel = {
  async findByCompany(companyId: string, activeOnly = true): Promise<Driver[]> {
    let query = supabase
      .from('drivers')
      .select('*')
      .eq('company_id', companyId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('name');
    if (error) handleError('drivers', 'findByCompany', error);
    return (data ?? []) as Driver[];
  },

  async findById(id: string): Promise<Driver | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('drivers', 'findById', error);
    return data as Driver | null;
  },

  /** Returns driver with vehicle info joined */
  async findWithVehicle(id: string): Promise<(Driver & { vehicles: Vehicle | null }) | null> {
    const { data, error } = await supabase
      .from('drivers')
      .select('*, vehicles(*)')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('drivers', 'findWithVehicle', error);
    return data as (Driver & { vehicles: Vehicle | null }) | null;
  },

  async create(input: Omit<Driver, 'id' | 'created_at' | 'updated_at' | 'rating'>): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .insert({ ...input, rating: 5.0 })
      .select()
      .single();
    if (error) handleError('drivers', 'create', error);
    return data as Driver;
  },

  async update(id: string, input: Partial<Omit<Driver, 'id' | 'created_at' | 'updated_at'>>): Promise<Driver> {
    const { data, error } = await supabase
      .from('drivers')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('drivers', 'update', error);
    return data as Driver;
  },

  async updateFcmToken(id: string, fcmToken: string): Promise<void> {
    const { error } = await supabase
      .from('drivers')
      .update({ fcm_token: fcmToken })
      .eq('id', id);
    if (error) handleError('drivers', 'updateFcmToken', error);
  },

  /** Recompute rolling average rating from driver_ratings table */
  async refreshRating(id: string): Promise<number> {
    const { data, error } = await supabase
      .from('driver_ratings')
      .select('efficiency_score, punctuality_score, time_at_site_score, incident_score')
      .eq('driver_id', id);
    if (error) handleError('drivers', 'refreshRating', error);

    if (!data || data.length === 0) return 5.0;

    const avg =
      data.reduce((sum, r) => {
        return (
          sum +
          (Number(r.efficiency_score) +
            Number(r.punctuality_score) +
            Number(r.time_at_site_score) +
            Number(r.incident_score)) /
            4
        );
      }, 0) / data.length;

    const rating = Math.round(avg * 100) / 100;
    await supabase.from('drivers').update({ rating }).eq('id', id);
    return rating;
  },
};

// =============================================================================
// MODEL 5: ReceptionWindowModel
// =============================================================================
export const ReceptionWindowModel = {
  async findByCompany(companyId: string, activeOnly = true): Promise<ReceptionWindow[]> {
    let query = supabase
      .from('reception_windows')
      .select('*')
      .eq('company_id', companyId);
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query.order('store_name');
    if (error) handleError('reception_windows', 'findByCompany', error);
    return (data ?? []) as ReceptionWindow[];
  },

  async findById(id: string): Promise<ReceptionWindow | null> {
    const { data, error } = await supabase
      .from('reception_windows')
      .select('*')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('reception_windows', 'findById', error);
    return data as ReceptionWindow | null;
  },

  async create(input: Omit<ReceptionWindow, 'id' | 'created_at' | 'updated_at'>): Promise<ReceptionWindow> {
    const { data, error } = await supabase
      .from('reception_windows')
      .insert(input)
      .select()
      .single();
    if (error) handleError('reception_windows', 'create', error);
    return data as ReceptionWindow;
  },

  async update(id: string, input: Partial<Omit<ReceptionWindow, 'id' | 'created_at' | 'updated_at'>>): Promise<ReceptionWindow> {
    const { data, error } = await supabase
      .from('reception_windows')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('reception_windows', 'update', error);
    return data as ReceptionWindow;
  },
};

// =============================================================================
// MODEL 6: DeliveryModel
// =============================================================================
export const DeliveryModel = {
  async findByCompany(companyId: string, filters?: {
    status?: DeliveryStatus;
    date?: string; // 'YYYY-MM-DD' — filters by created_at date
  }): Promise<Delivery[]> {
    let query = supabase
      .from('deliveries')
      .select('*, reception_windows(store_name, store_address, store_phone, store_lat, store_lng, open_time, close_time)')
      .eq('company_id', companyId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.date) {
      query = query
        .gte('created_at', `${filters.date}T00:00:00Z`)
        .lt('created_at', `${filters.date}T23:59:59Z`);
    }

    const { data, error } = await query.order('priority').order('created_at', { ascending: false });
    if (error) handleError('deliveries', 'findByCompany', error);
    return (data ?? []) as Delivery[];
  },

  async findById(id: string): Promise<Delivery | null> {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*, reception_windows(*)')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('deliveries', 'findById', error);
    return data as Delivery | null;
  },

  async create(input: Omit<Delivery, 'id' | 'created_at' | 'updated_at'>): Promise<Delivery> {
    const { data, error } = await supabase
      .from('deliveries')
      .insert(input)
      .select()
      .single();
    if (error) handleError('deliveries', 'create', error);
    return data as Delivery;
  },

  async updateStatus(id: string, status: DeliveryStatus): Promise<Delivery> {
    const { data, error } = await supabase
      .from('deliveries')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('deliveries', 'updateStatus', error);
    return data as Delivery;
  },

  async update(id: string, input: Partial<Omit<Delivery, 'id' | 'created_at' | 'updated_at'>>): Promise<Delivery> {
    const { data, error } = await supabase
      .from('deliveries')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('deliveries', 'update', error);
    return data as Delivery;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (error) handleError('deliveries', 'delete', error);
  },
};

// =============================================================================
// MODEL 7: RouteModel
// =============================================================================
export const RouteModel = {
  async findByCompany(companyId: string, filters?: {
    date?: string;
    status?: RouteStatus;
  }): Promise<Route[]> {
    let query = supabase
      .from('routes')
      .select('*, drivers(name, phone, fcm_token), vehicles(registration_plate, brand, model)')
      .eq('company_id', companyId);

    if (filters?.date) query = query.eq('date', filters.date);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query.order('date', { ascending: false });
    if (error) handleError('routes', 'findByCompany', error);
    return (data ?? []) as Route[];
  },

  async findById(id: string): Promise<Route | null> {
    const { data, error } = await supabase
      .from('routes')
      .select('*, drivers(*), vehicles(*)')
      .eq('id', id)
      .single();
    if (error && error.code !== 'PGRST116') handleError('routes', 'findById', error);
    return data as Route | null;
  },

  async findByDriverAndDate(driverId: string, date: string): Promise<Route | null> {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('driver_id', driverId)
      .eq('date', date)
      .single();
    if (error && error.code !== 'PGRST116') handleError('routes', 'findByDriverAndDate', error);
    return data as Route | null;
  },

  async create(input: Omit<Route, 'id' | 'created_at' | 'updated_at'>): Promise<Route> {
    const { data, error } = await supabase
      .from('routes')
      .insert(input)
      .select()
      .single();
    if (error) handleError('routes', 'create', error);
    return data as Route;
  },

  async update(id: string, input: Partial<Omit<Route, 'id' | 'created_at' | 'updated_at'>>): Promise<Route> {
    const { data, error } = await supabase
      .from('routes')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('routes', 'update', error);
    return data as Route;
  },

  async updateStatus(id: string, status: RouteStatus): Promise<Route> {
    const update: Record<string, unknown> = { status };
    if (status === 'in_progress') update['started_at'] = new Date().toISOString();
    if (status === 'completed') update['completed_at'] = new Date().toISOString();
    return RouteModel.update(id, update as Partial<Route>);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) handleError('routes', 'delete', error);
  },
};

// =============================================================================
// MODEL 8: DeliveryEventModel
// =============================================================================
export const DeliveryEventModel = {
  async findByDelivery(deliveryId: string): Promise<DeliveryEvent[]> {
    const { data, error } = await supabase
      .from('delivery_events')
      .select('*')
      .eq('delivery_id', deliveryId)
      .order('timestamp', { ascending: true });
    if (error) handleError('delivery_events', 'findByDelivery', error);
    return (data ?? []) as DeliveryEvent[];
  },

  async findByDriver(driverId: string, date?: string): Promise<DeliveryEvent[]> {
    let query = supabase
      .from('delivery_events')
      .select('*')
      .eq('driver_id', driverId);
    if (date) {
      query = query
        .gte('timestamp', `${date}T00:00:00Z`)
        .lt('timestamp', `${date}T23:59:59Z`);
    }
    const { data, error } = await query.order('timestamp', { ascending: false });
    if (error) handleError('delivery_events', 'findByDriver', error);
    return (data ?? []) as DeliveryEvent[];
  },

  async create(input: Omit<DeliveryEvent, 'id'>): Promise<DeliveryEvent> {
    const { data, error } = await supabase
      .from('delivery_events')
      .insert(input)
      .select()
      .single();
    if (error) handleError('delivery_events', 'create', error);
    return data as DeliveryEvent;
  },
};

// =============================================================================
// MODEL 9: DeliveryProofModel
// =============================================================================
export const DeliveryProofModel = {
  async findByDelivery(deliveryId: string): Promise<DeliveryProof | null> {
    const { data, error } = await supabase
      .from('delivery_proofs')
      .select('*')
      .eq('delivery_id', deliveryId)
      .single();
    if (error && error.code !== 'PGRST116') handleError('delivery_proofs', 'findByDelivery', error);
    return data as DeliveryProof | null;
  },

  /** Upsert — delivery_id is UNIQUE so this is safe */
  async upsert(input: Omit<DeliveryProof, 'id' | 'uploaded_at'>): Promise<DeliveryProof> {
    const { data, error } = await supabase
      .from('delivery_proofs')
      .upsert(
        { ...input, uploaded_at: new Date().toISOString() },
        { onConflict: 'delivery_id' }
      )
      .select()
      .single();
    if (error) handleError('delivery_proofs', 'upsert', error);
    return data as DeliveryProof;
  },

  async markSynced(id: string): Promise<void> {
    const { error } = await supabase
      .from('delivery_proofs')
      .update({ synced_at: new Date().toISOString() })
      .eq('id', id);
    if (error) handleError('delivery_proofs', 'markSynced', error);
  },
};

// =============================================================================
// MODEL 10: DriverRatingModel
// =============================================================================
export const DriverRatingModel = {
  async findByDriver(driverId: string, limit = 50): Promise<DriverRating[]> {
    const { data, error } = await supabase
      .from('driver_ratings')
      .select('*')
      .eq('driver_id', driverId)
      .order('rated_at', { ascending: false })
      .limit(limit);
    if (error) handleError('driver_ratings', 'findByDriver', error);
    return (data ?? []) as DriverRating[];
  },

  async findByDelivery(deliveryId: string): Promise<DriverRating | null> {
    const { data, error } = await supabase
      .from('driver_ratings')
      .select('*')
      .eq('delivery_id', deliveryId)
      .single();
    if (error && error.code !== 'PGRST116') handleError('driver_ratings', 'findByDelivery', error);
    return data as DriverRating | null;
  },

  /** Auto-score after delivery completion — called by DriverRatingService */
  async upsert(input: Omit<DriverRating, 'id' | 'rated_at'>): Promise<DriverRating> {
    const { data, error } = await supabase
      .from('driver_ratings')
      .upsert(
        { ...input, rated_at: new Date().toISOString() },
        { onConflict: 'delivery_id' }
      )
      .select()
      .single();
    if (error) handleError('driver_ratings', 'upsert', error);
    // Refresh the driver's rolling average
    await DriverModel.refreshRating(input.driver_id);
    return data as DriverRating;
  },

  async managerOverride(
    id: string,
    scores: Partial<Pick<DriverRating, 'efficiency_score' | 'punctuality_score' | 'time_at_site_score' | 'incident_score'>>,
    notes: string,
    driverId: string
  ): Promise<DriverRating> {
    const { data, error } = await supabase
      .from('driver_ratings')
      .update({ ...scores, notes, manager_override: true, rated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) handleError('driver_ratings', 'managerOverride', error);
    await DriverModel.refreshRating(driverId);
    return data as DriverRating;
  },
};

// =============================================================================
// MODEL 11: GpsLogModel
// =============================================================================
export const GpsLogModel = {
  /** Insert a GPS position — called by GPSTrackingService */
  async insert(input: Omit<GpsLog, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('gps_logs')
      .insert(input)
      .select('id'); // minimal select to confirm insert
    // Ignore duplicate sequence errors (deduplication via unique index)
    if (error && !error.message.includes('idx_gps_driver_seq')) {
      handleError('gps_logs', 'insert', error);
    }
  },

  /** Get latest N GPS positions for a driver (audit / replay) */
  async findLatestByDriver(driverId: string, limit = 100): Promise<GpsLog[]> {
    const { data, error } = await supabase
      .from('gps_logs')
      .select('*')
      .eq('driver_id', driverId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) handleError('gps_logs', 'findLatestByDriver', error);
    return (data ?? []) as GpsLog[];
  },

  /** Get GPS trail for a specific route (for replay/audit) */
  async findByRoute(routeId: string): Promise<GpsLog[]> {
    const { data, error } = await supabase
      .from('gps_logs')
      .select('*')
      .eq('route_id', routeId)
      .order('timestamp', { ascending: true });
    if (error) handleError('gps_logs', 'findByRoute', error);
    return (data ?? []) as GpsLog[];
  },
};

// =============================================================================
// Convenience: export all models together
// =============================================================================
export const DB = {
  company: CompanyModel,
  users: UserModel,
  vehicles: VehicleModel,
  drivers: DriverModel,
  receptionWindows: ReceptionWindowModel,
  deliveries: DeliveryModel,
  routes: RouteModel,
  deliveryEvents: DeliveryEventModel,
  deliveryProofs: DeliveryProofModel,
  driverRatings: DriverRatingModel,
  gpsLogs: GpsLogModel,
} as const;

export type { DatabaseError };
