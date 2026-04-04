# Presidential Command Friction — Wave 5 (Command Standing + Decay Preview + CA Consequence)
**Date:** 2026-04-04
**Branch:** main

## Mission

Three bounded additions to the presidential command friction system:

1. **Strain decay preview** — new `projectStrainDecay` + `deriveRecoveryForecast` functions that project strain over future turns, giving the player visibility into when strain will resolve.
2. **Command Relationship Standing section** — consolidated back-face section on ArmyHQCorpsCard showing strain status, recovery forecast, unresolved friction count, and stance constraint notice. Silence = healthy.
3. **CA recovery rate reduction** — sim-level consequence: recent force-launched ops and unresolved friction events reduce the per-turn CA recovery rate (base +2, penalty up to -2).

## Implementation

### Task 1: Strain Decay Projection (command_strain.ts)

Added two functions after the Wave 9 block:

- `projectStrainDecay(corpsId, state, turnsAhead)` — creates shallow state copies with projected turn values and calls `computeCorpsCommandStrain` for each. Returns `Array<{ turn, projectedStrain }>`.
- `deriveRecoveryForecast(projections)` — derives a player-facing string: "Strain resolving in N turns", "Recovery: strain drops to N (label) next turn", or "Strain persisting at N". Returns null when healthy (silence=healthy).

### Task 2: FormationView Wiring

- Added `projectedStrainNextTurn` and `recoveryForecast` fields to `FormationView` in types.ts.
- Wired computation in GameStateAdapter.ts after existing strain field computation.
- Imports `projectStrainDecay` and `deriveRecoveryForecast` from command_strain module.

### Task 3: Command Relationship Standing Section

New component: `CommandRelationshipSection.tsx` in army_hq directory.

- Renders ONLY when strain > 0 (silence=healthy).
- Strain status row with color coding (amber=strained, red=compromised) and numeric score.
- Recovery forecast row from FormationView.
- Unresolved friction count summary (does NOT duplicate Acknowledge buttons).
- Stance constraint notice when compromised (moved here from CommandManagementSection).
- Uses CollapsibleSection pattern, default expanded.
- Placed between CommandManagementSection and CommanderSection in ArmyHQCorpsCard.

### Task 4: Cleanup / Demotion

- **CommandManagementSection**: Removed stance constraint notice (now in Standing section). Keeps Stabilize button + cooldown + footer explainer.
- **OperationsSection**: Demoted command-risk notice from full warning box to single inline line: "Operating under command strain".
- **Inline strain/friction panel** (ArmyHQCorpsCard): Removed standalone strain score row (now in Standing section). Kept friction event list + Acknowledge buttons. Panel only renders when unresolved friction events exist.

### Task 5: CA Recovery Rate Reduction (war_phases.ts)

Modified the `recover-command-authority` step body (no new steps, no imports from UI code).

Inline approximation of intervention load:
- Count force-launched ops within 3 turns of current turn across all corps.
- Count unresolved friction events within 2 turns.
- Penalty = min(2, (recentInterventions + unresolvedFriction) * 0.5).
- Recovery = max(0, 2 - penalty).

This preserves the sim/UI boundary (no UI imports) while creating a real mechanical consequence for presidential overreach.

### Task 6: Tests (Wave 10)

10 new tests in `tests/command_authority.test.ts` under `describe('Wave 10: Command Relationship Standing')`:

- 4 tests for `projectStrainDecay`: force-launch decay, friction decay, combined, expired sources.
- 3 tests for `deriveRecoveryForecast`: healthy=null, recovery in N turns, persistent strain.
- 4 tests for CA recovery formula: one intervention, multiple, cap at zero, none.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/command_strain.ts` | +projectStrainDecay, +deriveRecoveryForecast |
| `src/ui/map/data/types.ts` | +projectedStrainNextTurn, +recoveryForecast on FormationView |
| `src/ui/map/data/GameStateAdapter.ts` | Wire projection computation |
| `src/ui/map/components/army_hq/CommandRelationshipSection.tsx` | NEW — Standing section |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | Import + place Standing section, simplify inline strain panel |
| `src/ui/map/components/army_hq/CommandManagementSection.tsx` | Remove stance constraint notice |
| `src/ui/map/components/army_hq/OperationsSection.tsx` | Demote command-risk notice to inline |
| `src/sim/turn_phases/war_phases.ts` | CA recovery penalty for interventions |
| `tests/command_authority.test.ts` | +10 Wave 10 tests |

## Verification

- `tsc --noEmit`: clean
- `vitest run tests/command_authority.test.ts`: 179/179 pass
- `desktop:map:build`: builds successfully

## Design Decisions

1. **No UI imports in sim code**: The CA recovery step uses an inline approximation of strain sources rather than importing `computeCorpsCommandStrain` from UI code. This keeps the sim/UI dependency boundary clean.
2. **Silence = healthy everywhere**: Standing section hidden at strain 0. Recovery forecast returns null at strain 0. No noise when things are fine.
3. **Singular ownership**: Standing section owns strain display + forecast + constraint notice. CommandManagementSection owns Stabilize action only. OperationsSection retains only a minimal 1-line reminder.
