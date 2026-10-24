// src/content/shared/checks.js
//
// Round 0 onboarding checks shared by the home-service lead businesses
// (spec 6), and the ecomm set for boutique apparel. Same shape as
// src/content/medspa/onboarding.js; t supplies the business's own words.
//
// t: { booking: 'estimate request', bookingSystem: 'Jobber', page: 'quote page',
//      offer: 'free estimate', callback: 'the office' }

export function leadChecks(t) {
  return [
    {
      id: 'pixel',
      tracking: true,
      title: 'Pixel and lead event',
      auditHours: 0.5,
      fixHours: 1.5,
      defectKey: 'doubleFire',
      critical: true,
      clean: `The Lead event fires once, when the ${t.booking} form is submitted.`,
      defect: `The Lead event fires on page view of the ${t.page}. Every visit counts as a lead.`,
      fixText: 'Moved the Lead event to the form\'s thank-you step.',
    },
    {
      id: 'capi',
      tracking: true,
      title: 'Conversions API',
      auditHours: 0.5,
      fixHours: 2,
      defectKey: 'noCapi',
      critical: false,
      clean: 'Conversions API is connected through the website platform.',
      defect: 'No Conversions API. Browser-only tracking will miss 10-30% of conversions.',
      fixText: 'Connected the Conversions API through the website platform.',
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
      defect: 'No call tracking. Most customers in this trade call, and those calls are invisible to you and to Meta.',
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
      clean: `${t.bookingSystem} sends booked and sold status back to Meta.`,
      defect: `Nothing flows back from ${t.bookingSystem}. You can't optimize for qualified leads, and lead quality stays invisible until the client complains.`,
      fixText: `Connected ${t.bookingSystem} job outcomes to Meta as offline conversions. The Qualified leads goal is now available.`,
    },
    {
      id: 'landing',
      title: 'Landing page',
      auditHours: 0.5,
      fixHours: 2.5,
      defectKey: 'landingWeak',
      critical: false,
      clean: `Fast page, clear ${t.offer} offer, short mobile form.`,
      defect: 'Slow page, vague offer, and the form is unusable on a phone.',
      fixText: `Rebuilt the page around one ${t.offer} offer with a three-field mobile form.`,
    },
    {
      id: 'speed',
      title: 'Speed-to-lead',
      auditHours: 0.5,
      fixHours: null, // can only advise
      adviseHours: 0.5,
      defectKey: 'slowSpeed',
      critical: false,
      clean: `${t.callback} calls new leads back within the hour.`,
      defect: `New leads wait a day or more for a callback. Homeowners call the next company on the list.`,
      adviseText: `Coached ${t.callback} on a same-hour callback script. You can advise; you can't make them do it.`,
    },
  ];
}

export const ECOMM_CHECKS = [
  {
    id: 'pixel',
    tracking: true,
    title: 'Pixel and purchase event',
    auditHours: 0.5,
    fixHours: 1.5,
    defectKey: 'missingPurchase',
    critical: true,
    clean: 'Purchase fires once on the order confirmation page, with order value.',
    defect: 'No Purchase event. A theme update broke it, so Meta sees add to carts but almost no sales.',
    fixText: 'Reconnected the store\'s Meta integration. Purchase fires with order value again.',
  },
  {
    id: 'capi',
    tracking: true,
    title: 'Conversions API',
    auditHours: 0.5,
    fixHours: 2,
    defectKey: 'noCapi',
    critical: false,
    clean: 'Conversions API is on through the store platform\'s Meta integration.',
    defect: 'No Conversions API. iOS and ad blockers hide 10-30% of purchases from Meta.',
    fixText: 'Turned on the Conversions API in the store\'s Meta integration.',
  },
  {
    id: 'landing',
    title: 'Product pages and checkout',
    auditHours: 0.5,
    fixHours: 2.5,
    defectKey: 'landingWeak',
    critical: false,
    clean: 'Fast product pages, clear sizing, and a one-page checkout with wallet payments.',
    defect: 'Slow product pages, no size guide, and a four-step checkout with forced account creation.',
    fixText: 'Added a size guide, turned on wallet payments, and removed forced account creation.',
  },
];
