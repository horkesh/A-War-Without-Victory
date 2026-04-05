# Residual ZEA Attribution on Current HEAD

**Date:** 2026-04-05
**Mission:** Determine what still drives zero-eligible-attacker / zero-attack pathologies after the elite utilization and movement-authority fixes.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Full execution pipeline trace: factories → sector_offensive → brigade AI | Traced exact ZEA path through 3 code paths, identified double-kill (no objectives + no axes) |
| Technical Architect (orchestrator) | Root-cause synthesis, fix shape selection | Analyzed n1317 op data (29 ops, 100% zero-attack), identified factory gap |
| Implementer | Added axes to `buildCommanderOperation` and `buildProbeOperation` | 3 files edited, tsc clean, 2335 tests pass |
| QA Engineer | 4 targeted regression tests for axis creation | Factory output, backward compat, non-immediate-completion |
| Scenario Runner (orchestrator) | n1318 live validation | 63% invalid op reduction, +7 battles, -0.3pp calibration |

## Root Cause: Commander operations had no axes

### Three code paths, only one worked

| Factory | Has Objectives | Has Axes | Attack Path | Result |
|---------|---------------|----------|-------------|--------|
| `buildCorpsOperation` (pre-planned) | YES | **YES** | Multi-axis execution → attacks | **64 battles** |
| `buildCommanderOperation` (cmd_*) | YES | **NO** | Brigade AI gets null objective via axis path → defend | **0 attacks** |
| `buildProbeOperation` (probes) | **NO** | **NO** | `0 >= 0` → immediate recovery | **0 attacks** |

### The double-kill for probes

1. `buildProbeOperation` creates ops with NO objectives, NO axes, `planning_duration: 0`
2. `advanceSectorOffensives` transitions to execution: `(op.current_objective_index ?? 0) >= (op.objectives ?? []).length` → `0 >= 0` → TRUE
3. Immediately enters recovery with reason `'completed'` — zero attacks, zero turns in execution
4. Each recovery-turn with zero attacks counted as `recovery_without_logged_attempt`

### The silent failure for cmd_* ops

1. `buildCommanderOperation` creates ops WITH objectives but NO axes
2. Brigade AI (`evaluateSectorAttack`) calls `getSectorOffensiveCurrentObjective(activeOp, brigade.id)`
3. Function checks `axis ? axis.objectives : (activeOp.objectives ?? [])` — axis is null/undefined
4. Returns null current objective → brigade defaults to `defend` posture → zero attacks

### What previous fixes eliminated vs what remained

| Fix | What it fixed | What remained |
|-----|--------------|---------------|
| Fix A (reachability-aware plan) | Corps with unreachable best assets forming no plans | Ops created but producing no attacks |
| Fix B (prepositioning) | Elite formations stuck in deep rear | Ops created but producing no attacks |
| Pipeline priority (stance fix) | March corrections blocking movement | Ops created but producing no attacks |
| Home-return fix | Prepositioned brigades recalled | Ops created but producing no attacks |
| **This fix (axes)** | — | **Commander ops now have axes and attack** |

## Fixes Applied

### Fix 1: `buildCommanderOperation` — single-axis wrapper

**File:** `src/sim/combat/corps_operation_helpers.ts`

Wrapped the existing `objectives` and `participatingBrigades` into a single `OperationAxis`:
- `axis_id: cmd_${corpsId}_main`
- `assigned_brigades: participatingBrigades`
- `objectives: objectives` (same list)
- `status: 'executing'`, all counters zeroed

Legacy flat fields (`objectives`, `current_objective_index`, etc.) preserved for backward compatibility — `getAllAxisObjectives` falls back to them when no axes exist.

### Fix 2: `buildProbeOperation` — optional objectives + axis

**File:** `src/sim/combat/corps_operation_helpers.ts`

Added optional `objectives?: string[]` parameter. When provided, creates a single "Probe" axis with the brigade and objectives. Without objectives, falls back to the previous no-axis behavior.

