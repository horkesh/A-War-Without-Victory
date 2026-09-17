# OUTCOME — Donji Vakuf Local Action: bounded operation-configuration experiment FAILED (inert)

**Date:** 2026-09-17. **Branch/HEAD:** `codex/january-1993-operations-20260914` @ `b9024b97b`.
**Authority:** owner packet 2026-09-17 — ONE bounded local operation-configuration experiment targeting
`op:donji_vakuf:donji_vakuf_2` through an EXISTING, LIVE operation-admission path. Attempt, not guaranteed
capture. No ownership writer; no personnel/equipment/multiplier/threshold change.
**Specification (written before any edit):** [`CHANGE_SPEC.md`](CHANGE_SPEC.md).

## 1. Candidate as predeclared

A single new `TriggeredOpDef` (`Donji Vakuf Local Action`) in `src/sim/combat/triggered_operations.ts`:
`vrs_1st_krajina`, one axis, objective `op:donji_vakuf:donji_vakuf_2`, participants
`rs_19th_krajina_light_infantry` (anchor, adjacent at `op:donji_vakuf:jemanlici`) +
`rs_31st_light_infantry`, window `turn >= 2 && turn <= 6 && hasEnemyObjective(...)`, `planning_duration: 2`,
no `execution_attack_power_mult`. Independent review of the spec: **APPROVE**.

## 2. Admission proof in isolation (before the campaign)

A focused vitest admitted the def through the production entry point `checkTriggeredOperations` on a
representative state, building a normal `sector_attack` with both brigades, `occupies_on_victory` not false,
no ownership write, lifecycle invariant clean, refused when the target was friendly / force below floor /
participant in transit / strong standing defence, and honouring player authorization. **11/11 passed.**
That state, however, did **not** carry the real scenario's `brigade_movement_state` for the 19th — which is
the whole failure (see §4).

## 3. Measured result (run `n406`, `--weeks 39`)

`runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n406`, final_state_hash `bdea1bd6e172da6b`.

- **The operation never launched.** `military.triggered_operations_accepted` contains Kotor Varos/Herzegovina/
  Posavina only — not `Donji Vakuf Local Action`.
- **January is unchanged: `verify_checkpoints` jan1993 = 701 / 712**, and a cell-by-cell comparison of
  `political_controllers` against `painted_control_jan1993.json` is **identical to `n403`**: same 11
  mismatches, **FIXED 0, NEWLY INTRODUCED 0** (see `evidence_january_mismatches.txt`).
- `anchor_checks`, `behavioral_health`, `attack_resolution` and `takeover_displacement` are byte-identical to
  `n403`. The only state difference is the `watched_operations` trace rows the never-firing def writes in
  turns 2–6.
- The town is still captured at **t35 (7 December 1992)** by the authored Operation Donji Vakuf
  (`rs_16th_krajina_motorized` vs `arbih_770th_slavna_mountain`, ratio 2.05) — the historical defect is
  unrepaired, exactly as before the experiment.

## 4. Root cause — diagnosed from retained evidence, not inferred

The trace shows only two rows (`evidence_n406_watched_operations.json`):
`turn 5 objective_overlap` and `turn 6 build_insufficient_participants`. Turn-by-turn instrumentation on a
short run (`n407`, `--weeks 7`) showed the trigger itself is **true** from t2 and the slot is **free**
(1KK has 36 brigades → 3 slots; only Operation Prijedor active). The failure is in participant assembly:

> **CORRECTED 2026-09-17 (see `logs/donji-vakuf-19th-transit-20260917/FINDINGS.md`).** The original text said
> "persistently `in_transit`". That was **wrong**: there is **no persistent transit state at any turn
> boundary**. The 19th carries a re-issued pending order to `op:donji_vakuf:pribraca_2` every turn, and is
> `in_transit` only **intra-turn** — created by `processOsidColumnMovement` Pass 2 (`war_phases.ts:1537`),
> then cancelled by `correctTransitStates` (`war_phases.ts:2591`) before the bot re-issues the same order
> (:2625). During the admission step (`check-triggered-operations`, :2075) the transient **is** present, so
> `buildOperation` excludes the 19th (movement-state guard, `triggered_operations.ts:976-981`); only
> `rs_31st_light_infantry` survives → `build_insufficient_participants`. At t5 the t4 probe
> `probe_vrs_1st_krajina_t4` is also active on the same objective, producing `objective_overlap` first.
> The root cause is a **T2/T6 destination-scope contradiction with an ordering coupling** — a real defect
> whose only repairs are precedence-policy choices, returned as an EXTENSION (not implemented).

- **Pre-existing, not introduced.** The 19th's stale `in_transit` order to `pribraca_2` is present in the
  unmodified baseline; the predecessor diagnosis already recorded the 19th "sat at jemanlici t1–18 carrying
  an unexecuted movement order to `pribraca_2`". `pribraca_2` appears nowhere in `src/` except the late-war
  RBiH opportunity catalog, so the order is generic movement/routing, not an authored RS op.
- **The only adjacent 1KK brigade is therefore unavailable**, and `buildOperation` declines it without any
  authored exception — a movement/availability blocker, not an offer-definition one.
- Other 1KK brigades (31st, 11th Mrkonji, 22nd Krajina, 1st Sipovo) are **free** (no movement state) at t2–3;
  only the 19th is blocked.

## 5. Disposition — reverted, not shipped

The candidate is an **inert operation in the only scoring scenario**. The packet forbids authoring an inert
operation, so the definition, the catalogue-pin reconciliation and the focused test were **reverted before
commit**. `src/sim/combat/triggered_operations.ts` and `tests/triggered_operations.test.ts` are byte-identical
to `b9024b97b`. All temporary instrumentation was removed. No ownership writer, baseline, reference or
threshold was touched.

**What is retained:** this record, the predeclared [`CHANGE_SPEC.md`](CHANGE_SPEC.md), the run `n406`
evidence (`evidence_n406_watched_operations.json`, `evidence_n406_injection_validation.json`,
`evidence_january_mismatches.txt`), and the diagnostic finding. The historical defect stays **OPEN**.

## 6. Next proposed change — returned separately, NOT implemented

The operation-configuration lane is real but cannot be exercised while the sector's own brigade is held
in transit. In order of preference:

1. **Re-select the participants (bounded, same window/target/mechanism).** Use 1KK brigades that are actually
   free at t2–6 — the 31st plus the 11th Mrkonji (the brigade that already attacked this cell as a probe at
   w5) and/or the 22nd Krajina. This is a new candidate requiring its own predeclared spec and independent
   review; it is **not** a "broaden the target" or "inflate the force" move. Open question to settle first:
   whether an op anchored on a brigade that starts several hops away can open an attack inside the window
   (`axisHasExecutableOpeningAttack` needs an assigned brigade adjacent or committed-in-transit to an
   approach OSID).
2. **Fix the stale in-transit order (movement layer).** Investigate why the 19th, ordered to a rear
   `donji_vakuf` cell (`pribraca_2`), never moves or clears its `in_transit` state for 16+ turns. This is a
   movement/assignment defect investigation, not an operation definition, and it would also restore the
   19th — the historically correct Donji Vakuf formation — to availability.
3. **Reserve the operation's brigades before the generic movement router runs (broader).** Extend the
   pre-planned-style reservation/prestage contract to non-elite triggered participants
   (`prestageReservedTriggeredElites` is currently elite-only). This changes admission/reservation policy and
   needs separate authorization; it is **not** proposed as a fallback here.

The event-flip ban is unchanged. No part of this outcome writes ownership.
