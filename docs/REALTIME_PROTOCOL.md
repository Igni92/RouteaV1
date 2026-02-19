# REALTIME PROTOCOL — WebSocket Specification
> IMMUTABLE — Created by AGENT-BACKEND-API | Do not modify
> Version: 1.0.0 | Created: 2026-02-19

---

## Overview

GERVIFRAIS uses WebSocket for real-time communication between:
- **Driver App** (React Native) → sends GPS positions
- **Backend Server** (Express/ws) → relays to manager, caches in Redis
- **Manager Dashboard** (React) → displays live map + delivery updates

The WebSocket endpoint is: `ws://host:3000/api/socket`

---

## 1. Connection Protocol

### 1.1 Connection Establishment

```
Client → Server: HTTP GET /api/socket
  Headers:
    Upgrade: websocket
    Connection: Upgrade
    Sec-WebSocket-Key: <base64>

  Query Parameters:
    ?token=<JWT_access_token>   (required for auth)
```

The server validates the JWT token on connection. If invalid, the connection
is immediately closed with code 4001 (Unauthorized).

### 1.2 Connection Codes

| Code | Meaning |
|------|---------|
| 1000 | Normal closure |
| 4001 | Unauthorized (invalid/missing token) |
| 4002 | Rate limit exceeded |
| 4003 | Server shutting down |

### 1.3 Ping/Pong Heartbeat

Server sends a WebSocket ping every 30 seconds.
Client must respond with pong within 10 seconds.
If no pong received, server closes connection (code 1001 — going away).

---

## 2. Message Format

All messages are JSON objects with a `type` discriminator field.

### 2.1 Base Message Shape

```typescript
interface BaseMessage {
  type: string;     // message type discriminator
  timestamp: string; // ISO 8601 — sender's timestamp
}
```

---

## 3. Message Types

### 3.1 driver_location (Driver → Server → Manager)

Sent by the driver app to report GPS position.
Relayed by the server to all connected manager clients.

```typescript
interface WsDriverLocation {
  type: 'driver_location';
  driver_id: string;   // UUID
  lat: number;         // latitude (7 decimal places)
  lng: number;         // longitude (7 decimal places)
  accuracy: number | null;  // GPS accuracy in meters
  speed: number | null;     // speed in km/h
  sequence: number;    // monotonically increasing integer per driver
  timestamp: string;   // ISO 8601 — GPS fix timestamp (client-side)
}
```

**Example:**
```json
{
  "type": "driver_location",
  "driver_id": "b7c3d2e1-...",
  "lat": 48.7627,
  "lng": 2.3486,
  "accuracy": 5.2,
  "speed": 42.0,
  "sequence": 1047,
  "timestamp": "2026-02-19T04:23:15.000Z"
}
```

**Server actions on receive:**
1. Validate driver_id exists
2. Check sequence number (deduplication — see §4)
3. Store in Redis: `driver:latest-location:{driver_id}` (TTL 60s)
4. Insert into `gps_logs` table (async, non-blocking)
5. Broadcast to all manager WebSocket clients

---

### 3.2 delivery_update (Server → Manager)

Sent by the server when a delivery status changes.

```typescript
interface WsDeliveryUpdate {
  type: 'delivery_update';
  delivery_id: string;   // UUID
  status: DeliveryStatus;
  driver_id: string;     // UUID
  timestamp: string;     // ISO 8601
}
```

**Triggered by:** `POST /api/deliveries/:id/events`

---

### 3.3 notification (Server → Manager)

System alerts and notifications for the manager dashboard.

```typescript
interface WsNotification {
  type: 'notification';
  level: 'info' | 'warning' | 'error';
  message: string;
  driver_id?: string;    // related driver (optional)
  delivery_id?: string;  // related delivery (optional)
  timestamp: string;
}
```

**Notification triggers:**

| Level | Trigger |
|-------|---------|
| `warning` | Driver is delayed > 15 minutes past expected arrival |
| `error` | Driver reports an incident (`event_type = 'problem'`) |
| `info` | Route started, route completed, delivery completed |

**Example — incident alert:**
```json
{
  "type": "notification",
  "level": "error",
  "message": "Incident signalé par Hugo Vachey — Auchan Marne-la-Vallée",
  "driver_id": "b7c3d2e1-...",
  "delivery_id": "d1-...",
  "timestamp": "2026-02-19T04:23:15.000Z"
}
```

---

### 3.4 route_update (Server → Manager)

Sent when a route's status changes.

