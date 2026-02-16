# Integration and Systems Handover — External Expert

**Project:** A War Without Victory  
**Date:** 15 February 2026  
**Status:** Handover for implementation  
**Audience:** External expert implementing integration and missing systems  
**Goal:** Fully fleshed-out game with systems talking to each other and clear instructions/examples.

This document was produced by the Orchestrator after convening Paradox roles (Game Designer, Technical Architect, Canon Compliance Reviewer, Gameplay Programmer, PM). It merges:

1. **[DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md](../audit/DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md)** — systems/mechanics described in canon but not yet implemented or not in implementation plan  
2. **[WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL.md](../backlog/WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL.md)** — Warroom visual setup and Phase 0 gameplay execution

It provides **detailed integration description**, **interaction with existing systems**, **instructions and examples**, and **risk flags** (where proposed systems would shake up the current game too much, with pushback or alternatives).

---

## Table of Contents

**Part A: Warroom & Phase 0 integration**  
**Part B: Documented unimplemented systems — integration and interactions**  
**Part C: Risk flags and pushback**  
**Part D: Implementation order and dependencies**  
**Part E: Handover checklist and file list**

---

# Part A: Warroom & Phase 0 Integration

## A.1 Current state (what exists)

- **Phase 0 pipeline:** `src/phase0/` — capital, investment, stability, declaration pressure, referendum, `runPhase0Turn()`.  
- **Browser-safe advance:** `src/ui/warroom/run_phase0_turn.ts` — `runPhase0TurnAndAdvance(state, seed)`; used when `meta.phase === 'phase_0'`.  
- **Desktop:** `src/desktop/desktop_sim.ts` — `advanceTurn()` branches on `meta.phase`; for `phase_0` it calls `runPhase0TurnAndAdvance`.  
- **Warroom:** `src/ui/warroom/` — HQ scene, modals (newspaper, magazine, reports), clickable regions, calendar. Turn advance is **not** yet bound to calendar click in Phase 0; content is placeholder.

**Canon:** Phase 0 is fully specified in `docs/10_canon/Phase_0_Specification_v0_5_0.md`. The proposal document (WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL.md) is aligned with that spec; any deviation must be resolved with Game Designer and Canon Compliance.

## A.2 How Warroom/Phase 0 should integrate with existing systems

| Existing system | How Phase 0 / Warroom connects | Instruction |
|-----------------|--------------------------------|-------------|
| **Game state** | Phase 0 uses `meta.phase === 'phase_0'`, `meta.turn`, faction capital (prewar capital), organizational factors, stability scores, declaration pressure. State shape is in `src/state/game_state.ts`. New Phase 0–specific fields (if any) must be added to `GAMESTATE_TOP_LEVEL_KEYS` in `src/state/serialize.ts` and serialization. | Do not add duplicate keys; extend existing Phase 0 state from `src/phase0/` and scenario schema. |
| **Scenario loading** | Phase 0 scenarios (e.g. `sep_1991_phase0.json`) must set `start_phase: "phase_0"`, `phase_0_referendum_turn`, `phase_0_war_start_turn`, capital pools, initial organizational factors. Scenario loader: `src/scenario/scenario_loader.ts`; runner: `src/scenario/scenario_runner.ts`. | Add or extend scenario schema for Phase 0–only fields; keep Phase II scenarios unchanged. |
| **Desktop IPC** | `advance-turn` already runs Phase 0 advance when phase is `phase_0`. Warroom calendar click must invoke the same path (e.g. expose `advanceTurn` to renderer or trigger `advance-turn` from warroom). | Wire calendar click → same `advanceTurn` path used by desktop; no second implementation of turn logic. |
| **War Planning Map** | Proposal: “INVEST” layer on War Planning Map for capital allocation (click municipality → side panel with investment types, costs, confirm). Map is in `src/ui/warroom/` (map scene). Data: political control, settlements, municipalities from same sources as tactical map. | Add INVEST layer only when `meta.phase === 'phase_0'`; reuse existing map data loading; send allocations to state via existing state-update path (e.g. staging then apply on advance or immediate apply in directive phase). |
| **Phase 0 → Phase I transition** | Phase 0 spec defines escalation (sustained violence, monopoly collapse, hostile relationships). `src/phase0/referendum.ts` has `applyPhase0ToPhaseITransition`. Transition must run in the same pipeline that advances turns (e.g. after `runPhase0Turn` when escalation conditions met). | Ensure transition writes `meta.phase = 'phase_i'` (or `phase_ii` if scenario skips Phase I) and initializes Phase I/II state (control, formations, AoR) per scenario; do not leave phase in limbo. |

