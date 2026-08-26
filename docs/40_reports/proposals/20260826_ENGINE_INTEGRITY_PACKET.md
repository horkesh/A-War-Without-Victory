# ENGINE INTEGRITY PACKET — findings brief for the Pyrrhic panel

**Date:** 2026-08-26
**Status:** EVIDENCE BRIEF + PROPOSAL SKELETON. Nothing implemented. Nothing run.
**Owner instruction (2026-08-26):** *"Engine health is sacrosanct — these issues should be dealt
with immediately before more calibration work."* This packet exists to turn that instruction into a
roadmap workstream.

**Reading rule for panel seats:** every claim below is tagged. `[SOURCE-VERIFIED]` = re-read in
source on 2026-08-26 at HEAD of `codex/master-roadmap-execution`. `[RECORD]` = quoted from the
standup record (ledger / life-lessons / spawned reports), independently orchestrator-verified at the
time it was written, **not** re-verified today. `[INFERRED]` = a mechanism nobody has proven.
**Treat every one of them as a claim to attack, not a briefing to ratify.** The implementer's bias
is stated plainly in §7.

---

## 0. Provenance of this brief

The daily standup cron stopped emitting standalone documents in April 2026. Since then its output
lands as PROJECT_LEDGER entries, the daily life-lessons review, and the reports it spawns. "The last
five standups" therefore means the record of 2026-08-21 → 2026-08-26:

- `PROJECT_LEDGER.md` 2026-08-21 — *Standup findings: the casualty field is not a count of men, and attrition has no memory* (incl. its two same-day corrections)
- `PROJECT_LEDGER.md` 2026-08-21 — *Reason codes: the engine computed its refusals and threw them away*
- `docs/life_lessons.md` — New Lessons batches 2026-08-22, 2026-08-24, 2026-08-25, 2026-08-26
- `docs/40_reports/20260824_RETREAT_ABSORPTION_ASYMMETRY.md`
- `docs/40_reports/20260824_FROZEN_VRS_FRONT_ROOT_CAUSE.md`
- `docs/40_reports/proposals/20260824_TERRAIN_BLIND_LAUNCH_GATE_FINDING.md`
- `docs/40_reports/20260824_SCENARIO_TESTER_N286_ASSESSMENT.md`
- `docs/40_reports/20260823_FOUR_LANE_CALIBRATION_DIAGNOSIS.md`

Calibration lanes from the same window (jan1993 package, upper Drina, consolidation sweep, painted
reference corrections, the 677/664/664/650 floor) are **deliberately excluded** — Codex owns them.

---

## 1. CLUSTER A — the cost loop is open  ★ ROOT

**Plain statement:** men leave brigades and nobody is charged for them, so nothing the war costs
ever reaches the units.

### A1 — replacement restores strength at no quality cost `[SOURCE-VERIFIED]`

`src/sim/formation_spawn.ts:275` `reinforceBrigadesFromPools`. Per turn, per formation:

- draws `min(tierCap - current, rate)` from the home municipality pool, where
  `rate = floor(baseRate × factionMult)` and `baseRate = COMBAT_REINFORCEMENT_RATE (200)` if
  `isInCombat(f)` else `REINFORCEMENT_RATE (400)` (`src/state/formation_constants.ts:266,272`);
- writes **`f.personnel` only**. It does not touch `cohesion`, `morale`, or any experience field.
  The single cohesion write in this function (`:442-443`) is the HRHB support package, which *raises*
  cohesion.

Contrast: `src/sim/combat/brigade_reconstitution.ts:411,461` sets `f.cohesion = RECONSTITUTION_COHESION`
on a rebuilt formation. **The engine already holds the concept "a rebuilt formation is not the
formation that was destroyed"; the ordinary replacement path does not use it.**

Observed signature `[RECORD]`, `runs/…w188_n225` `brigade_temporal_log.jsonl`:

```
17th Vitezka   t105 1,750 → t106 1,308 → t107 1,768 → t108 1,800   (2 turns to establishment)
501st Slavna   t134 1,741 → t135 1,338 → t136 1,616 → t137 1,800   (2 turns)
F_RBiH_0002    t35 1,910 → t36 777 → … t39 1,774 → t41 745 → t44 1,748  (shattered twice)
```

