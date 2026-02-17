# Implemented Work — Dual Defensive Arc Front Lines & War Map UI Cleanup

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Replace single-line front rendering with dual faction-colored defensive arcs; AoR crosshatch improvements; label and toolbar cleanup; dead state removal

---

## Summary

Nine changes to the war map, culminating in a fundamentally new front line renderer inspired by military cartography (Sarajevo siege map style). Front lines are no longer a single white line — they are now **paired defensive arc symbols** on each faction's side of settlement borders, drawn only where brigades are deployed.

---

## 1. Dual Defensive Arc Front Lines (Main Feature)

### Concept

Instead of one front line, we draw **two rows of faction-colored defensive arc symbols** — one on each side of a settlement border. Each arc has perpendicular barb ticks extending outward toward the enemy, like barbed-wire decorations on military maps.

### Rules

| Condition | Result |
|---|---|
| Both factions have brigade AoR on their side | Arcs on **both** sides (no-man's-land gap between) |
| Only one faction has brigade AoR | Arcs on **that side only** |
| Neither faction has brigade AoR | **Nothing drawn** (no unit → no front) |

### Algorithm

1. **Build `defendedByFaction`** — `Map<SID, faction>` from all brigade AoRs via `gs.formations`
2. **Classify segments** — for each shared border where factions differ: check if `defendedByFaction.get(seg.a) === factionA` and `defendedByFaction.get(seg.b) === factionB`
3. **Compute offset direction** — perpendicular to each sub-segment, pointing toward the settlement centroid (via dot product)
4. **Single-loop collection** — one pass per sub-segment collects both Bézier curve points and barb tick positions
5. **Three-pass draw** from pre-collected data:
   - Glow stroke (wide, `glowAlpha`)
   - Arc stroke (narrow, `arcAlpha`)
   - Barb ticks (`barbAlpha`, with ±0.3 radian deterministic wobble)

### Colors

Faction-colored via `SIDE_RGB`:
- **RBiH** — `rgb(55, 140, 75)` (forest green)
- **RS** — `rgb(180, 50, 50)` (deep crimson)
- **HRHB** — `rgb(50, 110, 170)` (steel blue)

### Constants (`FRONT_LINE`)

```typescript
{
  curveOffset: 10,    // Bézier curve organic feel (px)
  arcOffset: 4,       // Offset from border toward faction territory (px)
  arcWidth: 1.5,      // Arc stroke width
  arcAlpha: 0.7,      // Arc stroke alpha
  barbSpacing: 10,    // Barb tick spacing (px)
  barbLength: 4,      // Barb tick length toward enemy (px)
  barbWidth: 1.0,     // Barb tick stroke width
  barbAlpha: 0.85,    // Barb tick alpha
  glowWidth: 5,       // Glow behind arc (px)
  glowAlpha: 0.15,    // Glow alpha
  minSubSegLen: 3,    // Skip tiny sub-segments (px)
}
```

---

## 2. AoR Crosshatch — Adaptive Color

The AoR crosshatch adapts to the Control layer state:

| Control Layer | Crosshatch Color |
|---|---|
| ON | Black (`rgba(0,0,0, 0.55)`) — visible on colored faction fills |
| OFF | White (`rgba(255,255,255, 0.55)`) — visible on dark background |

---

## 3. Crosshatch Density Increased

Both war map and staff map crosshatch strengthened:

| Parameter | Before | After |
|---|---|---|
| `hatchSpacing` | 7px | 5px |
| `hatchWidth` | 1.0px | 1.5px |
| `hatchAlpha` | 0.35 | 0.55 |

---

## 4. Labels — Larger Settlements Only

Labels now show only `URBAN_CENTER` and `TOWN` at all zoom levels. Small settlement labels removed entirely. Dead code for the smallest tier (7px font, `rgba(160,160,175,0.6)` color) was removed.

---

## 5. Labels and Brigade AoR Toggles Removed from Toolbar

- "Labels" checkbox removed — labels always on
- "Brigade AoR" checkbox removed — AoR now automatic
- Both removed from HTML (`tactical_map.html`) and JS event listener array

---

## 6. Brigade AoR — Automatic

AoR highlight renders whenever a formation is selected + game state loaded. No toggle needed. All dead checkbox DOM manipulation removed (4 sites).

---

## 7. Dead State Removed

- `LayerVisibility.labels` field
- `LayerVisibility.brigadeAor` field + JSDoc
- `DEFAULT_LAYERS.labels` and `DEFAULT_LAYERS.brigadeAor`
- `brigadeAor: false` in state-clear code

---

## 8. Old Front Line System Removed

Everything from the previous single-line front renderer:
- `FRONT_LINE.color/width/glowColor/glowWidth/barbColor`
- `FRONT_LINE.undefendedColor/Width/GlowColor/Dash`
- The single white line passes (Pass 1a, 2a)
- The old barb tick pass (Pass 3)
- The undefended dashed line passes (Pass 1b, 2b)
- `defendedSids` Set and `defendedSegs/undefendedSegs` partition

---

## 9. Refactor Pass

Merged 3 separate loops in `drawDefensiveArc()` (glow, arc, barbs — each iterating all sub-segments, calling `getOffsetDir()`, computing offset points) into a **single collection loop** followed by 3 draw passes from pre-collected data:

| Aspect | Before | After |
|---|---|---|
| `getOffsetDir()` calls per sub-segment | 3× | 1× |
| Offset point computation per sub-segment | 3× | 1× |
| Bézier control point computation per sub-segment | 2× | 1× |
| `ctx.save()`/`ctx.restore()` per arc | 3 pairs | 1 pair |
| `ctx.lineCap`/`ctx.lineJoin` sets | 3× | 1× |
| Lines of code in `drawDefensiveArc` | 124 | 82 |

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/MapApp.ts` | `drawFrontLines()` rewritten with dual-arc system; labels LOD restricted; labels rendered unconditionally; AoR gate simplified; dead checkbox code removed; `SIDE_RGB` import added; AoR crosshatch adaptive color |
| `src/ui/map/constants.ts` | `FRONT_LINE` replaced with dual-arc constants; `SIDE_RGB` lookup added; `AOR_HIGHLIGHT` crosshatch strengthened |
| `src/ui/map/types.ts` | Removed `labels` and `brigadeAor` from `LayerVisibility` |
| `src/ui/map/state/MapState.ts` | Removed `labels` and `brigadeAor` from `DEFAULT_LAYERS` and state-clear |
| `src/ui/map/staff/StaffMapTheme.ts` | `SELECTION` crosshatch strengthened |
| `src/ui/map/tactical_map.html` | Removed Labels and Brigade AoR checkbox elements |

---

## Determinism

All rendering remains deterministic. `detHash()` provides reproducible Bézier offsets (seed 101) and barb wobble angles (seed 202). The `defendedByFaction` lookup is derived from game state, not from random or time-based sources.

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 pass
