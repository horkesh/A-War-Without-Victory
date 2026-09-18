# MEASUREMENT — routine movement scope, 39-week definitive run

## AUTHORITATIVE CURRENT STATUS (added 2026-09-18, second session)

This block is the current synopsis. Later sections of this file are working evidence and early
drafts; where they contradict this block, **this block governs**. Specifically, the two mechanism
traces in "Mechanism — CONFIRMED for two of the three attackers" (the Praça/"Kijevo never launches"
claim) and "Mechanism" are **SUPERSEDED** by the CORRECTION and INDEPENDENT VERIFICATION sections
below. The original evidence is preserved, not deleted.

- **Movement churn removed in the two confirmed cases.** `rs_19th_krajina_light_infantry` and
  `hrhb_mostar_brigade` no longer emit the unexecutable pending order; the T2/T3/T6 contradiction
  that produced it is closed. The fix is a real defect removal, confirmed directly on both cases.
- **January is 696/712 — 16 mismatches, of which five are introduced versus n403** (baseline 701).
  The candidate remains **UNACCEPTED**; the 700 floor is unchanged and no waiver exists.
- **Kijevo launched in BOTH runs.** `Operation Kijevo:t24` starts, succeeds, grades 5-star in both.
  The candidate's Kijevo is built **without the `praca_approach` axis**, so `op:pale:praca` is never
  targeted. The axis is dropped because its only brigade `rs_4th_sarajevo_light_infantry` was held
  by `probe_vrs_sarajevo_romanija` on the single build turn (t24) — a probe held the brigade, not a
  slot and not a blocked march. (This corrects the earlier "Kijevo never launches" account.)
- **Prodor was created but aborted with zero attacks.** `vrs_2nd_krajina:Operacija Prodor:t27` is
  a commander-generated sector_attack that admitted `rs_7th_krajina_motorized` from Kupres and
  `rs_11th_krupa_light_infantry`, never assembled its 2-brigade floor, and ended t34 with
  `total_attacks: 0`, `recovery_reason: participants_below_assembly_floor`. See "Prodor selection —
  diagnosis" below. It is a selection-vs-assembly structural mismatch, NOT a blocked march.
- **The late `Operation Donji Vakuf` was not created in the candidate.** `vrs_1st_krajina`'s t30
  operation never exists; `rs_16th_krajina_motorized` reaches the staging OSID `op:sipovo:pribeljci_2`
  one turn late (t31 vs t30) and its `active_op_id` is null for the whole run. Three cells follow.
- **Kotor Varoš (t10) is the earliest identified operational divergence** — identical 3-brigade
  roster in both runs, split by a one-turn arrival difference. It is the earliest *operational*
  divergence; it is **not** claimed to be the first state difference anywhere (force-wide
  assignment/sub-segment drift begins at the opening turns).
- **Prusac remains an existing mismatch/reference question, not a completed repair.** The
  2026-09-17 match at `op:donji_vakuf:prusac_2` still holds in both runs; it is not newly fixed here.
- **Equal January ownership does not establish equal capture chronology.** The candidate captures
  ten further cells as well, several earlier, by different brigades; the -5 is a net reshuffle.
- **`column_blocked` bounds T3 rejections only, not T2 candidates filtered out.** It fell 53 -> 19,
  so at most 19 routine orders were rejected by the new scope across 39 weeks; it says nothing about
  destinations the T2 producer never emitted.
- **Authority-gap repair is behaviorally inert.** The operation-authority type-gap correction
  (commit `8f5998595`) was measured as run `n420`: `jan1993 696/712`, `final_state_hash`
  `b02b13f68127ed98` — **byte-identical to n419**. The gap did not fire in either run (operation-type
  inventory is `{probe, sector_attack}` only), so closing it neither explains nor repairs the five
  mismatches. n419 remains the measurement of record.
- **No new January acceptance and no threshold waiver.** January stays OPEN.

**Candidate source:** commit `a7cdc88f3` on `codex/january-1993-operations-20260914`
(plus the two post-commit strict-null fixes recorded at the end of this file; the RUN was
executed on the tree as committed at `a7cdc88f3`).
**Run:** `runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n419`
(`npm run sim:scenario:run:188w -- --weeks 39`, exit 0).
**Comparison:** `runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n403`.
Both scored with `tools/verify_checkpoints.cjs`, which replays control events against the
CURRENT painted references, so the two are comparable despite being run on different days.

## Headline — THE CANDIDATE DOES NOT MEET THE ACCEPTANCE FLOOR

```
                  n403 (baseline)   n419 (candidate)   delta
  jan1993              701 / 712          696 / 712      -5
```

