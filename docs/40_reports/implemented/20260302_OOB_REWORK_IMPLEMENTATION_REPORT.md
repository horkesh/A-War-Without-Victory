# OOB Rework Implementation Report

**Date:** 2026-03-02
**Plan:** `docs/30_planning/OOB_REWORK_MASTER_PLAN.md`
**Status:** Phases 1-6 complete. Phase 7 (calibration run) deferred.

---

## Executive Summary

Complete implementation of the OOB rework across 6 phases. Added brigade combat histories, a 3-tier decoration system, ~~faction personnel ceilings~~ (**removed in n369–n374** — replaced by emergent growth via tuned mobilization), VRS equipment decay, elite loan mechanics, formation lifecycle events, and war stories generation. 81 new tests, 0 regressions.

---

## Phase 1: Schema + Data (Complete)

### New Files
| File | Purpose |
|------|---------|
| `src/state/brigade_history.ts` | BrigadeHistory + BrigadeEngagement interfaces, helpers, constants |
| `src/state/decoration_types.ts` | DecorationTier, BrigadeDecoration, display names, helpers |
| `src/state/elite_loan_types.ts` | EliteLoanState interface, loan constants |
| `data/source/formation_lifecycle_events.json` | Lifecycle event definitions (territory-loss disbands) |

### Modified Files
| File | Change |
|------|--------|
| `src/state/game_state.ts` | +4 optional fields on FormationState: brigade_history, decorations, elite_loan_state, lifecycle_status, equipment_decay |
| `src/scenario/oob_loader.ts` | +4 OobBrigade fields: available_until, merged_into_id, is_elite, historical_decorations |
| `data/source/oob_brigades.json` | -13 duplicates, +16 new brigades, timing fixes, decoration data |

### OOB Data Changes
- **Removed 5 VRS duplicates:** rs_ekovii_brigade, rs_rogatica_brigade, rs_viegrad_brigade, vrs_1st_celinac, vrs_31st_mountain_storm
- **Removed 8 HVO duplicates:** hvo_eugen_kvaternik, hvo_kotromanic, hvo_travnik, hvo_stjepan_tomasevic, hvo_frankopan, hvo_zvijezda, hvo_bobovac, hvo_jure_francetic
- **Added 5 VRS brigades:** Ilidža, Ilijaš, Igman (SRK siege ring), 2nd Romanija, 2nd Herzegovina LI
- **Added 1 ARBiH brigade:** 504th Viteška Mountain (5th Corps, week 32)
- **Added 6 HVO regular brigades:** Rama, Ante Starčević, Zrinski, Hrvoje Vukčić, Posušje, 101st Bihać
- **Added 4 HVO Guard brigades (1994+):** 1st Guard ABB (w80), 2nd Guard Mech (w84), 3rd Guard Jastrebovi (w84), 4th Guard Sinovi Posavine (w88)
- **Timing fixes:** Guards Brigade (8→12), Black Swans (8→14)
- **is_elite added:** arbih_guards_brigade, rs_65th_protection_motorized_regiment
- **historical_decorations added:** 9 VRS, 33 ARBiH (from honor field conversion), 4 HVO Guard brigades
- **Orašje home_osid fix:** 3 HVO brigades now resolve correctly

---

## Phase 2: Brigade History + Recording (Complete)

### New Files
| File | Purpose |
|------|---------|
| `src/sim/combat/brigade_history_recorder.ts` | recordBrigadeEngagement(), attacker/defender helpers |
| `tests/brigade_history.test.ts` | 15 tests: tallies, streaks, FIFO cap, distributions |

### Modified Files
| File | Change |
|------|--------|
| `src/sim/combat/attack_resolution_osid.ts` | Wired recordAttackerEngagements + recordDefenderEngagement after each battle |
| `src/sim/turn_phases/war_phases.ts` | Added `init-brigade-history` pipeline step (after location backfill) |
| `vitest.config.ts` | Excluded brigade_history.test.ts from vitest (uses node:test) |

### Design Decisions
- FIFO engagement log capped at 200 entries (MAX_HISTORY_ENTRIES)
- Running tallies always accurate regardless of log eviction
- Both attacker and defender histories recorded per battle
- Concentrated assault casualties split evenly across attackers

