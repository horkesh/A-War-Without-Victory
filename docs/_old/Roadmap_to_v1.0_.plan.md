---
name: Phase P0.0 Roadmap to v1.0
overview: Produce a single, authoritative, planning-only plan that specifies the exact content and structure of docs/ROADMAP_TO_V1_0.md and the Phase P0.0 ledger entry, derived entirely from the mandated canon docs and PROJECT_LEDGER.md, with no code or data changes.
todos:
  - id: todo-1769981377455-p9bdecozb
    content: "H7.x — Mechanics enablement (post–map stabilization): Purpose: transition from map correctness to supply and exhaustion mechanics enablement. Depends on: H6.10.x closed, substrate and contracts valid. Systems: Supply and corridors (Systems §14), exhaustion (Phase 3B, §18). Work items: Supply state derivation (Adequate/Strained/Critical) from graph and corridors; corridor objects and Open/Brittle/Cut; local production capacity derivation; no new mechanics. Player-facing: supply visibility and corridor state; validation: contracts and determinism pass; ledger entry; FORAWWV only if design insight."
    status: completed
  - id: todo-1769981391560-vlkt2koao
    content: |-
      I.0 — Military organization substrate (formations and command layers)

      Purpose: Instantiate military actors and command structure without resolving political outcomes.
      Depends on: H7.x mechanics enablement (supply, corridors, production).
      Systems: Systems Manual §§4–6, §13; Rulebook §2.3.

      To-dos:
      • Define militia emergence rules (early war, low cohesion, supply-sensitive).
      • Define brigade formation from militia/manpower pools.
      • Gate brigade activation on time, authority, and supply state.
      • Add formation lifecycle states (Forming / Active / Overextended / Degraded).
      • Enforce supply-driven degradation of formations.
      • Ensure militia and brigades do not own AoRs by default.

      Ledger: Entry required. FORAWWV only if formation semantics clarified.
    status: completed
  - id: todo-1769981405345-nziqc87bc
    content: |-
      I.0a — Corps as command layer

      Purpose: Add coordination layer without territorial ownership.
      Depends on: I.0 formations.

      To-dos:
      • Add Corps entities as command-only structures.
      • Enforce invariant: Corps do not own AoRs or settlements.
      • Allow Corps to coordinate brigades for timing and cohesion modifiers only.

      Ledger: Entry required.
    status: pending
  - id: todo-1769981443123-lfl7n1l3c
    content: |-
      I.0b — Operational Groups (OGs)

      Purpose: Temporary coordination overlays for focused operations.
      Depends on: I.0 formations, I.0a Corps.

      To-dos:
      • Define OGs as temporary overlays authorized by Corps.
      • Allow OGs to borrow battalion-equivalent manpower from brigades.
      • Apply coordination and timing modifiers within OG scope.
      • Enforce dissolution on cohesion loss or command degradation.
      • Enforce invariant: OGs never own AoRs.

      Ledger: Entry required.
    status: pending
  - id: todo-1769981449070-ypepdl910
    content: |-
      I.0c — Directive and commitment phases

      Purpose: Separate player intent from execution.
      Depends on: I.0–I.0b.

      To-dos:
      • Introduce Directive Phase at start of turn.
      • Allow player to issue strategic directives (posture, logistics priority, OG authorization).
      • Introduce Deployment Commitment Phase locking directives.
      • Enforce that downstream systems read committed directives only.

      Ledger: Entry required.
    status: pending
  - id: todo-1769981455604-mziggyyl1
    content: |-
      I.1 — Authority state derivation

      Purpose: Model political authority independently of military control.
      Depends on: I.0 military substrate, H7.x supply.

      Systems: Systems §9; Rulebook §4; Engine §9.

      To-dos:
      • Add authority states (Consolidated / Contested / Fragmented).
      • Derive authority per municipality and per MCZ (if present).
      • Degrade authority under prolonged Strained/Critical supply.
      • Degrade authority under isolation (Cut corridors).

      Ledger: Entry required. FORAWWV only if authority semantics clarified.
    status: pending
  - id: todo-1769981462859-56n8cecvc
    content: |-
      I.2 — Control change mechanisms

      Purpose: Allow territorial control change only via authorized paths.
      Depends on: I.1 authority.

      To-dos:
      • Wire sustained opposing military pressure to control-change eligibility.
      • Wire internal authority collapse to control-change eligibility.
      • Wire negotiated transfer to control-change eligibility.
      • Enforce invariant: no control change without authorized mechanism.

      Ledger: Entry required.
    status: pending
  - id: todo-1769981470155-d6dfn8lyx
    content: |-
      I.3 — Post-capture stabilization

      Purpose: Prevent instant consolidation after control change.
      Depends on: I.2.

      To-dos:
      • Implement stabilization window for newly captured settlements.
      • Apply authority and supply penalties during stabilization.
      • Allow reversals under renewed pressure.

      Ledger: Entry required.
    status: pending
  - id: todo-1769981477299-jpq5qmm8n
    content: |-
      J.0 — Corridor dynamics

      Purpose: Turn static corridor state into time-evolving system.
      Depends on: H7.x corridors.

      Systems: Systems §14; Engine §4.

      To-dos:
      • Update corridor state per turn (Open → Brittle → Cut).
      • Enforce recovery slower than degradation.
      • Apply continuous penalties for Brittle corridors.
      • Enforce invariant: exactly one state per corridor.

      Ledger: Entry required.
    status: pending
  - id: todo-1769981484970-htqkfzoz8
    content: |-
      J.1 — Supply tracing per turn

      Purpose: Make supply a dynamic constraint.
      Depends on: J.0.

      To-dos:
      • Recompute settlement and municipality supply state each turn.
      • Apply isolation effects immediately when corridors are Cut.
      • Prevent oscillation within a single turn.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987052406-sofsr35vc
    content: |-
      J.2 — Local production degradation

      Purpose: Make production a wasting asset.
      Depends on: J.1, I.1 authority.

      Systems: Systems §15.

      To-dos:
      • Degrade local production under authority loss.
      • Degrade local production under exhaustion and isolation.
      • Enforce partial irreversibility beyond thresholds.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987076177-8bb4dnj3a
    content: |-
      K.0 — Displacement derivation

      Purpose: Model population movement as permanent loss.
      Depends on: J.x supply dynamics.

      Systems: Systems §12; Rulebook §9.

      To-dos:
      • Derive displacement from prolonged Critical supply and isolation.
      • Derive displacement from collapse events.
      • Track displaced population deterministically.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987086970-tf7d6bp7p
    content: |-
      K.1 — Capacity loss effects

      Purpose: Apply permanent consequences of displacement.
      Depends on: K.0.

      To-dos:
      • Apply permanent recruitment capacity loss.
      • Apply permanent authority capacity loss.
      • Implement refugee concentration effects.
      • Implement trapped population humanitarian pressure.
      • Enforce no reversible displacement gains.

      Ledger: Entry required. FORAWWV only if displacement semantics clarified.
    status: pending
  - id: todo-1769987343249-j368avd0n
    content: |-
      L.0 — Front emergence

      Purpose: Derive fronts only from sustained opposition.
      Depends on: I.x control, J.x supply.

      Systems: Rulebook §6; Systems §6; Engine §6.

      To-dos:
      • Derive front edges from opposing AoR adjacency.
      • Enforce sustained-contact requirement for front existence.
      • Prevent fronts in pre-frontline phase.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987382207-7yytmn6g3
    content: |-
      L.1 — Front state and hardening

      Purpose: Make fronts costly and sticky over time.
      Depends on: L.0.

      To-dos:
      • Add front state variables (pressure, stability, supply exposure, exhaustion).
      • Implement front hardening over time.
      • Apply exhaustion acceleration on hardened fronts.
      • Enforce invariant: no decisive territorial change in one resolution.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987404039-2uvm7de0f
    content: |-
      M.0 — Exhaustion accumulation

      Purpose: Enforce exhaustion as irreversible driver.
      Depends on: L.x fronts, J.x supply.

      Systems: Phase 3B; Systems §18; Engine §8.

      To-dos:
      • Enforce monotonic exhaustion accumulation.
      • Implement per-turn exhaustion caps.
      • Prevent single-turn exhaustion spikes.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987415094-x3h5lahfk
    content: |-
      M.1 — Cross-track amplification

      Purpose: Link military, political, and societal exhaustion.
      Depends on: M.0.

      To-dos:
      • Implement cross-track amplification rules.
      • Align persistence with Phase 3C gating.
      • Audit exhaustion deltas per turn.

      Ledger: Entry required. FORAWWV only if exhaustion semantics clarified.
    status: pending
  - id: todo-1769987425267-ckyagftzu
    content: |-
      N.0 — Patron entities and objectives

      Purpose: Introduce asymmetric external pressure.
      Depends on: M.x exhaustion.

      Systems: Systems §19; Rulebook §12.

      To-dos:
      • Add patron entities with objectives.
      • Enforce divergence between patron and player goals.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987519347-krfaygl1l
    content: |-
      N.1 — Patron effects

      Purpose: Make patrons matter materially.
      Depends on: N.0.

      To-dos:
      • Apply patron aid as supply/corridor modifiers.
      • Apply patron pressure as exhaustion amplifiers.
      • Implement aid withdrawal and escalation.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987530792-lvrhest6z
    content: |-
      O.0 — Negotiation window

      Purpose: Allow war termination only under pressure.
      Depends on: M.x exhaustion, fragmentation.

      Systems: Rulebook §13; Systems §20; Engine §10.

      To-dos:
      • Open negotiation windows based on exhaustion, fragmentation, patron pressure.
      • Prevent negotiation outside window.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987540803-27v4kps5h
    content: |-
      O.1 — Treaty enforcement

      Purpose: End the war deterministically.
      Depends on: O.0.

      To-dos:
      • Enforce Brčko special status requirement.
      • Enforce competence bundle requirements.
      • Compute deterministic acceptance.
      • Write terminal end_state and halt simulation.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987551406-gj4f7k028
    content: |-
      P.0 — Command coherence

      Purpose: Erode clean player control late-war.
      Depends on: M.x exhaustion, I.x authority.

      Systems: Systems §8; Rulebook §14.

      To-dos:
      • Add command coherence state per faction.
      • Degrade coherence under exhaustion and fragmentation.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987562039-m9cq5fxy7
    content: |-
      P.1 — Directive distortion

      Purpose: Break intent → outcome mapping.
      Depends on: P.0.

      To-dos:
      • Delay directive execution.
      • Apply partial compliance.
      • Apply non-execution under low coherence.
      • Audit intent vs outcome divergence.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987572241-sjrznqsse
    content: |-
      Q.0 — MCZ derivation

      Purpose: Allow same-side fragmentation.
      Depends on: I.x authority, J.x connectivity.

      Systems: Systems §10–11; Engine §7.

      To-dos:
      • Detect connectivity severance with authority collapse.
      • Instantiate MCZs deterministically.
      • Track MCZ-local authority, supply, exhaustion, stability.

      Ledger: Entry required.
    status: pending
  - id: todo-1769987582354-ibhemm2sa
    content: |-
      Q.1 — Persistence and reunification

      Purpose: Prevent one-turn fragmentation or reunification.
      Depends on: Q.0.

      To-dos:
      • Enforce multi-turn persistence for fragmentation.
      • Require connectivity, authority consolidation, and time for reunification.
      • Implement intra-side splinter behavior and divergent negotiation incentives.

      Ledger: Entry required.
    status: pending
