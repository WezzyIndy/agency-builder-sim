// src/ui/storage.js
//
// localStorage behind a guard (KTD10). Every read and write is wrapped in
// try/catch; when storage is unavailable the game still plays, it just
// can't resume. A corrupt save is discarded, not fatal.
//
// Functions take an optional storage object so tests can inject a fake.

import { RUN_VERSION } from '../engine/run.js';

const KEYS = { run: 'abs.v1.run', scores: 'abs.v1.scores', settings: 'abs.v1.settings' };

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(key, storage) {
  try {
    const raw = storage?.getItem(key);
    if (raw === null || raw === undefined) return { ok: true, value: null };
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false, value: null };
  }
}

function write(key, value, storage) {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function remove(key, storage) {
  try {
    storage?.removeItem(key);
  } catch {
    // ignore
  }
}

/** Is storage usable at all? */
export function storageAvailable(storage = defaultStorage()) {
  try {
    if (!storage) return false;
    storage.setItem('abs.probe', '1');
    storage.removeItem('abs.probe');
    return true;
  } catch {
    return false;
  }
}

/** Returns { run, corrupt }. A save from another engine version counts as corrupt. */
export function loadRun(storage = defaultStorage()) {
  const r = read(KEYS.run, storage);
  if (!r.ok) {
    remove(KEYS.run, storage);
    return { run: null, corrupt: true };
  }
  const run = r.value;
  if (run === null) return { run: null, corrupt: false };
  if (typeof run !== 'object' || run.v !== RUN_VERSION || !run.brief || !Array.isArray(run.decisions)) {
    remove(KEYS.run, storage);
    return { run: null, corrupt: true };
  }
  return { run, corrupt: false };
}

export function saveRun(run, storage = defaultStorage()) {
  return write(KEYS.run, run, storage);
}

export function clearRun(storage = defaultStorage()) {
  remove(KEYS.run, storage);
}

export function loadScores(storage = defaultStorage()) {
  const r = read(KEYS.scores, storage);
  return Array.isArray(r.value) ? r.value : [];
}

/** Adds a score record, ignoring a duplicate for the same run seed. */
export function addScore(record, storage = defaultStorage()) {
  const scores = loadScores(storage);
  if (scores.some((s) => s.runSeed === record.runSeed && s.mode === record.mode)) return scores;
  scores.push(record);
  write(KEYS.scores, scores, storage);
  return scores;
}

export const DEFAULT_SETTINGS = { realismDefault: 3, targetHourlyRate: 75 };

export function loadSettings(storage = defaultStorage()) {
  const r = read(KEYS.settings, storage);
  return { ...DEFAULT_SETTINGS, ...(r.value && typeof r.value === 'object' ? r.value : {}) };
}

export function saveSettings(settings, storage = defaultStorage()) {
  return write(KEYS.settings, settings, storage);
}

export function clearAll(storage = defaultStorage()) {
  for (const k of Object.values(KEYS)) remove(k, storage);
}