---

## Phase 3: Decoration System (Complete)

### New Files
| File | Purpose |
|------|---------|
| `src/sim/combat/decoration_evaluator.ts` | Criteria-based decoration evaluation, combat bonuses |
| `tests/decoration_system.test.ts` | 17 tests: display names, bonuses, evaluation criteria, backward compat |

### Modified Files
| File | Change |
|------|--------|
| `src/sim/combat/combat_math.ts` | getHonorMult() now delegates to getDecorationAtkMult(); defense bonus uses getDecorationDefBonus() |
| `src/scenario/oob_early_war_entry.ts` | Converts OOB honor + historical_decorations → BrigadeDecoration[] at formation creation |
| `src/sim/recruitment_engine.ts` | Same conversion for player_choice recruitment path |
| `src/sim/turn_phases/war_phases.ts` | Added `evaluate-brigade-decorations` pipeline step (after attack resolution) |

### Three-Tier System
| Tier | ARBiH | VRS | HVO | Atk Bonus | Def Bonus |
|------|-------|-----|-----|-----------|-----------|
| tier_1 | Slavna | Medalja Petra Mrkonjića | Red N.Š. Zrinskog | +10% | +10% |
| tier_2 | Viteška | Orden Nemanjića | Red Kneza Domagoja | — | +15% |
| tier_3 | Orden Zlatni Ljiljan | Orden Miloša Obilića | Red Hrvatskog Trolista | +15% | +20% |

### Earned Criteria
- **Tier 1:** 5+ consecutive victories OR 8+ battles with >60% win rate
- **Tier 2:** Defense streak ≥ 3 (held through 3+ attacks)
- **Tier 3:** Both tier_1 AND tier_2 earned

### Backward Compatibility
- Legacy `honor` field still works — `getDecorationAtkMult()` falls back to honor when no decorations present
- Existing slavna/viteska brigades get historical_decorations at load time

---

## Phase 4: Troop Balancing + Lifecycle (Complete)

### New Files
| File | Purpose |
|------|---------|
| `src/sim/formation_lifecycle_events.ts` | Territory-based disband, merge, rename processing |
| `tests/troop_balance_lifecycle.test.ts` | 14 tests: ~~ceilings~~ (5 ceiling tests removed in n369–n374), VRS decay, lifecycle triggers |

### Modified Files
| File | Change |
|------|--------|
| `src/state/formation_constants.ts` | +8 constants: ~~faction ceilings~~ (**removed n369–n374**), VRS decay |
| `src/sim/formation_spawn.ts` | ~~getFactionTotalPersonnel(), getFactionCeilingMult()~~ (**removed n369–n374**) + reinforcement paths |
| `src/sim/turn_phases/war_phases.ts` | +2 pipeline steps: process-lifecycle-events, apply-vrs-equipment-decay |
| `src/sim/combat/combat_math.ts` | equipment_decay multiplier in getEquipmentRatio() |

### Faction Personnel Ceilings
| Faction | Historical Peak | Soft Cap (85%) | Hard Cap (95%) |
|---------|----------------|----------------|----------------|
| RBiH | 130,000 | 110,500 | 123,500 |
| RS | 185,000 | 157,250 | 175,750 |
| HRHB | 45,000 | 38,250 | 42,750 |

- Below soft cap: normal reinforcement
- Soft → hard: reinforcement × 0.25
- Above hard: no reinforcement

### VRS Equipment Decay
- Starts week 26 (embargo + stockpile depletion)
- Rate: 0.5% per week
- Floor: 60% effectiveness
- Applied via `equipment_decay` field on FormationState

### Lifecycle Events
- Territory-loss triggers: emergent (if player holds Derventa, HVO brigade survives)
- Week triggers: for merges/renames with known timing
- Personnel collapse: disbands below 100 personnel

---

## Phase 5: Elite Loan System (Complete)

### New Files
| File | Purpose |
|------|---------|
| `src/sim/combat/elite_loan.ts` | deployElite(), processEliteLoanLifecycle(), isEliteAvailable() |
| `tests/elite_loan.test.ts` | 20 tests: deployment, recall, cooldown, degradation |

