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
