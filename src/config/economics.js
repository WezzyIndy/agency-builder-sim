// src/config/economics.js
//
// Client economics generator ranges (spec 5.1), as [low, typical, high]
// triangular points. Close rates confirmed by the owner for v1 (2026-10-24).
// twelveMonth: null means "= first job" (no repeat revenue modeled in v1).

export const ECONOMICS = {
  hvac: {
    label: 'HVAC',
    pools: {
      service: {
        firstJob: [200, 450, 720],
        twelveMonth: [450, 540, 1160],
        closeRate: [0.2, 0.3, 0.45],
        margin: [0.5, 0.58, 0.65],
      },
      replacement: {
        firstJob: [7500, 12000, 22000],
        twelveMonth: null,
        closeRate: [0.1, 0.25, 0.4],
        margin: [0.4, 0.48, 0.55],
      },
    },
    // [DESIGN] share of leads that are service (vs replacement).
    serviceShare: [0.5, 0.7, 0.9],
  },
  roofing: {
    label: 'Roofing',
    firstJob: [8000, 20000, 30000],
    twelveMonth: null,
    closeRate: [0.1, 0.25, 0.45],
    margin: [0.2, 0.3, 0.45],
  },
  landscaping: {
    label: 'Landscaping',
    firstJob: [1250, 3600, 10000],
    twelveMonth: null,
    closeRate: [0.2, 0.35, 0.6],
    margin: [0.3, 0.45, 0.6],
  },
  cleaning: {
    label: 'House cleaning',
    firstJob: [150, 200, 256],
    twelveMonth: [200, 1500, 4550],
    closeRate: [0.2, 0.3, 0.4],
    margin: [0.5, 0.55, 0.65],
  },
  medspa: {
    label: 'Med spa',
    firstJob: [216, 400, 484],
    twelveMonth: [1800, 3000, 5200],
    closeRate: [0.15, 0.3, 0.5],
    margin: [0.5, 0.6, 0.7],
  },
  apparel: {
    label: 'Boutique apparel',
    aov: [60, 85, 150],
    margin: [0.45, 0.6, 0.67],
  },
};

/** Monthly ad budget range per level (spec 3), [low, typical, high]. */
export const LEVEL_BUDGETS = {
  1: [1000, 2000, 3000],
  2: [3000, 6000, 10000],
};

export const WEEKS_PER_MONTH = 52 / 12;
