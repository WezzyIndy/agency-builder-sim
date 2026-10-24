// src/config/benchmarks.js
//
// Published ad benchmarks (spec Sections 18.1-18.4), stored as anchors only.
// Non-anchor metrics (CVR, CPC, CPM) are derived at runtime by
// src/engine/benchmarks.js using the spec 9.1 rules: published medians from
// different datasets are never multiplied into each other.
//
// Each metric is { typical, sourced?: [min, max] }. Where no sourced range
// exists, the engine defaults min/max to +/-30% of typical (KTD6).
// Rates are fractions (2.14% -> 0.0214). Money is USD.

export const META_LEADS = {
  // WordStream/LocaliQ 2026 via Digital Applied. Medians. Small sample (452 lead campaigns).
  all: { ctr: { typical: 0.027 }, cpc: { typical: 1.8 }, cpl: { typical: 27.39 } },
  home: {
    ctr: { typical: 0.0214 },
    cpc: { typical: 2.18 },
    cpl: { typical: 42.95, sourced: [24.29, 42.95] },
  },
  beauty: {
    ctr: { typical: 0.0135 },
    cpc: { typical: 2.97 },
    cpl: { typical: 50.91, sourced: [42.1, 51.42] },
  },
  personalServices: { ctr: { typical: 0.0224 }, cpc: { typical: 1.62 }, cpl: { typical: 38.09 } },
  // [DESIGN] HVAC replacement estimate requests: Home x 2.5 on CPL only; CPC and CTR stay at Home
  // values so derived CVR falls. Anchored on the weak published $80-150 range (18.3).
  hvacReplacement: {
    ctr: { typical: 0.0214 },
    cpc: { typical: 2.18 },
    cpl: { typical: 107, sourced: [80, 150] },
  },
};

export const META_ECOMM = {
  // Triple Whale, 40,000+ brands, Aug 2025 - Jul 2026, via Digital Applied. Medians.
  all: { cpm: { typical: 15.06 }, ctr: { typical: 0.0239 }, cpa: { typical: 38.99 }, roas: { typical: 1.88 } },
  lifestyleBoutique: {
    cpm: { typical: 13.25 },
    ctr: { typical: 0.0244 },
    cpa: { typical: 31.16, sourced: [31.16, 36.98] },
    roas: { typical: 2.04 },
  },
  apparel: {
    cpm: { typical: 13.25 },
    ctr: { typical: 0.0244, sourced: [0.0225, 0.0244] },
    cpa: { typical: 36.98, sourced: [36.76, 36.98] },
    roas: { typical: 2.24 },
  },
  beauty: { cpm: { typical: 18.8 }, ctr: { typical: 0.0246 }, cpa: { typical: 39.31 }, roas: { typical: 1.54 } },
  homeGarden: { cpm: { typical: 14.67 }, ctr: { typical: 0.0238 }, cpa: { typical: 47.93 }, roas: { typical: 2.25 } },
};

export const SEARCH_LEADS = {
  // WordStream/LocaliQ 2026, 13,000+ US campaigns.
  all: { ctr: { typical: 0.0664 }, cpc: { typical: 5.42 }, cpl: { typical: 66.69 } },
  home: { ctr: { typical: 0.0647 }, cpc: { typical: 8.33 }, cpl: { typical: 90.92, sourced: [90.92, 91] } },
  personalServices: { ctr: { typical: 0.0716 }, cpc: { typical: 7.17 }, cpl: { typical: 54.6 } },
  // [ASSUMPTION] PPC Chief roofing CPC $10.25; CPL = Home CPL x (10.25 / 8.33) [DESIGN].
  roofing: { ctr: { typical: 0.0647 }, cpc: { typical: 10.25 }, cpl: { typical: 111.88 } },
  // [DESIGN] Home x 2.5 on CPL; no source for Search replacement leads.
  hvacReplacement: { ctr: { typical: 0.0647 }, cpc: { typical: 8.33 }, cpl: { typical: 227.3 } },
};

/**
 * Business -> benchmark category per channel (spec 5.2). HVAC has two lead
 * pools; the brief's service share blends them. Boutique apparel is Meta-only.
 */
export const BUSINESS_BENCHMARKS = {
  hvac: {
    goal: 'leads',
    meta: { service: 'home', replacement: 'hvacReplacement' },
    search: { service: 'home', replacement: 'hvacReplacement' },
  },
  roofing: { goal: 'leads', meta: 'home', search: 'roofing' },
  landscaping: { goal: 'leads', meta: 'home', search: 'home' },
  cleaning: { goal: 'leads', meta: 'home', search: 'home' },
  medspa: { goal: 'leads', meta: 'beauty', search: 'personalServices' },
  apparel: { goal: 'sales', meta: 'lifestyleBoutique', search: null },
};
