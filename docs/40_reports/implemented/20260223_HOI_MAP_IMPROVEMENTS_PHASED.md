# HoI Map Improvements — Phased Implementation

**Date:** 2026-02-23  
**Status:** Completed  
**Plan:** HoI Map Improvements Phased (Orchestrator-owned); ORCHESTRATOR_HOI_MAP_IMPROVEMENT_PROPOSALS_2026_02_23

---

## 1. Summary

All five improvement areas from the Orchestrator convene were implemented in order, with refactor-pass and verification after each phase. **Front line definition:** Fronts are **not** restricted to "where we have units"; full hostile boundary (frontEdgesOsid / front_edges) is drawn so user/bot can assign units to fronts in later iterations.

| Phase | Area | Outcome |
|-------|------|--------|
| 1 | Map + GUI layout | Option C: map container only growing flex child; `gap: 0` on `.hoi-main`; documented in TACTICAL_MAP_SYSTEM §2. |
| 2 | Terrain smoothing | Shared `smoothHeightmap()` in `terrain/heightmapSmooth.ts`; HoIMapRenderer applies (2, 2) after heightmap load, before buildTerrainMesh; deterministic, in-place. |
| 3 | Left–right tilt (yaw) | Orbit yaw ±30°; middle-drag horizontal = yaw, Shift+right-drag horizontal = fallback; left = pan, right vertical = pitch; Home resets yaw. |
| 4 | Zoom/labels resolution | Label LOD: zoom &lt; DEFAULT_ZOOM/1.4 uses 256×64 texture, 18px font; else 128×32, 14px. Rebuild when zoom crosses threshold. |
| 5 | Front line style | HoI spec: neutral band rgba(80,60,40,0.6), dark center line rgba(40,30,20,0.8), zoom-scaled width, asymmetric (wider on player-faction side). **No** "where units" filter. |

---

## 2. Architect decisions (flagged for user)

- **Phase 4 — Label LOD threshold:** Chose **1.4×** default zoom (DEFAULT_ZOOM/1.4) as the threshold above which we use higher-res label texture (256×64, 18px). Below that, standard 128×32, 14px. *Flag: if you prefer a different multiplier (e.g. 1.3× or 1.5×), adjust LABEL_LOD_ZOOM_THRESHOLD.*
- **Phase 5 — "Friendly" for asymmetric front band:** **Friendly = player faction** (playerFaction). When set, the half-band toward that faction’s side is 1.25× width, the other 0.75×. When no player faction, symmetric (treated as friendly toward side_a). *Flag: confirm player-faction as the intended definition for "color in more" on the HoI map.*

---

## 3. Changes by phase

### Phase 1 — Map + GUI layout

- **styles_hoi.css:** `.hoi-main` already had flex and overflow; added explicit `gap: 0` so map fills without gap.
- **TACTICAL_MAP_SYSTEM §2:** Layout bullet already documented Option C; no structural change.

### Phase 2 — Terrain smoothing

- **terrain/heightmapSmooth.ts:** New shared module; `smoothHeightmap(hm, passes, radius)` box-blur in-place (same algorithm as map_operational_3d).
- **HoIMapRenderer.ts:** Import smoothHeightmap; after heightmap load and validation, call `smoothHeightmap(this.heightmap, 2, 2)` before buildTerrain().
- **TACTICAL_MAP_SYSTEM §2:** Terrain smoothing bullet added (shared contract, in-place, no cross-run variance).

### Phase 3 — Left–right tilt (yaw)

- **HoIMapRenderer.ts:** MIN_YAW_DEG / MAX_YAW_DEG ±30°; private `yaw`, `isYawing`; updateCamera() computes camera position from (pan, tilt, yaw) with horizontal orbit; middle-drag → yaw, Shift+right-drag horizontal → yaw fallback; Home resets yaw; init camera position uses yaw.
- **TACTICAL_MAP_SYSTEM §2:** Yaw interaction and limits documented.

### Phase 4 — Zoom and label resolution

- **HoIMapRenderer.ts:** LABEL_LOD_ZOOM_THRESHOLD = DEFAULT_ZOOM/1.4; `_lastLabelInput`, `_labelLodHighRes`; setLabels() stores input and calls rebuildLabelSprites(); rebuildLabelSprites() uses high-res (256×64, 18px) or standard (128×32, 14px) by zoom band; updateCamera() rebuilds labels when zoom crosses threshold.
- **TACTICAL_MAP_SYSTEM §2:** Label LOD bullet added.

### Phase 5 — Front line style (no "where units" filter)

- **HoIMapRenderer.ts:** setFrontEdges() already implemented HoI style (neutral band, center line, zoom-scaled width, asymmetric by playerFaction). No adapter or renderer filter by formation presence; map_hoi passes full frontEdgesOsid/frontEdges.
- **TACTICAL_MAP_SYSTEM §2:** Front line bullet added (full hostile boundary; unit assignment later iteration).

---

## 4. Refactor-pass and verification

- After each phase: no dead code introduced; single code paths (camera state, label LOD band, front ribbon build).
- Verification: `npx tsc --noEmit`, `npx vitest run` (154 passed, 13 skipped).

---

## 5. References

- ORCHESTRATOR_HOI_MAP_IMPROVEMENT_PROPOSALS_2026_02_23
- HOI_VISUAL_GUI_OVERHAUL_SPEC §2.3, §9.1
- TACTICAL_MAP_SYSTEM §2 (map_hoi, layout, terrain smoothing, yaw, labels, front style)
- 20260223_HOI_MAP_3D_TILT_AND_TEXTURE_ON_TERRAIN.md
