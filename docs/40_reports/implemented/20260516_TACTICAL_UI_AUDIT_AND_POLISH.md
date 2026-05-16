# Tactical UI Audit and Polish

## Summary

Live browser inspection covered the tactical-map shell, side picker, tutorial overlay, floating HQ crest, Army HQ tabs, summary modal, operations/event/Codex entrypoints, map clicks, map modes, and layer controls.

Shipped fixes:

- Restored browser/dev tactical-map runtime by guarding Node `process` access in `corps_front_sectors.ts`.
- Made browser/dev campaign start load the baked April 1992 startup snapshot instead of an empty mock state.
- Let tutorial next/skip controls work in browser preview when the desktop IPC bridge is unavailable.
- Removed the default Corridor Heartbeat red/green path network from the live tactical map.
- Rebuilt the presidential toolbar around the intentionally floating HQ crest, reserving a center gap and moving reference controls to the right side.
- Fixed the tactical Summary modal blank state by preventing the React click event from being passed as the summary focus section.
- Raised the bottom-layer popover above right-side panels so the layer toggles remain readable.
- Replaced stale visible `v0.6.1` labels in the React shell with the shared `v0.9.6-alpha.1` app version constant.

## Findings

- The HQ Briefing surface is the strongest current product-loop surface: it exposes Brief -> Inspect -> Decide -> Execute handoffs and makes the command loop readable.
- HQ Summary is useful and should remain the canonical strategic summary view.
- HQ Personnel is data-rich and legible, but still dense; later polish should add stronger scanning aids before adding more information.
- HQ Records is truthful at turn 0 but visually sparse. It should keep the empty state, but the empty state should explain when records appear.
- The top-level Summary modal now renders correctly, but it duplicates HQ Summary ownership. It is acceptable as a map-local quick view; future polish should keep it thinner than HQ.
- Map clicks work, but front/sector clicks can produce a long left-rail sector list with repeated low-signal rows. A later UX pass should aggregate or prioritize these rows.
- The layer menu is now readable above panels, but it still lives very close to the right panel edge.
- The dev/browser shell still disables Advance Turn because IPC is unavailable; that is truthful, but the disabled reason is not obvious from the button alone.

## Determinism

UI/read-model only. No scenario rules, OOB, combat math, political controller writes, save schema, persisted scenario output, timestamps, randomness, or unstable ordering were changed.

## Verification

- `npx.cmd vitest run tests\ui_presidential_toolbar_summary_click.test.ts tests\ui_map_no_corridor_heartbeat_default_overlay.test.ts tests\ui_map_no_sector_demarcation_overlay.test.ts tests\sector_partition_instrumentation.test.ts tests\ui_map_browser_safe_imports.test.ts tests\engine_honesty_legacy_contracts.test.ts tests\v092_tutorial_lane_b_auto_dismiss.test.ts tests\v092_tutorial_lane_e_overlay_a11y.test.ts` passed 47/47.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk warnings.
- Browser inspection confirmed the tactical map renders, the red/green path network is absent, the floating crest has a reserved toolbar gap, the Summary modal renders cards, and the layer popover clears the right-side panels.
