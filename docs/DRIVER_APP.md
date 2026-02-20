# DRIVER APP SPEC — GERVIFRAIS Driver Mobile App
> IMMUTABLE — Created by AGENT-APP-DRIVER | Version: 1.0.0

---

## 1. SCREENS (9 total)

### Screen Tree (ASCII)

```
TabNavigator (Bottom Tabs)
├── HomeTab (Stack)
│   ├── HomeScreen              ← List of today's deliveries + progress
│   ├── DeliveryDetailsScreen   ← Full delivery info + navigate/call
│   ├── ArrivedScreen           ← Status badge + photo buttons
│   ├── PhotoMarchandiseScreen  ← Full-screen camera (merchandise)
│   ├── PhotoBLScreen           ← Full-screen camera (stamped BL)
│   └── ConfirmationScreen      ← Celebration + next delivery
│       └── [Modal] ProblemScreen ← Incident report
└── ProfileTab
    └── ProfileScreen           ← Driver info, stats, logout
```

### Navigation Param Types

```typescript
type HomeStackParamList = {
  Home: undefined;
  DeliveryDetails: { deliveryId: string };
  Arrived: { deliveryId: string; arrivedAt: string };
  PhotoMarchandise: { deliveryId: string };
  PhotoBL: { deliveryId: string };
  Confirmation: { deliveryId: string; durationSeconds: number };
  Problem: { deliveryId: string };  // modal
};

type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ProfileTab: undefined;
};
```

---

## 2. SCREEN SPECIFICATIONS

### HomeScreen
**Purpose:** Driver's daily command center

**Layout:**
```
┌─────────────────────────────────┐
│  📅 Jeudi 20 Fév  [⚠️ Problème] │  ← header + problem button
│  Progression: ████░ 3/4         │  ← progress bar
├─────────────────────────────────┤
│  🔵 LIVRAISON EN COURS          │  ← current (large, highlighted)
│  Boulangerie Martin             │
│  10 Rue de la Paix              │
│  ⏰ 08:00–12:00 | Deadline 10:00 │
│  [🗺️ NAVIGUER] [📞] [✅ ARRIVÉ]  │
├─────────────────────────────────┤
│  ○  Épicerie du Coin  (09:00)   │  ← upcoming (compact)
│  ✅ Boulangerie Leblanc         │  ← completed (grayed)
│  ✅ Superette Roux              │  ← completed (grayed)
└─────────────────────────────────┘
```

**Behavior:**
- Current delivery = first non-completed in `deliveries_ordered`
- ARRIVÉ button → navigates to ArrivedScreen
- NAVIGUER → `openWaze(lat, lng)` deep link
- ⚠️ Problème → opens ProblemScreen modal
- Progress bar animates on update

### DeliveryDetailsScreen
**Purpose:** Full information for one delivery

**Layout:**
```
┌─────────────────────────────────┐
│  ← Retour  Livraison 2/4       │
├─────────────────────────────────┤
│  📍 10 Rue de la Paix, Paris   │
│  48.8566° N, 2.3522° E         │
│                                 │
│  🕐 Fenêtre: 08:00 – 12:00     │
│  ⏰ Deadline client: 10:00      │
│                                 │
│  ✅ À l'heure  (9h24 estimé)    │
│  ou ⚠️ RETARD (+12 min)         │
│                                 │
│  📦 Marchandise: 12 kg          │
│  📝 Notes: Sonner au 2         │
│                                 │
│  📞 Magasin: 01 23 45 67 89    │
│     [  APPELER  ]               │
├─────────────────────────────────┤
│   [🗺️ NAVIGUER VERS CE POINT]   │  ← 56px height
│   [      ✅ ARRIVÉ      ]       │  ← 56px height, green
└─────────────────────────────────┘
```

### ArrivedScreen
**Purpose:** Post-arrival flow, capture proof photos

**Layout:**
```
┌─────────────────────────────────┐
│  Boulangerie Martin             │
├─────────────────────────────────┤
│      🟢 À L'HEURE              │
│      Arrivé à 09:48            │
│      Vous avez 2h12 pour livrer │
│                                 │
│  📸 Photos requises: 1/2        │
│                                 │
│  [ 📷 PHOTO MARCHANDISE ]  ✅   │
│  [ 📷 PHOTO BL TAMPONNÉ  ]  ⏳  │
│                                 │
│  [   ✅ LIVRAISON COMPLÈTE   ]  │  ← disabled until 2/2
└─────────────────────────────────┘
```

**Status logic:**
- `À L'HEURE` if `arrivedAt ≤ close_time`
- `LÉGER RETARD` if `0 < late ≤ 30 min`
- `EN RETARD` if `late > 30 min`

### PhotoMarchandiseScreen / PhotoBLScreen
**Purpose:** Full-screen camera capture

