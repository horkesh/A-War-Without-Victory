# 819 independent Pale-run review

Verdict: **APPROVE_BOUNDED_OBSERVER_ONLY_DIAGNOSTIC**. No critical, suggestion, or nice-to-have findings block preservation of the frozen 818 packet.

The packet satisfies the fixed 817 execution contract. It records exactly one authorized 188-week invocation and zero retries, completed before the 17:47:18Z deadline. Preflight, runner, and postrun child/wrapper exits are all 0; each preserved-wrapper artifact contract passes; and each entry script matches its pre-execution snapshot after execution. The actual stdout-bound run is `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n84`, compared with n83.

The frozen result is 36,348 bytes, SHA-256 `66c081b063566d605d4873f5c4031c3dca6bce26e6957f8bc2ed4c7900a5ce96`. The closed-stream raw inventory is 20,722 bytes, SHA-256 `acc4d460b7717f7140e8e1ed67fef4d8e956498eddf2c2fb682a6a276fd8e3c5`. I independently recomputed all 101 listed files after their streams had closed: 0 missing, 0 byte-count mismatches, and 0 SHA-256 mismatches. The inventory does not hash this review's live output.

Gameplay identity passes at its exact scope: 31 native files on each side, 30/30 gameplay files byte-equal after excluding only `run_meta.json`, and 10/10 selected comparator pairs equal. The raw `run_meta.json` difference is retained and preclassified as metadata. Both sides have the same normalized, ordered 32-input provenance digest, `7986f05230e1d526e1794673e796dcb77730501d4958e435970c4ec806cc8039`. The final strict allocation reader pin remains `bf1e94e52c2efb447041161fa6e14de2d078f2177d7392209344acc746c71c86`; source, test, threshold, and reference pins passed preflight unchanged.

The allocation reader validated schema-2 Pale `formation_spawn.reinforce` regular-stage blocks for observed turns 1 through 188, one invocation per observed turn, then selected turns 21 and 22 exactly once each. That is source-qualified coverage of the observed blocks, not an unqualified claim that every possible allocation path across 188 turns was observed. Personnel and commander readers also exited 0; the commander reader found 0 violations.

The six selected raw records match their claimed byte offsets, line numbers, and parsed records. Turn 21 opened Pale at available 0 / committed 1600; `rs_4th_sarajevo_light_infantry` was the sole attempted recipient, skipped for `pool_empty`, and the stage closed 0 / 1600. Turn 22 opened at raw available 111 / committed 1600. There was no earlier Pale regular-stage recipient. Reserve was 0, so effective available was 111; need and rate were 400; transfer was 111; personnel moved 1405 to 1516; the pool closed 0 / 1711. Every arithmetic relation balances.

The captured allocation is lawful and establishes that nothing earlier in that Pale regular-stage ordering consumed the 111. It does not identify the upstream writer that changed the pool from turn-21 close 0 to turn-22 open 111. That cause remains **UNMEASURED**.

Telemetry preservation also passes. C grew from 102,947,714 bytes (`edbbff425eebccf8cb43a53fae7b9865d9742d2c01cc68b413366a47d40550a9`) to 103,894,385 bytes (`00d6d7e65832a45e4b8ddc34e077c228b9496ca8f1068a6b9633571b4bae5557`) with an exact opening prefix and 946,671 appended bytes. D remained 1,041 bytes with SHA-256 `ff120d4aab551ad703cac3b1dc260d71cab1464b9bf5a57dba76c86baf3346e3`, exact prefix, and zero append. The two retained `hrhb_travnik_brigade` stderr notices are nonfatal and do not invalidate identity, provenance, telemetry, or reader gates.

This review reuses 812/811 readiness and reader evidence through the passing 818 preflight, and 815 only at its corrected-checker/source-binding scope. It reuses existing broad suite, threshold, reference, and baseline evidence because the observer run proves byte-identical gameplay and unchanged pins. No campaign, suite, build, replay, or unchanged reader was rerun.

n83/n84 remains the rejected 689 trajectory. Retained n80 remains 703/712, NO-GO, and unadopted. No gameplay fix, threshold change, adoption, acceptance waiver, n80 counterfactual, or causal claim is supported.

The smallest next action is retained-evidence and source tracing of Pale pool replenishment between turn 21 close and turn 22 open. A new campaign is neither needed nor authorized by this result.
