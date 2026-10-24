// src/content/shared/debrief.js
//
// Debrief text shared across businesses (spec 14). Tone: firm, no
// softening. Med spa keeps its own copy in src/content/medspa/debrief.js.

import { FINAL_LINES } from '../medspa/debrief.js';

export { HONEST_LIMIT, FINAL_LINES } from '../medspa/debrief.js';

export const ECOMM_FINAL_LINES = {
  ...FINAL_LINES,
  budget_failure: 'Budget failure: more than a quarter of the budget spent with zero real sales.',
  target_failure: 'Target failure: at the midpoint, the true cost per purchase missed the business target by more than 50%.',
};

/** Driver text for lead businesses. t: { jobs: 'jobs', booking: 'books', ... } */
export function leadDriverText(t) {
  return {
    objective: {
      hurt: `The objective is wrong for a leads client. Meta found cheap clicks and engagement, not ${t.jobs}.`,
      stronger: 'Relaunch on the Leads objective. The objective decides who Meta looks for.',
    },
    goal: {
      hurt: 'The performance goal or event optimized for something other than a lead the client can close.',
      stronger: 'Optimize for the highest-volume event that is still a real lead.',
    },
    location: {
      hurt: 'The conversion location brought leads that don\'t close.',
      stronger: 'Match the conversion location to how the client sells: calls, a website form, or instant forms with qualifying questions.',
      helped: 'The conversion location fit how the client sells.',
    },
    audience: {
      hurt: 'Hard audience limits shrank delivery and raised costs on a budget that already can\'t exit learning.',
      stronger: 'Use Advantage+ audience with the service area and 18+ as controls. Let suggestions guide, not limit.',
      helped: 'A broad audience gave Meta room to find buyers.',
    },
    angles: {
      hurt: t.anglesHurt || 'The messaging didn\'t resonate, or it pulled bargain hunters who don\'t close.',
      stronger: 'Test two angles at most, then keep the winner. Cheap leads from a discount angle are not cheap jobs.',
      helped: 'The messaging angle resonated with this audience.',
    },
    learning: {
      hurt: 'Learning reset this week. Edits, pauses, or a relaunch threw away the signal you had built.',
      stronger: 'Batch changes. At most one significant edit per ad set every two weeks, unless you\'re fixing an error.',
    },
    launch: {
      hurt: 'Launch week. Every new campaign starts learning from zero, so the first week costs more.',
      stronger: 'Nothing to fix yet. Leave it alone so next week builds on this signal.',
    },
    fragmentation: {
      hurt: 'The budget is split across too many ad sets. Each one gets a handful of events and stays learning-limited.',
      stronger: 'Consolidate into one ad set. At this budget, one ad set is the most the money can teach.',
    },
    fatigue: {
      hurt: 'Creative fatigue. The same audience has seen this angle for weeks and click-through is falling.',
      stronger: 'Plan one angle refresh around week 4, timed so it\'s your only edit that fortnight.',
    },
    tracking: {
      hurt: 'Tracking is broken, so Meta is optimizing on a bad signal.',
      stronger: 'Fix the lead event. Optimizing on false conversions teaches Meta to find more junk.',
    },
    landing: {
      hurt: 'The landing page is losing people: slow, vague, and hard to use on a phone.',
      stronger: 'Fix the page in onboarding, or route around it with instant forms or calls.',
    },
    seasonality: {
      hurt: t.offSeason || 'Off-season demand. Costs are up for everyone right now.',
      stronger: 'Set the expectation up front. Seasonality is a pitch conversation, not an ads fix.',
      helped: 'Seasonal demand lowered costs this week.',
    },
    policy: {
      hurt: 'An ad set was disapproved and delivered nothing.',
      stronger: 'Use compliant copy and appeal review errors.',
    },
    speedToLead: {
      hurt: 'Leads are going cold before the client calls them back.',
      stronger: 'Coach a same-hour callback. You can advise; it\'s the client\'s phone.',
    },
    paused: {
      hurt: 'Ads were paused, so nothing delivered this week.',
      stronger: 'Avoid pausing. A pause costs a week of results and restarts learning.',
    },
    market: {
      hurt: 'Auction costs ran high this week. Some weeks are just expensive.',
      stronger: 'Hold steady. Reacting to one noisy week with edits makes the next week worse.',
      helped: 'Auction costs ran low this week.',
    },
  };
}

