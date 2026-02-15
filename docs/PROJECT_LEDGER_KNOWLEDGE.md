# AWWV Project Ledger — Thematic Knowledge Base

**Last Updated:** 2026-02-15  
**Purpose:** Knowledge accumulation by theme. Chronological record remains in `docs/PROJECT_LEDGER.md` (append-only).

Use this doc to find decisions, patterns, and rationale by topic. For full changelog and artifact lists, see PROJECT_LEDGER.md.

---

## 1. Project Identity & Governance

**How to use:** Check project name, non-negotiables, current phase, and what work is allowed or disallowed. Update "Current Phase" and "Phase tracking" when milestones change.

### Identity

- **Project:** A War Without Victory (AWWV)
- **Type:** Wargame simulation prototype
- **Repository:** AWWV
- **Current Focus:** MVP declared; scope frozen

### Non-negotiables

1. **Path A Architecture:** Polygons are territorial micro-areas (`poly_id`), separate from settlement entities (`sid`). Polygons may link only via municipalities (`mid`). No forced 1:1 matching between polygons and settlements.
2. **Aggregate Row Filtering:** Any row containing "∑" in ANY cell must be excluded from settlement-level data. Aggregate rows are for validation only.
3. **Deterministic Builds:** All outputs must be deterministic — stable sorting, fixed precision (3 decimals for LOCAL_PIXELS_V2), canonical JSON key ordering, no timestamps.
4. **Empty GeoJSON is Valid:** Always emit valid GeoJSON even if features array is empty. Never skip writing GeoJSON when feature count is zero.
5. **Canvas Polygon Isolation:** Every polygon must use its own `beginPath()`, `moveTo()` for first vertex, and `closePath()` before fill/stroke. Never connect polygons across paths.
6. **Municipality Outline Handling:** Municipality outlines can be single polygons. Union operations must handle both single and multiple polygon cases. Use convex hull fallback when union is unreliable.
7. **Render-Valid Primary Gate:** Primary gate is render-valid (finite, non-zero area, non-self-intersecting/triangulatable). GIS-valid is diagnostic only. Use deterministic convex hull salvage when needed, but measure hull inflation.
8. **Settlement ID Uniqueness:** All `settlement_id` values must be globally unique. When duplicates are detected, generate deterministic remapped IDs and record remapping in an issues report.
9. **Napkin:** At session start, read `.agent/napkin.md`. Update it as you work.
10. **Append-Only History:** Ledger changelog is append-only. Do not rewrite old entries except in "Current state / Current phase" sections.

*(See PROJECT_LEDGER.md §Identity, §Non-negotiables.)*

### Current Phase

- **Phase:** Phase 6 (MVP declaration and freeze) — complete
- **Status:** MVP declared
- **Focus:** Scope frozen. **A1 tactical base map is STABLE** and is the basis for the game.
- **Key Work:** Phase 5 COMPLETE; Phase 6 COMPLETE (MVP declared 2026-02-08). Track A (A1 base map) COMPLETE. See `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md`.

### Phase tracking & milestones

| Milestone | Date |
|-----------|------|
| Path A adopted | 2026-01-24 |
| Municipality borders from drzava.js | 2026-01-24 |
| Phase 0/1 settlement substrate, adjacency | 2026-01-26–27 |
| Executive roadmap Phases 1–6 | 2026-02-06 |
| Phase A1 Base Map STABLE | 2026-02-07 |
| MVP declared | 2026-02-08 |
| Phase A (bots, victory, production) | 2026-02-09 |
| RBiH–HRHB alliance lifecycle implemented | 2026-02-09 |
| Phase 1 execution (authority derivation, browser Phase II advance, B1 events, B4 coercion) | 2026-02-10 |
| RBiH–HRHB Phase II gate (resolve_attack_orders blocks bilateral flips before rbih_hrhb_war_earliest_turn) | 2026-02-11 |
| Phase I no-flip policy final (player_choice GO; ethnic/hybrid NO-GO) | 2026-02-11 |
| Phase II battle resolution engine (terrain, casualty_ledger, snap events) | 2026-02-12 |
| RBiH-aligned municipalities (control/spawn always RBiH in eight muns) | 2026-02-12 |
| Scenario harness Phase II attack-resolution rollup in run_summary / end_report | 2026-02-13 |
| Orchestrator scenario-run handoffs (2026-02-12, 2026-02-13) for historical verification | 2026-02-12–13 |

### Allowed / Disallowed Work

**Allowed:** Map rebuild pipeline (Path A), polygon extraction, settlement metadata, municipality outline derivation, inspection tools, geometry validation, crosswalk updates, napkin updates.

**Disallowed:** 1:1 polygon-to-settlement matching; treating aggregate rows (∑) as settlements; skipping GeoJSON when zero features; connecting canvas polygons across paths; GIS-valid as hard gate; duplicate settlement IDs; rewriting old changelog entries; modifying raw files in `data/source/` (read-only).

*(See PROJECT_LEDGER.md §Allowed / Disallowed Work.)*

### Decision registry (key decisions with rationale)

