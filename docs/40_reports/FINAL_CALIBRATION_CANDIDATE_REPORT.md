# Final Calibration Candidate Report

Deterministic side-by-side of calibration-candidate configs across the 40, 104, and 188 week horizons.
Aggregated from run artifacts; no wall-clock, no RNG, no timestamps (stable by construction).

## Configs

| config | runnable | note |
| --- | --- | --- |
| default | yes | baseline apr1992_definitive, no experiment flags |
| intel_ambush | yes | AWWV_INTEL_AMBUSH_DEPTH=1 (wired: src/sim/combat/intel_ambush_depth.ts) |
| intl_only | no — not wired | flag not wired in src/ — not runnable |
| cohesion_only | no — not wired | flag not wired in src/ — not runnable |
| e_b1 | no — not wired | E-B1 coordination_coherence: state field exists, no run toggle wired — not runnable |

## Horizon 40w

| config | status | matched_osids | anchors | §6 (Sreb/Žepa fall · Gor/Bih/Sar hold) | K:W | dead_ops | ghost | stranded |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | runnable | 669 | 31/31 | Sreb held✗ / Žepa held✗ / Gor held✓ / Bih fell✗ / Sar held✓ | 3.93 | 0 | 0 | 2 |
| intel_ambush | no artifact | — | — | — | — | — | — | — |
| intl_only | flag not wired | — | — | — | — | — | — | — |
| cohesion_only | flag not wired | — | — | — | — | — | — | — |
| e_b1 | flag not wired | — | — | — | — | — | — | — |

## Horizon 104w

| config | status | matched_osids | anchors | §6 (Sreb/Žepa fall · Gor/Bih/Sar hold) | K:W | dead_ops | ghost | stranded |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | no artifact | — | — | — | — | — | — | — |
| intel_ambush | no artifact | — | — | — | — | — | — | — |
| intl_only | flag not wired | — | — | — | — | — | — | — |
| cohesion_only | flag not wired | — | — | — | — | — | — | — |
| e_b1 | flag not wired | — | — | — | — | — | — | — |

## Horizon 188w

| config | status | matched_osids | anchors | §6 (Sreb/Žepa fall · Gor/Bih/Sar hold) | K:W | dead_ops | ghost | stranded |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| default | runnable | 634 | 30/31 | Sreb fell✓ / Žepa fell✓ / Gor held✓ / Bih held✓ / Sar held✓ | 3.804 | 0 | 2 | 8 |
| intel_ambush | no artifact | — | — | — | — | — | — | — |
| intl_only | flag not wired | — | — | — | — | — | — | — |
| cohesion_only | flag not wired | — | — | — | — | — | — | — |
| e_b1 | flag not wired | — | — | — | — | — | — | — |

## Named historical windows

| window | horizon | config | assessment |
| --- | --- | --- | --- |
| April 1992 Drina takeovers | 40w | default | RS seizes Drina-valley municipalities (Zvornik/Višegrad/Foča/Bratunac) — matched 669, anchors 31/31 |
| 1993 RBiH-HRHB war | 104w | default | (no artifact) Muslim-Croat war: central Bosnia / Mostar front |
| Sarajevo siege continuity | 188w | default | Sarajevo core stays RBiH-held under the RS ring throughout — matched 634, anchors 30/31 |
| UN safe areas (Srebrenica/Žepa/Goražde/Bihać) | 188w | default | Srebrenica/Žepa fall (July 1995); Goražde/Bihać hold — matched 634, anchors 30/31 |
| 1995 western offensive | 188w | default | Operation Storm/Sana/Mistral — western VRS Krajina collapse — matched 634, anchors 30/31 |
| Dayton end state | 188w | default | Nov 1995 ~49/51 RS/Federation territorial split — matched 634, anchors 30/31 |

