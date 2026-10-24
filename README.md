# Agency Builder Sim

A single-player web game that builds the skills to launch and run a paid-social agency for small and medium businesses. You take on a generated client, set up their tracking, run their Meta campaign week by week, manage the relationship, and get a firm debrief on what drove the result.

All results are simulated from published benchmark ranges plus randomness. The game builds intuition and repetition. It does not prove real-world delivery.

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
