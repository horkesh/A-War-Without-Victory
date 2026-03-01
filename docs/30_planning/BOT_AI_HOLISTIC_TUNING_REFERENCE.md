# Bot AI & Starting Parameters — Holistic Tuning Reference

**Created:** 2026-02-27
**Purpose:** Single reference for the holistic bot AI + starting parameter tuning effort. Keeps essential facts, file locations, historical targets, and tuning decisions in one place so nothing is lost across context windows.

---

## Goal

Tune all three faction AIs and their starting parameters so that a 52-week scenario run produces historically plausible outcomes for the first year of the Bosnian War (April 1992 – April 1993).

### Historical Territory Targets (Year 1) — BB-Sourced
| Faction | Start (Apr 92) | Peak 1992 | End Year 1 | Current (n159) | Gap |
|---------|---------------|-----------|-------------|-----------------|-----|
| RS/VRS  | ~30-40% (offensives ongoing) | ~70% (Dec 92) | ~70% | 44.1% (332/753) | -26% |
| RBiH/ARBiH | ~10-15% (fragmented) | — | ~20-25% | 43.3% (326/753) | +18-23% |
| HRHB/HVO | ~8-10% (establishing) | ~10-12% | ~10-12% | 12.6% (95/753) | ~OK |

**CRITICAL CORRECTION**: RS reached ~70% by December 1992, not 60-65%. ARBiH held only 20-25%, not 30%. The sim's RS at 44% and RBiH at 43% are both massively wrong — RS is 26 points too low, RBiH is 18-23 points too high.

### Historical Force Strength (Year 1) — BB-Sourced
| Faction | Apr 92 | Jun 92 | Sep 92 | Dec 92 |
|---------|--------|--------|--------|--------|
| VRS | ~80,000 (JNA transition) | ~80,000 | ~90,000 | ~90-100,000 |
| ARBiH | ~60-80,000 (many unarmed) | growing | growing | ~110-130,000 |
| HVO | ~25-35,000 | ~35-40,000 | ~40-45,000 | ~40-45,000 |

**KEY INSIGHT**: VRS started at ~80k IMMEDIATELY (JNA handover, not gradual buildup). ARBiH had large numbers but "many unarmed or lightly armed." HVO was supplied by Croatia (no arms embargo).

### Historical Equipment Asymmetry — BB-Sourced
| Equipment | VRS | ARBiH | HVO |
|-----------|-----|-------|-----|
| Tanks | 300-400 (T-55, some T-72) | 30-50 (captured) | 50-80 (T-55, some M-84) |
| APCs/IFVs | 500-800 (M-80, BOV) | Minimal | 100-150 (M-80, BOV) |
| Artillery | Extensive (up to 203mm) | Minimal (mostly captured) | Moderate (Croatian supply) |
| Air defense | SA-2/3, ZSU-57, Praga | None effective | Some via Croatia |

**VRS had 10x the tanks and artillery of ARBiH. This is THE decisive asymmetry.**

### Historical Casualty Targets (Year 1)
- Total military KIA all sides: ~25-35k
- Current (n159): 20,175 attacker + 3,761 defender = ~24k total casualties (not all KIA)
- Siege of Sarajevo alone: ~10,000-12,000 civilian deaths over full war

### Historical Front Behavior
- Weeks 0-4: Rapid VRS expansion (JNA handover = day-one capability)
- Weeks 4-12: Drina sweep (Zvornik, Bratunac, Visegrad, Foca taken in first 2-4 weeks)
- Weeks 8-16: Corridor 92 (June-July 1992, existential for RS)
- Weeks 16-26: Krajina operations, Jajce capture (Oct 92)
- Weeks 26-30: Front stabilization — VRS outpaced logistics
- Weeks 30-52: Static with localized fighting; winter slowdown

### VRS Corps Strengths (BB data) — For bot AI corps weighting
| Corps | Apr 92 | Dec 92 | Assessment |
|-------|--------|--------|------------|
| 1st Krajina (Banja Luka) | 40,000 | 45,000 | STRONGEST. Best equipped. 100-150 tanks. |
| East Bosnian (Bijeljina) | 25,000 | 28,000 | Critical corridor security |
| Sarajevo-Romanija (Lukavica) | 20,000 | 22,000 | Static siege, extensive artillery |
| Drina (Vlasenica) | 15,000 | 18,000 | Siege specialists. Zvornik bde 4-4.5k alone |
| 2nd Krajina (Drvar) | 15,000 | 18,000 | WEAKEST. Chronically under-resourced |
| Herzegovina (Bileca) | 10,000 | 12,000 | Defensive posture, limited ops |

---

## Essential File Locations

### Knowledge Base (Historical)
- `docs/knowledge/VRS_ORDER_OF_BATTLE_MASTER.md` — VRS corps, equipment, timeline
- `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md` — ARBiH corps, equipment, timeline
- `docs/knowledge/HVO_ORDER_OF_BATTLE_MASTER.md` — HVO OZs, equipment, timeline
- `docs/knowledge/VRS_APPENDIX_G_FULL_BRIGADE_LIST.md` — Every VRS brigade
- `docs/knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md` — Every ARBiH brigade
- `docs/knowledge/HVO_FULL_BRIGADE_LIST.md` — Every HVO brigade
- `docs/knowledge/MISSING_HISTORICAL_UNITS.md` — Units not yet in game
- `docs/knowledge/SCENARIO_01_APRIL_1992.md` — April 1992 starting conditions
- `docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md` — September 1992 spec

### Engine Files (Tuning Surface)
- `src/sim/phase_ii/bot_strategy.ts` — Faction strategies, doctrine phases, standing orders, army operation priorities
- `src/sim/phase_ii/bot_corps_ai.ts` — Corps directive generation
- `src/sim/phase_ii/bot_brigade_ai_osid.ts` — Unified brigade execution
- `src/sim/phase_ii/combat_predictor.ts` — Read-only combat prediction (fog of war)
- `src/sim/phase_ii/attack_resolution_osid.ts` — Actual combat resolution
- `src/sim/phase_i/pool_population.ts` — Militia pool population, JNA inheritance
- `src/state/formation_constants.ts` — Formation caps, batch sizes
- `data/source/oob_brigades.json` — All 261 brigades with initial_personnel, initial_cohesion, equipment_class, available_from