```typescript
interface WsRouteUpdate {
  type: 'route_update';
  route_id: string;
  status: RouteStatus;   // 'planned' | 'in_progress' | 'completed'
  driver_id: string;
  timestamp: string;
}
```

---

## 4. Sequence Numbering & Deduplication

### 4.1 Purpose

GPS messages may arrive out-of-order due to:
- Network retransmissions
- Mobile network switching (4G → WiFi)
- Packet reordering

The `sequence` field prevents stale updates from overwriting fresh ones.

### 4.2 Sequence Rules

```
Rule 1: Sequence numbers are per-driver, monotonically increasing (from 1).
Rule 2: Server stores `lastSeq[driver_id]` in Redis.
Rule 3: If incoming.sequence <= lastSeq[driver_id], DISCARD the message (duplicate/stale).
Rule 4: If incoming.sequence > lastSeq[driver_id], ACCEPT and update lastSeq.
Rule 5: Sequence numbers reset to 0 when the driver app restarts.
        The server detects reset if incoming.sequence < lastSeq by large margin (> 1000).
        On detected reset, server accepts and resets its lastSeq.
```

### 4.3 Redis Key Schema

```
driver:latest-location:{driver_id}  →  JSON string of RedisDriverLocation
  TTL: 60 seconds (driver considered offline if no update for 60s)

driver:last-sequence:{driver_id}    →  integer string
  TTL: 300 seconds
```

### 4.4 Out-of-Order Detection

```
Incoming sequence = 1047
Stored lastSeq    = 1052

1047 <= 1052 → DISCARD (stale packet)
```

```
Incoming sequence = 1053
Stored lastSeq    = 1052

1053 > 1052 → ACCEPT, update Redis, broadcast
```

### 4.5 Sequence Reset Detection

```
Incoming sequence = 5
Stored lastSeq    = 1800

5 < 1800 by > 1000 → SEQUENCE RESET detected
→ Accept, reset lastSeq to 5
→ Log warning: "Sequence reset detected for driver {driver_id}"
```

---

## 5. Redis Cache Schema

### 5.1 Driver Latest Location

```
Key:   driver:latest-location:{driver_id}
Type:  String (JSON)
TTL:   60 seconds
Value:
{
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  sequence: number;
  timestamp: string;   // ISO 8601
  route_id: string | null;
}
```

### 5.2 Driver Last Sequence

```
Key:   driver:last-sequence:{driver_id}
Type:  String (integer)
TTL:   300 seconds
Value: "1047"
```

### 5.3 Offline Detection

A driver is considered **offline** if their `driver:latest-location` key has expired
(TTL = 60s, no update for > 60s).

The manager dashboard polls `GET /api/drivers/:id` or uses the WS stream to detect
driver online/offline status.

---

## 6. Room-based Broadcasting (Manager Subscriptions)

All manager WebSocket clients are in a single broadcast group.
All GPS updates from any driver are sent to all connected managers.

Future: implement room-based subscriptions per driver or per route.

---

## 7. Error Handling

### 7.1 Malformed Message

If the server receives an unparseable JSON message, it responds with:
```json
{
  "type": "error",
  "code": "INVALID_MESSAGE",
  "message": "Failed to parse message JSON",
  "timestamp": "2026-02-19T04:23:15.000Z"
}
```
The connection is NOT closed.

### 7.2 Unknown Message Type

```json
{
  "type": "error",
  "code": "UNKNOWN_TYPE",
  "message": "Unknown message type: xyz",
  "timestamp": "2026-02-19T04:23:15.000Z"
}
```

---

## 8. Driver App Integration

The driver app sends GPS updates every **10 seconds** while a route is active.
GPS updates stop when the route is completed or the app is backgrounded.

**Driver app GPS update flow:**
```
1. expo-location fires GPS fix
2. Increment local sequence counter
3. Send WsDriverLocation via WebSocket
4. If WebSocket disconnected: buffer last 10 positions
5. On reconnect: send buffered positions in order
```

---

## 9. Manager Dashboard Integration

The manager dashboard connects on page load and maintains a persistent WebSocket.

**Dashboard WS flow:**
```
1. Connect to ws://host/api/socket?token=<JWT>
2. Receive driver_location → update map marker
3. Receive delivery_update → update delivery list
4. Receive notification → show alert banner
5. Receive route_update → update route status card
6. On WS disconnect: show "Reconnecting..." indicator, retry every 5s
```

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-BACKEND-API | IMMUTABLE*
