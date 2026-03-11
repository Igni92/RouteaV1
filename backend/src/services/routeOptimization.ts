/**
 * RouteOptimizationService — GERVIFRAIS Fleet Management
 * AGENT-ALGO implementation
 *
 * Algorithm: Nearest Neighbor TSP + 2-OPT local search
 * Complexity: O(N²) for NN, O(N³) worst-case for 2-OPT
 * Performance: < 2 minutes for 20 deliveries (typically < 1 second)
 *
 * See /docs/ALGORITHM_SPEC.md for full specification.
 */

import type {
  Delivery,
  DeliveryWithWindow,
  Driver,
  Vehicle,
  ReceptionWindow,
  OptimizedRoute,
  FeasibilityResult,
  FeasibilityError,
  FeasibilityStatus,
} from '../../../shared/types';

// ── Constants ────────────────────────────────────────────────────────────────

const AVG_SPEED_KMH = 60;       // km/h — Île-de-France urban average
const EARTH_RADIUS_KM = 6371;   // WGS84 mean radius
const DEPOT_LAT = 48.7627;      // GERVIFRAIS HQ — Chevilly-Larue
const DEPOT_LNG = 2.3486;

// ── Pure utility functions ───────────────────────────────────────────────────

/**
 * Parses "HH:MM" time string to minutes since midnight.
 * Returns -1 for invalid input.
 */
function timeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) return -1;
  const hh = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10);
  if (isNaN(hh) || isNaN(mm)) return -1;
  return hh * 60 + mm;
}

/**
 * Converts minutes since midnight to "HH:MM" string.
 */
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Haversine formula — great-circle distance between two GPS coordinates (km).
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Travel time in minutes between two GPS points, assuming AVG_SPEED_KMH.
 */
function travelTimeMin(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  return (haversineKm(lat1, lng1, lat2, lng2) / AVG_SPEED_KMH) * 60;
}

/**
 * Total route distance in km, starting and ending at (startLat, startLng).
 */
function totalRouteKm(
  route: DeliveryWithWindow[],
  startLat: number,
  startLng: number,
): number {
  let total = 0;
  let prevLat = startLat;
  let prevLng = startLng;
  for (const d of route) {
    total += haversineKm(prevLat, prevLng, d.latitude, d.longitude);
    prevLat = d.latitude;
    prevLng = d.longitude;
  }
  return total;
}

// ── Internal simulation type ─────────────────────────────────────────────────

interface RouteSimulation {
  is_feasible: boolean;
  errors: FeasibilityError[];
  total_km: number;
  total_minutes: number;
}

// ── Main Service Class ────────────────────────────────────────────────────────

/**
 * RouteOptimizationService
 *
 * Constructor dependencies:
 *   receptionWindows — array of ReceptionWindow records (pre-fetched from DB)
 *   options.depotLat / depotLng — override GERVIFRAIS HQ coordinates
 *
 * The `deliveries` passed to `optimizeRoutes` must be DeliveryWithWindow objects
 * (i.e., enriched with `reception_windows` field). Typed as `Delivery[]` to match
 * the public API contract, but the service will use the `reception_windows` field
 * if present, falling back to the windowsMap lookup via `reception_window_id`.
 */
export class RouteOptimizationService {
  private readonly depotLat: number;
  private readonly depotLng: number;
  private readonly windowsMap: Map<string, ReceptionWindow>;

