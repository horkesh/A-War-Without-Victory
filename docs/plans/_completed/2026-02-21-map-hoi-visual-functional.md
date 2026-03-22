# Map HoI — Visual Functional Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the map_hoi entrypoint visually functional — working zoom/pan, auto-loaded political control, settlement borders, hover tooltips — so the operational settlement clustering arrangement can be inspected.

**Architecture:** Fix the existing WebGL renderer (ortho frustum scaling, camera controls), add a file loader + auto-load of `latest_run_final_save.json`, render settlement borders and political control fills, add a settlement hover tooltip for inspection. If WebGL polygon draping proves unreliable, fall back to enhanced 2D canvas. All changes are visual/UI only — no simulation files modified.

**Tech Stack:** Three.js (existing), Canvas 2D (fallback), vanilla DOM/CSS (existing HoI components).

**Key References:**
- Spec: `docs/30_planning/20260221_settlement remapping and GUI rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md`
- Renderer: `src/ui/map/renderer/HoIMapRenderer.ts`
- Entrypoint: `src/ui/map/map_hoi.ts`
- HTML: `src/ui/map/map_hoi.html`
- CSS: `src/ui/map/styles_hoi.css`
- Components: `src/ui/map/map_hoi/` (HoIMapState, TooltipLayer, etc.)
- Placeholder: `src/ui/map/map_hoi/MapPlaceholder.ts`
- Adapter: `src/ui/map/data/GameStateAdapter.ts` (`parseGameState`)
- State transform: `src/ui/map/map_hoi/loadedStateToHoIState.ts`
- Operational GeoJSON: `data/derived/operational/operational_settlements.geojson` (3,295 features)
- Heightmap: `data/derived/terrain/heightmap_3d_viewer.json` (1024x1024, bbox [15.62, 42.46, 19.72, 45.37])
- Latest save: `data/derived/latest_run_final_save.json`

**World-space facts (from `wgsToWorld`):**
- WORLD_SCALE = 2.0, BIH_CENTER_LON = 17.67, BIH_CENTER_LAT = 43.915
- Terrain spans X: -4.09 to +4.11 (range 8.2), Z: -2.91 to +2.92 (range 5.83)
- Current ortho frustum: ±4 (fixed) — close to correct at strategic zoom but never changes with scroll

**Pre-flight checklist:**
- `npx tsc --noEmit` — should pass (0 errors)
- `npx vitest run` — should pass (143 tests)
- Vite dev server: `npx vite --config src/ui/map/vite.config.ts` → `http://localhost:<port>/map_hoi.html`

---

## Task 1: Fix Ortho Zoom (frustum scales with scroll wheel)

**Problem:** Scroll wheel updates `this.zoom` (camera distance) but the ortho frustum is fixed at `±4`. In orthographic projection, moving the camera closer/further has no visible effect — the frustum size must change.

**Files:**
- Modify: `src/ui/map/renderer/HoIMapRenderer.ts`

**Step 1: Fix the zoom logic**

In `HoIMapRenderer.ts`, the zoom should control the frustum size, not camera distance. Replace the fixed frustum with a zoom-dependent one.

In the constructor area, change `DEFAULT_ZOOM` semantics. Currently `DEFAULT_ZOOM = 2.5` is used as camera distance. Change it to mean frustum half-height:

```typescript
// At top of file, replace:
const DEFAULT_ZOOM = 2.5;
// With:
const DEFAULT_ZOOM = 4.5; // frustum half-height in world units (shows full BiH at ~8.2 wide terrain)
```

In `init()`, replace the camera setup (around line 196-201):

```typescript
const frustum = this.zoom;
this.camera = new THREE.OrthographicCamera(
  -frustum * aspect, frustum * aspect, frustum, -frustum, 0.01, 1000
);
const tiltRad = (TILT_DEG * Math.PI) / 180;
const camDist = 10; // fixed distance, far enough to see terrain
this.camera.position.set(this.pan.x, camDist * Math.cos(tiltRad), camDist * Math.sin(tiltRad) + this.pan.z);
this.camera.up.set(0, 1, 0);
this.camera.lookAt(this.pan.x, 0, this.pan.z);
```

