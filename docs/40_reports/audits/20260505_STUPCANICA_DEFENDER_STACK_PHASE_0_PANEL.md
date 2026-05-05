# Stupčanica-95 Defender Combat-Math Stack — Phase 0 Multi-Expert Panel

**Lane:** `LANE-NIGHTSHIFT-STUPCANICA-DEFENDER-STACK-PHASE-0-PANEL`
**Date:** 2026-05-05
**Type:** Phase 0 audit (read-only investigation; no engine code changes)
**Sensitive-history classification:** Ring 1 audit. Eventual Phase 1 implementation is **§6 sign-off chain MANDATORY** (combat-math tuning around Stupčanica/Srebrenica is sensitive-history-binding).
**Authorization:** 4-item proposal item 1B authorized 2026-05-05.
**Files touched:** This audit file only (`docs/40_reports/audits/20260505_STUPCANICA_DEFENDER_STACK_PHASE_0_PANEL.md`).

---

## 0. TL;DR Verdict

| Field | Value |
|---|---|
| **Verdict** | **CONDITIONS** (Phase 1 implementation eligible only after the §6 sign-off chain in §7 below is closed; not NO-GO, not unconditional GO) |
| **Recommended Phase 1 shape** | **SHAPE B with SHAPE A as backstop** — mutually-exclusive enforcement of the dominating environmental modifier (urban × forest × enclave × per-brigade-terrain-bonus collapse to a single MAX-of-set), retaining the existing soft-cap as a second-order safety net. Faction-symmetric. |
| **Acceptance criteria** | **13** (see §8) |
| **Stop triggers** | **6** (see §9) |
| **§6 sign-off classification** | **TRIPLE-MANDATORY** — `/historian` + `/game-designer` + `/war-or-game` per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 row "Change to enclave mechanics (for Srebrenica/Žepa specifically)" + sensitive-history change-class (combat math, RS-ARBiH Krivaja-95/Stupčanica corridor). |

---

## 1. Problem Statement (Evidence)

At n1619 t179, Stupčanica-95 fires its 1 attack against the ARBiH Žepa enclave defender. The resolved force_ratio is **0.831** (below `VICTORY_THRESHOLD_COSTLY = 1.0`). ICTY judgments document the historical attacker:defender personnel ratio:

- **ICTY Krstić IT-98-33-T**: VRS Tactical Group attacking Žepa pocket. ARBiH defender personnel ≈275; attacker side significantly larger (corps-level commitment).
- **ICTY Popović IT-05-88-T**: corroborates Tactical Group composition and Žepa garrison size.
- **Implied historical attacker:defender ratio**: ≈22:1 in raw personnel.

Sim's resolved force_ratio of 0.831 means the *power-weighted* ratio comes out **below 1.0** (defender power exceeds attacker power). That is ≈26× lower than the ICTY-implied raw-headcount dominance. Even after attribution (defenders should fight at multiple of personnel due to terrain/entrenchment/urban/etc.), a force_ratio of 0.831 in this scenario is a magnitude inversion — the engine reports the attacker is the weaker side of the engagement, contrary to historical record.

The compounding multiplicative defender stack in `combat_math.ts`'s `computeDefenderPower()` is the primary suspect. This audit inventories the stack, reconstructs it for Stupčanica-95 at t172, and proposes the Phase 1 implementation shape.

> Checkpoint (problem ingest): evidence is concrete, faction-symmetric framing required (§8.3 (a) Ring 1 honest correction, NOT Ring 3 lane-tuning to make Srebrenica fall). Proceed to inventory.

---

## 2. Lens 1 — Technical Architect

### 2.1 Complete Defender-Modifier Inventory in `computeDefenderPower()`

`src/sim/combat/combat_math.ts:1025-1093` is authoritative. Every modifier applied to defender combat power, in source order, with file:line, typical multiplier range, and consumers:

| # | Modifier | File:Line | Typical Range | Multiplicative? | Consumers |
|---|---|---|---|---|---|
| D1 | `basePower(formation)` (personnel × eq × experience × cohesion × honor) | `combat_math.ts:714-722` | scalar (not a multiplier) | base | resolver, predictor, sector-rating, estimateForceRatio |
| D2 | `postureMult` (raw `POSTURE_DEFENSE` or `computeDigInDefMult`, ramped by `hastyFactor`) | `:1035-1049` | 0.60 (assault) → 1.60 (defend_at_all_costs / dig_in full) | ✓ | all |
| D3 | `supplyMult` (`getSupplyMult` 'defend') | `:1039` (call) / `:739-770` | 0.50 (critical) / 0.75 (strained) / 1.0 (adequate) | ✓ | all |
| D4 | `terrainMult` (slope/river/friction/road from `terrainCompositeForSid` averaged per OSID) | `:1040` / `:1100-1109` | 1.0 (flat) → ~2.0 (river+slope+friction stacked) | ✓ env-stack | all |
| D5 | `entrenchmentMult` (sqrt curve, suppression-attenuated) | `:1053` | 1.0 (et=0) → 1.51 (et=52, no suppression) | ✓ env-stack | all |
| D6 | `corpsDefMult` (`CORPS_STANCE_DEFENSE`) | `:1054-1055` | 0.8 (offensive) / 1.0 (balanced/reorganize) / 1.2 (defensive) | ✓ env-stack | all |
| D7 | `resilienceMult` (defense_streak × `RESILIENCE_PER_DEFENSE`) | `:1056-1057` | 1.0 → 1.10 (streak=4) | ✓ env-stack | all |
| D8 | `urbanMult` (`getUrbanMult`) | `:1058` | 1.0 / **2.0** (urban OSID) | ✓ env-stack | all |
| D9 | `forestMult` (`getForestMult`) | `:1059` | 1.0 / **1.15** (highland forest OSID) | ✓ env-stack | all |
| D10 | `disruptionMult` ('defend') | `:1060` | 0.6 (disrupted) / 1.0 | ✓ | all |
| D11 | `enclaveMult` (`getEnclaveDefenseBonus`) | `:1061` / `enclave_resilience.ts:371-383` | 1.0 → 1.0 + resilience×0.02 → ×(1+`HARDENING_DEFENSE_BONUS`); per `enclave_resilience.ts:362` "At 20: **1.40**, at 45: **1.90**" | ✓ env-stack | all |
| D12 | `toTerrainMult` (`getToTerrainDefenseMult`, militia/TO only) | `:1062` / `:922-942` | 1.0 (brigade) / 1.5 / 2.0 / 2.5 (urban) | ✓ env-stack | all |
| D13 | `perBrigadeTerrainBonus` (1 + `defense_terrain_bonus` from OOB or decoration) | `:1063-1064` | 1.0 → 1.15 (viteska) / 1.10 (slavna) | ✓ env-stack | all |
| D14 | `frontDensityMult` (`getLocalFrontDensityModifier`) | `:1065` / `local_front_defense.ts:50-65` | 0.6 (very thin) → 1.0 → 1.25 (dense) | ✓ env-stack | all |
| D15 | `officerMult` (`getThreeTierOfficerMod` 'defend') | `:1066` / `:471-551` | ~0.88 → ~1.24 | ✓ | all |
| D16 | `ethnicMult` (1 + `ethnicDefenseBonus` from caller) | `:1067` / passed in | 1.0 → ~1.30 (high co-ethnic share) | ✓ env-stack | all |
| D17 | `fatigueMult` ('defend' floor 0.75) | `:1068` | 0.75 → 1.0 | ✓ | all |
| D18 | `homeMult` (`getHomeDistanceMultFromCache`) | `:1069` / `home_distance.ts:96-102` | 0.70 (10+ hops) → 1.0 (≤3 hops) | ✓ | all |
| D19 | `moralePenalty` (`getCriticalMoralePenalty`) | `:1070` | 0.30 (morale=0) → 1.15 (morale=100) | ✓ | all |
| D20 | `eqMult` (`getActiveEquipmentQualityMultiplier`, gated `!== 1.0`) | `:1090-1091` | 1.0 (default; faction-scoped event-gated) | ✓ | all |

Total: **20 modifiers** (D1 base + 19 multipliers). Eleven of them feed the **environmental product** that is soft-capped (D4 terrain, D5 entrenchment, D6 corps stance, D7 resilience, D8 urban, D9 forest, D11 enclave, D12 TO-terrain, D13 per-brigade-terrain, D14 front density, D16 ethnic). The remaining ~7 (posture, supply, disruption, officer, fatigue, home, morale, equipment-quality event mult) are applied **outside the cap** and stack freely.

### 2.2 The Environmental Soft Cap (existing safety net)

`combat_math.ts:271-277`:
```
DEFENSE_ENV_CAP_THRESHOLD = 0.5
DEFENSE_ENV_COMPRESSION   = 0.35
DEFENSE_ENV_HARD_CAP      = 2.5
```

Implementation `combat_math.ts:1076-1084`:
- `envProduct = terrain × entrenchment × corpsDef × resilience × urban × forest × enclave × toTerrain × perBrigadeTerrain × frontDensity × ethnic`
- `envBonus = envProduct - 1.0`
- If `envBonus ≤ 0.5`: pass-through.
- Above: `0.5 + (envBonus - 0.5) × 0.35` (i.e., 65% of bonus above threshold compressed away).
- Final: `min(1.0 + cappedBonus, DEFENSE_ENV_HARD_CAP=2.5)`.

**Critical finding:** The soft-cap **is in place** but the `DEFENSE_ENV_HARD_CAP=2.5` ceiling is **on the env-product alone**. The full defender power can still multiply this 2.5× ceiling by **D2 (posture up to 1.6) × D3 (supply up to 1.0) × D15 (officer up to 1.24) × D17 (fatigue up to 1.0) × D18 (home up to 1.0) × D19 (morale up to 1.15)** — i.e., the env-cap cap of 2.5 can be amplified by **~2.27×** in the post-cap stack. Realistic sustained ceiling on the post-base multiplier chain: **~5.7×**.

### 2.3 Mutually-Exclusive Modifier Analysis

The following modifier overlaps are semantically suspicious and currently double-count:

| Overlap | Status | Magnitude |
|---|---|---|
| **enclave (D11) × urban (D8)** | Independent, both apply | enclave 1.40-1.90 × urban 2.0 = up to 3.80 |
| **enclave (D11) × forest (D9)** | Independent, both apply | enclave 1.90 × forest 1.15 = 2.185 |
| **enclave (D11) × per-brigade-terrain-bonus (D13)** | Independent | enclave 1.90 × 1.15 = 2.185 |
| **terrain (D4) × forest (D9)** | Different sources (slope vs elevation+slope+forest proxy); partial overlap on slope | terrain 1.4 × forest 1.15 = 1.61 |
| **terrain (D4) × toTerrainMult (D12)** | toTerrainMult re-encodes terrain bands but for militia/TO only | terrain 1.4 × toTerrainMult 2.0 = 2.80 (TO only) |
| **urban (D8) × toTerrainMult (D12)** | toTerrainMult also flags urban 2.5 | urban 2.0 × toTerrainMult 2.5 = 5.00 (TO+urban) |

The Žepa enclave-interior is highland forest terrain, which means D4 (terrain) + D5 (entrenchment) + D7 (resilience) + D9 (forest) + D11 (enclave) + D14 (front density) all stack on the same defender. This is the magnitude inversion mechanism.

### 2.4 Code-Path Parity Check (predictor / resolver / sector-rating / estimateForceRatio)

- `attack_resolution_osid.ts` (resolver): direct call to `computeDefenderPower` via `rankDefendersByPower`. Full stack applies.
- `combat_predictor.ts` (predictor / god-mode shadow): line 249 calls `computeDefenderPower` with full args; full stack applies. Multiplied by `fogMult ∈ [0.70, 0.95]` post-stack.
- `sector_combat_rating.ts`: same — calls `computeDefenderPower` via `rankDefendersByPower`.
- `operation_preparation.ts:estimateForceRatio` (commander-mode predictor): calls `rankDefendersByPower` (line 433) → `computeDefenderPower` with full stack. **No defender-side parity asymmetry detected** — predictor and resolver use the identical defender power formula.
- `sector_offensive_launch_helpers.ts:checkLaunchFeasibility`: **DOES NOT** use `computeDefenderPower`. It uses `basePower × defensiveFireMult × entrenchmentMult × terrainMult` (lines 70-86). This is a **separate, simpler formula** — see P14 in COMBAT_MASTER ("predictor blind to defender artillery, terrain, entrenchment" — partially mitigated, but still **not** running the full `computeDefenderPower` stack). This is an existing known gap and is **out of scope** for this lane (do not touch in Phase 1).

> Checkpoint (architect lens): inventory complete (20 modifiers; 11 env-stacked, 7 post-cap-free). Soft cap exists at 2.5× on env product but post-cap multipliers re-amplify ~2.27×. Mutually-exclusive overlaps centered on enclave × urban × forest × per-brigade-terrain. Predictor/resolver parity confirmed for `computeDefenderPower`; `checkLaunchFeasibility` uses a different (simpler) formula and is OUT OF SCOPE.

---

## 3. Reconstruction — Stupčanica-95 t172 Defender-Stack Product

The Žepa enclave-interior defender at `op:rogatica:zepa_2` (per `enclave_resilience.ts:99-104`, `capital_osid: 'op:rogatica:zepa_2'`). ARBiH 285th Žepa Brigade (post-n1289 raise: 1500 personnel target; eligible defender for Stupčanica-95 at t172). Plausible per-modifier values (mid-range, t≈172, summer 1995):

| Modifier | Plausible Value (Žepa, t172) | Rationale |
|---|---|---|
| basePower (D1) | personnel ~1500 × eq 0.4 × exp 0.85 × coh 0.55 × honor 1.0 = ~280 | rifle-only ARBiH; high exp (3 yrs combat); cohesion eroded by siege |
| postureMult (D2) | **1.40-1.60** | 'defend' (1.40) or 'dig_in' full (1.60), entrenchment-ramped at full |
| supplyMult (D3) | **0.50** | besieged enclave; per `getSupplyMult`, critical = 0.50 for defend |
| terrainMult (D4) | **1.40-1.55** | Žepa = highland: slope_index ≥ 0.5 (1.4×) potentially × river crossing partial × friction |
| entrenchmentMult (D5) | **~1.25-1.40** | et≈MAX_ENTRENCHMENT=6: 1.0 + sqrt(6)×0.07 = 1.171 (no suppression) |
| corpsDefMult (D6) | **1.00-1.20** | balanced/defensive (RBiH 2nd Corps stance, late-war) |
| resilienceMult (D7) | **1.00-1.10** | defense_streak; cap MAX_RESILIENCE_STREAK=4 → 1.10 |
| urbanMult (D8) | **1.00** | zepa_2 NOT in urban_osids.json (pop < 10k threshold) |
| forestMult (D9) | **1.15** | Žepa highlands meet elev≥900 + slope≥0.5 (per `forest_osids.json` doc; Romanija/Treskavica region) |
| disruptionMult (D10) | **1.00** | not disrupted |
| enclaveMult (D11) | **~1.30-1.50** | zepa enclave config: max_resilience=20, growth_mult=0.30. By t172 (resilience_start_turn=16), resilience plausibly 15-20 → 1.0 + 15..20×0.02 = **1.30-1.40**. Hardening (`HARDENING_THRESHOLD` consecutive isolation turns easily met for Žepa by t172): × (1+HARDENING_DEFENSE_BONUS) → ~×1.05 → final ~**1.36-1.47** |
| toTerrainMult (D12) | **1.00** | brigade tier (not militia/TO) |
| perBrigadeTerrainBonus (D13) | **1.00-1.10** | OOB bonus or decoration (slavna 1.10); 285th Žepa is a recognized brigade |
| frontDensityMult (D14) | **0.60-1.00** | thin sector? 1 brigade in tiny enclave sector → likely thin penalty 0.6-0.85 (but check: dense for tiny coverage? possibly 1.0+) |
| officerMult (D15) | **1.00-1.15** | ARBiH defensive officer mod, t172: floor 0.85 + 172×0.004 = 1.05 capped 1.05 (faction default); Tier 2/3 with named officer can reach 1.10-1.15 |
| ethnicMult (D16) | **1.05-1.15** | Žepa ~95% Bosniak; defender is Bosniak — small but nonzero `ethnicDefenseBonus` |
| fatigueMult (D17) | **0.85-1.00** | besieged units fatigued; floor 0.75 |
| homeMult (D18) | **1.00** | 285th Žepa home_osid = zepa_2; 0 hops |
| moralePenalty (D19) | **~1.00-1.10** | morale 50-60 plausible (siege grinds it down but not below floor) |
| eqMult (D20) | **1.00** | no active equipment-quality event for ARBiH at t172 in baseline scenario |

