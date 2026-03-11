/**
 * GERVIFRAIS API Client
 * HTTP client built on axios — wraps all backend REST calls.
 * Base URL from VITE_API_URL env var (never hardcoded).
 *
 * See /docs/API_CONTRACT.md for full endpoint spec.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Route,
  RouteWithDetails,
  Delivery,
  DeliveryWithWindow,
  Driver,
  Vehicle,
  ReceptionWindow,
  DailyKPI,
  LoginRequest,
  LoginResponse,
  CreateRouteInput,
  CreateDeliveryInput,
  CreateDriverInput,
  CreateVehicleInput,
  CreateDeliveryEventInput,
  DeliveryEvent,
  DriverRating,
  UpsertDriverRatingInput,
  ApiSuccess,
  ApiError,
  PaginatedResponse,
  AuthTokens,
} from '@shared/types';

// ── Config ────────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// ── Token storage ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'gervifrais_access_token';
const REFRESH_KEY = 'gervifrais_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(tokens: Pick<AuthTokens, 'access_token' | 'refresh_token'>): void {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ── Axios instance ────────────────────────────────────────────────────────────

const http: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — clear tokens and redirect to login
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError<ApiError>) => {
    if (err.response?.status === 401) {
      clearTokens();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Helper ────────────────────────────────────────────────────────────────────

async function unwrap<T>(promise: Promise<{ data: ApiSuccess<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  login(body: LoginRequest): Promise<LoginResponse> {
    return unwrap(http.post<ApiSuccess<LoginResponse>>('/auth/login', body));
  },

  logout(): Promise<void> {
    return http.post('/auth/logout').then(() => undefined);
  },
};

// ── Routes ────────────────────────────────────────────────────────────────────

export interface ListRoutesParams {
  date?: string;
  status?: string;
  driver_id?: string;
  page?: number;
  per_page?: number;
}

export const routesApi = {
  list(params?: ListRoutesParams): Promise<PaginatedResponse<RouteWithDetails>> {
    return unwrap(http.get<ApiSuccess<PaginatedResponse<RouteWithDetails>>>('/routes', { params }));
  },

  create(body: CreateRouteInput): Promise<Route> {
    return unwrap(http.post<ApiSuccess<Route>>('/routes', body));
  },

  getById(id: string): Promise<RouteWithDetails> {
    return unwrap(http.get<ApiSuccess<RouteWithDetails>>(`/routes/${id}`));
  },

  update(id: string, patch: Partial<Route>): Promise<Route> {
    return unwrap(http.patch<ApiSuccess<Route>>(`/routes/${id}`, patch));
  },

  optimize(id: string, delivery_ids: string[], num_drivers?: number): Promise<{
    route: Route;
    optimization_result: {
      feasibility: 'VALID' | 'INVALID';
      estimated_total_km: number;
      estimated_total_minutes: number;
      errors?: Array<{ delivery_id: string; constraint: string; message: string }>;
    };
  }> {
    return unwrap(http.post(`/routes/${id}/optimize`, { delivery_ids, num_drivers }));
  },

  delete(id: string): Promise<void> {
    return http.delete(`/routes/${id}`).then(() => undefined);
  },
};

// ── Deliveries ────────────────────────────────────────────────────────────────

export interface ListDeliveriesParams {
  route_id?: string;
  status?: string;
  date?: string;
  page?: number;
  per_page?: number;
}

export const deliveriesApi = {
  list(params?: ListDeliveriesParams): Promise<PaginatedResponse<DeliveryWithWindow>> {
    return unwrap(http.get<ApiSuccess<PaginatedResponse<DeliveryWithWindow>>>('/deliveries', { params }));
  },

  create(body: CreateDeliveryInput): Promise<Delivery> {
    return unwrap(http.post<ApiSuccess<Delivery>>('/deliveries', body));
  },

  update(id: string, patch: Partial<CreateDeliveryInput>): Promise<Delivery> {
    return unwrap(http.patch<ApiSuccess<Delivery>>(`/deliveries/${id}`, patch));
  },

  createEvent(id: string, body: CreateDeliveryEventInput): Promise<DeliveryEvent> {
    return unwrap(http.post<ApiSuccess<DeliveryEvent>>(`/deliveries/${id}/events`, body));
  },
};

// ── Drivers ───────────────────────────────────────────────────────────────────

export const driversApi = {
  list(params?: { is_active?: boolean; page?: number; per_page?: number }): Promise<PaginatedResponse<Driver>> {
    return unwrap(http.get<ApiSuccess<PaginatedResponse<Driver>>>('/drivers', { params }));
  },

  create(body: CreateDriverInput): Promise<Driver> {
    return unwrap(http.post<ApiSuccess<Driver>>('/drivers', body));
  },

  getById(id: string): Promise<Driver> {
    return unwrap(http.get<ApiSuccess<Driver>>(`/drivers/${id}`));
  },

  submitRating(id: string, body: UpsertDriverRatingInput): Promise<{ rating: DriverRating; new_average: number }> {
    return unwrap(http.post(`/drivers/${id}/rating`, body));
  },
};

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const vehiclesApi = {
  list(params?: { status?: string }): Promise<Vehicle[]> {
    return unwrap(http.get<ApiSuccess<Vehicle[]>>('/vehicles', { params }));
  },

  create(body: CreateVehicleInput): Promise<Vehicle> {
    return unwrap(http.post<ApiSuccess<Vehicle>>('/vehicles', body));
  },

  update(id: string, patch: Partial<CreateVehicleInput>): Promise<Vehicle> {
    return unwrap(http.patch<ApiSuccess<Vehicle>>(`/vehicles/${id}`, patch));
  },
};

// ── Reception Windows ─────────────────────────────────────────────────────────

export const receptionWindowsApi = {
  list(): Promise<ReceptionWindow[]> {
    return unwrap(http.get<ApiSuccess<ReceptionWindow[]>>('/reception-windows'));
  },
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getKPI(date?: string): Promise<DailyKPI> {
    return unwrap(http.get<ApiSuccess<DailyKPI>>('/dashboard/kpi', { params: date ? { date } : undefined }));
  },
};

// ── Export default instance for direct use if needed ─────────────────────────

export default http;
