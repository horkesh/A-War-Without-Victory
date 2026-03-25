# Implementation Spec: Ghost Map + Exhaustion Clock

**Date:** 2026-03-25
**Author:** UI/UX Developer (spec), Nightshift Agent (implementation)
**Status:** READY FOR IMPLEMENTATION
**Smoke test after:** `npx tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`

---

## Feature 1: The Ghost Map (Pre-War Demographics Overlay)

### Summary

A Deck.gl ScatterplotLayer showing 1991 census population as colored dots beneath the current military situation. Each settlement becomes a cluster of dots colored by ethnic majority. Toggle on/off from the bottom MapModeToolbar.

### 1. Data Source

**File:** `data/derived/settlements_wgs84_1990.geojson`
- 5,823 settlement polygons with per-settlement demographics
- Properties used: `sid`, `settlement_name`, `population_total`, `population_bosniaks`, `population_croats`, `population_serbs`, `population_others`
- Geometry type: `Polygon` (compute centroid from polygon bounds for dot placement)

**NOT** `data/source/bih_census_1991.json` -- that file has no coordinates. The GeoJSON already has the same census data embedded in properties.

**Loading:** Fetch via the existing `DataLoader.ts` pattern. Add one new export:

```typescript
// src/ui/map/data/DataLoader.ts — add this function
export async function loadCensusSettlements(): Promise<FeatureCollection> {
  return fetchJson<FeatureCollection>('/data/derived/settlements_wgs84_1990.geojson');
}
```

**When to load:** On map initialization, alongside other GeoJSON loads in `MapContainer.tsx`. Cache in a `useRef` -- census data never changes.

### 2. Data Transformation

Create a flat array for Deck.gl consumption. Compute centroid from polygon bounds. For each settlement feature, produce:

```typescript
interface GhostMapDatum {
  position: [number, number];  // [lng, lat] centroid
  population: number;          // population_total
  bosniaks: number;
  croats: number;
  serbs: number;
  others: number;
  majority: 'bosniak' | 'croat' | 'serb' | 'other' | 'mixed';
  majorityPct: number;         // 0-1, percentage of majority group
  name: string;
}
```

**Centroid computation:** Average all polygon coordinate pairs (same approach as `buildOsidCentroidLookup` -- compute bounding box center or arithmetic mean of vertices).

**Majority determination:** Whichever of `bosniaks`, `croats`, `serbs` is highest. If the leading group is < 50% of total, classify as `'mixed'`. If `others` is highest, classify as `'other'`.

### 3. Layer Configuration

**File to create:** `src/ui/map/layers/buildGhostMapLayer.ts`

```typescript
import { ScatterplotLayer } from '@deck.gl/layers';

// Ethnicity colors — these match the game's existing ethnic map palette
// (cross-reference buildEthnicGeoJSON.ts for consistency)
const ETHNICITY_COLORS: Record<string, [number, number, number, number]> = {
  bosniak: [90, 180, 90, 180],    // green, semi-transparent
  croat:   [70, 130, 220, 180],   // blue, semi-transparent
  serb:    [200, 80, 80, 180],    // red, semi-transparent
  other:   [180, 180, 100, 180],  // yellow-grey, semi-transparent
  mixed:   [160, 140, 120, 140],  // muted brown, more transparent
};

export function buildGhostMapLayer(data: GhostMapDatum[]): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'ghost-map-census',
    data,
    pickable: true,
    opacity: 0.7,
    stroked: false,
    filled: true,
    radiusUnits: 'meters',
    radiusMinPixels: 2,
    radiusMaxPixels: 18,
    getPosition: (d: GhostMapDatum) => d.position,
    getRadius: (d: GhostMapDatum) => Math.sqrt(d.population) * 15,
    // sqrt scaling: pop 100 -> r=150m, pop 1000 -> r=474m, pop 10000 -> r=1500m
    getFillColor: (d: GhostMapDatum) =>
      ETHNICITY_COLORS[d.majority] ?? ETHNICITY_COLORS.other,
    updateTriggers: {},
  });
}
```

**Export signature:**

```typescript
export function buildGhostMapLayer(data: GhostMapDatum[]): ScatterplotLayer;
export function buildGhostMapData(geojson: FeatureCollection): GhostMapDatum[];
```

Both functions go in the same file.

### 4. Integration into Deck.gl Pipeline

**Where layers are composed:** `src/ui/map/layers/composeTacticalDeckLayers.ts`

Add a new capability flag to `DeckLayerCapabilities` (`src/ui/map/layers/deckLayerCapabilities.ts`):

```typescript
/** Ghost Map: pre-war census demographics as ScatterplotLayer dots. */
readonly ghostMapVisible: boolean;
```

