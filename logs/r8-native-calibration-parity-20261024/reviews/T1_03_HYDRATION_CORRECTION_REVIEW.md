# T1-03 hydration correction review

Date: 2026-10-24  
Verdict: **PASS; one replacement turn-1 reliability run is justified**

Reviewed frozen files:

- `tools/ui/paradox_local_qa.cjs` SHA-256 `187f333a62254d4cc1b0a9c630780403f72d665d5dbb9db8fdf2749f92e93ae2`
- `tests/paradox_local_qa_harness.test.ts` SHA-256 `97130e34263d3a7c05aac7ae717ad490c0764943b4d005f5bc13b58a3e5b88a0`

No blocking findings.

The earlier predicate incorrectly equated removal of all `home_distance_cache` leaves with removal of the field. Both retained native attempts and the packaged loader/projector prove the authoritative shape is a present, owned empty object. The correction now requires:

- before and after cache fields to be owned plain JSON objects;
- a nonempty before cache containing only finite numeric descendant leaves;
- an exactly empty after cache;
- a structural delta that removes every numeric descendant leaf and does not replace the root or a container;
- before and after sector-rating IDs exactly equal to the current player-owned sector IDs derived from state;
- identical per-sector rating record keys before and after;
- every rating delta to be finite number-to-number, except the exact direct `strength_class` leaf whose before and after values must belong to the source-owned `fortress|strong|adequate|thin|critical` enum.

All raw deltas and classified counts remain in the receipt. Any third prefix, cache shape drift, sector-set drift, record-schema drift, arbitrary string change, invalid strength enum, or nested/wrong `strength_class` path remains fatal. Canonical-save byte equality and exact expected-versus-loaded projection equality remain independent hard gates after actual Resume.

The retained over-narrow production replay failed on the legitimate `strength_class: thin -> adequate` recomputation. The corrected packaged production-path fixture passes independently for attempts 02 and 03: both preserve canonical SHA-256 `0b67f4bfb319a524251bc4941e17414fa122bb8f8a9058a9860d9d1f4228e64f`, reproduce authoritative projection SHA-256 `e8e2c770387f5c7f16af45131b38826b5c9bd9fe39a7a944cc4f104fe64c799b`, and accept exactly 214 changes comprising 78 cache removals and 136 rating changes. Independent review reran the focused suite at 85/85, exit 0, and the packaged production-path fixture for both attempts, exit 0. The frozen diff passes `git diff --check`.

One replacement turn-1 reliability run may now ask whether the corrected harness completes real Save -> Records -> Resume, records the exact hydration receipt, preserves canonical bytes and exact loaded projection, emits one settled turn archive, and closes runtime diagnostics. The known two-OSID turn-1 controller divergence and exact per-turn n94 equality remain **FAILED** and are not pass criteria. Turn 39 remains blocked until this short reliability gate passes and its evidence is reviewed.
