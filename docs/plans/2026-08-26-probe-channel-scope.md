# PROBE CHANNEL — SCOPE

**Status:** SCOPE COMPLETE — NON-EXECUTABLE pending owner assent to step 0. Claude owns this lane.
This document does not authorize RE or probe implementation.

**Owner direction, 2026-08-26:** *"We want to fix the cause, not the symptom. Engine health above all
else, while remaining as mean and lean as possible. Involve all necessary Pyrrhic team specialists.
Scope it."*

**Standing owner ruling that constrains every item below:** the war's **low tempo is CORRECT
MODELLING** — 3.14 battles/week, 59% probes, quiet corps, `arbih_1st_corps` mounting one offensive.
*"1st corps not attacking — well of course, it's mostly Sarajevo brigades under siege."* Probes are
legitimate: *"a tool to keep the intel value high."* **RAISING TEMPO IS NOT A GOAL AND MUST NOT BE
SMUGGLED IN AS A BENEFIT.** What he flagged was one thing only: *"corps should not do it 38 times in
a row."*

**Seats consulted:** Engine/Systems, Operations, Railroad-Hunter, Calibration. All four reported;
§7 is filled.

---

## 1. THE HEADLINE — the owner's diagnosis is right about the SHAPE and the cause is one level deeper

He diagnosed: *"the probe appears to be probing just one OSID, instead of a sector/TG, which is what
it should be doing."* **Confirmed** — `buildProbeOperation` (`corps_operation_helpers.ts:377`) sets
`participating_brigades: [brigadeId]`, and `emit.ts:1294` ends `rankedTargets.slice(0, 1)`.

**But widening the probe is NOT the fix, on three independent measured grounds** (§3). The 38-probe
streak has **two separate root causes**, neither of them probe cardinality.

---

## 2. ROOT CAUSES — both measured, both independent, neither is probe shape

### CAUSE A — the engine forgets what it learned, every turn or two [MEASURED, Engine seat]

Sector ids are **positional indices re-minted every turn**: `corps_front_sectors.ts:1643`,
`` const sectorId = `sector:${corpsId}:${nextIndex++}` `` inside a loop over sectors re-sorted by
first edge id. **`sector_intel` is keyed on that id on BOTH sides** (friendly key and
`enemy_sector_id`), and `deriveSectorIntel` (`sector_intel.ts:78`) falls back to
`FACTION_INITIAL_INTEL_CONFIDENCE` when the pair is not found. One edge appearing, one split or
merge, renumbers every later sector of that corps and orphans its intel.

**Re-derived by the orchestrator on provenance-stamped runs** (the Engine seat's own figures came
from the dirty `latest_run_final_save.json` and it flagged that):

| run | median `turns_in_contact` | median confidence | edgeless records | ARBiH sectors below the 0.40 threshold |
|---|---:|---:|---:|---:|
| n374 | **2** | 0.14 | 29% | 16/28 |
| n294 | **1** | 0.21 | 31% | 22/30 |

RBiH's threshold is **0.40**; building from the 0.05 floor at +0.02/turn needs **~18 uninterrupted
turns**; the pair identity survives **1-2**. ⇒ **Intel can never reach threshold, so
`shouldLaunchProbeInstead` is permanently true, so the corps probes forever.** 188 turns ÷ the
5-turn cooldown cycle ≈ **38**, which is the measured streak.

**Second, nearly free:** ~30% of intel records have `front_edge_count === 0` — ground the corps has
**no front against** — and `getStalestSectorIntelConfidence` takes the **minimum**, so those ghosts
pin the whole sector down.

### CAUSE B — the selector picks the one brigade that cannot probe [MEASURED, Operations seat]

**19 of the 21 no-contact `probe_complete` probes are the SAME BRIGADE: `arbih_115th_mountain`.**
Verified independently by the orchestrator on n374:

- `tags: [..., "placement:fixed_home_osid"]` — a Stari Grad Sarajevo garrison brigade
- `location_osid` **identical at t0 and t188**
- personnel **800 → 1800**, **morale 100, cohesion 100**
- **2 battles in 188 weeks**

