// src/content/apparel/index.js
//
// Boutique apparel: an online store judged on first-order economics (spec
// 5.1; repeat purchases aren't sourced). Sales objective, purchase-path
// events, AOV from the brief. Many briefs are hard or unviable once the fee
// is counted, so walking away and setting expectations matter.

import { ECOMM_CHECKS } from '../shared/checks.js';
import { commonEvents, redFlagEvents } from '../shared/events.js';
import { ECOMM_DRIVER_TEXT, ECOMM_FINAL_LINES, HONEST_LIMIT } from '../shared/debrief.js';

export const TERMS = {
  pitch: (b) => `An online clothing boutique based in a ${b.locationSize}. They want more sales from their store.`,
  job: 'order',
  jobs: 'orders',
  firstJob: 'Average order value',
  benchmarkCategory: 'Lifestyle & Boutique',
};

export const ANGLES = [
  {
    id: 'new_arrivals',
    title: 'New arrivals',
    copy: 'Just dropped: the fall collection. Small batches, once they\'re gone they\'re gone.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.02, limited: 0.95 },
    note: 'Novelty and real scarcity. Boutique shoppers buy what\'s new.',
  },
  {
    id: 'styled_looks',
    title: 'Styled looks',
    copy: 'Three ways to wear our best-selling linen set. Shop the look.',
    policyFlag: 'none',
    resonance: { controls: 1.01, suggestions: 1.02, limited: 0.94 },
    note: 'Shows the product on real outfits. Lifts order value when shoppers buy the whole look.',
  },
  {
    id: 'reviews',
    title: 'Customer reviews',
    copy: '"Fits like it was made for me." Over 2,000 five-star reviews.',
    policyFlag: 'none',
    resonance: { controls: 1.03, suggestions: 1.03, limited: 0.96 },
    note: 'Fit is the biggest worry buying clothes online. Social proof answers it.',
  },
  {
    id: 'big_sale',
    title: '40% off sitewide',
    copy: '40% off everything. This weekend only.',
    policyFlag: 'none',
    resonance: { controls: 1.1, suggestions: 1.1, limited: 1.02 },
    discount: 0.4,
    note: 'Cheap purchases at a margin the business can\'t live on. The cost per purchase looks great; the profit doesn\'t.',
  },
  {
    id: 'founder_story',
    title: 'Founder story',
    copy: 'I started this shop in my garage with $500 and a sewing machine.',
    policyFlag: 'none',
    resonance: { controls: 0.99, suggestions: 1.0, limited: 0.93 },
    note: 'Builds brand affinity. Better for warm audiences than cold prospecting.',
  },
];

export const RECOMMENDED = { angles: ['new_arrivals', 'styled_looks'], refresh: ['styled_looks', 'reviews'] };

export const CHECKS = ECOMM_CHECKS;

const SPECIFIC = [
  {
    id: 'purchase_gap',
    trigger: { kind: 'auto', when: 'purchaseGap' },
    title: '"Meta says we sold nothing"',
    prompt: '"Ads Manager shows almost no purchases, but our store shows plenty of orders from Instagram. Which is it?"',
    responses: [
      {
        id: 'fix',
        text: 'Own it: the purchase event is broken. Fix it now.',
        score: 1,
        relationship: -2,
        effects: [{ type: 'fixDefect', defect: 'missingPurchase' }],
        explanation: 'Meta can\'t optimize toward buyers it can\'t see. Fixing the purchase event resets learning, but every week without it trains on nothing.',
      },
      {
        id: 'attribution',
        text: 'Explain that Meta and the store attribute sales differently.',
        score: 0.2,
        relationship: -5,
        effects: [],
        explanation: 'Attribution explains small gaps. Near-zero reported purchases is a broken event.',
      },
      {
        id: 'ignore',
        text: 'Tell them the store numbers are what count.',
        score: 0.3,
        relationship: -2,
        effects: [],
        explanation: 'The client is right about revenue, but leaving the event broken keeps purchase optimization blind.',
      },
    ],
  },
  {
    id: 'stock_out',
    trigger: { kind: 'random', minWeek: 2 },
    title: '"Our best seller sold out"',
    prompt: '"The linen set in the ads just sold out in most sizes. Restock is three weeks away."',
    responses: [
      {
        id: 'swap',
        text: 'Swap the ads to in-stock pieces and new arrivals.',
        score: 1,
        relationship: 2,
        effects: [{ type: 'setAngles', angles: ['new_arrivals', 'reviews'] }],
        explanation: 'Ads for a product shoppers can\'t buy waste every click. An angle change resets learning, but it fixes a real error.',
      },
      {
        id: 'keep',
        text: 'Keep running. People can join the waitlist.',
        score: 0.2,
        relationship: -3,
        effects: [{ type: 'demand', mult: 1.3, weeks: 3 }],
        explanation: 'Waitlists convert poorly. Most shoppers who click a sold-out product leave and don\'t come back.',
      },
      {
        id: 'pause',
        text: 'Pause until the restock lands.',
        score: 0.3,
        relationship: 0,
        effects: [{ type: 'pauseAll' }],
        explanation: 'A pause throws away learning and a week of sales when the store has other products to sell.',
      },
    ],
  },
  {
    id: 'influencer',
    trigger: { kind: 'random' },
    title: 'An influencer reaches out',
    prompt: '"An influencer with 40k followers wants $1,500 for a post. Should we take it out of the ad budget?"',
    responses: [
      {
        id: 'gift',
        text: 'Keep the ad budget. Offer a gifted outfit and a tracked discount code instead, and judge it on sales.',
        score: 1,
        relationship: 1,
        effects: [],
        explanation: 'Small influencer deals are a test, not a plan. A tracked code proves value without starving the campaign.',
      },
      {
        id: 'pay',
        text: 'Pay her from the ad budget.',
        score: 0.3,
        relationship: 2,
        effects: [{ type: 'budgetCut', factor: 0.8 }],
        explanation: 'Moving 20% of an L1 budget to one post with no tracking weakens the campaign for an unmeasurable result.',
      },
      {
        id: 'no',
        text: 'Tell them influencers are a waste of money.',
        score: 0.4,
        relationship: -3,
        effects: [],
        explanation: 'Not necessarily true, and dismissive. A tracked test answers the question.',
      },
    ],
  },
];

const T = {
  busy: '"We\'re way behind on shipping orders this week. Can you pause everything?"',
  booking: 'orders',
  competitor: '"A big online brand is running 40% off everything. Should we match it?"',
  differentiate: 'Lean on small batches, fit, and reviews. A boutique can\'t win a discount war with a big brand.',
};

export const EVENTS = [...commonEvents(T), ...SPECIFIC, ...redFlagEvents(T)];

export const DEBRIEF = {
  DRIVER_TEXT: ECOMM_DRIVER_TEXT,
  POLICY_REWRITES: {},
  HONEST_LIMIT,
  FINAL_LINES: ECOMM_FINAL_LINES,
};
