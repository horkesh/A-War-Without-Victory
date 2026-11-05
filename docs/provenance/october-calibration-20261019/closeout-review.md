# 724 targeted root-closeout verification

**Verdict: PASS_TARGETED_ROOT_CLOSEOUT_CONTENT.** `writes_closed: true`.

The new 726 closeout documentation and the 11-file provenance package are accurate at their stated scope. No blocking wording issue remains. The source checkpoint `a9c92d82076700c77859376789979beb76d6d214` is supported by the actual 725 receipt and a fresh remote lookup returning the same branch SHA. The checkpoint remains a preservation commit, not calibration acceptance or baseline adoption.

The package contains 11 files totaling 5,924,550 bytes. All nine JSON files parse. Seven copied receipts/inventories are byte-identical to their retained originals. `raw-file-inventory.json` has 26,532 rows whose sizes sum exactly to its declared 117,423,624,771 bytes. Its labels correctly say path/size snapshot only, no fresh full hash, and no remote raw backup.

The separate audit scope is also stated honestly: 117,221,249,498 bytes measured before later checkpoint artifacts, a low-confidence 15,669,303,863-byte compressed estimate, chunk dedup unmeasured, and a 540-second full scan that ended child/wrapper 124/124 with no usable partial result. Nothing claims that the raw 117.2 GB estate was uploaded or publicly cleared.

Cheap current pin verification passes: C is 97,701,891 bytes at SHA-256 `294077be226a772639eb03d89216b9e8d11d4e1d97e8b29abccfbf45440142df`; D is 1,041 bytes at SHA-256 `ff120d4aab551ad703cac3b1dc260d71cab1464b9bf5a57dba76c86baf3346e3`; all 31 n80 native artifacts match the retained 720 inventory. Plan-index check and `git diff --check` both exit 0.

Root still needs to run the planned publication-file secret scan, inspect the exact staged inventory, commit and push the follow-up without force, and verify the resulting remote branch SHA. That follow-up commit cannot contain its own final SHA; `a9c92d82076700c77859376789979beb76d6d214` remains the immutable primary source-checkpoint identity. The owner's private-storage versus local-raw-retention decision remains pending, and calibration remains paused.
