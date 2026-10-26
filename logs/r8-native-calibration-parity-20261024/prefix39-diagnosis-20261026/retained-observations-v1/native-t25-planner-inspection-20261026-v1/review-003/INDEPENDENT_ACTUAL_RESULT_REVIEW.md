# Independent actual-result review — native T25 pure planner inspection

Date: 2026-10-26  
Workspace: `C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory`  
Mode: retained-attempt inspection only; no planner, query, stage, advance, test, source edit or campaign was performed by this review

## Verdict

**GO for the bounded pure-planner observation.** The sole reviewed attempt used the pre-launch-approved package, called the exported production planner exactly twice on separate T25 clones, preserved each clone byte-for-byte, and returned two planner selections. It did not stage or inject either plan, advance the engine, call the public objection query, resolve an event, move a formation, consume command authority, execute combat, or capture territory.

The two `ok: true` returns establish only what the pure planner selects from this frozen T25 state. They are not proof of later admission, staging, movement delivery, ETA, launch, combat or capture.

## Execution and bindings

- Attempt directory: `attempt-001`; outer launcher: `outer-launch-001`.
- Receipt interval: `2026-10-26T01:09:00.937Z` to `2026-10-26T01:09:02.170Z`, about 1.233 seconds under the 60-second cap.
- Child exit 0; wrapper exit 0; outer exit 0; no signal, timeout, spawn error, cleanup or automatic retry.
- stdout and stderr are empty in the inner attempt. The outer stdout records the same attempt directory and child/wrapper 0/0.
- Artifact contract passes with exactly one allowed retained artifact, `result.json`, 24,288 bytes, SHA-256 `26941cc304639e16591146b06d59168013030e435a47a74e9d09a9452abe9541`.
- The entry snapshot, entry start and entry post hashes all equal the approved script SHA-256 `f08fc9b43021caba98b0d02ab09cef39b37af5e6cc9e5213c186814acfaffcea`; `matches_start_raw_sha256` is true.
- The outer start binds approved `PREPARED_MANIFEST.json` SHA-256 `16e778260007d8e00bd0c8e665eeef5f2ed0e75e55fc7bc5e714d75374e88d6c`, maximum two planner calls, zero advances, zero retries and the exact Node executable.
- All five prepared files still match that manifest. All nine runtime/source/input/graph files recorded in the result still match their captured byte counts and hashes, with zero mismatches.
- Runtime is Node `v22.23.2` at `C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe`. The reviewed production source remains `war_phases.ts` SHA-256 `8a085a37835541f4dc267e5c1f7f75a714bafc596e21d43b1467cb8ee62d7fcd`; the input remains native T25 SHA-256 `d384bd9f7f24ebd044fd13bc3b123ad05f51aa074c0d44faedbe99075ac6adcc`; the operational graph remains `f7f9aaeea51710fda376234d79945b51dfea31a16ebca948ffd8dc54f3ce0c46`.

## Purity and graph context

The result contains exactly two planner rows, in the approved order: `arbih_1st_corps` then `arbih_4th_corps`, both targeting only `op:trnovo:tosici`. Each fresh clone serializes to 3,174,202 bytes and SHA-256 `d49f0f547d121c031282ffd20511f12dbe5ff4b0b5323d4be49cf619def07886` both before and after its planner call. Purity therefore passes 2/2.

The production graph contains 2,047 edges and 712 unique endpoints. Its endpoint domain exactly equals the 712-key controller domain, with zero non-operational endpoints or controller keys. Tošići is RS-controlled. Its six checked neighbors are Golubići, Varoš, Vlaholje and Kijevo 2 under RS, plus Delijaš and Trnovo under RBiH.

## Planner selections

### RBiH 1st Corps

- Planner return: `ok: true`; corps brigade count 34.
- Staging OSID: `op:trnovo:trnovo`.
- Selected roster: 12, the existing maximum: `arbih_101st_mountain`, `arbih_102nd_motorized`, `arbih_10th_mountain`, `arbih_115th_mountain`, `arbih_124th_light_king_tvrtko`, `arbih_131st_light`, `arbih_143rd_light`, `arbih_146th_light`, `arbih_164th_mountain`, `arbih_165th_mountain`, `arbih_2nd_mountain`, `arbih_hvo_kralj_tvrtko`.
- Main brigade: `arbih_124th_light_king_tvrtko`.
- None is already at or adjacent to staging. All 12 have a friendly-route proxy, ranging from three to ten BFS hops. These hop counts are distance proxies only.

### RBiH 4th Corps

- Planner return: `ok: true`; corps brigade count 11.
- Staging OSID: `op:trnovo:trnovo`.
- Selected roster: four: `arbih_441st_vitezka_mountain`, `arbih_443rd_mountain`, `arbih_446th_light`, `arbih_450th_light`.
- Main brigade: `arbih_443rd_mountain`.
- The 443rd is already at staging, while its retained current movement order points to `op:konjic:glavaticevo_2`; the pure planner did not mutate or consume that order. The 450th is one hop away and adjacent to staging. The 446th is three hops away and the 441st seven; all four have a friendly-route proxy.

This T25 four-brigade result does not contradict the retained T16 two-usable-brigade finding: personnel and availability are state-specific, and the T25 roster includes the 446th at 539 personnel and the 450th at 820. No claim about their later movement ownership or successful concentration follows.

## Limits

The inspection did not run the ordinary public query path, directive injection/consumption, operation lifecycle, event consumer, turn pipeline or combat pipeline. No state was admitted into an operation and no command-authority charge occurred. Friendly BFS uses the existing route predicate for current-distance reporting; it is not an ETA, movement order, delivery forecast or success probability. The result supplies no basis for an engine change, calibration tuning, a new benchmark, or campaign qualification.