**Layout:**
```
┌─────────────────────────────────┐
│  ← Annuler     📷 Marchandise  │
│                                 │
│         [Camera Preview]        │
│                                 │
│  Guide: "Photographiez les      │
│  marchandises déchargées"       │
├─────────────────────────────────┤
│           [  ⊙  ]              │  ← 72px capture button
└─────────────────────────────────┘

After capture:
┌─────────────────────────────────┐
│          [Photo Preview]        │
├─────────────────────────────────┤
│  [ 🔄 REPRENDRE ] [✅ CONFIRMER]│
└─────────────────────────────────┘
```

### ConfirmationScreen
**Purpose:** Delivery completion celebration + next delivery CTA

**Layout:**
```
┌─────────────────────────────────┐
│        🎉 LIVRAISON COMPLÈTE    │
│        Boulangerie Martin       │
│                                 │
│  ✅ Photo marchandise           │
│  ✅ Photo BL tamponné           │
│  ⏱️  Temps sur site: 4m 32s     │
│                                 │
│  ─── Prochaine livraison ───    │
│  Épicerie du Coin               │
│  14 Avenue Victor Hugo          │
│  ⏰ 09:00–13:00                 │
│                                 │
│  [ ➡️  ALLER À LA PROCHAINE ]   │
│  [ 📞  APPELER LE MANAGER   ]   │
└─────────────────────────────────┘
```

### ProblemScreen (Modal)
**Purpose:** Incident reporting

**Layout:**
```
┌─────────────────────────────────┐
│  ⚠️  Signaler un problème       │
│  Boulangerie Martin             │
├─────────────────────────────────┤
│  Type de problème:              │
│  ▼ [Réception fermée          ] │
│                                 │
│  Notes (optionnel):             │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  [ 📷 AJOUTER UNE PHOTO ]       │
│                                 │
│  [ 📞 APPELER MANAGER MAINTENANT]│  ← primary, 56px
│  [    📤 SIGNALER PLUS TARD   ] │  ← secondary, 48px
└─────────────────────────────────┘
```

**Problem types:**
- `reception_closed` — Réception fermée
- `refused` — Refus de marchandise
- `absent` — Client absent
- `access_blocked` — Accès bloqué
- `damaged` — Dégâts marchandise
- `other` — Autre

### ProfileScreen
**Purpose:** Driver profile + today's stats + logout

**Layout:**
```
┌─────────────────────────────────┐
│  👤 Hugo Vachey                 │
│  ★★★★☆  4.8/5                  │
│  Renault Master · AA-123-BB     │
├─────────────────────────────────┤
│  📊 Statistiques du jour        │
│  ✅ Terminées:  3               │
│  ⏳ En attente: 1               │
│  📍 Km parcourus: 42 km         │
├─────────────────────────────────┤
│  [      SE DÉCONNECTER    ]     │
└─────────────────────────────────┘
```

---

## 3. NAVIGATION FLOW

```
App launch → Login (future) → HomeScreen (today's route)

HomeScreen
  ↓ tap delivery card
DeliveryDetailsScreen
  ↓ tap ARRIVÉ
ArrivedScreen
  ↓ tap PHOTO MARCHANDISE
PhotoMarchandiseScreen → (confirm) → ArrivedScreen (photo 1 ✅)
  ↓ tap PHOTO BL TAMPONNÉ
PhotoBLScreen → (confirm) → ArrivedScreen (photo 2 ✅)
  ↓ LIVRAISON COMPLÈTE enabled → tap
ConfirmationScreen
  ↓ ALLER À LA PROCHAINE
HomeScreen (next delivery highlighted)

Any screen → [⚠️ Problème] → ProblemScreen (modal)
  → APPELER MANAGER (makeCall)
  → SIGNALER PLUS TARD (queue offline)
```

---

## 4. COLOR & UX SPECS

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| PRIMARY | `#22C55E` | Success, CTA, progress |
| SECONDARY | `#0EA5E9` | Info, navigation |
| WARNING | `#FBBF24` | Retard, attention |
| ERROR | `#DC2626` | Problème, failure |
| BG_DARK | `#0F172A` | Dark mode background |
| BG_DARK_CARD | `#1E293B` | Dark mode card |
| BG_LIGHT | `#F8FAFC` | Light mode background |
| TEXT_DARK | `#F1F5F9` | Text on dark bg |
| TEXT_LIGHT | `#1E293B` | Text on light bg |
| TEXT_MUTED | `#94A3B8` | Muted/secondary text |

### Mobile UX Rules
- Minimum font size: **16px** (readability while driving)
- Minimum button height: **50px** (ARRIVÉ/NAVIGUER: **56px**)
- Camera capture button: **72px** diameter
- Card padding: **16px**
- Section padding: **20px**
- Touch targets: minimum **44×44px** (Apple HIG)

