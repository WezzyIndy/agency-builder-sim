// src/content/roofing/index.js
//
// Roofing (replacement) content. High-ticket, low close rate, long sales
// cycle. The economics leave room; the difficulty is lead quality, patience,
// and storm-driven demand swings. Angle fields as in src/content/medspa/angles.js,
// plus close: an optional lead-quality multiplier (bargain hunters close less).

import { leadChecks } from '../shared/checks.js';
import { commonEvents, leadAutoEvents, redFlagEvents } from '../shared/events.js';
import { leadDriverText, HONEST_LIMIT, FINAL_LINES } from '../shared/debrief.js';

export const TERMS = {
  pitch: (b) => `A roofing contractor in a ${b.locationSize}. They want more roof replacement estimates.`,
  job: 'signed roof',
  jobs: 'signed roofs',
  firstJob: 'Average roof replacement',
  benchmarkCategory: 'Home & Home Improvement',
};

export const ANGLES = [
  {
    id: 'local_trust',
    title: 'Local and trusted',
    copy: 'Family-owned, 400+ roofs in town. Licensed, insured, and 5-star rated.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.02, limited: 0.95 },
    note: 'A roof is a $20,000 trust decision. Credentials and local proof pull serious homeowners.',
  },
  {
    id: 'financing',
    title: 'Financing',
    copy: 'A new roof from $189/month. 0% financing for 18 months.',
    policyFlag: 'none',
    resonance: { controls: 1.0, suggestions: 1.01, limited: 0.94 },
    note: 'Turns a big number into a monthly one. Brings in homeowners who need the roof but not the lump sum.',
  },
  {
    id: 'storm_damage',
    title: 'Storm damage',
    copy: 'Storm damage? Free roof inspection, and we work with your insurance.',
    policyFlag: 'none',
    resonance: { controls: 1.03, suggestions: 1.03, limited: 0.96 },
    note: 'Strong after hail or wind. Insurance-backed jobs close well, but the angle goes stale in calm weather.',
  },
  {
    id: 'lowest_price',
    title: 'Lowest price',
    copy: 'Roofs from $4,999! Lowest price guaranteed.',
    policyFlag: 'none',
    resonance: { controls: 1.08, suggestions: 1.08, limited: 1.0 },
    close: 0.7,
    note: 'Cheap leads, wrong buyers. Price shoppers collect five quotes and sign the lowest, and the client can\'t do a real roof for $4,999.',
  },
  {
    id: 'urgency',
    title: 'Limited slots',
    copy: 'Only 3 install slots left this month. Book your free estimate today.',
    policyFlag: 'none',
    resonance: { controls: 1.03, suggestions: 1.02, limited: 0.96 },
    close: 0.9,
    note: 'Urgency lifts clicks, but manufactured scarcity on a $20,000 purchase reads as pressure. Some leads cool off.',
  },
];

/** What the harness's best-practice player runs: launch angles, then one refresh at week 5. */
export const RECOMMENDED = { angles: ['local_trust', 'financing'], refresh: ['local_trust', 'storm_damage'] };

export const CHECKS = leadChecks({
  booking: 'estimate request',
  bookingSystem: 'The CRM',
  page: 'free estimate page',
  offer: 'free estimate',
  callback: 'The office',
});

