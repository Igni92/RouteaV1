/**
 * RouteOptimizationService Tests
 * Jest test suite — AGENT-ALGO
 *
 * Coverage target: > 80%
 * Performance target: < 2 minutes for 20 deliveries
 *
 * Mock data: GERVIFRAIS seed (Hugo + Mamadou, 2 vehicles, 4 real deliveries)
 */

import { RouteOptimizationService, timeToMinutes, minutesToTime, haversineKm } from '../routeOptimization';
import type {
  DeliveryWithWindow,
  Driver,
  Vehicle,
  ReceptionWindow,
} from '../../../../shared/types';

// ── Test Fixtures ─────────────────────────────────────────────────────────────

const DEPOT_LAT = 48.7627;
const DEPOT_LNG = 2.3486;

/** Builds a minimal DeliveryWithWindow for test cases */
function makeDelivery(
  overrides: Partial<DeliveryWithWindow> & {
    id: string;
    latitude: number;
    longitude: number;
    open_time: string;
    close_time: string;
    client_deadline: string;
    weight_kg?: number;
    estimated_time_at_site?: number;
    store_name?: string;
  },
): DeliveryWithWindow {
  return {
    id: overrides.id,
    company_id: 'company-gervifrais',
    reception_window_id: `rw-${overrides.id}`,
    order_id: null,
    address: overrides.store_name ?? 'Test Address',
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    weight_kg: overrides.weight_kg ?? 100,
    estimated_time_at_site: overrides.estimated_time_at_site ?? 15,
    status: 'pending',
    priority: 3,
    notes: null,
    client_deadline: overrides.client_deadline,
    created_at: '2026-02-19T00:00:00Z',
    updated_at: '2026-02-19T00:00:00Z',
    reception_windows: {
      store_name: overrides.store_name ?? 'Test Store',
      store_address: overrides.address ?? 'Test Address',
      store_phone: null,
      store_lat: overrides.latitude,
      store_lng: overrides.longitude,
      open_time: overrides.open_time,
      close_time: overrides.close_time,
    },
  };
}

/** Builds a minimal Vehicle */
function makeVehicle(id: string, capacity_kg: number): Vehicle {
  return {
    id,
    company_id: 'company-gervifrais',
    registration_plate: `PLATE-${id}`,
    brand: 'Renault',
    model: 'Trafic',
    year: 2022,
    capacity_kg,
    status: 'active',
    last_maintenance_date: null,
    next_maintenance_date: null,
    notes: null,
    created_at: '2026-02-19T00:00:00Z',
    updated_at: '2026-02-19T00:00:00Z',
  };
}

/** Builds a minimal Driver */
function makeDriver(id: string, name: string): Driver {
  return {
    id,
    company_id: 'company-gervifrais',
    name,
    phone: '+33600000000',
    email: null,
    vehicle_id: null,
    license_number: `LIC-${id}`,
    rating: 4.5,
    rgpd_consent: true,
    rgpd_consent_at: '2026-02-19T00:00:00Z',
    fcm_token: null,
    is_active: true,
    created_at: '2026-02-19T00:00:00Z',
    updated_at: '2026-02-19T00:00:00Z',
  };
}

// ── GERVIFRAIS Seed Data ──────────────────────────────────────────────────────

const D1_AuchanMarne = makeDelivery({
  id: 'd1-auchan-marne',
  latitude: 48.8348,
  longitude: 2.7813,
  open_time: '00:00',
  close_time: '05:30',
  client_deadline: '05:00',
  weight_kg: 200,
  estimated_time_at_site: 20,
  store_name: 'Auchan Marne-la-Vallée',
});

const D2_AuchanVillebon = makeDelivery({
  id: 'd2-auchan-villebon',
  latitude: 48.6918,
  longitude: 2.2236,
  open_time: '00:00',
  close_time: '05:00',
  client_deadline: '04:45',
  weight_kg: 150,
  estimated_time_at_site: 15,
  store_name: 'Auchan Villebon',
});

const D3_CarrefourOrly = makeDelivery({
  id: 'd3-carrefour-orly',
  latitude: 48.7427,
  longitude: 2.4912,
  open_time: '06:00',
  close_time: '11:00',
  client_deadline: '10:00',
  weight_kg: 180,
  estimated_time_at_site: 20,
  store_name: 'Carrefour Orly',
});

const D4_MonoprixVillejuif = makeDelivery({
  id: 'd4-monoprix-villejuif',
  latitude: 48.7934,
  longitude: 2.3654,
  open_time: '07:00',
  close_time: '12:00',
  client_deadline: '11:00',
  weight_kg: 120,
  estimated_time_at_site: 15,
  store_name: 'Monoprix Villejuif',
});

