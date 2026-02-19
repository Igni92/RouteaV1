/**
 * GPSTrackingService
 * AGENT-BACKEND-API is responsible for the full implementation.
 * See /docs/ARCHITECTURE.md § 3.2 for specification.
 *
 * Responsibilities:
 *   - Store driver location in Redis (TTL 60s)
 *   - Insert into gps_logs (async)
 *   - Broadcast via WebSocket to manager dashboard
 *   - Heartbeat / offline detection
 */

// TODO (AGENT-BACKEND-API): Implement GPS tracking service

export {};
