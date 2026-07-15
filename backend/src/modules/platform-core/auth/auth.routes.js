const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('./auth.controller');
const authMiddleware = require('../../../middlewares/auth.middleware');
const validate = require('../../../middlewares/validate.middleware');
const { registerSchema, loginSchema, flatsLookupSchema } = require('./auth.validator');

const router = express.Router();

// Auth endpoints are the highest-value brute-force target in the whole
// API -- rate limited more aggressively than the general API limiter that
// app.js applies everywhere else.
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
});

router.get('/flats-lookup', validate(flatsLookupSchema), controller.flatsLookup);
router.post('/register', authRateLimiter, validate(registerSchema), controller.register);
router.post('/login', authRateLimiter, validate(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authMiddleware, controller.me);

module.exports = router;