The fallback selector (`emit.ts:1115-1121`) takes the single highest `fitness_offense` surplus
brigade, and `fitnessOffense` (`force_eval.ts:114`) is
`personnelNorm × sMult × cohesionNorm × (1 + equipPriority×0.25) × fatigueOffenseMult`.

⇒ **A brigade that never fights keeps perfect cohesion, full personnel and zero fatigue, so it stays
permanently at the top of the pool. Not probing is exactly what keeps it looking fittest.** A
degenerate feedback loop, faction- and OSID-agnostic, accounting for roughly half the streak — and it
explains why the same two cells are re-probed forever (same brigade, same fixed location, same
adjacency, same top-ranked target).

---

## 3. WHY THE SWEEP IS NOT THE FIX — three independent measured reasons

1. **A sector-wide reveal ALREADY EXISTS and already fires.** `fullyRevealProbeSectorIntel`
   (`sector_offensive.ts:1118`) sets **every** intel record of the probe's sector to `1.0`, called
   from four branches. **One probe battle on one cell already raises the stalest value for the whole
   sector.** More objectives buy nothing for intel.
2. **29 of 29 no-contact probes DIED IN PLANNING** — not one reached execution. `probe_complete` 20,
   `zero_eligible_axis` 7, `offensive_ops_suppressed` 2. **More objectives cannot help a probe that
   never used the one it had.**
3. **It would raise tempo hard, against the owner's ruling.** An axis advances past an objective only
   after `MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 3` (`sector_offensive.ts:577`), so a 5-objective
   probe can fight **up to 15 battles** against today's measured mean of **1.67**. Across ~215 probes
   that is a very large tempo increase, and every battle is capture-incapable.

---

## 4. THE OTHER HALF — no-capture is FIAT, and the fix inverts a dependency

**`attack_resolution_osid.ts:1396`:** `flip = won && !isProbeOp`. The resolver computes a victory and
a boolean deletes its consequence.

**MEASURED (n294), and the control is what makes it conclusive** — probe decisive victories against
the **148 decisive victories won by real operations in the same run**:

| | probe decisive | real decisive |
|---|---:|---:|
| n | 157 | 148 |
| median power ratio | **6.13** | **6.18** |
| median defender casualties | **151** | **144** |
| p75 ratio | 17.01 | 18.67 |

**Indistinguishable.** Probes win the same fights, at the same odds, killing the same numbers, as the
operations that DO take ground. **Recon-farming of empty cells is REFUTED** (min defender casualties
21, median 151; 19 of 157 at ratio <3). ⇒ **The flag is fiat**, and removing it does **not** install a
free-territory railroad in the other direction, because the voided battles are the same battles that
earn territory elsewhere.

**Cost of the channel:** 365 probe battles, **131,577 attacker casualties = 61.7% of ALL attacker
casualties in the war**, for zero ground.

**THE FIX — an OCCUPATION predicate, not a force-size threshold.** [Railroad-Hunter, correcting its
own earlier wording] `attack_resolution_osid.ts:1560-1564` flips control and **then** walks the
attacker in — **occupation is a CONSEQUENCE of the flip, not a cause of it.** That inverted dependency
is the only reason the flag had to exist: the engine has no way to say "won but holds nothing."
Decide `willAdvance` **before** the flip and flip iff it advances.

- **No new constant** — it inverts an existing dependency. **A "fewer than N brigades" threshold is
  FORBIDDEN**; that is the magic-constant railroad and would re-classify the fix.
- **No movement code** — a probe never advances today, so "withdrawal" describes what already happens.
- **The engine already has this pattern twice**: morale absorption (`:1401-1416`) and the TG
  territory-revert (`:1450-1461`), the latter carrying the exact principle *and* the `flips_applied`
  accounting that would otherwise be missed.

**⚠ BLAST RADIUS — `flip` has two other consumers, one of them an S5 tripwire.** `:1469`
`emitCascadePenaltiesOnFlip` — **suppressing a flip suppresses cascade penalties on adjacent
defenders, and the western-Bosnia cascade is a named tripwire in the decision rule.** `:1493`
`territory_gained_this_turn` feeds operation-success evaluation. **Probes are free** (they already do
not flip, so neither consumer changes). **The exposure is entirely in the non-probe generalisation.**