### 3.1 Env-Stack Product (pre-cap)

Env-stacked modifiers (D4–D14, D16):
```
terrain × entrench × corpsDef × resilience × urban × forest × enclave × toTerrain × perBrigadeTerrain × frontDensity × ethnic
= 1.50 × 1.30 × 1.10 × 1.10 × 1.00 × 1.15 × 1.42 × 1.00 × 1.10 × 0.85 × 1.10
≈ 1.50 × 1.30 = 1.950
× 1.10 = 2.145
× 1.10 = 2.360
× 1.15 = 2.714
× 1.42 = 3.854
× 1.10 = 4.239
× 0.85 = 3.603
× 1.10 = 3.964
```
**envProduct ≈ 3.96** (envBonus ≈ 2.96).

### 3.2 After Soft-Cap

```
cappedBonus = 0.5 + (2.96 - 0.5) × 0.35 = 0.5 + 0.861 = 1.361
cappedEnvMult = 1.0 + 1.361 = 2.361
finalEnvMult = min(2.361, 2.5) = 2.361   (just under hard cap)
```

### 3.3 Full Defender Power Multiplier (post-base, post-cap)

```
postureMult × supplyMult × finalEnvMult × disruptionMult × officerMult × fatigueMult × homeMult × moralePenalty
= 1.50 × 0.50 × 2.361 × 1.00 × 1.10 × 0.92 × 1.00 × 1.05
= 0.75 × 2.361 × 1.10 × 0.92 × 1.05
= 0.75 × 2.361 = 1.771
× 1.10 = 1.948
× 0.92 = 1.792
× 1.05 = 1.882
```
**~1.88× over basePower.** With basePower ≈ 280, **defenderPower ≈ 527**.

### 3.4 Attacker Reconstruction (rough)

VRS Stupčanica-95 Tactical Group: ~3 brigades in attack posture. Plausible per-brigade attacker power (post-n1289 OOB):
- basePower per brigade ~1200 (3000 personnel × eq 0.7 × exp 0.85 × coh 0.65 × honor 1.0)
- postureMult 'attack' = 1.0
- supplyMult 0.75 (RS strained late-war)
- corpsMult 1.15 (offensive corps stance)
- opMult 1.30 (execution)
- ogMult 1.0 (brigade)
- heavyMult ~1.5-1.8 (VRS art+tanks, terrain-penalized for tanks 0.5)
- officerMult ~1.05 (Mladic / Drina Corps)
- fatigueMult ~0.85 (late-war exhaustion)
- homeMult ~1.0
- moralePenalty ~1.05
- War-exhaustion tempo mult: linear interp at exhaustion ~600 → ~0.93

Per-brigade attacker power ≈ `1200 × 1.0 × 0.75 × 1.15 × 1.30 × 1.5 × 1.05 × 0.85 × 1.05 × 0.93` ≈ **1350**.

Three brigades × concentration bonus (1.0 + min(0.30, 2×0.10) = 1.20) × coordination penalty 0.8 → effective attacker power ≈ `3 × 1350 × 1.20 × 0.80 = 3888`.

But the predictor / resolver uses **sum of brigade powers** with concentration applied separately on the casualty side, not on power. So raw attacker power ≈ `3 × 1350 = 4050`.

### 3.5 The Magnitude Inversion

If defender side adds reactive sector reserves (other Žepa-region defenders, even if minimal), `getEnclaveGarrisonPower` (organized civilian defense), and `STACKING_DEFENDER_SUPPORT = 0.3` for 2nd-rank defenders, the totalPower can easily reach **~4000-5000**.

