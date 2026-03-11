/**
 * offlineService — Offline queue and sync management
 * AGENT-APP-DRIVER
 *
 * Queues delivery events and photo uploads when offline.
 * Uses AsyncStorage for persistence + NetInfo for connectivity.
 * Syncs automatically when network is restored.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { STORAGE_KEYS } from './api';
import type { DeliveryEventType } from '@shared/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface QueuedDeliveryEvent {
  id: string;
  deliveryId: string;
  eventType: DeliveryEventType;
  driverId: string;
  routeId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  timestamp: string;
  attempts: number;
}

export interface QueuedPhotoUpload {
  id: string;
  deliveryId: string;
  type: 'marchandise' | 'bl';
  uri: string;
  timestamp: string;
  attempts: number;
  status: 'pending' | 'uploading' | 'done' | 'failed';
}

type SyncCallback = (event: QueuedDeliveryEvent) => Promise<void>;
type PhotoSyncCallback = (photo: QueuedPhotoUpload) => Promise<string>;

// ── Network state ──────────────────────────────────────────────────────────────

let isOnline = true;
let syncCallback: SyncCallback | null = null;
let photoSyncCallback: PhotoSyncCallback | null = null;
let unsubscribeNetInfo: (() => void) | null = null;

/**
 * Initialize network listener. Call once on app start.
 */
export function initOfflineService(
  onEventSync: SyncCallback,
  onPhotoSync: PhotoSyncCallback,
): void {
  syncCallback = onEventSync;
  photoSyncCallback = onPhotoSync;

  unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    const wasOffline = !isOnline;
    isOnline = (state.isConnected && state.isInternetReachable) ?? false;

    if (wasOffline && isOnline) {
      console.log('[offlineService] Network restored — syncing queue');
      void syncAll();
    }
  });
}

/**
 * Tear down network listener.
 */
export function destroyOfflineService(): void {
  unsubscribeNetInfo?.();
  unsubscribeNetInfo = null;
}

export function getIsOnline(): boolean {
  return isOnline;
}

// ── Event queue ────────────────────────────────────────────────────────────────

async function readEventQueue(): Promise<QueuedDeliveryEvent[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS_QUEUE);
  return raw ? (JSON.parse(raw) as QueuedDeliveryEvent[]) : [];
}

async function writeEventQueue(queue: QueuedDeliveryEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.EVENTS_QUEUE, JSON.stringify(queue));
}

/**
 * Queue a delivery event for later sync.
 */
export async function queueDeliveryEvent(event: Omit<QueuedDeliveryEvent, 'id' | 'attempts'>): Promise<void> {
  const queue = await readEventQueue();
  queue.push({ ...event, id: `evt_${Date.now()}_${Math.random()}`, attempts: 0 });
  await writeEventQueue(queue);
}

/**
 * Remove a successfully synced event from queue.
 */
export async function removeEventFromQueue(id: string): Promise<void> {
  const queue = await readEventQueue();
  await writeEventQueue(queue.filter((e) => e.id !== id));
}

// ── Photo queue ────────────────────────────────────────────────────────────────

async function readPhotoQueue(): Promise<QueuedPhotoUpload[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.PHOTOS_QUEUE);
  return raw ? (JSON.parse(raw) as QueuedPhotoUpload[]) : [];
}

async function writePhotoQueue(queue: QueuedPhotoUpload[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.PHOTOS_QUEUE, JSON.stringify(queue));
}

/**
 * Add a photo upload to the offline queue.
 */
export async function queuePhotoUpload(
  photo: Omit<QueuedPhotoUpload, 'id' | 'attempts' | 'status'>,
): Promise<void> {
  const queue = await readPhotoQueue();
  queue.push({
    ...photo,
    id: `photo_${Date.now()}_${Math.random()}`,
    attempts: 0,
    status: 'pending',
  });
  await writePhotoQueue(queue);
}

/**
 * Mark a photo upload as done or failed.
 */
export async function updatePhotoStatus(
  id: string,
  status: QueuedPhotoUpload['status'],
): Promise<void> {
  const queue = await readPhotoQueue();
  const updated = queue.map((p) => (p.id === id ? { ...p, status } : p));
  await writePhotoQueue(updated);
}

// ── Sync ───────────────────────────────────────────────────────────────────────

/**
 * Sync all queued events and photos. Called automatically when network restores.
 */
export async function syncAll(): Promise<void> {
  if (!isOnline) return;

  await Promise.allSettled([syncEvents(), syncPhotos()]);
}

async function syncEvents(): Promise<void> {
  if (!syncCallback) return;

  const queue = await readEventQueue();
  const pending = queue.filter((e) => e.attempts < 3);

  for (const event of pending) {
    try {
      await syncCallback(event);
      await removeEventFromQueue(event.id);
    } catch {
      const updated = queue.map((e) =>
        e.id === event.id ? { ...e, attempts: e.attempts + 1 } : e,
      );
      await writeEventQueue(updated);
    }
  }
}

async function syncPhotos(): Promise<void> {
  if (!photoSyncCallback) return;

  const queue = await readPhotoQueue();
  const pending = queue.filter((p) => p.status === 'pending' && p.attempts < 3);

  for (const photo of pending) {
    try {
      await updatePhotoStatus(photo.id, 'uploading');
      await photoSyncCallback(photo);
      await updatePhotoStatus(photo.id, 'done');
    } catch {
      const currentQueue = await readPhotoQueue();
      const updated = currentQueue.map((p) =>
        p.id === photo.id
          ? { ...p, status: 'pending' as const, attempts: p.attempts + 1 }
          : p,
      );
      await writePhotoQueue(updated);
    }
  }
}

// ── Cache helpers ──────────────────────────────────────────────────────────────

/**
 * Persist data to AsyncStorage for offline access.
 */
export async function cacheData(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/**
 * Read cached data.
 */
export async function readCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}