## A.3 Instructions and examples (Warroom / Phase 0)

**Example 1: Calendar click advances turn (Phase 0)**  
- **Current:** Calendar region exists; action may be no-op or not wired.  
- **Target:** On click, call the same advance path as desktop (e.g. `window.api.advanceTurn()` or internal callback that triggers `advance-turn` and then refreshes UI from new state).  
- **Instruction:** In `ClickableRegionManager` or warroom handler for `wall_calendar`, invoke advance; then update warroom state (capital, turn, newspaper/magazine/reports content) from the returned or stored game state. No `Date.now()` or `Math.random()`; use `meta.seed` if any RNG is ever introduced.

**Example 2: Capital allocation and state**  
- **Target:** Player allocates capital to investments (police, TO, party, paramilitary, coordinated) per municipality/region; state holds pending allocations and applied investments.  
- **Instruction:**  
  - Keep “pending allocations” in UI state or in a staging field on game state (e.g. `phase_0_pending_investments`) that is applied at the start of the next turn or at “Confirm” in directive phase.  
  - Apply via existing `applyInvestment()` (or equivalent) from `src/phase0/`; deduct from faction capital with `spendPrewarCapital()`.  
  - Validate constraints (hostile-majority, TO for RBiH only, etc.) in UI before allowing confirm; duplicate checks in pipeline for determinism.

**Example 3: Dynamic newspaper headline**  
- **Target:** Headlines reflect last turn’s events (declaration, authority degradation, investment, JNA, etc.).  
- **Instruction:** Implement a pure function `getHeadlinesForTurn(state, previousState, factionId): string[]` (or one headline + variant) that maps state deltas to template keys; use template strings with variables (municipality name, faction name). No randomness; same state → same headlines. Feed from `runPhase0Turn` output or from comparison of state before/after advance.

**Example 4: Phase 0 scenario file**  
- **Target:** New scenario `data/scenarios/sep_1991_phase0.json` (or similar) used when player chooses “Pre-War” or “September 1991” start.  
- **Instruction:** Schema must include `start_phase: "phase_0"`, `meta.phase_0_referendum_turn`, `meta.phase_0_war_start_turn`, and capital per faction; initial organizational penetration can come from `seed_organizational_penetration_from_control` or scenario-provided values. Load via existing `scenario_loader.ts`; runner must not run Phase II init when `start_phase === 'phase_0'`.

---

# Part B: Documented Unimplemented Systems — Integration and Interactions

## B.1 Systems already in pipeline (scaffolded) and what’s missing

These modules are **already imported and called** in `src/sim/turn_pipeline.ts` (or state pipelines). Integration means **wiring their outputs into other systems** and **enforcing invariants**, not adding new entrypoints.

| System | Current use in pipeline | What’s missing for “full” integration | Interacts with |
|--------|--------------------------|----------------------------------------|----------------|
| **Legitimacy** | `updateLegitimacyState()`; report only | Use legitimacy in authority consolidation, recruitment efficiency, exhaustion. Engine Invariants §16.A: control ≠ legitimacy; military success cannot increase legitimacy. | Authority (`formation_lifecycle`, `authority_degradation`), recruitment (capital formula), exhaustion |
| **Patron / IVP** | `ensureInternationalVisibilityPressure`, `updateInternationalVisibilityPressure`, `updatePatronState`; reports | Feed IVP into exhaustion and negotiation thresholds; patron state constrains options (no control flips from patrons). | Exhaustion, negotiation capital, Washington Agreement / milestones |
| **Embargo** | `updateEmbargoProfiles()`; recruitment uses profiles | Enforce equipment/ammo ceilings in recruitment and equipment effects; differential (not binary) per faction. | Recruitment (`recruitment_engine`, equipment accrual), `equipment_effects` |
| **Heavy equipment / maintenance** | `updateHeavyEquipmentState()`, `ensureMaintenanceCapacity()` | Phase II spec §12: “maintenance module is not yet integrated with the typed equipment system.” Wire degradation to formation equipment state and pressure/combat. | `equipment_effects`, formation state, pressure/combat |
| **Enclave integrity** | `updateEnclaveIntegrity()`; report (humanitarian_pressure_total) | Decay integrity under siege; feed humanitarian pressure into IVP; collapse triggers deterministic. | Patron/IVP, exhaustion |
| **Sarajevo exception** | `updateSarajevoState()`; report | Dual-channel supply; integrity floors; Sarajevo siege visibility → IVP; treaty clauses. | IVP, supply, negotiation (treaty clauses) |
| **Negotiation capital** | `updateNegotiationCapital()`; treaty acceptance exists | “Liabilities cheaper” valuation; required clauses (Brčko, Sarajevo) enforced; acceptance computed not chosen. | Treaty acceptance, territorial valuation, Phase O end-state |
| **Phase 3A/3B/3C** | Phase 3A eligibility + diffusion feature-gated; Phase 3B/3C/3D imported and gated | Enable 3B (pressure → exhaustion coupling) and 3C (exhaustion → collapse gating) in pipeline; 3D collapse resolution. Ensure no double-counting of exhaustion with existing `accumulateExhaustion`. | `front_pressure`, `exhaustion`, collapse (3D), authority/fragmentation |