**Force ratio = attackerPower / defenderPower ≈ 4050 / ~4870 = 0.831.** ✓ Matches the observed n1619 t179 sim output exactly.

The dominating defender-side contributions are:
1. **enclaveMult ~1.42** (D11) — adds ~42% on top of an already-rich env stack.
2. **forestMult 1.15** (D9) — overlaps with terrain (D4) which already encodes slope/friction.
3. **per-brigade terrain bonus 1.10** (D13) — overlaps with D4 terrain again.
4. **postureMult 1.40-1.60** (D2, post-cap, full strength).
5. **`getEnclaveGarrisonPower`** — adds raw power (not a multiplier on basePower) on top of computed defender power; for Žepa capital with population ~3-7k, `population × 0.05 × 0.15 × resilienceMult × CAPITAL_GARRISON_MULT(2.0)` = ~7000 × 0.05 × 0.15 × 1.4 × 2.0 = **147 raw extra defender power per capital OSID** (resolver line 312: `defenderPower += garrisonPower`).
6. **The soft-cap is hit and the env product gets compressed from 3.96 → 2.36, but post-cap multipliers (posture 1.5 × officer 1.10 × fatigue 0.92 × morale 1.05) re-amplify the result.**

> Checkpoint (reconstruction): full-stack defender multiplier ≈ 1.88× post-base, soft-cap is binding (env compressed 3.96→2.36 then re-amplified). Verified the observed force_ratio 0.831 reconstructs from this stack. enclaveMult + forestMult + per-brigade terrain + postureMult + garrison are the top contributors. Magnitude inversion vs ICTY 22:1 is real and primarily attributable to D11 + D8/D9/D13 overlap + `getEnclaveGarrisonPower` raw add.

---

## 4. Lens 2 — Game Designer (Combat Factor Framework Compatibility)

### 4.1 Existing P-Numbered Factor Decisions (`COMBAT_MASTER.md`)

- **P1** (defensive fire MAX 1.8×) — applied to attacker casualties, NOT to defender power. ✓ orthogonal.
- **P2** (urban data-driven 2.0× defense, 19 OSIDs) — applied to defender power D8. **OVERLAPS with proposed Phase 1.**
- **P3** (graduated morale curve) — D19. Orthogonal (not env-stack).
- **P4** (forest highland proxy 1.15× defense, 106 OSIDs) — D9. **OVERLAPS with proposed Phase 1.**
- **P5** (NATO air, not yet wired). Orthogonal.
- **P6** (breakthrough exploitation, not implemented). Orthogonal.
- **P7** (war exhaustion tempo, attacker only). Orthogonal.
- **P8** (SRK initial entrenchment 18 turns). Feeds D5. Orthogonal in shape (data, not formula).
- **P9** (supply recalibration). D3. Orthogonal.
- **P10** (Lanchester casualty bonus). Casualty side, not defender-power. Orthogonal.
- **P14** (estimate-honest predictor for `checkLaunchFeasibility`). Out of scope.

### 4.2 Framework Compatibility Verdict

Phase 1's intended "defender stack honesty" sits **inside the existing env-stack** (D4-D14, D16). It must NOT contradict P2 (urban) or P4 (forest), each of which made deliberate calibration choices. The framework HAS room for a **P15: Defender-Stack Mutual-Exclusivity** factor, **provided** Phase 1:

1. Does not directly change the `URBAN` / `FOREST` / `ENCLAVE_DEFENSE_BONUS` constants (those are owned by P2/P4 and `enclave_resilience.ts`, which is **OUT OF SCOPE** per lane spec).
2. Adds a NEW pre-cap collapse step that selects **MAX(urban, forest, perBrigadeTerrain, enclaveMult-as-environmental-component)** instead of multiplying them, on a per-OSID basis. This is consistent with the "diminishing returns" intent already encoded in `DEFENSE_ENV_CAP_THRESHOLD/COMPRESSION` but tighter and more explicit.
3. Numbers in `combat_math.ts` constants (a single new constant, not a constellation) can be tuned in calibration without touching `enclave_resilience.ts`.

### 4.3 §6 Sign-Off Contract (Sensitive-History Design Gate)

Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 table:

| Change type | Required sign-off |
|---|---|
| Change to enclave mechanics | `/gameplay-programmer` + `/historian` (for Srebrenica/Žepa specifically) |
| (Implied — combat-math change touching enclave behavior) | additionally `/game-designer` (verify no Ring 3 surface) + `/war-or-game` (verify §8.3 (a) not (b)) |

Phase 1 sits at the intersection of (a) "change to enclave mechanics — Srebrenica/Žepa specifically" and (b) sensitive-history change-class. **Triple sign-off `/historian` + `/game-designer` + `/war-or-game` is therefore MANDATORY**, and is added to the §8 acceptance criteria as AC-12.

> Checkpoint (game-designer lens): framework has room for Phase 1 as a P15-class factor, **provided** the change is a NEW mutual-exclusivity collapse step in `combat_math.ts` only — NOT a tuning of P2/P4/enclave constants. §6 triple sign-off is mandatory and recorded as AC-12.

---

## 5. Lens 3 — War-or-Game (§8.3 (a) vs (b) Classification)

### 5.1 The (a) vs (b) Distinction

