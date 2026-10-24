# Agency Builder Sim — Build Spec (v4)

Status: v4 for owner review. Revised from v3 (2026-10-20) on 2026-10-24, using the v3 review (`claude/agency-builder-sim-v3-review.md`) and the owner's answers of 2026-10-24.

Labels used throughout:
- **[STATED]** = owner said it.
- **[SOURCED]** = researched, with source in Section 18.
- **[DERIVED]** = computed from sourced figures. The math is shown.
- **[ASSUMPTION]** = proposed by the spec author, not confirmed. Listed in Section 19.
- **[DESIGN]** = tunable game-design value. Not a real-world fact. Calibrate through the harness (Section 16).
- **[UNVERIFIED]** = must be researched or checked in a live platform before coding.

---

## 0. Changes from v3

1. **Difficulty is set per business** (5.4) [STATED 2026-10-24]. The universal 70/20/10 mix is gone. Simulation showed it was unreachable for 5 of 6 businesses.
2. **Difficulty comes from three sources** (5.4): economics, operational complications, and client red flags. High-ticket businesses (roofing, landscaping, HVAC, med spa) are almost always economically viable, so their hard and unviable briefs come from the other two.
3. **Classification bands closed** (5.4): achievable ≥ 0.9, hard 0.6–0.9, unviable < 0.6. v3 left 0.6–0.7 unassigned.
4. **The agency fee is part of client economics** (5.3) [STATED 2026-10-24]. Client profit and the Business target subtract the fee.
5. **Ecomm is classified on CPA, not ROAS** (5.3). v3 compared brief AOV against a benchmark ROAS that implies a different AOV.
6. **Default fee model:** hybrid, $1,000/month + 10% of ad spend. **Default target hourly rate:** $75 (12) [STATED: owner accepted defaults 2026-10-24].
7. **Fee ranges sourced** (12, 18.9). The evidence is weak (agency pricing guides).
8. **HVAC replacement leads cost more** (5.2, 18.3). Meta typical $107 (2.5× Home); Search typical $227.30 (2.5× Home) [owner delegated the decision 2026-10-24].
9. **HVAC teaching point rewritten** (5.1). v3's "~14% real close rate" citation does not exist on the cited page. The real lesson is job value.
10. **Meta audience options verified** (7.5).
11. **Med spa policy layer verified and built out** (5.5). Includes Meta's data-source restriction as a new hidden tracking defect (6).
12. **Google drug-name keywords are always disapproved in v1** (5.5, 8) [STATED 2026-10-24]. Certification is deferred as a future onboarding task.
13. **Owner-account benchmark check deferred** (19.3). The owner's account is not running lead campaigns in the off-season [STATED 2026-10-24].
14. **Close-rate ranges confirmed** for v1 [STATED 2026-10-24].

---

## 1. Purpose

A single-player web game that builds the owner's skills and confidence to launch and run a digital marketing agency for small and medium businesses (local service and ecommerce). [STATED]

- **Channels.** Primary: paid social (Meta). Secondary: Google Search. [STATED]
- **Where the owner starts.** Professional-level Meta skills from large-corporate banking. The gap is SMB and ecomm/local-service work. [STATED]
- **Search target level:** entry level. Basic structure, keywords and match types, bidding. [STATED]
- **Confidence targets:** the pitch process, and belief that he can deliver for an ecomm or local-service client. [STATED]
- **The game also trains the agency side** that makes SMB work succeed or fail [ASSUMPTION]:
  - client onboarding and measurement setup
  - lead quality
  - client relationship management
  - agency pricing and profitability
  - knowing when to walk away
- **It trains strategy, not button-clicking** in the real platforms. The UI is stylized, not an Ads Manager clone. [STATED]
- **Honest limit:** all results are simulated from benchmark ranges plus randomness. The game builds intuition and repetition. It does not prove real-world delivery. The debrief and the About screen must say this plainly.

## 2. Modes

Four entry points from the main menu: [STATED]

1. **Full Run (linked):** Pitch → Onboarding → run that client's campaign. Promises and the agreed fee carry into the campaign.
2. **Pitch Only:** practice the pitch with no campaign.
3. **Ads Manager Only:** receive a generated client brief, with a pre-set client expectation and the default fee, then Onboarding → campaign.
4. **Sandbox:** no failure states. All settings adjustable, including realism slider, budget, level, business, and fee. Scores are recorded but flagged "Sandbox" and excluded from unlock math. [STATED; exclusion is ASSUMPTION]

- **Campaign length:** defaults to **8 weeks** and varies by client. [STATED] Range 4–12 weeks. [ASSUMPTION]
- **Round 0** = onboarding. Each later round = 1 simulated week. [STATED for weeks; Round 0 is ASSUMPTION]

## 3. Levels and progression

Levels are based on budget, platforms, and campaign complexity. They are NOT based on business type. [STATED]

| Level | Monthly budget | Platforms / features |
|---|---|---|
| L1 | $1–3K | Meta only. Advantage+ setup is the default; manual setup available. |
| L2 | $3–10K | Adds Google Search |
| L3 | $10–25K | Adds retargeting, catalogs, plus TikTok, Snapchat, Google Shopping, Performance Max as built |
| L4 | $25K+ | Multi-campaign, multi-platform |

- L3–L4 contents [STATED]. L3–L4 are **out of v1**.
- **Advantage+ is the default campaign setup** [STATED 2026-10-20]. Meta's help center says the recommended Advantage+ setup applies to Sales, Leads, and App promotion and is rolling out to Traffic, Awareness, and Engagement, with manual options still available [SOURCED].

**Unlock rule.** The owner's rule is client satisfaction on performance compared to what was promised in the pitch. [STATED] Threshold [ASSUMPTION], over the last 3 non-Sandbox campaigns at the current level:
- average Satisfaction ≥ 70%, AND
- average Performance ≥ 60%.

The Performance condition blocks winning on satisfaction alone. Correct walk-aways count as completed campaigns with Satisfaction 100 and Performance 100 [DESIGN], so declining a bad client is never penalized.

## 4. v1 scope and build order

### 4.1 In v1 [STATED approved]
- L1–L2 only (Meta + Google Search)
- 6 businesses: HVAC, roofing, landscaping, cleaning, med spa, boutique apparel
- Pitch mode, Ads mode, linked and standalone, plus Sandbox
- Onboarding stage, client events, agency economics [ASSUMPTION]
- Teaching debrief with counterfactual, explainers (toggleable), score history
- Realism slider

Later: L3–L4, TikTok, Snapchat, Google Shopping, Performance Max, Search for boutique apparel, ecomm repeat-purchase LTV, Google healthcare certification as an onboarding task, and the remaining businesses (supplements, home goods, pet products, dental).

### 4.2 Build order [ASSUMPTION]

Content is the real cost: 6 businesses × pitch trees × keyword banks × angle sets × events × debrief text. Build one complete vertical slice, calibrate it, then expand.

| Milestone | Contents | Exit criteria |
|---|---|---|
| M0 Engine | Benchmark JSON, economics JSON, brief generator, funnel engine, seeded RNG, calibration harness. No UI. | Harness passes for med spa (Section 16) |
| M1 Slice | Med spa, L1 Meta, Ads Manager Only mode, Onboarding, 8 weeks, client events, satisfaction, round + final debrief with counterfactual. Local storage. | Playable on phone; one run ≤ 30 min; harness still passes |
| M2 Pitch | Med spa pitch tree (5 stages), prep screen, fee model, red-flag discovery, Full Run linking, walk-away | Promises and fee carry into campaign; sandbag test fails as intended; red flags discoverable |
| M3 Search | Med spa L2 Search: keyword bank (incl. drug-term disapprovals), match types, negatives, search terms report, manual CPC | Harness passes for Search |
| M4 Content | Remaining 5 businesses | Harness passes per business |
| M5 Platform | Firebase sync, score history views, Sandbox, explainers, About screen | Progress syncs phone ↔ desktop |

## 5. Business catalog and procedural briefs

Briefs are procedurally generated from industry standards. [STATED] No real client data is used. [STATED]

### 5.1 Brief contents and economics ranges

Each generated brief contains:
- business name, type, location size
- goal (leads or sales)
- monthly budget (per level)
- first job value (or AOV for ecomm)
- 12-month customer value (first job plus expected repeat revenue in 12 months)
- lead close rate
- gross margin
- lead mix (HVAC only: service vs replacement share)
- client speed-to-lead (fast / average / slow)
- seasonality flag
- campaign length
- hidden tracking state (Section 6)
- hidden fee tolerance (Section 12)
- hidden complications and red flags (Section 5.4)
- difficulty class (Section 5.4; hidden from the player)
- **Business target** (Section 5.3)

In Ads Manager Only mode, the brief also includes a pre-set **client expectation**, which stands in for the Promise, and uses the default fee.

