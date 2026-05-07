# FORAWWV.md
## Canon extensions and validated implementation insights for *A War Without Victory*

This file records **validated systemic truths** discovered during implementation that extend (and must never contradict) the Rulebook, Systems & Mechanics Manual, and Engine Invariants. It is not a design pitch, not a dev diary, and not a substitute for the canonical docs. It exists to prevent "quiet drift" between intent, data reality, and code.

---

## I. Purpose and scope

- This file extends canon with implementation-validated truths.
- It must not contradict the Rulebook, Manuals, or Engine Invariants.
- It must not encode speculation as canon.
- It must not introduce new mechanics that haven't been requested and validated.
- It must not quietly change the meaning of existing systems.

---

## II. Canon and authority

### II.1 Document precedence
If there is a conflict:
1) Engine Invariants  
2) Rulebook  
3) Systems & Mechanics Manual  
4) This file (FORAWWV.md)  
5) Code

If code contradicts the documents, **code is wrong**.

### II.2 Canonical files and source of truth
- **Registry cardinality:** Canonical mun1990 registry is `data/source/municipalities_1990_registry_110.json` (110 municipalities). Source of truth for expected mun1990 key count. Any registry/mapping mismatch is a blocking integrity issue until resolved.
- **Settlement indices:** `settlements_index.json` and `settlements_index_1990.json` differ; `mun1990_id` is present only in the 1990 index. `SettlementRecord.mun1990_id` is optional; populated on load when key present. Ledger provenance: Phase H6.4.7.
- **DEM elevation stats:** Script/audit elevation values may be non-authoritative. For DEM rasters, `gdalinfo -stats` in container is authoritative. Ledger provenance: Phase H6.4.6.

### II.3 Canon recanonization rule
If a contract-referenced dataset checksum mismatches, resolution must be explicit (restore canonical file OR re-canonize checksum) and must be ledgered; never silent. Ledger provenance: Phase H6.8.3.

---

## III. Determinism and reproducibility

### III.1 Determinism doctrine
The engine and all derived artifacts must be deterministic:
- No randomness in simulation core
- No timestamps in derived artifacts (wall-clock time forbidden)
- Stable ordering everywhere (IDs, arrays, maps, outputs)
- Re-running the same command on the same inputs must produce byte-identical outputs

Enforced by `tests/artifact_determinism.test.ts` and `stripTimestampKeysForArtifacts` in write paths. Audits may include tool versions/checksums but not time. Ledger provenance: Phase H6.4.8, H6.8.3.

### III.2 Rerun invariants
- Same inputs → same outputs (byte-identical)
- No hidden tolerances; adjacency D₀ is an explicit canon parameter

---

## IV. Data pipeline discipline

### IV.1 Derived vs source
- Derived artifacts live under `data/derived/`. Source under `data/source/` is read-only.
- Municipality reference geometry is **always fabric-derived** from the settlement polygon fabric, never taken from raw municipality features in unified geography. Ledger provenance: Map Rebuild Path A.
- Municipality borders must never be produced by boolean union; must be derived by shared-edge cancellation over the settlement fabric. Ledger provenance: Map Rebuild Path A.
- Shared-edge cancellation alone may be insufficient due to coordinate jitter; when classification coverage is sufficient, fabric-oracle segment classification must follow. Ledger provenance: Map Rebuild Path A (clean fabric pass).

### IV.2 Audit artifacts and viewer generation
- Audit outputs (JSON/TXT) accompany derived GeoJSON; deterministic, no timestamps.
- **Always run derivations before viewing:** Canonical workflow ensures derived artifacts are fresh before inspection. Ledger provenance: Map Rebuild Path A.
- Any pipeline step or viewer index must log/fingerprint geometry inputs (path + sha256 + feature count + bbox) when consuming external/override geometry. Ledger provenance: Phase H6.10.0.