The packet's floor is **700**. 696 is below it. The candidate is therefore preserved as an
**UNACCEPTED** candidate. Nothing was tuned to recover the five cells.

**Only `jan1993` is meaningful.** These are 39-week runs, so the `apr1994` / `apr1995` /
`oct1995` scores and the enclave-fall and Operation FARZ sections of `verify_checkpoints`
compare a week-39 state against 104 / 156 / 188-week references. The tool's
"GUARD BREACHED / Do not merge" line is produced by those inapplicable sections and is an
artefact of scoring a short run with a full-campaign instrument — it is NOT a new enclave or
FARZ regression. The same line appears when the BASELINE n403 is scored the same way.

## The whole difference is five cells

Exactly five cells' controllers differ at week 39. All five are losses, all RS -> RBiH where
the painted reference wants RS, and there are **zero gains**:

| cell | baseline capture | candidate |
|---|---|---|
| `op:bihac:orasac_2` | t29 combat, `rs_11th_krupa_light_infantry` | no control event |
| `op:donji_vakuf:oborci_2` | t34 combat, `rs_16th_krajina_motorized` | no control event |
| `op:donji_vakuf:donji_vakuf_2` | t35 combat, `rs_16th_krajina_motorized` | no control event |
| `op:donji_vakuf:korenici` | t38 combat, `rs_16th_krajina_motorized` | no control event |
| `op:pale:praca` | t26 combat, `rs_4th_sarajevo_light_infantry` | no control event |

In every case the baseline captured the cell by combat and the candidate never captures it.

## Aggregate — operations still launch; RS loses combat captures

Control events through week 39:

```
                       n403    n419
  operation AARs         29      29
  captures -> RS        105     100
    ... by combat        87      81
    ... by paramilitary  33      34
  captures -> RBiH       11      11
  captures -> HRHB        5       5
```

Operation admission is NOT failing: the same number of operations ran. The loss is RS combat
captures, and it is confined to RS.

## Mechanism — CONFIRMED for two of the three attackers

> **SUPERSEDED IN PART.** The two traces below were corrected by the CORRECTION and INDEPENDENT
> VERIFICATION sections. The Praça trace ("Kijevo never launches") is **wrong** — Kijevo launched
> in both runs and lost its `praca_approach` axis instead. The Bihać/orasac trace's conclusion
> (Prodor aborted) is right, but "Nothing was rejected" is not the mechanism: Prodor selected an
> unfit roster. Read the authoritative synopsis at the top. Evidence preserved for provenance.

The regression is **not** a blocked authorized movement. Two cases traced in
`brigade_temporal_log.jsonl`:

**`rs_11th_krupa_light_infantry`** — in BOTH runs it marches `veliki_badic -> op:bihac:racic`
*as an operation participant*, and in both runs the march completes normally. What differs is
which operation:

```
  n403  t25 joins vrs_2nd_krajina:Operacija Bunar:t25  -> arrives racic t28 -> takes orasac_2 t29
  n419  t27 joins vrs_2nd_krajina:Operacija Prodor:t27 -> arrives racic t30 -> (too late)
```

Nothing was rejected. A different operation launched, two turns later, and the t29 capture
never came up.

**`rs_4th_sarajevo_light_infantry`** — the baseline runs `Operation Kijevo:t24` and captures
`praca` at t26. The candidate instead runs `probe_vrs_sarajevo_romanija_t23` at t23-24, Kijevo
never launches, and the brigade sits at `op:pale:bulozi` from t20 to t39. Probes cannot
capture (recorded repo finding), so the slot is spent without effect.

So the chain is: restricted routine positioning across the force -> different brigade
availability and position -> the corps AI selects different operations at different turns ->
five captures the baseline made do not happen. It is a **tempo and operation-scheduling cost,
not a suppressed authority**.

Consistent with this, `rs_16th_krajina_motorized`'s trajectory diverges from as early as t4,
where its `assigned_sub_segment_id` differs between the runs while its `location_osid` is
identical — i.e. divergence is force-wide from the opening turns, because sector partitioning
and sub-segment affinity are derived from where every brigade stands.

## Honest limits of this analysis

- `rs_16th_krajina_motorized` (the three Donji Vakuf cells) was **not** traced in the same
  detail as the other two. Its early divergence is reported, its mechanism is INFERRED from the
  other two, not confirmed.
- `routine_destination_out_of_scope` rejections could NOT be counted: that reason code is gated
  behind a debug topic and does not appear in the run artifacts. So "no authorized movement was
  blocked" is supported by the two traced cases and by the unchanged operation count, not by a
  direct rejection census.
