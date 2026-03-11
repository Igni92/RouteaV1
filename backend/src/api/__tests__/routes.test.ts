/**
 * API Routes Tests — GERVIFRAIS
 * AGENT-BACKEND-API
 *
 * Tests: REST endpoint behavior, validation, auth, error handling
 * Coverage target: > 80%
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// ── Test setup ────────────────────────────────────────────────────────────────

// Mock env before importing app modules
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-very-long-and-secure-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-very-long-32chars';
process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.iam.gserviceaccount.com';

import { apiRouter } from '../routes';
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler';

// ── Build test app (without Redis/WS) ─────────────────────────────────────────

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

// ── JWT test helper ───────────────────────────────────────────────────────────

function makeToken(overrides: Partial<{
  user_id: string;
  company_id: string;
  role: string;
  email: string;
}> = {}): string {
  const payload = {
    user_id: overrides.user_id ?? 'test-user-uuid',
    company_id: overrides.company_id ?? 'test-company-uuid',
    role: overrides.role ?? 'manager',
    email: overrides.email ?? 'test@gervifrais.fr',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return jwt.sign(payload, process.env.JWT_SECRET!);
}

const VALID_TOKEN = makeToken();

// ── Status endpoint ───────────────────────────────────────────────────────────

describe('GET /api/status', () => {
  const app = buildTestApp();

  test('returns 200 with service info', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe('GERVIFRAIS API');
    expect(res.body.data.version).toBe('1.0.0');
  });
});

// ── Auth endpoints ────────────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  const app = buildTestApp();

  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ password: 'password123', company_id: 'uuid-company' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', password: 'short', company_id: 'b7c3d2e1-1234-4000-8000-123456789abc' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.details).toBeDefined();
  });

  test('returns 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: 'password123', company_id: 'b7c3d2e1-1234-4000-8000-123456789abc' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when company_id is not a UUID', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@test.com', password: 'password123', company_id: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid input', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'hugo@gervifrais.fr',
        password: 'securepass123',
        company_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.tokens).toBeDefined();
    expect(res.body.data.tokens.access_token).toBeDefined();
    expect(res.body.data.tokens.token_type).toBe('Bearer');
  });
});

describe('POST /api/auth/login', () => {
  const app = buildTestApp();

  test('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  const app = buildTestApp();

  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  test('returns 200 with valid token', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Auth middleware ───────────────────────────────────────────────────────────

describe('Auth middleware', () => {
  const app = buildTestApp();

  test('returns 401 when no Authorization header', async () => {
    const res = await request(app).get('/api/routes');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_MISSING');
  });

  test('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', 'Bearer invalid.jwt.token');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_INVALID');
  });

  test('returns 401 with expired token', async () => {
    const expiredToken = jwt.sign(
      { user_id: 'u1', company_id: 'c1', role: 'manager', email: 'a@b.com' },
      process.env.JWT_SECRET!,
      { expiresIn: -1 }, // already expired
    );
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_EXPIRED');
  });

  test('returns 200 series with valid token', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    // Route list returns 200 (with stub data)
    expect(res.status).toBe(200);
  });
});

// ── Routes endpoints ──────────────────────────────────────────────────────────

describe('GET /api/routes', () => {
  const app = buildTestApp();

  test('returns 200 with empty list (stub)', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBe(0);
  });
});

describe('POST /api/routes', () => {
  const app = buildTestApp();

  test('returns 400 when date is missing', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ driver_id: 'b7c3d2e1-1234-4000-8000-123456789abc', vehicle_id: 'b7c3d2e1-1234-4000-8000-123456789def' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when driver_id is not UUID', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ date: '2026-02-19', driver_id: 'not-uuid', vehicle_id: 'b7c3d2e1-1234-4000-8000-123456789def' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when date format is invalid', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        date: '19/02/2026', // wrong format
        driver_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        vehicle_id: 'b7c3d2e1-1234-4000-8000-123456789def',
      });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid input', async () => {
    const res = await request(app)
      .post('/api/routes')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        date: '2026-02-19',
        driver_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        vehicle_id: 'b7c3d2e1-1234-4000-8000-123456789def',
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('planned');
  });
});

describe('POST /api/routes/:id/optimize', () => {
  const app = buildTestApp();

  test('returns 400 when delivery_ids is missing', async () => {
    const res = await request(app)
      .post('/api/routes/some-id/optimize')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when delivery_ids is empty array', async () => {
    const res = await request(app)
      .post('/api/routes/some-id/optimize')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ delivery_ids: [] });
    expect(res.status).toBe(400);
  });

  test('returns 200 with valid delivery_ids', async () => {
    const res = await request(app)
      .post('/api/routes/some-id/optimize')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ delivery_ids: ['d1', 'd2', 'd3'] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.optimization_result.feasibility).toBe('VALID');
  });
});

// ── Deliveries endpoints ──────────────────────────────────────────────────────

describe('POST /api/deliveries', () => {
  const app = buildTestApp();

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 400 when client_deadline format is invalid', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        reception_window_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        client_deadline: '25:00', // invalid
        address: '123 Rue de Test',
        latitude: 48.76,
        longitude: 2.35,
      });
    expect(res.status).toBe(400);
  });

  test('returns 400 when latitude is out of range', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        reception_window_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        client_deadline: '10:00',
        address: '123 Rue de Test',
        latitude: 95, // invalid
        longitude: 2.35,
      });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid input', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        reception_window_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        client_deadline: '05:00',
        address: 'Auchan Marne-la-Vallée',
        latitude: 48.8348,
        longitude: 2.7813,
        weight_kg: 200,
        estimated_time_at_site: 20,
        priority: 2,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('pending');
  });
});

describe('POST /api/deliveries/:id/events', () => {
  const app = buildTestApp();

  test('returns 400 when event_type is invalid', async () => {
    const res = await request(app)
      .post('/api/deliveries/some-id/events')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ event_type: 'teleported', driver_id: 'b7c3d2e1-1234-4000-8000-123456789abc' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when driver_id is missing', async () => {
    const res = await request(app)
      .post('/api/deliveries/some-id/events')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ event_type: 'arrived' });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid event', async () => {
    const res = await request(app)
      .post('/api/deliveries/some-delivery-id/events')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        event_type: 'arrived',
        driver_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        latitude: 48.8348,
        longitude: 2.7813,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.event_type).toBe('arrived');
  });
});

// ── Drivers endpoints ─────────────────────────────────────────────────────────

describe('POST /api/drivers', () => {
  const app = buildTestApp();

  test('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ phone: '+33600000000', license_number: 'B-123456' });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid input', async () => {
    const res = await request(app)
      .post('/api/drivers')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ name: 'Hugo Vachey', phone: '+33600000000', license_number: 'B-123456' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Hugo Vachey');
  });
});

describe('POST /api/drivers/:id/rating', () => {
  const app = buildTestApp();

  test('returns 400 when scores are out of range', async () => {
    const res = await request(app)
      .post('/api/drivers/some-id/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        delivery_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        efficiency_score: 6, // > 5
        punctuality_score: 4,
        time_at_site_score: 4,
        incident_score: 5,
      });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid ratings', async () => {
    const res = await request(app)
      .post('/api/drivers/some-driver-id/rating')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        delivery_id: 'b7c3d2e1-1234-4000-8000-123456789abc',
        efficiency_score: 4,
        punctuality_score: 5,
        time_at_site_score: 4,
        incident_score: 5,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.new_average).toBe(4.5);
  });
});

// ── Vehicles endpoints ────────────────────────────────────────────────────────

describe('POST /api/vehicles', () => {
  const app = buildTestApp();

  test('returns 400 when required fields missing', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({ brand: 'Renault' });
    expect(res.status).toBe(400);
  });

  test('returns 201 with valid input', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${VALID_TOKEN}`)
      .send({
        registration_plate: 'AB-123-CD',
        brand: 'Renault',
        model: 'Trafic',
        year: 2022,
        capacity_kg: 800,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.capacity_kg).toBe(800);
    expect(res.body.data.status).toBe('active');
  });
});

// ── 404 handler ───────────────────────────────────────────────────────────────

describe('404 handler', () => {
  const app = buildTestApp();

  test('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('ROUTE_NOT_FOUND');
  });
});

// ── Dashboard KPI ─────────────────────────────────────────────────────────────

describe('GET /api/dashboard/kpi', () => {
  const app = buildTestApp();

  test('returns 200 with KPI structure', async () => {
    const res = await request(app)
      .get('/api/dashboard/kpi')
      .set('Authorization', `Bearer ${VALID_TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('total_deliveries');
    expect(res.body.data).toHaveProperty('on_time_rate');
  });
});
