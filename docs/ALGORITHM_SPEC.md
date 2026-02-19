# ALGORITHM SPEC — Route Optimization Engine
> IMMUTABLE — Created by AGENT-ALGO | Do not modify
> Version: 1.0.0 | Created: 2026-02-19

---

## 1. PROBLEM STATEMENT

### 1.1 Context

GERVIFRAIS is a cold-chain food logistics company based in Chevilly-Larue (94550).
Drivers must deliver to supermarkets overnight and in the morning, respecting strict
reception time windows. The manager creates a route plan; the algorithm optimizes
delivery order to minimize travel time while satisfying all hard constraints.

### 1.2 Formal Definition

**Input:**
```
deliveries : Delivery[]         — N deliveries, each with:
                                  • latitude, longitude (GPS coordinates)
                                  • reception_window.open_time  (HH:MM)
                                  • reception_window.close_time (HH:MM)
                                  • client_deadline             (HH:MM)
                                  • weight_kg                   (nullable)
                                  • estimated_time_at_site      (minutes)

numDrivers : number             — K drivers (K ≥ 1)

vehicles   : Vehicle[]          — K vehicles with capacity_kg

depot_lat  : number             — GERVIFRAIS HQ latitude  (default: 48.7627)
depot_lng  : number             — GERVIFRAIS HQ longitude (default: 2.3486)
```

**Output:**
```
routes : OptimizedRoute[]       — K routes (one per driver), each containing:
                                  • driver_id
                                  • vehicle_id
                                  • deliveries_ordered (delivery UUIDs in visit order)
                                  • estimated_total_km
                                  • estimated_total_minutes

feasibility : FeasibilityResult — VALID | INVALID + list of constraint violations
```

### 1.3 Hard Constraints (MUST be respected)

#### DOUBLE FENÊTRE CONSTRAINT

Every delivery has TWO time constraints that BOTH must be satisfied:

```
CONSTRAINT 1 — Reception Window:
  arrival_time >= reception_window.open_time
  arrival_time <= reception_window.close_time

CONSTRAINT 2 — Client Deadline:
  arrival_time <= client_deadline
```

Combined: `open_time ≤ arrival_time ≤ min(close_time, client_deadline)`

**Waiting is allowed**: if `arrival_time < open_time`, driver waits at site.
**Early arrival is OK**: if `arrival_time < open_time`, set effective time = open_time.
**Late arrival is INVALID**: if `arrival_time > close_time` OR `arrival_time > client_deadline`.

#### VEHICLE CAPACITY CONSTRAINT

```
sum(delivery.weight_kg for delivery in route) ≤ vehicle.capacity_kg
```

Deliveries with `weight_kg = null` are counted as 0 for capacity purposes.

### 1.4 Soft Constraints (optimize but not required)

- Minimize total travel distance (km)
- Minimize total route duration (minutes)
- Respect delivery priority (1 = highest)

### 1.5 Concrete Test Input — GERVIFRAIS Seed Data

```
Depot: GERVIFRAIS HQ — Chevilly-Larue (48.7627, 2.3486)

Deliveries:
  D1: Auchan Marne-la-Vallée (48.8348, 2.7813)
      open: 00:00 | close: 05:30 | deadline: 05:00
      weight: 200kg | site_time: 20min | priority: 2

  D2: Auchan Villebon (48.6918, 2.2236)
      open: 00:00 | close: 05:00 | deadline: 04:45
      weight: 150kg | site_time: 15min | priority: 2

  D3: Carrefour Orly (48.7427, 2.4912)
      open: 06:00 | close: 11:00 | deadline: 10:00
      weight: 180kg | site_time: 20min | priority: 3

  D4: Monoprix Villejuif (48.7934, 2.3654)
      open: 07:00 | close: 12:00 | deadline: 11:00
      weight: 120kg | site_time: 15min | priority: 3

Drivers:
  Hugo Vachey   → Renault Trafic (800kg capacity)
  Mamadou Keita → Citroën C15 (500kg capacity)

Expected optimal assignment:
  Hugo (800kg):    D1 (200kg) + D2 (150kg) = 350kg  [night route, 00:00-05:30]
  Mamadou (500kg): D3 (180kg) + D4 (120kg) = 300kg  [morning route, 06:00-12:00]
```

---

## 2. NEAREST NEIGHBOR TSP

### 2.1 Algorithm Description

The Nearest Neighbor (NN) heuristic builds a route greedily: starting from the depot,
always visit the closest unvisited delivery that satisfies time window constraints.

