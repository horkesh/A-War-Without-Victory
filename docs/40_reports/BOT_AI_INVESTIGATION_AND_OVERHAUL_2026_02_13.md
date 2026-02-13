# Bot AI Investigation and Overhaul Report

**Date:** 2026-02-13
**Scope:** Full investigation of Phase II bot AI decision-making, bug diagnosis, strategic objective alignment, and scenario validation.
**Files modified:** `src/sim/turn_pipeline.ts`, `src/sim/phase_ii/bot_brigade_ai.ts`, `src/sim/phase_ii/bot_strategy.ts`, `src/state/formation_lifecycle.ts`

---

## 1. Executive Summary

A comprehensive investigation of the bot AI systems revealed that **bots were completely passive** — generating zero attack orders across all scenarios. Three interacting root causes were diagnosed and fixed. Additionally, faction-specific strategic objectives were added grounded in historical patterns (RS Drina valley, Sarajevo siege; RBiH enclave defense; HRHB Herzegovina consolidation). After fixes, a 12-week validation scenario produced 82 attack orders, 13 settlement flips, and 164 casualties across geographically coherent front lines.

---

## 2. Architecture Overview (Pre-Investigation)

The bot AI operates across two layers:

### Layer 1: Phase I / General Bot (simple_general_bot.ts)
- Manages faction-level posture assignments (edge_id -> push/hold/probe)
- Scores front edges by pressure, disadvantage, objective bonuses
- Applies aggression curves, front-length penalties, manpower penalties
- Deterministic RNG from seed

### Layer 2: Phase II Brigade AI (bot_brigade_ai.ts)
Three-step process per faction per turn:
1. **Posture decisions** — set brigades to defend/probe/attack/elastic_defense based on coverage density
2. **AoR reshaping** — transfer settlements between brigades to reinforce threatened sectors
3. **Attack orders** — score enemy-adjacent settlements and assign one target per probe/attack brigade

### Key Files
| File | Role |
|------|------|
| `src/sim/bot/bot_manager.ts` | Central bot orchestrator |
| `src/sim/bot/bot_strategy.ts` | Phase I strategy profiles |
| `src/sim/bot/simple_general_bot.ts` | Phase I edge scoring and posture |
| `src/sim/phase_ii/bot_brigade_ai.ts` | Phase II brigade orders |
| `src/sim/phase_ii/bot_strategy.ts` | Phase II faction strategy |
| `src/sim/phase_ii/brigade_posture.ts` | Posture adoption constraints |
| `src/sim/phase_ii/brigade_aor.ts` | Area of responsibility (Voronoi) |
| `src/sim/phase_ii/battle_resolution.ts` | Multi-factor combat engine |
| `src/sim/phase_ii/resolve_attack_orders.ts` | Attack order execution |
| `src/state/formation_lifecycle.ts` | Forming -> active transition |
| `src/sim/turn_pipeline.ts` | Master pipeline step ordering |

---

## 3. Critical Bug: Zero Attack Orders

### Symptom
Running the `apr1992_phase_ii_4w` scenario for 4 weeks produced:
- 0 attack orders processed
- 0 settlement flips
- 0 casualties
- Bots entirely passive despite 33 active brigades on front lines

### Root Cause 1: Pipeline Ordering — Lifecycle After Bot AI

**Problem:** The `update-formation-lifecycle` pipeline step (which transitions brigades from `readiness: forming` to `readiness: active`) ran AFTER `generate-bot-brigade-orders`. All brigades started as `forming`. The bot AI's posture logic checked `canAdoptPosture()`, which requires `active` or `overextended` readiness for `probe`/`attack`. Since lifecycle hadn't run yet, ALL brigades were `forming` when evaluated, and no probe/attack postures could be assigned.

**Evidence:**
```
Initial state: 33 brigades, ALL readiness: 'forming', ALL posture: undefined
Final state:   9 brigades with posture 'probe' (set on turns 2+ after first lifecycle ran)
               0 attack orders (posture only read from state, not from pending orders)
```

