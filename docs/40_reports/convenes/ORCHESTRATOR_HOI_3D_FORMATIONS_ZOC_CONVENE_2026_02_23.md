# Orchestrator Convene: HoI 3D Visible Formations, Selection-Driven ZoC, and Corps–Brigade Lines (2026-02-23)

**Convened:** Technical Architect, Graphics Programmer, UI/UX Developer, Gameplay Programmer, Product Manager  
**Goal:** Agree on the best way to achieve **visible formations** on the HoI 3D canonical map, with **selection-driven ZoC** and **corps–brigade lines**, and produce **concrete recommendations** for moving forward. The user explicitly notes that **3D terrain will be a challenge** and expects actionable next steps.  
**Constraints:** Canon precedence, determinism (stable ordering, no timestamps), napkin patterns; no FORAWWV edits.

---

## 1. Goal and Four Requirement Areas

| # | Requirement | Brief |
|---|-------------|--------|
| 1 | **Visible formations** | Units (brigades/corps) visible on the HoI 3D map. Current gap: `map_hoi` never calls `setFormations`; renderer needs `getWorldPositionForSettlement` (or equivalent) so map_hoi can build `FormationMarkerInput[]` from loaded state. |
| 2 | **Click on unit → show its ZoC** | When the player clicks a formation (brigade), display that formation’s Zone of Control (neighboring OSIDs in the operational contact graph). ZoC overlay already exists as layer F6 on HoIMapRenderer; new behavior is **selection-driven**: show ZoC only for the selected formation. |
| 3 | **Click on corps → lines to brigades + all their ZoCs** | When the player clicks a corps: (a) draw lines from the corps (or a reference point) to each subordinate brigade; (b) draw ZoC for every subordinate brigade (combined view). |
| 4 | **3D terrain as a challenge** | Formations, ZoC fills, and lines must sit correctly on 2.5D terrain (heightmap, tilt, yaw). Topics: placement (OSID centroid + height sampling), ZoC polygon draping vs flat overlay, line geometry (terrain-following vs straight in world space), performance with many formations and ZoC polygons, and technical risks or alternatives. |

**Context:** Canonical map = HoI 3D (`map_hoi.html`). TACTICAL_MAP_SYSTEM §2, §2.1; ORCHESTRATOR_VISIBLE_FORMATIONS_ON_MAP_2026_02_23.md; HOI_VISUAL_GUI_OVERHAUL_SPEC §2.4; 20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md.

---

## 2. Role Questions (Convened)

### Technical Architect
- **Data flow and placement API:** Should the renderer expose a single `getWorldPositionForSettlement(osidOrSid: string): [x, y, z] | null` (using existing `centroidBySid`, heightmap `sampleHeight`, and `wgsToWorld`), or do we want a separate “formation placement service” that map_hoi and other callers use? What is the minimal contract so map_hoi can build formation markers without duplicating centroid/height logic?
- **Selection-driven ZoC and corps lines:** Should “selected formation ZoC” and “corps subordinate lines + multi-ZoC” be implemented as (a) renderer-only (renderer holds selection and rebuilds ZoC/lines from adapter data), or (b) map_hoi holds selection and calls renderer APIs like `setSelectionFormationZoc(osids[])` / `setCorpsLines(segments[])`? What ownership keeps state and rendering coherent and testable?

### Graphics Programmer
- **Terrain-draping vs flat ZoC:** Current ZoC layer (F6) uses polygon vertices with `sampleHeight` + `wgsToWorld` and a small Y-offset (0.004). For selection-driven ZoC (one formation’s neighbors), should we keep this **draped** approach (vertices sampled on terrain) or allow a **flat overlay** at a fixed Y for simplicity? What are the trade-offs for depth order and tilt (e.g. 35° camera)?
- **Line geometry (corps → brigade):** For lines from corps to subordinates, should we use (a) **straight segments in world space** (corps position → brigade position, both with sampled height), or (b) **terrain-following** (multiple segments along terrain)? What is the recommended approach for performance and visual clarity with ~5–15 brigades per corps?

### UI/UX Developer
- **Selection model and layer toggles:** Formation selection on HoI 3D is currently settlement-only (raycast on control mesh). For “click on unit → show ZoC,” we need formation hit-test (e.g. raycast vs formation sprites or a formation hit proxy). Should formation selection live in map_hoi (state) and drive both sidebar/panel and renderer (ZoC/lines), with a single “selected formation id” that can be brigade or corps? How should F6 (ZoC layer) behave when selection-driven: F6 = “global ZoC” when nothing selected, and “selected formation ZoC only” when a formation is selected, or a separate toggle?
- **Corps vs brigade feedback:** When the player clicks a corps, we show lines to brigades + combined ZoC. Should the corps “counter” itself be visually distinct (e.g. highlight, pulse) and should brigades be visually emphasized (e.g. ring or tint) so the relationship is obvious?

