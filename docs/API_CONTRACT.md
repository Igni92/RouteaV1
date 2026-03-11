# API CONTRACT — GERVIFRAIS Backend REST + WebSocket
> IMMUTABLE — Created by AGENT-BACKEND-API | Do not modify
> Version: 1.0.0 | Created: 2026-02-19

---

## Base URL

```
Development: http://localhost:3000
Production:  https://api.gervifrais.fr
```

All REST endpoints are prefixed with `/api`.
Authentication: JWT Bearer token (except `/api/auth/login` and `/api/auth/signup`).

---

## Common Response Schemas

### Success Response
```typescript
interface ApiSuccess<T> {
  success: true;
  data: T;
}
```

### Error Response
```typescript
interface ApiError {
  success: false;
  error: string;
  details?: string[];  // validation error details
  code?: string;       // machine-readable error code
}
```

### HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | OK — request succeeded |
| 201 | Created — resource created |
| 400 | Bad Request — validation error |
| 401 | Unauthorized — missing or invalid JWT |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource not found |
| 409 | Conflict — duplicate resource |
| 422 | Unprocessable Entity — business logic error |
| 500 | Internal Server Error |

---

## 1. AUTHENTICATION

### POST /api/auth/signup

Create a new user account.

**Request Body:**
```typescript
interface SignupRequest {
  email: string;       // valid email
  password: string;    // min 8 chars
  company_id: string;  // UUID of existing company
  role?: 'manager' | 'admin';
  fcm_token?: string;
}
```

**Response 201:**
```typescript
interface SignupResponse {
  user: User;
  tokens: AuthTokens;
}
```

**Errors:**
- `400` — Missing/invalid fields
- `409` — Email already exists

**Example:**
```bash
POST /api/auth/signup
{
  "email": "hugo@gervifrais.fr",
  "password": "securepass123",
  "company_id": "uuid-company"
}
```

---

### POST /api/auth/login

Authenticate and receive JWT tokens.

**Request Body:**
```typescript
interface LoginRequest {
  email: string;
  password: string;
  fcm_token?: string;  // update FCM token on login
}
```

**Response 200:**
```typescript
interface LoginResponse {
  user: User;
  tokens: {
    access_token: string;    // JWT, expires in 1h
    refresh_token: string;   // JWT, expires in 7d
    expires_in: number;      // 3600
    token_type: 'Bearer';
  };
}
```

**Errors:**
- `400` — Missing fields
- `401` — Invalid credentials

---

### POST /api/auth/logout

Invalidate the current session.

**Headers:** `Authorization: Bearer <access_token>`

**Response 200:**
```typescript
{ success: true; data: { message: 'Logged out successfully' } }
```

---

## 2. ROUTES MANAGEMENT

### GET /api/routes

List all routes for the authenticated company.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
```
?date=YYYY-MM-DD    (filter by date)
?status=planned|in_progress|completed
?driver_id=UUID
?page=1
?per_page=20
```

**Response 200:**
```typescript
interface RouteListResponse {
  data: RouteWithDetails[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}
```

---

### POST /api/routes

Create a new route.

**Request Body:**
```typescript
interface CreateRouteBody {
  date: string;              // "YYYY-MM-DD"
  driver_id: string;         // UUID
  vehicle_id: string;        // UUID
  deliveries_ordered?: string[];  // optional: pre-ordered delivery UUIDs
}
```

**Response 201:**
```typescript
{ success: true; data: Route }
```

**Errors:**
- `400` — Missing required fields
- `404` — driver_id or vehicle_id not found
- `422` — Driver already has a route on that date

---

### GET /api/routes/:id

Get a single route with full details.

**Response 200:**
```typescript
{ success: true; data: RouteWithDetails }
```

**Errors:**
- `404` — Route not found

---

### PATCH /api/routes/:id

Update route properties (status, deliveries order, etc.).

**Request Body:**
```typescript
interface UpdateRouteBody {
  status?: RouteStatus;
  deliveries_ordered?: string[];
  started_at?: string;        // ISO 8601
  completed_at?: string;      // ISO 8601
  estimated_total_km?: number;
  estimated_total_minutes?: number;
}
```

**Response 200:**
```typescript
{ success: true; data: Route }
```

**Errors:**
- `400` — Invalid status transition
- `404` — Route not found

---

### POST /api/routes/:id/optimize

Trigger route optimization using the RouteOptimizationService.
Replaces `deliveries_ordered` with the optimized order.

**Request Body:**
```typescript
interface OptimizeRouteBody {
  delivery_ids: string[];   // delivery UUIDs to include in optimization
  num_drivers?: number;     // default: 1 (this route's driver)
}
```