For multiple drivers, all drivers pick deliveries in round-robin fashion, each
choosing the nearest feasible delivery from their current position.

### 2.2 Pseudo-code

```
function nearestNeighbor(deliveries, numDrivers, depot_lat, depot_lng):
  # Initialize driver states
  for each driver d in 0..numDrivers-1:
    state[d].lat    ← depot_lat
    state[d].lng    ← depot_lng
    state[d].time   ← 0               # minutes since midnight
    state[d].route  ← []
    state[d].totalKm ← 0

  remaining ← copy of deliveries
  sort remaining by client_deadline ASC (earliest deadline first)

  # Round-robin assignment
  while remaining is not empty:
    for each driver d in 0..numDrivers-1:
      if remaining is empty: break

      # Pass 1: find nearest FEASIBLE delivery (time + capacity)
      best ← null
      bestDist ← +∞

      for each delivery del in remaining:
        dist ← haversine(state[d].lat, state[d].lng, del.lat, del.lng)
        travelMin ← (dist / AVG_SPEED_KMH) * 60
        arrival ← state[d].time + travelMin
        if arrival > min(del.close_time, del.client_deadline):
          continue  # would arrive too late — skip

        if dist < bestDist:
          bestDist ← dist
          best ← del

      # Pass 2: if no feasible delivery, take nearest by distance (algorithm continues)
      if best is null:
        for each delivery del in remaining:
          dist ← haversine(state[d].lat, state[d].lng, del.lat, del.lng)
          if dist < bestDist:
            bestDist ← dist
            best ← del

      if best is not null:
        travelMin ← (bestDist / AVG_SPEED_KMH) * 60
        arrival   ← state[d].time + travelMin
        waitUntil ← max(arrival, best.open_time)
        departure ← waitUntil + best.estimated_time_at_site

        state[d].route.push(best)
        state[d].lat    ← best.latitude
        state[d].lng    ← best.longitude
        state[d].time   ← departure
        state[d].totalKm ← state[d].totalKm + bestDist
        remove best from remaining

  return state[*].route  # array of routes, one per driver
```

### 2.3 Complexity

| Operation | Complexity |
|-----------|-----------|
| Outer while loop | O(N) iterations |
| Inner for-driver loop | O(K) per iteration |
| Find nearest | O(N) scan |
| **Total** | **O(N² × K)** ≈ O(N²) for small K |

### 2.4 Performance Target

- **N = 20 deliveries, K = 2 drivers**: < 2 minutes (target < 5 seconds in practice)
- **N = 4 deliveries, K = 2 drivers**: < 100ms
- The algorithm is O(N²) so scales well for the MVP target of ≤ 50 deliveries.

### 2.5 Average Speed Assumption

```
AVG_SPEED_KMH = 60   # km/h — urban/peri-urban average for Île-de-France
```

All travel times are computed as: `travel_minutes = (distance_km / 60) * 60`

---

## 3. LOCAL SEARCH 2-OPT

### 3.1 Algorithm Description

2-OPT is a local search improvement heuristic. It iteratively reverses segments
of the route to reduce total travel distance. If reversing the segment between
positions i and j reduces total route length, the reversal is accepted.

2-OPT is applied independently to each driver's route AFTER the nearest-neighbor
initial construction.

**Note**: After 2-OPT, feasibility must be re-validated. If reversing a segment
creates a time window violation, the reversal is **rejected** (infeasibility-aware 2-OPT).

### 3.2 Pseudo-code

```
function localSearch2Opt(route, depot_lat, depot_lng):
  improved ← true

  while improved:
    improved ← false

    for i in 1 .. len(route) - 1:
      for j in i + 1 .. len(route):
        # Build candidate route with segment [i..j] reversed
        candidate ← route[0..i-1] + reverse(route[i..j]) + route[j+1..]

        # Check if candidate has better total distance
        if totalRouteKm(candidate, depot_lat, depot_lng) <
           totalRouteKm(route, depot_lat, depot_lng):

          # Check feasibility: 2-OPT reversal must not violate time windows
          if simulateRoute(candidate, depot_lat, depot_lng).is_feasible:
            route ← candidate
            improved ← true
            break  # restart inner loops

  return route

function totalRouteKm(route, depot_lat, depot_lng):
  total ← 0
  prevLat, prevLng ← depot_lat, depot_lng
  for each delivery in route:
    total ← total + haversine(prevLat, prevLng, delivery.lat, delivery.lng)
    prevLat, prevLng ← delivery.lat, delivery.lng
  return total
```

