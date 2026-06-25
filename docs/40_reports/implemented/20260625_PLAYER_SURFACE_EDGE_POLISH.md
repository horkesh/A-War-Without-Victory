# Player Surface Edge Polish

**Date:** 2026-06-25
**Status:** Implemented on `main`; field-routing/accessibility follow-up merged green at `86191c7a7`; Corps Front / Formation Detail truth-parity follow-up in progress on `codex/corps-front-truth-parity`.

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
- Diff check, GitHub inspection, merge, and branch cleanup remain pending for this active branch.

### Next Scout Queue

- Corps Front Forces-tab brigade rows should align missing personnel truth with Army HQ sector rows: visible and accessible row copy should say `Unreported` instead of omitting personnel or rendering a dash.
- Operation sparse-lifecycle truth needs the next larger slice: `GameStateAdapter` currently promotes missing operation phase/axis status to execution/executing, ops-planning brigade cards score missing combat data as zero/healthy, opportunity axis-readiness counts default missing values to zero, and Corps Front planning progress can invent a `0/8` preparation cycle.

## Closeout

- For the active `codex/corps-front-truth-parity` branch, run final combined verification after docs.
- Push branch, inspect GitHub failures/comments, merge to `main` only after green, then delete the branch/worktree/temp evidence.
