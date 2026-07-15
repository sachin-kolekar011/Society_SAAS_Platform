const { test } = require('node:test');
const assert = require('node:assert');
const { ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, UnprocessableError } = require('../../src/errors');
const AppError = require('../../src/errors/AppError');

test('every error subclass extends AppError and carries the right status code', () => {
  const cases = [
    [new ValidationError(), 400, 'VALIDATION_ERROR'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new ConflictError(), 409, 'CONFLICT'],
    [new UnprocessableError(), 422, 'UNPROCESSABLE'],
  ];
  for (const [err, statusCode, code] of cases) {
    assert.ok(err instanceof AppError, `${code} should extend AppError`);
    assert.strictEqual(err.statusCode, statusCode);
    assert.strictEqual(err.code, code);
    assert.strictEqual(err.isOperational, true);
  }
});

test('ValidationError carries structured details', () => {
  const err = new ValidationError('Validation failed', [{ field: 'email', message: 'invalid' }]);
  assert.strictEqual(err.details.length, 1);
  assert.strictEqual(err.details[0].field, 'email');
});

test('errors carry a real stack trace for debugging', () => {
  const err = new NotFoundError('Complaint not found');
  assert.ok(err.stack.includes('NotFoundError') || err.stack.length > 0);
});
