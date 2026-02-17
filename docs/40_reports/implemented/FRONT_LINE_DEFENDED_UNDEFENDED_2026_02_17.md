# Implemented Work — Front Line Defended/Undefended Distinction & AoR Crosshatch Color

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Visually distinguish defended vs undefended front sections; adapt AoR crosshatch color to Control layer state

---

## Summary

Front line rendering now differentiates **defended** sections (covered by a brigade AoR) from **undefended** sections (no brigade AoR coverage). Defended sections retain the full solid line + barbed wire appearance. Undefended sections render as dashed lines with a reddish glow and no barbed wire, signaling vulnerability at a glance.

Additionally, the AoR crosshatch color now adapts to the Control layer: **black** on colored settlement surfaces (Control ON), **white** on dark background (Control OFF).

---

## 1. AoR Crosshatch — Adaptive Color

### Problem
The AoR crosshatch used faction-colored strokes (`hexToRgba(factionColor, 0.35)`), which were nearly invisible against faction-colored settlement fills when the Political Control layer was active.

### Fix
In `drawBrigadeAoRHighlight()`, the crosshatch `strokeStyle` now checks `rc.layers.politicalControl`:

| Control Layer | Crosshatch Color | Rationale |
|---|---|---|
| ON | `rgba(0, 0, 0, 0.35)` (black) | Visible on colored faction-fill surfaces |
| OFF | `rgba(255, 255, 255, 0.35)` (white) | Visible on dark navy background |

The faction-colored fill and outer boundary stroke are unchanged — only the diagonal hatch lines adapt.

---

## 2. Defended vs Undefended Front Sections

### Concept

A front segment is **defended** if at least one of its adjacent settlements (`seg.a` or `seg.b`) belongs to any brigade's AoR. A segment is **undefended** if neither side is in any AoR — meaning no brigade is responsible for that stretch of the front.

### Implementation

**Step 1 — Build defended settlement set:**
At the start of `drawFrontLines()`, all settlement IDs from `gs.brigadeAorByFormationId` are collected into a `Set<string>`. This is O(n) over all brigade AoR assignments.

**Step 2 — Partition front segments:**
Each front segment is classified as defended or undefended based on whether `seg.a` or `seg.b` is in the defended set.

**Step 3 — Render with distinct styles:**

| Property | Defended | Undefended |
|---|---|---|
| Line style | Solid | Dashed (`6px on, 4px gap`) |
| Line color | `rgba(255, 255, 255, 0.85)` | `rgba(255, 255, 255, 0.45)` (dimmer) |
| Line width | 2.5px | 2.0px (0.8× scale) |
| Glow | Warm gold `rgba(255, 200, 100, 0.25)` | Reddish `rgba(255, 120, 80, 0.18)` |
| Barbed wire | Yes (deterministic ticks) | **No** |

The visual effect: undefended stretches appear thinner, broken, and reddish — immediately readable as exposed/vulnerable. Defended stretches retain the full barbed-wire fortified look.

---

## Rendering Pipeline (Updated)

```
drawFrontLines(rc):
  1. Collect front segments (same shouldDrawFrontSegment logic)
  2. Build defendedSids set from all brigade AoRs
  3. Partition segments: defendedSegs / undefendedSegs
  4. Defended passes:
     a. Glow (warm gold, wide)
     b. Main line (solid, bright white)
     c. Barb ticks (deterministic)
  5. Undefended passes:
     a. Glow (reddish, dimmer)
     b. Main line (dashed, dimmer white, thinner)
     (no barb ticks)
```

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/MapApp.ts` | `drawBrigadeAoRHighlight()` — crosshatch color adapts to `rc.layers.politicalControl`; `drawFrontLines()` — partitions segments into defended/undefended, renders with distinct styles |
| `src/ui/map/constants.ts` | Added `FRONT_LINE.undefendedColor`, `.undefendedGlowColor`, `.undefendedDash` |

---

## Constants Added

```typescript
// In FRONT_LINE:
undefendedColor: 'rgba(255, 255, 255, 0.45)',
undefendedGlowColor: 'rgba(255, 120, 80, 0.18)',
undefendedDash: [6, 4] as number[],
```

---

## Determinism

All rendering remains deterministic. The defended/undefended classification is derived from `brigadeAorByFormationId` (game state), not from any random or time-based source. The `detHash()` barb-tick placement is unchanged for defended segments.

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 pass
- Visual check:
  - **Defended front:** solid white line + warm glow + barbed wire ticks
  - **Undefended front:** dashed dimmer line + reddish glow + no barbed wire
  - **AoR crosshatch (Control ON):** black diagonal lines on colored settlements
  - **AoR crosshatch (Control OFF):** white diagonal lines on dark background
