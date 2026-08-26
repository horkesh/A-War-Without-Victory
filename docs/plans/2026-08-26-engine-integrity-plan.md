# RE — Engine Integrity: probe memory, operation supply, and the cost loop

**Workstream:** RE (new gate lane, sibling of RC)
**Status:** SCOPED — eight-seat panel complete, not started
**Created:** 2026-08-26 · **Revised:** 2026-08-26 after full panel return
**Executable plan for:** Master Roadmap §5 row `RE`
**Evidence packet:** [`20260826_ENGINE_INTEGRITY_PACKET.md`](../40_reports/proposals/20260826_ENGINE_INTEGRITY_PACKET.md) (incl. §8 live corrections)

---

## 1. Owner instruction and authority

> **Owner, 2026-08-26:** *"Engine health is sacrosanct — these issues should be dealt with
> immediately before more calibration work."*

That instruction creates this workstream and sets its precedence over further calibration lanes. It
does **not** authorize editing `docs/10_canon/FORAWWV.md`, crossing the §6 bright line, publication,
or disabling any gate.

**Scope boundary with Codex.** Codex owns the live calibration lanes. This plan touches no painted
reference, `init_control`, op objective, axis, timing, or roster. See §8 for the lane-class split.

---

## 2. What the panel found

Eight seats were convened with the implementer's bias declared in the packet's own §7 and an
instruction to attack rather than assess. **Fourteen packet claims were refuted.** Two seats
independently converged on a root cause that appears nowhere in the packet, and it is roughly ten
lines of code.

### 2.1 ★ THE ROOT: the engine records probe outcomes into a memory it cannot read

Two defects, found separately by the Corps-Commander and Operations seats, that together explain
**365 of 585 battles (62%) being probe operations that cannot capture ground**:

**(a) A probe that fights never records a failure.** `sector_offensive.ts:846`, `recordFailedObjectives()`:

```ts
if (op.recovery_reason === 'probe_complete') return; // Probes gather intel — not a failure
```

and `sector_offensive.ts:1630` recovers *every* probe that landed ≥1 attack and did not capture as
exactly that reason. **The only probes that record a failure are the probes that never fought.** The
memory is not missing — it is inverted. Live proof from `final_save.json`:

```
arbih_1st_corps   op:centar_sarajevo:radava   failure_count  1   cooldown_until_turn   0   (26 attacks)
vrs_east_bosnian  op:brcko:brka_2             failure_count 13   cooldown_until_turn 182   ( 0 attacks)
vrs_1st_krajina   op:doboj:klokotnica_2       failure_count 12   cooldown_until_turn 182   ( 0 attacks)
```

The selector reads this map (`emit.ts:1176`, `:1214`). Radava is never on cooldown and is re-picked
forever; the VRS locks its own real objectives out for eight turns per abort.

**(b) The probe cooldown is disconnected.** `emit.ts:1059-1074` builds `PROBE_COOLDOWN_TURNS = 4`
from in-flight probes *and* — per its own comment — from completed ones in
`previous_state.operation_history`, scanning for `entry.type === 'probe'`. **Both writers of that
history (`emit.ts:1428`, `:1452`) hardcode `type: 'sector_attack'`.** Nothing ever writes a probe
entry. Measured: **91 `operation_history` entries across 8 corps, zero of type `probe`.** The
cooldown is enforced only while a probe is still in `active_operations` — and a probe is
single-brigade with `planning_duration: 1` that enters recovery the moment it attacks. The bridge
the comment describes was never built.

**And the anti-repetition guard works perfectly while accomplishing nothing.**
`MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT = 2` is held on `axis.consecutive_catastrophic_on_current` —
**per-axis-per-operation state**. Radava's 26 attacks are **13 separate probe operations making
exactly two attacks each.** The guard fires at attack #2 every time, stalls the axis, ends the
operation — and the next probe is a new `CorpsOperation` with a new axis at counter zero.

> **This is why the loop is indifferent to outcome.** Radava (25 catastrophic) and Gornja Vratnica
> (24 decisive victories, 39 attacks) take **the same two code paths**. Nothing in re-selection reads
> what happened last time, because the only history input is a map probes cannot write.

### 2.2 The corps AI is broken for all three factions, not just the VRS

Classified over all 585 attacks by operation-name pool:

