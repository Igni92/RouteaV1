<!-- AGENT-APP-DRIVER-CONTEXT.md — Handoff document for AGENT-APP-DRIVER sessions -->
<!-- Last updated: 2026-02-20 -->

# AGENT-APP-DRIVER — Context & Handoff

## Rôle de l'agent

**AGENT-APP-DRIVER** est responsable de l'application mobile React Native (Expo) pour les chauffeurs GERVIFRAIS. Il ne touche **jamais** aux services backend, au frontend manager, ni aux packages partagés sauf `shared/types.ts` en lecture seule.

---

## Périmètre fichiers

```
app-driver/
├── src/
│   ├── App.tsx                          # Root navigation (tabs + stacks)
│   ├── screens/
│   │   ├── HomeScreen.tsx               # Dashboard livraisons du jour
│   │   ├── DeliveryDetailsScreen.tsx    # Détail livraison
│   │   ├── ArrivedScreen.tsx            # Confirmation arrivée + photos
│   │   ├── PhotoMarchandiseScreen.tsx   # Capture photo marchandise
│   │   ├── PhotoBLScreen.tsx            # Capture photo bon de livraison
│   │   ├── ConfirmationScreen.tsx       # Écran célébration livraison OK
│   │   ├── ProblemScreen.tsx            # Signalement incident
│   │   └── ProfileScreen.tsx           # Profil chauffeur + déconnexion
│   ├── redux/
│   │   ├── store.ts                     # configureStore + RootState/AppDispatch
│   │   ├── driversSlice.ts              # Auth chauffeur + véhicule
│   │   ├── deliveriesSlice.ts           # Livraisons du jour + statuts optimistes
│   │   ├── routeSlice.ts                # Tournée courante + GPS tracking
│   │   └── photoSlice.ts               # Queue photos + upload progress
│   ├── services/
│   │   ├── api.ts                       # Axios instance + tous les appels REST
│   │   ├── cameraService.ts             # Permissions + compression image
│   │   ├── s3Service.ts                 # Upload proof photos (proxy backend)
│   │   ├── offlineService.ts            # AsyncStorage queue + NetInfo
│   │   └── navigationService.ts        # Waze/Google Maps deep links + appel
│   ├── utils/
│   │   └── colors.ts                    # Palette + getTheme() + constantes UI
│   ├── types/
│   │   └── navigation.ts               # HomeStackParamList + RootTabParamList
│   └── __tests__/
│       └── HomeScreen.test.tsx          # 22 tests (19 HomeScreen + 3 slice)
├── app.json                             # Expo config (permissions iOS/Android)
└── package.json                         # Dépendances + config Jest
```

---

## État MVP Phase 1 (2026-02-20)

### Complété ✅

