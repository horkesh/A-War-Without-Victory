# PROBE CHANNEL — SCOPE

**Owner direction, 2026-08-26:** *"We want to fix the cause, not the symptom. Engine health above all
else, while remaining as mean and lean as possible. Involve all necessary Pyrrhic team specialists.
Scope it."*

**Standing owner ruling that constrains every item below:** the war's **low tempo is CORRECT
MODELLING** — 3.14 battles/week, 59% probes, quiet corps, `arbih_1st_corps` mounting one offensive.
*"1st corps not attacking — well of course, it's mostly Sarajevo brigades under siege."* Probes are
legitimate: *"a tool to keep the intel value high."* **RAISING TEMPO IS NOT A GOAL AND MUST NOT BE
SMUGGLED IN AS A BENEFIT.** What he flagged was one thing only: *"corps should not do it 38 times in
a row."*

**Seats consulted:** Engine/Systems, Operations, Railroad-Hunter, Calibration (outstanding at time of
writing — §7 is a placeholder and **must be filled before step 1 is built**).

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

## 7. COST AND ACCEPTANCE — **OUTSTANDING. DO NOT BUILD STEP 1 UNTIL THIS IS FILLED.**

The calibration seat has not reported. What it owes, and none of it may be improvised:

- **A PRE-COMMITTED BEHAVIOURAL acceptance target**, per S3a. Territory deltas will be
  **unattributable**: the S4 precondition (added today) says the bands apply only below 20% rung-4
  op-schedule divergence, and a change to operation selection always exceeds it — the intel gate
  measured **61.1%**. Candidate targets: max `consecutive_probes` per corps; probes-with-zero-battles
  as a fraction launched (today 63/215 all-corps, 29/38 for 1st Corps); probe contact rate (68.0%).
- **Negative controls**, per S3b — including that `sector_attack` count must **NOT** rise materially,
  or the fix is the symptom fix wearing the cause fix's clothes.
- **The baseline.** Measure against **n377** (post-gate), not n374 — *unless* step 0 reverts the gate,
  in which case a fresh baseline is required and that is a run to be costed.

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
