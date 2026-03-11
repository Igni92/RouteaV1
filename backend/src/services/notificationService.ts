/**
 * NotificationService — Firebase Cloud Messaging
 * AGENT-BACKEND-API
 *
 * Responsibilities:
 *  - Send push notifications to manager (incidents, delays)
 *  - Send push notifications to drivers (new route, route changes)
 *  - Gracefully handle missing FCM tokens
 *
 * See /docs/ARCHITECTURE.md § 3.3 for specification.
 */

import { env } from '../config/env';

// ── Firebase Admin SDK (lazy-initialized to support test mocking) ─────────────

let firebaseApp: FirebaseAdminApp | null = null;

interface FirebaseAdminApp {
  messaging(): {
    send(message: FcmMessage): Promise<string>;
    sendMulticast(message: FcmMulticastMessage): Promise<{ successCount: number; failureCount: number }>;
  };
}

interface FcmMessage {
  token: string;
  notification: { title: string; body: string };
  data?: Record<string, string>;
  android?: { priority: 'high' | 'normal' };
  apns?: { payload: { aps: { sound: string } } };
}

interface FcmMulticastMessage {
  tokens: string[];
  notification: { title: string; body: string };
  data?: Record<string, string>;
  android?: { priority: 'high' | 'normal' };
}

function getFirebaseApp(): FirebaseAdminApp | null {
  if (firebaseApp) return firebaseApp;

  try {
    // Dynamic import to allow test environments without Firebase credentials
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin') as {
      apps: unknown[];
      initializeApp: (options: object) => void;
      messaging: () => FirebaseAdminApp['messaging'];
    };

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: {
          projectId: env.FIREBASE_PROJECT_ID,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
        },
      });
    }

    firebaseApp = {
      messaging: () => admin.messaging() as ReturnType<FirebaseAdminApp['messaging']>,
    };

    return firebaseApp;
  } catch (err) {
    console.error('[FCM] Failed to initialize Firebase Admin:', err);
    return null;
  }
}

// ── Notification payload types ────────────────────────────────────────────────

export interface ManagerAlertPayload {
  type: 'incident' | 'delay' | 'route_completed' | 'delivery_completed';
  driver_name: string;
  store_name?: string;
  notes?: string;
  delivery_id?: string;
  route_id?: string;
}

export interface DriverNotificationPayload {
  type: 'new_route' | 'route_updated' | 'route_cancelled';
  route_id: string;
  date: string;
  message?: string;
}

// ── Service class ─────────────────────────────────────────────────────────────

export class NotificationService {
  /**
   * Send an alert notification to manager(s).
   * @param managerFcmTokens — list of manager FCM tokens to notify
   * @param payload          — alert details
   */
  async sendManagerAlert(
    managerFcmTokens: string[],
    payload: ManagerAlertPayload,
  ): Promise<void> {
    const validTokens = managerFcmTokens.filter(Boolean);
    if (validTokens.length === 0) {
      console.warn('[FCM] No valid manager FCM tokens — skipping notification');
      return;
    }

    const { title, body } = this.buildManagerAlertText(payload);
    const data = this.buildData(payload);

    await this.sendMulticast(validTokens, title, body, data, 'high');
  }

  /**
   * Send a push notification to a specific driver.
   * @param driverFcmToken — driver's FCM token
   * @param payload        — notification details
   */
  async sendDriverNotification(
    driverFcmToken: string | null,
    payload: DriverNotificationPayload,
  ): Promise<void> {
    if (!driverFcmToken) {
      console.warn('[FCM] Driver has no FCM token — skipping push notification');
      return;
    }

    const { title, body } = this.buildDriverNotificationText(payload);
    await this.sendSingle(driverFcmToken, title, body, {
      type: payload.type,
      route_id: payload.route_id,
      date: payload.date,
    });
  }

  /**
   * Notify managers of an incident.
   */
  async notifyIncident(
    managerFcmTokens: string[],
    driverName: string,
    storeName: string,
    notes: string,
    deliveryId: string,
  ): Promise<void> {
    return this.sendManagerAlert(managerFcmTokens, {
      type: 'incident',
      driver_name: driverName,
      store_name: storeName,
      notes,
      delivery_id: deliveryId,
    });
  }

