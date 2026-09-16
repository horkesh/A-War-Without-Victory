# Independent evidence review — clean post-A run

**Verdict: the January 1993 result is admissible and meets the authorized January acceptance contract. No new in-scope blocker was found.** This is not a final package-completion verdict: the single full suite, final documentation/viewer work, and preservation checks reported by the root remain outstanding.

## Provenance and artifact integrity

- `post_a-launch.json` binds the run to clean commit `ac3e5e1524558d2dc4e4fc40924306fc2873735a`, branch `codex/january-1993-operations-20260914`, Node `v22.23.2`, the canonical `apr1992_definitive_188w` path, 188 weeks, headless execution, no provenance override, no baseline update, and no collapse. Pre/post HEAD and status agree; source patch hashes are empty and no untracked production files are reported.
- `run_meta.json` repeats the same clean commit and execution contract. Its 31 consumed-input paths and hashes exactly equal the retained `8db3055962143af8f272ef7cf5d95414e6c5a601` reference; both use digest `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`. The January painted reference is `abb4f9d20472016d21be4130a1e555b7c7f82094612e7e1777d9916e10a0ba24`.
- Independently recomputing the recorded size and SHA-256 for all 15 inventory artifacts produced 15/15 matches. The audit reports 188 turn seals, one final seal, and zero unresolved seals.

## January acceptance and capture truth

- The checker passes at exactly `700/712`, meeting the required floor of 700, with no January regressions.
- All four repaired primary cells are RS-controlled through operation-owned combat by week 39: Orašac t29, Donji Vakuf town t35, Korenići t36, and Prusac t39.
- All four retained Jajce-area cells also pass through operation-owned combat: Baljvine t28, Jezero t32, Donji Korićani t34, and Lupnica t36.
- For all eight receipts, an independent lookup in `weekly_report.jsonl` found the exact battle ID and target, an RS winning attacker, and the same non-null operation ID recorded by the checker. The audit reports zero passive transfers.

## Guard preservation

- Engine health passes with zero eligible-operation, invalid-operation, ghost-destroyed, and consistency failures; the 188-week thresholds pass.
- Run consistency passes: no assignment-sync failure, false physical owner, disconnected sector, missed legal donor, actionable empty front, or actionable wide gap.
- The canonical checkpoint output preserves all nine enclave guards. The truth result passes all 31 anchors, including the Brčko January control band, and reports 188 turn seals plus the final seal with zero unresolved warnings.

## Nonblocking retained flags

- The raw checkpoint validator exits 1 for later-horizon results: the western-Bosnia cascade is 30 against base 40 (below its 38 floor), and the Farz discriminator records the t168 capture by ARBiH 3rd Corps rather than 2nd Corps. These are later calibration offsets covered by the owner's explicit January-only waiver. They do not negate the January result and do not warrant another Farz investigation in this scope. They must remain visible; this evidence does not support a general checkpoint-clean or main-merge claim.
- The truth command exits 1 solely because `Prozor–Rama Line Counterattack` emits `op_empty` at t41. The retained `8db3055962143af8f272ef7cf5d95414e6c5a601` reference contains the same operation, error, and turn. It is therefore an inherited core warning rather than a regression introduced by this repair. Core preservation is established relative to the approved baseline; global absence of core warnings is not claimed.

## Evidence hashes

- `post_a-launch.json`: `52E63573A7D6476F4CF953AB880532F467072F13B1CF4074E00F9E457515247E`
- `post_a-january.json`: `F3CB229AB44CFF83F78F410FB65D43532BE687DDF7AE49309EA793BAE3667BB1`
- `post_a-audit.json`: `3ADA7E744CD0A4A5C4DE9FAEEB44977CE56DC624C71B2B967858D9E8AD85C8FC`
- `post_a-validation.json`: `DA062018DCFB66A1D2EE99C7A8CC7DEA1AC6781618F1252A6987A5EE8C18626F`
- `post_a-truth.json`: `8AEE64CC9F2B8EFA0B7B3BD963182DF530557FDEE4C6F8BAF6F6FC5DB8FF7FE4`

No source, test, scenario, typecheck, or full-suite command was run for this evidence review.
