# Presidential Command Friction Wave 6 - Expand Strain Sources

**Date:** 2026-04-04
**Status:** IMPLEMENTED
**Lane:** Presidential Command Friction (v0.8.x)
**Orchestrator:** Yes - 2 parallel audit subagents dispatched (source audit, UI audit)

## Summary

Added corps exhaustion as a third command strain source. Corps commanders under institutional strain from being pushed while exhausted now register as strained even without direct presidential intervention or friction events. This deepens the command strain mechanic beyond override/friction history.

## What Changed

### Source 3: Corps Exhaustion in `computeCorpsCommandStrain()`

**File:** `src/ui/map/data/command_strain.ts`

New strain contribution from `corps_command[corpsId].corps_exhaustion`:
- Exhaustion >= 50: +1 strain (mild - corps is being pushed hard)
- Exhaustion >= 75: +2 strain (severe - institutional overextension)
- No turn decay - persists while the underlying condition persists
- NOT affected by Stabilize action (stabilization resolves friction events, not physical exhaustion)
- Composes additively with existing sources (force-launch +3, friction +2)

**Design rationale:** The thresholds (50/75) are above the engine's `MAX_EXHAUSTION_FOR_OPERATION` (30) because strain is not about whether ops are possible - it is about institutional stress from pushing a tired corps. At 50+, the commander's staff is under real pressure. At 75+, the institutional damage is severe.

### UI: Exhaustion pressure note in `CommandRelationshipSection`

**File:** `src/ui/map/components/army_hq/CommandRelationshipSection.tsx`

- New prop: `corpsExhaustion: number`
- New note between recovery forecast and stance constraint: "Corps exhaustion (X%) is straining the command relationship" - shown only when exhaustion contributes to strain
- Stabilize button now shown only when friction events exist (stabilization cannot resolve exhaustion-driven strain)
- Compromised stance guidance now distinguishes friction-only, exhaustion-only, and mixed recovery paths so the player is not told to stabilize when stabilization cannot help
- Wired from `ArmyHQCorpsCard.tsx` via `corps.corpsExhaustion`

### Exports for UI/tests

- `isExhaustionContributingToStrain(corpsExhaustion)` - pure helper for UI display
- `EXHAUSTION_STRAIN_THRESHOLD` (50) and `EXHAUSTION_STRAIN_SEVERE_THRESHOLD` (75) - exported constants

## What Did NOT Change

- No engine changes - pure UI-side derivation from existing persisted state
- No new persisted fields - `corps_exhaustion` already exists on `CorpsCommandState`
- No changes to stabilization mechanics - stabilization still resolves friction, not conditions
- No changes to CA recovery penalty - kept focused on direct interventions
- No changes to CorpsSituationSection - it already shows "heavily exhausted" as a military factor

## Interaction Model

| Strain Source | Contribution | Decay | Stabilization resolves? |
|---|---|---|---|
| Force-launched op | +3 | -1/turn | No (decays naturally) |
| Unresolved friction | +2 | -1/turn | Yes (acknowledge or stabilize) |
| Corps exhaustion >= 50 | +1 | None (condition-based) | No (reduce exhaustion) |
| Corps exhaustion >= 75 | +2 | None (condition-based) | No (reduce exhaustion) |

**Composition example:** A force-launched op (+3) on an exhausted corps (75%, +2) with unresolved friction (+2) = strain 7 (compromised). The player must:
1. Wait for force-launch strain to decay
2. Acknowledge or stabilize friction
3. Reduce operational tempo to lower exhaustion

## Tests

14 new Wave 18 tests in `tests/command_authority.test.ts`:
- No strain below threshold (49)
- +1 at threshold (50), between thresholds (60)
- +2 at severe threshold (75), maximum (100)
- Composition with force-launch, friction, and all three
- `isExhaustionContributingToStrain` helper
- Exported threshold constants
- Exhaustion-only compromised guidance does not imply stabilization can fix it
- Mixed friction + exhaustion guidance names both recovery paths

## Verification

- `npx.cmd vitest run tests/command_authority.test.ts`: **277/277 pass**
- `npx.cmd vitest run`: **2231/2231 pass (0 failures)**
- `npx.cmd tsc --noEmit -p tsconfig.json`: clean
- `npm.cmd run build`: clean
- `powershell -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1`: OK