### A2 — the demographic charge is a second, divergent casualty model `[SOURCE-VERIFIED]` ★ NEW

There *is* a manpower feedback loop. `src/sim/turn_phases/war_phases.ts:3091`
(`apply-casualty-pool-exhaustion`) charges permanent losses to `formation.origin_mun`'s pool via
`applyCasualtyPoolExhaustion` (`src/sim/early_war/pool_population.ts:422`), at 75% of `killed +
missing_captured`. `pool.exhausted` then gates `runOngoingMobilization`
(`src/sim/combat/ongoing_mobilization.ts:285-291`): half rate at 25% of military-age males,
hard stop at 50%.

**It does not consume the casualties the battle applied. It re-derives them.** The step's own
comment at `war_phases.ts:3097` reads *"Uses the same loss rates and outcome modifiers as
attack_resolution_osid."* That is false at every constant:

| term | real path (`combat_math.ts` / `attack_casualty_distribution.ts`) | demographic charge (`war_phases.ts:3098-3110`) |
|---|---|---|
| attacker base loss rate | `BASE_ATTACKER_LOSS_RATE = 0.08` | `ATK_RATE = 0.045` |
| defender base loss rate | `BASE_DEFENDER_LOSS_RATE = 0.06` | `DEF_RATE = 0.02` |
| KIA fraction | `KIA_FRACTION = 0.22` | `KIA_FRAC = 0.30` |
| WIA fraction | `WIA_FRACTION = 0.74` (V2 gate default-ON: 0.76 main) | `WIA_FRAC = 0.55` |
| ATK outcome mod (dec/vic/costly/stale/rep/cat) | `1.3 / 1.4 / 1.8 / 1.2 / 2.0 / 3.0` | `1.0 / 1.2 / 1.8 / 1.0 / 2.0 / 3.0` |
| DEF outcome mod (dec/vic/costly/stale/rep/cat) | `2.5 / 1.8 / 1.2 / 1.0 / 0.7 / 0.7` | `2.5 / 1.8 / 1.2 / 0.8 / 0.5 / 0.3` |
| `lastStandCasMult` (×1.6 on an absorbed battle) | applied | **absent** |
| `militiaOnlyMult`, `defensiveFireMult`, `bombardmentMult`, `attCasMult`, `defCasMult` | applied | **absent** |
| `getLanchesterConcentrationBonus` | applied to defender | **absent** |
| stack attribution | per-brigade shares (`computeAttackerCasualtyShares`, `defenderCasualtyShares`) | **`battle.attacker_brigade` / `battle.defender_brigade` only** |
| personnel basis | pre-battle personnel | post-battle personnel (comment: *"Not exact… close enough"*) |

Two compounding consequences:

1. **Stack blindness.** `[RECORD]` 130 of 607 battles at 188w have a multi-brigade attacker stack and
   312 a multi-brigade defence. In every one, the non-named brigades' home municipalities are charged
   nothing. Same defect class as the withdrawn 10× casualty claim, one layer down — and it survives
   in *behaviour*, not merely in reporting.
2. **The absent `lastStandCasMult`** is exactly the multiplier an absorbed defence pays (see A3), i.e.
   the most common battle shape in the game is the one charged least faithfully.

Measured on `data/derived/latest_run_final_save.json` (turn 39, current tree) `[SOURCE-VERIFIED]`:

| faction | pools with state | `available` | `committed` | `exhausted` | exhausted / committed |
|---|---|---|---|---|---|
| RBiH | 52 | 30,380 | 182,604 | 7,212 | **3.9%** |
| RS | 63 | 8,637 | 88,589 | 5,144 | 5.8% |
| HRHB | 32 | 18,165 | 47,734 | 1,037 | 2.2% |

*(Note for the calibration seat: `committed` is monotone and also counts toward the exhaustion
denominator, so the demographic ceiling is not wholly inert — but permanent loss is a small
fraction of throughput, and it is the term that should represent "these men are gone".)*

### A3 — the downstream signature `[RECORD]`, mechanism `[SOURCE-VERIFIED]`