| Date | Decision | Rationale | Consequences | Theme |
|------|----------|-----------|--------------|-------|
| 2026-01-24 | Adopt Path A (polygons ≠ settlements) | Previous 1:1 matching failed; incompatible ID schemes | Clean separation; polygons for viz, settlements point+graph | architecture |
| 2026-01-24 | Always emit GeoJSON with zero features | Downstream tools expect consistent structure | Empty GeoJSON valid; pipeline consistency | implementation |
| 2026-01-24 | Filter aggregate rows (∑) from settlement data | Aggregate rows are validation-only | Prevents totals becoming entities | implementation |
| 2026-01-24 | Render-valid primary gate, GIS-valid diagnostic | GIS too strict, drops usable geometry | More geometry preserved | architecture |
| 2026-01-24 | Municipality outlines can be single polygons | Union must handle single and multi | No rejection of valid single-polygon munis | architecture |
| 2026-01-24 | Convex hull fallback when union fails | Union unreliable for some geometries | Deterministic fallback + inflation reporting | architecture |
| 2026-01-24 | Measure hull inflation when using hull salvage | Convex hull can distort shapes | High-inflation flagged in metadata | architecture |
| 2026-01-24 | SVG ids as opaque geometry handles | SVG and Excel use different ID schemes | Explicit crosswalk; no silent mismatches | architecture |
| 2026-01-24 | Municipality borders from drzava.js | Union on micro-polygons fails; drzava has pre-authored shapes | Bypasses union; reliable border rendering | architecture |
| 2026-02-08 | MVP declared; scope frozen | Phase 6 complete; all gates green | Post-MVP in Phase 7 | process |
| 2026-02-09 | OOB primary sources: oob_brigades.json, oob_corps.json | Single canonical source for game and tools | Markdown/knowledge docs reference only | implementation |
| 2026-02-11 | Scenario init_control default → hybrid_1992 when init_control present | Avoid silent institutional default; settlement-majority by default | apr1992_phase_ii_4w and similar use hybrid unless overridden | implementation |
| 2026-02-11 | Phase I disable_phase_i_control_flip = military-action-only (not strict zero-flip) | Formation-led control pressure; militia-threshold path disabled | No-flip scenarios can still show control changes from military-action branch | implementation |
| 2026-02-11 | No-flip GO only for player_choice; ethnic/hybrid NO-GO | Calibration evidence: player_choice benefits; ethnic/hybrid 30w worse than default | Canonical no-flip scenario: player_choice_recruitment_no_flip_4w | process |
| 2026-02-11 | Phase II hard then dynamic brigade frontage cap | AoR ownership unchanged; combat power capped per brigade; urban fortress for large-urban muns | getBrigadeOperationalCoverageSettlements; BRIGADE_OPERATIONAL_AOR_HARD_CAP; large_urban_mun_data | architecture |
| 2026-02-11 | Ensure "every (faction, mun) has a brigade" only for brigade-home muns | Prevent 200+ settlement AoRs (e.g. 803rd Light); formation tags mun:* | homeMunsByFaction; ensure step assigns only when mun is brigade home | implementation |
| 2026-02-11 | MAX_MUNICIPALITIES_PER_BRIGADE = 8 in ensure step | Cap per-brigade municipality count in ensureBrigadeMunicipalityAssignment | First candidate below cap; no single brigade gets 200+ muns | implementation |
| 2026-02-12 | RBiH-aligned municipalities: eight muns always RBiH (control + spawn) | Maglaj, Bihać, Gradačac, Brčko, Tuzla, Lopare, Srebrenik, Tešanj; HVO subordinate to ARBiH | rbih_aligned_municipalities.ts; political_control_init, militia_emergence, control_flip, build_political_control_data | implementation |
| 2026-02-12 | Phase II combat: battle resolution engine (terrain, casualty_ledger, snap events) | Replace fixed 40/60 garrison combat with multi-factor engagements | battle_resolution.ts; casualty_ledger in GameState; terrain_scalars | implementation |
| 2026-02-12 | RBiH–HRHB gate in Phase II resolve_attack_orders | Block RBiH↔HRHB flips/casualties before rbih_hrhb_war_earliest_turn | Same gate as Phase I control_flip and alliance_update | implementation |
| 2026-02-13 | casualty_ledger in GAMESTATE_TOP_LEVEL_KEYS | Persist battle casualties in saves and Latest run | Serialization allowlist; 20w+ Phase II runs succeed | implementation |

*(See PROJECT_LEDGER.md §Decisions and changelog for full list.)*

---

## 2. Architecture & Systems Knowledge Base

**How to use:** Understand Path A, geometry contract, outline modes, and why certain approaches were chosen or abandoned. Link to ledger entries for dates.

### Path A Contract (current)

- **Polygons** (`poly_id`): Territorial micro-areas from SVG. Linked to municipalities via `mun_code` → `mid` crosswalk. NOT linked directly to settlements.
- **Settlements** (`sid`): Simulation entities from Excel. Point+graph entities, linked to municipalities via `mid`. NOT polygon entities.
- **Municipalities** (`mid`): Pre-1991 municipality IDs. Polygons and settlements both link via mid, not to each other.