### Gameplay Programmer
- **ZoC data source and per-formation ZoC:** Engine already has `computeZoCState`, `computeEnemyZocOsidsForFaction`, and `buildOsidAdjacency`. For “ZoC of this brigade,” the set is simply **adjacency.get(formation.location_osid)** (neighbors in operational_contact_graph). Should we (a) expose this from the engine (e.g. a small helper or a query that returns `zocOsidsByFormationId` for the UI), or (b) have the UI load `operational_contact_graph.json` and compute adjacency client-side, then derive per-formation ZoC from `formation.location_osid`? What is the preferred single source of truth and where does determinism need to be guaranteed?
- **Corps subordinate list:** Corps → brigade list is already in adapter (`subordinateIds`, `corps_command`). For corps lines + multi-ZoC, map_hoi/renderer need formation positions and per-brigade ZoC sets. Confirm that adapter + contact graph (or engine query) is sufficient and no new pipeline output is required.

### Product Manager
- **Phasing and scope:** How should we phase the work: (1) Visible formations only, (2) then selection-driven ZoC (brigade click), (3) then corps lines + multi-ZoC (corps click)? Or combine (2) and (3) into one “selection-driven ZoC and corps lines” slice? What is the minimal shippable increment for “visible formations + selection-driven ZoC” that delivers value without blocking on corps lines?
- **Acceptance criteria:** What are the acceptance criteria for “visible formations,” “click brigade → ZoC,” and “click corps → lines + ZoCs” (e.g. default layer state, performance with N formations, behavior when no selection)?

---

## 3. Synthesis

### 3.1 3D Terrain Challenges and Agreed Mitigations

| Challenge | Mitigation |
|-----------|------------|
| **Formation placement** | Use OSID (or SID) centroid from existing `centroidBySid` + heightmap `sampleHeight` + `wgsToWorld`. Renderer already has all inputs; expose `getWorldPositionForSettlement(osidOrSid)` so map_hoi does not duplicate logic. Deterministic: same OSID always yields same world position. |
| **ZoC polygon on terrain** | Keep **draped** approach: ZoC polygons built from operational feature geometry, each vertex with `sampleHeight(lon, lat)` then `wgsToWorld`. Current buildZocLayer already does this (SUBDIV, small Y-offset 0.004). For selection-driven ZoC, reuse the same vertex construction; only the set of OSIDs changes (single formation’s neighbors vs enemyZocByFaction). |
| **ZoC depth and tilt** | Use `polygonOffset` and a small Y-offset (e.g. 0.004–0.005) so ZoC sits just above terrain and does not z-fight. Keep `depthTest: true` if we want ZoC occluded by terrain at steep tilt; current F6 uses `depthTest: false` for visibility — for selection-driven ZoC we can match that or tighten for consistency with control layer. |
| **Corps–brigade lines** | Use **straight segments in world space**: from corps position (centroid + height) to each subordinate brigade position (centroid + height). No terrain-following for v1; simpler and performant. If terrain-following is needed later, it can be a follow-up (spline or stepped segments). |
| **Performance** | Formation count is bounded (tens to low hundreds). ZoC for one formation = one mesh (few OSIDs). Corps lines = one line per subordinate (e.g. 5–15). No change to global ZoC layer (F6) when selection-driven view is active; either show global or selection ZoC, not both at once, to avoid duplicate geometry. |
| **Risks** | (1) Formation sprite raycast: need hit-test on formation sprites or a dedicated hit proxy (e.g. invisible quads at formation positions) so “click on unit” works. (2) Corps “position”: corps may not have `location_osid`; use centroid of subordinates or a designated corps HQ OSID per canon/adapter. |

### 3.2 Concrete Recommendations (Ordered Steps)

1. **Renderer: placement API**  
   Add `getWorldPositionForSettlement(osidOrSid: string): [number, number, number] | null` to `HoIMapRenderer`, using `centroidBySid`, `sampleHeight`, and `wgsToWorld`. Return null if OSID/SID not in map. Deterministic; no new state.

2. **map_hoi: wire formation markers**  
   In `applyStateJson` (and when applying pending data after renderer init), build `FormationMarkerInput[]` from `loaded.formations`: for each formation, resolve position via `location_osid` or `hq_sid` → `renderer.getWorldPositionForSettlement(...)`. Sort formations by id before building markers. Call `renderer.setFormations(markers)`. Formation layer (F4) remains as-is (default on when state has formations if desired).

3. **Formation selection (hit-test)**  
   Add formation hit-test: either raycast against formation sprites (if Three.js raycast supports sprites) or maintain a small invisible mesh/proxy per formation at the same world position and raycast that. On click, if a formation is hit, set “selected formation id” in map_hoi state; if settlement is hit, keep current settlement selection behavior. Clear formation selection when clicking empty space or when switching to “no selection” mode if we add one.

4. **Per-formation ZoC data**  
   **Option A (recommended):** map_hoi (or a small helper) loads `operational_contact_graph.json` once, builds `Map<Osid, Osid[]>` adjacency (sorted neighbors). For a selected brigade, ZoC = `adjacency.get(formation.location_osid)` ?? []. No engine change.  
   **Option B:** Engine or desktop query exposes `zocOsidsForFormation(formationId)` or `osidAdjacency` in the state/adapter so UI does not load the graph. Prefer Option A for minimal contract and reuse of existing static graph.

