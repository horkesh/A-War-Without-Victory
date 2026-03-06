# N159 Deep Engine Audit Calibration (Phases A-D)

**Date:** 2026-03-06
**Baseline:** n142/n159 (81.5% area-weighted, sector-fix session)
**Result:** n165 (84.2% area-weighted, combat-causality gate GREEN)

## Summary
- Addressed 14 issues from the full Paradox 40w engine audit (n159 report)
- Core directive: organic VRS tempo decay — no artificial stance transitions; RS slows down through fatigue, supply consumption, entrenchment wall, and ARBiH resistance
- 4 phases completed (A through D); Phase E (polish/verification) pending

## Changes Made

### Phase A: P0 Engine Bug Investigation
All three P0 issues investigated and resolved without code changes:
- `brigade_history` logging: working correctly (populated in turn pipeline)
- Posture lifecycle: confirmed complete and functional
- `displaced_out` counter: already fixed in prior session

### Phase B: Casualty Tuning
| Constant | Before | After | Rationale |
|----------|--------|-------|-----------|
| BASE_ATTRITION_RATE | 0.005 | 0.003 | Reduce frontline attrition to avoid excessive peacetime losses |
| BOMBARDMENT_EXPOSURE_RATE | 0.012 | 0.008 | Align bombardment with reduced attrition |
| BASE_ATTACKER_LOSS_RATE | 0.045 | 0.04 | Slight reduction; attacker losses were too high |
| BASE_DEFENDER_LOSS_RATE | 0.02 | 0.028 | Increase defender losses for att:def ratio target 2.5-3:1 (was 4.78:1) |

Files: `src/sim/combat/frontline_attrition.ts`, `src/sim/combat/combat_math.ts`

### Phase C: Organic VRS Tempo Decay (Core)
The heart of the audit — replacing hardcoded RS stance transitions with emergent mechanics:

**Fatigue as combat power modifier:**
- New `getFatigueMult()` in `combat_math.ts` — fatigued units fight worse
- Attack floor: 0.6x, defense floor: 0.75x (linear interpolation by fatigue/FATIGUE_MAX)
- Wired into both `computeAttackerPower()` and `computeDefenderPower()`

**Fatigue accumulation/recovery rebalanced:**
- Recovery interval: every 2 turns (was every turn)
- New: +0.5 fatigue/turn for frontline-assigned formations
- FATIGUE_MAX: 20→30, consolidated to single shared constant in `formation_constants.ts`

**Entrenchment diminishing returns:**
- Linear curve → sqrt-based: first turns of digging in matter most, later turns plateau
- At 1 turn: 0.07 bonus (doubled). At 6 turns: 0.171 (was 0.21 linear)

**RS doctrine phases:**
- Reduced from 3 to 2 — both offensive (no artificial defensive regression at w20/w40)
- RS stays offensive permanently; tempo decay emerges from mechanics
- Timeline `apr1992.json` updated to match

Files: `src/sim/combat/combat_math.ts`, `src/state/formation_fatigue.ts`, `src/state/formation_constants.ts`, `src/sim/combat/bot_strategy.ts`, `data/scenarios/timelines/apr1992.json`

### Phase D: Supply & Patron Rebalancing
**Supply drain:**
- MAINTENANCE_DRAIN_PER_FORMATION: 0.025→0.045 (RS general supply now 68% by w40, was 100%)
- UN airdrops capped: AIRDROP_MAX_SUPPLY_PER_TURN 15→3, AIRDROP_GENERAL_SUPPLY_PER_ENCLAVE 1.5→0.5

**Patron commitment (historical):**
- RBiH: 0.6→0.3 in 1992 (arms embargo), gradual increase to 0.6 post-1994
- RS: 0.8 in 1992 (JNA backing), declining to 0.55 post-1994
- HRHB: 0.6 in 1992 (Croatian support), increasing to 0.7

**Initial reserves:**
- HRHB general supply: 55→75 (Croatian pipeline open early war)
- Faction-specific initial material_support_level in ensurePatronState()

Files: `src/state/supply_reserve_constants.ts`, `src/state/patron_pressure.ts`

## Scenario Results (n165)

### OSID Control
- RS: 322 OSIDs | HRHB: 112 OSIDs | RBiH: 319 OSIDs
- Area-weighted: 84.2% (up from 81.5% baseline)

### Supply State (w40)
| Faction | General Supply | Heavy Munitions |
|---------|---------------|-----------------|
| RS | 68.2% | 100% |
| HRHB | 19.3% (strained) | 78.9% |
| RBiH | 100% | 100% |

### Combat Activity
- 146 attack orders, 118 battles, 103 captures
- All RS attacks (no non-RS factions attacking yet — expected at w40)
- Combat-causality gate: GREEN

## Lessons Learned
- **Fatigue-as-power-modifier is the cleanest organic slowdown**: simpler than overstretch distance calculations, naturally penalizes continuous fighting
- **UN airdrops were silently dominating RBiH supply**: 15 pts/turn dwarfed all other income/drain — a single constant can mask an entire system
- **tsx caching can mask changes**: patron_pressure.ts edits weren't picked up until tsx cache was cleared
- **Entrenchment sqrt curve creates interesting dynamics**: early digging matters more, which rewards defenders who stay put early (ARBiH pattern) while penalizing late-arriving attackers less
- **HRHB supply is fragile**: 59 siege counters from central Bosnia pockets drain faction reserves; increased initial supply + patron commitment barely keeps them strained (19.3%)

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_math.ts` | getFatigueMult(), sqrt entrenchment, casualty rates |
| `src/state/formation_fatigue.ts` | Recovery interval, frontline fatigue, shared FATIGUE_MAX |
| `src/state/formation_constants.ts` | Shared FATIGUE_MAX=30 |
| `src/sim/combat/bot_strategy.ts` | RS doctrine phases 3→2 (both offensive) |
| `data/scenarios/timelines/apr1992.json` | RS doctrine/standing orders simplified |
| `src/sim/combat/frontline_attrition.ts` | Reduced attrition/bombardment rates |
| `src/state/supply_reserve_constants.ts` | Maintenance drain, airdrop caps, HRHB init |
| `src/state/patron_pressure.ts` | Historical patron commitment, initial material support |
| `src/sim/combat/attack_resolution_osid.ts` | Import shared FATIGUE_MAX |
| `tests/bot_three_sides_validation.test.ts` | Updated for new RS doctrine |
| `tests/supply_reserves.test.ts` | Updated HRHB init expectation |

## Next Steps
- Phase E: Polish & verification (experience gain, column movement, operations check, full run)
- B2 (Serb civilian casualties): investigation pending
- B4 (HVO personnel shortfall): deferred
- Propagate changes to canon/engineering docs