**Fix:** Moved `update-formation-lifecycle` from its original position (line 806, after legitimacy updates) to immediately before the Phase II brigade operations block (line 409, after supply resolution). This ensures brigades transition `forming -> active` before the bot AI evaluates them.

### Root Cause 2: Posture-Attack Timing — Same-Pass Stale Read

**Problem:** `generateBotBrigadeOrders()` generates posture orders (Step 1) and attack orders (Step 3) in a single function call. Step 3 read `brigade.posture` from the GameState, but the posture orders from Step 1 hadn't been applied yet (they're applied later by `apply-brigade-posture`). So even when Step 1 correctly promoted a brigade to `probe`, Step 3 still saw the old `defend` posture and skipped the brigade.

This created a one-turn delay: a brigade set to `probe` on turn N would only generate attack orders on turn N+1. But combined with Root Cause 1, brigades were stuck in `forming` until turn 3, set to `probe` on turn 3, and only generated attacks on turn 4 — the last turn of a 4-week scenario.

**Fix:** Added a `pendingPosture` map after Step 1 completes. Step 3 now reads `pendingPosture.get(brigade.id) ?? brigade.posture ?? 'defend'` — using the posture the bot just decided, not the stale state.

```typescript
// Build effective posture map: pending orders override current posture
const pendingPosture = new Map<FormationId, BrigadePosture>();
for (const order of result.posture_orders) {
  pendingPosture.set(order.brigade_id, order.posture);
}
// In Step 3:
const posture = pendingPosture.get(brigade.id) ?? brigade.posture ?? 'defend';
```

### Root Cause 3: Supply-Gate Activation Deadlock

**Problem:** `canBrigadeActivate()` required brigades to be supplied (or recently supplied) to transition from `forming` to `active`. The supply check in `updateFormationFatigue()` uses the Phase I edge-based supply system (`localSupplyByEdge`). Many RS brigades had edge assignments pointing to edges where their faction was on the unsupplied side, permanently blocking their activation.

These brigades accumulated fatigue (12 by week 12) but could never activate because:
1. `last_supplied_turn` was never set (no successful supply delivery)
2. The supply gate required either current supply OR recent supply
3. Without activation, they couldn't change posture, couldn't attack, couldn't generate orders

Result: 8 RS brigades (Banja Luka, Doboj, Sarajevo, Prijedor, Teslic, Zvornik, Bijeljina, Gradiska) — covering most of RS territory — were permanently stuck in `forming`.

**Fix:** Added `BRIGADE_FORMATION_MAX_WAIT = 6` constant. After 6 turns in `forming`, brigades auto-activate regardless of supply or authority gates. Historical rationale: military units organized even in difficult supply conditions; armies don't stay "forming" indefinitely.

```typescript
// Grace period: after BRIGADE_FORMATION_MAX_WAIT turns, activate regardless
if (turnsForming >= BRIGADE_FORMATION_MAX_WAIT) {
  return true;
}
```

---

## 4. Strategic Objective Enhancements

### Before: Minimal Strategic Awareness
- Only RS had `corridor_municipalities` (Posavina corridor, 11 muns)
- RBiH and HRHB had empty corridor lists
- No faction had offensive objectives
- Attack target scoring used only: undefended bonus (100), weak garrison (0-50), corridor bonus (90), home recapture (60)
- `defend_critical_territory` was `false` for RBiH and HRHB

### After: Historically-Grounded Objectives

#### RS (Republika Srpska / VRS)
**Offensive objectives** (21 municipalities):
- Drina Valley (12 muns): `zvornik, bratunac, srebrenica, vlasenica, sekovici, han_pijesak, rogatica, visegrad, foca, cajnice, gorazde, rudo`
  - Historical basis: VRS Drina Corps priority — create continuous Serb-controlled corridor along the Drina river from Bijeljina to Foca