Add a private method `updateCamera()` that recalculates frustum + position from current zoom/pan:

```typescript
private updateCamera(): void {
  const rect = this.container.getBoundingClientRect();
  const aspect = Math.max(1, rect.width) / Math.max(1, rect.height);
  const frustum = this.zoom;
  this.camera.left = -frustum * aspect;
  this.camera.right = frustum * aspect;
  this.camera.top = frustum;
  this.camera.bottom = -frustum;
  this.camera.updateProjectionMatrix();
  const tiltRad = (TILT_DEG * Math.PI) / 180;
  const camDist = 10;
  this.camera.position.set(this.pan.x, camDist * Math.cos(tiltRad), camDist * Math.sin(tiltRad) + this.pan.z);
  this.camera.lookAt(this.pan.x, 0, this.pan.z);
}
```

In `setupControls()`, replace the wheel handler body (lines ~547-554):

```typescript
const onWheel = (e: WheelEvent): void => {
  if (!container.contains(e.target as Node)) return;
  e.preventDefault();
  e.stopPropagation();
  const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
  this.zoom = Math.max(0.3, Math.min(10, this.zoom * factor));
  this.updateCamera();
};
```

Replace the pan mousemove handler (lines ~566-575) to call `updateCamera()`:

```typescript
el.addEventListener('mousemove', (e) => {
  if (this.isPanning) {
    const dx = (e.clientX - this.lastPointer.x) * 0.005 * this.zoom;
    const dz = (e.clientY - this.lastPointer.y) * 0.005 * this.zoom;
    this.pan.x -= dx;
    this.pan.z -= dz;
    this.updateCamera();
  }
  this.lastPointer = { x: e.clientX, y: e.clientY };
});
```

Replace the Home key handler (lines ~588-594) to call `updateCamera()`:

```typescript
if (e.key === 'Home') {
  e.preventDefault();
  this.pan = { x: 0, z: 0 };
  this.zoom = DEFAULT_ZOOM;
  this.updateCamera();
}
```

In `resize()`, replace the fixed frustum calculation (lines ~630-635) with a call to `updateCamera()`:

```typescript
resize(): void {
  const rect = this.container.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  this.renderer.setSize(w, h);
  this.lastContainerWidth = w;
  this.lastContainerHeight = h;
  this.updateCamera();
}
```

**Step 2: Verify in browser**

Run: Open `http://localhost:<port>/map_hoi.html`
- Scroll wheel should zoom in/out (terrain gets larger/smaller)
- Middle-drag should pan
- Home key should reset to full-country view
- Terrain should fill most of the map area at default zoom

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```
feat(map_hoi): fix ortho zoom — frustum scales with scroll wheel
```

---

## Task 2: Auto-Load Latest Save + File Picker

**Problem:** No game state is loaded in standalone mode — no way to see political control. Need auto-load of `latest_run_final_save.json` on startup, plus a file picker button for loading other saves.

**Files:**
- Modify: `src/ui/map/map_hoi.ts`
- Modify: `src/ui/map/map_hoi.html`

**Step 1: Add hidden file input and Load Save button to HTML**

In `map_hoi.html`, add a hidden file input and a Load Save button inside `hoi-top-bar-actions`:

```html
<div class="hoi-top-bar-actions" id="hoi-top-bar-actions">
  <input type="file" id="hoi-file-input" accept=".json" style="display:none">
</div>
```

The buttons will be rendered by `TopCommandBarComponent`, but we need the file input in the DOM. Add it right before the closing `</div>` of `hoi-top-bar-actions`.

**Step 2: Add auto-load and file picker logic to map_hoi.ts**

At the top of `init()`, after the component setup but before `renderFromState()`, add:

