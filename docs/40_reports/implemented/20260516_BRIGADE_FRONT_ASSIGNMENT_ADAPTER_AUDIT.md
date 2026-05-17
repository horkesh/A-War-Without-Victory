# Brigade Front Assignment Adapter Audit - n1842 H2

**Date:** 2026-05-16
**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1842/`
**Source track:** `docs/plans/2026-05-16-engine-health-n1842-plan.md` H2
**Status:** CLOSED - REPORT-ONLY

## Verdict

`military.brigade_front_assignment` is empty by design in n1842. It is a legacy compatibility field, not a live runtime authority and not a tactical-map adapter contract. Do not restore a producer.

The live authority is `military.corps_front_sectors`, specifically:

- `assigned_brigade_ids` for frontline duty.
- `reserve_brigade_ids` for sector reserves.
- `rear_brigade_ids` for rear sector ownership.
- `sub_segments[].primary_brigade_ids` for canonical sub-segment assignment exposed through the UI adapter.

## Evidence

Final save inspection:

- `military.brigade_front_assignment` entries: `0`.
- `military.corps_front_sectors` entries: `71`.
- n1842 audit already counted `202 / 218` active brigades in sector front/reserve lists before considering rear sector lists.

Code inspection:

- `src/state/game_state.ts` documents `brigade_front_assignment` as `COMPATIBILITY-ONLY`, not written by live runtime code, retained for old saves/tests only, and says to use `corps_front_sectors` for frontline truth.
- `src/sim/combat/front_assignment.ts` derives `buildFrontlineAssignedFormationSet(...)` only from `state.military.corps_front_sectors[*].assigned_brigade_ids`.
- `src/sim/turn_phases/war_phases.ts` explicitly leaves `brigade_front_assignment` as compatibility fallback after building `corps_front_sectors`.
- `src/ui/map/data/GameStateAdapter.ts` builds formation sub-segment truth from `corps_front_sectors[*].sub_segments[*].primary_brigade_ids` and separately projects `corps_front_sectors` into the tactical UI DTO.
- Existing regression coverage (`tests/sector_frontline_truth.test.ts`, `tests/front_assignment.test.ts`, `tests/engine_honesty_legacy_contracts.test.ts`) locks the no-live-writer / compatibility-only contract.

Prior implemented reports agree with this classification:

- `docs/40_reports/implemented/20260403_FRONTLINE_AUTHORITY_AND_PLAYER_SHELL_INTEL_REDUCTION.md`
- `docs/40_reports/implemented/20260404_COMMAND_CHAIN_TRUTH_WAVE1.md`

## Classification

H2 is not a regression. It is a stale-audit suspicion caused by checking the compatibility field rather than the live sector-owner structure.

The remaining stale wording is documentation drift only. `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` may still contain older front-assignment phrasing; that can be cleaned separately. It should not be used as a reason to reintroduce a `brigade_front_assignment` writer.

## Decision

- No code change.
- No save schema removal in this track; keeping the field preserves backward compatibility and test contracts.
- No n1843 rerun needed for this classification.
- Update the n1842 plan and audit to mark H2 closed/report-only.

