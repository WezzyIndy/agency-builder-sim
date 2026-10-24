// src/engine/policy.js
//
// Med spa ad policy layer (spec 5.5, Meta portion). Every week each ad set's
// angles go through review:
//   prohibited flags (inferiority, personal attribute, timeframe promise): 80% disapproval
//   before/after: allowed, but 10% disapproval to mimic automated review errors
//   targeting under 18: always disapproved
// A disapproved ad set delivers nothing that week.

import { stream } from './rng.js';
import { TUNABLES } from '../config/tunables.js';
import { contentFor } from '../content/index.js';
import { PROHIBITED_FLAGS } from '../content/medspa/angles.js';

export function angleFlag(businessId, angleId) {
  const a = contentFor(businessId).angles.find((x) => x.id === angleId);
  return a ? a.policyFlag : 'none';
}

export function isProhibited(flag) {
  return PROHIBITED_FLAGS.includes(flag);
}

/** Policy review for one ad set in one week. Deterministic per (seed, week, ad set index). */
export function policyCheck(adSet, { seed, week, businessId }, adSetIndex) {
  if (!contentFor(businessId).hasPolicyLayer) return { disapproved: false, flags: [] };
  const rng = stream(seed, 'policy', week, adSetIndex);
  const flags = [];
  if (adSet.audience.minAge < 18) flags.push('under_18');
  for (const id of adSet.angles) {
    const flag = angleFlag(businessId, id);
    // Every angle gets its own review roll each week, flagged or not, so rolls stay aligned.
    const roll = rng.next();
    if (isProhibited(flag) && roll < TUNABLES.policy.prohibitedDisapproval) flags.push(flag);
    else if (flag === 'before_after' && roll < TUNABLES.policy.beforeAfterDisapproval) flags.push(flag);
  }
  return { disapproved: flags.length > 0, flags };
}
