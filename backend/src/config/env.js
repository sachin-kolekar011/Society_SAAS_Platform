// Loads and validates environment variables at boot.
// Philosophy: fail fast and loud here, rather than discovering a missing
// secret three requests into production when something throws a confusing
// "undefined is not a function" deep in jsonwebtoken.

require('dotenv').config();

const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ACCESS_TOKEN_EXPIRES_IN',
  'REFRESH_TOKEN_EXPIRES_IN',
];

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Thrown synchronously at import time -> process exits before the server
    // ever starts listening. Better than a half-working boot.
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        'Check .env against .env.example.'
    );
  }

  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.'
    );
  }
}

validateEnv();

module.exports = {
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
  port: parseInt(process.env.PORT, 10),
  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN, // e.g. "15m"
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN, // e.g. "7d"
  },

  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),

  appName: process.env.APP_NAME || 'Society SaaS',

  storageProvider: process.env.STORAGE_PROVIDER || 'cloudinary',
  triageProvider: process.env.TRIAGE_PROVIDER || 'keyword',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },

  cookie: {
    // Same-origin deployment (frontend served from the same tenant
    // subdomain, API reverse-proxied under /api/v1 by NGINX) means we do
    // NOT need a shared cookie domain across subdomains. Strict is safe
    // and is the strongest CSRF defense available.
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in prod
  },
};
