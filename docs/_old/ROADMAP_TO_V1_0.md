# Roadmap to v1.0

This document is the single authoritative roadmap from the current project state (post H6.x map stabilization) to a shippable A War Without Victory v1.0. It decomposes remaining work into scoped phases, respects existing phase naming (H7.x, I.x, J.x, …), identifies dependencies, defines milestones, and ends with a clear definition of v1.0. No new mechanics are invented; all systems referenced exist in Rulebook v0.2.7, Systems Manual v0.2.7, Engine Invariants v0.2.7, Phase Specifications v0.2.7, and Game Bible v0.2.7.

## 1. Current baseline (factual, no speculation)

**Done.** Map substrate is canonical: Path A architecture, settlements_substrate.geojson, 110 mun1990 registry, legacy NW anchoring per Phase G4 and Phase H6.10.G4b. Phase 1 contact graph and Phase 2 enriched contact graph exist and feed Phase 3A. Phase 3A (pressure eligibility and diffusion), Phase 3B (pressure → exhaustion coupling), Phase 3C (exhaustion → collapse gating), and Phase 3D (collapse resolution with capacity modifiers) are implemented and design-frozen per Phase Specifications. Phase 4A/B provide the dev runner and HTML dev viewer. Phase 5A–D expose posture, logistics prioritization, and loss-of-control trends as player levers. Phase 6A–6E and Phase C/D/E deliver mun1990 remap, census authority, political control initialization and derivation, and dev visualization. Phase F introduced the ControlStatus API and migrated treaty/negotiation modules to it. Phase G4 and H6.10.G4b closed the NW coordinate regime via legacy substrate anchoring. H6.x covers terrain snapshotting, map contracts, determinism checks, and substrate viewer; H6.10.x is closed and the ledger states the project is cleared to proceed to H7.x (infrastructure, supply, exhaustion mechanics). See docs/PROJECT_LEDGER.md for Phase 3A–3D, Phase 6D/E, Phase E, F, G4, H6.4.x, H6.10.G4b and related entries.
**Partial.** Political control initialization and visualization are in place; front and pressure substrate exist (front_edges, pressure diffusion). Treaty acceptance and control-flip proposals exist. Collapse gating (Phase 3C) produces eligibility only; a full collapse resolution chain tying eligibility to territorial flip and authority collapse is not complete. Authority and control change mechanisms (sustained pressure, internal collapse, negotiation) are not fully wired to territorial flip. Front hardening and AoR instantiation logic are not complete.
**Blocked / open.** Supply and corridors (Open/Brittle/Cut), local production and degradation; population displacement as permanent capacity loss; front hardening as emergent behavior; full exhaustion accumulation enforcement (Phase 3B is in place; cross-track amplification and caps per canon are not fully enforced); external patrons; negotiation windows and pressure driving end-state; player agency erosion (command friction); internal fragmentation (Municipal Control Zones, intra-side political fragmentation). These are described in the canon but not implemented.
**Player today.** The player can run the dev runner and viewer, see settlements and political control, and expose posture and logistics levers. The player cannot run a full war loop to exhaustion or to a negotiation end-state.

## 2. Roadmap principles (derived from canon)

The following rules shape the roadmap and the order of phases. They are non-negotiable and are restated from the canonical documents.
**Strategic-level only.** The game is a strategic-level simulation; no tactical or unit-level control. Rulebook §2, Game Bible §3.
**Negative-sum war; no total victory.** Violence produces costs; exhaustion is irreversible; no purely military resolution. Rulebook §2, §15; Systems Manual §18, §20; Game Bible §13, §18; Engine Invariants §8.
**Authority, control, legitimacy, logistics are distinct.** No conflation; control does not imply authority. Rulebook §4, §7; Systems Manual §9; Engine Invariants §3; Game Bible §8.
**Municipalities (1991) are the base political units.** Settlements are nodes; connectivity and supply are traced through the settlement graph. Rulebook §3; Systems Manual §2; Game Bible §5.
**Fronts are emergent, not map primitives.** Fronts emerge where opposing formations meet; they are not drawn by the player. Rulebook §6; Systems Manual §6; Game Bible §7.
**Determinism is mandatory.** No randomness; no timestamps in derived artifacts; stable ordering; reproducibility. Engine Invariants §11; FORAWWV III.
**No new mechanics beyond existing docs.** The roadmap activates or extends only systems already specified in Rulebook, Systems Manual, Engine Invariants, Phase Specifications, and Game Bible.
**No hard-coded historical outcomes.** Historical conditions constrain possibilities but do not script results. Game Bible §2, §18.
**Why order matters.** Map and political substrate must be stable before supply and corridors (supply traces over the settlement graph and depends on control). Supply and corridors must exist before displacement and front hardening (displacement and front state depend on connectivity and supply). Exhaustion and collapse gating (Phase 3B/3C) must be enforced before negotiation pressure and end-state (negotiation windows open on exhaustion and fragmentation). Negotiation and end-state enforcement come after exhaustion and fragmentation are operational so that the game can terminate in a defined way.
**Cite source.** Rulebook v0.2.7 (§2–4, §6, §11–13), Systems Manual v0.2.7 (§2, §6–7, §18–20), Engine Invariants v0.2.7 (§8–11), Game Bible v0.2.7 (§5–6, §13–18).

