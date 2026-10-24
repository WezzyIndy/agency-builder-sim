// src/engine/math.js
//
// Numeric helpers. Division that could hit zero goes through safeDiv, which
// returns null ("no results") instead of Infinity or NaN.

export function safeDiv(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return a / b;
}

export function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x));
}

export function round(x, digits = 2) {
  if (x === null || !Number.isFinite(x)) return x;
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

export function sum(arr) {
  return arr.reduce((s, x) => s + x, 0);
}

export function mean(arr) {
  return arr.length ? sum(arr) / arr.length : null;
}

/** Percentile (0-100) with linear interpolation. Nulls count as +Infinity (no results is the worst outcome). */
export function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = arr.map((x) => (x === null ? Infinity : x)).sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  if (!Number.isFinite(sorted[lo]) || !Number.isFinite(sorted[hi])) return sorted[hi];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function median(arr) {
  return percentile(arr, 50);
}

/** Deep copy of plain JSON data (run state is always JSON-safe). */
export function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
