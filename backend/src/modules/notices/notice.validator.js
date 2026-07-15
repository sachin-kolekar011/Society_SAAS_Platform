const { z } = require('zod');

const listNoticesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

const createNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150),
    body: z.string().min(1),
    isImportant: z.boolean().optional(),
  }),
});

const updateNoticeSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(150).optional(),
    body: z.string().min(1).optional(),
    isImportant: z.boolean().optional(),
  }),
});

module.exports = { listNoticesSchema, createNoticeSchema, updateNoticeSchema };
