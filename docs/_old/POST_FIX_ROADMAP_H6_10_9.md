# Post-fix roadmap (Phase H6.10.9)

Actionable next-steps roadmap after the NW overlap/placement bug is fixed. Planning-only; no substrate or viewer logic changes in this phase.

## 1. Current state (post-fix assumption)

Assuming the NW overlap bug is fixed, the following holds:
- Geometry is canonical in `data/derived/settlements_substrate.geojson`.
- NW files coordinate regime is settled (FORCE_VIEWBOX_OFFSET_FILES in derive script; legacy-anchored chooser per G4).
- Bužim retag is viewer-only (Phase H6.10.5); canonical substrate is never overwritten.
- Census is authoritative for membership and names; 1990 composites are derived via explicit aggregation (Cazin(1990) = Cazin + Bužim).

## 2. Immediate verification tranche

### Phase H6.10.9a — Deterministic overlap/intersection audit

**Objective:** Detect overlaps/intersections between NW settlements and the rest of the map; diagnostics only, no corrections.
**Inputs:** `data/derived/settlements_substrate.geojson`, grouping by `source_file` or `municipality_id` (Bihać, Cazin, Bužim, Velika Kladuša).
**Dependencies:** scripts/map/phase_h6_10_8_audit_nw_geometry_overlap.ts (extend or run); stripTimestampKeysForArtifacts for outputs.
**Work items:**
- [ ] Extend H6.10.8 or add script that computes bbox/polygon overlap between NW and non-NW features.
- [ ] Emit deterministic `data/derived/_debug/nw_overlap_audit_h6_10_9a.json` and `.txt`.
- [ ] No timestamps in outputs; stable sort by sid or feature key.
**Acceptance criteria:** Audit runs deterministically; overlap pairs ranked; no substrate writes.
**Validation commands:**
```
npm run map:contracts:validate
npm run typecheck
npm test
npm run map:contracts:determinism
```
**Commit discipline:** `git commit -m "Phase H6.10.9a — Deterministic NW overlap audit"`
**Risks:** OneDrive file lock on substrate may block determinism; mixed coordinate regimes if grouping logic wrong.

### Phase H6.10.9b — Viewer sanity checklist

**Objective:** Avoid "cache illusions" when verifying viewer fixes; documented procedure only.
**Inputs:** None (no new script).
**Work items:**
- [ ] Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) before checking overlay changes.
- [ ] Confirm serve root: `cd data/derived && npx http-server -p 8080` or `cd data/derived/substrate_viewer && npx http-server -p 8080`.
- [ ] Check "Resolved URLs" in viewer sidebar; geometry and overlay paths must resolve correctly.
- [ ] Confirm overlay load status: "loaded (n features)" or "ERROR (see console)" under each debug checkbox.
- [ ] Run layer sanity key ("L") to log pan/zoom, load status, and lastDrawCount per layer.
**Acceptance criteria:** Checklist is in this doc; users can follow it without guessing.
**Validation commands:** N/A (doc-only).
**Commit discipline:** Bundled with H6.10.9 or H6.10.9b commit.
**Risks:** Browser cache, service-worker cache; wrong serve root yields 404s for overlays.

## 3. Generalization tranche

### Phase H6.11 — Derived tag layers system

**Objective:** Generalize the H6.10.5 pattern into a toggleable, auditable mechanism for census-derived municipality_id corrections.
**Inputs:** `data/source/bih_census_1991.json`, `data/derived/settlements_substrate.geojson` (read-only), correction map schema (census_id → mun1990_id).
**Dependencies:** phase_h6_10_5_build_municipality_id_corrections_nw.ts, phase_h6_10_5_apply_municipality_id_corrections_in_viewer.ts.
**Work items:**
- [ ] Formalize correction map schema (feature_key → corrected_municipality_id).
- [ ] Define viewer integration pattern: load corrections, apply in render only, never write to substrate.
- [ ] Add audit trail: substrate_sha256, census_sha256, corrected count, missing_census_ids.
- [ ] Document in FORAWWV: census-derived tag corrections are viewer/derived transforms only.
**Acceptance criteria:** Schema documented; pattern repeatable for future tagging corrections.
**Validation commands:** map:contracts:validate, typecheck, npm test, map:contracts:determinism.
**Commit discipline:** `git commit -m "Phase H6.11 — Derived tag layers system"`
**Risks:** Schema drift; corrections applied in wrong order.

### Phase H6.12 — Lock substrate municipality_id as non-authoritative

**Objective:** Explicit policy and enforcement points; mechanics must not rely on substrate `municipality_id` for spatial logic.
**Inputs:** FORAWWV.md, code consuming substrate (sim, political control init, viewers).
**Dependencies:** H6.10.5 pattern established; census authority.
**Work items:**
- [ ] Document authority chain: census → settlements_index_1990 → overlay corrections → substrate (display only).
- [ ] Add enforcement checks where substrate is consumed: warn or fail if municipality_id used for mechanics.
- [ ] Update FORAWWV with "substrate municipality_id non-authoritative for mechanics" rule.
**Acceptance criteria:** Policy documented; enforcement points identified; no mechanics consume substrate municipality_id for spatial decisions.
**Validation commands:** map:contracts:validate, typecheck, npm test, map:contracts:determinism.
**Commit discipline:** `git commit -m "Phase H6.12 — Lock substrate municipality_id as non-authoritative"`
**Risks:** Over-constraining; breaking existing logic that incorrectly relied on substrate tags.