`src/sim/combat/attack_morale_absorption.ts` refuses an OSID transfer on a won battle via
`professionalResilience = defMorale >= resistFloor && (outcome === 'costly_victory' || outcome === 'victory')`,
with floors RBiH 50 / RS 55 / HRHB 60 (`combat_math.ts:305`) and
`VICTORY_THRESHOLD_DECISIVE = 2.0`. Absorbed battles cost both sides `MORALE_ABSORPTION_CAS_MULT = 1.6`.

Baseline `…w188_n1` (639/712, `git_dirty:false`, hash `cc88344e922ac8b4`):

| faction | floor | active brigades | above floor | won battle absorbed | brigades destroyed |
|---|---|---|---|---|---|
| RBiH | 50 | 132 | **132** | **100%** | **0** |
| RS | 55 | 65 | 23 | 35% | 25 |
| HRHB | 60 | 42 | 26 | 62% | 4 |

Median morale t188: RBiH 97 / RS 42 / HRHB 90. At turn 0, 84 of 84 RBiH formations are already above
floor. **Candidate root for the long-open `rs_brigade_destruction_asymmetry_engine_flaw`.**

Other downstream signatures from the same run `[RECORD]`: `op:centar_sarajevo:radava` attacked
**40 times, 0 wins, 6 distinct attackers** across t51–t186 (the `REAL_WAR_MASTER #39` guard stalls on
two *consecutive* catastrophic outcomes and is satisfied by brigade rotation and by returning 60 turns
later); **198 of 397 attacker wins (50%)** are followed by the same faction re-attacking the same OSID
within three turns.

### A-PROPOSAL (skeleton — the panel's job is to attack, refine, or replace it)

- **A-1 · single-source the loss ledger.** `apply-casualty-pool-exhaustion` consumes the per-brigade
  applied casualties the resolver already computes, instead of re-deriving them. Deletes a duplicate
  model, fixes stack attribution, restores the missing multipliers. **Territory-moving** (the pool
  gate binds sooner) → one 188w alone.
- **A-2 · dilute quality on replacement.**
  `cohesion' = (cohesion·current + REPLACEMENT_COHESION·transfer) / (current + transfer)`.
  Constant precedent exists (`RECONSTITUTION_COHESION`). One 188w alone.
- **A-3 · rebuild latency.** A formation that lost more than *X*% in a turn draws at a reduced rate
  for *N* turns. This is the term that reaches the corps commander. One 188w alone.

**Explicitly NOT proposed:** weakening `attack_morale_absorption`. Per napkin 0e that is not an
implementer's call and is entangled with a live §6 referral (the rule holds Petkovci, an
ICTY-documented July 1995 execution site, as ARBiH ground). It is listed here as a **consequence** of
A1/A2, not as a lever.

---

## 2. CLUSTER B — truth computed, then dropped at the projection boundary

Four "the engine is silent about X" findings are one defect: data the engine computes and discards.
`[RECORD]`, except where noted.

- **The battle record names one attacker and one defender** for an engagement resolved between a
  stack and a sector. `attacker_casualties` and `power_ratio` are correctly computed over the
  aggregates; the record does not say so. `attacker_brigades` (`attack_resolution_osid.ts:1258`) and
  `defender_contributions` (`:1270`) are built and were dropped at the weekly projection.
  **Partly fixed already** `[SOURCE-VERIFIED]`: `scenario_runner.ts:2967-2984` now restores both,
  gated behind `whenReasonCodeTopic('battle_stack', …)`, i.e. **default-OFF**.
- **The power-ratio denominator has no representation.** `defenderPower` is a sector aggregate;
  `SECTOR_STANCE_REACTIVE_BONUS` spans 0.5–1.3 and `getReactiveDistanceWeight(hops) = 0.60^hops`
  returns a hard 0 past 5 hops or when BFS-unreachable. A measured 7× ratio swing between two arms of
  a controlled pair was entirely denominator-side, with byte-identical named combatants.
- **5,910 formation refusals counted nowhere** against 25 that were counted (0.4% coverage); split
  `pool_below_required` 5,603 / `existing_brigade_below_capacity` 307.
- **The health gate's `dead_ops` counts *invalid* ops, not *inert* ones** (`engine_health_gate.cjs:260`
  — `dead_ops: cc.invalid_operation_count`). On the clean 637 baseline it read 0 while 13 of 42
  operations recorded zero attacks and 21 captured zero objectives. `zero_eligible_ops` is
  operation-scoped while the `zero_eligible_axis` blocker is axis-scoped.
