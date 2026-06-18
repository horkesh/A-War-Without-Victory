# War Specification v0.9.0 — War Phase

**Status:** Canon (v0.9.0; single-phase War-only model)
**Canon Version:** v0.9.0
**Last Updated:** 2026-05-05
**Original Date:** 2026-02-28

---

## 1. Purpose

**War** is the single war phase. It models sustained conflict when:

1. **Fronts are active**: Opposing control at OSID boundaries produces front segments; brigade location is **location_osid** only (no Areas of Responsibility).
2. **Supply pressure and exhaustion dominate**: Overextension and isolation increase supply pressure; static fronts and supply pressure drive irreversible exhaustion (Engine Invariants §4, §6, §8).
3. **Command friction degrades intent**: Exhaustion and front length reduce effective command coherence; friction may scale War-phase effects but never flips control or authority (Systems Manual §8).
4. **No total victory**: Front descriptors and War logic do not produce decisive territorial or victory outcomes; war trends toward stalemate or collapse.

**War start is referendum-gated:** CANON.md War Start Rule (Phase D0.4a) — War begins only when the mandatory EC-coerced RBiH independence referendum has been held and current_turn == referendum_turn + 4.

**All canonical scenarios start in April 1992 in War phase.** The runtime phase value is **war**. All brigade location_osid and war state are initialized at scenario load. Early-war mechanics (militia emergence, JNA dissolution) run as pipeline steps during the first ~12 weeks.

War-phase logic runs only when **meta.phase === "war"**. All mechanics are deterministic; no randomness, no timestamps.

---

## 2. Conceptual Definition

War represents: front emergence (derived from opposing political control at adjacency edges); front stability (fluid/static/oscillating); supply pressure (overextension + isolation); exhaustion accumulation (irreversible, monotonic); command friction (computed factor scaling supply/exhaustion). Control changes **only** via attack resolution or corps/frontline operations — no passive pressure flip. The legacy 'consolidation' posture has been removed (8-posture system, 2026-03-04); flip application was already disabled. Legacy saves with 'consolidation' or 'probe' are normalized to 'hold' on load. Brigade location is location_osid only; no AoR. See AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md.

---

## 3. Canonical Inputs

War consumes: GameState (meta.phase, meta.turn, political_controllers, factions, war_supply_pressure, war_exhaustion, war_exhaustion_local optional, front_segments); settlement edges for front derivation; optional supply report for isolation.

**State field naming (v0.6):** Normative state uses **war_** prefix (e.g. war_supply_pressure, war_exhaustion). Implementation may retain legacy phase_ii_* keys during migration; canonical names are war_*.

---

## 4. Required State Fields

**Persisted:** war_supply_pressure (Record<FactionId, number>, [0,100], monotonic); war_exhaustion (Record<FactionId, number>, non-negative, monotonic); war_exhaustion_local optional. **Derived (not serialized):** Front descriptors, command friction multiplier (Engine Invariants §13.1), corps_front_sectors (per-corps sector partition of front edges via multi-source BFS with Territory Voronoi depth assignment; see Systems Manual §2.1). **Brigade operations:** brigade_posture_orders, corps_command, army_stance, og_orders, settlement_holdouts; per-formation location_osid, entrenchment_turns, defense_streak, disrupted_turns, movement_state. Entrenchment init: scenario may set war_entrenchment_init_turns (0..12) at load; applied at War start. Movement-state contract: deployed = Combat, packing|in_transit|unpacking = Column; ZoC-constrained path validity.

---

## 5. War Turn Structure and Pipeline