### IV.3 No hand-editing generated files
- Do not hand-edit derived artifacts. Regenerate via scripts.

---

## V. Geometry and map integrity rules

### V.1 "Truthful substrate" rule
The map layer must never be "fixed" by invention:
- No hulls, unions, smoothing, buffering, snapping, or silent repairs
- If data is wrong or incomplete: audit, log (e.g. in napkin or ledger if it's a process lesson), surface as constraint in canon if it affects design

### V.2 No invented geometry
- SVG-derived outlines are not trusted until validated/filtered against fabric adjacency. Dissolved outlines may include interior seams; fabric-based filtering required for truthful boundaries. Ledger provenance: Map Rebuild Path A.
- Settlement polygons are independently digitized; they do not form a shared-border partition at scale. Adjacency detection must use tolerance-based segment matching, not exact coordinate comparison. Ledger provenance: Phase G3, Map Rebuild.

### V.3 Ring validity and closure
- Do not skip on `ring_not_closed` if ring has ≥4 points; close deterministically by appending first coordinate if missing, then revalidate. Only skip if still invalid after closure or if too_few_points/non_finite. (Recurring issue: document in napkin under svg_substrate / ring_not_closed_skipped if needed.)
- Duplicate SIDs must be merged deterministically into single MultiPolygon features; preserve per-part provenance in properties. (Recurring issue: document in napkin under svg_substrate / duplicate_sid_not_merged if needed.)

---

## VI. External sources safety

### VI.1 Large external inputs
- OSM PBF, DEM, boundaries under `data/source/` and other gitignored prerequisites may be removed by `git clean`. Treat missing referenced files as "manual restore required," not auto-regenerate. Ledger provenance: Phase H6.8.3.

### VI.2 Terrain pipeline prerequisites
- H6.2 terrain snapshots require: OSM PBF at `data/source/osm/bosnia-herzegovina-latest.osm.pbf`, DEM at `data/source/dem/raw/` per script paths. Ledger provenance: Phase H6.4.5.
- When running H6.2 snapshots in Docker on Windows: run `npm ci` inside container or use a node_modules volume (exclude host node_modules) to avoid platform bleed. Ledger provenance: Phase H6.4.3.

### VI.3 Donor geometry risk
- Donor JS geometry may use different coordinate spaces. Prefer deriving overlays from substrate SIDs rather than raw donor coordinates. Ledger provenance: Phase H6.9.4.

---

## VII. Debug overlays and diagnostics rules

### VII.1 Substrate-anchored overlays
- Prefer SID-anchored debug overlays: derive overlay geometry from the substrate itself (settlement polygons), keyed by mun1990_id via settlements_index_1990. Avoid donor-coordinate transforms. Ledger provenance: Phase H6.9.4.
- Debug overlays representing historical (pre-1995) municipal entities must be derived from authoritative settlement membership (census lists) and/or explicit post-1995→1990 aggregation mappings, not from donor geometry or ambiguous tags. Ledger provenance: Phase H6.10.0.

### VII.2 Coordinate space discipline
- Debug overlays must be rendered in substrate SVG coordinate space (same viewbox normalization as settlements). Ledger provenance: Phase H6.9.2.
- If overlay layers use different coordinate spaces, each layer must explicitly declare its space and the viewer must transform each layer to substrate before drawing. Ledger provenance: Phase H6.9.3.

### VII.3 Viewer file:// detection
- Viewers must detect `file://` protocol and show a clear local-server instruction message (e.g. run `npx http-server -p 8080`, then open the viewer URL). (Recurring issue: document in napkin under viewer / file_protocol_cors_blocking if needed.)

---

## VIII. Commit and ledger discipline

### VIII.1 Phase commits
- One commit per phase. Stage only files specified in phase scope.

### VIII.2 Validations required
- Validation chain before commit: `map:contracts:validate` → `typecheck` → `npm test` → `map:contracts:determinism`. Stop on first failure.

### VIII.3 What gets staged vs gitignored
- Large derived artifacts (GeoJSON, TIF) may be gitignored per repo size policy. Audits and ledger are staged. Debug outputs under `data/derived/_debug/` are typically gitignored.

---

## IX. Change management

### IX.1 Recording new invariants
- Canon decisions must be ledgered. Use explicit phase entries with FORAWWV flag when a systemic design insight is validated.

### IX.2 When to add FORAWWV addendum
- Add an addendum (or section rule) when: (a) a ledger phase explicitly validates a design invariant, (b) the rule is generalizable beyond one municipality/overlay/run, (c) the rule is durable and action-guiding for future engineers. Do not add based on hypotheticals or one-off debugging notes.

### IX.3 Avoiding silent assumptions
- Do not compensate for substrate fragmentation with hidden tolerances unless explicitly elevated to canon. (Known constraint: MAP: SVG canonical substrate lacks shared-border fabric at scale; document in napkin if operational impact.)

### IX.4 Ledger-flagged addenda (pending validation)
The items below are flagged in `docs/PROJECT_LEDGER.md` as potential addenda. They are **not canon** until explicitly validated and promoted.

- H1.2.1: Provenance/maintenance rule for `data/source/municipality_political_controllers.json` (source location + regeneration process).
- H1.2.2: Canonical location of 1990 winners input and regeneration workflow (DOCX/Excel source and extraction steps).
- H1.2.3: Municipality alias normalization for post-1995 renames in remap pipelines.
- H1.8: Consequence pathways require explicit operations/events; adjacency/activity alone is insufficient.
- H1.9: Whether any autonomous degradation exists without player intent (baseline_ops is harness-only; not canon without validation).
- H1.10: If exhaustion bounds/units are formalized, document the bounds and downstream assumptions.
- H2.1: Mechanism attribution for control flips is underdetermined without explicit event logs.
- H2.4: Agency (control flips, formation creation) requires explicit orders or harness directives.

### IX.5 Ledger-flagged addenda (legacy, pending validation)
Legacy ledger flags that should be reviewed against existing sections before promotion:

- Boundary extraction audits: if repeated-vertex loops or other generator failure modes are systemic, add explicit boundary extraction requirements.
- SVG-derived outlines: not trusted until validated/filtered against fabric adjacency (dissolved outlines may include interior seams).
- Reference geometry sources: if SVG outlines are consistently “cleaner” and used operationally, define acceptable reference geometry sources.
- Coordinate regimes: if fit checks show SVG outlines vs projected-space mismatch, canonize coordinate regime rules for reference geometries.
- Municipality reference geometry: if unified geography muni features are incomplete, state that muni geometry is always fabric-derived.
- Shared-edge cancellation: if insufficient due to coordinate jitter, require fabric-oracle segment classification follow-up.
- Municipality borders: must never be produced by boolean union; derive by shared-edge cancellation over settlement fabric.
- Derived artifacts freshness: “always run derivations before viewing” as a canonical workflow rule.
- Y-down planar sources: if some settlement sources are Y-down, record coordinate regime handling.
- SVG pack coordinates: if systematically screen-space/ambiguous, record regime and transforms.
- Settlement identity: if duplicate SIDs occur, clarify multi-polygon settlement identity assumptions.
- Adjacency precision: strict shared-border detection may miss contiguities; note tolerance-based matching trade-offs.
- Point-touch adjacency: if required for usable connectivity, update adjacency definition accordingly.
- V3 adjacency rationale: settlement polygons independently digitized; exact coordinate matching is invalid.
- SVG municipality coordinate regime: viewBox transforms present but not applied; record regime differences.
- mun1990 connectivity: adjacency graph components/isolates may reflect coverage gaps; note if supply/corridor logic assumes connectivity.
- Registry coverage: mapping files may reference names not in canonical registry; require alignment at build time.
- Determinism: derived artifacts must contain no timestamps or wall-clock fields.
- Terrain pipeline prerequisites: OSM PBF and DEM required inputs; document canonical paths.
- Container discipline (Windows): use container-local node_modules or volume; avoid host bleed in H6.2 snapshots.
- Settlement indices: dual index scheme (1990 vs current) and optional mun1990_id rules.
- Recanonization: contract checksum mismatch requires explicit restore or recanonization, never silent.
- Debug overlays: must render in substrate SVG coordinates; each layer declares its space and is transformed.
- Overlay anchoring: prefer SID-anchored overlays; substrate municipality_id is post-1995 space.
- Viewer paths: datasets must resolve relative to viewer location, never absolute /data paths.
- Input fingerprinting: when consuming external/override geometry, log path + sha256 + feature count + bbox.
- Municipality_id validation: centroid/order validation required before relying on municipality_id for mechanics.
- Census-derived corrections: allowed only as viewer/derived transforms; never overwrite canonical substrate.
- Coordinate-frame reconciliation: some SVG clusters may require explicit transforms; record as general rule if validated.

---

## Spatial substrate (settlement-first)

### Settlement-first doctrine
Settlements are the **only authoritative spatial entities** in the simulation. Municipalities exist as metadata/reference containers. No simulation logic may depend on municipality borders.

### Canonical inputs and outputs
- **Source:** `data/source/settlements/**`, `data/source/bih_census_1991.json`
- **Derived substrate:** `data/derived/settlements_substrate.geojson`, audit.json, audit.txt
- **Settlement names:** Settlement display names must come from an authoritative name table (e.g. `data/derived/settlement_names.json`, derived from census), not from substrate properties (which may be overwritten or represent municipality labels). Viewer must declare which field/source is used. Ledger provenance: Phase H6.10.0.
- **Canonical viewer:** `data/derived/substrate_viewer/`

### Coordinate regime
The canonical settlements substrate is in an **SVG coordinate regime**, not geographic CRS. Some settlement sources may be Y-down planar coordinates; viewers must handle explicitly (e.g. Y-flip at render time). Ledger provenance: Phase 0 validation, Map Rebuild. Simulation uses topology and graph relations, not real-world lat/lon distances.

### Substrate municipality_id regime
Substrate `municipality_id` is in post-1995 (census-142) space. Any 1990 municipality concept must be represented via an explicit aggregation layer; never assume names imply 1990 boundaries. Ledger provenance: Phase H6.9.5, H6.10.0.

---

## Adjacency is a modeled relationship

### Data truth
Settlement polygons overwhelmingly do **not** share boundary-length borders (~0.16% shared-border ratio). The substrate is not a tessellated partition. Adjacency = shared border produces extreme isolation.

### Canonical adjacency (Phase 1)
Phase 1 adjacency is a **Contact Graph**:
1) Shared border segment (positive length)
2) Point-touch contact (vertex contact)
3) Boundary-to-boundary distance ≤ D₀ (explicit contact radius)

