# 807 targeted correction verification

Verdict: **APPROVED**

The sole blocking finding in `807-review.md` is closed. In `src/sim/formation_spawn.ts`, production evaluation again follows the opening-HEAD order: eligibility, personnel/cap, then `recruit_pool_faction` and `militiaPoolKey`. Default-OFF ineligible and at-cap paths therefore perform no new pool-selection access. With observation ON, early-skip pool association is evaluated lazily inside `ReinforcementAllocationObserver.recordRecipientBeforePoolSelection` and its failure is caught; post-cap paths reuse the single production key.

Fresh preserved verification `attempt-04-correction-verification` passed 2 files / 9 tests, child and wrapper exit 0, with the artifact contract passing. It includes the original 807 retained-red control and all eight final production-entry observer tests. The correction seal was snapshotted at SHA256 `3d6ab80e366633a3e0162ea23420d5bad54c350da9a851a32e2ca1ef8027bb41`.

Final source pins: observer `f98037e0ab7def9cc09695431a150263b9c35957da13084a158bbed5f104b039`; formation spawn `741ec5e56486eea9834b620589f1dcbae30a28f2bd83c34781c9f1d7d560f2aa`; observer test `682027bd41c1dc84817166847a1a0a5e388aa0170b96149e4a9b56a924c48a75`; reason-code source/test remain `b7467c47f97c5c349535b59aaeafa3dea0bc5d03314961c5ac17ef3a4283434a` / `44a60e84d8b22d1cb629364a84e10257d3454531678b987a75582ddaee9a756c`.

Protected C/D telemetry, thresholds, and October reference remain at the exact authorized bytes and hashes recorded in `807-review.md` and the frozen correction seal. Reused evidence remains 806 focused 96/96 and final typecheck exit 0. No campaign, replay, full suite, or `runTurn` was executed. Residual scope remains unchanged: this work does not recover n80 history, prove retained-703 campaign neutrality or historical cause, or authorize threshold/reference changes.
