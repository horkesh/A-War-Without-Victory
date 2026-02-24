# Front System Rebuild (HoI Theatres) — 2026-02-21

## Summary

Implemented the comprehensive front-system rebuild plan in six phases:

1. Contiguous assignable front segments derived from canonical hostile boundary edges.
2. Reserve rule with brigade-to-front assignment gating for pressure, posture, attack, and movement.
3. Theatre model with deterministic defaults and segment theatre linkage.
4. GUI/IPC assignment flow and hierarchy panel integration (Theatre -> Army -> Corps -> Brigade/OG).
5. Naming + polish (front/theatre rename flows and front-length display).
6. Canon propagation (Game Bible, Rulebook, Systems Manual) and ledger update.

## Delivered State Model

- Added `assignable_front_segments` with stable `front_id`, sorted `edge_ids`, side pair, `length_edges`, optional `name`, optional `theatre_id`.
- Added `brigade_front_assignment` (`front_id | null`, where `null` is reserve).
- Added `theatres` and `army_theatre_assignment`.
- Preserved legacy `front_segments` (edge-keyed friction/hardening) unchanged.

## Pipeline and Sim Behavior

- Turn pipeline now derives and persists contiguous front segments from `front_edges`.
- Segment theatre assignment runs deterministically after derivation.
- Brigade front assignment is ensured/repairable each turn in Phase II.
- Reserve brigades are gated out of:
  - pressure contribution,
  - posture orders/cost processing,
  - attack order resolution,
  - movement/reposition processing.

## GUI + IPC

- Added desktop IPC channels:
  - `assign-brigade-to-front`
  - `rename-front-segment`
  - `rename-theatre`
- Added brigade panel controls for:
  - assign front / reserve,
  - rename front,
  - rename theatre.
- OOB/hierarchy view now surfaces Theatre -> Army -> Corps -> Brigade/OG and brigade front status.

## Determinism

- Stable sorting is enforced for:
  - segment derivation,
  - segment IDs/components,
  - theatre/army assignment lists,
  - adapter projections and UI lists.
- No RNG/time APIs were introduced in simulation-affecting paths.

## Verification

- Ran `npx tsc --noEmit` and `npx vitest run` after each implementation phase/refactor pass.
- Suite passed after each phase completion.

## Key Artifacts

- `src/state/assignable_front_segments.ts`
- `src/state/theatres.ts`
- `src/sim/phase_ii/front_assignment.ts`
- `src/sim/turn_pipeline.ts`
- `src/ui/map/MapApp.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/ViewerStateAdapter.ts`
- `src/desktop/electron-main.cjs`
- `src/desktop/preload.cjs`
- `src/desktop/desktop_sim.ts`
- `docs/10_canon/Game_Bible_v0_5_0.md`
- `docs/10_canon/Rulebook_v0_5_0.md`
- `docs/10_canon/Systems_Manual_v0_5_0.md`

