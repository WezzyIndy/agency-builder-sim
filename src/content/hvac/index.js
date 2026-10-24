// src/content/hvac/index.js
//
// HVAC: two lead pools (spec 5.1, 9.2). Service leads (tune-ups, repairs)
// are cheap and worth ~$86 each; replacement leads cost ~2.5x more and are
// worth ~$1,440. Close rates barely differ; job value differs ~25x. Each
// angle carries mix: a multiplier on the odds that a lead is a replacement.
// The lesson is mix, not close rate: a cheap tune-up campaign can look great
// in the report and earn the client almost nothing.

import { leadChecks } from '../shared/checks.js';
import { commonEvents, leadAutoEvents, redFlagEvents } from '../shared/events.js';
import { leadDriverText, HONEST_LIMIT, FINAL_LINES } from '../shared/debrief.js';

export const TERMS = {
  pitch: (b) => `A heating and air company in a ${b.locationSize}. They want more system replacement jobs, and they take service calls too.`,
  job: 'job',
  jobs: 'jobs',
  firstJob: 'Average job',
  benchmarkCategory: 'Home & Home Improvement',
};

export const ANGLES = [
  {
    id: 'trusted_local',
    title: 'Local and upfront',
    copy: 'Family-owned since 1998. Upfront pricing, no surprises.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.02, limited: 0.95 },
    mix: 1.1,
    note: 'Trust matters most on big-ticket work. A slight lean toward replacement buyers.',
  },
  {
    id: 'high_bills',
    title: 'Energy bills',
    copy: 'Energy bills climbing? An old system could be costing you $50+ a month.',
    policyFlag: 'none',
    resonance: { controls: 1.0, suggestions: 1.0, limited: 0.94 },
    mix: 1.8,
    note: 'Speaks to owners of aging systems, who are the replacement buyers.',
  },
  {
    id: 'financing',
    title: 'Financing',
    copy: 'A new AC system from $99/month. 0% financing and a free in-home estimate.',
    policyFlag: 'none',
    resonance: { controls: 0.97, suggestions: 0.98, limited: 0.92 },
    mix: 2.6,
    note: 'Pulls replacement estimates hard. Fewer leads, each worth far more.',
  },
  {
    id: 'tune_up',
    title: 'Tune-up special',
    copy: '$79 AC tune-up special. Beat the summer rush.',
    policyFlag: 'none',
    resonance: { controls: 1.08, suggestions: 1.08, limited: 1.0 },
    mix: 0.35,
    note: 'The cheapest leads in the account, almost all service calls. The report looks great; the client\'s revenue doesn\'t.',
  },
  {
    id: 'emergency',
    title: 'Same-day repair',
    copy: 'No cool air? Same-day repair, 24/7.',
    policyFlag: 'none',
    resonance: { controls: 1.04, suggestions: 1.04, limited: 0.97 },
    mix: 0.8,
    note: 'Urgent repair calls. Some become replacements when the system is too old to fix.',
  },
];

export const RECOMMENDED = { angles: ['trusted_local', 'high_bills'], refresh: ['high_bills', 'financing'] };

export const CHECKS = leadChecks({
  booking: 'service request',
  bookingSystem: 'The field-service software',
  page: 'schedule-service page',
  offer: 'free replacement estimate',
  callback: 'Dispatch',
});

