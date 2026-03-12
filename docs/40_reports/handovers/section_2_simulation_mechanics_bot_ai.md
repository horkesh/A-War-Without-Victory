## 2. Simulation Mechanics & Bot AI

**Grade:** **B+** — Combat is spec-backed, deterministic, and recently corrected (posture bug); bot is modular and OSID-native, but calibration (RS over-capture, casualty volume) and morale-consequence gaps keep it short of A.

### What works well

1. **Single source of truth for combat** — `combat_math.ts` is the shared authority for both `attack_resolution_osid.ts` (resolver) and `combat_predictor.ts` (bot); Attack Resolution Formula Spec is followed; no randomness; sorted iteration throughout.
2. **Modular bot corps AI** — `bot_corps_ai.ts` is a thin orchestrator; stance, operations, corridor, and directives live in dedicated modules; `CorpsDirective` (offensive_targets, hold_osids, aggression_modifier, reserve_fraction, etc.) flows cleanly to brigade execution.
3. **Brigade eval chain and discipline** — Hold → front (sector march, front coverage) → attack (home defense, supply gate, sector attack, reorganize, defensive, offensive) → movement; brigades only attack `effectiveDirective.offensive_targets`; OSID-native with no AoR/SID in the hot path.
4. **Corps front sectors pipeline** — `corps_front_sectors.ts` implements a full pipeline (BFS → partition edges → Voronoi territory → classifyBrigadesByTerritory → density equalization, reserves); `sector_offensive.ts` owns operation lifecycle (planning → execution → recovery) and equipment priority (mech/moto staging); sector intel feeds fog-of-war and bot targeting.
5. **Pipeline and supply/IVP integration** — `war_phases.ts` sequences sectors → corps orders → brigade orders → resolve-attack-orders → displacement/casualties/cohesion/morale → supply-pressure and patron/IVP; `supply_reserves.ts` (gated by `supply_reserves_enabled`) handles combat expenditure, siege drain, patron aid; `patron_pressure.ts` holds IVP and consequences; no duplicate subsystems.

### What needs improvement

1. **Calibration tuning** — RS over-capture (+104 delta) and casualty volume (21k vs 40–60k target) remain post-n482; constants (e.g. aggression, avoided_osids, BASE_*_LOSS_RATE or outcome modifiers) need targeted tuning without changing the fixed posture/hasty-defense/soft-cap logic.
2. **Morale design gaps** — No consequence for sustained zero morale (formations keep fighting); no victory-based morale boost (REAL_WAR_MASTER #5); drift is population/encirclement/exhaustion only, so winning sides can still show zero-morale brigades.
3. **Complexity and constant sprawl** — `corps_front_sectors.ts` is very large (~2.3k lines); `sector_offensive.ts` and attack resolution are also large; constants live across `combat_math.ts`, `attack_resolution_osid.ts`, `bot_constants.ts`, and reserve/formation constants, which complicates tuning and auditing.
4. **Per-formation casualty visibility** — State-level `military.casualty_ledger.per_formation` is populated; formation-level `casualty_ledger` is not, so UI/war stories/decorations must go through state ledger (REAL_WAR_MASTER #3).
5. **Remaining behavioral edge cases** — Some RBiH/HRHB deep-rear brigades remain due to geographic fragmentation (isolated pockets); cold fronts and Graz are handled, but edge cases (e.g. unreachable sector fronts) can still leave brigades without clear movement paths.

### Interoperability

- **State/architecture:** GameState holds formations, political_controllers (OSID), corps_command, corps_front_sectors (derived each turn), brigade_attack_orders, brigade_movement_orders. Attack resolution mutates control, formations, casualty_ledger; supply_reserves and patron_pressure read supply state and mutate reserves/IVP. Resolver and predictor are separate; combat logic is not duplicated.
- **Calibration and scenario runner:** Scenario runner consumes `attack_resolution_osid` and `bot_order_diagnostics` for combat causality (eligible_attackers, zero_battles, operation invalidation reasons); `corps_ai_report` snapshots at defined turns; run_summary and weekly_report.jsonl carry control deltas and control_change_attribution for territorial calibration.
- **UI:** GameStateAdapter derives `fogOfWar` from sector_intel and corps_front_sectors; LoadedGameState exposes sectors, battles, and turn summaries; map and warroom rely on state surfaces (control, formations, sectors, reports), not raw bot internals.

### Recommendations

1. **P0 — Calibration:** Tune RS aggression/avoided_osids and casualty constants (e.g. BASE_ATTACKER_LOSS_RATE / BASE_DEFENDER_LOSS_RATE or outcome-based modifiers) to bring RS territorial delta toward 0 and total casualties into the 40–60k band; keep current hasty defense and defense soft cap unchanged.
2. **P1 — Morale:** Add victory-based morale boost (post-battle or in morale_drift) and a consequence for sustained zero morale (e.g. dissolution gate or order refusal) per REAL_WAR_MASTER #5.
3. **P2 — Observability and contract:** Surface per-formation casualty totals from `state.military.casualty_ledger.per_formation` to formation objects or a dedicated adapter for UI/war stories; document the combat-causality contract (invalid operation reasons, eligible_attacker definition) in CALIBRATION_MASTER so calibration and scenario runs stay aligned.
