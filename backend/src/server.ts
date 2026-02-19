/**
 * GERVIFRAIS — Express API Server
 * Entry point for the backend application.
 * AGENT-BACKEND-API is responsible for the full implementation.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { env } from './config/env';

// Route imports (to be implemented by AGENT-BACKEND-API)
import { apiRouter } from './api/routes';

const app = express();
const httpServer = createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── WebSocket Server ──────────────────────────────────────────────────────────
export const wss = new WebSocketServer({ server: httpServer, path: '/api/socket' });

wss.on('connection', (ws) => {
  console.log('[WS] New client connected');
  ws.on('close', () => console.log('[WS] Client disconnected'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`[SERVER] GERVIFRAIS API running on port ${PORT}`);
  console.log(`[SERVER] Environment: ${env.NODE_ENV}`);
});

export default app;
