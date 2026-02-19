# AGENT-DATABASE — Context File
> [MUTABLE] — Updated by AGENT-DATABASE throughout development

---

## Status

**Current state**: ✅ COMPLETE
**Phase**: 2 — Database Layer (Week 1-2)
**Date completed**: 2026-02-19
**Branch**: `claude/fleet-management-app-6YKit`

---

## Completed Tasks

- [x] Read `/docs/ARCHITECTURE.md` — understood system design and requirements
- [x] Read `/docs/STRUCTURE.md` — understood file ownership and dependencies
- [x] Read `/shared/types.ts` (skeleton) — understood what AGENT-ARCHITECTURE provided
- [x] Created `/docs/DATABASE_SCHEMA.md` — IMMUTABLE: full ER diagram, 11 table specs, indexes, RLS, seed data reference
- [x] Created `/backend/src/db/schema.sql` — complete PostgreSQL DDL (11 tables, triggers, indexes, RLS policies, 3 views)
- [x] Created `/backend/src/db/models.ts` — full Supabase client + typed CRUD helpers for all 11 tables
- [x] Created `/backend/src/db/migrate.ts` — migration runner with optional --seed flag
- [x] Created `/backend/src/db/seed.ts` — idempotent GERVIFRAIS seed data (company, admin, 2 drivers, 2 vehicles, 4 stores, 4 deliveries)
- [x] Replaced `/shared/types.ts` skeleton with complete v1.0.0 types (11 tables + API/WS/algo types)
- [x] Updated `/backend/package.json` — added `ts-node` devDependency for migration scripts

---

## In Progress

None.

---

## Pending Tasks

None — AGENT-DATABASE scope is complete.

---

## Files Touched

| File | Action | Notes |
|------|--------|-------|
| `docs/DATABASE_SCHEMA.md` | Created | IMMUTABLE — ER diagram + 11 table specs |
| `backend/src/db/schema.sql` | Replaced placeholder | Complete DDL, 11 tables, RLS, 3 views |
| `backend/src/db/models.ts` | Replaced placeholder | Full Supabase CRUD for all 11 tables |
| `backend/src/db/migrate.ts` | Created | Reads schema.sql, runs in transaction |
| `backend/src/db/seed.ts` | Created | Idempotent GERVIFRAIS seed data |
| `shared/types.ts` | Replaced skeleton | v1.0.0 — complete types from schema |
| `backend/package.json` | Updated | Added ts-node devDependency |

---

## Blockers

None.

---

## Decisions Made

1. **SERVICE_ROLE key for all backend queries** — Backend always bypasses RLS using `SUPABASE_SERVICE_ROLE_KEY`. Security is enforced at the API/controller layer (JWT middleware). This avoids complex RLS policies fighting with typed Supabase client patterns.

2. **NUMERIC(10,7) for GPS coordinates** — Avoids floating-point precision errors in route optimization math. Used for all `latitude`/`longitude` columns (store_lat, store_lng on reception_windows; latitude/longitude on deliveries and gps_logs).

3. **TIME without timezone for open_time/close_time/client_deadline** — Times represent local business hours, not UTC instants. Application layer handles timezone conversions. The TIME type avoids DST ambiguity.

4. **JSONB for days_of_week** — More flexible than a days bitmask or 7 boolean columns. TypeScript side typed as `DayOfWeek[]` union. Could be migrated to a junction table if frequency queries become a bottleneck.

5. **Unique constraint on (driver_id, date) for routes** — Hard constraint: one route per driver per day. The seed and route optimization service must be aware of this. AGENT-ALGO: check for existing routes before inserting.

6. **Idempotent seed with early-exit pattern** — `seed.ts` checks for GERVIFRAIS company before any insert. Safe to run on every `npm run db:migrate -- --seed`. Prevents duplicate data in development.

7. **Rolling average `rating` on drivers** — Computed by `DriverModel.refreshRating()` which runs `AVG()` across all `driver_ratings` rows for that driver. Called automatically from `DriverRatingModel.upsert()` and `managerOverride()`. AGENT-BACKEND-API: no manual rating computation needed.

8. **GPS deduplication via unique index** — `idx_gps_driver_seq ON gps_logs(driver_id, sequence)`. `GpsLogModel.insert()` silently ignores `23505` (unique violation) errors — allows safe batch replay from driver app.

9. **Upsert pattern for delivery_proofs and driver_ratings** — Both tables use `UNIQUE(delivery_id)` and the Supabase `upsert()` with `onConflict: 'delivery_id'`. This means a second photo upload or rating override replaces the first without creating duplicates.