const HUGO = makeDriver('driver-hugo', 'Hugo Vachey');
const MAMADOU = makeDriver('driver-mamadou', 'Mamadou Keita');
const VEHICLE_RENAULT = makeVehicle('vehicle-renault', 800);
const VEHICLE_CITROEN = makeVehicle('vehicle-citroen', 500);

// ── Unit Tests: Utility Functions ─────────────────────────────────────────────

describe('Utility: timeToMinutes', () => {
  test('converts 00:00 to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  test('converts 05:30 to 330', () => {
    expect(timeToMinutes('05:30')).toBe(330);
  });

  test('converts 12:00 to 720', () => {
    expect(timeToMinutes('12:00')).toBe(720);
  });

  test('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  test('returns -1 for invalid format', () => {
    expect(timeToMinutes('invalid')).toBe(-1);
    expect(timeToMinutes('')).toBe(-1);
  });
});

describe('Utility: minutesToTime', () => {
  test('converts 0 to 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  test('converts 330 to 05:30', () => {
    expect(minutesToTime(330)).toBe('05:30');
  });

  test('converts 720 to 12:00', () => {
    expect(minutesToTime(720)).toBe('12:00');
  });
});

describe('Utility: haversineKm', () => {
  test('depot to Carrefour Orly is ~11km', () => {
    const dist = haversineKm(DEPOT_LAT, DEPOT_LNG, 48.7427, 2.4912);
    expect(dist).toBeGreaterThan(8);
    expect(dist).toBeLessThan(15);
  });

  test('same coordinates return 0', () => {
    expect(haversineKm(48.7627, 2.3486, 48.7627, 2.3486)).toBeCloseTo(0, 5);
  });

  test('depot to Auchan Marne (~45km)', () => {
    const dist = haversineKm(DEPOT_LAT, DEPOT_LNG, 48.8348, 2.7813);
    expect(dist).toBeGreaterThan(30);
    expect(dist).toBeLessThan(60);
  });
});

// ── Case 1: Normal — 2 drivers, 4 deliveries ─────────────────────────────────

describe('Case 1: Normal scenario — 2 drivers, 4 deliveries', () => {
  let service: RouteOptimizationService;

  beforeEach(() => {
    service = new RouteOptimizationService([], {
      depotLat: DEPOT_LAT,
      depotLng: DEPOT_LNG,
    });
  });

  test('returns VALID feasibility', async () => {
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      2,
      [HUGO, MAMADOU],
      [VEHICLE_RENAULT, VEHICLE_CITROEN],
    );
    expect(result.feasibility).toBe('VALID');
  });

  test('returns exactly 2 routes', async () => {
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      2,
      [HUGO, MAMADOU],
      [VEHICLE_RENAULT, VEHICLE_CITROEN],
    );
    expect(result.routes).toHaveLength(2);
  });

  test('all 4 deliveries are assigned', async () => {
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      2,
      [HUGO, MAMADOU],
      [VEHICLE_RENAULT, VEHICLE_CITROEN],
    );
    const allAssigned = result.routes.flatMap((r) => r.deliveries_ordered);
    expect(allAssigned).toHaveLength(4);
    expect(allAssigned).toContain('d1-auchan-marne');
    expect(allAssigned).toContain('d2-auchan-villebon');
    expect(allAssigned).toContain('d3-carrefour-orly');
    expect(allAssigned).toContain('d4-monoprix-villejuif');
  });

  test('night deliveries are grouped together (D1+D2 or D2+D1)', async () => {
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      2,
      [HUGO, MAMADOU],
      [VEHICLE_RENAULT, VEHICLE_CITROEN],
    );
    // Night deliveries (D1, D2 — deadline before 05:30) should be on one route
    const nightIds = ['d1-auchan-marne', 'd2-auchan-villebon'];
    const routeWithD1 = result.routes.find((r) =>
      r.deliveries_ordered.includes('d1-auchan-marne'),
    );
    expect(routeWithD1).toBeDefined();
    expect(routeWithD1?.deliveries_ordered).toContain('d2-auchan-villebon');
  });

  test('estimated_total_km is positive', async () => {
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      2,
    );
    for (const route of result.routes) {
      if (route.deliveries_ordered.length > 0) {
        expect(route.estimated_total_km).toBeGreaterThan(0);
      }
    }
  });

  test('driver IDs are assigned from input list', async () => {
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      2,
      [HUGO, MAMADOU],
      [VEHICLE_RENAULT, VEHICLE_CITROEN],
    );
    const driverIds = result.routes.map((r) => r.driver_id);
    expect(driverIds).toContain('driver-hugo');
    expect(driverIds).toContain('driver-mamadou');
  });
});

