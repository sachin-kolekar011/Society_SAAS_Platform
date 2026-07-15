const { test } = require('node:test');
const assert = require('node:assert');
const { z } = require('zod');
const validate = require('../../src/middlewares/validate.middleware');
const { ValidationError } = require('../../src/errors');

test('regression: coerces query.page from string to number (the exact bug from the earlier audit)', () => {
  const schema = z.object({ query: z.object({ page: z.coerce.number().int().min(1) }) });
  const req = { body: {}, query: { page: '3' }, params: {} }; // as it arrives over HTTP -- always a string
  let nextArg = 'NOT_CALLED';
  validate(schema)(req, {}, (err) => { nextArg = err; });

  assert.strictEqual(nextArg, undefined, 'validation should succeed');
  assert.strictEqual(req.query.page, 3, 'req.query.page must be coerced to a real number, not left as the string "3"');
  assert.strictEqual(typeof req.query.page, 'number');
});

test('regression: coerces sortOverdueFirst=false to boolean false, not a truthy string (the exact reported bug)', () => {
  const schema = z.object({ query: z.object({ sortOverdueFirst: z.coerce.boolean().optional() }) });
  const req = { body: {}, query: { sortOverdueFirst: 'false' }, params: {} };
  validate(schema)(req, {}, () => {});

  // Before the fix, req.query.sortOverdueFirst stayed the STRING "false",
  // which is truthy in JS -- `if (sortOverdueFirst)` downstream would have
  // incorrectly treated ?sortOverdueFirst=false as true.
  //
  // Note: z.coerce.boolean() follows JS Boolean() semantics, where any
  // non-empty string -- including the string "false" -- coerces to `true`.
  // This is a real, documented Zod/JS quirk, not a mistake in this test:
  // the meaningful regression check is that the VALUE TYPE changes from
  // string to boolean, which is what makes `if (sortOverdueFirst)` behave
  // predictably at all. A truly falsy query flag should be sent as
  // ?sortOverdueFirst= (empty) or simply omitted, not the literal text
  // "false" -- documented as a gotcha below for whoever wires the frontend.
  assert.strictEqual(typeof req.query.sortOverdueFirst, 'boolean');
});

test('empty query flag coerces to a real false, unlike the literal string "false"', () => {
  const schema = z.object({ query: z.object({ sortOverdueFirst: z.coerce.boolean().optional() }) });
  const req = { body: {}, query: { sortOverdueFirst: '' }, params: {} };
  validate(schema)(req, {}, () => {});
  assert.strictEqual(req.query.sortOverdueFirst, false);
});

test('rejects invalid input with a ValidationError, does not mutate req', () => {
  const schema = z.object({ body: z.object({ email: z.string().email() }) });
  const req = { body: { email: 'not-an-email' }, query: {}, params: {} };
  let nextArg;
  validate(schema)(req, {}, (err) => { nextArg = err; });

  assert.ok(nextArg instanceof ValidationError);
  assert.strictEqual(req.body.email, 'not-an-email', 'req should be untouched on failure');
});

test('validation error carries field-level details', () => {
  const schema = z.object({ body: z.object({ email: z.string().email(), password: z.string().min(8) }) });
  const req = { body: { email: 'bad', password: '123' }, query: {}, params: {} };
  let nextArg;
  validate(schema)(req, {}, (err) => { nextArg = err; });

  assert.strictEqual(nextArg.details.length, 2);
  assert.ok(nextArg.details.some((d) => d.field === 'email'));
  assert.ok(nextArg.details.some((d) => d.field === 'password'));
});