isProject: false
---

# Phase P0.0 — Full project roadmap to v1.0 (planning only)

## Objective

Produce the **plan** for creating exactly one output document, [docs/ROADMAP_TO_V1_0.md](docs/ROADMAP_TO_V1_0.md), and one ledger append to [docs/PROJECT_LEDGER.md](docs/PROJECT_LEDGER.md). Execution (writing the files) will occur only after user approval. No code, data, or geometry may be modified.

## Research summary

**Ledger (DONE vs OPEN):**

- **DONE:** Map substrate (Path A, settlements_substrate.geojson, 110 mun1990 registry, legacy NW anchoring per Phase G4/G4b); Phase 1 contact graph and Phase 2 enriched graph; Phase 3A–3D (pressure eligibility/diffusion, pressure→exhaustion, exhaustion→collapse gating, collapse resolution); Phase 4A/B (dev runner, HTML dev viewer); Phase 5A–D (posture, logistics prioritization, loss-of-control exposure); Phase 6A–6E and C/D/E (mun1990 remap, census authority, political control init and derivation, dev visualization); Phase F (ControlStatus API, treaty/negotiation modules); H6.x (terrain snapshotting, contracts, determinism, substrate viewer; H6.10.x CLOSED). Ledger explicitly states: "Project cleared to proceed to H7.x (infrastructure, supply, exhaustion mechanics)."
- **PARTIAL:** Authority/control at municipality level (init and derivation done; change mechanisms—sustained pressure, internal collapse, negotiation—not fully wired to territorial flip). Front formation (emergent in design; engine has front_edges/pressure; full hardening and AoR instantiation logic not complete).
- **OPEN (canon-described, not implemented):** Supply and corridors (Open/Brittle/Cut), local production and degradation; population displacement as permanent capacity loss; front hardening as emergent behavior; exhaustion accumulation enforcement (3B in place; cross-track amplification and caps per canon); external patrons; negotiation windows and pressure driving end-state; player agency erosion (command friction); internal fragmentation (MCZs, intra-side political fragmentation).