Pipeline runs when meta.phase === "war". Order: update-formation-lifecycle; then supply-osid, enclave-resilience, **compute-home-defense-active**, osid-column-movement, **apply-brigade-movement** (brigade_movement_orders.ts), generate-bot-brigade-orders, apply-brigade-posture, update-corps-effects, advance-corps-operations, **advance-sector-offensives**, activate-operational-groups, equipment-degradation, apply-posture-costs, war-resolve-attack-orders, **update-sector-offensive-results**, war-hostile-takeover-displacement, war-recruitment, war-ongoing-mobilization, war-brigade-reinforcement, war-wia-trickleback, update-og-lifecycle; then detect fronts, update supply pressure, update exhaustion. (ZoC steps removed n344; zoc-computation + zoc-constrained-movement pipeline steps deleted; replaced by apply-brigade-movement. `compute-home-defense-active` added 2026-03-04; `war-consolidation` removed — control flips are breach/battle-resolution only in War phase.) Ceasefire and Washington Agreement checks run when meta.phase === "war". Supply gating constrains brigade and corps offensives per supply state (critical→defend, strained→victory-only); see Systems Manual §6.5, §14.5. **Displacement depth:** war-hostile-takeover-displacement uses per-OSID census data (`population_total`, `population_bosniaks`, `population_serbs`, `population_croats`, `population_others` from operational settlements) for displacement volume; hostile share cap 0.95 per-OSID (0.80 municipality fallback). Operational settlements loaded separately in pipeline. See Systems Manual §12.3. **Bottom-up recruitment:** When recruitment_mode === 'bottom_up', militia emergence, pool population, formation spawn, activate corps, promote formations run after main War steps (Engine Invariants §14.10). **Step naming:** Implementation may still use phase_ii_* step IDs during migration; canonical behavior is War-phase only.

---

## 6. Fronts (Emergent, Derived)

Front = set of settlement adjacency edges with opposing political control. Grouped by faction pair; stability from front_segments (active_streak). No geometry serialized; recomputed each turn. Brigade location_osid set at creation (OOB spawn, recruitment, scenario init); canonical_to_operational_map for SID→OSID; deterministic choice (e.g. first faction-controlled OSID by stable sort).

---

## 7. Supply Pressure and Exhaustion

Supply pressure: overextension (per front edge) + isolation (critical/strained from supply derivation). Monotonic per faction; cap 100. Exhaustion: from static front count and supply pressure; monotonic, irreversible (Engine Invariants §8). Command friction: multiplier ≥ 1 from exhaustion and front edge count; scales supply/exhaustion deltas; never serialized, never flips control. **Implementation-note (Phase A — Supply Reserves, 2026-03-01):** Supply pressure (monotonic, front-based) is distinct from supply reserves (consumption-based, replenishable). Reserves (`general_supply_reserve`, `heavy_munitions_reserve` [0..100]) degrade the effective supply state used in combat (via `getSupplyMult`) when depleted, independent of pressure. Gated by `supply_reserves_enabled` scenario flag. See Systems Manual §14.2 and SUPPLY_AMMO_SYSTEM_PLAN.md. **Implementation-note (Phase B+C, 2026-03-02):** Phase B adds siege drain (escalating per besieged OSID via `siege_turn_counters`), patron aid income, embargo reduction, and facility combat damage. Pipeline step `update-siege-counters` runs between `supply-osid` and `compute-supply-reserves`. Phase C enhances enclave resilience with hardening (+5% defense after 8+ isolation turns) and exhaustion reduction for RBiH (up to 30%). All gated by `supply_reserves_enabled`.

---

## 8. Validation and Run Artifacts

Determinism: same state + inputs → same outputs; no randomness; no timestamps. Exhaustion and supply pressure monotonic. No derived state serialized. War phases run only when meta.phase === "war". **run_summary.json** may include war_attack_resolution block (weeks_with_war, orders_processed, flips_applied, casualties, defender_present/absent_battles) for diagnostics.

---

## 9. War Termination and End-Game

Terminal conditions: (1) Negotiated settlement (treaty accepted per Rulebook §13), (2) Faction collapse (exhaustion + fragmented authority + below viability threshold), (3) Timeout/stalemate (scenario max duration, e.g. 208 weeks). No total victory. Evaluation: territory, population preserved, exhaustion, treaty terms (WAR_TERMINATION_MINIMAL_SPEC §8). Operation Storm: conditional late-war precondition check when Washington active, RS threat, exhaustion, IVP thresholds met; records `state.meta.operation_storm_preconditions_met` / `operation_storm_precondition_turn` only. Actual western-theater rupture is event truth: `state.meta.operation_storm_triggered` / `operation_storm_turn` are set only after the `operation_storm_1995` event fires. No Operation Storm path auto-flips control.

---

## 10. References and Implementation Notes

