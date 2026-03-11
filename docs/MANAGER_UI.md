# MANAGER UI SPEC — GERVIFRAIS Dashboard
> IMMUTABLE — Created by AGENT-FRONTEND-MANAGER | Do not modify
> Version: 1.0.0 | Created: 2026-02-19

---

## 1. LAYOUT DESKTOP (1280px+)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NAVBAR                                                                  │
│  GERVIFRAIS     📅 Mer. 19 Fév     [+ Créer Tournée] [🔄 Sync] [Export]│
└────────────────────────────────────┬────────────────────────────────────┘
│                                    │                                     │
│         MAP (70% width)            │      RIGHT PANEL (30% width)        │
│                                    │                                     │
│  ┌──────────────────────────────┐  │  ┌─────────────────────────────┐   │
│  │                              │  │  │  KPI CARDS (2×2 grid)       │   │
│  │   Mapbox GL JS               │  │  │  ✅ Livrées   🚗 En route   │   │
│  │                              │  │  │  ⏱️ En retard  ⚠️ Alertes   │   │
│  │   🟢 Hugo    (moving)        │  │  └─────────────────────────────┘   │
│  │   🔴 Mamadou (moving)        │  │                                     │
│  │                              │  │  ┌─────────────────────────────┐   │
│  │   📦 Delivery pins           │  │  │  ROUTE LIST                 │   │
│  │                              │  │  │  ─────────────────────────  │   │
│  │                              │  │  │  🟢 Hugo Vachey             │   │
│  │                              │  │  │     Renault Trafic · AB-1   │   │
│  │                              │  │  │     ✅ Auchan MV  04:23     │   │
│  │                              │  │  │     🔵 Auchan VB  → 04:45  │   │
│  └──────────────────────────────┘  │  │                             │   │
│                                    │  │  🔴 Mamadou Keita           │   │
│                                    │  │     Citroën C15 · XY-2      │   │
│                                    │  │     ✅ Carrefour  08:10     │   │
│                                    │  │     ⏱️ Monoprix  → 11:00   │   │
│                                    │  └─────────────────────────────┘   │
└────────────────────────────────────┴────────────────────────────────────┘
```

### Layout Rules
- Map panel: `flex: 1` (grows to fill)
- Right panel: `width: 380px`, fixed, scrollable
- Navbar: `height: 56px`, fixed top
- Total layout: `display: flex; flex-direction: column; height: 100vh`

### Tablet Layout (768px–1279px)
- Map: 60% width
- Right panel: 40% width, collapsible
- KPI cards: 1×4 vertical stack

---

## 2. COLOR PALETTE

```typescript
const colors = {
  primary:   '#22C55E',  // green  — completed, online driver
  secondary: '#0EA5E9',  // blue   — in_route, actions
  warning:   '#FBBF24',  // amber  — delayed, at_site
  error:     '#DC2626',  // red    — failed, incident
  text:      '#1F2937',  // dark gray — main text
  textMuted: '#6B7280',  // gray   — secondary text
  bg:        '#F3F4F6',  // very light — page background
  surface:   '#FFFFFF',  // white  — card backgrounds
  border:    '#E5E7EB',  // light border
}
```

### Status → Color Mapping
| Status | Color | Icon |
|--------|-------|------|
| `completed` | `primary` (#22C55E) | ✅ |
| `in_route` | `secondary` (#0EA5E9) | 🔵 |
| `arrived` | `secondary` (#0EA5E9) | 📍 |
| `pending` | `textMuted` (#6B7280) | ⏱️ |
| `assigned` | `textMuted` (#6B7280) | 📋 |
| `failed` | `error` (#DC2626) | ❌ |
| `delayed` | `warning` (#FBBF24) | ⚠️ |

---

## 3. COMPONENTS

### 3.1 Component Tree (ASCII)

```
App
├── Provider (Redux)
├── BrowserRouter
│   ├── Navbar
│   ├── Routes
│   │   ├── "/" → DashboardPage
│   │   │   └── Dashboard
│   │   │       ├── Map
│   │   │       │   ├── DriverMarker (×N)
│   │   │       │   └── DeliveryPin (×N)
│   │   │       └── RightPanel
│   │   │           ├── KPICard (×4)
│   │   │           └── RouteList
│   │   │               └── RouteItem (×N)
│   │   │                   └── DeliveryCard (×N)
│   │   ├── "/routes/new" → CreateRoutePage
│   │   └── "/drivers/:id" → DriverDetailsPage
│   │       ├── DriverProfile
│   │       └── DriverRatingHistory
│   └── DriverModal (portal, shown on driver click)
```

### 3.2 Props Interfaces

```typescript
// Navbar
interface NavbarProps {
  selectedDate: string;         // "YYYY-MM-DD"
  onDateChange: (date: string) => void;
  onCreateRoute: () => void;
  onExport: () => void;
}

// Dashboard
interface DashboardProps {
  // No props — reads from Redux
}

// Map
interface MapProps {
  drivers: DriverMapMarker[];
  deliveries: DeliveryWithWindow[];
  selectedRouteId: string | null;
  onDriverClick: (driverId: string) => void;
  onDeliveryClick: (deliveryId: string) => void;
}

// KPICard
interface KPICardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'primary' | 'secondary' | 'warning' | 'error' | 'muted';
  trend?: number;          // percentage change vs yesterday
  isLoading?: boolean;
}

