# Targeted portable-observations verification

**Verdict: GO.** `MANIFEST.v4.json` closes the previously reported portable-proof omission for the T25 planner, Korenici retained provenance/combat audit, and parked T25 preparation.

This verification reused all unaffected source, test, recovery, query, and prior-manifest findings. It performed no engine/API call, test, query, planner invocation, stage, advance, or campaign and made no mutation inside the bound proof tree.

## Verified bindings

- `retained-observations-v1/MANIFEST.json` contains 45 source/copy pairs. All 90 source and copy files exist and match their recorded byte counts and SHA-256 values; every pair has identical bytes and SHA-256.
- `MANIFEST.v4.json` has 208 unique inventory paths. All 208 exist and match recorded bytes and SHA-256 with zero mismatches.
- All 161 entries from `MANIFEST.v3.json` recur unchanged in v4. V4 adds exactly 47 entries: the previously omitted v3 manifest itself, the retained-observations manifest, and its 45 copied files.
- V4 binds the unchanged preceding v3 manifest at 42,947 bytes / `a025f97de4a70e8813e71f076d99b2ce79e6a0a48bb6549e40fad4f5fcfb7b60` and the observations manifest at 26,902 bytes / `061c64beb9cdb45c0008405601299602cee19d81696489b5645ace9977ce3a6e`.
- The scoped `.gitattributes` applies `-text -diff` to the copied proof files, preserving raw bytes at the Git boundary.

## Scope and document review

- The copied T25 planner packet retains the two pure selections, runtime correction reviews, and actual-result review. Its explicit limit remains selection only, with no admission, delivery, or capture claim.
- The copied Korenici provenance packet supports ordinary RS 16th movement and recorded attacks/captures at its original scope.
- `REPORT.v2.md` and `MACHINE_AMENDMENT.v1.json` correctly supersede only the overcausal summary. They identify fatigue 11/0 as preturn T33 retained values rather than phase-exact T34 combat inputs; state that complete effective-power equality and exact powers/ratio are unrecorded; remove the nonexistent random-roll limitation; and reject isolated fatigue causality, tuning, a 707 waiver, or mismatch waiver. Original report/result/receipts remain preserved.
- The parked T25 request packet is explicitly preparation only: no attempt or advancement is claimed.
- Six current documentation surfaces point to `MANIFEST.v4.json`: Code Canon, Determinism Matrix, Repo Map, Calibration Master, the active Electron validation plan, and Master Roadmap. Their query/planner/Korenici claims now have portable supporting copies in v4. The historical append-only ledger entry continues to point to v3, accurately preserving its then-current scope.
- The promised final append-only ledger entry pointing to v4 and disclosing that v3 lacked these observation copies is still pending final closeout; that future administrative entry is not evidence present in this review.

`git diff --check` exits 0 apart from the existing CRLF conversion warnings for the two ledger files. The focused link scan found no new v4/proof link failure; three pre-existing `F:` absolute links in `CALIBRATION_MASTER.md` remain unrelated to this correction.

This GO is limited to portable evidence closure. It does not qualify calibration, a 188-week campaign, the full suite, package/native behavior, the parked T25 fork, or any subsequent combat-fatigue source change.
