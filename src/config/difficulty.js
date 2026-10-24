// src/config/difficulty.js
//
// Per-business difficulty (spec 5.4). Classes are achievable / hard /
// unviable. Hard and unviable briefs come from economics where the natural
// mix allows, otherwise from complications (hard) or a client red flag
// (unviable).

export const CLASS_BANDS = {
  // ratio = target ad cost / benchmark typical cost
  achievable: 0.9, // ratio >= 0.9
  hard: 0.6, // 0.6 <= ratio < 0.9; below 0.6 is unviable
};

export const TARGET_MIX = {
  roofing: { achievable: 0.7, hard: 0.2, unviable: 0.1 },
  landscaping: { achievable: 0.7, hard: 0.2, unviable: 0.1 },
  hvac: { achievable: 0.65, hard: 0.25, unviable: 0.1 },
  medspa: { achievable: 0.7, hard: 0.2, unviable: 0.1 },
  cleaning: { achievable: 0.6, hard: 0.25, unviable: 0.15 },
  apparel: { achievable: 0.45, hard: 0.35, unviable: 0.2 },
};

/** Complications applicable per business. Hard-by-complication briefs draw 2. */
export const COMPLICATIONS = {
  common: ['tracking_critical', 'slow_speed', 'off_season', 'low_budget', 'landing_weak'],
  hvac: ['service_heavy'],
  medspa: ['data_restricted'],
  // Ecomm has no speed-to-lead.
  excludeFor: { apparel: ['slow_speed'] },
};

/** Client red flags. Each unviable-by-red-flag brief carries exactly one. */
export const RED_FLAGS = ['guarantee', 'short_funding', 'no_access', 'no_capacity', 'fee_low'];

/** Natural mix share below which a class comes from levers instead of resampling (5.4 step 3). */
export const NATURAL_SHARE_MIN = 0.02;
export const MAX_ECONOMIC_DRAWS = 200;
