// const winston = require('winston');
// const env = require('./env');

// // Structured JSON logs so requestId + tenantId can be correlated across
// // lines -- plain string logs make that grep-only, which doesn't scale past
// // a handful of tenants.
// const logger = winston.createLogger({
//   level: env.isProduction ? 'info' : 'debug',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.errors({ stack: true }),
//     winston.format.json()
//   ),
//   defaultMeta: { service: 'society-saas-api' },
//   transports: [
//     new winston.transports.Console({
//       format: env.isProduction
//         ? winston.format.json()
//         : winston.format.combine(winston.format.colorize(), winston.format.simple()),
//     }),
//     new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
//     new winston.transports.File({ filename: 'logs/combined.log' }),
//   ],
// });

// module.exports = logger;


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
  transports: (() => {
    // File transports are LOCAL-DEV ONLY. In production this runs inside a
    // Docker container as a non-root user (Dockerfile's `USER node`), and
    // /app is owned by root from the build stage -- the app has no
    // permission to create a logs/ directory there, which crash-looped
    // the container in real deployment (confirmed: EACCES on
    // mkdir('logs') on boot; nginx stayed "Up" the whole time since it
    // only serves static files, masking that the API was actually down).
    // Console-only in production isn't just a workaround for that crash --
    // it's the correct approach regardless: file logs inside a container
    // are lost the moment it's recreated, while `docker compose logs`
    // already captures stdout durably.
    const list = [
      new winston.transports.Console({
        format: env.isProduction
          ? winston.format.json()
          : winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
    ];
    if (!env.isProduction) {
      list.push(
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
      );
    }
    return list;
  })(),
});

module.exports = logger;