| faction | probe | corps-AI real | authored |
|---|---|---|---|
| RS | 65 | **0** | 71 |
| RBiH | 252 | **23** | 43 |
| HRHB | 45 | **0** | 32 |

**The corps AI produces 23 capture-capable attacks in 188 weeks and all 23 are RBiH.** The ARBiH's
apparent late recovery is authored — **42 of its 45 real attacks in w141-188 are catalogue ops**
(Sana, Farz 95, Vlasic Ridge, Donji Vakuf 95); the corps AI contributes three. The RS's visible
freeze is simply that it has no late catalogue to mask the same defect.

**The gate they die at:** `force_ratio_estimate < launchFloorForOp(op)`, floor 0.3.
**14 of 14 RS commander ops score 0.012–0.297 with zero attacks; 13 of 13 RBiH score 0.876–20.4.
Zero overlap.** `estimateForceRatio` puts 2-4 participating brigades in the numerator against *every
standing-OG defence brigade of every facing enemy sector* in the denominator — task force against
corps — then applies `trueRatio × (0.3 + 0.7 × accuracy)`, which **always under-reports**, while its
own comment claims commanders over-estimate. It is self-sealing: an op that aborts before fighting
never earns the combat intel that would have let it launch.

### 2.3 ★ The cost loop's real root is the strategic reserve, which the packet never mentions

The replacement signature **holds at HEAD** — re-derived by the Formation seat on the clean `n294`
(`git diff 180695239 HEAD -- src/ data/` is empty, so it is a HEAD-engine run at the current floor):

| faction | brigade-turns | ≥25% single-turn drops | recovered to ≥95% within 3 turns |
|---|---|---|---|
| RBiH | 22,166 | 162 | **43 (27%)** |
| RS | 15,459 | 165 | **6 (4%)** |
| HRHB | 6,896 | 22 | **2 (9%)** |

**It is a faction property, not an engine property.** All three of the packet's exemplars are RBiH.
Attrition has memory for the VRS and HVO and partial memory for the ARBiH.

**The mechanism is `state.military.strategic_reserves`: RBiH 256,091 · HRHB 21,039 · RS 0.**
`collectStrategicReserves` sweeps every pool above `OVERFLOW_THRESHOLD = 5000` into a faction-level
reserve that is **not gated by any exhaustion check** (the 0.25/0.50 test lives only in
`ongoing_mobilization`, which governs inflow *into* pools), **not decayed** (`pool_decay` touches
`pool.available` only), **not keyed to any municipality**, and **fed by territorial loss** via
orphan-pool drain. At 0.15 × 400 = 60/turn across ~126 RBiH brigades that is ~34 turns of
unconstrained maximum draw. Effectively inexhaustible.

**The cap fires and funds the bypass in a single step.** Splitting RBiH drops by whether the home
pool is past the hard cap: **capped-pool brigades recover 34% of the time, uncapped 3%** — same sign
in all three factions. A pool passes the cap *because* it overflowed, and overflowing is exactly what
funds the reserve. `collectStrategicReserves:100` does `pool.committed += excess` for men moved *out*
of the municipality, so **30.7% of RBiH's total `committed` is parked in the reserve**, and capped
pools show `committed` at 4.0× the establishment of every brigade homed there.

⇒ **A-1 is demoted from root to hygiene.** Charging losses faithfully raises `exhausted`, which is
3.5-8.9% of a numerator dominated by inflated `committed`, in pools already capped, feeding brigades
that draw from a reserve the gate cannot see.

### 2.4 Verdict table

| Seat | Verdict | What it killed or changed |
|---|---|---|
| Corps / Army Commander | **C-1 REFINED (reject as written)**, C-2 GO-on-diagnosis | The predicate is already legible; the re-issue memory is inverted; **withdrew its own leading fix** under the historian tripwire |
| Operations | **E-1 REFINED, E-2 GO (key redesigned)** | E3 is **1 op, not 8**, and does **not** feed C; found the dead probe cooldown |
| Formation | **A-2 BLOCK**, A-3 REFINED/GO | Signature holds at HEAD but is faction-specific; **the strategic reserve is the root**; A-3 needs a second patch site or it is a no-op |
| Engine / Systems | A-1 REFINED | Pool binds on monotone `committed`; §6 dependency chain **struck** |
| War-or-Game | Re-ranked | C to #1; the Radava loop is an independent selection defect |
| Historian | A-2 GO **faction-asymmetric**, C **re-priced down** | The two lead exemplars are **historically inverted** |
| Calibration | Sequencing REFINED | Real gate is four per-checkpoint minimums with 3-6 OSIDs of headroom |
| QA / determinism | B-1 REFINED, B-3 GO-with-sequencing | B-1 is a 3-4 artifact re-pin; the corrected gate goes **RED** |