*(See PROJECT_LEDGER.md §Geometry Contract (Path A).)*

### Path A Contract Evolution

- **2026-01-24:** Path A adopted; outline modes (mid / mun_code / national) clarified; drzava.js chosen for municipality borders to avoid union failures.
- **2026-01-25:** Inferred municipality borders permitted from settlement-derived outlines; determinism + invariants audit; municipality boundaries from polygon fabric adjacency (no union).
- **2026-01-26–27:** Phase 0/1 settlement substrate; adjacency and contact graph; SVG-derived substrate becomes canonical.
- **2026-02-07:** A1 base map STABLE; WGS84 Voronoi; canonical non-SVG settlements + 1990 municipality boundaries; bih_adm3_1990.geojson canonical for 1990 boundaries.

*(See PROJECT_LEDGER.md entries 2026-01-24 through 2026-02-07.)*

### Outline Modes

| Mode | Crosswalk present | Outlines file | Meaning |
|------|-------------------|---------------|---------|
| mid | yes | municipality_outline*.geojson | pre-1991 opštine borders |
| mun_code | no | mun_code_outline.geojson | map-pack partitions (inspection-only) |
| national | no | national_outline.geojson | BiH border only |

**Mode "mid":** Requires `data/source/mun_code_crosswalk.csv`; produces outlines keyed by pre-1991 `mid`.  
**Mode "mun_code":** Fallback when crosswalk missing; inspection only.  
**Mode "national":** Always produced; union of all polygons.

**Missing crosswalk:** Polygons have `mid = null`; mun_code outlines for inspection; national outline always created; settlement points in deterministic grid (synthetic).

*(See PROJECT_LEDGER.md §Geometry Contract.)*

### Geometry System Patterns

**Working:**

- Municipality borders from drzava.js (bypasses unreliable union).
- Convex hull fallback with hull inflation measurement when union fails.
- Settlement adjacency from shared-edge cancellation / boundary detection (Phase 1 canonical).
- Allocating Voronoi cells by stable order and subtracting prior masks to remove large overlaps (napkin).
- Area-based coverage diagnostics to avoid boolean failure noise (napkin).

**Failed / avoid:**

- Union operations on micro-polygons for municipality outlines (unreliable).
- Simplify + turf fallback alone for Voronoi polyclip failures (napkin).
- Gap-based salvage that collapses most municipalities to single polygons (too destructive) (napkin).
- Chaikin smoothing on Voronoi edges (visible white gaps; polygons no longer abut) (napkin).

