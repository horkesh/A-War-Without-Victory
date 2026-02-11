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
- If data is wrong or incomplete: audit, log (mistake log if process mistake), surface as constraint in canon if it affects design

### V.2 No invented geometry
- SVG-derived outlines are not trusted until validated/filtered against fabric adjacency. Dissolved outlines may include interior seams; fabric-based filtering required for truthful boundaries. Ledger provenance: Map Rebuild Path A.
- Settlement polygons are independently digitized; they do not form a shared-border partition at scale. Adjacency detection must use tolerance-based segment matching, not exact coordinate comparison. Ledger provenance: Phase G3, Map Rebuild.

### V.3 Ring validity and closure
- Do not skip on `ring_not_closed` if ring has ≥4 points; close deterministically by appending first coordinate if missing, then revalidate. Only skip if still invalid after closure or if too_few_points/non_finite. Mistake log: svg_substrate:ring_not_closed_skipped.
- Duplicate SIDs must be merged deterministically into single MultiPolygon features; preserve per-part provenance in properties. Mistake log: svg_substrate:duplicate_sid_not_merged.

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
- Viewers must detect `file://` protocol and show a clear local-server instruction message (e.g. run `npx http-server -p 8080`, then open the viewer URL). Mistake log: viewer:file_protocol_cors_blocking.

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
- Do not compensate for substrate fragmentation with hidden tolerances unless explicitly elevated to canon. Mistake log: MAP: SVG canonical substrate lacks shared-border fabric at scale.

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

## Mistake log and ledger

- `docs/ASSISTANT_MISTAKES.log` is authoritative, append-only. Mistake guard must remain active in scripts.
- `docs/PROJECT_LEDGER.md` is mandatory for phase tracking, canon decisions, explicit deferrals, deterministic changelog.

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
