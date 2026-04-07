# 2026-04-07 — v0.8-to-v0.9 Commander Explanation Surfaces Phase 7: Warroom Turn-Preview Boundary Seam

## Lane selection

- **Exact seam chosen:** `ClickableRegionManager.generateThisWeekPreview()` raw `state.military.formations` loop for "WIA returning next turn."
- **Why this was the highest-value bounded seam:** the turn-advance dialog is a war-phase shell surface, not a render utility or a Phase 0 exemption. The coordinator already had `extractWarData(...)` in scope, so the raw formation loop was a real architecture lie, not just an implementation convenience.

## Audit findings

- **Exact seam before the change:** `ClickableRegionManager.ts` correctly called `extractWarData(state, pf)` to build the war snapshot, then immediately bypassed it with a direct loop over `state.military.formations` to count formations whose `wounded_pending > 0`.
- **Why it mattered:** the war-phase shell preview was re-deriving a display fact from raw military state even though the canonical player-safe snapshot was already in scope.
- **Surfaces audited but not chosen:** `TacticalMap` and `WarPlanningMap` still read controller state for rendering, but they are render-layer utilities rather than modal/shell display paths. `DeclarationEventModal.findWarMilestoneEvent()` still reads political state, but as an event detector utility rather than a display render path.

## Design

- **Canonical boundary after cleanup:** war-phase display facts inside `ClickableRegionManager` must flow through `extractWarData(...)`.
- **Accepted structural exceptions:** `state.meta.*` shell metadata and faction identity reads (`state.factions[*].id`) remain permitted.
- **Canonical field added:** `OwnForcesSnapshot.wiaFormationCount`.

## Implementation

- **Exact files changed:**
  - `src/ui/warroom/data/war_data_extractor.ts`
  - `src/ui/warroom/ClickableRegionManager.ts`
  - `tests/warroom_turn_preview_boundary.test.ts`
- **Exact seam removed:** the direct `state.military.formations` loop in `generateThisWeekPreview()` was replaced with `snap.ownForces.wiaFormationCount`.
- **Boundary hardening:** `ClickableRegionManager.ts` now carries a top-level `DATA BOUNDARY:` contract comment documenting the war-phase shell rule and its accepted exceptions.

## Verification

- **Targeted verification:** `tests/warroom_turn_preview_boundary.test.ts` adds 13 boundary/correctness tests covering the source seam, snapshot field usage, null safety, faction isolation, and the new `DATA BOUNDARY:` contract.
- **Full verification:** full Vitest reached 215/215 files and 3003/3003 tests; `npx.cmd tsc --noEmit -p tsconfig.json` clean; `npm.cmd run build` clean.

## Outcome

- `extractWarData()` is now the sole data entry point for war-phase turn-preview display data in `ClickableRegionManager`.
- `OwnForcesSnapshot.wiaFormationCount` is the canonical field for "formations with WIA returning."
- The turn-advance shell is easier to explain architecturally because the coordinator no longer carries a silent raw-state bypass.

## Residual debt

- `NewspaperModal.getOfficerSuccessionLines()` still reads `military.named_officer_data` directly and remains the next real modal/shell boundary seam.
- `TacticalMap` / `WarPlanningMap` controller reads remain accepted render-layer gaps rather than modal/shell truth-owner defects.

## Report path

- `docs/40_reports/implemented/20260407_V08TO09_WARROOM_TURN_PREVIEW_BOUNDARY.md`
