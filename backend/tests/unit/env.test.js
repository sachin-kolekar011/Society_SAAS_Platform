const { test } = require('node:test');
const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

// env.js runs its validation at IMPORT time and throws synchronously if a
// required var is missing -- testing that means spawning a fresh process
// per case (can't just delete process.env keys in-process, since env.js
// may already be cached from an earlier require in this same test run).

function runInFreshProcess(envOverrides) {
  const scriptPath = path.join(__dirname, '..', '..', 'src', 'config', 'env.js');
  try {
    execFileSync('node', ['-e', `require('${scriptPath.replace(/\\/g, '\\\\')}')`], {
      env: { ...process.env, ...envOverrides },
      stdio: 'pipe',
    });
    return { threw: false };
  } catch (err) {
    return { threw: true, stderr: err.stderr.toString() };
  }
}

test('throws clearly when a required env var is missing', () => {
  const result = runInFreshProcess({
    NODE_ENV: 'development', PORT: '4000', DATABASE_URL: 'mysql://x',
    JWT_ACCESS_SECRET: 'a', JWT_REFRESH_SECRET: 'b',
    ACCESS_TOKEN_EXPIRES_IN: '', REFRESH_TOKEN_EXPIRES_IN: '', // both blank -- should fail
  });
  assert.strictEqual(result.threw, true);
  assert.match(result.stderr, /Missing required environment variables/);
});

test('throws when access and refresh secrets are identical (a real security footgun)', () => {
  const result = runInFreshProcess({
    NODE_ENV: 'development', PORT: '4000', DATABASE_URL: 'mysql://x',
    JWT_ACCESS_SECRET: 'same_secret', JWT_REFRESH_SECRET: 'same_secret',
    ACCESS_TOKEN_EXPIRES_IN: '15m', REFRESH_TOKEN_EXPIRES_IN: '7d',
  });
  assert.strictEqual(result.threw, true);
  assert.match(result.stderr, /must be different values/);
});

test('boots cleanly with all required vars present and distinct secrets', () => {
  const result = runInFreshProcess({
    NODE_ENV: 'development', PORT: '4000', DATABASE_URL: 'mysql://x',
    JWT_ACCESS_SECRET: 'access_secret_value', JWT_REFRESH_SECRET: 'refresh_secret_value',
    ACCESS_TOKEN_EXPIRES_IN: '15m', REFRESH_TOKEN_EXPIRES_IN: '7d',
  });
  assert.strictEqual(result.threw, false);
});
