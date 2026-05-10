# Dynamic Codex Late-War Memory Breadth

**Date:** 2026-05-10
**Lane:** v0.9.1 Dynamic Essay Content + Endgame Comparison
**Status:** Implemented

## Summary

Added a fourth authored Dynamic Codex breadth wave that lets existing endgame Cost Ledger packets speak inside three more historical essays:

- `essay_tuzla_gate_massacre_1995` consumes `human_cost_record` when the campaign ends above the historical casualty threshold.
- `essay_second_markale_massacre_1995` consumes `human_cost_record` under the same endgame casualty threshold.
- `essay_stupni_do_massacre_1993` consumes `war_crimes_record_HRHB`.

The lane is declarative content only. It uses existing `dynamic_sections`, resolver condition atoms, and Cost Ledger tokens; no new game-state writer, event condition, simulation rule, or endgame scoring logic was introduced.

## Files

- `data/scenarios/essays/essay_index.json`
- `tests/ui/codex_essay_vocab_integration.test.ts`
- `docs/10_canon/Game_Bible_v0_9_0.md`
- `docs/plans/MASTER_ROADMAP.md`

## Verification

Red-first proof:

- `npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` failed on the three missing dynamic sections and their rendered paragraphs.

Green proof:

- `npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` passed 30/30 after the declarative essay additions.

## Determinism And Canon

This is Ring 2 narrative reflection. It reads already-built `CostLedger` findings and optional historical comparison ratios at endgame render time. It does not affect turn advancement, operations, control, casualty calculation, displacement, rupture firing, victory, or saved simulation output.

The inserts inherit the Cost Ledger wording constraints: historical recording, source-labeled findings, and no celebratory or minimizing counterfactual voice.