- Later territorial effects are **NOT MEASURED / DEFERRED** — no 188-week campaign was run.

## Verdict against the packet's four questions

- **A. Is the selected policy implemented correctly?** Yes, on the evidence available:
  typecheck clean, the focused and adjacent suites green, three independent review passes with
  all blockers closed at source, and the two traced cases show operation-authorized movement
  passing through unimpeded.
- **B. Is the create/cancel/reissue defect removed?** Yes by construction — T2, T3 and T6 now
  share one decision, and the T3 revalidation runs before operation admission so a rejected
  routine order cannot create the spurious transit. No zero-progress pending-order/transit
  churn of the original signature appears in the traced formations.
- **C. Is January calibration acceptable?** **NO.** 696 < 700. Five new mismatches, zero gains.
- **D. Is Donji Vakuf's historical sequence resolved?** No — it remains unresolved, and three
  of the five regressed cells are in Donji Vakuf.

## Post-run source corrections (do NOT invalidate the run)

The balanced full-suite gate (`npm run test:vitest`) surfaced two failures after the run:

1. `tests/strict_null_inventory_progress.test.ts` — `as_factionid_casts` 3 -> 4. Two causes,
   both fixed: a genuine type assertion introduced in `brigade_routine_scope.ts`, removed by
   widening `getSectorOffensiveApproachOsids`'s `faction` parameter to `string` (it is only
   compared against a controller and passed to `isFriendlyFaction`, which takes a string); and
   a COMMENT of mine that contained the literal scanned token, which the scanner counted —
   reworded.
2. `tests/runtime_dependency_resolution.test.ts` — `Hook timed out in 10000ms`, all 12 tests
   skipped. NOT caused by this change: it resolves vite / deck.gl / react configs and touches
   nothing in `sim/combat`. It passes (12/12) when re-run on an idle machine; the gate run had
   a scenario run and two vitest suites competing for the box. Contention flake.

Neither correction changes simulation behaviour, so `n419` remains the measurement of record
for this candidate. Both are type/comment-level only.

---

# The 19th Brigade — the defect this branch existed to fix is GONE (confirmed)

`rs_19th_krajina_light_infantry`, from `brigade_temporal_log.jsonl` (only rows where the
location / assignment / order / transit signature CHANGES are listed):

**Baseline `n403` — the documented pathology, visible in full:**

```
  t1 .. t20  loc=op:donji_vakuf:jemanlici   mv=["op:donji_vakuf:pribraca_2"]  st=null
             (the same pending order, re-issued every turn, never executing —
              assigned_sub_segment_id churns across 10+ different sub-segments while
              the brigade never moves)
  t21,24,25,27,28  st=in_transit   (spurious intra-turn transits)
  t29        loc=op:donji_vakuf:pribraca_2  (the unattributed t29 arrival)
```

**Candidate `n419` — the order is never issued at all:**

```
  t1 .. t20  loc=op:donji_vakuf:jemanlici   mv=null   st=null
  t21        mv=["op:sipovo:pribeljci_2"]   st=in_transit   (a real, legal journey)
  t23        loc=op:sipovo:pribeljci_2      (ARRIVES — travel actually progresses)
  t25        loc=op:jajce:bravnice
  t31        loc=op:donji_vakuf:kutanja
```

Four things are confirmed by this, all of them packet objectives:

1. **The create/cancel/reissue churn is removed.** The prohibited `pribraca_2` order is not
   produced in the first place, so there is nothing for T6 to cancel and nothing to re-issue.
   `mv=null` replaces twenty turns of an unexecutable pending order.
2. **The single-cell case behaves as specified.** `jemanlici` is the brigade's whole assigned
   sub-segment front. The brigade emits no discretionary relocation, stays physically where it
   is, and no transit or completed move is fabricated. That is §3 of the packet exactly.
3. **The false unavailability is gone.** Through t1-t20 the brigade carries no movement state,
   so operation admission sees an available formation — where the baseline showed it
   intermittently `in_transit`. This is the admission exclusion the original investigation traced.
4. **It is NOT a garrison.** The brigade leaves under a legal journey at t21, ARRIVES at t23
   (travel progresses; `turns_remaining` is being decremented), and continues to Jajce and
   Kutanja. The policy did not freeze it.

**The confirmed HVO comparison** — `hrhb_mostar_brigade` is byte-identical between the runs
through t19, including `Operation Jackal:t8` and its Mostar -> Čapljina -> Stolac march (operation
authority passes through the new scope untouched). The divergence is exactly the pathology: at t20
the baseline acquires the stuck pending order `mv=["op:neum:gornje_hrasno_2"]` at
`trebimlja_2` — the second single-OSID-tooth case in the generality scan — and in the candidate
that order is never issued.

