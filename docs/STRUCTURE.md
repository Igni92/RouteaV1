# PROJECT STRUCTURE — GERVIFRAIS Fleet Management App
> Created by AGENT-ARCHITECTURE | Last updated: 2026-02-19

This document lists every file in the monorepo, its purpose, the agent responsible
for creating/maintaining it, and its dependencies.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Created (AGENT-ARCHITECTURE phase) |
| 🔲 | Pending (assigned to another agent) |
| [IMMUTABLE] | Never modified after initial creation |
| [MUTABLE] | Updated over time |

---

## Root Level

```
RouteaV1/
├── .gitignore            ✅ [IMMUTABLE]  Ignore node_modules, .env, build artifacts
├── README.md             ✅ [MUTABLE]    Project overview, setup instructions
├── docker-compose.yml    ✅ [MUTABLE]    Local dev: postgres, redis, backend, manager UI
└── docs/                 (see Docs section below)
```

| File | Agent | Dependencies | Status |
|------|-------|-------------|--------|
| `.gitignore` | AGENT-ARCHITECTURE | none | ✅ |
| `README.md` | AGENT-ARCHITECTURE | none | ✅ |
| `docker-compose.yml` | AGENT-ARCHITECTURE | backend/, frontend-manager/ | ✅ |

---

## /docs — Documentation (Shared + Agent Context)

```
docs/
├── ARCHITECTURE.md              ✅ [IMMUTABLE]  System architecture, data flow, tech stack
├── MULTI-AGENT-PROTOCOL.md      ✅ [IMMUTABLE]  Agent collaboration rules
├── STRUCTURE.md                 ✅ [MUTABLE]    This file — complete file listing
├── DATABASE_SCHEMA.md           🔲 [IMMUTABLE]  11 tables spec (AGENT-DATABASE)
├── ALGORITHM_SPEC.md            🔲 [IMMUTABLE]  TSP + 2-OPT spec (AGENT-ALGO)
├── API_CONTRACT.md              🔲 [IMMUTABLE]  All REST + WS endpoints (AGENT-BACKEND-API)
├── MANAGER_UI.md                🔲 [IMMUTABLE]  Dashboard UI spec (AGENT-FRONTEND)
├── DRIVER_APP.md                🔲 [IMMUTABLE]  Mobile app spec (AGENT-DRIVER)
├── AGENT-ARCHITECTURE-CONTEXT.md ✅ [MUTABLE]   AGENT-ARCHITECTURE progress tracker
├── AGENT-DATABASE-CONTEXT.md    🔲 [MUTABLE]    AGENT-DATABASE progress tracker
├── AGENT-ALGO-CONTEXT.md        🔲 [MUTABLE]    AGENT-ALGO progress tracker
├── AGENT-BACKEND-CONTEXT.md     🔲 [MUTABLE]    AGENT-BACKEND-API progress tracker
├── AGENT-FRONTEND-CONTEXT.md    🔲 [MUTABLE]    AGENT-FRONTEND progress tracker
└── AGENT-DRIVER-CONTEXT.md      🔲 [MUTABLE]    AGENT-DRIVER progress tracker
```

| File | Agent | Dependencies | Status |
|------|-------|-------------|--------|
| `ARCHITECTURE.md` | AGENT-ARCHITECTURE | none | ✅ |
| `MULTI-AGENT-PROTOCOL.md` | AGENT-ARCHITECTURE | none | ✅ |
| `STRUCTURE.md` | AGENT-ARCHITECTURE | none | ✅ |
| `DATABASE_SCHEMA.md` | AGENT-DATABASE | ARCHITECTURE.md | 🔲 |
| `ALGORITHM_SPEC.md` | AGENT-ALGO | ARCHITECTURE.md, DATABASE_SCHEMA.md | 🔲 |
| `API_CONTRACT.md` | AGENT-BACKEND-API | ARCHITECTURE.md, DATABASE_SCHEMA.md | 🔲 |
| `MANAGER_UI.md` | AGENT-FRONTEND | API_CONTRACT.md | 🔲 |
| `DRIVER_APP.md` | AGENT-DRIVER | API_CONTRACT.md | 🔲 |
| `AGENT-ARCHITECTURE-CONTEXT.md` | AGENT-ARCHITECTURE | none | ✅ |
| `AGENT-DATABASE-CONTEXT.md` | AGENT-DATABASE | none (self) | 🔲 |
| `AGENT-ALGO-CONTEXT.md` | AGENT-ALGO | none (self) | 🔲 |
| `AGENT-BACKEND-CONTEXT.md` | AGENT-BACKEND-API | none (self) | 🔲 |
| `AGENT-FRONTEND-CONTEXT.md` | AGENT-FRONTEND | none (self) | 🔲 |
| `AGENT-DRIVER-CONTEXT.md` | AGENT-DRIVER | none (self) | 🔲 |