```typescript
// --- File picker ---
const fileInput = document.getElementById('hoi-file-input') as HTMLInputElement | null;
if (fileInput) {
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      applyStateJson(state, text, rendererRef);
    }).catch((e) => console.warn('map_hoi: file read failed', e));
    fileInput.value = '';
  });
}

// --- Auto-load latest save (standalone only — no IPC bridge) ---
if (!bridge?.getCurrentGameState) {
  const latestUrl = `${window.location.origin}/data/derived/latest_run_final_save.json`;
  fetch(latestUrl)
    .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then((text) => applyStateJson(state, text, rendererRef))
    .catch((e) => console.warn('map_hoi: auto-load latest save failed', e));
}
```

**Step 3: Wire "Load Save" button in TopCommandBarComponent**

In the `TopCommandBarComponent` constructor options, add an `onLoadSave` callback. In `map_hoi.ts`, pass:

```typescript
const topBar = new TopCommandBarComponent(topBarEl, {
  onAdvance: () => { /* existing */ },
  onMenu: () => { /* existing */ },
  onLoadSave: () => { fileInput?.click(); },
});
```

In `src/ui/map/map_hoi/TopCommandBarComponent.ts`, add the `onLoadSave` to the options interface and render a "Load Save" button in the actions area that calls it. The button should appear alongside the existing ADVANCE WEEK and Menu buttons.

**Step 4: Verify in browser**

Run: Open `http://localhost:<port>/map_hoi.html`
- On load, the latest save should auto-load (console shows no errors, top bar shows faction/turn/date, sidebar shows corps)
- "Load Save" button visible in top bar actions
- Clicking "Load Save" opens file picker; selecting a JSON loads it

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 6: Commit**

```
feat(map_hoi): auto-load latest save on startup, add Load Save file picker
```

---

## Task 3: Political Control Fills (faction colors on settlements)

**Problem:** With a save loaded, `setControlBySettlement` is called but all settlements render as `NULL_COLOR` because the control lookup uses `osid` keys but the save file's `political_controllers` uses canonical `sid` keys (e.g. `S100013`). The operational settlements GeoJSON has both `sid` and `osid` in properties. Need to build a mapping from canonical SID → OSID so control lookups work, OR pass control keyed by canonical SID and look up by `sid` property (which already exists on each feature).

**Files:**
- Modify: `src/ui/map/renderer/HoIMapRenderer.ts`

**Step 1: Fix control color lookup**

In `buildControlLayer()`, the lookup currently does:
```typescript
const osid = feature.properties?.osid ?? feature.properties?.sid ?? '';
const controller = osid ? (this.controlBySettlement[osid] ?? null) : null;
```

The save file keys `political_controllers` by canonical SID (e.g. `S100013`). The GeoJSON feature has `properties.sid = "S100013"` and `properties.osid = "op:banovici:1"`. The control map is keyed by canonical SID.

Fix: try both `sid` and `osid` as lookup keys:

```typescript
const sid = (feature.properties?.sid ?? '') as string;
const osid = (feature.properties?.osid ?? '') as string;
const controller = this.controlBySettlement[sid] ?? this.controlBySettlement[osid] ?? null;
```

**Step 2: Add a slight Y offset to control meshes to prevent z-fighting with terrain**

In `buildControlLayer()`, after computing the vertex positions for each control polygon, add a small Y offset so the control meshes render above the terrain:

```typescript
// After: positions.push(wx, wy, wz);
// Change to:
positions.push(wx, wy + 0.002, wz);
```

This puts the control polygons 0.002 world units above the terrain surface, preventing z-fighting.

**Step 3: Verify in browser**

Run: Open `http://localhost:<port>/map_hoi.html` (with auto-loaded save)
- Settlements should show faction colors: RS (red/crimson), RBiH (green), HRHB (blue)
- Uncontrolled settlements show tan/null color
- Colors should be visible over the terrain

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Commit**

```
fix(map_hoi): political control fills — lookup by canonical SID, fix z-fighting
```

---

## Task 4: Settlement Border Lines