**Generator ranges** (low / typical / high). Draw each value from a triangular distribution on these three points [DESIGN]. Sources and strength notes are in Section 18.8. Close rates confirmed by the owner for v1 [STATED 2026-10-24].

| Business | First job value | 12-month customer value | Close rate | Gross margin |
|---|---|---|---|---|
| HVAC – service | $200 / $450 / $720 | $450 / $540 / $1,160 | 20% / 30% / 45% | 50% / 58% / 65% |
| HVAC – replacement | $7,500 / $12,000 / $22,000 | = first job * | 10% / 25% / 40% | 40% / 48% / 55% |
| Roofing (replacement) | $8,000 / $20,000 / $30,000 | = first job * | 10% / 25% / 45% | 20% / 30% / 45% |
| Landscaping (project) | $1,250 / $3,600 / $10,000 | = first job * | 20% / 35% / 60% | 30% / 45% / 60% |
| House cleaning | $150 / $200 / $256 | $200 / $1,500 / $4,550 | 20% / 30% / 40% | 50% / 55% / 65% |
| Med spa | $216 / $400 / $484 | $1,800 / $3,000 / $5,200 | 15% / 30% / 50% | 50% / 60% / 70% |
| Boutique apparel | AOV $60 / $85 / $150 | not modeled in v1 * | n/a (uses CVR) | 45% / 60% / 67% |

\* [DESIGN] pick, not sourced.

Notes:
- **HVAC lead mix.** Each HVAC brief draws a service share of leads, triangular 50% / 70% / 90% [DESIGN]. Service and replacement leads are separate pools with their own close rate, job value, margin, and benchmark CPL (5.2). The client's realized value comes from the actual mix delivered.
- **HVAC teaching point** [DERIVED from typical values]: the danger is valuing every lead as a replacement. Typical value per service lead ≈ $86 (495 × 0.30 × 0.58). Typical value per replacement lead ≈ $1,440 (12,000 × 0.25 × 0.48). A 70:30 mix is worth ≈ $492 per lead. If a campaign delivers 90% tune-up leads, value per lead falls to ≈ $222. Close rates barely differ between the two pools; job value differs about 25×. The debrief teaches mix, not close rate.
- **Landscaping repeat revenue** (maintenance contracts) is not sourced. v1 models project work only.
- **Apparel repeat purchases** are not sourced. v1 judges ecomm on first-order economics only.
- **Cleaning** template can be sanity-checked against the owner's own business, but the owner's business is exterior cleaning, which this row does not model (5.2).

### 5.2 Business-to-benchmark mapping

| Business | Goal type | Ad benchmark category | v1 platforms |
|---|---|---|---|
| HVAC – service leads | Leads (calls/forms) | Home & Home Improvement | Meta, Search |
| HVAC – replacement leads | Leads | Home & Home Improvement × 2.5 (18.3) | Meta, Search |
| Roofing | Leads | Meta: Home & Home Improvement. Search: Home + roofing CPC premium (18.2) | Meta, Search |
| Landscaping | Leads | Home & Home Improvement | Meta, Search |
| Cleaning (residential house cleaning) | Leads | Home & Home Improvement [ASSUMPTION] | Meta, Search |
| Med spa | Leads (bookings) | Meta: Beauty & Personal Care. Search: Personal Services. (Proxies; no med-spa ad benchmark verified.) | Meta, Search |
| Boutique apparel | Sales (ecomm) | Lifestyle & Boutique (primary), Apparel & Accessories (range edge) | Meta only [ASSUMPTION: no verified Search CPC/CVR] |

### 5.3 Client economics and the Business target

**Value per customer** [DESIGN formula]:
```
value_per_customer = first_job_value + ltv_weight * (twelve_month_value - first_job_value)
ltv_weight = 0.5   (client discounts uncertain repeat revenue; tunable)
```

**Breakeven, before fees** [standard formulas]:
- Lead business: breakeven CPL = value_per_customer × close rate × gross margin.
- HVAC: compute per lead pool, then weight by the brief's service share.
- Ecomm: breakeven CPA = AOV × gross margin.

**The agency fee is a client cost** [STATED 2026-10-24]. The client pays ad spend plus the fee. The Business target is expressed as the **ad-platform** cost per result the player must hit, after the fee:

```
fee            = agreed fee (Full Run) or default fee (Ads Manager Only)
ad_share       = monthly_spend / (monthly_spend + fee)
target_ad_CPL  = breakeven_CPL * k * ad_share        k ~ uniform(0.5, 0.8)
target_ad_CPA  = breakeven_CPA * k * ad_share        (ecomm)
target_ROAS    = AOV / target_ad_CPA                 (ecomm, display only)
```

- `k` keeps a profit cushion: the client needs profit, not breakeven [DESIGN].
- **Full Run:** the Business target is recomputed after the fee is agreed. A higher fee shrinks the target the player must hit. This is the main pricing lesson.
- **Ecomm uses CPA** for the target and for classification, because the engine computes revenue from the brief's AOV, not the benchmark's implied AOV (18.6). ROAS is shown to the player but derived from CPA.

**Typical-value check** [DERIVED from 5.1 typical values, k = 0.65, default fee]:

L1 typical: spend $2,000, fee $1,200, ad share 0.625.
L2 typical: spend $6,000, fee $1,600, ad share 0.789.

| Business | Breakeven CPL | L1 target ad CPL | L1 ratio to Meta benchmark | L2 target ad CPL | L2 ratio Meta / Search |
|---|---|---|---|---|---|
| HVAC – service only | $86 | $35 | 0.81 (hard) | $44 | 1.03 / 0.49 |
| HVAC – replacement only | $1,440 | $585 | 5.47 | $739 | 6.91 / 3.25 |
| HVAC – 70:30 blend | $492 | $200 | 3.22 | $253 | 4.06 / 1.92 |
| Roofing | $1,500 | $609 | 14.19 | $770 | 17.92 / 6.88 |
| Landscaping | $567 | $230 | 5.36 | $291 | 6.77 / 3.20 |
| House cleaning | $140 | $57 | 1.33 | $72 | 1.68 / 0.79 |
| Med spa | $306 | $124 | 2.44 | $157 | 3.08 / 2.88 |
| Boutique apparel | CPA $51 | CPA $20.72 (ROAS 4.10) | 0.66 vs CPA $31.16 (hard) | CPA $26.17 (ROAS 3.25) | 0.84 |

What this shows:
- **Low-ticket businesses are where the economics bite.** Cleaning and HVAC service on Search, and boutique apparel at L1, are often hard or unviable once the fee is counted.
- **The fee is the binding constraint at L1.** At $2,000 spend, the default fee is 60% of ad spend. The debrief should say so.
- **High-ticket lead businesses are economically viable on paper.** Their difficulty comes from lead volume, lead quality, tracking, speed-to-lead, and the client (5.4).

**The debrief always shows client profit, after fees:**
- Leads: true jobs × job value × margin − ad spend − agency fee (first-job basis), plus the 12-month view.
- Ecomm: true revenue × margin − ad spend − agency fee.
- Also show an "ads only" line (before fee) so the player sees how much of the client's profit the fee took.

### 5.4 Difficulty per business [STATED: per business; mix values DESIGN]

**Classification.** ratio = target ad cost ÷ benchmark typical cost.
- achievable: ratio ≥ 0.9
- hard: 0.6 ≤ ratio < 0.9
- unviable: ratio < 0.6

**Three sources of difficulty:**

| Source | Makes a brief | How |
|---|---|---|
| Economics | hard or unviable | The drawn economics land in that ratio band |
| Complications | hard | Achievable economics plus 2 complications from the list below |
| Red flags | unviable | Achievable economics plus 1 client red flag (below). Walking away is correct. |

**Complications** [DESIGN] (draw 2, applicable to the business):
- critical tracking defect (Section 6)
- slow speed-to-lead
- off-season start (seasonality multiplier < 1 for the first half)
- budget at the bottom 15% of the level range
- HVAC: service share ≥ 85%
- med spa: Meta data source partially restricted (Section 6)
- landing page with weak offer and no mobile form

**Client red flags** [DESIGN]. Each is discoverable by a specific discovery question (11.3). Undiscovered, it plays out mid-campaign and usually triggers a failure state.
- Demands guaranteed results within 2 weeks and won't accept a ramp period.
- Won't fund at least 4 weeks.
- Refuses to give access to tracking or the website.
- No capacity to take more jobs ("we're booked 6 weeks out").
- Fee tolerance below the agency's minimum (12).

**Target mix per business** (achievable / hard / unviable) [DESIGN]:

