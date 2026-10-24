// src/content/medspa/angles.js
//
// Med spa messaging angles (spec 7.2, 5.5). Each angle carries:
//   publicRating - what an experienced marketer would expect (visible as a hint after play)
//   resonance    - hidden multiplier on conversion rate per audience option; a per-brief
//                  random offset scaled by realism is applied on top at simulation time
//   policyFlag   - none | inferiority | personal_attribute | timeframe | before_after
// The compliant rewrite for each flag lives in debrief.js.

export const ANGLES = [
  {
    id: 'expert_injectors',
    title: 'Expertise',
    copy: 'Natural-looking results from licensed nurse injectors. Book a free consult.',
    policyFlag: 'none',
    resonance: { controls: 1.02, suggestions: 1.03, limited: 0.95 },
    note: 'Trust and credentials. Strong for first-time injectable clients, who worry most about looking "done."',
  },
  {
    id: 'new_client_offer',
    title: 'New-client offer',
    copy: 'New clients: $50 off your first treatment, plus a free skin consult.',
    policyFlag: 'none',
    resonance: { controls: 0.99, suggestions: 0.98, limited: 0.93 },
    note: 'A clear offer lifts conversion rate, but discount-led leads can be price shoppers.',
  },
  {
    id: 'before_after',
    title: 'Before and after',
    copy: 'Real clients, real results. See our before-and-after gallery.',
    policyFlag: 'before_after',
    resonance: { controls: 1.04, suggestions: 1.03, limited: 0.96 },
    note: 'Allowed by Meta at 18+ for cosmetic procedures, but automated review sometimes rejects it in error.',
  },
  {
    id: 'tired_of_wrinkles',
    title: 'Pain point',
    copy: 'Tired of your wrinkles? You don\'t have to live with them.',
    policyFlag: 'personal_attribute',
    resonance: { controls: 1.08, suggestions: 1.08, limited: 0.99 },
    note: 'Implies knowledge of the viewer\'s appearance. Meta prohibits asserting or implying personal attributes.',
  },
  {
    id: 'ten_years_younger',
    title: 'Fast results',
    copy: 'Look 10 years younger in one lunch break. Guaranteed.',
    policyFlag: 'timeframe',
    resonance: { controls: 1.07, suggestions: 1.06, limited: 0.98 },
    note: 'A specific outcome in a set timeframe, with no qualifier. Prohibited under Meta\'s health and wellness policy.',
  },
];

export const PROHIBITED_FLAGS = ['inferiority', 'personal_attribute', 'timeframe'];

export function angleById(id) {
  return ANGLES.find((a) => a.id === id) || null;
}
