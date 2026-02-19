-- =============================================================================
-- GERVIFRAIS — Fleet Management Database Schema
-- PostgreSQL 15 / Supabase compatible
-- Created by: AGENT-DATABASE
-- Version: 1.0.0
--
-- Run this file once on a fresh Supabase project.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
-- See /docs/DATABASE_SCHEMA.md for full specification.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at on every UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLE 1: company
-- =============================================================================
CREATE TABLE IF NOT EXISTS company (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT        NOT NULL,
  address           TEXT        NOT NULL,
  phone             TEXT        NOT NULL,
  rgpd_accepted     BOOLEAN     NOT NULL DEFAULT FALSE,
  rgpd_accepted_at  TIMESTAMPTZ,
  subscription_tier TEXT        NOT NULL DEFAULT '80_euros'
                    CHECK (subscription_tier IN ('80_euros', '150_euros')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER set_updated_at_company
  BEFORE UPDATE ON company
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 2: users  (managers / admins — NOT drivers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  email          TEXT        NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  company_id     UUID        NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  role           TEXT        NOT NULL DEFAULT 'manager'
                 CHECK (role IN ('manager', 'admin')),
  fcm_token      TEXT,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);

CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 3: vehicles
-- =============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id                     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id             UUID          NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  registration_plate     TEXT          NOT NULL,
  brand                  TEXT          NOT NULL,
  model                  TEXT          NOT NULL,
  year                   INTEGER       NOT NULL CHECK (year >= 1990 AND year <= 2100),
  capacity_kg            NUMERIC(8,2)  NOT NULL CHECK (capacity_kg > 0),
  status                 TEXT          NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'maintenance', 'retired')),
  last_maintenance_date  DATE,
  next_maintenance_date  DATE,
  notes                  TEXT,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (company_id, registration_plate)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status     ON vehicles(company_id, status);