| Business | Target mix | Natural economic mix, L1 Meta [DERIVED] | Natural economic mix, L2 Search [DERIVED] | Where hard/unviable come from |
|---|---|---|---|---|
| Roofing | 70 / 20 / 10 | 100 / 0 / 0 | 100 / 0 / 0 | complications, red flags |
| Landscaping | 70 / 20 / 10 | 100 / 0 / 0 | 100 / 0 / 0 | complications, red flags |
| HVAC | 65 / 25 / 10 | 100 / 0 / 0 (blended) | 99 / 1 / 0 | complications (lead-mix skew first), red flags |
| Med spa | 70 / 20 / 10 | 100 / 0 / 0 | 100 / 0 / 0 | complications (data restriction, policy), red flags |
| House cleaning | 60 / 25 / 15 | 87 / 9 / 4 | 60 / 25 / 16 | economics first, then complications/red flags |
| Boutique apparel | 45 / 35 / 20 | 18 / 52 / 29 | n/a (L2 Meta: 49 / 45 / 6) | economics first, then complications/red flags |

Natural mixes come from 20,000 simulated briefs per business per level with the default fee (`mix_v4.py`).

**Generation order** [DESIGN]:
1. Draw the target class from the business's target mix.
2. Draw economics (5.1), budget, and fee. Compute the Business target (5.3) and its ratio.
3. If the natural economic share of the target class is ≥ 2% at this level and channel, resample economics until the ratio lands in that class (cap: 200 draws).
4. Otherwise, or if the cap is hit, draw achievable economics and apply the lever: 2 complications for hard, 1 red flag for unviable.
5. Record the class and its source on the brief (hidden; revealed in the debrief).