// RouteList
interface RouteListProps {
  routes: RouteWithDetails[];
  selectedRouteId: string | null;
  onRouteSelect: (routeId: string) => void;
  onDriverClick: (driverId: string) => void;
}

// DeliveryCard
interface DeliveryCardProps {
  delivery: DeliveryWithWindow;
  index: number;
  isCurrentStop: boolean;
}

// DriverModal
interface DriverModalProps {
  driverId: string | null;
  onClose: () => void;
}

// CreateRoutePage
interface CreateRoutePageProps {
  // No props — reads from Redux
}
```

---

## 4. SCREENS

### 4.1 Home / Dashboard (`/`)
- Main layout with Map + KPI cards + RouteList
- Real-time GPS markers via WebSocket
- Click driver marker → DriverModal (floating panel)
- Click delivery pin → toast with delivery details
- Auto-refresh KPI every 60 seconds

### 4.2 Create Route (`/routes/new`)
- **Step 1 — Select date + drivers:** date picker, driver checkboxes
- **Step 2 — Select deliveries:** table with checkboxes, weight/time/priority
- **Step 3 — Preview:** Show delivery list, click [OPTIMIZE] → calls API
- **Step 4 — Review optimized routes:** Map preview + route assignments
- **Step 5 — Validate & Send:** POST to API, redirect to dashboard

### 4.3 Driver Details (`/drivers/:id`)
- Driver profile card (name, photo placeholder, rating stars)
- Current route status
- Historical performance chart (last 30 deliveries)
- Recent delivery events table

---

## 5. STATE MANAGEMENT (Redux)

### 5.1 Redux Store Shape

```typescript
interface RootState {
  routes: RoutesState;
  drivers: DriversState;
  deliveries: DeliveriesState;
  ui: UIState;
}

// routesSlice
interface RoutesState {
  items: RouteWithDetails[];
  selectedId: string | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastFetched: string | null;  // ISO 8601
}

// driversSlice
interface DriversState {
  items: Driver[];
  locations: Record<string, RedisDriverLocation>;  // driver_id → latest GPS
  onlineStatus: Record<string, boolean>;           // driver_id → is online
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// deliveriesSlice
interface DeliveriesState {
  items: DeliveryWithWindow[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

// uiSlice
interface UIState {
  selectedRouteId: string | null;
  selectedDriverId: string | null;
  selectedDeliveryId: string | null;
  isDriverModalOpen: boolean;
  selectedDate: string;          // "YYYY-MM-DD"
  sidebarCollapsed: boolean;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
}
```

### 5.2 Async Thunks

```typescript
// routesSlice
fetchRoutes(date?: string)       → GET /api/routes?date=...
createRoute(input)               → POST /api/routes
optimizeRoute(id, deliveryIds)   → POST /api/routes/:id/optimize
updateRoute(id, patch)           → PATCH /api/routes/:id

// driversSlice
fetchDrivers()                   → GET /api/drivers
updateDriverLocation(wsMessage)  → from WebSocket (synchronous action)

// deliveriesSlice
fetchDeliveries(routeId?)        → GET /api/deliveries?route_id=...
createDelivery(input)            → POST /api/deliveries
```

---

## 6. REAL-TIME UPDATES

### 6.1 WebSocket Integration Flow

```
App mounts
  → websocketClient.connect(wsUrl, token)
  → on 'driver_location' → dispatch(updateDriverLocation(msg))
                          → Map re-renders marker position
  → on 'delivery_update' → dispatch(updateDeliveryStatus(msg))
                          → DeliveryCard re-renders with new status
  → on 'notification'    → dispatch(showNotification(msg))
                          → Toast displayed top-right
  → on 'route_update'    → dispatch(fetchRoutes())  // refetch
```

### 6.2 Reconnection Strategy

```
connect() → on close:
  if code !== 1000 (not intentional):
    wait 5s → reconnect (attempt 1)
    wait 10s → reconnect (attempt 2)
    wait 30s → reconnect (attempt 3)
    wait 60s → reconnect (attempt 4+, plateau)
  Show "⚠️ Connexion perdue — Reconnexion..." banner
```

### 6.3 KPI Auto-refresh
- `fetchRoutes()` + `fetchDeliveries()` dispatched every 60 seconds
- KPI cards derived from Redux state (no additional API calls)

---

## 7. MAPBOX CONFIGURATION

```
Depot:   { lat: 48.7627, lng: 2.3486 }   // GERVIFRAIS HQ — Chevilly-Larue
Initial: { center: [2.3486, 48.7627], zoom: 10 }
Style:   'mapbox://styles/mapbox/streets-v12'

Driver markers:
  - Online + delivering:  green circle  (#22C55E), pulsing animation
  - Online + idle:        blue circle   (#0EA5E9)
  - Offline:              gray circle   (#6B7280)

Delivery pins:
  - Completed: ✅ green
  - In route:  🔵 blue (active driver is heading here)
  - Pending:   ⬜ gray
  - Failed:    ❌ red
  - Selected:  Yellow highlight ring
```

---

## 8. ACCESSIBILITY & UX

- All interactive elements have `aria-label`
- Color is never the only differentiator (icons + labels always present)
- Keyboard navigable (Tab through KPI cards, routes)
- Loading skeletons for KPI cards and RouteList
- Toast notifications for real-time events (top-right, auto-dismiss 5s)

---

*Version: 1.0.0 | Created: 2026-02-19 | Agent: AGENT-FRONTEND-MANAGER | IMMUTABLE*
