# LANE-NIGHTSHIFT-V094-THIRD-VISUAL-FEATURE — Closeout Report (Refugee Column)

**Date:** 2026-05-05
**Status:** CLOSED — feature flag flipped default ON
**Predecessors / Siblings:**
- LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION (commit `7e5397d2`, report `20260504_MAP_THAT_SCARS_VALIDATION.md`)
- LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW (commit `2d14feec`, report `20260505_FORCE_QUALITY_GLOW_VALIDATION.md`)

**Plan:** `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md` — v0.9.4 Phase 3 (Legendary Map Features)
**Owner:** Graphics Programmer / QA Engineer (Pyrrhic)

---

## 1. Lane / Goal

Close the **third** v0.9.4 (Visual Layer) feature: a **Refugee Column** overlay
that draws per-displacement-event escape routes as a deck.gl `PathLayer`,
mirroring the Map That Scars + Force-Quality Glow validation pattern (UI-only
flag flip; descriptor-level validation; no smoke run required).

The first v0.9.4 feature (Map That Scars) closed on 2026-05-04. The second
(Force-Quality Glow) closed on 2026-05-05. This lane closes the third per the
same Path A pattern: build → builder tests assert the four UI-only failure
modes (faction-symmetry / capability-gated / empty-data-safe / no-faction-
asymmetric-coupling) → flag default-ON via builder test verdict, NOT a smoke
run.

---

## 2. Substrate Verification

`LoadedGameState.displacementEventLog` (declared at `src/ui/map/data/types.ts:738`)
exposes per-event records:

```ts
displacementEventLog: Array<{
  turn: number;
  origin_osid?: string;     // FROM osid (route start)
  dest_osid?: string;       // TO osid (route end)
  origin_mun?: string;
  ethnicity?: string;       // canonical faction id ('RBiH'|'RS'|'HRHB')
  displaced: number;        // total civilians displaced
  killed: number;
  fled_abroad: number;
  settled: number;
  caused_by?: string;
}>
```

Engine-side write at `src/state/displacement.ts:441-452` confirms `ethnicity:
fid` carries the canonical faction id (verified against the `factions:
FactionId[] = ['RBiH', 'RS', 'HRHB']` declaration at line 400 of the same file).

Many events have `dest_osid === undefined` (pure outflow events with no routed
destination). Those events have no path to draw; the builder skips them
silently. This is a fundamental property of the data, not a bug — the lane's
filter is a strict-pair filter `(origin_osid && dest_osid && origin !== dest)`.

**Substrate verdict: GREEN.** The required `(from, to, count, faction, week)`
tuple is reachable directly from the existing UI projection. **No pivot to
Corridor Heartbeat (option B) was needed.**

---

## 3. Implementation Summary

### Files

| Path | Kind | Notes |
|------|------|-------|
| `src/ui/map/layers/buildRefugeeColumnOverlay.ts` | NEW | Builder + layer factory + width tier function. Imports `FACTION_GLOW_RGB` + `factionGlowRgb` from `buildForceQualityOverlay.ts` (single source of truth) and re-exports for caller convenience. |
| `src/ui/map/layers/deckLayerCapabilities.ts` | EDIT | Added `refugeeColumnVisible: boolean` capability + `refugeeColumnVisible: false` default. |
| `src/ui/map/layers/composeTacticalDeckLayers.ts` | EDIT | Added optional `refugeeColumnData` prop, capability-gated layer slot above force-quality glow and below experimental layers. |
| `src/ui/map/map/MapContainer.tsx` | EDIT | Added `REFUGEE_COLUMN_FEATURE_FLAG = true`, prop pass-through in `composeDeckLayersForCurrentSelection`, render-time `buildRefugeeColumnData(...)` call. |
| `tests/refugee_column_overlay_builder.test.ts` | NEW | Eight tests T1..T8. |
| `docs/40_reports/implemented/20260505_REFUGEE_COLUMN_VALIDATION.md` | NEW | This report. |

Single-owner edits per spec. No engine, scenario, OOB, or canon files touched.
None of the Wave 9 reserved files modified
(`officer_quality_update.ts`, `attack_resolution_osid.ts`,
`attack_post_battle_effects.ts`, `osid_graph_analysis.ts`, `bot_corps_ai.ts`,
`bot_brigade_ai_osid.ts`, `consequences.json`).

### Singular-ownership note (palette)

`FACTION_GLOW_RGB` and `factionGlowRgb` were established by Force-Quality Glow
(Wave 8 Lane D, `buildForceQualityOverlay.ts`). This lane's builder imports and
re-exports them rather than declaring a second copy. Single source of truth.
Future tactical deck.gl layers wanting per-faction color should follow the same
import-and-reuse pattern.

