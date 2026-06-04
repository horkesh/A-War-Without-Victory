# Washington Essay Duplicate Cleanup

**Date:** 2026-06-04

**Lane:** Branch/CI/review hygiene / Codex review residue.

## Summary

Removed the stale unindexed `data/scenarios/essays/washington_agreement_1994.json` duplicate. The canonical indexed backing file is `data/scenarios/essays/hrhb_washington_agreement_1994.json`, matching `essay_index.json`'s `event_id: "hrhb_washington_agreement_1994"` row.

This closes the historical Codex review finding from PR #44 where two on-disk essay files carried the same `id` and `event_id`. Runtime Codex loading remains unchanged because the app reads `essay_index.json`, not arbitrary per-essay deposit files.

## Contract

`tests/essay_index_integrity.test.ts` now rejects duplicate on-disk essay `id` values and duplicate on-disk essay `event_id` values across authoring files.

## Evidence

Red proof: `node node_modules\vitest\vitest.mjs run tests\essay_index_integrity.test.ts --reporter=dot` failed after adding the uniqueness guard because both Washington essay files used `essay_washington_agreement_1994`.

Green proof:

- `node node_modules\vitest\vitest.mjs run tests\essay_index_integrity.test.ts --reporter=dot`
- `git diff --check`

## Follow-Up

If a future RBiH-side Washington essay is needed, author it as a distinct `id`, distinct `event_id`, and explicit index row rather than reusing the HRHB-backed essay metadata.