## 3. Phase-by-phase roadmap

### Phase H7.x — Mechanics enablement (post–map stabilization)

**Purpose:** Transition from map correctness to supply and exhaustion mechanics enablement. Unlock supply state and corridor objects so that later phases (displacement, front hardening, exhaustion enforcement) have a substrate.
**Depends on:** H6.10.x closed; substrate and map contracts valid; determinism passing.
**Systems noting:** Supply and corridors (Systems Manual §14); exhaustion (Phase 3B, Systems Manual §18).
**Work items:** Derive supply state (Adequate, Strained, Critical) from settlement graph and corridor connectivity; introduce corridor objects with states Open, Brittle, Cut; derive local production capacity per municipality from canon; no new mechanics; audits for supply state and corridor state; determinism and contract validation on all new artifacts.
**Player-facing change:** Supply visibility and corridor state exposed in dev viewer or equivalent.
**Validation:** map:contracts:validate, typecheck, npm test, map:contracts:determinism pass; supply and corridor state derivations are deterministic and auditable.
**Ledger / canon impact:** Ledger entry for each H7 sub-phase. FORAWWV addendum only if a design insight is validated (do not edit FORAWWV automatically).

### Phase I.x — Authority and control at municipality and sub-municipality level

**Purpose:** Authority states (Consolidated, Contested, Fragmented) and full control-change mechanisms. Wire sustained pressure, internal collapse, and negotiation to territorial flip and stabilization.
**Depends on:** H7.x supply substrate in place.
**Systems noting:** Political control (Rulebook §4, Engine Invariants §9); authority (Systems Manual §9); settlement stabilization (Engine Invariants §5).
**Work items:** Authority state derivation per municipality and per MCZ where applicable; wire sustained opposing military pressure (via front-active settlements and eligibility rules) to control-change rules; wire internal authority collapse and fragmentation to control-change rules; wire negotiated transfer to control-change rules; stabilization period for newly captured settlements with reversal and authority penalties; invariant checks that control does not change without an authorized mechanism.
**Player-facing change:** Authority and control change feedback; stabilization consequences visible.
**Validation:** Engine Invariants §9 and §5 hold; no control change except via sustained pressure, internal collapse, or negotiation; ledger and audits document behavior.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum if authority/control semantics are clarified by implementation.

### Phase J.x — Supply, corridors, local production, degradation

**Purpose:** Corridors as explicit objects; supply tracing and degradation; local production and its irreversible degradation under stress.
**Depends on:** H7.x.
**Systems noting:** Logistics and supply (Systems Manual §14); war economy and local production (Systems Manual §15); supply and corridor invariants (Engine Invariants §4).
**Work items:** Corridor derivation from settlement graph and external links; supply state update each turn; local production capacity and degradation rules (authority, population, exhaustion, connectivity); corridor collapse cascades; enforce that supply recovery is slower than degradation; Brittle corridors apply continuous penalties.
**Player-facing change:** Supply and corridor state in UI; local production and degradation visible where relevant.
**Validation:** Supply recovery slower than degradation (Engine §4); corridors in exactly one state (Open, Brittle, Cut); determinism and audits.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum if corridor or local-production semantics are extended.

### Phase K.x — Population displacement as permanent capacity loss

**Purpose:** Displacement permanently reduces recruitment and authority; refugee concentration and trapped populations have defined effects.
**Depends on:** J.x supply and corridors.
**Systems noting:** Population and displacement (Systems Manual §12); Rulebook §9.
**Work items:** Displacement state derivation (sources and sinks); permanent capacity loss tables for recruitment and authority; refugee concentration effects (short-term manpower, exhaustion acceleration); trapped population and humanitarian pressure; audit that displacement does not grant reversible capacity gain.
**Player-facing change:** Displacement and capacity impact visible.
**Validation:** No reversible displacement capacity gain; displacement effects are permanent where canon says so.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum if displacement model is clarified.

### Phase L.x — Front formation and hardening as emergent

