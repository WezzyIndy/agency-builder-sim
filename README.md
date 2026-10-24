# Agency Builder Sim

A single-player web game that builds the skills to launch and run a paid-social agency for small and medium businesses. You take on a generated client, set up their tracking, run their Meta campaign week by week, manage the relationship, and get a firm debrief on what drove the result.

All results are simulated from published benchmark ranges plus randomness. The game builds intuition and repetition. It does not prove real-world delivery.

**Play it:** https://wezzyindy.github.io/agency-builder-sim/ (works on phone and desktop; progress saves in your browser).

## What's in this build (M0 + M1)

- **Ads Manager Only mode, med spa, Level 1 (Meta).** A generated client brief, Round 0 onboarding (6 hours to audit, fix, or disclose tracking defects), campaign setup, 8 weekly rounds with client events and weekly updates, a debrief every week, and a final debrief with a counterfactual replay, client profit after your fee, and your agency P&L.
- **The simulation engine and calibration harness** for all of it, plus brief generation and difficulty for all 6 v1 businesses.

Not in this build: pitch mode and Full Run (M2), Google Search (M3), the other 5 businesses' playable content and ecomm simulation (M4), Sandbox, Firebase sync across devices, score-history views, and the explainer library (M5). Those modes show as "coming soon" in the menu.

The full design is in [`agency-builder-sim-spec-v4.md`](agency-builder-sim-spec-v4.md). The current build plan is in [`docs/plans/`](docs/plans/).

## Running locally

`index.html` loads ES modules, so serve the folder over http (browsers block module imports from `file://`):

```sh
npx serve .
```

## Tests and calibration harness

Node v22+ is required. No install step; there are no dependencies.

```sh
npm test                                  # unit tests + a reduced-N harness smoke test
npm run harness -- --business medspa      # full calibration harness (N = 1,000 per cell)
npm run harness -- --criteria mix         # difficulty-mix and generator-stall checks, all businesses
```

The test script uses the quoted glob form (`node --test "tests/**/*.test.js"`) because the plain directory form doesn't reliably discover files on Windows.

## Calibration notes

The M0 exit gate is the full harness passing for med spa at L1 on Meta (`npm run harness -- --business medspa`, N = 1,000 per cell). Last full run: 41 of 41 applicable criteria pass. Key values:

| Criterion | Result | Threshold |
|---|---|---|
| 1. Best-practice median true CPL (realism 1 / 2 / 3) | $49.58 / $49.69 / $49.62 | $35.64-$71.27 (Beauty $50.91, KTD6 band) |
| 2. Best practice vs naive median | naive gets no true leads | best <= 0.70 x naive |
| 3. Failure rate, achievable, realism 3 | best practice 7.0%, naive 100% | <= 10%, >= 50% |
| 4. Failure rate, hard, realism 3 | 24.6% | 15-50% |
| 5. Realism 5 | best-practice median 0.71 x random's; random wins 20.7% of seeds | < 1; >= 15% |
| 6. NaN / Infinity in any week | none | none |
| 8-9. Difficulty mix, generator stalls (6 businesses x L1, L2) | worst miss 3.6 points; max 175 draws | <= 5 points; <= 200 |
| 11. Med spa policy (Meta) | prohibited 80.6%, before/after 10.2%, under-18 100% | 80% +/- 2, 10% +/- 1.5 |

Deferred: criterion 7 (sandbag test) needs pitch mode (M2); criterion 10 (unviable briefs can't be won) needs economically unviable briefs, which med spa never has at L1 (M4, on cleaning and apparel); criterion 11's Search portion needs Search (M3).

Design decisions made while calibrating (all [DESIGN] values; see `src/config/tunables.js`):

- **Learning is normalized to the benchmark (KTD5).** Published medians already reflect mostly learning-limited small accounts, so one ad set at the typical L1 budget pays no extra learning penalty. Splitting budgets, edits, and pauses still raise cost from there.
- **Weekly satisfaction counts bookings, not raw leads.** Spec 9.4 says the client judges on true outcomes. Results compare the promise to the client's cost per lead counted the way they count it: bookings at their usual close rate. Without this, slow follow-up and low-quality lead sources could never disappoint a client, and hard med spa briefs failed only 1-2% of the time.
- **Results exponent 2.** A client paying twice the promised cost per booked lead scores 25, not 50. Harsher complications (off-season x1.5 for the first half; slow speed-to-lead x0.6, x0.7 once advised) make hard briefs hard.
- **The random policy stays inside the Leads objective.** A uniformly random objective is a trap 4 times in 5 for a leads client, so "random" would just be a second naive policy. Wrong objectives are covered by the naive policy (criterion 2).
- **Realism 5 is genuinely noisy.** Auction luck is keyed to each ad set's setup, hidden per-client fit for lead sources and audiences grows with realism, and the realism weight on non-benchmark modifiers drops to 0.55 at level 5 (cost and lead quality alike).
- **Best practice includes one planned creative refresh at week 5** to beat fatigue. It is the only non-fix edit in the run.
