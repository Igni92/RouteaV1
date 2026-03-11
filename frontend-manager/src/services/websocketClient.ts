/**
 * GERVIFRAIS WebSocket Client
 * Manages real-time connection to /api/socket.
 * Handles reconnection, sequence tracking, and Redux dispatch.
 *
 * See /docs/REALTIME_PROTOCOL.md for full protocol spec.
 */

import type { AppDispatch } from '../redux/store';
import type { WsMessage, WsDriverLocation, WsDeliveryUpdate, WsNotification, WsRouteUpdate } from '@shared/types';
import { updateDriverLocation } from '../redux/driversSlice';
import { updateDeliveryStatus } from '../redux/deliveriesSlice';
import { fetchRoutes } from '../redux/routesSlice';
import { showToast } from '../redux/uiSlice';
import { getAccessToken } from './apiClient';

// ── Constants ─────────────────────────────────────────────────────────────────

const WS_BASE = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000';
const WS_PATH = '/api/socket';

const RECONNECT_DELAYS = [5_000, 10_000, 30_000, 60_000]; // ms
const PING_TIMEOUT_MS = 45_000;

// ── WebSocket Client class ────────────────────────────────────────────────────

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private dispatch: AppDispatch | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  // Callbacks
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected') => void;

  /**
   * Connect to the WebSocket server.
   * @param dispatch — Redux dispatch function for updating state
   */
  connect(dispatch: AppDispatch): void {
    this.dispatch = dispatch;
    this.intentionalClose = false;
    this.doConnect();
  }

  /**
   * Intentionally disconnect (no reconnect attempt).
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.clearTimers();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  get status(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private doConnect(): void {
    const token = getAccessToken();
    if (!token) {
      console.warn('[WS] No access token — cannot connect');
      return;
    }

    this.setStatus('connecting');
    const url = `${WS_BASE}${WS_PATH}?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = this.handleOpen.bind(this);
    this.ws.onmessage = this.handleMessage.bind(this);
    this.ws.onclose = this.handleClose.bind(this);
    this.ws.onerror = this.handleError.bind(this);
  }

  private handleOpen(): void {
    console.log('[WS] Connected');
    this.reconnectAttempt = 0;
    this.setStatus('connected');
    this.schedulePingTimeout();
  }

  private handleMessage(event: MessageEvent): void {
    // Reset ping timeout on any incoming message
    this.schedulePingTimeout();

    let message: WsMessage;
    try {
      message = JSON.parse(event.data as string) as WsMessage;
    } catch {
      console.warn('[WS] Failed to parse message:', event.data);
      return;
    }

    if (!this.dispatch) return;

    switch (message.type) {
      case 'driver_location':
        this.dispatch(updateDriverLocation(message as WsDriverLocation));
        break;

      case 'delivery_update':
        this.dispatch(updateDeliveryStatus(message as WsDeliveryUpdate));
        break;

      case 'notification': {
        const notif = message as WsNotification;
        this.dispatch(showToast({
          id: `notif-${Date.now()}`,
          level: notif.level,
          message: notif.message,
        }));
        break;
      }

      case 'route_update':
        // Refetch routes to get fresh state
        this.dispatch(fetchRoutes({}));
        break;

      default:
        console.debug('[WS] Unknown message type:', (message as { type: string }).type);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log(`[WS] Closed: code=${event.code} reason=${event.reason}`);
    this.clearTimers();
    this.setStatus('disconnected');

    if (this.intentionalClose || event.code === 1000) return;

    this.scheduleReconnect();
  }

  private handleError(event: Event): void {
    console.error('[WS] Error:', event);
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) return;

    const delay = RECONNECT_DELAYS[
      Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)
    ] ?? 60_000;

    console.log(`[WS] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempt + 1})`);

    if (this.dispatch) {
      this.dispatch(showToast({
        id: `ws-reconnect-${Date.now()}`,
        level: 'warning',
        message: `Connexion perdue — Reconnexion dans ${delay / 1000}s...`,
      }));
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempt += 1;
      this.doConnect();
    }, delay);
  }

  private schedulePingTimeout(): void {
    if (this.pingTimer) clearTimeout(this.pingTimer);
    this.pingTimer = setTimeout(() => {
      // If no message for PING_TIMEOUT_MS, reconnect
      console.warn('[WS] Ping timeout — forcing reconnect');
      this.ws?.close();
    }, PING_TIMEOUT_MS);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.pingTimer) { clearTimeout(this.pingTimer); this.pingTimer = null; }
  }

  private setStatus(status: 'disconnected' | 'connecting' | 'connected'): void {
    this.connectionStatus = status;
    this.onStatusChange?.(status);
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const wsClient = new WebSocketClient();
