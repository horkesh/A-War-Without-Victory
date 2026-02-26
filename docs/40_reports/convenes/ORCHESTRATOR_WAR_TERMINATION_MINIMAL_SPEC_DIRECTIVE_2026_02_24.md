# Orchestrator Work Directive: War Termination Minimal Spec (1.1)

**Date:** 2026-02-24  
**Source:** Pipeline-next critical path item 1.1 ([20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md)); user vision (Dayton-style end, faction goals, recurring peace initiatives).  
**Purpose:** Put the Paradox team to work on the war termination / end-game minimal spec with clear ownership and oversight.

---

## 1. Assignment

| Role | Responsibility |
|------|----------------|
| **Game Designer** | **Lead.** Produce the minimal spec (1.1): when negotiation opens, how the game ends, faction goal hierarchy, recurring peace initiatives, preconditions (conceptual). Deliverable: canon subsection or design doc that extends Phase II §11.2 and aligns with Systems Manual §20 and Systems 1 & 7. |
| **Technical Architect** | **Oversee.** Review spec for consistency with existing canon (Phase II §11.2, Systems Manual §20, System 1 IVP/Patron, System 7 Negotiation Capital). Ensure state/contract implications are clear for implementation. Sign-off before spec is considered complete. |
| **Architect (product architecture)** | **Oversee.** Review spec for full player-experience loop (engine → IPC → adapter → renderer → interaction → player → orders → engine), determinism, and feasibility. Sign-off from product-architecture perspective. (Distinct from Technical Architect: code structure; Architect: holistic product and experience.) |
| **Historian** | **Advisor (historicity).** Advise on historical fidelity of: Dayton-style outcome (territorial + institutional trade-offs); faction objectives (RS autonomy, HRHB cantons/Federation, RBiH state institutions); recurring peace initiatives and when they appeared historically; preconditions that historically brought parties to the table (IVP, patron pressure, exhaustion, military balance). Cite Balkan Battlegrounds or other KB sources where relevant. No requirement to write the spec; input to Game Designer. |
| **Gameplay Programmer** | **Consumer (later).** When spec is stable, align implementation with negotiation_state, IVP, patron_state, and acceptance/counter logic (System 7). Not blocked on this directive; engage when Game Designer delivers draft. |

---

## 2. Design vision (authoritative for this work)

The following is the agreed vision. The minimal spec must reflect it.

### 2.1 End state: Dayton-style negotiations

- War ends when a **negotiated settlement** is reached (treaty accepted by all parties).
- Bots/players **trade territories** and **points accrued** (negotiation capital, territorial valuation).
- Outcome is a **balancing act** among faction goals; result is **peace** → game ends.
- **No total victory.** Rulebook §15; Phase II §11.2.

### 2.2 Faction goal hierarchy

Used to value offers and shape accept/counter behavior. Order of preference (first = preferred, often unreachable):

- **RS:** (1) Independence — almost impossible. (2) As much **autonomy** as possible.
- **HRHB:** (1) Third entity — almost impossible. (2) **Strengthening of cantons** within the Federation of BiH.
- **RBiH:** **Strengthen state-level institutions** as much as possible.

### 2.3 Recurring peace initiatives

- **Throughout the game,** peace initiatives can appear (as they did historically).
- Players/bots **can negotiate** at any time when a window is open.
- **Success is low** until preconditions are met.
- Preconditions (to be specified in detail later) include: **international pressure (IVP)**, **patron pressure**, **exhaustion**, **army strengths** (relative balance), and any others the team identifies.

### 2.4 Preconditions (conceptual for minimal spec)

- Exact **thresholds and formulas** are TBD in a follow-on design pass.
- Minimal spec should name the **conceptual levers**: IVP, patron pressure, exhaustion, army strength (and any others).
- Game Designer may add a short “Preconditions and initiative timing — TBD” subsection or design note referencing System 1 and System 7.

---

## 3. Existing canon to align with

- **Phase II Specification v0.5.0 §11.2** — War Termination and End-Game: Negotiated Settlement, Faction Collapse, Timeout/Stalemate, Scoring (minimal design intent; implementation-note: mechanics not yet implemented).
- **Systems Manual §20** — Negotiation and end states: negotiation windows (exhaustion, fragmentation, IVP); peace treaty mechanics (territorial clauses, Brčko required, institutional competences); acceptance computation deterministic.
- **Systems Manual System 1** — External Patron Pressure + IVP: patron_state, international_visibility_pressure, negotiation_momentum, adjusted_negotiation_threshold, exhaustion modifiers.
- **Systems Manual System 7** — Negotiation Capital + Territorial Valuation: negotiation_state per faction; capital from exhaustion, IVP, patron; accept/reject/counter deterministic.
- **Phase I (reference)** — Ceasefire and Washington Agreement: precondition-driven (IVP, patron, exhaustion, RS threat, etc.); same pattern can apply to final settlement.

---

## 4. Deliverables

1. **Minimal spec document** (or canon subsection) that:
   - States that the game ends with a **Dayton-style negotiated settlement** (treaty with territorial + institutional clauses; Brčko; all parties accept).
   - Defines **tradeables**: territories (control/transfer), points accrued (negotiation capital / valuation per System 7).
   - Defines **faction goal hierarchy** (RS, HRHB, RBiH) as above for valuing offers and accept/counter.
   - States that **peace initiatives can recur** during the war; success remains low until preconditions are met.
   - Lists **preconditions conceptually** (IVP, patron pressure, exhaustion, army strength); notes that thresholds and initiative timing are TBD in a follow-on design.
2. **Historian input** (brief note or inline): Any corrections or citations relevant to faction objectives, Dayton-style outcome, or historical peace initiative timing; passed to Game Designer for incorporation or footnote.
3. **Architect (product architecture) sign-off**: Spec reviewed for full-loop coherence, determinism, and feasibility; signed off (see WAR_TERMINATION_MINIMAL_SPEC.md §13). Technical Architect may separately review code/contract implications when implementation is scoped.

---

## 5. Acceptance criteria

- [ ] Minimal spec is written and placed in canon (Phase II Spec extension) or in docs/30_planning/ with a cross-reference from Phase II §11.2.
- [ ] Faction goal hierarchy (RS, HRHB, RBiH) is explicit.
- [ ] Recurring peace initiatives and “low success until preconditions” are stated.
- [ ] Precondition levers (IVP, patron, exhaustion, army strength) are named; detail marked TBD where appropriate.
- [ ] Historian has had opportunity to advise on historicity; any material input reflected or cited.
- [x] Architect (product architecture) has reviewed and signed off (see spec §13).

---

## 6. References

- [20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md](backlog/20260223_PIPELINE_NEXT_WHILE_BOT_REWRITE.md) §1 (critical path 1.1)
- [ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md) §3 (war termination minimal spec)
- Phase II Specification v0.5.0 §11.2 — War Termination and End-Game
- Systems Manual v0.5.0 §20 (Negotiation and end states), System 1 (IVP + Patron), System 7 (Negotiation Capital)
- Historian skill / Balkan Battlegrounds knowledge base for historicity input

---

## 7. Status

**Opened:** 2026-02-24 (Orchestrator).  
**Draft produced:** 2026-02-24. Game Designer produced minimal spec: [WAR_TERMINATION_MINIMAL_SPEC.md](../../30_planning/WAR_TERMINATION_MINIMAL_SPEC.md) (docs/30_planning/). Historian advisory note included (§9). Phase II Spec §11.2 updated with cross-reference.  
**Next:** Directive complete. Architect (product architecture) signed off (spec §13). Technical Architect may review code/contract when implementation is scoped.
