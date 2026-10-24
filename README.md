# Agency Builder Sim

A single-player web game that builds the skills to launch and run a paid-social agency for small and medium businesses. You take on a generated client, set up their tracking, run their Meta campaign week by week, manage the relationship, and get a firm debrief on what drove the result.

All results are simulated from published benchmark ranges plus randomness. The game builds intuition and repetition. It does not prove real-world delivery.

**Play it:** https://wezzyindy.github.io/agency-builder-sim/ (works on phone and desktop; progress saves in your browser).

## What's in this build (M0 + M1 + M4)

- **Ads Manager Only mode, Level 1 (Meta), for all 6 v1 businesses:** med spa, roofing, landscaping, house cleaning, HVAC, and boutique apparel. Pick one or let the game surprise you. Each client gets a generated brief, Round 0 onboarding (6 hours to audit, fix, or disclose tracking defects), campaign setup, 8 weekly rounds with client events and weekly updates, a debrief every week, and a final debrief with a counterfactual replay, client profit after your fee, and your agency P&L.
- **What's different per business:**
  - **Med spa:** Meta's health and wellness ad policy, data-source restrictions, and neutral naming.
  - **Roofing:** high-ticket, long sales cycle, storm-driven demand, and price-shopper angles.
  - **Landscaping:** seasonal project work. Cheap mowing leads look good in the report and earn little.
  - **House cleaning:** thin economics that depend on recurring clients, so many briefs are hard or unviable once your fee is counted. One-time deal seekers are the trap.
  - **HVAC:** two lead pools. Service leads are cheap and worth about $86; replacement leads cost about 2.5x more and are worth about $1,440. The messaging decides the mix, and Performance scores leads by what they're worth.
  - **Boutique apparel:** an online store. Sales objective, purchase-path events (add to cart or initiate checkout until purchases pass about 50 a week), order value from the brief, ROAS, and a broken purchase event as the critical tracking defect.
- **The simulation engine and calibration harness** for all of it.

Not in this build: pitch mode and Full Run (M2), Google Search (M3), Sandbox, Firebase sync across devices, score-history views, and the explainer library (M5). Those modes show as "coming soon" in the menu.

The full design is in [`agency-builder-sim-spec-v4.md`](agency-builder-sim-spec-v4.md). The M0/M1 build plan is in [`docs/plans/`](docs/plans/).

## Running locally

`index.html` loads ES modules, so serve the folder over http (browsers block module imports from `file://`):

```sh
npx serve .
```

## Tests and calibration harness

Node v22+ is required. No install step; there are no dependencies.

```sh
npm test                                  # unit tests + a reduced-N harness smoke test
npm run harness -- --business all         # full calibration harness, every business (N = 1,000 per cell)
npm run harness -- --business hvac        # one business
npm run harness -- --criteria mix         # difficulty-mix and generator-stall checks, all businesses
node scripts/smoke.js hvac,apparel 60     # quick per-business summary while tuning
node scripts/fingerprint.js               # hash of med spa outcomes; unchanged = refactor didn't move med spa
```

The test script uses the quoted glob form (`node --test "tests/**/*.test.js"`) because the plain directory form doesn't reliably discover files on Windows.

## Calibration notes

Every milestone re-runs the full harness (spec Section 16). Last full run (M4, `npm run harness -- --business all`, N = 1,000 per cell): **103 of 103 applicable criteria pass.** Key values at realism 3 unless noted:

| Business | 1. Best-practice median true cost (band) | 3. Fail rate, achievable: best / naive | 4. Fail rate, hard | 5. Realism 5: best/random median, random wins | 10. Unviable lost |
|---|---|---|---|---|---|
| Med spa | CPL $49.62 ($35.64-$71.27) | 7.0% / 100% | 24.6% | 0.71, 20.7% | n/a |
| Roofing | CPL $40.84 ($24.29-$60.13) | 7.8% / 100% | 25.6% | 0.71, 18.8% | n/a |
| Landscaping | CPL $40.93 ($24.29-$60.13) | 4.1% / 100% | 20.7% | 0.68, 16.5% | n/a |
| House cleaning | CPL $42.10 ($24.29-$60.13) | 6.8% / 100% | 29.5% | 0.69, 17.4% | 80.1% |
| HVAC | CPL $65.63 ($39.47-$87.09, blended at 70% service) | 6.7% / 99.9% | 25.6% | 0.67, 18.7% | n/a |
| Boutique apparel | CPA $30.97 ($21.81-$43.62) | 5.9% / 100% | 31.6% | 0.64, 16.3% | 85.6% |

