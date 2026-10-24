// src/content/shared/events.js
//
// Client events shared across businesses (spec 10.2), in the same shape as
// src/content/medspa/events.js. Each business adds 2-4 events of its own.
// t supplies the business's own words:
//   { busy: '"We\'re slammed..."', service: 'tune-up', booking: 'jobs', competitor: '...', feeNote: '...' }
//
// Effect types are listed in src/content/medspa/events.js, plus
// setAngles {angles} (a messaging change that fixes a real problem).

export function commonEvents(t) {
  return [
    {
      id: 'slammed_pause',
      trigger: { kind: 'random' },
      title: '"Can you pause everything?"',
      prompt: t.busy,
      responses: [
        {
          id: 'pause',
          text: 'Pause all ads for the week.',
          score: 0.2,
          relationship: 2,
          effects: [{ type: 'pauseAll' }],
          explanation: 'Pausing restarts learning. Next week costs more, and you lose the signal you built.',
        },
        {
          id: 'explain',
          text: `Keep running. Explain that pausing restarts learning, and that new ${t.booking} can be scheduled for next week.`,
          score: 1,
          relationship: 1,
          effects: [],
          explanation: 'A busy week is a scheduling problem, not an ads problem. New work can land next week; a restarted campaign can\'t get its learning back.',
        },
        {
          id: 'weekend',
          text: 'Agree to pause just over the weekend.',
          score: 0.5,
          relationship: 2,
          effects: [],
          explanation: 'A short pause is a minor cost, but it still trades campaign stability for a problem the client can solve with scheduling.',
        },
      ],
    },
    {
      id: 'nephew_boost',
      trigger: { kind: 'random' },
      title: '"Just boost posts?"',
      prompt: '"My nephew says we should just boost our Facebook posts. Way cheaper, right?"',
      responses: [
        {
          id: 'switch',
          text: 'Switch the budget to boosted posts.',
          score: 0,
          relationship: 3,
          effects: [{ type: 'switchToBoost' }],
          explanation: `Boosted posts optimize for engagement. You get cheap likes and almost no ${t.booking}.`,
        },
        {
          id: 'explain',
          text: `Explain that boosts optimize for likes, not ${t.booking}. Keep the campaign; suggest boosting one organic post from their own budget.`,
          score: 1,
          relationship: 1,
          effects: [],
          explanation: 'The objective decides what Meta finds for you. Likes are cheap because they are not what the client needs.',
        },
        {
          id: 'both',
          text: 'Run a boost alongside the campaign with 20% of the budget.',
          score: 0.35,
          relationship: 2,
          effects: [{ type: 'addAdSet', kind: 'boost' }],
          explanation: 'Splitting an L1 budget makes the main ad set even more learning-limited, and the boost delivers almost nothing.',
        },
      ],
    },
    {
      id: 'budget_cut',
      trigger: { kind: 'random', minWeek: 2 },
      title: 'Budget cut',
      prompt: '"Slow month. We need to cut the ad budget 30%, starting now."',
      responses: [
        {
          id: 'consolidate',
          text: 'Accept, and consolidate into one ad set so the smaller budget still learns.',
          score: 1,
          relationship: 1,
          effects: [{ type: 'budgetCut', factor: 0.7 }, { type: 'consolidate' }],
          explanation: 'With less budget, fewer ad sets is the fix. One ad set keeps as much signal as the budget can buy.',
        },
        {
          id: 'keep',
          text: 'Accept, and keep the current structure.',
          score: 0.5,
          relationship: 1,
          effects: [{ type: 'budgetCut', factor: 0.7 }],
          explanation: 'The cut is the client\'s call, but every ad set now gets fewer events and stays learning-limited longer.',
        },
        {
          id: 'push_back',
          text: 'Push back hard: tell them cutting now wastes what they\'ve spent.',
          score: 0.2,
          relationship: -6,
          effects: [{ type: 'budgetCut', factor: 0.7 }],
          explanation: 'It\'s their money. Arguing costs trust and doesn\'t change the budget.',
        },
      ],
    },
    {
      id: 'competitor_discount',
      trigger: { kind: 'random' },
      title: 'Competitor discount',
      prompt: t.competitor,
      responses: [
        {
          id: 'match',
          text: 'Match it with a discount-led angle.',
          score: 0.3,
          relationship: 2,
          effects: [{ type: 'marginCut', mult: 0.85 }],
          explanation: 'Matching a discount cuts the client\'s margin on every sale and attracts price shoppers.',
        },
        {
          id: 'differentiate',
          text: t.differentiate,
          score: 1,
          relationship: 1,
          effects: [],
          explanation: 'Compete on what the client does better. Their margin is the business target; protect it.',
        },
        {
          id: 'outspend',
          text: 'Ask them to raise the budget to outspend the competitor.',
          score: 0.2,
          relationship: -3,
          effects: [],
          explanation: 'More budget doesn\'t answer a price objection, and the client never said money was loose.',
        },
      ],
    },
    {
      id: 'fee_question',
      trigger: { kind: 'random', when: 'highFeeShare' },
      title: '"Why am I paying you so much?"',
      prompt: '"Why am I paying you almost as much as the ads cost?"',
      responses: [
        {
          id: 'explain',
          text: 'Walk through what the fee covers (setup, tracking, weekly management) and show their profit after the fee.',
          score: 1,
          relationship: 2,
          effects: [],
          explanation: 'At a $2,000 budget, the default fee is 60% of spend. That is the L1 reality. Showing profit after fees is the honest answer.',
        },
        {
          id: 'discount',
          text: 'Offer 25% off the fee.',
          score: 0.4,
          relationship: 3,
          effects: [{ type: 'feeDiscount', pct: 0.25 }],
          explanation: 'Discounting under pressure trains the client to push, and drops your hourly rate below target.',
        },
        {
          id: 'defensive',
          text: 'Tell them that\'s just what agencies cost.',
          score: 0,
          relationship: -10,
          effects: [],
          explanation: 'True, but dismissive. The question was about value, not price.',
        },
      ],
    },
  ];
}