CREATE OR REPLACE TRIGGER set_updated_at_vehicles
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 4: drivers
-- =============================================================================
CREATE TABLE IF NOT EXISTS drivers (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID          NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  name             TEXT          NOT NULL,
  phone            TEXT          NOT NULL,
  email            TEXT,
  vehicle_id       UUID          REFERENCES vehicles(id) ON DELETE SET NULL,
  license_number   TEXT          NOT NULL,
  rating           NUMERIC(3,2)  NOT NULL DEFAULT 5.00
                   CHECK (rating >= 0 AND rating <= 5),
  rgpd_consent     BOOLEAN       NOT NULL DEFAULT FALSE,
  rgpd_consent_at  TIMESTAMPTZ,
  fcm_token        TEXT,
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_company_id ON drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_drivers_active     ON drivers(company_id, is_active);

CREATE OR REPLACE TRIGGER set_updated_at_drivers
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 5: reception_windows
-- =============================================================================
CREATE TABLE IF NOT EXISTS reception_windows (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID          NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  store_name    TEXT          NOT NULL,
  store_address TEXT          NOT NULL,
  store_lat     NUMERIC(10,7) NOT NULL,
  store_lng     NUMERIC(10,7) NOT NULL,
  store_phone   TEXT,
  store_email   TEXT,
  open_time     TIME          NOT NULL,
  close_time    TIME          NOT NULL,
  days_of_week  JSONB         NOT NULL DEFAULT '[]',
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reception_company ON reception_windows(company_id);
CREATE INDEX IF NOT EXISTS idx_reception_active  ON reception_windows(company_id, is_active);

CREATE OR REPLACE TRIGGER set_updated_at_reception_windows
  BEFORE UPDATE ON reception_windows
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 6: deliveries
-- =============================================================================
CREATE TABLE IF NOT EXISTS deliveries (
  id                      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id              UUID          NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  order_id                TEXT,
  reception_window_id     UUID          NOT NULL REFERENCES reception_windows(id) ON DELETE RESTRICT,
  client_deadline         TIME          NOT NULL,
  address                 TEXT          NOT NULL,
  latitude                NUMERIC(10,7) NOT NULL,
  longitude               NUMERIC(10,7) NOT NULL,
  weight_kg               NUMERIC(8,2),
  estimated_time_at_site  INTEGER       NOT NULL DEFAULT 15 CHECK (estimated_time_at_site > 0),
  status                  TEXT          NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending', 'assigned', 'in_route',
                            'arrived', 'completed', 'failed'
                          )),
  priority                INTEGER       NOT NULL DEFAULT 3
                          CHECK (priority BETWEEN 1 AND 5),
  notes                   TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_company_id    ON deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status        ON deliveries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_reception_win ON deliveries(reception_window_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_created       ON deliveries(company_id, created_at DESC);

CREATE OR REPLACE TRIGGER set_updated_at_deliveries
  BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 7: routes
-- =============================================================================
CREATE TABLE IF NOT EXISTS routes (
  id                       UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id               UUID          NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  date                     DATE          NOT NULL,
  driver_id                UUID          NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  vehicle_id               UUID          NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  deliveries_ordered       JSONB         NOT NULL DEFAULT '[]',
  status                   TEXT          NOT NULL DEFAULT 'planned'
                           CHECK (status IN ('planned', 'in_progress', 'completed')),
  started_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  estimated_total_km       NUMERIC(8,2),
  estimated_total_minutes  INTEGER,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (driver_id, date)
);

CREATE INDEX IF NOT EXISTS idx_routes_company_date ON routes(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_routes_driver_date  ON routes(driver_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_routes_status       ON routes(company_id, status);

CREATE OR REPLACE TRIGGER set_updated_at_routes
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================================
-- TABLE 8: delivery_events  (immutable event log — no updated_at)
-- =============================================================================
CREATE TABLE IF NOT EXISTS delivery_events (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id  UUID          NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  driver_id    UUID          NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  route_id     UUID          REFERENCES routes(id) ON DELETE SET NULL,
  event_type   TEXT          NOT NULL
               CHECK (event_type IN (
                 'departed', 'arrived', 'completed',
                 'failed', 'delayed', 'problem'
               )),
  latitude     NUMERIC(10,7),
  longitude    NUMERIC(10,7),
  notes        TEXT,
  timestamp    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_del_events_delivery ON delivery_events(delivery_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_del_events_driver   ON delivery_events(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_del_events_route    ON delivery_events(route_id);
CREATE INDEX IF NOT EXISTS idx_del_events_type     ON delivery_events(event_type);

-- =============================================================================
-- TABLE 9: delivery_proofs
-- =============================================================================
CREATE TABLE IF NOT EXISTS delivery_proofs (
  id                     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id            UUID        NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
  driver_id              UUID        NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  photo_marchandise_url  TEXT,
  photo_bl_tamonne_url   TEXT,
  uploaded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_proofs_delivery ON delivery_proofs(delivery_id);
CREATE INDEX IF NOT EXISTS idx_proofs_driver   ON delivery_proofs(driver_id);

-- =============================================================================
-- TABLE 10: driver_ratings
-- =============================================================================
CREATE TABLE IF NOT EXISTS driver_ratings (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_id         UUID          NOT NULL UNIQUE REFERENCES deliveries(id) ON DELETE CASCADE,
  driver_id           UUID          NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  efficiency_score    NUMERIC(3,2)  NOT NULL CHECK (efficiency_score BETWEEN 1 AND 5),
  punctuality_score   NUMERIC(3,2)  NOT NULL CHECK (punctuality_score BETWEEN 1 AND 5),
  time_at_site_score  NUMERIC(3,2)  NOT NULL CHECK (time_at_site_score BETWEEN 1 AND 5),
  incident_score      NUMERIC(3,2)  NOT NULL CHECK (incident_score BETWEEN 1 AND 5),
  manager_override    BOOLEAN       NOT NULL DEFAULT FALSE,
  notes               TEXT,
  rated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ratings_driver   ON driver_ratings(driver_id, rated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_delivery ON driver_ratings(delivery_id);

-- =============================================================================
-- TABLE 11: gps_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS gps_logs (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID          NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  route_id    UUID          REFERENCES routes(id) ON DELETE SET NULL,
  latitude    NUMERIC(10,7) NOT NULL,
  longitude   NUMERIC(10,7) NOT NULL,
  accuracy    NUMERIC(6,2),
  speed       NUMERIC(6,2),
  sequence    INTEGER       NOT NULL,
  timestamp   TIMESTAMPTZ   NOT NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Primary access pattern: get latest N positions for a driver
CREATE INDEX IF NOT EXISTS idx_gps_driver_ts  ON gps_logs(driver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_gps_route      ON gps_logs(route_id);
-- Prevent duplicate sequence numbers per driver (deduplication)
CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_driver_seq ON gps_logs(driver_id, sequence);

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE company           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_proofs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_ratings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_logs          ENABLE ROW LEVEL SECURITY;

-- company: users can only see their own company row
CREATE POLICY company_select_own ON company
  FOR SELECT USING (id = (auth.jwt() ->> 'company_id')::UUID);

-- users: same company isolation
CREATE POLICY users_all_own ON users
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- vehicles
CREATE POLICY vehicles_all_own ON vehicles
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- drivers
CREATE POLICY drivers_all_own ON drivers
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- reception_windows
CREATE POLICY reception_windows_all_own ON reception_windows
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- deliveries
CREATE POLICY deliveries_all_own ON deliveries
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- routes
CREATE POLICY routes_all_own ON routes
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- delivery_events: via delivery → company_id
CREATE POLICY delivery_events_select_own ON delivery_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_events.delivery_id
        AND d.company_id = (auth.jwt() ->> 'company_id')::UUID
    )
  );

CREATE POLICY delivery_events_insert_own ON delivery_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_events.delivery_id
        AND d.company_id = (auth.jwt() ->> 'company_id')::UUID
    )
  );

-- delivery_proofs: via delivery → company_id
CREATE POLICY delivery_proofs_all_own ON delivery_proofs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      WHERE d.id = delivery_proofs.delivery_id
        AND d.company_id = (auth.jwt() ->> 'company_id')::UUID
    )
  );

-- driver_ratings: via driver → company_id
CREATE POLICY driver_ratings_all_own ON driver_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM drivers dr
      WHERE dr.id = driver_ratings.driver_id
        AND dr.company_id = (auth.jwt() ->> 'company_id')::UUID
    )
  );

-- gps_logs: insert by driver, read by company managers
CREATE POLICY gps_logs_insert_own ON gps_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers dr
      WHERE dr.id = gps_logs.driver_id
        AND dr.company_id = (auth.jwt() ->> 'company_id')::UUID
    )
  );

CREATE POLICY gps_logs_select_own ON gps_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM drivers dr
      WHERE dr.id = gps_logs.driver_id
        AND dr.company_id = (auth.jwt() ->> 'company_id')::UUID
    )
  );

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Active drivers with current vehicle
CREATE OR REPLACE VIEW v_active_drivers AS
  SELECT
    d.id,
    d.company_id,
    d.name,
    d.phone,
    d.email,
    d.rating,
    d.rgpd_consent,
    d.fcm_token,
    v.id               AS vehicle_id,
    v.registration_plate,
    v.brand            AS vehicle_brand,
    v.model            AS vehicle_model,
    v.capacity_kg
  FROM drivers d
  LEFT JOIN vehicles v ON d.vehicle_id = v.id
  WHERE d.is_active = TRUE;

-- Today's routes with driver + vehicle enrichment
CREATE OR REPLACE VIEW v_today_routes AS
  SELECT
    r.*,
    d.name             AS driver_name,
    d.phone            AS driver_phone,
    d.fcm_token        AS driver_fcm_token,
    v.registration_plate,
    v.brand            AS vehicle_brand,
    v.model            AS vehicle_model
  FROM routes r
  JOIN drivers  d ON r.driver_id  = d.id
  JOIN vehicles v ON r.vehicle_id = v.id
  WHERE r.date = CURRENT_DATE;

-- Deliveries with store window info (JOIN shortcut for API layer)
CREATE OR REPLACE VIEW v_delivery_summary AS
  SELECT
    del.id,
    del.company_id,
    del.order_id,
    del.status,
    del.priority,
    del.client_deadline,
    del.latitude,
    del.longitude,
    del.weight_kg,
    del.estimated_time_at_site,
    del.notes,
    del.created_at,
    del.updated_at,
    rw.store_name,
    rw.store_address,
    rw.store_phone,
    rw.store_lat,
    rw.store_lng,
    rw.open_time       AS window_open,
    rw.close_time      AS window_close
  FROM deliveries del
  JOIN reception_windows rw ON del.reception_window_id = rw.id;
