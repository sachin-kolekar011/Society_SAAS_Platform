// Prisma client singleton. Importing this module IS the singleton pattern
// in plain JS -- no need for a separate Singleton-pattern wrapper class
// (see Phase 2 architecture doc, section 2, "patterns deliberately not
// forced in").

const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

module.exports = prisma;
