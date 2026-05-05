# LANE-NIGHTSHIFT-V094-CORRIDOR-HEARTBEAT — Closeout Report (Corridor Heartbeat)

**Date:** 2026-05-05
**Status:** CLOSED — feature flag flipped default ON; v0.9.4 (Visual Layer / Legendary Map Features) **fully closed**.
**Predecessors / Siblings:**
- LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION (commit `7e5397d2`, report `20260504_MAP_THAT_SCARS_VALIDATION.md`)
- LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW (commit `2d14feec`, report `20260505_FORCE_QUALITY_GLOW_VALIDATION.md`)
- LANE-NIGHTSHIFT-V094-THIRD-VISUAL-FEATURE / Refugee Column (commit `6f64d152`, report `20260505_REFUGEE_COLUMN_VALIDATION.md`)

**Plan:** `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md` — v0.9.4 Phase 3 (Legendary Map Features)
**Owner:** Graphics Programmer / QA Engineer (Pyrrhic)

---

## 1. Lane / Goal

Close the **fourth and final** v0.9.4 (Visual Layer) feature: a **Corridor
Heartbeat** overlay that draws strategic-corridor pulses along contested
front-edge segments as a deck.gl `PathLayer`, mirroring the Map That Scars +
Force-Quality Glow + Refugee Column validation pattern (UI-only flag flip;
descriptor-level validation; no smoke run required).

The first v0.9.4 feature (Map That Scars) closed on 2026-05-04. The second
(Force-Quality Glow) and third (Refugee Column) closed on 2026-05-05. This
lane closes the fourth per the same Path A pattern: build → builder tests
assert the four UI-only failure modes (faction-symmetry / capability-gated /
empty-data-safe / no-faction-asymmetric-coupling) → flag default-ON via
builder test verdict, NOT a smoke run.

---

## 2. Substrate Verification

The lane spec instructed to use `LoadedGameState.osidAdjacency +
strategic-corridor metadata` if available; otherwise to derive corridor edges
from adjacency + a proxy (front_edges intersection or political-controllers
boundary).

**Substrate findings:**

- `LoadedGameState.osidAdjacency` is **NOT** a field on `LoadedGameState` —
  the OSID contact graph is loaded into a local `osidAdjacencyRef` inside
  `MapContainer.tsx` (via `loadOsidAdjacency()` from `DataLoader.ts`), not
  exposed on the projected UI state.
- No `strategic_corridors` / `supply_corridors` classification field exists
  on `LoadedGameState`. The existing canonical sub-graph is the
  contested-edge graph: `LoadedGameState.frontEdgesOsid` (declared at
  `src/ui/map/data/types.ts:730`).
- `LoadedGameState.frontPressureByEdge` (declared at `src/ui/map/data/types.ts:731`)
  exposes optional `{value, max_abs}` per edge — the canonical normalized
  corridor-pressure scalar.

**Derivation rule (per lane spec):** every contested front edge IS a corridor
segment. Two OSIDs whose `side_a !== side_b` are at a contested boundary —
the lifeline of one is the pressure axis of the other. The pulse intensity
reflects normalized pressure (`|value| / max_abs`, clamped to `[0, 1]`),
falling back to a small constant (`0.15`) when no pressure record is
available so corridor structure remains visible on early-war saves.

**Substrate verdict: GREEN.** The required `(from, to, faction, intensity)`
tuple is reachable directly from the existing UI projection (`frontEdgesOsid`
+ optional `frontPressureByEdge`). **No new sim plumbing, no new save embed,
no new derived data file.**

This derivation is honest about its limits: it is NOT a routed strategic-
corridor classification (e.g., "the Posavina/Brčko corridor is special").
The visual reads every contested boundary as a corridor segment, which
matches the player-facing intuition that "where the front is" is "where the
pressure flows". A future lane could enrich this with a curated
`strategic_corridors.json` data file to highlight Posavina/Brčko, Sarajevo,
Mostar, Goražde specifically — but that requires new canonical data and is
out of scope for this Ring 1 / UI-only lane.

---

## 3. Implementation Summary

### Files

