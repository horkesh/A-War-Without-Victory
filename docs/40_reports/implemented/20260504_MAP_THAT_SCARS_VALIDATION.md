# LANE-NIGHTSHIFT-MAP-THAT-SCARS-VALIDATION — Closeout Report

**Date:** 2026-05-04
**Status:** CLOSED — feature flag flipped default ON
**Predecessor:** LANE-NIGHTSHIFT-MAP-THAT-SCARS-RENDERER (commit `11457f85`)
**Plan:** `docs/plans/2026-04-06-v094-visual-polish-legendary-map-features-plan.md` — v0.9.4 Phase 3 (Legendary Map Features)
**Owner:** Graphics Programmer / QA Engineer (Pyrrhic)

---

## 1. Goal

Validate the Map That Scars renderer behind its `MAP_SCARS_FEATURE_FLAG` and decide whether to flip default ON for v0.9.4 closure progress.

The renderer (commit `11457f85`) was shipped with the flag default `false`
because visual validation was deferred — the previous agent confirmed the
data path works but did not validate the visual outcome on the actual map.

This lane validates the renderer via deterministic deck.gl layer-descriptor
assertions (Path A in the spec) and flips the flag default ON.

---

## 2. Validation Method — Path A (deterministic layer-descriptor)

The deck.gl `PolygonLayer` produced by `buildOsidDamageOverlay` is a
deterministic function of the input data: layer id, data reference,
`getFillColor` accessor, and prop flags (`stroked`, `filled`, `pickable`,
`extruded`) are all directly assertable without launching a headless
renderer or capturing a screenshot.

This is the appropriate level of validation because the visual rendering
itself is owned by deck.gl (a vetted external library); what we own is the
layer descriptor — its color, alpha, opacity, ordering, and faction
neutrality. Asserting the descriptor proves the visual semantics.

Path B (headless screenshot via Playwright) was deferred — Path A's
deterministic assertions are sufficient for a faction-neutral overlay with
a fixed RGB and per-tier alpha gradient.

---

## 3. Tests Authored — `tests/osid_damage_overlay_builder.test.ts` (T5–T8)

Four new tests appended to the existing four (T1–T4). All eight pass.

| ID | Description | Verdict |
|----|-------------|---------|
| T5 | `buildOsidDamageOverlay` produces a deck.gl `PolygonLayer` with the correct id (`osid-damage-overlay`), the exact data array reference (no defensive clone — preserves byte-stability), faction-neutral RGB `[20,20,24]` from the accessor, per-tier alpha (rounded `0.05/0.15/0.30 * 255` = `13/38/77`), `stroked: false`, `filled: true`, `pickable: false`, `extruded: false`. | GREEN |
| T6 | The layer's fill color is invariant to `faction` and `stroke_color_rgb` props on the input polygon Feature — RBiH and RS polygons with the same damage_score produce byte-identical RGBA. The emitted datum has no `faction` or `stroke_color_rgb` field. | GREEN |
| T7 | Empty seed (`{}`) produces an empty `OsidDamageDatum[]` and the resulting `PolygonLayer` carries `data: []` without throwing — safe to enable on a fresh save before any combat events have been logged. | GREEN |
| T8 | OSIDs whose `damage_score` is `0`, negative, or `NaN` are NOT emitted into the layer data (territory fill underneath is preserved). `damageScoreToAlpha` confirms each maps to alpha `0`. | GREEN |

Combined with the existing T1–T4 (data extraction, gradient, faction-agnostic, deterministic), the full suite is **8/8 GREEN**.