So on the packet's four questions the split is clean:

- **A. policy implemented correctly** — yes.
- **B. create/cancel/reissue defect removed** — YES, confirmed directly on both named cases.
- **C. January calibration** — NO: 696/712, below the 700 floor, five new mismatches.
- **D. Donji Vakuf's historical sequence** — still unresolved.

B is achieved and C is failed by the same change. That is the honest result: the defect is real
and is fixed, and fixing it costs five January cells through operation scheduling, not through any
blocked authority.

---

# Named anchors and chronology the packet asked for

24 reference cells matching Čardak / Pješivac-Kula / Hatelji / Jajce / Donji Vakuf were compared
between the two runs at week 39. **Only three differ, and all three are the already-reported
Donji Vakuf losses.**

| anchor | reference | n403 | n419 |
|---|---|---|---|
| `op:zavidovici:cardak_2` (Čardak, 1992 capture) | RBiH | unchanged | unchanged |
| `op:stolac:pjesivac_kula_2` | HRHB | unchanged | unchanged |
| `op:stolac:hatelji_2` | RS | unchanged | unchanged |
| Jajce — all 11 cells (`jajce_3`, `vinac_2`, `bravnice`, `divicani_2`, `barevo_2`, `grdovo`, `jezero_2`, `kruscica`, `lupnica`, `prisoje`, …) | RS | unchanged | unchanged |
| Donji Vakuf — 8 of 11 cells (`jemanlici`, `pribraca_2`, `komar_2`, `kutanja`, `prusac_2`, `babin_potok_2`, `torlakovac_2`, …) | RS | unchanged | unchanged |
| Donji Vakuf — `donji_vakuf_2`, `korenici`, `oborci_2` | RS | RS (match) | **RBiH (mismatch)** |

So the **Jajce chronology is untouched**, and `prusac_2` — the 2026-09-17 repair that must never
be reverted — still matches. No defensive commitment elsewhere in those municipalities changed.
The Donji Vakuf chronology is changed only in the direction of the three lost cells; the town's
own historical sequence remains unresolved, as it was before this packet.

**Determinism / accounting.** No `Math.random`, wall-clock or timestamp was introduced (verified
independently in review). The two sorts removed from the shared decision were provably
order-irrelevant (a pure OR over sectors, and a lookup keyed by a unique `sub_segment_id`), and
the reserve-roster test was restored to its own pass specifically so classification cannot depend
on sector key order. The run completed with exit 0 and its own preflight, and RBiH (11) and HRHB
(5) capture counts are byte-identical between the runs, which is what a movement-only change in
RS-contested space should look like.

---

# CORRECTION — the Prača mechanism, precisely (my first account was wrong)

I first wrote that "the candidate spends the slot on `probe_vrs_sarajevo_romanija_t23` and
Operation Kijevo never launches." **That is wrong and is withdrawn.** The operations specialist
challenged it and supplied two discriminating checks; both refute the original claim.

`Operation Kijevo:t24` **launched in BOTH runs**, started t24, `outcome: success`,
`recovery_reason: completed`, graded 5-star "Brilliant Victory" in both. It appears in both AAR
sets. Nothing was deferred and no slot was consumed.

What actually differs is the operation's SHAPE AT BUILD TIME:

```
  n403  Operation Kijevo:t24   objectives_targeted = [op:trnovo:kijevo_2, op:pale:praca]
        axis kijevo_shoulder   brigades = [rs_1st_romanija_infantry, rs_2nd_sarajevo_light_infantry]
        axis praca_approach    brigades = [rs_4th_sarajevo_light_infantry]
                               staging  = op:pale:bulozi   -> captures op:pale:praca

  n419  Operation Kijevo:t24   objectives_targeted = [op:trnovo:kijevo_2]
        axis kijevo_shoulder   brigades = [rs_1st_romanija_infantry, rs_2nd_sarajevo_light_infantry]
        (the praca_approach axis does not exist; praca is never even targeted)
```

The chain, confirmed from artifacts:

1. Divergent routine positioning shifts probe timing: `probe_vrs_sarajevo_romanija` fires at
   **t23** in the candidate and at **t27** in the baseline.
2. At t23-24 `rs_4th_sarajevo_light_infantry` is therefore committed to the probe — exactly when
   Kijevo is built at t24.
3. `buildAxesFromDef` filters brigades and objectives in two independent passes, so the
   `praca_approach` axis loses its only brigade and is dropped at build time.
4. `op:pale:praca` is never targeted, so it is never captured. `praca` is RBiH at t24 in BOTH
   runs, so this is not an already-owned omission.