Attack resolution: Attack Resolution Formula Spec (combat power, outcome thresholds, casualties, push-back, control flip, retreat tie-break). Bot AI: formation lifecycle before brigade orders; posture and attack orders in one pass; hold posture for soft fronts; target scoring and one-brigade-per-target; supply gating (critical→defend, strained→victory-only); movement via brigade_movement_orders (apply-brigade-movement step, ZoC-constrained movement removed n344); sector offensives (named operations, momentum, advance-sector-offensives / update-sector-offensive-results; active in 40w window, 26 ops/40w at n359; supply readiness gated by supply_reserves_enabled; recovery-phase launches allowed; min 1 objective); see AI_STRATEGY_SPECIFICATION, CALIBRATION_REPORT_BOT_AI_FEB_2026, BOT_AI_HOLISTIC_TUNING_REFERENCE, docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md. Hostile-takeover displacement uses per-OSID census data for displacement depth (Systems Manual §12.3); displacement routing, expulsion policies: see implementation reports and docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md. Legacy phase_ii_* naming in code may remain during migration; canonical spec uses war_*.

---

## 11. v0.6 Canon consolidation

This document is the War phase specification. As of v0.7.3, the simulation is single-phase (War only). The former peace phase has been removed. Runtime phase value is **war**.

*Historical note: This document replaces the former Phase_I_Specification_v0_5_0.md and Phase_II_Specification_v0_5_0.md (three-phase model). Those deprecated docs are in docs/_old/10_canon/.*

---

## 12. v0.9.0 Substrate Amendments

The War-phase pipeline at v0.9.x has accreted substrate without altering the single-phase model or the §5 pipeline-step ordering invariant. Each amendment integrates into existing pipeline steps already documented above; this section makes the substrate explicit so canon readers can map current source files to canonical authority.

### 12.1 must_hold variable multiplier (R2-1, commit `e4c661d5`, 2026-05-03)

The corps commander's must-hold zone weight (`commander/allocate.ts`) was a flat 1.5× multiplier in the v0.7.x window. v0.9.0 replaces it with `max(2.0, min(5.0, 0.75 × commitment_ratio))` — must-hold weight scales with the corps's commitment ratio so that an under-pressed corps does not over-weight defensive zones, and an over-stretched corps cannot dilute must-hold attention. Pressure-responsive, faction-agnostic, integrates into the same Step 5 pipeline phase that already runs commander allocation. No new state shape; reads existing `zone.commitment_ratio`.

### 12.2 Divergence event substrate (R2-2 + Wave 4 + Wave 4 Lane B)

Divergence events fire within the existing event pipeline (`update-event-readiness` → `evaluate-events`) but consume new substrate added at v0.9.0:

- **`cost_ledger_annotation` effect family:** new effect kind that records prosecutorial-voice annotations for endgame Cost Ledger consumption. Faction-agnostic effect application; emit-only at event resolution.
- **`MilitaryState.cost_ledger_annotations` field:** additive optional array on `MilitaryState`; deserializes to empty on legacy saves.
- **New condition kinds** layered on existing `EventCondition` union: `alliance_holds_past_w35`, `paramilitary_authorization_refused`, `enclave_held_alt_intervention`, `patron_pressure_resisted_streak`, `early_peace_acceptance_w120`, `force_quality_inversion`, plus Wave 4 additions consuming `equipment_quality_modifier` substrate. All faction-agnostic predicates.
- **Cumulative count:** 244 event definitions across the event catalog as of the 2026-05-10 v0.9.0 consequence milestone closure, with 827 effect instances, 18 known effect kinds, 18 live substrates, zero partial-reader substrates, and zero unknown substrates.
- **Closure note:** The refreshed v0.9.0 scope is agent-closed after Packets C1-C3, the annotation-reader bridge, and RBiH identity follow-through (`csq_civic_identity_consolidation_1993`, `csq_pragmatic_coalition_1993`). Old Chain 7 implementation IDs are superseded by the accepted-peace engine/endgame contract (`war_ended_early`, `early_peace_implemented`, endgame snapshot, and `early_peace_implementation_record`). Sensitive-history/enclave/genocide expansion remains governed by `SENSITIVE_HISTORY_DESIGN_GATE.md`, not ordinary event-wave authoring.

### 12.3 `equipment_quality_modifier` substrate (Wave 3, commit `658241df`, 2026-05-04)

