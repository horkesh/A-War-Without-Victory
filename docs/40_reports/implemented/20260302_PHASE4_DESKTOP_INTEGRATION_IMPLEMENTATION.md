# 2026-03-02 — Phase 4 Desktop Integration Implementation

## Scope

Implemented Phase 4 desktop integration for the canonical React + MapLibre GUI (`src/ui/map`), covering:

1. Typed desktop bridge (`useIPC`) and desktop-safe method wrappers.
2. Desktop session bootstrap + live sync.
3. Turn advance and order staging IPC wiring.
4. Side picker + recruitment desktop flow.
5. Player-faction fog-of-war filtering.
6. Electron PMTiles routing verification + fallback hardening.

## What Was Implemented

- Added typed bridge surface and wrappers for campaign, orders, state sync, recruitment, and turn advancement.
- Replaced inline `window.awwv` usage in map UI paths with typed client access.
- Added `useDesktopSession` bootstrap flow with stale-bootstrap suppression and error surfacing.
- Added idempotent state loading in store (`loadSaveIfChanged`) to avoid duplicate apply churn.
- Integrated desktop order actions (`stagePostureOrder`, `stageBrigadeMovementOrder`, `advanceTurn`) with consistent error handling and queue clear-on-success.
- Added `SidePickerOverlay` and `RecruitmentModal` with desktop action layer for:
  - `start-new-campaign`
  - `get-recruitment-catalog`
  - `apply-recruitment`
  - required `stateJson` sync for successful desktop replies.
- Applied fog-of-war filtering in builder layer for both formations and order arrows when `player_faction` is present.
- Hardened PMTiles desktop routing:
  - Canonical rewrite to `awwv://app/data/derived/...` in desktop runtime.
  - Added data-route fallback handling (`/data/derived/...`) in protocol path resolution.
  - Added byte-range support and traversal guards in protocol data serving helper.
  - Replaced prefix-based path checks in `electron-main.cjs` with safe inside-dir checks.
- Deprecated active AoR desktop staging handlers (`stage-brigade-aor-order`, `set-brigade-desired-aor-cap`) as legacy no-op errors in Phase II desktop flow.
- Fixed warroom build compatibility issue by moving Node-only operational data imports to runtime dynamic imports in `src/data/operational_data.ts`.

## Verification Evidence

Required gates:

- `npm run typecheck` ✅
- `npm run test:vitest` ✅ (247 passed, 1 skipped)
- `npm run desktop:map:build` ✅
- `npm run warroom:build` ✅

Focused desktop/map suites:

- `tests/ui_map_desktop_bridge.test.ts` ✅
- `tests/ui_map_desktop_session_sync.test.ts` ✅
- `tests/ui_map_orders_desktop_integration.test.ts` ✅
- `tests/ui_map_recruitment_and_side_picker.test.ts` ✅
- `tests/ui_map_fog_of_war_filter.test.ts` ✅
- `tests/desktop_pmtiles_protocol_route.test.ts` ✅

Subagent gates:

- Task 4 compliance: COMPLIANT; quality: APPROVED.
- Task 5 compliance: COMPLIANT; quality: APPROVED.
- Task 6 compliance: COMPLIANT; quality: APPROVED.

## Notes

- Manual interactive desktop smoke loop (pick side → recruit → stage orders → advance turn) was not captured in this report run and should be executed in the next desktop QA pass.
