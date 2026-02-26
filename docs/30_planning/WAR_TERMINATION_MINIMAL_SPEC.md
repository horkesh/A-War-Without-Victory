# War Termination Minimal Spec (1.1)

**Date:** 2026-02-24  
**Status:** Draft for Architect review  
**Source:** [ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md](../40_reports/convenes/ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md)  
**Canon alignment:** Phase II Specification v0.5.0 §11.2; Systems Manual v0.5.0 §20, System 1 (IVP + Patron), System 7 (Negotiation Capital).

---

## 1. Purpose and scope

This document specifies the **minimal** design for war termination and end-game: when and how the game ends via a Dayton-style negotiated settlement, what is traded, how faction goals shape negotiation, and how recurring peace initiatives behave until preconditions are met. It extends Phase II §11.2 and aligns with Systems Manual §20 and Systems 1 & 7. Exact thresholds, formulas, and initiative timing are **TBD** in a follow-on design pass.

---

## 2. End state: Dayton-style negotiated settlement

- The game ends when a **negotiated settlement** is reached: a treaty is **accepted by all parties** (RBiH, RS, HRHB) per the acceptance computation (Systems Manual §20.4, System 7).
- The outcome is **Dayton-style**: territorial trade-offs plus institutional competences (e.g. defence_policy, customs, education_policy per §20.3), with **Brčko status** explicitly resolved (Systems Manual §20.2: any peace-triggering treaty must include brcko_special_status or it is rejected).
- **No total victory.** No faction achieves full military or political victory; the result is a balancing act among faction goals leading to peace (Rulebook §15; Phase II §11.2).
- Once the treaty is accepted, **all war dynamics stop**; the game is in an end state (Systems Manual §20.2).

---

## 3. Tradeables

Parties negotiate over:

- **Territories:** Control or transfer of settlements/municipalities (transfer_settlements, recognize_control_settlements per §20.2). Territorial valuation is per System 7 (negotiation_state, territorial valuation).
- **Points accrued:** Negotiation capital accumulated during the war from exhaustion, IVP, and patron pressure (System 7). Used to value offers and to determine accept/counter behavior.
- **Institutional competences:** Allocation of competence IDs (e.g. police_internal_security, defence_policy, education_policy, customs, indirect_taxation, currency_authority, international_representation). Certain competences are bundled (customs + indirect_taxation; defence_policy + armed_forces_command) per §20.3.

Acceptance is **deterministic** (System 7: same state and proposal → same decision and counter_offer).

---

## 4. Faction goal hierarchy

Faction goals define **preference order** for valuing offers and shaping accept/counter behavior. First preference is typically unreachable; second preference is the realistic negotiation target.

| Faction | First preference (almost impossible) | Second preference (negotiation target) |
|---------|--------------------------------------|----------------------------------------|
| **RS**  | Independence                         | As much **autonomy** as possible        |
| **HRHB**| Third entity (separate from Federation) | **Strengthening of cantons** within the Federation of BiH |
| **RBiH**| —                                    | **Strengthen state-level institutions** as much as possible |

Implementation uses this hierarchy to derive competence_factor and territorial valuation in the acceptance computation (System 7; §20.4). Exact weighting and formulas are TBD in follow-on design.

---

## 5. Recurring peace initiatives

- **Throughout the game**, peace initiatives can appear (historically, multiple initiatives occurred before Dayton).
- When a **negotiation window** is open (Systems Manual §20.1: exhaustion, fragmentation, international pressure), players/bots **can negotiate** — i.e. propose or respond to treaty terms.
- **Success remains low** until preconditions are met: early initiatives typically result in reject or counter rather than accept, reflecting historical failure of early talks.
- When preconditions are sufficiently satisfied, the **same acceptance computation** can yield accept, ending the war. Determinism is preserved: same state and proposal → same outcome.

---

## 6. Preconditions (conceptual)

The following **conceptual levers** determine when negotiation success becomes possible. Exact **thresholds and formulas** are TBD in a follow-on design pass (Game Designer / Gameplay Programmer). Systems Manual System 1 and System 7 already define state and formulas that can be used; this spec names the levers and defers numeric detail.

