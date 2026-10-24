// src/engine/metaRules.js
//
// Meta campaign rules (spec 7.3-7.5): which performance goals each
// objective and conversion location allows, which conversion events a goal
// needs, Advantage+ audience controls, and how a chosen setup maps to the
// simulation's lead source, cost, and quality multipliers.
//
// Option lists return { id, label, available, reason } so the UI can grey
// out invalid choices with the reason, and the reducer can reject them.

import { TUNABLES } from '../config/tunables.js';

export const OBJECTIVES = {
  awareness: {
    label: 'Awareness',
    locations: { none: ['reach', 'impressions', 'ad_recall', 'thruplay', 'video_views_2s'] },
  },
  traffic: {
    label: 'Traffic',
    locations: {
      website: ['landing_page_views', 'link_clicks', 'daily_unique_reach', 'conversations', 'impressions'],
      messaging_apps: ['link_clicks', 'daily_unique_reach', 'conversations', 'impressions'],
      instagram_profile: ['profile_visits'],
      calls: ['calls'],
    },
  },
  engagement: {
    label: 'Engagement',
    locations: {
      messaging_apps: ['conversations', 'leads_messaging', 'link_clicks'],
      on_ad_video: ['thruplay', 'video_views_2s'],
      on_ad_post: ['post_engagement', 'daily_unique_reach', 'impressions'],
      on_ad_events: ['event_responses', 'post_engagement', 'daily_unique_reach', 'impressions'],
      calls: ['calls'],
      website: ['conversions', 'landing_page_views', 'link_clicks', 'daily_unique_reach', 'impressions'],
      facebook_page: ['page_likes'],
    },
  },
  leads: {
    label: 'Leads',
    locations: {
      website: ['leads', 'qualified_leads'],
      website_calls: ['qualified_leads'],
      website_instant: ['qualified_leads'],
      instant_forms: ['leads', 'qualified_leads'],
      messenger: ['leads', 'leads_messaging'],
      instagram: ['leads', 'leads_messaging'],
      instant_messenger: ['leads'],
      whatsapp: ['conversations', 'leads_messaging'],
      calls: ['calls'],
    },
  },
  sales: {
    label: 'Sales',
    locations: {
      website: ['conversions', 'value', 'landing_page_views', 'link_clicks', 'daily_unique_reach', 'impressions'],
      website_shop: ['conversions', 'value'],
      messaging_apps: ['conversions', 'purchases_messaging', 'link_clicks', 'daily_unique_reach'],
      calls: ['calls'],
      catalog: ['conversions', 'value', 'link_clicks', 'impressions'],
    },
  },
};

export const LOCATION_LABELS = {
  none: 'No conversion location',
  website: 'Website',
  messaging_apps: 'Messaging apps',
  instagram_profile: 'Instagram profile',
  calls: 'Calls',
  on_ad_video: 'On your ad: video',
  on_ad_post: 'On your ad: post',
  on_ad_events: 'On your ad: event',
  facebook_page: 'Facebook Page',
  website_calls: 'Website and calls',
  website_instant: 'Website and instant forms',
  instant_forms: 'Instant forms',
  messenger: 'Messenger',
  instagram: 'Instagram',
  instant_messenger: 'Instant forms and Messenger',
  whatsapp: 'WhatsApp',
  website_shop: 'Website and shop',
  catalog: 'Catalog',
};

export const GOAL_LABELS = {
  reach: 'Reach',
  impressions: 'Impressions',
  ad_recall: 'Ad recall lift',
  thruplay: 'ThruPlay',
  video_views_2s: '2-second continuous video views',
  landing_page_views: 'Landing page views',
  link_clicks: 'Link clicks',
  daily_unique_reach: 'Daily unique reach',
  conversations: 'Conversations',
  profile_visits: 'Instagram profile visits',
  calls: 'Calls',
  leads_messaging: 'Leads through messaging',
  post_engagement: 'Post engagement',
  event_responses: 'Event responses',
  conversions: 'Conversions',
  page_likes: 'Page likes',
  leads: 'Leads',
  qualified_leads: 'Qualified leads',
  value: 'Value',
  purchases_messaging: 'Purchases through messaging',
};

export const EVENT_LABELS = {
  lead: 'Lead',
  schedule: 'Schedule',
  contact: 'Contact',
  complete_registration: 'Complete registration',
  purchase: 'Purchase',
  add_to_cart: 'Add to cart',
  initiate_checkout: 'Initiate checkout',
};

/** Website pixel events (blocked when Meta restricts the site's data source). */
const PIXEL_EVENTS = ['lead', 'schedule', 'contact', 'complete_registration', 'purchase', 'add_to_cart', 'initiate_checkout'];
const WEBSITE_LOCATIONS = ['website', 'website_calls', 'website_instant', 'website_shop'];

/** Does this objective / location / goal need a conversion event chosen? */
export function needsEvent(objective, location, goal) {
  if (goal === 'value') return true;
  if (goal === 'conversions' && (location === 'website' || location === 'website_shop')) return true;
  return objective === 'leads' && location === 'website' && goal === 'leads';
}

