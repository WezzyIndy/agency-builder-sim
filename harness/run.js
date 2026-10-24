// harness/run.js
//
// Calibration harness CLI (spec 16).
//
//   node harness/run.js --business medspa|roofing|landscaping|cleaning|hvac|apparel|all [--n 1000] [--criteria all|campaign|mix|policy]
//
// Prints a pass/fail table and exits nonzero if any criterion fails.

import { campaignCriteria, mixCriteria, policyCriteria } from './criteria.js';
import { printTable } from './report.js';
import { hasContent, PLAYABLE_BUSINESSES, contentFor } from '../src/content/index.js';

function parseArgs(argv) {
  const args = { business: 'medspa', n: 1000, criteria: 'all', quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--business') args.business = argv[++i];
    else if (a === '--n') args.n = Number(argv[++i]);
    else if (a === '--criteria') args.criteria = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--self-test-fail') args.selfTestFail = true; // proves the exit code works
  }
  return args;
}

export function runHarness({ business, n, criteria, quiet, selfTestFail = false }) {
  const log = quiet ? () => {} : (m) => console.error(m);
  const rows = [];
  const businesses = business === 'all' ? PLAYABLE_BUSINESSES : [business];
  if (criteria === 'all' || criteria === 'campaign') {
    for (const b of businesses) {
      if (!hasContent(b)) throw new Error(`No playable content for ${b}; campaign criteria need it.`);
      log(`Campaign criteria: ${b}, N=${n} per cell`);
      const r = campaignCriteria(b, n, log);
      rows.push(...(businesses.length > 1 ? r.map((x) => ({ ...x, id: `${b}:${x.id}` })) : r));
    }
  }
  // The policy layer is med spa's (5.5).
  if (criteria === 'policy' || (criteria === 'all' && businesses.some((b) => contentFor(b).hasPolicyLayer))) rows.push(...policyCriteria());
  if (criteria === 'all' || criteria === 'mix') rows.push(...mixCriteria());
  if (selfTestFail) rows.push({ id: 'self-test', label: 'Deliberate failure (--self-test-fail)', value: 1, threshold: '0', pass: false });
  return rows;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const started = Date.now();
  const rows = runHarness(args);
  printTable(rows);
  const failed = rows.filter((r) => r.pass === false);
  console.log(`\n${rows.filter((r) => r.pass === true).length} passed, ${failed.length} failed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  process.exitCode = failed.length ? 1 : 0;
}
