# v0.9.1 Codex Late-War Findings Breadth

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

Added a second authored Dynamic Codex findings-breadth wave using only existing Cost Ledger atoms and interpolation tokens.

## Added Sections

- `essay_zepa_falls_1995`
  - Section: `v091_zepa_rupture_finding`
  - Gate: `GAME_OVER AND FINDING:rupture_zepa_falls_1995`
  - Content: `{cost_rupture_findings}` plus source list

- `essay_federation_ground_offensive_1995`
  - Section: `v091_federation_offensive_human_cost_findings`
  - Gate: `GAME_OVER AND FINDING_CATEGORY:human_cost`
  - Content: `{cost_human_findings}` plus source list

## Verification

- Red: `npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` failed on missing sections and render paths.
- Green: the same suite passed 24/24 after authoring.

## Canon And Sensitive History

Ring 2 narrative reflection only. This does not change events, ruptures, scoring, baselines, or player levers. These sections surface source-labeled Cost Ledger findings produced by the endgame packet.