**Phase naming (from ledger):** H6.x (map/terrain), H6.10.x CLOSED; H7.x = next (infrastructure, supply, exhaustion). Use H7.x, I.x, J.x, K.x, L.x, M.x for subsequent tranches. No "Appendix E" exists in canon; "Appendix E alignment" in the spec is interpreted as alignment with **Rulebook §13, Systems Manual §20, Engine Invariants §10** (negotiation, peace treaty mechanics, end-state enforcement).

**Canon axioms (non-negotiable):**

- Strategic-level only; negative-sum war; no total victory; exhaustion irreversible (Rulebook, Game Bible, Engine §8).
- Authority, control, legitimacy, logistics distinct (Rulebook §4–7, Systems §9, Engine §3).
- Municipalities (1991) base political units; settlements as nodes; fronts emergent, not map primitives (Rulebook §3–6, Systems §2, §6).
- Determinism mandatory (Engine §11, FORAWWV III).
- Political control initialized before fronts/AoR; change only via sustained pressure, internal collapse, or negotiation (Rulebook §4, Engine §9).

**Validation commands (from user spec and FORAWWV VIII.2):** `npm run map:contracts:validate`, `npm run typecheck`, `npm test`, `npm run map:contracts:determinism`.

---

## 1. Plan for ROADMAP_TO_V1_0.md structure and content