### Dark Mode
- All screens support both light and dark modes
- `useColorScheme()` hook for system preference
- Background: `#0F172A` dark / `#F8FAFC` light
- Cards: `#1E293B` dark / `#FFFFFF` light

---

## 5. REDUX STATE SHAPE

```typescript
interface AppState {
  driver: {
    current: Driver | null;
    vehicle: Vehicle | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    accessToken: string | null;
    refreshToken: string | null;
  };
  deliveries: {
    items: DeliveryWithWindow[];
    statuses: Record<string, DeliveryStatus>;  // optimistic updates
    currentIndex: number;
    date: string;  // "YYYY-MM-DD"
    loadingStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  };
  route: {
    current: Route | null;
    deliveriesOrdered: string[];  // UUID order
    status: RouteStatus | null;
    startedAt: string | null;
  };
  photos: {
    queue: PhotoQueueItem[];        // pending upload
    uploaded: Record<string, UploadedPhotos>;  // by delivery_id
  };
}

interface PhotoQueueItem {
  id: string;
  deliveryId: string;
  type: 'marchandise' | 'bl';
  uri: string;
  base64?: string;
  status: 'pending' | 'uploading' | 'done' | 'failed';
  attempts: number;
  createdAt: string;
}

interface UploadedPhotos {
  marchandiseUrl?: string;
  blUrl?: string;
}
```

---

## 6. PROPS INTERFACES

```typescript
// HomeScreen
interface DeliveryCardProps {
  delivery: DeliveryWithWindow;
  index: number;
  isCurrent: boolean;
  isCompleted: boolean;
  onArrive: () => void;
  onNavigate: () => void;
  onPress: () => void;
}

// ArrivedScreen
interface ArrivalStatusProps {
  arrivedAt: Date;
  closeTime: string;  // "HH:MM"
  deadline: string;   // "HH:MM"
}

// PhotoScreen
interface PhotoScreenProps {
  title: string;
  guide: string;
  onCapture: (uri: string) => void;
  onCancel: () => void;
}
```

---

## 7. CAMERA FLOW

```
1. User taps [📷 PHOTO ...]
2. Request camera permission (if not granted)
3. Show full-screen camera (expo-camera)
4. User taps capture button
5. Show preview with [✅ CONFIRMER] [🔄 REPRENDRE]
6. On CONFIRMER:
   a. compressImage(uri) → ~500KB max
   b. Add to photoQueue (Redux)
   c. If online: uploadPhoto() → S3 URL
   d. If offline: queue for later (AsyncStorage)
7. Return to ArrivedScreen with photo checked
```

---

## 8. S3 UPLOAD PROTOCOL

```
POST /api/deliveries/:id/proof (multipart/form-data)
  photo_marchandise: File (JPEG, max 10MB)
  photo_bl_tamonne: File (JPEG, max 10MB)

Response: { marchandise_url, bl_url }  (24h signed S3 URLs)

Retry policy: 3 attempts, exponential backoff 2s/4s/8s
```

---

## 9. OFFLINE SUPPORT

### Local Storage Keys (AsyncStorage)
```
@gervifrais/driver          → Driver profile (JSON)
@gervifrais/route           → Current route (JSON)
@gervifrais/deliveries      → Today's deliveries (JSON)
@gervifrais/events_queue    → Pending delivery events (JSON array)
@gervifrais/photos_queue    → Pending photo uploads (JSON array)
@gervifrais/access_token    → JWT access token
@gervifrais/refresh_token   → JWT refresh token
```

### Sync Strategy
1. On app start: Load from AsyncStorage, then fetch API if online
2. On event (arrived/completed/problem): Save to events queue
3. If online: POST event immediately, remove from queue
4. If offline: Keep in queue, display ⚠️ offline indicator
5. NetInfo change listener: trigger sync on reconnect

---

## 10. GPS TRACKING

- Every 30 seconds while route `in_progress`
- Send via WebSocket: `{ type: "driver_location", driver_id, lat, lng, accuracy, speed, sequence, timestamp }`
- Sequence: monotonically increasing per session
- Stop sending when route `completed` or app backgrounded > 5 min
- Request `FOREGROUND + BACKGROUND` location permission (Android) / `WhenInUse` (iOS)

---

## 11. FIREBASE NOTIFICATIONS

- Token registered on login via `PATCH /api/drivers/:id` with `fcm_token`
- Notifications handled:
  - `new_route`: New route assigned → navigate to HomeScreen
  - `route_modified`: Route updated → refresh HomeScreen
  - `manager_message`: Alert from manager → toast + vibrate

---

Version: 1.0.0 | Created: 2026-02-20 | Agent: AGENT-APP-DRIVER | IMMUTABLE
