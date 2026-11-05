# 795 independent selector-contract review

**Verdict: accept.** No open critical, suggestion, or nice-to-have finding remains in the test-only change at HEAD `154db7ce997a362933d04dc5f7710016a733b6c7`.

The initial review blocked the first green candidate because its RS fixture overwrote RS's friendly set with an empty set. That made the RS-controlled `REAR` OSID appear as an enemy and ranked it as the selected objective, so the test passed against an impossible context. The targeted correction at `tests/commander/probe_target_selection_filter.test.ts:179` derives each faction's friendly OSIDs from `state.political.political_controllers`. The selector test at `:471` now proves RS owns `APPROACH` and `REAR`, RBiH owns `TARGET`, and RS does not own `TARGET`. Its RS receipt therefore contains and ranks only `TARGET`, with controller `RBiH` and the real `decisive_victory` prediction. The focused reviewer verification `795-correction-verification-02` passed `16/16`, child/wrapper `0/0`, with artifact contract PASS and immutable entry script.

The final assertion remains strong. Topic off produces no receipt. Topic on asserts exact selector identity and the complete target-selection detail for RS, another corps, and turns 176, 177, 179, and 180. The detail checks the selected brigade/location, sector, enemy/direct/survivor/ranked IDs, every filter field, prediction fields, and brigade candidate fields. Existing selector-on/output and state neutrality assertions remain intact. This matches `src/sim/combat/commander/emit.ts:2306`, which constructs `probe_gate_receipt` and its initial `target_selection_detail` for every `commander_creation`-enabled call without the old faction/corps/turn narrowing.

The only changed tracked file is `tests/commander/probe_target_selection_filter.test.ts`, `33157` bytes, SHA-256 `ae8697168b590f3e6eb8f8af5994f0a892ba482e31be03b8ea8073dfd33c8457`, with diff `+102/-17`. Production emit remains SHA-256 `76351f818c3403fcc23bf5b51f30c467bd42886d68f1e6b754d9f90baa58746b`.

Evidence is complete and retains failures:

- `794-red-affected-03`: inherited baseline `15 passed / 1 failed`, child/wrapper `1/1`, artifact contract PASS.
- `794-correction-final-affected-11`: final affected file `16/16`, child/wrapper `0/0`.
- `794-green-observer-05`: reused unaffected observer evidence `60/60`, child/wrapper `0/0`.
- `794-correction-typecheck-10`: intermediate child/wrapper `2/2` because `Object.entries` received the optional `political_controllers` value directly. The correction added `?? {}`; `794-correction-final-typecheck-12` then passed child/wrapper `0/0`.
- `795-review-affected-01`: initial reviewer run `16/16`, child/wrapper `0/0`; semantic inspection still blocked that candidate.
- `795-correction-verification-02`: corrected reviewer run `16/16`, child/wrapper `0/0`; exact test/dependency snapshot SHA-256 `7668af28a5ba26692f6b761ef6a1878c56e494a251b7806d0cafa75026ac7c00`.

The corrected freeze at `794-corrected-final-freeze-13/manifest.json` reports all 12 protected sources matching reader-792 and all 22 supplied 786-792 evidence files unchanged. Final C telemetry is `102001043` bytes at SHA-256 `05abfdaee0483d99e62474de75dab5e58c6230993d3e01187078008b0cbbe899`; D telemetry is `1041` bytes at `ff120d4aab551ad703cac3b1dc260d71cab1464b9bf5a57dba76c86baf3346e3`; thresholds are `3775` bytes at `c62dca5a966479737d2999d95483f764da5f5a14d612aa3399ef7fefa115007d`. Retained n80 remains `703/712`, NO-GO, and unadopted. No production source, gameplay, data, schema, canon, threshold, telemetry, historical gate, or acceptance criterion changed. No campaign or full suite ran.

Next scope is the root's already-authorized documentation, preservation, and Git closeout. This review does not reopen reader qualification or justify a campaign.
