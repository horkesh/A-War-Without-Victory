# Canon propagation panel: Systems Manual diff of #599 and Engine Invariants §14.5

**Date:** 2026-11-14
**Convened by:** the integration steward, on the orchestrator's instruction (no waiver).
**Question:** does every sentence PR #599 wrote into `docs/10_canon/Systems_Manual_v0_9_0.md` match the code that ships, and is Engine Invariants §14.5 stale?
**Seats (four independent subagents, read-only):** canon-compliance (lead seat and named integrator), systems-programmer, game-designer, determinism-auditor. Round 1 saw only the diff and `src/`; round 2 saw the corrected text.

## Round 1

All four seats returned conditions or NO-GO. The disputes overlapped almost completely, which is why the corrections below are one set.

| # | Defect in the #599 text | Found by |
|---|---|---|
| 1 | The secondary-operation cooldown (`SECONDARY_OP_COOLDOWN_TURNS` 5 / 3) was described as live. Nothing reads the constants; `operationsShareTheater` has no callers. | all four |
| 2 | The sector-wide counter-attack was written as canon. Engine Invariants §6.3 allows only "counter-attacks to retake a just-lost position". The code path is wider, runs only for a defensive-stance corps, skips recently repulsed targets, and shares its per-sector cap with the brigade's own counter-attack. | lead, designer, systems |
| 3 | Retreat chain item 3 ("nearest friendly OSID by BFS, up to 8 hops") was wrong: the BFS frontier never advances, so only the lost cell's first friendly neighbour (in sorted adjacency order) is examined. Items 1, 2, 4, 5 apply only while the lost cell is still in the supplied friendly set. The null result disperses the brigade (inactive, `destruction_turn`), against §6.2 and §14.5. | all four |
| 4 | "Planning never exceeds 4" is true only for generated offensives; authored pre-planned operations run up to about 10 and catalog operations up to 5. | lead, systems |
| 5 | The exhaustion-30 gate applies in the commander planner, the corridor-breach planner and the Central Bosnia catalog, not in sector-offensive creation, pre-planned or triggered operations. | lead, systems, designer |
| 6 | `evaluateLaunchFeasibility` runs for sector-offensive and triggered-operation creation only. | lead, systems, designer |
| 7 | Launch criteria: enemy OSIDs minimum is 1 (not 2); supply readiness is recorded, not a gate; the embargo gate and feasibility check were missing. | systems |
| 8 | Supply: the unchanged bullets (strained 0.7/0.8, critical 0.4/0.5) contradicted the new 0.75 sentence. Code: strained 0.75; critical 0.45 attack, 0.5 defend; no-state fallback 1.0 if supplied within 2 turns, else 0.4 / 0.5. | designer, systems, lead |
| 9 | Casualty scaling: attacker multiplier is ratio^-0.33, defender ratio^0.33, ratio pre-clamped to [0.1, 10]; "renormalised to the same total" was wrong (each share is rounded independently). | lead, systems, determinism |
| 10 | Spatial snapshots: `reconcile-final-sector-truth` recomputes and replaces the post-combat snapshot; "immutable" overstated a shallow freeze. | determinism, designer, systems |
| 11 | Phase 1.5 and main/support selection were silent about tie-breaks (largest deficit, then smaller sector id; highest basePower, then formation id). | determinism |
| 12 | Engine Invariants §14.5 "706th debt" note is stale: the largest-component fallback is gone. | all four |

## Corrections made

`Systems_Manual_v0_9_0.md` rewritten for items 1-11 (each caveat above is now in the text). `Engine_Invariants_v0_9_0.md` §14.5 note replaced with the verified order, the removed fallback, and the open debt. `CALIBRATION_MASTER.md` deferred-debt paragraph updated to match. `docs/CANON_PROPAGATION_NEEDED.md` records the final state.

## Round 2 verdicts (on the corrected text)

| Seat | Verdict | Remaining |
|---|---|---|
| determinism-auditor | **GO** | Optional: explicit id tie-break in `rankDefendersByPower` (code change, out of scope). |
| systems-programmer | GO-WITH-CONDITIONS, applied | Embargo gate wording; primary-defender tie wording; retreat reachability clause. All applied. |
| game-designer | GO-WITH-CONDITIONS, applied | Stale sentence and missing open-debt entry in `CALIBRATION_MASTER.md`. Both applied. |
| canon-compliance (lead, integrator) | GO-WITH-CONDITIONS | (a) embargo parenthetical: applied. (b) Reconcile Engine Invariants §6.3 with the sector-wide counter-attack: **not done**, see below. |

**Integrator's reading.** Every condition that concerns the propagated text has been applied. The one that does not, lead condition (b), concerns a gap between code and an Invariant that existed before this PR: the Manual now labels the extension "not canon, pending reconciliation with §6.3", gives its gates as tuning values, and says it does not establish whether a presidential stance hold suppresses it. The gate is closed on that reading. The reconciliation stays on the open list below; if the orchestrator reads lead condition (b) as blocking, reopen `REPO-CANON-PROPAGATION`.

## Open items (recorded, not resolved here)

1. Engine Invariants §6.3 versus the sector-wide counter-attack: amend §6.3 under the Invariants gate, or remove the extension. Whether a presidential OG or corps stance hold suppresses it is not established.
2. Code defects: the `findEmergencyRetreatOsid` BFS frontier (`EMERGENCY_RETREAT_BFS_MAX_HOPS` is inert); the cut-off outcome disperses brigades against §6.2; dead `SECONDARY_OP_COOLDOWN_TURNS`, `operationsShareTheater` and `PROBE_EXHAUSTION_MARGIN`; the exhaustion gate missing from sector-offensive, pre-planned and triggered creation; `rankDefendersByPower` has no explicit id tie-break. Each is calibration-moving or needs its own lane.
3. §14.5a (breakthrough retreat) was not found in `src/sim` by two seats; unverified.
4. `FORMULA_SPEC` / Attack Resolution Formula Spec still carry the old strained 0.7 / 0.8 and critical 0.4 multipliers.
5. Still stale, outside this panel: Systems Manual §6.5 "Pioneer attacks" paragraph (no live code), `context.md` retreat chain, `PLAYER_TURN_GUIDE.md` step line numbers, and code comments (`bot_corps_directives.ts:205-209`, `attack_force_power.ts:124`, `bot_brigade_targeting.ts:31`, an enemy-OSID comment in `sector_offensive.ts` saying 2).
