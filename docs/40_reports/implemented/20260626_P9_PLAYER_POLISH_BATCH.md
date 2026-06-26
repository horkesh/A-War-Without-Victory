# P9 Player Polish Batch

**Date:** 2026-06-26  
**Branch:** `codex/p9-player-polish-batch`  
**Plan:** `docs/plans/2026-06-24-army-hq-sector-brigade-information-quality-sweep-plan.md`

## Summary

P9 implements the next owner-playthrough information-quality packet from the James/Newton/Einstein scout queue. The batch focuses on false-history prevention, low-intel routing leaks, stale command routing, and exact-looking derived records.

This packet is UI/read-model/test/docs polish. It does not change simulation logic, scenario data, event evaluation, startup artifacts, save schema, baseline/golden manifests, structural fingerprint outputs, calibration, Srebrenica/Zepa event ownership, or packaging.

## Implemented

- Settlement timelines no longer attach historical events by matching municipality names inside event ids. Historical rows require explicit settlement or municipality scope metadata before they appear on a settlement timeline.
- Corps Front low-intel operation objectives no longer expose the real objective name in the accessible label and cannot route/click into the hidden settlement when sector intelligence is below the reveal threshold.
- Stale operation inspection keys no longer silently select the first live operation when the Operations panel opens. Stale keys stay in the no-selection state until the player chooses a live operation.
- OOB sector drilldown no longer falls back to enemy OSIDs as field-inspection anchors. Enemy-only sub-segments keep corps/sector context without setting `selectedOsid`.
- Formation casualty split provenance is preserved as `exact_ledger`, `derived_from_total`, or `unreported`. Derived fallback splits render as estimated in Formation Detail and Army HQ ORBAT instead of exact KIA/WIA/MIA records.
- Settlement population/displacement panels label municipality-ratio fallback flows as estimates when no settlement-level displacement receipt exists.

## Verification

- Focused settlement/Corps Front proof passed: `npm.cmd exec -- vitest run tests/ui/settlement_timeline_i18n.test.ts tests/ui/corps_front_panel_routing.test.ts --pool=forks --reporter=dot` (2 files / 49 tests).
- Focused OOB/Operations/settlement estimate proof passed: `npm.cmd exec -- vitest run tests/ui/settlement_supply_status.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` (3 files / 58 tests).
- Focused casualty provenance proof passed: `npm.cmd exec -- vitest run tests/ui/formation_detail_parity.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui_map_game_state_adapter.test.ts --pool=forks --reporter=dot` (3 files / 117 tests).
- Combined focused proof passed: `npm.cmd exec -- vitest run tests/ui/settlement_timeline_i18n.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/oob_drilldown_routing.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui_map_game_state_adapter.test.ts --pool=forks --reporter=dot` (8 files / 224 tests).
- TypeScript passed: `npm.cmd run typecheck`.
- Player-journey gate passed: `npm.cmd run qa:player-journeys` (43 files / 651 tests).
- First-hour browser gate passed: `npm.cmd run qa:first-hour:browser`.
- Live-surface browser sweep passed: `npm.cmd run qa:live-surface:browser`.
- Tactical map build passed: `npm.cmd run desktop:map:build` with existing non-fatal Vite externalization/chunk warnings.
- Diff hygiene passed: `git diff --check`.
- Manual live-page sanity against `http://127.0.0.1:3003/` reached `AWWV Map`, showed the faction picker, had no visible error banners, and recorded only one benign missing-resource 404 console error.
- Generated `.tmp_first_hour_browser_gate` and `.tmp_live_surface_browser_sweep` evidence folders were removed after verification; `.tmp_dev_server` remains only for the active local browser/dev session.

Remaining before closeout: GitHub checks/comments, merge, branch prune, and clean-worktree proof.

## Pyrrhic Reports Absorbed

- Newton: settlement timeline municipality-substring false-history matching and settlement displacement/population estimate precision.
- Einstein: Corps Front low-intel objective accessible/routing leak and OOB enemy-anchor fallback.
- James: stale operation-key routing and derived casualty split provenance.
- Averroes and Kierkegaard implementation reports were integrated and the agents were closed after review.

## Deferred Queue

- Sparse Supply Intelligence forecast precision where current reserves are unreported.
- Legacy `autonomy_panel` branch retirement after another targeted routing sweep.

## Scope And Determinism

The changes are deterministic UI/read-model/test/docs work. They alter display/routing contracts and metadata provenance only; no persisted simulation outputs, event mechanics, scenario artifacts, calibration floors, random ordering, timestamp generation, or structural fingerprint artifacts are changed.
