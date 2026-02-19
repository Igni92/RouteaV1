/**
 * GERVIFRAIS — Database Seed Script
 * Created by: AGENT-DATABASE
 *
 * Seeds all GERVIFRAIS pilot data:
 *   - 1 company (GERVIFRAIS)
 *   - 1 manager user (admin@gervifrais.fr)
 *   - 2 vehicles (Renault Trafic, Citroën C15)
 *   - 2 drivers (Hugo Vachey, Mamadou Keita)
 *   - 4 reception windows (Auchan MLV, Auchan Villebon, Carrefour Orly, Monoprix Villejuif)
 *   - 4 test deliveries (1 per magasin, for today)
 *
 * Usage:
 *   npm run db:seed              # standalone seed
 *   npm run db:migrate -- --seed # run after migration
 *
 * Idempotent: checks for existing GERVIFRAIS company before inserting.
 */

import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ---------------------------------------------------------------------------
// GERVIFRAIS seed data
// ---------------------------------------------------------------------------

const COMPANY = {
  name: 'GERVIFRAIS',
  address: '77 Rue de Carpentras, 94550 Chevilly-Larue',
  phone: '+33 1 47 26 XX XX',
  rgpd_accepted: true,
  rgpd_accepted_at: new Date().toISOString(),
  subscription_tier: '80_euros',
};

const MANAGER_EMAIL = 'admin@gervifrais.fr';
const MANAGER_PASSWORD = 'GervifraisAdmin2026!'; // change in production

const VEHICLES = [
  {
    registration_plate: 'AA123BB',
    brand: 'Renault',
    model: 'Trafic',
    year: 2021,
    capacity_kg: 800,
    status: 'active',
    notes: 'Véhicule principal — tournées de nuit',
  },
  {
    registration_plate: 'BB123AA',
    brand: 'Citroën',
    model: 'C15',
    year: 2019,
    capacity_kg: 500,
    status: 'active',
    notes: 'Véhicule secondaire — tournées de matin',
  },
];

const DRIVERS = [
  {
    name: 'Hugo Vachey',
    phone: '+33 6 XX XX XX 01',
    email: 'hugo.vachey@gervifrais.fr',
    license_number: 'FR-HV-2019-001',
    rgpd_consent: true,
    rgpd_consent_at: new Date().toISOString(),
    is_active: true,
    rating: 5.0,
    vehicle_plate: 'AA123BB', // will be resolved to vehicle_id
  },
  {
    name: 'Mamadou Keita',
    phone: '+33 6 XX XX XX 02',
    email: 'mamadou.keita@gervifrais.fr',
    license_number: 'FR-MK-2020-002',
    rgpd_consent: true,
    rgpd_consent_at: new Date().toISOString(),
    is_active: true,
    rating: 5.0,
    vehicle_plate: 'BB123AA',
  },
];

const RECEPTION_WINDOWS = [
  {
    store_name: 'Auchan Marne la Vallée',
    store_address: 'Centre Commercial Val d\'Europe, 77711 Marne-la-Vallée',
    store_lat: 48.8692,
    store_lng: 2.7826,
    store_phone: '+33 1 60 42 XX XX',
    store_email: 'reception.marne@auchan.fr',
    open_time: '00:00',
    close_time: '05:30',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    is_active: true,
    // client_deadline: 05:00 (stored on deliveries, not windows)
  },
  {
    store_name: 'Auchan Villebon',
    store_address: 'Centre Commercial Villebon 2, 91160 Longjumeau',
    store_lat: 48.6918,
    store_lng: 2.2236,
    store_phone: '+33 1 69 34 XX XX',
    store_email: 'reception.villebon@auchan.fr',
    open_time: '00:00',
    close_time: '05:00',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    is_active: true,
    // client_deadline: 04:45
  },
  {
    store_name: 'Carrefour Orly',
    store_address: 'Centre Commercial Carrefour Orly, 94310 Orly',
    store_lat: 48.7314,
    store_lng: 2.3949,
    store_phone: '+33 1 46 87 XX XX',
    store_email: 'reception.orly@carrefour.fr',
    open_time: '06:00',
    close_time: '11:00',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    is_active: true,
    // client_deadline: 10:00
  },
  {
    store_name: 'Monoprix Villejuif',
    store_address: '24 Rue Jean-Jaurès, 94800 Villejuif',
    store_lat: 48.7934,
    store_lng: 2.3654,
    store_phone: '+33 1 46 78 XX XX',
    store_email: 'reception.villejuif@monoprix.fr',
    open_time: '07:00',
    close_time: '12:00',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    is_active: true,
    // client_deadline: 11:00
  },
];

