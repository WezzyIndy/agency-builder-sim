// src/engine/benchmarks.js
//
// Runtime derivation of non-anchor metrics (spec 9.1 / 18.6):
//   Meta leads:  CVR = CPC / CPL; CPM is display only (CPC x CTR x 1000)
//   Meta ecomm:  CPC = CPM / (CTR x 1000); CVR = CPC / CPA
//   Search:      CVR = CPC / CPL

import { META_LEADS, META_ECOMM, SEARCH_LEADS, BUSINESS_BENCHMARKS } from '../config/benchmarks.js';

const DEFAULT_SPREAD = 0.3;

/** { min, typical, max } for one stored metric. Missing edges default to +/-30% (KTD6). */
export function metricRange(metric) {
  const t = metric.typical;
  const min = metric.sourced ? Math.min(metric.sourced[0], t) : t * (1 - DEFAULT_SPREAD);
  const max = metric.sourced ? Math.max(metric.sourced[1], t) : t * (1 + DEFAULT_SPREAD);
  return { min, typical: t, max };
}

/** Harness pass band for a cost metric: the sourced range widened to at least 0.7x-1.4x typical (KTD6). */
export function harnessBand(metric) {
  const r = metricRange(metric);
  return [Math.min(r.min, 0.7 * r.typical), Math.max(r.max, 1.4 * r.typical)];
}

export function metaLeads(category) {
  const b = META_LEADS[category];
  if (!b) throw new Error(`Unknown Meta leads category: ${category}`);
  const ctr = b.ctr.typical;
  const cpc = b.cpc.typical;
  const cpl = b.cpl.typical;
  return {
    channel: 'meta',
    kind: 'leads',
    category,
    ctr,
    cpc,
    cpl,
    cvr: cpc / cpl,
    cpmDisplay: cpc * ctr * 1000,
    cplRange: metricRange(b.cpl),
    cplBand: harnessBand(b.cpl),
  };
}

export function metaEcomm(category) {
  const b = META_ECOMM[category];
  if (!b) throw new Error(`Unknown Meta ecomm category: ${category}`);
  const cpm = b.cpm.typical;
  const ctr = b.ctr.typical;
  const cpa = b.cpa.typical;
  const cpc = cpm / (ctr * 1000);
  return {
    channel: 'meta',
    kind: 'sales',
    category,
    cpm,
    ctr,
    cpa,
    roas: b.roas.typical,
    cpc,
    cvr: cpc / cpa,
    impliedAov: b.roas.typical * cpa,
    cpaRange: metricRange(b.cpa),
    cpaBand: harnessBand(b.cpa),
  };
}

export function searchLeads(category) {
  const b = SEARCH_LEADS[category];
  if (!b) throw new Error(`Unknown Search category: ${category}`);
  return {
    channel: 'search',
    kind: 'leads',
    category,
    ctr: b.ctr.typical,
    cpc: b.cpc.typical,
    cpl: b.cpl.typical,
    cvr: b.cpc.typical / b.cpl.typical,
    cplRange: metricRange(b.cpl),
    cplBand: harnessBand(b.cpl),
  };
}

/** Benchmark for a business on a channel. HVAC returns { service, replacement }. */
export function benchmarkFor(businessId, channel) {
  const map = BUSINESS_BENCHMARKS[businessId];
  if (!map) throw new Error(`Unknown business: ${businessId}`);
  const cat = map[channel];
  if (cat === null || cat === undefined) return null;
  if (map.goal === 'sales') return channel === 'meta' ? metaEcomm(cat) : null;
  const derive = channel === 'meta' ? metaLeads : searchLeads;
  if (typeof cat === 'object') return { service: derive(cat.service), replacement: derive(cat.replacement) };
  return derive(cat);
}

/**
 * Benchmark typical cost per result used to classify a brief: CPL for lead
 * businesses (HVAC blended by service share), CPA for ecomm.
 */
export function typicalCost(businessId, channel, serviceShare = 0.7) {
  const b = benchmarkFor(businessId, channel);
  if (!b) return null;
  if (b.kind === 'sales') return b.cpa;
  if (b.service) return serviceShare * b.service.cpl + (1 - serviceShare) * b.replacement.cpl;
  return b.cpl;
}

export function channelsFor(businessId, level) {
  const map = BUSINESS_BENCHMARKS[businessId];
  const channels = ['meta'];
  if (level >= 2 && map.search) channels.push('search');
  return channels;
}

const blendRange = (a, b, s) => ({ min: s * a.min + (1 - s) * b.min, typical: s * a.typical + (1 - s) * b.typical, max: s * a.max + (1 - s) * b.max });

/**
 * The Meta cost-per-result benchmark a business is simulated and judged
 * against: CPL for leads (HVAC blends its two pools by service share), CPA
 * for ecomm. range is the published range; band is the harness pass band.
 */
export function metaCostBench(businessId, serviceShare = 0.7) {
  const b = benchmarkFor(businessId, 'meta');
  if (b.kind === 'sales') return { kind: 'sales', cost: b.cpa, ctr: b.ctr, cpc: b.cpc, range: b.cpaRange, band: b.cpaBand, category: b.category };
  if (b.service) {
    const sv = b.service;
    const rp = b.replacement;
    const s = serviceShare;
    const range = blendRange(sv.cplRange, rp.cplRange, s);
    return {
      kind: 'leads',
      cost: s * sv.cpl + (1 - s) * rp.cpl,
      ctr: sv.ctr,
      cpc: sv.cpc,
      range,
      band: [s * sv.cplBand[0] + (1 - s) * rp.cplBand[0], s * sv.cplBand[1] + (1 - s) * rp.cplBand[1]],
      pools: { service: sv.cpl, replacement: rp.cpl },
      category: sv.category,
    };
  }
  return { kind: 'leads', cost: b.cpl, ctr: b.ctr, cpc: b.cpc, range: b.cplRange, band: b.cplBand, category: b.category };
}
