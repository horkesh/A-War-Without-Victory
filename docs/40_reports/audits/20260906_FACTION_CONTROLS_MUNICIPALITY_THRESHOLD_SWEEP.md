# Sweep — `faction_controls_municipality` thresholds vs OSID granularity

**Date:** 2026-09-06
**Commissioned by:** the Historian seat of the
[event-firing investigation](../20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md) (§6/P3), which
ruled that `faction_controls_municipality >= 0.5` against small-OSID municipalities is a **defect
class**, not one row, and that *"one row was checked because one row was asked about."*
**Scope:** read-only measurement. No code, data, or canon changed.
**Precedes:** the §6 panel on P1/P2/P4 — the panel cannot rule on a scope it has not seen.

---

## Verdict — CORRECTED 2026-09-06 by the §6 panel's scenario/calibration seat

> ### ⚠ THIS SWEEP'S FIRST VERDICT WAS WRONG. **There are TWO hard blockers, not one.**
>
> The original text read *"Ahmići is NOT a class. It is the only hard blocker of its kind."* That
> conclusion rested on a **false claim about the available instruments** (see "Method", limit 2). The
> panel's scenario/calibration seat refuted it: `final_save.json → political.control_events` **is** a
> complete per-turn, per-OSID control log, and `tools/verify_checkpoints.cjs:83-89` already replays it
> as `stateAt(week)`. `control_delta.json` is a net summary *derived from* it.
>
> Replayed, `operation_lukavac_93` is dead on **the same arithmetic as Ahmići** and belongs in class A.
> **Class B is empty.**

**Two of 20 conditions are provably dead.** The sweep also cleared one false positive of its own making.

| Class | Count | |
|---|---|---|
| **A. Hard blocker** — clause unsatisfiable throughout the event's window | **2** | `ahmici_massacre_1993`, `operation_lukavac_93` |
| **B. False at both ends, not provably dead** | **0** | *(emptied by the correction above)* |
| **C. Negated clause** — satisfied *because* the faction is below the threshold | 1 | `mostar_liberation_1992` |
| **D. Never fired but control clause satisfiable** — blocker is elsewhere | 0 | — |
| Satisfied and fired | 17 | — |

**Both confirmed across six 188w runs with different scenario hashes** — Trnovo peaks at 2/6 in weeks
69-71 and Vitez at 1/3 in weeks 54-70 in **every** run. The seat's caveat (Trnovo *can* move, unlike
frozen Vitez, so one run is not enough) is discharged.

---

## Method, and what it can and cannot establish

Predicate under test, `src/sim/events/event_types.ts:749-756`:

```ts
const munOsids2 = Object.keys(pc2).filter(osid => osid.includes(`:${condition.municipality}:`));
if (munOsids2.length === 0) return false;
const controlled2 = munOsids2.filter(osid => pc2[osid] === condition.faction).length;
return (controlled2 / munOsids2.length) >= threshold2;
```

Evidence: `runs/apr1992_definitive_188w__46834a3b41033bff__w188_n390` —
`initial_save.json` / `final_save.json` (`political.political_controllers`), `control_delta.json`
(`flips`), `weekly_report.jsonl` (`events_fired`).

**Two limits, stated because the first draft of this sweep violated both:**

1. **Polarity matters.** A first pass walked the condition tree ignoring `not` wrappers and reported
   `mostar_liberation_1992` as unreachable. Its clause is **negated** — *"RS does NOT hold ≥30% of
   Mostar"* — and is therefore satisfied *precisely because* RS holds 1 of 9. The corrected walk carries
   negation and `or`-membership down the tree. **A sweep that ignores polarity manufactures defects.**
