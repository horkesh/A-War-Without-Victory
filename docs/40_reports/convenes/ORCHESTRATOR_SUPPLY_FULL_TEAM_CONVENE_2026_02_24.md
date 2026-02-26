# Orchestrator Convene: Supply System — Full Paradox Team

**Date:** 2026-02-24  
**Source:** User request — "deal with supply, but properly"; convene entire Paradox team; read background docs and latest bot/brigade installments; consider full war duration; innovative solutions, fun (not bogged down); simulate ARBiH cut-off survival (1993, two armies) and emerging tougher.  
**Purpose:** Produce a coherent supply design that is implementable, historically grounded, and player-friendly, with innovative proposals from the full team.

---

## 1. Convene mandate

**Orchestrator:** Convene the **entire Paradox team** for supply system design. Gather input from every relevant role. Synthesize into:
- Shared understanding of existing supply canon and gaps
- Innovative proposals (not just "more of the same") that are fun and simulate full-war dynamics
- Explicit treatment of ARBiH survival when cut off (e.g. 1993, two armies) and emerging tougher
- Single agreed priority and phased plan (or handoff to PM)

**Out of scope for this convene:** Implementation code; canon edits without Game Designer/Canon Compliance sign-off.

---

## 2. Background already assembled (pre-read for roles)

### 2.1 Supply canon (Systems Manual §14, Engine Invariants §4)

- **Supply states:** Adequate, Strained, Critical (reachability from faction sources; corridor state).
- **Corridor states:** Open, Brittle, Cut. Corridors derived per faction; dependency, capacity, redundancy.
- **Tracing:** BFS from supply sources through faction-controlled nodes; result = reachable vs isolated.
- **Enclaves:** Same reachability rules; narrow corridors or airlift; enclave integrity in §16.
- **Attack resolution:** supply_mult in combat power — Adequate 1.0, Strained 0.7/0.8, Critical 0.4/0.5 (attacker/defender).
- **Invariants:** Supply recovery slower than degradation; no improvement without connectivity/authority; brittle = continuous penalties; junction loss alone must not collapse corridor unless dependency thresholds crossed.
- **Local production (§14.6, §15):** Mitigates but does not replace corridor supply; capacity degrades under stress.

### 2.2 Phase II integration (Phase II Spec §8)

- **Supply pressure:** Monotonic; sources = overextension (front edges) + **isolation** (critical/strained from supply report).
- **Exhaustion:** From static fronts and supply pressure; irreversible.
- **Command friction:** Scales supply pressure and exhaustion deltas; never flips control.
- **Pipeline:** supply-resolution produces SupplyStateDerivationReport (adequate/strained/critical counts); Phase II consumes for isolation. OSID-level supply for attack resolution may be derived from formation location_osid until OSID-native supply exists.

### 2.3 Known gaps (DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT)

- **Corridor collapse and cascade:** "Full collapse cascade semantics (e.g. Posavina, Route Duck Tuzla–Zenica, Sarajevo over Igman/Bjelasnica) are design intent"; "full cascade propagation across dependent regions not yet fully confirmed."
- **Supply in UI:** FactionOverviewPanel shows "Supply (days)" as single number; no corridor state, brittleness, or isolation (STRATEGIC_DESIGN_COUNCIL_AUDIT).

### 2.4 Bot AI and brigades (BOT_AI_DESIGN_SPEC, latest installments)

- **Brigades:** OSID-native; one location_osid per formation; posture, attack, ZoC; combat power includes supply_mult.
- **ARBiH bot:** Phases — Survival Defense (0–12), Active Defense (12–40), Stretch the Front (40–80), Controlled Counteroffensive (80+). "Survive the equipment gap"; "pinprick everywhere" (weeks 40–80); counter-attack exploitation; **enclave isolation awareness** ("if enclave's last supply route is threatened, ALL brigades in that sector shift to DEFEND"); **5th Corps (Bihać pocket):** "Survive in encirclement"; "Civilian awareness extreme."
- **Shared intelligence:** Chokepoint detection, **supply connectivity** (BFS from faction HQ through friendly OSIDs), salient detection, encirclement risk, civilian weight. **Phase 3 (Polish):** "Supply awareness — BFS supply trace through OSID graph, supply_mult prediction."
- **VRS:** Corridor defense (Posavina existential); "If any Posavina corridor OSID is threatened, all adjacent brigades shift to DEFEND."

### 2.5 Knowledge base (Supply_and_Exhaustion)

- Supply traces through corridors or local production; recovery slower than degradation.
- Corridors Open/Brittle/Cut; exhaustion monotonic, irreversible; brittle/cut supply increases exhaustion.

### 2.6 User brief (authoritative for this convene)