**Problem:** No visible borders between settlements — the map is a blob of color with no spatial structure. Need thin border lines between operational settlements per HOI spec §2.2: same-faction borders at `rgba(0,0,0,0.12)` 0.5px, inter-faction borders thicker.

**Files:**
- Modify: `src/ui/map/renderer/HoIMapRenderer.ts`

**Step 1: Add border line rendering after control layer build**

Add a new method `buildBorderLines()` that creates `THREE.LineSegments` from each settlement polygon's outer ring:

```typescript
private borderLines: THREE.LineSegments[] = [];

private buildBorderLines(): void {
  for (const line of this.borderLines) {
    this.scene.remove(line);
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }
  this.borderLines = [];
  if (!this.heightmap || !this.operationalGeo?.features?.length) return;
  const hm = this.heightmap;
  const positions: number[] = [];

  for (const feature of this.operationalGeo.features) {
    const rings = getRings(feature);
    for (const ring of rings) {
      if (ring.length < 3) continue;
      for (let i = 0; i < ring.length; i++) {
        const [lonA, latA] = ring[i];
        const [lonB, latB] = ring[(i + 1) % ring.length];
        const elevA = sampleHeight(hm, lonA, latA);
        const elevB = sampleHeight(hm, lonB, latB);
        const [xA, yA, zA] = wgsToWorld(lonA, latA, elevA);
        const [xB, yB, zB] = wgsToWorld(lonB, latB, elevB);
        // Slight Y offset above control layer
        positions.push(xA, yA + 0.004, zA, xB, yB + 0.004, zB);
      }
    }
  }

  if (positions.length === 0) return;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.18,
  });
  const lines = new THREE.LineSegments(geom, mat);
  this.scene.add(lines);
  this.borderLines.push(lines);
}
```

Call `this.buildBorderLines()` at the end of `buildControlLayer()`.

Add cleanup for `borderLines` in `dispose()`.

**Step 2: Verify in browser**

Run: Open `http://localhost:<port>/map_hoi.html`
- Thin dark border lines should be visible between all operational settlements
- Borders should follow the terrain (draped via DEM sampling)
- Should not obscure faction colors

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 4: Commit**

```
feat(map_hoi): settlement border lines draped on terrain
```

---

## Task 5: Settlement Hover Tooltip (audit inspector)

**Problem:** Need to hover over a settlement on the map and see its properties (OSID, name, population, ethnic key, zone type, controller, constituent SIDs) for inspecting the clustering arrangement.

**Files:**
- Modify: `src/ui/map/renderer/HoIMapRenderer.ts` (raycasting, hover event)
- Modify: `src/ui/map/map_hoi.ts` (tooltip wiring)
- Modify: `src/ui/map/styles_hoi.css` (tooltip styling — already exists)

**Step 1: Add raycasting and hover detection to HoIMapRenderer**

Add a `Raycaster` and mouse tracking. On `mousemove`, raycast against control meshes to find which settlement the cursor is over. Emit an event or call a callback with the hovered feature properties.

Add to `HoIMapRenderer`:

```typescript
// New fields:
private raycaster = new THREE.Raycaster();
private mouse = new THREE.Vector2();
private featureByMesh: Map<THREE.Mesh, GeoJSONFeature> = new Map();
private onHoverSettlement: ((feature: GeoJSONFeature | null, screenX: number, screenY: number) => void) | null = null;

// Public setter:
setHoverCallback(cb: (feature: GeoJSONFeature | null, screenX: number, screenY: number) => void): void {
  this.onHoverSettlement = cb;
}
```

In `buildControlLayer()`, when creating each mesh, store the feature reference:

```typescript
this.featureByMesh.set(mesh, feature);
```

Clear the map at the top of `buildControlLayer()`:

```typescript
this.featureByMesh.clear();
```

In `setupControls()`, add a mousemove handler for raycasting (throttled):

