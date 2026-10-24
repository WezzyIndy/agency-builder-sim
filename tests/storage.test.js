// tests/storage.test.js
//
// Guarded localStorage: save/resume, unavailable storage, corrupt saves.

import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRun, saveRun, addScore, loadScores, loadSettings, storageAvailable } from '../src/ui/storage.js';
import { applyDecision } from '../src/engine/run.js';
import { launched, playWeeks } from './helpers.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

const throwing = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
  removeItem() {
    throw new Error('blocked');
  },
};

test('Covers AE6. A run saved after week 3 restores equal and resumes at week 4', () => {
  const store = fakeStorage();
  let s = launched(61);
  for (let i = 0; i < 3; i++) {
    s = playWeeks(s, 1);
    saveRun(s, store);
  }
  const { run, corrupt } = loadRun(store);
  assert.equal(corrupt, false);
  assert.deepEqual(run, s);
  assert.equal(run.weekIndex, 3);
  let next = run.pendingEvent ? playWeeks(run, 0) : run;
  if (next.pendingEvent) next = { ...next, pendingEvent: null };
  next = applyDecision(next, { type: 'endWeek', update: 'honest' });
  assert.equal(next.weeks.at(-1).week, 4);
});

test('storage that throws on every call: nothing crashes and there is no save', () => {
  assert.equal(storageAvailable(throwing), false);
  assert.equal(saveRun(launched(1), throwing), false);
  assert.deepEqual(loadRun(throwing), { run: null, corrupt: true });
  assert.deepEqual(loadScores(throwing), []);
  assert.equal(loadSettings(throwing).targetHourlyRate, 75);
  assert.equal(storageAvailable(null), false);
  assert.deepEqual(loadRun(null), { run: null, corrupt: false });
});

test('a corrupt save is discarded with a notice flag, not a crash', () => {
  const store = fakeStorage();
  store.setItem('abs.v1.run', '{not json');
  assert.deepEqual(loadRun(store), { run: null, corrupt: true });
  assert.equal(store.getItem('abs.v1.run'), null);
  store.setItem('abs.v1.run', JSON.stringify({ v: 999 }));
  assert.equal(loadRun(store).corrupt, true);
});

test('scores are recorded once per run', () => {
  const store = fakeStorage();
  addScore({ runSeed: 1, mode: 'ads' }, store);
  addScore({ runSeed: 1, mode: 'ads' }, store);
  addScore({ runSeed: 2, mode: 'ads' }, store);
  assert.equal(loadScores(store).length, 2);
});
