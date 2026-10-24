# Native RBiH turn-1 attempt 02 failure review

Date: 2026-10-24  
Verdict: **FAILED; core controller/timeline parity already diverged at turn 1**

The packaged flow selected the visible Historical option and created a normal RBiH campaign. Native t0 metadata is `decision_mode=historical`, `autonomy_level=2`, `headless_scenario_auto_control=false`, `player_faction=RBiH`, and `seed=harness-seed`. The native t0 controller map is exactly n94's accepted initial map: 712 OSIDs, stable hash `14f8e393d2614afd8af07292b8e09917f8246ad5f69f97dff0163fa9b8fe0673`.

The real UI/IPC Advance completed turn 1, but the result does not equal the accepted timeline. Replaying n94's persisted ordered control events gives t1 map hash `600b55d559a23152c6fe94b1f81558a2fe600c2ade709106b4d7aa92ee7dbb14`; the native canonical `turn-001.json` map hash is `91ef4c69f97512623c27ac9d09e12280630d35f1a999d186d710b85e5925223d`. Exactly two OSIDs differ:

- `op:brcko:bukvik_gornji_2`: n94 RBiH; native RS.
- `op:srebrenica:obadi`: n94 RBiH; native RS.

N94 has 14 ordered t1 control events while native has 12. The native sequence otherwise matches; the two absent events are the paramilitary RS-to-RBiH captures of those OSIDs. This is a controller/timeline acceptance failure and stops the staged campaign until the normal-player decision path is understood. It may reflect the intentional player-authorization rule for RBiH paramilitary requests; it cannot be normalized away, injected, or described as parity.

The run also failed the save/load pre-navigation hydration guard. Authoritative canonical load preserved the save bytes, but the live and loaded player-visible projections differed at 214 leaves: 78 removed `military.home_distance_cache` entries plus 136 `military.sector_combat_ratings` leaf changes. Canon classifies both fields as disposable transient military caches, while the harness currently allows only sector-rating changes. A harness-only guard correction may therefore be justified, but it cannot cure the controller divergence.

Runtime diagnostics expose two unresolved non-main-frame `GET hillshade.pmtiles` range requests with `net::ERR_ABORTED`, both before teardown and outside a recorded map-navigation window. Matching tile-observer identities exist, but the failures remain a new unclassified runtime category until timing/ownership is proven and a focused classifier test passes. Console and page errors are zero; main-process stderr contains only the expected debugger teardown lines.

The attempt ended child/wrapper 1/1 without timeout after 35 captured events at `save-load-post-save`. It retained initial, turn-1, final, and manual-quicksave canonical archives. No turn-39 or longer launch is justified.
