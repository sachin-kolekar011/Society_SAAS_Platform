const express = require('express');
const { z } = require('zod');
const prisma = require('../../config/database');
const asyncHandler = require('../../utils/asyncHandler');
const authMiddleware = require('../../middlewares/auth.middleware');
const requireRole = require('../../middlewares/rbac.middleware');
const validate = require('../../middlewares/validate.middleware');
const { NotFoundError, UnprocessableError, ConflictError } = require('../../errors');

const router = express.Router();
router.use(authMiddleware);

const createPollSchema = z.object({
  body: z.object({
    question: z.string().min(1),
    options: z.array(z.string().min(1)).min(2, 'A poll needs at least 2 options'),
    closesAt: z.string().datetime(),
  }),
});

router.post('/', requireRole('ADMIN'), validate(createPollSchema), asyncHandler(async (req, res) => {
  const { question, options, closesAt } = req.body;
  // Poll + its options created together -- a poll with zero options is a
  // dead end nobody can vote on, same reasoning as complaint+history and
  // tenant+admin transactions elsewhere in this project.
  const poll = await prisma.$transaction(async (tx) => {
    const created = await tx.poll.create({
      data: { tenantId: req.tenant.id, question, closesAt: new Date(closesAt), createdByUserId: req.user.id },
    });
    await tx.pollOption.createMany({ data: options.map((text) => ({ pollId: created.id, text })) });
    return created;
  });
  res.status(201).json({ success: true, data: poll });
}));

router.get('/', asyncHandler(async (req, res) => {
  const polls = await prisma.poll.findMany({
    where: { tenantId: req.tenant.id, deletedAt: null },
    include: { options: { include: { _count: { select: { votes: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  // Whether THIS resident has already voted, and on what -- needed so the
  // frontend can show "you voted for X" instead of the voting form again.
  // Admins and other roles don't have a resident record, so this is
  // skipped for them (myVote stays null, which the frontend treats as
  // "not applicable," not "hasn't voted").
  let myVotesByPoll = {};
  if (req.user.role === 'RESIDENT') {
    const resident = await prisma.resident.findFirst({ where: { userId: req.user.id, tenantId: req.tenant.id, deletedAt: null } });
    if (resident) {
      const myVotes = await prisma.pollVote.findMany({ where: { residentId: resident.id, pollId: { in: polls.map((p) => p.id) } } });
      myVotesByPoll = Object.fromEntries(myVotes.map((v) => [v.pollId, v.optionId]));
    }
  }

  const data = polls.map((poll) => ({
    ...poll,
    options: poll.options.map((o) => ({ id: o.id, text: o.text, voteCount: o._count.votes })),
    myVoteOptionId: myVotesByPoll[poll.id] || null,
  }));

  res.status(200).json({ success: true, data });
}));

const voteSchema = z.object({ body: z.object({ optionId: z.string().min(1) }) });

router.post('/:id/vote', requireRole('RESIDENT'), validate(voteSchema), asyncHandler(async (req, res) => {
  const resident = await prisma.resident.findFirst({ where: { userId: req.user.id, tenantId: req.tenant.id, deletedAt: null } });
  if (!resident) throw new NotFoundError('Resident profile not found');

  const poll = await prisma.poll.findFirst({ where: { id: req.params.id, tenantId: req.tenant.id, deletedAt: null } });
  if (!poll) throw new NotFoundError('Poll not found');
  if (!poll.isActive || new Date() > poll.closesAt) throw new UnprocessableError('This poll is closed');

  const option = await prisma.pollOption.findFirst({ where: { id: req.body.optionId, pollId: poll.id } });
  if (!option) throw new NotFoundError('Option not found on this poll');

  try {
    // The @@unique([pollId, residentId]) constraint from the schema is
    // what actually enforces one-vote-per-resident -- this try/catch is
    // just translating that DB-level guarantee into a clean 409, not
    // re-implementing the check in application code (which would have a
    // race condition between two rapid double-taps that this doesn't).
    await prisma.pollVote.create({
      data: { pollId: poll.id, optionId: option.id, residentId: resident.id },
    });
  } catch (err) {
    if (err.code === 'P2002') throw new ConflictError('You have already voted in this poll');
    throw err;
  }

  res.status(201).json({ success: true });
}));

module.exports = router;