```typescript
let hoverRafPending = false;
el.addEventListener('mousemove', (e) => {
  if (this.isPanning || hoverRafPending) return;
  hoverRafPending = true;
  requestAnimationFrame(() => {
    hoverRafPending = false;
    const rect = el.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.controlMeshes, false);
    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const feature = this.featureByMesh.get(mesh) ?? null;
      this.onHoverSettlement?.(feature, e.clientX, e.clientY);
    } else {
      this.onHoverSettlement?.(null, 0, 0);
    }
  });
});
```

NOTE: This mousemove handler must be a SEPARATE listener from the existing pan handler. The existing pan handler updates `this.lastPointer` — keep it. Add this new one alongside it.

**Step 2: Wire tooltip in map_hoi.ts**

After the renderer is initialized (`if (ok) { ... }`), create a tooltip element and wire the hover callback:

```typescript
const tooltipEl = document.createElement('div');
tooltipEl.className = 'hoi-tooltip';
tooltipEl.style.display = 'none';
document.body.appendChild(tooltipEl);

renderer.setHoverCallback((feature, sx, sy) => {
  if (!feature) {
    tooltipEl.style.display = 'none';
    return;
  }
  const p = feature.properties ?? {};
  const ctrl = rendererRef.current
    ? (state.getSnapshot() as any)?.controlBySettlement?.[p.sid as string] ?? '—'
    : '—';
  // Build from the loaded control map
  const controlMap = renderer['controlBySettlement'] as Record<string, string | null>;
  const controller = controlMap[p.sid as string] ?? controlMap[p.osid as string] ?? '—';
  const constituents = (p.constituent_sids as string[] | undefined) ?? [];

  tooltipEl.innerHTML = `
    <div class="hoi-tooltip-title">${p.settlement_name ?? p.osid ?? '?'}</div>
    <div class="hoi-tooltip-row">OSID: ${p.osid ?? '—'}</div>
    <div class="hoi-tooltip-row">SID: ${p.sid ?? '—'}</div>
    <div class="hoi-tooltip-row">Municipality: ${p.mun1990_name ?? '—'}</div>
    <div class="hoi-tooltip-row">Controller: ${controller}</div>
    <div class="hoi-tooltip-row">Population: ${(p.population_total as number)?.toLocaleString() ?? '—'}</div>
    <div class="hoi-tooltip-row">Ethnic key: ${p.ethnic_key ?? '—'}</div>
    <div class="hoi-tooltip-row">Constituents: ${constituents.length <= 5 ? constituents.join(', ') : `${constituents.length} SIDs`}</div>
  `;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = `${sx + 12}px`;
  tooltipEl.style.top = `${sy + 12}px`;
});
```

Also pass the control map through to the tooltip. Since `controlBySettlement` is private, add a public getter to `HoIMapRenderer`:

```typescript
getControlBySettlement(): Record<string, string | null> {
  return this.controlBySettlement;
}
```

Then in the tooltip callback, use `renderer.getControlBySettlement()` instead of accessing the private field.

**Step 3: Verify in browser**

Run: Open `http://localhost:<port>/map_hoi.html` (with auto-loaded save)
- Hover over a settlement → tooltip appears showing OSID, SID, municipality, controller faction, population, ethnic key, constituent SIDs
- Move mouse away → tooltip hides
- Tooltip doesn't block clicks or interfere with pan/zoom

**Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 5: Commit**

```
feat(map_hoi): settlement hover tooltip with audit properties
```

---

## Task 6: Remove Stale Label Sprites (the white fragments)

**Problem:** The white line fragments on the map are label sprites created during init. With no game state, they render as tiny white text scraps. They should not render when empty/no data. Also, formation sprites and labels should only be created when actual data is provided.

**Files:**
- Modify: `src/ui/map/renderer/HoIMapRenderer.ts`
- Modify: `src/ui/map/map_hoi.ts`

**Step 1: Check if labels/formations are being populated at init**

Review `map_hoi.ts` — `setLabels` and `setFormations` are NOT called in init. These sprites come from the `buildControlLayer` or some leftover. Actually, looking at the renderer more carefully, these might be the small polygon edge segments at the edges of the BiH terrain that look like white fragments.