```
$ npm run test:vitest -- tests/osid_damage_overlay_builder.test.ts
 ✓ tests/osid_damage_overlay_builder.test.ts (8 tests) 9ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

---

## 4. Feature Flag Flip — `src/ui/map/map/MapContainer.tsx`

```diff
- const MAP_SCARS_FEATURE_FLAG = false;
+ const MAP_SCARS_FEATURE_FLAG = true;
```

The constant comment was rewritten to point to this validation report
and to the four T5–T8 tests as evidence.

### Rationale for default ON

1. **Layer descriptor validated**: T5 asserts the exact deck.gl prop shape;
   T6 asserts faction-color non-mutation; T7 asserts empty-seed safety;
   T8 asserts zero-score skip. These are the four failure modes that would
   visibly break the map.
2. **Capability gate is double-defended**: `composeTacticalDeckLayers` still
   requires `caps.mapScarsVisible && mapScarsData && mapScarsData.length > 0`.
   If the seed fetch fails at runtime, no layer is added and the map
   degrades gracefully.
3. **Faction-neutral by construction**: `osid_damage_seed.json` is built
   from combat / displacement / flips events with no faction-specific
   weighting (confirmed in `tests/osid_damage_seed_builder.test.ts` T1/T2).
   The scar overlay is sensitive-history neutral.
4. **Deterministic**: no `Math.random`, no `Date.now`, sorted iteration via
   `strictCompare` (locked by T4).

### Revert path

If a regression is detected on the live map, flip the constant back to
`false`. No other code change is required — the capability gate cascades
cleanly from the constant.

---

## 5. Verification Gates

| Gate | Result |
|------|--------|
| 4+4 = 8/8 tests GREEN in `osid_damage_overlay_builder.test.ts` | PASS |
| `npx tsc --noEmit` clean for files in this lane | PASS (only pre-existing errors in `war_phases.ts` and `brigade_territory_reconciliation.test.ts` from concurrent lanes — neither touched by this lane) |
| Damage-overlay regression suite (`osid_damage_overlay_builder` + `osid_damage_seed_builder`) | PASS — 10/10 |
| MapContainer-related tests | None exist; no regression surface |
| `MAP_SCARS_FEATURE_FLAG` default flipped to `true` | DONE |
| Audit report shipped | DONE (this file) |

---

## 6. Files Changed

| Path | Kind | Notes |
|------|------|-------|
| `tests/osid_damage_overlay_builder.test.ts` | EXTEND | +4 tests (T5–T8); imports updated to include `buildOsidDamageOverlay`, `OsidDamageDatum` |
| `src/ui/map/map/MapContainer.tsx` | EDIT (1 const + comment) | `MAP_SCARS_FEATURE_FLAG = false` → `true`; comment block rewritten to cite this report |
| `docs/40_reports/implemented/20260504_MAP_THAT_SCARS_VALIDATION.md` | NEW | This report |

Single-owner edits per spec. No other surface modified.

---

## 7. v0.9.4 Progression Note

This is the **first feature of the v0.9.4 milestone to fully close**. The
renderer landed under flag `false` in commit `11457f85` (opens v0.9.4); this
lane closes it by validating + flipping the default. The four legendary
map features sequence is:

- [x] Map That Scars (renderer + validation) — CLOSED 2026-05-04
- [ ] Refugee Column — pending
- [ ] Corridor Heartbeat — pending
- [ ] Remaining terrain/friction visualization — pending

Phase 1 (Shell + Transition Polish), Phase 2 (Visual Consistency), and the
remaining Phase 3 features are still open.

---

## 8. Determinism + Sensitive-History Boundaries

- **Determinism**: All tests are deterministic; no `Math.random`, no
  `Date.now`, no time-dependent fixtures.
- **Faction neutrality**: T6 directly asserts that the scar fill color is
  byte-identical between RBiH and RS inputs.
- **Sensitive-history**: The damage seed is faction-agnostic by
  construction (combat / displacement / flips events without faction
  weighting). No FORAWWV surface touched.

---

## 9. Concurrent Lane Awareness

Four sibling agents were in flight during this lane:
- 188w Reconstitution verification
- bot-orders instrumentation retry
- divergence events Wave 5
- Phase 5 test review

This lane's exclusive file ownership (the test file + the single constant
in MapContainer.tsx + this new report) does not overlap with any of those
lanes. Pre-existing tsc errors in `war_phases.ts` and
`brigade_territory_reconciliation.test.ts` belong to those concurrent lanes
and are not regressions caused by this work.
