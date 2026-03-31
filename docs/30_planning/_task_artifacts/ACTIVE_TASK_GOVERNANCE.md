# Active Task Governance

## Task

Task name:
Operations singularity roadmap tightening + implementation plan

Owner-level intent:
Make operations singularity explicit in the roadmap and give implementers one concrete plan document for the first truly real command object in the game.

## Scope

Files / systems in scope:
- `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`
- `docs/plans/MASTER_ROADMAP.md`
- `src/sim/combat/sector_offensive.ts` as analysis target only
- `src/sim/combat/operation_preparation.ts` as analysis target only
- `src/sim/combat/operation_prediction.ts` as analysis target only
- `src/sim/combat/bot_corps_operations.ts` as analysis target only
- `src/ui/map/components/OperationsPanel.tsx` as analysis target only
- `src/ui/map/components/ops_modal/OpsPlanningModal.tsx` as analysis target only

Files / systems explicitly out of scope:
- gameplay code changes
- canon documents
- operations execution code changes
- commander cognition implementation

## Canonical owner

What system owns the decision after this change?
The roadmap/planning layer owns the sequencing and implementation brief for operations singularity. The operations stack centered on `sector_offensive.ts` remains the intended canonical future owner of operations lifecycle.

## Demoted path

What old path is removed, demoted, or declared non-authoritative?
No runtime path is removed by this task. The plan should demote vague “ops cleanup later” language in favor of one explicit operations singularity plan and stronger roadmap gate language.

## Decision boundary

What is this system allowed to decide?
This task is allowed to define scope, phases, acceptance criteria, scaffolding assessment, and milestone linkage for operations singularity.

What must not also decide this elsewhere?
Parallel audit docs or ad-hoc chat planning should not become alternate master plans for ops consolidation.

## Done means

What test, report, or observable behavior proves the change is real?
- a new dedicated operations singularity plan file exists
- `MASTER_ROADMAP.md` points to it
- the roadmap makes ops singularity a visible gate, not background cleanup

## UI/report truth

What player-facing or report-facing surface reflects the new truth?
`MASTER_ROADMAP.md` and the new operations singularity plan become the visible planning truth for the implementer.

## Roadmap slot

What milestone does this belong in?
Roadmap/planning support for `v0.8.x-final`, with explicit gating impact on `v0.8.1`.

Why here and not later?
Because operations singularity is the gating proof that commander reality is working, and the roadmap still under-expresses that.

## What this unlocks

What future work becomes safe only after this is done?
Commander maturity, political bot work, order interpretation, and ops UX overhaul without building on split operation truth.

## Exact milestone changes

Use this section only if roadmap edits are involved.
Add the new operations singularity plan document to `MASTER_ROADMAP.md` and strengthen the `v0.8.x-final` / `v0.8.1` dependency wording.

## Exact renumbering

Use this section only if roadmap edits are involved.
No milestone renumbering in this task.

## Items moved

Use this section only if roadmap edits are involved.
No roadmap items moved between milestones in this task.

## Sequencing risks avoided

Use this section only if roadmap edits are involved.
Avoids implementers treating operations singularity as background cleanup instead of the first real gate before commander maturity and later AI layers.

## Operations gate

Use this section if operations are in scope.
Operations are directly in scope for this task as a planning and roadmap gate.

- one canonical operation object?
- one canonical lifecycle?
- one canonical creation / launch / update path?
- UI reflects the same truth?

## Checkpoints

- date: 2026-03-31
  progress: Collected roadmap wording and existing ops scaffolding from `sector_offensive.ts`, concurrent ops plan, multi-brigade spec, and prior operations audit findings.
  next verification: Create the operations singularity plan file, tighten the roadmap gate language, then run the governance check script.
