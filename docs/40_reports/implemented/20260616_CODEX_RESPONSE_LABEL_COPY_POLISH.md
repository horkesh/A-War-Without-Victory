# Codex Response Label Copy Polish

**Date:** 2026-06-16  
**Type:** Codex read-model player-facing copy hardening  
**Scope:** Distance from History and Dilemma Spine Codex surfaces

## Summary

This slice closes two Pyrrhic player-polish sweep findings in Codex read-model data:

- Distance from History divergences exposed raw response ids through the existing `chosen` / `historical` display fields.
- Dilemma Spine branch labels fell back to `chosenResponseId` when the event response label could not be resolved.

`distanceFromHistory.ts` now resolves both chosen and historical defaults through the event catalog response-option labels before they reach Codex display fields. Raw response ids remain available as `chosenResponseId` and `historicalResponseId` for internal/debug use. If a response id cannot be resolved to authored copy, the display field uses neutral player-safe fallback copy instead of the raw id.

`dilemmaSpine.ts` now keeps `chosenResponseId` as the raw internal id while `chosenBranchLabel` falls back to neutral player-safe copy when no canon response label exists.

## Files

- `src/ui/map/data/distanceFromHistory.ts`
- `src/ui/map/data/dilemmaSpine.ts`
- `tests/ui/distance_from_history.test.ts`
- `tests/ui/dilemma_spine.test.ts`

## Verification

- Red proof first: focused tests failed because Distance from History still displayed `reject` / `not_a_real_option`, lacked explicit raw-id fields, and Dilemma Spine displayed `not_a_real_option`.
- Green proof: `npx.cmd vitest run tests/ui/distance_from_history.test.ts tests/ui/dilemma_spine.test.ts` -> 2 files / 17 tests passed.
- Combined raw-copy pack: `npx.cmd vitest run tests\ui\distance_from_history.test.ts tests\ui\dilemma_spine.test.ts tests\ui\consequence_receipts.test.ts tests\ui\chronicle_causality_slides.test.ts --pool=forks --reporter=dot` -> 4 files / 38 tests passed.
- TypeScript: `npm.cmd run typecheck` passed.
- Hygiene: `git diff --check` passed.

## Calibration

No simulation logic, scenario data, save schema, baseline manifest, golden artifacts, or packaging outputs changed. This is UI/read-model presentation hardening only.