**Response 200:**
```typescript
interface OptimizeRouteResponse {
  route: Route;
  optimization_result: {
    feasibility: 'VALID' | 'INVALID';
    estimated_total_km: number;
    estimated_total_minutes: number;
    errors?: Array<{
      delivery_id: string;
      constraint: string;
      message: string;
    }>;
  };
}
```

**Errors:**
- `400` — delivery_ids is empty
- `404` — Route not found
- `422` — optimization returned INVALID (route is saved but flagged)

---

### DELETE /api/routes/:id

Delete a route (only if status is 'planned').

**Response 200:**
```typescript
{ success: true; data: { message: 'Route deleted', id: string } }
```

**Errors:**
- `400` — Cannot delete a route in_progress or completed
- `404` — Route not found

---

## 3. DELIVERIES

### GET /api/deliveries

List deliveries for the company.

**Query Parameters:**
```
?route_id=UUID
?status=pending|assigned|in_route|arrived|completed|failed
?date=YYYY-MM-DD
?page=1
?per_page=50
```

**Response 200:**
```typescript
{ success: true; data: PaginatedResponse<DeliveryWithWindow> }
```

---

### POST /api/deliveries

Create a new delivery.

**Request Body:**
```typescript
interface CreateDeliveryBody {
  reception_window_id: string;  // UUID
  client_deadline: string;      // "HH:MM"
  address: string;
  latitude: number;
  longitude: number;
  weight_kg?: number;
  estimated_time_at_site?: number;  // minutes, default 15
  priority?: number;                // 1-5, default 3
  notes?: string;
  order_id?: string;
}
```

**Response 201:**
```typescript
{ success: true; data: Delivery }
```

**Errors:**
- `400` — Missing required fields / invalid time format
- `404` — reception_window_id not found
- `422` — client_deadline before reception_window.open_time

---

### PATCH /api/deliveries/:id

Update delivery details (only when status = 'pending' or 'assigned').

**Request Body:** Partial of CreateDeliveryBody

**Response 200:**
```typescript
{ success: true; data: Delivery }
```

---

### POST /api/deliveries/:id/events

Record a delivery lifecycle event.

**Request Body:**
```typescript
interface CreateDeliveryEventBody {
  event_type: 'departed' | 'arrived' | 'completed' | 'failed' | 'delayed' | 'problem';
  driver_id: string;
  route_id?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  timestamp?: string;  // ISO 8601, defaults to server time
}
```

**Response 201:**
```typescript
{ success: true; data: DeliveryEvent }
```

**Side effects:**
- Updates `delivery.status` to match the event
- Triggers push notification to manager if `event_type = 'problem'` or `'delayed'`
- Broadcasts `WsDeliveryUpdate` message to all manager WebSocket clients

**Errors:**
- `400` — Invalid event_type
- `404` — Delivery not found
- `422` — Invalid status transition

---

### POST /api/deliveries/:id/proof

Upload delivery proof photos.

**Content-Type:** `multipart/form-data`

**Request Fields:**
```
photo_marchandise: File  (JPEG/PNG, max 10MB)
photo_bl_tamonne:  File  (JPEG/PNG, max 10MB)
driver_id:         string  (UUID)
```

**Response 201:**
```typescript
interface DeliveryProofResponse {
  delivery_proof: DeliveryProof;
  photo_marchandise_url: string;  // signed S3 URL (24h)
  photo_bl_tamonne_url: string;   // signed S3 URL (24h)
}
```

**Errors:**
- `400` — Missing required photos / invalid file type
- `413` — File too large (> 10MB)
- `404` — Delivery not found

---

## 4. DRIVERS

### GET /api/drivers

List all drivers for the company.

**Query Parameters:**
```
?is_active=true|false
?page=1&per_page=20
```

**Response 200:**
```typescript
{ success: true; data: PaginatedResponse<Driver> }
```

---

### POST /api/drivers

Register a new driver.

**Request Body:**
```typescript
interface CreateDriverBody {
  name: string;
  phone: string;
  email?: string;
  vehicle_id?: string;    // UUID
  license_number: string;
  rgpd_consent?: boolean;
}
```

**Response 201:**
```typescript
{ success: true; data: Driver }
```

**Errors:**
- `400` — Missing required fields
- `409` — Phone or license_number already registered

---

### GET /api/drivers/:id

Get a single driver's details.

**Response 200:**
```typescript
{ success: true; data: Driver }
```

---

### GET /api/drivers/:id/gps-stream

**WebSocket upgrade** — stream real-time driver GPS position.

This endpoint upgrades the HTTP connection to WebSocket.
The server sends GPS update messages in real-time as drivers broadcast their positions.

**Message format (server → client):**
```typescript
interface WsDriverLocation {
  type: 'driver_location';
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  sequence: number;
  timestamp: string;  // ISO 8601
}
```

See `/docs/REALTIME_PROTOCOL.md` for full WebSocket protocol.

---

### POST /api/drivers/:id/rating