### 3.3 Complexity

| Operation | Complexity |
|-----------|-----------|
| Outer while loop | O(N) in practice (few improvements) |
| Double for loop | O(N²) |
| Feasibility check | O(N) |
| **Total** | **O(N³)** worst case, O(N²) typical |

For N = 20: ~8000 operations — well within 2-minute target.

---

## 4. CONSTRAINT VALIDATION

### 4.1 Double Fenêtre Logic

```
function isWithinWindow(delivery, arrivalTimeMin):
  open     ← timeToMinutes(delivery.reception_window.open_time)
  close    ← timeToMinutes(delivery.reception_window.close_time)
  deadline ← timeToMinutes(delivery.client_deadline)

  effectiveClose ← min(close, deadline)

  return arrivalTimeMin <= effectiveClose
  # Note: arriving BEFORE open is OK — driver waits

function simulateRoute(route, depot_lat, depot_lng):
  errors ← []
  currentLat ← depot_lat
  currentLng ← depot_lng
  currentTime ← 0  # minutes since midnight

  for each delivery in route:
    distKm    ← haversine(currentLat, currentLng, delivery.lat, delivery.lng)
    travelMin ← (distKm / AVG_SPEED_KMH) * 60
    arrival   ← currentTime + travelMin

    open     ← timeToMinutes(delivery.reception_window.open_time)
    close    ← timeToMinutes(delivery.reception_window.close_time)
    deadline ← timeToMinutes(delivery.client_deadline)

    # Check: arrived AFTER close?
    if arrival > close:
      errors.push({ delivery_id, constraint: 'reception_window_close', ... })

    # Check: arrived AFTER deadline?
    if arrival > deadline:
      errors.push({ delivery_id, constraint: 'client_deadline', ... })

    # Advance time (wait if early)
    effectiveArrival ← max(arrival, open)
    departure ← effectiveArrival + delivery.estimated_time_at_site
    currentTime ← departure
    currentLat ← delivery.latitude
    currentLng ← delivery.longitude

  return { is_feasible: errors.length === 0, errors }
```

### 4.2 Vehicle Capacity Check

```
function validateCapacity(route, vehicle):
  totalWeight ← sum(delivery.weight_kg ?? 0 for delivery in route)
  if totalWeight > vehicle.capacity_kg:
    return {
      valid: false,
      error: {
        constraint: 'vehicle_capacity',
        message: `Load ${totalWeight}kg exceeds vehicle capacity ${vehicle.capacity_kg}kg`,
        actual: totalWeight,
        expected: vehicle.capacity_kg
      }
    }
  return { valid: true }
```

### 4.3 Return Values

| Return | Condition |
|--------|-----------|
| `VALID` | All routes satisfy time windows + capacity constraints |
| `INVALID` | One or more hard constraint violations detected |

The `FeasibilityResult` always includes a full list of `FeasibilityError[]` describing
exactly which delivery violated which constraint.

---

## 5. TEST CASES

### Case 1: Normal — 2 drivers, 4 deliveries (GERVIFRAIS seed)

```
Input:
  deliveries: [D1 (Auchan MV), D2 (Auchan VB), D3 (Carrefour), D4 (Monoprix)]
  numDrivers: 2
  vehicles: [Renault 800kg, Citroën 500kg]

Expected:
  feasibility: VALID
  routes[0]: D2 → D1  (or D1 → D2, both feasible)  — night deliveries
  routes[1]: D3 → D4  (or D4 → D3, both feasible)  — morning deliveries
  both routes within time windows
  capacity: 350kg ≤ 800kg ✓ | 300kg ≤ 500kg ✓
```

### Case 2: Infeasible — time windows don't overlap

```
Input:
  D_A: open 08:00, close 09:00, deadline 08:30
       at location 100km from depot (cannot reach in time from midnight)
  numDrivers: 1

Expected:
  feasibility: INVALID
  errors[0].constraint: 'reception_window_close' or 'client_deadline'
  errors[0].delivery_id: D_A.id
```

### Case 3: Capacity exceeded

```
Input:
  D_heavy1: weight 400kg → Renault Trafic (800kg max)
  D_heavy2: weight 500kg → same route
  numDrivers: 1
  vehicle.capacity_kg: 800kg

Expected:
  feasibility: INVALID
  errors[0].constraint: 'vehicle_capacity'
  total load: 900kg > 800kg
```

### Case 4: Single driver, 4 deliveries