- **`axis_reject` is structurally blind to in-flight operations**: `launch_blocker_detail` is written
  into `operation_aars.json` and an operation still executing at t188 produces no AAR.

Inertness of the existing flag `[RECORD]`: default 188w reproduces `final_state_hash 8bb624ebafa7a925`,
14 of 15 artifacts byte-identical to `n225`; flag-ON differs by exactly 6 added `launch_blocker_detail`
keys, zero value differences, resting on the emit-absent-keys-not-nulls contract.

### B-PROPOSAL (skeleton)

- **B-1 · default the reason codes on** and accept one golden-manifest re-pin.
- **B-2 · emit `launch_blocker_detail` for in-flight operations**, not only at AAR time.
- **B-3 · fix the gate predicate**: tally `total_attacks` per axis; make `zero_eligible_ops`
  axis-scoped. A green gate should mean operations ran.

---

## 3. CLUSTER C — the VRS front freezes because the corps AI only issues probes `[RECORD]`

`attack_resolution_osid.ts:1397`: `flip = (decisive|victory|costly_victory) && !isProbeOp`. Probes
cannot capture — correct by construction. The defect is **selection**, after the pre-planned
catalogue runs out.

| period | RS capture-capable attacks | RBiH |
|---|---|---|
| w0–28 | 90 | 13 |
| w29–188 | **12** | 71 |
| w101–188 | **0** | 52 |

```
op:donji_vakuf:jemanlici   won 10 of 10, ratios to 3.66   zero control events in 188 weeks
op:bugojno:medini          won 5 of 5, ratios to 7.34     zero control events in 188 weeks
op:rogatica:brcigovo       won 1, ratio 2.52, REAL op     flipped
```

Three explanations already ruled out with evidence: the VRS is not idle (29 operations across the
whole war); the attack decline is **authored** (`apr1992.json` `doctrine_phases.aggression_modifier`)
and must not be reopened — see also the settled cohesion-floor ruling (owner, 2026-08-12); the
never-spawn rate is symmetric across factions (2–3%).

Probes are absent from `operation_history`, which is why an operation-type audit never revealed this.

### C-PROPOSAL (skeleton)

- **C-1 · instrument the selection**: when a corps falls through to a probe, record which predicate
  sent it there (`bot_corps_ai.ts` / `bot_corps_operations.ts`), on the same flag as B.
- **C-2 · fix the gate that the real-operation path is failing**, not the probe rule.
- **C-DEPENDENCY:** with A3 live, capture-capable VRS attacks against RBiH ground are absorbed 100%
  of the time. **C is not measurable before A moves.**

---

## 4. CLUSTER D — the planner is terrain-blind `[RECORD]` — OWNER DECISION, ALREADY PANELLED

Six call sites pass empty terrain caches to the prediction path; `buildSlopeByOsid` has exactly one
call site (the resolver), so the planner has no slope analogue at all. 305 of 712 OSIDs (42.8%) sit
above the mountain slope threshold. Panel ruled 2026-08-24, five seats, **unanimous REFINED — no
NO-GO and no clean GO**, which escalates to the owner. Three standing conditions: the site count rose
2→3→4→6 and a partial fix *creates* the split-brain it was justified by removing; `terrain_friction_index`
is byte-identical to `slope_index` in 6,137/6,137 settlements (+10.2% at the median from double
counting) and must **not** be bundled; the fix disproportionately strengthens militia/small-OG
defenders, so the enclave guard is a first-class tripwire.

Full record: `docs/40_reports/proposals/20260824_TERRAIN_BLIND_LAUNCH_GATE_FINDING.md`.
**This packet does not re-open D. It asks where D sits relative to A.**

---

## 5. CLUSTER E — the harness cannot attribute a small delta

- **E1 · the front is re-diced weekly** `[RECORD]`. The 22nd Krajina's `sector_id` walks 1→0→8→4
  across t185–188; the same corps holds 12 sectors in one arm and 8 in the other. Because
  `defenderPower` is a sector aggregate, defensive strength is partly a function of that week's
  partition. **Trap:** the brigade's own `sector_id` is *not* what the combat path reads — it reads
  the sector object's `assigned_brigade_ids` / `reserve_brigade_ids`.