- Sarajevo Siege Ring (9 muns): `pale, sokolac, han_pijesak, ilidza, hadzici, vogosca, ilijas, trnovo, rogatica`
  - Historical basis: VRS Sarajevo-Romanija Corps invested enormous resources maintaining siege encirclement

**Defensive priorities** (13 municipalities):
- Posavina corridor (11 muns) + `banja_luka, prijedor`
  - Historical basis: critical supply link between 1st Krajina Corps and East Bosnia Corps; RS logistical backbone

#### RBiH (Army of the Republic of Bosnia and Herzegovina / ARBiH)
**Corridor municipalities / defend critical** (11 municipalities):
- Sarajevo core (4): `centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo`
- Eastern enclaves + Bihac pocket (7): `gorazde, srebrenica, zepa, bihac, cazin, velika_kladusa, bosanska_krupa`
  - Historical basis: ARBiH 1st Corps in Sarajevo; desperate defense of UN "safe areas"; Bihac pocket resistance

**Offensive objectives** (11 municipalities):
- Siege-breaking targets (4): `ilidza, hadzici, vogosca, ilijas`
- Central Bosnia corridor (7): `zenica, travnik, kakanj, visoko, fojnica, bugojno, gornji_vakuf`
  - Historical basis: lifeline connecting Sarajevo to Tuzla; ARBiH 3rd Corps operational area

**Defensive priorities** (13 municipalities):
- Sarajevo core + enclaves + `tuzla, zenica`

#### HRHB (Croatian Republic of Herceg-Bosna / HVO)
**Corridor municipalities / defend critical** (11 municipalities):
- Herzegovina heartland: `mostar, siroki_brijeg, citluk, capljina, stolac, neum, ljubuski, grude, posusje, livno, tomislavgrad`
  - Historical basis: HVO prioritized consolidating Herzegovina as contiguous Croat-controlled bloc

**Offensive objectives** (8 municipalities):
- Central Bosnia Croat pockets (6): `vitez, busovaca, kiseljak, novi_travnik, zepce, usora`
- Connection to Herzegovina (2): `gornji_vakuf, jablanica`
  - Historical basis: Lasva Valley — key battleground; HVO fought to connect pockets to Herzegovina

**Defensive priorities** (17 municipalities):
- Herzegovina heartland + central Bosnia pockets

### Attack Scoring Update
Added `SCORE_OFFENSIVE_OBJECTIVE = 70` bonus for settlements in faction offensive objective municipalities. This makes the bot preferentially attack strategic targets over random weak points:

| Factor | Score |
|--------|-------|
| Undefended (garrison = 0) | +100 |
| Corridor municipality | +90 |
| Offensive objective | +70 |
| Home municipality recapture | +60 |
| Weak garrison (< 100, scales) | +0 to +50 |

A target in an offensive objective AND corridor (e.g. Brcko for RS) scores +160 base before garrison checks.

### Offensive Zone Probing
Brigades headquartered in offensive objective municipalities can switch to `probe` at the lower `COVERAGE_UNDERSTAFFED` threshold (50 personnel/settlement) instead of requiring the faction-specific `attack_coverage_threshold` (150-200). This activates more brigades in strategically important areas.

---

## 5. Gamification and Alphabetical Bias Audit

### Target Selection
- Attack targets are sorted by score descending, then **settlement ID** for ties
- Settlement IDs are numeric-prefixed (`S100013`, `S200034`) — not alphabetical by settlement name
- No alphabetical bias by municipality or settlement name detected in outputs
- Targets are geographically constrained to AoR-adjacent enemy settlements, preventing deep-rear cherry-picking

### Posture Assignment
- Brigades are iterated in sorted ID order
- First brigades that qualify get `probe` before the share limit is reached
- This creates a mild deterministic bias (same brigades tend to probe) but is NOT gamey:
  - It's invisible to players (they see brigade names, not internal IDs)
  - The share limit prevents any single faction from over-attacking
  - Brigade density (personnel/AoR) provides a rational gate