const SPECIFIC = [
  {
    id: 'hailstorm',
    trigger: { kind: 'random', minWeek: 2 },
    title: 'Hailstorm',
    prompt: '"A hailstorm hit the north side of town last night. Phones are already ringing."',
    responses: [
      {
        id: 'storm_angle',
        text: 'Swap in the storm-damage angle now: free inspections, insurance help.',
        score: 1,
        relationship: 2,
        effects: [{ type: 'setAngles', angles: ['storm_damage', 'local_trust'] }, { type: 'demand', mult: 0.75, weeks: 2 }],
        explanation: 'A storm changes what homeowners are searching for. Matching the message to the moment is worth a learning reset.',
      },
      {
        id: 'steady',
        text: 'Keep the campaign as is and let demand do the work.',
        score: 0.6,
        relationship: 0,
        effects: [{ type: 'demand', mult: 0.88, weeks: 2 }],
        explanation: 'Stable, but the ads keep talking about financing while every homeowner nearby is thinking about hail damage.',
      },
      {
        id: 'double',
        text: 'Ask the client to double the budget for two weeks.',
        score: 0.5,
        relationship: -2,
        effects: [{ type: 'demand', mult: 0.88, weeks: 2 }, { type: 'budgetBoost', factor: 1.5, weeks: 2 }],
        explanation: 'More budget during a spike can pay, but the copy still misses the moment and the client has to find the cash.',
      },
    ],
  },
  {
    id: 'slow_close',
    trigger: { kind: 'random', minWeek: 3 },
    title: '"Is this even working?"',
    prompt: '"We\'ve run a bunch of estimates and only signed a couple of roofs. Is this even working?"',
    responses: [
      {
        id: 'pipeline',
        text: 'Walk through the pipeline: estimates out, average decision time, and what one signed roof is worth against the spend.',
        score: 1,
        relationship: 2,
        effects: [],
        explanation: 'Roof buyers take weeks to decide. One signed roof can pay for the whole campaign; the client needs to see the pipeline, not just this week.',
      },
      {
        id: 'cheap',
        text: 'Switch to a lowest-price angle to get more leads in the door.',
        score: 0.2,
        relationship: 1,
        effects: [{ type: 'setAngles', angles: ['lowest_price'] }],
        explanation: 'More leads, worse buyers. Price shoppers make the close rate the client just complained about even lower.',
      },
      {
        id: 'cut',
        text: 'Offer to cut the budget until things pick up.',
        score: 0.3,
        relationship: 0,
        effects: [{ type: 'budgetCut', factor: 0.7 }],
        explanation: 'Cutting starves learning and the pipeline at the same time. The problem was patience, not spend.',
      },
    ],
  },
  {
    id: 'storm_chasers',
    trigger: { kind: 'random' },
    title: 'Storm chasers in town',
    prompt: '"Out-of-town crews are door-knocking every street, promising free roofs through insurance."',
    responses: [
      {
        id: 'local',
        text: 'Lean on being local: still here next year to honor the warranty. No copy change until the planned refresh.',
        score: 1,
        relationship: 1,
        effects: [],
        explanation: 'Homeowners distrust storm chasers. A local warranty is the answer, and the current angle already says it.',
      },
      {
        id: 'match',
        text: 'Match them: advertise "free roof through insurance" too.',
        score: 0.2,
        relationship: 1,
        effects: [{ type: 'marginCut', mult: 0.9 }],
        explanation: 'Promising a free roof copies the pitch homeowners are wary of, and the client eats the deductible games.',
      },
      {
        id: 'ignore',
        text: 'Tell them not to worry about it.',
        score: 0.4,
        relationship: -3,
        effects: [],
        explanation: 'The client is worried for a reason. Dismissing it costs trust even if the campaign is fine.',
      },
    ],
  },
];

const T = {
  busy: '"We\'ve got three crews booked solid this week. Can you pause everything?"',
  booking: 'estimates',
  competitor: '"The big franchise across town is running $1,000 off every roof. Should we match it?"',
  differentiate: 'Lean on warranty, local crews, and reviews. Don\'t race to the bottom on a $20,000 job.',
  bookingSystem: 'The CRM',
  capacity: '"Our crews are booked 8 weeks out. Nobody can get to these estimates."',
};

export const EVENTS = [...commonEvents(T), ...leadAutoEvents(T), ...SPECIFIC, ...redFlagEvents(T)];

export const DEBRIEF = {
  DRIVER_TEXT: leadDriverText({ jobs: 'roof estimates', offSeason: 'Off-season demand. Fewer homeowners think about their roof right now, so costs are up.' }),
  POLICY_REWRITES: {},
  HONEST_LIMIT,
  FINAL_LINES,
};
