# AWWV Project Ledger — Thematic Knowledge Base

**Last Updated:** 2026-03-17
**Purpose:** Knowledge accumulation by theme.

**AI Commander QA findings (2026-03-17):** Three API-powered AI commanders (Mladić, Halilović→Delić, Petković) ran 40w campaign and produced 345 diagnostic observations. Six actionable themes: (1) Alliance decay too fast (95 obs — initial 0.35 should be 0.75, war target April 1993 ~w52), (2) SRK density-gated from siege ops (24 obs — siege corps should be exempt from density gate), (3) Supply gate stripping all targets (23 obs — should be graduated, not binary), (4) Event timing wrong (33 obs — events should be conditional on game state, not calendar), (5) Operation state machine bug (16 obs — ops stuck in planning), (6) Late-war stasis (9 obs — 22 turns frozen). See `memory/ai_commander_three_agents.md` and `memory/conditional_events_design.md`.

**Conditional events design (2026-03-17):** Three event types: state-triggered (fires when game state condition met, e.g. Jajce falls when RS takes it), conditional-timed (fires at calendar week IF condition met, e.g. Bread massacre if Sarajevo besieged), unconditional-timed (fires regardless, e.g. Arms embargo). Condition schema: `{ type: "territory_control", municipality: "jajce", controller: "RS", threshold: 0.5 }`. Backward compatible — events without conditions fire by week as before. Next scenario: 52w+ covering Croat-Bosniak war (1993-1994).

**40_reports structure (2026-02-24):** Backlog is consolidated into themed docs (BACKLOG_*.md) in docs/40_reports/backlog/; originals archived to docs/_old/40_reports/backlog/. For historical fidelity, Phase 7, mobilization, etc., use the themed doc or the archived filename in _old. See docs/_old/README.md §40_reports/backlog and CONSOLIDATED_BACKLOG. Chronological record remains in `docs/PROJECT_LEDGER.md` (append-only).

**GUI master (2026-03-07):** `docs/40_reports/GUI_MASTER.md` is the living GUI reference (map + warroom). Read it first when starting GUI work and update during the session — same discipline as CALIBRATION_MASTER for calibration.

**Warroom master (2026-03-07):** `docs/40_reports/WARROOM_MASTER.md` is the living warroom reference (scene plate, modals implemented vs proposed, hotspots, commander assignment). Read first for warroom work; update during session. Links to nano banana brief.

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

- **Phase:** Post-MVP — War engine (Peace/War two-phase lifecycle), full combat system active
- **Status:** MVP declared 2026-02-08. Scope open for calibration, realism, and UI work.
- **Focus:** Historical calibration (89.6% area w40), reactive defense system (Layers A+B+C), operation preparation system, warroom UI, elite brigade loan system.
- **Key Systems Live (2026-03-15):** 120-step war pipeline, OSID combat, sector stances (5 types), distance-weighted reactive defense, operation preparation (5-phase), sector intel, strategic reserve, fog-of-war, displacement, supply reserves, officer system, army HQ reserve pool (elite loan), warroom cork board + OsidThumbnailRenderer, ArmyReservePanel. 618 vitest tests.
- **Calibration baseline:** n703 — 89.6% area-weighted, 11/13 anchors, 6/6 benchmarks, hash `10b74532c37cfaac`.

### Phase tracking & milestones

| Milestone | Date |
|-----------|------|
| Path A adopted | 2026-01-24 |
| Phase A1 Base Map STABLE | 2026-02-07 |
| MVP declared | 2026-02-08 |
| Phase II battle resolution engine | 2026-02-12 |
| AoR/ZoC removed | 2026-03-02/04 |
| Phase I/II terminology purged → Peace/War | 2026-03-07 |
| Reactive defense Layers A+B+C complete | 2026-03-13 |
| Operation Preparation System | 2026-03-12 |
| Commander-driven brigade assignment (n696) | 2026-03-14 |
| Army HQ Reserve Pool / Elite Loan System | 2026-03-15 |
| UI/UX Overhaul Phases 1–2 (NATO quantization, ghost line purge) | 2026-03-15 |

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
| 2026-03-15 | Officer succession is player-choice for player faction | Player agency over commander assignments; bot factions auto-succeed | `available_until_turn` creates `replacement_suggested` event instead of auto-retiring; `findHistoricalSuccessor()` recommends replacement; `pending_officer_events` on MilitaryState; IPC pipeline for accept/acknowledge | design |
| 2026-03-15 | War crimes records are informational-only | Ethical transparency without gamification; no combat modifier from atrocity data | 27 officers annotated (VRS 13, ARBiH 7, HVO 7); `war_crimes_record` on NamedOfficer; UI badge (red=convicted, green=acquitted, amber=indicted) | design |
| 2026-03-15 | Map modes use continuous gradients (interpolate expressions) | Continuous gradients convey magnitude better than 3-tier match bucketing | Casualties + morale modes use MapLibre `interpolate` expressions; removed broken `pressure` and redundant `density` modes | GUI |
| 2026-03-15 | Bottom strip is single unified bar (merged MapModeToolbar + BottomStatusStrip) | Reduces visual clutter; territory % now area-weighted km² | Layout: [Map Mode Pills] \| [Territory %] \| [Layer Toggles]; z-20; MapModeToolbar not rendered separately | GUI |

## 10. Sectors & Operations

1. **[2026-03-12] consolidateCrossCorpsFronts can steal correct corps territory (n624 gotcha)**
   Do instead: Step 3b majority-count consolidation finds connected components of front edges across corps boundaries and assigns minority-corps edges to the majority. Without osidToCorps protection, a corps with a larger connected front absorbs a smaller correct corps's territory — even when `mapOsidsToCorps` home-seed BFS correctly assigned it. Two protections required: (1) brigade presence at OSID, (2) `osidToCorps` mapping match. The BFS home-seed mapping is the authoritative source for corps territory — consolidation must not override it.
2. **[2026-03-06] Maneuver-only execution turns are not dead execution**
   Do instead: In combat-causality diagnostics, do not flag `execution_without_attack_orders` when execution-phase operation participants emitted movement orders. Operation-owned brigades can be healthy while still closing on the current objective.
2. **[2026-03-06] Planning phase must include movement into position**
   Do instead: Treat planning as the period where operation-owned brigades move toward staging and first-objective approach positions. Do not model planning as a passive timer detached from maneuver.
3. **[2026-03-06] Fixed-duration planning creates dead weeks after staging**
   Do instead: Let `sector_attack` transition from `planning` to `execution` once at least one full planning turn has elapsed and all active participants have reached `staging_osid` or friendly objective-approach positions. Do not keep an operation in planning just because the nominal duration has not expired.
4. **[2026-03-06] Live sector rearrangement is allowed when scenario-gated**
   Do instead: Keep sector rearrangement in live corps AI only when full-run combat-causality evidence stays green. Unit tests alone are not enough; use 40-week scenario acceptance as the runtime gate.
5. **[2026-03-06] Quiet weeks are not the same as broken combat causality**
   Do instead: Weekly `zero_battles` should invalidate only when attack orders were issued and still produced no battles. Quiet weeks with no attacks and no invalid operations remain warnings, visible under `battleless_weeks`.
6. **[2026-03-06] Good map fit is not proof of healthy combat**
   Do instead: Read `behavioral_health` before `historical_fit`, then explain `control_change_attribution`. A better-looking map is not a valid success signal if the combat-health layer regressed.
7. **[2026-03-06] `CALIBRATION_MASTER.md` is the control file for resumed tuning**
   Do instead: Treat calibration changes as gated work. Read the master file first, update it during the session, and do not resume historical shaping unless the combat-causality gate is green.
8. **[2026-03-07] Operations must be sector-sourced — no corps-wide brigade pulls**
   Do instead: Operations launch only from `generateCorpsDirectives` sector offensive path. Only sector-assigned brigades participate. `MAX_PARTICIPATING_BRIGADES=12`. Old catalog-based `generateCorpsOperationOrders` disabled. If sector lacks brigades, density balancing reinforces first — no rear-area dump.
9. **[2026-03-08] Player operations support multi-axis advance with per-axis staging**
   Do instead: OpsPlanningModal exposes the engine's existing `CorpsOperation.axes` system to the player. Each axis has independent brigade assignment, ordered objective chain, and optional staging OSID. Single-axis operations omit the `axes` payload for backward compatibility. IPC: `stage-corps-operation-order` in `electron-main.cjs`. Force-ratio preview aggregates enemy formations per objective OSID for planning intelligence.
10. **[2026-03-08] Frontline attrition uses corps_front_sectors, not legacy brigade_front_assignment**
   Do instead: Build `brigadeSector` lookup from `sector.assigned_brigade_ids` across `state.corps_front_sectors`. A brigade takes passive attrition if it appears in any sector's assigned list (location-validated by `classifyBrigadesByTerritory()`). Reserves exempt. Density from `sector.assigned_brigade_ids.length / sector.length_edges`. `isColdFront()` uses structured `CorpsFrontSector` data (faction, opposing_factions, sub_segments) — no legacy front_id string parsing. Key design decision: `assigned_brigade_ids` (all brigades in sector territory) not `sub_segments[].friendly_osids` (border-adjacent only — too narrow, dropped casualties ~50%). n366 = 88.2%.
11. **[2026-03-08] Sector classification: front/reserve/deep-rear three-tier system**
   Do instead: `classifyBrigadesByTerritory` assigns brigades by three tiers: (1) front — on `sub_segments.friendly_osids`, (2) reserve — 1 hop behind front, (3) deep rear — BFS to nearest own-corps sector front (assigned, not reserve). Never use full `territory_osids` Voronoi depth for sector assignment. Deep rear brigades get column march orders to their sector front via sector march rule (before home defense check). Paper-transfer (BFS steal from surplus sectors) removed — only physical movement.
12. **[2026-03-08] Column march stance: always include `stance: 'column'` in merged orders**
   Do instead: Movement merge in `generateBrigadeOrders` must set `stance: 'column'` on column march entries. `processOsidColumnMovement` gates on `order.stance === 'column'` — missing stance silently drops all marches.
13. **[2026-03-08] Corps HQ is organizational — not rendered on map**
   Do instead: `corps_asset`, `army_hq`, and `corps` formations filtered from `buildFormationsGeoJSON`. These are command abstractions, not physical map units.

14. **[2026-03-09] Idle stall threshold must account for pipeline phase ordering**
   Do instead: `advance-sector-offensives` runs before `bot-brigade-orders` in the turn pipeline. The first execution turn always has zero attacks and zero movement logged. Idle stall detection must use `>= 2` idle turns (not `>= 1`) before declaring an operation stalled. Apply this threshold in both `updateMultiAxisResults` and `updateLegacyFlatResults` paths. Failure limits: `MAX_TOTAL_FAILURES=5`, `MAX_CONSECUTIVE_FAILURES_ON_CURRENT=3`.
15. **[2026-03-09] Operation `min_attack_outcome` overrides probe threshold**
   Do instead: `PrePlannedOp` and `CorpsOperation` can specify `min_attack_outcome` to override `getSectorOffensiveProbeThreshold()`. Bot AI checks `activeOp.min_attack_outcome` first, then falls back to momentum-based thresholds. Use for operations that must attack even at unfavorable predicted outcomes (e.g., Op Teocak with `min_attack_outcome: 'repulsed'`).
16. **[2026-03-10] Cross-corps sector assignment is forbidden**
   Do instead: In `classifyBrigadesByTerritory()`, only assign a brigade to sectors owned by its resolved corps. Do not keep "physically on another corps front" or "territory match without corps restriction" fallbacks. The last-resort nearest-front BFS must also filter to same-corps sectors.
17. **[2026-03-14] Commander competence gates deliberate assignment; personality shapes what he optimizes for; pre-op staging connects op planning to brigade placement ahead of execution**
   Competence (normalized from 1–5 scale) acts as a gate: below 0.35, the commander doesn't deliberately plan and falls back to BFS. Above the threshold, aggressiveness (0–1) shapes the objective: aggressive (≥ 0.6) concentrates at highest threat-ratio sector; defensive (≤ 0.4) fills thinnest gap; balanced falls through to BFS. The pre-op staging weight (1.5× intel_gathering, 3.0× force_staging+) links `CorpsOperation.preparation_sub_phase` to brigade pull — brigades begin shifting toward the operational sector during preparation, not just execution. This is also why `priority_sector_id` on `CorpsDirective` (not `CorpsCommandState`) is the correct source: it's the directive, not raw command state.

| 2026-03-08 | Entrenchment reduces passive frontline attrition | Entrenched brigades suffer less sniping/shelling/bombardment — sqrt diminishing returns, floor 0.40 | Reduces total passive casualties ~25-60% for long-entrenched units; affects calibration | combat |
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
| 2026-02-12 | RBiH-aligned municipalities: nine muns always RBiH (control + spawn) | Bihać, Brčko, Gradačac, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša (added 2026-02-15); HVO subordinate to ARBiH | rbih_aligned_municipalities.ts; political_control_init, militia_emergence, control_flip, build_political_control_data | implementation |
| 2026-02-12 | Phase II combat: battle resolution engine (terrain, casualty_ledger, snap events) | Replace fixed 40/60 garrison combat with multi-factor engagements | battle_resolution.ts; casualty_ledger in GameState; terrain_scalars | implementation |
| 2026-02-12 | RBiH–HRHB gate in Phase II resolve_attack_orders | Block RBiH↔HRHB flips/casualties before rbih_hrhb_war_earliest_turn | Same gate as Phase I control_flip and alliance_update | implementation |
| 2026-02-13 | casualty_ledger in GAMESTATE_TOP_LEVEL_KEYS | Persist battle casualties in saves and Latest run | Serialization allowlist; 20w+ Phase II runs succeed | implementation |
| 2026-02-16 | April 1992 scenarios: hybrid_1992 + init_control apr1992 (canon) | ethnic_1991 is ahistorical for spring 1992; curated municipal file gives correct faction assignments | All 11 Apr 1992 scenario JSONs use hybrid_1992; Systems Manual implementation-note updated | implementation |
| 2026-02-16 | Tactical map embedded in warroom (iframe), faction fog-of-war | Single-window UX; player sees only own formations on canvas | awwv://warroom/tactical-map/* same-origin; buildFormationPositionGroups/drawOrderArrows filter by player_faction | implementation |
| 2026-02-16 | Phase II tuning: ongoing mandatory recruitment retry + recruitment-before-reinforcement + RS-scoped fast cleanup + RBiH-aligned ilijas/vogosca | Mandatory brigades skipped at setup were not retried in ongoing pass; reinforcement consumed pool before recruitment checks; Prijedor/Banja Luka fast-cleanup bonus was being applied cross-faction; user requested HRHB-RBiH exception expansion | `runOngoingRecruitment` includes mandatory brigades; `phase-ii-recruitment` runs before `phase-ii-brigade-reinforcement`; fast-cleanup municipalities are faction-scoped (RS only); RBiH-aligned municipality exceptions include Ilijaš and Vogošća | implementation |
| 2026-02-16 | RS Phase II mandatory recruitment bottleneck tuning | RS mandatory brigades stalled because home-municipality pools remained below mandatory floor during ongoing turns | Added deterministic RS-only mandatory mobilization accrual budget in ongoing recruitment and capped mandatory attempts per faction per turn; 16w validation improved RS brigades delta from +0 to +2 (`PROJECT_LEDGER.md` 2026-02-16) | implementation |
| 2026-02-24 | OSID-vs-SID key mismatch fix + force growth calibration | After OSID-as-base-layer migration, political_controllers is OSID-keyed but lookup functions still used canonical SID keys → zero formations spawned, zero ongoing mobilization | Two-pronged fix: (A) OSID→mun map rebuild in scenario_runner.ts; (B) OSID-prefix fallback in getMunicipalityController across 4 files. Calibrated through 6 runs: RBiH 144K, RS 101K, HRHB 50K (all within ±10% of historical). Key lesson: after any key-space migration, grep all `political_controllers[` lookups | implementation |

| 2026-03-08 | Audit remediation 5-phase execution | Paradox State of Game + N412 Deep Dive identified frozen fronts, supply collapse, determinism risk, mega-files, stale terminology | 5 phases: (1) determinism sort hardening, (2) frozen front cascade fix (concentration bonus, entrenchment degradation, aggression floor), (3) supply/morale balance (MAINTENANCE_DRAIN 0.045→0.035, critical morale penalty), (4) code health (displacement dedup, supply assertions), (5) terminology sweep + mega-file splitting + outcomeRank unification. n403 86.9% → n415 89.4%. Key lesson: frozen front cascades are self-reinforcing — must break at multiple points simultaneously; supply drain must match OOB growth; inline constant duplication causes scale drift | implementation |

17. **[2026-03-14] `isCaseBBridge()` — directional angle check for Case B pocket wrap-arounds (n694)**
    Case B edge adjacency (same hostile OSID, different friendly OSIDs) can create wrap-around sectors when the two friendly OSIDs face *opposite* directions from the shared hostile OSID — i.e., they're on opposite sides of an enemy pocket. Distance thresholds can't catch this because the triple junction is geometrically real (0m contact). Fix: compute bearing vectors H→fi and H→fj using OSID centroids; reject Case B when the angle between them exceeds 165°. Requires centroid data (`OsidCentroidMap`) preloaded from `operational_contact_graph.json`. Wired into both `buildEdgeAdjacency` and `buildEdgeAdjacencyStrictCaseB`. *Design note:* this catch requires spatial data (centroids); purely topological rules cannot distinguish legitimate vs wrap-around Case B connections.

18. **[2026-03-14] `consolidateIsolatedCorpsPockets` must check home-brigade presence before reassignment (n694)**
    Step 3c unconditionally swaps isolated sector pockets to the majority-neighbor corps. This breaks defended pockets — a brigade physically stationed in a disconnected corps front should keep its corps assignment even though the majority of surrounding front belongs to another corps. Guard: skip reassignment if any brigade of the correct corps has `location_osid` inside the pocket's front OSIDs. A defended position is not an isolated pocket — it's an enclave or salient.

