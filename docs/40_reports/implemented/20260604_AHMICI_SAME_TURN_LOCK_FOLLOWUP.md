# Ahmici Same-Turn Lock Follow-Up

Date: 2026-06-04

## Summary

Closed the remaining Codex review finding on PR #176. `csq_hvo_central_bosnia_offensive_1993` now shares a same-turn mutex group with the counterfactual `csq_alliance_holds_past_w35` alt-path, preventing the rupture event and the "alliance held" recovery floor from firing together. `updateAllianceValue(...)` also honors active `alliance_locks`, so per-turn appeasement cannot lift a locked alliance value past an authored floor or ceiling.

## Scope

- Event data: add `mutex_group: "rbih_hrhb_rupture_window"` to the Ahmici rupture and alliance-held alternatives.
- Engine: apply active alliance bounds during `updateAllianceValue(...)` using the same ceiling/floor semantics as event `alliance_change`.
- Test: extend the Ahmici consequence-chain regression to prove the alt-path is suppressed and same-turn alliance update leaves RBiH-HRHB combat enabled.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\consequence_chains.test.ts --reporter=dot` passed 51/51.
- `node node_modules\vitest\vitest.mjs run tests\consequence_chains.test.ts tests\consequence_consumers.test.ts tests\consequence_effects.test.ts tests\event_effects.test.ts tests\alliance_lifecycle.test.ts tests\alliance_mobilization.test.ts --reporter=dot` passed 153/153.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run test:baselines` passed with all scenarios matching.
- `git diff --check` passed.

## Notes

No sensitive-history prose, player choices, scoring, save schema, UI, or scenario structure changed. This is event-state and alliance-lock correctness only.