### Scenario Runner
- `src/scenario/scenario_runner.ts` — Headless runner, emit saves/summary
- `npm run sim:scenario:run:default` — 52-week historical scenario

---

## Current Tuning Parameters (as of 2026-02-28)

### 40-week calibration scenario (apr1992_definitive_40w)

- **recruitment_mode:** `"player_choice"` (not `bottom_up`). In bottom_up mode, RS brigades are placed 1-per-HQ at init; `spreadBrigadesToFrontOsids` only moves over-stacked brigades, so 61/77 RS brigades stay at interior HQ OSIDs with no front contact and generate no attack orders. player_choice creates all OOB brigades at turn 0 and spreads them to front positions, enabling calibration of bot attack/territory metrics. bottom_up remains the mode for other scenarios (e.g. militia-emergence play). Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **40w baseline:** n246 with player_choice; RS=406, RBiH=265, HRHB=82; all 6 benchmarks pass. See same report for n246 metrics and tuning conclusions.

### Pool & Mobilization (pool_population.ts)
| Parameter | Value | Notes |
|-----------|-------|-------|
| POOL_SCALE_FACTOR | 65 | Scales militia_strength [0,100] to pool available |
| FACTION_POOL_SCALE.RBiH | 0.30 | Was 1.20->0.85->0.60->0.40->0.30. Restricts ARBiH manpower growth |
| FACTION_POOL_SCALE.RS | 0.55 | Was 1.00->0.70->0.55. Targets ~80-90k end state |
| FACTION_POOL_SCALE.HRHB | 1.60 | Unchanged. HVO at ~40-42k (on target) |
| RS_JNA_INHERITANCE_BONUS | 15,000 | One-time pool bonus at init |
| REINFORCEMENT_RATE | 0.01 | Displaced contribution rate per turn |
| DISPLACED_CONTRIBUTION_CAP | 500 | Cap per mun per turn from displaced |
| ELIGIBLE_POP_NORMALIZER | 50,000 | Pool weight divisor |
| RBIH_CROSS_ETHNIC_SHARE | 0.12 | Serbs/Croats contribute 12% to RBiH pool |

### Combat Constants (attack_resolution_osid.ts)
| Parameter | Value | Notes |
|-----------|-------|-------|
| MAX_ENTRENCHMENT | 6 | Tuned 8->6. Max bonus 1.21x |
| ENTRENCHMENT_PER_TURN | 0.035 | |
| MAX_RESILIENCE_STREAK | 4 | Tuned 6->4. Max bonus 1.10x |
| RESILIENCE_PER_DEFENSE | 0.025 | Tuned 0.05->0.025 |
| BASE_ATTACKER_LOSS_RATE | 0.03 | Tuned 0.04->0.06->0.03 |
| BASE_DEFENDER_LOSS_RATE | 0.015 | Half of attacker rate |
| MILITIA_DEFENSE_RATIO | 0.03 | Militia defense multiplier |
| LINKED_ZOC_READINESS | 0.50 | Tuned 0.70->0.35->0.50. ZoC projection strength |
| COORDINATION_PENALTY_2 | 0.9 | 2-brigade attack penalty |
| COORDINATION_PENALTY_3PLUS | 0.8 | 3+ brigade attack penalty |
| STACKING_DEFENDER_SUPPORT | 0.3 | Additional defender contribution |
| KIA_FRACTION | 0.25 | Of total casualties |
| WIA_FRACTION | 0.6 | Of total casualties |
| MIA_FRACTION | 0.15 | Of total casualties |
| EXPERIENCE_BASE | 0.6 | Green troops floor |
| EXPERIENCE_SCALE | 0.4 | Max exp bonus |

### Heavy Weapons System (attack_resolution_osid.ts)
| Parameter | Value | Notes |
|-----------|-------|-------|
| Heavy weapons cap | 1.5 | Was 0.6->1.5 (max multiplier 2.5x) |
| Heavy weapons divisor | 300 | Was 500->300. Faster ramp to cap |
| Artillery suppression cap | 0.7 | Max entrenchment reduction from heavy weapons |
| Tank firepower weight | 10x | Per effective tank |
| Artillery firepower weight | 8x | Per effective artillery piece |
| Typical VRS multiplier | ~2.5x | 40T + 30A, overwhelming fire superiority |
| Typical HVO multiplier | ~1.27x | 15T + 15A |
| Typical ARBiH multiplier | ~1.09x | 3T + 8A, minimal heavy weapons |

### Fog of War (combat_predictor.ts)
| Parameter | Value | Notes |
|-----------|-------|-------|
| FOG_DIRECT_VISIBILITY | 0.85 | Bot underestimates direct defenders by 15% |
| FOG_ZOC_VISIBILITY | 0.6 | Bot heavily underestimates ZoC defenders |
| FOG_AFTER_RETREAT_VISIBILITY | 0.95 | Fog lifts after failed attack |

### Brigade AI Scoring (bot_brigade_ai_osid.ts)
| Parameter | Value | Notes |
|-----------|-------|-------|
| Directive target bonus | +200 | Corps wants this attacked |
| No orders penalty | -200 | Brigade holds without directive |
| Non-priority penalty | -250 + aggression*300, floor -100 | Scales with aggression |
| Avoid zone penalty | -500 | Legacy avoid mechanic |
| Undefended target bonus | +100 | No brigade defending |
| Counter-attack bonus | +180 | Retake recently lost OSID |
| Weak defender bonus | +80 | Low cohesion or high casualty % |
| Overextension (3+) penalty | -150 | 3+ enemy neighbors at target |
| Overextension (2) penalty | -80 | 2 enemy neighbors |
| High casualty penalty | -150 | >20% attacker casualty expected |
| Frontier pressure bonus | +30 | No directive targets adjacent |
| Co-ethnic score range | -80 to +80 | Bipolar: 0% coethnic -> -80, 50%+ -> +80 |
| Aggression flat bonus | aggression * 120 | Only when aggression > 0 |
| Aggression multiplier | 1.0 + aggression | Applied to entire score |