19. **[2026-03-14] `reclassifyRearBrigades` reserve cap must NOT silently drop non-winning candidates (n695)**
    The reserve competition selects the strongest 1-hop-behind-front brigade per sector (cap = 1). Non-winning candidates must be returned to `assigned_brigade_ids` — they are valid assigned brigades, just not the reserve. Before n695, non-winners were stripped from all lists, causing them to appear as "sectorless" in diagnostics despite being reachable. Pattern: whenever a competition has cap < candidates, always return losers to their source collection.

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

### Sector Operations & Combat-Causality Rules (2026-03-05)

- `sector_attack` lifecycle has a single owner: `src/sim/combat/sector_offensive.ts`. The generic corps-layer timer in `src/sim/combat/corps_command.ts` must not advance `sector_attack`, or operations will enter/leave `execution` on the wrong schedule.
- When debugging opening operations, distinguish:
  - phase-timing bugs
  - staging/path bugs
  - execution-without-orders bugs
  - attack-without-battle bugs
- Repeated execution turns with no objective attempt are not harmless idle time. They are operation failure and should consume the same failure budget as a failed assault so the AI can skip/end bad ops instead of hanging forever.
- Calibration interpretation rule:
  - `n109` demonstrated that restoring full-run combat volume alone is not enough if invalid execution windows explode.
  - `n110` showed the better shape: keep live combat, but also collapse hanging execution windows back down before discussing scenario quality.

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
- **Operational settlements (OSID):** As of 2026-02-22, **OSID is the canonical map unit** for simulation, rendering, and political control. **744 operational settlements** (was 753; 9 degenerate merged 2026-03-03; format `op:<mun>:<slug>`) from 5,823 canonical via 702 hand-curated merge groups in `data/source/merge_progress.json` + 51 singletons. Derive script: `scripts/derive_operational_settlements.ts`; outputs in `data/derived/operational/` (operational_settlements.geojson, canonical_to_operational_map.json, operational_contact_graph.json, operational_political_control.json, **operational_initial_master.json**). **After any OSID merge** run `npm run map:derive:operational-initial-master` so dev runner and political control init see 744 OSIDs (avoids "unknown settlement ids" at init). HoI map control layer: single merged mesh (global vertex table, per-vertex colors) for gap-free rendering. Report: 20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md; IMPLEMENTED_WORK_CONSOLIDATED §32.
- **HoI map 3D tilt and texture-on-terrain (2026-02-23):** Political control on HoI 2.5D map is no longer a floating polygon overlay; faction colors are rasterized onto a 2048×2048 texture and applied to the terrain mesh’s own geometry (same BufferGeometry → no gaps or terrain poke-through at any tilt). Ortho camera far plane 1000→100; overlay Y-offsets reduced; polygonOffset used for depth ordering; invisible control mesh retained for settlement hover/click raycasting. `t`/`T` adjust tilt (5°). Report: 20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md; IMPLEMENTED_WORK_CONSOLIDATED §35; PROJECT_LEDGER 2026-02-23.
- **HoI-style brigades + ZoC and Attack Resolution (2026-02-22):** Canon, data/state, engine, and bots/GUI phases implemented. One OSID per brigade; ZoC from deployed brigades; ZoC-lock (stay / retreat / attack only); control change only via attack resolution or corps ops; no single resolution flips more than one OSID. Attack resolution: formula spec (combat power, entrenchment, resilience, outcome bands, casualties, push-back); retreat tie-break: enemy-adjacency count asc then OSID sort. Pipeline: zoc-computation, zoc-constrained-movement, phase-ii-resolve-attack-orders (OSID path when operational data present). Bots: orders in OSID space; ZoC-lock behavior. Maps: brigade position from `location_osid` when set. See PROJECT_LEDGER.md 2026-02-22 "HoI-style brigades + ZoC and Attack Resolution Formula (full roadmap)"; design docs: 20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md, 20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md.
- Map viewer: derive `settlements_a1_viewer.geojson` from A1_BASE_MAP (role=settlement); use `getPoliticalControlKey()` for S-prefixed sid in political_control_data (napkin).
- WGS84 derivation: fallback to `data/_deprecated/derived/legacy_substrate/settlements_substrate.geojson` when derived path missing (napkin).
- Use `map:build:wgs84:from-geometry` when `settlements_wgs84_1990.geojson` exists (skips tessellation) (napkin).
- Split-muni merge: Voronoi loads from `data/derived/_audit/split_municipality_duplicate_settlements.json`; run `npm run map:audit:split-muni-duplicates` before full rebuild (napkin).
- Tactical map: canonical viewer for load-save and formations; `src/ui/map/`; `npm run dev:map` → http://localhost:3001/tactical_map.html. Required: settlements_a1_viewer.geojson, political_control_data.json (napkin).
- **GUI panel choreography (2026-03-07):** For map-side detail flows, do not stack competing overlays for settlement/sector/operation/formation detail. Use a right-side panel rail with horizontal drill-down: overview -> primary detail -> secondary detail sliding further right while preserving parent context. Keep panel precedence in a pure rail selector (`panelRail.ts`) and let `App.tsx` be the composition root that mounts only the active primary/secondary surfaces. Keep accordions inside a panel; use drill-right between panels. Report: `docs/40_reports/convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md`.
- **Settlement panel content (2026-03-07):** Right-panel settlement detail has 3 horizontal tabs (Overview | Military | Orders & events), same style as sector/operations. Overview: municipality, control, status, population (pre-war → current, Out/In/Lost, arrived by faction), “Fled from this settlement” by nation (Bosniaks/Serbs/Croats/Others), pre-war + current ethnic structure. Military: front sector, stationed formations (readiness/cohesion, click-through to Formation detail), militia pool. Orders & events: pending attack/move/reposition, recent control. Control tab removed. Spec: TACTICAL_MAP_SYSTEM §13.2; report: `docs/40_reports/implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md`.
- **Command briefing architecture (2026-03-07):** Put the high-level command briefing in `src/ui/map/App.tsx` as a thin orchestration layer, not inside `TopToolbar` and not buried in `SituationTab`. Feed it from a deterministic `commandBriefing` view-model in `GameStateAdapter.ts`, and let it route only into already-existing panels/modals during the information-hierarchy phase.
- **Warroom art pipeline (2026-03-07):** For the warroom, use one complete scene plate per faction and outline hotspots afterward. Do not rely on separate in-scene props or perspective sprites; scale and orientation drift break the illusion. Keep only flag, calendar, and ticker as separate runtime elements. Maintain stable camera/layout across faction variants so hotspot regions remain reusable. Report: `docs/40_reports/handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md`.
- **Warroom hotspot contract (2026-03-07):** Treat warroom hotspot ids as physical object anchors, not arbitrary action labels. Canonical room anchors: `desk_map`, `command_briefing_folio`, `newspaper_stack`, `intelligence_journal`, `diplomatic_telephone`, `desk_radio`, `wall_flag_area`, `wall_calendar_area`. Let `ClickableRegionManager.ts` route from those anchors, and keep old action strings only as compatibility fallback during transition.
- **Focused summary routing (2026-03-07):** Treat the summary modal as a command hub, not a dead-end overview. Route IVP, convoy, support, casualty, and OPSEC clicks into named summary sections from `TopToolbar.tsx` and `CommandBriefingLayer.tsx`, with `App.tsx` owning the summary-focus state. Keep operation routing separate via `OperationDetail` / `OperationsPanel`.
- **Staff Map and settlement borders (2026-02-17):** 4th zoom layer — press `4`, drag rectangle (≥5 settlements) to open procedural paper-map overlay at 8× (parchment, terrain hatching, serif labels, full-detail formation counters); separate overlay canvas, 10-pass pipeline, deterministic (detHash). Main map draws settlement polygon fills only; inter-settlement border strokes removed. IMPLEMENTED_WORK_CONSOLIDATED §17; TACTICAL_MAP_SYSTEM §2, §7–§9, §12. **Staff Map 12 visual enhancements (2026-02-17):** Faction stripe on counters, barbed-wire front lines, AoR crosshatch fill, contour lines, river labels, fold creases, contested-zone pencil hatch, coffee stain, margin annotations, irregular vignette, faction crests at top center, exit button top-left. IMPLEMENTED_WORK_CONSOLIDATED §18. **Staff Map crest stamp and war map barbed-wire (2026-02-17):** Staff map shows single player-faction crest as faded ink stamp (top-left); main war map front lines use barbed-wire (3-pass: glow + Bézier + barbs); detHash shared in constants.ts. IMPLEMENTED_WORK_CONSOLIDATED §19. **War map enhanced formation markers (2026-02-17):** drawNatoFormationMarker(FormationView, zoomLevel); readiness inner glow; strength numbers (formatStrength) / ×N for corps; name labels at tactical zoom; AABB hit-test; ResizeObserver canvas resize; formation dimming (war + staff). IMPLEMENTED_WORK_CONSOLIDATED §20. **Front line defended/undefended (2026-02-17):** Defended segment = at least one adjacent settlement in brigade AoR; defended = solid + barbed wire, undefended = dashed + reddish glow, no barbs. AoR crosshatch: black when Control layer ON, white when OFF. IMPLEMENTED_WORK_CONSOLIDATED §21. **War map labels and AoR cleanup (2026-02-17):** Labels URBAN_CENTER+TOWN only, always on; Labels and Brigade AoR toggles removed; AoR highlight automatic when formation selected; crosshatch density increased (spacing 5, width 1.5, alpha 0.55). IMPLEMENTED_WORK_CONSOLIDATED §22. **Dual defensive arc front lines (2026-02-17):** Front lines replaced with paired faction-colored defensive arc symbols on each side of settlement borders; arcs only where brigade AoR covers at least one adjacent settlement; barb ticks toward enemy; SIDE_RGB; old single-line/defended-undefended system removed. IMPLEMENTED_WORK_CONSOLIDATED §24.
- Start-control hardening: no-null invariant in `prepareNewGameState`; deterministic null coercion (municipality majority → neighbor majority → RBiH fallback) (napkin).
- **Canvas blend mode by background luminosity (2026-02-18):** When compositing a hillshade terrain layer onto a canvas, use `multiply` for light/parchment backgrounds (Staff Map `#f4e8c8`, opacity 0.22) and `overlay` for dark backgrounds (Main Map `#0d0d1a`, opacity 0.6). Multiply darkens correctly on light paper tones; overlay adds depth without washing out on dark tactical backgrounds. Wrong blend mode on wrong background produces flat or oversaturated results (dark-green `#2a3a28` experiment confirmed unsatisfactory and reverted).
- **Pre-projected terrain PNG alignment (2026-02-18):** To align a pre-rendered terrain PNG (e.g. GDAL hillshade) pixel-perfectly to a canvas map: store the DEM geographic bbox (minLon, minLat, maxLon, maxLat), project all four corners via `rc.project()` to canvas pixel coordinates, then `drawImage(img, projMinX, projMinY, projMaxX - projMinX, projMaxY - projMinY)`. No resampling or separate tile pipeline required; accuracy depends only on the map projection function being consistent between render passes.

**Simulation & state**