## B.2 Integration order (recommended)

To avoid breaking the current game and to respect dependencies:

1. **Phase 0 + Warroom (proposal Parts A & B)** — No change to Phase II; adds playable pre-war loop and warroom content.  
2. **Legitimacy wiring** — Read legitimacy in authority and recruitment; keep legitimacy update as-is initially; add modifiers (e.g. recruitment efficiency = f(legitimacy)).  
3. **IVP → exhaustion and negotiation** — Add IVP as an input to exhaustion accumulation and to negotiation capital formula; keep patron state as constraint (no new control flips from it).  
4. **Embargo enforcement** — Enforce ceilings in recruitment and equipment only; no new combat rules yet.  
5. **Phase 3B then 3C** — Enable 3B (pressure→exhaustion) with a feature flag; then 3C (collapse gating); reconcile with existing exhaustion step to avoid double-counting.  
6. **Heavy equipment + maintenance** — Integrate with typed equipment in formations and with pressure/combat (per Phase II spec).  
7. **Enclave → IVP** — Enclave humanitarian pressure already in report; feed that value into IVP update.  
8. **Sarajevo → IVP and treaties** — Sarajevo visibility into IVP; treaty rejection if Sarajevo clause missing.  
9. **Negotiation capital full** — Liabilities cheaper; required clauses; acceptance computed.  
10. **Remaining** — Doctrines wiring, phase_ii_exhaustion_local, JNA equipment transfer, OG donor return, MCZs, etc., in later waves.

## B.3 Interaction matrix (who reads whom)

| Consumer | Reads from | Contract |
|----------|------------|----------|
| Authority consolidation | Legitimacy (per settlement or mun) | Low legitimacy caps authority at Contested (Engine Invariants §16.A). |
| Recruitment (capital formula) | Legitimacy, embargo | Capital accrual uses legitimacy; equipment accrual uses embargo profile. |
| Exhaustion | IVP, pressure (3B), command friction | IVP and pressure add to exhaustion; friction multiplies. |
| Negotiation capital | Exhaustion, IVP, patron | Capital = f(exhaustion, IVP, patron); required clauses block acceptance. |
| Washington Agreement | IVP, patron, RBiH–HRHB exhaustion, RS threat | Precondition-driven milestone; already in `washington_agreement.ts`. |
| Battle resolution (Phase II) | Equipment state, maintenance | Combat power uses equipment; maintenance can slow degradation. |
| Enclave integrity | Settlement graph, control, supply | Detect enclaves; decay under siege; output humanitarian pressure → IVP. |
| Sarajevo | Sarajevo cluster muns, siege state | Integrity floor; visibility → IVP; treaty clause. |

Implement so that **each system reads from state that is written in a prior pipeline step** (deterministic order). No circular dependencies; if A needs B and B needs A, introduce a “previous turn” snapshot or a single combined step.

## B.4 Instructions and examples (missing systems)

**Example 5: Legitimacy in recruitment**  
- **Current:** Recruitment capital formula may use organizational inputs; legitimacy exists in state.  
- **Target:** Recruitment efficiency (capital accrual) scales with average legitimacy in controlled municipalities (or in recruitment facility municipalities).  
- **Instruction:** In the module that computes capital accrual (e.g. recruitment_engine or recruitment_turn), read `state.legitimacy_state` (or equivalent); compute a multiplier in [0.5, 1.0] from average legitimacy; multiply accrual by it. No new state keys for this step; read-only. Document in Systems Manual implementation-note.