---

## 3. Phase 0 — free work, zero scenario runs

| # | Task | Acceptance |
|---|---|---|
| 0.1 | **Retrospective op-schedule diff** from existing `operation_aars.json`. Report the full ladder — name-only / name+corps+turn / corps+turn / **corps+objectives** / +brigades — never a single name-keyed number. | Reproduces the measured n286/n287 pair: 29 / 23 / 23 / **29** / 24. |
| 0.2 | **Corrected health-gate predicate, REPORTED-NOT-GATED.** Old `dead_ops` stays gated under a renamed `invalid_op_weeks`. | Corrected axis-scoped counts emitted alongside the old ones; nothing un-gated in the interim. |
| 0.3 | **Clean four-checkpoint baseline pin** on the tree RE branches from. | `git_dirty:false`, all four checkpoints, hash + consumed-inputs digest recorded. |
| 0.4 | **Write the decision rule (§9) into `CALIBRATION_MASTER.md` before run 1**, unamended thereafter. | Present and dated. |
| 0.5 | **Correct the record.** `REAL_WAR_MASTER #40` P3 → **P0**, reopened as the probe-selection defect. Project memory KIA figures (`~30k/24k/8k`) → BB-sourced **18,543 VRS / ~6,400-6,900 HVO**. | Both corrected with citations. |
| 0.6 | **One assertion test:** no bot name-pool entry may collide with an authored operation name. Zero collisions today (112 pool names vs 27 authored), but `operation_names.ts:71` already carries `'Operacija Lukavac'` against an authored Lukavac 93, and the file records a prior Stupčanica-95 collision. | Test present and green. |

> **Why 0.2 is reported-not-gated.** The corrected predicate reads **`dead_ops` 11 against a ceiling
> of 6** and **axis-scoped `zero_eligible_ops` 13 against 3** — both RED — while the shipped gate
> reads perfect green against 11 of 45 operations with zero attacks. Blessing 11/13 as the ceiling
> now would ratchet the defect in as the floor.

---

## 4. Phase 1 ★ — the probe memory repair (highest value, smallest change)

**This is the head of the programme.** Roughly ten lines across three files, addressing 62% of all
battles. It **reduces** attack volume and manufactures no gain for anyone, so it is safe against the
historian tripwire by construction.

| # | Change | Site |
|---|---|---|
| 1.1 | **Let probes that fought write objective-failure memory.** Gate the early return on `attack_attempt_count === 0` so only probes that never fought stay exempt. | `sector_offensive.ts:846` |
| 1.2 | **Reconnect the probe cooldown.** Write `type: 'probe'` for probe operations at the two `operation_history` writers, or key the cooldown scan off the operation record rather than the type string. | `emit.ts:1428`, `:1452` (scan at `:1067`) |
| 1.3 | **Move the anti-repetition guard off the operation.** `axis.consecutive_catastrophic_on_current` is per-op state fighting a per-objective problem; the corps-scoped `failed_offensive_objectives` map is the right home and 1.1 populates it. | `sector_offensive.ts:1874` → `emit.ts` selector |

**Expected direction:** far fewer probes, and the ~131,577 attacker casualties currently spent on
ground that cannot change hands largely stop being spent. The probe channel is 252/365 ARBiH, so the
saving falls mostly on the ARBiH and touches no VRS real operation.

**Measurement:** territory-moving; one 188w **alone**, against the §9 rule. Do not bundle 1.1-1.3
with anything — but they may land as one change, because 1.3 is meaningless without 1.1.

**NOT ESTABLISHED, and must be measured rather than assumed:** how much of the 62% the dead cooldown
accounts for versus the inverted failure memory.

---

## 5. Phase 2 — make refusals legible

