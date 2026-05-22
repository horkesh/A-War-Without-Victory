# GUI Audit Label Discipline

**Date:** 2026-05-22  
**Type:** Tactical-map UI text cleanup from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit identified player-facing label leaks in the tactical map:

- Operational SITREP priority fronts could show raw settlement slug fragments such as `Cadjavica_gornja_2`.
- Local-support panels exposed the implementation phase label `Phase E`.
- Army HQ opportunity pulse exposed the internal `T3 Authorized` sentinel.

These are player-truth and presentation defects, not mechanics defects.

## Change

- `SituationTab` now formats priority-front labels through the current OSID display-name map when it receives legacy SITREP labels derived from raw OSIDs, falling back to the existing OSID humanizer.
- `SituationTab` and `SelectionPanel` now title the support surface `Local Support`.
- `OpportunityLedgerPanel` now labels the reserve-crisis pulse metric `Reserve-Crisis Authorization`.
- Added a jsdom regression test covering all three audited surfaces and guarding against the raw SITREP slug pattern.

## Verification

- `npx.cmd vitest run tests\ui\gui_audit_label_discipline.test.ts --reporter=dot` passed 3/3 after a red run that failed on all three audited strings.
- `npx.cmd vitest run tests\operational_sitrep_views.test.ts tests\ui\opportunity_ledger_pulse.test.ts tests\ui\operation_aar_records_review.test.ts --reporter=dot` passed 14/14.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.

## Remaining GUI Audit Queue

This closes the first player-facing label-discipline slice from audit Batch B. The rest of the 2026-05-22 GUI visual audit remains active: MapLibre render correctness, peace/event modal hygiene, modal palette unification, stale-state resets, Warroom chrome scoping, no-op controls/onboarding spotlight/bridge feedback, and polish cleanup.
