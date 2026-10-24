// src/content/landscaping/index.js
//
// Landscaping (project work: patios, plantings, outdoor living). v1 models
// project jobs only; maintenance contracts aren't sourced (spec 5.1). The
// trap here is cheap mowing leads that look like projects in the report.

import { leadChecks } from '../shared/checks.js';
import { commonEvents, leadAutoEvents, redFlagEvents } from '../shared/events.js';
import { leadDriverText, HONEST_LIMIT, FINAL_LINES } from '../shared/debrief.js';

export const TERMS = {
  pitch: (b) => `A landscaping company in a ${b.locationSize}. They want more design-and-build projects.`,
  job: 'signed project',
  jobs: 'signed projects',
  firstJob: 'Average project',
  benchmarkCategory: 'Home & Home Improvement',
};

export const ANGLES = [
  {
    id: 'portfolio',
    title: 'Portfolio',
    copy: 'See the backyards we\'ve built: patios, plantings, and lighting.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.02, limited: 0.95 },
    note: 'Project buyers want to see the work. A strong portfolio does the selling before the call.',
  },
  {
    id: 'design_consult',
    title: 'Free design plan',
    copy: 'Free design consultation. See a 3D plan before you spend a dollar.',
    policyFlag: 'none',
    resonance: { controls: 1.01, suggestions: 1.02, limited: 0.94 },
    note: 'Lowers the risk of a big project. Some consults are browsers, but most are planning real work.',
  },
  {
    id: 'outdoor_living',
    title: 'Outdoor living',
    copy: 'Turn your backyard into the room you use most.',
    policyFlag: 'none',
    resonance: { controls: 1.03, suggestions: 1.03, limited: 0.96 },
    note: 'Aspirational. Strong with homeowners who already have the budget in mind.',
  },
  {
    id: 'cheap_mowing',
    title: 'Mowing deal',
    copy: 'Lawn mowing from $35 a visit!',
    policyFlag: 'none',
    resonance: { controls: 1.1, suggestions: 1.1, limited: 1.02 },
    close: 0.5,
    note: 'Cheap leads for work the client barely profits on. Mowing shoppers rarely become $3,600 projects.',
  },
  {
    id: 'spring_rush',
    title: 'Book before spring',
    copy: 'The spring calendar is filling up. Book your project now.',
    policyFlag: 'none',
    resonance: { controls: 1.0, suggestions: 1.0, limited: 0.94 },
    note: 'True seasonal urgency. Works best in late winter and early spring.',
  },
];

export const RECOMMENDED = { angles: ['portfolio', 'design_consult'], refresh: ['portfolio', 'outdoor_living'] };

export const CHECKS = leadChecks({
  booking: 'consultation request',
  bookingSystem: 'The CRM',
  page: 'consultation page',
  offer: 'free design consultation',
  callback: 'The office',
});

const SPECIFIC = [
  {
    id: 'rain_week',
    trigger: { kind: 'random', minWeek: 2 },
    title: 'A week of rain',
    prompt: '"It\'s rained all week. Nobody\'s thinking about patios. Should we stop the ads?"',
    responses: [
      {
        id: 'steady',
        text: 'Hold steady. Rainy weeks cost a bit more, and pausing costs a lot more.',
        score: 1,
        relationship: 1,
        effects: [{ type: 'demand', mult: 1.2, weeks: 1 }],
        explanation: 'One slow week is noise. People still plan projects from the couch; a pause throws away the learning.',
      },
      {
        id: 'pause',
        text: 'Pause until the weather clears.',
        score: 0.2,
        relationship: 1,
        effects: [{ type: 'pauseAll' }],
        explanation: 'A pause costs a week of leads and restarts learning, all to dodge one expensive week.',
      },
      {
        id: 'cut',
        text: 'Cut the budget 30% for the rest of the campaign.',
        score: 0.3,
        relationship: 0,
        effects: [{ type: 'budgetCut', factor: 0.7 }],
        explanation: 'A permanent cut for a one-week weather problem starves the campaign long after the sun comes out.',
      },
    ],
  },
  {
    id: 'add_maintenance',
    trigger: { kind: 'random' },
    title: '"Can we advertise mowing too?"',
    prompt: '"Can we also run ads for weekly mowing? It\'s steady money."',
    responses: [
      {
        id: 'new_adset',
        text: 'Launch a second ad set for mowing right away.',
        score: 0.3,
        relationship: 2,
        effects: [{ type: 'addAdSet', kind: 'service', angles: ['cheap_mowing'] }],
        explanation: 'A second ad set splits a budget that already can\'t exit learning, and mowing leads are worth a fraction of a project.',
      },
      {
        id: 'explain',
        text: 'Keep the budget on projects. Mowing customers find them through yard signs and referrals.',
        score: 1,
        relationship: 1,
        effects: [],
        explanation: 'On an L1 budget, focus beats breadth. Every dollar on $35 mowing leads is a dollar not finding a $3,600 project.',
      },
      {
        id: 'swap',
        text: 'Swap the main angle to the mowing deal.',
        score: 0.1,
        relationship: 1,
        effects: [{ type: 'setAngles', angles: ['cheap_mowing'] }],
        explanation: 'Lead volume jumps and real projects dry up. The report looks great while the client\'s revenue falls.',
      },
    ],
  },
  {
    id: 'spring_rush',
    trigger: { kind: 'random', minWeek: 2 },
    title: 'Spring rush',
    prompt: '"The first warm weekend hit. Everybody wants their yard done yesterday!"',
    responses: [
      {
        id: 'steady',
        text: 'Keep the campaign steady and let demand do the work.',
        score: 1,
        relationship: 0,
        effects: [{ type: 'demand', mult: 0.85, weeks: 2 }],
        explanation: 'Demand rose on its own. A stable campaign captures it without paying for a learning reset.',
      },
      {
        id: 'boost',
        text: 'Ask for 20% more budget for two weeks.',
        score: 0.7,
        relationship: 0,
        effects: [{ type: 'demand', mult: 0.85, weeks: 2 }, { type: 'budgetBoost', factor: 1.2, weeks: 2 }],
        explanation: 'Reasonable when demand is up, but a budget change is still a significant edit.',
      },
      {
        id: 'rewrite',
        text: 'Rewrite every ad around spring this week.',
        score: 0.4,
        relationship: 1,
        effects: [{ type: 'demand', mult: 0.85, weeks: 2 }, { type: 'resetLearning' }],
        explanation: 'Fresh copy is nice, but changing every ad resets learning right when demand peaks.',
      },
    ],
  },
];

const T = {
  busy: '"We\'re buried in installs this week. Can you pause everything?"',
  booking: 'consultations',
  competitor: '"A new crew in town is advertising 20% off all hardscaping. Should we match it?"',
  differentiate: 'Lean on design quality and the portfolio. Project buyers pay for the result, not the discount.',
  bookingSystem: 'The CRM',
  capacity: '"We\'re booked through the whole season. We can\'t take another project."',
};

export const EVENTS = [...commonEvents(T), ...leadAutoEvents(T), ...SPECIFIC, ...redFlagEvents(T)];

export const DEBRIEF = {
  DRIVER_TEXT: leadDriverText({ jobs: 'project consultations', offSeason: 'Off-season. Few homeowners plan yard projects right now, so every lead costs more.' }),
  POLICY_REWRITES: {},
  HONEST_LIMIT,
  FINAL_LINES,
};