const SPECIFIC = [
  {
    id: 'all_tune_ups',
    trigger: { kind: 'auto', when: 'serviceHeavy' },
    title: '"I need replacements"',
    prompt: '"All these leads want a $79 tune-up. I need replacement jobs, not more tune-ups."',
    responses: [
      {
        id: 'shift',
        text: 'Shift the messaging toward replacement buyers: energy bills and financing.',
        score: 1,
        relationship: 2,
        effects: [{ type: 'setAngles', angles: ['high_bills', 'financing'] }],
        explanation: 'The messaging decides the mix. Replacement leads cost more each, but one replacement is worth about 17 tune-ups.',
      },
      {
        id: 'split',
        text: 'Add a separate replacement-only ad set.',
        score: 0.3,
        relationship: 2,
        effects: [{ type: 'addAdSet', kind: 'service', angles: ['financing'] }],
        explanation: 'A replacement-only ad set never gets enough signal on this budget, and it starves the main one. One ad set with replacement-leaning messaging beats splitting by job type.',
      },
      {
        id: 'patience',
        text: 'Tell them tune-ups turn into replacements eventually.',
        score: 0.3,
        relationship: -4,
        effects: [],
        explanation: 'Some do, years later. The client needs replacement revenue now, and the messaging is what\'s holding it back.',
      },
    ],
  },
  {
    id: 'heat_wave',
    trigger: { kind: 'random', minWeek: 2 },
    title: 'Heat wave',
    prompt: '"It\'s going to be 100 degrees all week. Systems are failing all over town."',
    responses: [
      {
        id: 'steady',
        text: 'Keep the campaign steady. Demand will come to you.',
        score: 1,
        relationship: 0,
        effects: [{ type: 'demand', mult: 0.85, weeks: 2 }],
        explanation: 'Failing systems drive both repairs and replacements. A stable campaign captures it without a learning reset.',
      },
      {
        id: 'emergency',
        text: 'Swap to the same-day repair angle for the heat wave.',
        score: 0.5,
        relationship: 1,
        effects: [{ type: 'demand', mult: 0.85, weeks: 2 }, { type: 'setAngles', angles: ['emergency'] }],
        explanation: 'More calls, but mostly repairs, and the angle change resets learning. The replacement buyers were already coming.',
      },
      {
        id: 'boost',
        text: 'Ask for 20% more budget for two weeks.',
        score: 0.7,
        relationship: 0,
        effects: [{ type: 'demand', mult: 0.85, weeks: 2 }, { type: 'budgetBoost', factor: 1.2, weeks: 2 }],
        explanation: 'Reasonable when demand spikes, but a budget change is still a significant edit.',
      },
    ],
  },
  {
    id: 'replacement_quote_lost',
    trigger: { kind: 'random', minWeek: 3 },
    title: '"They went with someone cheaper"',
    prompt: '"We lost two replacement quotes to a company that came in $2,000 lower. Should we drop our prices?"',
    responses: [
      {
        id: 'financing',
        text: 'Keep the price. Lead with financing and warranty so the monthly cost is the comparison, not the sticker.',
        score: 1,
        relationship: 1,
        effects: [],
        explanation: 'Replacement buyers compare monthly payments and warranties. Cutting price on a $12,000 job gives away the margin the business target depends on.',
      },
      {
        id: 'cut',
        text: 'Drop prices 15% to win more quotes.',
        score: 0.3,
        relationship: 1,
        effects: [{ type: 'marginCut', mult: 0.85 }],
        explanation: 'Winning more quotes at a thinner margin can leave the client with less profit than before.',
      },
      {
        id: 'ignore',
        text: 'Say losing some quotes is normal and move on.',
        score: 0.5,
        relationship: -2,
        effects: [],
        explanation: 'True, but the client wanted a plan. Losing quotes on price is a pitch to answer, not to dismiss.',
      },
    ],
  },
];

const T = {
  busy: '"Every tech is booked this week. Can you pause everything?"',
  booking: 'jobs',
  competitor: '"A competitor is running $500 off any new system. Should we match it?"',
  differentiate: 'Lean on financing, warranty, and upfront pricing. Don\'t give away margin on a $12,000 job.',
  bookingSystem: 'The field-service software',
  capacity: '"We\'re booked six weeks out for installs. We can\'t take more replacement jobs."',
};

export const EVENTS = [...commonEvents(T), ...leadAutoEvents(T), ...SPECIFIC, ...redFlagEvents(T)];

export const DEBRIEF = {
  DRIVER_TEXT: {
    ...leadDriverText({ jobs: 'jobs', offSeason: 'Shoulder season. With mild weather, fewer systems fail and fewer homeowners shop for replacements.' }),
    leadMix: {
      hurt: 'The leads were mostly low-value service calls. Cheap per lead, but a $79 tune-up doesn\'t pay like a replacement.',
      stronger: 'Lean the messaging toward replacement buyers: energy bills, system age, financing. Keep one ad set, and make sure calls are tracked.',
      helped: 'The messaging pulled replacement estimates, each worth many times a service call.',
    },
  },
  POLICY_REWRITES: {},
  HONEST_LIMIT,
  FINAL_LINES,
};
