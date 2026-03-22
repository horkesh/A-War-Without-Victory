# Implementation Roadmap to v1.0 (Canon-Aligned)

This document is the authoritative implementation roadmap that takes **A War Without Victory** from **canon v0.3.0** to a **playable v1.0 prototype**. It is planning-only: no mechanics are invented; all systems and rules reference the canonical documents. Order and dependencies are specified; no calendar dates are used.

**Roadmap execution rules**

Each phase must end in a green test state before the next phase begins.
No phase may silently modify canon documents.
If implementation reveals a canon ambiguity, a docs-only phase must be inserted before continuing.
Any system not present in current canon requires a docs-only canon alignment phase before implementation.

**Canon references (v0.4 aligned):**

- [docs/10_canon/CANON.md](../10_canon/CANON.md) — Canonical index and rules
- [docs/10_canon/Engine_Invariants_v0_4_0.md](../10_canon/Engine_Invariants_v0_4_0.md)
- [docs/10_canon/Phase_Specifications_v0_4_0.md](../10_canon/Phase_Specifications_v0_4_0.md)
- [docs/10_canon/Phase_0_Specification_v0_4_0.md](../10_canon/Phase_0_Specification_v0_4_0.md)
- [docs/10_canon/Phase_I_Specification_v0_4_0.md](../10_canon/Phase_I_Specification_v0_4_0.md)
- [docs/10_canon/Systems_Manual_v0_4_0.md](../10_canon/Systems_Manual_v0_4_0.md)
- [docs/10_canon/Rulebook_v0_4_0.md](../10_canon/Rulebook_v0_4_0.md)
- [docs/10_canon/Game_Bible_v0_4_0.md](../10_canon/Game_Bible_v0_4_0.md)
- [docs/30_planning/V0_4_CANON_ALIGNMENT.md](V0_4_CANON_ALIGNMENT.md) — v0.4 doc-only alignment blueprint (Systems 1-11)

One game turn equals one week (CANON.md; Engine Invariants v0.4.0).

---

## Phase 0 — Canon v0.4 Alignment (Docs-Only)

### 1. Phase name and purpose

**Canon v0.4 Alignment.** Integrate Gap Systems 1-11 into the canon document set so that all canonical docs are aligned at v0.4 before any implementation work depends on them.

### 2. Entry conditions

- Canon v0.3.0 documents accepted as authoritative baseline.
- Gap systems specs accepted as source material: `AWWV_Gap_Systems_Implementation_v1_0_0.md` and `AWWV_Gap_Systems_v2_0_Addendum.md`.
- No code changes required; docs-only phase.

### 3. Core tasks

- Update canon docs to v0.4: Engine Invariants, Phase Specifications, Systems Manual, Rulebook, Game Bible, Phase 0 and Phase I specs.
- Integrate Systems 1-11 per `V0_4_CANON_ALIGNMENT.md` (patrons, embargo, equipment, legitimacy, enclaves, Sarajevo, negotiation capital, AoR, doctrines, capability progression, contested control).
- Update `CANON.md` to list v0.4 documents and preserve precedence order.
- Record ledger entry and ADRs if canon precedence, determinism contract, or entrypoints change (per `CODE_CANON.md`).

### 4. Outputs / artifacts

- v0.4 versions of all canon documents, aligned and cross-referenced.
- Updated `CANON.md` index.
- Ledger entry for Phase 0; ADRs if required.

### 5. Validation & testing requirements

- Doc-only review for internal consistency and precedence compliance.
- No mechanics changes in this phase.

### 6. Exit criteria

- v0.4 canon documents exist and are mutually consistent.
- `CANON.md` references v0.4 documents.
- Ledger/ADR bookkeeping complete.

### 7. Dependencies on other phases

- Must complete before any implementation phase that depends on Systems 1-11.

---

## Phase A — Architecture & State Foundations

### 1. Phase name and purpose

**Architecture & State Foundations.** Formalize core game state, the turn resolution loop, determinism scaffolding, and save/load so that all later phases operate on a single, replayable, auditable state model.

