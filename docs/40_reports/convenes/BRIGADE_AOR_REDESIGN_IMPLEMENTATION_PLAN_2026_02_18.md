# Brigade AoR Redesign — Paradox Implementation Plan

**Date:** 2026-02-18  
**Source:** [docs/plans/2026-02-18-brigade-aor-redesign-study.md](../../plans/2026-02-18-brigade-aor-redesign-study.md)  
**Status:** Design approved; this plan delegates implementation to the Paradox team.  
**Orchestrator:** Sets single priority, convenes team, resolves cross-role conflicts. **Product Manager:** Deputy; owns scope, sequencing, handoff instructions.

---

## 1. Scope and Single Priority

**Deliver:** Replace municipality-based AoR with settlement-level positional AoR (1–4 settlements per brigade by personnel), add militia garrisons, pack/unpack movement, multi-brigade attack, linking, encirclement, then terrain battle width, battle damage, fog of frontage, and full Player UI — with calibration and tests.

**Single priority for first execution:** Complete **Phase A (Core AoR Rework)** and **Phase B (Militia Garrisons)** so the engine runs with the new model; all later phases depend on that foundation.

---

## 2. Paradox Team Role Assignment

| Role                                 | Responsibility in this effort                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Orchestrator**                     | Priority, convene, cross-role alignment; document decisions in ledger/convene reports.                                                       |
| **Product Manager**                  | Phased scope, sequencing, handoff memos, backlog vs. Phase A–L mapping.                                                                      |
| **Technical Architect**              | State schema (new fields, GAMESTATE_TOP_LEVEL_KEYS), pipeline step order, ADR for AoR/movement/recon.                                        |
| **Game Designer**                    | Design intent, militia vs brigade combat, linking/encirclement feel, calibration targets (e.g. Zvornik, Sarajevo).                           |
| **Gameplay Programmer**              | Phase logic: AoR cap, garrison, movement, attack resolution, militia, bots, encirclement (Phases A–G, H–I combat).                           |
| **Formation Expert**                 | AoR init from OOB, OG revision (donor AoR shedding), formation lifecycle vs movement state.                                                  |
| **Systems Programmer**               | Determinism, ordering, serialization (all new state, pathfinding BFS, multi-brigade resolution order).                                       |
| **Scenario Creator / Runner Tester** | Scenario init for new AoR (no municipality assignment), 52w runs, historical checks (Zvornik, enclaves).                                     |
| **Scenario Harness Engineer**        | Runner/preflight/diagnostics for new state fields; run_summary extensions if needed.                                                         |
| **Canon Compliance Reviewer**        | All behavior and state changes vs Phase II spec, Systems Manual; implementation-notes where needed.                                          |
| **QA Engineer**                      | Test strategy, regression, determinism tests; calibration verification (Phase L).                                                            |
| **Determinism Auditor**              | All new code paths (movement, militia, multi-brigade, recon, battle damage).                                                                 |
| **UI/UX Developer**                  | AoR painting, movement orders, fog-of-frontage visuals, settlement/OOB panels (Phase K).                                                     |
| **Graphics Programmer**              | Map rendering: three-tier front (defended/garrisoned/undefended), transit markers, battle damage overlay, recon markers (Phases C, I, J, K). |
| **Documentation Specialist**         | Phase II spec + Systems Manual updates, TACTICAL_MAP_SYSTEM, ledger/reports per docs-only-ledger-handling.                                   |
| **Reports Custodian**                | Place implementation/convene reports in docs/40_reports; update CONSOLIDATED_BACKLOG.                                                        |
| **Performance Engineer**             | Optional: profile after Phase A/B (garrison/pathfinding hotpaths).                                                                           |
| **Modern Wargame Expert**            | Advisory: UI truthfulness of fog/recon, player intent vs friction (no new mechanics).                                                        |

---

## 3. How Best to Do It

### Sequencing and dependencies

- **Phase A (Core AoR)** is the strict prerequisite: new constants, state (no `brigade_municipality_assignment`), personnel-based cap, contiguity for 1–4, garrison formula, init from OOB. **Technical Architect** and **Systems Programmer** must sign off on state schema and pipeline step list before large deletions.
- **Phase B (Militia Garrisons)** can start as soon as Phase A's garrison and battle resolution entry points are clear; it depends on Phase 0 org-pen (existing).
- **Phases C (Movement), D (Multi-Brigade & Linking), E (OG Revision), F (Bot AI), G (Encirclement)** depend on A+B. C and D can be parallelized after A+B (different files: movement vs attack resolution). E and F depend on D (linking/OG use new combat). G can follow D.
- **Phases H (Terrain Battle Width), I (Battle Damage), J (Fog of Frontage)** add optional depth; H and I can run in parallel after combat changes (D); J is mostly state + rendering.
- **Phase K (Player UI)** depends on C (movement orders) and J (fog) for full UX; can be started once movement and recon state are stable.
- **Phase L (Calibration & Testing)** is ongoing after each phase; a dedicated pass runs after A+B and again after F, then full pass after K.

### Recommended execution order

1. **A → B** (foundation; one "engine runs with new AoR + militia" checkpoint).
2. **C, D** in parallel (movement vs multi-brigade/linking), then **E, F, G** (OG, bots, encirclement).
3. **H, I** in parallel (terrain width, battle damage), then **J** (recon/fog).
4. **K** (Player UI) when movement and recon are stable.
5. **L** at each checkpoint and a final 52w + historical verification.

**Between every phase:** Run **/refactor-pass** (scope = files changed in that phase), then **git** (commit per phase), then proceed to the next phase.

### Key code touchpoints (for delegation)

