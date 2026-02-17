# Implemented Work — War Map Labels, AoR Auto-Display, Front Line Defended/Undefended, Crosshatch Tuning

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Restrict labels to larger settlements; remove Labels and Brigade AoR toggles; make AoR automatic; distinguish defended vs undefended front sections; adaptive AoR crosshatch color; bolder crosshatch density

---

## Summary

Six changes to the war map rendering and UI, spanning labels, AoR display, front line visual differentiation, and crosshatch tuning:

1. **Labels restricted** to URBAN_CENTER and TOWN at all zoom levels (small settlement labels removed)
2. **Labels toggle removed** from bottom toolbar — labels always on
3. **Brigade AoR toggle removed** — AoR highlight is now automatic when any formation is selected
4. **Front line defended/undefended distinction** — defended sections show barbed wire; undefended show dashed line with reddish glow
5. **AoR crosshatch color adapts** to Control layer (black on colored surfaces, white on dark background)
6. **Crosshatch density increased** (spacing 7→5, width 1.0→1.5, alpha 0.35→0.55) on both maps

---

## 1. Labels — Larger Settlements Only

### Before
- Strategic zoom: URBAN_CENTER only
- Operational zoom: URBAN_CENTER + TOWN
- Tactical zoom: **all settlements** (including tiny ones → visual clutter)

### After
- Strategic zoom: URBAN_CENTER only (unchanged)
- Operational + Tactical zoom: URBAN_CENTER + TOWN only

Small settlement labels (7px font, dim color) are no longer rendered at any zoom level. The dead code path for the smallest tier (font, color) was removed.

### LOD Filter (simplified)
```typescript
if (nc !== 'URBAN_CENTER' && nc !== 'TOWN') continue;
if (zoomLevel === 0 && nc !== 'URBAN_CENTER') continue;
```

---

## 2. Labels Toggle Removed

The "Labels" checkbox was removed from `tactical_map.html` and the JS `layerMap` event listener array. Labels are now rendered unconditionally in the paint pipeline (no `rc.layers.labels` gate).

---

## 3. Brigade AoR — Automatic

### Before
- Brigade AoR required: (a) formation selected, (b) `brigadeAor` layer toggled on
- Click handlers manually set `state.setLayer('brigadeAor', true)` and manipulated the DOM checkbox
- The checkbox was initially disabled, enabled on game load, checked on formation click

### After
- AoR highlight renders whenever a formation is selected + game state is loaded
- No layer toggle, no checkbox, no `setLayer` calls
- The `brigadeAor` field removed from `LayerVisibility` interface and `MapState` defaults

### Dead Code Removed
- `LayerVisibility.labels` field
- `LayerVisibility.brigadeAor` field + JSDoc
- `DEFAULT_LAYERS.labels` and `DEFAULT_LAYERS.brigadeAor`
- `brigadeAor: false` from state-clear code
- 4 sites of `brigadeAorCheckbox` DOM manipulation (2 click handlers, 2 game-load handlers)
- `state.setLayer('brigadeAor', true)` calls from formation click handlers
- HTML elements: `#layer-labels` checkbox, `#layer-brigade-aor` checkbox

---

## 4. Defended vs Undefended Front Sections

### Concept
A front segment is **defended** if at least one adjacent settlement (`seg.a` or `seg.b`) is in any brigade's AoR. Otherwise it is **undefended**.

### Visual Distinction

| Property | Defended | Undefended |
|---|---|---|
| Line style | Solid | Dashed (6px on / 4px gap) |
| Line color | `rgba(255,255,255, 0.85)` | `rgba(255,255,255, 0.45)` |
| Line width | 2.5px | 2.0px |
| Glow | Warm gold `rgba(255,200,100, 0.25)` | Reddish `rgba(255,120,80, 0.18)` |
| Barbed wire | Yes | No |

### Implementation
1. Build `defendedSids` set from all `brigadeAorByFormationId` entries
2. Partition front segments into `defendedSegs` / `undefendedSegs`
3. Render defended: glow → solid line → barb ticks
4. Render undefended: reddish glow → dashed dimmer line (no barbs)

### Constants Added (`FRONT_LINE`)
```typescript
undefendedColor: 'rgba(255, 255, 255, 0.45)',
undefendedWidth: 2.0,
undefendedGlowColor: 'rgba(255, 120, 80, 0.18)',
undefendedDash: [6, 4] as number[],
```

---

## 5. AoR Crosshatch — Adaptive Color

### Problem
Crosshatch used faction-colored strokes, nearly invisible against faction-colored settlement fills when the Control layer was active.

### Fix
Crosshatch color checks `rc.layers.politicalControl`:

| Control Layer | Crosshatch Color |
|---|---|
| ON | `rgba(0, 0, 0, alpha)` (black — visible on colored fills) |
| OFF | `rgba(255, 255, 255, alpha)` (white — visible on dark background) |

Both `fillStyle` and `hatchStyle` are hoisted above the per-settlement loop (loop-invariant).

---

## 6. Crosshatch Density Increased

Both war map and staff map crosshatch strengthened:

| Parameter | Before | After |
|---|---|---|
| `hatchSpacing` | 7px | 5px |
| `hatchWidth` | 1.0px | 1.5px |
| `hatchAlpha` | 0.35 | 0.55 |

Applied to `AOR_HIGHLIGHT` (war map) and `SELECTION` (staff map) in lockstep.

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/MapApp.ts` | Labels LOD filter (URBAN_CENTER + TOWN only); labels rendered unconditionally; AoR rendered without `brigadeAor` gate; removed `brigadeAorCheckbox` DOM manipulation (4 sites); removed `setLayer('brigadeAor')` calls; front line defended/undefended partitioning; AoR crosshatch adaptive color with hoisted styles |
| `src/ui/map/constants.ts` | Added `FRONT_LINE.undefendedColor/Width/GlowColor/Dash`; strengthened `AOR_HIGHLIGHT` crosshatch (spacing/width/alpha) |
| `src/ui/map/types.ts` | Removed `labels` and `brigadeAor` from `LayerVisibility` |
| `src/ui/map/state/MapState.ts` | Removed `labels` and `brigadeAor` from `DEFAULT_LAYERS` and state-clear |
| `src/ui/map/staff/StaffMapTheme.ts` | Strengthened `SELECTION` crosshatch (spacing/width/alpha) |
| `src/ui/map/tactical_map.html` | Removed Labels and Brigade AoR checkbox elements |

---

## Dead Code Removed

- `LayerVisibility.labels` field
- `LayerVisibility.brigadeAor` field + JSDoc comment
- `DEFAULT_LAYERS.labels: true`
- `DEFAULT_LAYERS.brigadeAor: false`
- `brigadeAor: false` in `clearGameState()`
- 4× `brigadeAorCheckbox` DOM lookups and manipulation
- 2× `state.setLayer('brigadeAor', true)` in click handlers
- `layer-labels` and `layer-brigade-aor` entries in JS `layerMap`
- HTML: `#layer-labels` checkbox label, `#layer-brigade-aor` checkbox label
- Small settlement label font/color tier (7px / `rgba(160,160,175, 0.6)`)

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 pass
- Visual: labels show only cities/towns at all zoom levels; AoR appears automatically on formation select; defended front has barbed wire, undefended is dashed/reddish; crosshatch is bold and dense
