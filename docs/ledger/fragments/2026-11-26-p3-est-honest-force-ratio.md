## 2026-11-26 — P3-EST: the planner's force-ratio estimate is the honest ratio against the battle's defence

Authority: the orchestrator's freeze-inventory rulings 2026-11-26 §8 (queue: P3-EST → R7 → P2.4 → R3 re-check → SE10), with the operations seat's spec (lane B s21). Pre-freeze, hash-moving, one change per measured pair.

**Change.**
- `estimateForceRatio` (`src/sim/combat/operation_preparation.ts`) no longer applies the confidence/competence error factor (0.3-1.0x). Confidence still picks the sentinel; competence and confidence still act through the required confidence, the required force ratio and the assessment score.
- Its defender side mirrors the battle at the primary objective through the new pure `estimateSectorDefensePower`: physical defenders at full power, the sector roster (same-corps seams included) reacting by friendly-route distance with the home bonus, the stance bonus divided by the operation's axes on that sector, the reactive cap and the minimum floor. It replaces the sum of every facing standing-OG brigade at full power.
- The LANE-2026-05-02-DRINA enclave-interior filter is removed with that sum: the friendly-route distance already gives a brigade outside an encirclement ring no reach. Srebrenica and Žepa still fall on schedule in both modes (their falls are event-owned).
- `tickPreparation` passes its adjacency. No new state field; `force_ratio_estimate` already exists.
- Canon: Systems Manual, operation preparation, "Force-ratio estimate". FORAWWV unchanged.
- Tests: `tests/p3_est_force_ratio.test.ts` (parity with the predictor's defence, fog removed; no confidence dependence; no reach through enemy ground). Three fixtures that pinned the old estimator now place their defenders where they defend, and the neutral-parity band moves from 1.4-2.2 to 1.0-1.4.

**§11 check (rulings 2026-11-26 §11; lane B s23).** The first pair read the estimate about 2x high against realised battle ratios (median; the old estimate, x1.15/x1.04, was closer only because its error factor cancelled its over-counted defence). A state-neutral instrumented hist twin traced it to the attack side: a per-brigade sum over every participant, without the battle's firepower deficit (ARBiH median x2.1), season, whole-force arithmetic, or the split across axes. The planning-phase axis divisor was not the cause (above 1 in 3 of 54 operations).
- The attack side now mirrors the battle: the primary objective's axis brigades through `computeAttackForcePower` (`src/sim/combat/attack_force_power.ts`), with the seasonal attack multiplier (slope 0), `getAttackerFirepowerDeficitMult` against the defending roster (now returned by `estimateSectorDefensePower`) and the own intel execution friction. The defence takes the collapse, joint-pressure and winter multipliers.
- `computeAttackForcePower` gains two optional inputs: a per-brigade context location (the planner's in-transit override) and an execution-modifier override. The estimate is taken while the operation plans, when the per-brigade read is 1, so it passes the operation's own clamped `execution_attack_power_mult`; the triggered Cerska-Kamenica op (2.5x) is not pre-planned and goes through the estimate. The resolver and predictor pass neither, so their arithmetic is unchanged. The intel execution friction is read at the lead attacker's context location (systems seat).
- Tests: predictor parity for the whole ratio, also in a winter month; axis scoping; the firepower deficit; the execution modifier and its cap; a pin that support brigades fight at full power.
- Result: median estimate/realised x0.85 hist / x0.80 emer (RBiH x0.98/x0.97), `consecutive_catastrophic` 2/2. The remaining gap is size only.

**Accepted divergences (operations, systems, scenario-tester and canon seats).**
- Not modelled: the ethnic defence bonus, the local-militia floor and enclave garrison (no population map in preparation), slope in the seasonal multiplier, the defender's OPSEC, and the predictor's intel fog.
- The axis count takes every live axis on the defending sector, while the battle counts axes executing that turn.
- Farz P-A is red in both modes with consult 9's known cause 1: the 3rd Corps' own "Operacija Slap" takes Donja Bočinja at t161. All four cells are RBiH at w188, and P-B passes. The orchestrator accepted it (rulings §12, amending §10's interim rule to either mode for a consult 9 known cause with a no-defect check); FZ-FARZ goes to Fable with this pair as evidence, and freeze condition 1 stays NOT MET.
- The remaining x0.8 under-estimate is a magnitude, recorded as a Part 6 row for the calibration pass.

**Measured.** Hash-moving; also R7 (the 188w after the fix). The PR body lists the 188w pair against the C4 pins, the merge bar and the operation receipts.
