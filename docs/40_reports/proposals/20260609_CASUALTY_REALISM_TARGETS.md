# Casualty-Realism Targets — Ratification Doc (D1 Lane-3)

**Date:** 2026-06-09
**Status:** PROPOSAL / RESEARCH + RECONCILIATION ONLY. **No code, constants, levers, scenario data, or baselines changed.** PROPOSED locked numbers below require **owner ratification** before any Lane-3 run scores against them.
**Source hierarchy (mandatory):** ICTY OTP Demographic Unit (Tabeau) → RDC *Bosnian Book of the Dead* (Tokača) → Wikipedia/Google cross-check. Every figure cited.
**§6 note:** Srebrenica/Žepa victims are real people. Figures below are reported verbatim from the demographic record; nothing is minimized or rounded away.
**Supersedes nothing; reconciles:** `20260608_CASUALTY_MODEL_REALISM.md`, `20260609_CASUALTY_SOURCE_BREAKDOWN.md`, `REAL_WAR_MASTER.md` top review (which audited the *older* 143,980-killed run, NOT the current floor).

---

## BOTTOM LINE (read this first)

**The locked target is ~57.5k total military KILLED (ARBiH ~31k / VRS ~23k / HVO ~6k).** The sim's current 102,621 "killed" **does map apples-to-apples onto RDC "soldiers who died"** — the engine never folds captured/removed/deserted men into the killed bucket (those go to a separate MIA column; brigades are never destroyed-into-killed; "killed" is a per-turn KIA *flow* summed over the war, conceptually the same quantity RDC counts). So **the real overshoot is genuine, not a units mismatch: 102,621 ÷ ~57.5k ≈ 1.78× (≈ +78%).** This is *materially smaller* than the ~2.4× figure in the prior REAL_WAR_MASTER review — because that review predates the KIA_FRACTION 0.30→0.22 cut (which already pulled killed 143,980→102,621 and fixed the K:W ratio from 1:1.9 to 1:3.74, now essentially on-target). **The right lever is therefore NOT the KIA/WIA split (already fixed) and NOT a missing/captured reclassification (the buckets are already clean) — it is total casualty VOLUME, and per `20260609_CASUALTY_SOURCE_BREAKDOWN.md` the dominant source is battle resolution (55.8% of kills via `BASE_ATTACKER/DEFENDER_LOSS_RATE` in `combat_math.ts`), with frontline attrition second (43.4%).** Lane-3 RUN1 already proved a −25% battle-lethality cut closes most of the gap on casualties (188w killed −3.9%, K:W flat) **but costs −63 painted-match OSID** — so the volume cut is calibration-entangled and must be paired/bounded, not taken raw.

---

# PART A — What really happened (sourced)

### A1. Total documented war deaths, military vs civilian

The authoritative count is the RDC *Bosnian Book of the Dead* (Mirsad Tokača / Research and Documentation Center Sarajevo; final results Jan 2013, first published Jun 2007), endorsed by the ICTY Demographic Unit (Ewa Tabeau) as "the largest existing database on Bosnian war victims."

| Quantity | Figure | Source |
|---|---:|---|
| Total documented deaths/missing | **~97,207** (min; +~5,100 unconfirmed) | RDC 2007/2013 |
| — Military (soldiers) | **57,523 (~59%)** | RDC — independently confirmed this pass |
| — Civilian | **39,684 (~41%)** | RDC — independently confirmed this pass |
| Still-missing (durable unresolved fate) | **~10,500** | ICMP / RDC |

The RDC framing is "deaths/missing" — i.e. a **documented death is a person who died** (or whose fate is unresolved-presumed-dead). It does NOT carry a wartime POW/exchange flux column; transient captures that ended in release are simply not deaths and are absent from the 97,207.

Cross-check: RFE/RL and ReliefWeb both report 97,207 / ~60% soldiers / ~40% civilian. The "350,000 recorded casualties including 97,207 deaths" phrasing (cross-check sources) implies an aggregate all-casualty : death ratio ≈ 3.6 : 1, consistent with the K:W discussion in A3.

