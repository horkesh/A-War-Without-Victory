# Sweep — `faction_controls_municipality` thresholds vs OSID granularity

**Date:** 2026-09-06
**Commissioned by:** the Historian seat of the
[event-firing investigation](../20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md) (§6/P3), which
ruled that `faction_controls_municipality >= 0.5` against small-OSID municipalities is a **defect
class**, not one row, and that *"one row was checked because one row was asked about."*
**Scope:** read-only measurement. No code, data, or canon changed.
**Precedes:** the §6 panel on P1/P2/P4 — the panel cannot rule on a scope it has not seen.

---

## Verdict

**Ahmići is NOT a class. It is the only hard blocker of its kind in the catalog.**

Of **20 `faction_controls_municipality` conditions across 20 events in 15 municipalities**, exactly
**one** is provably dead. The sweep also cleared one false positive of its own making and left one case
genuinely unsettled.

| Class | Count | |
|---|---|---|
| **A. Hard blocker** — clause false at t0 *and* t188, municipality frozen, clause is a conjunct | **1** | `ahmici_massacre_1993` |
| **B. False at both ends, not provably dead** — municipality does move; window-scoped, not settled by these artifacts | **1** | `operation_lukavac_93` |
| **C. Negated clause** — satisfied *because* the faction is below the threshold | 1 | `mostar_liberation_1992` |
| **D. Never fired but control clause satisfiable** — blocker is elsewhere | 0 | — |
| Satisfied and fired | 17 | — |

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
2. **`control_delta.json` records NET start-vs-end change**, so an OSID that flips out and back is
   invisible to it. A first pass replayed those flips in *file* order and reported a "peak" holding —
   which is not a temporal peak and was dropped. **This sweep therefore cannot answer window-scoped
   questions and does not pretend to** (see class B).

What it *can* establish robustly: exact t0/t188 holdings; whether a municipality appears in the net
flip set at all; and hence that a municipality frozen at `t0 == t188` with zero net flips and a holding
below its threshold is unreachable for the entire run.

---

## A. The one hard blocker

**`ahmici_massacre_1993`** (`data/scenarios/events/war_1993.json`, window 54-70)

- HRHB needs **2 of 3** Vitez OSIDs (threshold `0.5`); holds **1 at t0 and 1 at t188**.
- Vitez has **zero net control flips in 188 weeks**.
- Achievable fractions in a 3-OSID municipality: `0.00, 0.33, 0.67, 1.00`. **There is no 0.5.**
- Event fired: **NO**.

`turn_min = 54` is historically exact (16 Apr 1993). **The date is right; the gate is wrong.** This is
an OSID-granularity artifact, not a flag bug — the gate encodes a map resolution that does not exist.

Routed to the §6 panel as **P1**. This sweep proposes no fix.

## B. The one unsettled case

**`operation_lukavac_93`** (`war_1993.json`, window 69-71): RS holds 2 of 6 Trnovo OSIDs at both t0 and
t188 and needs 3, but **Trnovo does flip during the run**. Whether RS held 3 during weeks 69-71
specifically cannot be answered from net-delta artifacts. Its sibling conjunct
(`flag_equals sarajevo_siege_active true`) is not in doubt.

**This is a live question, not a cleared one** — it needs per-turn control resolution, which no current
run artifact carries.

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
