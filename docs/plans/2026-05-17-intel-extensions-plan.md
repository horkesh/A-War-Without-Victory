# Intel Extensions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend sector intel into deterministic per-OSID, source-aware execution friction: confidence, stale-intel penalty, patrol/scout sources, and ambush/surprise risk.

**Architecture:** Keep truth hidden; enrich `SectorIntelRecord` and commander belief/preparation with confidence-bounded estimates.

**Tech Stack:** TypeScript state, sector intel derivation, commander belief layer, operation execution, Vitest.

---

## Files

- `src/state/game_state.ts`
- `src/sim/combat/sector_intel.ts`
- `src/sim/combat/sector_intel_constants.ts`
- `src/sim/combat/commander/belief.ts`
- `src/sim/combat/commander/briefing.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `src/sim/combat/sector_offensive.ts`
- `tests/sector_intel.test.ts`
- `tests/commander/commander_belief_layer.test.ts`

## Implementation Tasks

1. Add failing fixtures for `SectorIntelRecord.osid_confidence` sorted by OSID.
2. Add tests for deterministic source blending: passive contact, patrol, scout, combat.
3. Add stale-intel tests proving launch/execution confidence drops after N turns without mutating raw truth.
4. Add surprise/ambush tests proving outcomes derive from intel gap and opsec, not randomness.
5. Extend state shape with JSON-safe optional `osid_confidence` and `sources` arrays.
6. Feed per-OSID confidence into commander beliefs and operation preparation estimates.
7. Apply stale-intel and surprise modifiers in launch/execution as readiness/friction, not omniscient truth changes.

**2026-05-18 progress:** Tasks 1-3 and 5-6 are live through Batches 10-13. Batch 15 implements the first bounded Task 4/7 surprise slice: low-confidence attacks into OPSEC-defended sectors apply deterministic attacker casualty friction and emit only the public `ambush_risk` label. Batch 16 extends that same bounded hook with a small defender-casualty reduction, still keyed only on attacker-side observed confidence plus defender OPSEC. Batch 17 makes that ambush casualty friction proportional to the observed confidence gap inside the existing bounds, so weaker source confidence has stronger deterministic effect without adding randomness, hidden-truth exposure, or schema fields. Broader surprise/ambush modeling remains follow-up and must keep the same no-random/no-hidden-truth boundary.

## Verification

- `npx.cmd vitest run tests/sector_intel.test.ts tests/commander/commander_belief_layer.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run test:baselines`

## Documentation And Ledger

- Update `docs/20_engineering/REPO_MAP.md`.
- Update `docs/20_engineering/PLAYER_VISIBLE_STATE.md` if any UI-visible intel fields change.
- Update `docs/10_canon/Engine_Invariants_v0_9_0.md` only if canon behavior changes.
- Add `docs/PROJECT_LEDGER.md` behavior/schema entry.

## Stop Gates

- Stop if ambush/surprise requires randomness.
- Stop if player-facing UI exposes hidden enemy truth instead of confidence-bounded intel.
