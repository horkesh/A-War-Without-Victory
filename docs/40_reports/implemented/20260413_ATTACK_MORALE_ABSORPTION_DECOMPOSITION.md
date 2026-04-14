# Tranche 5a: Morale Absorption & Homeland Determination Decomposition

**Date:** 2026-04-13
**Type:** God-file decomposition (v0.8-to-v0.9)
**Program:** Pure decomposition only — no behavior drift, no opportunistic fixes

## Classification Table

| Family | Status | Target File |
|--------|--------|-------------|
| `MORALE_ABSORPTION_CAS_MULT` constant | **Moved** | `attack_morale_absorption.ts` |
| Morale-based retreat resistance evaluation (capital last stand, ARBiH homeland, professional resilience) | **Moved** | `attack_morale_absorption.ts` |
| Extra casualty application (homeland determination) — both attacker and defender | **Moved** | `attack_morale_absorption.ts` |
| `MoraleAbsorptionResult` interface | **New** | `attack_morale_absorption.ts` |
| Core flip logic (political_controllers write) | Still inline | `attack_resolution_osid.ts` |
| Retreat/displacement | Still inline | `attack_resolution_osid.ts` |
| Sector defense model | Still inline | `attack_resolution_osid.ts` |
| Supply expenditure | Still inline | `attack_resolution_osid.ts` |
| Facility damage | Still inline | `attack_resolution_osid.ts` |
| Brigade history recording | Still inline | `attack_resolution_osid.ts` |
| AAR queueing | Still inline | `attack_resolution_osid.ts` |
| Post-battle morale (generic) | Already extracted | `attack_post_battle_effects.ts` (tranche 4) |

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/sim/combat/attack_morale_absorption.ts` | **Created** | 169 |
| `src/sim/combat/attack_resolution_osid.ts` | Edited (removed inline code, added import + call) | 1119 → 1045 (-74) (reported during extraction; not independently remeasured) |
| `tests/attack_morale_absorption.test.ts` | **Created** | 707 |

**Cumulative from HEAD (1809 lines):** 1045 lines reported remaining (-764 lines, -42.2%). Note: HEAD measured at 1809 via PowerShell `Get-Content | Measure-Object -Line`; intermediate resolver size (1045) was reported during extraction, not independently remeasured. Post-T7 resolver is 907 lines (measured).

## Extracted Surface

### `attack_morale_absorption.ts` (169 lines)

- **`MORALE_ABSORPTION_CAS_MULT`** (constant, 1.6) — extra casualty multiplier when absorption triggers
- **`MoraleAbsorptionResult`** (interface) — `{ moraleAbsorbed: boolean, flip: boolean }`
- **`evaluateAndApplyMoraleAbsorption()`** (function) — evaluates three absorption paths (enclave capital last stand, ARBiH homeland defense, professional resilience), applies morale drain, computes and applies extra casualties to both sides, records to casualty ledger, pushes snap events. Returns boolean contract consumed by downstream flip/morale logic.

### Imports removed from `attack_resolution_osid.ts`

- `getMoraleResistFloor` — only used in morale absorption evaluation
- `KIA_FRACTION`, `WIA_FRACTION` — only used in extra casualty recording (normal path uses `splitKiaWiaMia`)
- `MIN_COMBAT_PERSONNEL` — only used in extra casualty clamping (`FATIGUE_MAX` retained)

## Contract Preservation

The extracted function returns `{ moraleAbsorbed, flip }`:
- `moraleAbsorbed` → consumed by `applyPostBattleMorale()` (line 977 original, determines defender hold morale boost)
- `flip` → consumed by political controller write (line 889+), operation feedback (line 910+), AAR queue (line 919+), defender retreat (line 950+), attacker advance (line 979+)

Ordering preserved: morale absorption evaluation happens BEFORE flip execution, exactly as before. Extra casualties applied immediately after evaluation, before flip block.

## Verification Commands Actually Run

| Command | Result |
|---------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | Clean, no errors |
| `npx.cmd vitest run tests/attack_morale_absorption.test.ts` | 23/23 passed |
| `npx.cmd vitest run tests/attack_post_battle_effects.test.ts tests/attack_casualty_distribution.test.ts tests/attack_equipment_effects.test.ts tests/probe_territory_flip.test.ts tests/emergency_retreat_reachability.test.ts` | 138/138 passed |
| `npm.cmd run test:vitest` | 3461 tests passed, 294 suites, 0 failures |
| `npm.cmd run desktop:map:build` | Built successfully |

## Test Coverage (23 tests)

1. No defender → no absorption, flip unchanged
2. Enclave capital last stand: decisive_victory NOT absorbed, victory absorbed, costly_victory absorbed
3. ARBiH homeland (≥50% co-ethnic): costly_victory absorbed, victory absorbed, decisive_victory NOT absorbed, stalemate no-op
4. Professional resilience: costly_victory absorbed at floor, victory absorbed at floor, decisive_victory NOT absorbed
5. Below morale floor → no absorption
6. Extra attacker casualties: correct arithmetic (Math.round × 0.6), fraction-weighted distribution, MIN_COMBAT_PERSONNEL clamp
7. Extra defender casualties: correct arithmetic, MIN_COMBAT_PERSONNEL clamp
8. Casualty ledger recording: KIA/WIA/MIA split matches formula
9. Report totals updated (casualty_attacker, casualty_defender)
10. Morale drain: defender morale decreases by 5
11. Snap event: morale_absorption pushed to both battleSnapEvents and report
12. No absorption → no side effects

## Seam Purity Statement

This tranche remained **pure decomposition**. No behavior changes, no arithmetic modifications, no control-flow restructuring. The extracted code is a character-level copy of the original inline block with only the necessary function wrapper and parameter passing added. No control-flow boundary was hit — the morale absorption block has clean read/write boundaries with the surrounding resolver.

## Same-Hash Proof

Not claimed — 40w scenario was not rerun in this session.
