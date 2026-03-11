/**
 * GERVIFRAIS — Express API Server
 * AGENT-BACKEND-API (full implementation)
 *
 * Endpoints: see /docs/API_CONTRACT.md
 * WebSocket: see /docs/REALTIME_PROTOCOL.md
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';
import { env } from './config/env';
import { apiRouter } from './api/routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { GPSTrackingService } from './services/gpsTracking';
import { validateWsToken } from './middleware/auth';
import type { WsMessage, WsDriverLocation } from '../../shared/types';

// ── Express App ───────────────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

// ── Redis ─────────────────────────────────────────────────────────────────────

const redis = new Redis(env.REDIS_URL, {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    console.log(`[REDIS] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => console.log('[REDIS] Connected'));
redis.on('error', (err) => console.error('[REDIS] Error:', err));

// ── WebSocket Server ──────────────────────────────────────────────────────────

export const wss = new WebSocketServer({ server: httpServer, path: '/api/socket' });

// Initialize GPS tracking service (needs Redis + WSS)
export const gpsTrackingService = new GPSTrackingService(redis, wss);

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  // Authenticate via query parameter token
  const url = new URL(req.url ?? '', `http://localhost`);
  const token = url.searchParams.get('token');
  const user = token ? validateWsToken(token) : null;

  if (!user) {
    console.warn('[WS] Rejected unauthenticated connection');
    ws.close(4001, 'Unauthorized');
    return;
  }

  console.log(`[WS] Connected: user=${user.user_id} company=${user.company_id}`);

  // Ping/pong heartbeat
  let isAlive = true;
  const pingInterval = setInterval(() => {
    if (!isAlive) {
      console.warn(`[WS] Client ${user.user_id} timed out — terminating`);
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 30_000);

  ws.on('pong', () => { isAlive = true; });

  // Handle incoming messages (driver GPS updates)
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as WsMessage;

      if (message.type === 'driver_location') {
        const gpsMsg = message as WsDriverLocation;

        // Validate the driver belongs to the same company (simplified — full check needs DB)
        if (!gpsMsg.driver_id || !gpsMsg.lat || !gpsMsg.lng) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'INVALID_MESSAGE',
            message: 'Missing required GPS fields',
            timestamp: new Date().toISOString(),
          }));
          return;
        }

        gpsTrackingService.processLocation(gpsMsg).then((accepted) => {
          if (!accepted) {
            console.debug(`[WS] GPS update rejected (stale): driver=${gpsMsg.driver_id} seq=${gpsMsg.sequence}`);
          }
        }).catch((err) => {
          console.error('[WS] GPS processing error:', err);
        });
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          code: 'UNKNOWN_TYPE',
          message: `Unknown message type: ${(message as { type?: string }).type}`,
          timestamp: new Date().toISOString(),
        }));
      }
    } catch {
      ws.send(JSON.stringify({
        type: 'error',
        code: 'INVALID_MESSAGE',
        message: 'Failed to parse message JSON',
        timestamp: new Date().toISOString(),
      }));
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    console.log(`[WS] Disconnected: user=${user.user_id}`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for user=${user.user_id}:`, err);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'notification',
    level: 'info',
    message: 'Connected to GERVIFRAIS real-time service',
    timestamp: new Date().toISOString(),
  }));
});

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/api', apiRouter);

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redis.status,
    ws_clients: wss.clients.size,
  });
});

// ── Error Handling ────────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log(`[SERVER] GERVIFRAIS API running on port ${PORT}`);
  console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
  console.log(`[SERVER] WebSocket: ws://localhost:${PORT}/api/socket`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received — graceful shutdown');
  httpServer.close(() => {
    redis.disconnect();
    console.log('[SERVER] Server closed');
    process.exit(0);
  });
});

export default app;