```
Input:
  deliveries: [D1, D2, D3, D4]  (same as Case 1)
  numDrivers: 1
  vehicle.capacity_kg: 1000kg

Expected:
  feasibility: VALID (vehicle has enough capacity)
  routes.length: 1
  route contains all 4 deliveries
  Night deliveries must come BEFORE morning deliveries
  (D1 or D2 → D2 or D1 → wait → D3 → D4)
```

### Case 5: All deliveries same time window

```
Input:
  D_A, D_B, D_C, D_D: all open 06:00, close 10:00, deadline 09:30
  numDrivers: 2
  vehicles: two with capacity 1000kg

Expected:
  feasibility: VALID
  routes.length: 2
  each route has 2 deliveries
  optimal split by geographic proximity
  all arrivals within 06:00-09:30
```

---

## 6. EDGE CASES HANDLED

### 6.1 Delivery deadline BEFORE reception opens

```
Scenario: open_time = 08:00, close_time = 12:00, client_deadline = 07:00
Detection: deadline < open_time — impossible to satisfy both constraints
Behavior:  flagged as INVALID with constraint 'client_deadline'
           error.message: "Deadline 07:00 is before reception opens at 08:00"
```

### 6.2 Delivery deadline EQUALS reception close time

```
Scenario: close_time = 05:30, client_deadline = 05:30
Detection: effectiveClose = min(05:30, 05:30) = 05:30
Behavior:  arrival at exactly 05:30 is VALID (≤ constraint)
           arrival at 05:31 is INVALID
```

### 6.3 Negative time windows (close_time < open_time — midnight crossover)

```
Scenario: open_time = 22:00, close_time = 02:00 (crosses midnight)
Current behavior: Not supported in MVP — times are treated as same-day
Mitigation: Schema constraint `close_time > open_time` (see DATABASE_SCHEMA.md § Table 5)
            Midnight-crossing windows must be split into two records
```

### 6.4 Empty deliveries list

```
Input:  deliveries = []
Output: routes = [], feasibility = VALID, estimated_total_km = 0
```

### 6.5 numDrivers > number of deliveries

```
Input:  3 deliveries, numDrivers = 5
Output: Some routes will be empty ([])
        Non-empty routes are still validated normally
        Empty routes are VALID by definition
```

### 6.6 All deliveries already missed (past deadline when algorithm runs)

```
Scenario: All client_deadlines are 01:00 but current time is 06:00
Behavior:  Algorithm still produces routes (best-effort)
           Feasibility = INVALID for all constraint violations
           Errors list all missed deliveries with 'client_deadline' constraint
```

### 6.7 Two deliveries with overlapping windows but impossible to chain

```
Scenario: D_A deadline 02:00 (at location A)
          D_B close   02:30 (at location B, 3h from A)
          Visiting A first makes B infeasible
          Visiting B first makes A infeasible
Behavior:  Algorithm picks one order, detects infeasibility, returns INVALID
           Error list identifies the infeasible delivery
```

### 6.8 Vehicle with null capacity_kg

```
Input:  vehicle.capacity_kg not set
Behavior: Capacity check is skipped for that vehicle (treated as unlimited)
           Still validates time windows
```

### 6.9 delivery.weight_kg is null

```
Input:  delivery.weight_kg = null
Behavior: Counted as 0 in total weight calculation
           Never contributes to capacity overflow
```

---

## 7. ALGORITHM PARAMETERS

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `AVG_SPEED_KMH` | 60 | Urban Île-de-France average (including urban driving) |
| `EARTH_RADIUS_KM` | 6371 | WGS84 mean Earth radius |
| `DEPOT_LAT` | 48.7627 | GERVIFRAIS HQ latitude |
| `DEPOT_LNG` | 2.3486 | GERVIFRAIS HQ longitude |
| Route start time | 0 min (midnight) | All times relative to delivery date midnight |

---

## 8. TYPE REFERENCES

All types are defined in `/shared/types.ts`:

| Type | Usage |
|------|-------|
| `Delivery` | Input delivery record |
| `ReceptionWindow` | Time window constraints |
| `DeliveryWithWindow` | Delivery with embedded reception window |
| `DeliveryWithTiming` | Delivery with computed arrival/departure times |
| `OptimizedRoute` | Algorithm output per driver |
| `OptimizationResult` | Full algorithm output |
| `FeasibilityResult` | Feasibility status + error list |
| `FeasibilityError` | Individual constraint violation |
| `FeasibilityStatus` | `'VALID' | 'INVALID'` |

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-ALGO | IMMUTABLE*