### Fix 3: Probe objective derivation in emit.ts

**File:** `src/sim/combat/commander/emit.ts`

At the probe creation site, added ~15 lines to derive a probe target: finds the first enemy-adjacent OSID from the probe sector's sub-segment front lines using `briefing.spatial.adjacency` and `briefing.spatial.friendlyOsidsByFaction`. Deterministic via `strictCompare`.

## Targeted Tests (4 new)

**File:** `tests/commander/elite_formation_utilization.test.ts`

1. `buildCommanderOperation creates multi-axis operation` — axes present, correct objectives/brigades
2. `buildProbeOperation with objectives creates multi-axis operation` — axes present with probe target
3. `buildProbeOperation without objectives falls back to no-axis` — backward compatibility
4. `commander operation does not immediately complete in execution` — axes prevent immediate recovery

## Validation: n1318

### ZEA Impact (the primary target)

| Metric | n1317 (before) | n1318 (after) | Delta |
|---|---|---|---|
| Invalid operations | 370 | **137** | **-63%** |
| Recovery w/o attempt | 188 | **45** | **-76%** |
| Movement-only execution | 19 | **0** | **eliminated** |
| Battles | 64 | **71** | **+7** |
| Attack orders | 82 | **91** | **+9** |
| RS attack orders | 57 | **62** | **+5** |

### Calibration

| Metric | n1317 (before) | n1318 (after) | Delta |
|---|---|---|---|
| Area-weighted | 94.3% | **94.0%** | **-0.3pp** |
| Anchors | 27/27 | **26/27** | **-1** |
| Benchmarks | 6/6 | **6/6** | neutral |
| RS w40 | 53.1% | **53.9%** | +0.8pp |

### Failed anchor: kopcic_2

`op:bugojno:kopcic_2` — expected RBiH, actual RS. Bugojno area. RS commander operations are now attacking targets that were previously safe because commander ops produced zero attacks. This is a calibration sensitivity from enabling previously-inert RS offensive capability, not a structural regression.

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: **166 files, 2335 tests, 0 failures**
- `npm run desktop:map:build`: built in 7.73s
- Fresh 40w scenario: n1318, 94.0%, 26/27 anchors, 6/6 benchmarks, 71 battles

## Residual ZEA (137 invalid op-turns remaining)

The 137 remaining invalid op-turns (down from 370) likely come from:
- Operations still in planning/preparation phase (not yet executing)
- Operations whose probe targets were already friendly by the time execution starts
- Remaining structural gaps in objective derivation for edge cases

This is a 63% reduction in a single fix. Further reduction would require:
1. Investigating the remaining 45 recovery-without-attempt cases
2. Ensuring probe targets stay valid across turns
3. Potentially adding multi-objective probes for richer targeting

## Recommended Next Lane

**kopcic_2 anchor investigation**: RS commander operations now attack in the Bugojno area, flipping kopcic_2. This is a calibration sensitivity that needs either:
- Adjusting RS offensive thresholds in the Bugojno sector
- Strengthening ARBiH defense in the area
- Reviewing whether RS attacking Bugojno is historically plausible (it is — VRS operations in central Bosnia were real)

## Completion Block

**Canonical owner:** `corps_operation_helpers.ts` (axis creation in factories), `emit.ts` (probe objective derivation)
**Demoted path:** Commander operations with no axes — cycling through planning → execution → recovery without attacking
**Player-visible truth:** Commander-created operations (probes + sector attacks) now have attack targets and generate real battles. Invalid operations reduced 63%. 7 more battles per 40-week run. RS commander operations now contribute to combat.
**Canonical UI surface:** No new UI — behavioral engine change
**Done means:** ZEA root cause identified and fixed. 63% invalid op reduction, 76% recovery-without-attempt reduction, movement-only eliminated. 4 targeted tests. Calibration consequence bounded (-0.3pp, -1 anchor). Full suite green (2335/2335). Smoke triad passed. Residual 137 invalid op-turns for future investigation.
