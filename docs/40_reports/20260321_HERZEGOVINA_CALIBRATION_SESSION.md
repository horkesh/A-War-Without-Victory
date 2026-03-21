# Herzegovina Calibration Session Report — 2026-03-21

## Session Goal
Capture painted-RS OSIDs in Mostar hills, southern Konjic, and Kalinovik that VRS historically seized in April-June 1992 but the sim leaves as RBiH.

## Starting State
- **91.5% area-weighted** (n3 baseline, Žepa-Teočak fix)
- 6 mismatched OSIDs in Herzegovina: kruzanj_2, vranjevici_2, glavaticevo_2, ljuta, golubici_2, sela_2
- All initially RBiH from census, painted RS
- VRS Herzegovina Corps runs Op Višegrad (w1-w9) → Op Foča (w10-w20) → nothing after w20
- No operation targets the Mostar hills or southern Konjic
- Gačko/Bileća (bahori, gacko_2, zausje) fall to paramilitaries correctly — all neighbors RS

## Historical Context (Balkan Battlegrounds citations)
- JNA 37th Corps forward HQ at Nevesinje during 1991 Croatia operations (BB1 p.480)
- Nevesinje, Gačko, Kalinovik under Serb control from April 1992 (BB1 p.496: VRS OOB)
- Mostar hills (Podveležje/Hum) seized from Nevesinje direction; held through war (BB1 p.193)
- Southern Konjic (Glavatičevo) held by VRS 2nd Herzegovina LI Brigade throughout (BB2 p.514)
- All JNA-directed, transition to VRS brigades by May 12, 1992 (w6)

## Available Forces
- rs_nevesinje_brigade (1000 pers, home: krekovi_2) — not in any existing op
- rs_2nd_herzegovina_light_infantry (1400 pers, home: korita) — not in any existing op
- 3 new JNA phantoms added (all no_equipment_handoff, 0 tanks/artillery):
  - jna_nevesinje_garrison (2000 pers, sopilja, withdraw w6)
  - jna_foca_paramilitaries (1500 pers, foca_3, withdraw w8)
  - jna_konjic_south_tg (1500 pers, bijela_2, withdraw w6)

## Design Decision: Synthetic JNA Corps
Pre-planned ops are one-per-corps — Op Višegrad blocks Op Herzegovina from firing on `vrs_herzegovina` until w10+. Solution: create synthetic `jna_herzegovina_command` corps for the JNA-level operation. JNA phantoms with that corps_id trigger `initializeCorpsCommand` to create the entry. Required `initializeCorpsCommand` to be called AGAIN after `spawnJnaPhantomBrigades` in scenario_runner.ts (the first call runs before phantoms exist).

## Iterations

### Attempt 1: Op Herzegovina as separate vrs_herzegovina op
- **Result**: Never fired — queued behind Višegrad and Foča. By w20+, consolidation doctrine (0.05 aggression) stops attacks.

### Attempt 2: Merged into Op Foča as extra axes
- **Result**: Op Foča fires w10 but captures 0/2 on new axes. Brigades too weak (1000/1400 pers each) against entrenched ARBiH.

### Attempt 3: Added JNA phantoms to axes (on vrs_herzegovina)
- **Result**: 5000 extra RS personnel shifted overall force balance → cascade broke Teočak and Derventa. Also, jna_foca_paramilitaries was listed in both Op Herzegovina AND Op Foča — shared brigade conflict.

### Attempt 4: Synthetic jna_herzegovina_command corps
- **Result**: Op never appeared in diagnostics. Root cause: `initializeCorpsCommand` runs BEFORE `spawnJnaPhantomBrigades` — no corps_command entry exists when `injectPrePlannedOperations` tries to inject. Fix: call `initializeCorpsCommand` again after phantom spawn.

### Attempt 5: Fixed init order + shared brigade conflict
- **Problem**: Op Herzegovina Foča Valley axis shared rs_foa_brigade, rs_bilea_brigade, jna_mostar_garrison_tg with Op Foča. When Op Herzegovina grabbed them first, Op Foča ran without its main brigades → weakened entire Herzegovina Corps → cascade.
- **Fix**: Remove Foča Valley + Kalinovik axes from Op Herzegovina. Keep them on Op Foča (vrs_herzegovina). Op Herzegovina only has Mostar Heights + Konjic South with dedicated brigades.

