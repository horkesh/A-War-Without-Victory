# Supply System Design Document

**Date:** 2026-02-24  
**Source:** Full-team convene [ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md](../40_reports/convenes/ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md) §7.4 (single priority).  
**Owner:** Technical Architect (lead author); Game Designer (narrative, enclave/hardening); Architect (UX, phased fit). PM to sequence implementation after sign-off.

---

## 1. Purpose and scope

This document is the **design specification for the supply system** as agreed by the full Paradox team convene of 2026-02-24. It is the single source for implementation phasing.

**Goals:**
- Supply **matters**: combat effectiveness, pressure, and exhaustion reflect supply state; player and bots can act on corridor and isolation information.
- **ARBiH can survive cut-off** and **emerge tougher**: enclaves (Bihać, eastern enclaves, central Bosnia) can persist when isolated; optional resilience/hardening models adaptation under stress.
- **Fun without micromanagement**: one view for corridor state and isolation; no per-settlement supply micromanagement.
- **Determinism required:** All supply trace, cascade, and supply_mult derivation use stable ordering and no timestamps or RNG.

**Scope:** Engine state, pipeline, report shape, combat wiring, corridor cascade, enclave rules, minimum supply UX, and bot supply awareness. Implementation code is out of scope for this doc; canon changes are allowed only with Architect sign-off on recommendations below.

---

## 2. Current state (as-is)

### 2.1 Game state

- **phase_ii_supply_pressure:** `Record<FactionId, number>` [0, 100], monotonic per faction; updated from overextension (front edges) and isolation (critical/strained counts from supply report).
- **Faction:** `supply_sources: string[]` (settlement SIDs); `areasOfResponsibility` (legacy; used as controlled set in supply reachability).
- **Formation:** `formation.ops.last_supplied_turn: number | null`; `formation.location_osid` (optional, Phase II).
- **supply_rights:** Optional `SupplyRightsState` with `corridors` (treaty corridor traversal; used in BFS for reachability).

### 2.2 Pipeline

- **supply-resolution** step: `computeSupplyReachability(state, adjacencyMap)` → `SupplyReachabilityReport` (per faction: `sources`, `controlled` = areasOfResponsibility, `reachable_controlled`, `isolated_controlled`, `edges_used`); then `deriveCorridors(state, adjacencyMap, supplyReport)` → `CorridorDerivationReport`; then `deriveSupplyState(state, adjacencyMap, supplyReport, corridorReport)` → `SupplyStateDerivationReport` (per faction: `by_settlement`, `adequate_count`, `strained_count`, `critical_count`); then local production and production bonus. Report stored in `context.report.supply_resolution` (supply_state, corridors, local_production, production_bonus_by_faction).
- **Phase II:** `updatePhaseIISupplyPressure(state, edges, context.report.supply_resolution?.supply_state, frictionMultipliers, production_bonus_by_faction)` in phase-ii-consolidation; Sarajevo, enclave, and doctrine steps consume `context.report.supply_resolution?.supply_state` where applicable.

### 2.3 Combat

- **getSupplyMult(formation, state, mode)** in `attack_resolution_osid.ts` and `combat_predictor.ts` uses **only** `formation.ops.last_supplied_turn`: if `last_supplied_turn != null` and `state.meta.turn - last_supplied_turn <= 2` → 1.0; else attacker 0.4, defender 0.5. It does **not** read `SupplyStateDerivationReport` or `formation.location_osid`.

### 2.4 Canon (short summary)

- **Systems Manual §14:** Supply states Adequate/Strained/Critical; corridor states Open/Brittle/Cut; BFS from sources through controlled nodes; supply_mult 1.0 / 0.7–0.8 / 0.4–0.5; enclave supply same reachability rules; §14.2 allows per-OSID supply state when operational layer is authoritative.
- **Engine Invariants §4:** Corridors Open/Brittle/Cut; brittle = continuous penalties; junction loss alone must not collapse corridor unless dependency thresholds crossed; supply recovery slower than degradation; no improvement without connectivity/authority.
- **Phase II Spec §8:** Supply pressure from overextension + isolation (critical/strained from supply report); exhaustion from static fronts and supply pressure; supply report optional for isolation; attack resolution uses supply_mult per Attack Resolution Formula Spec.

