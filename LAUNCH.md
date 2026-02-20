# 🚀 LAUNCH THE APP

## Terminal 1: BACKEND (Port 3000)

```bash
cd backend
npm run dev
```

Attendre: "Server listening on port 3000"

## Terminal 2: FRONTEND MANAGER (Port 5173)

```bash
cd frontend-manager
npm run dev
```

Attendre: "Local: http://localhost:5173"

## Terminal 3: DRIVER APP (Expo)

```bash
cd app-driver
npx expo start
```

Scan le QR code avec:
- iOS: Expo Go app
- Android: Expo Go app
- Web: Press 'w' dans le terminal

## ACCÉDER À L'APP

**Manager Dashboard:**
- http://localhost:5173
- Voir la carte Mapbox
- Voir les 2 chauffeurs (Hugo, Mamadou)
- Voir les 4 livraisons du jour
- KPI shows "4/4 livraisons"

**Driver App:**
- Scan QR code
- Voir liste des 4 livraisons
- Taper sur une livraison → détails
- [ARRIVED] → prendre photos
- [CONFIRM] → livraison complétée

**Backend API:**
- http://localhost:3000/api/routes
- http://localhost:3000/api/deliveries
- http://localhost:3000/api/drivers
