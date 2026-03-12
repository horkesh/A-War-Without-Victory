## 5. Canon Compliance

**Grade: A-**  
Canon is authoritative and well-structured; code and behavior align with Engine Invariants, Phase Specs (Peace/War), and War/Systems Manual on control-change mechanics, pipeline order, determinism, and OSID-keyed state. Residual Phase I/II identifiers in types/modules and one stale canon morale value hold the grade below A.

---

### What works well

1. **Control change only via authorized mechanisms** — Engine Invariants §9.6, §14.1: political control changes only via attack resolution or corps/frontline operations; no passive pressure flip. Enforced in `attack_resolution_osid.ts`, `war_phases.ts` (war-resolve-attack-orders, update-sector-offensive-results), and `displace-enemy-territory`; `validateBrigadeLocationControl` in `src/validate/brigade_location_control.ts` enforces formation location-in-control.
2. **War pipeline and phase gating** — War Specification §5: pipeline runs only when `meta.phase === 'war'`; step order matches spec (e.g. osid-column-movement before apply-brigade-movement, advance-sector-offensives / update-sector-offensive-results). Implemented in `turn_pipeline.ts` and `turn_phases/war_phases.ts` with consistent `context.state.meta.phase !== 'war'` guards.
3. **Determinism and stable ordering** — Engine Invariants §11: no randomness in simulation logic; no timestamps in derived artifacts; stable ordering (e.g. strictCompare) in iteration and serialization. Reflected in pipeline, attack resolution, retreat tie-break (§14.5), and scenario runner; DETERMINISM_TEST_MATRIX and napkin reinforce the contract.
4. **Political control init and OSID-only war state** — Invariants §9.2, §9.8: political control initialized before fronts/brigades; war phase uses location_osid only; OSID-keyed state with stable ordering. Scenario runner and init paths respect precedence; `political_controllers` keyed by OSID; AoR/ZoC removed per canon.
5. **Supply, exhaustion, displacement alignment** — Reserve logic gated by `supply_reserves_enabled` (Engine Invariants §4 implementation-note); exhaustion monotonic (Invariants §8); displacement uses per-OSID census and hostile-share cap (War Spec §5, Systems Manual §12.3) in `displacement_takeover.ts`; takeover war-start seeding fixed (currentTurn === warStartTurn + 1).

---

### What needs improvement

1. **Phase I/II terminology still present in code** — Phase Specifications v0.6.0 and Engine Invariants §17 state Peace/War only; napkin (2026-03-08) says "Phase I/II terminology fully removed". **Remaining:** type `PhaseIIFrontStability` and `PhaseIIBattleResolutionLike`; module `phase_ii_adjacency.js` (and imports in brigade_movement.ts, brigade_movement_query.ts, bot_corps_corridor.ts, desktop_sim.ts); scenario_runner `createOobFormationsAtPhaseIEntry`; browser runners `runPhaseITurn` / `runPhaseIITurn` and types `PhaseITurnInput` / `PhaseIITurnReport`; `PhaseIDisplacementHooksInfo` and `phase_i_flip` reason in displacement.ts; UI `renderPhaseIPlus`, run_phase0_turn `derivePhaseIHandoffOp` / `applyPhaseIHandoff`; serialize.ts `hasAnyPhaseI` / `hasAnyPhaseII`; GameStateAdapter accepts `phase === 'phase_ii'`; run_combat_browser.ts error "state must be in phase_ii"; formation tags `generated_phase_i0` in formation_spawn.ts and cli. **Doc:** Phase_Specifications_v0_6_0.md; Engine_Invariants_v0_6_0.md §17.
2. **Systems Manual morale resist floors out of date** — Systems Manual v0.6.0 §4 states "Per-faction floors: RBiH=62, RS=70, HRHB=65". **Code** (`combat_math.ts` getMoraleResistFloor): RBiH=50, RS=70, HRHB=60; napkin documents 50/60. Canon doc is stale; code and napkin are aligned. **Doc:** Systems_Manual_v0_6_0.md §4; **code:** `src/sim/combat/combat_math.ts`.
3. **Control-change attribution uses legacy reason** — displacement.ts writes `reason: ['phase_i_flip']` for a control-change path. Engine Invariants §9.6 authorize only attack resolution, corps/frontline ops, authority collapse, or negotiated transfer. **Doc:** Engine_Invariants_v0_6_0.md §9.6; **code:** `src/state/displacement.ts` (reason attribution).
4. **Serialization and adapter keep Phase I/II in contract** — serialize.ts migration preserves phase_i/phase_ii for legacy saves; GameStateAdapter treats `phase_ii` as war. Acceptable for backward compatibility but prolongs Phase I/II in the observable contract. **Doc:** Engine Invariants §9.8, §14.9; **code:** `src/state/serialize.ts`, `src/ui/map/data/GameStateAdapter.ts`.

---

### Interoperability

**(a) Pipeline steps** — Canon flows into the pipeline via War Specification §5 and Engine Invariants §14.9: step order and names are defined in canon; `turn_pipeline.ts` and `turn_phases/war_phases.ts` implement that sequence. context.md and implementation reports (e.g. MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES) map steps to Systems Manual and War Spec. No separate "canon pipeline doc"; the spec is the source.

**(b) Calibration / acceptance criteria** — CALIBRATION_MASTER.md defines combat-causality gate (attack orders, battles, control-change attribution), validity flags, and area-weighted targets. It references canon (e.g. supply reserves, sector offensives, paramilitary lifecycle) and links to implementation reports that cite Engine Invariants and Systems Manual. Acceptance is "does the run satisfy behavioral health and historical-fit criteria" derived from canon (e.g. no passive pressure flip, control only via resolution/ops).

**(c) UI and living docs** — GUI_MASTER and CALIBRATION_MASTER are living references; they point to canon and engineering docs (TACTICAL_MAP_SYSTEM, context.md) rather than duplicating them. GUI_MASTER gates (fog from sector_intel, no legacy stacks) align with Engine Invariants §13 (derived state not serialized) and War Spec. REAL_WAR_MASTER and war-or-game role provide a realism audit layer that references canon and calibration evidence.

---

### Recommendations

1. **Complete Phase I/II terminology cleanup (high)** — Rename types and modules to Peace/War or domain names (e.g. PhaseIIFrontStability → FrontStability, phase_ii_adjacency → war_adjacency or osid_adjacency); rename browser runners and types to peace_turn/war_turn or early_war/combat; remove `phase_ii` from GameStateAdapter once legacy saves are migrated; replace or remove `phase_i_flip` attribution in displacement; consider renaming internal tags (e.g. generated_phase_i0 → generated_war_formation) and update serialize migration to drop phase_i/phase_ii when no longer needed. Aligns code with Phase_Specifications_v0_6_0 and Engine_Invariants §17.
2. **Reconcile morale resist floors in canon (medium)** — Update Systems_Manual_v0_6_0.md §4 to match implemented and napkin values (RBiH=50, HRHB=60, RS=70), or document an explicit override and change code. Single source of truth avoids future drift.
3. **Audit control-change attribution and reasons (medium)** — Map every control-change code path to Engine Invariants §9.6; replace `phase_i_flip` with a canon-aligned reason (e.g. authority_collapse, combat, or remove if path is obsolete); ensure any new attribution strings are listed or implied by §9.6.
