const http = require('http');
const net = require('net');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'backend/.env') });

const proxyEnv = process.env['https_proxy'] || process.env['HTTPS_PROXY'] || '';
const proxyUrl = new URL(proxyEnv);
const dbUrl = new URL(process.env['DATABASE_URL']);

const auth = Buffer.from(
  decodeURIComponent(proxyUrl.username) + ':' + decodeURIComponent(proxyUrl.password)
).toString('base64');

function createTunnel(targetHost, targetPort) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: proxyUrl.hostname,
      port: parseInt(proxyUrl.port),
      method: 'CONNECT',
      path: targetHost + ':' + targetPort,
      headers: {
        'Proxy-Authorization': 'Basic ' + auth,
        'Host': targetHost + ':' + targetPort
      }
    });
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error('Proxy CONNECT failed: ' + res.statusCode + ' ' + res.statusMessage));
        return;
      }
      resolve(socket);
    });
    req.on('error', reject);
    req.end();
  });
}

async function tryConnect(host, port, user, password, database, useSSL) {
  console.log(`[TUNNEL] Tunneling to ${host}:${port} ssl=${useSSL}`);
  const tunnelSocket = await createTunnel(host, port);
  console.log('[TUNNEL] Tunnel established!');

  const server = net.createServer(clientSocket => {
    clientSocket.pipe(tunnelSocket);
    tunnelSocket.pipe(clientSocket);
    clientSocket.on('error', () => {});
    tunnelSocket.on('error', () => {});
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const localPort = server.address().port;

  const client = new Client({
    host: '127.0.0.1',
    port: localPort,
    database,
    user,
    password,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    return { client, server };
  } catch (e) {
    server.close();
    throw e;
  }
}

async function run() {
  const dbHost = dbUrl.hostname;
  const dbPort = parseInt(dbUrl.port) || 5432;
  const dbUser = decodeURIComponent(dbUrl.username);
  const dbPass = decodeURIComponent(dbUrl.password);
  const dbName = dbUrl.pathname.replace('/', '');

  let client, server;

  // Try: pooler port 5432 with SSL
  const attempts = [
    [dbHost, dbPort, true],
    [dbHost, 6543, true],          // session-mode pooler
    [dbHost, dbPort, false],        // no SSL
  ];

  for (const [host, port, ssl] of attempts) {
    try {
      ({ client, server } = await tryConnect(host, port, dbUser, dbPass, dbName, ssl));
      console.log(`[DB] Connected via ${host}:${port} ssl=${ssl}`);
      break;
    } catch (e) {
      console.log(`[DB] ${host}:${port} ssl=${ssl} failed: ${e.message}`);
    }
  }

  if (!client) {
    console.error('[FATAL] Could not connect to PostgreSQL via any method.');
    process.exit(1);
  }

  try {
    const schema = fs.readFileSync(
      path.resolve(__dirname, 'backend/src/db/schema.sql'),
      'utf-8'
    );

    console.log('[DB] Applying schema...');
    await client.query('BEGIN');
    try {
      await client.query(schema);
      await client.query('COMMIT');
      console.log('[DB] Schema applied successfully!');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    await client.end();
    server.close();
    console.log('[DONE] Migration complete!');
    process.exit(0);
  } catch (e) {
    console.error('[DB] Migration error:', e.message);
    server.close();
    process.exit(1);
  }
}

run().catch(e => {
  console.error('[FATAL]', e.message);
  process.exit(1);
});
