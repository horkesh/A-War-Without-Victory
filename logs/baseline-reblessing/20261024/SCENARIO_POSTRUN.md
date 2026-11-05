# Independent scenario/calibration post-run review

Date: 2026-10-24  
Seat: scenario-tester / calibration  
Scope: stage-1 qualification of the current eight-pin baseline reblessing packet; no source, gameplay, scenario, threshold, comparator, native/package, or baseline-manifest change

## Verdict

**GO to the packet's single stage-2 baseline-manifest update.** The retained n94 stage-1 campaign satisfies every scenario/calibration condition assigned to this seat. This verdict authorizes only the already owner-authorized update command and its exact frozen gates. It does not pre-approve the resulting manifest, close R8 native/warroom/package gates, convert the retained n93 raw suite to green, or claim global calibration acceptance.

No protected-history or enclave result moved, so this run does not trigger a new Section 6 panel. The distinct Historian's conditional GO in `logs/baseline-reblessing/20261024/HISTORIAN.md` remains applicable at its stated scope.

## Run and provenance

- Retained attempt: `tmp/baseline-rebless-20261024/campaign-01`.
- Candidate: `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n94`.
- `receipt.json` records child exit 0, wrapper exit 0, no signal, no timeout, unchanged entry-script hash, and a complete artifact contract.
- The campaign created exactly one run directory. The packet and post-run summaries both report `pass: true`.
- Launch and run provenance bind clean commit `a913286803a095b6dc3f57a44175081d6ae4b8eb`, Node `v22.23.2`, no provenance override, the frozen diagnostic selectors, 188 weeks, and all 25 required save weeks.
- Candidate provenance contains exactly 32 normalized inputs. Recorded and recomputed digest are both `88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69`; there are zero input mismatches and `git_dirty` is false.
- Candidate inventory is exactly 40 files, with zero missing or extra files; every required save binds to its named turn.

## Calibration and historical scenario gates

- Scores are exactly **707 / 707 / 706 / 706** at jan1993 / apr1994 / apr1995 / oct1995. There are zero formerly-correct losses separately against n91 and n92 at every checkpoint.
- Shared-save control matches n92 exactly. Against n91, the only allowed difference from turn 156 through turn 188 is Toljenak RS to RBiH.
- Toljenak is RS through turn 134, changes to RBiH at turn 135 through one operation-owned Behar-I combat battle and matching control event, and remains RBiH through turn 188. The native producer check finds exactly one qualifying battle, event, diagnostic, and successful logged-capture AAR, with the approved 162nd/164th modeled attacker set.
- Prisoje and Donji Vrbljani are each HRHB at turn 188 through exactly one matching operation-owned combat battle and control event.
- All 16 protected anchors pass. Both protected gates against n91 and n92 report `pass: true` with no failures.
- The checkpoint reader confirms all nine enclave cells: seven hold, Srebrenica and Zepa fall on schedule, and the eastern capture-provenance check is CLEAN. All four authored Farz objectives are captured through operation-owned combat receipts.
- Run consistency reports PASS. Engine health reports all hard checks green: `zero_eligible_ops` 0, dead operations 0, ghost destroyed 0, stranded brigades 10 <= 16, consistency failures 0, matched OSIDs 706 >= 644, and K/W ratio 3.74 within the advisory band. Campaign stderr retains two transient Travnik assignment messages. The consistency reader explicitly says the optional `military.unresolved_sector_brigades` field is absent and therefore does not establish that one subcheck from this artifact; this is not converted into a favorable value. The authoritative consistency and health commands nevertheless both exit 0 under the frozen packet.
- The native producer and movement-coverage readers exit 0. All ten post-run reader executions exit 0 with no timeout, signal, or recorded failure.

## Artifact reproduction

Seven actual n94 artifact hashes equal the accepted Linux CI hashes:

| Artifact | SHA-256 |
|---|---|
| `activity_summary.json` | `a59b868cdde127a35b0a6012ff72848808f73a0a888e44732442c5bf42771ce5` |
| `control_delta.json` | `de5cb5b59eb0abb2aba9f45a75e774d5d44bf73ed3f785fb59f2ed02d3da840c` |
| `end_report.md` | `c559c5ef8e9fc2ee7ab79028c77e986c463462168f4e563f5f7dc3f6253dde7a` |
| `final_save.json` | `ff003195e966d163c27916cb0b9bb6293e9e8b0f2312684688318761cf6def34` |
| `formation_delta.json` | `ba416ce5b450f027a5cbbba941c9a68a286d8dbcb4f75041a1ef2279d4626c72` |
| `run_summary.json` | `f8429e29760314d256f822d2f4d5aa9c997d5cfc053035e1859dcac560df71d5` |
| `watched_operations.json` | `41d0d2a62eac1d57c3d0bd1f53d5a46df3857b0d3598bc971af7bfa96b9858b6` |

The actual diagnostic-profile `weekly_report.jsonl` is 33,185,387 bytes at SHA-256 `08b8e8cc74f7945ac4066edbce6cddfce74c40180c6fa013a6cb6c9997637669`. The separate non-mutating audit removes only the 188 `movement_phase_diagnostics` fields, 517 `attacker_brigades` fields, and 281 `defender_contributions` fields; its 188-row, 2,008,722-byte projection is exactly `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`, the accepted default-output CI hash. This audit does not normalize or alter the production comparator and does not substitute for stage 2's requirement that all eight actual default-profile artifacts match CI.

## Preservation and stage-2 conditions

- Source snapshots contain 10,154 files before and after with identical aggregate SHA-256 `226d3964955a2edc74bb5f6c9d1ac174afdc4e36a12bd148feea29011350cd5f`.
- Preservation passes 3,226/3,226 bindings with zero exclusions or failures. C telemetry preserves its exact opening prefix and appends 946,671 bytes; D telemetry remains byte-identical with append 0.
- The fixed `_baseline_tmp/apr1992_188w` target contains zero files both before and after stage 1.
- The checkout remains clean at the frozen commit after review. No campaign retry or additional full-suite run is needed; unchanged n93 composed full-suite evidence remains reused at its recorded scope and its raw five failures remain visible.

Stage 2 must still stop unless its own receipt proves all eight **actual** default-profile hashes equal the accepted CI values, the manifest changes exactly those eight hash values and no other tracked content, current 32-input provenance remains exact, the fixed target is empty before launch, health/protected gates remain green, and all 3,226 preservation bindings and telemetry prefixes remain valid. A stage-2 failure is not covered by this GO and is not automatically retryable.

## Evidence reviewed

- `tmp/baseline-rebless-20261024/campaign-01/receipt.json`
- `tmp/baseline-rebless-20261024/campaign-01/packet-summary.json`
- `tmp/baseline-rebless-20261024/campaign-01/campaign-launch.json`
- `tmp/baseline-rebless-20261024/campaign-01/campaign-execution.json`
- `tmp/baseline-rebless-20261024/campaign-01/postrun/summary.json`
- `tmp/baseline-rebless-20261024/campaign-01/postrun/evaluation.json`
- all retained post-run execution receipts and reader outputs under `tmp/baseline-rebless-20261024/campaign-01/postrun/`
- source, dependency, baseline-target, and preservation before/after inventories retained in the attempt directory

Scenario/calibration seat: **GO FOR THE SINGLE FROZEN STAGE-2 UPDATE, SUBJECT TO ITS OWN FULL GATES.**