### Doctrine Phases (bot_strategy.ts)
| Faction | Phase | Weeks | Stance | Attack Share | Aggression |
|---------|-------|-------|--------|-------------|------------|
| RS | Territorial Seizure | 0-30 | general_offensive | 0.55 | 0.35 |
| RS | Consolidation | 30-56 | balanced | 0.40 | 0.10 |
| RS | Strategic Hold | 56+ | general_defensive | 0.30 | -0.10 |
| RBiH | Survival Defense | 0-26 | general_defensive | 0.05 | -0.20 |
| RBiH | Corps Reorganization | 26-56 | general_defensive | 0.10 | -0.10 |
| RBiH | Active Defense | 56-80 | balanced | 0.25 | 0.05 |
| RBiH | Controlled Counteroffensive | 80+ | general_offensive | 0.35 | 0.15 |
| HRHB | Consolidate Herzegovina | 0-12 | balanced | 0.25 | 0.00 |
| HRHB | Lasva Offensive | 12-26 | balanced | 0.35 | 0.05 |
| HRHB | Washington Pivot | 26+ | balanced | 0.30 | 0.00 |

### Corps Stance Multipliers (attack_resolution_osid.ts)
| Stance | Attack Mult | Defense Mult |
|--------|------------|-------------|
| defensive | 0.5 | 1.2 |
| balanced | 1.0 | 1.0 |
| offensive | 1.15 | 0.8 |
| reorganize | 0.5 | 1.0 |

### Posture Multipliers (attack_resolution_osid.ts)
| Posture | Attack | Defense |
|---------|--------|---------|
| defend | 0 | 1.4 |
| hold | 0 | 1.2 |
| probe | 0.5 | 1.0 |
| attack | 1.0 | 0.8 |
| assault | 1.2 | 0.6 |
| elastic_defense | 0 | 1.2 |
| consolidation | 0.6 | 1.1 |

### Brigade Starting Stats (oob_brigades.json)
| Faction | Tier | Personnel | Cohesion |
|---------|------|-----------|----------|
| RS | Mechanized | 1500 | 75 |
| RS | Motorized | 1200 | 72 |
| RS | Strong Infantry | 1100 | 70 |
| RS | Standard Infantry | 900 | 68 |
| RS | Weak/Light | 800 | 62 |
| RBiH | Tier 0 (immediate) | 500 | 45 |
| RBiH | Tier 1 (early) | 450 | 42 |
| RBiH | Tier 2 (corps reorg) | 400 | 40 |
| RBiH | Tier 3 (late) | 350 | 38 |
| HRHB | SE Herzegovina | 950 | 64 |
| HRHB | Central Bosnia | 650 | 52 |

---

## Historical Force Data (from BB knowledge base)

### VRS (Vojska Republike Srpske)
- **Formed:** 12 May 1992 from JNA 2nd Military District
- **Peak strength:** ~80,000 (by late 1992)
- **JNA inheritance:** 330+ tanks, 800+ artillery, 40+ APCs, full logistics
- **Corps:** 6 (1st Krajina, 2nd Krajina, East Bosnia, Sarajevo-Romanija, Drina, Herzegovina)
- **Key advantage:** Heavy equipment, trained officer corps, JNA doctrine
- **Key weakness:** Manpower ceiling (Serb population ~31% of BiH), long front lines

### ARBiH (Armija Republike Bosne i Hercegovine)
- **Formed:** 15 April 1992 from Territorial Defense + police + volunteers
- **Initial strength:** ~40,000 (chaotic, poorly armed)
- **Peak strength (year 1):** ~100,000+ (by late 1992, but poorly equipped)
- **Equipment:** ~40 tanks, ~100 artillery (mostly captured/smuggled), small arms dominant
- **Corps:** 5 (1st Sarajevo, 2nd Tuzla, 3rd Zenica, 4th Mostar, 5th Bihac)
- **Key advantage:** Numerical superiority (Bosniak plurality ~44%), urban defense, motivation
- **Key weakness:** No heavy weapons, poor C2, no unified command until mid-1993, enclaves

### HVO (Hrvatsko Vijeće Obrane)
- **Formed:** 8 April 1992 from Croatian community defense
- **Strength:** ~25,000-30,000
- **Equipment:** Croatian Army supply pipeline, modest heavy weapons (~40 tanks, 100 artillery)
- **Organization:** 4 Operational Zones (SE Herzegovina, Central Bosnia, NW Bosnia/Posavina, Tomislavgrad)
- **Key advantage:** Croatian Army backing, concentrated in defensible territory
- **Key weakness:** Smallest force, two-front war risk (vs RS AND RBiH after 1993)

---

## Key Gaps & Tuning Priorities

### GAP 1: RS territory (44% vs 70%) — CRITICAL, 26-point gap
The single biggest problem. RS should reach ~70% by December 1992. Causes:
- **Init control too low**: RS starts at 35%. Historical: 30-40% (Apr 92) but VRS inherited JNA positions = immediate control. By May 12 (VRS formation), should already be ~40-50%.
- **ARBiH fights back too effectively**: RBiH holding 43% means ARBiH brigades are holding ground that historically they couldn't. ARBiH was "many unarmed or lightly armed" — they had 60-80k bodies but NO heavy weapons.
- **No rear-garrison**: Captured territory can be counter-captured immediately.
- **Equipment asymmetry under-modeled**: VRS had 10x tanks/artillery. Our heavy weapons multiplier caps at 1.6x — should the asymmetry be sharper?
- **ARBiH starting personnel too high**: We give 500/brigade × ~100 brigades = ~50k armed. Historical: 60-80k total but "many unarmed." Effective fighters maybe 30-40k.
- **ARBiH starting cohesion too high**: 45 for tier-0. These were disorganized volunteers with hunting rifles, not combat-effective units. Should be 25-35.

### GAP 2: ARBiH overperformance (43% vs 20-25%) — 18-23 point gap
ARBiH should LOSE territory massively in year 1, from ~15% initial to ~20-25%. Instead they're GAINING.
- ARBiH brigades are too effective in combat vs VRS
- ARBiH defensive multipliers (posture, entrenchment) compensate for equipment gap
- Need to model: ARBiH units that can't attack at all (no ammo, 2-3 rounds/rifle)
- Historical: ARBiH barely held Sarajevo, Tuzla, Bihac. Everything else was fluid.

