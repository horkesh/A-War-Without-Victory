# Accessibility and Browser Drilldown Proof

**Date:** 2026-06-21
**Run ID:** N/A
**Baseline:** June 21 D2 player-polish branch after sector override feedback semantics
**Result:** UI accessibility labels and live browser drilldown proofs hardened without simulation drift

## Summary
- Closed the next residual polish slice from the active command board: panel close/expand accessible names, Order Queue state labels, Warroom priority review labels, map context-menu live proof, and battle-marker live proof.
- Hardened `qa:live-surface:browser` so tactical-map context actions and battle markers are no longer only statically asserted; the sweep now records explicit evidence for both.
- Kept the work UI/read-model/test/docs scoped. No simulation, scenario data, save schema, calibration floor, structural fingerprint, or packaged installer artifact changed.

## Changes Made
### Accessibility Labels
- Army HQ corps cards and collapsible sections now expose stateful expand/collapse `aria-label` copy.
- Army Reserve and President's Desk overlay close buttons now use localized, surface-specific close labels.
- Order Queue expand/collapse controls now expose stateful localized labels plus `aria-expanded`.
- Warroom priority review now uses an accessible label that names priority counts without duplicating the Advance Turn control name.

### Live Browser Proofs
- `RadialMenu` now exposes stable test selectors for the root and actions.
- `MapContainer` now publishes a deterministic battle-marker probe on the tactical map root and provides context-menu fallback handling for browser proof.
- `tools/ui/live_surface_browser_sweep.cjs` now attempts a real right-click first, then a DOM contextmenu event, then a dev-only proof seam if Chromium headless does not deliver the native map event. The recorded passing proof used the dev seam after the real event attempts.
- The live sweep now fails unless the injected AAR fixture produces a tactical battle marker for `op:gradacac:donja_tramosnica_2`.

## Verification
- Focused accessibility pack: `node node_modules\vitest\vitest.mjs run tests\ui\gui_audit_label_discipline.test.ts tests\ui\order_queue_player_copy.test.ts tests\ui\president_desk_shell.test.ts tests\ui\advance_turn_button_gated_feedback.test.ts --pool=forks --reporter=dot` passed 38/38.
- Static live/hook contracts: `node node_modules\vitest\vitest.mjs run tests\ui\first_hour_browser_gate_contract.test.ts tests\ui\map_context_menu_i18n.test.ts tests\ui_map_battle_casualty_truth.test.ts --pool=forks --reporter=dot` passed 15/15.
- Syntax: `node --check tools\ui\live_surface_browser_sweep.cjs` passed.
- Live browser sweep: `npm.cmd run qa:live-surface:browser` passed. Evidence recorded `mapContextMenuLiveProof: { actions: 1, activationMethod: "dev-seam" }`, `battleMarkerLiveProof: { count: 1, osids: "op:gradacac:donja_tramosnica_2" }`, `recordsAarFormationLinkLiveProof: true`, and `serverPortCleanupVerified: true`.
- TypeScript: `npm.cmd run typecheck` passed.
- Player journeys: `npm.cmd run qa:player-journeys` passed 245/245.
- Desktop map bundle: `npm.cmd run desktop:map:build` passed.

## Lessons Learned
- Anchored radial/context menus can have a zero-sized root while the action controls are visible. Browser proofs should wait for visible action controls, not root visibility.
- Browser contextmenu delivery against MapLibre/DeckGL can differ in headless mode. Production fallback handling is useful, but the final proof may still require a dev-only seam after real event attempts.
- Battle-marker visibility should be live-proven from the tactical-map DOM, not inferred only from fixture data or static source contracts.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/ArmyReservePanel.tsx` | Localized surface-specific close label. |
| `src/ui/map/components/OrderQueue.tsx` | Stateful localized expand/collapse labels and expanded state. |
| `src/ui/map/components/RadialMenu.tsx` | Stable context-menu test selectors. |
| `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx` | Stateful command-card expand/collapse labels. |
| `src/ui/map/components/army_hq/CollapsibleSection.tsx` | Stateful section expand/collapse labels. |
| `src/ui/map/components/presidential_desk/PresidentDeskShell.tsx` | Localized close-overlay label. |
| `src/ui/map/components/warroom/WarroomStatusBar.tsx` | Priority review accessible name avoids Advance Turn duplication. |
| `src/ui/map/i18n/messages.en.ts` / `messages.bcs.ts` | Added EN/BCS keys for new labels. |
| `src/ui/map/map/MapContainer.tsx` | Battle-marker probe, contextmenu fallback, and dev-only proof seam. |
| `tools/ui/live_surface_browser_sweep.cjs` | Live map context-menu and battle-marker proof steps. |
| `tests/ui/*` and `tests/ui_map_battle_casualty_truth.test.ts` | Focused regressions for accessibility and browser-proof contracts. |

## Next Steps
- Continue the active D2 player-polish queue with any fresh browser-found interaction defects.
- Keep the context-menu proof seam dev-only; if native right-click starts passing in headless consistently, tighten evidence expectations around the native path.