**Purpose:** Fronts emerge from opposing AoR contact; front state and hardening over time (defensive value and exhaustion cost).
**Depends on:** I.x control; J.x supply.
**Systems noting:** Fronts and combat (Rulebook §6); deployment and fronts (Systems Manual §6); front and combat invariants (Engine Invariants §6).
**Work items:** Front-edge derivation from AoR adjacency and opposing control; front state variables (pressure differential, stability, supply exposure, exhaustion); hardening rules (defensive value and exhaustion acceleration over time); ensure fronts exist only where sustained opposing control meets; no single combat resolution causes decisive territorial change.
**Player-facing change:** Front visibility and hardening feedback.
**Validation:** Fronts only where sustained opposing control meets (Engine §6); determinism; ledger entry.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum only if front semantics are extended.

### Phase M.x — Exhaustion accumulation and irreversibility

**Purpose:** Enforce monotonic exhaustion, cross-track amplification, and caps; align with Phase 3B and Phase 3C persistence and state-coherence gating.
**Depends on:** L.x fronts; J.x supply.
**Systems noting:** Phase 3B (Phase Specifications Appendix B); exhaustion subsystems (Systems Manual §18); exhaustion invariants (Engine Invariants §8).
**Work items:** Exhaustion caps and safeguards per turn and per edge; cross-track amplification across military, political, and societal dimensions; persistence and state-coherence gating consistent with Phase 3C; audit of exhaustion deltas each turn; no single-turn exhaustion spike.
**Player-facing change:** Exhaustion visibility and impact on options and outcomes.
**Validation:** Exhaustion monotonic and irreversible; no single-turn spike; invariants §8 hold.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum only if exhaustion model is extended.

### Phase N.x — External patrons and asymmetric pressure

**Purpose:** Conditional aid and pressure from external patrons; patron objectives can conflict with player goals.
**Depends on:** M.x exhaustion.
**Systems noting:** External patrons (Systems Manual §19); Rulebook §12.
**Work items:** Patron state and objectives; aid and pressure modifiers; effects on exhaustion and legitimacy; aid withdrawal or escalation consequences.
**Player-facing change:** Patron influence visibility.
**Validation:** Patron objectives may conflict with player goals; determinism.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum if patron model is clarified.

### Phase O.x — Negotiation pressure and end-state enforcement

**Purpose:** Negotiation windows open on exhaustion, fragmentation, and international pressure; treaty acceptance leads to terminal end_state; Brčko and competence rules enforced.
**Depends on:** M.x exhaustion; fragmentation (Q.x or earlier MCZ/fragmentation substrate).
**Systems noting:** Negotiation and war termination (Rulebook §13); negotiation and end states (Systems Manual §20); peace and negotiation invariants (Engine Invariants §10).
**Work items:** Negotiation window opening conditions (exhaustion, fragmentation, international pressure); treaty territorial clauses (transfer_settlements, recognize_control_settlements) as peace-triggering; brcko_special_status required or rejection with brcko_unresolved; competence bundles (customs + indirect_taxation; defence_policy + armed_forces_command); acceptance computation (deterministic breakdown, competence_factor); end_state write on accepted peace; post-peace processing skipped.
**Player-facing change:** Negotiation options and peace outcome; clear end of war.
**Validation:** Peace is terminal; Brčko required; first violation wins for rejection_reason; determinism.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum if treaty semantics are extended.

### Phase P.x — Player agency erosion (command friction)

**Purpose:** Orders are delayed, partially executed, or ignored as command cohesion erodes; player intent does not propagate cleanly in late-war conditions.
**Depends on:** M.x exhaustion; authority state.
**Systems noting:** Command friction (Rulebook §14); command and control degradation (Systems Manual §8); player action constraints (Systems Manual §21); "delays, partial compliance, misallocation of forces, or outright non-execution of directives" (§8).
**Work items:** Command coherence state per faction; delay and non-execution rules applied to directives (posture, logistics, AoR reshaping, OG authorization); player intent vs effective action derivation; institutional inertia and command degradation affecting execution.
**Player-facing change:** Command friction feedback; visible gap between directives issued and outcome.
**Validation:** No clean propagation in late-war; determinism.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum only if command model is extended.

### Phase Q.x — Internal fragmentation (same side)