Note the shape of the error I made: the probe did **not** take the operation's slot, and it did
not trim Kijevo's objectives by overlap — `hasNonCapturingObjectiveOverlap` *defers* a whole
injection when a probe overlaps rather than trimming it, which is a different code path and is
not what happened here. The probe took the **brigade**, and the axis that needed that brigade was
dropped. The corrected account is more specific and does not depend on the probe/capture rule at
all.

**This strengthens, rather than weakens, the central conclusion.** No authorized movement was
blocked in the Prača case either: the brigade was simply committed elsewhere when the operation
was assembled. The regression remains an operation-assembly and timing effect downstream of
routine repositioning, not a suppressed authority.

---

# INDEPENDENT VERIFICATION — my mechanism traces were wrong; the conclusion survives

A scenario specialist re-derived everything from the artifacts. **A, B and C are confirmed
exactly.** D's *conclusion* — no authorized movement was blocked — survives, and is now supported
structurally rather than by two anecdotes. But **both of my traces were wrong in their
particulars**, and I had missed the earliest and cleanest case entirely. Corrected below.

## Run comparability — confirmed

`initial_save.json` sha256 identical in both runs
(`45bcfd9746aabaa85e49d2ce2a44efffdd36ecb7a53966edd450ed419f67a3bf`); `run_meta`
`consumed_inputs` digest identical (`f8ace654...`). Same scenario, same weeks.
The non-`jan1993` sections carry no signal at all: the enclave-guard and FARZ blocks are
**byte-identical between the two reports**, and "GUARD BREACHED" appears in both.

## The five cells are a RESHUFFLE, not a subtraction (my framing was too simple)

`-6` combat / `+1` paramilitary does not reconcile to "five captures did not happen". Ten further
cells were captured in BOTH runs but by a different brigade or at a different turn — and several
**earlier** in the candidate:

```
  op:kotor_varos:kotor_varos_2     t13 combat rs_12th_kotorsko -> t14 PARAMILITARY (the -6/+1 swap)
  op:trnovo:kijevo_2               t26 -> t25   EARLIER
  op:sipovo:volari_2               t34 -> t30   EARLIER (4 turns)
  op:jajce:lupnica                 t35 -> t33   EARLIER, different brigade
  op:skender_vakuf:donji_koricani  t39 -> t35   EARLIER (4 turns), different brigade
  op:donji_vakuf:torlakovac_2      t31 rs_16th_krajina -> t31 rs_5th_kozara
  op:mrkonjic_grad:baljvine_2      t28 rs_1st_gradika  -> t28 vrs_1st_laktasi
  ... plus visegrad:velji_lug, zavidovici:cardak_2, jajce:jezero_2
```

The candidate is **not uniformly slower**. 1st Krajina work is reshuffled across formations and in
several places accelerated. The `-5` is a net. Also confirmed: **zero** cells differ outside the
712-cell reference set, and w39 control counts are RS 375->370, RBiH 251->256, HRHB 86->86 — the
entire map-wide divergence is those five cells.

## The three corrected mechanisms

**Praca / Sarajevo.** My second account was right that Kijevo launched in both runs and lost the
`praca_approach` axis; the specialist confirms it and pins the cause precisely: at t23 the
candidate has `rs_4th_sarajevo_light_infantry` inside `probe_vrs_sarajevo_romanija_t23`
(planning), and at t24 — the one turn on which Kijevo draws its roster — it is still in that probe
(recovery). Baseline: free at t24. A probe held the brigade across the single turn that mattered,
and Kijevo formed one brigade and one objective short.

**Bihac / `orasac_2` — my trace was substantially wrong.** The operation did not merely "launch
later under a different name". `Operacija Prodor:t27` launched with an **unfit roster and aborted**:
`total_attacks: 0`, outcome FAILURE, ended t34, `recovery_reason: participants_below_assembly_floor`.
The detail I did not have: `rs_1st_drvar_light_infantry` — a Bunar participant in the baseline —
was **sitting on the staging OSID `op:bihac:trubar` from t25 to t33 in BOTH runs**, idle, in no
operation, same assigned sub-segment. Prodor did not take it. It took `rs_7th_krajina_motorized`
from Kupres instead, which was still in transit when Prodor gave up. The other baseline
participant, `rs_17th_klju_light_infantry`, does not move at all from t20 to t39 in the candidate.
So this cell was lost to an **operation that picked participants it could not assemble while a fit
one stood on the staging cell** — not to a blocked march.