Default: `false` in `DEFAULT_DECK_LAYER_CAPABILITIES`.

**In `composeTacticalDeckLayers`:** Accept `ghostMapData` in the args. When `caps.ghostMapVisible && ghostMapData`, prepend `buildGhostMapLayer(ghostMapData)` to the layer array (it renders UNDER formations).

**In `MapContainer.tsx`:** Pass `ghostMapData` (from the cached ref) and `capabilities.ghostMapVisible` (from store) through to `composeTacticalDeckLayers`. The ghost map layer is always built but only included when the capability flag is true.

### 5. Store State

**In `gameStore.ts`**, add:

```typescript
/** Ghost Map (1991 census overlay) visibility. */
ghostMapVisible: boolean;
setGhostMapVisible: (v: boolean) => void;
```

Default: `false`.

### 6. Toolbar Integration

**Where:** `src/ui/map/components/MapModeToolbar.tsx` -- add to the layer toggles section (after the divider, alongside Fronts/Units/Labels/etc.).

**Add to both `DEV_LAYER_TOGGLES` and `LIVE_LAYER_TOGGLES`** in `src/ui/map/utils/mapModes.ts`:

```typescript
{ key: 'ghostMapVisible', setKey: 'setGhostMapVisible', label: '1991' },
```

The label `1991` is short, evocative, and fits the existing toggle style. No icon needed -- text label only, matching the other toggles.

**Add to the `toggles` map in `MapModeToolbar.tsx`:**

```typescript
ghostMapVisible: { value: ghostMapVisible, set: setGhostMapVisible },
```

And subscribe to the store values at the top of the component.

### 7. Interaction with Other Layers

**No dimming of formation counters.** The ghost map dots render UNDER all other layers (prepended to the Deck.gl layer array). They are semi-transparent (opacity 0.7, alpha channel 140-180 in colors). Formation counters, front lines, and territory fills all render on top. The ghost dots will be visible in gaps between territory polygons and around settlement areas.

**When `mapMode === 'ethnic'`:** Ghost map still works additively. The ethnic fill (MapLibre polygon fill) shows current ethnic composition; the ghost dots show 1991 composition. The contrast IS the feature.

**No CSS filter interaction.** The ghost dots render at their specified colors/opacity regardless of any future map desaturation. They should remain vivid -- the "ghost" effect comes from their transparency and the military reality layered on top, not from visual degradation of the dots themselves.

### 8. Component Structure

**New files:**
- `src/ui/map/layers/buildGhostMapLayer.ts` -- `buildGhostMapData()` + `buildGhostMapLayer()`
- No new React component needed. This is purely a Deck.gl layer added to the existing composition pipeline.

**Modified files:**
- `src/ui/map/layers/deckLayerCapabilities.ts` -- add `ghostMapVisible` field
- `src/ui/map/layers/composeTacticalDeckLayers.ts` -- accept + conditionally include ghost layer
- `src/ui/map/store/gameStore.ts` -- add `ghostMapVisible` + setter
- `src/ui/map/utils/mapModes.ts` -- add toggle entry to both arrays
- `src/ui/map/components/MapModeToolbar.tsx` -- subscribe to new store field, add to toggles map
- `src/ui/map/map/MapContainer.tsx` -- load census GeoJSON, compute data array, pass to compose function
- `src/ui/map/data/DataLoader.ts` -- add `loadCensusSettlements()`

### 9. Tooltip (Stretch -- Skip if Time-Constrained)

Deck.gl `pickable: true` on the ScatterplotLayer enables hover. If a `getTooltip` prop or `onHover` callback is wired, show:

```
Banovici (1991)
Pop: 8,637
Bosniak: 3,843 (44%)
Serb: 2,534 (29%)
Croat: 495 (6%)
Other: 1,765 (20%)
```

This is optional for v1. The dots alone tell the story.

### 10. Verification

After implementation:
1. `npx tsc --noEmit` -- zero errors
2. `npm run test:vitest` -- all pass (no existing tests should break)
3. `npm run desktop:map:build` -- builds successfully
4. `npm run dev:map` -- open http://localhost:3001, load a save, click "1991" toggle in bottom toolbar, verify dots appear with correct colors under the military overlay

---

## Feature 2: The Exhaustion Clock (Candle Visual)

### Summary

A vertical "candle" bar in the Army HQ BRIEFING tab showing war exhaustion as a shrinking flame. One per faction (player faction only). Placed in the top briefing grid alongside Commander / CoS Brief / Crest / Strategic Position.

### 1. Data Source

**Field:** `LoadedGameState.warPhaseExhaustion` -- `Record<string, number>`