The document must be **single markdown file**, **text only (no diagrams)**, **sentence case headings**, **no blank lines between paragraphs**, and assume the reader is the same engineer resuming in six months.

### 1) Current baseline (factual, no speculation)

- **DONE:** Map substrate canonical (settlements_substrate.geojson, mun1990 registry 110, Phase 1/2 contact and enriched graph); Phase 3A–3D implemented and frozen; Phase 4–5 dev runner/viewer and player levers (posture, logistics); Phase 6x and C/D/E (mun1990, census, political control init and derivation); Phase F (ControlStatus, treaty/negotiation); Phase G4/G4b (NW legacy anchoring); H6.x terrain and contracts; H6.10.x closed.
- **PARTIAL:** Political control initialization and visualization; front/pressure substrate; treaty acceptance and control-flip proposals exist; collapse gating produces eligibility only (no full resolution chain).
- **BLOCKED/OPEN:** Supply/corridors, displacement as capacity loss, front hardening, full exhaustion enforcement, external patrons, negotiation windows and pressure, command friction, MCZs and intra-side fragmentation.
- **Player today:** Can run dev runner/viewer, see settlements and political control, expose posture and logistics levers; cannot run a full war loop to exhaustion or negotiation end-state.

Cite ledger phases explicitly (e.g. Phase 3A–3D, Phase 6D/E, Phase E, F, G4, H6.4.x, H6.10.G4b).

### 2) Roadmap principles (derived from canon)