### Modified Files
| File | Change |
|------|--------|
| `src/sim/turn_phases/war_phases.ts` | Added `elite-loan-lifecycle` pipeline step |

### Three Elite Formations
| Faction | Unit | Starting Decoration |
|---------|------|---------------------|
| RBiH | Guards Brigade | tier_2 (Viteška) |
| RS | 65th Protection Regiment | tier_3 (Obilić) |
| HRHB | 1st Guard "Ante Bruno Bušić" | tier_1 (Zrinski) |

### Lifecycle Constants
- Loan duration: 6 weeks
- Cooldown: 4 weeks
- Forced recall: 30% casualties OR morale < 35
- Permanent degradation: personnel < 50% of initial → loses elite status forever

---

## Phase 6: War Stories (Complete)

### New Files
| File | Purpose |
|------|---------|
| `src/sim/war_stories.ts` | classifyArc(), generateNarrative(), selectNotableMoments(), generateWarStories() |
| `tests/war_stories.test.ts` | 15 tests: arc classification, narrative generation, moment selection |

### Narrative Arcs
| Arc | Criteria | Tone |
|-----|----------|------|
| veteran | >65% win rate, >60% personnel retained | Backbone of the corps |
| bloodied | Heavy combat, heavy losses, still fighting | The cost of holding the line |
| shattered | <50% peak personnel, >100 casualties | A shadow, still in the line |
| risen | >150% cumulative casualties, rebuilt | Destroyed and reborn |
| destroyed | Formation ceased to exist | History sealed |
| garrison | ≤2 battles | Patience, not blood |

### Notable Moments (up to 3 per brigade)
- First battle location and turn
- Longest victory streak (≥4)
- Longest defense streak (≥3)
- Worst single-battle casualties (>50)
- Personnel nadir (<30% peak)
- Highest decoration earned

---

## New Pipeline Steps (7 total)

| Step | After | Purpose |
|------|-------|---------|
| `init-brigade-history` | phase-ii-location-osid-backfill | Initialize empty histories |
| `evaluate-brigade-decorations` | update-sector-offensive-results | Check decoration criteria |
| `process-lifecycle-events` | phase-ii-operation-storm-check | Territory-loss disbands |
| `apply-vrs-equipment-decay` | phase-ii-brigade-reinforcement | VRS degradation |
| `elite-loan-lifecycle` | apply-vrs-equipment-decay | Loan expiry/recall |

---

## Test Summary

| Test File | Tests | Status |
|-----------|-------|--------|
| brigade_history.test.ts | 15 | Pass |
| decoration_system.test.ts | 17 | Pass |
| troop_balance_lifecycle.test.ts | 14 | Pass |
| elite_loan.test.ts | 20 | Pass |
| war_stories.test.ts | 15 | Pass |
| **Total new** | **81** | **All pass** |

Vitest (existing): 220 pass, 1 skipped (unchanged)
Node tests: 129 pass, 2 fail (pre-existing calibration failures)

---

## Deferred / Not Implemented

1. **Phase 7 (Calibration Run):** Not executed — requires scenario run to validate OSID match rates. Should be done in next session.
2. **GUI Service Record panel:** FormationDetail and CorpsDetail React components not updated (cosmetic, no behavioral impact).
3. **Bot AI elite deployment logic:** Pipeline step exists but bot AI doesn't yet decide when to deploy/recall elites. Currently manual-only.
4. **War stories in final save JSON:** generateWarStories() available but not yet wired into scenario runner save output.
5. **104th→144th rename:** Not executed (existing entry name kept, can be renamed in OOB JSON).

---

## Design Principles Validated

1. **Determinism sacred:** All systems use sorted iteration, threshold-based decisions, no randomness
2. **Negative-sum thesis:** Brigade histories make losses personal; decorations make victories precious; elite degradation punishes overconfidence
3. **Organic doctrinal arcs:** VRS decay emerges from equipment_decay mechanic, ARBiH rise from earned decorations and reinforcement ramps
4. **Backward compatible:** All new fields optional, legacy honor still works, old saves load correctly
5. **81 new tests, 0 regressions**
