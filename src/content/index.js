// src/content/index.js
//
// Content registry by business. Only med spa has playable content in M1.

import * as medspaAngles from './medspa/angles.js';
import * as medspaEvents from './medspa/events.js';
import * as medspaOnboarding from './medspa/onboarding.js';
import * as medspaDebrief from './medspa/debrief.js';

const CONTENT = {
  medspa: {
    angles: medspaAngles.ANGLES,
    events: medspaEvents.EVENTS,
    checks: medspaOnboarding.ONBOARDING_CHECKS,
    naming: medspaOnboarding.NAMING_OPTIONS,
    debrief: medspaDebrief,
    hasPolicyLayer: true,
  },
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
