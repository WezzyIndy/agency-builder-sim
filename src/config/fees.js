// src/config/fees.js
//
// Agency fee config (spec 12). Published ranges come from agency pricing
// guides, a weak source (18.9).

/** [STATED 2026-10-24] Hybrid: $1,000/month retainer + 10% of ad spend. */
export const DEFAULT_FEE = { model: 'hybrid', retainer: 1000, pct: 0.1 };

/** [DESIGN, inside the sourced $1,000-5,000 range] */
export const AGENCY_MINIMUM = 1000;

/** [STATED 2026-10-24] editable in settings. */
export const DEFAULT_TARGET_HOURLY = 75;

/**
 * Client fee tolerance bands by monthly ad spend: [low, typical, high] monthly fee.
 * $1.5-3K spend -> $1,000-2,500; $5-15K -> $2,500-6,000 (18.9). The bands between are
 * interpolated [DESIGN].
 */
export const FEE_TOLERANCE_BANDS = [
  { maxSpend: 1500, range: [900, 1400, 2000] },
  { maxSpend: 3000, range: [1000, 1700, 2500] },
  { maxSpend: 5000, range: [1800, 2600, 4000] },
  { maxSpend: 15000, range: [2500, 4000, 6000] },
  { maxSpend: Infinity, range: [4000, 6000, 9000] },
];

/** Red flag "fee tolerance below the agency's minimum". */
export const LOW_FEE_TOLERANCE = [400, 600, 900];

export function monthlyFee(fee, monthlySpend) {
  if (fee.model === 'retainer') return fee.retainer;
  if (fee.model === 'percent') return fee.pct * monthlySpend;
  return fee.retainer + fee.pct * monthlySpend;
}