Thresholds: (1) inside the band; (2) best practice beats naive by 30%+ (naive gets almost no true results everywhere); (3) best practice at or under 10%, naive at or over 50%; (4) 15-50%; (5) best practice wins on median but random wins 15%+ of seeds; (10) 80%+. Criterion 6 (no NaN or Infinity), 8-9 (difficulty mix within 5 points of target for all 6 businesses at L1 and L2, under 200 draws), and 11 (med spa policy rates) also pass. Criterion 10 applies only where a business has economically unviable briefs at L1 (cleaning, apparel). Cleaning's 80.1% is close to the line.

Deferred: criterion 7 (sandbag test) needs pitch mode (M2); criterion 11's Search portion needs Search (M3).

Design decisions made while calibrating (all [DESIGN] values; see `src/config/tunables.js`):

- **Learning is normalized to the benchmark (KTD5).** Published medians already reflect mostly learning-limited small accounts, so one ad set at the typical L1 budget pays no extra learning penalty. Splitting budgets, edits, and pauses still raise cost from there. For ecomm the reference uses initiate checkout, the recommended event at L1.
- **Scores count results by value ("value units").** Spec 9.4 says the client judges on true outcomes. Weekly satisfaction, the target-failure check, and Performance all use spend per value unit: for a single-pool lead business, bookings at the client's close rate (unchanged from M1); for HVAC, each pool's leads at their expected close and value; for apparel, gross profit per order. Cheap leads that don't close, cheap tune-ups instead of replacements, and 40%-off orders don't count as wins.
- **HVAC value units are mostly expected, partly realized.** One replacement job is worth about 12 leads. Judging purely on realized jobs churned 53% of best-practice clients on achievable briefs, because one missed sale swung satisfaction. Value units are 60% leads at expected close and 40% realized jobs.
- **Results exponent 2.** A client paying twice the promised cost per booked lead scores 25, not 50. Harsher complications (off-season x1.5 for the first half; slow speed-to-lead x0.6, x0.7 once advised) make hard briefs hard.
- **The random policy stays inside the right objective, on real setups.** A uniformly random objective is a trap most of the time, so "random" would just be a second naive policy. Wrong objectives and trap goals are the naive policy's job (criterion 2).
- **Realism 5 is genuinely noisy.** Auction luck is keyed to each ad set's setup. Hidden per-client fit grows with realism: for lead sources and audiences, for ecomm events, for angles that shift lead quality (deal angles sometimes work for a given client), and for each HVAC angle's pull on the lead mix. The realism weight on non-benchmark modifiers drops to 0.55 at level 5. HVAC's lead mix is an odds multiplier, so it takes that weight twice.
- **Deal angles hurt through lead quality or margin, not reach.** Roofing's lowest-price, landscaping's mowing deal, and cleaning's $99 deep clean get cheaper leads that close less. Apparel's 40%-off angle gets cheaper orders but cuts margin per order by the discount.
- **Criterion 10 counts a failed run as lost.** A client who ended the campaign at the midpoint for missing the target hasn't been won, even if the partial campaign's Performance crept above 60. Unviable briefs sit just under the 0.6 ratio line (median about 0.52), so campaign noise alone pushes some over 60.
- **Best practice includes one planned creative refresh at week 5** to beat fatigue. It is the only non-fix edit in the run.

Deviations from the spec, recorded here so they're easy to revisit:

- Satisfaction and Performance use value units (above), not raw true leads.
- The final debrief is lost on reload: the save is cleared when a run ends (the score is kept).
- Saves from before M4 (run version 1) are discarded on load.