- **E2 · a two-turn operation shift re-rolls 188 weeks** `[RECORD]`. Only ~15 of ~45 ops matched;
  losses in 13 municipalities, none near the target. **At this altitude the harness cannot attribute ±10.**
- **E3 · operations skip injection silently** `[SOURCE-VERIFIED]`. `pre_planned_operations.ts:1163`
  carries four same-corps guards (`hasActiveOperation`, `queued_operations.length > 0`,
  `injectedCorps.has`, `deferredCorps.has`) that fire **before** `validateOpAtInjection`, so no warning
  is emitted. Operation Majevica was a correctly-executed null for exactly this reason. Follow-on ops
  reach a corps only through hardcoded `queued_operations` blocks at `:1269-1305`, which exist for
  `vrs_herzegovina`, `vrs_drina`, `vrs_sarajevo_romanija`, `vrs_1st_krajina` — and not for
  `vrs_east_bosnian`.

### E-PROPOSAL (skeleton)

- **E-1 · make the injection guard report** a reason instead of skipping silently; replace the four
  hardcoded per-corps `queued_operations` blocks with a general "queue if corps busy" rule.
- **E-2 · emit an op-schedule fingerprint per run** (op id → creation turn) and require a schedule
  diff before reading any delta under ±10.
- **E-3 · sector partition stability is *observation only* in this packet.** Emit the sector context
  on the battle record (this is B); do not change partition behaviour here.

### Housekeeping, same window `[RECORD]`

- `data/derived/latest_run_final_save.json` is **tracked** and rewritten by every 188w run; an
  evidence run followed by `git add -A` ships ~397,674 changed lines. Currently dirty in the tree.
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` takes **38 minutes alone**
  (one test 21 min) and emits nothing until the end, so any probe reads it as a hang. It passes
  inside the full suite.

---

## 6. Dependency claim the panel must test

```
A1 replacement is free ──┐
                         ├─→ morale never falls ──→ absorption fires 100% vs RBiH ──┬─→ 0 RBiH brigades lost, 40-attack loops