Already parsed in `GameStateAdapter.ts` (lines 1320-1327) from `state.political.war_exhaustion`. Already consumed in `ArmyHQModal.tsx` (line 83):

```typescript
const exhaustion = state.warPhaseExhaustion?.[faction];
```

**Value range:** 0 = fresh, accumulates monotonically (never decreases). Typical values:
- Week 10: ~50-150
- Week 40: ~300-600
- Week 100+: ~800-1500+

**Thresholds for display** (derived from engine constants):
- 0-200: **Bright** (faction can sustain operations)
- 200-400: **Dimming** (offensive capacity degraded)
- 400-600: **Flickering** (critical exhaustion)
- 600+: **Guttering** (near-collapse)

These are display thresholds only. The engine does not have a hard "game over at X" exhaustion cap -- it degrades effectiveness progressively.

### 2. Component Location

**Where:** `src/ui/map/components/army_hq/ArmyHQModal.tsx`, BRIEFING tab, in the existing top grid.

Currently the grid is `grid-cols-[1fr_1fr_auto_1fr]` containing:
1. Commander card
2. ChiefOfStaffBriefing
3. Army Crest (auto width)
4. StrategicPosition

**Change grid to:** `grid-cols-[1fr_1fr_auto_auto_1fr]` -- insert the Exhaustion Clock as a narrow column between the Crest and Strategic Position.

The candle is narrow (width ~60px) and tall (fills the grid row height), sitting naturally beside the crest.

### 3. Visual Design

**Metaphor:** A candle that burns down. The "wax" is a vertical bar that starts full (tall) and shrinks as exhaustion grows. A gradient "flame" cap sits on top of the remaining wax.

**Dimensions:**
- Container: `w-[60px]` (fixed), fills parent height (`h-full`, min ~160px)
- Inner wax bar: `w-[20px]` centered, variable height
- Flame cap: `w-[28px]` SVG or CSS gradient glow, positioned at top of wax

**Remaining percentage calculation:**

```typescript
const EXHAUSTION_DISPLAY_MAX = 800; // visual "empty" point
const remaining = Math.max(0, Math.min(1, 1 - (exhaustion / EXHAUSTION_DISPLAY_MAX)));
// remaining: 1.0 = full candle, 0.0 = guttered out
```

**Colors by threshold:**

| Remaining | Wax Color | Flame Color | State Label |
|-----------|-----------|-------------|-------------|
| > 0.75 | `bg-amber-200` | `bg-amber-400` glow | STRONG |
| 0.50-0.75 | `bg-amber-300` | `bg-amber-500` glow | STEADY |
| 0.25-0.50 | `bg-orange-400` | `bg-orange-500` pulse | WANING |
| 0.05-0.25 | `bg-red-500` | `bg-red-400` fast pulse | CRITICAL |
| < 0.05 | `bg-red-900/50` | none (extinguished) | SPENT |

**CSS classes:** Use existing HQ aesthetic -- `bg-panel-card`, `border border-panel-border`, `rounded-lg`. The candle sits inside a standard panel card matching Commander/CoS/Strategic Position cards.

### 4. Faction Scope

**Player faction only.** The Exhaustion Clock shows the currently viewed faction's exhaustion (the `faction` variable already scoped in `ArmyHQModal`). When you switch factions in dev mode, the candle updates.

Only one candle, not three side-by-side.

### 5. Component Structure

**New file:** `src/ui/map/components/army_hq/ExhaustionClock.tsx`

```typescript
interface ExhaustionClockProps {
  /** Raw exhaustion value (0 = fresh, monotonically increasing). */
  exhaustion: number;
  /** Faction ID for thematic color accent. */
  faction: string;
}

export function ExhaustionClock({ exhaustion, faction }: ExhaustionClockProps): JSX.Element;
```

**Imported in:** `src/ui/map/components/army_hq/ArmyHQModal.tsx`

### 6. Detailed Markup

