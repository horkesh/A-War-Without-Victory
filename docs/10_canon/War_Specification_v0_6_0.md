# War Specification v0.6.0 — War Phase

**Status:** Canon (v0.6.0; two-phase model)
**Canon Version:** v0.6.0
**Date:** 2026-02-28
**Supersedes:** Phase_I_Specification_v0_5_0.md, Phase_II_Specification_v0_5_0.md (deprecated; see docs/_old/10_canon/)

---

## 1. Purpose

**War** is the single war phase. It models sustained conflict when:

1. **Fronts are active**: Opposing control at OSID boundaries produces front segments; brigade location is **location_osid** only (no Areas of Responsibility).
2. **Supply pressure and exhaustion dominate**: Overextension and isolation increase supply pressure; static fronts and supply pressure drive irreversible exhaustion (Engine Invariants §4, §6, §8).
3. **Command friction degrades intent**: Exhaustion and front length reduce effective command coherence; friction may scale War-phase effects but never flips control or authority (Systems Manual §8).
4. **No total victory**: Front descriptors and War logic do not produce decisive territorial or victory outcomes; war trends toward stalemate or collapse.

**War start is referendum-gated:** CANON.md War Start Rule (Phase D0.4a) — War begins only when the mandatory EC-coerced RBiH independence referendum has been held and current_turn == referendum_turn + 4.

**Canonical April 1992 scenarios start directly in War.** There is no separate "Phase I" or "Phase II"; the runtime phase value for war is **war**. When a scenario starts in War, all brigade location_osid and war state are initialized at scenario load; no intra-war phase transition.

War-phase logic runs only when **meta.phase === "war"**. All mechanics are deterministic; no randomness, no timestamps.

---

## 2. Conceptual Definition

War represents: front emergence (derived from opposing political control at adjacency edges); front stability (fluid/static/oscillating); supply pressure (overextension + isolation); exhaustion accumulation (irreversible, monotonic); command friction (computed factor scaling supply/exhaustion). Control changes **only** via attack resolution or corps/frontline operations — no passive pressure flip. Consolidation posture does not apply control flips in War (bots may use consolidation for behavior; flip application is disabled). Brigade location is location_osid only; no AoR. See AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md.

---

## 3. Canonical Inputs

War consumes: GameState (meta.phase, meta.turn, political_controllers, factions, war_supply_pressure, war_exhaustion, war_exhaustion_local optional, front_segments); settlement edges for front derivation; optional supply report for isolation.

**State field naming (v0.6):** Normative state uses **war_** prefix (e.g. war_supply_pressure, war_exhaustion). Implementation may retain legacy phase_ii_* keys during migration; canonical names are war_*.

---

## 4. Required State Fields

**Persisted:** war_supply_pressure (Record<FactionId, number>, [0,100], monotonic); war_exhaustion (Record<FactionId, number>, non-negative, monotonic); war_exhaustion_local optional. **Derived (not serialized):** Front descriptors, command friction multiplier (Engine Invariants §13.1), corps_front_sectors (per-corps sector partition of front edges via multi-source BFS; see Systems Manual §2.1). **Brigade operations:** brigade_posture_orders, corps_command, army_stance, og_orders, settlement_holdouts; per-formation location_osid, entrenchment_turns, defense_streak, disrupted_turns, movement_state. Entrenchment init: scenario may set war_entrenchment_init_turns (0..12) at load; applied at War start. Movement-state contract: deployed = Combat, packing|in_transit|unpacking = Column; ZoC-constrained path validity.

---

## 5. War Turn Structure and Pipeline

Pipeline runs when meta.phase === "war". Order: update-formation-lifecycle; then zoc-computation, war-supply-osid, osid-column-movement, zoc-constrained-movement, generate-bot-brigade-orders, apply-brigade-posture, update-corps-effects, advance-corps-operations, **advance-sector-offensives**, activate-operational-groups, equipment-degradation, apply-posture-costs, war-resolve-attack-orders, **update-sector-offensive-results**, war-hostile-takeover-displacement, war-recruitment, war-ongoing-mobilization, war-brigade-reinforcement, war-wia-trickleback, update-og-lifecycle; then detect fronts, update supply pressure, update exhaustion; then war-consolidation (no control flips). Ceasefire and Washington Agreement checks run when meta.phase === "war". Supply gating constrains brigade and corps offensives per supply state (critical→defend, strained→victory-only); see Systems Manual §6.5, §14.5. **Displacement depth:** war-hostile-takeover-displacement uses per-OSID census data (`population_total`, `population_bosniaks`, `population_serbs`, `population_croats`, `population_others` from operational settlements) for displacement volume; hostile share cap 0.95 per-OSID (0.80 municipality fallback). Operational settlements loaded separately in pipeline. See Systems Manual §12.3. **Bottom-up recruitment:** When recruitment_mode === 'bottom_up', militia emergence, pool population, formation spawn, activate corps, promote formations run after main War steps (Engine Invariants §14.10). **Step naming:** Implementation may still use phase_ii_* step IDs during migration; canonical behavior is War-phase only.