*(See PROJECT_LEDGER.md 2026-01-24–26; .agent/napkin.md Patterns That Work / Don't Work.)*

---

## 3. Implementation Knowledge Repository

**How to use:** Find proven patterns (map, simulation, data), failed experiments, and domain expertise. Update from napkin and ledger when new patterns emerge.

### Proven Patterns

**Map & visualization**

- War Planning Map: `#warroom-scene` and `#map-scene`; only one visible; `openWarPlanningMap` → scene-open then `map.show()`; closeCallback → `showWarroomScene()` (napkin).
- Map viewer: derive `settlements_a1_viewer.geojson` from A1_BASE_MAP (role=settlement); use `getPoliticalControlKey()` for S-prefixed sid in political_control_data (napkin).
- WGS84 derivation: fallback to `data/_deprecated/derived/legacy_substrate/settlements_substrate.geojson` when derived path missing (napkin).
- Use `map:build:wgs84:from-geometry` when `settlements_wgs84_1990.geojson` exists (skips tessellation) (napkin).
- Split-muni merge: Voronoi loads from `data/derived/_audit/split_municipality_duplicate_settlements.json`; run `npm run map:audit:split-muni-duplicates` before full rebuild (napkin).
- Tactical map: canonical viewer for load-save and formations; `src/ui/map/`; `npm run dev:map` → http://localhost:3001/tactical_map.html. Required: settlements_a1_viewer.geojson, political_control_data.json (napkin).
- Start-control hardening: no-null invariant in `prepareNewGameState`; deterministic null coercion (municipality majority → neighbor majority → RBiH fallback) (napkin).

**Simulation & state**

- Smart-bot determinism: seeded RNG in BotManager; never `Math.random()` in bot logic; edge/formation traversal sorted before selection (napkin).
- Time-adaptive bots: optional `scenario_start_week`; deterministic week-based aggression taper; keep objective-edge planned-ops floor (napkin).
- Victory evaluation: end-of-run only (`run_summary.json` + `end_report.md`); no change to turn mechanics (napkin).
- Formation spawn: MIN_BRIGADE_SPAWN 800; new brigade at 800; phase-i-brigade-reinforcement to 2500; second brigade when pool ≥ 800. Authority: consolidated/contested/fragmented; fragmented → no spawn (napkin).
- Phase I displacement: on control flip when Hostile_Population_Share > 0.30; applyPhaseIDisplacementFromFlips; same routing/killed/fled-abroad as Phase II (napkin).
- Brigade AoR at Phase II: phase-ii-aor-init populates from political_controllers + formation home muns; `ensureFormationHomeMunsInFactionAoR` (napkin).
- **Brigade Operations canon (2026-02-10):** Implementation reference: `docs/40_reports/implemented/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md`. Canon was updated additively (Phase II Spec §4.3, §5, §7.1, §12; Systems Manual §2.1, §6.1–§6.4, §7, System 3/8, Appendix A; Engine Invariants §13.3, §14; Phase I §4.3.6). No existing canon text removed.
- **Recruitment system canon (2026-02-11):** Implementation reference: `docs/40_reports/implemented/recruitment_system_implementation_report.md`, design: `docs/40_reports/implemented/recruitment_system_design_note.md`. Canon updated additively: Systems Manual §13 (brigade activation at Phase I entry, player_choice vs auto_oob); Phase I implementation-note (recruitment_mode); MILITIA_BRIGADE_FORMATION_DESIGN §10 (recruitment mode, emergent suppression), §9 (MAX_BRIGADE_PERSONNEL 3000, reinforcement rate limit); context.md and CANON.md refs; REPO_MAP recruitment_engine/recruitment_types. No existing canon text removed.
- OOB primary sources: brigades = `data/source/oob_brigades.json`, corps = `data/source/oob_corps.json`; all tools/code canonical (napkin).
- Authority derivation for formation lifecycle: `deriveMunicipalityAuthorityMap(state)` in `src/state/formation_lifecycle.ts` maps consolidated=1, contested=0.5, fragmented=0.2 (sorted mun order); used by brigade activation gating through `update-formation-lifecycle`. Canonical implementation reference: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §8.1.1.
- Browser Phase II advance: `src/sim/run_phase_ii_browser.ts` provides warroom-safe advance (turn increment + AoR initialization when AoRs are empty) using shared Node-free helpers in `src/scenario/aor_init.ts`.
- B1 events framework: `src/sim/events/event_types.ts`, `event_registry.ts`, `evaluate_events.ts`; pipeline `evaluate-events` step emits deterministic `events_fired` (historical + seeded random, report-only).
- B4 coercion tracking (implementation extension): optional `coercion_pressure_by_municipality` in state reduces Phase I flip threshold in `src/sim/phase_i/control_flip.ts` with deterministic bounds.
- Capability-weighted Phase I flip (implementation extension): Phase I control flip scales attacker strength and defender effectiveDefense by `getFactionCapabilityModifier` (System 10 / Appendix D). Pipeline step `phase-i-capability-update` runs before `phase-i-control-flip` so profiles are set by year. Doctrine keys deterministic (ATTACK for attacker, DEFEND/STATIC_DEFENSE for defender). See `docs/40_reports/backlog/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md` and ledger 2026-02-10 RBiH wipe-out fix.
- **Phase I no-flip policy (2026-02-11):** Final calibration from 12w/30w matrix, 3x3 knob grid, and attack-scale sweep. Ethnic/hybrid: NO-GO for `disable_phase_i_control_flip` (default militia-pressure remains canonical). Player_choice: GO for recruitment-centric scenarios (RS 2834 vs 3329 at 30w). Knobs (attack_scale, stability_buffer_factor) apply only when no-flip enabled; player_choice invariant across tested range. See `docs/40_reports/implemented/PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md`.
- **RBiH-aligned municipalities (2026-02-12):** Single source `src/state/rbih_aligned_municipalities.ts` (Maglaj, Bihać, Gradačac, Brčko, Tuzla, Lopare, Srebrenik, Tešanj). Applied in political_control_init (all init paths), militia_emergence (HRHB strength → RBiH), control_flip (flip winner HRHB → RBiH override), build_political_control_data (MUN_NORMALIZATIONS). Control and spawns always RBiH there (napkin).
- **Phase II battle resolution (2026-02-12):** `src/sim/phase_ii/battle_resolution.ts`; terrain scalars, casualty_ledger, multi-factor combat power, outcome thresholds; four snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade). Deterministic; sorted iteration; no RNG (napkin).
- **Brigade operational cap (2026-02-11):** Hard then dynamic cap per brigade; `getBrigadeOperationalCoverageSettlements`; urban fortress for large-urban muns (≥60k 1991) via `large_urban_mun_data.ts`; UI and sim share `src/state/brigade_operational_cap.ts`. MAX_MUNICIPALITIES_PER_BRIGADE (8) in ensure step (2026-02-13) (napkin).
- **Brigade AoR overhaul (2026-02-14):** Corps-directed assignment when `state.corps_command` present: partition front into corps sectors, allocate brigades along each sector's frontline (home mun + up to 2 contiguous neighbors), derive settlement AoR, enforce contiguity (repair, orphan reassignment). Contiguity is a hard invariant; rebalance shed uses `wouldRemainContiguous` guard. Legacy Voronoi BFS when no corps (Phase I / tests). Tactical map AoR highlight: compound fill (evenodd), outer boundary only, breathing glow. Report: `docs/40_reports/implemented/BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md`; canon: Phase II §7.1, Systems Manual §2.1/§8, TACTICAL_MAP_SYSTEM Pass 6.
- **Phase I no-flip semantics (2026-02-13):** `disable_phase_i_control_flip` = military-action-only (militia-pressure path disabled; formation-led flips still possible). Scenario names with no_flip do not imply strict zero control changes (napkin).
- **Scenario harness diagnostics (2026-02-13):** `run_summary.json` includes `phase_ii_attack_resolution` (weeks_with_phase_ii, orders_processed, flips_applied, casualty_attacker/defender); end_report section "Phase II attack resolution (pipeline)" for diagnosing 0-flip Phase II outcomes (napkin).
- **Clone centralization (2026-02-11):** Single `cloneGameState` in `src/state/clone.ts` used by all turn pipelines and browser runners; avoids six duplicate polyfills (napkin).