### Layer composition (capability gate + ordering)

```ts
// composeTacticalDeckLayers.ts
const refugeeColumn: Layer[] = (
  caps.refugeeColumnVisible
  && args.refugeeColumnData
  && args.refugeeColumnData.length > 0
)
  ? [buildRefugeeColumnOverlay(args.refugeeColumnData)]
  : [];

// Layer order (bottom → top):
//   ghost → scars → forceQuality → refugeeColumn → experimental → counters
return [...ghost, ...scars, ...forceQuality, ...refugeeColumn, ...under, ...counters];
```

The refugee column renders **above** the Force-Quality Glow (paths read
better on a partly-tinted ground) and **below** the experimental tactical
layers (front lines, ops arcs, unit dots) so symbols and front edges are not
occluded.

### Color choice — faction-symmetric per-faction-of-origin (palette lookup)

Color comes from a frozen 3-key palette `FACTION_GLOW_RGB` (RBiH=green,
RS=red, HRHB=blue), keyed off the event's `ethnicity` field (which the
engine writes as the canonical faction id). The implementation is a pure
palette lookup; the same code path runs for every faction. There is no
`if (faction === 'X') ...` branch. T5 pins this structurally.

The accessor returns RGBA `[r, g, b, 180]` — alpha 180/255 ≈ 0.71 so paths
read clearly against territory fill but do not occlude underlying detail.

### Width tier (capped to 2000m)

| `displaced_count` range | width (meters) | role |
|-------------------------|----------------|------|
| `≤ 0` / NaN             | 0 (skipped)    | no paint |
| `(0, 100)`              | 300            | trickle |
| `[100, 1000)`           | 600            | column |
| `[1000, 10_000)`        | 1200           | mass flight |
| `≥ 10_000`              | 2000           | catastrophe (cap) |

The cap at 2000m prevents a Srebrenica-class mass-displacement event (~25k
civilians displaced in a single turn at one OSID) from visually dominating
the map. T6 explicitly asserts the cap holds at 1,000,000 displaced.

### Aggregation rule

Per `(origin_osid, dest_osid, week_index, faction_origin)` tuple, take the
**sum** of `displaced` across all matching events. This collapses multiple
sub-events on the same route + turn into one path; cross-turn events on the
same route remain distinct (so the player can see the timeline of flight via
distinct paths per turn). Filters:

- `origin_osid` AND `dest_osid` both present (skip pure-outflow events).
- `origin_osid !== dest_osid` (skip self-loops — nothing to draw).
- `displaced > 0` (skip zero-paint events).
- `turn` is finite.
- `ethnicity` (faction-of-origin) is present.
- Both centroids resolve in the lookup.

---

## 4. Validation Evidence (T1..T8)

`tests/refugee_column_overlay_builder.test.ts`

| ID | Description | Verdict |
|----|-------------|---------|
| T1 | Builder shape: returns `RefugeeColumnDatum[]` with `from_osid` / `to_osid` / `week_index` / `faction_origin` / `displaced_count` / `path`; filters events missing origin or dest, missing centroid, or self-loop. | GREEN |
| T2 | Empty input safe: empty event array → empty data → `PathLayer` with `data:[]`, no throw. | GREEN |
| T3 | Zero-displacement skip: `displaced` = 0 / negative / NaN does NOT enter the layer. | GREEN |
| T4 | Per-(origin, dest, turn, faction) aggregation: 3 RBiH events on the same route+turn collapse to one datum (sum 650); a 4th RS event same route+turn is a separate datum; a 5th RBiH event on a different turn is a separate datum. | GREEN |
| T5 | Faction-symmetric mechanism: `factionGlowRgb` is a pure palette lookup over `FACTION_GLOW_RGB`; cycling RBiH/RS/HRHB through the same route + displaced count yields the per-faction palette RGB and identical alpha. | GREEN |
| T6 | Per-tier width gradient: 0 → 0, `<100` → 300, `[100,1k)` → 600, `[1k,10k)` → 1200, `≥10k` → 2000 (cap holds at 1,000,000). Layer accessor returns the width function. | GREEN |
| T7 | Capability gate: `composeTacticalDeckLayers` with `refugeeColumnVisible: true` + empty data → no layer. With `+ live data` → layer added. With `refugeeColumnVisible: false` + live data → no layer. | GREEN |
| T8 | Deterministic: byte-equal inputs in different insertion orders produce byte-identical output (sorted by `(from_osid, to_osid, week_index, faction_origin)` strictCompare); aggregated route carries summed `displaced_count`. | GREEN |