Submit a driver performance rating for a completed delivery.

**Request Body:**
```typescript
interface CreateDriverRatingBody {
  delivery_id: string;         // UUID
  efficiency_score: number;    // 1.00–5.00
  punctuality_score: number;   // 1.00–5.00
  time_at_site_score: number;  // 1.00–5.00
  incident_score: number;      // 1.00–5.00 (5 = no incidents)
  notes?: string;
}
```

**Response 201:**
```typescript
{
  success: true;
  data: {
    rating: DriverRating;
    new_average: number;   // updated driver.rating
  }
}
```

**Errors:**
- `400` — Scores out of 1-5 range
- `404` — Driver or delivery not found
- `409` — Rating already submitted for this delivery

---

## 5. VEHICLES

### GET /api/vehicles

List all vehicles for the company.

**Query Parameters:**
```
?status=active|maintenance|retired
```

**Response 200:**
```typescript
{ success: true; data: Vehicle[] }
```

---

### POST /api/vehicles

Register a new vehicle.

**Request Body:**
```typescript
interface CreateVehicleBody {
  registration_plate: string;
  brand: string;
  model: string;
  year: number;
  capacity_kg: number;
  status?: VehicleStatus;        // default: 'active'
  last_maintenance_date?: string;  // "YYYY-MM-DD"
  next_maintenance_date?: string;
  notes?: string;
}
```

**Response 201:**
```typescript
{ success: true; data: Vehicle }
```

**Errors:**
- `409` — registration_plate already registered

---

### PATCH /api/vehicles/:id

Update vehicle details.

**Request Body:** Partial of CreateVehicleBody

**Response 200:**
```typescript
{ success: true; data: Vehicle }
```

---

## 6. WEBSOCKET

### /api/socket

Main WebSocket endpoint for the manager dashboard.

**Connection:** `ws://localhost:3000/api/socket`
**Authentication:** Pass JWT as query param: `?token=<access_token>`

**Server → Client messages:**

```typescript
// Driver GPS update
{
  type: 'driver_location';
  driver_id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  sequence: number;     // monotonically increasing per driver
  timestamp: string;    // ISO 8601
}

// Delivery status update
{
  type: 'delivery_update';
  delivery_id: string;
  status: DeliveryStatus;
  driver_id: string;
  timestamp: string;
}

// System notification (alerts, incidents)
{
  type: 'notification';
  level: 'info' | 'warning' | 'error';
  message: string;
  driver_id?: string;
  delivery_id?: string;
  timestamp: string;
}

// Route status update
{
  type: 'route_update';
  route_id: string;
  status: RouteStatus;
  driver_id: string;
  timestamp: string;
}
```

**Client → Server messages:**

```typescript
// GPS update from driver app (for backward compatibility)
{
  type: 'driver_location';
  driver_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  sequence: number;
  timestamp: string;
}
```

See `/docs/REALTIME_PROTOCOL.md` for full deduplication and ordering protocol.

---

## 7. RECEPTION WINDOWS

### GET /api/reception-windows

List all reception windows for the company.

**Response 200:**
```typescript
{ success: true; data: ReceptionWindow[] }
```

---

### POST /api/reception-windows

Create a reception window for a store.

**Request Body:**
```typescript
interface CreateReceptionWindowBody {
  store_name: string;
  store_address: string;
  store_lat: number;
  store_lng: number;
  store_phone?: string;
  store_email?: string;
  open_time: string;    // "HH:MM"
  close_time: string;   // "HH:MM", must be > open_time
  days_of_week: DayOfWeek[];
}
```

**Response 201:**
```typescript
{ success: true; data: ReceptionWindow }
```

---

## 8. DASHBOARD KPIs

### GET /api/dashboard/kpi

Get daily KPI summary.

**Query Parameters:**
```
?date=YYYY-MM-DD  (default: today)
```

**Response 200:**
```typescript
{ success: true; data: DailyKPI }
```

Where `DailyKPI`:
```typescript
{
  date: string;
  total_deliveries: number;
  completed: number;
  in_progress: number;
  pending: number;
  failed: number;
  delayed: number;
  on_time_rate: number;  // 0.0–1.0
}
```

---

## Error Code Reference

| Code | Description |
|------|-------------|
| `AUTH_MISSING` | No Authorization header |
| `AUTH_INVALID` | JWT is invalid or expired |
| `VALIDATION_ERROR` | Request body fails validation |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `DUPLICATE_RESOURCE` | Unique constraint violation |
| `BUSINESS_RULE_VIOLATION` | Domain rule violated (e.g., delete in-progress route) |
| `OPTIMIZATION_INFEASIBLE` | Route optimization returned INVALID |
| `UPLOAD_FAILED` | S3 upload error |
| `INTERNAL_ERROR` | Unexpected server error |

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-BACKEND-API | IMMUTABLE*
