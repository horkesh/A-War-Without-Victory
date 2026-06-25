# Player Surface Edge Polish

**Date:** 2026-06-25
**Status:** Implemented on `main` through sparse operation lifecycle follow-up commit `82eb67bb2`; branch Event System CI passed before local fast-forward integration.

## Summary

Closed the next player-surface edge defects found by the Raman and Peirce specialist scouts without touching simulation, startup artifacts, calibration, baselines, structural fingerprints, Srebrenica/Zepa event ownership, or packaging.

## Changes Made

### Sparse Data And Census Truth
- Formation Detail now renders sparse tank/artillery condition components as `Condition unreported` instead of dereferencing absent fields.
- Selected-settlement and municipality ethnicity charts suppress partial census rows instead of zero-filling missing groups.
- `buildEthnicGeoJSON`, `getMajorityEthnic`, and `getCurrentEthnicForOsid` now require complete Bosniak/Serb/Croat/Other census fields before emitting majority or current ethnic data.

### Physical Location And Hover Truth
- ORBAT, Corps Detail, and CorpsCard hover highlights now use physical `location_osid` only, not stale AoR coverage.
- Stack expansion remains physical-location-only and now clamps its anchor to the viewport.

### Tooltip And Sector Presentation
- Tactical tooltip anchors clamp to the viewport.
- Front-edge tooltips render absent pressure as `Pressure unreported` while preserving explicit zero pressure as `Balanced`.
- Army HQ sector detail no longer repeats projected density as both `Brigades per front segment` and `Troop density`.

## Verification

- Red/green Raman packet: Formation Detail sparse condition crash, Army HQ duplicate density label, tooltip viewport clamp, stack expansion viewport clamp, ORBAT physical hover, and settlement census suppression tests failed before production fixes, then passed.
- Red/green Peirce packet: missing front pressure, Corps Detail/Card AoR hover, and ethnic-map/current-ethnic partial census tests failed before production fixes, then passed.
- Final combined focused proof: `node node_modules\vitest\vitest.mjs run tests\ui\formation_detail_parity.test.ts tests\ui\army_hq_sector_truth.test.ts tests\ui\aar_tooltip_friction_labels.test.ts tests\ui\stack_expansion_overlay_viewport.test.ts tests\ui\orbatpanel_drilldown_routing.test.ts tests\ui\settlement_supply_status.test.ts tests\ui_player_visibility.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui\command_drilldown_routing.test.ts tests\ui\gui_audit_label_discipline.test.ts tests\ui_map_ethnic_truth.test.ts --pool=forks --reporter=dot` passed 11 files / 134 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 594 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.

## Scope And Determinism

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario source data, event evaluator mechanics, startup snapshot, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale sorting, or persisted output ordering changed.

## Parked Follow-Up

- Closed by the `codex/field-routing-accessibility-polish` follow-up: formation selection routing now keeps AoR/HQ anchors out of physical `FieldInspectionTarget.osid` selection while retaining them for navigation panning; StackExpansionOverlay now renders as a modal dialog with initial focus, Escape handling, Tab trap, and focus restoration; and Army HQ / Operation Briefing command-strain consumers derive labels from numeric strain when read-model labels are absent.

## Follow-Up Verification