| Lever | Description | Canon reference |
|-------|-------------|-----------------|
| **IVP (international visibility pressure)** | Sarajevo siege visibility, enclave humanitarian pressure, atrocity visibility; negotiation_momentum. | System 1: international_visibility_pressure; adjusted_negotiation_threshold. |
| **Patron pressure** | Patron commitment, constraint_severity, diplomatic isolation. | System 1: patron_state. |
| **Exhaustion** | Per-faction exhaustion (phase_ii_exhaustion); cumulative and irreversible. | Phase II §9; Engine Invariants §8; System 1 (exhaustion_external_modifier). |
| **Army strength (relative balance)** | Relative military strength or territorial control share (e.g. RS threat share as in Washington precondition). | To be defined in follow-on (e.g. formation count, control share, supply pressure). |

**Initiative timing:** When initiatives “pop up” (e.g. event-driven vs turn-driven, or threshold-triggered) is TBD. Phase I Ceasefire and Washington Agreement (Phase I Spec) are precedent: precondition-driven, all conditions must be met before the milestone fires.

---

## 7. Other terminal conditions

Per Phase II §11.2, the war can also end by:

- **Faction collapse:** A faction is eliminated when exhaustion and authority/control fall below viability thresholds; remaining factions continue or negotiate.
- **Timeout / stalemate:** Scenario-defined maximum duration (e.g. 208 weeks) forces all parties to the table as a hard stop.

These remain as defined in Phase II §11.2.1–11.2.3; this minimal spec does not change them.

---

## 8. Scoring and evaluation

Per Phase II §11.2.4 and Rulebook §15, end-game evaluation considers:

- Territory controlled vs. pre-war territory  
- Population preserved (displacement as negative score)  
- Exhaustion level (lower is better)  
- Treaty terms favorability (institutional competences, territorial recognition)

Faction goal hierarchy (§4) informs how “treaty terms favorability” is computed per faction. Exact scoring formula is TBD. **Minimal evaluation criteria (Pipeline 2.5, 2026-02-25):** For end-game display and timeout/stalemate branch, the four criteria above are canonical: (1) territory controlled vs. pre-war baseline; (2) population preserved (inverse of displacement); (3) exhaustion level (lower is better); (4) treaty terms favorability per §4. Numeric formula TBD; Architect to decide formula vs. criteria-only. Phase II Spec §11.2.4 references this section.

---

## 9. Historian advisory note (historicity)

*Input from Historian role for design fidelity:*

- **Dayton-style outcome:** The Dayton Peace Agreement (1995) ended the Bosnian war with a single state (BiH) comprising two entities (Federation of BiH, Republika Srpska), with Brčko District as a condominium. Territorial and institutional trade-offs (e.g. defence, customs, education) are historically accurate as negotiation dimensions.
- **Faction objectives:** RS sought maximal autonomy (and independence for some); HRHB sought a third entity or strong cantonal rights within the Federation; RBiH sought a unified state with strong central institutions. The hierarchy in §4 reflects these priorities.
- **Recurring initiatives:** Multiple peace plans (Vance-Owen, Owen-Stoltenberg, Contact Group, etc.) failed until military and diplomatic preconditions (Croat-Bosniak alignment, NATO action, exhaustion, RS under pressure) were in place. “Low success until preconditions” is historically consistent.
- **Preconditions:** International pressure (IVP), patron pressure (e.g. US/Croatia, FRY/Serbia), exhaustion, and military balance (e.g. RS territorial share, combined RBiH+HRHB capability) are well-attested drivers of the eventual settlement. Balkan Battlegrounds and standard histories support these levers; exact thresholds are a design choice.

---

## 10. Implementation notes and state

- **State:** Existing canon state suffices for the minimal spec: `negotiation_state` per faction (System 7), `patron_state` (System 1), `international_visibility_pressure` (System 1), `phase_ii_exhaustion` (Phase II). No new state entities are required for the minimal spec; follow-on design may add fields for initiative triggers or scoring.
- **Pipeline:** Negotiation window opening and acceptance computation are not yet implemented. When implemented, they must run in a deterministic order (e.g. after exhaustion/IVP update); acceptance must remain deterministic (System 7).
- **Cross-reference:** Phase II Specification §11.2 implementation-note points to this document for the minimal spec. Full specification (thresholds, initiative timing, scoring formula) remains a follow-on item.

---

## 11. Acceptance criteria (directive)