### 2. Entry conditions

- Repository baseline with existing map substrate, contact graph, and any already-implemented sim modules (e.g. Phase 3A-3D, dev runner).
- Canon v0.3.0 documents accepted as authoritative.
- No requirement that Phase 0 or Phase I be implemented yet.

### 3. Core tasks

- Define and implement a **canonical game state structure** (world, factions, municipalities, settlements, formations, political control, authority, supply-related state) per Engine Invariants and Systems Manual v0.3.0.
- Implement the **turn resolution pipeline** with a weekly turn invariant; ensure all phase steps (directive, deployment, military interaction, fragmentation resolution, supply resolution, political effects, exhaustion update, persistence) are ordered and gated per Rulebook and Systems Manual.
- Establish **state serialization and replayability**: all state variables required for correctness must be serializable; no derived state serialized per Engine Invariants §13.1.
- Define and enforce **deterministic ordering rules** for all iterations that affect outputs (Engine Invariants §11.3).
- Define a **save/load strategy** (even if minimal at first) so that save/load fully reconstructs world, faction, municipality, MCZ, formation, and front states (Engine Invariants §11.4).

### 4. Outputs / artifacts

- Canonical game state type(s) and schema (code).
- Turn pipeline implementation with ordered phases (code).
- Serialization/deserialization layer (code).
- Save/load entrypoints and documentation (code + docs).
- Ledger entry for Phase A.

### 5. Validation & testing requirements

- **Deterministic re-run test:** Run the same scenario (same initial state and inputs) twice; compare final state (or checksum) — must be identical.
- **State diff test:** Between two runs with identical inputs, the diff of serialized state must be empty (or limited to explicitly allowed non-determinism, which must be none per canon).
- Typecheck and existing test suite pass; no new invariant violations.

### 6. Exit criteria

- Game state is canonical, serializable, and replayable.
- Turn pipeline runs one full turn with deterministic ordering and no randomness/timestamps in state or derived artifacts.
- Save/load reconstructs state to the degree required by Engine Invariants §11.4 for the scope implemented in Phase A.
- Deterministic re-run and state-diff tests exist and pass.

### 7. Dependencies on other phases

- None (Phase A can be first). May build on existing codebase (e.g. current turn pipeline, state modules) without depending on other roadmap phases.

### 8. Phase A completion (reference)

- **Invariants and guarantees:** See [docs/PHASE_A_INVARIANTS.md](PHASE_A_INVARIANTS.md) for what Phase A guarantees, what later phases may rely on, and save/load API documentation.

---

## Phase B — Phase 0 (Pre-War) Implementation

### 1. Phase name and purpose

**Phase 0 (Pre-War) Implementation.** Implement the entire Pre-War Phase as specified in Phase_0_Specification_v0_4_0.md so that organizational competition, declarations, and the mandatory EC-coerced referendum gate war start and Phase I entry.

### 2. Entry conditions

- Phase A complete (canonical state and turn pipeline in place).
- Phase_0_Specification_v0_4_0.md and Phase_Specifications_v0_4_0.md (Phase 0 -> Phase I entry condition) accepted as authoritative.
- Data sources for Phase 0 available or stubbed per spec (§3): initial political control, demographic data, infrastructure data, institutional presence.

### 3. Core tasks

- Implement **Pre-War Capital** system per Phase_0_Specification_v0_4_0.md §4.1 (asymmetric pools, scarcity, non-renewable spend).
- Implement **organizational penetration** and investment (§4.2) and its effects on stability and authority.
- Implement **Stability Score** derivation (§4.6): formula (base, demographic, organizational, geographic factors), stability bands, pre-war investment effects; output carried to Phase I.
- Implement **RS and HRHB declaration pressure** (§4.4): enabling conditions, pressure accumulation, declaration timing; declarations do not by themselves start war.
- Implement **mandatory EC-coerced referendum** logic (§4.5): referendum_eligible (RS and HRHB declared), referendum_held, referendum_turn, referendum_deadline_turn, war_start_turn; referendum window and **referendum window failure** leading to **non-war terminal outcome** (BiH remains in Yugoslavia; Phase I never entered).
- Implement **Phase 0 -> Phase I transfer gating**: Phase I is entered only when current_turn == war_start_turn (referendum_turn + 4); no referendum -> no war (Phase_Specifications_v0_4_0.md; CANON.md War Start Rule).
- Implement Phase 0 turn structure: referendum eligibility check / EC coercion resolution, war-start countdown, non-war terminal resolution; hand-off to Phase I includes referendum_state and war_start_turn.