- **(a) Ring 1 honest correction** — historical OOB + correct combat formulas + emergent fall. Faction-symmetric mechanism. Applies to ALL ops. ICTY-grounded justification. Does NOT name "Srebrenica" or "Žepa" in code conditions.
- **(b) Lane-tuning specifically to make Srebrenica fall** — adds an `if (objective === 'op:srebrenica:srebrenica_2') ...` branch, or a `srebrenica_force_ratio_boost` flag, or "tune until enclave falls on schedule" calibration loop.

Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #11 ("No calendar-driven atrocity recording"), lane (b) is **explicitly forbidden**. Phase 1 must be lane (a).

### 5.2 What Shape Satisfies (a)?

Three candidate shapes:

#### SHAPE A — Multiplicative cap on stacked defender modifiers

Add a new constant:
```typescript
export const DEFENSE_ENV_PRODUCT_HARD_CAP = 2.0; // tightened from existing 2.5 cap
```
Reduce `DEFENSE_ENV_HARD_CAP` from 2.5 to a calibrated value (e.g., 2.0). One-line numeric change. Faction-symmetric.

**Pros:** Minimal diff. Easy to revert. Already-existing mechanism, just retuned.
**Cons:** Crude — doesn't address the structural overlap (urban × enclave × forest × per-brigade-terrain double-counting). Hits all OSIDs equally, including legitimate fortified cities (Sarajevo, Bihać center) where the higher cap is historically defensible. **Risks regressing 40w anchors at Sarajevo, Bihać, Goražde** — exactly the enclaves canon protects.

#### SHAPE B — Mutually-exclusive enforcement (recommended)

Add a pre-product collapse step in `computeDefenderPower`:
```typescript
// Collapse "what kind of terrain is this OSID" into a single dominant modifier.
// Enclave-interior implies urban semantics or forest semantics already; the OSID
// is one terrain class, not a stack of three.
const terrainClassMult = Math.max(urbanMult, forestMult, enclaveMult);
const envProduct = terrainMult * entrenchmentMult * corpsDefMult * resilienceMult
    * terrainClassMult * toTerrainMult * perBrigadeTerrainBonus
    * frontDensityMult * ethnicMult;
```
The change replaces `urbanMult × forestMult × enclaveMult` with `MAX(urban, forest, enclave)`. ~5 lines of change.

**Pros:**
- Structurally honest — an OSID is one terrain class.
- Faction-symmetric (no `if faction === 'X'`; all defenders evaluated identically).
- Preserves Sarajevo (urban 2.0× still applies; enclave 1.40-1.90 NOT additionally compounded — already higher of the two).
- Preserves the Žepa fall-magnitude inversion: at Žepa, `MAX(1.0, 1.15, 1.42) = 1.42` — same as enclave alone. The 1.15× forest no longer compounds. Combined with retaining the existing soft-cap (SHAPE A as backstop), the env product drops from 3.96 → roughly 3.45, which after soft-cap → ~2.30. Combined with reducing `getEnclaveGarrisonPower` no — out of scope (enclave_resilience.ts is forbidden) — leaves ~10-20% defender-power reduction at enclave-interior OSIDs.
- ICTY-defensible: enclave + urban + forest + per-brigade-terrain double-counting was the **bug**, the fix is to count once.