| Path | Kind | Notes |
|------|------|-------|
| `src/ui/map/layers/buildCorridorHeartbeatOverlay.ts` | NEW | Builder + layer factory + width-tier function + period-tier function. Imports `FACTION_GLOW_RGB` + `factionGlowRgb` from `buildForceQualityOverlay.ts` (single source of truth) and re-exports for caller convenience. |
| `src/ui/map/layers/deckLayerCapabilities.ts` | EDIT | Added `corridorHeartbeatVisible: boolean` capability + `corridorHeartbeatVisible: false` default. |
| `src/ui/map/layers/composeTacticalDeckLayers.ts` | EDIT | Added optional `corridorHeartbeatData` prop, capability-gated layer slot above refugee-column and below experimental layers. |
| `src/ui/map/map/MapContainer.tsx` | EDIT | Added `CORRIDOR_HEARTBEAT_FEATURE_FLAG = true`, prop pass-through in `composeDeckLayersForCurrentSelection`, render-time `buildCorridorHeartbeatData(...)` call (with adapters from `LoadedGameState.frontEdgesOsid` + optional `frontPressureByEdge`). |
| `tests/corridor_heartbeat_overlay_builder.test.ts` | NEW | Eight tests T1..T8. |
| `docs/40_reports/implemented/20260505_CORRIDOR_HEARTBEAT_VALIDATION.md` | NEW | This report. |

Single-owner edits per spec. No engine, scenario, OOB, or canon files
touched. Wave 9/10 reserved files NOT modified
(`officer_quality_update.ts`, `attack_resolution_osid.ts`,
`attack_post_battle_effects.ts`, `osid_graph_analysis.ts`, `bot_corps_ai.ts`,
`bot_brigade_ai_osid.ts`, `consequences.json`).

### Singular-ownership note (palette)

`FACTION_GLOW_RGB` and `factionGlowRgb` were established by Force-Quality
Glow (Wave 8 Lane D, `buildForceQualityOverlay.ts`). The Refugee Column
lane re-exported them from there. This lane's builder follows the same
pattern: `import { FACTION_GLOW_RGB, factionGlowRgb } from './buildForceQualityOverlay'`
and re-export. **No second copy anywhere in the repo.** Single source of
truth preserved across all four v0.9.4 visual layers.

### Layer composition (capability gate + ordering)

```ts
// composeTacticalDeckLayers.ts
const corridorHeartbeat: Layer[] = (
  caps.corridorHeartbeatVisible
  && args.corridorHeartbeatData
  && args.corridorHeartbeatData.length > 0
)
  ? [buildCorridorHeartbeatOverlay(args.corridorHeartbeatData)]
  : [];

// Layer order (bottom → top):
//   ghost → scars → forceQuality → refugeeColumn → corridorHeartbeat → experimental → counters
return [...ghost, ...scars, ...forceQuality, ...refugeeColumn, ...corridorHeartbeat, ...under, ...counters];
```

The corridor heartbeat renders **above** the Refugee Column (paths read
better stacked in this order: ground tint → flight strands → corridor
heartbeats) and **below** the experimental tactical layers (front lines,
ops arcs, unit dots) so symbols and front edges are not occluded.

### Color choice — faction-symmetric per-friendly-side (palette lookup)

Color comes from a frozen 3-key palette `FACTION_GLOW_RGB` (RBiH=green,
RS=red, HRHB=blue), keyed off the friendly side of the contested edge —
the side whose lifeline this corridor segment represents. The
implementation is a pure palette lookup; the same code path runs for
every faction. There is no `if (faction === 'X') ...` branch. T5 pins
this structurally.

The accessor returns RGBA `[r, g, b, 200]` — alpha 200/255 ≈ 0.78 so paths
read clearly against territory fill but do not occlude underlying detail.
The slightly higher alpha than Refugee Column (180) gives corridor
heartbeats more presence in the visual stack, reflecting that they
indicate strategic-pressure axes rather than civilian-flight events.

### Two-sided emission

For each contested edge `(a, b, side_a, side_b)` with `side_a !== side_b`,
the builder emits **two** datums:
- `(from=a, to=b, faction=side_a)` — `side_a`'s lifeline pointing at the
  hostile-controlled OSID.