### A2. Per-faction MILITARY deaths — by ARMY OF SERVICE (the correct frame)

The working assumption in the prompt (~52% Bosniak / ~38% Serb / ~10% Croat; ~57.5k total) is **substantially correct on totals and direction, and close on shares** — with one critical methodological caveat the owner has already adjudicated.

| Army of service | Military deaths (RDC by-formation) | Share | Note |
|---|---:|---:|---|
| **ARBiH** | **~31,000** (RDC 30,906) | **~52%** | Largest absolute toll — ARBiH really did suffer the most |
| **VRS** | **~21,000–25,000** (floor 20,775; ~23k mid) | **~38%** | RDC RS registries late/incomplete; Serb police counted separately → likely a floor |
| **HVO** | **~6,000** (RDC 5,919) | **~10%** | |
| **Total military** | **~57–62k (~60k mid)** | 100% | |

So ARBiH military deaths were **~1.3–1.5× VRS**, NOT roughly equal — and the sim's RBiH-killed > RS-killed *direction is historically correct.*

**THE TABEAU PITFALL (owner-confirmed REJECTION — do not regress).** The ICTY OTP 2010 paper (Zwierzchowski & Tabeau, Table 6a) gives dead *soldiers by ETHNICITY of the dead*: **Muslim 42,492 / Serb 15,298 / Croat 7,182.** This is the breakdown by *who the dead person was*, **NOT by which army they served in.** It undercounts the VRS (late RS registries; Serb MUP counted separately) and conflates burial-status with combat status. A prior doc version mislabeled it "ARBiH 42,501 / VRS 15,299 / HVO 7,183" — **that was wrong; the army split is the RDC by-formation table above.** Do not use the ethnicity split as an army split.

### A3. Realistic killed : wounded ratio

- The Bosnian War — like modern infantry war generally — ran **~1 killed : 3–4 wounded** (ICRC / standard combat-medicine 1:3 to 1:4; irregular wars with poor evac trend *higher* WIA, not lower).
- The aggregate "350,000 recorded casualties / 97,207 deaths" cross-check (~3.6:1 all-cas:death) is consistent with K:W in the 1:3 band once civilians are netted out.
- **WIA data is far less documented than KIA** — there is no authoritative wounded register comparable to the Book of the Dead. Treat any K:W target as a *band* (~1:3 to 1:3.5), not a hard number.

### A4. Casualty TIME-SHAPE (front stabilization)

- **1992 was by far the deadliest year** — the JNA/VRS blitz, ethnic-cleansing campaigns (Prijedor, Zvornik, Foča, Višegrad), and the war of maneuver before lines hardened.
- **1993–95 saw front stabilization / trench stalemate.** Lines barely moved (the Sarajevo siege ring shifted <5 km² net across 1,425 days; every 1994 ARBiH town offensive stalled short). The 1995 spike was driven by *exogenous* enablers (Storm, Deliberate Force, Mistral 2) over weeks, not a return to 1992-scale sustained combat.
- **Implication for the sim:** a model that produces a *flat or late-loaded* casualty curve over 188 weeks is mis-shaped even if the total is right. The current engine's dominant kill source is **passive frontline attrition + per-turn battle resolution**, both of which accrue *uniformly per week* — structurally prone to over-producing 1993–95 losses relative to the 1992 front-loaded reality.

---

# PART B — What the sim's number MEANS (semantic reconciliation)

### B1. Current sim output (CURRENT FLOOR `5f57d172`, 649/712 — NOT the stale 143,980 run)

| Bucket | Total | RBiH | RS | HRHB |
|---|---:|---:|---:|---:|
| **Killed** | **102,621** | 57,732 (56.3%) | 36,397 (35.5%) | 8,492 (8.2%) |
| WIA | 383,288 | 218,176 | 135,172 | 29,940 |
| MIA (missing/captured) | 53,881 | 31,309 | 19,532 | 3,040 |
| **K:W ratio** | **1:3.74** | 1:3.78 | 1:3.71 | 1:3.53 |

