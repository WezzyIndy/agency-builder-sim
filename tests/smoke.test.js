// tests/smoke.test.js
//
// Confirms the test runner discovers files in this directory.

import test from 'node:test';
import assert from 'node:assert/strict';

test('test runner discovers this file', () => {
  assert.equal(1 + 1, 2);
});
