# Tranche 7: Brigade History Recording Decomposition

**Date:** 2026-04-14
**Type:** God-file decomposition (v0.8-to-v0.9)
**Program:** Pure decomposition only — no behavior drift, no opportunistic fixes

## Seam chosen

Brigade history recording block (lines 922-977 of pre-tranche resolver). Single coherent "record what happened" delegation family containing:
- Attacker equipment record assembly + `recordAttackerEngagements()` call
- Defender group construction (multi-brigade sorted or single)
- Multi-defender weighted casualty/inflicted distribution via `allocateIntegerByWeights()`
- Per-defender `recordDefenderEngagement()` calls
- Single-defender equipment record assembly + `recordDefenderEngagement()` call

## Why this was the highest-value bounded seam

It is the last nontrivial coherent delegation family. The block is 55 lines of pure recording delegation — no return value, no side effects that affect subsequent resolution, no control-flow coupling. It consumes 5 imports used nowhere else in the resolver (`recordAttackerEngagements`, `recordDefenderEngagement`, `buildAttackerEquipmentRecord`, `buildDefenderEquipmentRecord`, `allocateIntegerByWeights`), producing the largest import-list reduction of any tranche.

## Classification Table

| Family | Status | Target File |
|--------|--------|-------------|
| `defFaction` / `isConcentrated` derivation | **Moved** | `attack_history_recording.ts` |
| Attacker equipment record assembly | **Moved** | `attack_history_recording.ts` |
| `recordAttackerEngagements()` call | **Moved** | `attack_history_recording.ts` |
| Multi-defender weight distribution | **Moved** | `attack_history_recording.ts` |
| Defender equipment record assembly | **Moved** | `attack_history_recording.ts` |
| `recordDefenderEngagement()` calls | **Moved** | `attack_history_recording.ts` |
| Sector intel (recon by force) | Still inline | `attack_resolution_osid.ts` |
| Sector defense model | Still inline | `attack_resolution_osid.ts` |
| Per-formation combat effects loop | Still inline | `attack_resolution_osid.ts` |
| Flip execution + retreat/displacement | Still inline | `attack_resolution_osid.ts` |
| Operation feedback counters | Still inline | `attack_resolution_osid.ts` |
| AAR narrative queue | Still inline | `attack_resolution_osid.ts` |

## Files Changed

| File | Action | Lines before | Lines after | Delta |
|------|--------|-------------|-------------|-------|
| `src/sim/combat/attack_history_recording.ts` | **Created** | — | 136 | +136 |
| `src/sim/combat/attack_resolution_osid.ts` | Edited | (reported 1027) | 907 | (cumulative, see below) |
| `tests/attack_history_recording.test.ts` | **Created** | — | 259 | +259 |

**Cumulative from HEAD (1809 lines):** 907 lines remaining (-902 lines, -49.9%). HEAD and final resolver both measured via PowerShell `Get-Content | Measure-Object -Line` on 2026-04-14.

## Extracted Surface

### `attack_history_recording.ts` (136 lines)

- **`recordBattleHistory()`** — single exported function. Assembles equipment records, delegates to `recordAttackerEngagements()` and `recordDefenderEngagement()` with weight distribution for multi-brigade defenders.

### Imports removed from `attack_resolution_osid.ts`

- `recordAttackerEngagements` from `./brigade_history_recorder.js`
- `recordDefenderEngagement` from `./brigade_history_recorder.js`
- `buildAttackerEquipmentRecord` from `./attack_equipment_effects.js`
- `buildDefenderEquipmentRecord` from `./attack_equipment_effects.js`
- `allocateIntegerByWeights` from `./attack_retreat_displacement.js`

All other imports from those modules retained (still used elsewhere in resolver).

## Verification Commands Actually Run

| Command | Result |
|---------|--------|
| `npx.cmd tsc --noEmit -p tsconfig.json` | Clean, no errors |
| `npx.cmd vitest run tests/attack_history_recording.test.ts` | 9/9 passed |
| `npx.cmd vitest run` (7 regression files) | 178/178 passed |
| `npm.cmd run test:vitest` | 3487 tests passed, 296 suites, 0 failures |
| `npm.cmd run desktop:map:build` | Built successfully |

## Test Coverage (9 tests)

1. Attacker recording — verifies `recordAttackerEngagements` writes battle_history
2. No defender — only attacker recording, no crash
3. Single defender with equipment data
4. Multi-defender weight distribution — casualties allocated by weights
5. Multi-defender sorting — sorted by `strictCompare` on id
6. `isConcentrated` — true with multiple attackers, false with single
7. `defFaction` derivation — uses controller when present, attackerFaction when null
8. Equipment record assembly — correct tanks/artillery passed through
9. Zero-weight edge case

## Seam Purity Statement

This tranche remained **pure decomposition**. The function body is a character-level copy of the original inline block. No arithmetic, sorting, weight distribution, or recording behavior changed. No control-flow boundary was hit.

## Zero-Drift Proof

Not claimed — 40w scenario was not rerun. Zero-drift is strongly indicated by: identical logic (character-level copy), clean tsc, 3487/3487 vitest, but not formally proven via scenario hash comparison.
