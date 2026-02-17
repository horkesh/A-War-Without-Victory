# Implemented Work — Staff Map Crest Stamp & War Map Barbed-Wire Front Lines

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Two visual changes: (1) replace three faction crests with a single player-faction stamp on the staff map, (2) apply barbed-wire front line rendering to the main war map

---

## 1. Single Player-Faction Crest as Stamp (Staff Map)

**What:** The staff map previously rendered all three faction crests (ARBiH, VRS, HVO) side by side at top center. Now it renders only the playing faction's crest in the top-left corner, styled as a faded ink stamp with slight rotation and a thin border frame.

**Why:** Showing all three crests was visually cluttered and didn't communicate whose perspective the map represents. A single stamped crest immediately identifies the player's faction, and the stamp aesthetic fits the paper-map theme.

**How the player faction is determined:**
- `this.state.snapshot.loadedGameState?.player_faction` — set during New Game in the warroom
- Maps `'RBiH'` → `'ARBiH'`, `'RS'` → `'VRS'`, `'HRHB'` → `'HVO'` for image lookup
- If `player_faction` is null/undefined, no crest is drawn

### Changes in `StaffMapRenderer.ts`

- Added static `FACTION_CREST_KEY` mapping (faction ID → crest image key)
- Rewrote `drawFactionCrests()`:
  - Reads `gs.player_faction`, maps to crest key, draws single image
  - Position: x=50, y=8 (right of exit button which occupies x=12..40)
  - Stamp effect: `ctx.translate()` → `ctx.rotate(DECORATIONS.crestRotation)` (~3.4° CCW tilt)
  - Thin rectangular border frame at 0.4 alpha
  - Crest image at 0.55 alpha (faded ink)
  - Italic serif faction label beneath at 0.5 alpha
- Removed multi-crest layout logic (3-crest loop, totalWidth, gap spacing)
- `loadCrests()` unchanged — still loads all 3 images lazily (player faction unknown until game state arrives)

### Changes in `StaffMapTheme.ts`

- `DECORATIONS.crestHeight`: 48 → 52 (larger since it's the only crest)
- `DECORATIONS.crestAlpha`: 0.85 → 0.55 (faded stamp look)
- Removed `DECORATIONS.crestGap` (no longer needed)
- Added `DECORATIONS.crestRotation: -0.06` (~3.4° CCW tilt)
- Added `DECORATIONS.crestBorderColor: INK.medium` (stamp frame color)
- Added `DECORATIONS.crestBorderWidth: 1.5` (stamp frame thickness)

---

## 2. Barbed-Wire Front Lines on War Map

**What:** Applied the same barbed-wire front line rendering from the staff map to the main tactical war map. Front lines now render as smooth Bézier curves with perpendicular barb ticks, replacing the previous straight dashed lines.

**Why:** The staff map's barbed-wire motif was well-received. Applying it to the war map creates visual consistency across zoom levels and gives front lines a more organic, militarily evocative appearance.

### Changes in `MapApp.ts` — `drawFrontLines()`

Complete rewrite from 2-pass (glow + dashed straight) to 3-pass (glow + solid curved + barbs):

- **Pre-collection:** Front segments now collected once and reused across all passes (was filtering twice)
- **Pass 1 (Glow):** Same warm orange glow (`rgba(255, 200, 100, 0.25)`, 6px), now drawn as quadratic Bézier curves with `detHash()`-driven perpendicular control-point offsets
- **Pass 2 (Main):** Solid white curved line (was dashed straight `[8, 4]`), same Bézier curves
- **Pass 3 (Barbs):** New — perpendicular tick marks at 14px intervals along each straight segment between projected points, alternating sides via `detHash()`, in slightly transparent white (`rgba(255, 255, 255, 0.65)`)
- Added `detHash` import from `constants.js`

### Changes in `constants.ts` — `FRONT_LINE`

- Removed `dash: [8, 4]` (replaced by barbed-wire visual)
- Added `curveOffset: 10` (Bézier perpendicular offset, slightly less than staff map's 12)
- Added `barbSpacing: 14` (wider than staff map's 12, suits the zoomed-out war map)
- Added `barbLength: 4` (same as staff map)
- Added `barbWidth: 1.2` (slightly thinner than staff map's 1.5)
- Added `barbColor: 'rgba(255, 255, 255, 0.65)'` (semi-transparent white for dark background)

### Shared `detHash()` Utility

- Exported `detHash(x, y, seed)` from `constants.ts` (was duplicated as a private function in StaffMapRenderer)
- `StaffMapRenderer.ts` now imports `detHash` from `../constants.js` instead of defining its own copy
- Deterministic hash function: `0..1` output, no `Math.random()`, uses integer multiply-shift mixing

---

## Files Modified

| File | Change |
|---|---|
| `src/ui/map/staff/StaffMapRenderer.ts` | Single-crest stamp logic; import `detHash` from constants |
| `src/ui/map/staff/StaffMapTheme.ts` | Crest constants updated (height, alpha, rotation, border) |
| `src/ui/map/MapApp.ts` | Barbed-wire front lines (3-pass Bézier + barbs) |
| `src/ui/map/constants.ts` | Barb constants in `FRONT_LINE`; exported `detHash()` |

---

## Determinism

All procedural effects use `detHash(x, y, seed)` exclusively — zero `Math.random()`. The hash function is now shared between the war map and staff map via `constants.ts`.

---

## Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 pass
- Visual: `npm run dev:map` — war map front lines show curved barbed-wire; staff map shows single faction crest stamp at top-left
