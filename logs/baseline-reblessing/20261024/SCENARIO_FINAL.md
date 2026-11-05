# Independent scenario/calibration final adoption review

Date: 2026-10-24  
Seat: scenario-tester / calibration  
Scope: qualified adoption of the retained stage-2 default-profile baseline output and its eight-value manifest delta

## Verdict

**GO to adopt the retained eight-hash manifest change.** The original stage-2 wrapper did not pass, but its production child completed successfully and the separately retained read-only qualifier proves that the post-producer failure was confined to the wrapper's porcelain-status parsing. The qualifier establishes the missing postconditions against the unchanged retained output without rerunning the baseline producer.

This verdict accepts the current manifest delta as the regression fingerprint for the already accepted gameplay state. It does not make the original wrapper receipt green, authorize another update run, close R8 native/warroom/package work, convert the retained n93 full-suite receipt to raw green, or establish global calibration acceptance.

## Three distinct execution results

1. **Baseline producer: exit 0.** `update-01/update-execution.json` records exit 0, no signal, no timeout, and 1,968,714 ms remaining under the frozen cap. The retained stdout records the manifest update.
2. **Original update wrapper: child 1 / wrapper 126 — RED.** `update-01/receipt.json` remains the authoritative failed receipt. The wrapper failed after production because `git().trim()` removed the leading space from the valid porcelain row ` M data/derived/scenario/baselines/manifest.json`, then compared the malformed result as though it were raw porcelain. Its artifact contract therefore also records the expected missing `preservation-after.json` and `update-result.json`. This RED is retained and is not relabelled.
3. **Read-only retained-output qualifier: child 0 / wrapper 0.** `update-qualification-01/receipt.json` binds qualifier SHA-256 `1aed441a1d420b7504e1b4b5a8943c1889a37ae76862a527e552da5052084645`, completes in 11,825 ms, retains every allowed artifact, and reports a complete artifact contract. `QUALIFICATION.json` has `pass: true`, `read_only: true`, and no failure categories.

The qualifier binds all ten original `update-01` files by exact size and SHA-256, the original receipt and preflight inputs, producer exit 0, the RED outer exits, the two stage-1-matching Travnik warnings, and the exact post-producer status failure. It therefore evaluates the retained attempt rather than constructing a replacement run.

## Manifest and target qualification

- Git status contains exactly one raw porcelain row: ` M data/derived/scenario/baselines/manifest.json`.
- The manifest changes exactly eight values: the hashes for `activity_summary.json`, `control_delta.json`, `end_report.md`, `final_save.json`, `formation_delta.json`, `run_summary.json`, `watched_operations.json`, and `weekly_report.jsonl`.
- Each old hash occurs once, each accepted new hash occurs once, and replacing only those eight new hashes with their old values reconstructs the frozen pre-update manifest byte-for-byte at SHA-256 `67774c275f206633a931d1d1aa3990336d1dd0e0877ebaaf924feb6f75378888`.
- The fixed target contains exactly 15 files and no non-file entries. All eight actual default-profile artifact hashes equal the accepted Linux CI hashes, including actual `weekly_report.jsonl` SHA-256 `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`.
- The other seven baseline artifacts are byte-identical to the qualified n94 artifacts. The n94 source inventory remains exact at 40/40 files. Together with the stage-1 scenario review, this preserves the qualified Toljenak, Prisoje, Donji Vrbljani, native-producer, anchor, and retention findings; the default weekly artifact is proven directly against CI rather than through comparator normalization.
- Target provenance is clean frozen commit `a913286803a095b6dc3f57a44175081d6ae4b8eb`, with exactly 32 normalized inputs, zero mismatches, and matching recorded/recomputed digest `88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69`.

## Scenario and health gates

- The default-profile target scores exactly **707 / 707 / 706 / 706**. Both protected comparisons pass with zero failures and zero formerly-correct losses against n91 and n92.
- All nine enclave cells pass: seven hold; Srebrenica and Zepa fall on schedule. Eastern capture provenance is CLEAN, all four Farz objectives have operation-owned capture receipts, and the HRHB western-Bosnia cascade is 49/49.
- Consistency exits 0 and reports PASS. Its optional `military.unresolved_sector_brigades` field remains absent and is correctly reported as `NOT ESTABLISHED`, not inferred as zero.
- Health exits 0 and passes every hard gate: `zero_eligible_ops` 0, dead operations 0, ghost destroyed 0, stranded brigades 10 <= 16, consistency failures 0, matched OSIDs 706 >= 644, all checkpoint floors, and K/W ratio 3.74 within its advisory band.
- Checkpoints, consistency, health, protected-vs-n91, and protected-vs-n92 all exit 0 without timeout, signal, stderr, or recorded error.

## Preservation and residual boundaries

- Raw tracked source outside the manifest passes 10,153/10,153 checked files; the one excluded file is the manifest itself. There are zero preservation failures.
- The original preservation inventory passes 3,226/3,226 bindings with no exclusions. C telemetry preserves the exact 121,114,591-byte opening prefix and has 1,893,342 appended bytes across stage 1 and stage 2; D telemetry remains byte-identical at 1,041 bytes with append 0.
- No new Section 6 condition is present. The historical claim boundaries and distinct Historian GO remain unchanged.
- The retained n93 composed full-suite evidence is reused only at its recorded scope; its raw five failures remain visible. Native/package, warroom, save/load, global calibration, and pushed-CI gates remain open until their own evidence closes them.

## Evidence reviewed

- `tmp/baseline-rebless-20261024/update-01/receipt.json`
- `tmp/baseline-rebless-20261024/update-01/update-launch.json`
- `tmp/baseline-rebless-20261024/update-01/update-execution.json`
- retained `update-01` stdout, stderr, dependency, target-before, preservation-before, start, and entry snapshot
- `tmp/baseline-rebless-20261024/update-qualification-01/receipt.json`
- `tmp/baseline-rebless-20261024/update-qualification-01/QUALIFICATION.json`
- `tmp/baseline-rebless-20261024/update-qualification-01/DIAGNOSIS.md`
- all five retained qualifier reader executions and outputs
- the current raw manifest diff and porcelain status
- `tmp/baseline-rebless-20261024/review/SCENARIO_POSTRUN.md`

Scenario/calibration seat: **GO FOR RETAINED MANIFEST ADOPTION.** The normal pushed Baseline Pins and Event System CI checks remain required after the adoption commit.