2. **~~This sweep cannot answer window-scoped questions.~~ WRONG — CORRECTED 2026-09-06.**
   It is true that `control_delta.json` records NET start-vs-end change, so an OSID that flips out and
   back is invisible to it, and that a first pass replayed those flips in *file* order and reported a
   "peak" that is not temporal. Both of those are real and the "peak" column stayed dropped.
   **But the conclusion drawn from them was false.** A per-turn, per-OSID control log **does** exist —
   `final_save.json → political.control_events`, 201 records carrying
   `{turn, settlement_id, from, to, mechanism, battle_id, mun_id}` — and `verify_checkpoints.cjs:83-89`
   already replays it:

   ```js
   function stateAt(week) {
     const st = { ...init };
     for (const e of events) if (e.turn <= week) st[e.settlement_id] = e.to;
     return st;
   }
   ```

   **The instrument the sweep declared missing was already in the repo, already used by the checkpoint
   scorer.** ⇒ Window-scoped questions ARE answerable, and answering one turned class B into a second
   class-A blocker.

What it *can* establish robustly: exact t0/t188 holdings; whether a municipality appears in the net
flip set at all; and hence that a municipality frozen at `t0 == t188` with zero net flips and a holding
below its threshold is unreachable for the entire run.

---

## A1. First hard blocker — `ahmici_massacre_1993`

*(Heading was "The one hard blocker" before the 2026-09-06 correction. It is one of two.)*

**`ahmici_massacre_1993`** (`data/scenarios/events/war_1993.json`, window 54-70)

- HRHB needs **2 of 3** Vitez OSIDs (threshold `0.5`); holds **1 at t0 and 1 at t188**.
- Vitez has **zero net control flips in 188 weeks**.
- Achievable fractions in a 3-OSID municipality: `0.00, 0.33, 0.67, 1.00`. **There is no 0.5.**
- Event fired: **NO**.

`turn_min = 54` is historically exact (16 Apr 1993). **The date is right; the gate is wrong.** This is
an OSID-granularity artifact, not a flag bug — the gate encodes a map resolution that does not exist.

Routed to the §6 panel as **P1**. This sweep proposes no fix.

## A2. The second hard blocker — `operation_lukavac_93`

*(Originally filed as "the one unsettled case". Settled 2026-09-06 by replaying
`political.control_events`.)*

**`operation_lukavac_93`** (`war_1993.json`, window 69-71) requires
`faction_controls_municipality RS trnovo >= 0.5` — **3 of 6 OSIDs**.

MEASURED, replayed per turn:

| Week | RS holdings in Trnovo | |
|---|---|---|
| w0-19 | 2/6 = 0.333 | not satisfied |
| w20 | 1/6 = 0.167 | `tosici` RS→RBiH (combat) |
| w25-188 | 2/6 = 0.333 | `kijevo_2` RBiH→RS (combat) |
| **w69, w70, w71** | **2/6 = 0.333** | **not satisfied — the entire window** |

There are exactly **two** Trnovo control events in 188 weeks, both before w26, and zero Trnovo battles
after w38. RS never reaches 3/6 at any point in the run. Its sibling conjunct
(`flag_equals sarajevo_siege_active true`) is not in doubt, so the control clause is the blocker.
The event has never fired.

**Confirmed across six 188w runs with different scenario hashes**, which discharges the caveat that
Trnovo — unlike frozen Vitez — *can* move: in all six, RS peaks at 2/6 across w69-71.

This is the same defect shape as Ahmići: a `0.5` threshold on a municipality whose achievable fractions
are `0.00, 0.17, 0.33, 0.50, 0.67, 0.83, 1.00`. Unlike Vitez, **0.5 IS achievable here** — Trnovo has 6
OSIDs, so the threshold is not arithmetically impossible; the modelled war simply never delivers the
third cell. Whether that is a fidelity defect in the gate or in the war is the **Historian's** question,
not this sweep's, and it is not currently before the panel.

## C. The false positive this sweep created and caught

**`mostar_liberation_1992`**: `NOT(RS >= 0.3 of mostar)`. RS holds 1 of 9 at t0 and 0 at t188, so the
clause is **true throughout** and the event fires at w7 as intended. Recorded because the first pass
called it a defect, and because any future sweep of this predicate will hit the same trap.

---

## E. The silent premium — an authoring hazard that does not currently bite

