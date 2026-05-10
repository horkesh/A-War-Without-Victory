# Consequence Reader Annotation Bridge

**Date:** 2026-05-10  
**Lane:** v0.9.0 Consequence System reader follow-up + v0.9.1 Dynamic Codex follow-through  
**Type:** Reader-only event annotation and Codex rendering bridge

## Summary

Consequence Wave 19 adds audit-only Cost Ledger annotations to six existing divergence consequences:

- `csq_accelerated_camps_discovery_1992`
- `csq_early_war_crimes_tribunal_1993`
- `csq_accelerated_safe_areas_1993`
- `csq_early_nato_threshold_1994`
- `csq_bihac_pocket_collapses_1994`
- `csq_bihac_refugee_crisis_1994`

The Codex resolver now supports `ANNOTATION:<tag>` conditions plus `{cost_annotations}` and `{cost_annotation_<tag>}` interpolation tokens. Six historical essays consume those annotations: Prijedor camps, UN Resolution 808, UN Safe Areas, NATO air-strike threat, and Bihac crisis.

## Canon / Determinism

This lane is Ring 2 reflection. It does not add event families, new predicates, new score inputs, sensitive-history rupture wiring, or player command levers. The annotations are emitted by existing consequence events, sorted by `buildCostLedger`, and read by Codex rendering only.

## Verification

- Red first: resolver annotation tests failed on missing `ANNOTATION` atoms/tokens.
- Red first: Wave 19 test failed on missing consequence annotation effects.
- Red first: essay vocab integration failed on missing annotation-gated dynamic sections.
- Green focused suite: `cmd /c npx vitest run tests/ui/codex_essay_vocab_integration.test.ts tests/ui/codex_essay_resolver.test.ts tests/divergence_events_wave_19_reader_annotations.test.ts` passed 81/81.

## Follow-Up

Next consequence work should remain packet-driven: add more annotation readers only where an existing consequence event already emits a real audit fact, or move to a separate roadmap lane. Do not reopen broad substrate inventory without new evidence.
