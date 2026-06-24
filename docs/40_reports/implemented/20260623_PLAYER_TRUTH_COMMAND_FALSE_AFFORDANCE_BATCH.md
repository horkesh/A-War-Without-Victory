# Player Truth and Command False-Affordance Batch

**Date:** 2026-06-23
**Branch:** `codex/player-truth-next-batch`
**Baseline:** `8c64dde9c`
**Result:** Implemented and locally verified, including player-journey and live browser gates

## Summary
- Closed the next Pyrrhic scout findings across enclave supply truth, settlement ethnicity provenance, operation objective drilldowns, empty attack-click handling, front-tooltip enemy-contact truth, force-op receipt ownership, and browser-mode command false-affordances.
- Kept the batch UI/read-model/routing only. No simulation logic, scenario data, startup artifact, save schema, event evaluator mechanics, calibration floor, baseline manifest, packaging artifact, randomness, timestamps, or locale persistence changed.

## Changes Made

- Enclave supply no longer defaults missing data to favorable `adequate`; missing supply renders as unreported in Army HQ supply intelligence and the Enclave Dashboard.
- Enclave airdrop allocation controls render disabled/read-only when the desktop command bridge is unavailable.
- Operation Briefing decision buttons render read-only without Electron IPC, and the wrapper only closes the modal after a successful desktop bridge result.
- Operations Panel objective rows now inspect the objective settlement instead of only panning the map.
- Empty attack-mode map clicks now produce a localized target-selection error and do not create a pending attack confirmation.
- Front tooltip enemy-contact copy now requires visible fielded enemy physical presence on a front endpoint; AoR coverage alone is not labeled as contact.
- Settlement current ethnic structure is shown only when displacement/departure evidence exists instead of duplicating pre-war structure as current truth.
- Forced-operation and officer-resentment receipt ownership no longer treats missing faction metadata as belonging to the loaded player; ownership must be explicit or resolved through corps ownership where available.

## Verification

- Focused pack passed 8 files / 79 tests:
  `.\vitest.cmd run tests\ui\supply_intelligence_mobilization.test.ts tests\ui\command_surface_repurpose_panels.test.ts tests\ui_map_tooltip_player_visibility.test.ts tests\ui\oob_operations_panel.test.ts tests\ui\settlement_supply_status.test.ts tests\ui\map_click_routing_contract.test.ts tests\ui\forced_op_receipts.test.ts tests\ui\officer_resentment_receipts.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 547 tests.
- `npm.cmd run qa:first-hour:browser` passed against `http://127.0.0.1:3003/?dev=1`.
- `npm.cmd run qa:live-surface:browser` passed against `http://127.0.0.1:3003/?dev=1`.

## Follow-Up Queue

- Army HQ commander/metric polish remains the next coherent batch: missing/stale operation commanders should render explicit unreported state across Operations Panel, Army HQ Operations, and Operation Briefing; sparse brigade personnel/cohesion/morale should not render `0`, `0%`, or `NaN`.
- AAR notable-event fallback should stop rendering unmapped raw kind ids.
