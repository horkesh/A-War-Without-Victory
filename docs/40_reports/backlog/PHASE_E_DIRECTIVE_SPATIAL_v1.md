# Phase E — Spatial & Interaction Systems (Directive v1)

This document is the Phase E0.1 directive: it copies the Phase E section from the Implementation Roadmap (ROADMAP_v1_0.md) and adds explicit guardrails so Phase E is not conflated with negotiation or end-state work.

**DO NOT implement negotiation or end-state here.** Phase E scope is spatial and interaction systems only (pressure eligibility/diffusion, front emergence, AoR instantiation, rear political control zones). Negotiation, end-state, enforcement, and termination belong to **Phase O — Negotiation & End-State (legacy)** and are **out of scope** for Phase E. They must not be conflated with Phase E.

---

## Phase O — Negotiation & End-State (legacy) — OUT OF SCOPE FOR PHASE E

**Phase O** (sometimes referred to in prior roadmaps as negotiation, end_state, enforcement, or termination) is the domain of peace negotiations, treaty application, and terminal game outcomes. It is **out of scope** for Phase E. Phase E implements **Spatial & Interaction Systems** only. Do not route Phase O logic or step names into Phase E modules.

---

## 1. Phase name and purpose

**Phase E — Spatial & Interaction Systems.** Activate spatial mechanics without turning the game into a tactical wargame: pressure eligibility and diffusion (Phase 3A), front emergence, AoR instantiation rules, and Rear Political Control Zones handling so that fronts exist only where sustained opposing presence exists and rear zones remain stable.

## 2. Entry conditions

- Phase A complete; Phase D (core systems) complete so that political control, authority, supply, and exhaustion are available.
- Phase 3A specification (Phase_Specifications_v0_4_0.md Appendix A) and Engine Invariants §6, §9.4 accepted as authoritative.
- Contact graph and enriched contact graph (or equivalent) available.

## 3. Core tasks

- Implement **pressure eligibility and diffusion** per Phase 3A: eligibility weights, hard gating conditions, diffusion rules; pressure does not create instant territorial collapse.
- Implement **front emergence logic**: fronts only where sustained opposing control meets (Engine Invariants §6); no single combat resolution causes decisive territorial change.
- Implement **AoR instantiation rules**: AoRs created when sustained brigade-level adjacency and opposing contact exist per Phase_Specifications_v0_4_0.md; rear settlements become front-active when opposing pressure becomes eligible; AoR assignment never creates or overrides political control (Engine Invariants §9.8).
- Implement **Rear Political Control Zones** handling: settlements outside all brigade AoRs retain political control; do not generate or absorb pressure; do not require military responsibility; do not experience control drift due to absence of formations (Engine Invariants §9.4).
- Ensure **no instant territorial collapse**: pressure and fronts affect control only through sustained, authorized mechanisms over time.

## 4. Outputs / artifacts

- Pressure eligibility and diffusion integration (code).
- Front-edge derivation and front state (code).
- AoR instantiation and update (code).
- Rear zone classification and stability (code).
- Ledger entry for Phase E.

## 5. Validation & testing requirements

- **Fronts only from sustained opposing presence:** Assert that no front exists unless sustained opposing control meets per Engine Invariants §6.
- **No instant territorial collapse:** Assert that control does not flip in a single turn solely from one pressure application; consolidation and duration rules respected.
- **Rear zones stable without brigades:** Assert that settlements in Rear Political Control Zones do not lose or change control due to absence of formations (§9.4).
- Typecheck and existing tests pass.

## 6. Exit criteria

- Pressure propagates per Phase 3A; fronts emerge only where canon allows; AoRs are instantiated when conditions are met; rear zones are stable and do not drift.
- All Phase E validation tests pass.

## 7. Dependencies on other phases

- **Phase A** and **Phase D** must be complete. Phase C (Phase I) should be complete so that Phase I does not use AoRs; Phase E enables post–Phase I spatial behavior.

---

*Source: docs/30_planning/ROADMAP_v1_0.md Phase E section. Directive v1 adds DO NOT negotiation/end-state note and Phase O scope clarification.*