```tsx
export function ExhaustionClock({ exhaustion, faction }: ExhaustionClockProps) {
  const DISPLAY_MAX = 800;
  const remaining = Math.max(0, Math.min(1, 1 - (exhaustion / DISPLAY_MAX)));
  const heightPct = `${Math.round(remaining * 100)}%`;

  const state =
    remaining > 0.75 ? 'strong' :
    remaining > 0.50 ? 'steady' :
    remaining > 0.25 ? 'waning' :
    remaining > 0.05 ? 'critical' : 'spent';

  const waxColor = {
    strong:   'bg-amber-200',
    steady:   'bg-amber-300',
    waning:   'bg-orange-400',
    critical: 'bg-red-500',
    spent:    'bg-red-900/50',
  }[state];

  const flameColor = {
    strong:   'bg-amber-400',
    steady:   'bg-amber-500',
    waning:   'bg-orange-500',
    critical: 'bg-red-400',
    spent:    'bg-transparent',
  }[state];

  const shouldPulse = state === 'waning' || state === 'critical';

  return (
    <div className="bg-panel-card border border-panel-border rounded-lg p-3 flex flex-col items-center justify-between h-full min-h-[160px]">
      {/* Title */}
      <div className="text-[8px] uppercase tracking-[0.25em] text-text-secondary font-bold text-center">
        WAR
        <br />
        EXHAUSTION
      </div>

      {/* Candle container */}
      <div className="relative flex-1 w-[20px] my-2 flex flex-col justify-end">
        {/* Wax */}
        <div
          className={`w-full rounded-sm ${waxColor} transition-all duration-1000 ease-out`}
          style={{ height: heightPct }}
        >
          {/* Flame cap */}
          {state !== 'spent' && (
            <div
              className={`absolute -top-3 left-1/2 -translate-x-1/2 w-[14px] h-[14px] rounded-full ${flameColor} blur-[3px] ${shouldPulse ? 'animate-pulse' : ''}`}
            />
          )}
        </div>
        {/* Candlestick base */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[28px] h-[4px] bg-amber-900/60 rounded-sm" />
      </div>

      {/* State label */}
      <div className={`text-[9px] font-bold uppercase tracking-wide ${
        state === 'critical' || state === 'spent' ? 'text-red-400' :
        state === 'waning' ? 'text-orange-400' : 'text-amber-400/70'
      }`}>
        {state.toUpperCase()}
      </div>

      {/* Numeric value */}
      <div className="text-[10px] font-mono tabular-nums text-text-secondary">
        {Math.round(exhaustion)}
      </div>
    </div>
  );
}
```

### 7. Tooltip

On hover over the candle container, show a `title` attribute (simplest approach, no custom tooltip component needed):

```
War Exhaustion: 342
State: WANING
Exhaustion is irreversible. Every turn of war,
every static front, every supply crisis adds to it.
When it runs out, your faction cannot fight.
```

Implement via `title` prop on the outer `<div>`. No custom tooltip component.

### 8. Animation

- **Strong/Steady:** Static flame glow (no animation).
- **Waning:** `animate-pulse` (Tailwind built-in, 2s ease-in-out infinite).
- **Critical:** `animate-pulse` (same class, but the red color creates urgency).
- **Spent:** No flame element rendered at all. The candle is a dark stub.

No custom CSS animations needed -- Tailwind's `animate-pulse` is sufficient and already available in the project.

### 9. Integration in ArmyHQModal

In `ArmyHQModal.tsx`, import and place the component:

```typescript
import { ExhaustionClock } from './ExhaustionClock';
```

In the BRIEFING tab top grid (line ~256), change:

```tsx
// FROM:
<div className="grid grid-cols-[1fr_1fr_auto_1fr] gap-4 mb-4 items-stretch">
  {/* Commander */}
  {/* CoS Brief */}
  {/* Army Crest */}
  {/* Strategic Position */}
</div>

// TO:
<div className="grid grid-cols-[1fr_1fr_auto_auto_1fr] gap-4 mb-4 items-stretch">
  {/* Commander */}
  {/* CoS Brief */}
  {/* Army Crest */}
  {/* Exhaustion Clock — NEW */}
  <ExhaustionClock
    exhaustion={state.warPhaseExhaustion?.[faction] ?? 0}
    faction={faction}
  />
  {/* Strategic Position */}
</div>
```

### 10. Modified Files

- **New:** `src/ui/map/components/army_hq/ExhaustionClock.tsx`
- **Modified:** `src/ui/map/components/army_hq/ArmyHQModal.tsx` (import + grid layout change + component placement)

No store changes needed. No data pipeline changes. The exhaustion value is already parsed and available.

### 11. Verification

1. `npx tsc --noEmit` -- zero errors
2. `npm run test:vitest` -- all pass
3. `npm run desktop:map:build` -- builds
4. Load a mid-game save (week 30+), open Army HQ, verify candle appears between crest and strategic position, verify it reflects the exhaustion value, verify pulse animation at high exhaustion

---

## Implementation Order

1. **Exhaustion Clock first** -- smaller surface area (1 new file, 1 modified file), no data loading, can be verified immediately in any save.
2. **Ghost Map second** -- more files touched, requires GeoJSON loading, needs census data served correctly by Vite/Electron.

## Questions the Nightshift Agent Should NOT Need to Answer

All design decisions are made above. If something is ambiguous, follow the simpler path. Do not add features beyond what is specified. Do not create tests for these visual components (no existing pattern for Deck.gl layer tests or HQ component tests in this codebase).
