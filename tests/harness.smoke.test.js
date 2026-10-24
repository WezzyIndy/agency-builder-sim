// tests/harness.smoke.test.js
//
// Reduced-N calibration smoke test (KTD7). Loose tolerances catch gross
// calibration regressions in the regular suite; the full harness
// (npm run harness) is the real gate.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { campaignCriteria } from '../harness/criteria.js';

test('med spa campaign criteria hold at reduced N with loose tolerance', () => {
  const rows = Object.fromEntries(campaignCriteria('medspa', 80).map((r) => [r.id, r]));
  assert.ok(rows['1@r3'].pass, `criterion 1: ${rows['1@r3'].value}`);
  assert.ok(rows['2@r3'].pass, 'criterion 2');
  assert.ok(rows['3a'].value <= 0.2, `best-practice failure ${rows['3a'].value}`);
  assert.ok(rows['3b'].value >= 0.5, `naive failure ${rows['3b'].value}`);
  assert.ok(rows['4'].value >= 0.05 && rows['4'].value <= 0.6, `hard failure ${rows['4'].value}`);
  assert.ok(rows['5a'].pass, 'criterion 5a');
  assert.ok(rows['6'].pass, `criterion 6: ${rows['6'].value}`);
});

test('the harness CLI exits nonzero when a criterion fails', () => {
  const r = spawnSync(process.execPath, ['harness/run.js', '--criteria', 'policy', '--quiet', '--self-test-fail'], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /self-test/);
  const ok = spawnSync(process.execPath, ['harness/run.js', '--criteria', 'policy', '--quiet'], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
});