### 4. Outputs / artifacts

- Phase 0 state variables and resolution logic (code).
- Referendum and declaration state in game state and serialization.
- Tests for no-war-without-referendum, Phase I unreachable without referendum, and non-war terminal path.
- Ledger entry for Phase B.

### 5. Validation & testing requirements

- **No-war-without-referendum invariant tests:** Any scenario where referendum is not held must never set war_start_turn or enter Phase I; non-war terminal outcome must be reachable and asserted.
- **Phase I unreachable without referendum:** Assert that Phase I entry is impossible unless referendum_held and current_turn == war_start_turn.
- **Non-war terminal path test:** At least one scenario reaches referendum_deadline_turn without referendum and terminates in non-war outcome with Phase I unreachable.
- Typecheck and existing tests pass; Engine Invariants respected.

### 6. Exit criteria

- All Phase 0 systems listed above are implemented per spec.
- War start occurs only via referendum_turn + 4; no war without referendum.
- Non-war terminal outcome is implemented and tested.
- Phase I is only entered when hand-off conditions from Phase 0 are met.

### 7. Dependencies on other phases

- **Phase A** (Architecture & State Foundations) must be complete.

---

## Phase C — Phase I (Early War) Implementation

### 1. Phase name and purpose

**Phase I (Early War) Implementation.** Implement early-war organizational conflict as specified in Phase_I_Specification_v0_4_0.md: militia emergence, control flips via stability and pressure, authority degradation, Control Strain initiation, displacement hooks, and JNA transition -- without fronts or Areas of Responsibility (AoRs).

### 2. Entry conditions

- Phase B complete (Phase 0 implemented; referendum-gated war start and Phase I entry).
- Phase_I_Specification_v0_4_0.md and Engine Invariants §3, §9 accepted as authoritative.
- Phase 0 hand-off provides stability_scores, organizational_penetration, referendum_state (referendum_held, referendum_turn, war_start_turn), authority_state, JNA_status, etc.

### 3. Core tasks

- Implement **militia emergence** from organizational penetration and early-war conditions per Phase I spec.
- Implement **control flips** driven by stability and pressure only after war_start_turn; control cannot flip before war_start_turn.
- Implement **authority degradation** (RBiH central authority, RS, HRHB) per Phase I and Engine Invariants §3.
- Implement **Control Strain** initiation (costs of controlling hostile populations).
- Implement **displacement initiation** as hooks only if the displacement system is defined later; otherwise stubs or minimal placeholders that do not alter population totals until Phase F.
- Implement **JNA transition mechanics** (withdrawal, asset transfer); JNA effects must not by themselves trigger war start (Engine Invariants §8; war start remains referendum-gated).
- Ensure **AoRs are never instantiated in Phase I**; Phase I uses organizational/militia mechanics only (Phase_Specifications_v0_4_0.md; Phase I spec).

### 4. Outputs / artifacts

- Phase I state updates and resolution logic (code).
- Control flip and authority logic respecting war_start_turn and authorized mechanisms only.
- Tests enforcing Phase I invariants (no AoR, no control flip before war_start_turn).
- Ledger entry for Phase C.

### 5. Validation & testing requirements

- **Control cannot flip before war_start_turn:** Assert that no settlement political_controller change occurs before current_turn >= war_start_turn.
- **AoRs never instantiated in Phase I:** Assert that no AoR or front-active brigade assignment exists while game phase is Phase I.
- **Authority/control distinction preserved:** Control changes only via authorized mechanisms (stability + pressure, authority collapse, or negotiation); control does not imply authority (Engine Invariants §3, §9).
- Typecheck and existing tests pass.

