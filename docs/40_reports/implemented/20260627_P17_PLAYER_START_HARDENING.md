# P17 Player-Start Hardening

## Summary

P17 closes the recovered first-hour/foundational decision hardening packet. New campaigns for RBiH, RS, and HRHB still surface the selected faction's foundational decision, but the pre-choice event modal no longer exposes future-branch metadata or downstream-impact preview cards before the player chooses.

## Changes

- Removed the `EventDecisionModal` future-consequence/downstream-impact preview render path and its unreachable helper code.
- Removed modal-only EN/BCS translation keys for the retired pre-choice preview surface.
- Added `tests/player_start_surface_contracts.test.ts` to pin real foundational event queuing, response resolution, and no pre-choice future-knowledge leakage.
- Extended `tools/ui/first_hour_browser_gate.cjs` so all-faction browser proof fails on `future_consequences`, `opens_events`, `closes_events`, `csq_*`, downstream-impact preview copy, and related detail controls in foundational decision modals.
- Added `qa:player-starts:browser` as the explicit all-faction first-hour browser gate alias.

## Verification

- `npm.cmd exec -- vitest run tests/player_start_surface_contracts.test.ts tests/warroom_new_campaign_flow_truth.test.ts tests/ui/event_decision_modal_phase3.test.ts --pool=forks --reporter=dot` passed: 3 files / 21 tests.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed: 43 files / 677 tests.
- `npm.cmd run qa:player-starts:browser` passed and wrote `.tmp_first_hour_browser_gate/first_hour_browser_gate.json`.

## Scope

UI presentation, browser-QA tooling, tests, package script, and docs only. No event JSON, event evaluator mechanics, simulation behavior, startup artifact, save schema, baseline/golden manifest, calibration, randomness, timestamps, locale persistence, packaging, or Srebrenica/Zepa event-owned fall receipt behavior changed.
