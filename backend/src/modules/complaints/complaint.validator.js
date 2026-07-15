const { z } = require('zod');

const raiseComplaintSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1),
    description: z.string().min(10, 'Please describe the issue in at least 10 characters'),
  }),
});

const listComplaintsSchema = z.object({
  query: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
    categoryId: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sortOverdueFirst: z.coerce.boolean().optional(),
  }),
});

const changeStatusSchema = z.object({
  body: z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
    note: z.string().max(500).optional(),
  }),
});

const changePrioritySchema = z.object({
  body: z.object({
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  }),
});

const suggestTriageSchema = z.object({
  body: z.object({
    description: z.string().min(5),
  }),
});

module.exports = { raiseComplaintSchema, listComplaintsSchema, changeStatusSchema, changePrioritySchema, suggestTriageSchema };