**Data & tooling**

- PowerShell: use `;` not `&&` for command chaining (napkin).
- Null-control tracing: MapApp → DataLoader → political_control_data.json → build_political_control_data.ts → prepareNewGameState → initializePoliticalControllers; fix at init/source (napkin).

*(See .agent/napkin.md Patterns That Work; PROJECT_LEDGER.md changelog for implementation entries.)*

### Failed Experiments & Lessons

**Geometry / build**

- Voronoi boolean ops: normalization/simplify still left failures and patches → use post-merge coverage/overlap validation per mun1990 (napkin Corrections).
- Martinez polygon clipping: default import ESM error → use namespace import `* as martinez` (napkin).
- JSTS: package root has no index.js → import from `jsts/org/locationtech/jts/io/*.js` (napkin).
- Simplify + turf fallback: did not reduce polyclip failures (napkin).
- Chaikin smoothing on Voronoi: white gaps; reverted (napkin).

*(See .agent/napkin.md Corrections, Patterns That Don't Work.)*

### Domain Expertise

**Historical OOB & naming**

- Balkan Battlegrounds: VRS OOB in Appendix G (pp. 496–501); ARBiH/HVO from narrative and regional charts; vojska.net for HVO. Ingest: `npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode extract --page-start 401 --page-end 501` (napkin).
- OOB primary sources: oob_brigades.json, oob_corps.json canonical; markdown reference only (napkin).
- Formation names: OOB-loaded from oob_brigades.json; emergent spawn uses historicalNameLookup (faction, mun_id, ordinal) (napkin).
- Bosansko Petrovo Selo / Petrovo → home_mun **gracanica** (napkin).
- Novi Grad = Bosanski Novi (northwestern BiH, mun1990 bosanski_novi); Novi Grad Sarajevo = separate Sarajevo borough (novi_grad_sarajevo); do not conflate (napkin).
- Bosanski Novi: name change only (Novi Grad), not a split; exclude from split-muni audit (napkin).

**Scenarios & control**

- Phase 0: start_phase "phase_0"; phase_0_referendum_turn, phase_0_war_start_turn; do not populate AoR at init (napkin).
- Phase I start: start_phase "phase_i"; war_start_turn=0, referendum_held=true; e.g. apr1992_phase_i_to_apr1993_52w.json (napkin).
- Sept 1992: init_control as path to file with `settlements` array for settlement-level control (Sarajevo, Srebrenica, Sapna); spec: docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md (napkin).
- Displaced pool: flows split by source mun 1991 ethnicity into displaced_in_by_faction; killed + fled-abroad in displacement.ts (napkin).

**Environment & process**

- OneDrive file locks: census_rolled_up_wgs84.json, settlement_graph_wgs84.json, map_viewer/index.html — errno -4094; retry; pause sync if needed (napkin).
- docs/50_research: README_KNOWLEDGE_BASE.md indexes assets; PDF extract not reliably readable; use markdown/code or human extraction (napkin).
- External expert handover: docs/40_reports/handovers/EXTERNAL_EXPERT_HANDOVER.md; map-only GUI handover separate (napkin).
- Early docs implementation plan: docs/40_reports/backlog/IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md; Phase 7; Phase A implemented (bots, victory, production) (napkin).
- **803rd Light / brigade AoR cap (2026-02-11/13):** Ensure step assigns uncovered (faction, mun) only when mun is a brigade home (formation tags `mun:*`); MAX_MUNICIPALITIES_PER_BRIGADE (8) caps per-brigade mun count in that step. See docs/40_reports/implemented/BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md (napkin).
- **Brigade strength after combat:** Battle resolution applies losses in-place; phase-ii-brigade-reinforcement runs after attack resolution. Final save can show brigades < 3000 personnel; tactical map shows f.personnel from state (napkin).
- **Orchestrator scenario-run handoff:** Run canonical scenarios (e.g. apr1992_phase_ii_4w, apr1992_4w, player_choice_recruitment_no_flip_4w), capture outDir/run_id and end_report paths, then create handoff doc (docs/40_reports/) for scenario-creator-runner-tester to check vs historical expected outcomes (napkin).

*(See .agent/napkin.md Domain Notes; PROJECT_LEDGER.md for detailed changelog.)*

---

## 4. Canon & Specifications Evolution

**How to use:** Current canon docs, version, and a log of specification changes. For full text see `docs/10_canon/`.

### Current canon documents

| Document | Version | Scope |
|----------|---------|--------|
| Game_Bible | v0_5_0 | Design philosophy, constraints, v0.4 design additions |
| Rulebook | v0_5_0 | Player-facing rules, v0.4 player-facing additions |
| Engine_Invariants | v0_5_0 | Determinism, milestones §J, v0.4 extensions A–K |
| Phase_Specifications | v0_5_0 | Phase 3A/B/C + v0.4 turn-order and Phase II+ integration |
| Phase_0_Specification | v0_5_0 | Referendum, war start, Phase 0 link to Phase I §4.8 |
| Phase_I_Specification | v0_5_0 | Phase I mechanics, §4.8 RBiH–HRHB relationship |
| Phase_II_Specification | v0_5_0 | Phase II (mid-war fronts, supply, exhaustion) |
| Systems_Manual | v0_5_0 | Systems 1–11, Washington Agreement, state schema |

### Specification updates log

| Date | Specification | Change | Rationale |
|------|---------------|--------|-----------|
| 2026-02-10 | Canon set | v0.5.0 consolidation: full v0.3 + v0.4 + ledger; no deletions; Phase_II restored to canon | Restore comprehensive canon after v0.4 inheritance-only truncation |
| 2026-02-09 | Phase I §4.8 | Full rewrite: RBiH–HRHB relationship, alliance strain, mixed muns, Washington lock | Alliance redesign implementation |
| 2026-02-09 | Phase 0 | Link to Phase I §4.8 for RBiH–HRHB declaration | Consistency |
| 2026-02-09 | Systems Manual §10 | Washington preconditions W1–W6, post-Washington effects | Alliance lifecycle |
| 2026-02-09 | Engine Invariants §J | Milestones time-indexed / precondition-driven; Washington may set/lock alliance | Alliance lifecycle |
| 2026-02-10 | Phase I §4.3 / Systems Manual §11 | Added non-normative implementation-note entries documenting coercion-pressure extension tracking | Canon/implementation boundary clarity |
| 2026-02-10 | Phase II, Systems Manual, Engine Invariants, Phase I | Brigade Operations completion report incorporated into canon (additive only); pipeline, state, AoR, posture, corps, OGs, settlement-level resolution | Single implementation reference; canon reflects brigade ops implementation |
| 2026-02-13 | Phase II Spec §5, §12; Systems Manual §7, §7.4; context.md; CANON.md | Pipeline steps 12–14 (resolve-attack-orders, brigade-reinforcement, update-og-lifecycle); battle resolution (terrain, casualty_ledger, snap events) implemented; JNA/OG/bot AI stubs noted | Orchestrator absorption; canon reflects battle resolution and Phase II turn pipeline |

*(See PROJECT_LEDGER.md 2026-02-09 canon update; RBiH_HRHB_ALLIANCE_REDESIGN_DESIGN.md; 2026-02-13 ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md.)*

### Compliance

- **Engine Invariants:** Determinism, stable ordering, no timestamps/random in simulation; milestone semantics as in §J.
- **Determinism:** All simulation and bot logic uses seeded RNG and deterministic ordering; no unseeded Math.random().

---

## 5. Process & Team Knowledge

**How to use:** Meetings, handovers, roadmap, MVP, Phase 7 backlog. Update when new meetings or handovers occur.

### Strategic milestones

- **MVP declared:** 2026-02-08; Phase 6 complete; scope frozen. Post-MVP work in Phase 7 (see IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md, PHASE7_BACKLOG_QUEUE_MASTER_EARLY_DOCS.md).
- **Executive roadmap:** Phases 1–6 implemented; Phase 6 = MVP checklist and declaration (See PROJECT_LEDGER.md 2026-02-06.)

### Handovers

- **External expert:** docs/40_reports/handovers/EXTERNAL_EXPERT_HANDOVER.md (project-wide). Map-only GUI scope: docs/40_reports/handovers/GUI_MAP_ONLY_EXTERNAL_EXPERT_HANDOVER.md — deliverable = standalone map application (base map + layers + settlement panel + zoom).
- **Tactical map canonical:** What the tactical map loads is canonical; deprecation plan for settlements_viewer_v1 in PARADOX_TACTICAL_MAP_CANONICAL_DEPRECATION_CONVENE.md.
- **Launchable desktop GUI (2026-02-14):** Spec and playbook in docs/20_engineering — TACTICAL_MAP_SYSTEM.md §21, DESKTOP_GUI_IPC_CONTRACT.md, GUI_PLAYBOOK_DESKTOP.md, GUI_DESIGN_BLUEPRINT.md; context.md implementation references; Systems Manual implementation-note. See PROJECT_LEDGER.md 2026-02-14 documentation and canon pass.
- **GUI polish pass canon (2026-02-14):** Implemented report GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md propagated to TACTICAL_MAP_SYSTEM §2/§13 (tabs, formation panel, strategic zoom, modals, file inventory), GUI_DESIGN_BLUEPRINT §21, context.md implementation refs, docs_index; CONSOLIDATED_IMPLEMENTED §7 already linked. See PROJECT_LEDGER.md 2026-02-14 Canon propagation: GUI Polish Pass.
- **April 1992 scenario creation (2026-02-14):** Comprehensive report [ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md](40_reports/implemented/ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md) — Phases A–H (research, formation-aware flip, runs examination, OOB cleanup, initial formations, JNA ghost mechanic, scenario authoring/calibration, desktop GUI). Two canonical scenarios: **apr1992_definitive_52w** (player-facing, New Campaign side picker); **apr1992_historical_52w** (52w benchmark, default for `npm run sim:scenario:run:default`). CONSOLIDATED_IMPLEMENTED §5, context.md implementation refs, docs_index. See PROJECT_LEDGER.md 2026-02-14 Canon propagation: April 1992 scenario creation.
- **Orders pipeline and posture UX (2026-02-15):** Implemented report [ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md](40_reports/implemented/ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md) — full runTurn in desktop advance, IPC order staging (stage-attack-order, stage-posture-order, stage-move-order, clear-orders), GameStateAdapter orders as Records, bot AI excludes meta.player_faction, posture picker (human labels, tooltip stats, inline description, disabled by cohesion/readiness). Canon: TACTICAL_MAP_SYSTEM §2, §13.3, §14.2, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.5. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Orders pipeline and posture UX.
- **Order target selection UX (2026-02-15):** Implemented report [ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md](40_reports/implemented/ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md) — full targeting mode (visual overlay, enriched tooltips, Escape cancel, cursor feedback, attack two-step confirmation, preview arrow). Pure UI in MapApp; no engine/IPC changes. Canon: TACTICAL_MAP_SYSTEM §2, §8, §12.4, §13.3, §21. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Order target selection.
- **Corps AoR contiguity (2026-02-15):** Implemented report [CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md](40_reports/implemented/CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md) — corps-level contiguity (checkCorpsContiguity, repairCorpsContiguity, enforceCorpsLevelContiguity); enclave exception; Step 9 in assignCorpsDirectedAoR; pipeline step `enforce-corps-aor-contiguity` after `rebalance-brigade-aor`; brigade repair prefers same-corps. Canon: Phase II §5, §7.1; Systems Manual §2.1. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Corps AoR contiguity.

### docs/40_reports structure (2026-02-13)

- **Entrypoint:** docs/40_reports/README.md — master index; points to consolidated views and subfolders.
- **Subfolders:** audit/, implemented/, backlog/, convenes/, handovers/. Reports are physically placed in these folders; CONSOLIDATED_* links use subfolder paths (e.g. implemented/ReportName.md).
- **Consolidated views:** CONSOLIDATED_IMPLEMENTED.md (what’s done), CONSOLIDATED_BACKLOG.md (not yet implemented), CONSOLIDATED_LESSONS_LEARNED.md (patterns and report-derived lessons). Napkin remains session source of truth for corrections and patterns.
- **Custodian:** reports-custodian skill (`.cursor/skills/reports-custodian/SKILL.md`) owns 40_reports structure; classifies new reports, keeps CONSOLIDATED_* and README in sync, archives superseded to docs/_old/. Works with Documentation Specialist for doc layout.
- **Orchestrator memo:** ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md (directive; physical reorg and custodian created 2026-02-13).

*(See PROJECT_LEDGER.md 2026-02-13 docs/40_reports cleanup and consolidation; 2026-02-13 physical reorg and reports-custodian.)*

### Paradox team & meetings

- **Subagents:** formation-expert (militia/brigade, pools, constants); scenario-creator-runner-tester (BiH history, scenarios, run analysis, conceptual proposals).
- **State-of-game meetings:** e.g. PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md — knowledge base, PDF limitation, canon audit; 11 systems designed, 5 fully wired, 6 partial.
- **Ledger:** New entries appended to PROJECT_LEDGER.md; awwv-ledger-entry skill for auto-append.
- **Orchestrator scenario-run handoffs:** docs/40_reports/implemented/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md, implemented/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md — run canonical scenarios, capture run IDs/artifacts, delegate to scenario-creator-runner-tester (and optionally formation-expert) for historical verification.
- **Orchestrator absorption (2026-02-13):** docs/40_reports/implemented/ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md — absorbed 40_reports (battle resolution, recruitment, AoR investigation, no-flip, ethnic init, tactical map) and updated Phase II / Systems Manual canon accordingly.

*(See PROJECT_LEDGER.md 2026-02-06–09 process entries; 2026-02-12–13 handoffs; napkin Domain Notes.)*

---

## 6. Technical Decision Chains

**How to use:** Trace how key decisions led to the next. For full chronology see PROJECT_LEDGER.md changelog.

### Geometry processing chain

1. **Path A adoption (2026-01-24)** — Polygons ≠ settlements; separate ID schemes. Rationale: 1:1 matching failed.
2. **Outline/crosswalk issues** — Mid-based outlines need crosswalk; union on fabric unreliable.
3. **Drzava.js for borders (2026-01-24)** — Municipality borders from drzava.js to avoid union. Consequence: reliable borders.
4. **Adjacency / edge cancellation (2026-01-25–26)** — Municipality boundaries from fabric adjacency or shared-edge cancellation instead of union.
5. **A1 / WGS84 / Voronoi (2026-02-07)** — A1 base map STABLE; WGS84 settlements; bih_adm3_1990.geojson canonical; Voronoi with stable order and coverage diagnostics.

*(See PROJECT_LEDGER.md 2026-01-24 through 2026-02-07; §Geometry Contract.)*

### Bot evolution chain

1. **Placeholder / random** — Early bots not deterministic.
2. **Determinism requirement** — Simulation must be reproducible.
3. **Seeded RNG + strategy profiles (2026-02-09 Phase A)** — BotManager seeded RNG; no Math.random(); strategy profiles and difficulty presets.
4. **Time-adaptive + constraints (2026-02-09)** — scenario_start_week; front-length and manpower sensitivity; objective-edge planned-ops preserved.

5. **Phase II bot AI overhaul (2026-02-13)** — Fixed zero-attack-order bug (3 root causes: pipeline ordering, posture timing, supply deadlock). Added historically-grounded strategic objectives per faction. Key lessons:
   - Pipeline ordering matters: formation lifecycle must run BEFORE bot AI evaluates posture eligibility.
   - Same-pass dependencies: when bot generates posture orders and attack orders in one function, attack logic must read pending postures, not stale state.
   - Grace periods prevent deadlocks: supply gates can permanently block activation when Phase I supply system doesn't align with Phase II AoR. Max-wait auto-activation (6 turns) solves this.
   - Strategic objectives drive coherent behavior: without faction-specific offensive/defensive municipality lists, bots attack whatever is weakest regardless of strategic value.
6. **AI consolidation and breakthrough (2026-02-14)** — Deterministic rear-cleanup priority (hostile-in-own-mun, isolated clusters); Phase I consolidation bonus in edge scoring and control-flip candidate ordering; Phase II consolidation posture for soft fronts (real front = brigade-vs-brigade), casualty-tracked cleanup; exception data (connected strongholds, isolated holdouts, fast-cleanup muns). Canon: Systems Manual §6.1, §6.5; Phase II Spec §12; AI_STRATEGY_SPECIFICATION §Consolidation and rear cleanup.

*(See PROJECT_LEDGER.md 2026-02-09, 2026-02-13, 2026-02-14; napkin Patterns That Work.)*

### Map and control chain

1. **Tactical map as canonical (2026-02-08)** — What tactical map loads = canonical data; settlements_a1_viewer.geojson, political_control_data.json required.
2. **Formation positions** — municipalityId = mun1990_id; DataLoader from control_region + mun1990_names.json.
3. **Start-control hardening (2026-02-09)** — No null control at init; deterministic coercion (mun majority → neighbor majority → RBiH fallback) in political_control_init and build_political_control_data.

*(See PROJECT_LEDGER.md 2026-02-08–09; napkin Tactical map, Start-control hardening.)*

### Phase II combat chain

1. **Garrison-based combat (2026-02-11)** — Fixed 40/60 casualties per flip; no terrain.
2. **Battle resolution engine (2026-02-12)** — Multi-factor combat (terrain, equipment, experience, cohesion, posture, supply, etc.); casualty_ledger; four snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade). resolve_attack_orders delegates to resolveBattleOrders().
3. **RBiH–HRHB gate in Phase II (2026-02-12)** — resolve_attack_orders blocks RBiH↔HRHB flips/casualties before rbih_hrhb_war_earliest_turn (same as Phase I).