- **Properly:** Not superficial; full war duration, not only first 6 months.
- **Innovative solutions:** Proposals that are fresh and effective, not incremental tweaks.
- **Fun:** Player should not get bogged down; supply should add meaningful decisions and tension without micromanagement.
- **ARBiH narrative:** Simulate how ARBiH, even when completely cut off and fighting two armies at once in 1993, **survived** and **came out tougher** (enclaves, Bihać, central Bosnia; local production, smuggling, adaptation; exhaustion and morale that harden rather than only punish).

---

## 3. Questions for the team (Orchestrator to assign)

| Role | Question / mandate |
|------|--------------------|
| **Game Designer** | What supply mechanics (sources, corridors, enclaves, local production, degradation) best support the ARBiH "cut off but surviving and hardening" narrative without making the game a logistics puzzle? How do we make "strained" and "critical" create interesting choices (e.g. hold vs withdraw, prioritize corridor vs front)? |
| **Architect** | How does supply touch the full loop (engine state → pipeline → IPC → adapter → renderer → player)? What is the minimum viable supply UX so the player feels supply matter without getting bogged down? What phased implementation (e.g. corridor derivation → cascade → UI) fits the rest of the roadmap? |
| **Historian** | What does the record say about ARBiH supply when cut off (Bihać, eastern enclaves, central Bosnia 1993)? Corridors (Route Duck, Igman, airlift), local production, smuggling, adaptation over time. Citations (BB1/BB2 or other KB) for design constraints. |
| **Technical Architect** | What state and pipeline changes does a proper supply system require (OSID-native trace, cascade, supply_mult wiring)? What stays read-only vs mutating? Contract impact for IPC and adapters. |
| **Gameplay Programmer** | What pipeline steps exist today (supply-resolution, computeSupplyReachability)? What is missing for cascade and OSID-level supply_mult in attack resolution? Determinism and ordering constraints. |
| **Systems Programmer** | Engine Invariants §4 compliance: recovery &lt; degradation, dependency thresholds for corridor collapse. Determinism of supply trace and cascade. |
| **Formation-expert** | How does supply interact with brigade activation, reinforcement, and recruitment (formation constants, pool population)? Any gates (e.g. no activation in Critical) that would break current scenarios? |
| **Scenario-creator-runner-tester** | What supply assumptions do current scenarios (e.g. apr1992_definitive_52w) rely on? How would enclave/corridor states affect 20w/52w checkpoint validity? |
| **QA Engineer** | Test strategy for supply: determinism, regression (same seed → same supply state), acceptance criteria for "cut-off but surviving" behavior. |
| **Product Manager** | Scope and phasing: what is the minimum viable supply slice that delivers "supply matters" and "ARBiH can survive cut-off"? What can be deferred to a later phase? |

---

## 4. Deliverables (from convene)

1. **Synthesized summary** — Where supply stands (canon vs implemented vs gap); team consensus on ARBiH narrative and fun vs micromanagement.
2. **Innovative proposals** — At least 2–3 concrete design ideas (e.g. "enclave resilience" curve, "corridor priority" player choice, "local production in pockets," supply_mult in bot target scoring) with owner and feasibility note.
3. **Single priority** — One agreed next step (e.g. "Supply design doc with cascade + enclave rules" or "Phase 1: OSID supply trace + supply_mult in combat; Phase 2: cascade; Phase 3: UI") and owner.
4. **Report** — Place in `docs/40_reports/convenes/` with name `ORCHESTRATOR_SUPPLY_FULL_TEAM_CONVENE_2026_02_24.md`. Update CONSOLIDATED_BACKLOG and README convenes list; append PROJECT_LEDGER entry.

---

## 5. References

- Systems_Manual_v0_5_0.md §14, §15, §16, §17
- Phase_II_Specification_v0_5_0.md §8
- Engine_Invariants_v0_5_0.md §4
- 20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md §2.2–2.3
- BOT_AI_DESIGN_SPEC.md (ARBiH §5, VRS §4, shared §3; Phase 3 supply awareness)
- docs/knowledge/AWWV/Projects/Systems/Supply_and_Exhaustion/README.md
- DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md (corridor cascade)
- STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md (supply in UI)
- 20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md §1.3 (Supply specification)

---

## 6. Status

**Opened:** 2026-02-24.  
**Executed:** 2026-02-24.  
**Outcome:** Full-team input synthesized; innovative proposals documented; single priority agreed. Report and backlog/ledger updated.  
**Supply design doc created:** docs/30_planning/SUPPLY_DESIGN.md (2026-02-24).

---

## 7. Team input and synthesis

### 7.1 Where supply stands (canon vs implemented vs gap)