---

## /shared — Cross-Application Types

```
shared/
└── types.ts          ✅ skeleton / 🔲 full impl [IMMUTABLE]
                         TypeScript types for all domain entities + API/WS messages
```

| File | Agent | Dependencies | Status |
|------|-------|-------------|--------|
| `types.ts` | AGENT-DATABASE (full) | DATABASE_SCHEMA.md | skeleton ✅ / full 🔲 |

---

## /backend — Node.js Express API

```
backend/
├── .env.example                 ✅  Environment variable template
├── package.json                 ✅  Dependencies + scripts
├── tsconfig.json                ✅  TypeScript config (strict)
├── Dockerfile                   ✅  Production Docker image
└── src/
    ├── server.ts                ✅ skeleton / 🔲 full impl
    │                               Express server + WebSocket setup
    ├── config/
    │   └── env.ts               ✅  Environment variable validation
    ├── db/
    │   ├── schema.sql           ✅ placeholder / 🔲 full impl
    │   │                           PostgreSQL DDL (11 tables)
    │   ├── models.ts            ✅ placeholder / 🔲 full impl
    │   │                           Supabase client + typed query helpers
    │   ├── migrate.ts           🔲  Run schema migrations (AGENT-DATABASE)
    │   └── seed.ts              🔲  Seed GERVIFRAIS test data (AGENT-DATABASE)
    ├── api/
    │   ├── routes.ts            ✅ skeleton / 🔲 full impl
    │   │                           Mount all route controllers
    │   └── controllers/
    │       ├── authController.ts    🔲  Login, refresh, logout (AGENT-BACKEND-API)
    │       ├── routesController.ts  🔲  CRUD routes + optimize (AGENT-BACKEND-API)
    │       ├── deliveriesController.ts 🔲 CRUD + events + proof (AGENT-BACKEND-API)
    │       ├── driversController.ts    🔲 CRUD + GPS + rating (AGENT-BACKEND-API)
    │       └── vehiclesController.ts   🔲 CRUD vehicles (AGENT-BACKEND-API)
    └── services/
        ├── routeOptimization.ts ✅ placeholder / 🔲 full impl
        │                           nearest_neighbor_tsp + 2-opt + validate
        ├── gpsTracking.ts       ✅ placeholder / 🔲 full impl
        │                           Redis cache + WebSocket broadcast
        ├── notificationService.ts ✅ placeholder / 🔲 full impl
        │                           Firebase FCM push notifications
        └── deliveryProofService.ts ✅ placeholder / 🔲 full impl
                                    S3 photo upload + signed URLs
```