| # | Change | Notes |
|---|---|---|
| 2.1 | **Write the missing `factsOut` pin BEFORE flipping any flag.** `sector_offensive_launch_helpers.ts:1039-1052` and `:1287-1298` pass an argument into a live predicate that changes from `undefined` to an object under the flag. It is write-only today — **but no test asserts that.** ~20 lines. | do first |
| 2.2 | **B-1: reason codes default-ON.** Re-pin **only** artifacts whose delta is attributable to added keys, with a diff proving zero value changes. **Never a blanket `--update`** — `apr1992_52w` has been red since 2026-08-12 and a blanket re-pin would bake that regression into the golden baseline. `test:baselines` is **not in CI**, so sign-off is a named human step. `tests/strict_null_inventory_progress.test.ts` is a hard-equality ratchet and **will** fail; that is an intended re-pin, not a CI surprise. | after 2.1 |
| 2.3 | **Wire `collectOpInjectionWarnings` into the five silent `return false` paths** in `injectQueuedOperation` and the busy-corps guards. The machinery already exists and already warns on two other paths. | recovers Zvezda 94's reason |
| 2.4 | **B-2: emit `launch_blocker_detail` for in-flight operations**, not only at AAR time. | |
| 2.5 | **Creation-time op-schedule emitter.** One append-only row per `buildCorpsOperation` call — all five creation sites route through that factory. **The AAR-derived diff cannot be the durable instrument:** AARs are structurally blind to probes (62% of battles), to ops still executing at t188, and to queued-but-never-injected ops like Zvezda 94 — exactly the class 2.3 exists to catch. Costs one manifest re-pin; **do not schedule it as free.** | |
| 2.6 | **If C-1 instrumentation is still wanted, instrument one layer down.** `sector_offensive.ts:1342-1352` already builds `prepEvents` carrying `force_ratio_estimate` and `intel_confidence` per op per turn and drops them at the projection — the same cluster-B defect. Add `ownStrength`, `enemyStrength`, `defenderFormations.length`, `accuracyFactor`. | projection change, same flag as 2.2 |

---

## 6. Phase 3 — operation supply

| # | Change | Notes |
|---|---|---|
| 3.1 | **Make `assessThreats` zero-local.** `assess.ts:195-231` diffs lost OSIDs against the **union over all a corps's zones**, then assigns the result to **every** zone. Live: one settlement lost at Donji Vakuf marks a besieged 4-edge zone at Travnik `critical`, suspending a plan staged at Banja Luka; that corps ends the run with 11 surplus brigades and zero operations. Pure bug fix, no tuning. | unblocks planning only; released ops still face the 0.3 floor |
| 3.2 | **General "queue if corps busy" rule**, replacing five hardcoded blocks. **Behaviour-neutral today** — verified: the rule reproduces all five lists exactly in raw array order. Skips caused by *validation failure* must NOT queue. **Must preserve raw `ALL_PRE_PLANNED` order and must not sort by `available_from`**, or n1145 recurs (Donji Vakuf promoted to 2nd stalled 23 turns and blocked Operation Corridor). | Also fixes a live **player-path** hole invisible to every 188w: declining Operation Prijedor makes Corridor / Jajce / Donji Vakuf / Bosanski Novi cease to exist for the whole campaign. **R28 screened and not reintroduced** — a queue entry is a bare name string that commits no brigades. |
| 3.3 | **Bound the must-hold multiplier's dependence on `commitment_ratio`.** `clamp(0.75 × commitment_ratio, 2, 5)` rises as a corps thins, so attrition raises the garrison requirement without limit: `vrs_sarajevo_romanija` 62 edges / 8 brigades → budget 21, deficit 13, `can_launch_ops:false`. **5 of 6 VRS corps have zero allocate-stage surplus; 0 of 5 ARBiH and 0 of 4 HVO do.** | measure after Phase 1 |
| 3.4 | **C-2 — the launch gate. TRIPWIRE-GATED, and NOT as a volume lever.** | see below |

