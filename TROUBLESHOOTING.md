# 🔧 TROUBLESHOOTING

## ❌ "Cannot find module 'express'"

```bash
npm install --legacy-peer-deps
```

## ❌ "Port 3000 already in use"

```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

## ❌ "Supabase connection failed"

- Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env`
- Make sure they're correct (copy-paste from Supabase dashboard)
- Verify the project is not paused (free tier pauses after inactivity)

## ❌ "Mapbox token invalid"

- Use the test token from MAPBOX_SETUP.md
- Or create a free account at https://mapbox.com

## ❌ "Expo QR code not working"

- Make sure phone is on **same WiFi** as computer
- Try: `npx expo start --localhost`
- Or: `npx expo start --tunnel` (requires Expo account)

## ❌ "Database migrations failed"

- Check that `DATABASE_URL` is correct in `backend/.env`
- Format: `postgresql://postgres.<ref>:<password>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres`
- Try: `npm run migrate:reset` to start fresh

## ❌ "npm ERR! peer dep missing"

```bash
npm install --legacy-peer-deps
```

## ❌ "JWT_SECRET too short"

- Must be at least 32 characters
- Generate one: `openssl rand -base64 32`

## ❌ Driver app shows blank screen

- Check `EXPO_PUBLIC_API_URL` points to your machine's IP (not localhost) when testing on physical device
- Example: `EXPO_PUBLIC_API_URL=http://192.168.1.42:3000`

## ❌ "CORS error" in browser

- Check `CORS_ORIGIN` in `backend/.env` matches the frontend URL
- Default: `CORS_ORIGIN=http://localhost:5173`