4. **Bot AI strategic targeting (2026-02-13)** — Faction-specific offensive_objectives and defensive_priorities in bot_strategy.ts. RS targets Drina valley + Sarajevo siege ring; RBiH targets siege-breaking + central corridor; HRHB targets Lasva Valley connection. Offensive zone brigades probe at lower density threshold (50 vs 150-200).

*(See PROJECT_LEDGER.md 2026-02-11–12, 2026-02-13; docs/40_reports/implemented/battle_resolution_engine_report_2026_02_12.md.)*

### Phase I no-flip chain

1. **Hard short-circuit (2026-02-11)** — disable_phase_i_control_flip → stasis (zero flips). Insufficient.
2. **Military-action branch (2026-02-11)** — Formation-led control pressure; militia-threshold path disabled. Movement and displacement occur.
3. **Calibration (2026-02-11)** — 3x3 knob grid, attack-scale sweep; player_choice benefits, ethnic/hybrid 30w worse than default.
4. **Final policy (2026-02-11)** — No-flip GO only for player_choice recruitment scenarios; ethnic/hybrid NO-GO. Canonical scenario: player_choice_recruitment_no_flip_4w; PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md.

*(See PROJECT_LEDGER.md 2026-02-11; PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md.)*

---

## Cross-references

- **Full changelog:** `docs/PROJECT_LEDGER.md` (append-only).
- **Tagging index:** `docs/PROJECT_LEDGER_TAGGING_INDEX.md`.
- **Reorganization plan:** `docs/PROJECT_LEDGER_REORGANIZATION_PLAN.md`.
- **Implementation guide:** `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md`.
- **Napkin:** `.agent/napkin.md` (corrections, patterns, domain notes).