> ### ★ 3.4 carries a withdrawn recommendation, and the withdrawal is binding
>
> Correcting the estimation-error direction in `estimateForceRatio` was the Corps-Commander seat's
> leading fix. **It withdrew that fix itself** under the historian constraint: it would raise VRS
> real-op volume across the board, and **11 of the 14 blocked RS ops sit in theatres where the VRS
> should be losing.**
>
> **The historically correct VRS count after week 101 is two to three capture-capable operations in
> 95 weeks** — Goražde April 1994 (the ARBiH lost the entire southern bank; stopped by NATO
> ultimatum, not by the ARBiH) and Bihać Nov 1994-Jan 1995 (Veliki/Mali Radić retaken, five km of
> depth). **Brčko 13-20 April 1994 is a genuine zero** — a week of attacks, no gains in any
> territory. Srebrenica and Žepa do not rescue the number: canon **H1.8** owns them as events.
>
> **TRIPWIRE.** `op:donji_vakuf:jemanlici` and `op:bugojno:medini` are **historically inverted** —
> the VRS was *defending* at Donji Vakuf, which fell to the ARBiH 7th Corps in September 1995, and
> Bugojno was ARBiH-held from July 1993. **A change that flips either cell is manufacturing
> ahistorical VRS gains and improving the score for the wrong reason. It is a failure, whatever it
> does to `matched_osids`.**
>
> If 3.4 is ever revisited it must be as a **predictor-honesty** fix, tested only on whether the
> predictor's estimate tracks the resolver's actual outcome, with those two cells as a NO-GO gate.

---

## 7. Phase 4 — the cost loop

### 7.1 — A-3 · rebuild latency  *(the surviving cost-loop change)*

**The hook already exists and is broken.** `applyPersonnelLoss` (`battle_resolution.ts:749-756`)
already sets `readiness='degraded'` below `MIN_BRIGADE_SPAWN` (800), and
`isEligibleForReinforcement` already blocks degraded formations — but **no war-phase path ever
restores `readiness` to `'active'`.** It is a permanent lockout, not a latency, and it almost never
fires because refill outruns the 800 threshold.

**Shape — no new state, no save migration.** Use the existing `disrupted_turns`:

- **Trigger:** in `applyPersonnelLoss`, single-turn loss ≥30% of pre-battle personnel →
  `disrupted_turns = max(disrupted_turns, 3)`.
- **Effect:** multiply `rate` by `REBUILD_LATENCY_MULT` (0.33) while `disrupted_turns > 0`, in
  **BOTH `reinforceBrigadesFromPools` AND `reinforceFromStrategicReserves`.**
- **Also fix:** restore `readiness` to `'active'` once personnel ≥ `MIN_BRIGADE_SPAWN`, or the
  degraded lock is a latent permanent kill.

> **★ Patching only the pool site makes A-3 a second no-op.** ~95% of replacement flows at
> reserve-draw magnitude: positive deltas ≥200 are 5% / 2% / 4% of all gains, and modal gains of
> 45-60 match the reserve draw rates exactly. **The binding constraint is reserve stock × draw-rate
> multiplier — not the 400/200 rate, not the pool (median `available` is 0), not the exhaustion cap.**

**Screen before landing:** a declined attack and a lost battle feed the *same* counter, so a
single-axis op can abort at `MAX_TOTAL_FAILURES_SINGLE_AXIS = 4` after four suppressed *non-attacks*.
Separate those counters first.

**Warning to measure, not assume:** A-3 will bite RS/HVO **harder** than RBiH (RS 165 big drops vs
RBiH 162, and RS has no reserve to draw on). **It may widen the asymmetry it is meant to address.**

**Ships with a player-facing surface or not at all:** a "reconstituting — unavailable, N weeks" state
on `FormationDetail` and the ops-modal `BrigadeCard`. Without it the player sees an operation silently
refuse to launch and reads it as a bug rather than a cost.

### 7.2 — the strategic-reserve lane  *(the actual manpower root)*

Three candidate interventions, cheapest first. **Each is territory-moving and needs its own 188w.
Not a bundle.**

1. Subject `strategic_reserves` to `POOL_DECAY_RATE` as pools already are.
2. Stop `collectStrategicReserves` writing overflow into `pool.committed` — it corrupts the gate
   denominator in the donor's favour.
3. Gate reserve draws on a faction-level exhaustion ratio.

**NOT ESTABLISHED:** whether the RS reserve was ever non-zero and drained, or never filled. The t188
save shows 0 and no artifact on disk carries a per-turn reserve series. **Settle this before
choosing an intervention** — it decides whether the reserve is an RBiH-specific escape hatch or a
faction-neutral mechanism the RS simply cannot feed.

