# R5 Phase 2e Pure Full-Solve / Serial-Commit Source Checkpoint

**Date:** 2026-08-02
**Status:** SOURCE PROOF PASS / RUNTIME ACCEPTANCE PENDING
**Scope:** Phase 2e Tasks 1-6 only
**Active plan:** `docs/plans/2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md`

## Outcome

The complete corps-sector topology build now has three explicit owners:

1. `captureSectorTopologySolveInput(...)` captures and deep-freezes the complete declared read model in deterministic order.
2. `solveCorpsFrontSectorsPure(...)` runs the existing faction/global/fixed-point sequence over one detached mutable formation projection and returns sectors, ordered mutations, deterministic diagnostics, and deterministic stage/branch trace.
3. `commitSectorTopologySolve(...)` validates turn/front-edge provenance and replays the complete journal into a field-only shadow before applying any live row or emitting any diagnostic.

`buildCorpsFrontSectors(...)` uses capture -> pure solve -> serial commit by default. The old mutable path is available only through the explicit `__buildCorpsFrontSectorsImperativeForTest(...)` oracle. Reconciliation ownership is unchanged: the existing final-sector owner still installs sectors, assigns sub-segments, clears stale ownership, computes ratings, and records geometry receipts.

This is an enabling source checkpoint, not a performance-retention claim. Tasks 7-10, no-refresh baselines, exact-parent external artifacts, runtime measurements, memory gates, retention/revert disposition, and final roadmap/ledger handoff remain pending.

## Source provenance

| Task | Commit | Result |
|---|---|---|
| Design | `1d67c7045` | Pure full-solve / serial-commit boundary and gates. |
| Task 1 | `0a73118a4` | Characterized exact topology mutation order. |
| Task 2 | `3b9147510` | Captured the explicit immutable solve input. |
| Task 3 | `d447eb046` | Extracted the detached full topology solve. |
| Tasks 1-3 repair | `3e8aa6f1b` | Removed ambient effects, narrowed formation state, restored deterministic trace/diagnostics/counters. |
| Independent oracle | `3c437fc41` | Added hand-authored constructed oracle and static boundary proof. |
| Task 4 | `fb5901ed1` | Added atomic shadow preflight, serial replay, diagnostic boundaries, and production default. |
| Task 5 | `1c064829d` | Added the complete three-mode x 100 reconciliation oracle and exact-parent comparison tool. |

No earlier commit was rewritten or squashed. Task 6 review repairs and checkpoint documentation are intentionally grouped in the final serial Task 6 commit.

## Input and purity contract

- The snapshot validates all five mode/strategy options before reading live state.
- Every collection is copied in explicit strict-key order or preserves its existing authored array order.
- The formation projection is field-narrow; it includes the genuine `FormationState.name` read used by the corps regional-edge-affinity tie-break and does not invent `created_turn` or elite-loan defaults.
- Record-shaped centroid fixtures and production `Map` inputs normalize to the same strict-key entry form.
- The pure entry has no `GameState`, process, environment, clock, filesystem, or console dependency.
- Earlier detached location/assignment writes remain immediately visible to later factions, recovery passes, and fixed points.
- Task 8A front-edge relations, dense occupancy, construction/query/fallback counters, and unexpected-fallback zero contracts remain invocation-local.

## Atomic commit contract

Preflight rejects, before any live write or diagnostic emission:

- stale turn provenance;
- changed front-edge provenance;
- a stale first row;
- a stale later repeated write against the shadow replay;
- malformed row sequence;
- unknown mutation kind; and
- missing target formation.

Valid replay applies rows in sequence and emits each diagnostic at its declared mutation boundary. Final unresolved warnings therefore occur only after unresolved truth is installed. The shadow contains only the four mutable formation fields plus the unresolved formation-id list; journal rows contain scalar fields and copied assignment/list payloads, never `GameState`, sector, graph, operation, or formation object identity.

## RED and repair evidence

- Tasks 1-3 independent review initially failed on six concrete boundaries: ambient console/instrumentation effects, candidate-vs-candidate oracle dependence, widened formation reads/invented defaults, omitted Task 8A counters, late option validation, and mutation-only trace derivation. `3e8aa6f1b` and `3c437fc41` repaired all six; a fresh independent repair review returned PASS.
- Task 4 first exposed a missing commit export, then nine atomicity/default-path tests failed against the intentional throwing stub. The implemented two-pass preflight/replay made the focused Task 4 gate `21/21` GREEN.
- Task 5 intentionally removed the last assignment-set commit row. The full reconciliation artifact differed from the imperative oracle as expected. The retained negative control asserts that divergence before the correct path is run.
- Broader reconciliation tests then exposed a record-shaped centroid compatibility error (`source.keys is not a function`). A focused RED regression reproduced it; deterministic Map/record normalization repaired it.

