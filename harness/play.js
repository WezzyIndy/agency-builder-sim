// harness/play.js
//
// Plays one run to completion with a policy. Invalid policy decisions are
// treated as bugs and thrown, except for the random policy, whose invalid
// picks are skipped.

import { createRun, applyDecision, tryDecision } from '../src/engine/run.js';
import { stream } from '../src/engine/rng.js';
import { POLICIES } from './policies.js';

export function playRun(policyName, options) {
  const policy = POLICIES[policyName];
  const rng = stream(options.seed, 'policy-choices', policyName);
  let state = createRun(options);
  for (let step = 0; step < 500 && state.status !== 'final'; step++) {
    const decisions = policy(state, rng);
    if (!decisions.length) throw new Error(`${policyName} produced no decision in ${state.status}`);
    for (const d of decisions) {
      if (state.status === 'final') break;
      if (policyName === 'random') {
        const r = tryDecision(state, d);
        state = r.state;
        // A rejected endWeek would loop forever; fall back to an honest update.
        if (!r.ok && d.type === 'endWeek') state = applyDecision(state, { type: 'endWeek', update: 'honest' });
      } else {
        state = applyDecision(state, d);
      }
    }
  }
  if (state.status !== 'final') throw new Error(`${policyName} run did not finish`);
  return state;
}
