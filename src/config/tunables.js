// src/config/tunables.js
//
// Every [DESIGN] value the calibration harness tunes (spec 19.4), in one
// place. These are game-design values, not real-world facts. Final values
// and the reasons for them are recorded in README "Calibration notes".

export const TUNABLES = {
  // Client economics (5.3)
  ltvWeight: 0.5,
  kRange: [0.5, 0.8],

  // Learning state (9.5). The cost multiplier is normalized by its value at the
  // reference progress (one ad set at the typical L1 budget), per KTD5.
  learning: { kCost: 0.3, kVar: 0.5, eventsToExit: 50, editResetPenalty: 0.15 },
  // Each ad set beyond max(1, floor(weekly / (10 x cost))) raises cost per result.
  fragmentationPenalty: 0.12,

  // Realism slider (9.8), index 1-5.
  realism: {
    weeklySd: [null, 0.06, 0.1, 0.15, 0.25, 0.35],
    marketSd: [null, 0.04, 0.07, 0.1, 0.14, 0.18],
    resonanceSd: [null, 0.02, 0.05, 0.08, 0.13, 0.22],
    // Hidden per-client affinity for lead sources and audience options.
    affinitySd: [null, 0.02, 0.05, 0.08, 0.15, 0.3],
    // Exponent on non-benchmark modifiers (cost and lead quality): best-practice edges
    // shrink as realism rises, so unconventional setups can win at realism 5.
    modifierWeight: [null, 1.0, 0.95, 0.9, 0.75, 0.55],
  },

  // Product of non-benchmark cost modifiers is clamped (9.6).
  clamp: [0.4, 2.5],

  // Setup and audience (7.1, 7.5): multipliers on cost per result.
  advantagePlusSetup: 0.97,
  audience: {
    controls: 0.97,
    controlsCorrupted: 1.15, // broad delivery amplifies a corrupted signal
    suggestionsEarly: 0.97, // weeks 1-2
    suggestions: 1.0,
    limited: 1.18,
  },

  // Lead source (9.3): close-rate multiplier and CPL multiplier.
  leadSource: {
    call: { close: 1.2, cpl: 1.3 },
    form: { close: 1.0, cpl: 1.0 },
    instantHigh: { close: 0.8, cpl: 0.91 },
    instantVolume: { close: 0.6, cpl: 0.7 },
    messaging: { close: 0.75, cpl: 0.85 },
  },
  // Booked-appointment event: fewer, better leads.
  scheduleEvent: { cpl: 2.2, close: 1.45 },
  // Qualified-leads goal (requires CRM feedback): costs more, quality improves weekly.
  qualifiedGoal: { cpl: 1.15, closeStep: 0.05, closeMaxBonus: 0.25 },

  // Objective / goal traps for a leads business.
  traps: {
    trafficCpc: 0.45, // cheap clicks
    trafficConv: 0.06, // near-zero true leads per click vs a lead-optimized set
    awarenessConv: 0.03,
    engagementConv: 0.08,
    salesNoPurchaseConv: 0.12,
  },
  // Workable-but-weaker objective/goal pairs (cost multipliers).
  weaker: { salesLeadEvent: 1.15, engagementLead: 1.2, trafficCalls: 1.1, conversationsGoal: 1.25 },

  // Tracking (9.4)
  tracking: {
    doubleFire: 2.2, // reported / true
    noCapi: 0.8,
    noCapiCvr: 0.93,
    callsNoTracking: 0.5,
    corruptCvrStep: 0.08, // CVR loss per week optimizing on a double-firing event
    corruptCvrFloor: 0.6,
    corruptClose: 0.85,
  },
  landingWeakCvr: 0.75,
  speedToLead: { fast: 1.1, average: 1.0, slow: 0.6, slowAdvised: 0.7 },
  seasonality: { offSeasonFirstHalf: 1.5, peak: 0.92 },

  // Creative fatigue (9.7)
  fatigue: { startAfterWeek: 3, ctrDecay: 0.9 },

  // Policy layer (5.5)
  policy: { prohibitedDisapproval: 0.8, beforeAfterDisapproval: 0.1, relationshipHit: -5 },

  // Satisfaction (13.3)
  // resultsExponent 2: a client paying twice the promised cost per booked lead is unhappy, not half-happy.
  satisfaction: { resultsWeight: 0.7, relationshipStart: 70, rampRelax: 1.5, resultsExponent: 2 },
  relationship: {
    honestBad: -2,
    honestGood: 1,
    spunNow: 3,
    spunSurface: -12,
    skipped: -6,
    disclosedDefect: 2,
  },

  // Failure states (13.5) [STATED approved]
  failure: { churnBelow: 40, churnWeeks: 2, budgetShare: 0.25, targetMiss: 0.5 },

  // Events (10.2)
  eventChancePerWeek: 0.45,
  junkLeadsRatio: 0.7,

  // Onboarding (6)
  onboardingHours: 6,

  // Agency hours per week [ASSUMPTION]
  hours: { base: 1.5, perAdSet: 0.5, perEdit: 0.5, perEvent: 0.5 },

  // Ads Manager Only client expectation [ASSUMPTION]
  expectation: { overOptimisticChance: 0.25, rampChance: 0.5, rampWeeks: 2 },

  // Hidden tracking defect base rates for any brief.
  defectRates: {
    doubleFire: 0.12,
    noCapi: 0.5,
    noCallTracking: 0.6,
    noCrm: 0.7,
    landingWeak: 0.2,
    slowSpeed: 0.12,
    dataRestricted: 0.08,
    missingPurchase: 0.12,
  },
};