export function eventsFor(objective, location, goal) {
  if (!needsEvent(objective, location, goal)) return [];
  if (goal === 'value') return ['purchase'];
  if (objective === 'leads') return ['lead', 'schedule', 'contact', 'complete_registration'];
  return ['purchase', 'add_to_cart', 'initiate_checkout', 'lead', 'schedule', 'contact'];
}

/**
 * ctx: { dataRestricted, crmFixed, isEcomm, sensitiveNames }
 * Returns availability for a goal at a location.
 */
function goalAvailability(objective, location, goal, ctx) {
  if (ctx.dataRestricted && WEBSITE_LOCATIONS.includes(location) && ['leads', 'qualified_leads', 'conversions', 'value'].includes(goal)) {
    return { available: false, reason: 'Restricted by data source category' };
  }
  if (goal === 'qualified_leads' && !ctx.crmFixed) {
    return { available: false, reason: 'Needs CRM / offline feedback connected in onboarding' };
  }
  return { available: true, reason: null };
}

export function objectiveOptions() {
  return Object.entries(OBJECTIVES).map(([id, o]) => ({ id, label: o.label, available: true, reason: null }));
}

export function locationOptions(objective) {
  const o = OBJECTIVES[objective];
  if (!o) return [];
  return Object.keys(o.locations).map((id) => ({ id, label: LOCATION_LABELS[id], available: true, reason: null }));
}

export function goalOptions(objective, location, ctx) {
  const goals = OBJECTIVES[objective]?.locations[location];
  if (!goals) return [];
  return goals.map((id) => ({ id, label: GOAL_LABELS[id], ...goalAvailability(objective, location, id, ctx) }));
}

export function eventOptions(objective, location, goal, ctx) {
  return eventsFor(objective, location, goal).map((id) => {
    let available = true;
    let reason = null;
    if (ctx.dataRestricted && PIXEL_EVENTS.includes(id)) {
      available = false;
      reason = 'Restricted by data source category';
    } else if (ctx.sensitiveNames && id === 'schedule') {
      available = false;
      reason = 'Custom conversion disabled: sensitive name';
    }
    return { id, label: EVENT_LABELS[id], available, reason };
  });
}

export const AUDIENCE_OPTIONS = [
  { id: 'controls', label: 'Advantage+ audience, controls only', minAgeFloor: 18 },
  { id: 'suggestions', label: 'Advantage+ audience with suggestions', minAgeFloor: 18 },
  { id: 'limited', label: 'Advantage+ audience off (further limited)', minAgeFloor: 13 },
];

export const MIN_AGES = [13, 18, 21, 25, 30];

/** Validates one ad set's setup. Returns a list of error strings (empty = valid). */
export function validateAdSet(adSet, ctx, angleIds) {
  const errors = [];
  const { objective, location, goal, event } = adSet;
  if (!OBJECTIVES[objective]) return [`Unknown objective ${objective}`];
  if (!OBJECTIVES[objective].locations[location]) errors.push(`${LOCATION_LABELS[location] || location} isn't a conversion location for ${OBJECTIVES[objective].label}`);
  else {
    const g = goalOptions(objective, location, ctx).find((x) => x.id === goal);
    if (!g) errors.push(`${GOAL_LABELS[goal] || goal} isn't a goal for this location`);
    else if (!g.available) errors.push(`${g.label}: ${g.reason}`);
    if (needsEvent(objective, location, goal)) {
      const ev = eventOptions(objective, location, goal, ctx).find((x) => x.id === event);
      if (!ev) errors.push('Pick a conversion event');
      else if (!ev.available) errors.push(`${ev.label}: ${ev.reason}`);
    }
  }
  const aud = AUDIENCE_OPTIONS.find((a) => a.id === adSet.audience?.option);
  if (!aud) errors.push('Pick an audience option');
  else if (!(adSet.audience.minAge >= aud.minAgeFloor)) errors.push(`Minimum age can't be below ${aud.minAgeFloor} with ${aud.label}`);
  if (!Array.isArray(adSet.angles) || adSet.angles.length === 0) errors.push('Pick at least one messaging angle');
  else if (angleIds && adSet.angles.some((a) => !angleIds.includes(a))) errors.push('Unknown angle');
  if (location === 'instant_forms' || location === 'website_instant' || location === 'instant_messenger') {
    if (!['volume', 'higher_intent'].includes(adSet.formType)) errors.push('Pick an instant form type');
  }
  return errors;
}

/**
 * Maps a setup to simulation multipliers for a LEADS business.
 * Returns { kind: 'lead'|'trap', source, cpl, close, conv, cpc, usesPixel, callTracked,
 *           qualified, eventsPerLead, label }.
 *   cpl     structural cost-per-lead multiplier (inside the clamp)
 *   close   close-rate multiplier from lead source and event
 *   conv    multiplier on true leads that bypasses the clamp (traps)
 *   cpc     click-cost multiplier for traps (cheap clicks)
 *   eventsPerLead  optimization events per true lead (learning volume)
 */