D₀ is a canon parameter, not a hidden tolerance. Adjacency audits must output edge-type breakdown (shared-border vs point-touch vs distance-contact) and D₀ sensitivity.

### AoR contiguity
AoR contiguity is defined over the contact graph, not shared borders. AoRs apply only to front-active settlements; rear settlements may exist as Rear Political Control Zones without brigade assignment (Rulebook v0.2.6).

---

## Session runbook and ledger

- **Napkin:** `.claude/napkin.md` is the single session runbook. Read at session start; update as you work. It holds corrections, preferences, and patterns. No separate mistake log.
- **Ledger:** `docs/PROJECT_LEDGER.md` is mandatory for phase tracking, canon decisions, explicit deferrals, and the deterministic changelog. Append-only.

Rely on napkin, ledger, and canon only.

---

## Addenda (compact reference)

### mun1990_id and political controller derivation (Phase C)
- `mun1990_id` canonical ASCII snake_case (`^[a-z0-9_]+$`). Political controller at mun1990 level via deterministic derivation; null allowed for missing/conflict. No fuzzy matching.

### Settlement identifier schemes
- Census: 2-part `mun_code:source_id`. Index: may use 3-part `mun_code:source_id:stable_suffix`. Normalize by base_id (first two parts). Five census IDs upstream-missing; tracked as known limitation.

