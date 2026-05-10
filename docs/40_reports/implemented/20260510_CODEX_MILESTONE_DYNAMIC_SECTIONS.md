# Codex Milestone Dynamic Sections

**Date:** 2026-05-10  
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison  
**Scope:** Dynamic Codex vocabulary + authored sections

## Summary

The Dynamic Codex can now consume `historicalComparison.milestone_comparison` directly. This lets historical essays react to the same milestone rows rendered by `VerdictScreen` without inventing another comparison packet.

## Implementation

- Added `MILESTONE:<id>` and `MILESTONE:<id>:<status>` condition atoms.
- Added `{milestone_comparison}` plus single-row `{milestone_<id>_summary}`, `{milestone_<id>_status}`, and `{milestone_<id>_delta_weeks}` tokens.
- Added a Srebrenica ghost dynamic section gated on `MILESTONE:srebrenica_genocide_1995:absent`.
- Added a Dayton milestone timing docket gated on `MILESTONE:dayton_accords`.

## Tests

Red-first coverage:

- `tests/ui/codex_essay_resolver.test.ts` failed on missing milestone atoms/tokens.
- `tests/ui/codex_essay_vocab_integration.test.ts` failed on missing authored sections.

Focused green suite passed 48/48.

## Canon Posture

Ring 2 narrative reflection only. Codex reads already-emitted endgame milestone rows; it does not compute rupture truth, compare maps, score outcomes, or create player levers.