  constructor(
    receptionWindows: ReceptionWindow[] = [],
    options?: { depotLat?: number; depotLng?: number },
  ) {
    this.depotLat = options?.depotLat ?? DEPOT_LAT;
    this.depotLng = options?.depotLng ?? DEPOT_LNG;
    this.windowsMap = new Map(receptionWindows.map((w) => [w.id, w]));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Main entry point: optimize routes for N deliveries across K drivers.
   *
   * @param deliveries  — enriched deliveries (DeliveryWithWindow or with reception_windows)
   * @param numDrivers  — number of drivers (K)
   * @param drivers     — optional driver list for ID assignment
   * @param vehicles    — optional vehicle list for capacity validation + ID assignment
   * @returns           — optimized routes + feasibility result
   */
  async optimizeRoutes(
    deliveries: Delivery[],
    numDrivers: number,
    drivers?: Driver[],
    vehicles?: Vehicle[],
  ): Promise<{
    routes: OptimizedRoute[];
    feasibility: 'VALID' | 'INVALID';
    error?: string;
  }> {
    if (deliveries.length === 0) {
      return { routes: [], feasibility: 'VALID' };
    }

    if (numDrivers <= 0) {
      return {
        routes: [],
        feasibility: 'INVALID',
        error: 'numDrivers must be >= 1',
      };
    }

    // Enrich deliveries with reception window data
    const enriched = this.enrichDeliveries(deliveries);

    // Pre-check: detect logically impossible windows (deadline < open_time)
    const preErrors = this.detectImpossibleWindows(enriched);

    // Build initial routes using nearest-neighbor heuristic
    const driverRoutes = this.nearestNeighbor(
      enriched,
      Math.min(numDrivers, enriched.length),
    );

    // Apply 2-OPT local search to each driver route
    const optimizedRoutes = driverRoutes.map((route) =>
      this.localSearch2Opt(route),
    );

    // Simulate each route to validate feasibility + compute metrics
    const allErrors: FeasibilityError[] = [...preErrors];
    const result: OptimizedRoute[] = [];

    for (let i = 0; i < optimizedRoutes.length; i++) {
      const route = optimizedRoutes[i];
      const vehicle = vehicles?.[i];
      const driver = drivers?.[i];

      const simulation = this.simulateRoute(route);
      allErrors.push(...simulation.errors);

      // Capacity validation
      if (vehicle) {
        const capErrors = this.validateCapacity(route, vehicle);
        allErrors.push(...capErrors);
      }

      result.push({
        driver_id: driver?.id ?? `driver-${i}`,
        vehicle_id: vehicle?.id ?? `vehicle-${i}`,
        deliveries_ordered: route.map((d) => d.id),
        estimated_total_km: Math.round(simulation.total_km * 100) / 100,
        estimated_total_minutes: Math.round(simulation.total_minutes),
      });
    }

    const feasibility: 'VALID' | 'INVALID' =
      allErrors.length === 0 ? 'VALID' : 'INVALID';

    return { routes: result, feasibility };
  }

  // ── Private: algorithm core ────────────────────────────────────────────────

  /**
   * Nearest Neighbor TSP for multiple drivers (round-robin assignment).
   * Complexity: O(N² × K)
   */
  private nearestNeighbor(
    deliveries: DeliveryWithWindow[],
    numDrivers: number,
  ): DeliveryWithWindow[][] {
    // Sort by earliest effective deadline to guide assignment order
    const sorted = [...deliveries].sort((a, b) => {
      const deadlineA = Math.min(
        timeToMinutes(a.client_deadline),
        timeToMinutes(a.reception_windows.close_time),
      );
      const deadlineB = Math.min(
        timeToMinutes(b.client_deadline),
        timeToMinutes(b.reception_windows.close_time),
      );
      return deadlineA - deadlineB;
    });

    // Initialize driver states at depot
    const driverLat = Array(numDrivers).fill(this.depotLat) as number[];
    const driverLng = Array(numDrivers).fill(this.depotLng) as number[];
    const driverTime = Array(numDrivers).fill(0) as number[]; // minutes since midnight
    const driverRoutes: DeliveryWithWindow[][] = Array.from(
      { length: numDrivers },
      () => [],
    );

    const remaining = [...sorted];

    while (remaining.length > 0) {
      for (let d = 0; d < numDrivers; d++) {
        if (remaining.length === 0) break;

        let best: DeliveryWithWindow | null = null;
        let bestDist = Infinity;

        // Pass 1: find nearest delivery that arrives within time window
        for (const del of remaining) {
          const dist = haversineKm(driverLat[d], driverLng[d], del.latitude, del.longitude);
          const travelMin = (dist / AVG_SPEED_KMH) * 60;
          const arrival = driverTime[d] + travelMin;
          const closeMin = timeToMinutes(del.reception_windows.close_time);
          const deadlineMin = timeToMinutes(del.client_deadline);
          const effectiveClose = Math.min(closeMin, deadlineMin);

          if (arrival <= effectiveClose && dist < bestDist) {
            bestDist = dist;
            best = del;
          }
        }

        // Pass 2: if no time-feasible delivery, take nearest by distance
        if (best === null) {
          for (const del of remaining) {
            const dist = haversineKm(driverLat[d], driverLng[d], del.latitude, del.longitude);
            if (dist < bestDist) {
              bestDist = dist;
              best = del;
            }
          }
        }

        if (best !== null) {
          const travelMin = (bestDist / AVG_SPEED_KMH) * 60;
          const arrival = driverTime[d] + travelMin;
          const openMin = timeToMinutes(best.reception_windows.open_time);
          const waitUntil = Math.max(arrival, openMin);
          const departure = waitUntil + best.estimated_time_at_site;

          driverRoutes[d].push(best);
          driverLat[d] = best.latitude;
          driverLng[d] = best.longitude;
          driverTime[d] = departure;

          const idx = remaining.indexOf(best);
          remaining.splice(idx, 1);
        }
      }
    }

    return driverRoutes;
  }

  /**
   * 2-OPT local search: iteratively reverse route segments to minimize distance.
   * Only accepts improvements that preserve time-window feasibility.
   * Complexity: O(N³) worst-case
   */
  private localSearch2Opt(route: DeliveryWithWindow[]): DeliveryWithWindow[] {
    if (route.length < 3) return route;

    let current = [...route];
    let improved = true;

    while (improved) {
      improved = false;
      const n = current.length;

      outer: for (let i = 1; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          // Build candidate: reverse segment [i..j]
          const candidate = [
            ...current.slice(0, i),
            ...current.slice(i, j + 1).reverse(),
            ...current.slice(j + 1),
          ];

          const currentKm = totalRouteKm(current, this.depotLat, this.depotLng);
          const candidateKm = totalRouteKm(candidate, this.depotLat, this.depotLng);

          if (candidateKm < currentKm) {
            // Accept only if feasibility is maintained
            const sim = this.simulateRoute(candidate);
            if (sim.is_feasible) {
              current = candidate;
              improved = true;
              break outer;
            }
          }
        }
      }
    }

    return current;
  }