*(Source: `20260609_CASUALTY_SOURCE_BREAKDOWN.md`, ledger ground truth from `final_save.json`.)*

**These numbers are NOT the 143,980/106,153 in the REAL_WAR_MASTER top review.** That review audited run `n2018`, which predates the `KIA_FRACTION 0.30→0.22` reporting-split fix. The split fix alone moved killed 143,980→102,621 and corrected K:W 1:1.9→1:3.74 and MIA 106,153→53,881. **Lanes 1 (split) and 2 (MIA) from `20260608_CASUALTY_MODEL_REALISM.md` are effectively DONE.**

### B2. What `casualty_ledger.killed` actually counts

Read of `src/state/casualty_ledger.ts`, `src/sim/combat/attack_casualty_distribution.ts`, `src/sim/combat/frontline_attrition.ts`, `siege_attrition.ts`, `attack_retreat_displacement.ts`:

1. **"killed" = a per-event KIA flow, summed over the war.** Every battle / attrition tick computes a `casualties` integer, splits it `killed = floor(cas × KIA_FRACTION=0.22)`, `wounded = floor(cas × 0.74)`, `missing_captured = remainder (~0.04)`, and *adds* to `faction.killed` via `recordBattleCasualties`. It is a cumulative flow accumulator, exactly like a real KIA tally — **not** an end-state headcount.
2. **"killed" is KIA only — it does NOT fold in captured/removed/deserted men.** Those distinct fates land in the separate `missing_captured` bucket (the ~4% remainder) or simply reduce `personnel` without being recorded as killed.
3. **Brigades are NEVER destroyed-into-killed.** `attack_retreat_displacement.ts` explicitly: *"Brigades are NEVER destroyed by retreat — worst case inactive with minimal personnel."* There is **no destroyed-brigade → killed reclassification**, and no MIA→killed reclassification path anywhere. Desertion (`morale_drift.ts`) drains personnel but is **not** recorded as killed.
4. **No POW-return/exchange model exists** — MIA accrues and never decrements. (This is why MIA is still ~54k, well above the ~10.5k durable-missing anchor — a residual reporting inflation, but a *separate* bucket from killed.)

### B3. Is the mapping apples-to-apples? — YES.

**The sim's "killed" IS the comparable quantity to RDC "soldiers who died."** Both are "a combatant died." The earlier worry — that 102k "killed" might secretly be a "permanently-combat-removed" bookkeeping number conflating dead + captured + long-term-wounded + deserters — **does not hold against the code**: WIA, MIA, and desertion are all tracked in *separate* channels and none feed `killed`. Therefore:

- **102,621 sim killed vs ~57.5k RDC military dead is a TRUE overshoot of the same quantity ≈ 1.78× (+78%).**
- **NOT** the "x4.17 killed+captured" framing from the stale review (that summed killed + the over-inflated MIA against the total death toll — a category error now that MIA is its own clean, separately-fixable bucket).
- The MIA over-count (~54k vs ~10.5k durable) is a *real but separate* reporting problem (no POW-return model), **not** evidence that "killed" is mislabeled.

### B4. Which historical quantity is the right comparand?

| Sim bucket | Right historical comparand | Why |
|---|---|---|
| **killed (102,621)** | **RDC military dead ~57.5k** | apples-to-apples; primary target |
| WIA (383,288) | implied ~3–3.5× the dead → ~170–200k | no authoritative WIA register; band only |
| MIA (53,881) | durable still-missing ~10.5k | sim has no POW-return; separate low-priority fix |
| K + W + M (540,790) | aggregate ~350k all-casualty record (incl. civ) | loose cross-check only; sim military-only K+W+M is not directly the 350k figure |

**Primary scoring quantity = `killed` against ~57.5k.** Total-casualties (K+W+M) is NOT the better comparand here, because the sim's MIA bucket is a known artifact and the historical 350k "casualties" figure mixes military+civilian and lacks a clean military K+W+M decomposition.

---

