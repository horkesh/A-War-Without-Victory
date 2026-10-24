# Targeted review: late-turn hydration correction and t39 launch gate

**Verdict: GO for the single bounded RBiH t39 observational run described by `T39_01_RUN_CONTRACT.json`.** This is a launch gate for measuring turn-39 checkpoint convergence only. Exact daily n94 replay remains failed from turn 1, and no t188 or all-faction acceptance follows from this verdict.

## Frozen correction reviewed

- `tools/ui/paradox_local_qa.cjs`: `2b5276097dccb125605221520846a2f65d34982cf8817a0ca4b9a27c4b313e82`
- `tests/paradox_local_qa_harness.test.ts`: `594fe06dca43f9354e43d99510bc0d5fcb07e4e05eba88d9c3cf3aa573a119f7`
- Implementer receipt: `T1_04_LATE_HYDRATION_CORRECTION_RECEIPT.json`, SHA-256 `2a684855a864409c7efb42b66ff39b7552840a89a2e27b6d4aaedc01bbb672f4`

The correction matches the production hydration boundary. `loadStateFromPath` recomputes sector ratings, and `computeSectorCombatRatings` emits a complete source-shaped record for every current sector. The validator therefore correctly permits a live pre-load rating map that is an empty or partial subset of the player's current owned sectors, while requiring the authoritative post-load projection to contain the exact complete owned-sector set. Existing records may change only finite numeric fields or the direct canonical `strength_class`; missing records may appear only as exact root object additions. The cache contract now accepts an empty or populated flat record of finite non-negative distances and requires authoritative hydration to produce exact `{}` through direct removals only.

This removes the documented turn-188 false rejection without opening arbitrary normalization. Changes outside the two named transient fields still fail, record schemas and ownership identities remain exact, and the independent canonical-byte and actual-versus-authoritative-projection equality gates remain in force.

## Independent checks

- Focused harness suite: **85/85 PASS**, exit 0.
- Nonincremental TypeScript check: **PASS**, exit 0.
- Harness syntax check: **PASS**, exit 0.
- Retained packaged t1-04 loader/projector/helper replay: **PASS**, canonical bytes exact, projection exact, and the observed 214 changes remain exactly 78 cache removals plus 136 rating changes.
- Hostile coverage rejects populated/missing/non-object authoritative cache, nonfinite/negative/nested pre-cache values, unrelated prefixes, invalid or foreign rating IDs, malformed records, arbitrary strings, invalid strength enums, and noncanonical nested strength changes.

## t39 scope and required reading

The command is one fresh-profile packaged run, Historical RBiH, visible normal Advance path, turns 1 through 39, with a 30-minute cap and no automatic retry. The prepared contract asks a valid new question after t1-04 established harness reliability: whether ordinary unchanged player play converges to the accepted n94 map and score at turn 39 despite the retained two-OSID turn-1 divergence.

Post-run acceptance requires all of the following:

- child and wrapper exit 0, no timeout, and a successful final result after teardown;
- exact provisional and settled archive inventories for turns 1 through 39, with immutable recorded hashes and matching turn identities;
- exact turn-39 n94 controller map/hash and score **707/712**;
- exactly the `n91:turn-39` and `n92:turn-39` protection rows, both with empty losses;
- January OSID, control-band, and event anchors passing;
- canonical save consistency, canonical byte equality across Save/Resume, and exact actual-versus-authoritative loaded projection;
- one `FINAL_SEAL` with `unresolved=0` for every turn 1 through 39, contiguous main-process evidence, no unexpected stderr, and empty console/page/unmatched-network failures after exact attribution;
- all reached input, immutable-reference, initial-state, binding, archive, cardinality, and evidence gates passing.

The outcome comparator's overall/daily result is expected to remain **FAIL** if any daily map differs. Its raw timeline must be retained. A matching turn-39 map is checkpoint convergence and must not be reported as daily replay parity. Farz, later checkpoints, t188, other factions, and the existing strict native audio failure remain respectively unreached or open.

The accepted-input binding remains the bounded representation decision already recorded: 25 packaged inputs byte-exact, six startup-only inputs embodied in the bound startup/bundle, and one GeoJSON raw CRLF/LF mismatch with identical Git blob and parsed JSON. This review does not convert that into a raw-32 exact claim.
