// src/content/cleaning/index.js
//
// Residential house cleaning. A $200 first clean is only worth chasing if
// the customer becomes recurring, so the 12-month value carries the
// economics, and many briefs are hard or unviable once the fee is counted.
// The trap is one-time deal seekers.

import { leadChecks } from '../shared/checks.js';
import { commonEvents, leadAutoEvents, redFlagEvents } from '../shared/events.js';
import { leadDriverText, HONEST_LIMIT, FINAL_LINES } from '../shared/debrief.js';

export const TERMS = {
  pitch: (b) => `A house cleaning company in a ${b.locationSize}. They want more recurring cleaning clients.`,
  job: 'new client',
  jobs: 'new clients',
  firstJob: 'First clean',
  benchmarkCategory: 'Home & Home Improvement',
};

export const ANGLES = [
  {
    id: 'time_back',
    title: 'Time back',
    copy: 'Get your Saturdays back. Trusted, insured cleaners.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.02, limited: 0.95 },
    note: 'Sells the outcome busy households actually buy. Pulls people who want it every week.',
  },
  {
    id: 'recurring_offer',
    title: 'Recurring offer',
    copy: '$50 off your first recurring clean. Same team every visit.',
    policyFlag: 'none',
    resonance: { controls: 1.0, suggestions: 1.0, limited: 0.94 },
    close: 1.05,
    note: 'The discount is tied to signing up for recurring service, so it attracts the customers worth having.',
  },
  {
    id: 'trust_vetted',
    title: 'Vetted cleaners',
    copy: 'Background-checked, insured cleaners. 100% satisfaction guarantee.',
    policyFlag: 'none',
    resonance: { controls: 1.03, suggestions: 1.02, limited: 0.96 },
    note: 'Letting strangers into your home is the real objection. Answering it builds trust.',
  },
  {
    id: 'deep_clean_deal',
    title: '$99 deep clean',
    copy: 'Deep clean special: $99 for any size home!',
    policyFlag: 'none',
    resonance: { controls: 1.1, suggestions: 1.1, limited: 1.02 },
    close: 0.65,
    note: 'Cheap leads who want one clean at a loss-leader price and never book again.',
  },
  {
    id: 'move_out',
    title: 'Move-out cleaning',
    copy: 'Moving? Move-out cleaning that gets your deposit back.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.02, limited: 0.95 },
    close: 0.85,
    note: 'Real demand, but movers are one-time customers by definition.',
  },
];

export const RECOMMENDED = { angles: ['time_back', 'recurring_offer'], refresh: ['time_back', 'trust_vetted'] };

export const CHECKS = leadChecks({
  booking: 'quote request',
  bookingSystem: 'The booking software',
  page: 'quote page',
  offer: 'instant quote',
  callback: 'The office',
});

const SPECIFIC = [
  {
    id: 'one_time_cleans',
    trigger: { kind: 'random', minWeek: 2 },
    title: '"These are all one-time cleans"',
    prompt: '"Half these new customers book one clean and disappear. I need recurring clients."',
    responses: [
      {
        id: 'recurring',
        text: 'Shift the messaging to recurring service: the recurring offer and time back.',
        score: 1,
        relationship: 2,
        effects: [{ type: 'setAngles', angles: ['time_back', 'recurring_offer'] }],
        explanation: 'Messaging decides who shows up. An offer tied to recurring service attracts the customers the economics depend on.',
      },
      {
        id: 'qualify',
        text: 'Add a qualifying question about frequency to the forms.',
        score: 0.6,
        relationship: 1,
        effects: [{ type: 'higherIntent' }],
        explanation: 'Helps on instant forms, but if the ads promise a one-time deal, a form question can\'t change who clicks.',
      },
      {
        id: 'their_job',
        text: 'Tell them converting first cleans to recurring is their job.',
        score: 0.2,
        relationship: -6,
        effects: [],
        explanation: 'Partly true, but the ads set the expectation. Fix the message before blaming the follow-up.',
      },
    ],
  },
  {
    id: 'staff_shortage',
    trigger: { kind: 'random', minWeek: 2 },
    title: '"Two cleaners just quit"',
    prompt: '"Two of my cleaners quit. We can\'t take many new clients for the next two weeks."',
    responses: [
      {
        id: 'throttle',
        text: 'Cut the budget in half for two weeks, then restore it.',
        score: 1,
        relationship: 2,
        effects: [{ type: 'budgetBoost', factor: 0.5, weeks: 2 }],
        explanation: 'Match spend to capacity without stopping. Learning slows, but it doesn\'t restart, and no leads go cold.',
      },
      {
        id: 'pause',
        text: 'Pause everything until they\'re staffed.',
        score: 0.4,
        relationship: 1,
        effects: [{ type: 'pauseAll' }],
        explanation: 'Stops wasted leads, but a pause restarts learning and costs a week of signal.',
      },
      {
        id: 'keep',
        text: 'Keep running at full budget; they\'ll figure it out.',
        score: 0.1,
        relationship: -6,
        effects: [{ type: 'closeMult', mult: 0.8 }],
        explanation: 'Leads the client can\'t serve go to a competitor. Wasted spend, and the client blames the ads.',
      },
    ],
  },
  {
    id: 'deal_site',
    trigger: { kind: 'random' },
    title: 'A deal site calls',
    prompt: '"A deal site wants to run a $49 first-clean voucher for us. They say we\'ll get hundreds of customers."',
    responses: [
      {
        id: 'decline',
        text: 'Advise against it: deal buyers rarely become recurring, and $49 loses money on every clean.',
        score: 1,
        relationship: 1,
        effects: [],
        explanation: 'A $49 clean costs more than it earns, and voucher buyers churn. The ads already target the customers worth having.',
      },
      {
        id: 'do_it',
        text: 'Encourage it. More customers is more customers.',
        score: 0.2,
        relationship: 2,
        effects: [{ type: 'marginCut', mult: 0.85 }],
        explanation: 'Volume at a loss is still a loss. The voucher wave crowds out the recurring clients the ads are finding.',
      },
      {
        id: 'test',
        text: 'Suggest a small capped test and track who books again.',
        score: 0.7,
        relationship: 1,
        effects: [],
        explanation: 'A capped test limits the damage and gives the client data, but the economics rarely work for cleaning.',
      },
    ],
  },
];

const T = {
  busy: '"We\'re short-staffed and overbooked this week. Can you pause everything?"',
  booking: 'new clients',
  competitor: '"A franchise just opened nearby with $79 first cleans. Should we match it?"',
  differentiate: 'Lean on the same trusted team every visit and the satisfaction guarantee. Don\'t race a franchise to the bottom.',
  bookingSystem: 'The booking software',
  capacity: '"Honestly, we\'re full. We don\'t have a cleaner free to take a new home for a month."',
};

export const EVENTS = [...commonEvents(T), ...leadAutoEvents(T), ...SPECIFIC, ...redFlagEvents(T)];

export const DEBRIEF = {
  DRIVER_TEXT: leadDriverText({ jobs: 'cleaning clients', anglesHurt: 'The messaging didn\'t resonate, or it pulled one-time deal seekers who never book again.' }),
  POLICY_REWRITES: {},
  HONEST_LIMIT,
  FINAL_LINES,
};
