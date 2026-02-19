# AGENT-ARCHITECTURE — Context File
> [MUTABLE] — Updated by AGENT-ARCHITECTURE throughout development

---

## Status

**Current state**: ✅ COMPLETE
**Phase**: 1 — Foundation (Weeks 1-2)
**Date completed**: 2026-02-19
**Branch**: `claude/fleet-management-app-6YKit`

---

## Completed Tasks

- [x] Created `/docs/ARCHITECTURE.md` — System diagram, service breakdown, data flow, tech stack justification
- [x] Created `/docs/MULTI-AGENT-PROTOCOL.md` — 6-agent collaboration rules, execution order, handoff checklist
- [x] Created `/docs/STRUCTURE.md` — Complete file listing with agent assignments and dependencies
- [x] Created `/docs/AGENT-ARCHITECTURE-CONTEXT.md` — This file
- [x] Created monorepo folder structure
- [x] Created `/.gitignore` — Standard Node.js + Expo ignore rules
- [x] Created `/README.md` — Project overview + quickstart
- [x] Created `/docker-compose.yml` — PostgreSQL + Redis + backend + manager UI
- [x] Created `/backend/package.json` — Express + TypeScript + all production dependencies
- [x] Created `/backend/tsconfig.json` — TypeScript strict mode
- [x] Created `/backend/Dockerfile` — Multi-stage production image
- [x] Created `/backend/.env.example` — All required environment variables documented
- [x] Created `/backend/src/server.ts` — Express + WebSocket server skeleton
- [x] Created `/backend/src/config/env.ts` — Environment validation with requireEnv()
- [x] Created `/backend/src/api/routes.ts` — API router skeleton
- [x] Created `/backend/src/db/schema.sql` — Placeholder for AGENT-DATABASE
- [x] Created `/backend/src/db/models.ts` — Placeholder for AGENT-DATABASE
- [x] Created `/backend/src/services/routeOptimization.ts` — Placeholder for AGENT-ALGO
- [x] Created `/backend/src/services/gpsTracking.ts` — Placeholder for AGENT-BACKEND-API
- [x] Created `/backend/src/services/notificationService.ts` — Placeholder for AGENT-BACKEND-API
- [x] Created `/backend/src/services/deliveryProofService.ts` — Placeholder for AGENT-BACKEND-API
- [x] Created `/frontend-manager/package.json` — React + Mapbox + Vite dependencies
- [x] Created `/frontend-manager/tsconfig.json` — TypeScript config
- [x] Created `/frontend-manager/Dockerfile` — Nginx production image
- [x] Created `/frontend-manager/.env.example`
- [x] Created `/frontend-manager/src/App.tsx` — Placeholder for AGENT-FRONTEND
- [x] Created `/frontend-manager/src/components/Dashboard.tsx` — Placeholder
- [x] Created `/frontend-manager/src/components/Map.tsx` — Placeholder
- [x] Created `/frontend-manager/src/components/KPI.tsx` — Placeholder
- [x] Created `/app-driver/package.json` — Expo + React Native dependencies
- [x] Created `/app-driver/app.json` — Expo config with all permissions
- [x] Created `/app-driver/.env.example`
- [x] Created `/app-driver/src/App.tsx` — Placeholder for AGENT-DRIVER
- [x] Created `/app-driver/src/screens/HomeScreen.tsx` — Placeholder
- [x] Created `/app-driver/src/screens/DeliveryDetailsScreen.tsx` — Placeholder
- [x] Created `/app-driver/src/screens/ArrivedScreen.tsx` — Placeholder
- [x] Created `/app-driver/src/screens/PhotoScreen.tsx` — Placeholder
- [x] Created `/app-driver/src/screens/ConfirmationScreen.tsx` — Placeholder
- [x] Created `/app-driver/src/screens/ProblemScreen.tsx` — Placeholder
- [x] Created `/shared/types.ts` — TypeScript type skeleton (full impl: AGENT-DATABASE)

---

## In Progress

None.

---

## Pending Tasks

None — AGENT-ARCHITECTURE scope is complete.