| Tâche | Fichier | Notes |
|-------|---------|-------|
| Spec IMMUTABLE | `/docs/DRIVER_APP.md` | Ne pas modifier |
| Palette couleurs | `src/utils/colors.ts` | PRIMARY=#22C55E, SECONDARY=#0EA5E9 |
| Service API | `src/services/api.ts` | JWT interceptor + refresh + STORAGE_KEYS |
| Service caméra | `src/services/cameraService.ts` | expo-camera v14, CameraView, compression 1280px/0.7 |
| Service S3 | `src/services/s3Service.ts` | 3 retries expo backoff 2s/4s/8s |
| Service offline | `src/services/offlineService.ts` | NetInfo + AsyncStorage queue events/photos |
| Service navigation | `src/services/navigationService.ts` | Waze > Google Maps fallback, Alert picker |
| Redux store | `src/redux/store.ts` | serializableCheck: false |
| Slice drivers | `src/redux/driversSlice.ts` | loginDriverThunk, loadCachedDriver |
| Slice deliveries | `src/redux/deliveriesSlice.ts` | optimistic statuses, advanceToNext |
| Slice route | `src/redux/routeSlice.ts` | GPS tracking, gpsSequence |
| Slice photos | `src/redux/photoSlice.ts` | queue + upload (pas d'import circulaire) |
| Types navigation | `src/types/navigation.ts` | HomeStackParamList, RootTabParamList |
| HomeScreen | `src/screens/HomeScreen.tsx` | ProgressBar, cartes livraisoins, testIDs |
| DeliveryDetailsScreen | `src/screens/DeliveryDetailsScreen.tsx` | on-time check, contact store |
| ArrivedScreen | `src/screens/ArrivedScreen.tsx` | unlock COMPLÈTE quand 2 photos capturées |
| PhotoMarchandiseScreen | `src/screens/PhotoMarchandiseScreen.tsx` | CameraView full-screen, preview |
| PhotoBLScreen | `src/screens/PhotoBLScreen.tsx` | identique Marchandise, type: 'bl' |
| ConfirmationScreen | `src/screens/ConfirmationScreen.tsx` | durée, prochaine livraison |
| ProblemScreen | `src/screens/ProblemScreen.tsx` | 6 types incident, modal picker |
| ProfileScreen | `src/screens/ProfileScreen.tsx` | stats, déconnexion avec confirmation |
| App.tsx | `src/App.tsx` | AppBootstrap, tabs, stack, dark/light |
| Tests | `src/__tests__/HomeScreen.test.tsx` | 22 tests Jest/RTL |

### Non implémenté / Phase 2

- **Authentification biométrique** (Face ID / empreinte) — expo-local-authentication
- **Push notifications FCM** — expo-notifications + `updateDriverFcmToken`
- **Géolocalisation continue** — expo-location + WebSocket `driver_location` (30s interval)
- **Écran LoginScreen** — actuellement le driver est chargé depuis le cache au démarrage
- **Écran SplashScreen animé** — expo-splash-screen avec logo GERVIFRAIS
- **Tests screens additionnels** — ArrivedScreen, ProblemScreen, PhotoScreen

---

## Variables d'environnement

```bash
# app-driver/.env
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
EXPO_PUBLIC_MANAGER_PHONE=+33600000000
```

Voir `app-driver/.env.example` pour le template complet.

---

## Navigation

```
RootTabNavigator (createBottomTabNavigator)
├── HomeTab (createNativeStackNavigator)
│   ├── Home (HomeScreen)
│   ├── DeliveryDetails (DeliveryDetailsScreen)
│   ├── Arrived (ArrivedScreen)
│   ├── PhotoMarchandise (PhotoMarchandiseScreen)
│   ├── PhotoBL (PhotoBLScreen)
│   ├── Confirmation (ConfirmationScreen)
│   └── Problem (ProblemScreen)  ← modal, slide_from_bottom
└── ProfileTab (ProfileScreen)
```

---

## Flux livraison (happy path)

```
HomeScreen
  └─[ARRIVÉ]→ ArrivedScreen
                 ├─[📷 Marchandise]→ PhotoMarchandiseScreen → (goBack)
                 ├─[📷 BL]→ PhotoBLScreen → (goBack)
                 └─[LIVRAISON COMPLÈTE]→ (upload photos) → ConfirmationScreen
                                                                └─[PROCHAINE]→ HomeScreen
```

---

## Redux — Forme de l'état

```typescript
{
  driver: {
    current: Driver | null,
    vehicle: Vehicle | null,
    accessToken: string | null,
    refreshToken: string | null,
    status: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: string | null,
  },
  deliveries: {
    items: DeliveryWithWindow[],
    statuses: Record<string, DeliveryStatus>,   // optimistic overrides
    currentIndex: number,
    date: string,                               // 'YYYY-MM-DD'
    loadingStatus: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: string | null,
  },
  route: {
    current: Route | null,
    deliveriesOrdered: string[],               // delivery IDs in order
    status: 'not_started' | 'in_progress' | 'completed',
    startedAt: string | null,
    completedAt: string | null,
    gpsSequence: number,
    isTrackingGps: boolean,
    loadingStatus: 'idle' | 'loading' | 'succeeded' | 'failed',
    error: string | null,
  },
  photos: {
    queue: PhotoQueueItem[],
    uploaded: Record<string, { marchandise?: string, bl?: string }>,
    uploadProgress: Record<string, number>,    // 0–1
  },
}
```

---

## Points d'attention pour les prochaines sessions

1. **Import circulaire photoSlice ↔ store**: `selectPhotosBothCaptured` prend `PhotoState` (pas `RootState`) pour éviter l'import circulaire. Ne pas introduire `import { RootState } from './store'` dans `photoSlice.ts`.

2. **expo-camera v14**: Utiliser `CameraView` + `useCameraPermissions()`. L'ancien `Camera` component est déprécié. `takePictureAsync()` est appelé via `ref.current`.

3. **Statuts optimistes**: `deliveriesSlice.statuses` surcharge `delivery.status` pour éviter la latence réseau. Toujours lire via `statuses[id] ?? item.status`.

4. **Mode hors-ligne**: Avant tout `postDeliveryEvent`, vérifier `getIsOnline()`. Si `false`, appeler `queueDeliveryEvent()`. La sync se fait automatiquement via `offlineService` au retour du réseau.

5. **testIDs obligatoires**: Tous les éléments interactifs testables ont `testID`. Voir la liste dans `DRIVER_APP.md §10`.

---

## Commandes utiles

```bash
# Démarrer l'application
cd app-driver && npx expo start

# Lancer les tests
cd app-driver && npx jest

# Lancer les tests avec coverage
cd app-driver && npx jest --coverage

# Vérification TypeScript
cd app-driver && npx tsc --noEmit
```

---

## Spec de référence

**`/docs/DRIVER_APP.md`** est le document IMMUTABLE de spécification. En cas de conflit entre ce fichier de contexte et `DRIVER_APP.md`, `DRIVER_APP.md` fait foi.
