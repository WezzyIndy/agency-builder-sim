// src/content/index.js
//
// Content registry by business: angles, client events, onboarding checks,
// debrief text, display terms, and the angles the harness's best-practice
// player runs (recommended).

import * as medspaAngles from './medspa/angles.js';
import * as medspaEvents from './medspa/events.js';
import * as medspaOnboarding from './medspa/onboarding.js';
import * as medspaDebrief from './medspa/debrief.js';
import * as roofing from './roofing/index.js';
import * as landscaping from './landscaping/index.js';
import * as cleaning from './cleaning/index.js';
import * as hvac from './hvac/index.js';
import * as apparel from './apparel/index.js';

const fromModule = (m) => ({
  angles: m.ANGLES,
  events: m.EVENTS,
  checks: m.CHECKS,
  naming: null,
  debrief: m.DEBRIEF,
  hasPolicyLayer: false,
  terms: m.TERMS,
  recommended: m.RECOMMENDED,
});

const CONTENT = {
  medspa: {
    angles: medspaAngles.ANGLES,
    events: medspaEvents.EVENTS,
    checks: medspaOnboarding.ONBOARDING_CHECKS,
    naming: medspaOnboarding.NAMING_OPTIONS,
    debrief: medspaDebrief,
    hasPolicyLayer: true,
    terms: {
      pitch: (b) => `A med spa in a ${b.locationSize}. They want more booked consultations.`,
      job: 'booked client',
      jobs: 'booked clients',
      firstJob: 'First visit (average ticket)',
      benchmarkCategory: 'Beauty & Personal Care',
    },
    recommended: { angles: ['expert_injectors', 'new_client_offer'], refresh: ['expert_injectors', 'before_after'] },
  },
  roofing: fromModule(roofing),
  landscaping: fromModule(landscaping),
  cleaning: fromModule(cleaning),
  hvac: fromModule(hvac),
  apparel: fromModule(apparel),
};

export const PLAYABLE_BUSINESSES = Object.keys(CONTENT);

export function contentFor(businessId) {
  const c = CONTENT[businessId];
  if (!c) throw new Error(`No playable content for ${businessId} yet`);
  return c;
}

export function hasContent(businessId) {
  return Boolean(CONTENT[businessId]);
}
