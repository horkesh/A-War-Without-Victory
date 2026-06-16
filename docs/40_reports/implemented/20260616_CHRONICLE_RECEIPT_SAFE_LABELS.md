# Chronicle and Receipt Safe Labels

**Date:** 2026-06-16  
**Type:** Chronicle/receipt read-model player-facing copy hardening  
**Scope:** consequence receipts, Chronicle Wrapped causality slides

## Summary

This slice closes two raw-id leak findings from the Pyrrhic player-polish sweep:

- Consequence receipts could fall back from missing event/response/consequence labels to raw ids such as `evt_*`, response slugs, or `csq_*`.
- Chronicle Wrapped divergence bullets printed raw `chosen_option` and `historical_default` ids.

`consequenceReceipts.ts` now resolves event titles, response labels, and predicted consequence labels through authored catalog text first. When authored text is absent, it uses the shared player-safe display-label humanizer rather than printing raw ids. The raw event/response/consequence identifiers remain preserved in receipt ids and internal fields.

`generateWrappedSlides.ts` now resolves divergence bullets through event titles and response-option labels, with player-safe fallback copy. The wrapped slide data still preserves raw divergence ids for diagnostics and replay consistency.

## Files

- `src/ui/map/data/consequenceReceipts.ts`
- `src/ui/map/components/chronicle/generateWrappedSlides.ts`
- `tests/ui/consequence_receipts.test.ts`
- `tests/ui/chronicle_causality_slides.test.ts`

## Verification

- Red proof first: focused tests failed while consequence receipts and Chronicle Wrapped bullets displayed raw event, response, and consequence ids.
- Green proof: `npx.cmd vitest run tests\ui\consequence_receipts.test.ts tests\ui\chronicle_causality_slides.test.ts --pool=forks --reporter=dot` -> 2 files / 21 tests passed.
- Combined raw-copy pack: `npx.cmd vitest run tests\ui\distance_from_history.test.ts tests\ui\dilemma_spine.test.ts tests\ui\consequence_receipts.test.ts tests\ui\chronicle_causality_slides.test.ts --pool=forks --reporter=dot` -> 4 files / 38 tests passed.
- TypeScript: `npm.cmd run typecheck` passed.
- Hygiene: `git diff --check` passed.

## Calibration

No simulation logic, scenario data, save schema, baseline manifest, golden artifacts, or packaging outputs changed. This is UI/read-model presentation hardening only.