/** Auto events for lead businesses: tracking that double-counts, and leads that don't close. */
export function leadAutoEvents(t) {
  return [
    {
      id: 'reporting_mismatch',
      trigger: { kind: 'auto', when: 'reportingGap' },
      title: '"Your numbers don\'t match ours"',
      prompt: `"Your report says we got a ton of leads. ${t.bookingSystem} shows a fraction of that, and half the 'leads' are blank."`,
      responses: [
        {
          id: 'fix',
          text: 'Own it: the tracking is double-counting. Fix it now and restate the numbers.',
          score: 1,
          relationship: -3,
          effects: [{ type: 'fixDefect', defect: 'doubleFire' }],
          explanation: 'The lead event was firing on page view, so Meta optimized toward junk. Fixing it resets learning, but every week you wait trains the campaign on bad data.',
        },
        {
          id: 'meta_counts',
          text: 'Explain that Meta counts conversions differently than their system.',
          score: 0.2,
          relationship: -6,
          effects: [],
          explanation: 'Attribution windows explain small gaps. A gap this large is a tracking defect.',
        },
        {
          id: 'blame',
          text: 'Suggest the office isn\'t logging leads.',
          score: 0,
          relationship: -12,
          effects: [],
          explanation: 'Blaming the client for your tracking defect is the fastest way to lose them.',
        },
      ],
    },
    {
      id: 'junk_leads',
      trigger: { kind: 'auto', when: 'junkLeads' },
      title: '"These leads are junk"',
      prompt: `"These leads are junk. Half of them never answer the phone, and the rest want a price over text."`,
      responses: [
        {
          id: 'qualify',
          text: 'Add qualifying questions: switch instant forms to higher intent.',
          score: 1,
          relationship: 1,
          effects: [{ type: 'higherIntent' }],
          explanation: 'Default instant forms trade quality for volume. Qualifying questions cost more per lead and close far better.',
        },
        {
          id: 'their_fault',
          text: 'Tell them it\'s their follow-up, not the leads.',
          score: 0.2,
          relationship: -8,
          effects: [],
          explanation: 'Even if follow-up is slow, the client hears "it\'s your fault." Fix what you control first.',
        },
        {
          id: 'coach',
          text: 'Review the lead list together and coach a same-hour callback.',
          score: 0.7,
          relationship: 2,
          effects: [{ type: 'adviseSpeed' }],
          explanation: 'Good partnership. But if the form or the messaging attracts low-intent leads, coaching only helps part of the gap.',
        },
      ],
    },
  ];
}

/**
 * Forced events: undeclined red flags playing out (5.4). t.capacity is the
 * no-capacity line for lead businesses; ecomm has no capacity flag.
 */
