# Final integration review — eight-pin baseline adoption

Date: 2026-10-24  
Seat: independent Engine/systems and determinism integration review  
Scope: staged manifest, documentation, and portable-evidence consistency only

## Verdict

**GO for commit and push of the staged baseline-adoption integration.**

The staged production delta remains exactly the eight approved hash-value substitutions in `data/derived/scenario/baselines/manifest.json`. All other staged paths are synchronization documentation or portable evidence under `logs/baseline-reblessing/20261024/`. No gameplay, calibration, scenario, schema, threshold, comparator, or other production source change is present.

## Documentation truthfulness

- The documents consistently distinguish the successful producer (`exit 0`) from the retained original update wrapper (`child 1`, `wrapper 126`, RED) and the later read-only qualification (`child 0`, `wrapper 0`, PASS). They do not retroactively green the failed wrapper.
- The adoption is limited to the reproduced eight default-profile CI artifact hashes. The diagnostic weekly projection remains explanatory evidence and is not substituted for the actual default weekly artifact.
- The normal pushed Baseline Pins and Event System CI checks are explicitly required and are not claimed as already passing on the unpushed adoption commit.
- Global R6 acceptance, the six remaining October mismatches, native R8/warroom/Ajnie/faction gates, and the optional unresolved-sector field remain open or not established as applicable.
- `RESULT.json` records source `a913286803a095b6dc3f57a44175081d6ae4b8eb`, scores 707/707/706/706, producer invocation count one with exit 0, retained wrapper 1/126 RED, qualifier 0/0 PASS, eight changed manifest values, eight actual CI hash identities, 40 preserved n94 files, 3,226 preserved old bindings, 32 exact consumed inputs, and zero input mismatches.

## Portable evidence and focused checks

- `EVIDENCE_MANIFEST.json` contains 28 copied-evidence rows. The original 26 rows were checked against both staged blobs and retained local sources by exact bytes and SHA-256 with no mismatch. The two later focused-test rows were delta-checked the same way and both pass.
- Evidence paths use the frozen `text: unset` attribute, preserving staged bytes without line-ending normalization.
- The portable focused receipt records 97/97 tests passing with child/wrapper 0/0. After the `RESULT.json` metadata correction, the affected receipt-citation test passed 43/43 with child/wrapper 0/0.
- Final staged `git diff --check` passes. The generated plan index is synchronized with the roadmap, and the focused documentation/baseline contract suite covers its derivation and referenced receipts.

## Integration boundary

This GO covers the staged adoption commit and the required normal branch CI invocation after push. It does not authorize another campaign, baseline producer retry, native run, gameplay or calibration work, manual CI retry, or closure of any residual gate. The retained raw evidence and the original wrapper RED remain part of the record.