- **Canon:** Systems Manual §14 (sources, OSID tracing, Adequate/Strained/Critical, corridors Open/Brittle/Cut, enclave supply, supply_mult 1.0 / 0.7–0.8 / 0.4–0.5), §15 local production (mitigates, degrades under stress), §16 enclaves; Engine Invariants §4 (recovery &lt; degradation, dependency thresholds, junction loss alone does not collapse corridor); Phase II Spec §8 (supply pressure from overextension + isolation; exhaustion from static fronts + supply pressure).
- **Implemented:** Pipeline step **supply-resolution** (computeSupplyReachability, deriveCorridors, deriveSupplyState, local production report); Phase II consumes SupplyStateDerivationReport for isolation → updatePhaseIISupplyPressure; attack resolution uses **supply_mult** via last_supplied_turn heuristic (≤2 turns = 1.0, else 0.4 attacker / 0.5 defender) — not yet OSID-level supply state from trace. Desktop query-supply-paths; 3D supply overlay; FactionOverviewPanel "Supply (days)" single number.
- **Gaps:** Full corridor collapse cascade not confirmed (DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT); OSID-native supply trace and per-OSID supply state for combat not wired; UI does not show corridor state, brittleness, or isolation; no "hardening" or enclave-resilience curve; bot supply awareness (BFS, supply_mult prediction) in BOT_AI Phase 3 polish.

### 7.2 Per-role summary

| Role | Input (synthesized from convene questions and canon/code/KB) |
|------|----------------------------------------------------------------|
| **Game Designer** | Supply should create interesting choices (hold vs withdraw, corridor vs front) without becoming a logistics puzzle. Strained/Critical should matter for combat and cohesion but not block the "cut off but surviving and hardening" narrative. Local production and enclave-specific rules (per §14.4, §16) can soften pure corridor dependency so ARBiH can survive when cut off and emerge tougher over full war duration. |
| **Architect** | Full loop: state → supply-resolution (canonical today) → report → Phase II pressure/exhaustion; attack resolution reads supply_mult (currently last_supplied_turn). Minimum viable supply UX: player sees corridor state (open/brittle/cut) and isolation at a glance (e.g. one panel or map layer), not per-settlement micromanagement. Phasing: (1) OSID supply trace + supply_mult in combat, (2) cascade semantics, (3) UI for corridors + enclave state. |
| **Historian** | BB1 p.404 and PATTERN_REPORT: Bihać as enclave/pocket; Srebrenica, Žepa, Goražde "survived as enclaves when surrounded." User brief and design intent: ARBiH survived when completely cut off (1993, two armies) via corridors (Route Duck Tuzla–Zenica, Sarajevo over Igman/Bjelasnica), local production, smuggling, adaptation; exhaustion/morale that harden rather than only punish. Design constraints: enclave supply by same reachability rules; narrow corridor or airlift; full cascade semantics for Posavina, Route Duck, Sarajevo are design intent (Systems Manual §14.3). |
| **Technical Architect** | State: supply_sources per faction; SupplyStateDerivationReport (adequate/strained/critical counts); optional per-OSID supply state when OSID is base. Pipeline: supply-resolution already produces report; add OSID-level derivation when operational graph is authoritative; cascade = dependent region transitions on critical edge loss (deterministic, stable ordering). Contract: IPC already has query-supply-paths; adapters can expose corridor/enclave state without new mutating APIs. |
| **Gameplay Programmer** | supply-resolution exists; computeSupplyReachability uses controlled set (currently legacy AoR-derived; should use control + location_osid for Phase II). Missing: OSID-keyed supply state output; wiring formation location_osid → supply state → getSupplyMult in attack_resolution_osid and combat_predictor; cascade propagation step. Determinism: BFS and corridor derivation already use sorted iteration; any new step must preserve stable ordering and no RNG/timestamps. |
| **Systems Programmer** | Engine Invariants §4: supply recovery &lt; degradation; no improvement without connectivity/authority; brittle = continuous penalties; junction loss alone must not collapse corridor unless dependency thresholds crossed. Supply trace and cascade must be deterministic (sorted faction/settlement/edge order; no timestamps). |
| **Formation-expert** | Supply gates: formation lifecycle already has "supply-sensitive" (militia -3 cohesion when unsupplied) and activation grace (BRIGADE_FORMATION_MAX_WAIT so supply cannot permanently block activation). No new gate that would break current scenarios (e.g. "no activation in Critical") without design decision; local production and enclave resilience can keep enclave formations active. Recruitment/reinforcement use equipment and capital; supply state can modulate effectiveness (supply_mult) rather than hard-gating activation. |
| **Scenario-creator-runner-tester** | apr1992_definitive_52w and 20w checkpoints do not rely on OSID supply state today (getSupplyMult is last_supplied_turn-based). Once OSID supply trace is in, enclave/corridor states may change pressure and combat outcomes; 20w/52w checkpoint validity should be re-checked after supply design is implemented. Baseline strategy (TEST_BASELINE_STRATEGY.md) applies: no auto-rebaseline; sign-off before baseline refresh. |
| **QA Engineer** | Test strategy: determinism (same seed → same supply state); regression tests for supply_resolution output shape and Phase II pressure/exhaustion inputs; acceptance criteria for "cut-off but surviving" = ARBiH enclaves (e.g. Bihać, eastern) can remain in Critical/Strained without auto-collapse, and combat uses supply_mult correctly. |
| **Product Manager** | Minimum viable slice: "supply matters" = (1) OSID supply trace + supply_mult in combat, (2) player-visible corridor/enclave state (one panel or layer). "ARBiH can survive cut-off" = design that allows enclaves to persist (local production, enclave resilience or hardening) and optionally harden. Defer to later phase: full cascade UI drill-down, corridor priority player choice as explicit action, heavy local-production simulation. |