  /**
   * Notify managers of a delay (driver > 15 min late).
   */
  async notifyDelay(
    managerFcmTokens: string[],
    driverName: string,
    storeName: string,
    estimatedDelayMinutes: number,
  ): Promise<void> {
    return this.sendManagerAlert(managerFcmTokens, {
      type: 'delay',
      driver_name: driverName,
      store_name: storeName,
      notes: `Retard estimé: ${estimatedDelayMinutes} minutes`,
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildManagerAlertText(payload: ManagerAlertPayload): { title: string; body: string } {
    switch (payload.type) {
      case 'incident':
        return {
          title: `🚨 Incident — ${payload.driver_name}`,
          body: payload.store_name
            ? `Incident signalé chez ${payload.store_name}${payload.notes ? `: ${payload.notes}` : ''}`
            : payload.notes ?? 'Incident signalé',
        };
      case 'delay':
        return {
          title: `⏰ Retard — ${payload.driver_name}`,
          body: payload.store_name
            ? `Retard signalé pour ${payload.store_name}${payload.notes ? ` (${payload.notes})` : ''}`
            : payload.notes ?? 'Retard signalé',
        };
      case 'route_completed':
        return {
          title: `✅ Tournée terminée — ${payload.driver_name}`,
          body: 'Toutes les livraisons ont été effectuées',
        };
      case 'delivery_completed':
        return {
          title: `📦 Livraison effectuée — ${payload.driver_name}`,
          body: payload.store_name ? `Livraison terminée chez ${payload.store_name}` : 'Livraison terminée',
        };
    }
  }

  private buildDriverNotificationText(payload: DriverNotificationPayload): { title: string; body: string } {
    switch (payload.type) {
      case 'new_route':
        return {
          title: '📋 Nouvelle tournée',
          body: payload.message ?? `Votre tournée du ${payload.date} est prête`,
        };
      case 'route_updated':
        return {
          title: '🔄 Tournée mise à jour',
          body: payload.message ?? `Votre tournée du ${payload.date} a été modifiée`,
        };
      case 'route_cancelled':
        return {
          title: '❌ Tournée annulée',
          body: payload.message ?? `Votre tournée du ${payload.date} a été annulée`,
        };
    }
  }

  private buildData(payload: ManagerAlertPayload): Record<string, string> {
    const data: Record<string, string> = { type: payload.type };
    if (payload.delivery_id) data['delivery_id'] = payload.delivery_id;
    if (payload.route_id) data['route_id'] = payload.route_id;
    return data;
  }

  private async sendSingle(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    priority: 'high' | 'normal' = 'normal',
  ): Promise<void> {
    const app = getFirebaseApp();
    if (!app) {
      console.warn('[FCM] Firebase not initialized — skipping push');
      return;
    }

    const message: FcmMessage = {
      token,
      notification: { title, body },
      android: { priority },
      apns: { payload: { aps: { sound: priority === 'high' ? 'default' : '' } } },
    };
    if (data) message.data = data;

    try {
      const msgId = await app.messaging().send(message);
      console.log(`[FCM] Sent: ${msgId}`);
    } catch (err) {
      console.error('[FCM] Failed to send message:', err);
    }
  }

  private async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    priority: 'high' | 'normal' = 'normal',
  ): Promise<void> {
    const app = getFirebaseApp();
    if (!app) {
      console.warn('[FCM] Firebase not initialized — skipping push');
      return;
    }

    const message: FcmMulticastMessage = {
      tokens,
      notification: { title, body },
      android: { priority },
    };
    if (data) message.data = data;

    try {
      const result = await app.messaging().sendMulticast(message);
      console.log(`[FCM] Multicast: ${result.successCount} success, ${result.failureCount} failures`);
    } catch (err) {
      console.error('[FCM] Failed to send multicast:', err);
    }
  }
}
