/**
 * API Service — GERVIFRAIS Driver App
 * AGENT-APP-DRIVER
 *
 * Axios instance with JWT interceptor + typed methods for all driver endpoints.
 * Base URL from EXPO_PUBLIC_API_URL env variable.
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Driver,
  Route,
  DeliveryWithWindow,
  DeliveryStatus,
  DeliveryEventType,
  LoginResponse,
  LoginRequest,
} from '@shared/types';

// ── Storage keys ───────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  ACCESS_TOKEN:  '@gervifrais/access_token',
  REFRESH_TOKEN: '@gervifrais/refresh_token',
  DRIVER:        '@gervifrais/driver',
  ROUTE:         '@gervifrais/route',
  DELIVERIES:    '@gervifrais/deliveries',
  EVENTS_QUEUE:  '@gervifrais/events_queue',
  PHOTOS_QUEUE:  '@gervifrais/photos_queue',
} as const;

// ── Axios instance ─────────────────────────────────────────────────────────────

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Token helpers ──────────────────────────────────────────────────────────────

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN,  accessToken],
    [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.REFRESH_TOKEN]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function loginDriver(req: LoginRequest): Promise<LoginResponse> {
  const { data } = await apiClient.post<{ success: true; data: LoginResponse }>('/auth/login', req);
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

// ── Driver ─────────────────────────────────────────────────────────────────────

export async function getDriver(driverId: string): Promise<Driver> {
  const { data } = await apiClient.get<{ success: true; data: Driver }>(`/drivers/${driverId}`);
  return data.data;
}

export async function updateDriverFcmToken(driverId: string, fcmToken: string): Promise<void> {
  await apiClient.patch(`/drivers/${driverId}`, { fcm_token: fcmToken });
}

export async function postGpsLocation(payload: {
  driver_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  sequence: number;
  timestamp: string;
}): Promise<void> {
  // GPS updates are sent via WebSocket (primary) — this is the REST fallback
  await apiClient.post(`/drivers/${payload.driver_id}/location`, payload);
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export async function getRouteForDriver(driverId: string, date: string): Promise<Route | null> {
  const { data } = await apiClient.get<{ success: true; data: Route[] }>(
    `/routes?driver_id=${driverId}&date=${date}`,
  );
  return data.data[0] ?? null;
}

export async function updateRouteStatus(
  routeId: string,
  status: 'in_progress' | 'completed',
  startedAt?: string,
  completedAt?: string,
): Promise<void> {
  await apiClient.patch(`/routes/${routeId}`, { status, started_at: startedAt, completed_at: completedAt });
}

// ── Deliveries ─────────────────────────────────────────────────────────────────

export async function getDeliveriesForRoute(routeId: string): Promise<DeliveryWithWindow[]> {
  const { data } = await apiClient.get<{ success: true; data: DeliveryWithWindow[] }>(
    `/deliveries?route_id=${routeId}`,
  );
  return data.data;
}

export async function postDeliveryEvent(
  deliveryId: string,
  eventType: DeliveryEventType,
  payload: {
    driver_id: string;
    route_id?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  },
): Promise<void> {
  await apiClient.post(`/deliveries/${deliveryId}/events`, {
    event_type: eventType,
    ...payload,
  });
}

export async function uploadDeliveryProof(
  deliveryId: string,
  marchandiseUri: string,
  blUri: string,
  onProgress?: (pct: number) => void,
): Promise<{ marchandise_url: string; bl_url: string }> {
  const formData = new FormData();

  // React Native FormData file format
  formData.append('photo_marchandise', {
    uri: marchandiseUri,
    name: 'marchandise.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  formData.append('photo_bl_tamonne', {
    uri: blUri,
    name: 'bl_tamonne.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data } = await apiClient.post<{
    success: true;
    data: { marchandise_url: string; bl_url: string };
  }>(`/deliveries/${deliveryId}/proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    },
  });

  return data.data;
}

export default apiClient;