### 2.5 Gaps

- **Controlled set** = `areasOfResponsibility` (legacy); should align with Phase II control + location_osid when operational data is authoritative.
- **No OSID-level supply state** in report; no lookup by `formation.location_osid` for combat.
- **No cascade propagation** rule: when a critical edge is lost (control flip), dependent regions’ transition (Adequate→Strained→Critical) is not formally specified; full cascade semantics are design intent but "not yet fully confirmed" (DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT).
- **No enclave resilience or hardening** mechanics (optional per convene).

### 2.6 Phase A — Supply Reserves (COMPLETE 2026-03-01)

A **parallel track** to the Phases 1–5 above: faction-level supply reserves add a consumption/replenishment layer on top of OSID reachability. Two categories: `general_supply_reserve` and `heavy_munitions_reserve` per faction [0..100]. Three consumption channels: maintenance drain, combat expenditure, siege (Phase B of SUPPLY_AMMO_SYSTEM_PLAN). Effective supply state combines BFS reachability (from Phase 1) with reserve level via interaction table in `getEffectiveSupplyState()`. Gated by `supply_reserves_enabled` scenario flag. See [SUPPLY_AMMO_SYSTEM_PLAN.md](SUPPLY_AMMO_SYSTEM_PLAN.md) and [20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md](../40_reports/implemented/20260301_SUPPLY_RESERVES_PHASE_A_IMPLEMENTATION.md).

### 2.7 Phase B+C — Siege, Replenishment, Enclave Hardening (COMPLETE 2026-03-02)

**Phase B (Siege Curve + Replenishment Wiring):** Escalating siege drain per besieged OSID (`siege_turn_counters`), patron aid income channel, embargo reduction on income, production facility combat damage (0.05 condition per battle). Pipeline step `update-siege-counters` between `phase-ii-supply-osid` and `compute-supply-reserves`.

**Phase C (Enclave Resilience Enhancement + Hardening):** Structured `EnclaveResilienceEntry` with isolation tracking, hardening defense bonus (+5%) after 8+ isolation turns, enclave-based exhaustion reduction for RBiH (up to 30% at max resilience). 25+ calibration constants in `supply_reserve_constants.ts`.

All new mechanics gated behind `supply_reserves_enabled` (default false). See [SUPPLY_AMMO_SYSTEM_PLAN.md](SUPPLY_AMMO_SYSTEM_PLAN.md) and [20260302_SUPPLY_SYSTEM_PHASE_B_C_IMPLEMENTATION.md](../40_reports/implemented/20260302_SUPPLY_SYSTEM_PHASE_B_C_IMPLEMENTATION.md).

---

## 3. Target design — OSID supply trace and per-OSID state

When **operational (OSID) data is present:** supply trace runs over the **OSID graph** from faction supply sources (sources expressed as OSIDs or mapped from settlements). Output: **per-OSID supply state** (Adequate / Strained / Critical) per faction. When operational data is absent: keep current **settlement-based** derivation (BFS on canonical adjacency, by_settlement in report).

**State/report changes:**
- Either extend `SupplyStateDerivationReport` with optional **by_osid** per faction (array of `{ osid, state }` sorted by osid), or introduce a separate report type for OSID-level supply. Formation `location_osid` → lookup supply state for that OSID.
- Controlled set for OSID trace: use political control keyed by OSID (or canonical SIDs mapped to OSIDs) and formation locations; not areasOfResponsibility for the OSID path.

**Canon:** No change to core semantics. If new semantics are introduced (e.g. "supply state is defined per OSID when operational layer is authoritative"), recommend **Systems Manual §14.2 addition**: "When operational layer is authoritative, supply state may be defined per OSID; derivation and report shape per SUPPLY_DESIGN.md." **Architect sign-off** for any canon wording.

