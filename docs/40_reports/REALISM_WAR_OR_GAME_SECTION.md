# Realism (War-or-Game) — Paradox Report Section

**Use:** Merge the block below into the Pyrrhic team report as section **8. Realism (War-or-Game)**. No softening language; War-or-Game's job is to keep the sim honest.

---

## 8. Realism (War-or-Game)

### Grade

**B.** Attack outcomes are now plausible (posture bug fixed in n482: ~25% catastrophic, ~53% decisive; early-war success 77%). A real commander would still find RS over-capture (+104 OSID delta), low total casualties (~17.5k KIA at w40 vs 40–60k target), HVO near-passivity, and zero-morale units fighting at full strength absurd. Until RS territorial gain is reined in and at least one of casualty volume or HVO/morale is fixed, the sim is "recognizable but too gamey" — not yet A-tier.

### What now works (plausible)

1. **Attack outcome distribution (REAL_WAR_MASTER #2, Fixed)**  
   Formations with attack orders no longer get 0 attack power from `posture ?? 'defend'`. `attack_resolution_osid.ts` uses `effectivePosture = atkMult > 0 ? posture : 'attack'`, so attackers actually fight. Hasty defense (HASTY_DEFENSE_RAMP=5), defense env soft cap (THRESHOLD=0.5, COMPRESSION=0.5), and weighted artillery suppression are in place. Catastrophic share dropped from 83% to ~25%; decisive ~53%. Early-war offensive window is real.

2. **Deep-rear brigades (REAL_WAR_MASTER #1, Fixed)**  
   Territory gaps and deep-rear brigade traps fixed in n473 (territory_osids fallback, column march destination, reserve march, transit reset). RS deep rear 15→0; remaining RBiH/HRHB deep rear is geographic fragmentation, not logic bugs.

3. **Rear pocket cleanup (H1)**  
   Paramilitary sweep (`paramilitary_sweep.ts`) clears surrounded enemy OSID clusters in w0–20; rear pocket consolidation handles w20+. No more indefinite rear pockets.

4. **Cold front phantom attrition (H2)**  
   `isColdFront()` exempts RS–HRHB segments from frontline attrition and bombardment FP; HRHB siege drain skipped while Graz active. No 6,300 phantom KIA on quiet fronts.

5. **Victory morale boost (REAL_WAR_MASTER #10, partially addressed)**  
   `morale_drift.ts` has `BATTLE_MORALE_DRIFT` and consumes `recent_battle_outcome` (decisive_victory +5, victory +3, costly_victory +1, repulsed −2, catastrophic −4). Winning formations can now gain morale; zero-morale *consequence* (dissolution/refusal) remains open (#5).

### What's still wrong (absurd / gamey)

1. **RS over-capture (+104 delta) — P1**  
   Post-n482, VRS takes too much territory vs painted. Direct cascade of the attack fix: more successful attacks → more RS gains. Needs aggression/target tuning or calibration levers; a VRS commander would recognize the tempo, a defender would not recognize the front line.

2. **Casualty volume (21k vs 40–60k) — P1**  
   Latest run (w40): RBiH 10,278 KIA, RS 6,181 KIA, HRHB 1,100 KIA → ~17.5k military KIA. Target band 40–60k for 40 weeks. Engagement frequency or base casualty rates still too low for the period.

3. **HVO passivity (REAL_WAR_MASTER #7)**  
   Graz Accords implemented as blanket RS–HRHB truce; historically HVO fought VRS actively in Posavina, Jajce, Mostar (Operation Jackal, Corridor defense). Only 11 HRHB attacks in 40 weeks is an order of magnitude too few. Needs sector-specific exceptions (Posavina, Central Bosnia) and/or HVO offensive corps stances.

4. **Zero-morale units still fight (REAL_WAR_MASTER #5)**  
   Full-strength formations at morale=0 have no dissolution, surrender, or order-refusal. Population-affinity drift can drain morale to zero; victory boost helps but does not address "unit at zero morale should not be fully effective."

5. **Attacker:defender casualty ratio (H5)**  
   Historically, 1992 VRS firepower asymmetry reversed the usual defender advantage (e.g. Operation Corridor ~1:2 attacker:defender). Sim still favors defender in ratio; not yet modeling arms embargo / ARBiH lack of heavy weapons.

6. **Front coverage and stacking (#6, #8)**  
   ~64% of front OSIDs undefended; 4+ brigades on single OSIDs (e.g. rekavice_2, sarajevo_dio_centar, gornje_hrasno_2). Distribution problem: sector logic concentrates force instead of spreading along the front.

### Interoperability

- **(a) Combat outcomes and calibration**  
  Realism of battle results drives calibration match rate. Posture fix made outcomes plausible; the same fix made RS over-capture the top P1. Calibration must tune aggression/targets/territory levers (avoided_osids, osid_control_overrides per CALIBRATION_MASTER) without re-breaking outcome distribution. Combat math (hasty defense, soft cap, artillery suppression) is the main lever for "early war VRS success" vs "late war stabilization."

- **(b) Bot behavior and territorial dynamics**  
  Bot corps directives, sector offensives, and Graz filtering determine who attacks where. HVO passivity is a bot/design issue (Graz over-blocking, no HVO offensive stances). Territorial deltas (RS +104) come from bot attack success + target choice; fixing over-capture is bot/calibration, not only combat math.

- **(c) Force structure and casualties**  
  Pool system, mobilization scales, and equipment loss (attack_resolution_osid equipment recording, TANK_LOSS_RATE, ARTILLERY_LOSS_RATE) drive force size and casualty totals. Getting into 40–60k KIA band requires either more battles, higher base loss rates, or both; formation count and commitment are already in the right ballpark.

### Recommendations

1. **P1 — RS over-capture (single highest priority)**  
   Reduce RS territorial delta (currently +104) via aggression tuning, max_attack_share, or targeted avoided_osids so that control at w40 aligns with painted/historical front. This is the direct consequence of the posture fix and the one that makes the map look wrong to a commander.

2. **P1 — HVO passivity**  
   Introduce sector- or region-level exceptions to Graz for Posavina and Central Bosnia (and optionally Mostar axis) so HRHB can attack RS where they historically did. Consider offensive or balanced stances for HVO corps that historically conducted Operation Jackal and Corridor defense.

3. **P1 — Casualty volume or ratio**  
   Either increase engagement frequency (more attacks per week) or raise base casualty rates so that 40-week military KIA enters the 40–60k band; and/or adjust attacker:defender ratio (H5) so 1992 VRS attacks reflect firepower asymmetry (e.g. 1:1 to 1:2 attacker:defender).

---

*Evidence: REAL_WAR_MASTER.md (Fixed §#1–#2, Open §#3–#10, Historical H1–H6, Priority Ranking); latest_run_final_save.json (meta.turn=40, casualty_ledger RBiH/RS/HRHB KIA/MIA); napkin.md (Bot AI & Combat, Calibration); attack_resolution_osid.ts, combat_math.ts, morale_drift.ts, local_truces.ts.*