| File | Agent | Dependencies | Status |
|------|-------|-------------|--------|
| `src/server.ts` | AGENT-BACKEND-API | env.ts, routes.ts | skeleton ✅ |
| `src/config/env.ts` | AGENT-ARCHITECTURE | dotenv | ✅ |
| `src/db/schema.sql` | AGENT-DATABASE | none | placeholder ✅ |
| `src/db/models.ts` | AGENT-DATABASE | schema.sql, types.ts | placeholder ✅ |
| `src/db/migrate.ts` | AGENT-DATABASE | models.ts | 🔲 |
| `src/db/seed.ts` | AGENT-DATABASE | models.ts | 🔲 |
| `src/api/routes.ts` | AGENT-BACKEND-API | controllers/ | skeleton ✅ |
| `src/api/controllers/authController.ts` | AGENT-BACKEND-API | models.ts, types.ts | 🔲 |
| `src/api/controllers/routesController.ts` | AGENT-BACKEND-API | services/, models.ts | 🔲 |
| `src/api/controllers/deliveriesController.ts` | AGENT-BACKEND-API | services/, models.ts | 🔲 |
| `src/api/controllers/driversController.ts` | AGENT-BACKEND-API | services/, models.ts | 🔲 |
| `src/api/controllers/vehiclesController.ts` | AGENT-BACKEND-API | models.ts | 🔲 |
| `src/services/routeOptimization.ts` | AGENT-ALGO | types.ts | placeholder ✅ |
| `src/services/gpsTracking.ts` | AGENT-BACKEND-API | ioredis, ws, models.ts | placeholder ✅ |
| `src/services/notificationService.ts` | AGENT-BACKEND-API | firebase-admin | placeholder ✅ |
| `src/services/deliveryProofService.ts` | AGENT-BACKEND-API | aws-sdk, models.ts | placeholder ✅ |

---

## /frontend-manager — React Manager Dashboard

```
frontend-manager/
├── .env.example                 ✅  Mapbox token + API URL template
├── package.json                 ✅  Dependencies + scripts
├── tsconfig.json                ✅  TypeScript config
├── Dockerfile                   ✅  Nginx production image
└── src/
    ├── App.tsx                  ✅ placeholder / 🔲 full impl
    │                               Root component + router
    ├── components/
    │   ├── Dashboard.tsx        ✅ placeholder / 🔲 full impl
    │   │                           Main layout: map left, KPI right
    │   ├── Map.tsx              ✅ placeholder / 🔲 full impl
    │   │                           Mapbox GL JS + driver markers + WS
    │   └── KPI.tsx              ✅ placeholder / 🔲 full impl
    │                               KPI cards (delivered, delayed, in route)
    ├── pages/                   🔲  Route pages (AGENT-FRONTEND)
    │   ├── LoginPage.tsx        🔲  Authentication (AGENT-FRONTEND)
    │   └── DashboardPage.tsx    🔲  Main dashboard page (AGENT-FRONTEND)
    └── styles/                  🔲  Global CSS / theme (AGENT-FRONTEND)
        └── global.css           🔲  Color palette + base styles
```

| File | Agent | Dependencies | Status |
|------|-------|-------------|--------|
| `src/App.tsx` | AGENT-FRONTEND | react-router-dom | placeholder ✅ |
| `src/components/Dashboard.tsx` | AGENT-FRONTEND | Map.tsx, KPI.tsx | placeholder ✅ |
| `src/components/Map.tsx` | AGENT-FRONTEND | mapbox-gl, types.ts | placeholder ✅ |
| `src/components/KPI.tsx` | AGENT-FRONTEND | types.ts | placeholder ✅ |
| `src/pages/LoginPage.tsx` | AGENT-FRONTEND | API_CONTRACT.md | 🔲 |
| `src/pages/DashboardPage.tsx` | AGENT-FRONTEND | Dashboard.tsx | 🔲 |
| `src/styles/global.css` | AGENT-FRONTEND | none | 🔲 |

---

## /app-driver — React Native Driver App

```
app-driver/
├── .env.example                 ✅  API URL template
├── package.json                 ✅  Expo + React Native dependencies
├── app.json                     ✅  Expo config (permissions, bundle IDs)
└── src/
    ├── App.tsx                  ✅ placeholder / 🔲 full impl
    │                               Navigation root (tab bar + stack)
    ├── screens/
    │   ├── HomeScreen.tsx       ✅ placeholder / 🔲 full impl
    │   │                           Delivery list + current delivery highlight
    │   ├── DeliveryDetailsScreen.tsx ✅ placeholder / 🔲 full impl
    │   │                             Address, windows, deadline, call/navigate
    │   ├── ArrivedScreen.tsx    ✅ placeholder / 🔲 full impl
    │   │                           Status badge + 2 photo buttons
    │   ├── PhotoScreen.tsx      ✅ placeholder / 🔲 full impl
    │   │                           Full screen camera + preview + retake
    │   ├── ConfirmationScreen.tsx ✅ placeholder / 🔲 full impl
    │   │                           Delivery complete + auto-advance
    │   └── ProblemScreen.tsx    ✅ placeholder / 🔲 full impl
    │                               Incident report + manager notification
    └── services/                🔲  API/service layer (AGENT-DRIVER)
        ├── api.ts               🔲  Axios API client (AGENT-DRIVER)
        ├── gpsService.ts        🔲  expo-location GPS updates (AGENT-DRIVER)
        ├── cameraService.ts     🔲  expo-camera + S3 upload (AGENT-DRIVER)
        └── notificationService.ts 🔲 expo-notifications FCM (AGENT-DRIVER)
```

