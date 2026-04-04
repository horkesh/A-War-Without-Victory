# Consolidated Lane Summary: Command Chain Truth + Sector Frontline Hardening

**Date:** 2026-04-04
**Lane status:** CLOSED. Four waves delivered. 29 regression tests lock invariants.
**Waves:** 4 micro-reports on 2026-04-04

---

## Problem Statement

Sector frontline truth had fragile proxy paths, stale formation fields, and unobservable forks. Specific issues: Phase 1.5 territory assignment lacked front-adjacency checks; `assertBrigadeReachability` returned void (logged but took no action); demoted brigades retained stale `assigned_sub_segment_id`; the GameStateAdapter read formation fields instead of canonical sector truth; the displacement trigger fork between sector-edge and political-controllers paths was silent; threat severity vocabulary collided with brigade formation status terminology.

---

## What Landed

### Wave 1 — Engine Hardening (B1-B4)

- **B1:** Phase 1.5 territory assignment in `brigade_assignment.ts` now checks front-adjacency before assigning.
- **B2:** `assertBrigadeReachability` returns actionable unreachable IDs; `corps_front_sectors.ts` caller uses return value to demote brigades.
- **B3:** Dead-writer compatibility field `brigade_front_assignment` documented (serialize.ts + _archived only).
- **B4:** `ensureMinimumSectorCoverage` hop ceiling documented as intentional behavior.
- 9 regression tests in `sector_frontline_truth_wave2.test.ts`.

### Wave 2 — Sub-Segment Assignment Truth

- **GAP 1:** Demoted brigades now have `assigned_sub_segment_id` cleared to `undefined` in the demotion loop (was stale after demotion).
- **GAP 2:** GameStateAdapter builds a canonical reverse map (`brigadeId -> sub_segment_id`) from `corps_front_sectors[*].sub_segments[*].primary_brigade_ids` before the formations loop. Adapter reads canonical sector truth first, falls back to formation field only when brigade is absent from all sub-segments.
- 6 regression tests in `sector_frontline_truth_wave2.test.ts`.

### Wave 3 — Activity/Reporting Truth Alignment

- **Displacement trigger fork observable:** `displacement_triggers.ts` now emits a diagnostic marker (`displacement_trigger_path: 'proxy'`) when the proxy path fires instead of the canonical sector-edge path. Silent fork eliminated.
- **Threat severity vocabulary:** `generateThreatAssessment.ts` renamed `'active'` severity to `'engaged'` to avoid collision with brigade formation status terminology. `ThreatAssessment.tsx` updated.
- 3 regression tests in `sector_frontline_truth_wave3.test.ts`.

### Wave 4 — Regression Gates Expansion + Lane Closure

- 7 gap-filler regression tests in `sector_frontline_truth_wave4.test.ts`:
  - Topology stress: disconnected-component brigades flagged as unreachable, same-component brigades clean.
  - Adapter re-assignment fidelity: canonical reverse map wins over stale formation field across turns.
  - Activity summary correctness: displacement trigger path marker present when proxy fires.
- Canon and roadmap docs updated. Lane declared CLOSED.

---

## Canonical Owner

`src/sim/combat/corps_front_sectors.ts` is the single source of truth for sector frontline data. All downstream consumers (adapter, displacement triggers, threat assessment) derive from its output rather than maintaining parallel state.

| Consumer | File | Derivation |
|----------|------|-----------|
| Adapter sub-segment map | `GameStateAdapter.ts` | Reverse map from `sub_segments[*].primary_brigade_ids` |
| Displacement triggers | `displacement_triggers.ts` | `getSectorOwnedEligiblePressureEdges()` (canonical path) |
| Threat assessment | `generateThreatAssessment.ts` | Sector edge counts for activity classification |
| Reachability assertion | `sector_assertions.ts` | BFS from sector component; returns unreachable IDs |

---

## Test Coverage

29 regression tests across 4 wave files:
- `tests/sector_frontline_truth_wave2.test.ts` — 15 tests (Waves 1-2)
- `tests/sector_frontline_truth_wave3.test.ts` — 3 tests (Wave 3)
- `tests/sector_frontline_truth_wave4.test.ts` — 7 tests (Wave 4)
- Plus 4 displacement double-count invariant tests added in Wave 1

---

## Underlying Micro-Reports

| Date | Report |
|------|--------|
| 2026-04-04 | `20260404_COMMAND_CHAIN_TRUTH_WAVE1.md` |
| 2026-04-04 | `20260404_COMMAND_CHAIN_TRUTH_WAVE2.md` |
| 2026-04-04 | `20260404_COMMAND_CHAIN_TRUTH_WAVE3.md` |
| 2026-04-04 | `20260404_COMMAND_CHAIN_TRUTH_WAVE4.md` |
