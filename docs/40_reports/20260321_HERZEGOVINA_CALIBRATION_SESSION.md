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
- `MAX_ATTACKERS_PER_TARGET = 3` (in `bot_brigade_targeting.ts:35`)
- `REACTIVE_DEFENSE_RATIO = 1.5` (defense cap scales with attacker count)
- Concentration estimate: `combinedRatioMult = 1 + existingAttackers × 0.85` (N=1: 1.85×, N=2: 2.70×, N=3: 3.55×)

### Root cause
The pipeline evaluates brigades in **sorted order** (alphabetical by formation ID). 241st evaluates first → attacks. 242nd next → attacks. By the time 2nd Tuzla evaluates (alphabetically after 242nd), it has `alreadyAssigned=2`. In the critical early turn, its `predictAllAdjacentTargets()` doesn't include rastosnica_2 (likely because 2nd Tuzla is still marching to the staging position). In later turns when it arrives, it CAN attack — but by then the op may have accumulated enough failures to enter recovery.

## Action Items

### P1: Remove MAX_ATTACKERS_PER_TARGET cap
`bot_brigade_targeting.ts:35` — `MAX_ATTACKERS_PER_TARGET = 3` is an artificial limit. Historically, VRS and ARBiH massed 4-6+ brigades for major operations (Corridor 92, Srebrenica 1995, Op Sana). The coordination penalty at 3+ (0.8×) already naturally discourages over-concentration. The hard cap prevents the engine from concentrating force when the commander orders it. **Remove the cap entirely or raise to 12 (MAX_PARTICIPATING_BRIGADES).**

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
5. **Brigade eligibility in ops is NOT just adjacency + personnel** — unknown filter blocks 3000-pers brigade from attacking despite min_attack_outcome override
6. **Op butterfly effects are proportional to personnel added** — 5000 extra RS pers (even temporary) cascades across the map

## Calibration Summary Table
| Run | Change | Area% | Herzegovina | Teočak | Žepa | RS w40 |
|-----|--------|-------|-------------|--------|------|--------|
| n3 | Baseline (Žepa+Teočak fix) | 91.5% | 1/7 | YES | YES | 0.494 FAIL |
| n5 | Op Herzegovina merged in Foča | 91.4% | 1/7 | YES | YES | 0.493 FAIL |
| n6 | +JNA phantoms (shared brigades) | 91.7% | 1/7 | NO | YES | 0.501 FAIL |
| n8 | Synthetic JNA corps (init fixed) | 91.8% | 1/7 | NO | YES | 0.503 FAIL |
| n9 | No shared brigades + staging fix | 91.9% | 4/7 | NO | YES | 0.500 FAIL |
| n10 | Same as n9 (syntax fix only) | 92.3% | 4/7 | NO | YES | 0.506 PASS |