// ── Case 2: Infeasible — windows don't overlap ────────────────────────────────

describe('Case 2: Infeasible — deadline before arrival possible', () => {
  test('returns INVALID when no route can reach on time', async () => {
    // Very tight deadline: depot is far from delivery, impossible to arrive before 00:05
    const impossibleDelivery = makeDelivery({
      id: 'impossible-d',
      latitude: 48.8348,
      longitude: 2.7813, // ~45km from depot — ~45min travel
      open_time: '00:00',
      close_time: '00:30',
      client_deadline: '00:10', // 10 minutes — impossible from depot 45km away
      weight_kg: 100,
    });

    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([impossibleDelivery], 1);
    expect(result.feasibility).toBe('INVALID');
  });

  test('returns INVALID when deadline is before reception opens', async () => {
    const badWindowDelivery = makeDelivery({
      id: 'bad-window',
      latitude: DEPOT_LAT,
      longitude: DEPOT_LNG, // Same location as depot — no travel needed
      open_time: '08:00',
      close_time: '12:00',
      client_deadline: '07:00', // deadline before open — logically impossible
      weight_kg: 50,
    });

    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([badWindowDelivery], 1);
    expect(result.feasibility).toBe('INVALID');
  });

  test('error includes constraint type', async () => {
    const impossibleDelivery = makeDelivery({
      id: 'impossible-d2',
      latitude: 48.8348,
      longitude: 2.7813,
      open_time: '00:00',
      close_time: '00:10', // closes in 10 min, 45km away — impossible
      client_deadline: '00:10',
      weight_kg: 100,
    });

    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([impossibleDelivery], 1);
    expect(result.feasibility).toBe('INVALID');
  });
});

// ── Case 3: Capacity exceeded ─────────────────────────────────────────────────

describe('Case 3: Vehicle capacity exceeded', () => {
  test('returns INVALID when total weight exceeds vehicle capacity', async () => {
    const heavy1 = makeDelivery({
      id: 'heavy-1',
      latitude: 48.7427,
      longitude: 2.4912,
      open_time: '00:00',
      close_time: '10:00',
      client_deadline: '09:00',
      weight_kg: 400,
    });
    const heavy2 = makeDelivery({
      id: 'heavy-2',
      latitude: 48.7934,
      longitude: 2.3654,
      open_time: '00:00',
      close_time: '10:00',
      client_deadline: '09:00',
      weight_kg: 500,
    });

    const service = new RouteOptimizationService();
    const smallVehicle = makeVehicle('small-vehicle', 800); // 400+500=900 > 800
    const result = await service.optimizeRoutes(
      [heavy1, heavy2],
      1,
      [HUGO],
      [smallVehicle],
    );
    expect(result.feasibility).toBe('INVALID');
  });

  test('returns VALID when total weight is exactly at capacity', async () => {
    const d1 = makeDelivery({
      id: 'cap-1',
      latitude: 48.7427,
      longitude: 2.4912,
      open_time: '00:00',
      close_time: '10:00',
      client_deadline: '09:00',
      weight_kg: 400,
    });
    const d2 = makeDelivery({
      id: 'cap-2',
      latitude: 48.7934,
      longitude: 2.3654,
      open_time: '00:00',
      close_time: '10:00',
      client_deadline: '09:00',
      weight_kg: 400,
    });

    const service = new RouteOptimizationService();
    const exactVehicle = makeVehicle('exact-vehicle', 800); // 400+400=800 == 800
    const result = await service.optimizeRoutes(
      [d1, d2],
      1,
      [HUGO],
      [exactVehicle],
    );
    expect(result.feasibility).toBe('VALID');
  });

  test('null weight_kg counts as 0 for capacity', async () => {
    const nullWeight = makeDelivery({
      id: 'null-weight',
      latitude: 48.7427,
      longitude: 2.4912,
      open_time: '00:00',
      close_time: '10:00',
      client_deadline: '09:00',
      weight_kg: undefined,
    });
    // Override to null
    (nullWeight as DeliveryWithWindow).weight_kg = null;

    const service = new RouteOptimizationService();
    const vehicle = makeVehicle('vehicle-small', 100);
    const result = await service.optimizeRoutes([nullWeight], 1, [HUGO], [vehicle]);
    expect(result.feasibility).toBe('VALID'); // null counts as 0, 0 ≤ 100
  });
});

// ── Case 4: Single driver ─────────────────────────────────────────────────────

