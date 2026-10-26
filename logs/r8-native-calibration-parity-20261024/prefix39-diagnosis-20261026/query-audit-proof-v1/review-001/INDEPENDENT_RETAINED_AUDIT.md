# Independent retained-only audit — later native force query

Date: 2026-10-26  
Workspace: `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`  
Base HEAD: `33f99fc5aac9a620a7bb0000cf233d86f270ce24`  
Review mode: retained artifacts and source inspection only; no engine/test/query rerun and no state advance

## Verdict

**LIMITED GO** for these observations only:

1. Attempt 03 executed 40 ordinary public `queryDirectiveObjection` previews against four retained native P03 RBiH states, five RBiH corps and two objectives.
2. All 40 preview clones were byte-identical before and after the query.
3. The query did not advance a turn, stage or consume an order, create an operation, or establish any capture.
4. Both objectives were actually RS-controlled and uncontested in all four retained inputs.

This is **not** positive eligibility, launch, admission or capture evidence. Every result has `forceRatio: 0` and `estimatedCasualties: 0`; 13/40 have no rejection reason, but their actions are four `abort` and nine `delay`. The normal public query can reach its non-rejection prediction fallback with no adjacent usable battle geometry and return zero. Those rows do not prove a usable real roster. The exported shared pure `planDirectiveOperation` could support a later roster-specific inspection, but this audit did not perform that work.

This does not establish an engine defect, satisfy the 707 calibration criterion, qualify a campaign, or authorize a new run.

## Bound implementation and inputs

- Attempt-03 `RESULT.json`: SHA-256 `e783d1ab81c8ea97545221bfd9e76cb47a1a0412af960570625459a0e68710b1`.
- Attempt-03 `receipt.json`: SHA-256 `900ca7c22ccf72035c50c462b7c0acd84e60da11b8837d33cf1832284af09c1e`.
- Attempt-03 entry snapshot/current `query_only.cjs`: SHA-256 `49bdd1a108efe2bc25c0be952943a81bea804d4134231430d24fbf32bd3a5c38`.
- Imported `src/desktop/desktop_sim.ts`: SHA-256 `91e3163da0aeddca169deabf0b73c47216800f0e6dee0ddc63de5d98f7416954`.
- Imported `src/sim/turn_phases/war_phases.ts`: SHA-256 `8a085a37835541f4dc267e5c1f7f75a714bafc596e21d43b1467cb8ee62d7fcd`.
- Local loader `node_modules/tsx/dist/loader.mjs`: SHA-256 `0b1c5b86192772fe9257710e739959cee5947c11ae1f93b61abfaa9b80c6def1`; Node was exactly `v22.23.2`.
- Input hashes were checked before import/query: T16 `861d4e34a4b4c22c15db6fa857449c7f5bd68deb352edbb2a0059c6960ac07e3`; T25 `d384bd9f7f24ebd044fd13bc3b123ad05f51aa074c0d44faedbe99075ac6adcc`; T30 `2cf9f899f9287f5eeffd631a641f0446449d03fa7b01721a75ebc1ace2588c4f`; final T39 `623cbaed0e6186bc5f2c4a18fd5e9b22836db9343df0e4122316c92e5c9902e8`.
- Direct retained-input inspection found `political.political_controllers` equal to `RS` and `political.contested_control` equal to `false` for both `op:foca:donje_zesce` and `op:trnovo:tosici` at T16/T25/T30/T39. This independently checks the script's otherwise hardcoded `targetController: "RS"` metadata.

The script imports the actual desktop simulation module through the pinned local loader. It loads each native save with `loadStateFromPath`, serializes/deserializes it, verifies the turn and RBiH player faction, checks that `listBlockingPlayerDecisions` is empty, then invokes the actual public `queryDirectiveObjection` on a fresh serialized/deserialized clone for every row. The imported public query calls the shared `planDirectiveOperation` from the current personnel-floor source. It is a preview path; the script never calls `runTurn`, `advanceTurn`, directive injection, order staging, a mutation IPC surface, or an event consumer.

The exact serialized clone equality check passed 40/40. The result's before and after byte counts and SHA-256 values match in every row. The script did not edit production source. Current inspected source hashes still equal the hashes captured in attempt 03.

## Attempt classification

| Attempt | Child / wrapper | Retained execution | Classification |
|---|---:|---|---|
| 01 | 2 / 126 | 0 queries; no `PRECHECK.json`; no result artifacts | Setup failure. Its root check compared Windows `process.cwd()` separators with a forward-slash literal and threw `Error: root` before loading inputs or reaching the query loop. Entry snapshot SHA-256 `918f90a37ef6fd8976b057ee7150b7036ca313f52ca9afe52ea744b3764f4ae4`. |
| 02 | 2 / 126 | 0 queries; only `PRECHECK.json` retained | Fixture-selector setup failure. It loaded/deserialized T16, then rejected actual ordinal corps IDs because `^arbih_[1-5]_corps$` did not match names such as `arbih_1st_corps`. It failed before the query loop. Entry snapshot SHA-256 `13da2fc5d9b8cbb8eacf92c78bdfcf5c4f7fe226463b9ede0d6ca4d2ce2cd853`. |
| 03 | 0 / 0 | 40 queries; 6/6 allowed artifacts; contract pass | Successful retained query run. Four snapshots × five corps × two targets. Runtime about 13.715 seconds under the 60-second cap; stdout reports `queryCount:40`, stderr is empty. |

Attempts 01 and 02 did not issue queries. Attempt 03 issued all 40. All attempts and their distinct script snapshots remain preserved.

## Result counts

- Query purity: 40/40 pass.
- `forceRatio === 0`: 40/40.
- `estimatedCasualties === 0`: 40/40.
- No rejection reason: 13/40, comprising 9 `delay` and 4 `abort`.
- Explicit rejection: 27/40.
  - `no_available_force`: 22.
  - `no_available_slot`: 3.
  - `objective_overlap`: 2.
- Recommended actions overall: 31 `abort`, 9 `delay`, 0 `launch`.

The script's `*-STATIC.json` counts are broad corroboration only. They count active, uncommitted RBiH brigades with a string location, no enclave and personnel at least 500. They do not duplicate the full planner's availability, objective, route or reachability predicates, so they cannot substitute for the selected roster or prove admission.

## Scope and procedural deviations

The requested scope was one 60-second attempt over three snapshots (T16/T25/T30), which would be 30 query rows. The preserved work instead contains three attempts and the successful script includes final T39 from its initial attempt-01 input list, producing four snapshots and 40 rows. T39 is therefore an additional observation outside the requested three-snapshot proof. It is not evidence that the requested scope was followed exactly.

The two failed attempts are fully classifiable and did not mutate state or execute queries, but they still deviate from the one-attempt instruction. No retry, new query, engine run, test run or state advance was performed during this independent audit.

The current ten-file documentation closeout accurately leaves the read-only query audit as a separate, not-yet-integrated activity. It does not currently claim these zero-ratio observations as positive force or capture evidence. Any later documentation integration must preserve the limited verdict, the 3-attempt/4-snapshot deviation, and the absence of launch/capture evidence.