---

## 6. Fronts (Emergent, Derived)

Front = set of settlement adjacency edges with opposing political control. Grouped by faction pair; stability from front_segments (active_streak). No geometry serialized; recomputed each turn. Brigade location_osid set at creation (OOB spawn, recruitment, scenario init); canonical_to_operational_map for SID→OSID; deterministic choice (e.g. first faction-controlled OSID by stable sort).

---

## 7. Supply Pressure and Exhaustion

Supply pressure: overextension (per front edge) + isolation (critical/strained from supply derivation). Monotonic per faction; cap 100. Exhaustion: from static front count and supply pressure; monotonic, irreversible (Engine Invariants §8). Command friction: multiplier ≥ 1 from exhaustion and front edge count; scales supply/exhaustion deltas; never serialized, never flips control. **Implementation-note (Phase A — Supply Reserves, 2026-03-01):** Supply pressure (monotonic, front-based) is distinct from supply reserves (consumption-based, replenishable). Reserves (`general_supply_reserve`, `heavy_munitions_reserve` [0..100]) degrade the effective supply state used in combat (via `getSupplyMult`) when depleted, independent of pressure. Gated by `supply_reserves_enabled` scenario flag. See Systems Manual §14.2 and SUPPLY_AMMO_SYSTEM_PLAN.md.

---

## 8. Validation and Run Artifacts

Determinism: same state + inputs → same outputs; no randomness; no timestamps. Exhaustion and supply pressure monotonic. No derived state serialized. War phases run only when meta.phase === "war". **run_summary.json** may include war_attack_resolution block (weeks_with_war, orders_processed, flips_applied, casualties, defender_present/absent_battles) for diagnostics.

---

## 9. War Termination and End-Game

Terminal conditions: (1) Negotiated settlement (treaty accepted per Rulebook §13), (2) Faction collapse (exhaustion + fragmented authority + below viability threshold), (3) Timeout/stalemate (scenario max duration, e.g. 208 weeks). No total victory. Evaluation: territory, population preserved, exhaustion, treaty terms (WAR_TERMINATION_MINIMAL_SPEC §8). Operation Storm: conditional late-war precondition check when Washington active, RS threat, exhaustion, IVP thresholds met; sets state flags/narrative only (no auto control flip).

---

## 10. References and Implementation Notes

Attack resolution: Attack Resolution Formula Spec (combat power, outcome thresholds, casualties, push-back, control flip, retreat tie-break). Bot AI: formation lifecycle before brigade orders; posture and attack orders in one pass; consolidation posture for soft fronts; target scoring and one-brigade-per-target; supply gating (critical→defend, strained→victory-only) and sector offensives (named operations, momentum, advance-sector-offensives / update-sector-offensive-results); see AI_STRATEGY_SPECIFICATION, CALIBRATION_REPORT_BOT_AI_FEB_2026, BOT_AI_HOLISTIC_TUNING_REFERENCE, docs/40_reports/implemented/20260301_MULTI_SECTOR_SUPPLY_GATING_SECTOR_OFFENSIVES.md. Hostile-takeover displacement uses per-OSID census data for displacement depth (Systems Manual §12.3); displacement routing, expulsion policies: see implementation reports and docs/40_reports/20260301_DISPLACEMENT_DEPTH_CALIBRATION.md. Legacy phase_ii_* naming in code may remain during migration; canonical spec uses war_*.

---

## 11. v0.6 Canon consolidation

This document (v0.6.0) is the single War phase specification in the two-phase (Peace/War) model. It supersedes Phase_I_Specification_v0_5_0.md and Phase_II_Specification_v0_5_0.md. Deprecated docs are in docs/_old/10_canon/. Runtime phase value for this phase is **war**.

---

*War Specification v0.6.0 — Single war phase; part of canon v0.6 set.*
