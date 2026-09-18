# MEASUREMENT — routine movement scope, 39-week definitive run

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
