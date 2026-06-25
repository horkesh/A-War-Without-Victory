# 2026-06-25 P4 Player Polish Batch

## Summary

Branch `codex/p4-player-polish-batch` closes the next owner-playthrough polish packet under `docs/plans/2026-06-24-army-hq-sector-brigade-information-quality-sweep-plan.md`.

Implemented scope:

- Reconciled stale merged-PR review comments into `docs/life_lessons/process.md`, restoring the indexed life-lessons count to 280.
- Tightened filed-record truth so only player-facing operation history counts as filed operation evidence, while Desk/Records decision summaries distinguish Records-routed receipts from Chronicle-routed receipts.
- Hardened Personnel sparse reserve and mobilization readouts so missing reported values render `Unreported` instead of zero, `NaN`, or crash-prone copy; explicit zero remains exact.
- Routed settlement stationed-unit clicks and AAR formation links through the shared field-inspection resolver so sector/corps/OSID context is preserved.
- Sanitized operation-opportunity consequence receipt copy so raw executed-operation slugs are not filed into Records-facing text.
- Made Corps Front condition and operation-supply aggregates require complete reported source metrics before showing exact averages; partial source data renders `Unreported`, while explicit zero remains exact.
- Fixed tactical battle-marker hover cleanup so remounts unregister the same handler references that were registered.
- Absorbed the CI-wait scout follow-up: sparse OOB mobilization now renders `Unreported`, Corps Detail is pinned against `Obj 0/0` operation progress, partial-zero ORBAT campaign casualty rows stay visible, Chronicle Wrapped and the Records territory chart ignore setup/prologue summaries, operation-opportunity receipts are directly scoped to the loaded player faction, and the live browser context-menu proof now clicks the deterministic Deselect action instead of only opening the menu shell.

## Verification

Focused red/green proof covered each changed behavior. Final combined focused proof passed 9 files / 159 tests:

`npm.cmd exec -- vitest run tests/ui/filed_record_truth.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/president_desk_shell.test.ts tests/ui/personnel_player_safe_display.test.ts tests/ui/settlement_supply_status.test.ts tests/ui/aar_panel_drilldown_routing.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/corps_front_panel_routing.test.ts tests/ui_map_interactions.test.ts --pool=forks --reporter=dot`

Additional local gates passed:

- `npm.cmd run typecheck -- --pretty false`
- Scout follow-up focused pack passed 8 files / 79 tests: `npm.cmd exec -- vitest run tests/ui/oob_drilldown_routing.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/chronicle_wrapped_setup_provenance.test.ts tests/ui/territory_over_time_chart_timing.test.ts tests/ui/decision_consequence_trail.test.ts tests/ui/filed_record_truth.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot`.
- `npm.cmd run qa:player-journeys` passed 43 files / 621 tests after the scout follow-up.
- `npm.cmd run qa:first-hour:browser`
- `npm.cmd run qa:live-surface:browser`; the final evidence recorded `mapContextMenuLiveProof.clickedAction: "deselect"` and dev-server port cleanup.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified fresh RBiH start, war-start splash, `WAR BEGINS: 6 APR 1992` identity brief, foundational `What Is Bosnia?` Desk packet, Desk decision count truth, Army HQ command/OOB commander data, clickable top-level nav labels, and no sampled raw command slug leak.

## Pyrrhic Team

Absorbed and closed scout/implementation reports:

- Mill/Noether
- Wegener/Ada
- Meitner/Curie
- Popper
- Euler

## Scope And Determinism

This packet is UI/read-model/test/docs polish only. It does not change simulation logic, scenario data, event evaluator mechanics, startup snapshot construction, save schema, baseline/golden manifest files, structural fingerprint artifacts, Srebrenica/Zepa event ownership, calibration, packaged installer artifacts, randomness, timestamps, locale sorting, or persisted output ordering.

Temporary browser-gate evidence folders were removed after the verification details were captured. The `.tmp_dev_server` marker was left in place for the active local dev server.
