// src/ui/format.js
//
// Display formatting. Null cost metrics read "no results", never NaN.

export function money(x, digits = 0) {
  if (x === null || x === undefined || !Number.isFinite(x)) return 'no results';
  const sign = x < 0 ? '-' : '';
  return `${sign}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export const cost = (x) => money(x, 2);

export function pct(x, digits = 0) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '-';
  return `${(x * 100).toFixed(digits)}%`;
}

export function num(x, digits = 0) {
  if (x === null || x === undefined || !Number.isFinite(x)) return '-';
  return x.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function score(x) {
  return x === null || x === undefined || !Number.isFinite(x) ? '-' : String(Math.round(x));
}

export function hours(x) {
  return `${Number.isInteger(x) ? x : x.toFixed(1)} h`;
}