**Orchestrator measurement, n294:** of 164 combat captures, **0** were made by an operation with ≤1
brigade — so no existing capture breaks. **But 41 (25%) came from battles with NO OPERATION AT ALL**
(27 of them in the first five weeks, running to t174). ⇒ **The predicate must be answerable PER
BATTLE, not per operation**, or a quarter of captures cannot be evaluated.

---

## 5. THE ORDER — correctness before scale

| # | step | why here |
|---|---|---|
| **0** | **REVERT `ef4355ee5`** (the orchestrator's intel gate) | Not merely a symptom fix: **its input does not measure what its comment claims** — it reads `getStalestSectorIntelConfidence`, a minimum over records whose identity survives 1-2 turns. It also suppresses the evidence that the channel is broken, so a later cause fix could not be seen to work. |
| **1** | **CAUSE A** — stable sector-pair identity + ignore `front_edge_count === 0` records in the stalest calculation | The actual cause. **Outside probes entirely** — anything keyed on `sector_id` across turns has this bug. |
| **2** | **CAUSE B** — exclude `placement:fixed_home_osid` brigades from the fallback probe pool | Removes 19 of 21 dead probes and **adds zero battles**. No new constant. Composes with, does not subsume, step 1. |
| **3** | **NO-CAPTURE → occupation predicate, PROBES ONLY.** Screen the cascade. | Correctness. Probe half is free of the blast radius. |
| **4** | **Re-measure. Only then ask whether objective count matters at all.** | If 1+2 close the loop, the sweep is unnecessary — which is the lean answer. |
| **5** | *(only if a residual remains)* `slice(0, 1)` → `slice(0, K)` on the already-ranked list, **paired with an attacks-per-probe cap** | Without the cap this delivers the tempo rise the owner ruled against. |

**NOT IN SCOPE, with reasons:** task groups for probes (a probe has no `staging_osid`, which is the
only reason `insufficient_donation` and the whole TG lifecycle stay inert — adding staging opens two
gate surfaces and the anchor inversion, for a mission that fights once or twice); raising
`MIN_BRIGADES_BY_TYPE.probe` (currently 1 — raising it would create the abort inversion); the
non-probe generalisation of the occupation predicate (**own lane, own measurement**, per §4).

---

## 6. TRAPS, each already paid for once

- **If probes ever go multi-brigade, `main_brigade` must be set EXPLICITLY.** The opening-attack gate
  is anchor-first (`getAnchorBrigade` = `main_brigade ?? assigned_brigades[0]`), so array position
  becomes the gate. This repo was burned by exactly that on 2026-08-25 (Operation Trnovo "fixed" by
  appending, leaving a t140 brigade as anchor).
- **Probes emit NO AAR** (`sector_offensive.ts:1644` gates on `type === 'sector_attack'`). **You
  cannot score a probe change from `operation_aars.json`.** Probes live only in `weekly_report.jsonl`
  battle rows and `operation_diagnostics`.
- **Field-name inversion:** in `operation_diagnostics`, `attack_attempt_count` is **this turn's**
  count while `objective_attempt_count` is the operation's **cumulative** total. "Did this op ever
  attack" must use `objective_attempt_count`.
- **`current_objectives` is one entry per EXECUTING AXIS, not the objective array.** A probe has one
  axis by construction, so a per-week read gives 1 for every probe and measures nothing. Positive
  control: Operation Drina has 8 objectives and a max `current_objectives` of 3 — its axis count.
- **The one-and-done probe exit at `sector_offensive.ts:1630` is DEAD** — it requires `!multiAxis`,
  but `isMultiAxis` is `axes.length > 0` and every objective-carrying probe has an axis. Fix or
  remove it deliberately either way.

---

## 7. COST AND ACCEPTANCE — **FILLED** (calibration seat, 2026-08-26). Commit this block BEFORE any run.

### 7.1 Pre-committed behavioural target (S3a). Baselines are the POST-REVERT run of §7.3, not n374.

> **T1 — the owner's target, and the one that proves cause over symptom.** `max consecutive_probes`
> across all corps **≤ 10** (baseline 38), **with the intel gate REVERTED.** *If the cause fix cannot
> hold this without the gate, it is not a cause fix.*
> **T2 — dead probes.** `arbih_115th_mountain` launches **exactly 0** probes. Binary, no threshold to
> argue about.
> **T3 — waste.** probes-with-zero-battles **≤ 10%** of probes launched (baseline 63/215 = 29.3%).
> **T4 — the forgetting.** median sector `turns_in_contact` **≥ 8** (baseline 1-2) **and** ARBiH
> sectors below their 0.40 threshold **≤ 8/28**.
> **T5 — contact rate ≥ 80%** (baseline 68.0%).
> **LIVENESS (S2):** every counter must be non-degenerate — probes launched **> 0**, sectors compared
> **= the full set**. A zero from an uninstrumented metric is worthless.

**T1 and T2 are the pass/fail pair. T3-T5 corroborate — a fix that moves T1/T2 but not T4 has treated
the symptom.**

### 7.2 Negative controls (S3b) — each with a real failure mode

> **N1 — `sector_attack` count stays within ±3 of 44** (the PRE-gate baseline, *not* the gate run's
> 64). A rise means the cause fix is the symptom fix in different clothes and breaks the owner's
> tempo ruling.
> **N2 — probes must not VANISH.** Total probes launched **≥ 150** (baseline 215). The owner defended
> probes as *"a tool to keep the intel value high"*; dropping the channel below ~120 kills the tool
> rather than repairing it. **This is the control for "fixed the waste by removing the activity."**
> **N3 — `arbih_115th_mountain` remains active, at `op:stari_grad_sarajevo:*`, personnel > 0, at
> t188.** Excluding a fixed-home brigade from the *surplus pool* must not remove it from the OOB or
> from garrison duty. **A plausible WRONG implementation — exclude fixed-home brigades from
> everything — moves this; the right one cannot.**
> **N4 — nine-cell enclave guard, two-sided falls, all four Farz/Ozren cells taken, AND the 2nd Corps
> conducts ≥1 capture-capable operation after t159.** The last clause is load-bearing: n377 silenced
> 2nd Corps entirely after t159 while still passing the cell check, because the authored 3rd Corps op
> carried it. Farz was **joint**.

### 7.3 ★ THE BASELINE FORK — RESOLVED: A FRESH POST-REVERT RUN IS REQUIRED. Cost it.

**Reverting `ef4355ee5` does NOT return the tree to n374.** `git log --oneline 3806ef08d..HEAD -- src/`
returns **FOUR** commits, verified:

```
ef4355ee5  probe intel gate                      <- the revert target
688a3066d  enclave participation rule (n376)
82c0115e6  Žepa `disbanded` not `destroyed`      <- BEHAVIOURAL
f2d5fa149  rationale comment                      <- inert
```

`82c0115e6` changes `lifecycle_status` from `destroyed` to `disbanded`, and
`brigade_reconstitution.ts` gates eligibility on `=== 'destroyed'` plus a recorded
`destruction_turn` — so it can add or remove a reconstituted 285th. **A state change with a plausible
territorial path.**

**No run on disk has this combination.** n373/n374 have none of the three; n376 has only `688a3066d`;
n377 has all four including the gate. **Measuring probe work against any of them charges Žepa's
change to the probe lane.** ⇒ **1 × 188w ≈ 70 min, non-negotiable.** Cheaper than spending three runs
discovering the attribution was contaminated.

### 7.4 Run cost — **2 × 188w total ≈ 2.3 h**

| step | validates from disk? | run |
|---|---|---|
| 0 revert | — | none — the §7.3 baseline **is** its validation |
| 1 sector identity | **yes, free** (done — see 7.5) | shared |
| 2 fixed-home exclusion | **yes, fully** (done — see 7.5) | shared |
| 3 occupation predicate | partly | shared |

**Steps 1-3 share ONE run**, and this is principled rather than a shortcut: the C3 rule permits
bundling when the acceptance criterion is binary and the members' metrics are **disjoint**. They are,
by construction — step 1 is judged on T4 (sector-scoped), step 2 on T2 (one named brigade), step 3 on
its own occupation counter. **None can be mistaken for another**, and territory is unattributable for
all three regardless. If the bundle fails one metric, split that one and re-run it alone.

*Insisting on one-change-per-run here would cost 4 runs to buy attribution the S4 precondition already
says we cannot have.*

### 7.5 THE TWO FREE CHECKS — **DONE. Both premises hold, and both are stronger than the seats had.**

**Step 1's premise, now on a THIRD provenance-stamped run.** Three independent runs agree:

| run | median `turns_in_contact` | edgeless records | ARBiH sectors below 0.40 |
|---|---:|---:|---:|
| n373 | **2** | 27% | 12/27 |
| n374 | **2** | 29% | 16/28 |
| n294 | **1** | 31% | 22/30 |

**Unarguable before a line is written.**

**Step 2's predicted set, computed with ZERO runs** — every probe `arbih_115th_mountain` launched in
n374:

> **26 probes launched. 25 with ZERO cumulative attack attempts.** Terminal reasons:
> `probe_complete` 20, `zero_eligible_axis` 6.

**That is the S3 predicted set for step 2 and it is nearly total futility — 25 of 26.** Note this is
LARGER than the 19-of-21 the Operations seat reported, because that figure counted only the
`probe_complete`-without-contact subset; the full launch count is 26.

*(Use `objective_attempt_count` — the CUMULATIVE field. `attack_attempt_count` in diagnostics is this
turn's count only.)*

---

## 8. OPEN, HONESTLY UNRESOLVED

- **Which code path retires the 21 no-contact probes as `probe_complete` is NOT ESTABLISHED.** Three
  write sites exist; two are excluded by measurement; the third failed its co-occurrence test. **Four
  hypotheses have failed and the Operations seat stopped rather than offer a fifth** — correctly.
  One `console.error` at each of the three sites during a single 188w settles it, and that is the one
  instrument worth a run.
- **The orchestrator's "12 Path B probes, 63 battles" was overstated.** 12 probe operations do fight
  at **2 distinct cells** each (verified) — but no artifact carries a probe's objective array, so
  "Path B" was an **inference presented as established**. All 12 are `arbih_1st_corps` hitting the
  same two cells, i.e. more of the same pathology, **not a healthy multi-objective precedent to copy.**
- **QUEUED, NOT CHASED** (Railroad-Hunter RT5): of 8 cohesion gates, **5 are unreachable at their
  faction floor**. Surrender is unreachable for every faction at every turn; last stand is guaranteed
  for RBiH from t13. **RS falls below `COUNTER_ATTACK_MIN_COHESION = 30` from ~t68** — a far
  better-specified hypothesis for the frozen-VRS-front lane than anything currently in it. **Do not
  follow it from here.**

---

## 9. STEP 0 EXECUTED — 2026-08-26. Owner assent given ("So proceed with 1").

**Gate REVERTED at `9d9455661`, surgically**: only `emit.ts` went back; the **S4 precondition stays**
in `CALIBRATION_MASTER.md` (a blanket `git revert` would have deleted a standing rule earned the same
day). Verified both ways. tsc clean, 76 probe/intel tests green.

### ★ THE §7.3 BASELINE RUN WAS UNNECESSARY, AND THE REASONING THAT DEMANDED IT WAS WRONG

`n378` (post-revert) is **BYTE-IDENTICAL to `n376`** — `final_state_hash 46349028e4d8e156` on both,
`control_delta.json` identical by sha256. **n376 already WAS the post-revert baseline.** ~70 minutes
spent reproducing a run already on disk.

**Why the argument failed, and it is checkable in one command:**

```
82c0115e6  Žepa disbanded      committed 14:33
n376       run                            15:07   <- AFTER Žepa. n376 HAS it.
688a3066d  eligibility fix     committed 15:53   <- AFTER the run that contains it
```

The calibration seat asserted *"n376 has only `688a3066d`"* by reading `git log` ordering **and never
comparing run timestamps to commit timestamps.** n376 was run from a dirty tree carrying the
eligibility fix uncommitted, so its content led its commit by 46 minutes. The orchestrator relayed
the claim without checking.

⇒ **A commit-log argument about which runs contain which changes is worthless without run
timestamps.** `stat` the run dir against `git log --date=format:'%H:%M'` — it costs one command and
would have saved the run.

**What the run did buy, honestly:** the baseline is now *proven* identical rather than assumed, and
T1-T3 are confirmed against a **clean committed tree** rather than a dirty one. That is real but it
is not what it was bought for.

### T1-T3 BASELINES CONFIRMED — step 0 validated

| metric | post-revert (n378) | with the gate (n377) | target |
|---|---:|---:|---|
| **T1** max `consecutive_probes` | **38** (1st Corps; hvo_nw 10) | 1 | **≤ 10** |
| **T2** `arbih_115th_mountain` probes | **26** | — | **0** |
| **T3** probes with zero attempts | **70/215 = 32.6%** | — | **≤ 10%** |
| probes / sector_attacks | **215 / 44** | 128 / 64 | N1: 44 ±3 · N2: ≥150 |

**The runaway returns in full the moment the gate is removed** — 38, and probes/sector_attacks back
to exactly the pre-gate 215/44. That is step 0 doing its job: the symptom is visible again, so the
cause fix can be seen to work or not. **Reference for steps 1-3 is n378** (= n376, clean commit).

---

## 10. STEPS 1-3 BUILT — 2026-08-26. Bundled validation run in flight.

| step | commit | what landed |
|---|---|---|
| **1** | `(steps 1+2)` | **Stable sector identity.** `own_stable_key`/`enemy_stable_key` on `SectorIntelRecord`, derived from the lexicographically smallest edge id under `strictCompare` (content, never iteration order). Carry-forward matches on those; positional lookup kept as a fallback so pre-today saves behave unchanged. **Plus:** `getStalestSectorIntelConfidence` now excludes `front_edge_count === 0` ghosts (27-31% of records), falling back to including them only when every record is edgeless. |
| **2** | `(steps 1+2)` | **Fixed-home garrisons excluded from the probe pool**, and the degenerate loop named in the code: fitness is `personnel × cohesion × fatigue`, so a brigade that never fights is permanently the fittest. Scoped to the probe pool only — N3 pins that the brigade stays active at its OSID. |
| **3** | `(step 3)` | **`occupies_on_victory` replaces `!isProbeOp`.** Read off `activeOp` (never the phase-gated `executionOp`), default TRUE. The second special case — `sector_offensive`'s null-controlled auto-claim skip — now reads the same declaration, so the rule is stated once. |

**Verification:** `tsc` clean throughout; 92 intel/probe suites green after 1+2; 11/11 in
`probe_territory_flip` after 3, including two new assertions.

### ★ A BLOCKER I RAISED WAS WRONG, and the seat caught it

I argued the predicate had to be answerable **per battle** because 41 of 164 combat captures (25%)
appeared to have **no operation**. That was measuring `activeOperationId` — which
`attack_resolution_osid.ts:1278` writes **only when the op is in `execution` phase**. `activeOp`
itself is not phase-gated, and the pre-existing fiat at `:1396` already read the ungated handle and
worked. **The engine has those operations; the artifact hides them.** Had I designed around my own
measurement I would have built something more complex for no reason.

⇒ **Recorded as a lesson class: an artifact field can be a phase-gated PROJECTION of engine state,
and reasoning about engine behaviour from it is reasoning about the projection.**

### Two new tests, and what each is for

- **`defaults to holding — a probe built WITHOUT the declaration FLIPS, by design.`** This is the
  cost of default-true, made visible instead of latent. Verified at build time that no production
  path creates a probe outside `buildProbeOperation` (the only other `type: 'probe'` sites are an
  army-HQ **directive object that nothing converts into an operation** — read only as a boolean —
  and a disconnected UI planner). **If a new creation site appears, that audit must be redone**, and
  the test comment says so.
- **`the declaration, not the type, is what withholds the ground.`** A `sector_attack` that declares
  `occupies_on_victory: false` must behave exactly like a probe. **This is what makes the field a
  real property rather than `op.type` renamed** — it can vary WITHIN a type. Nothing sets it in
  production today, and that limitation is stated in the type's own header rather than left for a
  reviewer to discover.
