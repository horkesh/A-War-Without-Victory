# Dynamic Codex Founding Constraint Readers

**Date:** 2026-05-10
**Commit:** this commit
**Milestone:** v0.9.1 Dynamic Essay + Endgame Comparison
**Ring:** Ring 2 narrative reflection

## Summary

The Dynamic Codex now supports faction-scoped war-crimes Cost Ledger tokens and uses them in another authored reader wave. This prevents faction-specific essays from pulling every war-crimes finding and adds four more endgame-aware historical readers: RS strategic goals, Herceg-Bosna political project, the arms embargo, and Operation Corridor.

## Implementation

- Added `{cost_war_crimes_findings_<faction>}` support in `codexEssayResolver`.
- Switched existing faction-specific war-crimes consumers to scoped tokens where appropriate.
- Added dynamic sections for `essay_rs_strategic_goals`, `essay_hrhb_political_goal`, `essay_arms_embargo_impact_1992`, and `essay_operation_corridor_1992`.
- Extended resolver and essay-vocabulary integration tests for scoped token rendering and the new authored sections.

## Canon Posture

This is reader-only narrative reflection over existing Cost Ledger findings. It changes no Cost Ledger producers, casualty/displacement math, event triggers, save schema, scenario data, scoring, rupture handling, or sensitive-history adjudication. Historical essays keep their canonical base text; dynamic inserts are deterministic endgame annotations.

## Verification

- Red first: `npx.cmd vitest run tests/ui/codex_essay_resolver.test.ts tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` failed 4/69 on missing scoped token/sections.
- Green focused: the same command passed 69/69 after implementation.