5. **Selection-driven ZoC (brigade)**  
   When selected formation is a **brigade**, compute its ZoC OSIDs (neighbors of `location_osid`). Add renderer API e.g. `setSelectionZocOsids(osids: string[], factionId: string)` that builds a single ZoC mesh for that OSID set (same draped construction as buildZocLayer, one faction color). When no formation selected or selection is a corps, `setSelectionZocOsids([], null)` clears it. F6 layer toggle can show “global ZoC” when selection ZoC is empty, or we keep F6 for global and add a separate “Selection ZoC” that is shown when a brigade is selected (no F6 change required for v1).

6. **Corps lines + multi-ZoC (corps click)**  
   When selected formation is a **corps**: (a) Get subordinate brigade IDs from adapter. (b) Resolve world positions for corps (e.g. centroid of subordinates’ OSIDs, or first subordinate’s position) and each subordinate. (c) Call renderer to draw lines: e.g. `setCorpsBrigadeLines(segments: { from: [x,y,z], to: [x,y,z] }[])`. (d) Compute ZoC = union of ZoC of each subordinate (neighbors of each `location_osid`), then call `setSelectionZocOsids(combinedOsids, factionId)`. Renderer draws one ZoC mesh for the combined set and line segments for corps→brigade.

7. **Determinism and ordering**  
   Formation list sorted by id before building markers. ZoC OSID lists sorted (e.g. localeCompare) before building mesh. Corps subordinate order from adapter (already deterministic). No timestamps or random in any of the above.

8. **Docs and ledger**  
   Update TACTICAL_MAP_SYSTEM §2 / §2.1 to state that formation markers are wired on map_hoi via `getWorldPositionForSettlement` and `setFormations`, and that selection-driven ZoC and corps lines are implemented per this convene. When implementation is done, add a PROJECT_LEDGER entry for the behavior change (visible formations, selection ZoC, corps lines). No ledger update required for the convene itself unless the team adopts a new architectural decision (e.g. “ZoC is always terrain-draped”) to be recorded.

### 3.3 Single Priority and Handoff

- **Single priority:** Implement **visible formation markers** on the HoI 3D map first (steps 1–2): add `getWorldPositionForSettlement` on the renderer and wire `setFormations` in map_hoi from loaded state. This unblocks the map from showing units and is the foundation for selection and ZoC.
- **Next:** Formation selection (step 3), then selection-driven ZoC for brigade (steps 4–5), then corps lines + multi-ZoC (step 6).
- **Handoff:** **Graphics Programmer** for renderer: `getWorldPositionForSettlement`, and (later) `setSelectionZocOsids`, `setCorpsBrigadeLines`, formation hit-test support. **UI/UX Developer** or **Gameplay Programmer** for map_hoi: build formation markers, hold selection state, load contact graph for ZoC derivation, call new renderer APIs. **Product Manager** to confirm phasing (formations → brigade ZoC → corps lines) and acceptance criteria.

---

## 4. Concrete Recommendations (Checklist / Ticket List)

Use this section as a checklist or ticket list.

- [ ] **R1** — Add `getWorldPositionForSettlement(osidOrSid: string): [number, number, number] | null` to HoIMapRenderer (centroidBySid + sampleHeight + wgsToWorld).
- [ ] **R2** — In map_hoi, on state load / applyStateJson, build FormationMarkerInput[] from loaded.formations (position via getWorldPositionForSettlement); sort by formation id; call renderer.setFormations(markers).
- [ ] **R3** — Add formation hit-test (raycast vs sprites or hit proxy); on formation click set selected formation id in map_hoi state.
- [ ] **R4** — Load operational_contact_graph in map_hoi (or helper); build adjacency Map<Osid, Osid[]>; for selected brigade, ZoC = adjacency.get(location_osid) ?? [].
- [ ] **R5** — Add renderer API setSelectionZocOsids(osids, factionId); build single draped ZoC mesh; clear when osids empty or selection cleared.
- [ ] **R6** — When corps selected: resolve corps reference position and subordinate positions; add setCorpsBrigadeLines(segments); compute union of subordinate ZoCs and call setSelectionZocOsids(combined, factionId).
- [ ] **R7** — Ensure determinism: formation sort by id; ZoC OSID sort; no timestamps.
- [ ] **R8** — Update TACTICAL_MAP_SYSTEM §2/§2.1; add PROJECT_LEDGER entry when implementation is complete.

---

## 5. Ledger and Report Index

- **PROJECT_LEDGER / PROJECT_LEDGER_KNOWLEDGE:** No ledger update required for this convene. When the recommended work (visible formations, selection-driven ZoC, corps lines) is implemented, append a ledger entry describing the behavior and pointing to this convene and the implementation report.
- **Reports:** This convene is listed in docs/40_reports/README.md §2 (convenes/). CONSOLIDATED_BACKLOG or CONSOLIDATED_IMPLEMENTED should be updated when the work is scheduled or completed per reports-custodian workflow.

---

*Convene produced by Orchestrator; no canon or FORAWWV edits.*