---

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `docs/ARCHITECTURE.md` | Created | IMMUTABLE |
| `docs/MULTI-AGENT-PROTOCOL.md` | Created | IMMUTABLE |
| `docs/STRUCTURE.md` | Created | Mutable — update as files are added |
| `docs/AGENT-ARCHITECTURE-CONTEXT.md` | Created | This file |
| `.gitignore` | Created | |
| `README.md` | Created | |
| `docker-compose.yml` | Created | |
| `backend/package.json` | Created | |
| `backend/tsconfig.json` | Created | |
| `backend/Dockerfile` | Created | |
| `backend/.env.example` | Created | |
| `backend/src/server.ts` | Created | Skeleton |
| `backend/src/config/env.ts` | Created | Complete |
| `backend/src/api/routes.ts` | Created | Skeleton |
| `backend/src/db/schema.sql` | Created | Placeholder |
| `backend/src/db/models.ts` | Created | Placeholder |
| `backend/src/services/routeOptimization.ts` | Created | Placeholder |
| `backend/src/services/gpsTracking.ts` | Created | Placeholder |
| `backend/src/services/notificationService.ts` | Created | Placeholder |
| `backend/src/services/deliveryProofService.ts` | Created | Placeholder |
| `frontend-manager/package.json` | Created | |
| `frontend-manager/tsconfig.json` | Created | |
| `frontend-manager/Dockerfile` | Created | |
| `frontend-manager/.env.example` | Created | |
| `frontend-manager/src/App.tsx` | Created | Placeholder |
| `frontend-manager/src/components/Dashboard.tsx` | Created | Placeholder |
| `frontend-manager/src/components/Map.tsx` | Created | Placeholder |
| `frontend-manager/src/components/KPI.tsx` | Created | Placeholder |
| `app-driver/package.json` | Created | |
| `app-driver/app.json` | Created | |
| `app-driver/.env.example` | Created | |
| `app-driver/src/App.tsx` | Created | Placeholder |
| `app-driver/src/screens/HomeScreen.tsx` | Created | Placeholder |
| `app-driver/src/screens/DeliveryDetailsScreen.tsx` | Created | Placeholder |
| `app-driver/src/screens/ArrivedScreen.tsx` | Created | Placeholder |
| `app-driver/src/screens/PhotoScreen.tsx` | Created | Placeholder |
| `app-driver/src/screens/ConfirmationScreen.tsx` | Created | Placeholder |
| `app-driver/src/screens/ProblemScreen.tsx` | Created | Placeholder |
| `shared/types.ts` | Created | Skeleton — AGENT-DATABASE implements full version |

---

## Blockers

None.

---

## Decisions Made

1. **TypeScript strict mode** across all packages — catches integration errors early
2. **docker-compose.yml** includes postgres + redis + backend + manager UI for full local dev with a single command
3. **shared/types.ts skeleton** created by AGENT-ARCHITECTURE to unblock initial exploration, but AGENT-DATABASE owns the final version
4. **Expo permissions** pre-configured in app.json (camera, location, notifications) to avoid last-minute store submission issues
5. **Multi-stage Dockerfiles** for both backend (Node.js) and manager (Nginx) to minimize production image sizes
6. **Depot location** for route optimization: 77 Rue de Carpentras, 94550 Chevilly-Larue (GERVIFRAIS HQ)

---

## Messages for Other Agents

→ **AGENT-DATABASE**:
  Monorepo structure is ready. You can now:
  1. Read `/docs/ARCHITECTURE.md` for context
  2. Create `/docs/DATABASE_SCHEMA.md` (IMMUTABLE)
  3. Implement `/backend/src/db/schema.sql` (11 tables per spec)
  4. Implement `/backend/src/db/models.ts` (Supabase queries)
  5. Create `/backend/src/db/migrate.ts` and `seed.ts` with GERVIFRAIS data
  6. Replace `/shared/types.ts` skeleton with full TypeScript types
  7. Create your context file `/docs/AGENT-DATABASE-CONTEXT.md`

→ **AGENT-ALGO**:
  Wait for AGENT-DATABASE to complete `shared/types.ts` and `DATABASE_SCHEMA.md` before starting.
  Your entry point is `/backend/src/services/routeOptimization.ts` (placeholder exists).

→ **AGENT-BACKEND-API**:
  Wait for AGENT-DATABASE (types) and AGENT-ALGO (routeOptimization service) before full implementation.
  Skeleton files exist: `server.ts`, `routes.ts`, all service files.

→ **AGENT-FRONTEND** and **AGENT-DRIVER**:
  Wait for AGENT-BACKEND-API to publish `docs/API_CONTRACT.md` before starting.
  Placeholder files exist in `frontend-manager/src/` and `app-driver/src/`.

---

## Architecture Decisions Log

### ADR-001: Supabase vs Raw PostgreSQL
**Decision**: Use Supabase client + direct PostgreSQL
**Rationale**: Supabase provides managed hosting, built-in auth, and a typed JS client.
For complex queries (route optimization), we use the pg client directly.

### ADR-002: Redis for GPS Cache
**Decision**: Redis with 60s TTL per driver
**Rationale**: Sub-millisecond reads for dashboard refresh. PostgreSQL gps_logs table
provides the audit trail. Redis is the "hot" layer, Postgres is the "cold" layer.

### ADR-003: WebSocket over Server-Sent Events
**Decision**: WebSocket (ws library)
**Rationale**: Bidirectional needed for driver-to-backend location push.
SSE would require a separate channel for driver uploads.

### ADR-004: No signature capture
**Decision**: Photos only (merchandise + stamped BL), no digital signature
**Rationale**: GERVIFRAIS client requirement for MVP. Simplifies driver UX.
Signature can be added in Phase 2.

### ADR-005: Waze deep link for navigation
**Decision**: `waze://?ll=LAT,LNG&navigate=yes` deep link
**Rationale**: Drivers already use Waze. No need to build custom navigation.
Google Maps fallback: `https://maps.google.com/maps?daddr=LAT,LNG`

---

**Ready for**: AGENT-DATABASE
**Git commit**: `[ARCH] create monorepo structure, docs, and config files`
