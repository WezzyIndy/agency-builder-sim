// tests/benchmarks.test.js
//
// Reproduces the spec 18.6 derived-values table from the stored anchors.

import test from 'node:test';
import assert from 'node:assert/strict';
import { metaLeads, metaEcomm, searchLeads, benchmarkFor, typicalCost, metricRange } from '../src/engine/benchmarks.js';
import { META_LEADS, META_ECOMM, SEARCH_LEADS, BUSINESS_BENCHMARKS } from '../src/config/benchmarks.js';

const pct = (x) => Math.round(x * 10000) / 100;
const usd = (x) => Math.round(x * 100) / 100;

test('Meta leads derived CVR and display CPM match 18.6', () => {
  assert.equal(pct(metaLeads('home').cvr), 5.08);
  assert.equal(usd(metaLeads('home').cpmDisplay), 46.65);
  assert.equal(pct(metaLeads('beauty').cvr), 5.83);
  assert.equal(usd(metaLeads('beauty').cpmDisplay), 40.1);
  assert.equal(pct(metaLeads('personalServices').cvr), 4.25);
  assert.equal(pct(metaLeads('hvacReplacement').cvr), 2.04);
});

test('HVAC replacement keeps Home CPC and CTR', () => {
  const r = metaLeads('hvacReplacement');
  const h = metaLeads('home');
  assert.equal(r.cpl, 107);
  assert.equal(r.cpc, h.cpc);
  assert.equal(r.ctr, h.ctr);
});

test('Meta ecomm derived CVR and CPC match 18.6', () => {
  const lb = metaEcomm('lifestyleBoutique');
  assert.equal(pct(lb.cvr), 1.74);
  assert.equal(usd(lb.cpc), 0.54);
  assert.equal(usd(lb.impliedAov), 63.57);
  assert.equal(pct(metaEcomm('apparel').cvr), 1.47);
});

test('Search derived CVR matches 18.6', () => {
  assert.equal(pct(searchLeads('home').cvr), 9.16);
  assert.equal(pct(searchLeads('hvacReplacement').cvr), 3.66);
  assert.equal(pct(searchLeads('personalServices').cvr), 13.13);
});

test('every business maps to existing categories', () => {
  for (const id of Object.keys(BUSINESS_BENCHMARKS)) {
    assert.ok(benchmarkFor(id, 'meta'), `${id} meta`);
  }
  assert.equal(benchmarkFor('apparel', 'search'), null);
  assert.ok(benchmarkFor('hvac', 'search').replacement);
});

test('HVAC blended typical CPL at 70% service matches the 5.3 table basis', () => {
  assert.equal(usd(typicalCost('hvac', 'meta', 0.7)), 62.17);
});

test('every stored metric has min <= typical <= max', () => {
  for (const table of [META_LEADS, META_ECOMM, SEARCH_LEADS]) {
    for (const [cat, metrics] of Object.entries(table)) {
      for (const [name, m] of Object.entries(metrics)) {
        const r = metricRange(m);
        assert.ok(r.min <= r.typical && r.typical <= r.max, `${cat}.${name}`);
      }
    }
  }
});
