# Combat-Realism Lane 3 — Engine-Health Casualty Model (SCOPING-DRAFT for D1)

**Status:** SCOPING-DRAFT — build-ready scope, no code/data/calibration changed by this document.
**Owner directive:** decision #3, 2026-06-09 (`feedback_calibrate_a_healthy_engine_not_the_floor`). Lane-3 APPROVED as an **engine-health realism lane**. *"Goal of the sim is to simulate what really happened — rifle-armed ARBiH taking more casualties, opposite arcs of VRS and ARBiH."* Calibration serves engine health; the territory floor will be **deliberately re-floored** around the realistic engine.
**Lane owner:** Calibration / combat-engine (NOT event-system, NOT docs-tracking).
**Grounding:** `docs/40_reports/COMBAT_MASTER.md`, `docs/40_reports/REAL_WAR_MASTER.md` (2026-06-08 casualty verdict), `docs/40_reports/proposals/20260608_CASUALTY_MODEL_REALISM.md`, memory `design_equipment_combat_asymmetry` + `casualty_ratio_fix`.
**Reference floor (orchestrator working state):** 188w `5f57d17287b87dfb` (doc-of-record `CALIBRATION_MASTER.md` shows `d311eeac18492683` / 649; the working ref is post-PR-1-v2/B1 reporting-lane state — confirm the live final-save hash at D1 start before measuring deltas).

---

## 0. What is already shipped (do NOT re-do)

Lanes 1 & 2 from the casualty-model proposal are the **reporting-only** half and are effectively in place:

- **KIA/WIA/MIA split canonicalized + re-anchored (Lane 1 — DONE).** `KIA_FRACTION = 0.22 / WIA_FRACTION = 0.74 / MIA_FRACTION = 0.04` is now a **single source** in `attack_casualty_distribution.ts:27-29`, imported by `frontline_attrition.ts:37`, `battle_resolution.ts:47`, and the paramilitary path. The old duplicated `0.30/0.55/0.15` constants are gone; the only residue is a stale comment (`battle_resolution.ts:89`, `frontline_attrition.ts:98`) that still says "0.30/0.55/0.15" — cosmetic, fix opportunistically. This produced the current killed:wounded ≈ **1:3.73**, which already satisfies the ~1:3.5 target. **Lane 3 must NOT touch these fractions** — the split is solved; the remaining overshoot is gross *volume*, not the split.
- **Casualty-model PR-1 v2 Path A (DONE).** `BASE_ATTRITION_RATE 0.004→0.0045`, `BOMBARDMENT_EXPOSURE_RATE 0.006→0.007`, cut killed from ~144k → ~102.8k.

So Lane 3 is purely the **gross-attrition volume + faction-arc shaping** problem against an already-correct lethality split. Targets below are stated in **killed** (with the 1:3.73 split applied), so a killed target of ~60k is the real anchor.

---

## 1. Equipment-asymmetry-dominant casualty model

### 1.1 Where equipment asymmetry lives today (two independent surfaces)

There are **two** casualty surfaces, and equipment asymmetry is wired very differently in each:

**A. Battle path** (`attack_resolution_osid.ts:913-936` → `computeFinalCasualties` in `attack_casualty_distribution.ts:46-66`, constants in `combat_math.ts`). Equipment enters as two *opponent-firepower* multipliers:
- `getBombardmentCasualtyMult()` (`combat_math.ts:886`) — **attacker** artillery+tanks raise **defender** casualties, up to **2.2×** (`MAX_BOMBARDMENT_CAS_MULT`, divisor 60). This is VRS-on-offense punishing ARBiH defenders.
- `getDefensiveFireMult()` (`combat_math.ts:910`) — **defender** artillery+tanks raise **attacker** casualties, up to **1.8×** (divisor 80). This is VRS-on-defense punishing ARBiH attackers (the Brcko fix).
- **Gap (COMBAT_MASTER P-factor #4 / P2 armor):** both functions read `artillery` and `tanks` of the *firing* side, but there is **no own-equipment-deficit term** — a rifle-only brigade is punished only because the *enemy* has guns, never because *it* lacks them in a way that compounds. Tanks-on-defense have no dedicated anti-attacker term beyond the shared firepower sum.

**B. Passive front-attrition path** (`frontline_attrition.ts`) — **the load-bearing ~55% of all casualties.** Here equipment asymmetry IS the dominant term and is modeled correctly in *shape*:
- `BASE_ATTRITION_RATE = 0.0045` (`:66`) — flat, equipment-blind, every front-edge brigade.
- **Bombardment-exposure term** (`:317-335`): `bombardmentFraction = min(1, ln(incomingFP / ownFP) / 2.0)`, `bombardmentCas = personnel × BOMBARDMENT_EXPOSURE_RATE(0.007) × bombardmentFraction × entrenchmentMod`. `ownFP = artillery·op + 0.5·tanks·op` (floored at 1.0). **This is the single mechanism that makes ARBiH bleed more than VRS** — ARBiH ownFP≈1.8 vs incoming≈13 → ratio 7.2 → ln 1.98 → near-full effect; VRS ownFP≈17 vs incoming≈2 → ratio<1 → ln<0 → **zero** bombardment-attrition. The proposal's own measurement: non-battle share RBiH **74.4%** / HRHB 42.2% / RS 28.0%.

### 1.2 The verdict: equipment asymmetry is correctly *directional* but the volume is mis-scaled, and it is UNDER-weighted in the battle path

- In the **front-attrition path** the asymmetry is doing exactly the right thing qualitatively (ARBiH dies in the trench, VRS does not) but the **total volume is ~2.4× too high** and the asymmetry is *diluted* by the equipment-blind `BASE_ATTRITION_RATE` flat term, which hits all factions equally and is the larger of the two terms for most brigades. So today the model is *half* equipment-driven (the bombardment term) and *half* flat (the base term) — to make equipment asymmetry **dominate**, the flat term must shrink relative to the equipment term.
- In the **battle path** equipment asymmetry is *partially* captured (artillery via the two firepower mults) but **does not dominate** — `BASE_ATTACKER_LOSS_RATE 0.08` / `BASE_DEFENDER_LOSS_RATE 0.06` and the outcome modifiers (`OUTCOME_ATTACKER_MOD` up to 3.0) are the bigger casualty drivers, and there is no own-equipment-deficit term, so a rifle-only attacker is not penalized enough relative to a combined-arms one (memory `design_equipment_combat_asymmetry`: "the combat predictor also doesn't factor equipment" + the open armor-defense gap).

### 1.3 The top lever (the headline answer)

**Re-weight the front-attrition split so the equipment-driven bombardment-exposure term DOMINATES the equipment-blind base term, while cutting the combined volume to hit ~60k killed.** Concretely the two dials are:
- `BASE_ATTRITION_RATE` (`frontline_attrition.ts:66`) — equipment-BLIND, faction-flat. **Lower this** (it currently over-feeds all factions equally and dilutes the asymmetry).
- `BOMBARDMENT_EXPOSURE_RATE` (`frontline_attrition.ts:81`) + `BOMBARDMENT_RATIO_SCALE` (`:83`) — equipment-DRIVEN. **Preserve or raise the relative weight** so the rifle-vs-artillery gap is the thing that separates the faction arcs.

Net intent: the *ratio* `BOMBARDMENT_EXPOSURE_RATE : BASE_ATTRITION_RATE` should rise (more of the loss comes from the equipment gap), while the *sum* falls (total volume down to ~60k killed). This is what "equipment asymmetry dominates" means mechanically, and it is the lever that simultaneously fixes the magnitude AND sharpens the opposite faction arcs (§2).

A **secondary, battle-path** lever (lower priority, defer to a later sub-run): add the missing **own-equipment-deficit / armor-on-defense term** (COMBAT_MASTER P2) so the battle path also lets equipment asymmetry dominate rather than the flat loss-rates — but this is territory-coupled and should NOT be bundled with the front-attrition retune.

---

## 2. The opposite faction casualty arcs (the real war)

**Characterization (2-3 sentences, from REAL_WAR_MASTER + ICTY/RDC):** The VRS fought an **artillery-dominant, firepower-ascendant** war — JNA-inherited ~500+ field guns and ~400 tanks gave it a fire-superiority blitz in 1992 (Corridor 0.34:1, Prsten 0.34:1 att:def — VRS inflicted ~3× the losses it took) and a strangulation-not-capture posture thereafter, so its losses are **front-loaded and comparatively low (~21-25k killed, ~38% of military deaths)**, rising only in the 1995 Krajina-collapse cascade. The ARBiH fought a **rifle-armed, manpower-attritional** war — it absorbed the 1992 blitz as the contested defender, could not dislodge dug-in VRS through 1993-94 (every 1994 offensive stalled), and bled steadily across the whole 188w as the side standing in the trench under artillery it could not answer, producing the **highest absolute losses (~31k killed, ~52%)** on a slowly *rising* curve. The HVO sits between — JNA-adjacent equipment, ~6k killed (~10%), concentrated in the 1992 blitz and the 1993-94 Croat-Bosniak war.

**What the model must therefore produce over 188w (not a flat per-faction rate):**

| Faction | Real killed | Arc shape the model must reproduce |
|---|---:|---|
| VRS (RS) | ~21-25k (~38%) | **Front-loaded.** Higher *inflicted* than *taken* in 1992 (low own losses, fire superiority). Flat-low mid-war (strangulation, dug in, equipment-protected → ~zero bombardment-attrition). Late spike only in the 1995 cascade. |
| ARBiH (RBiH) | ~31k (~52%) | **Steadily rising / attritional.** Contested-defender bleed 1992 → sustained trench attrition 1993-95 (the bombardment-exposure term carries this). Largest absolute, on a rising curve, never a single spike. |
| HVO (HRHB) | ~6k (~10%) | Blitz 1992 + CB-war 1993-94 bumps, low otherwise. |

The mechanism that *naturally* produces these divergent curves already exists — it is the **ln(incoming/own FP) bombardment-exposure term** (§1.1B). VRS ownFP keeps its term at ~0 (flat-low arc); ARBiH ownFP keeps its term near-full every week (rising arc). The fix is to make that term carry MORE of the (reduced) total, so the arcs diverge *more sharply* while the aggregate drops. **Do not introduce a hardcoded per-faction rate** — the divergence must remain emergent from equipment composition (Sacred Rule: no faction-specific railroads in the loss model; the existing term is faction-agnostic and reads composition).

**Measurement for arcs:** capture killed-by-faction at 4 checkpoints (w12 blitz / w52 / w104 / w156 / w188) and confirm (a) VRS share starts low-ish and is front-loaded, (b) ARBiH share rises and stays largest, (c) the 1995 window shows the VRS cascade uptick. A flat per-faction rate across the run = FAIL even if the w188 totals match.

---

## 3. Gross-attrition levers + targets

### 3.1 Targets (killed bucket, with the shipped 1:3.73 split)

| Metric | Target | Current (post-PR-1-v2) | Notes |
|---|---:|---:|---|
| Total military killed | **~57-62k** (~60k mid) | ~102.8k | ~1.7× still over |
| ARBiH killed | ~31k | (largest share) | rising arc |
| VRS killed | ~21-25k | | front-loaded arc |
| HVO killed | ~6k | | |
| killed:wounded | **~1:3.5** | 1:3.73 | DONE — do not touch |
| ARBiH share | ~52% | ~57% (was 56.6% at 144k) | over-weighted ~5pp → front-attrition retune should pull this DOWN toward 52% |
| missing/captured (durable) | ~2-10k | ~106k @144k (scales down w/ volume) | see §3.3 |

### 3.2 The volume levers (in priority order)

1. **`BASE_ATTRITION_RATE`** (`frontline_attrition.ts:66`, currently 0.0045) — **primary volume dial, equipment-blind.** Lowering this is the cleanest way to cut total volume AND raise the equipment-term's relative weight. **n553 warning (do NOT repeat blindly):** dropping to 0.003 previously lowered KIA (23.8k→21.1k in that era) but cascaded *negatively* — destroyed brigades 8→15, because marginal late-war brigades thin below viability and the front collapses. The PR-1-v2 comment explicitly restored 0.004→0.0045 for exactly this 188w late-war reason. **Mitigation:** pair any cut with the dissolution/min-personnel protections already noted in the file comment, and measure destroyed-brigade count + territory at 188w, not 40w.
2. **`BOMBARDMENT_EXPOSURE_RATE`** (`:81`, currently 0.007) + **`BOMBARDMENT_RATIO_SCALE`** (`:83`, currently 2.0) — **equipment-driven dial.** To make asymmetry dominate, the goal is to *not* cut this proportionally with the base rate (or even nudge it up) so the ARBiH/VRS divergence sharpens. Lowering `BOMBARDMENT_RATIO_SCALE` makes the term saturate faster (more punishing at moderate FP gaps); raising it softens. Leave near 2.0 unless arc-shaping needs it.
3. **`MAX_BOMBARDMENT_CAS_MULT` (2.2) / `MAX_DEFENSIVE_FIRE_MULT` (1.8)** (`combat_math.ts:883,907`) — **battle-path equipment mults.** These are territory-COUPLED (they change who wins battles, not just casualty counts). Treat as a *later* sub-lever only if the front-attrition retune leaves the battle path under-asymmetric. **Expect territory movement** if touched.
4. **`BASE_ATTACKER_LOSS_RATE` (0.08) / `BASE_DEFENDER_LOSS_RATE` (0.06)** (`combat_math.ts:314,318`) — battle-path volume. Heavily tuned (n482/n536) to hit att:def *ratios*; moving them risks the att:def realism that war-or-game already signed off (Corridor/Prsten 0.34:1). **Avoid unless §3.2.1-2 are exhausted.** Territory-coupled.

### 3.3 Missing/captured (the ~30× phantom — adjacent, decide at D1)

The MC bucket (106k @144k) is dominated by (a) the 0.04 MIA fraction on the inflated gross — which **falls automatically** as volume drops — and (b) the **surrender-cascade** path (`battle_resolution.ts:652-657`): when `isSurrenderCascade`, defender casualties are forced to ≥50% of personnel with a 0.10 KIA / 0.40 WIA split → **0.50 MIA remainder**, a large MC injector. This is reporting-only (no territory cascade — `applyPersonnelLoss` uses the total) and could be a clean separate reporting-lane fix BEFORE Lane-3 (zero territory risk). Recommend: confirm at D1 whether the MC over-production was already addressed; if not, fix the surrender-cascade MIA remainder as a reporting-only pre-step (it is NOT part of the territory-coupled Lane-3 and should not be bundled).

### 3.4 What is territory-COUPLED (will move the floor — expected/approved)

- `BASE_ATTRITION_RATE` — **strongly coupled** (it thins brigade strength → who holds OSIDs at 188w). This is THE n553 cascade risk. Moving the floor here is **expected and panel-approved**.
- `BOMBARDMENT_EXPOSURE_RATE` / `RATIO_SCALE` — coupled (ARBiH brigade strength).
- Battle-path mults (`MAX_BOMBARDMENT_CAS_MULT`, base loss rates) — coupled via outcome/strength.
- MIA / surrender-cascade split, KIA/WIA fractions — **NOT coupled** (reporting-only).

---

## 4. The D1 run plan (one change per run, 188w-gated)

**Calibration-LAST still holds.** Each run changes ONE dial, runs 188w synchronously (per `feedback_188w_validate_combat_changes_before_merge` — 40w + CI is a FALSE-GREEN for combat-behavior changes), and is signed off before the next. The GOAL of each run is "does this match the real casualty arcs / equipment asymmetry," with territory re-flooring to follow.

**Recommended within-lane order:**

| Run | Change | Measure (188w) | Pass / watch |
|---|---|---|---|
| **D1-R0** | (baseline) confirm live final-save hash + capture killed total, killed:wounded, per-faction killed shares, per-faction arc at w12/52/104/156/188, MC bucket, destroyed-brigade count, OSID 712 + 30 anchors. | establish the pre-change fingerprint | this is the comparison point |
| **D1-R1** | (reporting-only, if MC still ~30× over) surrender-cascade MIA remainder fix (`battle_resolution.ts:652-657`). | MC bucket → low-thousands; **OSID + anchors + hash byte-identical on control** (only ledger numbers move) | if hash moves on *territory*, STOP — it should be reporting-only |
| **D1-R2** | **`BASE_ATTRITION_RATE` 0.0045 → ~0.0035** (the primary volume cut; smaller step than the n553 0.003 to avoid the cascade). | killed total (toward ~75-80k); ARBiH share toward 52%; **destroyed-brigade count** (n553 tripwire); OSID delta; anchors. | killed drops + arcs sharpen = GO. Destroyed-brigades spike / Zvornik|brijesnica|Srebrenica|Žepa break = NO-GO, revert, try a milder step or pair with dissolution protection. |
| **D1-R3** | Hold/raise the equipment term relative to base: keep `BOMBARDMENT_EXPOSURE_RATE 0.007` (do NOT cut it proportionally) and, if arcs are too flat, drop `BOMBARDMENT_RATIO_SCALE` 2.0 → ~1.7 to sharpen the rifle-vs-artillery divergence. | per-faction arc divergence (VRS front-loaded vs ARBiH rising); killed shares; OSID delta. | arcs diverge more sharply, ARBiH share ≥ VRS, no anchor break. |
| **D1-R4** | If total still > ~65k after R2-R3, take a second `BASE_ATTRITION_RATE` micro-step OR (only if battle path is the residual) revisit battle-path mults — one at a time. | killed total → ~57-62k. | converge on target; re-floor. |
| **D1-R5** | (optional, defer) battle-path own-equipment-deficit / armor-on-defense term (COMBAT_MASTER P2) — separate, territory-coupled, its own 188w gate. | ARBiH-attacks-VRS att:def ratio toward 2-4:1. | only if the battle path remains under-asymmetric. |

**Each run records:** killed total + killed:wounded + per-faction killed (count + %) + the 5-checkpoint arc + MC bucket + destroyed-brigade count + OSID match (count/712) + the 30 sacred anchors + §6 records.

**Hard invariants that MUST still hold every run (realism does not license breaking these):**
- Sacred territory anchors **Zvornik** (`op:zvornik:zvornik`) and **brijesnica** (`op:lukavac:brijesnica_donja_2`) PASS.
- **§6 genocide record:** Srebrenica and Žepa MUST still FALL in-sim; rupture-consequence records intact.
- Determinism: no `Math.random`/`Date.now`; `strictCompare` ordering; initial OSIDs never overridden; no `avoided_osids_by_faction`.

---

## 5. C1 structural-fingerprint expectation

- The 188w final-save **hash WILL change** on every territory-coupled run (D1-R2 onward) — this is the **deliberate, owner-signed re-floor**, not a regression. C1 must be told to expect a moved fingerprint; do not treat a hash delta as a failure for these runs.
- **40w/52w may also move** (PR-1-v2 already moved the 52w golden-baseline manifest for the casualty model; a `BASE_ATTRITION_RATE` change will move them again). The golden-baseline manifest (`data/derived/scenario/baselines/manifest.json`) must be **re-floored deliberately** when the lane settles, with `npm run test:baselines` regenerated on Windows AND verified == Linux CI actuals (determinism check, per the 52w PR-1-v2 precedent).
- Reporting-only runs (D1-R1, and the already-shipped split) must be **byte-identical on OSID control** — only the casualty *ledger* numbers move. A territory hash delta on a reporting-only run = STOP-and-investigate.
- The settled healthy-engine result becomes the **new 1.0 baseline of record** (CALIBRATION_MASTER + manifest + memory), owner-signed.

---

## 6. Honest risk map

| Risk | Likelihood | Detection | Fallback |
|---|---|---|---|
| **n553 cascade** — `BASE_ATTRITION_RATE` cut thins marginal late-war brigades → destroyed-brigade count spikes, fronts collapse, sacred anchors break. The single biggest risk; it is *why* the rate was restored to 0.0045. | High if the step is too big | destroyed-brigade count + Zvornik/brijesnica/Srebrenica/Žepa at 188w (NOT 40w — n553-class regressions only surface past turn ~40 per the PR-1-v2 comment) | smaller step (0.0045→0.0040 first); or pair with the existing enclave/dissolution min-personnel protection; revert clean (single-constant change). |
| **40w/CI false-green** — combat-behavior change passes 40w + CI but breaks 188w corridor attrition (the COMBAT-P14 #256 precedent: passed 40w + 2 GO but broke the zvornik anchor at 188w). | High | run 188w SYNCHRONOUSLY in the pre-merge gate; never merge on 40w+CI alone | the lane is 188w-gated by construction; do not shortcut. |
| **Arcs stay flat** — total drops but per-faction shape is still a flat rate (ARBiH not rising, VRS not front-loaded). | Medium | the 5-checkpoint arc measurement (§2) | shift weight from `BASE_ATTRITION_RATE` to the bombardment term (D1-R3); the equipment term is what bends the curves. |
| **Battle path resists** — front-attrition retune cuts the ~55% non-battle volume but the ~45% battle volume keeps total > 62k. | Medium | residual killed after R2-R3 | D1-R4/R5 battle-path levers, one at a time, accepting territory movement. |
| **Over-correction** — total drops below ~57k → war becomes too cheap (violates the negative-sum "no free wars" principle and war-or-game Guardrail-1). | Low-Medium | killed total floor 57k | back off the last step; the target is a *band* (57-62k), not a point. |
| **MC fix moves territory** — surrender-cascade edit unexpectedly couples to control. | Low | OSID byte-identity on D1-R1 | revert; MC is reporting-only by design — if it moves territory, that's a separate bug to scope. |
| **Manifest/determinism drift** — re-floored baselines hash differently on Windows vs Linux CI. | Low | regenerate on Windows + diff vs CI actuals (52w PR-1-v2 precedent) | do not re-floor until Windows==Linux confirmed. |

---

## 7. Boundaries / stop gates

- ONE change per run; 188w synchronous gate; no bundling (Sacred Rule "one change per calibration run").
- Do NOT touch the **KIA/WIA/MIA split** (solved at 0.22/0.74/0.04) or the **civilian casualty model** (calibrated, decoupled — REAL_WAR_MASTER §5: "do not touch the civilian model to fix the military numbers").
- Do NOT introduce a hardcoded per-faction loss rate — the arcs must stay emergent from equipment composition (faction-agnostic mechanic; no railroad).
- Determinism is sacred; initial OSIDs sacrosanct; no `avoided_osids_by_faction`.
- Re-floor is owner-signed and deliberate; calibration-LAST — finalize the *realistic* engine, then lock as the 1.0 baseline.