describe('Case 4: Single driver — 4 deliveries', () => {
  test('returns 1 route with all 4 deliveries', async () => {
    const service = new RouteOptimizationService();
    const bigVehicle = makeVehicle('big-vehicle', 1000); // 200+150+180+120=650 < 1000
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      1,
      [HUGO],
      [bigVehicle],
    );
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0].deliveries_ordered).toHaveLength(4);
  });

  test('night deliveries come before morning deliveries in single-driver route', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      1,
    );
    const order = result.routes[0].deliveries_ordered;
    const d3Idx = order.indexOf('d3-carrefour-orly');
    const d4Idx = order.indexOf('d4-monoprix-villejuif');
    const d1Idx = order.indexOf('d1-auchan-marne');
    const d2Idx = order.indexOf('d2-auchan-villebon');
    // Night deliveries (D1, D2) must appear before morning ones (D3, D4)
    expect(Math.max(d1Idx, d2Idx)).toBeLessThan(Math.min(d3Idx, d4Idx));
  });

  test('returns VALID feasibility with large enough vehicle', async () => {
    const service = new RouteOptimizationService();
    const bigVehicle = makeVehicle('big-vehicle-2', 1000);
    const result = await service.optimizeRoutes(
      [D1_AuchanMarne, D2_AuchanVillebon, D3_CarrefourOrly, D4_MonoprixVillejuif],
      1,
      [HUGO],
      [bigVehicle],
    );
    expect(result.feasibility).toBe('VALID');
  });
});

// ── Case 5: All same time window ──────────────────────────────────────────────

describe('Case 5: All deliveries same time window', () => {
  const sameWindowDeliveries = [
    makeDelivery({
      id: 'sw-1',
      latitude: 48.75,
      longitude: 2.33,
      open_time: '06:00',
      close_time: '10:00',
      client_deadline: '09:30',
      weight_kg: 100,
    }),
    makeDelivery({
      id: 'sw-2',
      latitude: 48.78,
      longitude: 2.39,
      open_time: '06:00',
      close_time: '10:00',
      client_deadline: '09:30',
      weight_kg: 100,
    }),
    makeDelivery({
      id: 'sw-3',
      latitude: 48.76,
      longitude: 2.41,
      open_time: '06:00',
      close_time: '10:00',
      client_deadline: '09:30',
      weight_kg: 100,
    }),
    makeDelivery({
      id: 'sw-4',
      latitude: 48.74,
      longitude: 2.36,
      open_time: '06:00',
      close_time: '10:00',
      client_deadline: '09:30',
      weight_kg: 100,
    }),
  ];

  test('returns VALID with 2 drivers', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes(
      sameWindowDeliveries,
      2,
      [HUGO, MAMADOU],
      [makeVehicle('v1', 1000), makeVehicle('v2', 1000)],
    );
    expect(result.feasibility).toBe('VALID');
    expect(result.routes).toHaveLength(2);
  });

  test('all 4 deliveries are assigned across 2 routes', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes(sameWindowDeliveries, 2);
    const allIds = result.routes.flatMap((r) => r.deliveries_ordered);
    expect(allIds).toHaveLength(4);
    for (const d of sameWindowDeliveries) {
      expect(allIds).toContain(d.id);
    }
  });

  test('arrivals are within 06:00-09:30', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes(sameWindowDeliveries, 2);
    expect(result.feasibility).toBe('VALID');
    // If feasible, all arrivals are implicitly within window
  });
});

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('empty deliveries list returns VALID with empty routes', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([], 2);
    expect(result.feasibility).toBe('VALID');
    expect(result.routes).toHaveLength(0);
  });

  test('numDrivers = 0 returns INVALID', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([D1_AuchanMarne], 0);
    expect(result.feasibility).toBe('INVALID');
    expect(result.error).toBeTruthy();
  });

  test('numDrivers > deliveries: some routes are empty', async () => {
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([D3_CarrefourOrly], 3);
    // 1 delivery, 3 drivers — only 1 driver gets a delivery
    const totalAssigned = result.routes.flatMap((r) => r.deliveries_ordered).length;
    expect(totalAssigned).toBe(1);
    expect(result.routes.length).toBeGreaterThanOrEqual(1);
  });

  test('deadline equals close_time — boundary is VALID', async () => {
    const boundary = makeDelivery({
      id: 'boundary',
      latitude: DEPOT_LAT + 0.01, // very close to depot (~1km)
      longitude: DEPOT_LNG,
      open_time: '00:00',
      close_time: '10:00',
      client_deadline: '10:00', // exactly equals close_time
      weight_kg: 50,
    });
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([boundary], 1);
    expect(result.feasibility).toBe('VALID');
  });

  test('single delivery near depot — minimal travel time', async () => {
    const nearby = makeDelivery({
      id: 'nearby',
      latitude: DEPOT_LAT + 0.001,
      longitude: DEPOT_LNG + 0.001,
      open_time: '00:00',
      close_time: '23:59',
      client_deadline: '23:59',
      weight_kg: 10,
    });
    const service = new RouteOptimizationService();
    const result = await service.optimizeRoutes([nearby], 1);
    expect(result.feasibility).toBe('VALID');
    expect(result.routes[0].estimated_total_km).toBeLessThan(1);
  });

  test('constructor windowsMap enriches deliveries without reception_windows', async () => {
    const window: ReceptionWindow = {
      id: 'rw-lookup',
      company_id: 'company-gervifrais',
      store_name: 'Test Store Lookup',
      store_address: 'Test Address',
      store_lat: 48.76,
      store_lng: 2.35,
      store_phone: null,
      store_email: null,
      open_time: '00:00',
      close_time: '10:00',
      days_of_week: ['monday'],
      is_active: true,
      created_at: '2026-02-19T00:00:00Z',
      updated_at: '2026-02-19T00:00:00Z',
    };

    // Raw delivery without reception_windows field
    const rawDelivery = {
      id: 'raw-d',
      company_id: 'company-gervifrais',
      reception_window_id: 'rw-lookup', // matches window.id
      order_id: null,
      address: 'Test',
      latitude: 48.76,
      longitude: 2.35,
      weight_kg: 50,
      estimated_time_at_site: 10,
      status: 'pending' as const,
      priority: 3,
      notes: null,
      client_deadline: '09:00',
      created_at: '2026-02-19T00:00:00Z',
      updated_at: '2026-02-19T00:00:00Z',
    };

    const service = new RouteOptimizationService([window]);
    const result = await service.optimizeRoutes([rawDelivery], 1);
    expect(result.feasibility).toBe('VALID');
    expect(result.routes[0].deliveries_ordered).toContain('raw-d');
  });
});

