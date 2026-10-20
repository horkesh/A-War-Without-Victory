# October calibration preservation checkpoint — 2026-10-19

Source, tests, data, documentation and seven historical-source images are committed in **a9c92d82076700c77859376789979beb76d6d214** on `codex/october-calibration-continuation-20261003`. All 106 paths were pushed to origin and the remote SHA was verified equal. The tracked working tree was clean after that push. This is a preservation checkpoint, not baseline adoption: retained n80 is 703/712, calibration is NO-GO/unadopted, and all inherited unmet gates remain.

The documentation audit and independent targeted review pass. The explicit pre-commit noEmit check exits0; the configured `.husky/_` directory was absent, so the receipt does not pretend an automatic hook ran. The latest full suite timed out at35minutes:3/5native groups complete green,10152tests passed+30skipped,one parallel group incomplete andserial74unreached. No suite or campaign was run for this documentation checkpoint.

## What these files preserve

- `source-checkpoint-push.json`: source commit and exact remote-SHA verification.
- `documentation-review.*`: independent scope/targeted-correction review.
- `precommit-typecheck*.json`: actual numerical exits and command scope.
- `source-credential-check.json`: limited pattern check of the source checkpoint, no values.
- `raw-file-inventory.json`: current selected raw-evidence path/size snapshot, not a byte backup.
- `retained-historical-pins.json`: inherited 720 fingerprints at their explicitly recorded scopes. Some hashes were reused from older immutable inventories; this is not a complete fresh-hash claim.
- `raw-archive-feasibility.json` and `raw-audit-timeout.json`: measured scope/sample, low-confidence archive-size estimate and retained failed full-scan evidence.

## Raw-byte recovery status

Raw evidence remains at its original paths in the October worktree. It is intentionally ignored by Git and is **not included in the remote source checkpoint or this inventory**. The audit measured117221249498bytes across its selected scope. Known whole-file duplicates and a bounded gzip sample suggest approximately15.7GB compressed, with low confidence; chunk dedup remains unmeasured. A full fresh hash/credential scan timed out540seconds, so public raw publication is not cleared. Original bytes have not been deleted or redacted.

**Owner decision2026-10-20:** retain raw evidence locally with the pushed inventory. The storage-pending blocker is resolved; a remote raw-byte backup is intentionally not provided. No private archive, upload, LFS or fullrawcredential/hashscan is requested. Prior archive estimates remain historical planning data, not a built backup. See `raw-retention-decision-20261020.json`.

For the known17Sarajevo scratch rewrites,14nonempty opening states have exact old byte copies in `logs/claude-channel-20261004/324-pre-suite-generated-backup`; three opening files were empty per716pins. Current bytes are preserved in720closeout, and719independent review verifies this dependency. C97701891bytesSHA256`294077be226a772639eb03d89216b9e8d11d4e1d97e8b29abccfbf45440142df`; D1041bytesSHA256`ff120d4aab551ad703cac3b1dc260d71cab1464b9bf5a57dba76c86baf3346e3`. All31n80native files retain their measured hashes. Earlier unrecoverable losses remain failures; this checkpoint cannot recreate missing bytes.

The raw-retention choice is resolved. The retained-log diagnosis is complete; the authorized timing refresh and durable receipt implementation have passed focused checks and independent review. The separately authorized 736 full suite is now complete and failed; no additional suite or campaign is authorized. No merge, baseline adoption, acceptance-criterion change, new campaign or automatic retry is authorized by these records.

## Retained shard diagnosis — 2026-10-20

See [qualified findings](unfinished-shard-diagnosis.md), the independent shard review, offline model/review and fresh protection receipt. Workload skew is the strongest measured contributor, not a proven exact terminal cause. The offline model runs no tests and promises no wall-time bound. The original raw inputs and closed attempts remain local.


## Harness timing and file receipts — 2026-10-20

Timing weights refreshed from retained 718 measurements; durable per-file collection/execution receipts added to the balanced harness. Focused 38/38 and root noEmit exit 0; independent 733 targeted verification PASS_SCOPED_HARNESS. Retained n80 remains 703/712, with all 31 native files and protected source/reference/threshold/C/D hashes exact. No full suite or campaign; 718 remains TIMEOUT/incomplete and calibration remains NO-GO/unadopted.

The harness-correction result/inventory/closed receipt, initial independent review, targeted review and fresh protection receipt preserve the scoped evidence. Initial review findings and failed attempts are retained rather than erased. All 76 historical receipt files and 70 new receipt files remain local; the inventory records their preservation. These portable files are not a remote backup of raw logs. Current coverage is 1,438 unique files / 1,441 executions, with all prior tests retained. The refreshed baseline and synchronous per-file receipts are ready for future authorized use; no runtime improvement is yet measured.


## Refreshed full suite and results review — 2026-10-20

One refreshed full suite completed all five lanes in 29m51s, under the 35-minute cap, but FAILED two native assertions (exits 1/1/1). Tests: 14,726 passed, 33 skipped, 2 failed. Independent 737 review confirms full coverage and preservation. Retained n80 is 703/712; thresholds unchanged; NO-GO/unadopted. No retry or campaign.

The fullsuite-736 result, inventory, preservation, closed receipt and capture receipt, plus fullsuite-737 independent review, record exact scope and hashes. All raw stdout/stderr, lane logs and before/after telemetry/scratch archives stay local. Receipt inventory: 146 prior files exact plus 33 new retained. C is now 100,097,339 bytes with its complete opening prefix; D and all 31 n80 artifacts are exact. Earlier sections remain dated evidence. This complete run supersedes runtime uncertainty for this invocation only; it does not erase historical timeout/preservation failures or waive full-suite acceptance.

Portable fullsuite-737-review.md removes Markdown trailing spaces for the repository whitespace check; the original hash-inventoried review bytes remain untouched locally. Its JSON copy is byte-exact.
