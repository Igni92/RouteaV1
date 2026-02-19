# DATABASE SCHEMA — GERVIFRAIS Fleet Management App
> IMMUTABLE — Created by AGENT-DATABASE | Do not modify
> PostgreSQL 15 / Supabase compatible

---

## 1. Entity-Relationship Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        GERVIFRAIS — DATABASE SCHEMA v1.0                        │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
  │   company    │──1:N──│      users       │       │     vehicles     │
  │──────────────│       │──────────────────│       │──────────────────│
  │ id (PK)      │       │ id (PK)          │       │ id (PK)          │
  │ name         │       │ email            │       │ company_id (FK)  │
  │ address      │       │ password_hash    │       │ registration_    │
  │ phone        │       │ company_id (FK)  │       │   plate          │
  │ rgpd_accept. │       │ role             │       │ brand            │
  │ subscription │       │ created_at       │       │ model            │
  │ created_at   │       │ updated_at       │       │ year             │
  │ updated_at   │       └──────────────────┘       │ capacity_kg      │
  └──────┬───────┘                                  │ status           │
         │ 1:N                                      │ last_maint_date  │
         │                                          │ next_maint_date  │
  ┌──────▼───────────────────────────────┐          │ created_at       │
  │              drivers                 │          │ updated_at       │
  │──────────────────────────────────────│          └────────┬─────────┘
  │ id (PK)                              │                   │ 1:1
  │ company_id (FK → company)            │◄──────────────────┘
  │ name                                 │  vehicle_id (FK)
  │ phone                                │
  │ email                                │
  │ vehicle_id (FK → vehicles, nullable) │
  │ license_number                       │
  │ rating (avg 0-5)                     │
  │ rgpd_consent                         │
  │ created_at / updated_at              │
  └──────┬────────────────────────┬──────┘
         │ 1:N                    │ 1:N
         │                        │
  ┌──────▼───────┐        ┌───────▼──────────────────────────────────┐
  │   gps_logs   │        │                  routes                  │
  │──────────────│        │──────────────────────────────────────────│
  │ id (PK)      │        │ id (PK)                                  │
  │ driver_id FK │        │ company_id (FK → company)                │
  │ latitude     │        │ date                                     │
  │ longitude    │        │ driver_id (FK → drivers)                 │
  │ accuracy     │        │ vehicle_id (FK → vehicles)               │
  │ speed        │        │ deliveries_ordered (JSONB [UUID,...])     │
  │ timestamp    │        │ status                                   │
  └──────────────┘        │ started_at / completed_at                │
                          │ created_at / updated_at                  │
                          └──────────────────────────────────────────┘

  ┌──────────────────────┐        ┌────────────────────────────────────────┐
  │  reception_windows   │──1:N──►│              deliveries                │
  │──────────────────────│        │────────────────────────────────────────│
  │ id (PK)              │        │ id (PK)                                │
  │ company_id (FK)      │        │ company_id (FK → company)              │
  │ store_name           │        │ order_id (nullable, external ref)      │
  │ store_address        │        │ reception_window_id (FK)               │
  │ store_phone          │        │ client_deadline (TIME)                 │
  │ store_email          │        │ address                                │
  │ open_time (TIME)     │        │ latitude / longitude                   │
  │ close_time (TIME)    │        │ estimated_time_at_site (minutes)       │
  │ days_of_week (JSONB) │        │ status                                 │
  │ created_at           │        │ priority (1-5)                         │
  │ updated_at           │        │ weight_kg (nullable)                   │
  └──────────────────────┘        │ created_at / updated_at                │
                                  └────────┬──────────────────┬────────────┘
                                           │ 1:N              │ 1:1
                                           │                  │
                          ┌────────────────▼───┐   ┌──────────▼──────────┐
                          │  delivery_events   │   │   delivery_proofs   │
                          │────────────────────│   │─────────────────────│
                          │ id (PK)            │   │ id (PK)             │
                          │ delivery_id (FK)   │   │ delivery_id (FK)    │
                          │ driver_id (FK)     │   │ photo_marchand._url │
                          │ event_type         │   │ photo_bl_url        │
                          │ latitude           │   │ uploaded_at         │
                          │ longitude          │   │ synced_at           │
                          │ notes              │   └─────────────────────┘
                          │ timestamp          │
                          └────────────────────┘

                          ┌──────────────────────────┐
                          │      driver_ratings       │
                          │──────────────────────────│
                          │ id (PK)                  │
                          │ delivery_id (FK)          │
                          │ driver_id (FK)            │
                          │ efficiency_score (1-5)    │
                          │ punctuality_score (1-5)   │
                          │ time_at_site_score (1-5)  │
                          │ incident_score (1-5)      │
                          │ notes                     │
                          │ rated_at                  │
                          └──────────────────────────┘
