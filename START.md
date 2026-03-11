# ⚡ QUICK START (3 steps)

## Step 1: Get Supabase Keys (5 min)

Follow **SUPABASE_SETUP.md**

Get 4 keys:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`

## Step 2: Configure & Install (3 min)

```bash
# Put the 4 keys in backend/.env (see SUPABASE_SETUP.md)
# Then run:
./auto-setup.sh
cd backend && npm run migrate
```

## Step 3: Launch (3 terminals)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend-manager && npm run dev

# Terminal 3
cd app-driver && npx expo start
```

## Access

- **Manager Dashboard:** http://localhost:5173
- **Driver App:** Scan the QR code with Expo Go
- **Done!** 🎉

---

Need help? See TROUBLESHOOTING.md
Verify everything works? See VALIDATION.md
