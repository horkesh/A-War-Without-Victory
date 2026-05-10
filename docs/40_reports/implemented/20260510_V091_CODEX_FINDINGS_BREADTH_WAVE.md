# v0.9.1 Codex Findings Breadth Wave

**Date:** 2026-05-10
**Status:** Implemented
**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

Expanded authored Dynamic Codex coverage beyond Srebrenica and Dayton by wiring two more essays to existing Cost Ledger finding atoms and interpolation tokens.

## Added Sections

- `essay_ahmici_massacre_1993`
  - Section: `v091_ahmici_war_crimes_findings`
  - Gate: `GAME_OVER AND FINDING_CATEGORY:war_crimes AND FINDING_FACTION:HRHB`
  - Content: `{cost_war_crimes_findings}` plus source list

- `essay_operation_storm_1995`
  - Section: `v091_operation_storm_displacement_findings`
  - Gate: `GAME_OVER AND FINDING_CATEGORY:displacement`
  - Content: `{cost_displacement_findings}` plus source list

## Verification

- Red: `npx.cmd vitest run tests/ui/codex_essay_vocab_integration.test.ts --reporter=dot` failed on the missing sections and render paths.
- Green: the same suite passed 20/20 after authoring.

## Canon And Sensitive History

Ring 2 narrative reflection only. This does not change event triggers, rupture rules, scoring, baseline rows, or player levers. The inserts render source-labeled Cost Ledger findings generated elsewhere, preserving the existing sensitive-history register: record and contextualize, do not celebrate or minimize.

## Next Authoring Candidates

Use the same pattern for other historical essays only when an existing endgame packet emits real truth for that topic. Good candidates are late-war Sarajevo, Zepa, Federation offensive, and ceasefire essays once their matching findings or milestone rows exist.
