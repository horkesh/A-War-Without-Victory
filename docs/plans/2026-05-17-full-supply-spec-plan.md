# Full Supply Spec Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate supply truth so code and docs share one vocabulary for reachability, reserves, corridors, enclaves, and live supply condition.

**Architecture:** Document current supply model first, then add terminology guards and focused tests for any ambiguity discovered.

**Tech Stack:** Markdown spec, TypeScript supply state tests, canon check.

---

## Files

- `docs/30_planning/SUPPLY_DESIGN.md`
- `docs/plans/_completed/2026-03-03-supply-phase-d-plan.md`
- `src/state/supply_state_derivation.ts`
- `src/state/supply_reserves.ts`
- `src/sim/combat/supply_condition.ts`
- `tests/combat_supply_pressure.test.ts`
- `tests/supply_state_derivation_cache.test.ts`
- `tests/supply_reachability_osid.test.ts`

## Implementation Tasks

1. Define reachability and OSID trace vocabulary.
2. Define corridor states: open, brittle, cut, and enclave-specific behavior.
3. Define OSID supply condition: adequate, strained, critical.
4. Define reserves, patron aid, convoys, airdrops, and embargo limits.
5. Explicitly distinguish live `war_supply_condition` from legacy cumulative `war_supply_pressure`.
6. Add static/docs terminology tests if available; otherwise add code-reference anchors inside the spec.
7. Wire roadmap/backlog and ledger.

## Verification

- `npx.cmd vitest run tests/combat_supply_pressure.test.ts tests/supply_state_derivation_cache.test.ts tests/supply_reachability_osid.test.ts`
- `npm.cmd run typecheck`
- `npm.cmd run canon:check`

## Documentation And Ledger

- Update `docs/30_planning/SUPPLY_DESIGN.md`.
- Update roadmap/backlog references.
- Add `docs/PROJECT_LEDGER.md` docs/contract entry.

## Stop Gates

- Stop if the spec treats high `war_supply_pressure` as good.
- Stop if the spec contradicts current code without opening a separate implementation plan.