- Extract and restate: strategic-level only; negative-sum; exhaustion irreversible; authority/control/legitimacy/logistics distinct; municipalities base units; fronts emergent; determinism mandatory; no new mechanics beyond existing docs; no hard-coded historical outcomes.
- Cite source: Rulebook v0.2.7 (§2–4, §6, §11–13), Systems Manual v0.2.7 (§2, §6–7, §18–20), Engine Invariants v0.2.7 (§8–11), Game Bible v0.2.7 (§5–6, §13–18).
- Explain **why order matters:** map and political substrate before supply; supply and corridors before displacement and front hardening; exhaustion and collapse gating before negotiation pressure; negotiation/end-state after exhaustion and fragmentation are operational.

### 3) Phase-by-phase roadmap (core)

For **each** phase include: **Phase &lt;ID&gt; — &lt;Name&gt;**; **Purpose**; **Depends on**; **Systems noting** (canonical system names from Rulebook/Systems Manual only); **Work items** (bulleted, concrete, deterministic; prefer audits, state derivations, enforcement layers); **Player-facing change**; **Validation** (completion criteria and expected failure modes); **Ledger / canon impact** (ledger entry expected; FORAWWV addendum possible only when flagged, do not edit FORAWWV automatically).

**Phases to include (minimum set):**

- **H7.x — Mechanics enablement (post–map stabilization):** Purpose: transition from map correctness to supply and exhaustion mechanics enablement. Depends on: H6.10.x closed, substrate and contracts valid. Systems: Supply and corridors (Systems §14), exhaustion (Phase 3B, §18). Work items: Supply state derivation (Adequate/Strained/Critical) from graph and corridors; corridor objects and Open/Brittle/Cut; local production capacity derivation; no new mechanics. Player-facing: supply visibility and corridor state; validation: contracts and determinism pass; ledger entry; FORAWWV only if design insight.
- **I.x — Authority and control at municipality and sub-municipality level:** Purpose: authority states (Consolidated/Contested/Fragmented) and control-change mechanisms. Depends on: H7.x supply substrate. Systems: Political control (Rulebook §4, Engine §9), authority (Systems §9). Work items: Authority state derivation per municipality/MCZ; wiring sustained pressure and internal collapse to control-change rules; stabilization period for newly captured settlements (Engine §5). Player-facing: authority and control change feedback. Validation: invariants hold; no control change without authorized mechanism. Ledger; FORAWWV if authority/control semantics clarified.
- **J.x — Supply, corridors, local production, degradation:** Purpose: corridors as explicit objects; supply tracing and degradation. Depends on: H7.x. Systems: Systems §14–15, Engine §4. Work items: Corridor derivation from settlement graph and external links; supply state update per turn; local production capacity and degradation rules; corridor collapse cascades. Player-facing: supply and corridor state in UI. Validation: supply recovery slower than degradation (Engine §4). Ledger; FORAWWV if corridor semantics extended.
- **K.x — Population displacement as permanent capacity loss:** Purpose: displacement reduces recruitment and authority permanently. Depends on: J.x supply/corridors. Systems: Systems §12, Rulebook §9. Work items: Displacement state derivation (sources/sinks); permanent capacity loss tables; refugee concentration and trapped-population effects. Player-facing: displacement and capacity impact. Validation: no reversible displacement capacity gain. Ledger; FORAWWV if displacement model clarified.
- **L.x — Front formation and hardening as emergent:** Purpose: fronts emerge from opposing AoR contact; hardening over time. Depends on: I.x control, J.x supply. Systems: Rulebook §6, Systems §6. Work items: Front-edge derivation from AoR adjacency; front state (pressure differential, stability, supply exposure, exhaustion); hardening rules (defensive value and exhaustion). Player-facing: front visibility and hardening feedback. Validation: fronts only where sustained opposing control meets (Engine §6). Ledger; FORAWWV only if front semantics extended.
- **M.x — Exhaustion accumulation and irreversibility:** Purpose: enforce monotonic exhaustion and cross-track amplification. Depends on: L.x fronts, J.x supply. Systems: Phase 3B, Systems §18, Engine §8. Work items: Exhaustion caps and safeguards; cross-track amplification; persistence and state-coherence gating; audit of exhaustion deltas. Player-facing: exhaustion visibility and impact. Validation: exhaustion monotonic; no single-turn spike. Ledger; FORAWWV only if exhaustion model extended.
- **N.x — External patrons and asymmetric pressure:** Purpose: conditional aid and pressure from external actors. Depends on: M.x exhaustion. Systems: Systems §19, Rulebook §12. Work items: Patron state and objectives; aid and pressure modifiers; exhaustion and legitimacy effects. Player-facing: patron influence visibility. Validation: patron objectives may conflict with player goals. Ledger; FORAWWV if patron model clarified.
- **O.x — Negotiation pressure and end-state enforcement:** Purpose: negotiation windows and treaty acceptance leading to terminal end-state. Depends on: M.x exhaustion, fragmentation. Systems: Rulebook §13, Systems §20, Engine §10. Work items: Negotiation window opening conditions (exhaustion, fragmentation, international pressure); treaty territorial clauses and Brčko; acceptance computation (deterministic breakdown); end_state write on acceptance. Player-facing: negotiation options and peace outcome. Validation: peace is terminal; Brčko required. Ledger; FORAWWV if treaty semantics extended.
- **P.x — Player agency erosion (command friction):** Purpose: orders delayed, partially executed, or ignored as cohesion erodes. Depends on: M.x exhaustion, authority. Systems: Rulebook §14, Systems §8, §21. Work items: Command coherence state; delay and non-execution rules; player intent vs effective action. Player-facing: command friction feedback. Validation: no clean propagation in late-war. Ledger; FORAWWV only if command model extended.
- **Q.x — Internal fragmentation (same side):** Purpose: MCZs and intra-side political fragmentation. Depends on: I.x authority, J.x connectivity. Systems: Rulebook §8, Systems §10–11, §11 MCZs. Work items: MCZ derivation when connectivity severed and authority collapses; reunification persistence; intra-side cohesion and splinter behavior. Player-facing: fragmentation and reunification feedback. Validation: fragmentation and reunification multi-turn (Engine §7). Ledger; FORAWWV if MCZ semantics clarified.

