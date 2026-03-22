# v1.0 Packaging Notes (Prototype)

This document captures the packaging checklist for a v1.0 prototype build and a reproducible run path.

## Contents
- Canon v0.4 docs (see `docs/CANON.md`)
- Phase G UI prototype (`dev_ui/phase_g.html`)
- Phase H audit notes (`docs/audits/phase_h3_ivp_enclave_sarajevo_validation.md`)

## Reproducible run (baseline)
1. Install dependencies:
   - `npm install`
2. Typecheck and tests:
   - `npm run typecheck`
   - `npm test`
3. Data prereq check (optional but recommended):
   - `npm run sim:data:check`
4. Scenario run (baseline):
   - `npm run sim:scenario:run -- --scenario data/scenarios/baseline_ops_26w.json`
5. Determinism gate (optional):
   - `npm run test:baselines`

## UI prototype
- Launch dev server: `npm run dev:map`
- Open `http://localhost:3000/dev_ui/phase_g.html`
- Load a save JSON to view control and cost summaries.

## Known issues (v1.0 prototype)
- Legitimacy uses municipality-level demographics as a proxy for settlement-level data.
- Enclave detection is based on critical supply state; non-critical isolation is not modeled.
- Doctrine eligibility uses edge-based supply heuristics and may under-report availability.
- Equipment initialization defaults to embargo-based baselines; scenario-specific inventories are not yet encoded.
- Negotiation capital uses v0.4 formula but does not yet track per-faction offer acceptance.

## Read-only guarantee
- UI pages read GameState JSON and do not mutate simulation state.
- No packaging step writes derived state into saves.