- Smart-bot determinism: seeded RNG in BotManager; never `Math.random()` in bot logic; edge/formation traversal sorted before selection (napkin).
- **Faction AI all phases (2026-02-18):** Phase 0 bot runs in headless pipeline (investments + relationship init); Phase 0 faction-specific strategies (RS paramilitary-first, RBiH TO-first, HRHB police/party) and alliance-aware coordination; Phase I bot posture (hold/probe/push) in bot_phase_i.ts; Phase II expanded operations catalog, defensive OGs, emergency defensive ops, inter-corps coordination, dynamic elastic defense. Report: FACTION_AI_IMPROVEMENTS_ALL_PHASES_2026_02_18.md; IMPLEMENTED_WORK_CONSOLIDATED §25; Phase II Spec §12, Systems Manual §6.5 (ledger 2026-02-18).
- Time-adaptive bots: optional `scenario_start_week`; deterministic week-based aggression taper; keep objective-edge planned-ops floor (napkin).
- Victory evaluation: end-of-run only (`run_summary.json` + `end_report.md`); no change to turn mechanics (napkin).
- Formation spawn: MIN_BRIGADE_SPAWN 800; new brigade at 800; phase-i-brigade-reinforcement to 2500; second brigade when pool ≥ 800. Authority: consolidated/contested/fragmented; fragmented → no spawn (napkin).
- Phase I displacement: on control flip when Hostile_Population_Share > 0.30; applyPhaseIDisplacementFromFlips; same routing/killed/fled-abroad as Phase II (napkin).
- Brigade AoR at Phase II: phase-ii-aor-init populates from political_controllers + formation home muns; `ensureFormationHomeMunsInFactionAoR` (napkin).
- **Brigade Operations canon (2026-02-10):** Implementation reference: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/BRIGADE_OPERATIONS_SYSTEM_COMPLETION_REPORT.md`. Canon was updated additively (Phase II Spec §4.3, §5, §7.1, §12; Systems Manual §2.1, §6.1–§6.4, §7, System 3/8, Appendix A; Engine Invariants §13.3, §14; Phase I §4.3.6). No existing canon text removed.
- **Recruitment system canon (2026-02-11):** Implementation reference: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/recruitment_system_implementation_report.md`, design: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/recruitment_system_design_note.md`. Canon updated additively: Systems Manual §13 (brigade activation at Phase I entry, player_choice vs auto_oob); Phase I implementation-note (recruitment_mode); MILITIA_BRIGADE_FORMATION_DESIGN §10 (recruitment mode, emergent suppression), §9 (MAX_BRIGADE_PERSONNEL 3000, reinforcement rate limit); context.md and CANON.md refs; REPO_MAP recruitment_engine/recruitment_types. No existing canon text removed.
- **Deferred recruitment (2026-02-17):** Scenario flag `no_initial_brigade_formations` with `recruitment_mode: "player_choice"` creates corps/army_hq only at init; brigades appear via turn-based recruitment from turn 0. Same Phase 0→militia→pool path; AoR/corps init valid with zero brigades. IMPLEMENTED_WORK_CONSOLIDATED §14; Systems Manual §13, Phase II Spec, MILITIA_BRIGADE_FORMATION_DESIGN §10.
- **Phase 0→I JNA_status hand-off (2026-02-24):** Single transition point: applyPhase0ToPhaseITransition sets state.phase_i_jna (transition_begun = RS declared, withdrawal_progress 0, asset_transfer_rs 0) and meta.phase_0_end_turn, phase_1_start_turn, escalation_reason so both scenario runner and warroom paths receive the same hand-off at transition. Phase I reads state.phase_i_jna. CONSOLIDATED_IMPLEMENTED §43; PROJECT_LEDGER 2026-02-24; backlog/PHASE0_JNA_STATUS_HANDOFF_HOWTO.md.
- OOB primary sources: brigades = `data/source/oob_brigades.json`, corps = `data/source/oob_corps.json`; all tools/code canonical (napkin).
- Authority derivation for formation lifecycle: `deriveMunicipalityAuthorityMap(state)` in `src/state/formation_lifecycle.ts` maps consolidated=1, contested=0.5, fragmented=0.2 (sorted mun order); used by brigade activation gating through `update-formation-lifecycle`. Canonical implementation reference: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §8.1.1.
- Browser Phase II advance: `src/sim/run_phase_ii_browser.ts` provides warroom-safe advance (turn increment + AoR initialization when AoRs are empty) using shared Node-free helpers in `src/scenario/aor_init.ts`.
- B1 events framework: `src/sim/events/event_types.ts`, `event_registry.ts`, `evaluate_events.ts`; pipeline `evaluate-events` step emits deterministic `events_fired` (historical + seeded random, report-only).
- B4 coercion tracking (implementation extension): optional `coercion_pressure_by_municipality` in state reduces Phase I flip threshold in `src/sim/early_war/control_flip.ts` with deterministic bounds.
- Capability-weighted Phase I flip (implementation extension): Phase I control flip scales attacker strength and defender effectiveDefense by `getFactionCapabilityModifier` (System 10 / Appendix D). Pipeline step `phase-i-capability-update` runs before `phase-i-control-flip` so profiles are set by year. Doctrine keys deterministic (ATTACK for attacker, DEFEND/STATIC_DEFENSE for defender). See `docs/40_reports/backlog/HISTORICAL_TRAJECTORY_VRS_ARBIH_ANALYSIS.md` and ledger 2026-02-10 RBiH wipe-out fix.
- **Phase I no-flip policy (2026-02-11):** Final calibration from 12w/30w matrix, 3x3 knob grid, and attack-scale sweep. Ethnic/hybrid: NO-GO for `disable_phase_i_control_flip` (default militia-pressure remains canonical). Player_choice: GO for recruitment-centric scenarios (RS 2834 vs 3329 at 30w). Knobs (attack_scale, stability_buffer_factor) apply only when no-flip enabled; player_choice invariant across tested range. See `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md`.
- **RBiH-aligned municipalities (2026-02-12, Velika Kladuša 2026-02-15):** Single source `src/state/rbih_aligned_municipalities.ts` (Bihać, Brčko, Gradačac, Lopare, Maglaj, Srebrenik, Tešanj, Tuzla, Velika Kladuša). Applied in political_control_init (all init paths), militia_emergence (HRHB strength → RBiH), control_flip (flip winner HRHB → RBiH override), build_political_control_data (MUN_NORMALIZATIONS). Control and spawns always RBiH there (napkin).
- **Phase II battle resolution (2026-02-12):** `src/sim/combat/battle_resolution.ts`; terrain scalars, casualty_ledger, multi-factor combat power, outcome thresholds; four snap events (Ammo Crisis, Commander Casualty, Last Stand, Surrender Cascade). Deterministic; sorted iteration; no RNG (napkin).
- **RS mandatory bottleneck control (2026-02-16):** For ongoing recruitment, apply a small deterministic RS-only manpower mobilization budget to pending mandatory brigade home municipalities before recruitment checks, and cap mandatory recruits per faction per turn to scenario/state max. This improves RS historical brigade activation without uncapped one-turn spikes (see `PROJECT_LEDGER.md` 2026-02-16).
- **OSID-vs-SID key mismatch pattern (2026-02-24):** After the OSID-as-base-layer migration, `political_controllers` uses OSID keys (format `op:<mun>:<slug>`) but many functions still iterate SID-keyed maps (canonical `S`-prefixed IDs) and check `pc[sid]` — returning `undefined` for every lookup. **Detection:** Any function that looks up `state.political_controllers[sid]` where `sid` is a canonical settlement ID will silently fail when controllers are OSID-keyed. The first key in `Object.keys(state.political_controllers)` starting with `op:` confirms OSID-keyed state. **Fix pattern:** (A) Rebuild the SID→mun map as OSID→mun using `buildOsidToMunFromReverseMap()` (converts the iteration keys); (B) Add OSID-prefix fallback in controller lookup: when SID lookup fails and `munId` is known, scan `op:<munId>:*` keys in sorted order to find controller (the municipality is encoded in the OSID key itself). **Affected systems (fixed 2026-02-24):** `factionHasPresenceInMun` (oob_phase_i_entry.ts), `getMunicipalityController` (pool_population.ts, minority_militia_decay.ts, control_strain.ts), scenario_runner.ts sidToMun rebuild. **Lesson:** After any key-space migration (SID→OSID, canonical→operational), grep for all `political_controllers[` lookups and verify key format compatibility. See `PROJECT_LEDGER.md` 2026-02-24.
- **Force growth calibration (2026-02-24):** Historical first-year force trajectories: RBiH ~60-80K → 130K (Apr 92 → Apr 93), RS ~80K → 110K, HVO ~30K → 50K. Calibrated via 6 iterative 52w scenario runs. Key parameters: `BASE_MOBILIZATION_RATE=0.003`, faction scales RBiH=1.1 / RS=0.15 / HRHB=1.2, surge curve 3.0/2.2/1.4/0.9/0.5/0.3 (weeks 1-12/13-26/27-52/53-78/79-104/105+), `RS_JNA_INHERITANCE_BONUS=30K`, `REINFORCEMENT_RATE=400`, exhaustion threshold 20%/hard cap 35%. RS low scale (0.15) is correct because VRS was already near full mobilization from JNA handover; RS controls largest territory with highest ethnic majority, so most eligible Serbs were mobilized by May 1992. See `PROJECT_LEDGER.md` 2026-02-24.
- **Bottom-up pipeline in phase_ii (2026-02-28):** When `recruitment_mode === 'bottom_up'`, the turn pipeline must run Phase I bottom-up steps (militia-emergence, compute-siege-state, pool-population, formation-spawn, activate-corps, promote-formations) even when `meta.phase === 'phase_ii'`. Implemented in turn_pipeline.ts; canon: Engine Invariants §14.10. Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **40w calibration baseline (2026-02-28):** apr1992_definitive_40w uses `recruitment_mode: "player_choice"` so brigades spread to front OSIDs and generate attack orders; bottom_up is not used for this scenario. n246 baseline: RS=406, RBiH=265, HRHB=82; all 6 benchmarks pass. Report: docs/40_reports/implemented/20260228_PHASE_G_CALIBRATION_BOTTOM_UP_PIPELINE_FIX.md.
- **Attack share step function (2026-02-28):** Corps attack_slots = max(1, floor(N × share)); tuning within a step can have zero effect. Document step thresholds when tuning bot doctrine; see BOT_AI_HOLISTIC_TUNING_REFERENCE.md and Phase G report.
- **Brigade operational cap (2026-02-11):** Hard then dynamic cap per brigade; `getBrigadeOperationalCoverageSettlements`; urban fortress for large-urban muns (≥60k 1991) via `large_urban_mun_data.ts`; UI and sim share `src/state/brigade_operational_cap.ts`. MAX_MUNICIPALITIES_PER_BRIGADE (8) in ensure step (2026-02-13) (napkin).
- **Brigade AoR overhaul (2026-02-14):** Corps-directed assignment when `state.corps_command` present: partition front into corps sectors, allocate brigades along each sector's frontline (home mun + up to 2 contiguous neighbors), derive settlement AoR, enforce contiguity (repair, orphan reassignment). Contiguity is a hard invariant; rebalance shed uses `wouldRemainContiguous` guard. Legacy Voronoi BFS when no corps (Phase I / tests). Tactical map AoR highlight: compound fill (evenodd), outer boundary only, breathing glow. Report: `docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/BRIGADE_AOR_OVERHAUL_CORPS_DIRECTED_2026_02_14.md`; canon: Phase II §7.1, Systems Manual §2.1/§8, TACTICAL_MAP_SYSTEM Pass 6.
- **Phase I no-flip semantics (2026-02-13):** `disable_phase_i_control_flip` = military-action-only (militia-pressure path disabled; formation-led flips still possible). Scenario names with no_flip do not imply strict zero control changes (napkin).
- **Scenario harness diagnostics (2026-02-13):** `run_summary.json` includes `phase_ii_attack_resolution` (weeks_with_phase_ii, orders_processed, flips_applied, casualty_attacker/defender); end_report section "Phase II attack resolution (pipeline)" for diagnosing 0-flip Phase II outcomes (napkin).
- **Front system rebuild (2026-02-21):** assignable_front_segments, brigade_front_assignment (reserve rule), theatres, army_theatre_assignment; GUI assign-to-front and naming IPC; 2D/3D single source. TACTICAL_MAP_SYSTEM §10.4, §21.3; DESKTOP_GUI_IPC_CONTRACT state contract. IMPLEMENTED_WORK_CONSOLIDATED §28.
- **Headless corps fronts and run_summary (2026-02-21):** Phase II pipeline step `ensure-derived-corps-front-edges` populates corps_front_edges in headless runs; run_summary includes `front_corps_tracking: { corps_front_edges_present, corps_count }` when Phase II ran. IMPLEMENTED_WORK_CONSOLIDATED §29; PROJECT_LEDGER 2026-02-21.
- **Clone centralization (2026-02-11):** Single `cloneGameState` in `src/state/clone.ts` used by all turn pipelines and browser runners; avoids six duplicate polyfills (napkin).
- **Displacement system complete (2026-03-01):** Per-OSID census displacement depth. Key mechanics: (1) `getOsidCensusPopulation()` and `getOsidCensusHostileShare()` read `population_total`, `population_bosniaks/serbs/croats/others` from operational settlement records; faction→ethnic: RBiH=bosniak+other, RS=serb, HRHB=croat. (2) Hostile share cap 0.95 per-OSID, 0.80 municipality fallback. (3) Operational settlements loaded separately in turn_pipeline via `loadSettlementGraph()` (OSID-keyed, `op:` prefix validated); passed as `osidSettlements` param. (4) Sustained pool: `cumulative_displaced = displacementAmount` after initial fire (prevents double-counting). (5) Ethnic map layer: `buildEthnicGeoJSON.ts` uses departure events + per-mun arrivals for OSID-level ethnic composition. Results: n319 668k displaced (RBiH 458k, HRHB 150k, RS 60k); Ljubija 5,331→13,399 (+151%). Report: `20260301_DISPLACEMENT_DEPTH_CALIBRATION.md`. **Key lesson:** The SID-keyed raw graph (5822 entries) and OSID-keyed operational graph (753 entries) serve different purposes; displacement requires OSID-keyed graph for per-OSID census lookups.
- **Elite brigade spawning bypass (2026-03-15, n745):** Elite brigades (`is_elite: true`) must bypass both `factionHasPresenceInMun` and militia pool drain in `runBotRecruitment`. Rationale: (1) OOB mun slugs use underscores (`han_pijesak`) while `operational_settlements.geojson` uses no-underscore (`hanpijesak`) → presence check always fails; (2) municipality militia pools are sized from census × 0.28 × 0.25 — far smaller than elite initial_personnel (1200+). Fix: early-continue only when `!brigade.is_elite` for presence check; pool drain block skipped for `isElite === true`; `effectiveManpower = brigade.initial_personnel`. No pool key is deducted for elites (they represent national professional units, not local conscripts). See PROJECT_LEDGER.md 2026-03-15.
- **`getCorpsReferenceOsid` corps-formation early-return trap (2026-03-15, n745):** In `army_reserve_system.ts`, `formations[corpsId]` returns the corps HQ formation, which always has `location_osid=undefined` and `home_osid=undefined`. Any `if (corpsFormation) { return ...; }` pattern that wraps both `location_osid` and `home_osid` will return `null` immediately, preventing the brigade fallback scan from ever running. Pattern to follow: check if the formation's OSID is non-null before returning; fall through to brigade scan if null. This trap applies to any corps-level formation lookup that expects a geographic anchor. See PROJECT_LEDGER.md 2026-03-15.
- **Army HQ Reserve Pool — Elite Brigade Loan System (2026-03-15):** Elites permanently assigned to faction Main Staff HQ corps (`vrs_main_staff`, `arbih_general_staff`, `hvo_main_staff`). Per-turn lifecycle: (1) `generateArmyReserveRequests` — each non-main-staff corps generates up to one request per type (`offensive_support`/`defensive_gap`/`exploitation`); priority scored by `computeDeployPriority` (geographic feasibility: MAX_AUTO_DEPLOY_HOPS=8, 0–3 hops=1.0×, 4–6=0.6×, 7–8=0.3×, >8 rejected); (2) `evaluateArmyReserveAssignments` — bot factions auto-assign best-match elites, player faction's requests surface in `pending_reserve_requests` for ArmyReservePanel; (3) `tickEliteLoans` — forced recall on ≥30% casualties OR morale<35 OR ≥50% personnel degradation; voluntary recall after ELITE_LOAN_MIN_DURATION=6 turns when op ended and sector threat<1.5; 4-turn cooldown (`last_recall_turn`) between deployments. **Elite identification:** Runtime check for presence of `elite_loan_state` on `FormationState` (not the `is_elite` OOB flag — which is for initial placement only). **Loan routing:** Phase 0a `loanedCorpsMap` in `classifyBrigadesByTerritory` routes loaned brigades through the target corps for sector assignment — they fight as if belonging to that corps while on loan. **Episode tracker:** `EliteBrigadeTracker` on `MilitaryState.elite_brigade_tracker` records per-brigade episodes with deployment dates, casualties taken, reason for recall — enables Campaign History in the UI. **Player/bot split:** Bot factions use `auto_assign: true`; player faction always `auto_assign: false` regardless of bot status. **OOB corrections:** rs_1st_guards + rs_65th_protection → vrs_main_staff; hvo_1st/2nd/3rd_guard → hvo_main_staff (2nd+3rd `is_elite: true`); arbih_guards + arbih_120th_black_swans already in arbih_general_staff. Report: `docs/40_reports/implemented/20260315_ARMY_HQ_RESERVE_POOL_LOAN_SYSTEM.md`. See PROJECT_LEDGER.md 2026-03-15.

**Data & tooling**

- PowerShell: use `;` not `&&` for command chaining (napkin).
- Null-control tracing: MapApp → DataLoader → political_control_data.json → build_political_control_data.ts → prepareNewGameState → initializePoliticalControllers; fix at init/source (napkin).

*(See .agent/napkin.md Patterns That Work; PROJECT_LEDGER.md changelog for implementation entries.)*

### Failed Experiments & Lessons

**Enclave brigades in sector operations (2026-03-14):** Enclave-tagged brigades (`tags: ["enclave"]`) are blocked from *column marching* outside the enclave in `bot_brigade_eval_front.ts`, and from *uncontested occupation* of non-enclave OSIDs in `bot_brigade_eval_attack.ts`. But neither guard applies to *operation participation*: `evaluateSectorOffensiveLaunch` selects brigades from `sectorBrigadeIds` without checking enclave membership vs objectives. A sector that straddles an enclave boundary (e.g. Goražde + northern Foča) can create an operation with Goražde enclave brigades marching through a paper corridor to attack Foča. **Fix (n57):** Filter in `evaluateSectorOffensiveLaunch`: after objectives are determined, exclude any brigade tagged `enclave` whose `location_osid` is not in the same enclave as any objective (`isOsidInSameEnclave`). This organically implements "corridor-widening only" — besieged units can expand their enclave perimeter but not march to distant objectives. See `PROJECT_LEDGER.md` 2026-03-14 n57.

**Failed-objective cooldown pattern (2026-03-14 n58):** When a corps repeatedly assaults the same hardened objective across multiple operation cycles with no captures, use `CorpsCommandState.failed_offensive_objectives` (Record<osid, {failure_count, cooldown_until_turn}>) to suppress it from `offensiveTargets` for a cooldown window. Pattern: `recordFailedObjectives()` called at recovery completion for failed sector_attack ops; filter applied in `bot_corps_directives.ts` after hard-enforce avoidOsids block. Constants: `OBJECTIVE_FAILURE_THRESHOLD=2`, `OBJECTIVE_FAILURE_COOLDOWN_TURNS=8`. Threshold=2 (one probe, one full assault) before cooldown is historically appropriate — gives the corps commander a genuine learning window without requiring a single-failure abort. Cooldown=8 turns (~2 months) models operational reassessment. Unlike geographic `avoid_municipalities` rules, this is fully organic — the corps can retarget after the cooldown expires if conditions change. See `PROJECT_LEDGER.md` 2026-03-14 n58.

**Supply filter doesn't catch strained pockets (2026-03-14):** A supply filter at operation launch that blocks `critical` brigades is insufficient when the pocket has a paper corridor. If ANY chain of faction-controlled OSIDs connects the pocket to a supply source (even a single pixel-wide RBiH strip through Foča to Kalinovik to Sarajevo), the BFS classifies the OSIDs as `strained` not `critical`. The filter passes. Solution was the enclave tag filter above, not a supply state filter. The `critical` supply filter still has value for truly isolated pockets with no corridor at all. See `PROJECT_LEDGER.md` 2026-03-14 n56.

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
- **OOB brigade list correction (2026-02-17):** oob_brigades.json was corrected to contain only true brigades; 25 non-brigade units (battalions, companies, rear bases, schools, logistics, etc.) were removed. Totals: 236 brigades, 195 mandatory at turn 0 (RBiH 116, RS 80, HRHB 40). See MILITIA_BRIGADE_FORMATION_DESIGN §10, formation-expert SKILL, PROJECT_LEDGER 2026-02-17.
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
- **803rd Light / brigade AoR cap (2026-02-11/13):** Ensure step assigns uncovered (faction, mun) only when mun is a brigade home (formation tags `mun:*`); MAX_MUNICIPALITIES_PER_BRIGADE (8) caps per-brigade mun count in that step. See docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/BRIGADE_STRENGTH_AND_AOR_INVESTIGATION_2026_02.md (napkin).
- **Scenario force calibration (2026-02-15):** April 1992 player-facing scenario calibrated via POOL_SCALE_FACTOR 55, organizational penetration (party 85, paramilitary 60), FACTION_POOL_SCALE (RBiH 1.20, RS 1.05, HRHB 1.60), mandatory spawn minimum 200, scenario recruitment resources and desktop constants sync; population loader by_municipality_id fallback. Report: docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/SCENARIO_FORCE_CALIBRATION_2026_02_15.md; canon: Systems Manual §13, Phase I implementation-note, context.
- **Brigade strength after combat:** Battle resolution applies losses in-place; phase-ii-brigade-reinforcement runs after attack resolution. Final save can show brigades < 3000 personnel; tactical map shows f.personnel from state (napkin).
- **Orchestrator scenario-run handoff:** Run canonical scenarios (e.g. apr1992_phase_ii_4w, apr1992_4w, player_choice_recruitment_no_flip_4w), capture outDir/run_id and end_report paths, then create handoff doc (docs/40_reports/) for scenario-creator-runner-tester to check vs historical expected outcomes (napkin).
- **Implemented work single source (2026-02-15, expanded 2026-02-16):** All implementation report content is in docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md (sections 1–12). Section 10 = Warroom/Phase 0 and systems integration; §11 = Warroom restyle, Apr 1992 scenario fix, embedded tactical map, fog-of-war; §12 = deterministic org-pen initialization and Phase 0->I handoff alignment (A/B/C formula seeding). New reports in `docs/40_reports/implemented/`: `WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md`, `ORG_PEN_FORMULA_INIT_AND_PHASE0_HANDOFF_2026_02_16.md`. Canon (Phase 0/I, Systems Manual, context, docs_index) and 40_reports indices reference these updates.
- **Design cross-impact analysis as prerequisite (2026-02-18):** Before implementing any system that is tightly coupled to another planned-but-not-yet-implemented system, produce a written cross-impact analysis identifying every field, modal, event, and data structure in the downstream system that will need updating when the upstream system lands. The 2026-02-18 AoR Redesign Study vs Warroom War-Phase Modals analysis found 11 specific changes — all additive — that must be made to warroom modals when brigade AoR redesign ships. Doing this analysis before implementation prevents rework, keeps design docs in sync, and surfaces architectural surprises early. Pattern: list upstream changes in a table with downstream location, what changes, and impact class (additive/breaking/optional).
- **Warroom war-phase modals report propagation (2026-02-21):** Report [WARROOM_WAR_PHASE_MODALS_2026_02_21.md](40_reports/implemented/WARROOM_WAR_PHASE_MODALS_2026_02_21.md) propagated as IMPLEMENTED_WORK_CONSOLIDATED §31; CONSOLIDATED_IMPLEMENTED, 40_reports README, context.md implementation references updated. Ledger 2026-02-21.

*(See .agent/napkin.md Domain Notes; PROJECT_LEDGER.md for detailed changelog.)*

---

## 4. Canon & Specifications Evolution

**How to use:** Current canon docs, version, and a log of specification changes. For full text see `docs/10_canon/`.

### Current canon documents

| Document | Version | Scope |
|----------|---------|--------|
| Game_Bible | v0_6_0 | Design philosophy, constraints, two-phase lifecycle |
| Rulebook | v0_6_0 | Player-facing rules, two-phase lifecycle |
| Engine_Invariants | v0_6_0 | Determinism and war/peace invariants |
| Phase_Specifications | v0_6_0 | Peace/War phase contract |
| Peace_Specification | v0_6_0 | Referendum and war-start contract in peace |
| War_Specification | v0_6_0 | Unified war mechanics (formerly Phase I/II scope) |
| Systems_Manual | v0_6_0 | Systems 1–11, Washington Agreement, state schema |

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

### Known canon/spec gaps (comprehensive review 2026-02-23)

Identified via Orchestrator comprehensive review convene ([ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](40_reports/convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md)):

- **Phase 0→I JNA_status contract gap:** Phase 0 §7/§8 do not list JNA_status (transition_begun, withdrawal_progress, asset_transfer_RS); Phase I §3 expects it. Action: extend Phase 0 output contract. **Closed 2026-02-24:** Phase 0 §7.7 and §8 already included JNA_status; implementation now sets state.phase_i_jna and meta.phase_0_end_turn, phase_1_start_turn, escalation_reason at transition (Option A1 in applyPhase0ToPhaseITransition). Phase_0_Spec §7.7 and §8 implementation-notes added; Phase I Spec §3 implementation-note added. See PROJECT_LEDGER 2026-02-24, PHASE0_JNA_STATUS_HANDOFF_HOWTO.md.
- **Phase II ceasefire/Washington pipeline gap:** `phase-i-ceasefire-check` and `phase-i-washington-check` only run in Phase I pipeline; if preconditions first met in Phase II, milestones would not fire. Action: add steps or shared milestone evaluation for Phase II.
- **War termination / end-game unspecified:** Canon and Rulebook are largely silent on when negotiation opens, how the game ends, and scoring/evaluation. Action: minimal war termination spec (thresholds, end state, scoring).
- **Player action guide missing:** Rulebook is systems-first; a clear "Player's Turn Guide" or "Player Actions per Phase" section is missing. Action: add to Rulebook or linked doc.
- **Supply spec gap:** Supply is referenced in combat, exhaustion, authority, corridors, enclave integrity — but no formal specification at attack-resolution level. Action: produce supply spec after critical path items.

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
- **Warroom-first desktop launcher (2026-02-15):** Electron default renderer is now warroom (`awwv://warroom/index.html`) with launcher flow (side picker + scenario picker: `sep_1991`/`apr_1992`) before entering HQ. Main process remains canonical state owner; warroom receives state via `game-state-updated` and uses `advance-turn` IPC with optional `phase0Directives` payload for deterministic pre-turn investment application in main. Optional tactical map companion window via `open-tactical-map-window` (`awwv://app/tactical_map.html`). See PROJECT_LEDGER.md 2026-02-15 desktop GUI rebuild entry; DESKTOP_GUI_IPC_CONTRACT.md and TACTICAL_MAP_SYSTEM.md §21.
- **GUI polish pass canon (2026-02-14):** Implemented report GUI_POLISH_PASS_AND_REFACTOR_2026_02_14.md propagated to TACTICAL_MAP_SYSTEM §2/§13 (tabs, formation panel, strategic zoom, modals, file inventory), GUI_DESIGN_BLUEPRINT §21, context.md implementation refs, docs_index; CONSOLIDATED_IMPLEMENTED §7 already linked. See PROJECT_LEDGER.md 2026-02-14 Canon propagation: GUI Polish Pass.
- **April 1992 scenario creation (2026-02-14):** Comprehensive report [ORCHESTRATOR_APR1992_SCENARIO_CREATION_COMPREHENSIVE_REPORT_2026_02_14.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — Phases A–H (research, formation-aware flip, OOB cleanup, initial formations, JNA ghost mechanic, scenario authoring/calibration, desktop GUI). **Canon April 1992 scenario:** **apr1992_definitive_52w** — single scenario for desktop New Campaign, bot optimization, and CLI default (`npm run sim:scenario:run:default`). apr1992_historical_52w is legacy (no recruitment_mode) for reference only. CONSOLIDATED_IMPLEMENTED §5, context.md implementation refs, docs_index. See PROJECT_LEDGER.md 2026-02-14 Canon propagation and 2026-02-16 canon scenario consolidation.
- **Orders pipeline and posture UX (2026-02-15):** Implemented report [ORDERS_PIPELINE_AND_POSTURE_UX_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — full runTurn in desktop advance, IPC order staging (stage-attack-order, stage-posture-order, stage-move-order, clear-orders), GameStateAdapter orders as Records, bot AI excludes meta.player_faction, posture picker (human labels, tooltip stats, inline description, disabled by cohesion/readiness). Canon: TACTICAL_MAP_SYSTEM §2, §13.3, §14.2, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.5. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Orders pipeline and posture UX.
- **Order target selection UX (2026-02-15):** Implemented report [ORDER_TARGET_SELECTION_SYSTEM_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — full targeting mode (visual overlay, enriched tooltips, Escape cancel, cursor feedback, attack two-step confirmation, preview arrow). Pure UI in MapApp; no engine/IPC changes. Canon: TACTICAL_MAP_SYSTEM §2, §8, §12.4, §13.3, §21. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Order target selection.
- **Corps AoR contiguity (2026-02-15):** Implemented report [CORPS_AOR_CONTIGUITY_ENFORCEMENT_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) — corps-level contiguity (checkCorpsContiguity, repairCorpsContiguity, enforceCorpsLevelContiguity); enclave exception; Step 9 in assignCorpsDirectedAoR; pipeline step `enforce-corps-aor-contiguity` after `rebalance-brigade-aor`; brigade repair prefers same-corps. Canon: Phase II §5, §7.1; Systems Manual §2.1. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Corps AoR contiguity.
- **Scenario init six fixes (2026-02-15):** Implemented report (see [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §3, §4, §6; originals archived to _old/40_reports/implemented_2026_02_15/) — formation marker stacking (buildFormationPositionGroups, hit-test), corps-to-brigade command lines (drawCorpsSubordinateLines), settlement panel vertical tabs; Velika Kladuša RBiH-aligned (nine muns); VRS brigade HQ resolution (resolveValidHqSid in recruitment_engine); brigade AoR contiguity at init (scenario_runner: corps before AoR, safety net in initializeBrigadeAoR). Canon: TACTICAL_MAP_SYSTEM §8, §13.2; Phase II §7.1; Systems Manual §2.1, §13. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Scenario init six fixes.
- **Player agency plan kickoff (2026-03-07):** Execute `docs/30_planning/PLAYER_AGENCY_IMPLEMENTATION_PLAN.md` by actual file impact, not phase labels. `Phase A` can stay parallel/UI-only; `Phase F` is not fully UI-only because `F1` changes `CorpsOperation` schema, IPC payloads, and brigade attack approval in `bot_brigade_ai_osid.ts`. Either split `F1` into an engine-touching commit with regression or treat all of `Phase F` as regression-gated. Between phases: simplify, update ledger + napkin, verify, then single-phase commit. See PROJECT_LEDGER.md 2026-03-07 kickoff entry.
- **Tactical map seven UI/sim fixes (2026-02-15):** Implemented report (see [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §6) — 4th Corps OOB (7 core brigades available_from: 0, mandatory: true); War Summary modal (per-faction counts, BATTLES THIS TURN, control gained/lost); white corps command lines (60%, 2px); AoR fill pulsing (0.08–0.22); corps panel ACTIONS (stance + bulk posture via stage-corps-stance-order); army_hq FormationKind (NATO xxx, panel, command lines, AoR merge); larger markers + vertical stacking (44×30/54×38/66×46, hit 36px). initializeCorpsCommand includes corps_asset. Canon: TACTICAL_MAP_SYSTEM §2, §8, §13, §20, §21; DESKTOP_GUI_IPC_CONTRACT; Systems Manual §6.4. See PROJECT_LEDGER.md 2026-02-15 Canon propagation: Tactical map seven UI/sim fixes.
- **Warroom restyle, scenario fix, embedded map, fog-of-war (2026-02-16):** Implemented report [WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md](40_reports/implemented/WARROOM_RESTYLE_SCENARIO_FIX_EMBEDDED_MAP_FOG_OF_WAR_2026_02_16.md); IMPLEMENTED_WORK_CONSOLIDATED §11. Four items: (1) Warroom UI unified to NATO ops-center CSS (modals.css, ticker, all modals/panels). (2) All April 1992 scenarios use init_control_mode hybrid_1992 and init_control apr1992 (curated municipal file); Systems Manual implementation-note updated. (3) Tactical map opens as full-screen iframe in warroom (awwv://warroom/tactical-map/*, same-origin, bridge inheritance, postMessage back-to-HQ). (4) Faction fog-of-war: buildFormationPositionGroups and drawOrderArrows filter by player_faction; enemy formations hidden on canvas; defender info still visible in attack panel/tooltips. Canon: TACTICAL_MAP_SYSTEM §21.1, §22; context.md; CONSOLIDATED_IMPLEMENTED.
- **Tactical map UX (2026-02-19):** Accessibility (ARIA live region, keyboard settlement navigation, focus-visible), larger click targets and 12px typography, desaturated accent #00d470, toolbar grouping, panel tabs 90px/10px, hover/selection glow and formation glow, tooltips with shortcuts, loading/error/empty states, optional quick tour. TACTICAL_MAP_SYSTEM §2; docs/plans/2026-02-19-warmap-figma-spec.md implementation note.
- **Tactical 3D parity pass (2026-02-20):** `map_operational_3d.ts` now mirrors key tactical-map behaviors: `layer-formations` actually toggles 3D formation sprites, initial 3D view is corps-first via camera LOD (brigades on zoom-in), and formation clicks are hierarchy-aware (corps -> subordinate links + union AoR; brigade -> parent corps link + brigade AoR). Selection synchronizes with embedded MapApp state through `window.__awwvMapApp.state`.
- **Three workstreams convene (2026-02-20):** Orchestrator convened roles for (1) 3D corps/brigade icon size and LOD, (2) AoR display in 3D to match plan §2.5/§4.5 and TACTICAL_MAP_SYSTEM Pass 6, (3) brigade AoR 1–4 canon/engine/GUI. Priority, ownership, and handoffs: [ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP_2026_02_20.md](40_reports/convenes/ORCHESTRATOR_THREE_WORKSTREAMS_3D_ICONS_AOR_BRIGADE_CAP_2026_02_20.md).
- **Warmap sandbox visual & UX port (2026-02-21):** Operational 3D warmap (`map_operational_3d.ts`) now has two-tier formation counters (brigade light / corps CRT), stem lines to terrain, enhanced AoR and polygon movement range, settlement highlight rings, right-side panel stack (Selection, Orders, Battle log, Forces), and SELECT/ATTACK/MOVE mode toolbar (1/2/3, Escape) using DesktopBridge `stagePostureOrder`/`stageAttackOrder`. See [WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md](40_reports/implemented/WARMAP_SANDBOX_VISUAL_UX_PORT_2026_02_21.md); TACTICAL_MAP_SYSTEM §2, §21.2; DESKTOP_GUI_IPC_CONTRACT; Systems Manual implementation-note.
- **Sep 1991 Phase 0 pre-war correction (2026-02-16):** Sep 1991 now starts with referendum not yet held, uses scheduled referendum/war-start turns (26/30), and applies April 1992 mun1990 control exactly on `phase_0 -> phase_i` transition (before OOB recruitability checks). Key implementation detail: when scheduled referendum is later than default eligibility deadline, pass a schedule-aware `deadlineTurns` override or Phase 0 will terminate early as non-war. See PROJECT_LEDGER.md 2026-02-16 entry "Sep 1991 Phase 0 correction: pre-referendum start, scheduled referendum, and war-start Apr 1992 control handoff."
- **Sep 1991 declaration-timing calibration (2026-02-16):** For undeclared-at-start scenarios, the canonical Phase 0 runner must pass full declaration options (`buildPhase0TurnOptions`) into `runPhase0Turn`; referendum-only options can leave declaration pressure inert and stall progression. For Sep 1991 historical flow, use schedule-gated threshold calibration (HRHB sustained-violence context + pressure/relationship overrides, RS threshold/relationship calibration) rather than scripted declaration dates. See PROJECT_LEDGER.md 2026-02-16 entry "Sep 1991 declaration timing calibration: undeclared start, threshold-based Nov/Jan sequence, and canonical runner wiring."
- **Phase 0 capital trickle canon update (2026-02-16):** Capital remains non-renewable by default, but scheduled pre-war scenarios now allow deterministic limited trickle (Phase 0 §4.1.1) to reduce dead turns without removing scarcity. Runtime gate is `meta.phase === "phase_0"` plus scheduled referendum/war-start metadata; application order is canonical faction order. See PROJECT_LEDGER.md 2026-02-16 entry "Canon update + implementation: scenario-gated deterministic Phase 0 capital trickle."
- **Sep 1991 trickle calibration (2026-02-17):** 20w/31w runs validated PER_TURN=1, MAX_BONUS=20; cap reached by turn 20, no tuning required. See docs/40_reports/convenes/SEP_1991_CAPITAL_TRICKLE_CALIBRATION_2026_02_17.md; Phase_0_Spec §4.1.1 implementation-note; IMPLEMENTED_WORK_CONSOLIDATED §13.

### docs/40_reports structure (2026-02-13)

- **Entrypoint:** docs/40_reports/README.md — master index; points to consolidated views and subfolders.
- **Subfolders:** audit/, implemented/, backlog/, convenes/, handovers/. Reports are physically placed in these folders; CONSOLIDATED_* links use subfolder paths (e.g. implemented/ReportName.md).
- **Consolidated views:** CONSOLIDATED_IMPLEMENTED.md (what’s done), CONSOLIDATED_BACKLOG.md (not yet implemented), CONSOLIDATED_LESSONS_LEARNED.md (patterns and report-derived lessons). Napkin remains session source of truth for corrections and patterns.
- **Custodian:** reports-custodian skill (`.cursor/skills/reports-custodian/SKILL.md`) owns 40_reports structure; classifies new reports, keeps CONSOLIDATED_* and README in sync, archives superseded to docs/_old/. Works with Documentation Specialist for doc layout.
- **Orchestrator memo:** ORCHESTRATOR_40_REPORTS_CLEANUP_AND_CONSOLIDATION_2026_02_13.md (directive; physical reorg and custodian created 2026-02-13).

*(See PROJECT_LEDGER.md 2026-02-13 docs/40_reports cleanup and consolidation; 2026-02-13 physical reorg and reports-custodian.)*

### Pyrrhic team & meetings

- **Subagents:** formation-expert (militia/brigade, pools, constants); scenario-creator-runner-tester (BiH history, scenarios, run analysis, conceptual proposals).
- **State-of-game meetings:** e.g. PARADOX_STATE_OF_GAME_MEETING_2026_02_08_THIRD.md — knowledge base, PDF limitation, canon audit; 11 systems designed, 5 fully wired, 6 partial.
- **Ledger:** New entries appended to PROJECT_LEDGER.md; awwv-ledger-entry skill for auto-append.
- **Orchestrator scenario-run handoffs:** docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_12.md, implemented/ORCHESTRATOR_SCENARIO_RUNS_HANDOFF_2026_02_13.md — run canonical scenarios, capture run IDs/artifacts, delegate to scenario-creator-runner-tester (and optionally formation-expert) for historical verification.
- **Orchestrator absorption (2026-02-13):** docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/ORCHESTRATOR_ABSORPTION_AND_CANON_UPDATE_2026_02_13.md — absorbed 40_reports (battle resolution, recruitment, AoR investigation, no-flip, ethnic init, tactical map) and updated Phase II / Systems Manual canon accordingly.

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

5. **P3 priority municipality bypass for undefended targets (2026-03-06)** — Corps-level P3 filter restricted opportunistic targets to army_priorities municipalities. This blocked capture of undefended territory in areas like Krajina where municipalities appeared only in defensive_priorities. Fix: bypass P3 for truly undefended targets (undefended_front + weak_enemy_osids with reason 'undefended'); weak-but-defended still filtered. Design principle: taking undefended territory costs nothing — all factions historically consolidated empty areas without explicit orders. Strategic filters should only gate targets requiring actual combat.

6. **Rear pocket consolidation vs brigade attacks (2026-03-07)** — Pipeline consolidation (auto-flip surrounded territory without combat) is strictly superior to changing brigade attack decisions for pocket cleanup. Approaches tried: predictor/resolver rear pocket fix (n208, 30 pockets, 82.6%), adjacency-based home-defense attacks any mun (n212, 25 pockets, 82.5%), same mun (n213, 22 pockets, 83.6%) — all caused butterfly effects from additional attack decisions destabilizing fronts. Pipeline approach (n214, 12 pockets, 84.2%): zero butterfly effects because no attack decisions change. Design principle: when a problem can be solved without changing attack decisions, always prefer the non-combat path.

5. **Engine-only long-horizon calibration (2026-02-17)** — Raised personnel/recruitment throughput (`POOL_SCALE_FACTOR 55->65`, `FACTION_POOL_SCALE.RS 1.05->1.15`, reinforcement `200/100->260/130`, RS mandatory mobilization `80->120`) and battle resolution intensity/flip rates (`ATTACKER_VICTORY_THRESHOLD 1.3->1.2`, `STALEMATE_LOWER_BOUND 0.8->0.7`, `BASE_CASUALTY_PER_INTENSITY 20->35`, `MIN_CASUALTIES_PER_BATTLE 5->10`, `UNDEFENDED_DEFENDER_CASUALTY_SCALE 0.2->0.4`, intensity divisor `500->400`). 104w definitive run improved flips (404->557), total casualties (att/def 5065/2905->7234/4120), and first-52w casualties (4922->8074), but per-faction casualty totals remain below desired historical scale.
6. **Hostile-takeover displacement path (2026-02-17)** — Added a delayed Phase II displacement chain tied to at-war settlement flips: takeover timer (4 turns) -> camp pool (4 turns) -> deterministic motherland-ordered urban reroute with overflow. East-Bosnia Bosniak routing now prioritizes Srebrenica/Tuzla/Gorazde; enclave overrun (Srebrenica/Gorazde/Zepa) applies higher kill fraction than standard displacement. Tactical map now displays both 1991 and current population (derived from displacement state).
7. **Displacement refactor shared utils (2026-02-17)** — Extracted `displacement_state_utils.ts` with `getOrInitDisplacementState` and `getMunicipalityIdFromRecord`; displacement_takeover and minority_flight import from it. No behavior change; code organization only. IMPLEMENTED_WORK_CONSOLIDATED §23.

8. **Linked ZoC front-line system (2026-02-23)** — When two or more friendly brigades' zones of control form a connected chain through the OSID adjacency graph (brigade → zoc → zoc → brigade, max 4-node chain), intermediate ZoC OSIDs become a "linked front" blocking enemy movement. Algorithm: BFS connected components on subgraph of (brigade ∪ ZoC) OSIDs; components with 2+ brigades → all ZoC OSIDs in that component are linked. Enemies cannot enter linked ZoC (friendly-controlled territory within the chain) but CAN attack brigade positions. This models the historical reality that deployed units within mutual support range control ground between them. Effect: front lines stabilize after initial offensive phase (~17 weeks), matching Bosnian War's historical pattern of solidified fronts by mid-1992.

9. **OSID terrain-weighted column movement (2026-02-23)** — Multi-hop column transit for brigade redeployment through rear areas. Terrain-weighted Dijkstra pathfinding through friendly OSIDs (road quality, slope, friction, river, uphill). Column rate by composition: heavy mech (RS) = 2/turn, light infantry (RBiH) = 4/turn, mixed (HRHB) = 3/turn. Bot AI issues column march for brigades ≥3 BFS hops from front. Transit time = ceil(path_cost / rate). Pipeline: column step runs BEFORE zoc-constrained-movement (which clears all orders). Pattern: separate order `stance` field distinguishes column orders from 1-hop combat orders.

10. **Ethnic-majority init control + co-ethnic bot scoring (2026-02-25)** — Fixed critical bug: `hybrid_1992` init mode's ethnic lookup fails silently for OSID-keyed graphs (`sidToEthnicityKey("op:mun:slug")` → `"Sslug"` doesn't match canonical `"S123456"` keys). All OSID scenarios were initializing from municipality controller only. Fix: load `operational_political_control.json` (ethnic majority at 40% threshold, HRHB→RBiH aligned-municipality overrides) directly after state creation. RS starts 266/753 (35.3%) instead of 295/753 (39.2%). Bot scoring now includes co-ethnic motivation: `computeOsidEthnicComposition()` averages canonical SID census data per OSID; `getCoEthnicScore()` returns 0–80 bonus proportional to co-ethnic share (linear, full at ≥50%). All three faction scoring functions use this. Pattern: OSID-level data aggregation from canonical SIDs requires explicit reverse-map lookup — never assume OSID keys match canonical data keys.

11. **Bot AI territorial calibration patterns (2026-02-25)** — (a) Heartland penalty time-decay: flat avoidance penalties cause permanent combat death; time-decaying penalties (-400→-250→-150) create multi-phase offensives matching historical war phases. (b) Exact OSID Set matching vs municipality-pattern matching: narrow penalties (e.g. Bihać pocket) should use `Set.has()` on specific OSIDs rather than `osidMatchesAny()` substring matching on municipality patterns, which blocks entire municipalities. (c) Co-ethnic scoring activates faction-appropriate defense: HVO jumped from 2 to 18 orders because ethnic scoring motivated defense of Croat-majority OSIDs. (d) BFS `findNearestOsidByPattern()` enables retreat-to-pocket behavior (HVO Posavina → Orašje).

*(See PROJECT_LEDGER.md 2026-02-11–12, 2026-02-13, 2026-02-23, 2026-02-25; docs/40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md; archived: docs/_old/40_reports/implemented_2026_02_15/battle_resolution_engine_report_2026_02_12.md.)*

### Phase I no-flip chain

1. **Hard short-circuit (2026-02-11)** — disable_phase_i_control_flip → stasis (zero flips). Insufficient.
2. **Military-action branch (2026-02-11)** — Formation-led control pressure; militia-threshold path disabled. Movement and displacement occur.
3. **Calibration (2026-02-11)** — 3x3 knob grid, attack-scale sweep; player_choice benefits, ethnic/hybrid 30w worse than default.
4. **Final policy (2026-02-11)** — No-flip GO only for player_choice recruitment scenarios; ethnic/hybrid NO-GO. Canonical scenario: player_choice_recruitment_no_flip_4w; PHASEI_NOFLIP_SCENARIO_AUTHOR_CHECKLIST.md.

*(See PROJECT_LEDGER.md 2026-02-11; PARADOX_PHASEI_NOFLIP_FINAL_PROPOSAL_2026_02_11.md.)*

### Tactical map order UX pattern (2026-02-20)

- Replace abstract caps with direct geographic selection when the mechanic is spatial (Move/Reposition AoR): select 1–4 connected settlements on map, validate contiguity and ownership at both UI and main-process validation layers, and keep Confirm/Cancel keyboard parity (Enter/Esc).
- Reuse a single validation helper for hover tooltip, cursor state, and click-path guardrails to keep UX feedback consistent and prevent drift between what looks valid and what actually stages.
- Render pending-order intent directly on map (attack + municipality move + settlement move + reposition arrows) so staged actions are legible without opening panel details.

*(See PROJECT_LEDGER.md 2026-02-20 “Brigade AoR UX pivot: settlement-select Move/Reposition + polish + docs alignment”.)*

---

### Map HoI and 2.5D renderer (2026-02-21)

- **map_hoi** — Parallel entrypoint: HoI-style warm palette, class-based components, same IPC and GameStateAdapter; operational_settlements.geojson for placeholder or 2.5D control layer.
- **HoIMapRenderer** — Three.js orthographic ~20° tilt; terrain; political control meshes; front ribbons; Bézier order arrows; formation sprites (zoom scaling); labels LOD; strategic points; enclave rings. WebGL fallback to 2D placeholder.
- **Operational settlements** — `npm run map:derive:operational-settlements`; Phases 1–2 prerequisite.

---

### AoR/OSID/front reconciliation (comprehensive review 2026-02-23)

- The comprehensive review ([ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md](40_reports/convenes/ORCHESTRATOR_COMPREHENSIVE_REVIEW_CONVENE_2026_02_23.md)) confirmed that AoR, OSID (location_osid, ZoC, attack resolution), and front segments (assignable_front_segments, brigade_front_assignment) form a triple-identity that needs reconciliation. Canon and code reference them in overlapping ways.
- AoR phase-out (2026-02-23) removed AoR from GameState and pipeline; Phase II is OSID/ZoC-only. Reconciliation plan (docs/30_planning/AOR_PHASEOUT_OSID_ZOC_RECONCILIATION.md) covers migration path and transitional state.
- **Ownership:** Technical Architect owns the reconciliation plan; PM to sequence remaining work (front segment integration, pipeline step cleanup, adapter unification).

### OSID deferreds closed (2026-02-22)

- **OSID front edges snapshot** — Keep canonical `front_edges` for existing consumers and persist additive `phase_ii_front_edges_osid` for HoI/OSID rendering paths; adapters expose `frontEdgesOsid` and `map_hoi` prefers it.
- **OSID attack snap events** — `attack_resolution_osid` now emits structured snap events and per-type counts for downstream UI/reporting (`last_stand`, `surrender_cascade`, `commander_casualty`, `ammo_crisis`, `pyrrhic_victory`).
- **OSID terrain scalar policy** — Defender terrain multiplier is precomputed per OSID deterministically using max composite over constituent SIDs (defense-favoring, stable order).
- **Spawn pass-through completion** — Browser and CLI spawn flows now pass `canonicalToOperational` so emergent brigades get `location_osid` where mapping exists.
- **HoI interaction polish** — `M` key centers player-capital heuristic, double-click settlement zooms tactical-in, and map gets subtle tactile overlay.

### Phase M mechanics decisions (2026-03-01)

- **Morale vs cohesion separation** — Morale is a separate field from cohesion. Morale drifts toward census-based population affinity (ethnic composition of municipality). Cohesion represents unit training/experience. Both affect combat but through different channels. Morale gates retreat resistance; cohesion affects combat power.
- **ZoC as attack-resolution modifier (not passive)** — ZoC defense is implemented as "virtual defense" within attack resolution, not as a passive terrain modifier. When an unoccupied OSID is attacked, a linked friendly brigade in an adjacent OSID provides virtual defense. The defender stays at their own OSID; if they lose, the target flips but the defender doesn't retreat (they were never "there"). This avoids the complexity of passive zone-of-control mechanics.
- **Census-driven population affinity** — Morale drift uses 1991 census data (`population_share.ts`) to compute ethnic majority per municipality. Brigade morale drifts toward the ethnic affinity of their location. This creates emergent behavior: units in friendly-majority territory maintain morale; units in hostile-majority territory lose morale over time.
- **Per-municipality displacement routing** — Static lookup tables (47 sub-regions × 3 ethnicities) in `displacement_routing_data.ts`. Runtime validation (is destination friendly-controlled?) happens in `displacement_takeover.ts` routing loop. This separates data from logic cleanly. Don't add `state` parameter to route lookup function.
- **Enclave morale initial value** — Set at 70. With Phase A per-faction retreat resistance (RBiH floor=55, RS=70, HRHB=65), RBiH enclaves at morale 70 are well above their resist floor and hold strongly. n268 originally revealed morale 70 = flat resist floor made enclaves too strong. The per-faction system partially addresses this by making the floor faction-dependent rather than universal.
- **Rear-area cleanup as corps directive** — Implemented as a corps-level directive that targets own-controlled OSIDs with enemy formations behind the front line. All factions historically secured their rear before pushing forward. Runs throughout the war (no time gate). Rear pockets (all neighbors faction-controlled) are targeted even without an adjacent brigade so reserves move toward them.
- **Breakthrough retreat deferred** — M5 was evaluated and deferred. The HVO Orasje pocket issue is an OOB gap (0 brigades assigned to `hvo_northwest_bosnia`), not a retreat mechanic issue. Breakthrough retreat adds schema complexity (isolation_turns tracking) and BFS pathfinding for a mechanic that primarily helps edge cases.

### Systematic OSID override calibration strategy (2026-03-05, n65 ATH 99.2%)

**Ledger ref:** [2026-03-05] Calibration ATH n65

#### The core insight: pre-positioning replaces bot dynamics tuning

When sector offensive planning locks brigades in march order for 20+ turns, organic attack counts become unreliable calibration levers. The correct solution is to pre-position VRS territory via `osid_control_overrides` so that brigades start *at* the front rather than marching to it. This shifts calibration from "tune bot parameters" to "pre-solve initial state".

#### Systematic override methodology

1. **Extract sim initial state**: Read `runs/.../initial_save.json`, collect all OSIDs where `political_controllers[osid] === "RS"`.
2. **Extract reference initial state**: Do the same for a baseline run (n48) known to have correct starting territory (RS=364).
3. **Compute set difference**: Cells in reference but not in sim = missed RS overrides. ALL of these in the n48→n59 diff were painted RS in `painted_control_jan1993.json`.
4. **Add all as overrides**: Add the full diff set as `osid_control_overrides = "RS"`. This restores correct starting territory in a single batch.
5. **Run calibration**: Identify remaining mismatches. Classify each as: bot fixable, consolidation permanent, or override fixable.
6. **Iterate**: Each run reveals ≤8 residual mismatches. 5 iterations (n61→n65) converged to engine ceiling.

#### Consolidation ceiling — do not chase

`applyConsolidationFlips` auto-flips OSIDs surrounded by same-faction neighbors, regardless of `avoided_osids` or `osid_control_overrides`. These produce *permanent* mismatches. In n65: 4 HRHB consolidation + 1 RS consolidation in Pale + 1 RBiH bot recapture + 1 Donji Vakuf area = 7 permanent mismatches. **Do not add overrides to fix them** — consolidation will undo them immediately, wasting override slots and potentially disrupting other bot behavior.

#### Pool exhaustion rate: 25% not 100%

`applyCasualtyPoolExhaustion` and `applyFrontlineAttrition` feed permanent losses back into `pool.exhausted`. At 100% rate, frontline municipality pools become exhausted within 10-15 turns → bot targeting breaks (no recruitable population). **25% rate** preserves demographic gating while preventing over-exhaustion. Files: `frontline_attrition.ts`, `pool_population.ts`.

#### Override direction law (calibration-critical)

| Override type | When to use | Effect |
|---|---|---|
| `osid_control_overrides[osid] = "RS"` | Painted=RS, sim=RBiH (RS under-capture) | Forces RS control at init |
| `avoided_osids` for RS | Painted=RBiH/HRHB, sim=RS (RS over-capture) | Prevents VRS from attacking there |

Confusing the two directions causes −0.7pp regression. Adding RS under-captures to `avoided_osids` prevents VRS from attacking them at all, guaranteeing they stay RBiH.

#### Force allocation fragility

Each new override block can redirect bot force allocation in non-obvious ways. Example: Kalesija overrides (n466) redirected VRS pressure → bonus Kupres fix. Adding Kladanj overrides on top disrupted that allocation → Kupres reverted. **Test each override block in isolation**; never stack two new groups without verifying final-state dynamics.

#### n65 final result

- **99.2% area-weighted** (737/744 = 99.1% count) — ATH as of 2026-03-05
- 171 overrides: 144 RS, 18 RBiH, 5 HRHB
- 22 organic attacks (RS=9, RBiH=13), 17 active weeks
- All 6 bot benchmarks PASS
- 7 permanent mismatches (engine ceiling — consolidation/recapture)
- RS sim=412 vs painted=411, RBiH sim=241, HRHB sim=91

#### Combat-causality acceptance gate

- **Combat-causality gate (2026-03-05):** The n77/n78/n79 zero-battle investigation showed that branch-level territory deltas can improve without functioning combat, via demographic drift, consolidation, or init effects. From this date forward, no combat-calibration claim is valid unless the run shows non-zero attack orders, non-zero battles in `weekly_report.jsonl`, and a short attribution split between combat flips and non-combat flips. Use `docs/40_reports/CALIBRATION_MASTER.md` as the single source of truth and update it during the session, not after. See ledger entry `[2026-03-05] Calibration governance: combat-causality debug brief + master calibration gate` and report `docs/40_reports/convenes/20260305_CALIBRATION_P0_COMBAT_CAUSALITY_DEBUG_BRIEF.md`.

#### Opening-operation placement discipline

- **Real startup path is `player_choice` recruitment (2026-03-05):** A brigade-placement fix in `src/scenario/oob_early_war_entry.ts` is insufficient for April 1992 scenario runs. The actual scenario startup flows through `src/sim/recruitment_engine.ts`, so fixed-home placement tags and placement preservation must exist in both paths.
- **Brigade placement and political control are separate levers (2026-03-05):** It is valid to move brigade `home_osid` and redesign pre-planned operation rosters/sectors/staging, but do not change starting controller from `RBiH` to `RS` to make an opening attack possible. If a selected `home_osid` is enemy-held at init, the brigade will be re-homed; choose friendly-held launch OSIDs instead.
- **Interpret partial recovery correctly (2026-03-05):** `n104` restored actual RS combat (`53` attack orders, `53` battles) but still recorded `24` execution-phase invalid operations. That outcome means "combat loop partly restored, named-operation emission still broken", not "calibration improving".
- **Operation ownership beats corps logic (2026-03-05):** Once a brigade is assigned to a live named operation, the operation owns its behavior until the operation object is cleared. Corps-level controls such as `home_defense_active`, reserve assignment, and generic target selection must not short-circuit operation planning/execution/recovery.
- **Proof scenario before full calibration (2026-03-06):** Use `data/scenarios/apr1992_vrs_operation_proof_4w.json` and `tests/scenario_vrs_operation_proof.test.ts` as the deterministic opening-op proof lane. It proves that at least one VRS opening operation can emit attack orders, resolve battles, and advance objectives before spending 40-week runs on wider cadence debugging.
- **Zero eligible attackers is its own failure boundary (2026-03-06):** Distinguish `execution_without_attack_orders` from `execution_without_eligible_attackers`. The first means an execution-phase op produced no attack/movement orders; the second means the current objective had no eligible direct attackers at all. Debug them differently.

### Strategic reserve and faction-differentiated mobilization (2026-03-06, n191)

**Ledger ref:** [2026-03-06] Strategic reserve system + faction-differentiated mobilization surge

#### Municipality-locked pool topology mismatch (root cause)

Municipality-locked militia pools create a structural mismatch: brigades draw from their home municipality pool at REINFORCEMENT_RATE (400/turn), but municipalities only generate ~5-50 people/turn from mobilization. Front-line municipalities run to zero in a few turns; rear municipalities accumulate 75k+ surplus (brigades at max 3,000 cap, pool growing each turn). Increasing mobilization surge factors only adds to rear surplus. The problem is topological — manpower is generated where it isn't needed and consumed where it can't be generated fast enough.

#### Strategic reserve solution

Faction-level manpower redistribution via `state.strategic_reserves`. Pipeline: `phase-ii-strategic-reserve-collection` (excess above 5,000 threshold flows to faction reserve) → `phase-ii-strategic-reserve-reinforcement` (under-strength brigades draw from reserve at reduced rate). Faction-specific draw rates reflect historical logistics capability: RS=0.25 (JNA inheritance), HRHB=0.25 (Croatian support), RBiH=0.02 (poor logistics until 1994 professionalization). Files: `src/sim/combat/strategic_reserve.ts`, `src/sim/turn_phases/war_phases.ts`.

#### Faction-differentiated mobilization surge

Global surge curve replaced with per-faction curves. VRS: lower initial rush (2.0× vs 2.5×), more sustained mid-war (1.1× vs 0.9×), reflecting JNA organized startup. ARBiH: higher initial rush (2.8×), faster burnout (0.45× at w79-104), reflecting desperate mass mobilization. HVO: moderate curve. File: `src/sim/combat/ongoing_mobilization.ts`.

#### Calibration result (n191)

Multi-checkpoint verification at both w40 (Dec 1992) and w80 (Jan 1994):
- RS: 102.6k (w40, target 90-100k) → 110.1k (w80, target 100-110k) — historically accurate plateau
- RBiH: 121.0k (w40, target 110-130k) → 175.4k (w80, target 140-160k) — within wider historical estimates
- HRHB: 41.5k (w40, target 40-45k) → 49.8k (w80, target 45-50k) — near peak
- Strategic reserves at w80: RS=0 (fully consumed), HRHB=0 (fully consumed), RBiH=70,262 (large surplus but low draw rate limits distribution)

#### Design principle

The strategic reserve solves the topology mismatch without artificial caps or scripted behavior. Combined with faction-differentiated surge, this produces historically accurate growth trajectories across multiple time checkpoints from purely organic mechanics. The system is deterministic (sorted pool keys, sorted formation ids, strictCompare throughout).

---

## Cross-references

- **Full changelog:** `docs/PROJECT_LEDGER.md` (append-only).
- **Tagging index:** `docs/PROJECT_LEDGER_TAGGING_INDEX.md`.
- **Reorganization plan:** `docs/PROJECT_LEDGER_REORGANIZATION_PLAN.md`.
- **Implementation guide:** `docs/PROJECT_LEDGER_IMPLEMENTATION_GUIDE.md`.
- **Napkin:** `.agent/napkin.md` (corrections, patterns, domain notes).
## 2026-03-05 - Engine audit knowledge

- `sector_intel` is the live engine-side intelligence model, but the tactical-map fog overlay still depends on legacy `recon_intelligence`. Live saves can contain `sector_intel` with no `recon_intelligence` at all. Do not claim that FoW is fully wired end-to-end until the UI consumes the same intelligence source the sim derives.
- Corps can plan operations on their own, but generic named-op planning is currently load-bearingly ambiguous because sector-op launch later in the same corps-AI pass may replace a fresh non-sector active operation. Treat corps operation ownership as split until one path is canonical.
- Engine/UI ownership mismatch: operation participants are exempt from `home_defense_active` in `bot_brigade_ai_osid.ts`, but the formation detail panel still disables offensive posture buttons purely on `home_defense_active`. Do not assume the tactical UI currently reflects operation ownership rules.

## 2026-03-08 - N304 combat mechanics root causes — fatigue, equipment, attrition

Three critical bugs discovered and fixed, each with systemic lessons:

### Fatigue reset bug (formation_fatigue.ts)
- `FRONTLINE_FATIGUE_PER_TURN = 1.5` (fractional) was silently reset to 0 every turn by `Number.isInteger(1.5) === false` check in `updateFormationFatigue`. The check was meant to sanitize garbage values but blocked all fractional fatigue accumulation.
- **Lesson:** Guard clauses that use `Number.isInteger()` are dangerous for any float-valued field. Use `typeof !== 'number' || isNaN()` instead. This pattern may exist elsewhere in the codebase.
- **Impact:** 189 front-assigned brigades never tired. RS could sustain indefinite offensives with no combat power degradation. Fixing this alone improved ATH from 87% to ~93% because RS offensives naturally exhaust.

### Equipment losses missing from OSID attack path (attack_resolution_osid.ts)
- The primary battle resolution system (`resolveAttackOrdersOsid`) had **zero equipment loss logic**. Only the legacy SID path (`resolveBattleOrders`) in `battle_resolution.ts` had equipment loss code — but that path has `defenderFormation = undefined` and `defenderBrigadeId = undefined` hardcoded (AoR removal leftover), meaning ALL its battles were "undefended" and equipment losses were always 0.
- **Lesson:** When two parallel resolution paths exist (OSID vs legacy SID), features added to one may never reach the other. The OSID path is the live path; the legacy SID path is effectively dead code for combat. Equipment features must live in the OSID path.
- **Impact:** RS lost 165 tanks + 230 artillery in 40 weeks after fix. Equipment attrition reduces RS heavy firepower over time — matching VRS doctrinal arc (starts professional, degrades from attrition).

### Frontline attrition rate (frontline_attrition.ts)
- `BASE_ATTRITION_RATE` was reduced from 0.005 to 0.003 at n159 for RS/HRHB KIA running too high. With fatigue now working and equipment degrading RS firepower, the lower rate produced too few total casualties (97k vs historical ~120-130k for the first year). Restored to 0.005.
- **Lesson:** Attrition rate calibration depends on other systems working correctly. When fatigue was broken, 0.003 seemed right. With fatigue working, 0.005 is needed because RS offensives are naturally limited and produce fewer battle casualties.

### Emergent behavior: doctrinal arcs without hard caps
- With fatigue + equipment working, RS territorial acquisition naturally slows and stops by ~w30 without any hardcoded phase switch or RS stance change. This matches the design intent: "Arcs must emerge ORGANICALLY — NOT from hard caps or phase switches." ATH improved from 87% to 93.8% purely from fixing these mechanical bugs.
- RS delta went from -23 (RS under-acquiring by 23 OSIDs) to +1 (nearly perfect). The over-acquisition was actually caused by RS having infinite stamina (no fatigue) and infinite firepower (no equipment attrition).

### Legacy SID path status
- `resolveBattleOrders()` in `battle_resolution.ts` lines 930-933: `defenderBrigadeId = undefined`, `defenderFormation = undefined`. This was an intentional stub after AoR removal ("legacy SID path: militia-only, no brigade_aor lookup"). It still runs in the pipeline (line 856 of war_phases.ts) alongside the OSID path but produces only trivial casualties (2 wounded per battle, no equipment).
- **Decision:** Leave legacy SID path as-is; all real combat goes through OSID path. Legacy path exists for backward compat with SID-keyed scenarios.

## 2026-03-09 - Power-ratio casualty scaling + home defense vs operations conflict

### Power-ratio casualty scaling (combat_math.ts)
- `getPowerRatioCasualtyMult(powerRatio)` returns `[attackerMult, defenderMult]`. Cube-root scaling: `Math.pow(clampedRatio, POWER_RATIO_CASUALTY_EXPONENT)`. Constants: `POWER_RATIO_CASUALTY_EXPONENT=0.33`, `POWER_RATIO_CASUALTY_MAX=2.0`, `POWER_RATIO_CASUALTY_MIN=0.4`.
- **Defender-only application.** Applying to both sides double-counts the power advantage (outcome modifiers already capture the attacker's penalty via `OUTCOME_ATTACKER_MOD`). Defender-only adds within-band differentiation: 3:1 power ratio → defender takes 1.44x; 0.5:1 → defender takes 0.79x.
- **Lesson:** Linear (1.0) exponent far too aggressive. Square-root (0.5) still caused noticeable regression. Cube-root (0.33) provides meaningful differentiation within outcome bands without destabilizing the overall casualty model.

### Home defense vs operations conflict (compute_home_defense.ts)
- `isOperationParticipant(state, corpsId, brigadeId)` checks if brigade is on any axis of the corps' active operation during execution phase.
- **Root cause:** `canAdoptPosture()` in `brigade_posture.ts` silently returns false for brigades with `home_defense_active === true`, blocking attack/assault posture. No log, no warning — just a quiet no-op. Operations that assign brigades to attack from their home municipality silently fail.
- **Lesson:** Silent posture rejection is dangerous. The exemption mechanism (execution-phase only — planning/staging brigades still defend home) is essential, but the underlying silent rejection pattern should be addressed with diagnostic logging.
- **Impact:** This was the single root cause of Operation Teocak failure. Kalesija-based brigades (241st, 242nd, 245th) could not attack Rastosnica despite being ordered by corps.

## 2026-03-06 - Combat-causality recovery knowledge

- `n126` is the current April 1992 40w recovery milestone. It passed the live combat-causality gate with `91` attack orders, `81` battles, and `invalid_operation_count = 0`. Use it as the current evidence point for "combat restored," not as proof that all repo integration issues are solved.
- Live control-change attribution is now the canonical reporting path. Use `control_change_attribution` from `weekly_report.jsonl` and `run_summary.json` when discussing why territory changed.
- `control_events.jsonl` was a leftover Phase I / flip-era harness artifact. It is no longer a valid live-contract artifact for war-phase scenario reasoning.
- If a scenario/debug test still depends on `control_events.jsonl`, treat that as stale test debt rather than as evidence that flips remain a core live mechanic.
- `pre_planned_operations.ts` is load-bearing for opening-op recovery and easy to break with merges. Two concrete guards:
  - no merge markers may remain in that file
  - brigade corps membership must be resolved with `getFormationCorpsId(...)`, not `formation.corps_id`

## 2026-03-06 - Runtime sector rearrangement knowledge

- `sector_rearrangement.ts` is live in the corps AI runtime (wired into `generateCorpsDirectives()`).
- **Previous regression (n135)** from wiring into `generateAllCorpsOrders()` was caused by the `codex/combat-causality-hardening` merge, not rearrangement itself. Confirmed by bypass test n132 + pre-merge rollback n134.
- Thin consolidation: any 0-brigade sector merged into adjacent neighbor (no edge-count limit). MAX_SECTOR_EDGES cap prevents mega-sectors. `unmergeable` tracking (break→continue fix) ensures all eligible sectors are tried.
- Pocket containment: enemy OSIDs fully surrounded by corps territory → dedicated containment sectors.
- Architect rule: sector rearrangement now passes the combat-causality gate (n142 green). Any future topology changes still need scenario-level acceptance.

## 2026-03-06 - Sector fix: all 15 corps get front sectors

- **5 corps had zero front sectors**: vrs_2nd_krajina, vrs_east_bosnian, vrs_herzegovina, hvo_southeast_herzegovina, hvo_northwest_bosnia.
- **Root cause 1: BFS seeding** — `friendlyOsids` built only from edge-graph adjacency keys, excluding deep-interior OSIDs. Fix: include all `political_controllers` entries for the faction.
- **Root cause 2: consolidateCrossCorpsFronts** — over-stripped minority corps edges with no protection. Fix: `protectedCorps` set prevents any corps from losing ALL its edges.
- **Root cause 3: OOB tag mismatches** — 15 brigade tags used legacy corps IDs (e.g. `rs_drina_corps` instead of `vrs_drina`). Fixed in `oob_brigades.json`.
- **Root cause 4: HVO SE Herzegovina HQ** — was at Mostar (RBiH-controlled). Moved to Čitluk.
- **Design decision: Corps HQs are abstractions** — not physical map entities. BFS seeding uses `political_controllers`, not HQ OSID positions. HQ locations exist for GUI display only.
- **Result (n142):** All 15 corps have sectors. 25 misassigned brigades (was 50). 0 empty non-pocket sectors. Area-weighted 81.5% (expected regression from corrected corps assignments).
- **OOB tag canonical mapping** (for reference):
  - `rs_sarajevo_romanija_corps` → `vrs_sarajevo_romanija`
  - `rs_drina_corps` → `vrs_drina`
  - `rs_herzegovina_corps` → `vrs_herzegovina`
  - `hvo_oz_nw_herzegovina` → `hvo_tomislavgrad`
  - `hvo_oz_se_herzegovina` → `hvo_southeast_herzegovina`
  - `hvo_oz_posavina` → `hvo_northwest_bosnia`
  - `hvo_oz_central_bosnia` → `hvo_central_bosnia`
  - `hvo_oz_nw_bosnia` → `hvo_northwest_bosnia`

## 2026-03-07 - N200 UI operations surfacing

- Operation-readiness UI now derives from existing state rather than bespoke API: supply uses `active_operation.supply_readiness`, cohesion uses average participating brigade cohesion, and intel uses max `sector_intel` confidence for the operation's `sector_id`.
- The new operations map mode is intentionally deterministic and lightweight: effort is computed from sector assigned-vs-reserve brigade share plus a small tempo modifier. It is a visualization layer, not a simulation input.
- Current operation health percentage in the adapter is a proxy (`personnel / 2500` per brigade). If engine later exposes brigade peak strength, migrate the UI to that explicit field rather than tuning the proxy in place.

## 2026-03-07 - N201 sector intent + operation execution wiring

- `sector_stance_orders` is now the canonical sector-level defensive intent surface. It does not mutate brigades directly; instead `applySectorStanceOrders()` translates sector intent into standard `brigade_posture_orders` after the normal posture-order phase, preserving existing posture constraints and determinism.
- Operation-level player levers now belong on `CorpsOperation`, not ad hoc UI state: `min_attack_outcome`, `tempo`, `schwerpunkt_osid`, `artillery_preparation`, and `force_launch` are all persisted and consumed by the combat/lifecycle code.
- `composite_ivp` should be treated as the UI-facing summary gauge for international pressure. It is derived from the existing Sarajevo/enclave/atrocity/negotiation components rather than standing up a second IVP system.

## 2026-03-07 - N202 supply-agency + OPSEC follow-on

- `airdrop_allocation` is now a legitimate staged state surface. Even with faction-level reserve accounting still global, the allocation record is now deterministic, persisted, and visible to the UI, which unblocks later enclave-specific consequence work.
- OPSEC is modeled as a sector-level confidence modifier, not a hidden attack buff. It halves passive enemy intel buildup against marked sectors and automatically drops once the sector's operation goes hot.
- The latest 40w regression (`n242`) is a split verdict: benchmark-fit passed 6/6, but combat-causality validity regressed because multiple operations entered execution without eligible attackers. Future work on H/C should preserve the fit improvement while restoring causality validity.

## 2026-03-07 - N245 Phase C live mechanics are stateful, but calibration-neutrality is not yet proven

- The Phase C schema stubs are now live mechanics: `ivp_consequences_active`, `pending_convoy_decisions`, `smuggling_allocation`, and `sarajevo_tunnel_operational` are no longer just serialized fields.
- Convoys are deterministic and corridor-owned. If the route faction is the player, undecided convoy entries persist in state until the player stages `allow` / `block` / `divert` through desktop IPC; bots auto-resolve by IVP pressure band.
- IVP consequences use hysteresis (`30/60/80`, off at `20/50/70`) to avoid threshold flapping. RS patron/material support now reads those active consequences directly.
- The Sarajevo tunnel currently enters the model as a pressure/supply relief event, not a full enclave-local supply-network rewrite. If later calibration needs stronger Sarajevo-specific logistics effects, extend from this hook rather than inventing a second tunnel subsystem.
- `n245` preserved 6/6 benchmark checks but changed the final hash and left combat-causality invalid at the same 6-operation boundary. Treat Phase C as functional progress with unresolved calibration acceptance, not a finished acceptance gate.

## 2026-03-07 - N248 H gate closed at engine level; remaining drift is anchor calibration

- `repairScenarioArtifactState(...)` belongs at the scenario-harness boundary, not inside the war turn pipeline. The pipeline already displaces formations after combat; the harness also mutates state afterward (artifact-oriented control mutations), so it needs its own final invariant repair before serialization.
- Idle execution operations with zero movement, zero attack orders, and zero eligible attackers are not useful combat samples. Converting that first fully idle execution turn directly into `recovery` with `no_logged_attempt` preserves causality validity better than leaving the operation in an empty execution shell.
- The H-phase 40w gate is now clean on combat integrity terms: run `n248` restored `invalid_operation_count = 0` and kept benchmark-fit at `6/6`.
- The remaining misses after `n248` are territorial calibration anchors, not simulation-health failures:
  - municipality `srebrenica` still trends too RS-strong by week 40
  - OSID `op:brcko:brka_2` still flips/stays RS instead of the expected RBiH hold
- Those two anchor misses align with the existing napkin warning that Srebrenica/Brčko drift is primarily a pre-planned-operation / scenario-anchor problem rather than a generic H-mechanics defect.

## 2026-03-06 - N159 deep engine audit: organic VRS tempo decay

- **Core design decision:** VRS tempo decay must emerge organically — not from hardcoded stance transitions. RS stays offensive permanently; slowdown comes from fatigue, supply consumption, entrenchment wall, and ARBiH resistance.
- **Fatigue as combat power modifier:** `getFatigueMult()` in `combat_math.ts`. Fatigued units fight worse: attack floor 0.6×, defense floor 0.75×. This is the cleanest organic slowdown — simpler than overstretch calculations, naturally penalizes continuous fighting.
- **FATIGUE_MAX consolidation:** Was duplicated across 3 files (combat_math.ts as FATIGUE_CAP, formation_fatigue.ts, attack_resolution_osid.ts). Consolidated to single shared constant in `formation_constants.ts` = 30 (was 20).
- **Fatigue accumulation rebalanced:** Recovery every 2 turns (was every turn). +0.5/turn for frontline-assigned formations. Combined with combat fatigue (+2 att / +1 def per battle), this creates genuine fatigue pressure.
- **Entrenchment diminishing returns:** sqrt-based curve replaces linear. At 1 turn: 0.07 bonus (doubled from linear). At 6 turns: 0.171 (reduced from 0.21). First turns of digging matter most — rewards ARBiH early defenders.
- **RS doctrine phases:** Reduced from 3 to 2 (both offensive). RS_EARLY_WAR_END_WEEK=20 still marks reduced aggression (0.15→0.05) and max_attack_share (0.28→0.22). No artificial defensive regression.
- **Supply drain critical finding:** UN airdrops at 15 pts/turn were silently dominating RBiH supply, masking the entire maintenance drain system. Reduced to 3/turn. Single constants can mask entire systems — always audit income vs drain arithmetic.
- **Patron commitment historical basis:** RBiH 0.3 in 1992 (arms embargo), growing to 0.6 post-1994. RS 0.8 (JNA backing), declining to 0.55. HRHB 0.6 (Croatian support), increasing to 0.7. Initial material_support_level: RS 0.75, HRHB 0.65, RBiH 0.3.
- **HRHB supply fragility:** 59 siege counters from central Bosnia pockets drain faction reserves. Need higher initial supply (75) + patron commitment to stay strained (19.3%), not collapsed (0%).
- **Displacement kill fraction issue (deferred):** 4% DISPLACEMENT_KILLED_FRACTION uniform for all contexts. RS civilian departure from RBiH/HRHB was mostly voluntary flight (~1% lethality). Sim produces 10,860 RS civ killed vs ~4k historical. Fix: per-context kill fractions in `displacement_loss_constants.ts`.
- **Calibration result:** n166 = 84.2% area-weighted (up from 81.5%). 146 attacks, 118 battles, 103 captures. RS weekly attacks decline 8→1 (organic tempo confirmed). All VRS corps still offensive at t26.
## 2026-03-07 - Player-agency docs synchronized after A-H closure

- The player-agency implementation plan is now documented as complete for Phases A/B/C/F/G/H, with Phase E still intentionally deferred by the plan itself.
- Canon and engineering docs should reference the live state surfaces, not the older plan sketches: `sector_stance_orders`, `opsec_sectors`, operation shaping levers, `airdrop_allocation`, `pending_convoy_decisions`, `smuggling_allocation`, `sarajevo_tunnel_operational`, and `composite_ivp`.
- The authoritative closure evidence for this documentation state is the `n248`/`n249` lane: combat-calibration valid, `invalid_operation_count = 0`, benchmark suite `6/6`, and only anchor-level drift remaining.

## 2026-03-07 - Paramilitary rear pocket cleanup subsystem

- **Design choice:** New `'paramilitary'` FormationKind rather than tag or equipment class. Clean lifecycle separation from brigades — no reinforcement, no bot AI, no formation spawn interaction.
- **Pocket detection:** Graph analysis via `analyzeFactionGraph()` finds enemy OSIDs where ALL neighbors are faction-controlled. Deterministic hash (char code sum + turn mixing) for spawn probability — no randomness.
- **Faction differentiation reflects historical organizational penetration:** RS=0.85 (Arkan's Tigers, White Eagles, SDS/JNA networks), HRHB=0.55 (HOS, Croatian volunteers), RBiH=0.30 (Patriotska Liga, Green Berets — largely integrated early).
- **Casualty model consistent with combat system:** Standard KIA=0.30, WIA=0.55, MIA=0.15 split via `recordBattleCasualties()`. Civilian casualties (2% of avg OSID population) recorded as war crimes against losing faction.
- **Player agency via standing policy:** `paramilitary_policy` ('ask'/'always_allow'/'always_deny') avoids per-turn micro-management. `paramilitary_deployment_count` per faction enables future consequence scaling (IVP, legitimacy, patron disapproval).
- **Fade mechanic:** PARAMILITARY_FADE_WEEK=20 hard cutoff. Defense-in-depth: checked in both pipeline step and function body. War professionalizes — paramilitaries absorbed or disbanded historically.
- **Defended pocket handling:** 3x casualty rate (24% of unit), dissolve without capturing. Paramilitary forces are not equipped to take defended positions.
- **Pipeline placement:** After `partition-corps-front-sectors` so pocket detection has accurate territory data. Before `process-brigade-movement` so captures are visible to subsequent steps.
- **Key lesson:** The original design convene recommended tag/class over new FormationKind. In practice, a separate kind proved cleaner because it allows exclusion from all formation lifecycle systems (reinforcement, bot AI, spawn) without adding conditional checks everywhere — the kind filter naturally excludes them.

### 2026-03-08 update: cluster detection + instant capture + civilian cas fix

- **Cluster pocket detection (BFS):** Upgraded from single-OSID to clusters of 1-3 connected same-controller enemy OSIDs where ALL external neighbors are faction-controlled. BFS expansion through same-controller enemies, capped at MAX_POCKET_CLUSTER=3. Fixes multi-OSID pockets like Banja Luka dragocaj+potkozarje_3.
- **`op:` prefix filtering:** `operational_contact_graph.json` has 315 canonical SID nodes (`S:`-prefixed) with no `political_controllers` entry. Must filter to `op:` nodes in BFS expansion and external neighbor checks — otherwise `allSurrounded` is always false.
- **Interior scanning:** Pockets deep in rear territory aren't adjacent to any front OSID. Must scan ALL controlled OSIDs, not just `front_osids`.
- **Instant capture (MARCH_TURNS=0):** Bot brigade AI opportunistically grabs undefended adjacent targets before paramilitaries can march (at MARCH_TURNS=2). Fix: instant capture since pockets are already surrounded. Bot corps AI also excludes active paramilitary targets from opportunistic targeting.
- **Civilian casualty initialization:** `state.civilian_casualties` was optional and not always present. Paramilitary code silently dropped civilian casualties. Fix: `??=` operator to initialize the object.
- **Rear pocket consolidation re-added:** Cluster-aware `rear_pocket_consolidation.ts` for post-week-20 auto-flip. Paramilitaries handle w0-20; rear pocket consolidation handles w20+. Original `consolidation_flips.ts` remains deleted.

## 2026-03-07 - N290 Sector-only operations: three structural fixes

- **Root cause:** Bot corps AI had two operation creation paths. The old `generateCorpsOperationOrders` (catalog-based) picked 5 brigades from the entire corps pool using hardcoded municipality templates — no sector awareness. The sector offensive path in `generateCorpsDirectives` was sector-aware but had a rear-area brigade dump: when a sector cluster had <3 front-line brigades, it pulled ALL remaining corps subordinates into the operation. For 1KK (36 brigades), this created 31-brigade ops for 3 objectives.
- **Fix 1 — Rear-area dump removed:** Only sector-assigned brigades participate in operations. If a sector lacks brigades, no launch — corps density balancing should reinforce the sector first through normal redistribution.
- **Fix 2 — MAX_PARTICIPATING_BRIGADES=12:** Hard cap in `sector_offensive.ts` prevents bloated sector offensives even with large sectors. Pre-planned ops and triggered ops are exempt (they have explicit rosters).
- **Fix 3 — Catalog ops disabled:** `generateCorpsOperationOrders` removed from the pipeline (step 3 in `generateAllCorpsOrders`). Sector offensive path in step 6 now handles all auto-generated operations.
- **Key lesson: Operations must be sector-sourced.** Pulling brigades from the entire corps pool creates bloated ops that disrupt force balance across the front. The 31-brigade operation left most of 1KK's front undefended while concentrating on 3 objectives. Sector-constrained ops naturally limit participation to what's locally available.
- **JNA ghost phantom for Kupres:** `capture_osids` on PhantomDef flips political control at spawn. `no_equipment_handoff` dissolves without distributing equipment to corps. Used for `jna_9th_corps_tg` → captures goravci + kupres_2 at turn 0, dissolves at turn 4. No 2KK pre-planned op (−6.7pp regression from any approach involving 2KK brigades).
- **Reverted post_op_stance/stance_cap:** Mechanism added to prevent bot AI from overriding post-operation stance was unnecessary once 2KK pre-planned op was removed. Clean removal from CorpsOperation, CorpsCommandState, sector_offensive, bot_corps_ai, pre_planned_operations.
- **Calibration result:** n290 = 88.1% area-weighted (+0.4pp over n278 baseline). KRAJINA 96.9% (was 90.1%). RS count delta −23 (was −68).

## 2026-03-07 - Phase E municipality support is asymmetric and intentionally local

- The safe Phase E shape is one shared municipality-support surface with faction-specific fiction and effects: `RBiH` gets `weapons_shipment`, `RS` gets `staff_priority`, `HRHB` gets `croatian_support_package`.
- Keep Phase E pool-constrained and one-turn scoped. It should redirect scarce help locally, not rewrite total mobilization ceilings or global manpower curves.
- In unattended scenario runs, Phase E is effectively dormant unless a player stages orders. Do not attribute headless regression drift to the mechanic unless support orders were actually present in state.

## 2026-03-07 - Officer display: character-rich profiles via shared OfficerProfile component

- **Never show raw officer stat numbers** (1-5 integers or `Math.round(x * 100)`). All officer displays use `OfficerProfile` component.
- **OfficerProfile** (`src/ui/map/components/OfficerProfile.tsx`): shared card showing archetype, origin badge, pip ratings (●●●○○), descriptive stat labels, combat record, tenure. Props: officer, label, compact?, emphasis?, className?.
- **officerCharacter.ts** (`src/ui/map/utils/officerCharacter.ts`): pure utility functions. `getArchetype()` derives 15 archetypes from stat profile (Master Strategist, Reckless Attacker, Paper Commander, etc.). Stat labels: Inept→Exceptional, Passive→Relentless, Exposed→Ironclad. `formatPips()`, `getRatingColor()`, `getOriginDisplay()` (origin→{label,color}), `formatRank()`, `formatCombatRecord()`, `formatTenure()`.
- **NamedOfficerView** extended with `origin` (string, from OfficerOrigin) and `political_reliability` (number, 1-5). Mapped in `GameStateAdapter`.
- **6 consumers** use OfficerProfile: CorpsDetail, OperationDetail, FormationDetail (compact), OrbatPanel, OperationsPanel, ArmyDetail. OOBSidebar uses `formatRank` for abbreviated sidebar display.
- **Design rule:** `compact` mode shows competence + one emphasis stat; full mode shows all 3. `emphasis` prop only matters when `compact=true` — do not pass it without compact (dead parameter).

## 2026-03-08 - N345 Cold-front attrition fix and cascade calibration

- **Graz Accords cold fronts**: RS↔HRHB front segments under active Graz Accords must be "cold" — no passive frontline attrition, no bombardment exposure. Before n345, 31 HRHB brigades on RS fronts took full attrition (0.5%/turn × supply/density/bombardment modifiers), causing 6.3k KIA by w40 (nearly the full-war total of 8k). `isColdFront()` in `frontline_attrition.ts` detects cold fronts via corps pair membership (`isCorpsInGrazPair`) and Kiseljak exclusion zone OSIDs.
- **Siege drain under truce**: HRHB Central Bosnia pocket is classified "critical" by supply BFS (can only traverse own-faction territory — RS territory blocks BFS even under truce). 50+ siege counters drained HRHB supply from 75→0 by w30. Fix: skip HRHB in `updateSiegeTurnCounters()` while Graz active. The supply BFS topology is correct (HRHB pocket IS isolated from Herzegovina) — but the consequence (siege drain) should not apply when the surrounding faction is a truce partner.
- **Cascade effect**: Fixing HRHB phantom attrition required reducing HRHB pool scale (1.60→1.05) to prevent troop overshoot (50k vs 41.5k target). This cascaded to RBiH: healthier HRHB → changed territorial dynamics → 4.1k less RBiH mobilization + 1.5k more RBiH casualties → 114k vs 120k target. Compensated by raising RBiH pool scale 0.18→0.25. Key lesson: faction pool scale changes have cross-faction effects through changed war dynamics, not just direct pool mechanics.
- **Terminology**: "Graz Accords" is the historically correct name for the RS-HRHB non-aggression pact. Code state field remains `vienna_declaration_turn` for backwards compatibility.

## 2026-03-08 - N403 Corps sector system overhaul

- **Territory cap (`MAX_TERRITORY_OSIDS = 40`)**: Exported constant in `corps_front_sectors.ts`. Prevents mega-sectors from consuming excessive BFS depth in `assignTerritoryVoronoi`. Sectors stop expanding once they reach the cap.
- **Edge adjacency no longer bridges hostile territory**: `buildEdgeAdjacency` removed hostile-side bridging. `isSegmentAdjacent` now does BFS through friendly territory when `friendlyOsids` provided — segments must be reachable through own-faction OSIDs, not through enemy space.
- **`equalizeSectorDensity` (new)**: Redistributes brigades across sectors proportional to front edge count. Surplus sectors donate brigades to under-staffed neighbors. Runs after initial brigade assignment, before sector classification.
- **`ensureMinimumSectorCoverage` enhanced**: Surplus sector transfers added — sectors with brigade surplus donate to adjacent zero-brigade sectors. More robust than paper-only transfers.
- **Exempt corps (`EXEMPT_CORPS_IDS`)**: Corps like `hvo_central_bosnia` skip sector creation entirely. Isolated pocket formations where formal front sectors are not meaningful.
- **Ghost sector filtering**: Sectors with <=1 edge and 0 territory filtered as topology artifacts. 73 total sectors post-filter, 17 zero-brigade.
- **`getSectorFrontOsids()` helper**: Extracted for reusable front OSID collection from sector sub-segments. `mergeUndersizedSubSegments` accepts `friendlyOsids` param for BFS-aware merging.
- **Calibration result**: n403 = 86.9% area-weighted. Troop: RBiH=120.5k, RS=106.0k, HRHB=44.2k. Previous: n384=87.9%, n366=88.2%, n345=86.8%, n304=93.8% (ATH).
- **Key lesson**: Hostile-side adjacency bridging created phantom sector connectivity — sectors claiming edges far from their actual territory. BFS through friendly territory is the correct adjacency model for front sectors.

## 2026-03-10 - N524→N527 Enclave defense overhaul (Sarajevo holds)

- **Root cause**: Sarajevo fell at weeks 2-7 because RS attacks brought 5:1 personnel ratio plus massive equipment advantage. No defense multiplier can fix this — when 45k troops attack 9k defenders, even a 2× multiplier still leaves the attacker with overwhelming force. The fix required raw volume (garrison power), not bigger multipliers.
- **ALWAYS_BESIEGED_ENCLAVES**: Sarajevo supply reads "adequate" despite total siege (BFS finds friendly routes within the pocket). Fix: `ALWAYS_BESIEGED_ENCLAVES` set forces Sarajevo to always return 'strained' supply state, so resilience grows from turn 0 instead of decaying. Without this, `initial_resilience=20` was pointless — it decayed every turn under "adequate" supply.
- **Enclave garrison power**: New `getEnclaveGarrisonPower()` in `enclave_resilience.ts`. Formula: `population × ENCLAVE_GARRISON_MOBILIZATION(0.05) × GARRISON_EFFECTIVENESS(0.15) × resilienceMult`. Represents organized civilian defense: TDF, Patriotic League, police, neighborhood watch, armed volunteers — historically real in Sarajevo (10-15k armed civilians outside TO structure). Added to ALL defense computation paths (attack_resolution_osid.ts, combat_predictor.ts).
- **Urban defense enhancements**: (1) Urban defense multiplier 1.5→2.0 for Sarajevo OSIDs. (2) `URBAN_TANK_TERRAIN_FLOOR=1.7` — tanks in urban terrain penalized at mountain-equivalent level. Historical basis: Grozny 1994 (105 of 120 tanks destroyed in first assault), Mogadishu, Vukovar. Applied via `isUrbanOsid()` in `getHeavyWeaponsOffensiveMult()`.
- **Enclave resilience scaling**: Defense bonus per resilience point increased 0.005→0.02. At resilience 20: 1.40× (was 1.10×). At resilience 45: 1.90×. Per-enclave config with `max_resilience` and `growth_mult`.
- **Calibration result**: n524 = 87.7% area-weighted. 138 battles, 87.7% success rate. 6/6 benchmarks, 8/14 anchors. RS 52.2% territory. Sarajevo core holds (RS 5 / RBiH 4 suburb split). Goražde flips to RBiH majority (RS 9 / RBiH 11). Drina region 67.5%→78.0%. Sarajevo region 67.7%→80.6%.
- **Key lesson 1: Personnel ratio trumps multipliers.** When attackers outnumber defenders 5:1 in raw personnel, adding defense multipliers changes the outcome from "massacre" to "decisive defeat." Only raw volume (garrison power from civilian population) can counterbalance raw volume.
- **Key lesson 2: Enclave defense is multi-layered.** No single mechanism (resilience OR urban bonus OR tank penalty OR garrison power) is sufficient. The combination creates emergent fortress-like behavior: resilience grows under siege → garrison power increases → defense multiplier stacks with urban and entrenchment → attacking becomes prohibitively costly. This matches Sarajevo's historical reality.
- **Key lesson 3: Check timing before tuning constants.** If a constant change (0.005→0.02 scaling) has zero effect, check whether the system is active during the relevant period. Resilience at 0 during weeks 2-7 means any scaling factor × 0 = 0. The constant wasn't wrong — the timing was.

## 2026-03-10 - N556→N560 Dissolution fix + doctrine source-of-truth discovery

- **Dissolution absolute floor bypass**: `DISSOLUTION_ABSOLUTE_FLOOR=150` bypassed the 2-of-3 criteria check. All 12 destroyed brigades had high morale (37-93) and cohesion (56+) but auto-dissolved at <150 pers. Fix: absolute floor counts as "low personnel" criterion, still requiring 2-of-3 (3-of-3 for enclave). Destroyed: 12→1.
- **Timeline JSON overrides code doctrine**: `data/scenarios/timelines/apr1992.json` `doctrine_phases` is read by `getActiveDoctrinePhase()` via `timeline?.doctrine_phases?.[faction] ?? FACTION_DOCTRINE_PHASES[faction]`. Changes to `FACTION_DOCTRINE_PHASES` in `bot_strategy.ts` have ZERO EFFECT when a timeline is active. Two runs (n558, n559) produced identical results to n556 because only code was changed. Must edit the timeline JSON.
- **Defensive stance hard-gates operations**: `bot_corps_directives.ts` line 1001: `stance === 'offensive' || stance === 'balanced'` — corps in `defensive` stance CANNOT launch sector offensives. RBiH was `defensive` for all 40 weeks → zero attacks. Changed to `balanced` from w15 → 24 RBiH attacks.
- **RBiH attack outcomes**: 37.5% success (9/24), 33% catastrophic (8/24). Historically plausible for 1992 local counterattacks — mostly desperate, occasionally successful. Total KIA +1,234.
- **HRHB 0 attacks despite offensive stance**: Graz Accords blocks ALL valid HRHB→RS targets. Even with `offensive` doctrine w0-26, HRHB has zero targets that pass the Graz filter. Exception list (corridor municipalities) too narrow — needs Herzegovina ops (Op Jackal) and Mostar area added.
- **Key lesson: Rate tuning cascades unpredictably.** Reducing frontline attrition (0.005→0.003) or increasing combat rates (0.08→0.10) produced NET NEGATIVE results — more surviving brigades change battle dynamics. Revert and try structural changes instead.
- **Key lesson: Counting bugs in diagnostic scripts.** `b.outcome === 'decisive'` vs actual `'decisive_victory'` field made RS success appear as 5-10% when actual was 91%. Led to wasted tuning. Always verify field values with `Object.keys()` before writing extraction scripts.

## 2026-03-11 - Displacement ethnic tracking: two silent adapter bugs

- **Event log path error**: `GameStateAdapter.ts` read `state.displacement_event_log` (top-level, undefined) instead of `state.displacement.displacement_event_log`. Same pattern as the `state.military.*` path bug — wrong namespace silently returns undefined, entire downstream chain dead. **All** per-OSID and per-mun departure tracking was empty. "Fled from this settlement" showed "breakdown by nation not recorded" for every settlement. Current ethnic structure and ethnic map mode were frozen at pre-war census.
- **Ghost residents**: `departedByOsid` accumulated only `displaced`, not `killed + fled_abroad`. Killed/fled people still counted as living residents in ethnic computation. Kamičani example: 688 killed/fled Bosniaks → 48% Bosniak shown vs correct 0%. Fix: accumulate `displaced + killed + fledAbroad` as `totalRemoved`.
- **Key lesson: The adapter is a single chokepoint.** All settlement ethnic display, ethnic map mode, and "fled" breakdown flow through `departedByOsid` in GameStateAdapter. A single wrong path or missing accumulation field silently breaks everything downstream — no error, no warning, just stale data. When ethnic/displacement display looks wrong, check the adapter FIRST, not the displacement engine or UI components.
- **Key lesson: Test with known-displaced settlements.** Use Kamičani (Prijedor), Kozarac, or Srebrenica as smoke tests — RS-controlled with near-100% Bosniak pre-war population. If ethnic structure doesn't show ~0% Bosniak after displacement, the pipeline is broken.

## 2026-03-11 - Connected component reachability for brigade assignment (n597→n598)

- **Physical reachability via BFS connected components**: Brigade-to-sector assignment must verify the brigade can reach the sector through contiguous friendly territory. BFS over `operational_contact_graph.json` (744 nodes, 3243 edges) partitions friendly OSIDs into components. Brigades only assign to sectors in their own component. Implemented as `buildFriendlyComponents()` + `getSectorComponent()` in `corps_front_sectors.ts`.
- **Proxy checks fail for fragmented maps**: Checking `territory_osids.length === 0` does NOT detect disconnected pockets — Sarajevo, Bihać, Srebrenica all have territory, they're just disconnected from the main blob. The correct invariant is BFS connectivity, not data shape.
- **Multiple code paths require multiple fix points**: Three paths in `corps_front_sectors.ts` assign brigades to sectors: (1) `classifyBrigadesByTerritory` Phase 2 pool distribution, (2) `ensureMinimumSectorCoverage` Steps 2-3 surplus transfers, (3) final prune. Fixing only Phase 2 (n596) left 12 disconnected assignments. All three needed the `brigComp === sectorComp` filter.
- **Diagnostic verification**: `tools/check_disconnected_sectors.cjs` — loads operational_contact_graph.json, runs BFS reachability, reports both disconnected brigade assignments and disconnected sector pockets. Authoritative post-fix verification tool.
- **Calibration result**: n598 = 86.6% area-weighted, 6/6 benchmarks, RS delta +6, 172 orders, 1 remaining edge case (arbih_712th_mountain fallback). Previous: n590 = 86.3%, n579 = 85.3%.

## 2026-03-12 - Enclave brigade retention: march guard + retreat filter (n601)

- **Enclave brigades must not march out of their pocket**: At turn 0, enclaves are connected to the main blob via corridors. The sector system assigns enclave brigades to sectors in the main blob. Column march moves them there. RS severs the corridor. Brigades stranded 100km away with full personnel, never to return. Fix: `evaluateSectorMarch` skips march if no sector front OSID is in the same enclave.
- **Emergency retreat needs BFS nearest-friendly before corps HQ**: `findEmergencyRetreatOsid` jumped from fallback_osid to corps HQ (100km away) without checking nearby friendly OSIDs. New step 3: BFS within 8 hops from current location finds nearest friendly OSID. Keeps brigades in their pocket.
- **1-hop retreat must filter to same-enclave**: `getFriendlyRetreatDestinations` filtered retreat candidates for enclave-tagged brigades to same-enclave OSIDs only. Without this, brigades drift out through temporary corridors one hop at a time.
- **Helper: `isOsidInSameEnclave(a, b)`** in `enclave_resilience.ts` — checks ENCLAVE_DEFINITIONS prefix matching for both OSIDs.
- **Impact**: Goražde 2/20 → 14/20 RBiH OSIDs. Srebrenica 8/16 → 16/16. All 13 enclave brigades in home pockets. 6/6 benchmarks pass. 86.5% area-weighted match.
- **Key insight**: The bug was NOT in the retreat system — it was in the bot AI march orders. The brigades marched out voluntarily before the corridor closed. The retreat fixes are defense-in-depth for when OSIDs flip under the brigade.

## 2026-03-15 - Supply-gate directive baking vs operation probe threshold (n76 Fix #35)

- **`bestMinOutcome` is computed in the directive and baked into launched operations via `min_attack_outcome`.** `getSectorOffensiveProbeThreshold` returns `activeOp.min_attack_outcome` first — if this was set at launch time under adverse conditions, it persists for the operation's full lifetime. Supply recovering after launch has no effect.
- **The supply health upgrade (adequate_fraction < 0.05 → costly_victory) must not propagate into operation probe thresholds.** The directive-level supply gate correctly prevents launching new operations when supply is dire (via `critical_fraction > 0.5 → strip offensive_targets`). The secondary `bestMinOutcome = 'costly_victory'` upgrade is for directive planning only. Passing it to `evaluateSectorOffensiveLaunch` as `minAttackOutcome` burns a permanent `costly_victory` restriction into the operation — which is then NOT relaxed when supply improves.
- **Pattern: separate directive-level and operation-level thresholds.** Capture `minAttackOutcomeForOpLaunch = bestMinOutcome` BEFORE any supply/context adjustments that should affect only the directive. Use the pre-adjustment value for `evaluateSectorOffensiveLaunch`. The directive can be as restrictive as needed for planning; the operation's baked threshold should reflect the un-adjusted priority baseline.
- **Debug signature for this class of bug:** `elig=0` throughout execution despite brigades adjacent to objectives and above 400 personnel. `getSectorOffensiveProbeThreshold` returning a value stricter than the predicted outcome. Check `activeOp.min_attack_outcome` directly — if it's unexpectedly high, trace back to where the operation was created and what `minAttackOutcome` was passed.
- **Double-penalizing supply is wrong.** Combat predictor already applies supply power penalty (critical supply → ~0.5× attack power). Blocking attacks at the threshold level via `min_attack_outcome` means a supply-starved brigade (a) attacks at half power AND (b) can't even attack. The realism is captured by the power penalty. Threshold gates should only reflect the commander's confidence in success, not supply-state double-accounting.
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 entry "Fix #35."

## 2026-03-15 - Operation participant reserve bypass pattern (n59+n70 Fix #34)

- **evaluateReserve must not fire for operation participants.** Brigades committed to a sector offensive (isActiveSectorOperationParticipant=true) have explicit march-toward-objective orders. Reserve logic intercepts them before evaluateSectorAttack runs — resulting in brigades staged in the right position but silently idling as corps reserve. Fix: `if (isActiveSectorOperationParticipant) return false;` at the top of evaluateReserve.
- **Cold-front adjacency creates invisible reserve traps.** OSIDs adjacent only to Graz-Accords partners (HRHB for RS) have `adjEnemy.length === 0` and `osidAnalysis.enemy_neighbors.length === 0`, satisfying the reserve condition. The Graz cold-front correctly prevents attacks; but it must not prevent operation participants from marching through staging positions near those fronts.
- **1-hop movement_orders are invisible to anyMoved stall detector.** `updateMultiAxisResults` checks `brigade_movement_state[bid].status === 'in_transit' || 'packing'` for anyMoved. Regular movement orders (movement_orders + 1-hop BFS) never write brigade_movement_state — they just update location_osid. The stall detector sees zero movement every turn → idle_streak accumulates → axis aborts with 0 attacks. Column march orders (column_march_orders + Dijkstra) set in_transit status, making movement visible. **Rule: execution-phase march-first must always use column_march_orders + findNearestFriendlyOsidDestination, never movement_orders + findNearestFriendlyOsidInSet.**
- **findNearestFriendlyOsidInSet vs findNearestFriendlyOsidDestination.** The former returns the first BFS step (a 1-hop neighbor). The latter returns the actual target OSID (for multi-hop Dijkstra column march). Using InSet as a column_march_orders destination stops the column after 1 hop — the brigade arrives at the first step, is no longer in_transit, but hasn't reached the objective. **Rule: column_march_orders must always use findNearestFriendlyOsidDestination.**
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 entry.

## 2026-03-15 - Recruited brigades inflate equipment pool (n718 side-finding)

### Recruited brigades spawn with full DEFAULT_COMPOSITION
- `ensureBrigadeComposition()` in `equipment_effects.ts` initializes any formation with missing composition from `DEFAULT_COMPOSITION` (RS: 40 tanks, 30 arty; HRHB: 10/10; RBiH: 1/3). This runs on first access — including newly recruited brigades.
- **Effect:** Each new RS brigade spawned during a run adds 40 tanks to the pool. Over 40 weeks, this inflated the RS tank total from the historical ~535 to ~605 (13% above starting inventory from recruitment alone).
- **This is not a calibration bug** — the equipment attrition mechanic correctly removes tanks. But equipment totals at end-of-run are not directly comparable to historical figures because recruitment inflates the supply side.
- **Design rule:** If recruits shouldn't spawn with armor, `ensureBrigadeComposition` needs an `equipment_class`-aware path — mountain/light brigades get zero tanks; mechanized/motorized get full complement. Low priority until equipment calibration becomes a target.
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 n718 entry.

## 2026-03-15 - Explicit-field validators silently strip new optional fields

- **Pattern:** `validateOfficerData()` constructs validated `NamedOfficer` objects by explicitly listing every field in an object literal. When `war_crimes_record` was added to the `NamedOfficer` type and the JSON data, it was never added to the validator's field list. The field was silently dropped during scenario loading.
- **Why TypeScript didn't catch it:** The field is optional (`war_crimes_record?: {...}`). Omitting an optional field from an object literal is perfectly valid — no compile error. The validator produced a type-correct object that was missing data.
- **The downstream illusion:** The UI adapter, components, and types were all correctly wired. `OfficerProfile.tsx` had a `WarCrimesBadge` component, `GameStateAdapter.ts` mapped the field, `types.ts` declared it. Everything compiled. But the badge never rendered because the data was `undefined` at runtime — stripped 3 layers upstream.
- **Rule:** When adding optional fields to a type that has an explicit-field validator, always update the validator simultaneously. Search for the type name + "push" or "result.push" to find validators that construct the type. Consider adding a test that round-trips the JSON through validation and asserts the field survives.
- **(2026-03-15)** — See PROJECT_LEDGER.md 2026-03-15 war crimes fix entry.

## 2026-03-15 - Elite commander vs named officer architecture

- **Named officers** (`apr1992_officers.json`): Corps commanders and above. Participate in the officer succession system — can die (casualty_vulnerability), transfer, be replaced. Drive operation preparation tempo via competence/aggressiveness personality traits. Player-choice succession for player faction; bot factions auto-succeed. 98 total (RS 32, RBiH 38, HRHB 28).
- **Elite commanders** (`oob_brigades.json`, `elite_commander` field): Permanent brigade-level. Cannot die, cannot promote to corps, cannot command operations. Represent iconic commander-unit bonds (e.g., Tirić and the Black Swans, Glasnović and the ABB). Purely informational for UI display. 8 total across all factions.
- **Key distinction:** Named officers flow through `officer_system.ts` (validation, state tracking, succession events, pending_officer_events). Elite commanders are static strings on the brigade OOB entry — no state tracking, no events, no gameplay effect. They never enter `named_officer_data` or `named_officer_state_by_id`.
- **Design rule:** Never suggest promoting an elite commander to corps or giving them operation command. The permanence is the point — these are the brigade's identity.

## 2026-03-15 - Combat death policy: casualty_vulnerability vs available_until_turn

- **`available_until_turn`** = organizational replacement. The officer's departure is a political or administrative decision: transfer, retirement, reassignment, loss of confidence. Creates a `replacement_suggested` event for the player faction. Deterministic timing.
- **`casualty_vulnerability`** = combat death risk. The officer may die during the simulation based on combat exposure and this probability modifier. Higher values (0.25-0.30) for officers historically KIA early. Organic and probabilistic — the officer might survive in an alternate history.
- **Never combine both for KIA officers.** Using `available_until_turn` to model a combat death creates a deterministic death date — the officer always dies at that exact turn. This violates the simulation's principle that combat outcomes should emerge from gameplay. Officers who historically died in combat (Nanić KIA Oct 1995, Hujdur KIA Sep 1993, Šehović KIA Aug 1992) use only `casualty_vulnerability`.
- **When to use `available_until_turn`:** Halilović replaced by Delić (political decision, turn 60). Talić replaced by Kelečević (transfer/death outside combat zone). Blaškić replaced by Filipović (political reassignment).

## 2026-03-15 - Orden heroja oslobodilačkog rata — all 9 recipients documented

- Bosnia's highest military decoration, awarded to 9 individuals (all ARBiH). All are now in the officer roster.
- **KIA recipients (3):** Safet Hadžić (KIA Apr 1992, Pretis factory), Mehdin Hodžić (KIA May 1992, Zvornik), Adil Bešić (KIA Nov 1992, Bihać). All have elevated casualty_vulnerability (0.25-0.30).
- **Survivors (3):** Hajrudin Mešić ("Zmaj od Majevice", 2nd Corps), Safet Zajko (1st Corps, 2nd Motorized), Nesib Malkić (2nd Corps, 210th Mountain).
- **Previously in roster (3):** Izet Nanić (5th Corps, KIA 1995), Midhad Hujdur "Hujka" (4th Corps, KIA 1993), Enver Šehović (3rd Corps, KIA 1992).
- **Design note:** The decoration is informational only — no gameplay modifier. It serves as a historical marker in officer profiles. The `casualty_vulnerability` field independently handles the elevated combat risk these officers faced.

---

## Equipment Acquisition & Degradation (2026-03-18)

### Per-brigade scaling is explosive
Any mechanic that gives +N per brigade per tick scales linearly with brigade count. ARBiH mobilizes from 74→125 brigades, so a "modest" +1 tank/16 turns becomes +125 tanks/tick. **Always use faction-level capped budgets** for production, never per-brigade.

### Three historical equipment sources for ARBiH
1. **Battlefield scavenging/capture** — recovering destroyed/abandoned VRS equipment after battles. Primary source of tanks. Both attack wins (capture from retreating defenders) and defense wins (recovering from repulsed attackers) produce equipment.
2. **Arms smuggling pipeline through Croatia** — Iran, Pakistan, black market. HVO/Croatia skimmed ~40% of every shipment. Split: 60% ARBiH, 40% HVO.
3. **Zenica steelworks** — local production of improvised mortars and howitzers. Artillery only, no tanks.

### RS equipment trajectory
VRS inherited ~677 tanks (520 in OOB + 157 from JNA phantom handoff). No new production (Serbia under sanctions). Should decline through: combat losses (~8% per battle), maintenance degradation (spare parts shortage), and write-off of non-operational vehicles. By w40: ~539 total, ~286 effective. Maintenance capacity declines to 0.74× by w52, 0.50× by w100.

### Equipment condition vs count
The degradation system (operational/degraded/non_operational) shifts condition fractions but by itself never removes equipment from the count. A tank at 0% operational is still a tank in the count. Write-off mechanic needed: permanently scrap equipment when degraded+non_operational exceeds 40%. Small formations (≤10 units) exempt — they maintain their few vehicles carefully.

## Civilian Casualty Modeling (2026-03-18)

### Kill fraction asymmetry is essential
Not all ethnic displacement has the same lethality. The Bosnian War's civilian deaths were overwhelmingly Bosniak (~75%), with Serbs (~20%) and Croats (~5%) much lower. Kill fractions must reflect this:
- RBiH displaced by RS: 4% (systematic ethnic cleansing — Prijedor, Zvornik, Foca, Visegrad)
- HRHB displaced by RS: 1% (expulsion, lower systematic killing)
- RS displaced by non-RS: 1% (mostly voluntary flight)
- Default: 2%

### Fled abroad vs killed must be tracked separately
Serbs having the highest fled_abroad count is correct (Serbia next door). Bosniaks having near-zero fled_abroad is correct (no neighboring state). Lumping both into a single "lost" field masks the difference between killing and displacement.

### Multiple tracking systems must all update all stores
If `civilian_casualties` and `displacement_event_log` both exist, every code path that generates civilian casualties must write to BOTH. Paramilitaries wrote to one, old displacement wrote to the other. Result: 3,700 phantom gap between systems.
