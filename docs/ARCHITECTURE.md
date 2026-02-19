# ARCHITECTURE — GERVIFRAIS Fleet Management App
> IMMUTABLE — Created by AGENT-ARCHITECTURE | Do not modify

---

## 1. High-Level System Overview

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        GERVIFRAIS — SYSTEM ARCHITECTURE                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ┌─────────────────────────┐         ┌─────────────────────────┐
  │   MANAGER DASHBOARD     │         │     DRIVER APP           │
  │   (React / Web)         │         │   (React Native/Expo)    │
  │                         │         │                          │
  │  • Mapbox real-time map │         │  • Delivery list         │
  │  • KPI cards            │         │  • Navigation (Waze)     │
  │  • Route planning       │         │  • Photo proof upload    │
  │  • Notifications        │         │  • Status updates        │
  └───────────┬─────────────┘         └────────────┬────────────┘
              │  HTTPS + WebSocket                  │  HTTPS + WebSocket
              │                                     │
  ════════════╪═════════════════════════════════════╪═══════════════
              │                                     │
              ▼                                     ▼
  ┌───────────────────────────────────────────────────────────────┐
  │                    BACKEND — Node.js / Express                │
  │                                                               │
  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
  │  │  REST API        │  │  WebSocket       │  │  Auth       │ │
  │  │  /api/*          │  │  /api/socket     │  │  JWT        │ │
  │  └────────┬─────────┘  └────────┬─────────┘  └──────┬──────┘ │
  │           │                     │                    │        │
  │  ┌────────▼─────────────────────▼────────────────────▼──────┐ │
  │  │                     SERVICE LAYER                         │ │
  │  │                                                           │ │
  │  │  RouteOptimizationService  │  GPSTrackingService         │ │
  │  │  NotificationService       │  DeliveryProofService        │ │
  │  │  DriverRatingService                                      │ │
  │  └────────┬──────────────────────────────────────────────────┘ │
  └───────────┼───────────────────────────────────────────────────┘
              │
  ════════════╪═══════════════════════════════════════════════════
              │
  ┌───────────▼────────────────────────────────────────────────────┐
  │                     DATA LAYER                                 │
  │                                                                │
  │  ┌──────────────────────┐    ┌──────────────────────────────┐ │
  │  │  PostgreSQL           │    │  Redis                       │ │
  │  │  (Supabase)           │    │  (GPS Cache / Sessions)      │ │
  │  │  11 tables            │    │  TTL: 60s per driver         │ │
  │  └──────────────────────┘    └──────────────────────────────┘ │
  │                                                                │
  │  ┌──────────────────────┐    ┌──────────────────────────────┐ │
  │  │  AWS S3              │    │  Firebase FCM                │ │
  │  │  (Delivery photos)   │    │  (Push notifications)        │ │
  │  └──────────────────────┘    └──────────────────────────────┘ │
  └────────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Structure

```
RouteaV1/                          ← Root monorepo
│
├── backend/                       ← Node.js / Express API server
├── frontend-manager/              ← React web dashboard (managers)
├── app-driver/                    ← React Native / Expo (drivers)
├── shared/                        ← Shared TypeScript types
├── docs/                          ← Documentation (IMMUTABLE specs)
├── docker-compose.yml             ← Local dev orchestration
├── .gitignore
└── README.md
```

---

## 3. Service Breakdown

### 3.1 RouteOptimizationService
- **Purpose**: Assign deliveries to drivers respecting hard time-window constraints
- **Input**: `deliveries[]`, `drivers[]`, `vehicles[]`, `date`
- **Output**: `routes[]` — one per driver, ordered delivery list
- **Algorithm**: Nearest Neighbor TSP → 2-OPT local search → feasibility validation
- **Constraint (HARD)**: Double fenêtre (reception window + client deadline)
- **Performance target**: < 2 minutes for 20 deliveries

### 3.2 GPSTrackingService
- **Purpose**: Real-time driver location tracking
- **Update frequency**: Every 30 seconds from driver app
- **Storage**: Redis cache (fast reads, 60s TTL) + PostgreSQL gps_logs (audit trail)
- **Delivery**: WebSocket push to manager dashboard
- **Deduplication**: Sequence numbering per driver
- **Heartbeat**: If no update in 90s → driver marked offline

### 3.3 NotificationService
- **Purpose**: Push alerts via Firebase Cloud Messaging (FCM)
- **Manager alerts**: Retard > 15min, incident declared by driver
- **Driver alerts**: New route assigned, route modification
- **Platform**: FCM (iOS + Android via Expo)

### 3.4 DeliveryProofService
- **Purpose**: Store photo evidence of deliveries
- **Photos per delivery**: 2 (merchandise + stamped BL)
- **Storage**: AWS S3 with signed URLs (expires 24h)
- **Sync**: Async upload — driver can capture offline, syncs when online
- **Metadata**: `driver_id`, `delivery_id`, `uploaded_at`, `synced_at`

### 3.5 DriverRatingService
- **Purpose**: Track driver performance over time
- **Scoring dimensions**: efficiency, punctuality, time_at_site, incident_rate
- **Auto-scoring**: Computed after each delivery completion
- **Manual override**: Manager can adjust scores with notes
- **Output**: Rolling average `rating` field on `drivers` table

---

## 4. Data Flow

### 4.1 Manager Creates a Route
```
Manager UI
  │ POST /api/routes (date, driver_id, vehicle_id)
  ▼
Backend API (routes controller)
  │ Creates route record (status: planned)
  ▼
RouteOptimizationService
  │ nearest_neighbor_tsp() → 2opt() → validate_feasibility()
  ▼
Database (routes table, deliveries_ordered updated)
  │
  ▼
NotificationService
  │ FCM push → Driver App ("Nouvelle tournée assignée")
  ▼
Driver App (receives push, fetches route details)
```

### 4.2 Driver GPS Updates (Real-time)
```
Driver App (every 30s)
  │ POST /api/drivers/:id/location { lat, lng, accuracy, speed, sequence }
  ▼
Backend API (gps controller)
  │ Store in Redis (key: driver:{id}:location, TTL 60s)
  │ INSERT into gps_logs (async, non-blocking)
  ▼
WebSocket broadcast
  │ { type: 'driver_location', driver_id, lat, lng, sequence, timestamp }
  ▼
Manager Dashboard (Mapbox marker updates in real-time)
```

### 4.3 Driver Arrives at Delivery
```
Driver App
  │ POST /api/deliveries/:id/events { event_type: 'arrived', lat, lng }
  ▼
Backend API (delivery events controller)
  │ Creates delivery_event record
  │ Updates delivery.status = 'arrived'
  │ Checks: is arrival_time within reception_window?
  │   YES → status remains OK
  │   NO  → flags as delayed, triggers NotificationService
  ▼
NotificationService (if delayed)
  │ FCM push → Manager ("⚠️ RETARD: Hugo Vachey chez Carrefour Orly")
  ▼
Manager Dashboard (delivery card turns red/amber)
```

### 4.4 Driver Completes Delivery (Photos)
```
Driver App (camera capture)
  │ Photo 1: merchandise
  │ Photo 2: stamped BL
  │ POST /api/deliveries/:id/proof (multipart form)
  ▼
Backend API (delivery proof controller)
  │ DeliveryProofService.upload(files) → S3
  │ Store URLs in delivery_proofs table
  │ Updates delivery.status = 'completed'
  ▼
DriverRatingService.autoScore(delivery_id)
  │ Computes punctuality, efficiency scores
  │ Updates driver_ratings + driver.rating average
  ▼
Manager Dashboard (delivery card turns green ✅)
```

---

## 5. Module Dependencies

```
shared/types.ts
  └── consumed by: backend, frontend-manager, app-driver (ALL)

backend/
  ├── config/env.ts          ← No deps
  ├── db/schema.sql          ← No deps
  ├── db/models.ts           ← depends on: types.ts, schema.sql
  ├── services/*.ts          ← depends on: models.ts, types.ts
  ├── api/controllers/*.ts   ← depends on: services/*.ts, types.ts
  └── api/routes.ts          ← depends on: controllers/*.ts

frontend-manager/
  ├── components/Map.tsx     ← depends on: types.ts, WebSocket client
  ├── components/KPI.tsx     ← depends on: types.ts
  ├── components/Dashboard.tsx ← depends on: Map.tsx, KPI.tsx
  └── App.tsx                ← depends on: Dashboard.tsx

app-driver/
  ├── services/api.ts        ← depends on: types.ts
  ├── services/camera.ts     ← depends on: Expo Camera
  ├── screens/*.tsx          ← depends on: services/, types.ts
  └── App.tsx                ← depends on: screens/
```

---

## 6. Tech Stack Justification

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Driver App | React Native + Expo | Cross-platform (iOS/Android), fast dev cycle, access to camera/GPS APIs |
| Manager Dashboard | React (Vite) | Mature ecosystem, Mapbox GL JS integration, component reuse |
| Backend | Node.js + Express | Same language as frontend (TypeScript), excellent real-time libs, team familiarity |
| Database | PostgreSQL (Supabase) | Relational integrity for fleet data, managed service reduces ops overhead, built-in auth |
| Cache | Redis | Sub-millisecond GPS reads, pub/sub for real-time updates, simple TTL management |
| Real-time | WebSocket (ws) | Native browser/RN support, lower overhead than polling for GPS updates |
| Maps | Mapbox | Better customization than Google Maps, offline tiles capability for drivers |
| Photos | AWS S3 | Industry standard, signed URLs for security, Expo ImagePicker integration |
| Push Notifications | Firebase FCM | Unified iOS/Android push, Expo integration via expo-notifications |
| Language | TypeScript (strict) | Type safety across monorepo, shared types prevent integration bugs |
| Containerization | Docker + docker-compose | Reproducible dev environment, production-ready images |

---

## 7. Security Considerations

- **Authentication**: JWT tokens (access: 15min, refresh: 7 days)
- **Authorization**: Role-based (manager | admin | driver)
- **RGPD**: GPS data consent required from drivers before tracking begins
- **Photos**: S3 signed URLs expire after 24h, no public access
- **API**: Rate limiting on all endpoints (express-rate-limit)
- **Secrets**: Never in code — all via environment variables

---

## 8. Scalability Notes (Post-MVP)

- Redis pub/sub can be swapped for Socket.IO rooms at scale
- PostgreSQL read replicas for analytics queries
- Route optimization can be extracted to a dedicated microservice
- S3 bucket versioning for photo audit trail
- Horizontal scaling of Express servers behind a load balancer

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-ARCHITECTURE*
