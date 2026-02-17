# Implemented Work — Unified AoR Crosshatch Rendering (Both Maps)

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Replace animated AoR glow/pulse on the war map with static pencil crosshatch; strengthen staff map crosshatch to match; remove all AoR animation code

---

## Summary

Both maps now render brigade AoR (Area of Responsibility) highlights identically: per-settlement faction-color fill + strong 45° diagonal pencil crosshatch + cached outer boundary stroke. The war map's previous animated pulsing glow has been removed entirely.

---

## 1. War Map AoR — Animation Removed, Crosshatch Added

**What:** The war map's `drawBrigadeAoRHighlight()` previously used animated alpha pulsing (`fillAlphaMin`/`fillAlphaMax`) with a `requestAnimationFrame` loop and glow blur. This has been replaced with a static two-phase render: per-settlement clip+fill+crosshatch, then a cached outer boundary stroke.

**Why:** The pulsing glow was distracting and inconsistent with the staff map's static crosshatch. The user requested "strong pencil crossings on both maps" for visual consistency.

### Changes in `MapApp.ts` — `drawBrigadeAoRHighlight()`

Complete rewrite from animated glow to static crosshatch:

- **Removed:** `startAoRAnimation()`, `stopAoRAnimation()`, `aorAnimating` flag, `aorAnimationId` field, `requestAnimationFrame` loop
- **Phase 1 (per-settlement):** For each AoR settlement: clip to polygon → fill with faction color at `AOR_HIGHLIGHT.fillAlpha` → draw 45° crosshatch lines at `AOR_HIGHLIGHT.hatchAlpha`
- **Phase 2 (boundary):** Cached outer boundary stroke in solid faction color (no glow)
- **Render pipeline simplified:** The `else if (this.aorAnimating)` branch replaced with plain `else { this.aorBoundaryCache = null; }`

### Changes in `constants.ts` — `AOR_HIGHLIGHT`

Replaced animation parameters with crosshatch parameters:

| Removed | Added |
|---|---|
| `fillAlphaMin: 0.06` | `fillAlpha: 0.12` |
| `fillAlphaMax: 0.18` | `hatchSpacing: 7` |
| `glowBlurMin: 0` | `hatchWidth: 1.0` |
| `glowBlurMax: 8` | `hatchAlpha: 0.35` |
| `glowCycleMs: 2000` | |

Retained: `strokeWidth: 2`

---

## 2. Staff Map AoR — Crosshatch Strengthened

**What:** The staff map's `drawAoRFill()` already used crosshatch but with weak values (0.12 alpha, 0.8px width). Strengthened to match the war map's "strong pencil crossings."

### Changes in `StaffMapTheme.ts` — `SELECTION`

| Parameter | Before | After |
|---|---|---|
| `aorHatchSpacing` | 8 | 7 |
| `aorHatchWidth` | 0.8 | 1.0 |
| `aorHatchAlpha` | 0.12 | 0.35 |

`aorFillAlpha` unchanged at 0.15 (slightly higher than war map's 0.12 for visibility on parchment).

---

## Crosshatch Algorithm (Shared Pattern)

Both maps use the same geometric approach:

1. Clip canvas to settlement polygon
2. Fill with faction color at low alpha
3. Compute settlement bounding box → diagonal length
4. Draw parallel lines at 45° angle, spaced by `hatchSpacing`, spanning the full diagonal
5. Lines are clipped by the polygon clip region

The algorithm is purely geometric — no `Math.random()`, no animation state. Deterministic output for any given settlement geometry.

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/MapApp.ts` | Rewrote `drawBrigadeAoRHighlight()`: removed animation, added crosshatch; simplified render pipeline else-branch |
| `src/ui/map/constants.ts` | Replaced `AOR_HIGHLIGHT` animation params with crosshatch params |
| `src/ui/map/staff/StaffMapTheme.ts` | Strengthened `SELECTION` crosshatch values (spacing, width, alpha) |

---

## Dead Code Removed

- `startAoRAnimation()` method
- `stopAoRAnimation()` method
- `aorAnimating: boolean` field
- `aorAnimationId: number` field
- `AOR_HIGHLIGHT.fillAlphaMin`, `.fillAlphaMax`, `.glowBlurMin`, `.glowBlurMax`, `.glowCycleMs`
- Render pipeline `else if (this.aorAnimating)` branch

---

## Determinism

All crosshatch rendering is deterministic. No `Math.random()`, no `Date.now()`, no `requestAnimationFrame` state. The same settlement polygon and faction color always produce the same visual output.

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 pass
- Visual: war map AoR shows strong crosshatch (no pulsing); staff map AoR shows matching strong crosshatch