### GAP 3: HRHB behavior (~OK but check)
12.6% vs historical 10-12%. Close enough. But check:
- HVO should lose Posavina early (Bosanski Brod, Derventa, Odzak by Oct 92)
- Lasva Valley fighting is 1993 (bilateral war), not relevant to year 1

### GAP 4: Front stabilization timing
Should happen ~week 26-30, after VRS logistics outpace advances.

### Root Cause Analysis — Multiple Compounding Errors

**A. Init Control Errors (BB extractor findings)**
The apr1992 init file has CRITICAL municipality misassignments:
- `prijedor` → RBiH in init, should be RS (VRS from day 1, concentration camps)
- `sanski_most` → RBiH in init, should be RS (VRS secured May-June)
- `ilidza` → RBiH in init, should be RS (VRS siege ring, Lukavica adjacent)
- `modrica` → HRHB in init, should be RS (VRS northern Posavina)
- `bosanski_samac` → HRHB in init, should be RS (VRS captured early April)
These 5 municipalities alone represent significant territory. Fixing them raises RS init from ~35% toward ~40-42%.

**B. Combat Effectiveness Ratio Too Low**
Historical VRS:ARBiH effectiveness ratio in April-June 1992:
- Open terrain, offensive: 1 VRS brigade = 4-5 ARBiH brigades
- Mixed terrain: 1 VRS = 3-4 ARBiH
- Urban defense: 1 VRS = 1.5-2.5 ARBiH
Our heavy weapons multiplier (max 1.6x) is WAY too small. VRS had 300-400 tanks vs ARBiH's ZERO. The sim treats a VRS mechanized brigade as only 1.6x more powerful than an ARBiH brigade with hunting rifles. Should be 3-5x.

**C. ARBiH Starting Stats Too High**
- Current: 500 personnel / 45 cohesion for tier-0 brigades
- Historical: "Many unarmed or lightly armed" — 30-40% were combat-capable
- Proposed: Drop tier-0 to 300-350 personnel, 25-35 cohesion
- "One rifle per 3-5 men" → equipment effectiveness should be near-zero for early ARBiH

**D. ARBiH Counter-Attacks Too Effective**
- 25 RBiH counter-captures in n159 erode VRS gains
- Historical: ARBiH conducted ZERO offensive operations in 1992
- Fix: Make RBiH aggression even more negative in year 1; possibly lock out offensive orders entirely weeks 0-26

**E. No "Momentum" / "Panic" Mechanic**
VRS conquered the Drina valley at ~1-2 municipalities/week. This requires a mechanism where successful VRS attacks cause adjacent defenders to collapse or flee. Currently, each OSID defends independently — there's no cascade effect from losing neighbors.

---

## Historical Combat Effectiveness Ratios (Historian Findings)

| Context | VRS : ARBiH ratio | Notes |
|---------|-------------------|-------|
| Open terrain, Apr-Jun 92 | 4-5 : 1 | VRS combined arms vs unarmed volunteers |
| Mixed terrain, Apr-Jun 92 | 3-4 : 1 | |
| Urban defense, Apr-Jun 92 | 1.5-2.5 : 1 | ARBiH morale + terrain compensates partially |
| Open terrain, Sep-Dec 92 | 2-3 : 1 | ARBiH improving, captured weapons |
| Urban defense, Sep-Dec 92 | 1-1.5 : 1 | ARBiH nearly parity in urban defense |
| Open terrain, mid-1993 | 1.5-2 : 1 | ARBiH professionalized |
| Open terrain, 1994+ | 1-1.5 : 1 | Near parity with Federation support |

**VRS vs HVO ratio:** VRS was roughly 2-3x HVO in heavy equipment, but HVO had Croatian Army backing. Effective ratio ~1.5-2:1 in VRS favor.

---

## Week-by-Week Historical Map Pattern (Must-Match Targets)

| Week | What MUST happen |
|------|-----------------|
| 1-2 | VRS seizes Bijeljina, Zvornik, Vlasenica, Bratunac. Sarajevo siege forming. |
| 3-4 | Visegrad, Foca fall. Rogatica secured. Sarajevo ring closing. |
| 5-6 | Sarajevo siege formal. NW BiH (1KK region) firmly RS. Prijedor secured. |
| 7-8 | Drina nearly complete. Only Srebrenica/Gorazde/Zepa pockets remain. |
| 9-12 | Corridor 92 begins. Heavy fighting Brcko/Derventa/Odzak. |
| 13-16 | Corridor 92 concludes. Derventa/Odzak fall. Only Orasje pocket remains. |
| 17-24 | Front stabilization. Siege warfare pattern. Both sides digging in. |
| 25-28 | Jajce falls (~week 28). Last major VRS gain. |
| 29-52 | Frozen front. No significant changes. VRS at ~70%. |

**ESSENTIAL INVARIANTS:**
1. Srebrenica, Gorazde, Zepa, Bihac MUST survive year 1
2. Sapna NEVER falls (validation anchor across all 8 scenarios)
3. Sarajevo, Tuzla, Zenica stay ARBiH throughout
4. ARBiH conducts ZERO offensive operations in 1992
5. VRS territorial explosion stops by week 30
6. HVO territory stays ~10-12% throughout
7. Posavina corridor secured by RS by week 16
8. VRS at ~70% by week 30-36, then frozen

---

## Init Control Corrections Needed (apr1992 file)

These municipalities are wrong in `municipalities_1990_initial_political_controllers_apr1992.json`:

| mun1990_id | Current | Correct | Evidence |
|------------|---------|---------|----------|
| `prijedor` | RBiH | **RS** | VRS controlled from day 1, concentration camps (Omarska, Keraterm, Trnopolje) |
| `sanski_most` | RBiH | **RS** | VRS majority control, ethnic cleansing by May-June 1992 |
| `ilidza` | RBiH | **RS** | Part of Sarajevo siege ring, VRS-controlled suburb |
| `modrica` | HRHB | **RS** | VRS northern Posavina, logistics node |
| `bosanski_samac` | HRHB | **RS** | VRS captured early April 1992, eastern corridor anchor |

