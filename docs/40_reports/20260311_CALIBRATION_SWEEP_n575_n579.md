# Calibration Sweep: n575 → n581

**Date**: 2026-03-11
**Runs**: n575 (baseline) → n576 → n577 → n578 → n579 → n580 → n581 (final)
**Scenario**: `apr1992_definitive_40w` (40 weeks, April 1992 → January 1993)

## Summary

Seven calibration changes moved the simulation from 4/6 benchmarks passing with low battle tempo to **6/6 benchmarks passing** with historically plausible war dynamics. The key insight was that early-war intensity is the primary calibration lever — late-war doctrine parameters have zero effect because combat effectiveness (entrenchment, reinforced defenders) is the bottleneck, not doctrine limits.

## Changes Applied

| # | Change | File | Rationale |
|---|--------|------|-----------|
| 1 | Three-phase RS doctrine: w0-12 blitz (0.35/0.15), w12-26 sustained (0.25/0.08), w26+ consolidation (0.20/0.05) | `timelines/apr1992.json`, `bot_strategy.ts`, `bot_constants.ts` | VRS had distinct operational phases: April-June blitz, summer-fall sustained ops, winter consolidation |
| 2 | RBiH restrained w15-40: share 0.12, aggr -0.05 | `timelines/apr1992.json`, `bot_strategy.ts` | ARBiH was defensive until mid-1993; premature counterattacks were ahistorical |
| 3 | Combat ineffective gate at 400 personnel | `bot_brigade_eval_attack.ts` | Prevents depleted companies from launching attacks |
| 4 | Mobilization surge reduction ~20-30% | `ongoing_mobilization.ts` | Personnel trajectories were overshooting historical bands |
| 5 | Dissolution thresholds raised (400/20/15) | `brigade_dissolution.ts` | More aggressive cleanup of combat-ineffective brigades |
| 6 | Sector reserve: max 1, 1-hop behind frontline | `corps_front_sectors.ts`, `corps_front_sectors_constants.ts` | Prevents unrealistic deep-rear reserves flooding sectors |
| 7 | RS_EARLY_WAR_END_WEEK extended 20 → 26 | `bot_constants.ts`, `timelines/apr1992.json` | VRS offensive phase lasted through October 1992, not just August |

## Run Comparison

| Metric | n575 | n576/n577 | n578 | **n579** |
|--------|------|-----------|------|----------|
| Benchmarks | - | 4/6 | 5/6 | **6/6** |
| Area match | 88.5% | 84.5% | 84.4% | **85.3%** |
| RS delta | -29 | -47 | -38 | **-24** |
| Total orders | 153 | 165 | 159 | **210** |
| RS orders | - | 128 | 129 | **158** |
| RBiH orders | - | 25 | 18 | **20** |
| HRHB orders | - | 12 | 12 | **32** |
| Total casualties | ~24.8k | ~40.7k | ~38.5k | **~41.1k** |
| RS w20 bench | - | 0.482 ✓ | 0.482 ✓ | **0.489 ✓** |
| RS w40 bench | - | 0.486 ✗ | 0.498 ✗ | **0.517 ✓** |
| RBiH w40 bench | - | 0.381 ✗ | 0.371 ✓ | **0.363 ✓** |

## Key Findings

### 1. Late-war doctrine has zero calibration effect
n576→n577 changed RS late-war attack_share from 0.14→0.20 with **identical results** (same hash, same orders, same casualties). The bottleneck after w20 is combat effectiveness: entrenched defenders, accumulated fatigue, operation failure cascades. Doctrine parameters only matter in the early war when defenders are weak and positions un-entrenched.

### 2. Three-phase RS doctrine captures historical arc
The VRS had three distinct operational phases:
- **w0-12 (Apr-Jun 1992)**: Maximum blitz — JNA equipment, organized forces vs. disorganized TDF. 0.35 attack share, 0.15 aggression.
- **w12-26 (Jul-Oct 1992)**: Sustained pressure — still offensive but encountering organized resistance. 0.25 attack share, 0.08 aggression.
- **w26+ (Nov 1992+)**: Consolidation — diminishing returns, supply strain, fatigue. 0.20 attack share, 0.05 aggression.

