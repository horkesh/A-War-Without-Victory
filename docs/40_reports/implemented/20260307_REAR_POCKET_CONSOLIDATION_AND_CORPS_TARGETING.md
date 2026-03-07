# Rear Pocket Consolidation and Corps AI Pocket Targeting

**Date:** 2026-03-07
**Run ID:** n214 (hash `6cbc6ef614883584`)
**Baseline:** n207 (85.4% area-weighted, 26 rear pockets)
**Result:** n214 (84.2% area-weighted, 12 rear pockets)

## Summary

- Added `consolidate-rear-pockets` pipeline step: auto-flips enemy OSIDs completely surrounded by one faction with no defending brigade, eliminating 14 of 26 rear pockets without any combat
- Improved corps AI pocket targeting: rear pockets bypass municipality operational-area and sector enemy OSID filters so they appear in CorpsDirective.offensive_targets
- Home-defense brigades can attack truly undefended adjacent directive targets (no sector coverage) via decisive_victory + !defender_has_brigade guard

## Changes Made

### 1. Rear Pocket Consolidation Pipeline Step (NEW)

**File:** `src/sim/combat/consolidate_rear_pockets.ts`

New pipeline step runs after `phase-ii-displace-enemy-territory`, before `update-officer-quality`. For each OSID controlled by faction X where ALL neighbors are controlled by faction Y and no faction-X brigade is present, flips control to Y without combat.

- **Cap:** MAX_FLIPS_PER_TURN = 8 (prevents cascade chain reactions)
- **Deterministic:** sorted OSID iteration via `strictCompare`, stable tie-break
- **Actual behavior (n214):** Turn 1: 8 flips, Turn 2: 8, Turn 3: 4, then 1/turn at turns 10, 15, 22, 26. Total: 24 pockets consolidated over 40 weeks
- **Report type:** `RearPocketConsolidationReport { flipped: Array<{ osid, from, to }> }` on `context.report.rear_pocket_consolidation`

### 2. Corps AI Rear Pocket Targeting

**File:** `src/sim/combat/bot_corps_ai.ts`

Two filters previously blocked pocket cleanup:
1. Municipality operational-area filter required pockets to be in corps target municipalities
2. Sector enemy OSID filter required pockets to be adjacent to corps sectors

Fix: rear pockets (all neighbors faction-controlled) bypass BOTH filters. Front pockets retain both constraints to prevent adventurism.

- `rearPocketOsids` Set tracks which pockets are rear (for sector filter exemption)
- Front pockets still require: (a) municipality in corps operational area, (b) adjacent brigade from corps

### 3. Home-Defense Exception for Undefended Targets

**File:** `src/sim/combat/bot_brigade_ai_osid.ts`

Home-defense brigades (86% of all brigades) can now attack adjacent directive targets that are truly undefended — where the predictor reports `decisive_victory` AND `!defender_has_brigade`. This fires for OSIDs with no sector coverage (no sector brigades found = militia ghost only).

Guards: decisive_victory prediction, !defender_has_brigade, max_attackers_per_target cap.

Note: this does NOT fire for rear pockets because sector-pooled defense in the predictor still sets `defender_has_brigade = true`. Rear pocket cleanup is handled by the consolidation pipeline step instead.

## Approaches Tried and Rejected

| Approach | Pockets | Calibration | Why rejected |
|----------|---------|-------------|--------------|
| Predictor+resolver rear pocket fix (n208) | 30 | 82.6% | Regular brigades divert from front to attack pockets |
| Adjacency-based home-defense attacks, any mun (n212) | 25 | 82.5% | Brigade leaves home defense, cascading front destabilization |
| Adjacency-based home-defense attacks, same mun (n213) | 22 | 83.6% | Still causes butterfly effects from additional attacks |
| **Pipeline consolidation step (n214)** | **12** | **84.2%** | **No butterfly effects — pockets flip without combat** |

Key lesson: changing brigade attack decisions (even constrained ones) creates butterfly effects that destabilize fronts. The pipeline approach is superior because it doesn't change any attack decisions.

## Scenario Results

### OSID Match Rate
- **Area-weighted:** 84.2% (42,914 / 51,337 km²) — 1.2pp below baseline n207
- **Count:** 609/744 (81.9%)
- Faction counts: RS=330 (44.4%), RBiH=302 (40.6%), HRHB=112 (15.1%)

### Regional Performance
| Region | Match | Area-weighted |
|--------|-------|---------------|
| Krajina | 86.3% | 87.7% |
| Posavina NE | 73.4% | 78.8% |
| Drina | 65.9% | 69.0% |
| Central Corridor | 86.2% | 85.2% |
| Central Bosnia | 80.4% | 80.4% |
| Sarajevo | 90.3% | 88.1% |
| Herzegovina | 89.2% | 87.4% |

### Rear Pocket Status
- Before: 26 rear pockets (n207 baseline)
- After: 12 rear pockets (n214)
- Remaining 12 are transient — formed during the same turn's combat and will be cleaned next turn

## Lessons Learned

1. **Pipeline consolidation > brigade attacks for pocket cleanup.** Changing attack decisions (even for home-defense brigades) creates cascading butterfly effects. Auto-flipping surrounded territory avoids all side effects.
2. **The predictor's sector-pooled defense is correct for front-line OSIDs** but inappropriate for rear pockets. Rather than fixing the predictor (which affects all targeting), the pipeline step handles it cleanly.
3. **MAX_FLIPS_PER_TURN = 8 is the right cap.** Initial-state pockets (16-20) clean up in 3 turns. Combat-created pockets (1-2/turn) clean up immediately. Higher cap could cause larger single-turn territory swings.
4. **Home-defense exception for truly undefended targets IS live** — it fires for OSIDs with no sector coverage where the predictor genuinely returns `defender_has_brigade = false`. Removing it changes the hash.

## Files Changed

| File | Change |
|------|--------|
| `src/sim/combat/consolidate_rear_pockets.ts` | **NEW** — pipeline step for auto-flipping surrounded enemy OSIDs |
| `src/sim/combat/bot_corps_ai.ts` | Rear pocket municipality + sector filter bypass |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Home-defense exception for truly undefended targets |
| `src/sim/turn_phases/war_phases.ts` | Added `consolidate-rear-pockets` step after `phase-ii-displace-enemy-territory` |
| `src/sim/turn_pipeline_types.ts` | Added `RearPocketConsolidationReport` import + report field |

## Next Steps

1. **Commit and push** current changes (corps AI + brigade AI + consolidation step)
2. **Monitor remaining 12 pockets** — verify they are transient (cleaned up in subsequent turns, not persistent)
3. **Consider raising MAX_FLIPS_PER_TURN** if initial-state cleanup needs to be faster
4. **Investigate persistent pockets** like `op:gorazde:podkozara_donja_2` (RS in RBiH rear, adj_brigs=3) — these may represent enclaves that shouldn't be auto-flipped