### Attempt 6: Staging OSID adjacency fix
- **Problem**: Mostar Heights staged from krekovi_2 (NOT adjacent to vranjevici_2). Konjic South staged from korita (NOT adjacent to glavaticevo_2, 5 BFS hops away). Brigades spent weeks marching, never attacked.
- **Fix**: Mostar Heights staging → sopilja (adjacent to vranjevici_2). Konjic South staging → bijela_2 (adjacent to glavaticevo_2).

### Attempt 7: Current state (n10)
- **Op Herzegovina fires at w1** on jna_herzegovina_command
- **Captures**: glavaticevo_2 (w3), ljuta (w4-w5 but ping-ponged back)
- **Kalinovik**: varos_2, golubici_2, sela_2 all RS (from Op Foča Kalinovik axis)
- **Mostar Heights still MISS**: 0 battles at vranjevici_2 or kruzanj_2
- **Result**: 4/7 targets captured, 92.3% area-weighted (+0.8pp), RS w40 0.506 PASS

### Remaining issues
- **Mostar Heights axis**: rs_nevesinje_brigade + jna_nevesinje_garrison at sopilja. sopilja IS adjacent to vranjevici_2. But 0 battles — axis not attacking. Investigation ongoing.
- **Teočak broken**: rastosnica_2 = RS. Op Teočak has 2nd Tuzla (3000 pers) at staging, adjacent to target, but only 2 of 5 participants are "eligible". 2nd Tuzla at right position with 3000 pers is NOT eligible despite min_attack_outcome: 'repulsed'.

## Investigation Result: Why 2nd Tuzla Wasn't Eligible (RESOLVED)

### Debug trace results
Added temporary `console.log` to `bot_brigade_eval_attack.ts` lines 178 and 196 to trace Op Teočak evaluation.

**Finding**: In the FIRST turn of Op Teočak execution, 2nd Tuzla's `predictAllAdjacentTargets()` returns 2 targets but **rastosnica_2 is NOT among them** (`directObj=false`). This means the combat predictor's adjacent enemy filter doesn't include rastosnica_2 for 2nd Tuzla at that specific turn.

In LATER turns, 2nd Tuzla DOES find rastosnica_2 (`directObj=true`, solo ratio 1.50, canAttack=true). So the issue is **positional/temporal** — 2nd Tuzla is likely at a different OSID in the early turn (marching to staging), or rastosnica_2 is temporarily non-enemy.

### Full attack evaluation pipeline (documented)
Location: `src/sim/combat/bot_brigade_eval_attack.ts`, lines 143-212

