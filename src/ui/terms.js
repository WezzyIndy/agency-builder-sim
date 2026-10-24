// src/ui/terms.js
//
// Display words for a run's business: what a result is called (lead or
// purchase), what a closed sale is called (booked client, signed roof,
// order), and the benchmark category label.

import { contentFor } from '../content/index.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function termsFor(run) {
  const t = contentFor(run.businessId).terms;
  const sales = run.brief.goal === 'sales';
  return {
    ...t,
    sales,
    pooled: Boolean(run.brief.econ.pools),
    result: sales ? 'purchase' : 'lead',
    results: sales ? 'purchases' : 'leads',
    Results: sales ? 'Purchases' : 'Leads',
    costPer: sales ? 'cost per purchase' : 'cost per lead',
    CostPer: sales ? 'Cost per purchase' : 'Cost per lead',
    Job: cap(t.job),
    Jobs: cap(t.jobs),
  };
}

/** Short pitch for each business on the picker. */
export const BUSINESS_BLURBS = {
  medspa: 'Booked consultations. Watch Meta\'s health and wellness ad policies.',
  roofing: 'Big-ticket roof replacements. Long sales cycle, storm-driven demand.',
  landscaping: 'Design-and-build projects. Seasonal, and cheap mowing leads are a trap.',
  cleaning: 'Recurring cleaning clients on thin margins. Many briefs are hard.',
  hvac: 'Service calls and system replacements. The lead mix is everything.',
  apparel: 'An online boutique. Sales objective, purchase events, thin margins.',
};
