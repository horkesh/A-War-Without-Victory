# Sector Truth Reconciliation Byte-Identity Plan

**Date:** 2026-05-26
**Status:** ACTIVE execution-grade plan; Phase 1 slice executed 2026-05-26
**Owner lane:** Engine-quality sector/frontline performance lane
**Related command-board row:** P1 Sector/frontline performance residuals
**Collision rules:** Planning target is sector/frontline engine performance only. Do not mix with calibration, event content, GUI, save-schema, or generated-artifact ownership work.
**Phase covered:** Next bounded implementation slice after fresh profile evidence on `main`.
**Current next action:** Re-profile from preserved hash `f219401f4a17f311` before choosing any further final-sector-truth/partitioning target. The 2026-05-26 Phase 1 slice reused invocation-local sorted corps groups in `ensureMinimumSectorCoverage(...)` and did not prove a full scenario speedup.

## Purpose

Use the fresh profile evidence in `docs/40_reports/implemented/20260526_SECTOR_CURRENT_PROFILE_EVIDENCE_CLOSEOUT.md` to execute one bounded sector/frontline performance slice without changing simulation truth. The current final hash is `f219401f4a17f311`; the measured hotspots are:

| Bucket | Evidence |
| --- | ---: |
| `reconcile-final-sector-truth` | 7413.161ms total, 7.429%, 185.329ms per call |
| `partition-corps-front-sectors` | 7115.483ms total, 7.131%, 177.887ms per call |
| `sealMergedSectorTruth:ensure-coverage` | 2135.188ms, 12.383% of sector partition timing |

This plan supersedes stale pre-profile target selection for this lane. Older sector performance plans remain historical templates for byte-identity discipline, not the current target list.

## Non-Goals

- No broad cache, module-level cache, cross-turn cache, or cache keyed by object identity/array length.
- No mutable `Map`, `Set`, sector packet, edge metadata, or brigade ownership structure may leak outside its owning invocation.
- No sector truth algorithm redesign, no sector ID/order change, and no combat/operation/brigade-assignment semantic change.
- No scenario data, event data, OOB, painted target, calibration, GUI, save schema, migration, validator, or canon edits.
- No generated profile artifacts may be staged unless a separate task explicitly promotes a deterministic fixture.
- No baseline refresh. Hash drift is a stop condition unless a separate approved behavior-change plan owns it.

## External-Agent Execution Contract

Session-start commands:

```powershell
git status --short --branch
rg -n "reconcile-final-sector-truth|partition-corps-front-sectors|sealMergedSectorTruth|ensureMinimumSectorCoverage|buildCorpsFrontSectors|buildFactionSectors|buildMultiSectorsForCorps" src tests docs/plans docs/40_reports/implemented
```

Required reading:

- `.claude/napkin.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/PLAN_EXECUTION_STANDARD.md`
- `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 1
- `docs/40_reports/implemented/20260526_SECTOR_CURRENT_PROFILE_EVIDENCE_CLOSEOUT.md`
- `docs/plans/2026-05-20-sector-performance-next-target-plan.md` for cache discipline only

Files to inspect before editing:

- `src/sim/turn_phases/war_phase_reconciliation_steps.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/sim/combat/final_sector_truth_reconciliation.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/combat/sector_building.ts`
- `tests/sector_partition_instrumentation.test.ts`
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`
- `tests/final_sector_truth_reconciliation.test.ts`
- `tests/final_sector_truth_reconciliation_cache.test.ts`
- `tests/war_phase_step_order.test.ts`

Branch collision rule:

- If another branch changes sector/frontline code, generated profile evidence, or the 40w hash, stop and rebase/re-profile before editing.

Global stop rule:

- Stop on unexplained hash drift, unmeasured cache proposal, mutable map leakage risk, output ordering uncertainty, generated-artifact ownership ambiguity, or sensitive-history/calibration drift.

Expected commit boundary:

- One implementation slice only. Do not combine this with schema cleanup, calibration, GUI, or artifact cleanup.

## Task Boundary Rules

Allowed edits:

- Focused sector/frontline performance code in the files listed above.
- Focused tests that prove equivalence, invocation-local ownership, and instrumentation contracts.
- A closeout report under `docs/40_reports/implemented/` after code lands.
- `docs/PROJECT_LEDGER.md` and command-board updates at closeout.

Forbidden edits:

- Scenario/event/OOB/control data.
- Save schema, migrations, validators, serialized output format, or baseline fixture refresh.
- UI/read-model work.
- Any source of timestamps, randomness, environment-dependent ordering, or unordered serialized diagnostics.

Save/schema work:

- Not allowed in this plan. If implementation appears to require persisted state or save-shape changes, stop.

Scenario/hash drift:

- Not allowed. The 40w profile and baseline regression must keep final hash `f219401f4a17f311` unless the branch discovers that `main` has legitimately advanced before work starts; in that case, record the new pre-change hash before editing and require post-change identity to that hash.

Decision packet rule:

- Write a decision packet instead of implementation if the best candidate needs algorithmic truth changes, baseline refresh, or behavior changes to sector coverage/brigade ownership.

## Phase 1 - Profile-Confirmed Final Truth Optimization

**Owner:** performance-engineer plus systems-programmer
**Reviewers:** gameplay-programmer, determinism-auditor, QA engineer

Candidate functions/modules:

- Step owner: `src/sim/turn_phases/war_phase_reconciliation_steps.ts` (`reconcile-final-sector-truth`, `reconcile-final-sector-truth-after-ops`)
- Partition step: `src/sim/turn_phases/war_phases.ts` (`partition-corps-front-sectors`)
- Reconciliation wrapper: `src/sim/combat/final_sector_truth_reconciliation.ts`
- Sector rebuild entrypoint: `src/sim/combat/corps_front_sectors.ts` (`buildCorpsFrontSectors`, `sealMergedSectorTruth`, `buildFactionSectors`)
- Coverage sub-hotspot: `src/sim/combat/brigade_assignment.ts` (`ensureMinimumSectorCoverage`)
- Per-corps construction: `src/sim/combat/sector_building.ts` (`buildMultiSectorsForCorps`)

Implementation order:

1. Re-run the current 40w sector profile before code changes and confirm `f219401f4a17f311` or record the new clean pre-change hash if `main` advanced.
2. Add tests first. The tests must fail under a deliberate local mutation or with the planned helper missing, then pass after implementation.
3. Pick one narrow candidate inside `sealMergedSectorTruth:ensure-coverage`, the final reconciliation wrapper, or duplicated partition/reconciliation setup. Do not optimize a different bucket without new profile proof.
4. Implement only invocation-local precomputed data, copied immutable views, or function-local lookup structures that die before `buildCorpsFrontSectors(...)` returns.
5. Re-run focused tests, then profile/hash/baseline gates.

Exact red/green tests to write or extend:

- `tests/final_sector_truth_reconciliation_cache.test.ts`
  - Add `final reconciliation uses invocation-local lookup ownership without changing sector snapshots`.
  - Red proof: temporarily alter the new lookup builder to reuse a mutable map across calls or skip copying one sector packet list; the test must fail by comparing canonicalized sector snapshots from two consecutive final reconciliation calls.
  - Green proof: cached/local path and cold path produce byte-identical sector snapshots.
- `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts`
  - Add `buildCorpsFrontSectors final-pass local ownership is byte-identical across cache enabled and disabled paths`.
  - Red proof: temporarily reverse one emitted `edge_ids`, `territory_osids`, `assigned_brigade_ids`, `reserve_brigade_ids`, or `rear_brigade_ids` array in the optimized path; canonical byte comparison must fail.
  - Green proof: cache-enabled and bypassed paths match on real/synthetic variants.
- `tests/sector_partition_instrumentation.test.ts`
  - Extend static contracts for any new label/helper to prove instrumentation is flag-gated, timestamp-free, sorted, and absent from serialized game state.
  - Red proof: introduce an unflagged label write or `Date.now`/`performance.now` in the instrumentation region; static test must fail.
- `tests/war_phase_step_order.test.ts`
  - Keep the existing final-sector-truth ordering assertions green. Add a specific assertion only if an implementation changes helper boundaries around final reconciliation.

Required focused verification:

```powershell
npx.cmd vitest run tests\final_sector_truth_reconciliation_cache.test.ts tests\final_sector_truth_reconciliation.test.ts tests\sector_partition_buildCorpsFrontSectors_integration.test.ts tests\sector_partition_instrumentation.test.ts tests\war_phase_step_order.test.ts --reporter=dot
npm.cmd run typecheck
```

Byte-identity/hash proof:

```powershell
$env:PERF_PROFILE_SECTOR_PARTITION='true'
npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_truth_reconciliation_post_profile --report data/derived/_debug/sector_truth_reconciliation_post_profile_40w.json
npm.cmd run test:baselines
git diff --check
```

Acceptance:

- Final profile run hash equals the clean pre-change hash, expected `f219401f4a17f311`.
- `npm.cmd run test:baselines` passes byte-identically.
- Focused sector tests pass.
- Implementation report names before/after timings for `reconcile-final-sector-truth`, `partition-corps-front-sectors`, and `sealMergedSectorTruth:ensure-coverage`.
- Performance claim is allowed only if local profile and full scenario timing move directionally together. If noisy, report byte-identity with performance inconclusive.

