/**
 * GPSTrackingService — GERVIFRAIS Fleet Management
 * AGENT-BACKEND-API
 *
 * Responsibilities:
 *  - Store driver's latest GPS location in Redis (TTL 60s)
 *  - Sequence deduplication (reject stale/duplicate updates)
 *  - Broadcast location updates via WebSocket to all connected managers
 *  - Insert GPS log into gps_logs table (async, non-blocking)
 *
 * See /docs/REALTIME_PROTOCOL.md for the full protocol spec.
 */

import type { Redis } from 'ioredis';
import type { WebSocketServer, WebSocket } from 'ws';
import type { WsDriverLocation, RedisDriverLocation, InsertGpsLogInput } from '../../../shared/types';

// ── Redis key helpers ────────────────────────────────────────────────────────

function locationKey(driverId: string): string {
  return `driver:latest-location:${driverId}`;
}

function sequenceKey(driverId: string): string {
  return `driver:last-sequence:${driverId}`;
}

// ── Constants ────────────────────────────────────────────────────────────────

const LOCATION_TTL_SECONDS = 60;
const SEQUENCE_TTL_SECONDS = 300;
const SEQUENCE_RESET_THRESHOLD = 1000;

// ── Service ──────────────────────────────────────────────────────────────────

export class GPSTrackingService {
  constructor(
    private readonly redis: Redis,
    private readonly wss: WebSocketServer,
  ) {}

  /**
   * Process an incoming GPS location update from a driver.
   * Returns true if the update was accepted, false if rejected (stale/duplicate).
   */
  async processLocation(
    message: WsDriverLocation,
    routeId?: string | null,
  ): Promise<boolean> {
    const { driver_id, sequence } = message;

    // ── Sequence deduplication ──────────────────────────────────────────────
    const lastSeqStr = await this.redis.get(sequenceKey(driver_id));
    const lastSeq = lastSeqStr ? parseInt(lastSeqStr, 10) : -1;

    if (lastSeq >= 0) {
      const diff = lastSeq - sequence;

      // Sequence reset detection (app restarted)
      if (diff > SEQUENCE_RESET_THRESHOLD) {
        console.warn(`[GPS] Sequence reset detected for driver ${driver_id}: ${lastSeq} → ${sequence}`);
        // Accept and reset
      } else if (sequence <= lastSeq) {
        // Stale or duplicate packet — discard
        console.debug(`[GPS] Discarded stale GPS update for driver ${driver_id}: seq=${sequence} <= lastSeq=${lastSeq}`);
        return false;
      }
    }

    // ── Update Redis ────────────────────────────────────────────────────────
    const locationData: RedisDriverLocation = {
      driver_id,
      lat: message.lat,
      lng: message.lng,
      accuracy: message.accuracy,
      speed: message.speed,
      sequence,
      timestamp: message.timestamp,
      route_id: routeId ?? null,
    };

    await Promise.all([
      this.redis.setex(locationKey(driver_id), LOCATION_TTL_SECONDS, JSON.stringify(locationData)),
      this.redis.setex(sequenceKey(driver_id), SEQUENCE_TTL_SECONDS, String(sequence)),
    ]);

    // ── Broadcast to all manager WS clients ─────────────────────────────────
    this.broadcast(message);

    // ── DB insert is fire-and-forget (non-blocking) ─────────────────────────
    this.insertGpsLog(message, routeId ?? null).catch((err) => {
      console.error('[GPS] Failed to insert gps_log:', err);
    });

    return true;
  }

  /**
   * Get the latest cached location for a driver.
   * Returns null if the driver is offline (TTL expired or never seen).
   */
  async getLatestLocation(driverId: string): Promise<RedisDriverLocation | null> {
    const raw = await this.redis.get(locationKey(driverId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RedisDriverLocation;
    } catch {
      return null;
    }
  }

  /**
   * Check if a driver is currently online (has a fresh location in Redis).
   */
  async isDriverOnline(driverId: string): Promise<boolean> {
    const ttl = await this.redis.ttl(locationKey(driverId));
    return ttl > 0;
  }

  /**
   * Get latest locations for multiple drivers (batch).
   */
  async getLocationsForDrivers(driverIds: string[]): Promise<Map<string, RedisDriverLocation>> {
    const result = new Map<string, RedisDriverLocation>();
    if (driverIds.length === 0) return result;

    const keys = driverIds.map(locationKey);
    const values = await this.redis.mget(...keys);

    for (let i = 0; i < driverIds.length; i++) {
      const raw = values[i];
      if (raw) {
        try {
          result.set(driverIds[i], JSON.parse(raw) as RedisDriverLocation);
        } catch {
          // skip malformed cache entry
        }
      }
    }

    return result;
  }

  /**
   * Broadcast a message to all connected WebSocket clients.
   */
  broadcast(message: WsDriverLocation): void {
    const payload = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1 /* WebSocket.OPEN */) {
        client.send(payload, (err) => {
          if (err) {
            console.error('[WS] Failed to send to client:', err);
          }
        });
      }
    });
  }

  /**
   * Broadcast any JSON message to all connected WS clients.
   */
  broadcastRaw(payload: object): void {
    const data = JSON.stringify(payload);
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }

  /**
   * Insert GPS log into the database (fire-and-forget).
   * The actual DB call would be made here via supabase/models.
   * Stubbed here — AGENT-DATABASE provides the actual model.
   */
  private async insertGpsLog(
    message: WsDriverLocation,
    routeId: string | null,
  ): Promise<void> {
    const input: InsertGpsLogInput = {
      driver_id: message.driver_id,
      route_id: routeId ?? undefined,
      latitude: message.lat,
      longitude: message.lng,
      accuracy: message.accuracy ?? undefined,
      speed: message.speed ?? undefined,
      sequence: message.sequence,
      timestamp: message.timestamp,
    };

    // TODO (AGENT-DATABASE): call supabase insert when models.ts is complete
    // await db.gpsLogs.insert(input);
    console.debug('[GPS] DB insert (stub):', input);
  }
}
