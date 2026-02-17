# Implemented Work — Enhanced War Map Formation Markers

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Add readiness glow, personnel strength numbers, and formation name labels to war map NATO-style markers; refactor marker method to accept full FormationView; fix hit-testing and canvas resize issues

---

## Summary

War map formation markers now display three new information layers — **readiness-colored inner border**, **personnel strength numbers**, and **formation name labels at tactical zoom** — making it possible to assess brigade status at a glance without hovering or clicking. Several interaction fixes (hit-testing, canvas resize, formation dimming) were also applied.

---

## 1. Marker Method Refactored — `drawNatoFormationMarker()`

### Before
```
drawNatoFormationMarker(ctx, sx, sy, w, h, shape, color, faction, posture?)
```
The method accepted individual primitive fields — no access to personnel, readiness, name, or subordinate data.

### After
```
drawNatoFormationMarker(ctx, sx, sy, w, h, f: FormationView, color: string, zoomLevel: number)
```
Accepts the full `FormationView` object and derives `shape`, `faction`, `posture` internally from `f.kind`, `f.faction`, `f.posture`. This gives the renderer access to `f.personnel`, `f.readiness`, `f.name`, `f.subordinateIds`, etc.

Call site in `drawFormations()` updated accordingly.

---

## 2. Readiness-Colored Inner Border Glow

A 1px inset stroke drawn inside the faction-colored outer border, using `panelReadinessColor(f.readiness)` at 0.8 alpha:

| Readiness | Color | Hex |
|---|---|---|
| `active` | Green | `#4CAF50` |
| `forming` | Yellow | `#FFC107` |
| `overextended` | Orange | `#FF9800` |
| `degraded` | Red | `#F44336` |

The faction-colored outer border (1.5px) is unchanged, preserving faction identity. The inner glow makes degraded/overextended brigades visually pop.

---

## 3. Personnel Strength Numbers

A compact personnel count is rendered below the NATO symbol inside each marker:

- **Format:** `formatStrength()` helper — values < 1000 shown as-is (e.g. `850`), values >= 1000 shown as `X.Xk` (e.g. `1.5k`, `4k`)
- **Font:** Bold monospace, zoom-adaptive size:
  - Strategic zoom: **skipped** (corps-level markers — strength less relevant)
  - Operational zoom: `bold 8px`
  - Tactical zoom: `bold 9px`
- **Color:** `rgba(255, 255, 255, 0.9)` (bright white for contrast on dark markers)
- **Corps/army markers:** Show subordinate count (`×4`) instead of personnel

The NATO symbol is shifted up slightly (`sy - h * 0.08`) to make room for the strength number below it.

---

## 4. Formation Name Labels at Tactical Zoom

At tactical zoom only (66×46px markers), a name label renders below each marker:

- **Position:** Centered, 3px below marker bottom edge
- **Font:** `bold 8px "IBM Plex Mono", Consolas, monospace`
- **Color:** `rgba(255, 255, 255, 0.7)` (slightly dimmed white)
- **Background:** Dark pill `rgba(10, 10, 26, 0.7)` for readability against the map
- **Truncation:** Names > 18 characters truncated with ellipsis (`…`)
- **Not shown at strategic/operational zoom** — too crowded

---

## 5. Hit-Test Rewrite — AABB Matching

### Before
Circular radius hit-test (`FORMATION_HIT_RADIUS = 36px`) — distance from marker center. Inaccurate for rectangular markers, especially with vertical stacking.

### After
Axis-aligned bounding box (AABB) matching actual marker dimensions:
- Hit area: `dim.w/2 + 4` horizontal, `dim.h/2 + 4` vertical (4px margin)
- Returns the **topmost** (last-drawn) match when markers overlap
- `FORMATION_HIT_RADIUS` constant removed as dead code

---

## 6. Canvas Resize via ResizeObserver

### Problem
Canvas dimensions were only updated on `window.resize`. When sidebar (300px) or brigade panel (340px) opens/closes, the flex layout changes the canvas wrapper size without firing a window resize. Result: stale canvas dimensions → mouse coordinates misaligned.

### Fix
Added `ResizeObserver` on the canvas wrapper element in the constructor:
```typescript
const wrap = this.canvas.parentElement;
if (wrap) {
  new ResizeObserver(() => this.resize()).observe(wrap);
}
```

Now the canvas resizes whenever its container changes size, regardless of cause.

---

## 7. Non-Selected Formation Dimming

When a formation is selected on either map, all other formations render at `globalAlpha = 0.25`. This makes it easier to see through stacked markers and locate the selected brigade's AoR. Applied to both war map and staff map.

---

## Pixel Layout — Tactical Zoom (66×46 marker)

```
┌─────────────────────────────────────┐ ← readiness-colored inner glow (1px)
│ ┌──────────┐ ┌────────────────────┐ │ ← faction-colored outer border (1.5px)
│ │          │ │     NATO SYM       │P│ ← P = posture badge (existing)
│ │  CREST   │ │      ▬ / XX        │ │
│ │          │ │     1.2k           │ │ ← personnel number (new)
│ └──────────┘ └────────────────────┘ │
└─────────────────────────────────────┘
        3rd Mountain Bde                ← name label below (new, tactical only)
```

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/MapApp.ts` | Rewrote `drawNatoFormationMarker()` (FormationView signature, readiness glow, strength numbers); updated `drawFormations()` call site + name labels at tactical zoom; rewrote `getFormationAtScreenPos()` AABB hit-test; added `ResizeObserver` for canvas resize; added formation dimming; removed `formatCampaignDate()` duplicate |
| `src/ui/map/constants.ts` | Unified `formatTurnDate(turn, phase)` as phase-aware; removed dead exports (`factionFill` re-export, `ZOOM_SNAP_IDLE_MS`, `ZOOM_WHEEL_SENSITIVITY`, `FORMATION_HIT_RADIUS`) |
| `src/ui/map/staff/StaffMapRenderer.ts` | Added formation dimming; fixed cartouche to use phase-aware `formatTurnDate()`; crest repositioned to x=60,y=50; exit button hover cursor |
| `src/ui/map/staff/StaffMapTheme.ts` | Doubled `crestHeight` to 144; strengthened AoR crosshatch (spacing 7, width 1.0, alpha 0.35) |

---

## Dead Code Removed

- `FORMATION_HIT_RADIUS` constant (replaced by AABB)
- `formatCampaignDate()` in MapApp.ts (replaced by shared `formatTurnDate`)
- `factionFill` re-export from constants.ts (unused)
- `ZOOM_SNAP_IDLE_MS` export (unused; duplicated locally in WarPlanningMap)
- `ZOOM_WHEEL_SENSITIVITY` export (same)

---

## Helper Added

```typescript
/** Format personnel count compactly: <1000 as-is, ≥1000 as X.Xk */
private static formatStrength(n: number): string {
  if (n < 1000) return String(n);
  return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
}
```

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 pass
- Visual check at all 3 zoom levels:
  - **Strategic:** Corps markers with `×N` subordinate count, readiness glow, no name labels
  - **Operational:** All formations with strength numbers, readiness glow, no name labels
  - **Tactical:** All formations with strength numbers, readiness glow, name labels below
