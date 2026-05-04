# LANE-NIGHTSHIFT-FORCE-QUALITY-GLOW — Closeout Report

**Date:** 2026-05-05
**Status:** CLOSED — feature flag flipped default ON
**Predecessor / Sibling:** LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION (commit `7e5397d2`, report `20260504_MAP_THAT_SCARS_VALIDATION.md`)
**Plan:** `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md` — v0.9.4 Phase 3 (Legendary Map Features)
**Owner:** Graphics Programmer / QA Engineer (Pyrrhic)

---

## 1. Lane / Goal

Close the **second** v0.9.4 (Visual Layer) feature: a **Force-Quality Glow** overlay
that renders per-OSID, per-faction officer-quality intensity as a deck.gl
`PolygonLayer` halo, mirroring the Map That Scars validation pattern (UI-only
flag flip; descriptor-level validation; no smoke run required).

The first v0.9.4 feature (Map That Scars) closed on 2026-05-04. This lane
closes the second per the same Path A pattern: build → builder tests assert
the four UI-only failure modes (faction-symmetry / capability-gated /
empty-data-safe / no-faction-coupling) → flag default-ON via builder test
verdict, NOT a smoke run.

---

## 2. Implementation Summary

### Files

| Path | Kind | Notes |
|------|------|-------|
| `src/ui/map/layers/buildForceQualityOverlay.ts` | NEW | Builder + layer factory + tier function + faction palette. Mirrors `buildOsidDamageOverlay.ts` structure exactly. |
| `src/ui/map/layers/deckLayerCapabilities.ts` | EDIT | Added `forceQualityVisible: boolean` capability + `forceQualityVisible: false` default. |
| `src/ui/map/layers/composeTacticalDeckLayers.ts` | EDIT | Added optional `forceQualityData` prop, capability-gated layer slot above scars and below experimental layers. |
| `src/ui/map/map/MapContainer.tsx` | EDIT | Added `FORCE_QUALITY_FEATURE_FLAG = true`, prop pass-through in `composeDeckLayersForCurrentSelection`, render-time `buildForceQualityData(...)` call. |
| `tests/force_quality_overlay_builder.test.ts` | NEW | Eight tests T1..T8. |
| `docs/40_reports/implemented/20260505_FORCE_QUALITY_GLOW_VALIDATION.md` | NEW | This report. |

Single-owner edits per spec. No engine, scenario, OOB, or canon files
touched. None of the Wave 8 reserved files modified
(`osid_graph_analysis.ts`, `consequences.json`, `20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md`).

### Layer composition (capability gate + ordering)

```ts
// composeTacticalDeckLayers.ts
const forceQuality: Layer[] = (
  caps.forceQualityVisible
  && args.forceQualityData
  && args.forceQualityData.length > 0
)
  ? [buildForceQualityOverlay(args.forceQualityData)]
  : [];

// Layer order (bottom → top):
//   ghost → scars → forceQuality → experimental → counters
return [...ghost, ...scars, ...forceQuality, ...under, ...counters];
```

The glow layer renders **above** the Map That Scars scar overlay (so the
glow reads on darkened ground) and **below** the experimental tactical
layers (front lines, ops arcs, unit dots) so symbols and front edges are
not occluded.

### Color choice — faction-symmetric per-faction (palette lookup)

After consideration of the two design options (faction-neutral single color
vs. faction-symmetric per-faction palette), the lane chose **faction-symmetric
per-faction**. Rationale:

1. **Player utility:** the glow is informative — a green halo over Tuzla vs.
   a red halo over Banja Luka tells the player *which faction's*
   force-quality is concentrated where, not just *that* it is. A single
   neutral color collapses that signal.
2. **Faction-symmetric mechanism preserved:** the implementation is a pure
   palette lookup over a frozen 3-key map — the same code path runs for
   every faction. There is no `if (faction === 'X') ...` branch; the table
   is data, not logic. T5 pins this structurally.
3. **Palette consistency:** RGB values mirror the existing
   `FACTION_COLORS` table at `src/ui/map/layers/buildExperimentalDeckLayers.ts:12`
   so the glow tint is consistent with other deck.gl tactical layers
   (op arcs, unit dots).

Palette:

| Faction | RGB              |
|---------|------------------|
| RBiH    | `[70, 165, 90]`  |
| RS      | `[200, 70, 70]`  |
| HRHB    | `[70, 130, 200]` |
| Unknown | `[160, 160, 160]` (faction-neutral grey) |

### Tier gradient (mirrors Map That Scars)

| officer_quality range | alpha |
|-----------------------|-------|
| `≤ 0` / NaN           | `0.00` (skipped — no paint) |
| `(0, 0.30)`           | `0.05` (faint glow)         |
| `[0.30, 0.60)`        | `0.15` (moderate glow)      |
| `≥ 0.60`              | `0.30` (strong glow)        |

