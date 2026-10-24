// src/content/intake.js
//
// Client intake notes shown on the Ads Manager Only brief. With no pitch to
// ask discovery questions, these notes are where a red flag can be spotted.
// Red-flag notes hint; they never name the flag outright. Benign notes are
// mixed in so a note alone is not proof of trouble.

export const RED_FLAG_NOTES = {
  guarantee: [
    'Owner said they "need to see it working right away" and asked what you guarantee for the first two weeks.',
    'Owner: "The last guy needed a month to warm up. I don\'t pay for warming up."',
  ],
  short_funding: [
    'Owner wants to "try it for a few weeks and see" before committing more.',
    'Owner asked if they can stop any time after the second invoice.',
  ],
  no_access: [
    'Owner is protective of the website. "My nephew built it. Nobody touches it but him."',
    'Owner asked why you would need logins to anything. "Just run the ads."',
  ],
  no_capacity: [
    'Front desk mentioned the calendar is "pretty full for the next month or so."',
    'Owner: "Honestly we\'re booked solid, but I want to keep the pipeline warm."',
  ],
  fee_low: [
    'Owner said the last agency "charged way too much" at $500 a month.',
    'Owner asked whether the fee could be "more like a few hundred bucks."',
  ],
};

export const BENIGN_NOTES = [
  'Owner prefers updates by text on Monday mornings.',
  'They tried boosting posts last spring. "Got likes, not customers."',
  'Office manager handles the inbox and the phones.',
  'Owner wants to grow without discounting.',
  'Most customers find them through word of mouth today.',
  'They have about 40 Google reviews, mostly five stars.',
  'Owner is curious about Instagram but has never run ads there.',
  'They are opening a second location next year.',
];
