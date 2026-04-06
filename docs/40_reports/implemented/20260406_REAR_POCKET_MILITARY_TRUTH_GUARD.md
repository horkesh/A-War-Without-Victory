# Rear-Pocket Military-Truth Guard

Date: 2026-04-06  
Status: ACCEPTED  
Scope: Engine-wide paramilitary rear-pocket classification and capture semantics

## Summary

Sarajevo interior control flips exposed a broader engine flaw: rear-pocket cleanup was using topology as a proxy for military abandonment. A cluster could be classified as an `enemy_pocket` and then silently captured by paramilitaries even when organized defenders still existed inside the cluster or immediately adjacent to it. That path bypassed normal battle and reactive-defense semantics.

The accepted engine invariant is now:

- a cluster is not a rear pocket if any organized brigade exists anywhere inside it
- a rear-pocket paramilitary target is invalid if organized defenders are adjacent
- arrival-time rear-pocket capture must re-check adjacent organized defense before control can flip

This is an engine-wide military-truth fix, not a Sarajevo-only exception.

## Root Cause

Three seams combined to create the Sarajevo bug:

1. `analyzeFactionGraph()` in `src/sim/combat/osid_graph_analysis.ts` classified small enclosed enemy clusters as `enemy_pockets` from topology alone.
2. `detectParamilitaryTargets()` in `src/sim/combat/paramilitary_sweep.ts` used those pockets for rear-pocket paramilitary scheduling without asking whether organized defenders still existed inside or adjacent to the cluster.
3. `advanceParamilitaries()` directly flipped political control with `mechanism: 'combat'` but no `battle_id`, bypassing normal battle/reactive-defense semantics and making weekly summaries look wrong.

Claude's earlier enclave-only explanation was too narrow. Missing enclave exclusion was one symptom. The deeper invariant failure was using graph enclosure where military truth was required.

## Files Changed

- `src/sim/combat/osid_graph_analysis.ts`
- `src/sim/combat/paramilitary_sweep.ts`
- `src/sim/turn_phases/war_phases.ts`
- `tests/paramilitary_sweep.test.ts`

## Implementation

### 1. Enemy-pocket classification now respects brigade presence

In `src/sim/combat/osid_graph_analysis.ts`, enemy-pocket classification now rejects any enclosed cluster that still contains an organized brigade of the enclosed faction.

Effect:

- Sarajevo interior is no longer eligible for rear-pocket cleanup if ARBiH still has organized troops anywhere in the enclosed cluster.
- This rule is systemic and applies to any future cluster, not just Sarajevo.

### 2. Rear-pocket scheduling now respects adjacent organized defense

In `src/sim/combat/paramilitary_sweep.ts`, `detectParamilitaryTargets()` now skips rear-pocket targets that still have adjacent organized defenders.

Effect:

- rear-pocket cleanup no longer treats a momentarily empty tile inside a live defended line as abandoned
- this brings rear-pocket scheduling closer to the stricter military-presence logic already used by the offensive paramilitary path

### 3. Arrival-time capture now re-checks defended adjacency

Also in `src/sim/combat/paramilitary_sweep.ts`, `advanceParamilitaries()` now re-checks adjacent organized defense at arrival for rear-pocket targets.

In `src/sim/turn_phases/war_phases.ts`, the phase now passes live `edges` into `advanceParamilitaries()` so that arrival-time checks use real adjacency.

Effect:

- a rear-pocket paramilitary cannot silently capture a tile that remains covered by adjacent organized defenders at the moment of arrival
- this closes the "schedule looked valid three turns ago" gap

## Why This Is Better

Before:

- topological enclosure implied military abandonment
- rear-pocket paramilitaries could capture defended urban/siege tiles without a real battle surface

After:

- topology is only the first filter
- military presence inside or adjacent to the cluster overrides rear-pocket cleanup eligibility
- defended-line semantics now apply to this cleanup path too

## Tests

Added focused coverage in `tests/paramilitary_sweep.test.ts`:

- enclosed cluster with any brigade inside is not treated as an enemy pocket
- rear-pocket scheduling skips targets with adjacent organized defenders
- rear-pocket advance retreats instead of capturing when adjacent organized defenders are present at arrival

## Verification

Commands run:

```powershell
npx.cmd vitest run tests/paramilitary_sweep.test.ts
npx.cmd vitest run
npx.cmd tsc --noEmit -p tsconfig.json
npm.cmd run desktop:map:build
```

Results:

- `tests/paramilitary_sweep.test.ts`: 30/30 pass
- full Vitest: 2947/2947 pass
- TypeScript: clean
- desktop build: passes with the same pre-existing warnings only

## Lessons Learned

- Topological enclosure is not the same thing as an abandoned military pocket.
- Cleanup paths are still combat-adjacent systems and must obey defense invariants.
- A control-flip path that bypasses battle/reactive-defense semantics should be treated as suspicious by default.
- Sarajevo was the alarm bell, but the accepted fix is engine-wide.

## Residual Risk

Rear-pocket paramilitary capture now respects military presence far better, but it still remains a lighter-weight control-change path than full brigade battle resolution. If future runs reveal other defended-line edge cases, the next escalation would be to unify more of paramilitary advance with explicit battle/reaction semantics rather than relying on layered guards alone.