- `(from=b, to=a, faction=side_b)` — `side_b`'s lifeline pointing at the
  hostile-controlled OSID.

This is faction-symmetric by construction: both sides see the same
contested boundary as their own pressure axis, colored in their faction's
palette tint.

### Width tier (capped to 1500m)

| `intensity` range | width (meters) | role |
|-------------------|----------------|------|
| `≤ 0` / NaN       | 0 (skipped)    | no paint |
| `(0, 0.25)`       | 240            | faint pulse — dormant lifeline |
| `[0.25, 0.6)`     | 480            | moderate pulse — active pressure |
| `[0.6, 0.9)`      | 900            | strong pulse — heavy pressure |
| `≥ 0.9`           | 1500           | heartbeat — critical lifeline (cap) |

The cap at 1500m prevents a single critical lifeline (e.g., Posavina/Brčko
at maximum pressure) from visually dominating the map. T6 explicitly
asserts the cap holds at intensity `1_000_000`.

### Period tier (reserved for animation follow-on)

| `intensity` range | period (ms) | role |
|-------------------|-------------|------|
| `≤ 0` / NaN       | 2400        | dormant beat (slow) |
| `< 0.25`          | 2400        | dormant beat (slow) |
| `[0.25, 0.6)`     | 1600        | active beat |
| `[0.6, 0.9)`      | 1100        | pressure beat |
| `≥ 0.9`           | 700         | heartbeat (fast) |

`period_ms` is retained on each datum for a future `TripsLayer` or shader
follow-on that wants a time-keyed pulse. **The current static
implementation does NOT consume `period_ms`** — see "Animation status"
below.

### Aggregation rule

Per `(friendly_osid, hostile_osid, faction)` tuple, take the **MAX** of
intensities across all readings. Picking max (not sum) reflects that a
single corridor segment is one lifeline; multiple readings of the same
segment should not stack visually. Filters:

