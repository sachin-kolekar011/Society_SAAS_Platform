const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    flatId: z.string().min(1, 'Please select your flat'),
    residentType: z.enum(['OWNER', 'TENANT_OCCUPANT']),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const flatsLookupSchema = z.object({
  query: z.object({
    search: z.string().min(1).optional(),
  }),
});

module.exports = { registerSchema, loginSchema, flatsLookupSchema };