export function redFlagEvents(t) {
  const out = [
    {
      id: 'rf_guarantee',
      trigger: { kind: 'forced', redFlag: 'guarantee', week: 2 },
      title: '"Where are my results?"',
      prompt: '"It\'s been two weeks. You said this would work. I\'m not paying for a warm-up period."',
      responses: [
        {
          id: 'ramp',
          text: 'Explain the ramp period and show the early numbers.',
          score: 0.3,
          relationship: -20,
          effects: [{ type: 'endRun', reason: 'client_ended' }],
          explanation: 'This client never accepted a ramp. The intake note was the warning; walking away was the right call.',
        },
        {
          id: 'promise',
          text: 'Promise next week will be better.',
          score: 0.1,
          relationship: -25,
          effects: [],
          explanation: 'A promise you can\'t control buys a week and costs more trust when it misses.',
        },
      ],
    },
    {
      id: 'rf_short_funding',
      trigger: { kind: 'forced', redFlag: 'short_funding', week: 3 },
      title: '"We\'re pulling the budget"',
      prompt: '"We\'re going to stop after this week. It hasn\'t taken off yet."',
      responses: [
        {
          id: 'accept',
          text: 'Accept, and send a wrap-up with what you learned.',
          score: 0.5,
          relationship: 0,
          effects: [{ type: 'endRun', reason: 'client_ended' }],
          explanation: 'Three weeks is not enough time to judge a campaign. The intake note ("try it for a few weeks") said they wouldn\'t fund a fair test.',
        },
        {
          id: 'argue',
          text: 'Argue that stopping now wastes the spend so far.',
          score: 0.2,
          relationship: -10,
          effects: [{ type: 'endRun', reason: 'client_ended' }],
          explanation: 'Right about sunk learning, wrong moment. The time to secure a 4-week minimum was before launch.',
        },
      ],
    },
    {
      id: 'rf_no_access',
      trigger: { kind: 'forced', redFlag: 'no_access', week: 2 },
      title: '"Just make the ads work"',
      prompt: '"I\'m still not giving out the website logins. Just make the ads work."',
      responses: [
        {
          id: 'continue',
          text: 'Keep going without tracking access.',
          score: 0.3,
          relationship: -10,
          effects: [],
          explanation: 'Without access you can\'t fix tracking, so you can\'t prove or improve results. The client will judge you on numbers you can\'t see.',
        },
        {
          id: 'exit',
          text: 'Explain you can\'t be accountable without access, and end the engagement.',
          score: 0.8,
          relationship: 0,
          effects: [{ type: 'endRun', reason: 'agency_exit' }],
          explanation: 'Correct, but late. The intake note about the website was the cue to decline before taking the fee.',
        },
      ],
    },
    {
      id: 'rf_fee_low',
      trigger: { kind: 'forced', redFlag: 'fee_low', week: 2 },
      title: '"$500 or we\'re done"',
      prompt: '"I\'m not paying you more than $500 a month. Take it or leave it."',
      responses: [
        {
          id: 'accept',
          text: 'Accept $500 a month.',
          score: 0.2,
          relationship: 3,
          effects: [{ type: 'feeSet', monthly: 500 }],
          explanation: '$500 is half your minimum. You keep the client and lose money on every hour.',
        },
        {
          id: 'decline',
          text: 'Decline, politely, and end the engagement.',
          score: 0.7,
          relationship: 0,
          effects: [{ type: 'endRun', reason: 'agency_exit' }],
          explanation: 'Right call, late. The intake note about the last agency\'s $500 fee was the cue to walk away at the start.',
        },
      ],
    },
  ];
  if (t.capacity) {
    out.push({
      id: 'rf_no_capacity',
      trigger: { kind: 'forced', redFlag: 'no_capacity', week: 2 },
      title: '"We\'re booked solid"',
      prompt: t.capacity,
      responses: [
        {
          id: 'pause',
          text: 'Pause until they have capacity.',
          score: 0.5,
          relationship: 0,
          effects: [{ type: 'pauseAll' }, { type: 'closeMult', mult: 0.3 }],
          explanation: 'Leads a business can\'t serve are wasted spend. The intake note said the calendar was full; ads can\'t fix capacity.',
        },
        {
          id: 'keep',
          text: 'Keep running so the pipeline stays warm.',
          score: 0.1,
          relationship: -12,
          effects: [{ type: 'closeMult', mult: 0.3 }],
          explanation: 'Leads go cold in hours. Weeks out, almost none convert, and the client blames the ads.',
        },
      ],
    });
  }
  return out;
}