For multi-channel briefs (L2), classify on the channel with the higher ratio (the player's best option).

### 5.5 Med spa policy layer [SOURCED except where marked]

**Meta** (Meta help center, 18.7):
- **Allowed when targeting 18+:** cosmetic procedures, including dermal fillers, injectable treatments, skin rejuvenation, chemical peels, microneedling, and laser/light treatments.
- **Allowed at 18+:** general cosmetic procedures that depict before-and-after transformations. Several agency blogs claim before/after is banned. That conflicts with Meta's own text, so the game follows Meta.
- **Prohibited:**
  - statements of inferiority about physical appearance (negative terms or questions attacking appearance, body parts, or hygiene)
  - promises of specific outcomes within a set timeframe without disclaimers or qualifiers
- **Personal attributes** (secondhand, Accelerated Digital Media): ads can't assert or imply knowledge of the viewer's attributes. "Tired of your wrinkles?" fails. "Our wrinkle treatments" passes.
- **Data source categorization:** Meta may restrict a health-related website's event sharing (core setup, restricted mid/lower-funnel standard events, or full restriction). See Section 6.

**Google** (Google Ads Help, 18.7):
- US ads and landing pages may use prescription drug terms for promotion. Keyword-targeting those terms requires certification.
- **v1 rule [STATED 2026-10-24]:** keywords containing prescription drug brand names (e.g., "botox near me", "juvederm cost") are **always disapproved**. Treatment-category keywords ("lip filler near me", "wrinkle injections") are allowed. Ad copy may name the brand.
- Which brand names are on Google's restricted list is [UNVERIFIED]. v1 treats botulinum toxin and filler brand names as restricted.
- **Deferred:** a "get healthcare certification" onboarding task. Whether a med spa can qualify is [UNVERIFIED].

**Mechanics** [DESIGN]:
- Every med spa angle and ad copy variant carries a policy flag: none, inferiority, personal attribute, timeframe promise, or before/after.
- **Prohibited flags** (inferiority, personal attribute, timeframe promise): 80% chance of disapproval → that ad set delivers nothing that week, and Relationship −5.
- **Before/after:** allowed; 10% chance of disapproval to reflect automated review errors. The debrief explains that an appeal is usually the right fix.
- **Targeting under 18** for any med spa ad set: always disapproved.
- **Drug-name keyword** in Search: always disapproved; search terms report shows it as "disapproved: restricted drug term."
- The debrief names the policy issue and the compliant rewrite.

## 6. Onboarding and measurement (Round 0) [ASSUMPTION]

Before launch, the player has a limited hour budget [DESIGN: 6 hours] to audit and fix setup. Each brief has hidden defects drawn from the table below. Some briefs have none.

| Check | Possible defect | Effect if not fixed [DESIGN] |
|---|---|---|
| Pixel / purchase event | Missing or misfiring purchase event | Sales optimization starves; reported purchases near zero |
| Conversions API | Not set up | Reported conversions undercounted ~10–30%; weaker optimization signal |
| Event mapping | Lead event fires on page view (double/false fire) | Reported leads inflated; platform optimizes toward junk; client sees far fewer real leads |
| Call tracking | None | Phone leads invisible to platform and player; reported CPL overstated |
| CRM / offline feedback | None | "Qualified leads" goal unavailable; lead quality invisible until client complains |
| Landing page | Slow, weak offer, no mobile form | CVR multiplier < 1 |
| Speed-to-lead | Client slow to respond | Close-rate multiplier < 1 (player can only advise) |
| **Data source category (med spa)** | Meta has partially restricted the website (restricted mid/lower-funnel events; custom events blocked until reviewed) [SOURCED mechanism] | Website Lead and Schedule events unavailable for optimization. Correct workarounds: instant forms with qualifying questions, Calls, or an upper-funnel goal. Cannot be "fixed" in onboarding; can only be discovered and planned around. |

- **Fixing** costs hours.
- **Not fixing but disclosing** to the client is scored as honest and protects the Relationship score.
- **Discovering a defect mid-campaign** is possible through anomalies in the reports, e.g., reported leads far above client-confirmed leads.
- **Naming rule (med spa):** custom conversions or audiences named with sensitive terms (e.g., "botox_booked") are disabled [SOURCED secondhand, ADM]. The onboarding naming step teaches neutral names.

## 7. Ads mode — Meta

### 7.1 Decisions the player makes [STATED]
- Campaign setup: Advantage+ (default) or manual [STATED default; effect sizes DESIGN]
- Campaign objective (locked after launch — see 7.4)
- Budget (total and split by ad set)
- Audience [see 7.5]
- Placements
- Messaging angle(s) per ad set
- Conversion location (7.3)
- Performance goal, and for the Conversions goal, the conversion event (7.3)
- Weekly: edits, angle refresh, budget shifts, client update (Section 10)

**Removed from the player's control:** bid strategy. [STATED]
**Creative selection** is based on messaging, not visuals. [STATED]

**Advantage+ vs manual** [DESIGN]: Advantage+ applies a modest efficiency modifier and reduces the player's targeting control. Meta's claims about Advantage+ performance are vendor claims, not independent benchmarks, so the modifier size is a tunable design value. Manual setup is allowed; the debrief explains when it helped or hurt.

### 7.2 Messaging angles [STATED]
- Each client has 4–5 pre-written messaging angles.
- Each angle has a hidden resonance score tied to the audience.
- The player picks angle(s) per ad set. The debrief reveals why an angle worked or didn't.
- Pre-written variants only in v1.
- Med spa angles carry policy flags (5.5).

### 7.3 Objectives, conversion locations, and performance goals [SOURCED — Meta help center]

Six objectives exist: Awareness, Traffic, Engagement, Leads, App promotion, Sales. v1 uses all but App promotion. App conversion locations are excluded below.

| Objective | Conversion location | Performance goals |
|---|---|---|
| **Awareness** | — | Reach, Impressions, Ad recall lift, ThruPlay, 2-sec continuous video views |
| **Traffic** | Website | Landing page views, Link clicks, Daily unique reach, Conversations, Impressions |
| | Messaging apps | Link clicks, Daily unique reach, Conversations, Impressions |
| | Instagram profile | Instagram profile visits |
| | Calls | Calls |
| **Engagement** | Messaging apps | Conversations, Leads through messaging, Link clicks |
| | On your ad: video | ThruPlay, 2-sec continuous video views |
| | On your ad: post | Post engagement, Daily unique reach, Impressions |
| | On your ad: events | Event responses, Post engagement, Daily unique reach, Impressions |
| | Calls | Calls |
| | Website | Conversions, Landing page views, Link clicks, Daily unique reach, Impressions |
| | Facebook Page | Page likes |
| **Leads** | Website | Leads, Qualified leads |
| | Website + calls | Qualified leads |
| | Website + instant forms | Qualified leads |
| | Instant forms | Leads, Qualified leads |
| | Messenger | Leads, Leads through messaging |
| | Instagram | Leads, Leads through messaging |
| | Instant forms + Messenger | Leads |
| | WhatsApp | Conversations, Leads through messaging |
| | Calls | Calls |
| **Sales** | Website | Conversions, Value, Landing page views, Link clicks, Daily unique reach, Impressions |
| | Website + shop | Conversions, Value (purchase event and click-through attribution only) |
| | Messaging apps | Conversions, Purchases through messaging, Link clicks, Daily unique reach |
| | Calls | Calls |
| | Catalog | Conversions, Value, Link clicks, Impressions |

Notes for the build:
- **Goal vs event.** "Conversions" is the goal; the player then picks the event (purchase, add to cart, initiate checkout, lead, etc.). The UI must show both steps.
- **Qualified leads** requires CRM / offline feedback fixed in onboarding (Section 6). The API enum is QUALITY_LEAD.
- **Leads through messaging** is still rolling out gradually. v1 can include it.
- **Value** (website + shop) supports only the purchase event with click-through attribution.
- **Med spa with a restricted data source** (6): website Lead/Schedule events are greyed out with "restricted by data source category."
- v1 does not need every Engagement location. Engagement mainly exists in v1 as a wrong-objective trap for lead and sales clients.

### 7.4 Meta rules the simulation must enforce [SOURCED]
- The objective is locked at campaign creation. Changing it means a new campaign and a fresh learning phase.
- Learning phase exits at about 50 optimization events per ad set per week.
- Significant edits reset learning: budget, optimization event, targeting, creative.
- Ad sets under about 50 events/week show "Learning Limited," with higher, more volatile cost.
- Weekly budget needed to exit learning ≈ 50 × cost per optimization event.
- Fixes for Learning Limited: more budget, broader audience, fewer/consolidated ad sets, or a higher-frequency optimization event.
- Ecomm with under about 50 purchases/week should use the Conversions goal with add to cart or initiate checkout as the event first.
- Leads and Sales are not interchangeable:
  - Leads for an ecomm store fills a list without training on buyers.
  - Sales for a service business with no purchase event starves delivery.
- A wrong objective for the goal (e.g., Traffic when the goal is sales) produces cheap clicks and weak results.

### 7.5 Audience options [SOURCED — Meta help center]

Under Advantage+ audience:
- **Controls** (hard limits): location, minimum age, custom audience exclusions, languages.
- **Suggestions** (soft; Meta may deliver outside them, but never outside controls): age, gender, detailed targeting, custom audience inclusions (lookalikes included).
- **"Further limit the reach of your ads"** turns age, gender, and custom audience inclusions into hard limits (unchecking "use as a suggestion"). This turns Advantage+ audience **off**.
- Under Advantage+, minimum age can't be set below 18. Lookalike audiences can't be excluded.
- Meta consolidated detailed targeting options starting June 23, 2025 [SOURCED secondhand]. In-game interest lists should be short and broad.

**v1 audience options:**

| Option | What the player sets | Effect [DESIGN] |
|---|---|---|
| Advantage+ audience, controls only | Location, min age (18+), exclusions | Broadest; best efficiency once signal is clean; weakest if tracking is corrupted |
| Advantage+ audience with suggestions | Controls + suggested age, gender, interests, custom/lookalike | Faster early learning when suggestions are good; small efficiency cost if suggestions are wrong |
| Advantage+ off (further limited) | Same inputs as hard limits | Full control, efficiency penalty; correct only when the business needs a hard limit (e.g., service radius, 18+ policy beyond the control) |

Teaching point: for local service, location is the control that matters. Over-limiting audiences on an L1 budget deepens Learning Limited.

## 8. Ads mode — Google Search [STATED, entry level]

Player decisions: [STATED]
- Keyword lists
- Match types: broad, phrase, exact [ASSUMPTION that these three]
- Negative keywords
- Ad copy (pre-written variants in v1)
- Bids: manual CPC per keyword or ad group [ASSUMPTION; Smart Bidding later]

Each client has a procedurally generated keyword bank. Each keyword has hidden attributes: intent (high/medium/low), relevance, monthly volume, estimated CPC. [DESIGN]

- **HVAC keyword banks** tag each keyword as service-intent or replacement-intent. Replacement-intent keywords carry the 2.5× CPC premium and feed the replacement lead pool.
- **Med spa keyword banks** include drug-name keywords that are always disapproved (5.5).

**Search terms report** [ASSUMPTION]: each week shows the actual queries that triggered ads, with clicks, cost, and conversions. It is the only way to find negatives after launch. Broad match pulls irrelevant queries into this report.

Behavior the simulation must reward and punish: [DESIGN, standard Search practice]
- **Broad match on a thin account:** more impressions, lower relevance, wasted spend unless negatives are added.
- **Exact match:** fewer impressions, higher relevance, higher conversion rate.
- **Missing negatives:** irrelevant clicks bleed budget.
- **Bids:** too low loses impressions; too high blows CPA past target.
- **Ad copy matched to keyword intent:** better CTR and conversion rate.

## 9. Simulation engine

All values here are [DESIGN] and tunable unless marked otherwise.

### 9.1 Calibration anchors

- **Rule:** published medians from different datasets do not multiply into each other.
- **Anchor on what each dataset actually publishes:**

| Channel | Anchors (sourced) | Derived at runtime | CPM role |
|---|---|---|---|
| Meta leads | CPC, CTR, CPL (WordStream/LocaliQ) | CVR = CPC / CPL | **Display only**: CPM = CPC × CTR × 1000 |
| Meta ecomm | CPM, CTR, CPA, ROAS (Triple Whale) | CPC = CPM / (CTR × 1000); CVR = CPC / CPA | Input |
| Search leads | CPC, CTR, CPL (WordStream/LocaliQ) | CVR = CPC / CPL | Not applicable |

- **HVAC replacement leads:** apply the 2.5× multiplier to CPL only. Keep CPC and CTR at Home values, so derived CVR falls (fewer people requesting replacement quotes per click) [DESIGN].
- **Ecomm AOV comes from the brief**, not from benchmark ROAS × CPA.

Derived values per category are in Section 18.6. Store min / typical / max for each anchor. Derive the others at runtime.

### 9.2 Core funnel (per ad set or ad group per week)

```
Meta leads:
  clicks      = weekly_spend / CPC_eff
  impressions = clicks / CTR_eff                 (display only)
Meta ecomm:
  impressions = (weekly_spend / CPM_eff) * 1000
  clicks      = impressions * CTR_eff
Search:
  clicks      = weekly_spend / CPC_eff           (capped by keyword volume and bid-driven impression share)

All:
  true_conversions     = clicks * CVR_eff
  reported_conversions = true_conversions * tracking_factor      (Section 9.4)
  cost_per_result      = weekly_spend / true_conversions          (client-facing, true)
  platform_CPA         = weekly_spend / reported_conversions      (what the player sees in-platform)

HVAC:
  true_leads split into service and replacement pools by the delivered mix
  (angle, keyword intent, and audience shift the mix; base = brief service share)

Leads:
  jobs    = true_leads * close_rate * lead_source_mult * speed_to_lead_mult
  revenue = jobs * first_job_value              (12-month view: jobs * value_per_customer)
Ecomm:
  revenue = true_purchases * AOV
  ROAS    = revenue / spend

Client profit (after fee) = revenue * gross_margin - ad_spend - agency_fee
Client profit (ads only)  = revenue * gross_margin - ad_spend
```

Zero-conversion weeks must not divide by zero; display "no results" instead.

### 9.3 Lead quality [DESIGN]

Close-rate multiplier by lead source:

| Lead source | Close-rate mult (start) | CPL effect |
|---|---|---|
| Phone call | 1.2 | Higher CPL |
| Website form | 1.0 | Baseline |
| Instant form, higher-intent (extra questions) | 0.8 | CPL × ~1.3 |
| Instant form, default | 0.6 | Lowest CPL |

Optimizing for Qualified leads (only if CRM feedback is fixed in onboarding) raises the multiplier over time. All values are tunable.

### 9.4 True vs reported [DESIGN]

- The **platform optimizes on reported conversions.**
- The **client judges on true outcomes**: jobs and revenue.

Tracking defects from Section 6 set `tracking_factor`:
- double-fire > 1
- missing CAPI < 1
- missing purchase event ≈ 0
- med spa data-source restriction: restricted events report 0 and can't be chosen as the goal

When the platform optimizes on a corrupted signal, CVR_eff degrades over the following weeks.

### 9.5 Learning state (continuous) [DESIGN]

```
progress      = min(1, expected_events_per_week / 50)
cost_mult     = 1 + k_cost * (1 - progress)        k_cost start 0.3
variance_mult = 1 + k_var  * (1 - progress)        k_var  start 0.5
```

- A significant edit resets the ad set to week-1 learning for the following week.
- **Why continuous** [DERIVED]:
  - Home CPL ~$43 needs ~$2,150/week per ad set to exit learning.
  - HVAC replacement CPL ~$107 needs ~$5,350/week.
  - L1 budgets are ~$230–700/week; L2 ~$700–2,300/week.
  - Every L1 lead ad set, and every replacement-only ad set at L1–L2, will be Learning Limited.
- The game rewards moving toward exit, not reaching it:
  - one ad set
  - a higher-frequency event
  - fewer edits
  - ramp expectations set in the pitch
- HVAC lesson: a replacement-only ad set never gets signal. One ad set with a mixed or replacement-leaning angle, plus call tracking, beats splitting by job type.

### 9.6 Modifiers and clamp [DESIGN]

These multiply onto the benchmark base:
- audience fit (7.5 option)
- messaging resonance
- objective/goal fit
- Advantage+ vs manual
- conversion location
- landing page
- learning
- creative fatigue
- seasonality
- keyword match/intent
- bid level
- negative-keyword coverage
- policy disapproval

- Each modifier has a defined range in the config.
- **Clamp the product** of all non-benchmark modifiers on cost per result to **[0.4, 2.5]**.
- A wrong objective (e.g., Traffic for a sales goal) bypasses the clamp on true conversions. Cheap clicks with near-zero sales is the lesson.
- Policy disapproval also bypasses the clamp: a disapproved ad set delivers nothing.

### 9.7 Creative fatigue and refresh [DESIGN]
- Each angle's CTR decays per week once frequency passes a threshold (start: CTR × 0.9/week after week 3 at L1 audience sizes).
- The player can swap or add an angle at any weekly decision. This counts as a significant edit and resets learning.

### 9.8 Realism slider and RNG [STATED slider; rest DESIGN]
- Scale 1–5.
  - **1 (benchmark-focused):** outcomes track benchmarks tightly; best practice reliably wins; low variance.
  - **5 (less benchmark-focused):** more variance; unconventional strategies can win or lose; adds auction volatility, learning swings, fatigue, seasonality.
- The slider value scales random variance and the weight of non-benchmark modifiers.
- **Locked at campaign start outside Sandbox.** Stored with every score. Score history filters by realism band.
- **Seeded RNG:** every run stores its seed. Required for counterfactual debriefs (14.2), bug reproduction, and the harness.

## 10. Client relationship and events [ASSUMPTION]

### 10.1 Weekly client update
Each week the player chooses how to update the client:

| Choice | Effect [DESIGN] |
|---|---|
| Honest update | Steady Relationship score |
| Spun update (frames bad numbers as good) | Relationship rises short-term, then drops sharply when true outcomes surface (client sees their jobs or sales) |
| Skipped update | Relationship drops |

### 10.2 Event deck
- Each business has 8–12 events. About one fires every 2 weeks. [DESIGN]
- Each event offers 2–3 responses with scored outcomes. The debrief explains the best response.
- Undiscovered red flags (5.4) fire as forced events.

Examples:
- "We're slammed, pause everything." (Pausing resets learning.)
- "My nephew says we should just boost posts."
- Budget cut of 30% mid-campaign.
- "These leads are junk." Fires automatically when realized close rate < 0.7 × brief close rate.
- "Can we add a new service?"
- Seasonal demand spike or drop.
- "A competitor is running a big discount."
- "Why am I paying you almost as much as the ads cost?" (L1 fee lesson.)
- HVAC: "All these leads want a $150 tune-up; I need replacements." (Lead-mix lesson.)
- Med spa: "Meta rejected our ad again." (Policy lesson.)

## 11. Pitch mode

### 11.1 Format and stages [STATED]
- Scripted branching dialogue with scored responses.
- Stages: discovery call → proposal and pricing → objection handling → expectations → contract close.
- Scored skills, equal weight (20% each):
  1. Discovery questions
  2. Pricing and scoping
  3. Objection handling
  4. Setting expectations
  5. Closing

### 11.2 Prep screen and hints [STATED recommendations; placement is ASSUMPTION]
- **Before the pitch:** a prep screen shows industry-standard recommendations from the benchmark data:
  - typical CPL/CPA/ROAS ranges
  - budget needed to exit learning at benchmark cost [DERIVED: 50 × typical cost per event]
  - typical job value, close rate, and margin ranges for the business type (5.1)
  - fee ranges from agency pricing guides (Section 12), labeled weak-source
  - what the default fee does to the client's target at this budget (5.3)
- **During the pitch:** the same data is available as a hint. Each use costs 25% of that stage's score [DESIGN].
- **Sandbox:** hints are free.

### 11.3 Discovery
Good discovery questions reveal hidden brief fields:
- close rate
- job value and 12-month customer value
- margin
- lead mix (HVAC)
- speed-to-lead
- current tracking setup
- past ad history
- capacity ("How far out are you booked?")
- timeline expectations ("When do you need to see results?")
- budget commitment ("How long can you fund this before deciding?")
- fee expectations ("What have you paid agencies before?")

Unasked questions leave those fields hidden for the rest of the run. The last four questions surface red flags (5.4).

### 11.4 Promises
What the player promises (target CPL/CPA/ROAS, ramp period, timeline, budget, fee) becomes the **Promise**, which drives Satisfaction. [STATED]

### 11.5 Win, loss, and walk-away
- **Lost deal:** pitch score < 60% [ASSUMPTION].
- **Sandbagging fix:** a promise worse than the client's Business target loses the deal. The client says it isn't worth paying for. [ASSUMPTION]
- **Over-promising:** a promise better than the benchmark range's best edge wins more easily, but sets an expectation the campaign will likely miss. Satisfaction tanks even if the campaign performs reasonably. [STATED behavior]
- **Over-pricing:** a fee that pushes the Business target into the unviable band makes the client unviable. Winning that deal scores as a pricing failure.
- **Walk-away:** the player can decline the client at any stage.
  - On an unviable brief (economics or red flag), walking away is correct and scores as a win.
  - On a viable brief, it scores as a loss.
  - The debrief names what made the brief unviable, or what the player missed.
- **Full Run:** losing the pitch ends the run. The player can start a new client.

## 12. Agency economics

**Fee model.** Chosen in the pitch:
- flat monthly retainer
- % of ad spend
- hybrid (retainer floor + %)

**Default fee** [STATED: owner accepted default 2026-10-24]: hybrid, **$1,000/month + 10% of ad spend**. Used in Ads Manager Only mode and for brief classification.

**Agency minimum** [DESIGN, inside the sourced range]: $1,000/month. A pure % fee at L1 earns $100–600/month, below every published minimum. The pitch should teach this.

**Published ranges** [SOURCED, weak — agency pricing guides; 18.9]:

| Model | Range |
|---|---|
| % of ad spend | 10–20% standard; ~8% for large budgets; up to 25% for small accounts |
| Flat retainer, small/mid local business | $1,000–$5,000/mo |
| Small-business retainer (other source) | $500–$3,000/mo |
| Hybrid | $1,500–$2,500 base + 5–10% of spend |
| Fee at $1.5–3K/mo ad spend | $1,000–$2,500/mo |
| Fee at $5–15K/mo ad spend | $2,500–$6,000/mo |
| Agency minimums | $1,000–$5,000/mo regardless of spend |

**Client fee tolerance.** Hidden; drawn per brief within the published range for the brief's spend [DESIGN]. Asking above tolerance raises objection difficulty. Far above it (> 1.5× tolerance) loses the deal. Below the agency minimum is a red flag (5.4).

**Agency hours** per client per week vary by:
- platforms
- ad set / ad group count
- number of events [DESIGN]

**Target hourly rate:** default **$75/hour** [STATED: owner accepted default 2026-10-24]; editable in settings.

**Agency P&L in every final debrief:**
- fee revenue
- hours spent
- effective hourly rate vs target
- verdict: would this client be worth keeping?

Pricing quality feeds the pitch "Pricing and scoping" skill. Agency profit is reported, not part of the Ad mode score. The client's after-fee profit (5.3) does feed the Performance score through the Business target.

## 13. Scoring, satisfaction, failure, unlock

### 13.1 Two targets (precedence)

| Target | Source | Used for |
|---|---|---|
| **Business target** | Client economics after fee (5.3) | Performance score, Target failure |
| **Promise** | Pitch (Full Run) or brief's client expectation (Ads Manager Only) | Satisfaction, Churn |

Both are measured on **true** outcomes, not platform-reported.

### 13.2 Ad mode score [STATED weights]
- **40% Performance:** campaign-end true result vs Business target.
  - Cost metrics: 100 × min(1, target / actual).
  - Ecomm: scored on CPA the same way; ROAS shown for reference.
  - HVAC: scored on value per lead delivered vs breakeven value per lead, so a cheap tune-up-heavy campaign doesn't score as a win [DESIGN].
  - [DESIGN formula]
- **30% Best-practice adherence:** rubric in 13.4.
- **30% Client satisfaction:** mean weekly Satisfaction (13.3).

### 13.3 Satisfaction formula [DESIGN]

```
S_week = 0.7 * Results_week + 0.3 * Relationship_week

Results_week = 100 * min(1, promised / actual_true)   (cost metrics, trailing 2 weeks)
             = 100 * min(1, actual_true / promised)   (ROAS)
  - During the promised ramp period, promised cost targets are relaxed x1.5.
  - No ramp promised = no relaxation. (Rewards the "setting expectations" skill.)

Relationship_week starts at 70.
  Moves with: update choice (10.1), event responses (10.2),
  disclosure of tracking defects (6), policy disapprovals (5.5).

Campaign Satisfaction = mean of S_week.
```

### 13.4 Best-practice rubric [DESIGN; checks reflect Sections 7.3, 7.4, 7.5 and 8]

Each check scores 0 / 1. The score is normalized to 100 across checks that apply to the run.

**Onboarding**
- Tracking audited before launch.
- Critical defects fixed or disclosed.
- Med spa: data-source category checked; neutral event and audience names.

**Meta**
- Objective matches business goal.
- Conversion location fits the client's lead handling (e.g., calls or website for a business that closes by phone; instant forms only with qualifying questions or CRM feedback).
- Performance goal and event are the deepest pair with expected volume closest to 50/week at the current budget. For ecomm under ~50 purchases/week, that means the Conversions goal with add to cart or initiate checkout.
- Ad set count ≤ max(1, floor(weekly budget / (10 × expected cost per event))).
- ≤ 1 significant edit per ad set per 2 weeks, except to fix an error.
- Audience option appropriate to budget and business (7.5); no hard limits without a business reason.
- Angle testing is deliberate. No more angles than the budget can read.
- Med spa: no prohibited-flag copy; all ad sets 18+.

**Search**
- Core high-intent keywords on exact or phrase.
- Broad match only with a negative list in place.
- Negatives added after reviewing the search terms report.
- Ad copy matches ad group intent.
- Bids within a sensible band of estimated CPC.
- Budget concentrated on high-intent terms.
- Med spa: no drug-name keywords.

**Relationship**
- Updates sent every week.
- Event responses chosen well.

Best practice is scored at every realism level. It grades process; Performance grades outcome. Process is what transfers to real clients.

### 13.5 Failure states (off in Sandbox) [STATED approved]
- **Churn:** Satisfaction under 40% for 2 straight weeks.
- **Budget failure:** more than 25% of total budget spent with zero true conversions.
- **Target failure:** at campaign midpoint, the true trailing result misses the Business target by more than 50%.

Calibration requirement (Section 16): at realism 3, on achievable briefs, a best-practice policy fails ≤ 10% of runs and a naive policy fails ≥ 50%. If not, retune thresholds before shipping.

### 13.6 Unlock
See Section 3. Sandbox scores are excluded. Correct walk-aways count as completed campaigns.

## 14. Teaching layer

### 14.1 Round debrief [STATED]
- Names what happened and the single biggest driver of the week's result.
- States what a stronger move would have been.
- Tone: firm, no softening.

### 14.2 Final debrief with counterfactual [ASSUMPTION]
- **Counterfactual replay:** re-runs the campaign on the same seed with the player's highest-impact wrong decision replaced by the recommended choice. Shows the delta in true result, client profit, and Satisfaction.
- Also shows:
  - client profit after fee and ads-only (first-job and 12-month views)
  - agency P&L
  - true vs reported gap (if tracking defects existed)
  - the brief's difficulty class and its source (economics, complications, or red flag)
  - the Section 13.4 rubric with each check's pass/fail and the reason

### 14.3 Explainers and history [STATED]
- **Built-in explainers** for terms and best practices. Can be turned off in settings.
- **Score history:** by mode, level, business, skill, and realism band.

### 14.4 About screen
- States the honest limit (Section 1).
- Lists which businesses are proxy-mapped for ad benchmarks (Section 18.5).
- States that business economics come mostly from industry-vendor sources (18.8).
- States that fee ranges come from agency pricing guides, a weak source (18.9).
- States that the HVAC replacement CPL premium is a design value anchored on a weak source (18.3).

## 15. UI, platform, data model

**UI and hosting**
- Stylized game interface. Not an Ads Manager clone. [STATED]
- Plain web app, single user, hosted on GitHub Pages like State Hoops. [STATED]
- Responsive so it works on phone. [STATED]
- Session targets [ASSUMPTION]:
  - one weekly round ≤ 3 minutes on phone
  - a full 8-week campaign including onboarding ≤ 30 minutes
  - autosave after every round
- Name: **Agency Builder Sim**. [STATED]

**Firebase sync** [STATED]

- **Auth:** Google sign-in [ASSUMPTION]. Anonymous auth is tied to one browser/device unless linked, which defeats phone ↔ desktop sync. If State Hoops already solved auth, reuse that setup.
- Local cache with sync on reconnect.

Data model [ASSUMPTION]:

```
users/{uid}
  settings: { realismDefault, explainersOn, targetHourlyRate (default 75) }

users/{uid}/runs/{runId}
  mode, level, businessId, seed, realism, status
  brief: { ...all fields incl. hidden, difficultyClass, difficultySource,
           complications[], redFlag }
  pitch: { transcript, stageScores, promise, fee, walkedAway }
  onboarding: { hoursSpent, fixed[], disclosed[] }
  weeks: [ { decisions, results(true + reported), satisfaction, events } ]
  final: { performance, bestPractice, satisfaction, adScore,
           clientProfitAfterFee, clientProfitAdsOnly, agencyPnl }

users/{uid}/scores/{scoreId}
  runId, mode, level, businessId, realism, isSandbox, components, timestamp
```

## 16. Acceptance criteria and calibration harness [ASSUMPTION]

**Harness.** Headless script that runs N = 1,000 seeded simulations per business × realism level × scripted policy.

| Policy | Definition |
|---|---|
| Best-practice | Passes every applicable Section 13.4 check |
| Naive | Wrong-but-common choices: Traffic objective, 4+ ad sets on L1 budget, broad match without negatives, weekly edits, default instant forms with no qualifying questions, hard-limited audiences |
| Random | Random valid choices |

**Pass criteria**

At realism 1–3, on achievable briefs:
1. The best-practice median true cost per result falls inside the sourced min–max range for the category. (Lead campaigns are checked on CPL, not CPM. HVAC replacement is checked against $80–150 on Meta.)
2. The best-practice median beats the naive median by ≥ 30%.

At realism 3, on achievable briefs:

3. Failure rates: best-practice ≤ 10%, naive ≥ 50%.

At realism 3, on hard briefs:

4. Best-practice failure rate between 15% and 50% (hard means hard, not impossible).

At realism 5:

5. Best-practice still wins on median, but loses to random in ≥ 15% of seeds. (Variance is real.)

At all levels:

6. No NaN, infinity, or division-by-zero in any week, including zero-conversion weeks.
7. The sandbag test: a promise worse than the Business target always loses the deal.
8. **Per-business difficulty mix:** over 1,000 generated briefs per business per level, each class lands within ±5 points of the 5.4 target mix.
9. **Generator never stalls:** no brief takes more than 200 economic draws.
10. **Unviable briefs can't be won:** on economically unviable briefs, the best-practice Performance score is < 60 in ≥ 80% of runs. (Profit may still be slightly positive when k is near 0.5, so the test uses Performance, not profit sign.)
11. **Med spa policy:** every prohibited-flag variant and every drug-name keyword is disapproved at the stated rate.

**Milestone exit criteria** are in Section 4.2. Every milestone re-runs the harness.

## 17. Content to produce

| Item | Per business | Notes |
|---|---|---|
| Benchmark config (JSON) | Category anchors, min/typical/max; HVAC replacement multiplier | Section 18 |
| Economics config (JSON) | Job value, 12-month value, close rate, margin, AOV ranges; HVAC mix | Section 5.1 / 18.8 |
| Difficulty config (JSON) | Target mix, complication list, red-flag list | Section 5.4 |
| Fee config (JSON) | Default fee, minimum, tolerance ranges by spend | Section 12 |
| Brief generator | Draws class, economics, fee; computes target; resamples or applies levers | Section 5.4 |
| Tracking defect table | Shared, plus med spa data-source defect | Section 6 |
| Messaging angles | 4–5, resonance per audience, policy flag (med spa), lead-mix shift (HVAC) | |
| Keyword bank | Intent, relevance, volume, est. CPC; HVAC job-type tag; med spa drug-term flag | Not apparel in v1 |
| Search query pool | Relevant + irrelevant queries per keyword | Feeds search terms report |
| Pitch tree | 5 stages, scored branches, objections, red-flag discovery | Largest content cost |
| Client event deck | 8–12 events, 2–3 scored responses each | |
| Debrief + explainer library | Shared + per business | |

## 18. Benchmark data and sources

**Rules**
- Store ranges, not single numbers. Sources disagree.
- Use WordStream/LocaliQ 2026 as the primary ad anchor where available.
- Never present a figure to the player as exact fact. Label it "typical range from published benchmarks."

### 18.1 Google Search [SOURCED]
Primary anchor: WordStream/LocaliQ 2026, 13,000+ US campaigns.

| Category | CTR | CPC | CVR | CPL |
|---|---|---|---|---|
| All industries | 6.64% | $5.42 | 8.18% | $66.69 |
| Home & Home Improvement | 6.47% | $8.33 | 8.05% | $90.92 |
| Personal Services | 7.16% | $7.17 | 12.34% | $54.60 |
| Apparel / Fashion & Jewelry | 6.64% (CTR only verified) | not verified | not verified | not verified |

Range edges from other datasets:
- All-industry CPC $2.96–$5.26; CVR about 3.2–7.5%.
- Home Services in one dataset: CPC $2.90, CVR 3.8%, CPL $91.

### 18.2 Roofing Search premium
- PPC Chief lists roofing CPC at $10.25. Its all-industry CPC is $5.26. [SOURCED]
- v1 uses roofing CPC typical $10.25 with the Home range for min/max. [ASSUMPTION]
- Roofing CPL = Home CPL × (10.25 / 8.33) ≈ $111.88. [DESIGN, not sourced]

### 18.3 Meta lead campaigns [SOURCED]
Primary anchor: WordStream/LocaliQ 2026 (US campaigns, April 2025 to June 2026), via Digital Applied (updated Sep 22, 2026). Medians.

| Category | CTR | CPC | CVR (published) | CPL |
|---|---|---|---|---|
| All industries | 2.70% | $1.80 | 8.54% | $27.39 |
| Home & Home Improvement | 2.14% | $2.18 | 5.32% | $42.95 |
| Beauty & Personal Care | 1.35% | $2.97 | 5.63% | $50.91 |
| Personal Services | 2.24% | $1.62 | 6.61% | $38.09 |

- **This dataset publishes no CPM.** That is why lead CPM is display-only (9.1).
- **Sample size is small:** 452 lead campaigns in total, and an industry needs only 4 campaigns to be listed. Treat category values as indicative and keep the ranges wide.
- Range edges: Home CPL $24.29–$42.95 across sources; Beauty CPL $42.10–$51.42.

**HVAC by lead type** [SOURCED, weak — WebTonic citing PipelineOn and AdAmigo/Stackmatix; originals not verified]:
- Blended HVAC Meta CPL: $45.
- Service tune-up leads: $35–65. v1 uses the Home row ($42.95), which sits inside this range.
- System replacement estimate requests: $80–150.

**v1 HVAC replacement values** [DESIGN, anchored on the weak range; owner delegated 2026-10-24]:
- Meta CPL: min $80 / typical $107 / max $150 (typical = 2.5 × $42.95).
- Search CPL: typical $227.30 (2.5 × $90.92); min/max = Home Search range × 2.5. No source for Search replacement leads.
- Why 2.5×: it puts the typical value inside the only published range, near its midpoint, and applies one multiplier to both channels so the lesson is consistent.

### 18.4 Meta ecomm [SOURCED]
Primary anchor: Triple Whale, 40,000+ ecommerce brands, August 2025 to July 2026 (published Aug 18, 2026), via Digital Applied. Medians.

| Category | CPM | CTR | CPA | ROAS |
|---|---|---|---|---|
| All (also: CVR 1.53%, AOV $73.36) | $15.06 | 2.39% | $38.99 | 1.88 |
| Lifestyle & Boutique (boutique apparel primary) | $13.25 | 2.44% | $31.16 | 2.04 |
| Apparel & Accessories (range edge) | $13.25 | 2.44% | $36.98 | 2.24 |
| Beauty | $18.80 | 2.46% | $39.31 | 1.54 |
| Home & Garden | $14.67 | 2.38% | $47.93 | 2.25 |

- Per-category CVR is not published in this release; derive it (18.6).
- Prior-year (2025) Triple Whale apparel figures (CTR 2.25%, CVR 1.46%, CPA $36.76, ROAS 2.18) serve as range edges.
- Meta traffic CPC (WordStream 2026): apparel $0.71, home $0.63, beauty $0.50.

### 18.5 Not found
No verified **ad** benchmark for:
- med spa (Meta proxy: Beauty & Personal Care; Search proxy: Personal Services)
- HVAC, landscaping, cleaning (proxy: Home & Home Improvement; HVAC replacement uses a design multiplier on a weak range)
- Search CPC/CVR for boutique apparel
- Search CPL for HVAC replacement leads

Also not sourced: landscaping repeat revenue, apparel repeat purchase rate, Google restricted drug term list contents, med spa eligibility for Google healthcare certification.

These are proxy-mapped (Section 5.2) or placeholders. The About screen says so.

### 18.6 Derived calibration values [DERIVED using Section 9.1 rules]

| Channel / category | Anchors | Derived CVR | Derived CPC | Derived CPM | Other |
|---|---|---|---|---|---|
| Meta leads — Home | CPC $2.18, CTR 2.14%, CPL $42.95 | 5.08% | — | $46.65 (display only) | |
| Meta leads — HVAC replacement | CPC $2.18, CTR 2.14%, CPL $107 | 2.04% | — | $46.65 (display only) | Design multiplier |
| Meta leads — Beauty (med spa) | CPC $2.97, CTR 1.35%, CPL $50.91 | 5.83% | — | $40.10 (display only) | |
| Meta leads — Personal Services | CPC $1.62, CTR 2.24%, CPL $38.09 | 4.25% | — | $36.29 (display only) | Published CVR 6.61% does not reconcile; medians |
| Meta ecomm — Lifestyle & Boutique | CPM $13.25, CTR 2.44%, CPA $31.16, ROAS 2.04 | 1.74% | $0.54 | input | Benchmark-implied AOV ≈ $63.57 (not used; brief AOV is used) |
| Meta ecomm — Apparel & Accessories | CPM $13.25, CTR 2.44%, CPA $36.98, ROAS 2.24 | 1.47% | $0.54 | input | Benchmark-implied AOV ≈ $82.84 |
| Search — Home | CPC $8.33, CPL $90.92 | 9.16% | — | — | |
| Search — HVAC replacement | CPC $8.33, CPL $227.30 | 3.66% | — | — | Design multiplier |
| Search — Personal Services (med spa) | CPC $7.17, CPL $54.60 | 13.13% | — | — | |

Derived Apparel CVR (1.47%) matches the 2025 published value (1.46%), which supports the ecomm anchoring method.

### 18.7 Ad benchmark and platform sources
- https://www.facebook.com/business/help/416997652473726 (performance goals by objective and conversion location)
- https://www.facebook.com/business/help/7604429283004973 (Advantage+ recommended setup rollout)
- https://www.facebook.com/business/help/398040430994666 (formats and platforms by objective)
- https://www.facebook.com/business/help/938372127764391 (audience controls and suggestions in Advantage+ audience)
- https://www.facebook.com/business/help/25941857932125812 (audience settings in Advantage+ campaigns)
- https://www.facebook.com/business/help/793748385630490 (creating a campaign with Advantage+ audience)
- https://www.facebook.com/business/help/2489235377779939 (health and wellness advertising policy)
- https://www.facebook.com/business/help/511197658391698 (data sharing restrictions by data source category)
- https://support.google.com/adspolicy/answer/15595717 (Google restricted drug terms)
- https://www.accelerateddigitalmedia.com/insights/guide-to-social-media-health-ad-restrictions-2026/ (secondhand: personal attributes, health data restrictions, audience naming)
- https://www.conversios.io/blog/meta-advantage-audience-vs-detailed-targeting-2026-guide/ (secondhand: detailed targeting consolidation)
- https://www.webtonic.io/blog/hvac-facebook-ads-statistics (secondhand: HVAC CPL by lead type)
- https://www.digitalapplied.com/blog/facebook-ads-benchmarks-2026-cpc-cpm-ctr-industry
- https://www.webtonic.io/blog/google-ads-benchmarks
- https://hawky.ai/blog/google-ads-benchmarks
- https://riverstonemarketingsolutions.com/google-ads-benchmarks-by-industry/
- https://ppcchief.com/google-ads-benchmarks
- https://metricnexus.ai/blog/google-ads-benchmarks-2026
- https://influee.co/blog/facebook-ads-benchmarks
- https://www.webtonic.io/blog/facebook-ads-benchmarks
- https://rule1.ai/articles/facebook-ads-benchmarks
- https://www.mbadv.agency/meta-ads/meta-ads-campaign-objectives
- https://www.jonloomer.com/meta-campaign-objectives-best-practices/
- https://lemonado.io/glossary/learning-phase
- https://www.cometly.com/post/how-to-improve-facebook-ads-learning-phase

### 18.8 Business economics sources [SOURCED, 2026-10-20]

**Source strength.** Most figures come from field-service or ecommerce software vendors and agencies, not audited industry data. Several (ACCA, AmSpa, NALP) are cited secondhand and were not verified at the original source. Keep ranges wide.

**HVAC** (medium)
- Repairs average $150–$450; full replacements $5,000–$14,100; one operator raised average ticket from $440 to $720 with a price book. https://pipelineon.com/blog/hvac-pricing-guide-what-to-charge/
- Average installed replacement $11,590–$14,100; service gross margin target 55–65%, install 42–52%. https://simprogroup.com/blog/hvac-industry-statistics-2026
- Inbound digital close rate ~25% (ACCA 2024, cited secondhand). https://ustechautomations.com/resources/blog/how-to-lead-followup-for-hvac-companies-2026
- 25–40% close rate, job values ~$400 tune-ups to ~$12,000 installs. https://www.contractormag.com/management/best-practices/article/55395612/mastering-lead-cost-benchmarks-for-plumbing-hvac-success
- Fixr funnel (via Elevarus): 5–15% of home-service leads become closed jobs, not split by job type. https://elevarus.com/hvac-lead-generation-cost-per-lead-2026-benchmarks/
  - **Correction from v3:** v3 cited this page for a "70% service / 30% replacement → real close ~14%" example. The page does not contain it (checked 2026-10-22). Removed.
- Annual service value examples: $385 × 1.4 visits/yr; $445 × 2.6 visits/yr. https://pipelineon.com/blog/hvac-customer-lifetime-value/

**Roofing** (strong on job value, weak on close rate)
- Median residential reroof $18,050 (May 2025) → $24,354 (Apr 2026), ServiceTitan platform data. https://www.servicetitan.com/toolbox/state-of-the-trades/trends/residential-roof-replacement-cost
- Average replacement $17,631 in 2025 (Verisk). https://contractorplus.app/blog/roof-replacement-cost-2026
- Close rate 30–50% inbound, 15–25% cold. https://jobnimbus.com/blog/roofing-kpis
- Close rate 8–15% (lead-level). https://chiirp.com/glossary/lead-conversion-rate
- Gross margin 20–40%; top earners 45–55%. https://roofsnap.com/blog/is-roofing-business-profitable/

**Landscaping** (medium; close rate weak)
- Average project $3,648, range $1,248–$6,280 (Angi via SoFi). https://www.sofi.com/learn/content/typical-landscaping-costs/
- Gross margin 30–50%. https://www.realgreen.com/blog/guide-to-landscaping-profit-margins
- Gross margin target 45–50%. https://fieldcamp.ai/lawn-care-software/industry-statistics-and-trends/
- Whole-industry gross margin 59.5% (Canada, 2024). https://ised-isde.canada.ca/app/ixb/cis/performance/56173
- 25% close described as industry baseline (vendor). https://ciela.ai/agents/ai-quote-generator-for-landscaping-companies
- NALP 2025 (secondhand): 63% close within 2 hours vs 38% next day. https://ustechautomations.com/resources/blog/automate-best-estimating-software-for-landscaping-companies-2026

**House cleaning** (medium)
- $174–$256 per visit. https://getjobber.com/academy/cleaning/how-much-to-charge-for-house-cleaning/
- Close rate 25–35%. https://maidcentral.com/2026/02/23/close-rate-per-week/
- Labor 40–50% of revenue. https://maidcentral.com/2026/06/10/revenue-vs-profit-cleaning-business-2/
- Gross margin 50–70%. https://www.getharvest.com/calculators/profit-margin-calculator-for-cleaning-business
- Average customer ~$1,500 lifetime (MaidCentral, secondhand); bi-weekly client $4,550/yr. https://www.getnextphone.com/blog/cleaning-company-answering-service

**Med spa** (strong on ticket, weak on close rate)
- Median ticket $216; 90th percentile $484 (Zenoti 2026). https://www.zenoti.com/thecheckin/how-to-price-med-spa-services
- 3.2 visits/yr; 12-month LTV $1,800–$5,200. https://www.webtonic.io/blog/medical-spa-analytics-statistics
- Lead-to-patient conversion 30–40%. https://prospyrmed.com/blog/post/med-spa-kpis-to-track-benchmark-formulas
- Consult-to-treatment 25–45% unstructured, 55–65% structured. https://prospyrmed.com/blog/post/med-spas-lose-clients-journey-mapping
- Gross margin 50–65%. https://prospyrmed.com/blog/post/benchmark-med-spa-profitability
- Aesthetic COGS 25–35% → gross margin 65–75%. https://beancount.io/blog/2026/06/01/medspa-aesthetic-clinic-bookkeeping-injectables-botox-filler-cogs-laser-device-section-179-asc-606-prepaid-package-deferred-revenue-breakage-glp-1-semaglutide-mso-pc-medical-director-hipaa-guide

**Boutique apparel** (medium)
- Median apparel store gross margin 62%. https://useamp.com/benchmarks/apparel
- Apparel specialty gross margin 50–67%. https://eightx.co/blog/average-ecommerce-gross-margin-by-revenue-band-2026
- DTC AOV $85–$95. https://eightx.co/blog/average-aov-by-ecommerce-vertical
- Fashion boutique AOV $100–200. https://gripsintelligence.com/insights/industries/apparel-accessories/fashion-boutiques

### 18.9 Agency fee sources [SOURCED, weak, 2026-10-22]

All are agencies or agency software vendors.
- % of spend 10–20% (8% large, up to 25% small); retainers $1,000–5,000 for small/mid local. https://clicksgeek.com/facebook-ads-management-pricing/
- Fee $1,000–2,500 at $1.5–3K spend; $2,500–6,000 at $5–15K spend; hybrid structures. https://clicksgeek.com/paid-advertising-services-cost/
- Small-business retainers $500–3,000; agency minimums $1,000–5,000. https://www.swydo.com/blog/agency-pricing/

## 19. Assumptions and open items

### 19.1 Decisions

**Confirmed by owner (2026-10-24):**
- Difficulty set per business (5.4).
- Agency fee counted in client economics and the Business target (5.3).
- Default fee: hybrid $1,000 + 10% of spend. Target hourly rate: $75 (12).
- Close-rate ranges in 5.1 accepted for v1.
- HVAC replacement CPL premium delegated to spec author: 2.5× (18.3).
- Google drug-name keywords always disapproved; certification deferred (5.5).

**Still to confirm or change:**
1. **Target precedence:** Business target → Performance; Promise → Satisfaction (13.1).
2. **Fee model:** retainer / % of spend / hybrid, chosen in the pitch (12).
3. **Med spa is the vertical slice** (4.2).
4. **Cleaning** = residential house cleaning, mapped to Home & Home Improvement (5.2).
5. **Boutique apparel** is Meta-only in v1 and anchors on Lifestyle & Boutique (5.2).
6. **Unlock:** avg Satisfaction ≥ 70% AND avg Performance ≥ 60% over the last 3 non-Sandbox campaigns; correct walk-aways count as 100/100 (3).
7. **Lost deal:** pitch < 60%, or a promise worse than the Business target (11.5).
8. **Walk-away option** with unviable briefs (5.4, 11.5).
9. **Round 0 onboarding** with a 6-hour budget (6).
10. **Client update choice and event deck** (10).
11. **In-pitch hints** cost 25% of the stage score (11.2).
12. **Realism locked** per campaign outside Sandbox (9.8).
13. **Firebase auth:** Google sign-in (15).
14. **Campaign length** 4–12 weeks, 8 default (2).
15. **Search bidding:** manual CPC; Smart Bidding deferred (8).
16. **Sandbox** exposes all v1 features regardless of level; Sandbox scores excluded from unlock (2).
17. **Session targets:** round ≤ 3 min, campaign ≤ 30 min (15).
18. HVAC split into service and replacement lead pools (5.1).
19. LTV weight 0.5 on 12-month repeat revenue (5.3).
20. Advantage+ is the L1 default; manual allowed (3, 7.1).
21. **New in v4:** per-business target mixes (5.4 table).
22. **New in v4:** complications and red flags as difficulty sources (5.4).
23. **New in v4:** HVAC scored on value per lead, not raw CPL (13.2).
24. **New in v4:** agency minimum $1,000/month (12).

### 19.2 Verify before coding [UNVERIFIED]
1. Which prescription brand names are on Google's restricted drug term list (5.5). v1 assumes botulinum toxin and filler brands.

Resolved in v4: Meta audience controls (7.5), med spa policy on Meta (5.5), Google drug-term keyword rule (5.5), SMB agency fee ranges (12).

### 19.3 Owner input needed
1. None blocking M0.
2. Deferred: validate lead CPM/CTR/CPC against Meta's peer benchmarks once an owner-owned account runs lead campaigns. Fisher's Power Washing is a candidate in season [STATED 2026-10-24: runs ads, but no lead campaigns in the off-season].

### 19.4 Tunable through the harness [DESIGN]
1. Learning `k_cost` / `k_var`
2. Modifier ranges and the clamp
3. Advantage+ modifier and audience-option modifiers
4. Fatigue rate
5. Lead-source multipliers
6. Tracking factors
7. Satisfaction weights
8. Ramp relaxation
9. Event frequency
10. Hint cost
11. Failure thresholds
12. LTV weight
13. HVAC lead mix distribution
14. HVAC replacement multiplier (2.5×)
15. Per-business target mixes
16. Policy disapproval rates (80% prohibited, 10% before/after)
17. Fee tolerance distribution