- [x] Minimal spec written and placed in docs/30_planning/ with cross-reference from Phase II §11.2.
- [x] Faction goal hierarchy (RS, HRHB, RBiH) explicit (§4).
- [x] Recurring peace initiatives and “low success until preconditions” stated (§5).
- [x] Precondition levers (IVP, patron, exhaustion, army strength) named; detail marked TBD (§6).
- [x] Historian advisory note reflected (§9).
- [x] Architect (product architecture) review and sign-off — see §13.

---

## 12. References

- Phase II Specification v0.5.0 §11.2 — War Termination and End-Game  
- Systems Manual v0.5.0 §20 (Negotiation and end states), System 1 (IVP + Patron), System 7 (Negotiation Capital)  
- Rulebook §15 — No total victory  
- ORCHESTRATOR_WAR_TERMINATION_MINIMAL_SPEC_DIRECTIVE_2026_02_24.md  
- Phase I Spec (Ceasefire, Washington Agreement) — precondition-driven milestone precedent

---

## 13. Architect (product architecture) review and sign-off

**Reviewer:** Architect (product architecture — full player-experience loop, cross-system integration).  
**Date:** 2026-02-24.

### Vision summary

| Aspect | Assessment |
|--------|------------|
| **Where we are** | Phase II has no implemented war termination. Canon (§11.2, Systems Manual §20, System 1 & 7) defines negotiation windows, treaty mechanics, IVP/patron, and deterministic acceptance. Pipeline already has negotiation pressure/capital/offers/acceptance steps (turn_pipeline.ts); state has negotiation_state, end_state, treaty_id. |
| **Where we're going** | Dayton-style negotiated end: treaty (territory + competences + Brčko) accepted by all; faction goals shape valuation; recurring initiatives with low success until IVP/patron/exhaustion/army preconditions met. |
| **Player experience** | When implemented: player (or bot) sees peace initiatives; can propose/respond; success stays low until preconditions; eventually accept → game ends, end-state screen. Order-of-operations: initiative pop-up / negotiation modal within turn flow (TBD in follow-on). |

### System interaction (full loop)

| System | Touched by war termination | Notes |
|--------|----------------------------|--------|
| **Engine state** | Yes — negotiation_state, patron_state, IVP, phase_ii_exhaustion, end_state (treaty_id, competences). | Already in schema/code; minimal spec adds no new state. |
| **Pipeline** | Yes — negotiation pressure, capital, offers, acceptance, apply (existing steps). | Deterministic order; acceptance deterministic (System 7). |
| **IPC** | Later — no negotiation-specific channels yet. | Follow-on: e.g. open-negotiation-window, propose-treaty, respond-to-offer (mutating); query-negotiation-status (read-only). |
| **Adapter** | Later — expose negotiation_status, window_open, current_offer to UI. | war_data_extractor already has negotiationMomentum; extend for initiative/offer. |
| **Renderer / Warroom** | Later — peace initiative modal, negotiation UI, end-state screen. | Structural: initiative pop-up in turn flow; negotiation modal; post-accept end screen. |
| **Player → orders** | Later — player proposes or accepts/counters; bots use same acceptance computation. | Determinism: same state + same player choices → same outcome. |

### Determinism

- **Spec requirement:** Acceptance is deterministic (same state and proposal → same decision and counter_offer). §3, §10.
- **Pipeline:** Existing negotiation steps are deterministic; no timestamps or RNG in acceptance.
- **Risk:** Initiative timing (when "pop up") must be deterministic (e.g. threshold-driven, turn-based). Follow-on design must preserve this.

### Feasibility

- **Trivial:** Spec aligns with existing canon and existing state/pipeline hooks. No canon conflict.
- **Medium:** Thresholds and initiative timing (TBD) require Game Designer/Gameplay pass; UI for initiatives and negotiation requires UI/UX Architect / UI-UX Developer.
- **Hard:** Full negotiation UI (propose territory/competence bundles, counter, accept) and end-state screen are out of scope for minimal spec; phased implementation recommended.

### Sign-off

**Architect (product architecture) sign-off:** The minimal spec is **approved**. It is coherent with the full player-experience loop, preserves determinism, and defers appropriately to follow-on design (thresholds, initiative timing, UI). Implementation should phase as: (1) threshold and initiative-timing design; (2) pipeline/engine wiring to open window and run acceptance; (3) IPC and adapter for negotiation status; (4) Warroom/UI for initiative and negotiation modal; (5) end-state screen.
