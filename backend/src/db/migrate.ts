/**
 * GERVIFRAIS — Database Migration Script
 * Created by: AGENT-DATABASE
 *
 * Reads schema.sql and applies it to the configured PostgreSQL database.
 * Safe to run multiple times (IF NOT EXISTS guards in schema.sql).
 *
 * Usage:
 *   npm run db:migrate          # apply schema only
 *   npm run db:migrate -- --seed # apply schema + seed GERVIFRAIS data
 *
 * Prerequisites:
 *   - DATABASE_URL in .env (PostgreSQL connection string)
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SCHEMA_FILE = path.resolve(__dirname, 'schema.sql');

async function migrate(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }

  const client = new Client({ connectionString });

  try {
    console.log('[MIGRATE] Connecting to PostgreSQL...');
    await client.connect();
    console.log('[MIGRATE] Connected.');

    const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    console.log('[MIGRATE] Applying schema.sql...');

    await client.query('BEGIN');

    try {
      await client.query(schema);
      await client.query('COMMIT');
      console.log('[MIGRATE] ✅ Schema applied successfully.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    // Run seed if --seed flag is passed
    const shouldSeed = process.argv.includes('--seed');
    if (shouldSeed) {
      console.log('[MIGRATE] --seed flag detected, running seed...');
      const { seed } = await import('./seed');
      await seed(client);
    }
  } finally {
    await client.end();
    console.log('[MIGRATE] Connection closed.');
  }
}

migrate()
  .then(() => {
    console.log('[MIGRATE] Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[MIGRATE] ❌ Failed:', err.message);
    process.exit(1);
  });
