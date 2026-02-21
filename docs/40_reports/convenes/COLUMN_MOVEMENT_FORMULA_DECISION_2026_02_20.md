# Column Movement Formula Decision (Phase 0 Follow-up)

Date: 2026-02-20

Authority:
- `docs/30_planning/TACTICAL_SANDBOX_3D_MAP_IMPLEMENTATION.md`
- `docs/40_reports/convenes/PARADOX_TACTICAL_SANDBOX_3D_MAP_CONVENE_2026_02_20.md`

## Decision

Column (undeployed) brigade movement uses a composition-dependent baseline and terrain/roads edge costs.

- Baseline rate: `12` settlements per turn.
- Composition adjustment:
  - Heavy-equipment share (tanks + artillery + AA) reduces effective column rate.
  - Infantry-heavy composition can recover up to +1 settlement/turn.
  - Final effective rate is clamped to `[8, 14]`.
- Roads and terrain edge costs:
  - Lower `road_access_index` increases traversal cost.
  - Higher `slope_index` and `terrain_friction_index` increase traversal cost.
  - Positive elevation gain (`elevation_mean_m`) increases traversal cost.
  - `river_crossing_penalty` increases traversal cost.

Combat posture remains fixed at `3` settlements per turn and does not apply roads/terrain scaling.

## Rationale

- Preserves product preference for 12 baseline while capturing realistic mobility differences by formation mix.
- Uses existing deterministic terrain scalar inputs already available in repo data.
- Keeps canonical movement path validity friendly-only and deterministic.
