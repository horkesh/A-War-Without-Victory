# v0.9.1 Dynamic Endgame Milestone Closure

**Date:** 2026-05-10

**Status:** Agent-closed for v0.9.1 scope

**Lane:** v0.9.1 Dynamic Essay + Endgame Comparison

## Summary

v0.9.1 is now closed for agent-owned scope. The milestone no longer depends on Ghost Map, Exhaustion Clock, or Letter Home as open work; those are already live inputs. The closed scope is the dynamic Codex/endgame comparison substrate: deterministic dynamic essay sections, ghost entries, Cost Ledger finding and annotation readers, milestone timing readers, one historical baseline artifact, and player-facing endgame comparison surfaces.

## What Landed

- `data/reference/historical_baseline.json` is the single authoritative comparison baseline for duration, territory, casualties, displacement, Srebrenica, and milestone rows.
- `compareToHistorical(...)` emits duration, territory, casualty, displacement, rupture, divergence-note, and milestone-comparison truth from explicit serializable inputs.
- `resolveCodexEssay(...)` renders dynamic insertions without mutating canonical historical essay text.
- The Dynamic Codex catalog now has sixty `v091_` authored dynamic sections, including Cost Ledger findings, faction-scoped war-crimes findings, annotation readers, and milestone timing readers.
- `essay_dayton_signed_1995` now has a final human-cost docket reader (`v091_dayton_human_cost_docket`) gated by `FINDING_CATEGORY:human_cost`.

## Verification Contract

Added `tests/v091_endgame_milestone_closure.test.ts`, covering:

- historical baseline artifact shape and source ownership;
- comparison category output from explicit ledger + baseline inputs;
- immutable base essay text during dynamic rendering;
- authored `v091_` breadth floor and atom-family coverage;
- plan and master-roadmap closed-state truth.

## Canon Posture

This is Ring 2 narrative/reflection work. It changes no event trigger, rupture rule, Cost Ledger producer, scoring rule, save schema, scenario data, OOB data, political-controller data, casualty/displacement math, or sensitive-history adjudication. It only consumes already-emitted endgame facts and renders them through existing Codex/endgame surfaces.

## Follow-Up Boundary

Future work should be treated as v1.x content polish or new comparison categories, not ordinary v0.9.1 closure debt. New dynamic sections should continue the established rule: only consume real Cost Ledger, annotation, milestone, or comparison truth already emitted by the endgame packet.