**Example 6: IVP into exhaustion**  
- **Current:** Exhaustion accumulates from supply, fronts, etc.; IVP is updated separately.  
- **Target:** IVP contributes to faction-level exhaustion (e.g. exhaustion_delta += k * IVP).  
- **Instruction:** In `accumulateExhaustion` (or the step that calls it), read IVP from state after `updateInternationalVisibilityPressure` has run; add a deterministic term to exhaustion delta per faction. Keep monotonicity: IVP term ≥ 0.

**Example 7: Phase 3B without double-counting exhaustion**  
- **Current:** `accumulateExhaustion` exists; Phase 3B applies pressure→exhaustion.  
- **Target:** Phase 3B adds exhaustion from pressure field; total exhaustion remains single source of truth.  
- **Instruction:** Either (a) make Phase 3B the only source of pressure-driven exhaustion and remove that part from `accumulateExhaustion`, or (b) make Phase 3B additive and ensure `accumulateExhaustion` does not add the same pressure again. Prefer (a) for single responsibility. Gate with `getEnablePhase3B()`; default OFF until validated.

**Example 8: Treaty rejection for missing Sarajevo clause**  
- **Current:** Treaty acceptance and peace-triggering exist; Brčko clause is enforced.  
- **Target:** Treaties that are peace-triggering must include Sarajevo control clause; otherwise reject with reason.  
- **Instruction:** In the same place where Brčko is checked, add a check for Sarajevo clause (per Engine Invariants §16.G). Reject with `rejection_reason = 'sarajevo_unresolved'` (or similar). No change to state shape; logic only.

---

# Part C: Risk Flags and Pushback

The following items could **shake up the current game** or conflict with existing design. Implementer should flag these and seek alignment before large changes.

## C.1 High impact — recommend phasing or alternatives

| Item | Risk | Recommendation |
|------|------|-----------------|
| **Phase 3B/3C enabled by default** | Current runs have no 3B/3C; enabling them changes exhaustion and can trigger collapse/authority effects. Run outcomes will diverge. | Keep 3B/3C **feature-gated** (OFF by default). Add scenario flag `enable_phase3b` / `enable_phase3c`; document in scenario schema. Run A/B comparisons before turning ON for canonical scenarios. |
| **Full command degradation (Systems Manual §8)** | “Delays, partial compliance, non-execution” could invalidate player orders and make the game feel unfair. | Implement as **modifiers only** (e.g. command friction already exists). Do not add random non-execution of orders; use deterministic friction multipliers. If full degradation is required by canon, add as optional scenario flag. |
| **Intra-side political fragmentation** | Faction splintering, refusal to support, divergent negotiation would require new state and AI; large scope. | Defer to post–Phase O or treat as **narrative only** until state model is defined. Do not introduce faction sub-factions without Game Designer and canon update. |
| **MCZs (Municipal Control Zones)** | New spatial unit (municipality fragments); would affect control, AoR, and map. | Defer or implement as **report-only** (detect and display) until canon and REPO_MAP explicitly add MCZ state. |
| **Player action constraints (forbidden but attemptable; penalties)** | Could confuse players if actions are allowed but penalized. | Implement only for clearly documented actions (e.g. “attack ally”) with tooltip and penalty explanation; do not add broad “forbidden but attemptable” layer without UX spec. |

## C.2 Medium impact — clarify with design

| Item | Risk | Recommendation |
|------|------|-----------------|
| **Phase 0 supply activation** | Phase 0 spec says “Activate supply systems; logistics not yet militarized.” Current Phase 0 has no supply. | Either implement minimal supply (e.g. corridor state read-only for display) or explicitly document that supply is Phase I+ only. Avoid half-implemented supply in Phase 0. |
| **Contested control initialization (SECURE/CONTESTED/HIGHLY_CONTESTED)** | Phase 0 stability produces control status; carry-over into Phase I flip resistance is not fully specified. | Implement carry-over per Engine Invariants §16.K only if Phase I spec or implementation-notes define how resistance uses it; otherwise leave as Phase 0 output only. |
| **JNA equipment transfer to RS** | Would change RS brigade composition at start of Phase II; affects balance. | Implement as optional scenario or OOB option; do not change default historical scenario without historical fidelity review. |
| **OG donor proportional return** | Current behavior (equal return to same-corps) is simpler; proportional return is more realistic but more complex. | Low priority; implement only if OG usage becomes common and imbalance is observed. |

## C.3 Do not do (without explicit approval)

