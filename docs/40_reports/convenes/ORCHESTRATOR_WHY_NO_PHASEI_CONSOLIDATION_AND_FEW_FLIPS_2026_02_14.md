# Orchestrator — Why no Phase I consolidation and why so few flips/casualties

**Date:** 2026-02-14  
**Request:** Explain (1) why municipalities have still not been consolidated during Phase I, and (2) why there are so few casualties and so little flips in the 52w run.

---

## 1. Why there is no Phase I consolidation

**Short answer:** In the current canonical setup, **Phase I does not run at all** for this scenario. So no Phase I consolidation can occur.

**Mechanics:**

- The scenario `historical_mvp_apr1992_52w` has **`start_phase: "phase_ii"`**. The harness therefore initializes in Phase II and never sets `meta.phase` to `phase_i`.
- In `turn_pipeline.ts`, the step **`phase-i-control-flip`** only runs when `context.state.meta.phase === 'phase_i'` (see around line 1377). If the state is never Phase I, that branch is never taken.
- When it *is* taken (e.g. in legacy Phase I runs), the canonical path still **does not perform flips**: it only emits an empty report (`flips: []`, `municipalities_evaluated: 0`, `control_events: []`). So even in a Phase I run, the current canonical code does no Phase I control flips.

**Canon / design:**

- Per **Phase I Specification v0_4_0** implementation-note (2026-02-13): *“Scenario harness canonical runs now disable Phase I control flips and start historical scenarios in `phase_ii` … political control changes are resolved only by Phase II attack-order resolution.”*
- So “municipalities have still not been consolidated during Phase I” is expected: **there is no Phase I in this run**, and in canonical runs Phase I flips are disabled by design.

**If you want Phase I consolidation:**

- You would need either:
  - **Option A:** A scenario that actually runs Phase I (`start_phase: "phase_i"`) and a **policy decision** to re-enable Phase I control flips in the pipeline (reverse the “canonical path” that currently no-ops flips), or  
  - **Option B:** To treat “consolidation” as **Phase II rear cleanup only** (consolidation posture, attack orders on soft fronts), which is what the current AI consolidation work targets—and that *does* run, but all control change is via Phase II battle resolution, so there is no separate “Phase I consolidation” step.

---

## 2. Why so few flips and so few casualties

**Observed in the 52w run:**

- **130** attack orders processed (battles fought).
- **10** settlement flips applied.
- **260** attacker casualties, **130** defender casualties.
- **All 130** battles reported as **defender-absent** (no defender brigade at the target settlement).

**Implication:**

- When there is **no defender formation** at the target, battle resolution sets defender power to 0 and the power ratio to a very large value, so the outcome is **attacker victory** and the settlement **should** flip. So if every one of the 130 battles were truly defender-absent and processed as such, we would expect **up to 130 flips**, not 10.
- The fact that we see only **10 flips** with **130 defender-absent battles** implies one or more of the following:

  1. **Duplicate targets per turn:** Many orders in a single turn target the **same** settlement. Resolution processes orders in a fixed (e.g. formation ID) order. The **first** order flips the settlement; for subsequent orders against that same settlement, the target is already friendly, so they are **skipped** (no battle, no flip). So we could have e.g. ~13 orders per week, almost all aimed at the same ~10 settlements each week, giving 130 “battles” (first attacker per target per turn) but only **10 distinct settlements** ever flipping over the run. That would match “10 flips” if the same 10 settlements keep flipping back and forth or if only 10 ever change hands in total.
  2. **Under-counting of defender-present battles:** If some battles that actually had a defender (and thus did not flip) were misclassified as defender-absent in the summary, then the “130 defender-absent” and “10 flips” could be consistent (e.g. 120 defender-present battles not flipping, 10 defender-absent flipping). This would point to a bug or inconsistency in how `defender_brigade` / defender-present is set vs how power ratio and flip are computed.
  3. **Logic bug:** A bug in battle resolution or in the pipeline could prevent flips even when the outcome is attacker victory (e.g. flip not applied under some condition). That would need a code audit.

**Casualties:**

- With **MIN_CASUALTIES_PER_BATTLE = 5** and **UNDEFENDED_DEFENDER_CASUALTY_SCALE / MIN_UNDEFENDED_DEFENDER_CASUALTIES**, 130 battles would still produce a non-trivial cumulative casualty count. The reported 260 attacker / 130 defender are **low** relative to 130 battles if each battle is intended to incur at least small losses; that could be consistent with very low garrison/intensity when defender is absent, or with the same “duplicate target” explanation (e.g. only ~10 “real” engagements per week and the rest skipped, so casualty counts reflecting a smaller number of actual fights).

**Recommended next steps (Orchestrator → Gameplay Programmer / QA):**

1. **Confirm design:** Is it intended that many brigades attack the **same** high-value settlement each turn (so that only one flip per settlement per turn occurs)? If yes, document that and optionally add a diagnostic (e.g. “unique targets per turn”) so run reports are easier to interpret.
2. **Trace one turn:** For a single turn with multiple attack orders, log or inspect: order list, target SIDs, and which orders see the target already friendly (skipped) vs which actually run and flip. That will confirm whether “130 battles, 10 flips” is from duplicate targets or from something else.
3. **Defender-absent vs flip:** Verify in code that when `defender_brigade == null` and defender power is 0, the outcome is always attacker victory and the flip is applied. If not, fix the bug; if yes, then the run summary’s “130 defender-absent” and “10 flips” imply either duplicate targets or a bug in the defender-absent/present classification in the report.

---

## 3. Single priority and owner

- **Priority:** **Clarify and, if needed, fix** the Phase II attack-resolution and reporting behavior so that (a) it is clear why only 10 flips occurred in a 130-battle run with all defender-absent, and (b) casualties and flip counts are consistent with design (e.g. duplicate targets vs unique targets, and intended casualty floor per battle).
- **Owner:** **Gameplay Programmer** (battle resolution and pipeline) plus **QA Engineer** (repro run, one-turn trace, and regression test for defender-absent flip and casualty reporting).

---

## 4. Summary table

| Question | Root cause | Action |
|----------|------------|--------|
| Why no Phase I consolidation? | Scenario starts in `phase_ii`; Phase I never runs. Canonical path also disables Phase I control flips. | If Phase I consolidation is required: use a Phase I scenario and re-enable flips, or treat consolidation as Phase II only (current design). |
| Why so few flips? | Likely many orders per turn target the same settlements (first flips, rest skipped). Needs one-turn trace to confirm. | Trace one turn; add “unique targets per turn” or similar to run summary; fix any bug if flips are not applied when defender is absent. |
| Why so few casualties? | Consistent with few “effective” battles if most orders are duplicate targets; or with low intensity for defender-absent fights. | Same trace as above; verify casualty constants and that defender-absent battles apply the intended casualty floor. |

---

*Orchestrator convene: findings for Phase I consolidation and low flips/casualties.*