- **State:** src/state/game_state.ts (new: `militia_garrison`, `brigade_movement_state`, `battle_damage`, `recon_intelligence`); src/state/serializeGameState.ts (GAMESTATE_TOP_LEVEL_KEYS).
- **AoR and pipeline:** src/sim/phase_ii/brigade_aor.ts (remove municipality layer, add personnel cap, init); src/sim/turn_pipeline.ts (replace/remove: validate-brigade-aor, rebalance-brigade-aor, enforce-brigade-aor-contiguity, apply-municipality-orders; add: process-brigade-movement, apply-aor-orders, detect-encirclement, compute-militia-garrisons).
- **Combat and militia:** src/sim/phase_ii/battle_resolution.ts (militia defender, multi-brigade attack, terrain width).
- **Bots:** src/sim/phase_ii/bot_brigade_ai.ts, src/sim/phase_ii/bot_corps_ai.ts (settlement-level AoR selection, movement orders).
- **Corps/OG:** src/sim/phase_ii/corps_directed_aor.ts, src/sim/phase_ii/operational_groups.ts.
- **Map/UI:** src/ui/map/MapApp.ts, src/ui/map/data/GameStateAdapter.ts; front lines and new layers per docs/20_engineering/TACTICAL_MAP_SYSTEM.md.

---

## 4. Phase-by-Phase Delegation

### Phase A: Core AoR Rework (Foundation)

- **Owner:** Gameplay Programmer. **Support:** Technical Architect (state schema, pipeline), Formation Expert (OOB → initial AoR), Systems Programmer (determinism, ordering).
- **Tasks:** New constants (PERSONNEL_PER_AOR_SETTLEMENT, MAX_AOR_SETTLEMENTS, etc.); remove `brigade_municipality_assignment` and municipality-based logic; implement personnel-based cap and 1–4 contiguous validation; revise garrison = personnel / aor_settlement_count; init `brigade_aor` from OOB at war start; delete rebalance, operational cap, deriveBrigadeAoRFromMunicipalities; update pipeline steps (validate only, no rebalance/apply-municipality).
- **Handoff:** Technical Architect approves state and pipeline list; Canon Compliance Reviewer checks Phase II spec alignment; Determinism Auditor reviews; then PM marks A complete.

### Phase B: Militia Garrisons

- **Owner:** Gameplay Programmer. **Support:** Game Designer (militia combat feel, depletion), Systems Programmer (sorted iteration).
- **Tasks:** `militia_garrison[settlement]` from Phase 0 org-pen + militia_pools; wire militia as defender in battle resolution; militia depletion from combat into militia_pools; MILITIA_COHESION, MILITIA_EQUIPMENT_MULT.
- **Handoff:** Game Designer signs off on militia vs brigade combat; Scenario Creator runs short scenario to confirm militia defends and depletes.

### Phase C–L

(Phases C through L: see source plan and Section 6 handoffs.)

---

## 5. Between-Phase Checkpoint: Refactor-Pass, Git, Next Phase

**After completing each phase (before starting the next), run this sequence:**

1. **/refactor-pass** — Scope: all files modified or created in that phase (`git diff --name-only` and `git diff --cached --name-only`). Apply refactor-pass checklist: remove dead code, extract duplication, inline over-engineered stubs, simplify conditionals, remove backward-compat shims. Verify: `npx tsc --noEmit` and `npx vitest run` pass.
2. **Git** — Commit the phase work (including any refactor-pass changes). Use commit-per-phase discipline: one commit per phase scope (e.g. "Phase A: Core AoR rework").
3. **Next phase** — Proceed to the next phase in the recommended order.

This keeps each phase boundary clean, avoids accumulation of dead code, and preserves auditability (one commit per phase).

---

## 6. Handoffs and Checkpoints

- **After Phase A:** Refactor-pass → git commit → Technical Architect + Canon Compliance Reviewer + Determinism Auditor sign-off; PM marks foundation ready for B.
- **After Phase A+B:** Refactor-pass → git commit → "Engine runs with new AoR + militia" checkpoint; Scenario Harness Engineer confirms runner and run_summary; Process QA (quality-assurance-process) on planning and first implementation batch.
- **After Phase D (or E):** Refactor-pass → git commit → Combat and linking stable; QA regression suite updated; Canon Compliance Reviewer updates Phase II / Systems Manual implementation-notes as needed.
- **After Phase K:** Refactor-pass → git commit → Full Player UI; Process QA and verification-before-completion; awwv-pre-commit-check before merge.
- **After Phase L:** Refactor-pass → git commit → Calibration report in 40_reports; CONSOLIDATED_IMPLEMENTED and ledger updated; Orchestrator closes "Brigade AoR Redesign" as delivered and sets next priority.

---

## 7. Risks and Mitigations (from study, assigned to roles)

| Risk                                           | Mitigation                                                                                      | Owner                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Garrison 10–100x higher breaks balance         | Calibration pass (Phase L); constants in single source                                          | Gameplay Programmer + Scenario Creator    |
| Bot cannot reason over 5,821 settlements       | Restrict bot to front-active + objective settlements; scoring in bot_brigade_ai                 | Gameplay Programmer                       |
| Municipality removal breaks callers            | Grep all `brigade_municipality_assignment` / `deriveBrigadeAoRFromMunicipalities` before delete | Technical Architect + Gameplay Programmer |
| Nondeterminism in pathfinding or multi-brigade | Sorted BFS and sorted brigade ID order; Determinism Auditor on every PR                         | Systems Programmer + Determinism Auditor  |
| Fog/recon confuses player                      | Staleness UI, "Last confirmed N turns ago"; Modern Wargame Expert advisory                      | UI/UX Developer                           |

---

**Next step:** Phase A assigned to Gameplay Programmer with Technical Architect and Formation Expert as first support roles. After each phase: /refactor-pass → git commit → next phase. Process QA after the first handoff (A+B complete).