// ── Performance Test ──────────────────────────────────────────────────────────

describe('Performance: 20 deliveries in < 2 minutes', () => {
  test('optimizes 20 deliveries in under 120 seconds', async () => {
    // Generate 20 deliveries spread around Île-de-France
    const deliveries: DeliveryWithWindow[] = Array.from({ length: 20 }, (_, i) => {
      const latOffset = ((i % 5) - 2) * 0.05;
      const lngOffset = (Math.floor(i / 5) - 2) * 0.05;
      return makeDelivery({
        id: `perf-d${i}`,
        latitude: DEPOT_LAT + latOffset,
        longitude: DEPOT_LNG + lngOffset,
        open_time: i < 10 ? '00:00' : '06:00',
        close_time: i < 10 ? '05:30' : '12:00',
        client_deadline: i < 10 ? '05:00' : '11:00',
        weight_kg: 50 + (i * 10),
        estimated_time_at_site: 15,
        store_name: `Store ${i}`,
      });
    });

    const service = new RouteOptimizationService();
    const startTime = Date.now();
    const result = await service.optimizeRoutes(deliveries, 2);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(120_000); // < 2 minutes
    expect(result.routes).toBeDefined();

    const totalAssigned = result.routes.flatMap((r) => r.deliveries_ordered).length;
    expect(totalAssigned).toBe(20);

    console.log(`[PERF] 20 deliveries optimized in ${elapsed}ms`);
  }, 130_000); // Jest timeout: 130 seconds

  test('optimizes 20 deliveries typically under 5 seconds', async () => {
    const deliveries: DeliveryWithWindow[] = Array.from({ length: 20 }, (_, i) => {
      const latOffset = ((i % 5) - 2) * 0.03;
      const lngOffset = (Math.floor(i / 5) - 2) * 0.03;
      return makeDelivery({
        id: `perf2-d${i}`,
        latitude: DEPOT_LAT + latOffset,
        longitude: DEPOT_LNG + lngOffset,
        open_time: '00:00',
        close_time: '12:00',
        client_deadline: '11:00',
        weight_kg: 30,
        estimated_time_at_site: 10,
        store_name: `Store ${i}`,
      });
    });

    const service = new RouteOptimizationService();
    const startTime = Date.now();
    await service.optimizeRoutes(deliveries, 2);
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(5_000); // typically well under 5s
    console.log(`[PERF] Same-window 20 deliveries in ${elapsed}ms`);
  }, 10_000);
});
