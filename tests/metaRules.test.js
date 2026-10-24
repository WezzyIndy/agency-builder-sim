// tests/metaRules.test.js
//
// Meta objective / location / goal table (7.3), restrictions, and the
// mapping from setup to simulation multipliers.

import test from 'node:test';
import assert from 'node:assert/strict';
import { goalOptions, eventOptions, validateAdSet, resolveLeadSetup, OBJECTIVES, needsEvent } from '../src/engine/metaRules.js';
import { createRun, applyDecision, tryDecision } from '../src/engine/run.js';
import { findSeed, websiteAdSet } from './helpers.js';

const open = { dataRestricted: false, crmFixed: false, sensitiveNames: false };

test('the five non-app objectives are present, with their conversion locations', () => {
  assert.deepEqual(Object.keys(OBJECTIVES), ['awareness', 'traffic', 'engagement', 'leads', 'sales']);
  assert.deepEqual(Object.keys(OBJECTIVES.leads.locations), ['website', 'website_calls', 'website_instant', 'instant_forms', 'messenger', 'instagram', 'instant_messenger', 'whatsapp', 'calls']);
});

test('instant forms offer only Leads and Qualified leads; Qualified needs CRM feedback', () => {
  const goals = goalOptions('leads', 'instant_forms', open);
  assert.deepEqual(goals.map((g) => g.id), ['leads', 'qualified_leads']);
  assert.equal(goals.find((g) => g.id === 'qualified_leads').available, false);
  assert.match(goals.find((g) => g.id === 'qualified_leads').reason, /CRM/);
  assert.equal(goalOptions('leads', 'instant_forms', { ...open, crmFixed: true }).find((g) => g.id === 'qualified_leads').available, true);
});

test('Covers AE4. A restricted data source greys out website Lead and Schedule events', () => {
  const restricted = { ...open, dataRestricted: true };
  const goals = goalOptions('leads', 'website', restricted);
  for (const g of goals) {
    assert.equal(g.available, false);
    assert.equal(g.reason, 'Restricted by data source category');
  }
  const events = eventOptions('sales', 'website', 'conversions', restricted);
  for (const id of ['lead', 'schedule']) assert.equal(events.find((e) => e.id === id).reason, 'Restricted by data source category');
  // Instant forms and calls still work.
  assert.equal(goalOptions('leads', 'instant_forms', restricted)[0].available, true);
  assert.equal(goalOptions('leads', 'calls', restricted)[0].available, true);
});

test('Covers AE4. Launching a website Lead ad set on a restricted brief is rejected', () => {
  const seed = findSeed((b) => b.hidden.defects.dataRestricted && !b.redFlag);
  const s = [{ type: 'accept' }, { type: 'finishOnboarding' }].reduce(applyDecision, createRun({ seed, businessId: 'medspa' }));
  const r = tryDecision(s, { type: 'launch', campaign: { setup: 'advantage', adSets: [websiteAdSet()] } });
  assert.match(r.error, /Restricted by data source category/);
});

test('website Leads goal needs an event; calls do not', () => {
  assert.equal(needsEvent('leads', 'website', 'leads'), true);
  assert.equal(needsEvent('leads', 'calls', 'calls'), false);
  assert.ok(validateAdSet({ ...websiteAdSet(), event: null }, open).includes('Pick a conversion event'));
});

test('sensitive names disable the Schedule custom conversion', () => {
  const evs = eventOptions('leads', 'website', 'leads', { ...open, sensitiveNames: true });
  assert.equal(evs.find((e) => e.id === 'schedule').available, false);
  assert.equal(evs.find((e) => e.id === 'lead').available, true);
});

test('setup mapping: traps, lead sources, and Sales without a purchase event', () => {
  assert.equal(resolveLeadSetup({ objective: 'traffic', location: 'website', goal: 'link_clicks' }).kind, 'trap');
  assert.equal(resolveLeadSetup({ objective: 'awareness', location: 'none', goal: 'reach' }).kind, 'trap');
  assert.equal(resolveLeadSetup({ objective: 'leads', location: 'calls', goal: 'calls' }).source, 'call');
  assert.equal(resolveLeadSetup({ objective: 'leads', location: 'instant_forms', goal: 'leads', formType: 'volume' }).source, 'instantVolume');
  const sales = resolveLeadSetup({ objective: 'sales', location: 'website', goal: 'conversions', event: 'purchase' });
  assert.equal(sales.kind, 'trap');
  assert.ok(sales.eventsPerLead < 1, 'no purchase event starves learning');
  const schedule = resolveLeadSetup({ objective: 'leads', location: 'website', goal: 'leads', event: 'schedule' });
  assert.ok(schedule.cpl > 2 && schedule.close > 1);
});