10. **3 SQL views for common queries** — `v_active_drivers` (driver + vehicle join), `v_today_routes` (routes for today's date with driver/vehicle), `v_delivery_summary` (deliveries with reception window). AGENT-BACKEND-API: use these views for list endpoints to avoid N+1 queries.

---

## Database Schema Summary

### Tables (11)

| # | Table | Key Constraints |
|---|-------|----------------|
| 1 | `company` | PK uuid, `subscription_tier` CHECK |
| 2 | `users` | PK uuid, FK company, UNIQUE email, `role` CHECK |
| 3 | `vehicles` | PK uuid, FK company, UNIQUE (company_id, registration_plate), `status` CHECK |
| 4 | `drivers` | PK uuid, FK company + vehicle, UNIQUE (company_id, phone), `rating` NUMERIC(3,2) |
| 5 | `reception_windows` | PK uuid, FK company, `days_of_week` JSONB |
| 6 | `deliveries` | PK uuid, FK company + reception_window, `status` CHECK, `priority` 1–5 CHECK |
| 7 | `routes` | PK uuid, FK company + driver + vehicle, UNIQUE (driver_id, date), `status` CHECK |
| 8 | `delivery_events` | PK uuid, FK delivery + driver + route, `event_type` CHECK, no updated_at |
| 9 | `delivery_proofs` | PK uuid, FK delivery + driver, UNIQUE delivery_id |
| 10 | `driver_ratings` | PK uuid, FK delivery + driver, UNIQUE delivery_id |
| 11 | `gps_logs` | PK uuid, FK driver + route, UNIQUE (driver_id, sequence) |

### Views (3)

| View | Purpose |
|------|---------|
| `v_active_drivers` | Active drivers joined with their assigned vehicle |
| `v_today_routes` | Today's routes with driver name + vehicle plate |
| `v_delivery_summary` | All deliveries with reception window details (used by AGENT-BACKEND-API for delivery list endpoints) |

### Seed Data (GERVIFRAIS pilot)

| Entity | Count | Details |
|--------|-------|---------|
| Company | 1 | GERVIFRAIS, 77 Rue de Carpentras, 94550 Chevilly-Larue |
| Admin user | 1 | admin@gervifrais.fr / GervifraisAdmin2026! |
| Vehicles | 2 | Renault Trafic (AA-123-BB), Citroën Berlingo (BB-456-CC) |
| Drivers | 2 | Hugo Vachey (driver 1), Mamadou Keita (driver 2) |
| Reception windows | 4 | Auchan Marne, Auchan Villebon, Carrefour Orly, Monoprix Villejuif |
| Deliveries | 4 | One per store, status: pending, for today |

---

## Messages for Other Agents

→ **AGENT-ALGO**:
  Database layer is ready. You can now:
  1. Read `/docs/DATABASE_SCHEMA.md` for the full schema (table structures, constraints)
  2. Read `/shared/types.ts` for `RouteInput`, `OptimizedRoute`, `OptimizationResult`, `FeasibilityResult`, `FeasibilityError` types
  3. Read `/backend/src/db/models.ts` to understand `DB.deliveries`, `DB.drivers`, `DB.vehicles`, `DB.routes` — your optimization service will call these
  4. Implement `/backend/src/services/routeOptimization.ts` (placeholder exists)
  5. **IMPORTANT**: Route uniqueness constraint is `UNIQUE(driver_id, date)` — check for existing routes before inserting to avoid 23505 errors
  6. Create `/docs/ALGORITHM_SPEC.md` (IMMUTABLE) and `/docs/AGENT-ALGO-CONTEXT.md`

→ **AGENT-BACKEND-API**:
  Database layer is ready. Key points:
  1. All CRUD is available via `DB.*` exports from `backend/src/db/models.ts`
  2. Use `v_delivery_summary` view via Supabase `.from('v_delivery_summary')` for delivery list endpoints — avoids N+1
  3. Use `v_today_routes` for the dashboard daily route endpoint
  4. `DriverModel.refreshRating()` is called automatically — no need to compute ratings manually
  5. `GpsLogModel.insert()` is idempotent on sequence — safe for driver app batch replay
  6. Auth: JWT payload structure is in `shared/types.ts` `JwtPayload` interface
  7. Implement skeleton files: `server.ts`, `routes.ts`, all controllers and services
  8. Publish `docs/API_CONTRACT.md` when done

→ **AGENT-FRONTEND** and **AGENT-DRIVER**:
  Wait for AGENT-BACKEND-API to publish `docs/API_CONTRACT.md` before starting.
  All shared TypeScript types are finalized in `shared/types.ts` v1.0.0.

---

## Key Files for Downstream Agents

```
shared/types.ts              ← All TypeScript types (v1.0.0) — import from here
docs/DATABASE_SCHEMA.md      ← ER diagram + full table specs (IMMUTABLE)
backend/src/db/models.ts     ← DB.* exports — use for all database operations
backend/src/db/schema.sql    ← Reference DDL (DO NOT run manually — use npm run db:migrate)
backend/src/db/seed.ts       ← GERVIFRAIS test data reference
```

---

## How to Run

```bash
# Apply schema only (idempotent):
cd backend && npm run db:migrate

# Apply schema + seed GERVIFRAIS data:
cd backend && npm run db:migrate -- --seed

# Seed only (requires schema already applied):
cd backend && npm run db:seed
```

Prerequisites: `DATABASE_URL` and `SUPABASE_*` vars in `backend/.env`.

---

**Ready for**: AGENT-ALGO + AGENT-BACKEND-API (can run in parallel)
**Git commit**: `[DB] add PostgreSQL schema, models, migrations, seed data, and complete TypeScript types`