## Three modes x 100 oracle

The mandatory property ran 100 deterministic real-save variants in each mode:

- live war: `isFinalPass=false`, `finalSaveGeometryProjection=false`;
- final turn: `isFinalPass=true`, `finalSaveGeometryProjection=false`;
- final-save projection: `isFinalPass=false`, `finalSaveGeometryProjection=true`.

For every mode/seed, pure/serial candidate, explicit mutable imperative oracle, and a fresh candidate rerun matched across:

- returned and installed sectors/sub-segments;
- complete post-reconciliation `GameState`;
- reports, session, pending/consumed receipts, `last_report`, and receipt order;
- every mutation sequence/stage/before/after row;
- geometry-build sequence and active-location mutation count, including the extra fixed point;
- warning/debug/log/error streams and Task 8A relation diagnostics;
- canonical bytes, byte size, SHA-256, and rerun SHA;
- solve-input before/after size and SHA; and
- relation/dense-occupancy strategy contracts.

The final post-repair run passed `1/1` selected property test covering all 300 cases in `743.472 s` (`743.252 s` test body). An earlier complete run also passed in `778.918 s`; it was repeated because the centroid normalization changed snapshot code afterward. Case count and comparison surface were not reduced.

`tools/perf/sector_topology_exact_parent_oracle.ts` validates exactly 300 external cases, requires the complete three-mode x seeds `0..99` Cartesian set exactly once plus complete commit/parent/tree lineage, compares canonical case payloads, reports deterministic first-difference excerpts and SHA-256 values, and returns nonzero on divergence. It is committed for Task 8 but was not used to run a control/candidate external packet in this source-only lane.

## Fast Task 6 gates

Final prescribed source gate:

- 10 files / 107 tests: PASS;
- TypeScript `tsc --noEmit`: PASS;
- determinism static scan: 1 file / 1 test PASS;
- `git diff --check`: PASS.

Additional focused evidence:

- Task 4 topology journal/equivalence: 2 files / 21 tests PASS;
- reconciliation/session/snapshot dependency check: 3 files / 30 tests PASS;
- independent post-repair review gate: 13 files / 124 tests PASS, plus TypeScript, determinism static scan, and diff check;
- independent constructed oracle and static boundary tests remained in the reviewed source range.

## Independent review

Fresh Task 6 review is recorded as three separate verdicts:

- Technical Architecture: **PASS** — complete narrow input, early option validation, detached solve with no partial-`GameState` cast or input mutation, immediate local write visibility, and production capture -> pure solve -> serial commit ownership all hold.
- Systems/Determinism: **PASS** — full shadow preflight, exact diagnostic boundaries, invocation-local Task 8A relations, dense-occupancy preservation, explicit three-mode x 100 loops, and stable ordering all hold. Review initially found that the external comparator accepted 300 unique case IDs containing a duplicate mode/seed and a missing mode/seed. A retained RED regression reproduced that gap; the validator now requires every mode/seed pair exactly once, and the complete affected gate is GREEN.
- Performance Design: **PASS** — there is no whole-state clone, journal row object capture, sector/graph snapshot per row, cross-call cache, or incremental reuse; working copies and lazy shadows remain field-narrow and invocation-local, with existing named performance stages preserved.

The reviewer made no edits and ran none of the prohibited scenario, baseline, startup, profiling, Electron, packaging, release, push, or `FORAWWV` actions.

## Explicit boundaries and next action

Not run or changed in Tasks 4-6:

- scenario runner or startup;
- approved baselines or baseline refresh;
- exact-parent control worktree packet;
- phase/sector or V8 profiling;
- wall-clock, heap, RSS, or journal-allocation measurement;
- Electron, packaging, version, tag, signing, publication, or release state;
- save schema, migration, canon, or `docs/10_canon/FORAWWV.md`;
- incremental/component reuse, cross-call caching, parallel factions, skipped passes, or new receipts.

Next action is Task 7 under the orchestrator's named exclusive runtime lease: run approved baselines without refresh. The downstream incremental-reuse Task 6 described by the authorization gate remains closed; this source checkpoint does not authorize it.
