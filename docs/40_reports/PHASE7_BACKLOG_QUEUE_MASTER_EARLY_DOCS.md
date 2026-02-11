# Phase 7 Backlog Queue — Master Early Docs

Source plan: `docs/40_reports/IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md`  
Status: Post-MVP queue (Phase 7). Updated after execution pass on 2026-02-10.

## Queue order

1. **B1 Event framework (4-6d) — IMPLEMENTED (2026-02-10)**
   - Implemented: trigger/effect types, historical + random registry, deterministic evaluator, pipeline hook (`evaluate-events`), `events_fired` report output, B1.4 tests and determinism audit expansion.

2. **B2 Campaign branching/unlocks (5-7d) — IMPLEMENTED (2026-02-10)**
   - Implemented: scenario `prerequisites` schema and loader; unlock module (`getPlayableScenarioIds`, read/write/mark completed); example scenarios; CAMPAIGN_BRANCHING.md.

3. **B3 Negotiation counter-offers (3-4d)**
   - Counter proposal model and optional map-integrated UI.
   - Current baseline remains accept/reject flow.

4. **B4 Coercion event tracking (2-3d) — IMPLEMENTED (2026-02-10)**
   - Implemented: `coercion_pressure_by_municipality` state field, Phase I flip integration, scenario/runner wiring, historical data (Prijedor/Zvornik/Foča), B4.4 tests.

## Remaining implementation focus

- B3 negotiation counter-offers (not started)

## Notes

- This queue remains post-MVP and Phase 7 scoped.
- Full chronology and artifact-level details are in `docs/PROJECT_LEDGER.md`.