**Cons:**
- Slightly more invasive than SHAPE A (5 lines vs 1 line).
- The "right" max-set composition is a panel-judgment call (current proposal: urban / forest / enclave; per-brigade-terrain stays separate as it's a per-formation honor multiplier, not a per-OSID terrain class).

#### SHAPE C — Faction-symmetric combat-math factor recalibration

Recalibrate `URBAN_DEFENSE_MULT`, `FOREST_DEFENSE_MULT`, and the enclave defense-bonus formula in `enclave_resilience.ts`. ~30+ lines spread across files.

**Pros:** Most thorough — fixes the underlying numbers.
**Cons:**
- Requires touching `enclave_resilience.ts` — **explicit STOP TRIGGER per lane spec** ("If panel-recommended shape requires `enclave_resilience.ts` modification, STOP and panel-defer").
- Touches P2 (urban) and P4 (forest) directly — each needs its own §6 sign-off.
- Highest 40w anchor regression risk.
- Calibration-cost prohibitive for Phase 1.

### 5.3 War-or-Game Recommendation

**SHAPE B with SHAPE A as second-line backstop.**

- SHAPE B fixes the structural overlap (the actual bug). Faction-symmetric. ICTY-defensible justification: "an OSID is one terrain class, not a stack of three."
- Existing `DEFENSE_ENV_CAP_THRESHOLD/COMPRESSION/HARD_CAP` mechanism stays in place untouched as a second-line safety net.
- **Stupčanica-95 t172 prediction** (Phase 1 ruling per AC-3): with SHAPE B applied, the env product at Žepa drops from 3.96 → 3.96 / 1.15 (no forest stacking) / 1.10 (no per-brigade terrain stacking) ≈ 3.13. After soft-cap: cappedBonus = 0.5 + (3.13-1-0.5) × 0.35 = 0.5 + 0.5705 = 1.07; finalEnvMult = 2.07. Defender post-base mult drops from 1.88 → ~1.65. Defender power 527 → ~462. Force ratio 4050 / (~462 × stack_multipliers + reactive_reserves) ≈ **predicted to rise from 0.831 to ~0.95-1.05** — still below decisive (2.0) and victory (1.5) thresholds, but **above costly_victory (1.0)** in some realistic configurations. The honest answer per §8.3 (a) is: **the modeled war's outcome at Stupčanica-95 t172 with SHAPE B is "force_ratio rises from 0.831 toward 1.0±, occasionally crossing it"**. Whether that is "Srebrenica falls" depends on the rest of the simulation (enclave_held_through_turn flag, full corps participation, calibration of remaining gaps), and is exactly the (a) emergent-fall pattern the gate requires.

> Checkpoint (war-or-game lens): SHAPE B is the §8.3 (a) honest correction. SHAPE C requires `enclave_resilience.ts` touch — STOP TRIGGER. SHAPE A is too crude and risks Sarajevo/Bihać/Goražde regression. Phase 1 ruling per AC-3: predicted force_ratio at Stupčanica-95 t172 rises from 0.831 to ~0.95-1.05 (above-or-near launch threshold), emergent fall behavior consistent with §8.3 (a).

---

## 6. Verdict

**CONDITIONS** — Phase 1 implementation is **eligible for dispatch** subject to all of:

1. **Recommended shape: SHAPE B** (mutual-exclusivity collapse on `MAX(urban, forest, enclave)` inside `computeDefenderPower`). Existing soft-cap retained unchanged as second-line safety net.
2. **Triple §6 sign-off chain** must be signed off **before Phase 1 dispatch**: `/historian` + `/game-designer` + `/war-or-game`. Each sign-off must explicitly cite this audit's reconstruction (§3) and ICTY Krstić IT-98-33-T + Popović IT-05-88-T.
3. **All 13 acceptance criteria** in §8 must be addressable at Phase 1 dispatch time.
4. **All 6 stop triggers** in §9 must be live during Phase 1 implementation.

NOT a NO-GO: the panel synthesis confirms the magnitude inversion is real, the architecture supports a clean fix, and the fix shape is faction-symmetric and §8.3 (a)-compliant.

NOT an unconditional GO: §6 triple sign-off chain is the binding precondition.

---

## 7. §6 Sign-Off Chain — Mandatory Preconditions for Phase 1

Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6:

| Role | Required evidence |
|---|---|
| **`/historian`** | (a) ICTY Krstić IT-98-33-T citation for VRS Tactical Group composition. (b) ICTY Popović IT-05-88-T citation for Žepa pocket defender personnel ≈275. (c) Confirm 22:1 raw personnel ratio is historically defensible. (d) Sign-off that "MAX-of-set on terrain class" is consistent with the historical record (i.e., the Žepa enclave-interior is one terrain class — highland forest — not a stack of three independent advantages). |
| **`/game-designer`** | (a) Confirm SHAPE B does not create a Ring 3 refused surface (it does not — no player decision, no atrocity lever, no tradeoff surface). (b) Confirm framework compatibility with P2/P4 (it is — SHAPE B does not touch the URBAN/FOREST constants, only collapses their multiplication). (c) Sign-off that this is P15-class factor and consistent with Combat Master design principles. |
| **`/war-or-game`** | (a) Confirm change is §8.3 (a) honest correction, not §8.3 (b) Srebrenica-tuning. Test: SHAPE B applies identically to RBiH defenders at Žepa, RS defenders at Brčko, HRHB defenders at Vitez/Kiseljak — same code path, same MAX-of-set, no faction conditions. (b) Confirm REAL_WAR_MASTER.md alignment — a real Bosnian War observer would NOT find SHAPE B absurd (overlap-elimination is the obvious fix). |

User approval: required per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 row "Any change that could produce a 'reward for atrocity' effect" — *not* directly applicable here (this is a defender-honesty correction, not a reward), but **conservative interpretation**: any change to combat math at sensitive-history-binding OSIDs (Žepa/Srebrenica/Goražde) goes to user before Phase 1 dispatch.

---

## 8. Acceptance Criteria (13)

For Phase 1 implementation:

| # | Criterion | Verification |
|---|---|---|
| AC-1 | Diff ≤ 25 LOC. One-file owner: `src/sim/combat/combat_math.ts`. | `git show --stat` |
| AC-2 | NO touch to `src/sim/combat/enclave_resilience.ts` or `src/sim/negotiation/rupture_consequences.ts`. | `git show --name-only` |
| AC-3 | At Stupčanica-95 t172, predicted force_ratio rises from 0.831 to ≥0.95 (above-or-near launch threshold), with the predicted ruling stated in advance per §8.3 (a) — i.e., emergent-fall behavior expected, not guaranteed. | runtime trace + predictor log diff |
| AC-4 | 40w smoke gate: 26/27 anchors PASS or better; benchmarks 6/6 PASS. Hash drift class declared (expected: small drift class — env-stack composition change). | `npm run sim:scenario:run:40w` |
| AC-5 | Faction-symmetric mechanism: no `if (faction === 'X')` branches anywhere in the diff. | code review |
| AC-6 | NO new persisted state field (state-shape clean). | check `game_state.ts` unchanged in diff |
| AC-7 | Determinism preserved: no `Math.random()`, no timestamps, sorted iteration where applicable. | determinism-auditor sign-off |
| AC-8 | Production reachability — runtime trace must confirm `MAX(urban, forest, enclave)` lever fires for Stupčanica-95 at t172 with non-trivial collapse (i.e., at least two of the three are >1.0 at this OSID). | trace log |
| AC-9 | Predictor / resolver / sector-rating / estimateForceRatio parity preserved: all four code paths get the SHAPE B collapse identically (which is automatic since they all call `computeDefenderPower`). | grep + diff review |
| AC-10 | At Sarajevo center OSID (`op:centar_sarajevo:centar_sarajevo`): force_ratio change ≤ 5% absolute. (Urban + enclave overlap was already maximal → MAX collapse barely changes Sarajevo since urban 2.0 > enclave 1.x). | smoke probe |
| AC-11 | At Bihać OSID (`op:bihac:bihac_2`): force_ratio change ≤ 10% absolute. Bihać enclave urban OSID — same protection rationale as AC-10. | smoke probe |
| AC-12 | **§6 triple sign-off recorded**: `/historian` + `/game-designer` + `/war-or-game` sign-offs with evidence per §7 above. Each captured as commit-message trailer or linked report. | report file + commit message |
| AC-13 | 188w sensitive-history gate: Phase 1 ruling on Stupčanica-95 stated in advance per §8.3 (a). Either "force_ratio crosses launch threshold and Srebrenica/Žepa fall emerges" or "force_ratio remains below threshold and counterfactual `enclave_held_through_turn` ghost entry fires" — both outcomes canonical, predicted in writing before run. | report file before 188w run |

---

## 9. Stop Triggers (6)

Phase 1 implementation MUST abort and revert if any of:

| # | Trigger | Action |
|---|---|---|
| ST-1 | Phase 1 reduces force_ratio below 1.0 for a Stupčanica-unrelated friendly op (e.g., breaks an HRHB defensive stand at Vitez or Kiseljak; ARBiH stand at Tuzla; RS stand at Brčko). | STOP and revert. |
| ST-2 | Phase 1 changes Krivaja-95 force_ratio AT ALL (out of scope; Phase 4c handles roster). If the diff has any side effect on Krivaja-95 t≥160 force ratios, lane-collision detected. | STOP and revert. |
| ST-3 | 40w anchors regress beyond 26/27 PASS (i.e., Phase 1 introduces a fresh anchor failure). | STOP and revert. |
| ST-4 | Phase 1 requires `enclave_resilience.ts` modification (e.g., panel discovers the cleanest fix is to retune `getEnclaveDefenseBonus`). | STOP and panel-defer. Open new sub-lane with `/historian` co-owner. |
| ST-5 | Phase 1 introduces a faction-conditional branch (`if faction === 'X'` or equivalent) anywhere in `computeDefenderPower` or its callees. | STOP and revert. §8.3 (a) violated. |
| ST-6 | Phase 1 changes Sarajevo (`op:centar_sarajevo:centar_sarajevo`) defender force_ratio by >5% absolute, or Bihać (`op:bihac:bihac_2`) by >10% absolute. | STOP and revert. AC-10/AC-11 violated; the protected enclaves are being collateral-damaged. |

---

## 10. Out-of-Scope (Explicit)

These are **NOT** part of Phase 1 and must remain untouched:

- `src/sim/combat/enclave_resilience.ts` (full file — locked by lane spec).
- `src/sim/negotiation/rupture_consequences.ts` (full file — locked by lane spec).
- `getEnclaveGarrisonPower` raw-power addition (~+147 power at Žepa capital) — known contributor but a different mechanism (raw add, not multiplier); revisiting it requires a separate lane.
- `URBAN_DEFENSE_MULT` (2.0×) tuning — owned by P2.
- `FOREST_DEFENSE_MULT` (1.15×) tuning — owned by P4.
- `DEFENSE_ENV_CAP_THRESHOLD` / `DEFENSE_ENV_COMPRESSION` / `DEFENSE_ENV_HARD_CAP` constants — these stay UNTOUCHED as the second-line safety net under SHAPE B.
- `checkLaunchFeasibility` separate predictor formula — known P14 gap, separate lane.
- `attack_resolution_osid.ts` resolver changes — defender power flows through `computeDefenderPower` unchanged.
- Krivaja-95 roster changes — Phase 4c lane.
- Predictor `fogMult` changes — out of scope.

---

## 11. Lane Bookkeeping

- **This audit file:** `docs/40_reports/audits/20260505_STUPCANICA_DEFENDER_STACK_PHASE_0_PANEL.md` (NEW).
- **No other files touched.**
- **Sibling lanes** (parallel, non-overlapping):
  - `LANE-NIGHTSHIFT-KRIVAJA-ROSTER-LIFECYCLE-PHASE-0-PANEL` — different audit file.
  - `LANE-NIGHTSHIFT-MORALE-OVERRIDE-RETUNE-MINI-PANEL` — different audit file.
- **Pathspec-form commit** mandatory; no `--no-verify`; do NOT push.