export function resolveLeadSetup(adSet) {
  const T = TUNABLES;
  const src = T.leadSource;
  const { objective, location, goal, event } = adSet;
  const formSrc = adSet.formType === 'higher_intent' ? 'instantHigh' : 'instantVolume';
  const lead = (source, extra = {}) => ({
    kind: 'lead',
    source,
    cpl: src[source].cpl,
    close: src[source].close,
    conv: 1,
    cpc: 1,
    usesPixel: false,
    qualified: false,
    eventsPerLead: 1,
    ...extra,
  });
  const blend = (a, b) => ({
    kind: 'lead',
    source: `${a}+${b}`,
    cpl: (src[a].cpl + src[b].cpl) / 2,
    close: (src[a].close + src[b].close) / 2,
    conv: 1,
    cpc: 1,
    usesPixel: a === 'form' || b === 'form',
    qualified: false,
    eventsPerLead: 1,
  });
  const trap = (conv, cpc, optimizesFor) => ({
    kind: 'trap',
    source: 'form',
    cpl: 1,
    close: src.form.close,
    conv,
    cpc,
    usesPixel: false,
    qualified: false,
    // Trap goals optimize on cheap, frequent events (clicks, views), so learning is never the limit.
    eventsPerLead: 50,
    optimizesFor,
  });
  const withQualified = (r) => ({ ...r, qualified: true, cpl: r.cpl * T.qualifiedGoal.cpl });
  const websiteEvent = (base, ev) => {
    if (ev === 'schedule') return { ...base, cpl: base.cpl * T.scheduleEvent.cpl, close: base.close * T.scheduleEvent.close, eventsPerLead: 1 };
    if (ev === 'contact') return { ...base, cpl: base.cpl * 1.05 };
    if (ev === 'complete_registration') return { ...base, cpl: base.cpl * 1.1, close: base.close * 0.9 };
    return base;
  };

  if (objective === 'awareness') return trap(T.traps.awarenessConv, 0.5, 'reach');
  if (goal === 'calls') {
    const weaker = objective === 'leads' || objective === 'sales' ? 1 : T.weaker.trafficCalls;
    return { ...lead('call'), cpl: src.call.cpl * weaker };
  }
  if (objective === 'traffic') return trap(T.traps.trafficConv, T.traps.trafficCpc, 'clicks');
  if (objective === 'leads') {
    if (location === 'website') {
      const base = lead('form', { usesPixel: true });
      return goal === 'qualified_leads' ? withQualified(base) : websiteEvent(base, event);
    }
    if (location === 'website_calls') return withQualified(blend('form', 'call'));
    if (location === 'website_instant') return withQualified(blend('form', formSrc));
    if (location === 'instant_forms') {
      const base = lead(formSrc);
      return goal === 'qualified_leads' ? withQualified(base) : base;
    }
    if (location === 'instant_messenger') return blend(formSrc, 'messaging');
    if (location === 'whatsapp' && goal === 'conversations') {
      return { ...lead('messaging'), cpl: src.messaging.cpl * T.weaker.conversationsGoal };
    }
    return lead('messaging');
  }
  if (objective === 'engagement') {
    if (location === 'messaging_apps' && goal === 'leads_messaging') return { ...lead('messaging'), cpl: src.messaging.cpl * T.weaker.engagementLead };
    if (location === 'messaging_apps' && goal === 'conversations') {
      return { ...lead('messaging'), cpl: src.messaging.cpl * T.weaker.engagementLead * T.weaker.conversationsGoal };
    }
    if (location === 'website' && goal === 'conversions' && ['lead', 'schedule', 'contact'].includes(event)) {
      const base = websiteEvent(lead('form', { usesPixel: true }), event);
      return { ...base, cpl: base.cpl * T.weaker.engagementLead };
    }
    return trap(T.traps.engagementConv, 0.6, 'engagement');
  }
  if (objective === 'sales') {
    if ((location === 'website' || location === 'website_shop') && goal === 'conversions' && ['lead', 'schedule', 'contact'].includes(event)) {
      const base = websiteEvent(lead('form', { usesPixel: true }), event);
      return { ...base, cpl: base.cpl * T.weaker.salesLeadEvent };
    }
    if (location === 'messaging_apps' && goal === 'conversions') return { ...lead('messaging'), cpl: src.messaging.cpl * T.weaker.salesLeadEvent };
    if (['conversions', 'value', 'purchases_messaging'].includes(goal)) {
      // A service business has no purchase event: delivery starves.
      return { ...trap(T.traps.salesNoPurchaseConv, 1, 'purchase'), eventsPerLead: 0.05 };
    }
    return trap(T.traps.trafficConv, T.traps.trafficCpc, 'clicks');
  }
  return trap(T.traps.trafficConv, 1, 'unknown');
}

/** Is this setup the right objective for a leads business? */
export function objectiveFitsLeads(adSet) {
  return adSet.objective === 'leads';
}
