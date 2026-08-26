# Active Task Governance

## Task

Task name:
RE — Engine Integrity workstream (cost loop, operation supply, combat truth)

Owner-level intent:
Owner instruction 2026-08-26: *"Engine health is sacrosanct — these issues should be dealt with immediately before more calibration work."* Turn five days of Pyrrhic standup findings into a roadmap-owned workstream that precedes further calibration, and stop engine-health defects from being carried indefinitely as report backlog.

## Scope

Files / systems in scope:
- `docs/plans/2026-08-26-engine-integrity-plan.md` (new executable plan)
- `docs/40_reports/proposals/20260826_ENGINE_INTEGRITY_PACKET.md` (evidence packet + panel corrections)
- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/40_reports/REAL_WAR_MASTER.md` (#40 re-priority)
- `docs/40_reports/CALIBRATION_MASTER.md` (decision rule + baseline pin)
- `docs/PROJECT_LEDGER.md`
- `tools/engine_health_gate.cjs`, `data/calibration/engine_health_thresholds.json` (Phase 0)
- Engine surfaces named in the plan: `war_phases.ts`, `attack_casualty_distribution.ts`, `formation_spawn.ts`, `pre_planned_operations.ts`, `bot_corps_ai.ts` / `bot_corps_operations.ts`, `sector_offensive_launch_helpers.ts`

Files / systems explicitly out of scope:
- `docs/10_canon/FORAWWV.md`
- Painted references, `init_control`, op objectives, axes, operation timing, OOB rosters — Codex's live calibration lanes
- `attack_morale_absorption.ts` weakening (governance-gated, entangled with the Petkovci §6 referral)
- `cohesion_floor` and `aggression_modifier` (owner-settled modelled history)
- Sector-partition behaviour (observation only this workstream)

## Canonical owner

What system owns the decision after this change?
`docs/plans/MASTER_ROADMAP.md` §5 row **RE** owns the workstream's existence and status; `docs/plans/2026-08-26-engine-integrity-plan.md` is its single task-level contract. The pre-committed decision rule in `CALIBRATION_MASTER.md` owns adoption/rejection of every RE change. No second plan may attach to RE.

## Demoted path

What old path is removed, demoted, or declared non-authoritative?
Engine-health findings living as loose report backlog in `REAL_WAR_MASTER.md` and the standup record are demoted; RE is now their roadmap home. The evidence packet's own §1-§6 claims are demoted beneath its §8 panel corrections — ten packet claims were refuted and the corrections win. The `matched_osids ≥ 622` framing is demoted in favour of the four per-checkpoint hard minimums.

## Decision boundary

What is this system allowed to decide?
RE may decide engine-internal correctness: how losses are ledgered, how replacement affects unit capability, how operations are selected and injected, and what the instruments report. It may move the calibration floor where the movement is explained and located on the mechanism's causal path.

What must not also decide this elsewhere?
Calibration lanes must not silently re-tune around an RE defect; a calibration delta measured against pre-RE combat behaviour is void once RE lands (see the lane-class split in the plan §7). Report-level backlog notes must not re-open an RE item outside the plan.

## Done means

What test, report, or observable behavior proves the change is real?
- Phase 0 complete with zero scenario runs: op-schedule fingerprint reproduces `n294`'s schedule; corrected health-gate metric reported alongside the old one; a clean `git_dirty:false` four-checkpoint 188w pin exists; the decision rule is written into `CALIBRATION_MASTER.md` before run 1.
- Every behavioural change carries a test whose failing mutation is named, and every key-set assertion carries a liveness count.
- Phase 2 and 3 adoptions each satisfy S1-S6 of the decision rule, including the historian tripwire.
- `REAL_WAR_MASTER #40` is P0 and reopened as the probe-selection defect.

## UI/report truth

What player-facing or report-facing surface reflects the new truth?
A-3 ships with per-brigade "reconstituting — unavailable, N weeks" state on `FormationDetail` and the ops-modal `BrigadeCard`, or it does not ship. Without it the player sees an operation silently refuse to launch and reads it as a bug rather than as a cost. Mobilization strain and formation destructions already render (`PersonnelContent.tsx`, `turnAftermath.ts`) and currently read 0 destroyed / ~7% strain across 188 weeks for RBiH — the game telling the player the war cost him nothing structural.

## Roadmap slot