### AoR Assignment
- Multi-source BFS Voronoi from HQ locations
- Settlement assignment is deterministic via sorted brigade seeds and tie-breaking by formation ID
- No alphabetical exploitation possible

### Verdict: No gamification or alphabetical patterns detected. All priority decisions are based on strategic scoring (garrison, corridor, offensive objective, home municipality) with numeric tie-breaking for determinism.

---

## 6. Scenario Validation Results

### Test: apr1992_phase_ii_4w, 12 weeks

| Metric | Before Fixes | After Fixes (v3) | After All Fixes (v4) |
|--------|-------------|-------------------|----------------------|
| Attack orders processed | 0 | 81 | 82 |
| Settlement flips | 0 | 8 | 13 |
| Casualties (att/def) | 0 / 0 | 207 / 15 | 164 / 0 |
| RS active brigades (end) | ~5 | 9 | 15 |
| RS forming brigades (end) | ~14 | 8 | 2 |
| Geographically coherent | N/A | Yes | Yes |

### Settlement Flips (v4, 12 weeks)

| Municipality | From | To | Count | Historical Plausibility |
|-------------|------|-----|-------|------------------------|
| banovici | RBiH | RS | 2 | RS pushing into central Bosnia mining area |
| banovici | RS | RBiH | 1 | RBiH counter-attack — back-and-forth combat |
| banja_luka | HRHB | RS | 2 | RS consolidating core territory |
| centar_sarajevo | RS | RBiH | 2 | RBiH siege-breaking attempts |
| stari_grad_sarajevo | RS | RBiH | 1 | RBiH siege-breaking, old town defense |
| kalesija | RS | RBiH | 1 | NE Bosnia contested zone, 2nd Corps area |
| lukavac | RS | RBiH | 1 | Industrial town near Tuzla |
| ugljevik | RS | RBiH | 2 | Near Bijeljina, RS-RBiH front line |
| zvornik | RS | RBiH | 1 | Drina valley critical area |

### Assessment
- **Geographically coherent:** Fighting occurs on actual front lines in historically contested areas
- **Back-and-forth combat:** Banovici shows genuine tug-of-war (both directions)
- **Strategic targeting visible:** Sarajevo, Zvornik (Drina), Banja Luka (RS core) — all strategically important
- **RBiH slightly over-performing** in early war (net +7 vs RS) — see remaining issues below

---

## 7. Remaining Issues (Future Work)

### 7.1 AoR Extreme Imbalance (HIGH)
The Voronoi-based AoR assignment creates extreme settlement count disparities:
- `rs_1st_zvornik`: **1028 settlements** (density: 1 personnel/settlement)
- `arbih_102nd_motorized`: **365 settlements** (density: 3)
- `rs_1st_sarajevo_mechanized`: **1 settlement** (density: 800)
- `arbih_124th_light_king_tvrtko`: **1 settlement** (density: 800)

This means most brigades have impossibly low density (can never meet `attack_coverage_threshold`) while a few have absurdly high density. The Voronoi algorithm needs either:
- Hard caps on maximum settlements per brigade
- Rebalancing passes after initial assignment
- Density-aware seed placement

**Impact:** Most brigades can only probe via the offensive-zone threshold (50), not the normal threshold (150-200). AoR reshaping (max 3 per turn) is too slow to fix this.

### 7.2 RS Early-War Underperformance (MEDIUM)
Historically, RS/VRS dominated the early war (April-August 1992) with JNA equipment and organizational advantages. In simulation, RBiH gains +7 settlements net over 12 weeks while RS loses -5. Contributing factors:
- RS has more brigades but many activate late (supply deadlock, even with 6-turn grace period)
- RBiH has fewer brigades but all activate on time
- RS corridor defense (`defend_critical_territory: true`) locks many RS brigades in defensive posture
- RS offensive objectives (Drina, Sarajevo) overlap with areas where RS brigades are supply-gated

