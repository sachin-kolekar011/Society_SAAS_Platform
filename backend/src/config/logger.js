const winston = require('winston');
const env = require('./env');

// Structured JSON logs so requestId + tenantId can be correlated across
// lines -- plain string logs make that grep-only, which doesn't scale past
// a handful of tenants.
const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'society-saas-api' },
  transports: [
    new winston.transports.Console({
      format: env.isProduction
        ? winston.format.json()
        : winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

module.exports = logger;
