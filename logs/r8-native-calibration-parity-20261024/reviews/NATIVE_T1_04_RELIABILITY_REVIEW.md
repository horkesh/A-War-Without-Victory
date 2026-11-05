# Native RBiH turn-1 attempt 04 reliability review

Date: 2026-10-24  
Verdict: **RELIABILITY PASS; exact daily controller parity remains FAILED**

The bounded packaged run exited child/wrapper 0/0 without timeout in 167 seconds. It used the normal visible New War path, selected the checked Historical radio, started RBiH with autonomy 2, `headless=false`, and `harness-seed`, and advanced turn 1 through the normal UI/IPC route.

The evidence path completed the previously unreached real route: Pause -> Save Game -> Main Menu -> opening splash -> Field Records -> Resume quicksave. The before/after canonical autosave SHA-256 is exactly `0b67f4bfb319a524251bc4941e17414fa122bb8f8a9058a9860d9d1f4228e64f`. The loaded player projection exactly equals the independently hydrated expected projection at SHA-256 `e8e2c770387f5c7f16af45131b38826b5c9bd9fe39a7a944cc4f104fe64c799b`. The raw hydration receipt contains exactly 214 allowed changes: 78 home-distance-cache removals and 136 sector-rating recomputations.

The provisional and settled turn-1 archives are distinct immutable evidence records and both bind the observed canonical save bytes. Console, page, and unmatched network failures are zero. Two hillshade aborts are matched one-for-one to exact renderer AbortSignal identities and remain retained in the expected-attribution and raw signal arrays. The complete main-process JSONL has a contiguous six-record sequence, exactly one turn-1 `FINAL_SEAL` with `unresolved=0`, and no unexpected stderr; the two stderr rows are the recognized debugger teardown pair. The final result log, rather than the progress snapshot, owns those post-teardown expected/unexpected stderr classifications.

This pass is limited to harness reliability. Independent replay confirms the turn-1 result still differs from accepted n94 at exactly two OSIDs: `op:brcko:bukvik_gornji_2` and `op:srebrenica:obadi`, both accepted RBiH but native RS. Native map hash is `91ef4c69f97512623c27ac9d09e12280630d35f1a999d186d710b85e5925223d`; accepted map hash is `600b55d559a23152c6fe94b1f81558a2fe600c2ade709106b4d7aa92ee7dbb14`. Native has 12 turn-1 control events and n94 has 14. Exact per-turn equality therefore remains **FAILED**.

Turn 39 remains blocked until the separate empty/partial transient-rating false-rejection correction is implemented and independently verified offline. No new native run is authorized by this review alone.