export const ECOMM_DRIVER_TEXT = {
  objective: {
    hurt: 'The objective is wrong for a store. Meta found cheap clicks, likes, or email sign-ups, not buyers.',
    stronger: 'Relaunch on the Sales objective. The objective decides who Meta looks for.',
  },
  goal: {
    hurt: 'The goal or event didn\'t fit the budget: too few purchases for Meta to learn from, or an event that isn\'t on the path to buying.',
    stronger: 'Under about 50 purchases a week, optimize for add to cart or initiate checkout. Move to Purchase once volume allows.',
  },
  location: {
    hurt: 'The setup sent people somewhere they can\'t easily buy.',
    stronger: 'Send shoppers to the website with the Sales objective.',
    helped: 'Ads sent shoppers straight to the store.',
  },
  audience: {
    hurt: 'Hard audience limits shrank delivery and raised costs.',
    stronger: 'Use Advantage+ audience with controls only. Let Meta find buyers; suggestions guide, they don\'t limit.',
    helped: 'A broad audience gave Meta room to find buyers.',
  },
  angles: {
    hurt: 'The messaging didn\'t resonate with shoppers.',
    stronger: 'Test two angles at most, then keep the winner.',
    helped: 'The messaging angle resonated with shoppers.',
  },
  learning: {
    hurt: 'Learning reset this week. Edits, pauses, or a relaunch threw away the signal you had built.',
    stronger: 'Batch changes. At most one significant edit per ad set every two weeks, unless you\'re fixing an error.',
  },
  launch: {
    hurt: 'Launch week. Every new campaign starts learning from zero, so the first week costs more.',
    stronger: 'Nothing to fix yet. Leave it alone so next week builds on this signal.',
  },
  fragmentation: {
    hurt: 'The budget is split across too many ad sets. Each one gets a handful of purchases and stays learning-limited.',
    stronger: 'Consolidate into one ad set. At this budget, one ad set is the most the money can teach.',
  },
  fatigue: {
    hurt: 'Creative fatigue. The same shoppers have seen this angle for weeks and click-through is falling.',
    stronger: 'Plan one angle refresh around week 4, timed so it\'s your only edit that fortnight.',
  },
  tracking: {
    hurt: 'Meta can\'t see purchases, so purchase optimization has nothing to learn from.',
    stronger: 'Fix the purchase event. Until then, optimize on add to cart, which still fires.',
  },
  landing: {
    hurt: 'The store is losing shoppers: slow product pages and a clunky checkout.',
    stronger: 'Fix the product pages and checkout in onboarding. Ads can\'t out-run a leaky store.',
  },
  seasonality: {
    hurt: 'A slow season for apparel. Costs are up for everyone right now.',
    stronger: 'Set the expectation up front. Seasonality is a pitch conversation, not an ads fix.',
    helped: 'Seasonal demand lowered costs this week.',
  },
  policy: {
    hurt: 'An ad set was disapproved and delivered nothing.',
    stronger: 'Use compliant copy and appeal review errors.',
  },
  paused: {
    hurt: 'Ads were paused, so nothing delivered this week.',
    stronger: 'Avoid pausing. A pause costs a week of results and restarts learning.',
  },
  market: {
    hurt: 'Auction costs ran high this week. Some weeks are just expensive.',
    stronger: 'Hold steady. Reacting to one noisy week with edits makes the next week worse.',
    helped: 'Auction costs ran low this week.',
  },
};