  /**
   * Validate time-window feasibility for a single route.
   * Returns true if all deliveries can be reached within their windows.
   */
  private validateFeasibility(route: Delivery[]): boolean {
    const enriched = this.enrichDeliveries(route);
    const sim = this.simulateRoute(enriched);
    return sim.is_feasible;
  }

  /**
   * Calculate travel time (minutes) between two deliveries.
   */
  private calculateTravelTime(from: Delivery, to: Delivery): number {
    return travelTimeMin(from.latitude, from.longitude, to.latitude, to.longitude);
  }

  /**
   * Check if a delivery can be visited given an arrival time (minutes since midnight).
   * Arriving BEFORE open is allowed (driver waits). Arriving AFTER close is INVALID.
   */
  private isWithinWindow(delivery: Delivery, arrivalTime: number): boolean {
    const enriched = this.enrichDelivery(delivery);
    if (!enriched) return false;

    const closeMin = timeToMinutes(enriched.reception_windows.close_time);
    const deadlineMin = timeToMinutes(enriched.client_deadline);
    const effectiveClose = Math.min(closeMin, deadlineMin);

    return arrivalTime <= effectiveClose;
  }

  // ── Private: helpers ────────────────────────────────────────────────────────

  /**
   * Simulate a route from the depot, computing arrival times and detecting violations.
   */
  private simulateRoute(route: DeliveryWithWindow[]): RouteSimulation {
    const errors: FeasibilityError[] = [];
    let currentLat = this.depotLat;
    let currentLng = this.depotLng;
    let currentTime = 0; // minutes since midnight
    let totalKm = 0;

    for (const delivery of route) {
      const distKm = haversineKm(currentLat, currentLng, delivery.latitude, delivery.longitude);
      const travelMin = (distKm / AVG_SPEED_KMH) * 60;
      const arrival = currentTime + travelMin;

      const openMin = timeToMinutes(delivery.reception_windows.open_time);
      const closeMin = timeToMinutes(delivery.reception_windows.close_time);
      const deadlineMin = timeToMinutes(delivery.client_deadline);

      // HARD CONSTRAINT 1: must arrive before reception closes
      if (arrival > closeMin) {
        errors.push({
          delivery_id: delivery.id,
          store_name: delivery.reception_windows.store_name,
          constraint: 'reception_window_close',
          message: `Arrives at ${minutesToTime(arrival)} but reception closes at ${minutesToTime(closeMin)}`,
          expected: minutesToTime(closeMin),
          actual: minutesToTime(arrival),
        });
      }

      // HARD CONSTRAINT 2: must arrive before client deadline
      if (arrival > deadlineMin) {
        errors.push({
          delivery_id: delivery.id,
          store_name: delivery.reception_windows.store_name,
          constraint: 'client_deadline',
          message: `Arrives at ${minutesToTime(arrival)} but deadline is ${minutesToTime(deadlineMin)}`,
          expected: minutesToTime(deadlineMin),
          actual: minutesToTime(arrival),
        });
      }

      // Wait if arrived early, then serve
      const effectiveArrival = Math.max(arrival, openMin);
      const departure = effectiveArrival + delivery.estimated_time_at_site;

      totalKm += distKm;
      currentLat = delivery.latitude;
      currentLng = delivery.longitude;
      currentTime = departure;
    }

    return {
      is_feasible: errors.length === 0,
      errors,
      total_km: totalKm,
      total_minutes: currentTime, // total elapsed minutes from midnight
    };
  }

