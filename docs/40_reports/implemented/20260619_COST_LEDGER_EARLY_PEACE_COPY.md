# Cost Ledger Early-Peace Copy

Date: 2026-06-19
Branch: `codex/chronicle-chapter-calendar-copy`

## Summary

Closed the Cost Ledger / Codex raw-copy path where accepted early-peace findings rendered raw plan ids and week labels, for example `peace plan vance_owen at week 50`.

Changes:

- `buildCostLedger(...)` now resolves `early_peace_implemented` ids through the peace-plan catalog.
- Accepted early-peace findings now render the plan name and calendar date, for example `Vance-Owen Peace Plan on 22 Mar 1993`.
- Unknown plan ids fall back to neutral copy (`a negotiated peace plan`) instead of exposing the id.
- The Codex dynamic essay resolver sanitizes legacy/raw Cost Ledger finding text at the display boundary, so older packets do not leak raw plan ids or week labels into essay prose.

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\ui\codex_essay_resolver.test.ts tests\ui\codex_essay_vocab_integration.test.ts tests\peace_plans_war_ended_early_producer.test.ts --reporter=dot` passed 93/93.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run test:baselines` passed with `Baseline regression: all scenarios match.`

## Scope

Player-facing endgame/Codex copy and focused tests only. No scenario logic, peace-plan resolution behavior, save schema, randomness, timestamps, generated artifacts, calibration floor, structural fingerprint, golden manifests, or packaged installer artifact changed. Any non-baselined artifact that serializes accepted early-peace Cost Ledger finding text will show a copy-only string change from raw id/week to plan-label/date; ordering, numeric values, and game-state truth fields are unchanged.
