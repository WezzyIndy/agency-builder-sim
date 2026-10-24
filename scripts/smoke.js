// Quick per-business summary: median true cost, failure rate, median scores per policy.
import { playRun } from '../harness/play.js';
import { median } from '../src/engine/math.js';
const businesses = process.argv[2] ? process.argv[2].split(',') : ['roofing', 'landscaping', 'cleaning', 'hvac', 'apparel', 'medspa'];
const n = Number(process.argv[3] || 60);
const cls = process.argv[4] || 'achievable';
const realism = Number(process.argv[5] || 3);
for (const b of businesses) {
  for (const policy of ['bestPractice', 'naive', 'random']) {
    const runs = [];
    for (let i = 0; i < n; i++) runs.push(playRun(policy, { seed: 300000 + i, businessId: b, level: 1, realism, forceClass: cls }));
    const fail = runs.filter((s) => ['churn', 'budget_failure', 'target_failure'].includes(s.final.endReason)).length / n;
    const reasons = {};
    for (const s of runs) reasons[s.final.endReason] = (reasons[s.final.endReason] || 0) + 1;
    const m = (f) => median(runs.map(f));
    console.log(`${b.padEnd(12)} ${policy.padEnd(13)} trueCost ${m((s) => s.final.totals?.trueCpl ?? null)?.toFixed(1)} qa ${m((s) => s.final.totals?.qaCpl ?? null)?.toFixed(1)} fail ${(fail * 100).toFixed(0)}% perf ${m((s) => s.final.performance).toFixed(0)} sat ${m((s) => s.final.satisfaction).toFixed(0)} bp ${m((s) => s.final.bestPractice).toFixed(0)} ${JSON.stringify(reasons)}`);
  }
}