A2 losses undercharged ──┘   pool never binds                                       └─→ C stays frozen even after C is fixed
```

**The load-bearing sequencing claim: C cannot be measured before A moves, and D should not land on
top of A** (D strengthens defenders further, on top of a defence that already never loses; after the
fact the two are not separable). **Attack this claim first.** If it is wrong, the whole ordering is
wrong.

---

## 7. Declared implementer bias

This packet was assembled by the seat that found A2 and wrote the dependency claim in §6. It is
therefore biased toward: (a) A being the root rather than one of five peers; (b) the single-source
ledger fix being cheap and obviously correct; (c) deferring D. Seats are asked to attack these three
specifically. A seat that refutes its own proposal in the same session is doing the job right.

Known prior failures of exactly this shape, all from the last five days: a site count that rose
2→3→4→6 under scrutiny (terminated by narrative sufficiency, not exhaustion); a gate built on a field
whose distribution was never printed (`to_control === 'controlled'` matched every municipality); a 10×
casualty claim published and withdrawn the same day; nine orchestrator claims killed by measurement in
one session. **Assume this packet contains at least one of each.**

---

## 8. LIVE CORRECTIONS — panel findings that refute this packet

*Appended during the panel, 2026-08-26. A wrong claim left standing in the record is the disease
itself; corrections are made here rather than appended as a separate contradicting document.*

### C-1 — "the pool never binds" is FALSE. The binding term is `committed`, not `exhausted`.
**Source: Engine/Systems seat, MEASURED on `data/derived/latest_run_final_save.json` (t39).**
`ongoing_mobilization.ts:285` gates on `cumulative = available + committed + exhausted`, and
`committed` is **monotone — never decremented anywhere in `src/`**. At t39 `exhausted` is only
1.5% (HRHB) / 3.3% (RBiH) / 5.0% (RS) of that numerator, and **45 of 147 live pools are already past
the 0.50 hard cap with 28 more in the half-rate band**. Doubling `exhausted` moves exactly **one**
pool across 0.25 and **zero** across 0.50.

⇒ **§1's A2 framing is misleading.** The demographic ledger's divergence is real and the duplicate
model is a genuine defect, but its *causal channel to territory is near-inert*. **A-1 is re-tagged:
ENGINE CORRECTNESS, not a territory lever.** Its expected territorial effect is likely below the ±10
attribution floor this packet itself names in §5/E2.
⇒ Consequence for the plan: **persistence of attrition has to live on the FORMATION, not on the
pool.** That moves the weight from A-1 to A-2/A-3.

### C-2 — the §6 dependency claim is FALSE. C does not depend on A.
**Source: Engine/Systems seat, MEASURED.** Two absorption-independent flip paths exist:
- `decisive_victory` is excluded from **all three** absorb branches
  (`attack_morale_absorption.ts:119-123`; Engine Invariants §9.6 — *"decisive_victory ALWAYS flips —
  no exception"*). In the t39 save **71 of 96 RS-vs-RBiH wins are `decisive_victory`**; only 15 are
  absorbable at all.
- Absorption sits inside `if (defenderFormation)`. **51 of 156 battles have no defender formation**,
  so no absorption path exists for them.

⇒ **"C cannot be measured before A moves" is STRUCK.** Cluster C is independently actionable and
independently measurable. The §6 diagram is wrong on its right-hand branch.
⇒ This also weakens, but does not settle, the argument for deferring D. D is still owner-facing.

### C-3 — A-1 as originally worded targets a consumer that cannot supply the data.
**Source: Engine/Systems seat, MEASURED.** The exhaustion step reads
`context.report.attack_resolution_osid.battles` **in-process**, before any projection — so nothing is
"dropped before the report is assembled". But attacker shares (`casShares`,
`attack_resolution_osid.ts:1125`) are computed, applied, and **never written to the record**;
`defender_contributions[].casualties_taken` is present **only when `sectorDefenseBrigades.length > 1`**.
The re-derivation exists for a mundane reason: it was written 2026-03-02 (`e86e0e58b`), before
`defender_contributions` (2026-03-13) and `attacker_brigades` (2026-07-23) existed. **No structural
justification survives.**

⇒ **Refined A-1:** charge `pool.exhausted` **in the resolver at the loss sites**, from raw local
`killed + mia`, and delete the separate step entirely. Precedent already exists twice —
`frontline_attrition.ts:364-372` and `siege_attrition.ts:186-196` both charge at the point of loss.
The battle path is the only outlier.
⇒ **Hazard the packet missed:** sourcing from the *applied split* couples `pool.exhausted` to
`getMainCasualtySplit()` (`casualty_realism_v2_gate.ts`, default-ON), which was adopted on an explicit
promise of territory-orthogonality and has a flag-OFF byte-identity test. Sourcing raw pre-split
`killed+mia` is the way out. **Never** source from `casualty_ledger` — it is realism-scaled per faction
(RBiH 0.39 / RS 0.50 / HRHB 0.75, `casualty_ledger.ts:75`) and would inject a faction-asymmetric charge.

### C-4 — the `origin_mun` vs `mun:` tag second defect does NOT exist.
**Source: Engine/Systems seat, MEASURED.** Across 266 formations in the t39 save: **0 mismatches** in
the 230 carrying both fields. Every spawn site writes both from the same variable. The 19 with a tag
and no `origin_mun` are corps_asset/army_hq at 0 personnel; the 17 with neither are 0-personnel
paramilitaries; none are reinforcement-eligible. §1's hinted second defect is withdrawn.

### C-5 — §2's "dropped and only restored default-OFF" is wrong for the save.
**Source: Engine/Systems seat, MEASURED.** `compile_turn_summary.ts:160` persists
`defender_contributions` **unconditionally** (76 of 156 battles in the current tracked save). Only
`attacker_brigades` is genuinely dropped by both projections. §2's first bullet overstates the loss.

### C-6 — a false comment, recorded so it is not inherited.
`applyCasualtyPoolExhaustion`'s doc comment claims *"Deterministic: sorted formation IDs"*
(`pool_population.ts:421`) — **there is no sort.** Harmless today (integer addition is
order-independent) but the prose is false and would mislead the next reader.

---

**Running tally of packet claims refuted by the panel: 6.** Author's declared bias in §7 predicted at
least one; it was six, and five of them came from a single seat asked to attack. The instrument that
works in this repo is independent polling with the bias stated up front.