```
$ node_modules/.bin/vitest run tests/refugee_column_overlay_builder.test.ts tests/force_quality_overlay_builder.test.ts tests/osid_damage_overlay_builder.test.ts
 ✓ tests/refugee_column_overlay_builder.test.ts (8 tests) 10ms
 ✓ tests/force_quality_overlay_builder.test.ts  (8 tests) 10ms
 ✓ tests/osid_damage_overlay_builder.test.ts    (8 tests) 9ms

 Test Files  3 passed (3)
      Tests  24 passed (24)
```

`tsc --noEmit` clean for all lane-touched files (no errors filtered for
`buildRefugeeColumnOverlay.ts`, `composeTacticalDeckLayers.ts`,
`deckLayerCapabilities.ts`, `MapContainer.tsx`, or
`refugee_column_overlay_builder.test.ts`).

---

## 5. Flag Flip Decision — Default ON

```ts
// src/ui/map/map/MapContainer.tsx
const REFUGEE_COLUMN_FEATURE_FLAG = true;
```

### Rationale

1. **Layer descriptor validated** by T5 (faction-symmetric palette assertion),
   T6 (width gradient with cap pinned), T7 (gate behavior), T8 (determinism).
2. **Capability gate is double-defended:** `MapContainer` checks
   `REFUGEE_COLUMN_FEATURE_FLAG && data.length > 0`; `composeTacticalDeckLayers`
   independently checks `caps.refugeeColumnVisible && data && data.length > 0`.
   If `displacementEventLog` is absent or empty, no layer is added.
3. **Faction-symmetric mechanism** asserted structurally by T5: a single
   palette lookup, no `if (faction === ...)` branches. Width is also faction-
   independent (purely a function of `displaced_count`).
4. **Mass-displacement cap (2000m)** prevents a single Srebrenica-class event
   from visually dominating; T6 pins this against 1,000,000 displaced.
5. **Deterministic builder:** sorted output by composite tuple key, no
   `Math.random`, no `Date.now`, no environment leak.
