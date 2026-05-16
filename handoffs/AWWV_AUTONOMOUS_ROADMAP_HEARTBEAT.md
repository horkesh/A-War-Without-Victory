# AWWV Autonomous Roadmap Heartbeat

- Current branch/worktree: `main` at `F:\A-War-Without-Victory`
- Lane name: Tactical map click picking and camera bounds
- Files changed: `src/ui/map/map/clickSelectionPriority.ts`, `src/ui/map/map/useMapInteractions.ts`, `src/ui/map/map/MapContainer.tsx`, `src/ui/map/components/panelRail.ts`, `src/ui/map/styles/globals.css`, focused regression tests, GUI/report docs, project ledgers, root heartbeat.
- Tests run and exact result: `npx.cmd vitest run tests\deck_click_selection_priority.test.ts tests\ui_map_interactions.test.ts tests\ui_map_panel_rail.test.ts tests\ui_map_camera_constraints.test.ts` passed 32/32. `npm.cmd run typecheck` passed. `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings. Browser inspection confirmed a visible brigade click opens one Formation panel, no stale sector/settlement rail remains, MapLibre controls clear the toolbar/floating crest, and the 30-degree pitched map stays bounded to the operational BiH extent.
- Scenario/run IDs and hashes: performance and formation lanes retained 40w hash `0cb626c032204372`; operation-opportunity proof used 40w `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n0` hash `0cb626c032204372` and 188w `runs\apr1992_definitive_188w__210e69404d054959__w188_n1` hash `a0111273f26f907d`.
- Ledger/report docs updated: `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, `docs/40_reports/README.md`, `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md`, `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/implemented/20260516_TACTICAL_MAP_CLICK_PICKING_AND_CAMERA_BOUNDS.md`.
- Commit SHA: `d6a6bf03` (`fix(ui): tighten tactical map picking and camera bounds`).
- Next lane selected and why: continue the user's tactical/HQ UI inspection lane, with emphasis on remaining overlapping panels, hidden controls, HQ density around the floating crest, and disabled-action readability.

## Lane Status

| Lane | Branch / commit | Status | Verification summary |
| --- | --- | --- | --- |
| Wall-clock performance | `main` through `789bb89f`; recent perf commits include `68407817`, `9ff000bd`, `f241d36d`, `9eba4a0a`, `e0ecca61` | Closed for this packet with profiler-backed, hash-preserving bot-orders/commander CPU wins | Focused perf tests, `npm.cmd run typecheck`, profiled 40w hash `0cb626c032204372`; latest docs gate passed in committed perf lane |
| Force-quality trajectory | merged via `22ff3b5e` from `codex/force-quality-trajectory` / `f3bb208f` | Cleanly deferred as audit-only; no multiplier/tuning without better evidence | `git diff --check` passed except CRLF warnings; docs-only, scenario run not required |
| Formation-life believability | merged via `0847eb44` from `codex/formation-life-believability` / `f672895f` | Closed as detector-only classification for active-never-fights subtypes | Focused docs/anomaly tests 10/10; 40w proof hash `0cb626c032204372`; diagnostics 0 errors, consistency PASS |
| Operation opportunity families | merged via `761ab2b8` from `codex/operation-opportunity-families` / `f5ee4cc7` | Closed for Kupres/Cincar plus first Federation/Western Bosnia Mistral slice | Focused/docs tests 86/86; 40w hash `0cb626c032204372`; 188w hash `a0111273f26f907d`; opportunity health audit clean |
| Product-loop cohesion | merged via `1e7b3b5b` from `codex/product-loop-cohesion` / `b6d34c9b` | Closed with Decision Room product-loop heartbeat read model/handoff | Focused UI/docs suite 28/28; `git diff --check` passed; typecheck blocked by missing map deps |
| Packaging/playtest support | merged via `69510b4b` from `codex/packaging-playtest-support` / `12b60db7` | Closed for deterministic artifact smoke release logs; operator-only clean-VM checks deferred | Focused tests 8/8; docs truth 6/6; `git diff --check` CRLF warnings only |
| Docs/canon maintenance | merged via `e2ee1bb2` from `codex/docs-canon-maintenance` / `a1ff5ae0`, `440d492f` | Closed with safe pointer sweep and audit; FORAWWV left untouched | docs truth 6/6; `git diff --check` CRLF warnings only |

## Remaining Human / Operator Work

- Packaging clean-VM checks remain operator-only: SmartScreen UX, Settings -> Apps entry/version, `%APPDATA%` persistence, NSIS uninstaller registry, and Linux clean-VM AppImage launch/save/load.
- Product-loop local desktop/dev-map playtest remains a human/operator inspection task.
- Substantive canon propagation from `docs/CANON_PROPAGATION_NEEDED.md` remains a separate canon/human-review lane; `docs/10_canon/FORAWWV.md` was not edited.
