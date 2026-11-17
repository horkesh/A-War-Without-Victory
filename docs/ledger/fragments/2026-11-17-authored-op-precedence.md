## 2026-11-17 — Authored-op precedence: a dated Army HQ operation gets its corps slot over generic offensives (measured, outcome-identical)

Pre-freeze engine fix (latent defect; owner rule: no engine changes after 1.0). Calibration is held.

**Defect.** The commander loop starts generic corps offensives without counting operations in recovery, but the Army HQ path counted them (`hasAvailableSlot`). The Army HQ step runs before the commander loop each turn. So on the turn a generic op entered recovery, the Army HQ step was blocked, and the commander then started the next generic op. Chained generic ops could lock a dated Army HQ operation (Farz 95, Krivaja 95) out of its corps indefinitely. The Army HQ trace also checked the slot before the objectives, so an op whose objectives were already taken was recorded as "blocked by the corps" (`active_primary_corps`).

**Change.**
- **S1.**
  - The Army HQ slot check uses `hasAvailableSlotIgnoringRecovery`, the commander's rule; `hasAvailableSlot` is unchanged elsewhere.
  - The objective checks now run before the slot check and record `already_owned_objectives`, so the trace names the true blocker.
- **S2.**
  - `corpsHasDueArmyHqReservation` is pure and faction-blind, keyed on def fields. It is true for an Army HQ def's primary corps when every injection gate except the slot passes:
    - not ceasefire-bound;
    - not accepted or declined;
    - the trigger holds now or within the def's own `planning_duration` lead, and for at most 3 turns already (stateless expiry);
    - the frequency gate is open;
    - live objectives and axes remain;
    - a dry-run validation is clean;
    - authorization is not declined. This is read by the new `peekHistoricalOperationAuthorizationStatus`, which creates no review.
  - While it is true, the commander opens no new generic offensive for that corps (exit `reserved_for_army_hq`).
  - Authored plans, running ops, probes, defence and posture are untouched. No running op is preempted.
- **S3** (release of a generic op still in planning) is accepted as final, not built. The lead-window reservation prevents the conflict, and it fires in neither run (recorded in `20261115_FINAL_BEHAVIOUR_AT_1_0.md`).

**Measured** (188w, against main runs at the same commit 5525ada3d, after #766, historical and hands-off emergent; the Codex P2 build check is included):
- control_delta, formation_delta, operation_aars, activity_summary, weekly_report and end_report are byte-identical in both modes. Guards intact.
- final_state_hash moves only through `military.watched_operations` trace rows (17 diffs on 5525ada3d). Krivaja 95's row now records `already_owned_objectives` (window 170-178) instead of `active_primary_corps` at t176, and the rows around it reorder.
  - Historical: 0b63e8102bddf6be → 21b9aaa9dfd763da.
  - Emergent: 73b481f79ac28e46 → d4ff54df0a81284f.
- Re-pinned: final_save.json, run_summary.json and watched_operations.json. The 40w structural fingerprint is unchanged.

**Not fixed here** (orchestrator ruling): in RB9's emergent run, Ozren falls to generic ops at t166-170, before Farz's window, so the history guard correctly fails. That goes to package P2/P3, not to a guard loosening or an RB9 condition.

**Gate.** Panel: operations-expert (C), corps-army-commander (A plus planning-phase release), historian (A with lead), scenario-tester (A, no lead), and a named integrator. The orchestrator ruled A plus the trace-order fix, and rejected preemption of an executing op.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/precedence-20261116/`.