---

## 4. Target design — supply_mult in attack resolution and combat predictor

**getSupplyMult(formation, state, mode)** must use **supply state at formation.location_osid** when (1) OSID data is present and (2) supply report includes per-OSID state for that faction. Else **fallback** to current `last_supplied_turn` heuristic (≤2 turns → 1.0; else 0.4 attack / 0.5 defend). Mapping: Adequate → 1.0; Strained → 0.7 (attack) / 0.8 (defend); Critical → 0.4 (attack) / 0.5 (defend) per Attack Resolution Formula Spec.

**State:** No new persisted state; supply state is derived each turn and read from the supply-resolution report.

**Pipeline:** supply-resolution (or a Phase II step that has access to the same report) must produce a report available to **phase-ii-resolve-attack-orders** and **combat predictor**. Pass the report in context or ensure it is computed once per turn and reused (no recomputation inside attack resolution).

**Canon:** Phase II Spec §8 and Attack Resolution Formula Spec §2.2–2.3 already reference supply_mult. Option: **clarify** that supply_mult is derived from supply state at formation location (OSID or settlement) when available; otherwise from last_supplied_turn. **Architect sign-off** for wording.

---

## 5. Corridor collapse and cascade

Define **dependency thresholds** and **deterministic propagation**: when a critical edge is **lost** (control flip), which regions transition Adequate→Strained→Critical, and in what **order** (e.g. by faction, then by settlement/OSID sort).

**State:** `CorridorDerivationReport` and `SupplyStateDerivationReport` are already recomputed each turn. Cascade is the **rule** for how `isolated_controlled` and brittle-path sets are updated after a flip. Options: (a) supply-resolution runs **after** control flips in the same turn so cascade is visible immediately; or (b) document that cascade is visible **next turn** (simpler; no re-run of supply in same turn).

**Ordering:** Deterministic: e.g. by faction_id asc, then by settlement id or osid asc when propagating "dependent" regions (regions that become isolated or strained when an edge is removed). Dependency threshold: e.g. "region R transitions to Strained if the only path from R to sources uses a brittle edge; R transitions to Critical if no path." Exact threshold (single brittle edge vs N brittle edges) to be set in implementation; Engine Invariants §4: "junction loss alone must not collapse a corridor unless dependency thresholds are crossed."

**Canon:** **Recommend** explicit **Engine Invariants §4** wording: "Cascade: dependent regions transition Adequate→Strained→Critical only when dependency threshold is crossed (e.g. sole path becomes brittle, or path is lost). Propagation order is deterministic (e.g. by faction, then by node id)." **Architect sign-off.**

---

## 6. Enclave supply and optional resilience/hardening

Enclaves use the **same reachability rules** (Systems Manual §14.4): supply state derived by same BFS/trace; narrow corridor or airlift can keep enclave Adequate/Strained.

**Optional — Enclave resilience curve:** A **resilience** value per enclave (or per-OSID in enclaves) that can **grow** when isolated (bounded), reducing exhaustion accumulation or improving cohesion recovery in enclaves only. Represents local adaptation, smuggling, morale. State: e.g. `enclave_resilience` per enclave id, or derived each turn from isolation duration and cap.

**Optional — Hardening:** After N turns strained/critical in an enclave, **hardening** gives a small defense or cohesion-recovery bonus (e.g. resilience_mult or cohesion recovery +X in strained enclaves only). Bounded and deterministic.

**State:** If resilience/hardening adopted: new optional fields (e.g. per enclave id or per-OSID resilience_accumulator) or derived each turn and exposed in report only.

**Canon:** If new mechanics are adopted: "Recommend §14.4 or §16 addition for enclave resilience and/or hardening (formula and caps per SUPPLY_DESIGN.md). **Game Designer + Architect sign-off.**"

---

## 7. Minimum viable supply UX

**Single view:** Corridor state (Open / Brittle / Cut) and **isolation summary** (e.g. counts: adequate / strained / critical per faction). Optional map layer: "threatened corridors" or corridor state overlay. **No per-settlement micromanagement.**