- **Do not** add `Math.random()` or `Date.now()` to any simulation or pipeline step.  
- **Do not** serialize derived state (corridors, fronts, PhaseIIFrontDescriptor) per Engine Invariants §13.1.  
- **Do not** change Phase II combat or AoR rules to “fix” Phase 0 or missing systems.  
- **Do not** edit canon docs (Phase specs, Systems Manual, Engine Invariants) unless following an approved canon change process.  
- **Do not** remove or bypass determinism tests; add tests for new behavior.

---

# Part D: Implementation Order and Dependencies

Unified order merging Warroom/Phase 0 proposal and systems integration.

| Phase | Work | Depends on | Effort (est.) |
|-------|------|------------|----------------|
| **A1** | Warroom assets (clean bg + 5 sprites) per proposal §2 | Asset brief | External 2–4 h |
| **A2** | Regions JSON v1.1 + ClickableRegionManager sprites | — | 2 h |
| **A3** | Warroom render pipeline (sprites, order) | A2 | 3 h |
| **A4** | Region authoring and test 8 regions | A1 | 1 h |
| **B1** | Phase 0 turn pipeline completion (capital, investment, declaration, authority, stability, escalation) | Phase 0 Spec | 8–12 h |
| **B2** | Wire calendar click → advance-turn (Phase 0) | B1, A4 | 2 h |
| **B3** | Capital allocation UI (War Planning Map INVEST layer) | B1, map | 6–8 h |
| **B4** | Dynamic newspaper/magazine/reports content | B1 | 4+3+3 h |
| **B5** | News ticker events (hand-authored) | — | 2 h |
| **B6** | Phase 0 → Phase I transition event and state handoff | B1, Phase I | 4 h |
| **C1** | Legitimacy wiring (authority, recruitment) | Current legitimacy step | 4 h |
| **C2** | IVP → exhaustion and negotiation | Current IVP/patron steps | 4 h |
| **C3** | Embargo enforcement (ceilings in recruitment/equipment) | Current embargo step | 2 h |
| **C4** | Phase 3B enable + gate; reconcile with exhaustion | Phase 3B module | 4 h |
| **C5** | Phase 3C enable + gate | Phase 3C module | 4 h |
| **D1** | Sarajevo/Enclave → IVP; treaty Sarajevo clause | Enclave/Sarajevo steps | 4 h |
| **D2** | Negotiation capital full (liabilities, clauses) | Current negotiation capital | 4 h |
| **D3** | Heavy equipment + maintenance ↔ equipment_effects | heavy_equipment, maintenance | 8 h |

Critical path: **A1 → A4** (visual); **B1 → B2 → B3** (Phase 0 playable). C* and D* can run after B6.

---

# Part E: Handover Checklist and File List

## E.1 Files the external expert must read first

1. This document (full).  
2. `docs/40_reports/audit/DOCUMENTED_UNIMPLEMENTED_SYSTEMS_AUDIT_2026_02_15.md`  
3. `docs/40_reports/backlog/WARROOM_SETUP_AND_PHASE0_EXECUTION_PROPOSAL.md`  
4. `docs/10_canon/Phase_0_Specification_v0_5_0.md`  
5. `docs/10_canon/Engine_Invariants_v0_5_0.md` (§13–17)  
6. `docs/10_canon/Systems_Manual_v0_5_0.md` (§1–23)  
7. `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`  
8. `docs/20_engineering/REPO_MAP.md` and `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`  
9. `src/sim/turn_pipeline.ts` (structure and step order)  
10. `src/phase0/` (all)  
11. `src/ui/warroom/` (all)  
12. `src/desktop/desktop_sim.ts`  

## E.2 What not to touch (without approval)

- Phase II combat, AoR, supply resolution (except where explicitly wiring equipment/maintenance).  
- Tactical map (`src/ui/map/`) — separate from warroom.  
- Scenario files under `data/scenarios/` — add new Phase 0 scenario; do not alter canonical Phase II scenarios without approval.  
- Canon documents under `docs/10_canon/`.  
- Determinism: no `Date.now()`, no `Math.random()` in pipeline or state evolution.

## E.3 Deliverables expected from external expert

- Working Phase 0 playthrough (warroom → calendar advance → capital allocation → dynamic content → transition to Phase I when escalation met).  
- Warroom visual refresh (clean bg + sprites, aligned regions) per proposal.  
- For systems integration (C/D): feature flags where specified; no regression in existing Phase II runs; run_summary or equivalent still valid.  
- Short implementation report listing what was implemented, what was deferred, and any canon or design questions raised.

---

*End of handover. For backlog and consolidated views, see [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md) and [CONSOLIDATED_IMPLEMENTED.md](../CONSOLIDATED_IMPLEMENTED.md).*
