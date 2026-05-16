# Force-Quality Trajectory Fatigue Deferment

**Date:** 2026-05-15
**Lane:** Force-quality trajectory
**Status:** DEFERRED - no safe bounded behavior change in this packet
**Worktree / branch:** `.worktrees/force-quality-trajectory` / `codex/force-quality-trajectory`

## Summary

This lane looked for one focused, agent-actionable long-war force evolution improvement across the current owner set: personnel/reconstitution, fatigue/exhaustion, HRHB trajectory, and late-war operation delivery. The safe conclusion is that the remaining unowned gap is fatigue/exhaustion, but the smallest likely behavior change is still a global fatigue-retention retune. That crosses the lane constraint against global multipliers or forced historical rails and needs a design gate before code.

No engine, scenario, OOB, operation, painted-target, sensitive-history, or canon file was changed.

## Governing Evidence

The current binding plan is `docs/plans/2026-05-01-force-quality-trajectory-calibration-issue.md`. Its 2026-05-10 closure update says the broad audit is complete and future work should dispatch separate owner lanes.

The strongest current evidence is `docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md`:

| Gap | Evidence | Current owner |
|---|---|---|
| RS / HRHB personnel rises | RS late mean +715 over early mean; HRHB +503 | Reconstitution/personnel |
| Fatigue resets or drifts down | RS 0.5795 -> 0.0000; RBiH 0.1563 -> 0.0330; HRHB 0.0501 -> 0.0000 | Fatigue/exhaustion |
| HRHB quality/morale mis-shaped | HRHB officer quality and morale do not follow the overstretch arc | HRHB trajectory |
| Late-war captures fail | 156-188w RBiH: 6 attempts, 0 captures | Operation delivery |

The reconstitution/personnel and HRHB lanes are not clean openers for this packet:

- `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` shipped a focused reinforcement-multiplier step-curve.
- `docs/40_reports/implemented/20260504_RECONSTITUTION_188W_VERIFICATION.md` verified that this lever did not bend the long-war VRS/HRHB arc and pointed away from another simple reconstitution retune.
- `docs/40_reports/implemented/20260505_HRHB_NUMERICS_RETUNE_PHASE_1.md` shipped the HRHB officer-quality data retune and bent post-w52 HRHB trajectory by the refined gate.

That leaves fatigue/exhaustion as the clearest unclosed owner from the reassessment.

## Fatigue Mechanism Finding

The live fatigue mechanism is in `src/state/formation_fatigue.ts`:

- `FRONTLINE_FATIGUE_PER_TURN = 0.5`
- `FATIGUE_RECOVERY_INTERVAL = 2`
- non-engaged active formations recover `-1` every even turn
- front-assigned formations add `+0.5` every turn
- combat fatigue is separate: attacker `+2`, defender `+1`

For a non-engaged frontline brigade, that means the intended equilibrium is near zero. A brigade at fatigue 0 becomes 0.5 on one turn, 1.0 on the next, then recovers back to 0 before adding 0.5 again. This is consistent with the audit observation that all factions' late-war fatigue means collapse toward zero unless combat remains frequent enough to overpower recovery.

The issue is therefore not a missing call site or an obvious one-line bug. It is a behavior-shape decision: should long-run frontline duty leave durable fatigue residue, and if so by how much and under which conditions?

## Why No Code Change Was Safe Here

The obvious patches are all global:

| Candidate | Why deferred |
|---|---|
| Increase `FRONTLINE_FATIGUE_PER_TURN` above 0.5 | Global multiplier-like retune across all factions, all fronts, and all scenario windows. |
| Slow recovery from every 2 turns to every 3+ turns | Global fatigue-retention retune; likely affects early-war calibration and combat tempo. |
| Block recovery for all front-assigned formations | Global doctrine change; risks making quiet front holding behave like constant combat. |
| Couple fatigue accumulation directly to war exhaustion | New cross-system behavior; needs canon/design shape and acceptance tests across 40w and long war. |

Those are not safe as a solo bounded patch under the user constraint: do not apply global multipliers or forced historical rails. They may be correct future work, but they need a fatigue/exhaustion design packet with explicit acceptance criteria.

## Classification

**Blocker class:** Design-gated behavior retune, not a single-owner implementation bug.

**Primary owner:** Fatigue/exhaustion trajectory.

**Secondary consumers to protect:** combat math, operation readiness, commander plan creation, late-war operation delivery, and 40w calibration.

**Sensitive-history/canon status:** No sensitive-history surface was touched. Future work must remain faction-symmetric in mechanism and data-asymmetric only where sourced.

## Recommended Next Lane

Open a focused **fatigue/exhaustion residue lane**:

1. Write RED tests around `applyFatigueRecovery(...)` proving the desired long-run residue behavior for a front-assigned non-engaged brigade, an engaged brigade, a reserve brigade, and an exhausted late-war brigade.
2. Pick one bounded mechanism after design sign-off:
   - residue floor from sustained frontline assignment,
   - recovery slowdown only above a fatigue threshold,
   - war-exhaustion-modulated recovery cap,
   - or a separate long-war fatigue memory distinct from transient combat fatigue.
3. Run focused fatigue/exhaustion tests first.
4. Run 40w as the no-regression gate.
5. Escalate to 188w only if 40w holds and the mechanism is meant to prove late-war behavior.

Acceptance should require evidence that:

- 40w early-war VRS superiority is not degraded by a quiet-front fatigue retune.
- 156-188w fatigue does not collapse to zero for all factions.
- Fatigue changes affect operation delivery through existing readiness/combat consumers rather than calendar rails.
- Hash drift is explained by the fatigue mechanism and not by unstable ordering.

## Determinism

This packet is documentation-only. It adds no timestamps generated at runtime, no random calls, no locale-dependent sorting, no simulation code, and no serialized-state changes.

## Files Touched

- `docs/40_reports/audits/20260515_FORCE_QUALITY_TRAJECTORY_FATIGUE_DEFERMENT.md`
- `docs/40_reports/README.md`
- `docs/40_reports/CONSOLIDATED_BACKLOG.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

FORAWWV was not edited.
