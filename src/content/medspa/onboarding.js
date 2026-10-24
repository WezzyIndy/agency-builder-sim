// src/content/medspa/onboarding.js
//
// Round 0 onboarding checks (spec 6). Auditing a check reveals whether the
// brief has that defect. Fixing costs more hours. Some defects can't be fixed,
// only disclosed and planned around. The hour budget (6) is not enough to
// audit and fix everything, so prioritizing is part of the skill.
//
// defectKey maps to brief.hidden.defects (or a special case in run.js).
// tracking: true marks the checks the rubric expects audited before launch.

export const ONBOARDING_CHECKS = [
  {
    id: 'pixel',
    tracking: true,
    title: 'Pixel and lead event',
    auditHours: 0.5,
    fixHours: 1.5,
    defectKey: 'doubleFire',
    critical: true,
    clean: 'The Lead event fires once, on the thank-you page.',
    defect: 'The Lead event fires on page view of the booking page. Every visit counts as a lead.',
    fixText: 'Moved the Lead event to the confirmation step.',
  },
  {
    id: 'capi',
    tracking: true,
    title: 'Conversions API',
    auditHours: 0.5,
    fixHours: 2,
    defectKey: 'noCapi',
    critical: false,
    clean: 'Conversions API is connected through the booking software.',
    defect: 'No Conversions API. Browser-only tracking will miss 10-30% of conversions.',
    fixText: 'Connected the Conversions API through the booking platform.',
  },
  {
    id: 'calls',
    tracking: true,
    title: 'Call tracking',
    auditHours: 0.5,
    fixHours: 1.5,
    defectKey: 'noCallTracking',
    critical: false,
    clean: 'Calls from ads are tracked with a forwarding number.',
    defect: 'No call tracking. Phone bookings from ads are invisible to you and to Meta.',
    fixText: 'Set up a tracked forwarding number for ad calls.',
  },
  {
    id: 'crm',
    tracking: true,
    title: 'CRM and offline feedback',
    auditHours: 0.5,
    fixHours: 2.5,
    defectKey: 'noCrm',
    critical: false,
    clean: 'The booking system sends booked and showed-up status back to Meta.',
    defect: 'Nothing flows back from the booking system. You can\'t optimize for qualified leads, and lead quality stays invisible until the client complains.',
    fixText: 'Connected booking outcomes to Meta as offline conversions. The Qualified leads goal is now available.',
  },
  {
    id: 'landing',
    title: 'Landing page',
    auditHours: 0.5,
    fixHours: 2.5,
    defectKey: 'landingWeak',
    critical: false,
    clean: 'Fast page, clear consult offer, short mobile form.',
    defect: 'Slow page, vague offer, and the booking form is unusable on a phone.',
    fixText: 'Rebuilt the page around one consult offer with a three-field mobile form.',
  },
  {
    id: 'speed',
    title: 'Speed-to-lead',
    auditHours: 0.5,
    fixHours: null, // can only advise
    adviseHours: 0.5,
    defectKey: 'slowSpeed',
    critical: false,
    clean: 'Front desk calls new leads back within the hour.',
    defect: 'New leads wait a day or more for a callback. Close rates fall fast after the first hour.',
    adviseText: 'Coached the front desk on a same-hour callback script. You can advise; you can\'t make them do it.',
  },
  {
    id: 'data_source',
    title: 'Data source category',
    auditHours: 0.5,
    fixHours: null, // can't be fixed in onboarding
    defectKey: 'dataRestricted',
    critical: true,
    clean: 'Meta has not restricted this website\'s event sharing.',
    defect: 'Meta categorized the site as health-related and restricted mid- and lower-funnel events. Website Lead and Schedule events can\'t be used for optimization. Plan around it: instant forms with qualifying questions, calls, or messaging.',
  },
];

/** The naming step: custom conversions and audiences named with sensitive terms get disabled. */
export const NAMING_OPTIONS = [
  { id: 'neutral', label: 'consult_booked / site_visitors_30d', hours: 0.5, neutral: true },
  { id: 'sensitive', label: 'botox_booked / filler_interested_30d', hours: 0.5, neutral: false },
];

export function checkById(id) {
  return ONBOARDING_CHECKS.find((c) => c.id === id) || null;
}
