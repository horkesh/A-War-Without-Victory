# Independent Engine/systems and determinism post-run review

Date: 2026-10-24  
Seat: Engine/systems with determinism review  
Candidate: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n94`  
Frozen source: `a913286803a095b6dc3f57a44175081d6ae4b8eb`

## Verdict

**GO for the single owner-authorized stage-2 baseline update, once the separate scenario/calibration seat records GO and the root confirms the tree is still clean at the frozen commit.** Stage 1 satisfies the Engine/systems and determinism conditions from `ENGINE_PREFLIGHT.md`. No simulation, source, comparator, or preserved-evidence drift is present.

This verdict authorizes only the frozen one-invocation update wrapper. It does not accept the manifest before that invocation, waive the final eight-value diff review, authorize a retry, close global calibration, or close R8 native/package/warroom gates.

## Preserved execution

- The first PowerShell launcher was retained as `launcher-noop-01.json`: the shell exited 0 after invoking Node with no arguments, and no preserved-preflight attempt, campaign, or simulation invocation occurred. The corrected v2 launcher produced the first and only stage-1 campaign. This is a disclosed launcher error, not a second campaign or discarded measured result.
- `campaign-01/receipt.json` records child exit 0, wrapper exit 0, no timeout or signal, an exact artifact contract, stable entry-script bytes, and 46 retained artifacts. Elapsed preserved-preflight time was 182,538 ms, within the 2,100,000 ms cap.
- The actual child used Node `v22.23.2`, exact HEAD `a913286803a095b6dc3f57a44175081d6ae4b8eb`, the frozen n93 diagnostic selectors/save weeks, and one `run_scenario_with_preflight.ts` invocation. `campaign-execution.json` identifies exactly one new run, n94.
- `dependency-verification.json` passes for all frozen runtime dependencies. The before/after tracked-source aggregate is identical (`226d3964955a2edc74bb5f6c9d1ac174afdc4e36a12bd148feea29011350cd5f`, 10,154 tracked files).
- Preservation passes 3,226/3,226 before and after. The C-lane telemetry retains its exact 121,114,591-byte opening prefix and appends 946,671 bytes; the D-lane telemetry is byte-identical and appends zero. The fixed baseline target remains empty before and after.

## Determinism and provenance

- n94 provenance is clean at the exact frozen commit with 32 consumed inputs, zero input mismatches, and equal recorded/recomputed digest `88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69`.
- All seven actual non-weekly baseline artifacts equal the accepted Linux CI hashes, including `final_save.json=ff003195...`, `control_delta.json=de5cb5b5...`, and `run_summary.json=f8429e29...`.
- The diagnostic weekly artifact is the retained 33,185,387-byte form (`08b8e8cc...`). Removing only the three explicitly enabled diagnostic projections yields 188 ordered rows, 2,008,722 bytes, and the exact accepted default-observer CI hash `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`. Counts are exact: 188 movement rows, 517 attacker lists, and 281 defender-contribution lists. The candidate and comparator were not mutated.
- The n94 timeline is byte/behavior-equivalent to n92 at all checked turns. Against n91, the only accepted control delta is Toljenak from turn 135 onward; no regressed OSID is reported. This is consistent with `Engine_Invariants_v0_9_0.md` §§10-12 and §§14.1-14.2, and with the scenario/provenance requirements in `DETERMINISM_TEST_MATRIX.md`.

## Engine and protected gates

- Candidate evaluation and all ten post-run readers exit 0 with no recorded failure or timeout: evaluation, both timelines, checkpoints, consistency, health, both protected comparisons, producer proof, and 188-turn movement coverage.
- Native inventory is 40/40 with correct save bindings. Scores are 707/707/706/706 with zero formerly-correct loss against both n91 and n92. The n92 shared control timeline has zero deltas; n91 has only the accepted Toljenak delta at and after the governed April-1995 checkpoint.
- Toljenak is RS through t134, flips by one operation-owned BEHAR-I combat event at t135, and remains RBiH through t188. The evaluator finds exactly one matching battle, control event, operation diagnostic, and AAR. This satisfies the attributable-control and operation-causality boundaries in `Engine_Invariants_v0_9_0.md` §§9, 14.1, and 14.11.
- Prisoje and Donji Vrbljani are HRHB at t188 with one qualifying operation-owned battle and control event each. All 16 explicit anchors pass. Both broader protected comparison reports pass with no failures; all 21 authoritative rows, 11 legacy rows, seven western rows, five Jajce rows, and two named rows are exact against both n91 and n92.
- The checkpoint guard reports all seven protected enclaves held, Srebrenica and Zepa falling on schedule, eastern capture provenance clean, all four authored Farz objectives operation-owned, and the 49-cell western cascade exact.
- Engine health passes every hard check: zero eligible-operation failures, zero dead operations, zero ghost destructions, 10 stranded brigades within the 16 cap, zero consistency failures, 706 matched OSIDs, checkpoint floors passed, and K/W ratio 3.74 within the advisory band. The consistency validator passes. The two unresolved-assignment stderr lines are reflected in the bounded health result and do not represent a new gate failure.

## Stage-2 conditions

1. Require the separate scenario/calibration GO and retain the Historian conditions already recorded. Any protected-history disagreement or newly changed input stops the update.
2. Confirm `git status --porcelain` remains empty at `a913286803a095b6dc3f57a44175081d6ae4b8eb`, the fixed target is still recursively empty, and the pre-update manifest still has frozen SHA-256 `67774c275f206633a931d1d1aa3990336d1dd0e0877ebaaf924feb6f75378888` through the update wrapper's existing guards.
3. Invoke the frozen stage-2 command once. Preserve its full receipt and do not retry on any timeout, nonzero exit, changed dependency, provenance/input mismatch, preservation failure, or unexpected hash.
4. Before commit, return the stage-2 receipt, update result, actual target hashes, provenance, preservation evidence, and Git diff for final Engine/systems review. Acceptance requires exactly the eight authorized manifest hash values and no other production change.

Engine/systems post-run: **GO FOR ONE FROZEN STAGE-2 INVOCATION, CONDITIONAL ONLY ON THE SEPARATE SCENARIO/CALIBRATION GO AND THE EXISTING CLEAN-TREE GUARDS.**