```

---

## 2. Table Specifications

### Table 1: `company`
Primary entity — one row per client (GERVIFRAIS).

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| name | TEXT | NOT NULL | — | Company name (e.g., GERVIFRAIS) |
| address | TEXT | NOT NULL | — | Full address |
| phone | TEXT | NOT NULL | — | Contact phone |
| rgpd_accepted | BOOLEAN | NOT NULL | FALSE | RGPD acceptance flag |
| rgpd_accepted_at | TIMESTAMPTZ | NULL | — | When RGPD was accepted |
| subscription_tier | TEXT | NOT NULL | '80_euros' | '80_euros' or '150_euros' |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | Last update timestamp |

**Constraints**: `subscription_tier IN ('80_euros', '150_euros')`

---

### Table 2: `users`
Manager/admin accounts (NOT drivers — drivers have their own table).

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| email | TEXT | NOT NULL | — | Unique email (login) |
| password_hash | TEXT | NOT NULL | — | bcrypt hash |
| company_id | UUID | NOT NULL | — | FK → company.id |
| role | TEXT | NOT NULL | 'manager' | 'manager' or 'admin' |
| fcm_token | TEXT | NULL | — | Firebase push token |
| last_login_at | TIMESTAMPTZ | NULL | — | Last successful login |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Constraints**: `role IN ('manager', 'admin')`, `email UNIQUE`
**FK**: `company_id → company(id) ON DELETE CASCADE`

---

### Table 3: `vehicles`
Fleet vehicles owned by a company.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| company_id | UUID | NOT NULL | — | FK → company.id |
| registration_plate | TEXT | NOT NULL | — | e.g., AA123BB |
| brand | TEXT | NOT NULL | — | e.g., Renault |
| model | TEXT | NOT NULL | — | e.g., Trafic |
| year | INTEGER | NOT NULL | — | Manufacturing year |
| capacity_kg | NUMERIC(8,2) | NOT NULL | — | Max load in kg |
| status | TEXT | NOT NULL | 'active' | 'active', 'maintenance', 'retired' |
| last_maintenance_date | DATE | NULL | — | Last service date |
| next_maintenance_date | DATE | NULL | — | Scheduled next service |
| notes | TEXT | NULL | — | Free text notes |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Constraints**: `status IN ('active', 'maintenance', 'retired')`, `capacity_kg > 0`
**FK**: `company_id → company(id) ON DELETE CASCADE`
**Unique**: `(company_id, registration_plate)`

---

### Table 4: `drivers`
Driver profiles — separate from users (drivers authenticate via phone/PIN in future).

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| company_id | UUID | NOT NULL | — | FK → company.id |
| name | TEXT | NOT NULL | — | Full name |
| phone | TEXT | NOT NULL | — | Mobile phone |
| email | TEXT | NULL | — | Optional email |
| vehicle_id | UUID | NULL | — | FK → vehicles.id (current vehicle) |
| license_number | TEXT | NOT NULL | — | Driving license number |
| rating | NUMERIC(3,2) | NOT NULL | 5.00 | Rolling average 0.00-5.00 |
| rgpd_consent | BOOLEAN | NOT NULL | FALSE | GPS tracking consent |
| rgpd_consent_at | TIMESTAMPTZ | NULL | — | When consent was given |
| fcm_token | TEXT | NULL | — | Firebase push token (driver app) |
| is_active | BOOLEAN | NOT NULL | TRUE | Soft delete flag |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Constraints**: `rating BETWEEN 0 AND 5`
**FK**: `company_id → company(id) ON DELETE CASCADE`
**FK**: `vehicle_id → vehicles(id) ON DELETE SET NULL`

---

### Table 5: `reception_windows`
Store reception time windows — when deliveries are accepted.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| company_id | UUID | NOT NULL | — | FK → company.id |
| store_name | TEXT | NOT NULL | — | e.g., Auchan Marne la Vallée |
| store_address | TEXT | NOT NULL | — | Full store address |
| store_lat | NUMERIC(10,7) | NOT NULL | — | Latitude for route optimization |
| store_lng | NUMERIC(10,7) | NOT NULL | — | Longitude for route optimization |
| store_phone | TEXT | NULL | — | Store contact phone |
| store_email | TEXT | NULL | — | Store contact email |
| open_time | TIME | NOT NULL | — | Reception opens (e.g., 00:00) |
| close_time | TIME | NOT NULL | — | Reception closes (e.g., 05:30) |
| days_of_week | JSONB | NOT NULL | '[]' | Array of day strings |
| is_active | BOOLEAN | NOT NULL | TRUE | Soft delete |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Constraints**: `close_time > open_time` (unless crosses midnight — handled in app logic)
**FK**: `company_id → company(id) ON DELETE CASCADE`

---

### Table 6: `deliveries`
Individual delivery orders — one per store per day.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| company_id | UUID | NOT NULL | — | FK → company.id |
| order_id | TEXT | NULL | — | External order reference |
| reception_window_id | UUID | NOT NULL | — | FK → reception_windows.id |
| client_deadline | TIME | NOT NULL | — | Must complete BY this time |
| address | TEXT | NOT NULL | — | Delivery address (usually = store address) |
| latitude | NUMERIC(10,7) | NOT NULL | — | For route optimization |
| longitude | NUMERIC(10,7) | NOT NULL | — | For route optimization |
| weight_kg | NUMERIC(8,2) | NULL | — | Parcel weight (vehicle capacity check) |
| estimated_time_at_site | INTEGER | NOT NULL | 15 | Minutes expected at site |
| status | TEXT | NOT NULL | 'pending' | See status enum below |
| priority | INTEGER | NOT NULL | 3 | 1 (highest) to 5 (lowest) |
| notes | TEXT | NULL | — | Driver instructions |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Status values**: `'pending' | 'assigned' | 'in_route' | 'arrived' | 'completed' | 'failed'`
**Constraints**: `priority BETWEEN 1 AND 5`, `estimated_time_at_site > 0`
**FK**: `company_id → company(id) ON DELETE CASCADE`
**FK**: `reception_window_id → reception_windows(id) ON DELETE RESTRICT`

---

### Table 7: `routes`
A planned route = one driver, one day, ordered list of deliveries.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| company_id | UUID | NOT NULL | — | FK → company.id |
| date | DATE | NOT NULL | — | Route date |
| driver_id | UUID | NOT NULL | — | FK → drivers.id |
| vehicle_id | UUID | NOT NULL | — | FK → vehicles.id |
| deliveries_ordered | JSONB | NOT NULL | '[]' | Ordered array of delivery UUIDs |
| status | TEXT | NOT NULL | 'planned' | 'planned', 'in_progress', 'completed' |
| started_at | TIMESTAMPTZ | NULL | — | When driver started route |
| completed_at | TIMESTAMPTZ | NULL | — | When last delivery completed |
| estimated_total_km | NUMERIC(8,2) | NULL | — | Algo output |
| estimated_total_minutes | INTEGER | NULL | — | Algo output |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Constraints**: `status IN ('planned', 'in_progress', 'completed')`
**FK**: `company_id → company(id) ON DELETE CASCADE`
**FK**: `driver_id → drivers(id) ON DELETE RESTRICT`
**FK**: `vehicle_id → vehicles(id) ON DELETE RESTRICT`
**Unique**: `(driver_id, date)` — one route per driver per day

---

### Table 8: `delivery_events`
Immutable event log — every driver action on a delivery.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| delivery_id | UUID | NOT NULL | — | FK → deliveries.id |
| driver_id | UUID | NOT NULL | — | FK → drivers.id |
| route_id | UUID | NULL | — | FK → routes.id |
| event_type | TEXT | NOT NULL | — | See event type enum |
| latitude | NUMERIC(10,7) | NULL | — | GPS at event time |
| longitude | NUMERIC(10,7) | NULL | — | GPS at event time |
| notes | TEXT | NULL | — | Driver notes / problem description |
| timestamp | TIMESTAMPTZ | NOT NULL | now() | When event occurred |

**Event types**: `'departed' | 'arrived' | 'completed' | 'failed' | 'delayed' | 'problem'`
**FK**: `delivery_id → deliveries(id) ON DELETE CASCADE`
**FK**: `driver_id → drivers(id) ON DELETE RESTRICT`
**FK**: `route_id → routes(id) ON DELETE SET NULL`

---

### Table 9: `delivery_proofs`
Photo evidence uploaded by driver after each delivery.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| delivery_id | UUID | NOT NULL | — | FK → deliveries.id (UNIQUE) |
| driver_id | UUID | NOT NULL | — | FK → drivers.id |
| photo_marchandise_url | TEXT | NULL | — | S3 URL — merchandise photo |
| photo_bl_tamonne_url | TEXT | NULL | — | S3 URL — stamped BL photo |
| uploaded_at | TIMESTAMPTZ | NOT NULL | now() | |
| synced_at | TIMESTAMPTZ | NULL | — | When confirmed uploaded to S3 |

**FK**: `delivery_id → deliveries(id) ON DELETE CASCADE` (UNIQUE constraint on delivery_id)
**FK**: `driver_id → drivers(id) ON DELETE RESTRICT`

---

### Table 10: `driver_ratings`
Auto-computed performance scores per delivery.

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| delivery_id | UUID | NOT NULL | — | FK → deliveries.id (UNIQUE) |
| driver_id | UUID | NOT NULL | — | FK → drivers.id |
| efficiency_score | NUMERIC(3,2) | NOT NULL | — | 1.00-5.00: % successful deliveries |
| punctuality_score | NUMERIC(3,2) | NOT NULL | — | 1.00-5.00: respect of time windows |
| time_at_site_score | NUMERIC(3,2) | NOT NULL | — | 1.00-5.00: time spent at site |
| incident_score | NUMERIC(3,2) | NOT NULL | — | 1.00-5.00: incident frequency (inverse) |
| manager_override | BOOLEAN | NOT NULL | FALSE | True if manager manually adjusted |
| notes | TEXT | NULL | — | Manager notes on override |
| rated_at | TIMESTAMPTZ | NOT NULL | now() | |

**Constraints**: All scores `BETWEEN 1 AND 5`
**FK**: `delivery_id → deliveries(id) ON DELETE CASCADE` (UNIQUE on delivery_id)
**FK**: `driver_id → drivers(id) ON DELETE RESTRICT`

---

### Table 11: `gps_logs`
Raw GPS positions — audit trail (Redis is the real-time layer).

| Column | PostgreSQL Type | Nullable | Default | Description |
|--------|----------------|----------|---------|-------------|
| id | UUID | NOT NULL | uuid_generate_v4() | Primary key |
| driver_id | UUID | NOT NULL | — | FK → drivers.id |
| route_id | UUID | NULL | — | FK → routes.id (if on a route) |
| latitude | NUMERIC(10,7) | NOT NULL | — | |
| longitude | NUMERIC(10,7) | NOT NULL | — | |
| accuracy | NUMERIC(6,2) | NULL | — | GPS accuracy in meters |
| speed | NUMERIC(6,2) | NULL | — | Speed in km/h |
| sequence | INTEGER | NOT NULL | — | Deduplication sequence number |
| timestamp | TIMESTAMPTZ | NOT NULL | — | Client-side timestamp |
| created_at | TIMESTAMPTZ | NOT NULL | now() | Server receive timestamp |

**FK**: `driver_id → drivers(id) ON DELETE CASCADE`
**FK**: `route_id → routes(id) ON DELETE SET NULL`

---

## 3. Indexes

```sql
-- Delivery lookups by company (most common query)
CREATE INDEX idx_deliveries_company_id     ON deliveries(company_id);
CREATE INDEX idx_deliveries_status         ON deliveries(status);
CREATE INDEX idx_deliveries_reception_win  ON deliveries(reception_window_id);

