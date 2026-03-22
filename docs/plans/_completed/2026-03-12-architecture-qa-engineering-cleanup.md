# Architecture & QA/Engineering Cleanup Plan

**Date:** 2026-03-12
**Owner:** Orchestrator
**Status:** Phases 1-4 COMPLETE. Phase 5 (CI) deferred — needs GitHub Actions confirmation.

## Context

The March 10 Paradox team full evaluation (convene) flagged several architecture and QA/engineering items at P1-P2 priority. These are non-calibration, non-gameplay items that improve structural health without touching combat mechanics or bot AI.

Investigation revealed many originally flagged issues are already resolved or less severe than stated. This plan covers only confirmed actionable items.

---

## Phase 1: Partition Validation Hardening

**Priority:** P1
**Estimated scope:** Small (1 file, ~20 lines)

### Problem

`validateGameStateShape()` in `src/state/validateGameState.ts` validates `meta` shape but does NOT enforce that the three partition roots (`military`, `political`, `displacement`) exist as objects. A malformed save missing `state.military` would pass validation and crash downstream.

### Action

Add to `validateGameStateShape()`:
- Assert `state.military` is a non-null object
- Assert `state.political` is a non-null object
- Assert `state.displacement` is a non-null object (or undefined for pre-displacement saves)
- Assert `state.political.political_controllers` is a non-null object

### Files
- `src/state/validateGameState.ts` — add partition root checks

### Test
- Add test cases in existing validation test file for missing/null partition roots

---

## Phase 2: Phase I/II Terminology Cleanup

**Priority:** P1
**Estimated scope:** Small (3 renames, no logic changes)

### Problem

Three legacy Phase I/II names remain in active code:
1. `PhaseIIFrontStability` type in `src/state/game_state.ts:1310` — used by `front_emergence.ts`
2. `PhaseIIBattleResolutionLike` interface in `src/state/displacement_takeover.ts:111` — used for displacement battle tracking
3. `phase_ii_adjacency.ts` module in `src/sim/combat/` — core adjacency graph builder, imported by 4 files

All are **active, functional code** — just misnamed. No Phase I/II logic exists (phase switch only has `'peace'` and `'war'`).

### Action

1. Rename `PhaseIIFrontStability` → `FrontStability` in `game_state.ts` + `front_emergence.ts`
2. Rename `PhaseIIBattleResolutionLike` → `BattleResolutionLike` in `displacement_takeover.ts`
3. Rename file `phase_ii_adjacency.ts` → `war_adjacency.ts`; update 4 import sites:
   - `src/desktop/desktop_sim.ts`
   - `src/sim/combat/brigade_movement.ts`
   - `src/sim/combat/bot_corps_corridor.ts`
   - `src/sim/combat/brigade_movement_query.ts`

### Constraint
- Pure rename. Zero logic changes. Must pass typecheck + full vitest after.

---

## Phase 3: War-Phase Pipeline Step-Order Test

**Priority:** P2
**Estimated scope:** Small (1 new test file, ~60 lines)

### Problem

`tests/turn_pipeline_order.test.ts` tests legacy phase names (`directives`, `deployments`, etc.) that don't match actual war-phase steps in `src/sim/turn_phases/war_phases.ts`. The 81 named steps in `war_phases.ts` are not tested for ordering invariants.

### Action

New test: `tests/war_phase_step_order.test.ts`
- Import the war-phase step array from `war_phases.ts`
- Assert critical ordering invariants:
  - `partition-corps-front-sectors` before `generate-corps-directives`
  - `generate-corps-directives` before `evaluate-brigade-ai`
  - `evaluate-brigade-ai` before `resolve-attack-orders`
  - `osid-column-movement` before `apply-brigade-movement`
  - `displace-enemy-territory` after `resolve-attack-orders`
  - `update-sector-offensive-results` before `inject-queued-operations`
- Assert total step count is stable (detect accidental additions/removals)
- Assert no duplicate step names

### Files
- `tests/war_phase_step_order.test.ts` (new)

---

## Phase 4: localeCompare → strictCompare in Determinism Guard

**Priority:** P2 (High within P2 — this is in the determinism enforcement tool itself)
**Estimated scope:** Tiny (1 line)

### Problem

`tools/engineering/determinism_guard.ts:63` uses `localeCompare` in `ensureStableSort`. This is the tool that *enforces* determinism — using locale-dependent sorting in the enforcer is self-contradictory.

### Action

Replace `localeCompare` with the same `a < b ? -1 : a > b ? 1 : 0` pattern used by `strictCompare`.

### Note on other localeCompare sites

71 total `localeCompare` instances across tooling/diagnostics. These are NOT in the simulation hot path and produce human-readable output only. Bulk replacement is low-value and risks breaking display-order expectations in diagnostic scripts. Leave them unless a specific tool is shown to affect determinism.

The 2 instances in `src/cli/` (`mapkit_validate.ts`, `phase3abc_audit_harness.ts`) are audit/validation CLI tools, not part of the sim pipeline. Low risk.

---

## Phase 5: CI Workflow (GitHub Actions)

**Priority:** P2
**Estimated scope:** Medium (1 new file, testing iteration)

### Problem

No `.github/workflows/` exists. All QA gating is manual via `npm run qa:all`. No automated check on push or PR.

### Action

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest  # or windows-latest if needed
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run test:vitest
      - run: npm run desktop:map:build
```

### Notes
- Start with typecheck + vitest + map build (fast gate, ~30s)
- Do NOT include `test:baselines` or `test:coverage` initially — too slow for CI
- Node:test suite (`npm test`) has timeout issues — defer to fast gate
- Windows vs Linux: vitest and tsc should be platform-agnostic; map build may need testing

### Open question for user
- Is this repo on GitHub with Actions enabled? Or is this local-only?

---

## Execution Order

| Phase | Depends on | Risk | Time |
|-------|-----------|------|------|
| 1. Partition validation | None | Low | ~15 min |
| 2. Phase I/II rename | None | Low | ~20 min |
| 3. Step-order test | None | Low | ~15 min |
| 4. localeCompare fix | None | Trivial | ~2 min |
| 5. CI workflow | Phases 1-4 (so CI tests pass) | Medium | ~30 min |

Phases 1-4 are independent and can be parallelized. Phase 5 should come last so the CI workflow runs on a clean codebase.

---

## Out of Scope

- **Calibration tuning** — separate workstream
- **HVO passivity / morale / IVP modal** — game mechanics, not architecture
- **Operation Preparation System** — another agent owns this
- **Bulk localeCompare replacement** — low value, high churn
- **Coverage thresholds** — deferred until CI is stable
- **Warroom placeholders** — UI work, separate scope