### 7.3 — A-1 · single-source the loss ledger  *(hygiene, demoted)*

The defect is confirmed and real: `war_phases.ts:3098-3110` re-derives casualties at
`KIA 0.30 / WIA 0.55 / ATK 0.045 / DEF 0.02` against the real path's `0.22 / 0.74 / 0.08 / 0.06`,
drops every multiplier including the ×1.6 last-stand term, and attributes a stack's losses to one
named brigade — while its own comment claims parity that holds at no constant.

**But it is not the root and will not move territory.** Charge `pool.exhausted` in the resolver at
the loss sites from raw pre-split `killed + mia` and delete the separate step; precedent exists twice
(`frontline_attrition.ts:364-372`, `siege_attrition.ts:186-196`). **Never source from
`casualty_ledger`** — it is realism-scaled per faction (RBiH 0.39 / RS 0.50 / HRHB 0.75). **Sort the
shares Map with `strictCompare` before charging**, because charging against a shared depletable pool
makes insertion order result-bearing.

**Adopt on mechanism, not on delta. It does not earn a dedicated 188w ahead of Phase 1 or 7.1.**

### 7.4 — A-2 · BLOCKED, routed to §6

**Cohesion dilution is a measured no-op.** `cohesion_drift.ts:170-186` applies the faction floor
**unconditionally, before the `next === prev` early-out**, to every non-engaged formation. At t188,
**57 of 126 RBiH brigades sit at cohesion exactly 62** (median 62.0); of RBiH brigade-turns observed
below floor, 44% are back at it the next turn and 71% within two.

**The precedent the packet cited is itself already dead:** `RECONSTITUTION_COHESION = 30` is *below*
the RBiH floor of 62, so a reconstituted ARBiH brigade is snapped back to 62 on the first turn it
does not fight.

⇒ **A working A-2 would be a floor change wearing a replacement-path costume.** The floors are
owner-settled modelled history (2026-08-12). This is the fourth time they have been circled; it is
flagged **before** code is written, not after. **Do not build it.**

**If the panel wants the effect, the field is `morale`, not `cohesion`** — morale floors (30/25/20,
plus RBiH existential 25) sit far below the resist floors (50/55/60), so a dilution is not clamped
away, and +2/turn affinity recovery makes a −10 dilution cost ~5 quiet turns. **But that lands
squarely inside the live §6 absorption referral. ROUTE IT TO §6; DO NOT BUILD IT HERE.**

Also settled, and worth keeping so it is not re-argued: **no operation launch gate reads cohesion.**
`areParticipantsReadyForExecution` reads `status`, `personnel ≥ 500`, `disrupted_turns`, and
location. A-2 could never have unfrozen operation selection.

---

## 8. Sequencing, parallelism, and cost

**Order:** Phase 0 (free) → **Phase 1 (probe memory)** → Phase 2 (legibility) → Phase 3 (operation
supply) → Phase 4 (cost loop) → Phase 5 (owner decisions).

**Run cost:** ~12-14 × 188w ≈ 15 hours, down from the pre-panel estimate of 19 because A-2 is dropped
and A-1 is demoted.

### Parallelism with Codex — decisive

| Codex lane class | Carries over? | Action |
|---|---|---|
| Painted-reference repaints, `init_control` corrections | **YES** — a correctly painted cell is correct under any engine | continue unimpeded |
| Op-objective, axis, timing, roster lanes | **NO** — deltas measured against combat behaviour Phases 1-4 change globally | stop, or bank as "re-measure after RE" |

**Precondition:** Codex lands a clean `git_dirty:false` four-checkpoint pin; RE branches from *that*,
**in its own worktree**. There is currently **no four-checkpoint measurement of the working tree** —
every post-retraction run is `--weeks 39`, so apr1994/apr1995/oct1995 are NOT ESTABLISHED.

---

## 9. The pre-committed decision rule

**Write into `CALIBRATION_MASTER.md` before run 1. Do not amend after seeing a number.**