- Red/green routing proof: command formations with `hq_osid` but no `location_osid` no longer select an HQ settlement; physical map builders remain pinned to `resolveFormationPhysicalLocationOsid`; navigation anchors resolve `location -> AoR -> HQ`.
- Red/green accessibility proof: StackExpansionOverlay now exposes `role="dialog"`, `aria-modal="true"`, localized accessible name, initial focus, deterministic Tab wrapping, Escape close with propagation stopped, and focus restoration.
- Red/green command-strain proof: positive numeric strain with missing read-model label derives `strained` / `compromised`; explicit zero remains healthy/silent.
- Focused proof: `node .\node_modules\vitest\vitest.mjs run tests/ui/map_click_routing_contract.test.ts tests/ui/command_strain_interpretation.test.ts tests/ui/stack_expansion_overlay_viewport.test.ts --reporter=dot` passed 3 files / 72 tests, including formation/sector pan precedence over broad corps bounds.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 594 tests.
- `npm.cmd run qa:first-hour:browser` and `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified; generated evidence folders were removed after inspection.
- `git diff --check` passed.

## Corps Front / Formation Detail Truth-Parity Follow-Up

- Corps Detail now renders corps and sector stance through player-safe stance vocabulary instead of generic enum title-casing; unknown stance values remain `UNREPORTED`.
- Formation Detail now resolves active sector ownership through the shared current-sector projection, so a valid player sector override no longer displays as stale roster ownership.
- Formation Detail no longer synthesizes zero campaign losses or a zeroed combat summary when brigade records are absent; missing loss fields render `Unreported`, and the record tab shows an honest no-record state.
- Corps Front now treats operation identity and participating brigade count as player-owned command records while preserving intel gating for hostile/objective/supply details.

### Truth-Parity Verification So Far

- Focused proof: `node .\node_modules\vitest\vitest.mjs run tests/ui/formation_detail_parity.test.ts tests/ui/corps_detail_sector_truth.test.ts tests/ui/corps_front_panel_routing.test.ts --reporter=dot` passed 3 files / 69 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 596 tests.
- `npm.cmd run qa:first-hour:browser` passed with dev-server cleanup verified.
- `npm.cmd run qa:live-surface:browser` passed with dev-server cleanup verified.
- Generated `.tmp_first_hour_browser_gate` and `.tmp_live_surface_browser_sweep` evidence folders were removed after inspection; `.tmp_dev_server` remains as the active local dev-server marker.
- `git diff --check` passed.
- Branch Event System CI passed on `codex/corps-front-truth-parity`.
- Main GitHub inspection passed for the truth-parity branch before this sparse-operation follow-up.

### Next Scout Queue

- Operation opportunity axis-readiness counts still need a focused sparse-data pass: missing required/optional axis readiness should not default to green or zero without explicit proposal evidence.

## Sparse Operation Lifecycle / Corps Front Forces Follow-Up

- Corps Front Forces-tab rows now render missing assigned, reserve, command-directed, and rear/support brigade personnel as visible and accessible `Unreported` copy instead of omitting the value or showing a dash.
- Corps Front preparation progress no longer invents `Cycle 0 of 8 (0%)` when timing records are absent; it renders `Preparation timing unreported`.
- `GameStateAdapter` now preserves sparse operation lifecycle truth: missing or invalid operation phase projects as `phase_unreported`, and sparse axis objective/status/momentum/staging fields remain absent rather than becoming `planning`, `executing`, `0`, or index `0` claims.
- OperationsPanel and Army HQ Operations render sparse operation records as `Status pending`, suppress false phase/current-objective/progress claims, and show unreported objective/axis/momentum fields without crashing.
- Ops modal brigade cards no longer treat missing personnel/composition/cohesion/fatigue as zero, fresh, healthy, or combat ineffective; auto-propose scoring no longer ranks unknown-condition brigades as healthy.

### Sparse Operation Verification So Far

- Focused red/green proof passed: `node node_modules\vitest\vitest.mjs run tests/ui/corps_front_panel_routing.test.ts tests/ui/ops_brigade_card_i18n.test.ts tests/ui/ops_modal_auto_propose.test.ts tests/ui/oob_operations_panel.test.ts tests/ui/army_hq_timing_copy.test.ts tests/ui_map_game_state_adapter.test.ts --pool=forks --reporter=dot` (6 files / 129 tests).
- `npm.cmd run typecheck` passed.
- Manual in-app browser proof on `http://127.0.0.1:3003/` verified RBiH war-start splash, foundational decision modal, Army HQ load, OOB sector drilldown, Corps Front sector intelligence, Operations accordion, and Order of Battle controls with no browser console errors. Sparse sector intel rendered `Unreported` for missing stance, operational security, and confidence.

### Sparse Operation Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, event evaluator mechanics, startup snapshot, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.

## Closeout

- Sparse-operation branch Event System CI passed, then the branch fast-forwarded into `main` at `82eb67bb2`. Remote `main` run status is the authoritative post-push closeout record.

## Operation Opportunity Axis Sparse-Readiness Follow-Up

- Operation opportunity prerequisite axes now preserve missing `green` readiness as `unreported` instead of treating it as a blocked/strained axis.
- Required/optional green counts stay undefined when any counted axis lacks a reported boolean, so dossier summaries and Presidential Decision Room evidence render `Required axes unreported` / `Optional axes unreported` instead of `0/N`.
- Historical opportunity ledger rows use the same sparse-count contract, and opportunity ledger pulse lifetime counters exclude records whose axis readiness was unreported instead of converting them to green-count zero.
- EN/BCS i18n keys were added for the unreported opportunity-axis state and summary/evidence copy.

### Opportunity Axis Verification So Far

- Red/green focused proof passed: `node node_modules\vitest\vitest.mjs run tests/ui_map_game_state_adapter.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/army_hq_timing_copy.test.ts tests/ui/opportunity_ledger_pulse.test.ts --pool=forks --reporter=dot` (4 files / 116 tests).
- `npm.cmd run typecheck` passed.

### Opportunity Axis Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, opportunity generation, scenario data, event evaluator mechanics, startup snapshot, save schema, baseline manifest, golden manifest, structural fingerprint artifact, Srebrenica/Zepa event ownership, packaged installer artifact, randomness, timestamps, locale persistence, or persisted output ordering changed.