- Both `a` and `b` OSIDs present and non-empty.
- `a !== b` (no zero-length self-loops).
- Both `side_a` and `side_b` present and `side_a !== side_b` (contested
  edge — that's what defines a corridor segment).
- Both centroids resolve in the lookup.
- `intensity > 0` (zero-pressure dormant edges are skipped — no paint).

Zero-pressure handling is explicit: a `frontPressureByEdge` record with
`value === 0` (and finite `max_abs`) is treated as authoritative-zero and
the edge is suppressed. NaN / non-finite pressure values fall back to the
`0.15` default so the edge still renders (the engine simply has not yet
populated pressure).

---

## 4. Validation Evidence (T1..T8)

`tests/corridor_heartbeat_overlay_builder.test.ts`

| ID | Description | Verdict |
|----|-------------|---------|
| T1 | Builder shape: returns `CorridorHeartbeatDatum[]` with `from_osid` / `to_osid` / `faction` / `intensity` / `period_ms` / `path`; filters edges with missing OSIDs, missing sides, same-side pairs, self-loops, or unresolved centroids. | GREEN |
| T2 | Empty input safe: empty edge array → empty data → `PathLayer` with `data:[]`, no throw. | GREEN |
| T3 | Zero-intensity skip: edges with explicit zero pressure (finite `value=0`, finite `max_abs>0`) DO NOT enter the layer; edges with NaN pressure fall back to the `0.15` default. | GREEN |
| T4 | Per-corridor MAX aggregation: three readings of the same `(src, dst, RBiH)` corridor at intensities `0.2 / 0.7 / 0.4` → ONE RBiH datum with intensity `0.7` (the max). The hostile-side `(dst, src, RS)` datum carries the same max. | GREEN |
| T5 | Faction-symmetric mechanism: `factionGlowRgb` is a pure palette lookup over `FACTION_GLOW_RGB`; cycling RBiH/RS/HRHB through the same corridor + intensity yields the per-faction palette RGB and identical alpha. | GREEN |
| T6 | Per-tier width gradient: 0 / negative / NaN → 0; `(0,0.25)` → 240; `[0.25,0.6)` → 480; `[0.6,0.9)` → 900; `≥0.9` → 1500 (cap holds at 1,000,000). Period gradient inverse: 2400 → 1600 → 1100 → 700. Layer accessor returns the width function. | GREEN |
| T7 | Capability gate: `composeTacticalDeckLayers` with `corridorHeartbeatVisible: true` + empty data → no layer. With `+ live data` → layer added. With `corridorHeartbeatVisible: false` + live data → no layer. | GREEN |
| T8 | Deterministic: byte-equal inputs in different insertion orders produce byte-identical output (sorted by `(from_osid, to_osid, faction)` strictCompare); aggregated route carries max intensity. Full 8-tuple ordering pinned. | GREEN |

```
$ node_modules/.bin/vitest run tests/corridor_heartbeat_overlay_builder.test.ts \
    tests/refugee_column_overlay_builder.test.ts \
    tests/force_quality_overlay_builder.test.ts \
    tests/osid_damage_overlay_builder.test.ts
 ✓ tests/corridor_heartbeat_overlay_builder.test.ts (8 tests) 12ms
 ✓ tests/refugee_column_overlay_builder.test.ts      (8 tests) 11ms
 ✓ tests/force_quality_overlay_builder.test.ts       (8 tests) 10ms
 ✓ tests/osid_damage_overlay_builder.test.ts         (8 tests)  9ms

 Test Files  4 passed (4)
      Tests  32 passed (32)
```

`tsc --noEmit` clean for all lane-touched files (no errors filtered for
`buildCorridorHeartbeatOverlay.ts`, `composeTacticalDeckLayers.ts`,
`deckLayerCapabilities.ts`, `MapContainer.tsx`, or
`corridor_heartbeat_overlay_builder.test.ts`).

---

## 5. Flag Flip Decision — Default ON

```ts
// src/ui/map/map/MapContainer.tsx
const CORRIDOR_HEARTBEAT_FEATURE_FLAG = true;
```

### Rationale

1. **Layer descriptor validated** by T5 (faction-symmetric palette
   assertion), T6 (width + period gradient with cap pinned), T7 (gate
   behavior), T8 (determinism with full 8-tuple ordering).
2. **Capability gate is double-defended:** `MapContainer` checks
   `CORRIDOR_HEARTBEAT_FEATURE_FLAG && data.length > 0`;
   `composeTacticalDeckLayers` independently checks
   `caps.corridorHeartbeatVisible && data && data.length > 0`. If
   `frontEdgesOsid` is absent or empty (early-war pre-front-formation),
   no layer is added.
3. **Faction-symmetric mechanism** asserted structurally by T5: a single
   palette lookup, no `if (faction === ...)` branches. Width / period are
   also faction-independent (purely functions of `intensity`).
4. **Critical-lifeline cap (1500m at intensity ≥0.9)** prevents a single
   maxed-out corridor from visually dominating; T6 pins this against
   intensity `1_000_000`.
5. **Deterministic builder:** sorted output by composite tuple key, MAX
   aggregator (no order-sensitive sum), no `Math.random`, no `Date.now`,
   no environment leak.
6. **No engine path:** UI-only flag; sim is untouched. 40w hash byte-
   stability is preserved by construction (the engine doesn't see this
   layer).

### Revert path

If a regression is detected on the live map, flip the constant back to
`false`:

```ts
const CORRIDOR_HEARTBEAT_FEATURE_FLAG = false;
```

No other code change is required — the capability gate cascades from the
constant.

---

## 6. Sensitive-History Compliance Assertions

| Constraint | Verdict | Evidence |
|------------|---------|----------|
| Ring 1 (visual representation of existing data, not new mechanic) | PASS | Builder reads existing `LoadedGameState.frontEdgesOsid` + optional `LoadedGameState.frontPressureByEdge`; no engine plumbing, no new save fields, no engine code touched. |
| UI-only — does NOT enter sim path | PASS | All edits in `src/ui/map/`. No imports from `src/sim/` or `src/state/`. |
| No faction-asymmetric coupling | PASS | T5 pins the palette as a frozen lookup table; same code path for every faction; no conditional color logic. Width / period are faction-independent. Two-sided emission is symmetric by construction. |
| No §6 surface | PASS | No FORAWWV, no paint anchor, no `political_controllers`, no OOB JSON, no rupture wiring, no `enclave_resilience.ts` touched. |
| Default OFF until validation passes | N/A — passed | T1..T8 all GREEN, then default-ON in same lane (per spec). |
| No new sim plumbing | PASS | Builder consumes existing UI projection of state. |
| No data embedded in `final_save.json` | PASS | Sidecar pattern: build at render time from `LoadedGameState`. |
| Singular ownership of `FACTION_GLOW_RGB` | PASS | Imported (and re-exported) from `buildForceQualityOverlay.ts`. No second copy. |

Wave 9/10 reserved-file ownership respected:

- `src/sim/combat/officer_quality_update.ts` — NOT TOUCHED (Phase 1 OQ-Growth lane owns).
- `src/sim/combat/attack_resolution_osid.ts` — NOT TOUCHED.
- `src/sim/combat/attack_post_battle_effects.ts` — NOT TOUCHED.
- `src/sim/combat/osid_graph_analysis.ts` — NOT TOUCHED.
- `src/sim/combat/bot_corps_ai.ts` — NOT TOUCHED.
- `src/sim/combat/bot_brigade_ai_osid.ts` — NOT TOUCHED.
- `data/scenarios/events/consequences.json` — NOT TOUCHED.
- Any `src/sim/` file — NOT TOUCHED.

---

## 7. Determinism Contract

`buildCorridorHeartbeatData` is a pure function over
`(edges, pressureByEdgeId, centroidLookup)`:

- Iterates edges in `edge_id` strictCompare-sorted order before scratch
  emission, so two-sided emission per edge is byte-stable across input
  permutations.
- Aggregates per `(friendly_osid, hostile_osid, faction)` via plain
  `Map<string, ...>` accumulator; key uses `'|'` separator (forbidden in
  OSIDs and faction ids).
- MAX aggregator (not sum) — order-insensitive by construction.
- Sorts output entries by structured tuple via explicit comparator
  (`strictCompare` on string fields) so byte-stability is independent of
  `edge_id` digit-length or insertion order.
- No `Math.random`, no `Date.now`, no `new Date`, no `process.env`, no
  locale-sensitive sort, no async operations.
- Pressure clamp `Math.max(0, Math.min(1, |value|/max_abs))` is
  deterministic and finite-safe.

`buildCorridorHeartbeatOverlay` is a pure factory: layer id, data
reference, prop flags, and `getColor` / `getWidth` accessors are
deterministic functions of the input data. T8 asserts byte-stability
across reordered inputs with full 8-tuple ordering pinned.

40w hash NOT required to change — UI-only flag, no sim path. The engine
doesn't see this layer; determinism of the engine is preserved by
construction.

---

## 8. Animation Status — STATIC

deck.gl `PathLayer` does **not** natively support time-keyed pulse rendering.
The canonical animated path layer is `TripsLayer`, which requires a
render-loop tick and `updateTriggers: { currentTime }` driving a live
`currentTime` prop.

**This lane ships the corridor heartbeat as STATIC** — width tier encodes
intensity (faint / moderate / strong / heartbeat) so the player can read
which corridors are most loaded at a glance, but there is no animated
pulse-along-the-path effect.

`period_ms` is retained on each datum (computed by `intensityToPeriodMs`,
T6-validated) so a follow-on lane can wire animation without re-shaping
the data. Two implementation paths:

- **TripsLayer wrapper:** swap `PathLayer` → `TripsLayer`, add a
  `currentTime` prop driven by `requestAnimationFrame`, and use
  `period_ms` to phase the pulse trail.
- **Custom shader:** extend `PathLayer` with a `getDashArray` accessor
  that animates over time, using `period_ms` to set the dash speed.

Either approach is a clean follow-on lane; not required for v1.

---

## 9. Verification Gates

| Gate | Result |
|------|--------|
| Substrate verification: `frontEdgesOsid` + optional `frontPressureByEdge` expose `(a, b, side_a, side_b, intensity)` | PASS |
| 8/8 T1..T8 GREEN | PASS |
| 32/32 sibling tests GREEN (regression check across all 4 v0.9.4 visual lanes) | PASS |
| `npx tsc --noEmit` clean for all lane-touched files | PASS |
| `CORRIDOR_HEARTBEAT_FEATURE_FLAG` default `true` | DONE |
| Capability gate double-defended (flag + length>0) | DONE |
| Singular-ownership: `FACTION_GLOW_RGB` not duplicated (imported + re-exported from canonical source) | DONE |
| Animation status documented (STATIC; period_ms retained for follow-on) | DONE |
| Validation report shipped | DONE (this file) |

---

## 10. v0.9.4 Progression Note — FULLY CLOSED

This is the **fourth and final feature of v0.9.4 (Visual Layer / Legendary
Map Features) to fully close**. Lane sequence:

- [x] Map That Scars (renderer + validation) — CLOSED 2026-05-04 (`7e5397d2`)
- [x] Force-Quality Glow (builder + validation) — CLOSED 2026-05-05 (`2d14feec`)
- [x] Refugee Column (builder + validation) — CLOSED 2026-05-05 (`6f64d152`)
- [x] **Corridor Heartbeat (builder + validation) — CLOSED 2026-05-05 (this lane)**

**v0.9.4 (Visual Layer / Legendary Map Features) Phase 3 is now fully
closed.** Phase 1 (Shell + Transition Polish) and Phase 2 (Visual
Consistency) remain on the v0.9.4 roadmap and are open for future lanes.

---

## 11. Successor Handoffs

### v0.9.4 closure declaration

With Corridor Heartbeat closed, **v0.9.4 Phase 3 (Legendary Map Features)
is fully landed**. The four faction-symmetric, capability-gated, UI-only
visual layers are all default-ON and double-gated by feature flag +
non-empty data.

### Recommended next visual feature candidates (post-v0.9.4)

These would belong to a future v0.9.x or v0.10 visual phase, NOT v0.9.4:

1. **Animated corridor pulse** — wrap the static PathLayer in a TripsLayer
   or shader-based animation consuming the existing `period_ms` field.
   Pure UI follow-on; no new data shape needed.
2. **Curated `strategic_corridors.json`** — explicit canonical list of
   named lifelines (Posavina/Brčko, Sarajevo siege ring, Mostar, Goražde,
   Bihać). Builder would consume this list to filter / boost specific
   corridors. Requires new derived-data file + canonical source review.
3. **Casualty heatmap** — per-OSID PolygonLayer keyed on cumulative
   casualty totals (existing `battlesByOsid`). Same Path A pattern.
4. **Operation success-rate halos** — per-OSID glow keyed on
   attacker/defender win rate over the campaign. Substrate:
   `battlesByOsid[*].outcome`.
5. **Settlement supply state ring** — per-OSID PolygonLayer keyed on
   `supplyTransitionsByOsid` final state.

### Curved paths enhancement (cross-cutting for both refugee + corridor)

Currently corridor heartbeat (and refugee column) paths are straight
great-circle lines between centroids. A future enhancement could offset
the path perpendicular to the direct line by a Bezier control point,
distinguishing two-way traffic on the same OSID-pair axis (e.g.,
RBiH→RS pulse on one side of the line, RS→RBiH on the other).

---

## 12. Concurrent Lane Awareness

This lane's exclusive file ownership does not overlap with the concurrent
**Phase 1 OQ-Growth implementation lane**:

- Phase 1 OQ-Growth owns `src/sim/combat/officer_quality_update.ts` +
  40w/188w smoke runs — sim path. **NOT TOUCHED by this lane.**
- This lane owns `src/ui/map/layers/buildCorridorHeartbeatOverlay.ts` +
  `composeTacticalDeckLayers.ts` + `deckLayerCapabilities.ts` +
  `MapContainer.tsx` + `tests/corridor_heartbeat_overlay_builder.test.ts`
  — UI path. **File-disjoint from sim.**

UI-only changes do NOT enter the sim, so they cannot contaminate Phase 1's
40w hash. The two lanes can land in either order without merge conflict.

---

## 13. Commit

Per spec: lane commits **directly** (solo on UI surface; Phase 1 is on sim
surface, file-disjoint). Parent pushes after both lanes land. Verify-
before-exit: `git show --stat HEAD` confirms all 6 files in commit.

---

**End of report.**
