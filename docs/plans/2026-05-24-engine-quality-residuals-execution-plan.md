# Engine Quality Residuals Execution Plan

**Date:** 2026-05-24
**Status:** ACTIVE execution-grade plan
**Owner lane:** Engine-quality lane bank
**Related command-board rows:** P1 Sector/frontline performance residuals; P1 Optional `GameState` schema contract; P1 Save/load/replay and generated-artifact stability
**Collision rules:** May touch engine, diagnostics, save/schema, tests, and artifacts only inside the selected phase. Must not mix performance, schema, and artifact fixes in one implementation commit.
**Phase covered:** Profile-led sector optimization, optional-field contract hardening, and save/replay/generated-artifact stability.
**Current next action:** Pick exactly one phase, write or identify focused tests first, and run the phase-specific proof.

## Purpose

Close the remaining engine-quality residuals with proof-first work instead of broad churn. These lanes share the same failure modes: accidental behavior drift, nondeterministic ordering, generated artifact confusion, and schema defaults that silently change old saves.

## Non-Goals

- Do not tune calibration, operation outcomes, scenario control, or event bot choices here.
- Do not remove optional fields just to improve inventory counts.
- Do not add caches without profiling evidence and byte-stability proof.
- Do not refresh baselines unless the selected phase explicitly owns the output change.
- Do not edit `docs/10_canon/FORAWWV.md`.

## External-Agent Execution Contract

Session start commands:

```powershell
git status --short --branch
node tools/diagnostics/strict_null_inventory.cjs
rg -n "ensureMinimumSectorCoverage|recoverDroppedFrontEdges|buildFactionSectors|save_migration|validateGameState|latest_run_final_save|baseline" src tests tools docs
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- `docs/plans/2026-05-20-sector-performance-next-target-plan.md`
- `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`
- `docs/plans/2026-05-20-strict-null-post-factionid-roadmap.md`
- `docs/plans/2026-05-20-strict-null-schema-boundary-validation-plan.md`
- `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md`
- `docs/plans/2026-05-17-save-migration-hardening-plan.md`

Branch collision rule:

- If calibration branch output changes overlap sector, scenario, or save artifacts, switch to owned-branch acceptance before editing.

Global stop rule:

- Stop for unexplained hash drift, nondeterministic output, unowned generated artifacts, or migration/default uncertainty.

Expected commit boundary:

- One phase per commit. Do not combine performance, schema, and artifact changes.

## Task Boundary Rules

Allowed edits by phase:

- Sector phase: sector/frontline builders, focused tests, profiling scripts/reports.
- Schema phase: `GameState` type/default/migration/validator boundaries and focused tests.
- Save/replay phase: save/load/replay harness, artifact ownership docs/tests, generated-output checks.

Forbidden edits:

- scenario data and event data unless the selected phase explicitly owns a fixture correction;
- calibration catalogs and operation tuning;
- UI shell work while GUI branch is active;
- broad strict-null rewrites unrelated to the selected optional-field family.

Scenario/hash drift:

- Performance and schema refactors should be hash-stable unless explicitly stated. Save/replay harness changes may alter diagnostics but need artifact proof.

Decision packet rule:

- If a field default, migration behavior, or baseline refresh could change accepted output, write a decision packet or acceptance note before implementation.

## Phase 1 - Sector/Profile Residuals

**Owner:** performance-engineer plus gameplay-programmer
**Reviewers:** systems-programmer, QA engineer

Steps:

1. Capture current profiling target and measured bottleneck.
2. Write or identify focused sector stability tests.
3. Optimize only the measured function family.
4. Prove hash/output stability unless behavior change is explicitly intended.

Verification:

```powershell
npx.cmd vitest run <focused-sector-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Add timed/baseline proof when output or generated artifacts can move.

Stop gates:

- no profile evidence;
- unmeasured cache proposal;
- changed 40w/188w hash without explanation;
- sensitive-history delivery drift.

## Phase 2 - Optional `GameState` Contract

**Owner:** systems-programmer
**Reviewers:** save/schema QA, canon-compliance-reviewer when behavior can move

Steps:

1. Pick one optional-field family from the inventory.
2. Classify it as persisted contract, derived/runtime-only, legacy compatibility, or unsafe to change.
3. Add migration/default/validator tests before changing the shape.
4. Promote, narrow, or document the field family.

Verification:

```powershell
node tools/diagnostics/strict_null_inventory.cjs
npx.cmd vitest run <focused-save-validation-tests> --reporter=dot
npm.cmd run typecheck
git diff --check
```

Stop gates:

- legacy save compatibility unclear;
- default changes scenario output;
- field is a real boundary/type-shape issue, not cosmetic optionality.

## Phase 3 - Save/Replay/Generated Artifact Stability

**Owner:** scenario-harness-engineer
**Reviewers:** determinism-auditor, QA engineer

Steps:

1. Map artifact owner command for each generated file touched by the phase.
2. Add equivalence or ownership checks before changing write behavior.
3. Keep transient files unstaged unless the phase owns their refresh.
4. Prove replay/save/load determinism with focused tests.

Verification:

```powershell
npx.cmd vitest run <focused-save-replay-tests> --reporter=dot
npm.cmd run test:baselines
git diff --check
```

Stop gates:

- artifact written by multiple commands with no owner;
- baseline refresh not planned;
- nondeterministic serialization order;
- retained artifact deleted without replacement proof.

## Determinism and Save-Schema Gates

- No timestamps, random values, environment-dependent ordering, or unordered `Map`/object iteration in persisted output.
- Persisted arrays and diagnostics need stable sort keys.
- New save fields require migration, default, validator, and fixture coverage.
- Generated output must be owned by a documented command.

## UI and Player-Truth Gates

Only relevant if a read model changes. Do not expose hidden enemy truth, and do not route UI presentation changes through this lane while GUI branch is active.

## Historical and Sensitive-History Gates

Performance/schema/artifact work should not alter historical claims. If output movement changes sensitive-history delivery or operation visibility, stop and route to the owning content/calibration plan.

## Roadmap and Ledger Closeout

Closeout must update:

- `docs/plans/COMMAND_BOARD.md` if row status or next action changes;
- this plan with phase completion;
- relevant older plan only if superseded or reopened;
- `docs/PROJECT_LEDGER.md`;
- implemented report when code/data changes land.

## Copy-Ready Prompt

```text
Role and objective: You are the engine-quality execution agent for AWWV. Execute docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md for exactly one phase selected by the orchestrator: sector performance, optional GameState schema contract, or save/replay artifact stability.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this plan, and the older source plans named in the selected phase before editing.

Determinism and ledger constraints: No timestamps, randomness, environment-dependent behavior, nondeterministic ordering, unowned generated artifacts, or broad type churn. New persisted fields need migration/default/validator tests. Append docs/PROJECT_LEDGER.md for behavior/output/schema/tooling changes. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: unexplained hash drift, missing profile evidence, legacy save uncertainty, generated artifact ownership ambiguity, sensitive-history delivery drift, branch collision, or baseline refresh without an owning plan.

Output format and validation: Report selected phase, files changed, tests written/run with pass/fail, inventory/profile/hash evidence, generated artifacts touched or intentionally excluded, docs/ledger updates, and next unfinished phase.
```