6. **No engine path:** UI-only flag; sim is untouched. 40w hash byte-stability
   is preserved by construction (the engine doesn't see this layer).

### Revert path

If a regression is detected on the live map, flip the constant back to `false`:

```ts
const REFUGEE_COLUMN_FEATURE_FLAG = false;
```

No other code change is required — the capability gate cascades from the
constant.

---

## 6. Sensitive-History Compliance Assertions

| Constraint | Verdict | Evidence |
|------------|---------|----------|
| Ring 1 (visual representation of existing data, not new mechanic) | PASS | Builder reads existing `LoadedGameState.displacementEventLog`; no engine plumbing, no new save fields, no engine code touched. |
| UI-only — does NOT enter sim path | PASS | All edits in `src/ui/map/`. No imports from `src/sim/` or `src/state/`. |
| No faction-asymmetric coupling | PASS | T5 pins the palette as a frozen lookup table; same code path for every faction; no conditional color logic. Width is faction-independent. |
| No §6 surface | PASS | No FORAWWV, no paint anchor, no `political_controllers`, no OOB JSON, no rupture wiring, no `enclave_resilience.ts` touched. |
| Default OFF until validation passes | N/A — passed | T1..T8 all GREEN, then default-ON in same lane (per spec). |
| No new sim plumbing | PASS | Builder consumes existing UI projection of state. |
| No data embedded in `final_save.json` | PASS | Sidecar pattern: build at render time from `LoadedGameState`. |

Wave 9 reserved-file ownership respected:

- `src/sim/combat/officer_quality_update.ts` — NOT TOUCHED.
- `src/sim/combat/attack_resolution_osid.ts` — NOT TOUCHED.
- `src/sim/combat/attack_post_battle_effects.ts` — NOT TOUCHED.
- `src/sim/combat/osid_graph_analysis.ts` — NOT TOUCHED.
- `src/sim/combat/bot_corps_ai.ts` — NOT TOUCHED.
- `src/sim/combat/bot_brigade_ai_osid.ts` — NOT TOUCHED.
- `data/scenarios/events/consequences.json` — NOT TOUCHED.

---

## 7. Determinism Contract

`buildRefugeeColumnData` is a pure function over `(events, centroidLookup)`:

- Aggregates per `(from_osid, to_osid, week_index, faction_origin)` via plain
  `Map<string, ...>` accumulator; key uses `'|'` separator (forbidden in
  OSIDs and faction ids).
- Sorts output entries by structured tuple via explicit comparator
  (`strictCompare` on string fields, numeric subtraction on `week_index`) so
  byte-stability is independent of `turn` digit-length.
- No `Math.random`, no `Date.now`, no `new Date`, no `process.env`, no
  locale-sensitive sort, no async operations.
- Sum computed via explicit accumulator — deterministic.

`buildRefugeeColumnOverlay` is a pure factory: layer id, data reference, prop
flags, and `getColor` / `getWidth` accessors are deterministic functions of the
input data. T8 asserts byte-stability across reordered inputs.

40w hash NOT required to change — UI-only flag, no sim path. The engine
doesn't see this layer; determinism of the engine is preserved by
construction.

---

## 8. Verification Gates

| Gate | Result |
|------|--------|
| Substrate verification: `displacementEventLog` exposes `(from, to, count, faction, week)` | PASS |
| 8/8 T1..T8 GREEN | PASS |
| 16/16 sibling tests GREEN (force-quality + osid-damage; no regression) | PASS |
| `npx tsc --noEmit` clean for all lane-touched files | PASS |
| `REFUGEE_COLUMN_FEATURE_FLAG` default `true` | DONE |
| Capability gate double-defended (flag + length>0) | DONE |
| Singular-ownership: `FACTION_GLOW_RGB` not duplicated (re-exported from canonical source) | DONE |
| Validation report shipped | DONE (this file) |

---

## 9. v0.9.4 Progression Note

This is the **third feature of v0.9.4 (Visual Layer / Legendary Map
Features) to fully close**. Lane sequence:

- [x] Map That Scars (renderer + validation) — CLOSED 2026-05-04 (`7e5397d2`)
- [x] Force-Quality Glow (builder + validation) — CLOSED 2026-05-05 (`2d14feec`)
- [x] **Refugee Column (builder + validation) — CLOSED 2026-05-05 (this lane)**
- [ ] Corridor Heartbeat — pending

Phase 1 (Shell + Transition Polish), Phase 2 (Visual Consistency), and the
remaining Phase 3 feature (Corridor Heartbeat) remain open.

---

## 10. Successor Handoffs

### Recommended next v0.9.4 (Visual Layer) candidate

**Corridor Heartbeat** — corridor-pulse animation along the Posavina (Brčko)
corridor and other strategic lifelines, signaling supply lift / cut-off
events. Substrate: `LoadedGameState.osidAdjacency` + strategic-corridor
metadata. Same Ring 1 / UI-only / no-§6 / faction-symmetric envelope.

Suggested skeleton (mirror this lane's pattern):

1. New builder `src/ui/map/layers/buildCorridorHeartbeatOverlay.ts`.
2. New capability `corridorHeartbeatVisible: boolean` in `deckLayerCapabilities.ts`.
3. Wire pass-through in `composeTacticalDeckLayers.ts`.
4. `CORRIDOR_HEARTBEAT_FEATURE_FLAG` in `MapContainer.tsx`.
5. Test file `tests/corridor_heartbeat_overlay_builder.test.ts` mirroring
   T1..T8 (corridor segment data, empty-safe, capability-gated, faction-
   symmetric, deterministic).
6. Validation report ↔ default-ON flip.

### Refugee Column animation enhancement

The current implementation is **static** (a path exists for every aggregated
route + turn tuple, all rendered together). A future enhancement could
animate paths to flow over time, fading in by turn and out a few turns
later. Two implementation paths:

- **TripsLayer (deck.gl):** time-keyed rendering with `currentTime` prop.
  Requires a render-loop tick + `updateTriggers: { currentTime }`.
- **Per-turn cohorts:** filter `refugeeColumnData` by current turn (or last
  N turns) at compose time, fading older paths via alpha.

Either approach is a clean follow-on lane; not required for v1.

### Per-route enhancements

- Curved paths (Bezier control point offset perpendicular to the great-
  circle line) — would distinguish two-way migration on a single OSID-pair
  axis.
- `caused_by` filter — color-code or stripe paths by the displacement
  cause (combat / takeover / minority_flight / patron_pressure).
- Settlement-detail tooltip on hover (PathLayer `pickable: true` + tooltip
  callback).

---

## 11. Concurrent Lane Awareness

This lane's exclusive file ownership does not overlap with sibling Wave 9
lanes:

- Lane A (officer_quality_update / attack_resolution_osid / attack_post_battle_effects) — DIFFERENT FILES.
- Lane B (osid_graph_analysis / bot_corps_ai / bot_brigade_ai_osid) — DIFFERENT FILES.
- Lane D (consequences.json events) — DIFFERENT FILE.

Pre-existing tsc errors in concurrent-lane files (if any) are not regressions
caused by this work; this lane's tsc filter ran clean for all its own files.

Per spec, this lane has STAGED but NOT COMMITTED its files. The parent agent
performs the commit phase sequentially.

---

**End of report.**