### 6. Exit criteria

- Phase I runs from war_start_turn with militia, control flips, authority degradation, Control Strain, and JNA transition as specified.
- No AoRs or fronts in Phase I; Phase I exit gates transition to later phase when control stabilizes for AoR instantiation (per canon).
- All Phase I validation tests pass.

### 7. Dependencies on other phases

- **Phase B** (Phase 0) must be complete so that Phase I is entered only via referendum-gated war start.

---

## Phase D — Core Systems (Cross-Phase)

### 1. Phase name and purpose

**Core Systems (Cross-Phase).** Implement systems that persist across multiple phases: political control substrate, authority, supply and corridors, exhaustion (irreversible), and fragmentation (multi-turn persistence). These underpin Phase I, spatial systems, displacement, and end-state.

### 2. Entry conditions

- Phase A complete (state and turn pipeline).
- Phases B and C may be complete or in progress; Core Systems can be implemented in parallel or after Phase C, provided state model and turn ordering support them.
- Engine Invariants §3, §4, §7, §8 and Systems Manual v0.3.0 (authority, supply, exhaustion, fragmentation) accepted as authoritative.

### 3. Core tasks

- Implement and enforce **political control substrate**: every settlement has a political control state at all times; control is initialized before front detection, AoR assignment, pressure, exhaustion, and supply (Engine Invariants §9.1, §9.2); control is independent of military presence (§9.3).
- Implement **authority system**: Consolidated / Contested / Fragmented per municipality; authority cannot be Consolidated if supply is Critical or any dependent corridor is Cut; authority degrades when invalid states are detected; control does not imply authority (Engine Invariants §3).
- Implement **supply and corridor system**: corridors derived per faction (Open, Brittle, Cut); supply traces through corridors or local production; supply recovery slower than degradation; Brittle applies continuous penalties (Engine Invariants §4; Systems Manual §14).
- Implement **exhaustion system** as irreversible: monotonic increase; no system may reduce exhaustion; increase under brittle/cut corridors, static fronts, coercive control, supply strain; compound across military, political, societal dimensions (Engine Invariants §8; Control Strain is reversible, Exhaustion is not).
- Implement **fragmentation logic** with multi-turn persistence: fragmentation requires authority collapse and connectivity disruption; fragmentation and reunification both require persistence over multiple turns; one-turn fragmentation or reunification is invalid (Engine Invariants §7; Systems Manual §10, §11).

### 4. Outputs / artifacts

- Political control initialization and update paths (code).
- Authority derivation and degradation (code).
- Supply reachability, corridor derivation, and supply state (code).
- Exhaustion accumulation and caps (code).
- Fragmentation/MCZ derivation and persistence (code).
- Ledger entry for Phase D.

### 5. Validation & testing requirements

- **Engine invariant enforcement:** Automated checks (or test suite) that assert Engine Invariants §3, §4, §7, §9 where applicable.
- **Exhaustion monotonicity tests:** Exhaustion never decreases; any attempt to reduce exhaustion is rejected or absent.
- **Corridor state consistency tests:** Each corridor is in exactly one state (Open, Brittle, Cut); supply recovery slower than degradation; Brittle penalties applied every turn.
- Typecheck and existing tests pass.

### 6. Exit criteria

- Political control, authority, supply/corridors, exhaustion, and fragmentation are implemented and used by the turn pipeline.
- Invariant checks and tests above pass; no single-turn fragmentation/reunification; exhaustion never reduced.

### 7. Dependencies on other phases

- **Phase A** must be complete. Phase D may overlap with or follow Phase B/C; it must be in place before Phase E (spatial/fronts) and Phase F (displacement) rely on supply and exhaustion.All systems must expose read-only state suitable for spatial evaluation without embedding spatial logic.

---

## Phase E — Spatial & Interaction Systems

### 1. Phase name and purpose

