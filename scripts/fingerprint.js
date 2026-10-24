// Prints a hash of final outcomes for a fixed set of med spa runs (refactor guard).
import { playRun } from '../harness/play.js';
import { hashString } from '../src/engine/rng.js';
const business = process.argv[2] || 'medspa';
const parts = [];
for (const policy of ['bestPractice', 'naive', 'random']) {
  for (const realism of [1, 3, 5]) {
    for (let i = 0; i < 40; i++) {
      const s = playRun(policy, { seed: 5000 + i, businessId: business, level: 1, realism });
      const f = s.final;
      parts.push([policy, realism, i, f.endReason, f.adScore.toFixed(6), f.performance.toFixed(6), f.satisfaction.toFixed(6), s.weeks.map((w) => `${w.totals.trueLeads}/${w.totals.jobs}`).join(',')].join('|'));
    }
  }
}
console.log(hashString(parts.join('\n')), parts.length);