Also verify these are correct in apr1992 (they were wrong in default but fixed in apr1992):
- `bratunac` → RS (correct in apr1992)
- `vlasenica` → RS (correct in apr1992)
- `foca` → RS (correct in apr1992)
- `visegrad` → RS (correct in apr1992)
- `rogatica` → RS (correct in apr1992)

---

## Proposed Tuning Changes (Ranked by Impact)

### TIER 1: Init Control Fixes (biggest single impact)
Fix the 5 misassigned municipalities in apr1992 init. This alone could raise RS init from ~35% to ~40-42%.

### TIER 2: ARBiH Starting Stats (reduce combat capability)
- Tier-0 brigades: personnel 500→350, cohesion 45→30
- Tier-1 brigades: personnel 450→300, cohesion 42→28
- Tier-2 brigades: personnel 400→250, cohesion 40→25
- Tier-3 brigades: personnel 350→200, cohesion 38→22
- Rationale: "Many unarmed or lightly armed" — only 30-40% combat-capable in April 1992

### TIER 3: Equipment Effectiveness Gap (increase VRS advantage)
The heavy weapons offensive multiplier caps at 1.6x. For VRS with 40 tanks + 30 artillery, this should be much higher.
- Option A: Raise cap from 0.6 to 1.2 (max multiplier 2.2x)
- Option B: Add a faction-level "equipment quality" modifier that applies on top
- Option C: Lower the reference divisor (500→250) so VRS reaches cap more easily
- Historical target: VRS brigade should be 3-5x an ARBiH brigade in power

### TIER 4: ARBiH Aggression Lock (prevent counter-attacks)
- Weeks 0-26: max_attack_share 0.05→0.00, aggression -0.2→-0.5
- Weeks 26-52: max_attack_share 0.10→0.03, aggression -0.1→-0.3
- This matches "ARBiH conducted ZERO offensive operations in 1992"

### TIER 5: VRS Early Offensive Boost
- RS early-war aggression: 0.35→0.50
- RS max_attack_share_override: 0.55→0.65
- RS operations weight for Drina/Corridor: already high (100-150), may need 200+

### TIER 6: Enclave Resilience (ensure survival)
- Srebrenica, Gorazde, Zepa, Bihac MUST survive
- Check enclave_resilience.ts gives sufficient bonus (currently max +15%)
- Urban defense multiplier for Sarajevo may need increase
- With avoid lists removed, enclaves must survive via mechanics alone

### TIER 7: Remove Artificial avoid_municipalities (DESIGN PRINCIPLE)
**Core principle: emergent behavior from correct mechanics, not scripted avoidance.**

Currently, bot_strategy.ts has hardcoded avoid lists:
- Drina Sweep avoids srebrenica, gorazde, zepa
- Western Krajina avoids livno, duvno, posusje, grude, ljubuski, siroki_brijeg, citluk, capljina, stolac, neum, mostar
- Herzegovina Hold avoids the same 11 HVO municipalities
- Sarajevo Siege avoids centar_sarajevo, stari_grad, novo_sarajevo, novi_grad
- 2KK Consolidation avoids the same 11 HVO municipalities

**Why RS shouldn't attack Livno — emergently:**
- No Serb population (99% Croat) → co-ethnic score = 0
- HVO brigade defending → combat predictor says stalemate/repulsed
- Not an offensive target → -150 non-priority penalty
- Far from RS corps AOR → no adjacent RS brigades to attack from

**Why enclaves survive — emergently:**
- Enclave resilience bonus (+15% at max)
- Terrain multipliers (mountain)
- Urban defense multiplier (1.5x for Sarajevo)
- Last Stand snap event (1.5x when no retreat)
- Motivated defenders (high co-ethnic bonus for defenders)

**What to change:**
1. Remove all avoid_municipalities from army priorities
2. Add NEGATIVE co-ethnic score for attacking areas with NO co-ethnic population
   - Currently: 0-80 bonus for co-ethnic areas
   - Proposed: -80 to +80 scale. Attacking 99% Croat area as RS = -80 penalty.
   - This naturally deters cross-ethnic attacks without hardcoding
3. Ensure enclave resilience + terrain + urban mult is strong enough to prevent falls
4. The Sarajevo avoids are the most debatable — VRS DID try to take inner Sarajevo
   but failed due to urban combat. Remove and let combat model handle it.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-27 | Start holistic tuning session | RS at 44% vs 70% target, RBiH at 43% vs 20-25% target |