### Phase H6.13 — Standard debug overlay patterns (SID-anchored)

**Objective:** Reinforce H6.9.4; all debug overlays SID-anchored; no viewBox math in overlay derivation.
**Inputs:** build_substrate_viewer_index.ts, phase_h6_9_4_build_nw_overlays_from_substrate.ts, phase_h6_10_2_build_nw_triad_overlays_from_census.ts.
**Dependencies:** H6.9.4 SID-anchored overlays; FORAWWV §VII.1.
**Work items:**
- [ ] Audit existing overlays: H6.9.4 NW provenance, H6.9.5 mismatch, H6.9.8 census, H6.10.0 composites, H6.10.2 triad, H6.10.3 bboxes, H6.10.4 ordering invariants.
- [ ] Ensure each overlay derives geometry from substrate SIDs or census_id→substrate join; no donor-coordinate transforms.
- [ ] Codify pattern: overlay geometry = union of substrate polygons for selected SIDs; worldToScreen only.
**Acceptance criteria:** No overlay uses viewBox-based transform; all derive from substrate or census+substrate join.
**Validation commands:** map:contracts:validate, typecheck, npm test, map:contracts:determinism.
**Commit discipline:** `git commit -m "Phase H6.13 — Standard debug overlay patterns SID-anchored"`
**Risks:** Some overlays may require donor coords for diagnostics; balance with FORAWWV.

## 4. Georeferencing tranche (optional, deferred)

**G1 summary:** Phase G1 established `bbox_affine_seed` for substrate→WGS84 transform. Substrate is SVG/pixel space (~-39..940 x ~-9..910); ADM0/ADM3 GeoBoundaries are WGS84. Deterministic overlay pack + debug viewer (port 8081) produced for visual alignment. Scripts: `scripts/map/geo/phase_g1_geoboundaries_audit.ts`, `phase_g1_overlay_pack.ts`.
**G2 definition:** Phase G2 would apply a validated transform to the canonical pipeline. Requires FORAWWV addendum per G1 ledger note. WGS84 alignment would be opt-in; transform outputs are separate from canonical substrate.
**Constraint:** WGS84 transform is a *separate, opt-in* pipeline. It must NOT rewrite canonical `settlements_substrate.geojson`. Any WGS84-aligned outputs live in derived/geo or _debug, not in canonical substrate path.

## 5. Mechanics unblock tranche

**Map correctness gates before H7.x (roads/rivers/infrastructure friction):**
- [ ] Substrate canonical; contracts validate; determinism passes.
- [ ] Overlap audit (H6.10.9a) clean or explicitly documented.
- [ ] Bužim correction applied in viewer when "Use corrected municipality_id tags" is ON.
- [ ] NW ordering invariants (H6.10.4) pass for Bihać, Cazin, Velika Kladuša; Bužim cannot_evaluate until geometry present.
**Displacement modeling (future):** Depends on stable SID and census_id; join semantics via census; municipality_id used for display only, not mechanics. Settlement-level and municipality-level displacement both require stable identifiers and explicit join semantics.

## 6. Definition of done for map correctness milestone

**"Map is no longer misleading":**
- NW overlap fixed; no NW geometry incorrectly overlapping rest-of-map.
- Overlays align with substrate; SID-anchored; no viewBox transform drift.
- Bužim retag visible when viewer correction checkbox enabled; 7 settlements correctly attributed.
- No silent fixes; all corrections auditable and toggleable.
**Safe viewer modes:**
- Substrate base (settlements)
- Terrain scalars (elevation, slope, road_access, river_crossing, terrain_friction)
- Ethnicity
- Municipality ID (post-1995), with corrected tags when enabled
- 1990 composites (Bihać, Cazin+Bužim)
- NW triad overlays (post-1995, 1990 composites)
- Debug overlays: H6.9.4 NW provenance, H6.9.5 mismatch, H6.10.3 bboxes, H6.10.4 ordering invariants

## 7. Open questions to resolve

- OneDrive file lock on `settlements_substrate.geojson` blocking `map:contracts:determinism`; re-run when unlocked before commit.
- Any remaining NW geometry defect requiring substrate-level change (vs viewer-only correction); H6.10.8 audit informs.

## Validation chain (mandatory)

For every phase that modifies code or derived artifacts:
```
npm run map:contracts:validate
npm run typecheck
npm test
npm run map:contracts:determinism
```
Stop on first failure. Do not commit if determinism fails due to file lock; re-run when substrate is unlocked.

## Commit discipline

Phase-labeled commits; stage only files specified in phase scope:
```
git add docs/POST_FIX_ROADMAP_H6_10_9.md docs/PROJECT_LEDGER.md
git commit -m "Phase H6.10.9 — Post-fix roadmap planning doc"
```

## Risks and failure modes

- **OneDrive locks:** `settlements_substrate.geojson` may be locked; defer `map:contracts:determinism` and commit until unlocked.
- **Caching:** Browser or service-worker cache can show stale overlays; use hard refresh and serve-root checklist.
- **Mixed coordinate regimes:** Overlay transforms must stay SID-anchored; no viewBox math in overlay derivation.
- **Overlay transforms:** All overlays in substrate SVG coords; per-layer transforms only when explicitly declared (e.g. G2 debug).
