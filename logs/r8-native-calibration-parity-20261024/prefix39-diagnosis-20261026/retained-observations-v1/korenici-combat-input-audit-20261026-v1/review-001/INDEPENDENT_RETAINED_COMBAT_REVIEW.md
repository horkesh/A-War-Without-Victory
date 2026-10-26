# Independent retained Korenici combat review

**Verdict:** GO for the narrow conclusion that the retained evidence does not identify a new combat defect. BLOCK using this packet to claim that fractional-fatigue preservation is the isolated or proven cause of the Korenici outcome divergence.

This review was read-only apart from this review artifact. It made no engine import, simulation/API call, query, stage, advance, campaign run, source/test edit, or tuning change.

## Findings

1. **Capture, formation, movement, and battle chronology are supported by the retained records.** Korenici begins under RBiH control in all four compared cohorts. The n101 record has a combat transfer to RS at T34 by `rs_16th_krajina_motorized`; n102 has stalemates at T35–36 and a combat transfer at T37 by the same brigade. The comparison-only native-04/77a2 record has four attacks at T34–37 and a T37 combat transfer. Current P03/a306 records the same sole physical attacker and primary defender at T34–37, outcomes `costly_victory`, `repulsed`, `stalemate`, `repulsed`, and no transfer. Every retained Korenici battle names only RS 16th in `all_attacker_ids`.

2. **Current P03 records ordinary operation admission and movement.** RS 16th is a support brigade on the Donji Vakuf Sweep axis. Its retained movement history reaches Teslić at T19, Torlakovac at T29, Oborci at T32, and Donji Vakuf at T33 before the T34–37 attacks. The trace therefore rejects a missing admission or movement-path explanation. RS 22nd's ordinary movement is recorded, but it is never a physical Korenici attacker; the retained artificial reconciliation observation does not establish Korenici causation.

3. **The reconstructed formulas are accurate for their stated subset.** Current source uses `FATIGUE_MAX=30`, attack fatigue from 1.0 to 0.6, defense fatigue from 1.0 to 0.75, and outcome thresholds 2.0/1.5/1.0/0.7/0.5. The audit's T34 attacker values therefore reconstruct correctly: fatigue 11 gives 0.8533333 in current P03, while fatigue 0 gives 1.0 in native-04. Terrain composite 1.1379167, mean slope 0.3376667, and concentration values 1.0/1.1/1.1/1.2 follow the current formulas and frozen graph/data. The relevant combat and terrain sources/data are unchanged between 77a2 and a306.

4. **The outcome bands are valid inferences, not recovered ratios.** With deterministic `classifyOutcome`, native-04 T34 `victory` implies `[1.5,2.0)` and current T34 `costly_victory` implies `[1.0,1.5)`. The retained public rows contain neither exact attacker/defender powers nor the exact ratio or a decomposed power trace. The result limit mentioning an absent "random roll" is misleading: this combat path is explicitly deterministic and has no random roll. That phrase should be removed from any promoted summary.

5. **Fractional-fatigue preservation is a credible material hypothesis, but is not isolated here.** Commit a306 changes save migration from rejecting non-integer formation fatigue to preserving finite nonnegative fractional fatigue. The old native T34 state has attacker fatigue 0; current has 11, an approximately 14.7% attack-power reduction from this term alone. However, the audit extracts only a subset of effective-power inputs. The resolver also consumes corps stance, operation phase multiplier, commander/officer resolution, home-distance context, disruption, heavy-weapons effectiveness, morale, environmental and front-density terms, event multipliers, seasonal effects, exhaustion tempo, firepower deficit, and intel friction. The packet does not reconstruct or prove equality for every effective term. It also observes T34 defender-fatigue and 770th-personnel differences. Therefore `caused at least materially by that correction` is stronger than the retained proof.

6. **Later turns cannot isolate an independent cause.** After the different T34 outcomes, casualties, fatigue, readiness, personnel, cohesion, and equipment evolve along different trajectories. The matching per-turn axis-concentration values show that axis support does not explain the cohort difference, but they do not isolate every other combat term.

7. **n101 and n102 are outcome-only comparators for this question.** Their saved T39 histories support attacker identity, outcomes, and transfers. They lack immediately-prior T34–37 autosaves, so they do not supply comparable prebattle inputs. n101 also has a different defender set. Neither can establish the cause of the current P03 divergence.

## Supported wording

The defensible conclusion is: **the retained evidence shows valid admission, movement, and deterministic combat resolution, and it reveals no affirmative evidence of a new combat defect. Fractional-fatigue persistence is a plausible material contributor to the T34 boundary change, but the retained packet does not isolate the full effective-power calculation or prove that contribution as the cause.** The unchanged 707 acceptance criterion remains unmet; this diagnosis does not waive it or authorize tuning.

## Evidence bindings

- Retained-provenance result: 159,244 bytes, SHA-256 `3944d63c399a00be38a1a374d301bdd2dc861401d1542ce4ba2025749dbbe606`.
- Combat-input result: 146,433 bytes, SHA-256 `5ed380101c6231ee11da316ebd0917cebcdbacc4517b86a3ee0579b48b103077`.
- Current combat math: SHA-256 `35a5240f49cd1b659cce6264a844549765b4edf0117b8181a76535e6d5cbe48e`.
- Current operation helpers: SHA-256 `336ab45b05ad25d6ecbab6d92d05d01e78f130c2d99bfa67deecf6e2663ba376`.
- Current OSID resolver: SHA-256 `5b0d61371b7d0d828ed2b06ffd5d11354629ded288632f26cbfe9d22c1ce2f16`.
- Current save migration: SHA-256 `1afdc7dafe9f84d65338bac8ecf693f608ffea7460a9d9c14c5f6c55a21870b4`.

No determinism risk was introduced by this retained-file audit. The inspected combat path uses stable ordering and deterministic classification, consistent with Engine Invariants and `DETERMINISM_TEST_MATRIX.md`.
