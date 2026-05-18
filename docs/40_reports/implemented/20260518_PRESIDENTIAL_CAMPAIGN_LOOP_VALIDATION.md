# Presidential Campaign Loop Validation

**Date:** 2026-05-18
**Type:** UI route validation, focused regression coverage, and browser-smoke tooling
**Runtime impact:** No simulation mechanics, scenario data, formation-life behavior, event notification content, performance hot path, cinematic verdict UI, save schema, or persisted output changed.

## Summary

- Validated the existing `Brief -> Inspect -> Decide -> Execute -> Report -> Cost -> Judge -> Next` presidential campaign loop without adding a new surface.
- Added route-level regressions for Decision Room source handoffs, pre-advance preserved targets, Warroom delegation, and Turn Aftermath record/Chronicle links.
- Added `tools/ui/presidential_loop_smoke.cjs` to capture browser evidence and emit per-step pass/fail JSON under the curated visual-validation folder.

## Changes Made

### Loop Contract

- Added `docs/40_reports/audits/20260518_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md`.
- Mapped each loop step to an existing owner and route helper.
- Confirmed no loop step lacks a live owner.

### Regression Coverage

- `tests/ui_presidential_decision_room_wiring.test.ts` now validates source handoff route owners.
- `tests/ui/pre_advance_command_review.test.ts` now validates pre-advance rows preserve Decision Room targets.
- `tests/ui/records_button_behavior.test.ts` now validates Turn Aftermath record and Chronicle callbacks.
- `tests/ui_shell_frame_contract.test.ts` now validates Warroom handoffs stay delegated through App and the shared Decision Room router.

### Browser Smoke

- `tools/ui/presidential_loop_smoke.cjs` loads a known save into the dev map, walks the loop checkpoints, captures screenshots, and writes `summary.json`.
- Default evidence folder: `docs/40_reports/implemented/visual_validation/20260518_presidential_loop/`.

## Product-Loop Gaps

- No missing owner or broken route was found in the code/test pass.
- Browser validation does not force the canonical desktop advance-turn IPC path; it validates the review/confirmation step and avoids mutating the scenario.
- A richer pending-decision visual playthrough still needs a retained save with live blocking decisions/opportunities; the current script records `data/derived/latest_run_final_save.json` as the base fixture and adds only player-faction routing metadata in memory.

## Files Changed

| File | Change |
|------|--------|
| `docs/40_reports/audits/20260518_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md` | Loop contract and owner audit. |
| `docs/40_reports/implemented/20260518_PRESIDENTIAL_CAMPAIGN_LOOP_VALIDATION.md` | Implementation report. |
| `tools/ui/presidential_loop_smoke.cjs` | Browser smoke script for loop screenshots and summary JSON. |
| `tests/ui_presidential_decision_room_wiring.test.ts` | Source handoff owner regression. |
| `tests/ui/pre_advance_command_review.test.ts` | Pre-advance preserved-target regression. |
| `tests/ui/records_button_behavior.test.ts` | Turn Aftermath records/Chronicle callback regression. |
| `tests/ui_shell_frame_contract.test.ts` | Warroom/App handoff delegation regression. |

## Verification

- `npx.cmd vitest run tests\ui_presidential_decision_room_wiring.test.ts tests\ui\pre_advance_command_review.test.ts tests\ui\records_button_behavior.test.ts tests\ui_shell_frame_contract.test.ts` passed 28/28.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/dynamic-import/chunk-size warnings.
- `node --check tools\ui\presidential_loop_smoke.cjs` passed.
- `node tools\ui\presidential_loop_smoke.cjs` passed when run against `http://127.0.0.1:3002` with `PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe`. `summary.json` reports 8/8 loop steps passed.
