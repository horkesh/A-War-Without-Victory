## 2026-11-26 — P3-EST: the planner's force-ratio estimate is the honest ratio against the battle's defence

Authority: the orchestrator's freeze-inventory rulings 2026-11-26 §8 (queue: P3-EST → R7 → P2.4 → R3 re-check → SE10), with the operations seat's spec (lane B s21). Pre-freeze, hash-moving, one change per measured pair.

**Change.**
- `estimateForceRatio` (`src/sim/combat/operation_preparation.ts`) no longer applies the confidence/competence error factor (0.3-1.0x). Confidence still picks the sentinel; competence and confidence still act through the required confidence, the required force ratio and the assessment score.
- Its defender side mirrors the battle at the primary objective through the new pure `estimateSectorDefensePower`: physical defenders at full power, the sector roster (same-corps seams included) reacting by friendly-route distance with the home bonus, the stance bonus divided by the operation's axes on that sector, the reactive cap and the minimum floor. It replaces the sum of every facing standing-OG brigade at full power.
- The LANE-2026-05-02-DRINA enclave-interior filter is removed with that sum: the friendly-route distance already gives a brigade outside an encirclement ring no reach. Srebrenica and Žepa still fall on schedule in both modes (their falls are event-owned).
- `tickPreparation` passes its adjacency. No new state field; `force_ratio_estimate` already exists.
- Canon: Systems Manual, operation preparation, "Force-ratio estimate". FORAWWV unchanged.
- Tests: `tests/p3_est_force_ratio.test.ts` (parity with the predictor's defence, fog removed; no confidence dependence; no reach through enemy ground). Three fixtures that pinned the old estimator now place their defenders where they defend, and the neutral-parity band moves from 1.4-2.2 to 1.0-1.4.

**Accepted divergences and effects (operations, scenario-tester and canon seats, all GO).**
- The estimate does not model the ethnic defence bonus, the local-militia floor or the predictor's intel fog.
- The axis count takes every live axis on the defending sector, while the battle counts axes executing that turn. Multi-axis estimates lean optimistic.
- More doomed launches: `consecutive_catastrophic` end rules 1→5 (hist) and 0→3 (emer).
- Against realised battle ratios the estimate reads about 2x high (median). Re-measure before player-facing odds use it.
- The hist Farz P-A pass is a bot target re-ranking side effect, not a Farz fix.

**Measured.** Hash-moving; also R7 (the 188w after the fix). The PR body lists the 188w pair against the C4 pins, the merge bar and the operation receipts.
