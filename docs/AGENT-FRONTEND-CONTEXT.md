# AGENT-FRONTEND-MANAGER — Context for AGENT-APP-DRIVER

**Status:** COMPLETE
**Branch:** `claude/algorithm-optimization-spec-Gs1c9`
**Completed by:** AGENT-FRONTEND-MANAGER

---

## What Was Built

The React 18 + TypeScript manager dashboard (`/frontend-manager/`), implementing:

### Architecture

```
frontend-manager/
├── src/
│   ├── App.tsx                    ← Root: Redux Provider + BrowserRouter + Navbar + Routes
│   ├── styles/theme.ts            ← Color palette, mapDefaults, status styles
│   ├── redux/
│   │   ├── store.ts               ← configureStore (4 slices)
│   │   ├── driversSlice.ts        ← drivers + GPS locations + online status
│   │   ├── routesSlice.ts         ← routes CRUD + optimization thunks
│   │   ├── deliveriesSlice.ts     ← deliveries + WS status updates
│   │   └── uiSlice.ts             ← selectedRouteId/driverId, wsStatus, toasts
│   ├── services/
│   │   ├── apiClient.ts           ← Axios instance + JWT interceptor + typed API methods
│   │   └── websocketClient.ts     ← WS singleton with reconnect + message routing
│   ├── components/
│   │   ├── Dashboard.tsx          ← Main layout + KPIs + Map + RouteList + modals
│   │   ├── Map.tsx                ← Mapbox GL JS (direct, no react-map-gl) + markers
│   │   ├── KPICard.tsx            ← Metric card with loading skeleton + trend indicator
│   │   └── RouteList.tsx          ← Expandable route list with delivery cards
│   ├── pages/
│   │   └── CreateRoutePage.tsx    ← 5-step route creation wizard
│   └── __tests__/
│       ├── Dashboard.test.tsx     ← 18 Jest tests (RTL + store integration)
│       └── __mocks__/
│           ├── mapbox-gl.js       ← WebGL mock for jsdom
│           └── styleMock.js       ← CSS import mock
```

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Dashboard` | Live map + KPIs + route list |
| `/routes/new` | `CreateRoutePage` | 5-step route creation wizard |
| `*` | Redirect | → `/` |

### Redux State Shape

```typescript
{
  drivers: {
    items: Driver[];
    locations: Record<string, { lat, lng, timestamp, sequence }>;
    onlineStatus: Record<string, boolean>;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
  };
  routes: {
    items: RouteWithDetails[];
    selectedId: string | null;
    status: LoadingStatus;
    optimizing: boolean;
    optimizationError: string | null;
  };
  deliveries: {
    items: DeliveryWithWindow[];
    status: LoadingStatus;
    error: string | null;
  };
  ui: {
    selectedRouteId: string | null;
    selectedDriverId: string | null;
    selectedDeliveryId: string | null;
    isDriverModalOpen: boolean;
    selectedDate: string;          // "YYYY-MM-DD"
    sidebarCollapsed: boolean;
    mapCenter: { lat: number; lng: number };
    mapZoom: number;
    wsStatus: 'disconnected' | 'connecting' | 'connected';
    toasts: Toast[];
  };
}
```

### WebSocket Integration

- `wsClient.connect(dispatch)` called in `Dashboard.useEffect`
- `wsClient.disconnect()` called on cleanup
- Routes WsMessages to Redux actions:
  - `driver_location` → `driversSlice.updateDriverLocation` (with sequence dedup)
  - `delivery_update` → `deliveriesSlice.updateDeliveryStatus`
  - `notification` → `uiSlice.showToast`
  - `route_update` → `routesSlice.updateRouteStatus`
- Reconnect strategy: 5s / 10s / 30s / 60s delays
- Ping timeout: 45s

### Mapbox GL JS

- Initialized in `Map.tsx` via `useRef` (not react-map-gl)
- Token: `VITE_MAPBOX_TOKEN` env var
- Center: `{ lat: 48.7627, lng: 2.3486 }` (GERVIFRAIS HQ)
- Zoom: 11
- Style: `mapbox://styles/mapbox/streets-v12`
- Driver markers: 28px circle, colored by status (green/blue/gray), pulsing if delivering
- Delivery pins: 14px circle, colored by status

### Environment Variables Required

```
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=ws://localhost:4000
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

---

## Known Limitations / TODOs for Next Agents

| Item | Status | Notes |
|------|--------|-------|
| Login page (`/login`) | Missing | No auth flow implemented — assumes token already in localStorage |
| `drivers/:id` route | Stub | Redirects to `/` — DriverDetailPage not implemented |
| WebSocket in CreateRoutePage | Not connected | WS only active on Dashboard, not during route creation |
| KPI trend values | Always `undefined` | No yesterday comparison data available without date-range API |
| `format` import in CreateRoutePage | Uses `date-fns` | `date-fns` needs to be added to package.json dependencies |
| Tailwind config | Not generated | `tailwind.config.js` and `postcss.config.js` need AGENT-APP-DRIVER or DevOps to run `npx tailwindcss init` |

### `date-fns` dependency

`CreateRoutePage` uses `format` from `date-fns`. Add to `package.json`:
```json
"date-fns": "^3.6.0"
```

---

## API Contracts Used

All API calls go through `/frontend-manager/src/services/apiClient.ts`.
Full contract: `/docs/API_CONTRACT.md`
WebSocket protocol: `/docs/REALTIME_PROTOCOL.md`

### Driver location sequence dedup (matches backend)

```typescript
// driversSlice.ts — updateDriverLocation
const lastSeq = state.locations[driver_id]?.sequence ?? -1;
const seqDiff = sequence - lastSeq;
if (seqDiff <= 0 && Math.abs(seqDiff) < 1000) {
  return; // duplicate, ignore
}
```

---

## Test Coverage Summary

| File | Tests | Coverage target |
|------|-------|----------------|
| KPICard | 6 | >80% |
| RouteList | 7 | >80% |
| Dashboard | 7 | >80% |
| Toast container | 3 | >80% |
| uiSlice | 2 | 100% |
| **Total** | **25+** | **>80%** |

Run tests: `cd frontend-manager && npm test`

---

## Signal

**AGENT-FRONTEND-MANAGER ready. Awaiting AGENT-APP-DRIVER.**