# PART C — PROPOSED LOCKED TARGETS (for owner ratification)

### C1. Target table

| Metric | **PROPOSED LOCKED TARGET** | Sim current floor | Mapping / overshoot |
|---|---|---:|---|
| **Total military KILLED** | **~57,500** (band 55k–62k) | 102,621 | sim "killed" = RDC military dead; **×1.78 (+78%)** |
| — RBiH (ARBiH) killed | **~31,000 (~52% share)** | 57,732 (56.3%) | ×1.86; share +4.3pp too high |
| — RS (VRS) killed | **~23,000 (~38% share)** | 36,397 (35.5%) | ×1.58; share −2.5pp |
| — HRHB (HVO) killed | **~6,000 (~10% share)** | 8,492 (8.2%) | ×1.42; share −1.8pp |
| **K : W ratio** | **~1 : 3 to 1 : 3.5** | 1 : 3.74 | **already on/near target — DO NOT re-touch the split** |
| **Military MIA (durable)** | **~3,000–10,500** | 53,881 | ×5–18 high; separate low-pri lever (POW-return model) |
| Total casualties (K+W+M) | secondary cross-check only (~170–260k military) | 540,790 | not the primary comparand (see B4) |
| Civilian killed (total) | ~38–40,000 | 43,164 (sep. ledger) | ~1.1× — **calibrated; leave alone** |
| Civilian ethnic split | ~83 / 11 / 6 (Bosniak/Serb/Croat) | 84 / 7 / 9 | minor; do not touch to fix military |

### C2. Is 102,621 too high, and by how much — once the mapping is correct?

**Yes — but by ~78%, not the ~140% the stale review implied.** The semantic correction matters:
- The KIA/WIA split (Lane 1) and the worst of the MIA inflation (Lane 2) are **already fixed** — that is why the number fell from 143,980 to 102,621 and K:W is now historically reasonable (1:3.74).
- The residual overshoot is **almost entirely casualty VOLUME**, distributed: battle resolution 55.8% (`BASE_ATTACKER_LOSS_RATE 0.08` / `BASE_DEFENDER_LOSS_RATE 0.06` in `combat_math.ts`), frontline attrition 43.4% (`BASE_ATTRITION_RATE 0.0045` + `BOMBARDMENT_EXPOSURE_RATE 0.007` in `frontline_attrition.ts`).

### C3. The right lever (and its hazard)

**The lever is total casualty VOLUME, dominated by battle-resolution loss rates — NOT the split, NOT a missing/captured reclassification.** But this lever is **calibration-entangled** (it moves brigade strength → territory):
- **Lane-3 RUN1** (`BASE_ATTACKER 0.08→0.06`, `BASE_DEFENDER 0.06→0.045`, −25%) measured: 188w killed −3.9% only (102,621→98,567), K:W flat — **but −63 painted-match OSID (649→586) and one anchor break (`op:foca:foca_3`)**, because weakened RS defense cedes Herzegovina/Drina and the surviving HVO over-expands (+60% HVO killed). §6 intact (both enclaves still fall, sacred anchors hold).
- A −25% battle cut barely dents the total (−3.9%) yet wrecks territory — because *frontline attrition* (43.4% of kills, untouched by that lever) is the larger uncut mass. **Closing a +78% gap by volume alone would require cuts deep enough to collapse calibrated territory.**