New effect kind `EventEffectEquipmentQualityModifier` (multiplicative, faction-scoped, time-bounded) + `MilitaryState.equipment_quality_modifiers?: Array<{faction, multiplier, expires_turn}>` field + reader `getActiveEquipmentQualityMultiplier(state, faction, currentTurn)`. Threaded into combat predictor power computation behind a no-op early return: `if (eqMult !== 1.0) power *= eqMult`. Preserves byte-stable arithmetic on no-event historical paths. Mirrors the established `recruitment_modifier` precedent.

The substrate is consumed by event #11 `csq_weapons_embargo_partial_lift` (Wave 3) and Wave 4 `csq_patron_equipment_delivery_confirmed` (substrate-then-content sequencing precedent). Future arms-flow events (Croatia pipeline, Iran flights, post-Dayton lifting) can consume this substrate without further engine extension.

### 12.4 Reconstitution policy step curve (Wave 4 Lane A, commit `e9584dd3`, 2026-05-04)

`getFactionReinforcementMult` in `formation_constants.ts` (parallel data in `data/scenarios/timelines/apr1992.json`):

- VRS: flat 1.0× → 4-band step curve (1.0× <w52, 0.85× <w78, 0.65× <w104, 0.45× thereafter)
- HRHB: 2-band → 4-band (added 0.65× w52-77, 0.50× w78+)
- RBiH: unchanged (audit confirms ARBiH on-doctrine)

Mechanism is faction-agnostic in code (`lookupStepCurve(...)` is the same predicate RBiH and HRHB already used); only data parameters drive faction asymmetry. Closes the Force-Quality Gap 2 upstream lever identified in `20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` (VRS reconstitution outpacing battle attrition was overriding the casualty-driven officer_quality decay path).

### 12.5 Sensitive-history Ring 1 substrate

The canonical pattern for counterfactual recording (Q-CANON-RUPT-4 Path (d), commit `ce95c162`, 2026-05-04) is:

- Deterministic predicate on a flag set by the simulation's own observation system (e.g., `predEnclaveDefended` reading `enclave_held_through_turn` flag in `dynamic_section_builder.ts`).
- Narrative file in the §4-compliant register at `data/codex/ghost_entries/<key>.md`.

Rupture consequences (`evaluateRuptureConsequences()`) fire ONLY on emergent satisfaction of a discrete game-state condition (control of a specific OSID + flag + turn predicate). Calendar-window heuristic substitution is forbidden. Counterfactual silence (no rupture in an ahistorical campaign that did not produce the trigger condition) is canonically correct. The historical record (Ring 2: essays + ICTY citations) remains accessible regardless of campaign path.

The single live rupture is `srebrenica_genocide_1995` (RS controls `op:srebrenica:srebrenica_2` + `enclave_formed` flag + event-owned fall-receipt window turn ≥160). Srebrenica/Zepa fall receipts are authored by the sensitive-history event rows (`control_change` effects); Krivaja-95/Stupcanica-95 remain chronology/AAR context, not the mechanical fall-delivery acceptance criterion. See `SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 #11, §2 criterion 3, §5.

### 12.6 Officer-quality observability (Force-Quality Gap 1, commit `0bd5a938`, 2026-05-04)

`BrigadeTemporalRow` schema extended with optional `officer_quality` + `officer_count_active` fields (conditional attach for byte-identity preservation on legacy fixtures). Per-turn officer-quality trajectory now traceable in `brigade_temporal_log.jsonl`. Pure observability; no engine state shape change. Harness emit; not engine.

### 12.7 Deferred substrate

Items recorded in lane handoffs but not yet integrated into normative pipeline:
- 188w sensitive-history regression run before promoting `MORALE_OVERRIDE_ENABLED` flag from default-off to default-on.
- Per-corps `historical_axis_munis` config + off-axis duration counter on `CorpsCommandState` (R2-2 7th event `csq_corps_redeployed_off_axis` is HELD pending this).
- Stupčanica-95 defender combat-math stack honesty for operation-health/AAR diagnostics only; not a Srebrenica/Zepa fall-delivery mechanism.

---

*War Specification v0.9.0 — Single war phase; v0.6 lifecycle baseline + v0.9 substrate amendments (must_hold variable multiplier, divergence event substrate, equipment_quality_modifier, reconstitution policy step curve, sensitive-history Ring 1 substrate, officer-quality observability) integrated.*