| File | Agent | Dependencies | Status |
|------|-------|-------------|--------|
| `src/App.tsx` | AGENT-DRIVER | react-navigation | placeholder ✅ |
| `src/screens/HomeScreen.tsx` | AGENT-DRIVER | api.ts, types.ts | placeholder ✅ |
| `src/screens/DeliveryDetailsScreen.tsx` | AGENT-DRIVER | api.ts, types.ts | placeholder ✅ |
| `src/screens/ArrivedScreen.tsx` | AGENT-DRIVER | api.ts, types.ts | placeholder ✅ |
| `src/screens/PhotoScreen.tsx` | AGENT-DRIVER | cameraService.ts | placeholder ✅ |
| `src/screens/ConfirmationScreen.tsx` | AGENT-DRIVER | api.ts | placeholder ✅ |
| `src/screens/ProblemScreen.tsx` | AGENT-DRIVER | api.ts, cameraService.ts | placeholder ✅ |
| `src/services/api.ts` | AGENT-DRIVER | axios, types.ts | 🔲 |
| `src/services/gpsService.ts` | AGENT-DRIVER | expo-location | 🔲 |
| `src/services/cameraService.ts` | AGENT-DRIVER | expo-camera, expo-image-picker | 🔲 |
| `src/services/notificationService.ts` | AGENT-DRIVER | expo-notifications | 🔲 |

---

## Dependency Graph (Creation Order)

```
1. shared/types.ts (skeleton)            ← AGENT-ARCHITECTURE ✅
2. docs/ARCHITECTURE.md                  ← AGENT-ARCHITECTURE ✅
3. docs/MULTI-AGENT-PROTOCOL.md          ← AGENT-ARCHITECTURE ✅
4. All folder structure + configs        ← AGENT-ARCHITECTURE ✅
      ↓
5. shared/types.ts (full)                ← AGENT-DATABASE 🔲
6. docs/DATABASE_SCHEMA.md               ← AGENT-DATABASE 🔲
7. backend/src/db/schema.sql             ← AGENT-DATABASE 🔲
8. backend/src/db/models.ts              ← AGENT-DATABASE 🔲
      ↓ (can parallel)
9.  docs/ALGORITHM_SPEC.md               ← AGENT-ALGO 🔲
10. backend/src/services/routeOptimization.ts ← AGENT-ALGO 🔲

11. All backend API code                 ← AGENT-BACKEND-API 🔲
12. docs/API_CONTRACT.md                 ← AGENT-BACKEND-API 🔲
      ↓ (can parallel)
13. frontend-manager/ (all)              ← AGENT-FRONTEND 🔲
14. app-driver/ (all)                    ← AGENT-DRIVER 🔲
```

---

## Test Files (co-located with source)

All test files follow the pattern: `filename.test.ts`

| Test File | Tests | Created by |
|-----------|-------|-----------|
| `backend/src/services/routeOptimization.test.ts` | TSP algorithm, 2-OPT, feasibility | AGENT-ALGO |
| `backend/src/services/gpsTracking.test.ts` | Redis cache, WS broadcast | AGENT-BACKEND-API |
| `backend/src/api/controllers/routesController.test.ts` | Route CRUD + optimize | AGENT-BACKEND-API |
| `backend/src/api/controllers/deliveriesController.test.ts` | Delivery events + proofs | AGENT-BACKEND-API |
| `frontend-manager/src/components/KPI.test.tsx` | KPI card rendering | AGENT-FRONTEND |
| `app-driver/src/screens/HomeScreen.test.tsx` | Delivery list rendering | AGENT-DRIVER |

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-ARCHITECTURE*
