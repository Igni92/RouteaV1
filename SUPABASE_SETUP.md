# Supabase Setup Guide

Supabase is a free Postgres-as-a-service that replaces a self-hosted database.
The free tier includes 500 MB storage, 2 GB data transfer, and unlimited API requests.

---

## Step 1: Create a Supabase account

1. Go to https://supabase.com
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email

---

## Step 2: Create a new project

1. Click **"New project"**
2. Fill in:
   - **Name:** `gervifrais`
   - **Database Password:** Choose a strong password (save it!)
   - **Region:** `West EU (Ireland)` — closest to France
3. Click **"Create new project"**
4. Wait ~2 minutes for provisioning

---

## Step 3: Get your API keys

Go to **Project Settings** → **API**

You need 3 values:

| Key | Where to find it | Variable name |
|-----|-----------------|---------------|
| Project URL | "Project URL" field | `SUPABASE_URL` |
| anon (public) key | "Project API keys" → anon | `SUPABASE_ANON_KEY` |
| service_role key | "Project API keys" → service_role | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **Keep `service_role` secret** — it bypasses Row Level Security.

---

## Step 4: Get the database connection string

Go to **Project Settings** → **Database**

Copy the **URI** under "Connection string" → **URI** tab:
```
postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
```

This is your `DATABASE_URL`.

---

## Step 5: Fill in backend/.env

Open `backend/.env` and replace the placeholder values:

```env
DATABASE_URL=postgresql://postgres.YOURREF:YOURPASSWORD@aws-0-eu-west-3.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://YOURREF.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

---

## Step 6: Generate JWT secrets

Run this in a terminal (any OS with openssl):
```bash
openssl rand -base64 32
```

Run it twice — once for `JWT_SECRET`, once for `JWT_REFRESH_SECRET`.
Paste both into `backend/.env`.

---

## Step 7: Verify

Once `backend/.env` is filled in, run:
```bash
./auto-setup.sh
```

If you see `✅ .env files configured` — you're good to go!

---

## Troubleshooting

**"Invalid API key"** → Copy-paste again from the Supabase dashboard, no extra spaces

**"Connection refused"** → Check `DATABASE_URL` format; use the Supabase pooler URL (not direct)

**"Project is paused"** → Free tier pauses after 1 week of inactivity; click "Restore" in dashboard
