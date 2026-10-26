# Independent pre-launch review — native T25 planner inspection

Date: 2026-10-26  
Workspace: `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`  
Review mode: static/read-only; the command and inspection script were not executed; no planner, query, stage or advance call was made

## Verdict

**BLOCK pending one narrow runtime-binding correction.** The inspection logic and bounded scope pass. The launch command currently invokes the Volta shim `C:/Program Files/Volta/node.exe`, and the config hashes that 5,665,280-byte shim as `7b648c48ba1473baa724d1cecf9df16e36ca12c768977d72745032349368953f`. Once invoked, however, `process.execPath` is `C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe`, SHA-256 `0d0f5e39f9f3d9587bc19f73eab3c2c9c4903fd02d6dbf9c853dd81b3d95fad4`. The script checks only `process.version === v22.23.2` and never hashes the actual executable. Therefore the prepared package does not yet freeze the Node binary that will execute the wrapper and inspection.

Bind the actual Node executable path/hash in `inspection.config.json`, invoke that exact executable for both wrapper and child in `RUN_COMMAND.txt`, and refresh `PRECHECK.json` plus `PREPARED_MANIFEST.json`. Do not create `attempt-001` or execute the planner while correcting the prepared package.

## Prepared-file verification

Before correction, all five prepared files match `PREPARED_MANIFEST.json` exactly:

| File | Bytes | SHA-256 |
|---|---:|---|
| `inspect_t25_planner.ts` | 11,285 | `387aa5c1b7f1912e1f50131ecd6495766dcf19ca1a7c13a5ef9e60c4dcaca16e` |
| `inspection.config.json` | 2,358 | `e12fce85110cd21b800060b5c38e7b62f0f48e7d843384eba05f9bb63f7b7c25` |
| `PRECHECK.json` | 1,913 | `dcf6fb3e6bf7f0f392a5b0c556d7e61f49de60b3583d357da5facd5cf5932781` |
| `RUN_COMMAND.txt` | 503 | `1c940cb8d509ea4c7f4359e4fa09cd43426be4708f92f775ed401f331c2b075d` |
| `STOPPING_CRITERIA.md` | 1,179 | `2a24ea86c8b246a27ba54cc55cb394655892433278c54a40211ad160496ab145` |

`attempt-001` does not exist.

All configured dependency/source/input hashes match live files: tsx CLI `8729ecfb90d9d568939e4190e6f1d3317c946583b7d37a776e0c23a21c021cf8`; reviewed `war_phases.ts` `8a085a37835541f4dc267e5c1f7f75a714bafc596e21d43b1467cb8ee62d7fcd`; operational loader `9156b352188b2ecec91ae3451da73cd6cdea1f51a3a802042bfecb15b34d4cd9`; adjacency `61860301594e9dc6d982a45d909176158a50ac9b67eea1b77fff0019ec3d0eb5`; alliance predicate `57835c7b4a0f61916f4568c9d0aa2c71af4c725b0d6948fa5cb9df765bb18849`; BFS utility `4abb513284b2e43998146452edd9a673611aad71c8079ba002454eea9802d2cc`; T25 save `d384bd9f7f24ebd044fd13bc3b123ad05f51aa074c0d44faedbe99075ac6adcc`; operational graph `f7f9aaeea51710fda376234d79945b51dfea31a16ebca948ffd8dc54f3ce0c46`.

The repository-root `node_modules` is a junction to `C:/Users/User/.codex/worktrees/april-1995-glamoc/A-War-Without-Victory/node_modules`, consistent with the prior focused checks. The exact tsx CLI file is hash-bound. The inspection's relative `../../../src/...` imports resolve from the script location into this October calibration C-worktree, so production source resolution is not redirected through that dependency junction.

## Static scope findings

- Exactly two executable `planDirectiveOperation(...)` call sites exist, at the first and fourth corps blocks. The config contains exactly `arbih_1st_corps` and `arbih_4th_corps`, and the only target is `op:trnovo:tosici`.
- Each call receives a separate `structuredClone(baseState)`. The script serializes each clone before and after and throws unless both JSON strings are byte-identical.
- It imports the current TypeScript production planner through tsx, plus production `loadOperationalEdges`, `buildOsidAdjacency`, `isFriendlyFaction` and `bfsDistance`. There is no dist import or alternate planner implementation.
- `isFriendlyFaction` and `bfsDistance` are used only inside `reportForPlan` after `plan.ok`, and only for returned-roster route-proxy reporting. The script does not duplicate eligibility or manufacture a planner result.
- It validates the frozen T25 war/RBiH identity, no game-over/end-state, the two corps keys, exact 712 graph endpoints against the 712 controller-key domain, operational OSID prefixes, RS target control, and the six exact target neighbors/controllers.
- It contains no engine advance, public query, directive injection/staging, operation/roster/state/command-authority mutation, subprocess, network call, fake call, capture logic or combat execution. Its only write is exclusive creation of the requested result JSON.
- The full planner return is retained. Additional state reporting is limited to planner-returned participants, their current assignment/location/supply/movement fields, and friendly BFS hop proxy. Claim limits expressly exclude capture, admission, combat, movement delivery, ETA and command authority.
- `RUN_COMMAND.txt` permits only `result.json`, uses an exclusive `attempt-001`, and sets 60,000 ms. `STOPPING_CRITERIA.md` requires child/wrapper 0, two results, all frozen/domain checks and two purity passes, with no automatic retry after any failure.

The launch can receive GO after the actual Node executable is bound and all refreshed prepared hashes are rechecked. No other correction is requested.