| 2026-02-27 | Historical target updated: RS 70% not 60% | BB sources consistently say ~70% by Dec 1992 |
| 2026-02-27 | Identified 5 init control errors | prijedor, sanski_most, ilidza, modrica, bosanski_samac |
| 2026-02-27 | ARBiH starting stats too high | Historical: many unarmed, 30-40% combat-capable |
| 2026-02-27 | Heavy weapons multiplier too low | Max 1.6x vs historical 3-5x effectiveness ratio |
| 2026-02-27 | Init control: do NOT change | User directive: OSID ethnic majority drives starting positions. VRS conquests must emerge via gameplay. |
| 2026-02-27 | Bipolar co-ethnic scoring (-80..+80) | Replaces avoid_municipalities. 0% coethnic -> -80 penalty, 50%+ -> +80 bonus. Livno (3% Serb) -> -70. |
| 2026-02-27 | Removed all 6 avoid_municipalities | Drina Sweep/Hold, Western Krajina, Sarajevo Siege, Herzegovina Hold, 2KK Consolidation |
| 2026-02-27 | Brigade conservatism added | -200 "no orders" penalty, -250 non-priority (was -150). Brigades hold unless corps directs. |
| 2026-02-27 | Gorazde connected via Trnovo until 1993 | Mountain road corridor. Trnovo = RBiH at init. VRS SRK targets Trnovo -> corridor cut naturally. |
| 2026-02-27 | ARBiH passivity = emergent | Not a rule. Low stats, equipment prevent offensives. Enclaves (Oric, Gorazde) keep stats for local ops. |
| 2026-02-27 | Heavy weapons cap 1.6x->2.5x | Divisor 500->300. VRS mechanized (30T+20A) now 2.5x. ARBiH light infantry still 1.03x. |
| 2026-02-27 | FACTION_POOL_SCALE.RBiH 1.20->0.85 | Historical: ARBiH couldn't convert population into combat power until mid-1993 professionalization. |
| 2026-02-27 | ARBiH stats reduced (57 non-exception brigades) | 20% personnel cut, -10 cohesion. Exceptions: enclaves, 1K Sarajevo, 2nd Corps. Init total 65.9k->59.6k. |
| 2026-02-27 | Population-scaled militia defense | Per-OSID population from 1991 census replaces hardcoded pop=5000. Large cities now harder to capture. |
| 2026-02-27 | Brigade spawn fixes (7 brigades) | HRHB 108th brcko->orasje, RS han_pijesak spelling, RS 2nd Sarajevo duvno->pale, HRHB Gradacac/Tuzla->odzak, HVO JF zenica->vitez |
| 2026-02-27 | Zvornik rs_1st home_osid fix (kozluk_2) | Fixed n210->n211: Zvornik anchor now passes. RS 1st Zvornik Brigade starts at correct OSID. |
| 2026-02-28 | FACTION_POOL_SCALE.RS 1.00->0.55 | n212: RS end-state 116k (target ~90-100k). Reduced pool generation to constrain growth. |
| 2026-02-28 | FACTION_POOL_SCALE.RBiH 0.85->0.30 | n212->n213: Progressive reduction. At 0.40: 139k end. At 0.30: 128k end. Still 20% over target. |
| 2026-02-28 | 27 territorial_defense formations removed | n213: Cleaned up FormationKind. TD units were low-value formations cluttering the OOB. |
| 2026-02-28 | Gorazde brigade boost (1100/72) | Had no effect on territory. Gorazde still loses 12/20 OSIDs. Brigade boost insufficient without systemic enclave mechanics. |
| 2026-02-28 | Displacement routing split (N/S Drina) | n212: Drina valley displacement routes split north/south to prevent concentration. |
| 2026-02-28 | LINKED_ZOC_READINESS 0.35->0.50 | n210: At 0.35, enclave perimeters too weak (5 Srebrenica brigades can't cover 14 OSIDs). At 0.50, linked front credible but concentrated attacks still break through. |
| 2026-02-28 | RS starts at 35% OSID ethnic majority | Design decision: init control = ethnic majority. RS must reach 65-70% via gameplay. This is working (65.9% achieved by n213). |

### Technical learnings (Phase G calibration 2026-02-28)

- **Attack share step function:** For a corps with N brigades, `attack_slots = max(1, floor(N × share))`. Tuning within a step (e.g. 0.08→0.10) can have zero effect; e.g. for 1KK (26 brigades), 0.08 and 0.10 both yield 2 slots. Document step thresholds when tuning; jumping a step (e.g. 0.08→0.12) may add a marginal third slot that reduces territory efficiency.
- **Aggression as quality filter:** `aggression_modifier` (e.g. -0.05) acts as a quality threshold; when attack slots are limited, the quality filter is more valuable than extra slots. Removing it allows marginal attacks that can reduce net territory.
- **Phase timing interdependence:** `RS_EARLY_WAR_END_WEEK` (e.g. 20) is a coordinated design point with RBiH doctrine phase at week 20. Changing RS timing alone creates asymmetric overlaps (e.g. RS offensive + RBiH more-active phase simultaneously), which can worsen RS territory. Keep RS_EARLY_WAR_END_WEEK=20 unless RBiH doctrine boundaries are adjusted in sync.
- **bottom_up vs player_choice:** bottom_up places RS 1-per-HQ → no spreading → no front contact → no attack orders; use player_choice for calibration scenarios that need front-loaded brigades and attack order validation.

---

## Run Results Tracker

| Run | RS% | RBiH% | HRHB% | Total Orders | Casualties (A+D) | RS Troops | RBiH Troops | HRHB Troops | Benchmarks | Notes |
|-----|-----|-------|-------|--------------|-------------------|-----------|-------------|-------------|------------|-------|
| n159 | 44.1% (332) | 43.3% (326) | 12.6% (95) | 221 | ~24k | — | — | — | — | Baseline (session 4) |
| n210 | 65.1% (490) | 25.4% (191) | 9.6% (72) | 337 | 17.3k (14.5+2.8) | 121k (68 bde) | 156k (66 bde) | 41k (22 bde) | 4/6 | Zvornik anchor FAIL, RS early_expansion FAIL |
| n211 | 65.7% (495) | 24.7% (186) | 9.6% (72) | 340 | 17.5k (14.6+2.9) | 123k (68 bde) | 152k (67 bde) | 41k (22 bde) | 6/6 | First all-pass. Zvornik fixed |
| n212 | 65.5% (493) | 24.6% (185) | 10.0% (75) | 322 | 15.3k (12.8+2.5) | 116k (63 bde) | 139k (60 bde) | 42k (22 bde) | 6/6 | Pool scale RS 0.70->0.55, RBiH 0.60->0.40 |
| n213 | 65.9% (496) | 24.6% (185) | 9.6% (72) | 340 | 16.3k (13.9+2.5) | 109k (59 bde) | 128k (51 bde) | 40k (22 bde) | 6/6 | Pool scale RBiH 0.40->0.30. 27 TD formations removed |
| n214 | 65.9% (496) | 24.6% (185) | 9.6% (72) | 339 | 16.4k (13.9+2.5) | 109k (59 bde) | 129k (51 bde) | 40k (22 bde) | 6/6 | Near-identical to n213 (deterministic stable) |

### Run Detail: n210
- **Hash:** 460dec87b781efd0
- **Anchors:** 6/8 passed. Zvornik=RBiH (FAIL, expected RS). S163520=null (FAIL).
- **Benchmarks:** RS early_territorial_expansion FAIL, RS consolidate_gains FAIL.
- **Init personnel:** RS 66.9k (65 bde), RBiH 26.3k (47 bde), HRHB 19.0k (23 bde)
- **Attack freeze:** Longest gap weeks 35-40 (6 weeks). Orders taper from 22-week burst.
- **Key changes:** Bipolar co-ethnic scoring, removed all avoid_municipalities, LINKED_ZOC_READINESS 0.35->0.50, heavy weapons cap 0.6->1.5 (divisor 500->300), ARBiH stats -20% personnel/-10 cohesion, FACTION_POOL_SCALE.RBiH 1.20->0.85

### Run Detail: n211
- **Hash:** 923ab38d80a2b4ab
- **Anchors:** 7/8 passed. S163520=null (FAIL, persistent). Zvornik=RS (pass).
- **Benchmarks:** ALL 6 PASS. First complete pass.
- **Init personnel:** RS 66.9k (65 bde), RBiH 26.3k (47 bde), HRHB 19.0k (23 bde)
- **Attack freeze:** Same as n210 (weeks 35-40). Deterministic twin.
- **Key changes:** Zvornik rs_1st home_osid fix (kozluk_2)

### Run Detail: n212
- **Hash:** 2e1c34fb16d5069c
- **Anchors:** 7/8. S163520=null (FAIL).
- **Benchmarks:** 6/6 pass.
- **Init personnel:** RS 62.9k (61 bde), RBiH 20.1k (36 bde), HRHB 19.0k (23 bde)
- **Attack freeze:** Longest gap weeks 32-36 (5 weeks). Better distribution.
- **Key changes:** FACTION_POOL_SCALE RS 0.70->0.55, RBiH 0.60->0.40. Gorazde brigade boost (1100/72) — no territory effect. Displacement routing split (North/South Drina).

### Run Detail: n213
- **Hash:** deb564a0080776d2
- **Anchors:** 7/8. S163520=null (FAIL).
- **Benchmarks:** 6/6 pass.
- **Init personnel:** RS 58.7k (57 bde), RBiH 16.9k (30 bde), HRHB 19.0k (23 bde)
- **Attack freeze:** Longest gap weeks 37-47 (11 weeks). Attack taper starts week 20.
- **Key changes:** FACTION_POOL_SCALE RBiH 0.40->0.30. 27 territorial_defense formations removed from oob_brigades.json. Civilian casualties: HRHB 3.6k killed + 10.4k fled, RBiH 9.3k killed.

### Run Detail: n214
- **Hash:** 1beda1cda4f01ea5
- **Anchors:** 7/8. S163520=null (FAIL).
- **Benchmarks:** 6/6 pass.
- **Init personnel:** RS 58.7k (57 bde), RBiH 17.5k (30 bde), HRHB 19.0k (23 bde)
- **Near-identical to n213.** RS% 65.9%, RBiH% 24.6%, HRHB% 9.6%. Only minor variance in RBiH starting personnel (17,530 vs 16,930) and tiny differences in casualties.
- **Attack distribution:** Orders per faction — RS ~338, RBiH 2, HRHB 1. ARBiH effectively passive (historical).

### Troop Strength Trend (n210 -> n214)
| Run | RS Init | RS End | RBiH Init | RBiH End | HRHB Init | HRHB End | Total End |
|-----|---------|--------|-----------|----------|-----------|----------|-----------|
| n210 | 66.9k | 121.2k | 26.3k | 156.0k | 19.0k | 41.3k | 318.5k |
| n211 | 66.9k | 122.5k | 26.3k | 151.6k | 19.0k | 40.9k | 315.0k |
| n212 | 62.9k | 116.3k | 20.1k | 139.0k | 19.0k | 42.0k | 297.3k |
| n213 | 58.7k | 109.3k | 16.9k | 128.3k | 19.0k | 40.2k | 277.8k |
| n214 | 58.7k | 109.4k | 17.5k | 128.8k | 19.0k | 40.2k | 278.4k |
| **Target** | **~80k** | **~90-100k** | **~40k** | **~100-110k** | **~25-30k** | **~40-45k** | **~230-255k** |

**Assessment:** Total troop strength at 278k is 20-30k over the ~250k ceiling. RS (109k vs ~90-100k target) is 10-20% high. RBiH (129k vs ~100-110k) is 15-20% high. HRHB (40k) is on target. Pool scale can't go lower without destroying init brigades — need alternative approach (attrition increase, supply drain, etc).

---

## Identified Issues & Next Steps (as of 2026-02-28)

### Known structural gaps (Phase G calibration 2026-02-28)

- **HRHB Northwest Bosnia OOB:** `hvo_northwest_bosnia` has 0 brigades in OOB. Posavina (Orasje, Bosanski Brod, Derventa, Odžak) is undefended by HRHB. Fix: assign Posavina brigades (e.g. hrhb_jure_franceti_brigade, hrhb_kralj_petar_kreimir_iv_brigade) to `hvo_northwest_bosnia` in OOB. Expected: HRHB 82→85–88 OSIDs.
- **Vozuca wrong flip:** `op:zavidovici:vozuca_2` flips RBiH in sim but historically was VRS-held (BB1 p499, BB2 p507). Fix options: osid_control_overrides (init only), stronger RS East Bosnian Corps priority for Zavidovici, or avoid_municipalities for RBiH 2nd Corps targeting Zavidovici.

### ISSUE 1: Troop Strength 20-30k Over Target [MEDIUM]
**Status:** Active. Pool scale at floor for RS (0.55) and RBiH (0.30).
- RBiH 129k vs 100-110k target. RS 109k vs 90-100k target. HRHB on target.
- Pool scale can't go lower without destroying init brigades (not enough personnel to fill batch size).
- **Potential fixes:**
  - Increase BASE_ATTACKER_LOSS_RATE / BASE_DEFENDER_LOSS_RATE to burn more personnel per battle
  - Add ongoing attrition from supply strain (garrison drain, desertion)
  - Reduce REINFORCEMENT_RATE from displacement further
  - Cap total faction personnel via a "mobilization ceiling" mechanic
  - Winter effects: reduce reinforcement rate in winter months (weeks 30-45)

### ISSUE 2: Casualties at 16.4k vs 25-35k Target [MEDIUM]
**Status:** Active since n213.
- 13.9k attacker + 2.5k defender = 16.4k total. Target is 25-35k.
- BASE_ATTACKER_LOSS_RATE was tuned 0.06->0.03 to prevent excessive attrition, but went too low.
- Current: ~100 casualties per battle average (337 orders, 16.4k casualties).
- **Potential fixes:**
  - Raise BASE_ATTACKER_LOSS_RATE from 0.03 to 0.04-0.05
  - Raise BASE_DEFENDER_LOSS_RATE from 0.015 to 0.02-0.025
  - Both would also help with ISSUE 1 (troop strength) by burning more personnel
  - Siege casualties: Sarajevo siege should generate steady attritional casualties even without assaults

### ISSUE 3: Attack Taper / Freeze Timing [LOW-MEDIUM]
**Status:** Active. Attack intensity drops too early.
- n213: Orders drop from 40/week (week 1) to 2/week by week 20, then freeze weeks 37-47.
- Historical: VRS offensive should continue through week 28-30 (Jajce falls week ~28).
- n210/n211: Better pattern (freeze weeks 35-40). n213/n214: worse (freeze starts ~week 22).
- **Root cause:** All easy targets captured by week 18-20. Remaining targets are entrenched. Brigades run out of directive targets with positive scores.
- **Potential fixes:**
  - Lower non-priority penalty for RS during general_offensive phase (currently -145 at aggression 0.35)
  - Increase aggression_modifier for RS weeks 20-30 (currently 0.35 flat)
  - Add "exploitation" targets: any adjacent undefended enemy OSID should be viable
  - ZoC-lock calibration: entrenched ZoC defenders may be too strong too early

### ISSUE 4: computeSectorThreat() Scope [FIXED]
**Status:** Fixed. Now counts enemies at corps positions AND adjacent OSIDs.
- Was only counting co-located enemies (useless since enemies are on adjacent OSIDs).
- Fixed by expanding threat zone to include all adjacent OSIDs of corps brigade positions.
- Location: `src/sim/phase_ii/bot_corps_ai.ts` lines 228-275.

### ISSUE 5: getBrigadePowerAtOsid() Returns [FIXED]
**Status:** Fixed. Now returns both `power` (strongest) and `totalPower` (all brigades).
- Was returning only the strongest brigade. Multiple brigades at same OSID went unaccounted.
- Fixed: returns `{ power, totalPower, brigadeId, formation, brigadeCount }`.
- Location: `src/sim/phase_ii/osid_graph_analysis.ts` lines 75-100.

### ISSUE 6: Gorazde Enclave Vulnerability [LOW]
**Status:** Active. Gorazde loses 12/20 OSIDs. Acceptable but could improve.
- Gorazde brigade boost (1100 personnel, 72 cohesion) had no effect on final territory control.
- Problem is ZoC projection: 1 brigade can't cover 20 OSIDs, even at LINKED_ZOC_READINESS 0.50.
- Historically, Gorazde survived due to terrain (extreme mountain), UNPROFOR presence, and international pressure.
- **Potential fixes:**
  - Add UNPROFOR safe area mechanic (snap event blocking final assault)
  - Increase terrain multiplier for Gorazde-specific mountain OSIDs
  - Enclave resilience bonus could be higher for Gorazde specifically

### ISSUE 7: Winter Effects System [NOT IMPLEMENTED]
**Status:** Not implemented. Would improve historical fidelity.
- Historical: Winter 1992-93 (weeks 30-45) caused significant slowdown. Logistics collapsed, roads impassable.
- VRS front stabilized partly due to weather, not just logistics/manpower.
- **Proposed:**
  - Reduce attack effectiveness weeks 30-45 (winter penalty 0.7-0.8x)
  - Reduce reinforcement/displacement rate in winter
  - Increase supply strain during winter months
  - Synergizes with ISSUE 3 (natural attack freeze timing)

### ISSUE 8: ZoC-Lock Calibration [LOW-MEDIUM]
**Status:** Active. ZoC defenders may solidify too quickly.
- LINKED_ZOC_READINESS at 0.50 means entrenched front lines project significant resistance.
- After week 15-18, most front-line brigades have full entrenchment (6 turns at 0.035/turn).
- At full entrenchment + linked ZoC (0.50), even VRS heavy weapons (2.5x multiplier) may be insufficient for solo brigade breakthroughs.
- **This directly causes ISSUE 3** (attack freeze). Once all front-line brigades are entrenched, no single RS brigade can break through.
- **Potential fixes:**
  - Reduce LINKED_ZOC_READINESS slightly (0.50 -> 0.45)
  - Increase heavy weapons offensive multiplier further for RS
  - Add corps-level artillery concentration mechanic (multiple brigades share fire support)
  - Reduce entrenchment rate or cap for ZoC defenders (they're not physically in the OSID)

### ISSUE 9: S163520 Anchor Persistent Failure [LOW]
**Status:** Active across all runs (n210-n214). S163520 controller is null, expected RBiH.
- This is a settlement-level anchor, not municipality. The OSID may not exist in the operational map.
- Not blocking — all municipality anchors pass from n211 onward.
- **Fix:** Investigate whether S163520 is mapped to an OSID. May need to update anchor_checks.

---

## Calibration Status Summary (2026-02-28)

### What's Working Well
- **Territory control:** RS 65.9% (target 65-70%) -- within range
- **RBiH territory:** 24.6% (target 20-25%) -- within range
- **HRHB territory:** 9.6% (target 10-12%) -- within range
- **All 6 bot benchmarks passing** since n211
- **Enclave survival:** Srebrenica, Gorazde, Zepa, Bihac all survive year 1
- **Sarajevo, Tuzla, Zenica remain RBiH** throughout
- **ARBiH effectively passive:** Only 2 attack orders total (historical: zero offensives in 1992)
- **Co-ethnic scoring emergent behavior:** RS naturally avoids Croat heartland without hardcoded avoid lists
- **Zvornik anchor:** Passes since n211 (home_osid fix)

### What Needs Work
- **Troop strength:** 278k total vs ~250k target (20-30k over)
- **Casualties:** 16.4k vs 25-35k target (50% too low)
- **Attack taper timing:** Freeze starts week 20-22 (should be week 28-30)
- **VRS should reach ~70%** (currently 65.9% -- close but 4-5 points short)
- **Winter effects not modeled** (would help with natural front stabilization)

### Priority Order for Next Tuning Iteration
1. Raise BASE_ATTACKER/DEFENDER_LOSS_RATE (fixes casualties AND troop strength)
2. Add winter effects system (fixes attack timing naturally)
3. Calibrate ZoC-lock vs heavy weapons balance (extends VRS offensive window)
4. Investigate RS reaching 70% (may need 1-2 more army operation priorities)
5. Add siege attrition (Sarajevo steady-state casualties)
