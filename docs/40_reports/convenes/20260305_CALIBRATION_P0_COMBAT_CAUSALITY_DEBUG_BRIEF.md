# Calibration P0 Combat-Causality Debug Brief

**Date:** 2026-03-05
**Authority:** Orchestrator
**Deputy:** Product Manager
**Master calibration file:** `docs/40_reports/CALIBRATION_MASTER.md`
**Primary source investigation:** `docs/40_reports/convenes/20260305_VRS_ZERO_ATTACKS_INVESTIGATION.md`

---

## Big-picture summary

The immediate risk is no longer "low match rate." It is **false confidence**.

The n77/n78/n79 investigation showed that branch-level territory deltas can appear even when the combat loop produces **zero battles** across 40 weeks. In that state, control totals can move from:

- demographic drift
- consolidation flips
- initial-state overrides
- non-combat control propagation

That means calibration can look healthier than the war simulation actually is.

**Strategic judgment:** no further tuning or override work should be treated as meaningful combat calibration until combat causality is re-established and evidenced.

---

## Single priority and owner

**Single priority:** determine why VRS attack generation can collapse to zero and make the failure visible at the pipeline boundary where it occurs.

**Owner:** Gameplay Programmer

**Supporting roles:**
- Systems Programmer: pipeline boundary instrumentation and invariants
- QA Engineer: run-level acceptance gates and invalidation rules
- Technical Architect: confirm the operation -> brigade-order -> attack-resolution contract
- Product Manager: hold scope at P0 root-cause debugging only

---

## P0 debugging brief

### Scope

This is a **root-cause session**, not a tuning session.

Do not spend the session on:
- override expansion
- corps target retuning
- OOB repositioning beyond minimal reproduction support
- sector-offensive behavioral tweaks not directly tied to proven root cause

### Question to answer

At which exact boundary does the causal chain break?

1. `injectPrePlannedOperations(state)` creates valid operations at turn 0.
2. `advance-sector-offensives` moves them from `planning` to `execution`.
3. `generate-bot-brigade-orders` emits actual VRS attack orders for participating brigades.
4. `phase-ii-resolve-attack-orders` resolves those orders into battles.
5. `update-sector-offensive-results` observes objective progress or explicit failure.

### Required evidence

For one deterministic 40w debug run, capture per-turn evidence for the five VRS pre-planned corps:

| Boundary | Evidence required |
|---|---|
| Operation injection | `active_operation` exists, objectives list, participating brigades, `phase_started_turn`, `planning_duration` |
| Planning -> execution | turn number when phase changes; current objective index; supply_readiness snapshot |
| Brigade order generation | count of attack orders by faction and by corps; attacking brigade IDs and target OSIDs |
| Attack resolution | battle count, attacker faction, target OSID, outcome |
| Operation progress | current objective controller, `failure_count`, `consecutive_failures_on_current`, phase transition reason |

### Debug output requirements

The debug session must produce artifacts that can be compared turn-by-turn without code archaeology:

- one report or log summarizing turns 0-5 for all five VRS operations
- per-turn counts for:
  - VRS attack orders
  - VRS battles resolved
  - VRS objective captures
- explicit first failing boundary, phrased as:
  - "operations inject, but brigade orders = 0"
  - "orders emit, but attack resolution sees 0"
  - "battles resolve, but objective tracking never advances"

### Hypothesis discipline

No fixes should be proposed before the first failing boundary is evidenced.

If the session cannot identify the first failing boundary, the output is still useful only if it proves:
- which boundaries are working
- which boundary remains unobserved
- what additional instrumentation is still missing

---

## Calibration acceptance rubric

### A. Run invalidation rules

A run is **invalid for combat calibration** if any of the following is true:

1. `weekly_report.jsonl` shows `0` battles for the full run.
2. Pre-planned operations enter recovery/clear without any documented attack-order or battle evidence.
3. Territory delta is reported without separating combat-caused flips from non-combat flips.

### B. Minimum acceptable combat evidence

A run can be discussed as a combat-calibration result only if it includes:

1. Non-zero `attack_orders` for the faction being evaluated.
2. Non-zero `battles` in `weekly_report.jsonl`.
3. At least one attribution summary separating:
   - combat flips
   - consolidation flips
   - drift/displacement-driven flips
   - init override effects

### C. Strong evidence standard

A run is strong enough to guide tuning only if it also includes:

1. Per-faction order totals.
2. Per-faction battle totals.
3. Pre-planned-operation progression summary:
   - operation started
   - attack attempts made
   - objectives captured or explicit abort/stall reason

### D. Master-file discipline

`docs/40_reports/CALIBRATION_MASTER.md` remains the calibration single source of truth.

During any future calibration session:
- read the current top-of-file state before tuning
- append the new run's causality status while working
- do not record a branch as "improved" unless the run passes the invalidation rules above

---

## Team handoff

**Orchestrator -> Product Manager**
- Keep scope at P0 debugging and acceptance-gate establishment.

**Product Manager -> Gameplay Programmer**
- Instrument one deterministic debug run and identify the first failing boundary.

**Product Manager -> QA Engineer**
- Treat `battles == 0` as an automatic combat-calibration invalidation.

**Technical Architect -> Team**
- Confirm the operation lifecycle and brigade-order pipeline have explicit, testable contracts rather than silent pass-through behavior.

---

## Immediate next action

Run one focused debug session on the current branch aimed only at answering:

**Why does `generate-bot-brigade-orders` fail to produce VRS attack orders for the injected operations, and at which turn/boundary does that first become true?**