Order and IDs (H7, I, J, K, L, M, N, O, P, Q) are illustrative; the actual roadmap document will use a single consistent scheme (e.g. H7.x then I.x … through Q.x or equivalent) and may add sub-phases (e.g. H7.1, H7.2) where the ledger pattern supports it.

### 4) Milestones (cross-phase)

Define explicitly:

- **First fully-running war loop:** Phases through L.x (or equivalent) such that one full turn runs: pressure → exhaustion → front state → supply/corridor update. Playtesting: run N turns, confirm no invariant violation.
- **Playable but unstable:** Through O.x (or equivalent); negotiation and end-state in place but balance and tuning not frozen. Playtesting: reach negotiation window and accept treaty; confirm end_state.
- **Strategically credible simulation:** Exhaustion, displacement, fragmentation, and command friction all operational. Playtesting: multi-session, outcome variance from player choices and systemic feedback.
- **Pre-1.0 content freeze:** All v1.0 systems present and enforced; content and copy locked; no new mechanics.

Each milestone: list which phases must be complete; what kind of playtesting is meaningful.

### 5) Definition of v1.0 (hard gate)

- **v1.0 IS:** A deterministic, strategic-level simulation of the 1992–1995 Bosnian War with map substrate, political control, supply/corridors, displacement, fronts, exhaustion, external patrons, negotiation and treaty end-state, command friction, and internal fragmentation; playable to an end-state (negotiated, imposed, or collapse); no total victory; full save/load and determinism.
- **v1.0 is NOT:** Tactical combat, nation-building, scripted historical outcomes, or post-1.0 systems (e.g. AI opponents, multiplayer, additional conflicts). No promises beyond the listed systems.
- **Systems required for complete:** All canonical systems referenced in the phase list present and enforced per Engine Invariants and Phase Specifications; determinism and validation chain passing.
- **Acceptable to defer to post-1.0:** AI opponents, multiplayer, extra content packs, UI polish beyond minimum playability, performance optimization beyond determinism and correctness.