**Spatial & Interaction Systems.** Activate spatial mechanics without turning the game into a tactical wargame: pressure eligibility and diffusion (Phase 3A), front emergence, AoR instantiation rules, and Rear Political Control Zones handling so that fronts exist only where sustained opposing presence exists and rear zones remain stable.

### 2. Entry conditions

- Phase A complete; Phase D (core systems) complete so that political control, authority, supply, and exhaustion are available.
- Phase 3A specification (Phase_Specifications_v0_4_0.md Appendix A) and Engine Invariants §6, §9.4 accepted as authoritative.
- Contact graph and enriched contact graph (or equivalent) available.

### 3. Core tasks

- Implement **pressure eligibility and diffusion** per Phase 3A: eligibility weights, hard gating conditions, diffusion rules; pressure does not create instant territorial collapse.
- Implement **front emergence logic**: fronts only where sustained opposing control meets (Engine Invariants §6); no single combat resolution causes decisive territorial change.
- Implement **AoR instantiation rules**: AoRs created when sustained brigade-level adjacency and opposing contact exist per Phase_Specifications_v0_4_0.md; rear settlements become front-active when opposing pressure becomes eligible; AoR assignment never creates or overrides political control (Engine Invariants §9.8).
- Implement **Rear Political Control Zones** handling: settlements outside all brigade AoRs retain political control; do not generate or absorb pressure; do not require military responsibility; do not experience control drift due to absence of formations (Engine Invariants §9.4).
- Ensure **no instant territorial collapse**: pressure and fronts affect control only through sustained, authorized mechanisms over time.

### 4. Outputs / artifacts

- Pressure eligibility and diffusion integration (code).
- Front-edge derivation and front state (code).
- AoR instantiation and update (code).
- Rear zone classification and stability (code).
- Ledger entry for Phase E.

### 5. Validation & testing requirements

- **Fronts only from sustained opposing presence:** Assert that no front exists unless sustained opposing control meets per Engine Invariants §6.
- **No instant territorial collapse:** Assert that control does not flip in a single turn solely from one pressure application; consolidation and duration rules respected.
- **Rear zones stable without brigades:** Assert that settlements in Rear Political Control Zones do not lose or change control due to absence of formations (§9.4).
- Typecheck and existing tests pass.

### 6. Exit criteria

- Pressure propagates per Phase 3A; fronts emerge only where canon allows; AoRs are instantiated when conditions are met; rear zones are stable and do not drift.
- All Phase E validation tests pass.

### 7. Dependencies on other phases

- **Phase A** and **Phase D** must be complete. Phase C (Phase I) should be complete so that Phase I does not use AoRs; Phase E enables post-Phase I spatial behavior.

---

## Phase F — Displacement & Population Dynamics

### 1. Phase name and purpose

**Displacement & Population Dynamics.** Implement displacement as a negative-sum, irreversible system: municipality-level displacement pools, trickle redistribution, loss and external displacement fractions, urban absorption (faction-coherent), and long-term capacity reduction so that population totals are conserved minus losses and no instant resettlement occurs.

### 2. Entry conditions

- Phase A and Phase D complete (state, supply, exhaustion available).
- Systems_Manual_v0_4_0.md §12 (Population and displacement) and related Rulebook sections accepted as authoritative.
- Municipality and settlement identifiers and population data (or stubs) available.

### 3. Core tasks

- Implement **municipality-level displacement pools** (sources and sinks).
- Implement **trickle redistribution logic** so that displacement does not resolve in a single turn; no instant resettlement.
- Implement **loss and external displacement fractions** (permanent population loss; external refugees).
- Implement **urban absorption** logic (faction-coherent) where applicable per canon.
- Implement **long-term capacity reduction** effects (recruitment, authority) from displacement per Systems Manual §12; displacement permanently reduces recruitment and authority.
- Ensure **displacement is irreversible** where canon says so; no reversible capacity gain from displacement.

### 4. Outputs / artifacts

- Displacement state and update logic (code).
- Capacity reduction derivation (code).
- Tests for irreversibility and population conservation.
- Ledger entry for Phase F.

### 5. Validation & testing requirements