### 7.3 Innovative proposals

1. **Enclave resilience curve**  
   Enclaves (Bihać, Srebrenica, Žepa, Goražde) get a **resilience** value that starts low when first isolated and can grow over turns (bounded) while cut off — representing local adaptation, smuggling, and morale. Effect: reduce exhaustion accumulation or improve cohesion recovery in enclaves only, so "survived and came out tougher" is modeled without inventing new victory mechanics. *Owner:* Game Designer (design); Gameplay Programmer (implementation). *Feasibility:* Medium; requires enclave detection (existing or extended), one new state field or report, deterministic formula.

2. **Corridor state in UI without micromanagement**  
   Single view: **corridor state** (Open / Brittle / Cut) and **isolation summary** (e.g. "3 regions strained, 1 critical") per faction, plus optional one-click "show threatened corridors" on map. No per-settlement supply micromanagement; player sees where to defend or relieve. *Owner:* Architect (UX); UI/UX or Graphics (implementation). *Feasibility:* High; data already in supply report; adapter + one panel or map layer.

3. **supply_mult in bot target scoring and enclave/corridor defense**  
   BOT_AI_DESIGN_SPEC already has enclave isolation awareness and corridor_open / supply_isolation in target scoring. Add **supply_mult** (and predicted supply state) to attack/defend scoring so bots prefer to attack supplied and defend corridor/enclave chokepoints. Phase 3 "Supply awareness — BFS supply trace, supply_mult prediction" becomes part of the supply implementation slice. *Owner:* Gameplay Programmer (with bot rewrite owner). *Feasibility:* High once OSID supply state exists; formula already in attack resolution.

4. **"Hardening" mechanic (optional)**  
   In enclaves or after N turns strained/critical: **hardening** gives a small defense or cohesion-recovery bonus (e.g. resilience_mult or cohesion recovery +X in strained regions only), representing adaptation under stress. Keeps exhaustion punitive globally but allows enclaves to resist collapse and feel "tougher." *Owner:* Game Designer (design); Gameplay Programmer (implementation). *Feasibility:* Medium; must be bounded and deterministic to avoid runaway advantage.

### 7.4 Single priority

**Agreed next step:** Produce a **Supply design doc** that specifies: (1) OSID-level supply trace and per-OSID supply state derivation, (2) wiring of supply state to supply_mult in attack resolution and combat predictor, (3) corridor collapse and cascade semantics (dependency thresholds, deterministic propagation), (4) enclave supply and optional enclave resilience/hardening rules, (5) minimum viable supply UX (corridor state + isolation summary). The design doc will be the single source for implementation phasing (Phase 1: trace + supply_mult; Phase 2: cascade; Phase 3: UI + optional resilience/hardening).

**Owner:** Technical Architect (lead author); Game Designer (narrative and enclave/hardening rules); Architect (UX and phased implementation fit). PM to sequence implementation after design doc sign-off.

**Determinism:** All supply logic must remain deterministic: stable ordering for sets/maps, no timestamps or RNG in supply trace, cascade, or supply_mult.

### 7.5 Open questions

- Whether "local production in pockets" is a first-phase data model (e.g. per-OSID or per-mun capacity) or deferred until after OSID supply trace.
- Exact formula for enclave resilience curve (growth rate, cap, interaction with exhaustion) — Game Designer to propose in design doc.
- Whether corridor "priority" is a player choice (e.g. designate which corridor to reinforce first) or emerges from bot/engine only for this MVP slice — PM/Game Designer to decide scope.