// Test deliveries: 1 per magasin, for today
// client_deadline mirrors the store's deadline from the specs
const TEST_DELIVERIES = [
  {
    store_index: 0, // Auchan Marne la Vallée
    client_deadline: '05:00',
    weight_kg: 200,
    estimated_time_at_site: 20,
    priority: 2,
    notes: 'Livraison frais — zone de réception quai 3',
  },
  {
    store_index: 1, // Auchan Villebon
    client_deadline: '04:45',
    weight_kg: 150,
    estimated_time_at_site: 15,
    priority: 2,
    notes: 'Livraison frais — appeler réception à l\'arrivée',
  },
  {
    store_index: 2, // Carrefour Orly
    client_deadline: '10:00',
    weight_kg: 180,
    estimated_time_at_site: 20,
    priority: 3,
    notes: 'Livraison frais — entrée livraison rue latérale',
  },
  {
    store_index: 3, // Monoprix Villejuif
    client_deadline: '11:00',
    weight_kg: 120,
    estimated_time_at_site: 15,
    priority: 3,
    notes: 'Livraison frais — BL obligatoire tamponné',
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
export async function seed(client: Client): Promise<void> {
  console.log('[SEED] Starting GERVIFRAIS seed...');

  // 1. Check if already seeded
  const { rows: existing } = await client.query(
    `SELECT id FROM company WHERE name = $1 LIMIT 1`,
    [COMPANY.name]
  );

  if (existing.length > 0) {
    console.log(`[SEED] ⚠️  GERVIFRAIS already seeded (company id: ${existing[0].id}). Skipping.`);
    console.log('[SEED] To reseed, delete the GERVIFRAIS company row first.');
    return;
  }

  // 2. Insert company
  const { rows: [company] } = await client.query(
    `INSERT INTO company (name, address, phone, rgpd_accepted, rgpd_accepted_at, subscription_tier)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [COMPANY.name, COMPANY.address, COMPANY.phone,
     COMPANY.rgpd_accepted, COMPANY.rgpd_accepted_at, COMPANY.subscription_tier]
  );
  const companyId: string = company.id;
  console.log(`[SEED] ✅ Company created: ${companyId}`);

  // 3. Insert manager user
  const passwordHash = await bcrypt.hash(MANAGER_PASSWORD, 12);
  const { rows: [user] } = await client.query(
    `INSERT INTO users (email, password_hash, company_id, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [MANAGER_EMAIL, passwordHash, companyId, 'admin']
  );
  console.log(`[SEED] ✅ Manager user created: ${user.id} (${MANAGER_EMAIL})`);
  console.log(`[SEED]    Password: ${MANAGER_PASSWORD} — CHANGE THIS IN PRODUCTION`);

  // 4. Insert vehicles
  const vehicleIds: Record<string, string> = {};
  for (const v of VEHICLES) {
    const { rows: [vehicle] } = await client.query(
      `INSERT INTO vehicles (company_id, registration_plate, brand, model, year, capacity_kg, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [companyId, v.registration_plate, v.brand, v.model,
       v.year, v.capacity_kg, v.status, v.notes]
    );
    vehicleIds[v.registration_plate] = vehicle.id;
    console.log(`[SEED] ✅ Vehicle: ${v.brand} ${v.model} (${v.registration_plate}) → ${vehicle.id}`);
  }

  // 5. Insert drivers
  const driverIds: string[] = [];
  for (const d of DRIVERS) {
    const vehicleId = vehicleIds[d.vehicle_plate];
    const { rows: [driver] } = await client.query(
      `INSERT INTO drivers (company_id, name, phone, email, vehicle_id, license_number,
                            rating, rgpd_consent, rgpd_consent_at, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [companyId, d.name, d.phone, d.email, vehicleId,
       d.license_number, d.rating, d.rgpd_consent, d.rgpd_consent_at, d.is_active]
    );
    driverIds.push(driver.id);
    console.log(`[SEED] ✅ Driver: ${d.name} → ${driver.id}`);
  }

  // 6. Insert reception windows
  const windowIds: string[] = [];
  for (const rw of RECEPTION_WINDOWS) {
    const { rows: [window] } = await client.query(
      `INSERT INTO reception_windows
         (company_id, store_name, store_address, store_lat, store_lng,
          store_phone, store_email, open_time, close_time, days_of_week, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [companyId, rw.store_name, rw.store_address, rw.store_lat, rw.store_lng,
       rw.store_phone, rw.store_email, rw.open_time, rw.close_time,
       JSON.stringify(rw.days_of_week), rw.is_active]
    );
    windowIds.push(window.id);
    console.log(`[SEED] ✅ Reception window: ${rw.store_name} (${rw.open_time}–${rw.close_time}) → ${window.id}`);
  }

  // 7. Insert test deliveries (for today)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const deliveryIds: string[] = [];
  for (const td of TEST_DELIVERIES) {
    const window = RECEPTION_WINDOWS[td.store_index];
    const windowId = windowIds[td.store_index];

    const { rows: [delivery] } = await client.query(
      `INSERT INTO deliveries
         (company_id, reception_window_id, client_deadline, address,
          latitude, longitude, weight_kg, estimated_time_at_site, status, priority, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [companyId, windowId, td.client_deadline,
       window.store_address, window.store_lat, window.store_lng,
       td.weight_kg, td.estimated_time_at_site, 'pending', td.priority, td.notes]
    );
    deliveryIds.push(delivery.id);
    console.log(`[SEED] ✅ Delivery: ${window.store_name} (deadline ${td.client_deadline}) → ${delivery.id}`);
  }

  // 8. Summary
  console.log('\n[SEED] ════════════════════════════════════════');
  console.log('[SEED] GERVIFRAIS seed complete!');
  console.log(`[SEED]   Company ID:   ${companyId}`);
  console.log(`[SEED]   Manager:      ${MANAGER_EMAIL}`);
  console.log(`[SEED]   Drivers:      ${driverIds.join(', ')}`);
  console.log(`[SEED]   Vehicles:     ${Object.values(vehicleIds).join(', ')}`);
  console.log(`[SEED]   Windows:      ${windowIds.join(', ')}`);
  console.log(`[SEED]   Deliveries:   ${deliveryIds.join(', ')} (date: ${today})`);
  console.log('[SEED] ════════════════════════════════════════\n');
}

// ---------------------------------------------------------------------------
// Standalone runner (npm run db:seed)
// ---------------------------------------------------------------------------
if (require.main === module) {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    console.error('[SEED] ❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  client.connect()
    .then(() => seed(client))
    .then(() => client.end())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[SEED] ❌ Failed:', err.message);
      process.exit(1);
    });
}