> **S0 — Baseline.** No RE run starts until a clean `git_dirty:false` four-checkpoint 188w exists on
> the tree RE branches from.
> **S1 — Inertness gate.** Any step claimed inert must be byte-identical to that baseline except
> `run_meta.out_dir`. Not identical ⇒ reclassified territory-moving, repriced at 3 runs.
> **S2 — Positive control.** Every instrument returns ≥1 non-zero on a case known to exist.
> **S3 — Predicted loss set, written FIRST.** Name the faction, mechanism, and OSIDs the fix *should*
> cost. **Adopt only if ≥2/3 of actual losses fall inside the predicted set.**
> **S4 — Bands, per checkpoint:** **0 to −3** jitter, decide on mechanism · **−4 to −10**
> unattributable, requires a schedule-fingerprint diff; if ≥20% of ops differ in creation turn the
> number told you nothing · **−11 to −25** real signal, adoptable only with S3 satisfied · **worse
> than −25 on any checkpoint** STOP, owner decision.
> **S5 — Tripwires override any score.** All four anchor sets (31/32/40/31); the enclave guard
> (Srebrenica/Žepa fall; Goražde/Bihać/Teočak/Sarajevo core hold); the western-Bosnia cascade
> (Grahovo 4/4, Šipovo 5/5, Glamoč 6/6, Sanski Most 10/10); **and the §3.4 historian tripwire.**
> **S6 — THE DISCRIMINATOR IS LOCATION, NOT MAGNITUDE.** Fix-right ⇒ losses cluster on the
> mechanism's causal path. Fix-wrong ⇒ losses scatter. **Never adopt or reject on the count.**

**The real gate is four per-checkpoint hard minimums** — `jan1993` 674 / `apr1994` 660 / `apr1995`
659 / `oct1995` 644 — with **3-6 OSIDs of headroom**, not 622's apparent +28. When a run fails it:
record it as evidence, present the *explained* loss set to the panel, and if accepted the **owner**
re-blesses by hand-edit with a written note. **Never `--force`, never blanket `--update`, never
disable.**

---

## 10. Phase 5 — owner decisions, not tasks

| # | Decision | Recommendation |
|---|---|---|
| 5.1 | **D — terrain-blind planner.** Six sites; panel unanimous-REFINED (no clean GO ⇒ escalates). `terrain_friction_index` is byte-identical to `slope_index` in 6,137/6,137 settlements — **must not be bundled**. | **Defer until Phase 4 lands**, with the deferral and its reason recorded. Ship the fail-loud terrain loader regardless. |
| 5.2 | **A-2 → §6 referral.** The only non-inert carrier is `morale`, which sits inside the live absorption referral. | Refer; do not build. |
| 5.3 | **Mobilization ceilings.** 25%/50% of military-age males is **4-5× and 9-10× above the worst national reality** (1.3-1.5% of population dead ≈ 5-6% of MAM). | Do **not** lower onto a KIA-only term. The real drain was desertion, draft evasion, work deferments and refugee flight — and the VRS recorded **36,543 disabled against 18,543 dead**, so a killed+missing gate measures a third of the sink. Design pass needed. |
| 5.4 | **Decrementing `committed` on permanent loss.** Arguably correct ledger semantics, but it **releases 66 capped pools back into mobilization** — a large move in the *opposite* direction from RE's intent. | Own lane, never bundled. |
| 5.5 | **Petkovci §6 referral.** The engine holds an ICTY-documented July 1995 execution site in Serb-controlled Zvornik municipality as ARBiH ground. | **Separable and urgent.** Should not wait on this plan. |

---

## 11. Explicitly out of scope

- Weakening `attack_morale_absorption` (governance-gated; entangled with 5.5).
- The authored `aggression_modifier` decline and the cohesion floors.
- Any painted-reference, `init_control`, op-objective, axis, timing, or roster edit.
- `docs/10_canon/FORAWWV.md`.
- Sector-partition stability — observation only; emit sector context via Phase 2 first.
- Raising VRS real-operation volume as a lever (§3.4).

**Minor tickets raised by the panel, worth carrying:** `sector_offensive.ts:1355` omits the
`op.force_launch !== true` check that guards `:1411` and `:1505`, so a player force-launch is silently
overridden at the first gate. And `getEligiblePopulationCount` must read `by_mun1990_id`, not
`by_municipality_id` — the latter is post-1995 keyed and collides on merge (Gradačac reads 43
Bosniaks).