**Purpose:** Municipal Control Zones (MCZs) when connectivity is severed and authority collapses; intra-side political fragmentation; reunification requires persistence.
**Depends on:** I.x authority; J.x connectivity and supply.
**Systems noting:** Fragmentation and enclaves (Rulebook §8); intra-side political fragmentation (Systems Manual §10); Municipal Control Zones (Systems Manual §11); fragmentation invariants (Engine Invariants §7).
**Work items:** MCZ derivation when settlement connectivity severed and authority collapses; each MCZ tracks local authority, supply, population access, exhaustion, stability; reunification requires restored connectivity, authority consolidation, and time; intra-side cohesion and splinter behavior (refusal to support allied fronts, divergent negotiation incentives, localized ceasefires); persistence over multiple turns for both fragmentation and reunification (one-turn fragmentation or reunification invalid).
**Player-facing change:** Fragmentation and reunification feedback.
**Validation:** Fragmentation and reunification multi-turn (Engine §7); determinism.
**Ledger / canon impact:** Ledger entry. FORAWWV addendum if MCZ semantics are clarified.

## 4. Milestones (cross-phase)

**First fully-running war loop.** Phases through L.x must be complete so that one full turn runs: pressure (Phase 3A) → exhaustion (Phase 3B) → front state (L.x) → supply/corridor update (J.x). Playtesting: run N turns, confirm no invariant violation; observe pressure, exhaustion, and front state evolving.
**Playable but unstable.** Phases through O.x must be complete; negotiation and end-state are in place; balance and tuning are not frozen. Playtesting: reach a negotiation window and accept a treaty; confirm end_state is written and war dynamics stop; verify Brčko and competence rules.
**Strategically credible simulation.** Exhaustion, displacement (K.x), fragmentation (Q.x), and command friction (P.x) are all operational. Playtesting: multi-session play; outcome variance from player choices and systemic feedback; no total victory; exhaustion and fragmentation visibly constrain options.
**Pre-1.0 content freeze.** All v1.0 systems listed in section 5 are present and enforced; content and copy locked; no new mechanics introduced. Playtesting: full run to end-state; validation chain and determinism pass; save/load and reproducibility confirmed.

## 5. Definition of v1.0 (hard gate)

**v1.0 is:** A deterministic, strategic-level simulation of the 1992–1995 Bosnian War with map substrate, political control, supply and corridors, displacement, fronts, exhaustion, external patrons, negotiation and treaty end-state, command friction, and internal fragmentation. The game is playable to an end-state (negotiated, imposed, or collapse). There is no total victory. Save/load fully reconstructs world, faction, municipality, MCZ, formation, and front states; determinism and the validation chain (map:contracts:validate, typecheck, npm test, map:contracts:determinism) pass.
**v1.0 is not:** Tactical combat, nation-building, scripted historical outcomes, or post-1.0 systems such as AI opponents, multiplayer, or additional conflicts. No promises beyond the systems listed here.
**Systems required for complete:** All canonical systems referenced in the phase list (sections 3 and 4) must be present and enforced per Engine Invariants and Phase Specifications; determinism and the validation chain must pass.
**Acceptable to defer to post-1.0:** AI opponents, multiplayer, extra content packs, UI polish beyond minimum playability, performance optimization beyond determinism and correctness.

## 6. Risk register (design + implementation)

**Over-agency.** Risk: player can bypass exhaustion or control rules. Mitigation: Phase I.x, O.x, P.x; invariant enforcement and audits; no control change without authorized mechanism.
**Collapse of exhaustion model.** Risk: exhaustion becomes reversible or single-turn collapse occurs. Mitigation: Phase M.x; Phase 3B/3C specs and Engine Invariants §8; monotonic exhaustion and caps.
**Hidden determinism leaks.** Risk: timestamps or randomness in new code or artifacts. Mitigation: every phase; map:contracts:determinism and codebase audits; FORAWWV III and VIII.2.
**Negotiation/end-state bypass.** Risk: peace not terminal or Brčko omitted. Mitigation: Phase O.x; Engine Invariants §10; explicit checks and rejection_reason.
**Fragmentation one-turn.** Risk: one-turn MCZ split or reunification. Mitigation: Phase Q.x; Engine Invariants §7; persistence requirements for fragmentation and reunification.

## 7. Open questions (strictly limited)

The following are open only where existing documents do not resolve them. Resolved debates (e.g. political control vs AoR, NW anchoring) are not restated.
Exact persistence threshold N (turns) for Phase 3B pressure→exhaustion and Phase 3C exhaustion→collapse gating, if not already fixed in Phase Specifications.
Choice of corridor topology source (e.g. settlement graph only vs external link dataset) and exact dependency/capacity/redundancy rules for corridor state (Open/Brittle/Cut) where the Systems Manual or Engine Invariants leave room for implementation choice.
Exact conditions and thresholds for negotiation window opening (exhaustion, fragmentation, international pressure) if not fully specified in Rulebook §13 or Systems Manual §20.