### 3. Operation quality improved
- **Operation Koridor** (East Bosnian Corps): 7/7 objectives — full success
- **Operation Kotor Varoš** (1st Krajina): 4/4 objectives — full success
- **Operation Bosanski Novi** (1st Krajina): 3/3 objectives — full success
- **Naser Orić's Teočak operation**: 1/1 — historically accurate local counterattack

### 4. Remaining Drina shortfall is mostly enclave defense
RS has 76 OSIDs in Drina vs 95 target (19 gap). Of these, ~13 are in Srebrenica/Bratunac (enclave mechanics keeping them RBiH). Historically, the Srebrenica enclave survived until July 1995 — the sim may be more accurate than the painted targets here.

### 5. Casualty volume doubled
From ~24.8k (n575 baseline) to ~41.1k (n579). Weekly tempo:
- w1-12: ~910 casualties/week (blitz)
- w13-26: ~843 casualties/week (sustained)
- w27-40: ~386 casualties/week (consolidation)

### 6. Personnel trajectories
- RS: 57k → 113k (target 90-100k — slightly high)
- RBiH: 29k → 144k (target 110-130k — high)
- HRHB: 20k → 42k (target 40-45k — perfect)

Personnel still runs slightly high for RS and RBiH. The mobilization surge reduction helped but didn't fully solve it. Further reduction risks affecting other dynamics.

## n580/n581: RBiH Offensive Paralysis Fix

### Changes Applied (n580)
| # | Change | File | Rationale |
|---|--------|------|-----------|
| 8 | Pass min_attack_outcome from directive to sector ops | `sector_offensive.ts`, `bot_corps_directives.ts` | Operations were created WITHOUT probe threshold from directive, falling to costly_victory default |
| 9 | Lower default probe threshold: costly_victory→stalemate (0-mom), stalemate→repulsed (2+ mom) | `bot_brigade_ai_osid.ts` | costly_victory (1.0 ratio) impossible for outnumbered RBiH forces |
| 10 | RBiH w15-40 attack share 0.12→0.18 | `timelines/apr1992.json`, `bot_strategy.ts` | 12% too restrictive — only 1 attack slot per large corps |

### Changes Applied (n581)
| # | Change | File | Rationale |
|---|--------|------|-----------|
| 11 | Movement-only stall detection (4 turns) | `sector_offensive.ts` | Operations marching brigades forever without attacking |

### Results (n581 = n580 in outcomes)
| Metric | n579 | n581 |
|--------|------|------|
| Benchmarks | 6/6 | 6/6 |
| Area match | 85.3% | 85.4% |
| RS delta | -24 | -33 |
| Total orders | 210 | 193 |
| RS orders | 158 | 147 |
| **RBiH orders** | **20** | **27 (+35%)** |
| HRHB orders | 32 | 19 |
| RS w40 bench | 0.517 | 0.505 (marginal) |

### Key Findings
1. **Root cause**: `evaluateSectorOffensiveLaunch` created ops without `min_attack_outcome`. `getSectorOffensiveProbeThreshold` fell to `costly_victory` (1.0 ratio). RBiH at ~0.5:1 power ratio could never attack.
2. **2nd Corps now active**: Tigar-Sloboda (16 attacks, 1/6 obj). 5th Corps operational: Čelik (4/5 obj).
3. **1st/4th Corps paralysis persists** but is historically accurate: Sarajevo siege blocks 1st Corps offensives, 4th Corps too small (7 brigades).
4. **Late-war doctrine still has zero calibration effect** — confirmed across n576-n581.

## Remaining Issues
1. **RS w40 benchmark razor-thin** (0.505 vs 0.503-0.603 band) — 0.002 margin
2. **Area match below ATH** (85.4% vs 93.8% ATH at n304) — other factors beyond doctrine
3. **Personnel overshoot** for RS (112k vs 100k target) and RBiH (144k vs 130k target)
4. **Drina region** still weakest (~76% match) — enclave mechanics plus Rogatica holdouts
5. **Central Bosnia** has scattered RS shortfall (25 sim vs 42 painted)
6. **RS repeat-failure loop**: Lowered threshold lets RS attack same position 2-3x at declining ratios
7. **Ghost attacks**: ~46% of battles have no defender present (pre-existing)