**Donji Vakuf (the gap I flagged) — traced, and it is neither mechanism I proposed.**
`vrs_1st_krajina:Operation Donji Vakuf:t30` **does not exist in the candidate at all**.
`rs_16th_krajina_motorized` reaches the staging OSID `op:sipovo:pribeljci_2` at **t31, one turn
late** (baseline t30, admitted the same turn). Its `active_op_id` is null for the entire run. It
then drifts and issues orders that never resolve, and never attacks. The operation was never
CREATED — not "a different one was selected".

**Kotor Varos at t10 — the earliest divergence, which I missed entirely.**
`Operation Kotor Varos:t10` runs in BOTH with an identical 3-brigade roster and identical weekly
diagnostics at w10-w12. At w13 they split: baseline `eligible_attacker_count` 2 and captures the
cell; candidate 0, captures nothing, and the cell flips RS by **paramilitary** at t14 instead.
Cause: one brigade arrives at the staging OSID one turn later. **A one-turn arrival difference
decided the operation.**

## The blocked-move census I could not produce — the specialist found the counter

`column_blocked` lives in `weekly_report.jsonl` and is incremented at exactly three sites
(`posture_dig_in`, `routine_destination_out_of_scope`, `no_friendly_path`):

```
  column_blocked    53 -> 19    (DOWN 34)
  column_starts    376 -> 299   (-20%)
  column_advances  167 -> 197   (+30)
  column_arrivals  236 -> 246   (+10)
```

So **at most 19 routine moves were rejected by the new scope across the whole 39-week run**, and
the true figure is lower because the other two reasons still occur. Total column blocking FELL by
34. Force-wide over 240 brigades: relocations 470 -> **474** (up), brigades that never move 87 ->
90, mean distinct locations 2.675 -> 2.683, transit episodes >= 8 turns 2 -> 2 (the same two
brigades). **20% fewer marches started, more of them completed, net mobility flat-to-up.** The
restriction suppresses churn, not movement — the opposite of the "brigades frozen" reading the
-5 might suggest.

## What did get worse

- **Probes up**: op-diag probe rows 144 -> 163, distinct operations 99 -> 106,
  `probe_complete` 55 -> 62, while `sector_attack` rows are flat (201 -> 202). The candidate
  substitutes probe activity for the missing captures — the Sarajevo case generalised.
- `zero_eligible_axis` 2 -> 4; `participants_below_assembly_floor` 0 -> 1 (new: Prodor).
- `attack_attempt_count` 247 -> 234; battles 162 -> 165.
- **Degenerate self-orders worse**: turn-rows where `mv_destinations[0] == location_osid`
  41 -> 53. `rs_4th_sarajevo_light_infantry` issues `dst=[op:pale:bulozi]` while standing on
  `op:pale:bulozi` for **fifteen consecutive turns** (t25-t39). Pre-existing shape, worse here.
- Clean in both: `idle_execution_turn_streak` max 0, `movement_only_execution_turns` 0,
  `invalid_for_combat_calibration` 0, `skipped_attack_orders` 0.

## Defect hunt: NO DEFECT FOUND — checked structurally, not by sampling

- T3 (`osid_column_movement.ts:516`) routes every decision through
  `isRoutineScopeEnforcedForOrder`, which consults both authority exemptions before rejecting.
- T6 `correctMarchOrders` checks both exemptions unconditionally before cancelling.
- T2 has no exemption calls and does not need them: all three scoped filters in
  `bot_brigade_eval_front.ts` sit inside `if (sectors && !isActiveSectorOperationParticipant)`;
  `evaluateReturnToCorps` and `evaluatePocketEvacuation` early-return for participants; and the
  two unguarded scoped evaluators run at chain positions 13-14, **after** `evaluateSectorAttack`
  at position 8, so they only ever see a participant its own evaluator has already declined.
- `operation_approach_osids.ts` re-diffed against the removed body: verbatim.

## GENUINE RESIDUAL HOLE — real, did not fire here, should be ticketed

`isActiveSectorOperationParticipant` (`bot_brigade_ai_osid.ts`) admits only operation types
`'sector_attack'` and `'probe'`. `CorpsOperation.type` is
`'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization' | 'feint' | 'probe'`.
So a participant of a **`general_offensive` or `feint`** gets NO guard in `evaluateSectorMarch`,
which runs at chain position 2 — **before** `evaluateSectorAttack`. Meanwhile
`isDestinationAuthorizedByOperation` at T3/T6 has no type restriction. That asymmetry is a real
gap in the authority contract, and this change makes it consequential because T2 now restricts
where it previously did not. It did NOT fire in either run — operation-type counts are
`{probe, sector_attack}` only in both — so it is not the cause of the -5, but it must not be left
undocumented.