**Recommended framing for the owner (per "calibrate a HEALTHY engine, not the floor"):** the gap is a *shape + volume* problem, best attacked as a **paired** move, not a single raw rate cut:
1. **Trim frontline-attrition volume** (the 43.4% mass that battle-lethality cuts don't touch) — `BASE_ATTRITION_RATE` and/or `BOMBARDMENT_EXPOSURE_RATE`. This is also the **RBiH-share fix** (frontline is 71–91% RBiH), and casualty-orthogonal to OSID control in principle — but 188w-gated (it was historically tuned *to* territory; see `n303`/`n553`). **The bombardment term (17.4% of kills, 91.4% RBiH) is the single cleanest RBiH-share lever.**
2. **Time-shape constraint (NEW, recommend adding to the target):** the target should *not* be total-only. A healthy engine front-loads 1992 and thins 1993–95. Recommend the Lane-3 success criterion include a **per-year (or per-phase) killed distribution check** — e.g. 1992 should carry a disproportionate share, 1994 the least — so the volume trim isn't achieved by flattening an already-mis-shaped curve. Per-turn uniform attrition is the structural reason the curve is likely too flat today.

### C4. Time-shape implication (explicit answer)

**Yes — the target should also constrain the 1992-vs-1993-95 distribution.** Hitting ~57.5k total with a flat curve would still be wrong (it would over-produce trench-stalemate deaths and under-produce the 1992 blitz). Propose adding a **phase-distribution guard** to the Lane-3 scoring (front-loaded 1992; thinnest 1994; 1995 a sharp exogenous-enabler spike, not a sustained 1992-level grind). Owner to ratify whether this becomes a hard gate or an advisory check.

---

## Boundaries / stop gates

- **No `Math.random` / `Date.now`; `strictCompare` ordering preserved** (determinism is sacred).
- KIA/WIA split is **already on-target (1:3.74)** — do **not** re-touch it to chase total volume.
- Volume levers (battle-resolution rates; frontline attrition) move brigade strength → **188w-validate synchronously before any merge** (per `feedback_188w_validate_combat_changes_before_merge`); 40w + CI is a false-green for combat-volume changes.
- **Civilian model is calibrated — leave it alone**; military and civilian pipelines stay decoupled.
- §6: Srebrenica + Žepa must continue to FALL; sacred anchors (`op:zvornik:zvornik`=RS, `op:lukavac:brijesnica_donja_2`=RBiH) must hold. Lane-3 RUN1 confirmed both intact under a −25% cut.
- **These numbers are PROPOSED — owner ratifies before any scoring run.** This is calibration-owned; do not close from the docs/tracking lane.

## Sources

- RDC *Bosnian Book of the Dead* (Tokača) — [HRDAG by-formation results PDF](https://hrdag.org/wp-content/uploads/2013/02/rdn5.pdf); [Every Casualty Counts summary](https://everycasualty.org/bosnian-book/); [Balkan Insight 2013](https://balkaninsight.com/2013/01/22/bosnian-ngo-presents-written-memorial-to-victims/)
- 97,207 / 57,523 soldiers / 39,684 civilians / ethnicity split — [RFE/RL Tokača profile](https://www.rferl.org/a/Bosnian_Researcher_Counts_The_Dead_And_Faces_Threats_For_His_Objectivity/1350799.html); [ReliefWeb "Over 97,000 killed"](https://reliefweb.int/report/bosnia-and-herzegovina/over-97000-bosnians-killed-civil-war-study)
- ICTY OTP 2010 Demographic Unit (Zwierzchowski & Tabeau) — ethnicity-of-victim, NOT army-of-service: [casualty-undercount conference paper](https://www.icty.org/x/file/About/OTP/War_Demographics/en/bih_casualty_undercount_conf_paper_100201.pdf)
- Cross-check — [Bosnian War (Wikipedia)](https://en.wikipedia.org/wiki/Bosnian_War); [RDC (Wikipedia)](https://en.wikipedia.org/wiki/Research_and_Documentation_Center_in_Sarajevo)
- Engine/internal — `src/state/casualty_ledger.ts`, `src/sim/combat/attack_casualty_distribution.ts`, `src/sim/combat/frontline_attrition.ts`, `src/sim/combat/siege_attrition.ts`, `src/sim/combat/attack_retreat_displacement.ts`, `src/sim/combat/combat_math.ts`; reports `20260608_CASUALTY_MODEL_REALISM.md`, `20260609_CASUALTY_SOURCE_BREAKDOWN.md`, `REAL_WAR_MASTER.md`, `COMBAT_MASTER.md`, `docs/40_reports/proposals/20260609_combat-realism-lane3-RUN1.md`