- **Displacement irreversibility:** Assert that displacement-driven capacity loss is not reversed by any system unless canon explicitly allows.
- **Population totals conservation minus losses:** Assert that total population (or appropriate accounting) equals initial plus/minus only authorized changes (births, deaths, external loss); no phantom population.
- **No instant resettlement:** Assert that redistribution and absorption occur over multiple turns or per trickle rules, not in one step.
- Typecheck and existing tests pass.

### 6. Exit criteria

- Displacement pools, trickle redistribution, loss/external fractions, urban absorption, and capacity reduction are implemented and wired to state.
- All Phase F validation tests pass.

### 7. Dependencies on other phases

- **Phase A** and **Phase D** must be complete. Phase F may follow or overlap Phase E; supply and connectivity may inform displacement sinks/sources.

---

## Phase G — Player Interface & UX (Prototype)

### 1. Phase name and purpose

**Player Interface & UX (Prototype).** Make the simulation playable and legible, not polished: strategic map, municipality and settlement inspection, population/forces/exhaustion overview, phase indicator and turn feedback, and explicit uncertainty and delay signaling so that the player can answer “What do I control, at what cost?” without the UI implying false precision or certainty.

### 2. Entry conditions

- At least Phases A, B, C, and D complete so that core state, Phase 0, Phase I, and core systems are present; Phases E and F may be partial.
- Rulebook v0.3.0 and Game Bible v0.3.0 (player-facing experience and design constraints) accepted as reference.
- Existing dev runner/viewer or equivalent can be extended.

### 3. Core tasks

- Implement **strategic map presentation** (settlements, municipalities, control, optional fronts/supply).
- Implement **municipality and settlement inspection** (click or select to see control, population, forces, exhaustion, authority as available).
- Implement **population, forces, exhaustion overview** (faction-level or summary) so that cost of control is visible.
- Implement **phase indicator and turn feedback** (current phase, turn number, key events).
- Implement **explicit uncertainty and delay signaling** where information is delayed or uncertain (e.g. command friction, intel) so that UI does not imply false precision or certainty.
- Ensure **no UI implies false precision or certainty** for values that are estimated, delayed, or subject to command friction.
- Ensure no player orders are issued directly via map interaction; the map is a diagnostic and explanatory surface only.

### 4. Outputs / artifacts

- Prototype UI (code and assets as needed): map, inspection panels, overview, phase/turn display, uncertainty/delay indicators.
- Short UX notes or doc on what the player can and cannot infer from the UI.
- Ledger entry for Phase G.

### 5. Validation & testing requirements

- **Player can answer “What do I control, at what cost?”:** Manual or scripted check that control and cost (exhaustion, forces, supply) are visible and interpretable.
- **No false precision/certainty:** Review that delayed or uncertain information is not presented as exact or guaranteed.
- Typecheck and existing tests pass; UI does not alter game state (read-only consumption of state).

### 6. Exit criteria

- Player can run the simulation, view map and details, and understand control and cost at a strategic level.
- Phase G validation criteria met.

### 7. Dependencies on other phases

- **Phase A** required; **Phases B, C, D** required for meaningful content. Phases E and F improve relevance of map and overview but Phase G can start once core state and Phase 0/Phase I are present.

---

## Phase H — Testing, Debugging & Balancing

### 1. Phase name and purpose

**Testing, Debugging & Balancing.** Make the system robust, debuggable, and auditable: scenario tests (historical stress tests, not scripted outcomes), invariant violation reporting, logging and audit tools, and debug visualizations (non-player-facing) so that known failure modes are detectable and debug artifacts do not alter game state.

### 2. Entry conditions

- Phases A through G substantially complete so that a full war loop and UI exist.
- Engine Invariants and Phase Specifications accepted as the source of invariant checks.
- Test framework and CI (if any) in place.

### 3. Core tasks

