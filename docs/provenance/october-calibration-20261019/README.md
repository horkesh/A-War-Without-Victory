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

A complete independent backup still requires the owner's storage disposition. A private/local chunked archive could use4MiB SHA256-addressed gzip objects, an ordered per-path chunk manifest and a recovery command that verifies each chunk and full-file hash before writing into an empty destination. Estimated build/verification20–40minutes and at least80GB scratch space; no such archive has been built or uploaded. Choosing local raw retention with this pushed inventory also requires the owner to explicitly accept that remote raw-byte recovery is not provided.

For the known17Sarajevo scratch rewrites,14nonempty opening states have exact old byte copies in `logs/claude-channel-20261004/324-pre-suite-generated-backup`; three opening files were empty per716pins. Current bytes are preserved in720closeout, and719independent review verifies this dependency. C97701891bytesSHA256`294077be226a772639eb03d89216b9e8d11d4e1d97e8b29abccfbf45440142df`; D1041bytesSHA256`ff120d4aab551ad703cac3b1dc260d71cab1464b9bf5a57dba76c86baf3346e3`. All31n80native files retain their measured hashes. Earlier unrecoverable losses remain failures; this checkpoint cannot recreate missing bytes.

Calibration remains paused pending the requested preservation checkpoint's raw-storage decision. No merge, baseline adoption, acceptance-criterion change, new campaign or automatic retry is authorized by these records.