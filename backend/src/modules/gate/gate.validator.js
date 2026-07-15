const { z } = require('zod');

const createPassSchema = z.object({
  body: z.object({
    visitorName: z.string().min(1),
    visitorPhone: z.string().optional(),
    purpose: z.string().optional(),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
  }),
});

const listPassesSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING', 'CHECKED_IN', 'CHECKED_OUT', 'EXPIRED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const qrTokenSchema = z.object({
  body: z.object({
    qrToken: z.string().min(1),
  }),
});

module.exports = { createPassSchema, listPassesSchema, qrTokenSchema };