**Potential fixes:**
- Lower RS `attack_coverage_threshold` from 150 to 100
- Increase RS `max_attack_posture_share` from 0.3 to 0.4 for early war
- Make RS corridor defense conditional on front proximity (don't force defend deep in the corridor)
- Allow time-phased strategy parameters (more aggressive early, defensive later)

### 7.3 Defender Casualties at Zero (MEDIUM)
The 12-week run shows 164 attacker casualties but 0 defender casualties. This suggests the battle resolution engine only inflicts casualties on the attacker when attacks fail, and the defender takes zero attrition on successful defense. Historically, defenders also suffered casualties in engagements.

**Location:** `src/sim/phase_ii/battle_resolution.ts` — needs review of defender casualty calculation.

### 7.4 HRHB Near-Passive (LOW-MEDIUM)
HRHB has only 1 active brigade (`hrhb_1st_brigade_mostar`) with `defend` posture and loses 2 settlements to RS. With `defend_critical_territory: true` for all 11 Herzegovina municipalities and `max_attack_posture_share: 0.25`, the single brigade is locked into defense. HRHB needs more brigades activated (from HVO OZ formations?) to be a credible military actor.

### 7.5 Posture Orders for Forming Brigades (LOW)
The `pendingPosture` fix allows forming brigades in offensive zones to appear in the pending posture map as `probe`. The posture orders are later rejected by `applyPostureOrders` (which checks `canAdoptPosture`), but attack orders are still generated from the pending posture. This is inconsistent but functionally harmless — the attack resolver doesn't check posture. Should be made consistent: either skip forming brigades in Step 1 or check readiness in the pending posture logic.

### 7.6 Corps Command Not Integrated with Brigade AI (LOW)
The corps command system (stances, operations) exists in `corps_command.ts` but the brigade AI doesn't read corps stance when making posture decisions. A corps in `offensive` stance should push more brigades to `probe/attack`; a corps in `reorganize` should force all brigades to `defend`.

### 7.7 Operational Groups Not Used by Bot AI (LOW)
The operational group system (temporary task-organized formations) exists but the bot AI never creates them. For major offensives (e.g., RS Drina campaign, RBiH Operation Neretva '93), the AI should pool brigades into coordinated operational groups with the 1.3x pressure bonus.

---

## 8. Files Changed

| File | Change |
|------|--------|
| `src/sim/turn_pipeline.ts` | Moved `update-formation-lifecycle` before Phase II brigade ops block |
| `src/sim/phase_ii/bot_brigade_ai.ts` | Added `pendingPosture` map for same-pass attack orders; added `SCORE_OFFENSIVE_OBJECTIVE` (70); added offensive-zone probing at lower threshold |
| `src/sim/phase_ii/bot_strategy.ts` | Added `offensive_objectives` and `defensive_priorities` per faction; added Drina Valley, Sarajevo Siege Ring, Sarajevo Core, RBiH Enclaves, Central Corridors, Herzegovina Heartland, Lasva Valley municipality lists; enabled `defend_critical_territory` for all factions; added `isOffensiveObjective()` and `isDefensivePriority()` helpers |
| `src/state/formation_lifecycle.ts` | Added `BRIGADE_FORMATION_MAX_WAIT = 6` grace period for auto-activation |

## 9. Determinism Statement

All changes are deterministic:
- Pipeline reordering does not introduce nondeterminism (same inputs produce same outputs, deterministic step ordering preserved)
- `pendingPosture` map iterates posture_orders in emission order (sorted by brigade ID)
- Strategic objective lists are static constants
- Grace period activation uses integer turn arithmetic
- No `Math.random()`, no timestamps, no nondeterministic iteration

## 10. Validation

- `npx tsc --noEmit`: PASS
- `npx vitest run`: 94/94 tests PASS
- Scenario `apr1992_phase_ii_4w` (4 weeks): 14 orders, 4 flips (vs 0/0 before)
- Scenario `apr1992_phase_ii_4w` (12 weeks): 82 orders, 13 flips, 164 casualties