-- Route lookups
CREATE INDEX idx_routes_company_date       ON routes(company_id, date);
CREATE INDEX idx_routes_driver_date        ON routes(driver_id, date);
CREATE INDEX idx_routes_status             ON routes(status);

-- GPS logs — primary use case: latest position per driver
CREATE INDEX idx_gps_logs_driver_ts        ON gps_logs(driver_id, timestamp DESC);
CREATE INDEX idx_gps_logs_route            ON gps_logs(route_id);

-- Delivery events timeline
CREATE INDEX idx_del_events_delivery       ON delivery_events(delivery_id, timestamp);
CREATE INDEX idx_del_events_driver         ON delivery_events(driver_id, timestamp);

-- Driver ratings per driver
CREATE INDEX idx_driver_ratings_driver     ON driver_ratings(driver_id, rated_at DESC);

-- Reception windows by company
CREATE INDEX idx_reception_company         ON reception_windows(company_id);
```

---

## 4. Row-Level Security (RLS) Policies — Supabase

All tables are protected by RLS. The `company_id` column is the isolation boundary.

```sql
-- Pattern applied to all tables:
-- Users can only see/modify rows belonging to their company.

-- JWT claim used: auth.jwt() ->> 'company_id'
-- Set via Supabase custom claims on login.
```

**Policy names follow**: `{table}_{operation}_company_isolation`

| Table | Policy | Operation | Using Clause |
|-------|--------|-----------|-------------|
| company | select_own | SELECT | `id = (auth.jwt() ->> 'company_id')::UUID` |
| users | select_own | SELECT | `company_id = (auth.jwt() ->> 'company_id')::UUID` |
| drivers | all_own | ALL | `company_id = (auth.jwt() ->> 'company_id')::UUID` |
| vehicles | all_own | ALL | `company_id = (auth.jwt() ->> 'company_id')::UUID` |
| reception_windows | all_own | ALL | `company_id = (auth.jwt() ->> 'company_id')::UUID` |
| deliveries | all_own | ALL | `company_id = (auth.jwt() ->> 'company_id')::UUID` |
| routes | all_own | ALL | `company_id = (auth.jwt() ->> 'company_id')::UUID` |
| delivery_events | select_own | SELECT | via delivery join on company_id |
| delivery_proofs | select_own | SELECT | via delivery join on company_id |
| driver_ratings | select_own | SELECT | via driver join on company_id |
| gps_logs | insert_own | INSERT | via driver join on company_id |

> **Note**: Backend API uses `service_role` key (bypasses RLS) for server-to-server writes.
> RLS applies to direct Supabase client calls (frontend, mobile). Backend always uses service role.

---

## 5. Updated_at Auto-trigger

```sql
-- Function applied to all tables with updated_at column
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied via: CREATE TRIGGER ... BEFORE UPDATE ON {table}
```

---

## 6. GERVIFRAIS Seed Data

### company
```
id:               <UUID>
name:             GERVIFRAIS
address:          77 Rue de Carpentras, 94550 Chevilly-Larue
phone:            +33 1 XX XX XX XX
rgpd_accepted:    true
subscription:     80_euros
```

### vehicles
```
1. Renault Trafic | AA123BB | capacity: 800kg | status: active
2. Citroën C15    | BB123AA | capacity: 500kg | status: active
```

### drivers
```
1. Hugo Vachey    | vehicle: Renault Trafic (AA123BB)
2. Mamadou Keita  | vehicle: Citroën C15 (BB123AA)
```

### reception_windows (magasins)
```
1. Auchan Marne la Vallée
   address: Zone Commerciale du Val Maubuée, 77700 Serris
   lat: 48.8348, lng: 2.7813
   open_time:  00:00, close_time: 05:30
   client_deadline: 05:00
   days: [monday, tuesday, wednesday, thursday, friday, saturday]