Stop gates:

- Candidate requires broad cache, cross-turn memory, module-level state, or mutable map/set leakage.
- Any sector packet ordering changes.
- Any hash, baseline, `final_save.json`, `run_summary.json`, `weekly_report.jsonl`, or `end_report.md` drift.
- Optimization touches combat math, operation selection, brigade movement, or scenario/control data.
- Generated artifacts need staging or ownership change.

## Generated Artifacts Policy

- `data/derived/_debug/*` and `runs_perf/*` are ignored evidence outputs for this plan.
- Do not stage generated profile outputs.
- Do not copy profile timings into save files, reports consumed by game logic, scenario truth artifacts, or baseline fixtures.
- A deterministic diagnostic fixture can be promoted only under a separate plan that names the fixture owner command, stable sort keys, and update policy.

## Determinism and Save-Schema Gates

- No timestamps, random values, locale-dependent sorting, environment-dependent behavior, or unordered object/`Map`/`Set` iteration in persisted output.
- All emitted diagnostics must have stable labels and stable sort keys.
- New persisted fields are forbidden.
- Baseline regression is mandatory for any source-code implementation.
- Manifest or generated fixture refresh is forbidden unless a separate plan owns it.

## UI and Player-Truth Gates

Not applicable to implementation. This plan must not alter UI surfaces, player-visible text, fog boundaries, or read models. If an optimization appears to change what the player can see, stop.

## Historical and Sensitive-History Gates

This plan must not alter historical claims, Codex text, events, scenario starts, OOB, painted targets, or sensitive-history framing. If profile or baseline evidence suggests sensitive-history delivery changed, stop and route to the owning content/calibration plan.

## Roadmap and Ledger Closeout

Each implementation slice must update:

- `docs/plans/COMMAND_BOARD.md` if the next action or status changes.
- This plan with phase status if the plan remains active.
- `docs/PROJECT_LEDGER.md`.
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for reusable process/design lessons.
- `docs/40_reports/implemented/` for code/data implementation evidence.
- `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` and `docs/40_reports/README.md` for the implementation report.

Do not update `docs/plans/MASTER_ROADMAP.md`, `docs/40_reports/CONSOLIDATED_BACKLOG.md`, or `docs/40_reports/GAME_STATE_RATING_MASTER.md` unless the implementation closes or reclassifies the lane.

## Copy-Ready Worker Prompt

```text
Role and objective: You are the sector/frontline performance implementation worker for AWWV. Execute docs/plans/2026-05-26-sector-truth-reconciliation-byte-identity-plan.md Phase 1 only. The target is bounded byte-identical optimization around reconcile-final-sector-truth, partition-corps-front-sectors, and sealMergedSectorTruth:ensure-coverage using the fresh profile hash f219401f4a17f311.

Canon references: Read .claude/napkin.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md Phase 1, docs/40_reports/implemented/20260526_SECTOR_CURRENT_PROFILE_EVIDENCE_CLOSEOUT.md, and this plan before editing. Inspect src/sim/turn_phases/war_phase_reconciliation_steps.ts, src/sim/turn_phases/war_phases.ts, src/sim/combat/final_sector_truth_reconciliation.ts, src/sim/combat/corps_front_sectors.ts, src/sim/combat/brigade_assignment.ts, src/sim/combat/sector_building.ts, and the sector tests named in the plan.

Determinism and ledger constraints: No broad caches, module-level caches, cross-turn caches, mutable Map/Set leakage, timestamps, randomness, unordered iteration, save-schema changes, scenario data changes, calibration changes, GUI changes, generated artifact staging, or baseline refresh. Only invocation-local precomputed data or copied immutable views are allowed. Preserve final hash f219401f4a17f311 unless main has advanced before editing; if so, record the new clean pre-change hash and preserve it exactly.

STOP AND ASK triggers: unexplained hash drift, baseline drift, sector packet ordering drift, mutable map/set ownership uncertainty, generated artifact ownership ambiguity, sensitive-history/calibration drift, branch collision, need for persisted state, or an optimization candidate outside reconcile-final-sector-truth / partition-corps-front-sectors / sealMergedSectorTruth:ensure-coverage.

Output format and validation: Report candidate chosen, files changed, red/green tests added with the red proof method, focused test results, typecheck result, 40w profile final hash and before/after bucket timings, baseline regression result, generated artifacts intentionally unstaged, docs/ledger updates, and the next unfinished sector-performance action.
```