The encoded RGBA alpha byte is `Math.round(alpha * 255)` → `0 / 13 / 38 / 77`.

### Aggregation rule

Per `(osid, faction)` pair, take the **arithmetic mean** of `officer_quality`
across all active brigades present. Filters:

- `kind === 'brigade'` (corps / army_hq / og excluded — they are command
  formations, not tactical force).
- `status === 'active'` (destroyed / inactive / placeholder skipped).
- `officer_quality` finite and `> 0`.
- `location_osid` resolves to a known polygon.

Multiple brigades from the same faction at the same OSID collapse to one
datum (T4); two factions at the same OSID produce two distinct datums (the
glow stacks visually — emergent, not engineered).

---

## 3. Validation Evidence (T1..T8)

`tests/force_quality_overlay_builder.test.ts`

| ID | Description | Verdict |
|----|-------------|---------|
| T1 | Builder shape: returns `ForceQualityDatum[]` with required fields; filters non-active, non-brigade, no-polygon-match. | GREEN |
| T2 | Empty input safe: empty formation array → empty data → `PolygonLayer` with `data:[]`, no throw. | GREEN |
| T3 | Zero-quality skip: `officer_quality` = 0 / negative / NaN does NOT enter the layer (territory fill preserved). | GREEN |
| T4 | Per-(osid, faction) aggregation: 3 RBiH brigades at one OSID collapse to one datum (mean 0.40, count 3); a 4th RS brigade at the same OSID is a separate datum. | GREEN |
| T5 | Faction-symmetric mechanism: `factionGlowRgb` is a pure palette lookup over `FACTION_GLOW_RGB`; cycling RBiH/RS/HRHB through the same OSID + officer_quality yields the per-faction palette RGB and identical alpha. | GREEN |
| T6 | Per-tier alpha gradient: 0 → 0, `<0.30` → 0.05, `[0.30, 0.60)` → 0.15, `≥0.60` → 0.30; layer accessor returns `round(alpha * 255)`. | GREEN |
| T7 | Capability gate: `composeTacticalDeckLayers` with `forceQualityVisible: true` + empty data → no layer. With `+ live data` → layer added. With `forceQualityVisible: false` + live data → no layer. | GREEN |
| T8 | Deterministic: byte-equal inputs in different insertion orders produce byte-identical output (sorted by `(osid, faction)` strictCompare). | GREEN |

```
$ node_modules/.bin/vitest run tests/force_quality_overlay_builder.test.ts tests/osid_damage_overlay_builder.test.ts
 ✓ tests/force_quality_overlay_builder.test.ts (8 tests) 10ms
 ✓ tests/osid_damage_overlay_builder.test.ts (8 tests) 9ms

 Test Files  2 passed (2)
      Tests  16 passed (16)
```

`tsc --noEmit` clean for all lane-touched files (no errors filtered from
`buildForceQualityOverlay.ts`, `composeTacticalDeckLayers.ts`,
`deckLayerCapabilities.ts`, `MapContainer.tsx`, or
`force_quality_overlay_builder.test.ts`).

---

## 4. Flag Flip Decision — Default ON

```ts
// src/ui/map/map/MapContainer.tsx
const FORCE_QUALITY_FEATURE_FLAG = true;
```

### Rationale

1. **Layer descriptor validated** by T5 (faction-symmetric palette assertion),
   T6 (alpha gradient pinning), T7 (gate behavior), T8 (determinism).
2. **Capability gate is double-defended:** `MapContainer` checks
   `FORCE_QUALITY_FEATURE_FLAG && data.length > 0`; `composeTacticalDeckLayers`
   independently checks `caps.forceQualityVisible && data && data.length > 0`.
   If formations are unavailable or empty, no layer is added.
3. **Faction-symmetric mechanism** asserted structurally by T5: a single
   palette lookup, no `if (faction === ...)` branches.
4. **Deterministic builder:** sorted formation iteration, sorted output, no
   `Math.random`, no `Date.now`, no environment leak.
