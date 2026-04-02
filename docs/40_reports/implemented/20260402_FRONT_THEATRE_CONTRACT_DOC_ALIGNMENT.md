# 2026-04-02 Front/Theatre Contract Doc Alignment

## Summary

Aligned the main tactical-map and desktop IPC engineering docs with current reality: sectors are the live frontline/player-shell authority, while front assignment and theatre naming now belong to compatibility/history context rather than current player-facing workflow.

## What Changed

### `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`

- corrected the state-contract language so it no longer implies the loaded player shell treats `brigade_front_assignment`, `theatres`, and `army_theatre_assignment` as live player-facing concepts
- removed retired live-channel entries for:
  - `assign-brigade-to-front`
  - `rename-front-segment`
  - `rename-theatre`
- left `assign-brigade-to-sector` as the current player-facing brigade-assignment command surface

### `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`

- corrected §10.4 so `assignable_front_segments`, `brigade_front_assignment`, `theatres`, and `army_theatre_assignment` are described as compatibility/history state rather than current tactical-shell ownership
- updated desktop IPC summary text to match the actual live bridge
- changed the old “Front assignment” verification item into a legacy-compatibility check instead of a live UX expectation

## Why This Matters

Dead contract text is not harmless in a repo like AWWV. It teaches future agents and future implementers that obsolete concepts still belong to the current product shell. Aligning the docs keeps the repo’s mental model closer to the actual game.

## Verification

- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