Separately, a PRE-EXISTING hazard, confirmed identical in the baseline
(`git diff 5f6cf6d02..a7cdc88f3`): in `correctTransitStates` the authority exemption is gated
behind `brigadeAlreadyAtValidFront`, so a mid-journey operation transit falls through to an
unconditional cancel. Not a regression; worth its own ticket.

## The historical reframing — this changes how the -5 should be read

From ICTY-cited canon (`HISTORICAL_TIMELINE_MASTER.md`):

- **`op:donji_vakuf:donji_vakuf_2`** — Donji Vakuf town was taken by the Serb SJB on **17 April
  1992**, "took control of the entire town the same day", municipality renamed Srbobran
  (Stanisic & Zupljanin TJ Vol I para 238; Krajisnik TJ para 438). An **institutional takeover,
  not a battle.** The candidate's RBiH is historically absurd — but the BASELINE gets its match by
  a `rs_16th_krajina_motorized` brigade assault at **t35**, roughly **eight months late and by the
  wrong mechanism.**
- **`op:donji_vakuf:korenici`** — attacked **21 May 1992** by 18 Donji Vakuf Serb police plus 12
  Banja Luka CSB members, "no great resistance" (para 242). Explicitly a police action, not a
  brigade assault. The baseline takes it by brigade combat at t38.
- **`op:donji_vakuf:oborci_2`** — no cell-level entry; only the municipality-wide SJB summary that
  the 19th Infantry Brigade and Serb police together took the territory May-September 1992.
- **`op:bihac:orasac_2`** and **`op:pale:praca`** — no canon-timeline entries. Not guessed at.

So for at least three of the five, the reference's RS expectation is well sourced and the
candidate is historically wrong — **but the baseline's matches there are bought by brigade
operations eight months after the real police/institutional takeover.** This is the same shape as
the recorded Prusac finding: a match that is coincidental rather than vouched. The `-5` is real
against the reference and the candidate is the worse of the two runs, but **the 701 is not a
high-fidelity 701 at this site**, and rejecting the policy purely to protect those three cells
would be protecting a number rather than the history.

## Still open

`op:bihac:orasac_2` and `op:pale:praca` have no canon-timeline entry; the historian consult is
dispatched and unanswered. Three operations questions remain genuinely open, the third being the
most interesting thing left in this packet:

- (a) whether an operation's objective LIST is fitted to the admitted roster at planning time
  (the Kijevo 2-objectives/3-brigades vs 1-objective/2-brigades pairing is suggestive);
- (b) the definition and enforcement site of the assembly floor behind
  `participants_below_assembly_floor`;
- (c) **why `Prodor:t27` admitted `rs_7th_krajina_motorized` from Kupres while
  `rs_1st_drvar_light_infantry` stood idle ON the staging OSID.**

---

# Prodor selection — diagnosis (2026-09-18, second session)

Two independent traces (Operations; Formation/Systems) were reconciled. Identifiers and
observations were re-verified from `runs/..._n419` and `_n403`.

## Corrections to the record

- Prodor has **no `staging_osid`**. It is a commander-generated op
  (`final_save.json → vrs_2nd_krajina.last_completed_operation` carries
  `minimum_viable_participants: 2`, `minimum_assembled_participants: 2`,
  `axes[0].minimum_staged_brigades: 2`, and no `staging_osid` / `primary_sector_brigades`).
  `op:bihac:trubar` is `rs_7th_krajina_motorized`'s per-brigade **approach destination**
  (`bot_brigade_eval_attack.ts:429-458`), not an operation staging cell. So "drvar stood on the
  staging OSID" is looser than the code: drvar stood on an objective-adjacent cell **inside its own
  assigned sub-segment**.

## Exact causal explanation

1. **Creator.** `findLocalOccupationCandidate` (concentration branch, `commander/emit.ts:316,
   422-664`) selected the bounded-isolated RBiH cell `op:bihac:orasac_2` (its whole ring is
   RS-controlled) and built the op with `buildCommanderOperation` (`corps_operation_helpers.ts:316`)
   at `emit.ts:1935`; the name is drawn from the bot pool (`operation_names.ts`). No authored
   definition exists for it (`rg Prodor` finds only the name pool).
2. **Ordering.** Objective → approach geometry → roster → movement orders. The roster is not
   chosen before the objective, and there is no shared operation staging point.