### Initial political control
- Initialization uses `data/source/municipalities_1990_initial_political_controllers.json`. Phase C derived mapping is diagnostic only. Null rare, explicitly justified. No heuristics.

### Substrate-to-graph continuity mismatch (CASE C)
- Some settlements degree-0 in shared-border graph but have contact neighbors. Future handling requires explicit design decision, not silent heuristic.

### mun1990 registry 110
- Canonical registry: `municipalities_1990_registry_110.json`. Banovići added; Milići maps to Vlasenica; "sarajevo" removed (use "novo_sarajevo"). Supersedes prior 109 count.

---

## Addendum — Coordinate Regime Reconciliation

Some SVG-derived geometry clusters may be irreducibly misaligned in coordinate space. In such cases:

- Numeric fitting, similarity transforms, centroid anchoring, or heuristic penalties are insufficient and must not be used.
- Reconciliation must use a trusted, historically validated legacy substrate as a coordinate-frame anchor.
- Legacy substrates may anchor transforms only; they must never supply gameplay semantics.

---

## X. AI Officers and the political → army → corps chain (substrate canon)

Validated 2026-05-06/05-07 across A1-A5 + B-lane (DDR + B1 + B2) + C-lane (DDR + C1 + C2) + Krivaja-95 floor work.

### X.1 Canonical PoliticalDirective verbs
The canonical `PoliticalDirective` interface in `src/sim/combat/army_order_interpretation.ts` accepts EXACTLY six verbs:
- `HOLD_AT_ALL_COSTS` — DEFENSIVE-WEIGHT
- `PRESS_OFFENSIVE` — OFFENSIVE-WEIGHT in named theater
- `MAINTAIN_CORRIDOR` — CONTINGENT-DEFENSE
- `PREPARE_RESERVE` — RESERVE-WEIGHT
- `HONOR_TRUCE` — NEGOTIATION-WEIGHT
- `BALANCE_FRONTS` — default / undirected