5. **No engine path:** UI-only flag; sim is untouched. 40w hash byte-stability
   is preserved by construction (the engine doesn't see this layer).

### Revert path

If a regression is detected on the live map, flip the constant back to `false`:

```ts
const FORCE_QUALITY_FEATURE_FLAG = false;
```

No other code change is required — the capability gate cascades from the
constant.

---

## 5. Sensitive-History Compliance Assertions

| Constraint | Verdict | Evidence |
|------------|---------|----------|
| Ring 1 (visual representation of existing data, not new mechanic) | PASS | Builder reads existing `LoadedGameState.formations[*].officer_quality`; no engine plumbing, no new save fields, no engine code touched. |
| UI-only — does NOT enter sim path | PASS | All edits in `src/ui/map/`. No imports from `src/sim/` or `src/state/`. |
| No faction-asymmetric coupling | PASS | T5 pins the palette as a frozen lookup table; same code path for every faction; no conditional color logic. |
| No §6 surface | PASS | No FORAWWV, no paint anchor, no `political_controllers`, no OOB JSON, no rupture wiring, no `enclave_resilience.ts` touched. |
| Default OFF until validation passes | N/A — passed | T1..T8 all GREEN, then default-ON in same lane (per spec). |
| No new sim plumbing | PASS | Builder consumes existing UI projection of state. |
| No data embedded in `final_save.json` | PASS | Sidecar pattern: build at render time from `LoadedGameState`. |

Wave 8 reserved-file ownership respected:
- `src/sim/combat/osid_graph_analysis.ts` — NOT TOUCHED.
- `data/scenarios/events/consequences.json` — NOT TOUCHED.
- `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` — NOT TOUCHED.

---

## 6. Determinism Contract

`buildForceQualityData` is a pure function over `(formations, polygons)`:

- Sorts `formations` by `id` via `strictCompare` before aggregation
  (deterministic accumulator key visit order).
- Aggregates per `(osid, faction)` key via plain object map.
- Sorts output keys by `(osid, faction)` lexicographic via `strictCompare`.
- No `Math.random`, no `Date.now`, no `new Date`, no `process.env`, no
  locale-sensitive sort, no async operations.
- Mean computed via `sum / count` — both deterministic accumulators.

`buildForceQualityOverlay` is a pure factory: layer id, data reference,
prop flags, and `getFillColor` accessor are deterministic functions of the
input data. T8 asserts byte-stability across reordered inputs.

40w hash NOT required to change — UI-only flag, no sim path. The engine
doesn't see this layer; determinism of the engine is preserved by
construction.

---

## 7. Verification Gates

| Gate | Result |
|------|--------|
| 8/8 T1..T8 GREEN | PASS |
| 8/8 sibling osid_damage_overlay_builder tests GREEN (no regression) | PASS |
| `npx tsc --noEmit` clean for all lane-touched files | PASS |
| `FORCE_QUALITY_FEATURE_FLAG` default `true` | DONE |
| Capability gate double-defended (flag + length>0) | DONE |
| Audit report shipped | DONE (this file) |

---

## 8. v0.9.4 Progression Note

This is the **second feature of v0.9.4 (Visual Layer / Legendary Map
Features) to fully close**. Lane sequence:

- [x] Map That Scars (renderer + validation) — CLOSED 2026-05-04 (`7e5397d2`)
- [x] Force-Quality Glow (builder + validation) — CLOSED 2026-05-05 (this lane)
- [ ] Refugee Column — pending
- [ ] Corridor Heartbeat — pending

Phase 1 (Shell + Transition Polish), Phase 2 (Visual Consistency), and the
remaining Phase 3 features remain open.

---

## 9. Successor Handoff

Recommended next v0.9.4 (Visual Layer) candidate from the roadmap:

**Refugee Column** — per-displacement-event animated column overlay
(deck.gl `PathLayer` or `IconLayer` along OSID-to-OSID escape routes).
Same UI-only / Ring 1 / no-§6 envelope as Map That Scars and Force-Quality
Glow. The displacement event log is already on `LoadedGameState`
(`displacementEvents` projection). Suggested skeleton:

1. New builder `src/ui/map/layers/buildRefugeeColumnOverlay.ts` (mirror
   `buildForceQualityOverlay.ts` structure).
2. New capability `refugeeColumnVisible: boolean` in `deckLayerCapabilities.ts`.
3. Wire pass-through in `composeTacticalDeckLayers.ts`.
4. `REFUGEE_COLUMN_FEATURE_FLAG` in `MapContainer.tsx`.
5. Test file `tests/refugee_column_overlay_builder.test.ts` mirroring
   T1..T8 (per-event geometry, empty-safe, capability-gated, faction-symmetric
   if any tinting, deterministic).
6. Validation report ↔ default-ON flip.

Alternative successor: **Corridor Heartbeat** — corridor-pulse animation along
the Posavina (Brčko) corridor and other strategic lifelines, signaling
supply lift / cut-off events. Substrate: `LoadedGameState.osidAdjacency` +
strategic-corridor metadata.

Both candidates are Ring 1 / UI-only / no §6 / faction-symmetric mechanism
by construction.

---

## 10. Concurrent Lane Awareness

This lane's exclusive file ownership does not overlap with sibling Wave 8
lanes:

- Lane B (osid_graph_analysis.ts inner loop) — DIFFERENT FILE.
- Lane C (consequences.json events) — DIFFERENT FILE.
- Lane A (officer-casualty-mult Phase 0 panel audit) — DIFFERENT FILE,
  DIFFERENT SUBFOLDER (`audits/` vs `implemented/`).

Pre-existing tsc errors in concurrent-lane files (if any) are not
regressions caused by this work; this lane's tsc filter ran clean for all
its own files.

---

**End of report.**