2. Auchan Villebon
   address: Centre Commercial Villebon 2, 91160 Longjumeau
   lat: 48.6918, lng: 2.2236
   open_time:  00:00, close_time: 05:00
   client_deadline: 04:45
   days: [monday, tuesday, wednesday, thursday, friday, saturday]

3. Carrefour Orly
   address: ZI des Petits Carreaux, 94380 Bonneuil-sur-Marne
   lat: 48.7427, lng: 2.4912
   open_time:  06:00, close_time: 11:00
   client_deadline: 10:00
   days: [monday, tuesday, wednesday, thursday, friday, saturday]

4. Monoprix Villejuif
   address: 24 Rue Jean-Jaurès, 94800 Villejuif
   lat: 48.7934, lng: 2.3654
   open_time:  07:00, close_time: 12:00
   client_deadline: 11:00
   days: [monday, tuesday, wednesday, thursday, friday, saturday]
```

### deliveries (test set — 1 per magasin)
```
1. Livraison → Auchan Marne la Vallée  | weight: 200kg | priority: 2 | ETA at site: 20min
2. Livraison → Auchan Villebon         | weight: 150kg | priority: 2 | ETA at site: 15min
3. Livraison → Carrefour Orly          | weight: 180kg | priority: 3 | ETA at site: 20min
4. Livraison → Monoprix Villejuif      | weight: 120kg | priority: 3 | ETA at site: 15min
```

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| UUID primary keys | Avoids ID enumeration attacks, works across distributed inserts |
| TIME type for windows | Stores HH:MM without date — windows are recurring daily |
| JSONB for deliveries_ordered | Ordered array of UUIDs, efficiently queryable in Postgres |
| NUMERIC vs FLOAT | NUMERIC(10,7) for GPS avoids floating-point precision errors |
| Soft deletes (is_active) | Drivers/windows deactivated, not deleted — preserves history |
| delivery_proofs UNIQUE(delivery_id) | One proof record per delivery — upsert pattern |
| driver_ratings UNIQUE(delivery_id) | One rating per delivery — auto-scored, manager-adjustable |
| No cascade delete on routes | Routes are business records — RESTRICT protects audit trail |
| gps_logs separate from Redis | Redis = real-time (60s TTL), Postgres = full audit trail |

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-DATABASE*