If the issue is from the `setLabels` call with operational settlement names, search for any call to `renderer.setLabels()` in `map_hoi.ts`. If none exists, the white fragments are probably artifact edges of the terrain mesh or tiny control polygons at the boundary. In that case, this task is about confirming and potentially skipping.

Check in `map_hoi.ts` and `loadedStateToHoIState.ts` for any `setLabels` or `setFormations` call. If found, gate them behind having actual data. If not found, the white fragments are terrain edge artifacts — note this and move on.

**Step 2: Commit (if changes made)**

```
fix(map_hoi): gate label/formation rendering on actual data presence
```

---

## Task 7: 2D Canvas Fallback (if WebGL draping is unreliable)

**Problem:** If Tasks 3-4 produce visual artifacts (broken triangulation, z-fighting, polygon soup) with 3,295 features, fall back to an enhanced 2D canvas renderer that uses the existing MapPlaceholder pattern but with faction colors and borders.

**This task is CONDITIONAL — only execute if WebGL results from Tasks 3-4 are visually broken.**

**Files:**
- Modify: `src/ui/map/map_hoi/MapPlaceholder.ts`
- Modify: `src/ui/map/map_hoi.ts`

**Step 1: Enhance MapPlaceholder to accept control data**

Add a `setControlBySettlement(control: Record<string, string|null>)` method to the placeholder module that stores the control map and redraws with faction colors:

```typescript
const FACTION_FILLS: Record<string, string> = {
  RS: 'rgba(178, 60, 60, 0.75)',
  RBiH: 'rgba(65, 145, 80, 0.75)',
  HRHB: 'rgba(55, 115, 175, 0.75)',
};
const NULL_FILL = 'rgba(180, 170, 150, 0.30)';
```

In `draw()`, look up each feature's controller from the stored control map and use the faction fill color instead of the uniform dark fill.

**Step 2: Wire in map_hoi.ts**

If WebGL fails (or is disabled), wire `applyStateJson` to call the placeholder's `setControlBySettlement` instead of the WebGL renderer's.

**Step 3: Verify in browser**

Disable WebGL (e.g. set a flag) and confirm the 2D canvas shows faction-colored settlements with borders.

**Step 4: Commit**

```
feat(map_hoi): enhanced 2D canvas fallback with faction colors
```

---

## Task 8: Final Verification & Cleanup

**Files:**
- Run: `npx tsc --noEmit` — 0 errors
- Run: `npx vitest run` — 143 tests pass
- Manual: Open `http://localhost:<port>/map_hoi.html`
  - Verify: terrain visible, faction colors on settlements, borders between settlements
  - Verify: scroll zoom in/out works smoothly
  - Verify: middle-drag pan works
  - Verify: Home key resets view
  - Verify: hover tooltip shows OSID, name, population, ethnic key, controller, constituents
  - Verify: top bar shows faction name, turn, date from loaded save
  - Verify: sidebar shows corps/brigade hierarchy from loaded save
  - Verify: "Load Save" button works to load a different JSON
- Update napkin if any new patterns were discovered

**Commit:**

```
chore(map_hoi): final verification pass — visual functional
```

---

## Summary of Changes

| Task | What | Files |
|------|------|-------|
| 1 | Fix ortho zoom (frustum scales with scroll) | HoIMapRenderer.ts |
| 2 | Auto-load latest save + file picker button | map_hoi.ts, map_hoi.html, TopCommandBarComponent.ts |
| 3 | Political control fills (faction colors) | HoIMapRenderer.ts |
| 4 | Settlement border lines | HoIMapRenderer.ts |
| 5 | Settlement hover tooltip (audit inspector) | HoIMapRenderer.ts, map_hoi.ts |
| 6 | Remove stale label sprites / white fragments | HoIMapRenderer.ts, map_hoi.ts |
| 7 | 2D canvas fallback (CONDITIONAL) | MapPlaceholder.ts, map_hoi.ts |
| 8 | Final verification & cleanup | All |

**No simulation files modified. No tests should break. Visual/UI only.**