### 6) Risk register (design + implementation)

- **Over-agency:** Player can bypass exhaustion or control rules. Mitigation: Phase I.x, O.x, P.x; invariant enforcement and audits.
- **Collapse of exhaustion model:** Exhaustion reversible or single-turn collapse. Mitigation: Phase M.x; Phase 3B/3C specs and Engine §8.
- **Hidden determinism leaks:** Timestamps or randomness in new code. Mitigation: every phase; map:contracts:determinism and codebase audits.
- **Negotiation/end-state bypass:** Peace not terminal or Brčko omitted. Mitigation: Phase O.x; Engine §10.
- **Fragmentation one-turn:** One-turn MCZ split or reunification. Mitigation: Phase Q.x; Engine §7.

### 7) Open questions (strictly limited)

- Only list questions that **cannot** be resolved from existing documents (e.g. exact threshold N for persistence in Phase 3B/3C, or choice of corridor topology source). Do not restate resolved debates (e.g. political control vs AoR, or NW anchoring).

---

## 2. Plan for PROJECT_LEDGER.md append

Append a **single changelog entry** for Phase P0.0, in the same format as existing entries:

- **Heading:** **[YYYY-MM-DD] Phase P0.0: Full project roadmap to v1.0 (planning only, authoritative)**
- **Summary:** One-line description that the authoritative roadmap from current state to v1.0 was created and documented in docs/ROADMAP_TO_V1_0.md; planning only, no code or data changes.
- **Change:** ROADMAP_TO_V1_0.md created with seven sections (current baseline, roadmap principles, phase-by-phase roadmap, milestones, definition of v1.0, risk register, open questions). Ledger entry appended. No code, data, or geometry modified.
- **Files modified:** docs/ROADMAP_TO_V1_0.md (new), docs/PROJECT_LEDGER.md (append).
- **Mistake guard:** phase p0.0 roadmap to v1.0 planning only
- **FORAWWV note:** None unless the roadmap flags a systemic gap or contradiction; in that case state "Flag for FORAWWV addendum; do not edit FORAWWV.md automatically."

Use the actual date when the plan is executed (e.g. 2026-02-01).

---

## 3. Execution steps (after approval)

1. **Write** [docs/ROADMAP_TO_V1_0.md](docs/ROADMAP_TO_V1_0.md) in full, following the structure and content specified in section 1 above. Format: no blank lines between paragraphs; sentence case headings; text only; no diagrams.
2. **Append** the Phase P0.0 ledger entry to [docs/PROJECT_LEDGER.md](docs/PROJECT_LEDGER.md) at the end of the Changelog, using the template in section 2.
3. **Run validation (user-specified):** `npm run map:contracts:validate`, `npm run typecheck`, `npm test`, `npm run map:contracts:determinism`. If any fail, fix only what is necessary to pass (e.g. typecheck or test fixes); do not change roadmap or ledger content to satisfy validation unless the failure is in a file that was modified.
4. **Commit (user-specified):** `git add docs/ROADMAP_TO_V1_0.md docs/PROJECT_LEDGER.md` and `git commit -m "Phase P0.0 — Roadmap to v1.0"`.

---

## 4. Constraints reminder

- **Planning only until approval:** This plan does not create or edit any files. After approval, only the two deliverables (ROADMAP_TO_V1_0.md and PROJECT_LEDGER.md append) are written; no other code, data, or geometry changes.
- **No new mechanics:** All phases reference only systems already present in Rulebook, Systems Manual, Engine Invariants, and Game Bible.
- **No hard-coded historical outcomes:** Roadmap does not prescribe specific historical results.
- **Gaps/contradictions:** If the roadmap reveals a systemic gap or contradiction in the docs, the roadmap must FLAG that FORAWWV.md may need an addendum and must NOT edit FORAWWV.md.

---

## 5. Acceptance criteria (from user)

- ROADMAP_TO_V1_0.md exists and is internally consistent with all canon docs.
- Phases are sequenced logically and enforce the war-as-exhaustion model.
- No new mechanics are invented.
- The document could be used as the sole guide to finish the game.