1. **Phase check** (line 143): Only evaluates during `execution` phase
2. **Objective resolution** (line 144): `getSectorOffensiveCurrentObjective()` — per-axis, returns the first uncaptured objective
3. **Friendly capture check** (line 148-152): Skip if objective already captured by own/allied faction
4. **Target prediction** (line 155): `predictAllAdjacentTargets()` — predicts combat outcome for ALL adjacent enemy OSIDs from brigade's current location
5. **Alliance filter** (line 169-174): HRHB won't attack RBiH (and vice versa) when allied
6. **Avoided OSIDs** (line 175-177): `avoided_osids_by_faction` filter (deprecated/banned)
7. **Direct objective search** (line 178): `targets.find(t => t.osid === currentObjective)` — if objective not in predicted targets, brigade CANNOT attack it. **This is where 2nd Tuzla fails in early turns**.
8. **Prediction evaluation** (line 181-195):
   - Solo prediction: `predictedOutcome` from combat predictor
   - Adjacent participants: count of axis brigades adjacent to objective (STATIC — doesn't depend on who already committed)
   - Concentrated estimate: `estimateConcentratedOutcome(soloRatio, numParticipants)` — multiplicative (1 + N × 0.85)
9. **Attack decision** (line 196-199): `canDirectAttackObjective = soloOutcome >= threshold OR concentratedOutcome >= threshold`
10. **Attack cap** (line 204): `alreadyAssigned < MAX_ATTACKERS_PER_TARGET (3)` — max 3 brigades per OSID per turn

### Constants
- `MAX_ATTACKERS_PER_TARGET = 12` (raised from 3, in `bot_brigade_targeting.ts:35` and `battle_resolution.ts:58`)
- `REACTIVE_DEFENSE_RATIO = 1.5` (defense cap scales with attacker count)
- Concentration estimate: `combinedRatioMult = 1 + existingAttackers × 0.85` (N=1: 1.85×, N=2: 2.70×, N=3: 3.55×)

### Root cause
The pipeline evaluates brigades in **sorted order** (alphabetical by formation ID). 241st evaluates first → attacks. 242nd next → attacks. By the time 2nd Tuzla evaluates (alphabetically after 242nd), it has `alreadyAssigned=2`. In the critical early turn, its `predictAllAdjacentTargets()` doesn't include rastosnica_2 (likely because 2nd Tuzla is still marching to the staging position). In later turns when it arrives, it CAN attack — but by then the op may have accumulated enough failures to enter recovery.

## Action Items

### P1: Remove MAX_ATTACKERS_PER_TARGET cap — DONE
Raised 3→12 in both `bot_brigade_targeting.ts:35` and `battle_resolution.ts:58`. Coordination penalty (0.8× at 3+) handles diminishing returns naturally.

### P2: Fix Op Teočak timing
2nd Tuzla needs 3-5 turns to march from sicki_brod_2 (Tuzla) to kalesija_grad_2 (staging). Op Teočak fires at w20, execution starts w23. If 2nd Tuzla hasn't arrived by w23, it misses the first attacks. Either fire earlier (w15) or add march buffer in the planning phase.

### P3: Mostar Heights axis still not attacking
rs_nevesinje_brigade + jna_nevesinje_garrison at sopilja (adjacent to vranjevici_2) but 0 battles. Need to investigate — may be same march timing issue or the brigade being pulled to Op Foča on vrs_herzegovina.

## Equipment Impact
- 3 JNA phantoms added: ALL no_equipment_handoff, 0T/0A/0APC
- RS equipment at w40: T=569 A=1339 (baseline: T=571 A=1340) — negligible change
- Personnel: phantoms add 5000 pers at w0, vanish by w8. No strategic reserve contribution (confirmed: no_equipment_handoff path doesn't add to reserve)

## Key Lessons Learned This Session
1. **Pre-planned ops queue sequentially per corps** — adding a new op to an overloaded corps means it fires months late
2. **Synthetic corps for JNA-level ops works** — but requires `initializeCorpsCommand` after phantom spawn
3. **Never share brigades between ops on different corps** — the first op grabs them, the second runs empty
4. **Staging OSID must be adjacent to first objective** — non-adjacent staging means weeks of marching
5. **Brigade eligibility in ops depends on CURRENT position** — `predictAllAdjacentTargets()` uses brigade's current location, not staging. Brigades still marching don't see the target. Debug with console.log, don't theorize.
6. **Op butterfly effects are proportional to personnel added** — 5000 extra RS pers (even temporary) cascades across the map
7. **Ops process axes SEQUENTIALLY** — first axis stall blocks all subsequent axes. This is the core engine limitation preventing multi-front operations from working. Needs parallel axis processing or separate triggered ops.
8. **JNA ping-pong problem** — JNA phantoms capture territory early (w2-w5) but withdraw w6-w8. Without VRS brigades holding the ground, RBiH recaptures. The op system can't coordinate JNA capture → VRS hold transition within a single operation.
9. **Git worktrees don't isolate tsx module resolution** — scenario runs in worktrees use main tree's source files. Must merge to main and run there for accurate results. npm install in worktree doesn't help — tsx import chains still resolve from main.

## Engine Limitation: Sequential Axis Processing

The operation system (`sector_offensive.ts`) processes axes through a SHARED `current_objective_index`. When axis 0 stalls (e.g., Foča Valley captures 1/7 then hits max_failures), the entire operation enters recovery — axes 1, 2, 3 never get their turn.

**Impact**: Any multi-axis operation (Op Foča with 5 axes) effectively only executes the FIRST axis. Herzegovina axes added as axes 3-4 are never reached.

**Potential fixes**:
1. **Parallel axis processing** — each axis maintains its own objective index and failure count. Axis 0 stalling doesn't block axis 1. Engine change in `sector_offensive.ts`.
2. **Triggered follow-up ops** — after Op Foča completes, trigger a new op targeting Herzegovina OSIDs. Works within current engine but fires late (w20+).
3. **Separate pre-planned ops per axis** — each axis as its own 1-axis op on the same corps. But sequential corps queue prevents parallelism.

## Calibration Summary Table
| Run | Change | Area% | Herzegovina | Teočak | Žepa | RS w40 |
|-----|--------|-------|-------------|--------|------|--------|
| n3 | Baseline (Žepa+Teočak fix) | 91.5% | 1/7 | YES | YES | 0.494 FAIL |
| n5 | Op Herzegovina merged in Foča | 91.4% | 1/7 | YES | YES | 0.493 FAIL |
| n6 | +JNA phantoms (shared brigades) | 91.7% | 1/7 | NO | YES | 0.501 FAIL |
| n8 | Synthetic JNA corps (init fixed) | 91.8% | 1/7 | NO | YES | 0.503 FAIL |
| n9-n14 | Worktree runs (tsx resolution bug — used main code) | 92.3% | 4/7 | NO | YES | 0.506 PASS |
| n1008 | JNA-only axes on main (correct) | 92.3% | 0/7 | YES | YES | 0.508 PASS |
| n1009 | +VRS follow-up axes on Op Foča | 92.2% | 0/7 | YES | YES | 0.504 PASS |
| n1010 | +Kalinovik→Konjic chain | 92.3% | 0/7 | YES | YES | 0.508 PASS |
| n1011 | +Herzegovina Consolidation triggered op | **92.8%** | **5/7** | NO | YES | **0.511 PASS** |

## n1011 Result — Session Best (92.8%)

Op Herzegovina Consolidation fires at w21 (after Op Foča completes w20). Mostar Heights axis: rs_nevesinje_brigade captures vranjevici_2 (w24 decisive r=12.20) and kruzanj_2 (w25 decisive r=12.15). Both HELD at w40 — Nevesinje brigade (3000 pers) garrisons kruzanj_2. Konjic South axis: 2nd Herzegovina NOT in participants (corps AI moved it elsewhere during Op Foča). BUT glavaticevo_2 and ljuta are RS at w40 — captured by JNA Op Herzegovina early (w2-w3) and this time they stuck (no ping-pong).

**5/7 Herzegovina OK**: kruzanj_2, vranjevici_2, glavaticevo_2, ljuta, varos_2. **2/7 MISS**: golubici_2, sela_2 (Kalinovik axis stalled in Op Foča).

**Teočak broken AGAIN**: rastosnica_2 = RS. Op Teočak fires w15 but only 241st and 242nd attack (2nd Tuzla still not arriving in time). ARBiH wins w18-w19 (costly_victory, victory) but VRS morale resist holds. w20-21 repulsed — VRS reinforced.

## Remaining Issues

### Teočak corridor (P1)
rastosnica_2 needs ARBiH to capture it. Op Teočak has the right setup but 2nd Tuzla doesn't arrive in time. Options:
1. Move 2nd Tuzla's home_osid closer to Kalesija staging
2. Fire Op Teočak even earlier (w10?)
3. The Žepa-Teočak seesaw persists — any change that helps Herzegovina cascades into Drina

### Kalinovik golubici_2 + sela_2 (P2)
Op Foča Kalinovik axis captures varos_2 but stalls before golubici_2/sela_2. Need either:
1. Stronger Kalinovik axis (add a brigade)
2. Separate triggered op for Kalinovik cleanup

### 2nd Tuzla march timing (P2)
The brigade starts at sicki_brod_2 (Tuzla) — 5+ hops from Kalesija staging. By the time it arrives at the target, the op has 2-3 turns of execution left. Needs:
1. Home_osid moved closer, OR
2. Pre-positioning via march orders before op fires, OR
3. Longer planning phase to allow march time