Because control is counted in whole OSIDs, a threshold on a coarse municipality demands **more than it
reads as**:

| Municipality | OSIDs | Threshold reads | Actually requires | Silent premium |
|---|---|---|---|---|
| `novo_sarajevo` | 2 | 0.3 | 1/2 = **0.500** | **+20.0 pts** |
| `vitez` | 3 | 0.5 | 2/3 = **0.667** | **+16.7 pts** |
| `tuzla` | 7 | 0.3 | 3/7 = **0.429** | +12.9 pts |
| `visoko` | 8 | 0.3 | 3/8 = **0.375** | +7.5 pts |
| `zenica` | 8 | 0.3 | 3/8 = **0.375** | +7.5 pts |
| `trnovo` | 6 | 0.5 | 3/6 = 0.500 | 0.0 pts |

Only Vitez currently fails because of it. But an author writing `0.3` against `novo_sarajevo` is in fact
writing `0.5`, and nothing in the schema, the loader, or the tests says so.

**Suggested (not scheduled):** a loader-time or test-time warning when
`ceil(threshold x N) / N - threshold` exceeds ~0.1 — it converts an invisible authoring hazard into a
visible one at zero runtime cost. Routes to the post-1.0 backlog, not to any lane.

---

## Reproduction

`fcm_sweep.cjs` (session scratchpad, not committed — it reads only committed data plus one run
directory and is ~120 lines). Regenerate by walking the six catalog files for
`faction_controls_municipality` nodes **carrying negation and `or`-membership**, then joining against
`political_controllers` from the run's initial and final saves and the `flips` array in
`control_delta.json`.

---

## Addendum — the instrument, and one line for CALIBRATION_MASTER

Raised by the §6 panel's scenario/calibration seat and adopted here.

**`control_delta.json` is net-only. `final_save.json → political.control_events` is the temporal source
of truth.** The former is derived from the latter. Any question of the form *"who held X in week N"* is
answerable today by the four-line replay at `tools/verify_checkpoints.cjs:83-89`; no new instrument is
needed, only discoverability. The seat's suggestion — lift `stateAt` into a ~10-line
`tools/control_at.cjs` CLI — is cheap and carries zero calibration risk.

**This sweep is the cautionary case.** It reached a wrong headline not because the measurement was hard
but because it asserted an instrument did not exist without looking for one, in a repo whose checkpoint
scorer had been using that instrument all along. The §E loader warning proposed above would have caught
**both** Vitez and Trnovo at authoring time, before either needed a sweep.

⇒ **Lesson, for the record:** *"no artifact carries this"* is an absence claim, and absence claims are
the ones this project keeps getting wrong. Grep for the reader before declaring the data missing.

---

## Addendum 2 — the twin predicate this sweep never audited (raised by the §6 engine seat)

**`territory_control` with a `municipality` key is a byte-identical twin of
`faction_controls_municipality`.** `event_types.ts:736-742` and `:749-756` are the same computation —
same `:mun:` filter, same `?? 0.5` default, same whole-OSID fraction, same `>=`. **Two names, one
semantics.** This sweep audited only one of them.

**Audited now. Result: zero occurrences.** No event in the shipped catalog uses `territory_control`
with a `municipality` key; the 10 `territory_control` conditions in the catalog are all OSID-form,
which is exempt from the granularity class by construction.

⇒ **The sweep's findings are unchanged — still two hard blockers.** But the seat's condition stands for
the *repair*: **any lint or predicate change must cover both names**, or the class is left half-open
for the next author, who will reach for whichever name they happen to see first.

**And one correction to Addendum 1 from the same seat:** the §E silent-premium lint would **not** have
caught `operation_lukavac_93`. Trnovo's premium is **0.0** by this sweep's own table (N=6, threshold
0.5, required 3/6 = exactly 0.500). Lukavac needs a different instrument — a reachability check against
the run, not an arithmetic check against the schema. Addendum 1's claim that the lint "would have caught
**both** Vitez and Trnovo" is **wrong**; it would have caught Vitez only.