**State/IPC:** Adapter exposes corridor report and supply state summary. IPC already has `query-supply-paths`; add or reuse a query for **corridor summary** (and optionally isolation counts) so the UI can render one panel or layer without reading full by_settlement/by_osid.

**Canon:** No canon change for UI.

---

## 8. Bot supply awareness

- **supply_mult** and supply state in bot **target scoring** and **defense priority** (BOT_AI_DESIGN_SPEC: corridor_open, supply_isolation, enclave isolation awareness).
- **BFS supply trace** in OSID graph for "supply connectivity" in shared intelligence (Phase 3: "Supply awareness — BFS supply trace through OSID graph, supply_mult prediction").

**State:** No new state; bot reads the same supply report and formation `location_osid`. Scoring uses supply state at formation location and at target OSID when available.

---

## 9. Implementation phases

| Phase | Content | Game state changes | Canon changes | Pipeline changes |
|-------|---------|--------------------|---------------|------------------|
| **1** | OSID supply trace (when operational data present) + per-OSID supply state in report; wire getSupplyMult to use it; keep last_supplied_turn fallback. | None (report only). Optional: extend SupplyStateDerivationReport.by_osid. | Optional §14.2 clarification (per OSID supply state). Architect sign-off. | supply-resolution (or parallel step) produces by_osid when OSID graph available; resolve-attack-orders and combat predictor receive report and use formation.location_osid → supply state. |
| **2** | Corridor cascade semantics: dependency thresholds, propagation order (by faction, then node). | None (derivation only). | Recommend Engine Invariants §4 cascade wording. Architect sign-off. | Supply-resolution runs after control flips (or document next-turn visibility); derivation applies cascade rule with deterministic order. |
| **3** | Minimum supply UX: panel or map layer (corridor state + isolation summary). | None. | None. | Adapter + IPC query for corridor summary; UI consumes it. |
| **4** (optional) | Enclave resilience and/or hardening. | Optional: enclave_resilience or derived report field. | Recommend §14.4/§16 addition. Game Designer + Architect sign-off. | Derivation and/or report extension; exhaustion/cohesion use resilience/hardening in enclaves only. |
| **5** (optional) | Bot supply awareness: BFS, supply_mult in scoring (BOT_AI_DESIGN_SPEC Phase 3). | None. | None. | Bot reads supply report and location_osid; target/defense scoring uses supply state. |

---

## 10. Architect sign-off

Recommended canon changes (if any) from §3–§6 require **Architect (product architecture) sign-off** before adoption. This design doc is consistent with the full player-experience loop and determinism. Game Designer sign-off is additionally required for enclave resilience/hardening (§6).

---

## 11. References

- **Canon:** Systems_Manual_v0_5_0.md §14 (Logistics, supply, corridors); Engine_Invariants_v0_5_0.md §4 (Supply and Corridor Invariants); Phase_II_Specification_v0_5_0.md §8 (Supply Pressure); 20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md §2.2–2.3 (supply_mult).
- **Convene:** docs/40_reports/convenes/ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md.
- **Implementation:** src/state/supply_reachability.ts (computeSupplyReachability, SupplyReachabilityReport, FactionSupplyReachability; BFS; edges_used); src/state/supply_state_derivation.ts (deriveCorridors, deriveSupplyState, SupplyStateDerivationReport; by_settlement, adequate/strained/critical counts; deriveLocalProductionCapacity); src/state/game_state.ts (phase_ii_supply_pressure, supply_sources, formation.ops.last_supplied_turn, supply_rights); src/sim/turn_pipeline.ts (supply-resolution step; updatePhaseIISupplyPressure; context.report.supply_resolution); src/sim/combat/attack_resolution_osid.ts, src/sim/combat/combat_predictor.ts (getSupplyMult).
- **Bot:** docs/30_planning/design/BOT_AI_DESIGN_SPEC.md (shared intelligence supply connectivity, Phase 3 supply awareness, corridor_open, supply_isolation, enclave isolation awareness).