- Implement **scenario tests** that stress the system (e.g. historical or synthetic scenarios) without scripting exact outcomes; validate invariants and stability over many turns.
- Implement **invariant violation reporting**: when an Engine Invariant is violated, report deterministically and audibly; structured failure result (Engine Invariants §1).
- Implement **logging and audit tools** (e.g. turn-by-turn state dumps, corridor/front/control audits) for debugging.
- Implement **debug visualizations** (non-player-facing) for internal state (e.g. pressure, supply, exhaustion) without exposing them as canonical player info unless designed for UI.
- Ensure **debug artifacts do not alter game state**: logs and debug views are read-only or written to separate outputs; no debug path that changes simulation state.

### 4. Outputs / artifacts

- Scenario test suite or harness (code).
- Invariant check integration and failure reporting (code).
- Logging and audit scripts or tools (code).
- Debug visualization entrypoints (code).
- Ledger entry for Phase H.

### 5. Validation & testing requirements

- **Known failure modes detectable:** At least one test or run that would previously have failed (e.g. invariant violation, determinism break) is now caught by invariant reporting or tests.
- **Debug artifacts do not alter game state:** Assert or review that debug tools and logs do not modify world state, formation state, or political control.
- Typecheck and existing tests pass; determinism preserved.

### 6. Exit criteria

- Scenario tests run and invariant violations are reported; logging and audit tools are available; debug visualizations are clearly non-player-facing and do not change state.
- Phase H validation criteria met.

### 7. Dependencies on other phases

- **Phases A through G** should be complete or nearly complete so that scenario tests and invariant checks cover the full loop.

---

## Phase I — v1.0 Packaging

### 1. Phase name and purpose

**v1.0 Packaging.** Freeze a playable, testable v1.0 prototype: feature freeze, documentation freeze, known-issues list, and reproducible build instructions so that a clean run from a new clone yields deterministic outcomes under identical inputs.

### 2. Entry conditions

- Phases A through H complete.
- All v1.0 systems (per canon) implemented and passing validation; negotiation and end-state (Phase O in prior roadmap) and other required systems integrated as needed for v1.0 definition.

### 3. Core tasks

- **Feature freeze:** No new features; only bug fixes and documentation/clarity allowed.
- **Documentation freeze:** User-facing and build documentation updated and frozen (e.g. README, build instructions, run instructions).
- **Known-issues list:** Document known limitations, bugs, or deferred items; no hidden failures.
- **Reproducible build instructions:** Document how to clone, install, build, and run so that a new clone can run the simulation and produce deterministic results for the same inputs.

### 4. Outputs / artifacts

- Updated README and/or runbooks (docs).
- Known-issues list (docs).
- Reproducible build/run instructions (docs and possibly scripts).
- Tag or release artifact for v1.0 prototype (process).
- Ledger entry for Phase I.

### 5. Validation & testing requirements

- **Clean run from new clone:** Perform clone, install, build, run on a clean environment; simulation runs without requiring out-of-band state or data.
- **Deterministic outcomes under identical inputs:** Run same scenario twice (same initial state and inputs); compare outcomes (state or checksum); must be identical.
- Typecheck and full test suite pass; map:contracts:validate and map:contracts:determinism (or equivalent) pass per project standards.

### 6. Exit criteria

- v1.0 prototype is feature- and documentation-frozen; known issues are listed; build instructions are reproducible; clean clone runs and determinism is confirmed.
- Phase I validation criteria met.

### 7. Dependencies on other phases

- **All prior phases A through H** must be complete. Phase I is the final packaging phase before v1.0 release.

---

## Summary dependency order

- **Phase 0** first (canon v0.4 alignment).
- **Phase A** first (architecture and state).
- **Phase B** (Phase 0) after A.
- **Phase C** (Phase I) after B.
- **Phase D** (core systems) after A; can overlap B/C.
- **Phase E** (spatial/interaction) after A and D; preferably after C.
- **Phase F** (displacement) after A and D; can overlap E.
- **Phase G** (UI prototype) after A, B, C, D at minimum.
- **Phase H** (testing/debug/balancing) after A-G.
- **Phase I** (v1.0 packaging) after A-H.

Commit-per-phase: each phase should be completed and committed (or merged) as a discrete step before the next phase begins, so that the roadmap is executable by Cursor in later phases with clear boundaries.
