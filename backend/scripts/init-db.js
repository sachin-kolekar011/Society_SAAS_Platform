// Run with: node scripts/init-db.js
//
// Connects directly with mysql2 (not Prisma) and executes schema-init.sql
// as one batch. This is the escape hatch described at the top of that
// file -- use this if `npx prisma migrate dev` can't reach
// binaries.prisma.sh on your network. If it CAN reach it, prefer
// `prisma migrate dev` instead -- it tracks migration history properly,
// this script deliberately doesn't.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
  const sqlPath = path.join(__dirname, '..', 'prisma', 'schema-init.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and fill it in first.');
    process.exit(1);
  }

  // multipleStatements: true lets one query() call run the whole file --
  // safe here because schema-init.sql is a file WE wrote and control, not
  // user input, so there's no SQL-injection concern in taking this shortcut.
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });

  console.log('Connected. Running schema-init.sql...');

  try {
    await connection.query(sql);
    console.log('✓ All tables created (or already existed -- every statement is IF NOT EXISTS).');
  } catch (err) {
    console.error('✗ Schema initialization failed:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

initDatabase()
  .then(() => {
    console.log('Done. Run `npx prisma generate` next so the Prisma Client matches these tables.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err); // was previously swallowed here -- made every failure undebuggable
    process.exit(1);
  });
