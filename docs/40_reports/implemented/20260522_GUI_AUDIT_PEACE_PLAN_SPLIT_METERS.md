# GUI Audit Peace Plan Split Meters

**Date:** 2026-05-22  
**Type:** Tactical-map UI adapter/browser-bundle fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit identified Vance-Owen peace-plan territory meters rendering as `0%` in the tactical shell. `PeacePlanModal` already rendered nonzero split data correctly when given a populated `pendingPeacePlan`, so the defect was upstream: `GameStateAdapter` loaded peace-plan catalog data with a runtime `require(...)` inside the browser read path.

When that lookup fails in the browser bundle, the adapter falls back to `{ RBiH: 0, RS: 0, HRHB: 0 }`, causing the modal to display zero-width meters despite the catalog carrying the historical split.

## Change

- `GameStateAdapter` now imports `PEACE_PLANS` statically from the catalog module.
- Pending peace plans resolve their name, narrative, proposed split, and institutional model from that browser-safe static import.
- Pending counter-offers reuse the same static catalog import for plan names, removing the same runtime `require(...)` pattern from that nearby adapter path.
- Added an adapter-boundary regression that forbids the browser-unsafe `require(...)` and proves raw `vance_owen` pending state resolves to the catalog split `{ RBiH: 39, RS: 43, HRHB: 18 }`.

## Verification

- Red run `npx.cmd vitest run tests\ui_adapter_boundary.test.ts --reporter=dot` failed before the patch because `GameStateAdapter.ts` still contained `require('../../../sim/negotiation/peace_plan_data.js')`.
- `npx.cmd vitest run tests\ui_adapter_boundary.test.ts tests\ui\peace_plan_modal.test.ts tests\ui\diplomacy_view.test.ts tests\ui\diplomacy_panel.test.ts --reporter=dot` passed 23/23 after the patch.

## Remaining GUI Audit Queue

This closes the Vance-Owen zero-meter slice from audit Batch C. The broader 2026-05-22 GUI visual audit remains active for stacked stale peace modals, modal palette unification, stale-state resets, Warroom chrome scoping, no-op control feedback, onboarding spotlight/bridge-unavailable feedback, and polish cleanup.