Any bot/AI generator that emits a directive verb MUST produce a value from this exact set. Richer agent-side vocabularies (e.g. D-lane's 16-verb president-intent set) require an explicit mapping/translation step before writing to the engine slot. Reference: `tools/claude_plays_vrs/run_three_commanders.ts` `PRESIDENT_TO_CANONICAL` table at commit `bfcc9258`.

### X.2 Canonical chain wiring
The political → army → corps chain is wired through these state slots:
- **B1/B2 input:** `state.political.political_leader_data[faction]` (canonical leader scalars per `data/scenarios/political_leader_data.json`); `state.military.political_leaders[faction]` (officer ID per faction).
- **B1 producer output:** `state.military.political_directives_by_faction[faction]: PoliticalDirective` (verb + optional target_corps_id + directive_id).
- **A3 interpreter output:** per-corps `ArmyCorpsDirective[]` (corps_id + role + deviated + optional deviation_reason).
- **C1 persisted slot:** `state.military.army_corps_directives_by_faction[faction][corps_id]: { corps_id, role, deviated, deviation_reason? }` — read by `commander/briefing.ts` `assembleCampaignIntent` to overlay `frontPriority.role` → `briefing.campaign_role`.
- **Corps decisions:** existing v0.8 corps commander intelligence consumes `briefing.campaign_role` via `plan.ts` chokepoints (`primary`/`secondary`/`economy`/`contain` gates).

### X.3 A4 named-officer roster
Canonical historical succession is encoded in `data/scenarios/army_co_roster.json` (`93c75b1d`):
- VRS: Mladić throughout (no historical succession).
- ARBiH: Halilović (w0) → Delić (w60+) per Burg & Shoup ch.4 sacking.
- HVO: Petković (w0) → Praljak (w64+) → Roso (w130+) per BB Vol II.

Officer scalar fields (`stubbornness 1-5`, `override_tolerance 1-5`) are populated at scenario init by `army_co_roster_loader.ts`. Mid-run succession is handled by existing `processOfficerSuccession` (combat-death + relief paths) plus A4-introduced scheduled transitions when tenure_until is reached.

### X.4 Faction-symmetric mechanism, faction-asymmetric data
The mechanism (interpretation, persistence, briefing overlay, corps-role gating) is faction-symmetric: same code paths for RBiH, RS, HRHB. Faction asymmetry lives entirely in DATA: leader scalars (B2), officer rosters (A4), persona prose (D1). Static-grep guards in tests prevent per-faction string-equality branches in the mechanism layer.

---

## XI. Sensitive-history operation trigger floors and name-pool exclusion

Validated 2026-05-06 (Krivaja-95 t168 floor fix `d622b762`) + 2026-05-07 (Stupčanica name-collision fix `759a35cd`).

### XI.1 Canonical floor: Krivaja-95 and Stupčanica-95
Per ICTY Popović IT-05-88-T + Karadžić IT-95-5/18-T:
- **Krivaja-95** (Srebrenica fall) is canonically July 6-11, 1995 = w170+. Trigger predicate in `src/sim/combat/triggered_operations.ts` enforces `turn >= 170`.
- **Stupčanica-95** (Žepa fall) is canonically July 14-25, 1995 = w172+. Trigger predicate enforces `turn >= 172`.

These predicates are §6 sensitive-history floor protections. Sign-off chain: Stupčanica SHAPE B `b03333af`; Krivaja Phase 1 `bc44ddec`; Krivaja-95 floor enforcement `d622b762`.

### XI.2 Bot/AI generator name-pool exclusion (data, not comments)
Any reserved canonical name (operation, formation, event_id, persona_id) that bot/AI generators could randomly assign MUST be excluded from generator data pools by the data itself. Comment-claims of exclusion that the data doesn't enforce produce phantom canon-violations that masquerade as trigger bugs.

Specifically: `src/sim/combat/operation_names.ts` bot operation-name pools MUST NOT contain `Operacija Krivaja`, `Operacija Stupčanica`, `Operacija Sana`, `Operacija Maestral`, or any other canonical pre-planned/triggered/opportunity op name. Static tests enforcing the exclusion are mandatory.

### XI.3 Investigating phantom canon-violations
When a canon-violation persists after a trigger-predicate fix:
1. First hypothesis: name-collision (bot pool contains canonical name).
2. Second hypothesis: separate trigger code path (multiple op-injection sites).
3. Third hypothesis: side-effect suppression masking the actual cause.

Side-effect suppression (a recurring bug stops appearing after an unrelated change) is NOT a canonical resolution; preserve the original bug as backlog and trace the suppression mechanism to find the root cause.

---

## XII. AI persona QA mode (Claude-API harness, opt-in only)

Validated 2026-05-06 to 2026-05-07 across D-lane DDR + D1 + D2 + telemetry-wire-fix + D3 real-API smoke chain.

### XII.1 Three-layer roleplay
The Claude-API QA mode supports persona-grounded roleplay across three layers:
- **President layer** — `tools/claude_plays_vrs/api_president.ts` (Karadžić / Izetbegović / Boban personas).
- **Army CO layer** — `tools/claude_plays_vrs/api_commander.ts` (Mladić / Halilović → Delić / Petković → Praljak → Roso personas).
- **Corps CO layer** — `tools/claude_plays_vrs/api_corps_commander.ts` (named officers per OOB; archetype fallback via `default_corps_co.json`).

### XII.2 Opt-in env-flag schema
Default-off; opt-in granular per layer × per faction × per corps:
- `CLAUDE_AS_PRESIDENT_<faction>=true`
- `CLAUDE_AS_ARMY_CO_<faction>=true`
- `CLAUDE_AS_CORPS_CO_<faction>_<corps>=true`
- Wildcards: `CLAUDE_AS_ALL_LAYERS_<faction>=true`, `CLAUDE_AS_ALL=true`.
- Disable: `CLAUDE_PERSONA_TELEMETRY_DISABLED=true`.

### XII.3 Mid-run persona auto-swap
Persona auto-swap on A4 roster tenure boundaries. `loadPersonaByTenure(faction, role, turn)` reads `data/scenarios/army_co_roster.json` and returns the persona of the active officer at that turn.

### XII.4 Persona prompt suppressors
Persona prompts include explicit suppressor clauses for known-acknowledged structural artifacts (no political directive issued = player-driven design; alliance coefficient anchored; ops-in-planning visibility shape; canonical operation-name confabulation). Reference: Lane 1 `cb13e605`. New personas must include the full suppressor block to maintain QA signal-quality discipline.

### XII.5 Persona-grounded LLM signal quality
Empirically (D3.3 v2 triage of 253 observations vs API-Bridge baseline of 368): persona grounding shifts the SHAPE of LLM noise (BiH-specific vocabulary) without improving the QUALITY rate. Genuine-signal rate ~10-15% regardless of persona depth. Plan triage cost accordingly; do not assume persona depth alone yields cleaner QA.

### XII.6 Cost calibration (Haiku 4.5, with prompt caching)
- Presidents-only 40w: ~$0.46
- Army CO personas only 40w: ~$0.45
- Full stack 40w: ~$1.30
- Full stack 188w (extrapolated): ~$5-9
- Full-stack 40w with `--corps-api`: ~$1.30 / 840 calls

---

## XIII. OOB-data correctness rules

Validated 2026-05-07 by Q1 revert + Lane 2 NW Bosnia OOB audit.

### XIII.1 Corps available_from invariant
A corps's `available_from` MUST NOT be later than its earliest brigade's `available_from`. If a corps activates AFTER its constituent brigades, the run produces "0-brigade corps shells" with role + stance assigned but no combat power — degenerate state observable to AI commanders as a bug.

Engine-side gating (defer corps creation until `available_from <= currentTurn`) is the wrong fix for this invariant violation: it cascades calibration regressions by deferring entire faction OZ structures. Q1 (`6cbcaa00`) reverted at `8ccdbff8` after deferring all 5 HVO OZs to w10 caused -17% RBiH territory loss. The proper fix is OOB-data alignment per documented historical activation: Lane 2 (`be7e0715`) bumped 4 NW Bosnia rows to `available_from=0` per BB1 p.181-182 evidence.

### XIII.2 HVO Posavina OZ uniqueness
The HVO Northwest Bosnia OZ (`hvo_northwest_bosnia`) is uniquely early among HRHB Operative Zones. Combat in Bosanski Brod began "early March 1992" before any formal HZ-HB or OZ structure — the OZ is canonically active at scenario t0. Other 4 HRHB OZs (`hvo_main_staff`, `hvo_southeast_herzegovina`, `hvo_central_bosnia`, `hvo_tomislavgrad`) correctly activate at `available_from=10` (HVO formed politically 8 April 1992 in Grude; Operative Zones formalized through 1992).

---

## XIV. Default-off byte-stability invariant

Validated across A1-A5 (officer substrate), B1+B2 (political directive producer), C1+C2 (corps directive consumer + telemetry), D1+D2 (persona system), N4 (morale-collapse override).

### XIV.1 Invariant
Any env-flag-gated mechanism MUST produce byte-identical state hash when its flag is off (default off). Default-off paths must:
- Skip all Anthropic SDK loads (no API calls).
- Skip all state-mutating writes downstream of the gate.
- Leave all canonical state slots untouched (do not initialize empty maps or arrays — leave undefined).

### XIV.2 Verification
Default-off byte-stability is verified by parent-side 40w smoke against the predecessor baseline. Hash drift between default-off-flag and pre-feature baseline is a contract violation. Flag-state baseline references must be annotated with the env-flag state under which they were measured (durable knowledge entry 2026-05-06).

### XIV.3 Tooling-only vs engine-effecting
Tooling-only QA features (Ring 0, e.g. D1+D2 personas, `tools/claude_plays_vrs/`) are byte-stable by construction at the engine layer when their flags are off. Engine-effecting features (Ring 1, e.g. C1's `army_corps_directives_by_faction` persistence) require explicit gate-respecting code in their state-write path.

---

## XV. Side-channel telemetry pattern (gitignored debug surface)

Validated 2026-05-06 (C2 telemetry side-channel) + 2026-05-07 (D2 persona telemetry wire-fix).

### XV.1 Pattern
Observability for env-flag-gated features goes to a per-feature side-channel JSONL file under `data/derived/_debug/` (gitignored). The side-channel is APPEND-ONLY, deterministic-iteration, and does NOT mutate game state.

### XV.2 Canonical paths
- C2 corps directive telemetry: `data/derived/_debug/c_lane_corps_directive_telemetry.jsonl` (commit `f24ad5d7`).
- D2 persona decisions: `data/derived/_debug/d_lane_persona_decisions.jsonl` (commits `e25c18c3` + `59805cd6` wire-fix).
- Sector-partition perf instrumentation: `data/derived/_debug/sector_partition_*.jsonl` (precedent).

### XV.3 Why side-channel, not weekly_report.jsonl
Adding events to `weekly_report.jsonl` would mutate the canonical run-output stream and change `final_state_hash`, breaking byte-stability invariants. Side-channel JSONL is gitignored, has no consumer in the canonical scenario runner, and can be fully suppressed by env flag.

### XV.4 Side-channel access
Side-channel files are NOT included in scenario_runner output; they accumulate across runs (or a per-run helper writes a fresh file). Post-run analysis tools (e.g. `tools/compare_painted_vs_sim.cjs`) may read them; canonical run-summary tooling must not.

---

## XVI. Calibration discipline notes

Validated across the v0.7 / v0.8 / v0.9 calibration cycle.

### XVI.1 Calibration % means nothing if mechanics are broken
A high anchor + benchmark pass-rate against an old expected baseline is meaningless if the mechanism producing the values is broken. When a mechanically-correct fix shifts a benchmark out of its old tolerance band, the proper response is to re-anchor the benchmark to the new equilibrium, not to revert the fix. Reference: Lane A `d377e07b` (RBiH t40 preserve_survival_corridors expected 0.329 → 0.388 after the 5-lane batch produced a more historically accurate trajectory).

### XVI.2 Mini-panel discipline for calibration-active lanes
Calibration-active lanes (those that change behavior visible at scenario scale) MUST embed a Phase 0 mini-panel before SHIP per durable knowledge 2026-05-04 + 2026-05-06: cross-check DDR-provisional values against historical sources (BB Vol I/II + ICTY judgments per `historical_research_sources.md` hierarchy) + propose binding thresholds for 188w A/B validation + define stop-triggers. Mini-panel verdicts: GO / REFINED / NO-GO.

### XVI.3 Long-subprocess discipline
188w A/B runs (~25 min each) belong to the parent, not to the agent. Agent runtime cutoffs frequently kill long subprocesses mid-execution. Pattern: agent provides commands; parent runs subprocess as Bash background task; parent commits agent's authored work (code + tests + docs) on agent's behalf via `git commit -o` pathspec form when subprocess output lands.

---