  /**
   * Validate vehicle capacity for a route.
   */
  private validateCapacity(
    route: DeliveryWithWindow[],
    vehicle: Vehicle,
  ): FeasibilityError[] {
    const totalWeight = route.reduce((sum, d) => sum + (d.weight_kg ?? 0), 0);

    if (totalWeight > vehicle.capacity_kg) {
      return [
        {
          delivery_id: route.map((d) => d.id).join(','),
          constraint: 'vehicle_capacity',
          message: `Total load ${totalWeight}kg exceeds vehicle capacity ${vehicle.capacity_kg}kg`,
          expected: `<= ${vehicle.capacity_kg}kg`,
          actual: `${totalWeight}kg`,
        },
      ];
    }

    return [];
  }

  /**
   * Detect deliveries where client_deadline < reception_window.open_time
   * (logically impossible regardless of routing).
   */
  private detectImpossibleWindows(deliveries: DeliveryWithWindow[]): FeasibilityError[] {
    const errors: FeasibilityError[] = [];
    for (const d of deliveries) {
      const openMin = timeToMinutes(d.reception_windows.open_time);
      const deadlineMin = timeToMinutes(d.client_deadline);
      if (deadlineMin < openMin) {
        errors.push({
          delivery_id: d.id,
          store_name: d.reception_windows.store_name,
          constraint: 'client_deadline',
          message: `Deadline ${d.client_deadline} is before reception opens at ${d.reception_windows.open_time}`,
          expected: `>= ${d.reception_windows.open_time}`,
          actual: d.client_deadline,
        });
      }
    }
    return errors;
  }

  /**
   * Enrich a raw Delivery[] with reception window data.
   * If the delivery already has `reception_windows`, uses that.
   * Otherwise falls back to the windowsMap injected in the constructor.
   */
  private enrichDeliveries(deliveries: Delivery[]): DeliveryWithWindow[] {
    return deliveries
      .map((d) => this.enrichDelivery(d))
      .filter((d): d is DeliveryWithWindow => d !== null);
  }

  private enrichDelivery(delivery: Delivery): DeliveryWithWindow | null {
    // Already enriched (DeliveryWithWindow)
    const maybeEnriched = delivery as DeliveryWithWindow;
    if (maybeEnriched.reception_windows?.open_time) {
      return maybeEnriched;
    }

    // Fall back to constructor-injected windows map
    const window = this.windowsMap.get(delivery.reception_window_id);
    if (!window) return null;

    return {
      ...delivery,
      reception_windows: {
        store_name: window.store_name,
        store_address: window.store_address,
        store_phone: window.store_phone,
        store_lat: window.store_lat,
        store_lng: window.store_lng,
        open_time: window.open_time,
        close_time: window.close_time,
      },
    };
  }
}

// ── Export utility functions for testing ─────────────────────────────────────

export { timeToMinutes, minutesToTime, haversineKm, travelTimeMin };
