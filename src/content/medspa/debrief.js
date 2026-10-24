// src/content/medspa/debrief.js
//
// Debrief text (spec 14). Tone: firm, no softening. Round debriefs name the
// single biggest driver of the week and a stronger move.

export const DRIVER_TEXT = {
  objective: {
    hurt: 'The objective is wrong for a leads client. Meta found cheap clicks and engagement, not bookings.',
    stronger: 'Relaunch on the Leads objective. The objective decides who Meta looks for.',
  },
  goal: {
    hurt: 'The performance goal or event optimized for something other than a lead the client can book.',
    stronger: 'Optimize for the highest-volume event that is still a real lead.',
  },
  location: {
    hurt: 'The conversion location brought leads that don\'t close.',
    stronger: 'Match the conversion location to how the client books: calls, a website form, or instant forms with qualifying questions.',
    helped: 'The conversion location fit how the client books.',
  },
  audience: {
    hurt: 'Hard audience limits shrank delivery and raised costs on a budget that already can\'t exit learning.',
    stronger: 'Use Advantage+ audience with location and 18+ as controls. Let suggestions guide, not limit.',
    helped: 'A broad audience gave Meta room to find bookers.',
  },
  angles: {
    hurt: 'The messaging didn\'t resonate with this audience.',
    stronger: 'Test two compliant angles at most, then keep the winner.',
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
    hurt: 'Off-season demand. Costs are up for everyone right now.',
    stronger: 'Set the expectation up front. Seasonality is a pitch conversation, not an ads fix.',
    helped: 'Seasonal demand lowered costs this week.',
  },
  policy: {
    hurt: 'An ad set was disapproved under Meta\'s health and wellness policy and delivered nothing.',
    stronger: 'Use compliant copy. Never imply the viewer\'s appearance or promise a timed outcome.',
  },
  speedToLead: {
    hurt: 'Leads are going cold before the client calls them back.',
    stronger: 'Coach a same-hour callback. You can advise; it\'s the client\'s front desk.',
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

/** Compliant rewrites for each prohibited or risky policy flag (5.5). */
export const POLICY_REWRITES = {
  inferiority: {
    problem: 'Negative language about the viewer\'s appearance ("Hate your forehead lines?").',
    rewrite: '"Smooth, natural-looking results from licensed injectors."',
  },
  personal_attribute: {
    problem: '"Tired of your wrinkles?" asserts knowledge of the viewer\'s appearance.',
    rewrite: '"Our wrinkle-relaxing treatments, by licensed nurse injectors."',
  },
  timeframe: {
    problem: '"10 years younger in one lunch break. Guaranteed." promises a specific outcome in a set time with no qualifier.',
    rewrite: '"Treatments take about 30 minutes. Results vary; book a consult to see what\'s right for you."',
  },
  before_after: {
    problem: 'Before-and-after is allowed for cosmetic procedures at 18+, but automated review sometimes rejects it.',
    rewrite: 'Keep it and appeal. If it keeps getting flagged, add "Individual results vary."',
  },
};

export const HONEST_LIMIT =
  'These results are simulated from published benchmark ranges plus randomness. The game builds intuition and repetition. It does not prove real-world delivery.';

export const FINAL_LINES = {
  completed: 'Campaign complete.',
  churn: 'The client churned: two straight weeks below 40% satisfaction.',
  budget_failure: 'Budget failure: more than a quarter of the budget spent with zero real bookings.',
  target_failure: 'Target failure: at the midpoint, the true cost per lead missed the business target by more than 50%.',
  client_ended: 'The client ended the engagement early.',
  agency_exit: 'You ended the engagement mid-campaign.',
  declined: 'You declined the client.',
};
