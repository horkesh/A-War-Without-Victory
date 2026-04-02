# 2026-04-03 - Corps panels now use operation handoff discipline

## Summary
- Removed the remaining ad hoc corps-panel reads of `loadedGameState.operations`.
- Routed `CorpsDetail`, `CorpsFrontPanel`, and `OOBSidebar` through the shared player-facing operation selector.
- Reframed the corps ops tabs as field snapshots that hand off full command review to Army HQ and briefing flows instead of acting like parallel operation-control shells.

## Why
- Even after adapter-level scoping, the tactical shell still had too many places behaving like co-equal operations owners.
- `CorpsDetail` and `CorpsFrontPanel` were both directly scanning `loadedGameState.operations`, which invites future drift back toward raw state access and duplicative command review UX.
- Strong strategy products separate:
  - tactical context and field awareness
  - command review and authorization

## Files changed
- `src/ui/map/components/CorpsDetail.tsx`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `src/ui/map/components/OOBSidebar.tsx`
- `tests/ui_opord_player_safe_labels.test.ts`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## What changed

### 1. Shared selector usage is now explicit
- `CorpsDetail` now derives `corpsOps` through `filterPlayerFacingOperations(...)`.
- `CorpsFrontPanel` now derives `relatedOperations` through the same selector before applying corps/sector relevance filtering.
- `OOBSidebar` now uses `filterPlayerFacingOperations(...)` instead of rebuilding player-visible operation filtering ad hoc.

### 2. Corps panels no longer pretend to be full command-review shells
- Both ops tabs now present themselves as snapshots.
- Button copy now routes intent toward HQ ownership:
  - `Prepare Operation in HQ`
  - `Draft New Directive in HQ`
- Copy explicitly states that full command review belongs in Army HQ and operation briefing flows.

### 3. Regression guard
- `ui_opord_player_safe_labels.test.ts` now asserts that:
  - the corps panels use `filterPlayerFacingOperations`
  - the old direct raw operation scans do not reappear
  - the Army HQ handoff language stays present

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_opord_player_safe_labels.test.ts tests\\ui_player_visibility.test.ts tests\\ui_map_render_smoke.test.ts`

## Outcome
- Tactical Map corps panels still show useful field-level operations context.
- But they are now more disciplined about where that truth comes from and clearer about who owns full review and authorization.