What milestone does this belong in?
A new gate lane **RE**, sibling to RC, inserted **before further R6-class calibration and before R8**. Not a numbered R-workstream: R1-R7 are product workstreams with R5 (engine quality/performance) and R6 (calibration) already closed, and this is neither a reopening of R5's performance scope nor an R6 calibration packet.

Why here and not later?
Because R8 full-campaign validation and any further calibration both measure an engine whose combat-supply path is defective: 62% of all battles are probe operations that cannot capture by construction, and authored operations can be dropped at injection without a warning. Calibrating or diary-scoring that engine ratifies the defect as the floor. The owner's instruction makes this precedence explicit.

## What this unlocks

What future work becomes safe only after this is done?
Honest calibration deltas on op-objective/axis/timing/roster lanes; R8 diaries that measure the game rather than the defect; the terrain-blind planner decision (4.1), which cannot be measured against a defence that never loses; and the mobilization-ceiling design pass (4.2).

## Exact milestone changes

Add workstream **RE — Engine integrity** to `MASTER_ROADMAP.md` §5 Workstream Register with status SCOPED and its executable plan linked. Insert RE into §4 Program Sequence ahead of R8 and ahead of any reactivated R6 calibration. Add an RE row to §8 Cross-Workstream Collision Rules covering combat resolution, the manpower economy, and operation injection. Update the Current Execution Snapshot to record the owner's precedence instruction. Mirror all of it into `COMMAND_BOARD.md`.

## Exact renumbering

None. R1-R9 keep their identifiers and their closure states. RE takes a letter identifier exactly as RC did, and sits at dispatch order 7.5 (after R7, before R8) on the command board.

## Items moved

Moved **into** RE from loose report backlog: the probe-selection defect (`REAL_WAR_MASTER #40`, re-prioritized P3 → P0), the demographic-ledger divergence, the replacement-quality gap, the silent operation-injection skip, and the health-gate predicate defect.

Moved **out** of the packet's proposed scope: the terrain-blind planner (stays an owner decision, plan §10.1), the mobilization-ceiling redesign (§10.2), the `committed`-decrement ledger semantics (§10.3), and the Petkovci §6 referral (§10.4, separable and urgent — should not wait on RE).

No item moves between R1-R9.

## Sequencing risks avoided

- **Ratifying a defect as the floor.** Calibrating against an engine where 62% of battles cannot take ground bakes the defect into every subsequent delta.
- **Blessing a red gate as the new ceiling.** The corrected health-gate predicate reads 11/13 against ceilings of 6/3; landing it gated would either turn the gate permanently red or ratchet the defect in. It lands reported-not-gated.
- **A no-op that looks like a fix.** Cohesion dilution is erased by the RBiH floor clamp within one turn. Re-scoped onto `experience`, which has no floor clamp and no passive recovery.
- **Fixing C into ahistorical gains.** Raising VRS real-operation volume would flip Donji Vakuf and Bugojno — ground the VRS demonstrably did not take — and improve the score for the wrong reason. Guarded by the historian tripwire.
- **Confounded measurement.** RE branches from a clean four-checkpoint pin in its own worktree; the main tree currently carries uncommitted calibration work and 17 unpushed commits.
- **Two lanes invalidating each other.** The lane-class split lets reference/`init_control` work continue while op-behaviour lanes pause or bank for re-measurement.

## Operations gate

Use this section if operations are in scope.
Operations are centrally in scope. RE Phase 2 owns operation injection and selection. Binding constraints: the probe rule (probes cannot capture) is correct and stays; the general "queue if corps busy" rule must be screened against the 2026-05-26 lesson (a pre-planned op on a corps holding a triggered op vacates home base via staging march even when it never fires); and no Phase 2 change may make `op:donji_vakuf:jemanlici` or `op:bugojno:medini` flip.

## Checkpoints

- date: 2026-08-26
  progress: Eight-seat Pyrrhic panel convened on the findings packet with implementer bias declared. Ten packet claims refuted, including both load-bearing sequencing claims. Plan written; cluster C re-ranked to #1; A-2 re-scoped from cohesion to experience; C re-priced downward against the historical VRS record. Roadmap patch prepared.
  next verification: Complete plan §5 Phase 2 from the Operations and Corps-Commander seats, then Phase 0 (zero scenario runs) once Codex lands a clean four-checkpoint pin.
