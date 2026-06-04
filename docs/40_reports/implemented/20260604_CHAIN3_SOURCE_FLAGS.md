# Chain 3 Source Flag Alignment

Date: 2026-06-04
Branch: `codex/issue-170-chain3-flags`
Type: Event-state correctness fix for GitHub issue #170 P1

## Summary

Chain 3 consequence predicates already used `srebrenica_fell` and `nato_deliberate_force_occurred` to suppress counterfactual Srebrenica-survives / no-Deliberate-Force consequences on the historical path. The historical source events did not write those flags, so the consumer side was correct but the producer side was incomplete.

`srebrenica_falls_1995` now writes `srebrenica_fell: true`, and `nato_deliberate_force_1995` now writes `nato_deliberate_force_occurred: true`.

## Scope

This is flag plumbing only. It does not add sensitive-history prose, new response options, player choices, scoring, civilian-targeting mechanics, save schema, replay writers, baseline manifests, or combat behavior.

## Verification

- Focused consequence pack: `node node_modules\vitest\vitest.mjs run tests\consequence_chains.test.ts tests\consequence_consumers.test.ts tests\event_effects.test.ts --reporter=dot` passed 86/86.
- Typecheck: `npm.cmd run typecheck -- --pretty false` passed.
- No-update baseline regression: `npm.cmd run test:baselines` passed with all scenarios matching.
- Whitespace check: `git diff --check` passed.

## Issue #170 Status

This closes the Chain 3 missing-flags item. Issue #170 remains open for enclave-resilience denominator decision, same-axis concentration support, Trnovo controlled waypoint preservation, TG anchor-only readiness decision, and HRHB Graz branch coverage.