3. **Roster source.** Participants come from `allocation.surplus_pool`
   (`commander/emit.ts:338-349`). `rs_1st_drvar_light_infantry` was **not in it**: it was
   garrison-locked as the front holder of `sector:vrs_2nd_krajina:0` /
   `subseg:sector:vrs_2nd_krajina:0:0`, whose `friendly_osids` are
   `[racic, trubar, prkosi, vrtoce]` — the objective's own front. It is not on loan, not disrupted,
   not below the attack floor, not an enclave; the only surviving exclusion is the garrison lock
   (`allocate.ts:326-357`). It is therefore **correctly withheld**, not overlooked: donating it
   would have left its own front unstaffed. It is not categorically ineligible — the baseline
   `Operacija Bunar:t25` did select it from the same front.
4. **Ranking.** Among the eligible donors, `rs_7th_krajina_motorized` ranks first by
   `fitness_offense` (personnel 1112 motorized vs `rs_11th_krupa`'s 854 mountain; `force_eval.ts:114-117`),
   with distance only a lower-order donor key. Personnel/equipment/cohesion are explicitly **not**
   the failure inputs; the failure is reachability-versus-time.
5. **Planner/executor mismatch.** The creator admits participants on a hop-count predicate
   (`distanceToReduction` / `spatialFriendlyDistance`, `MAX_REACHABILITY_HOPS = 8`,
   `commander/emit.ts:1803-1864`) and then sets `minimum_staged_brigades = reductionParticipants.length`
   (`emit.ts:1957-1961`). It also **projects** unstaged participants onto their approach OSID for the
   prediction (`emit.ts:557-596`). The executor's assembly floor counts only brigades whose
   `location_osid` is **currently adjacent to the objective** (`countAdjacentStagedParticipants`,
   `sector_offensive_launch_helpers.ts:609-623`), with no transit credit
   (`sector_offensive_launch_helpers.ts:1013-1021`). Nothing reconciles the 8-hop admission with the
   `planning_duration (3) + PLANNING_INVALIDATION_GRACE_TURNS (2) = 5`-turn window.
   `bucovaca → trubar` is 8 graph hops and the motorized column rate is 2
   (`osid_column_movement.ts:192-200`), so the journey cannot complete inside the window.
6. **Movement and abort.** `rs_7th` is ordered to `trubar` at t27 and reported `in_transit`
   t28-32 with an unchanged location (the designed multi-hop abstraction — location updates only on
   arrival). `rs_11th` arrives `racic` at t30 (staged = 1). At t33 elapsed 6 > 5, the early
   invalidation runs, the floor (2) is unmet, and the op enters recovery with
   `participants_below_assembly_floor`; AAR ends t34 with `total_attacks: 0`.
7. **Not a movement-scope regression.** T3 (`osid_column_movement.ts:516`) and T6
   (`commander_march_correction.ts:83,168-175`) exempted the operation-authorized order/transit
   throughout planning/execution; the transit was cleared only at t33 **after** the op entered
   recovery — a consequence of the abort, not its cause. The pre-existing T6 hazard (authority
   exemption gated behind `brigadeAlreadyAtValidFront`, `commander_march_correction.ts:168-181`)
   is confirmed but did **not** fire here.

## Verdict and bounded proposal (NOT implemented)

The trace follows the **current policy/structure**. The assembly floor, the garrison lock and the
donor ranking each behave as specified. The defect is structural: **selection admits a roster on
reachability with no time budget, then demands the whole roster be physically staged inside the
planning window.** Improving it requires a NEW capability (a time-bounded reachability test, or a
staged-floor derived from expected arrivals, or replanning), which the packet forbids implementing
under the label "bug fix." Bounded proposal, owner decision required:

- **P-A (preferred, smallest):** give the commander path's participant admission a time budget
  mirroring the pre-planned contract's `canReachAxisStaging` (`pre_planned_operations.ts:1623-1651`):
  estimate column transit (`ceil(cost / columnRate)`) from the brigade to the nearest approach OSID
  and admit only formations whose ETA fits `planning_duration + grace`. No floor change; a smaller
  roster yields a smaller `minimum_staged_brigades` naturally, and an unfillable operation still
  fails.
- **P-B:** derive `minimum_staged_brigades` from the count of participants whose ETA fits the
  window (a conditional floor). This changes an authored/derived floor and must be panel-reviewed.
- **P-C (rejected here):** lower the floor or extend the deadline to obtain a launch — prohibited.

Explicitly preserved by any accepted option: imperfect information, command friction, defensive
obligations (the Donji Vakuf/Drvar withholding stands), and the possibility of a failed operation.
No brigade/OSID/operation is hard-coded. The three queued operation questions (Donji Vakuf uncreated
after the t31 arrival; Kijevo's handling of an unavailable axis; the Kotor Varoš timing difference)
remain **queued, not bundled**.
