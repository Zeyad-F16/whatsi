const Database = require('better-sqlite3');
const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to SQLite...');
  const dbPath = path.resolve(__dirname, '../../license-server/license.db');
  const sqliteDb = new Database(dbPath, { readonly: true });

  console.log('Fetching data from SQLite...');
  const clients = sqliteDb.prepare('SELECT * FROM clients').all();
  const adminSessions = sqliteDb.prepare('SELECT * FROM admin_sessions').all();
  const licenseLogs = sqliteDb.prepare('SELECT * FROM license_logs').all();

  console.log('Connecting to PostgreSQL via Prisma...');
  await prisma.$connect();

  console.log('Migrating Clients...');
  for (const client of clients) {
    await prisma.client.create({
      data: {
        id: client.id,
        name: client.name,
        phone: client.phone,
        planType: client.plan_type,
        amountPaid: client.amount_paid,
        activationCode: client.activation_code,
        codeUsed: client.code_used === 1,
        machineId: client.machine_id,
        startDate: client.start_date,
        expiryDate: client.expiry_date,
        isActive: client.is_active === 1,
        notes: client.notes,
        createdAt: new Date(client.created_at)
      }
    });
  }

  console.log('Migrating Admin Sessions...');
  for (const session of adminSessions) {
    await prisma.adminSession.create({
      data: {
        id: session.id,
        tokenHash: session.token_hash,
        createdAt: new Date(session.created_at),
        expiresAt: new Date(session.expires_at)
      }
    });
  }

  console.log('Migrating License Logs...');
  for (const log of licenseLogs) {
    await prisma.licenseLog.create({
      data: {
        id: log.id,
        clientId: log.client_id,
        action: log.action,
        machineId: log.machine_id,
        ipAddress: log.ip_address,
        details: log.details,
        createdAt: new Date(log.created_at)
      }
    });
  }

  // Update sequences for PostgreSQL auto-incrementing since we manually inserted IDs
  console.log('Updating sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval('clients_id_seq', (SELECT MAX(id) FROM clients));`);
  await prisma.$executeRawUnsafe(`SELECT setval('admin_sessions_id_seq', (SELECT MAX(id) FROM admin_sessions));`);
  await prisma.$executeRawUnsafe(`SELECT setval('license_logs_id_seq', (SELECT MAX(id) FROM license_logs));`);

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
