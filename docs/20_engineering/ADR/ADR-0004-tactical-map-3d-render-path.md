# ADR-0004: Tactical Map 3D Render Path

## Status
Accepted (2026-02-20)

## Context
The tactical-map convene requires replacing the 2D tactical viewport with a 3D render path while preserving:
- deterministic simulation ownership in the main process / scenario harness
- canonical turn advancement (`runTurn`) and friendly-only path validation in canonical mode
- staff map as a separate 2D snapshot-oriented overlay

Relevant canon/engineering references:
- `docs/10_canon/Engine_Invariants_v0_5_0.md`
- `docs/10_canon/Systems_Manual_v0_5_0.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`

## Decision
1. Keep simulation execution single-owner (main process / harness). Tactical map renderers (2D/3D) are display-and-order-staging clients only.
2. Adopt a shared tactical view contract (`MapViewInput` in `src/ui/map/types.ts`) for render paths.
3. Treat sandbox 3D behavior as non-canon unless explicitly promoted; sandbox-only exceptions (for example traversal through uncontrolled settlements) remain sandbox-confined.
4. Keep staff map as a 2D snapshot/render mode; do not merge staff map into the 3D viewport.

## Consequences
- Positive:
  - 3D work can progress without breaking deterministic turn ownership boundaries.
  - 2D and 3D map paths can share a typed contract and order-staging surface.
  - Sandbox experimentation can continue without silently changing canon.
- Trade-offs:
  - Transitional period may require supporting both 2D and 3D render code paths.
  - Some 3D UX behavior may require explicit canon updates before promotion to mainline rules.
