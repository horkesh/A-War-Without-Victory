# Turn Aftermath Product Spine C1-C8

**Date:** 2026-05-01
**Type:** UI/product-spine implementation. No simulation mechanics, scenario data, OOB, painted targets, calibration constants, or run artifacts changed.

## Why

The C0 product-spine audit found that the main campaign loop had live Brief / Inspect / Decide / Execute surfaces, but the post-execute handoff was weak. The engine already persisted `latestTurnSummary`, and desktop advance-turn already returned a `turn-report-updated` report, but the player had no dedicated "what just happened and what needs attention now" packet before returning to the map.

## What Changed

- Added `src/ui/map/data/turnAftermath.ts`, a pure read model that composes:
  - `LoadedGameState.latestTurnSummary`
  - player faction
  - `deriveInboxItems(...)`
  - OSID display names
- Added `TurnAftermathModal`, opened after a successful turn advance. It summarizes:
  - net territory, notable flips, combat, casualties, displacement
  - formation spawns/destructions and supply deltas
  - next presidential obligations from the unified inbox
  - links to War Summary, AAR Records, and Inbox
- Extended `advanceTurnAndSync(...)` with optional aftermath hooks. The canonical path now:
  1. captures previous loaded state
  2. advances the turn through desktop IPC
  3. stores the raw desktop turn report for existing consumers
  4. loads the next save
  5. builds and opens the aftermath view
- Added `getTurnAftermathAdvanceDeps()` so all tactical advance-turn entrypoints share the same bridge:
  - `PresidentialToolbar`
  - `AdvanceTurnModal`
  - `useKeyboardShortcuts` spacebar path
  - `PeaceStatusPanel`
  - legacy `TopToolbar`
- Added store state:
  - `turnAftermath`
  - `turnAftermathOpen`
  - reset on fresh save load so stale aftermath packets cannot survive across saves.

## C2 Persistent Records Extension

Turn Aftermath is now durable inside Army HQ RECORDS instead of only appearing as a post-advance modal:

- Added `buildTurnAftermathRecordViews(...)`, a pure read model that builds newest-first history from `LoadedGameState.turnSummaries`, while preserving `latestTurnSummary` as a fallback for freshly loaded saves. Only the latest record carries live inbox obligations; older records are archived turn packets, not reconstructed historical inbox snapshots.
- Added `TurnAftermathRecordsPanel`, a compact Army HQ records surface showing recent turn packets, net territorial movement, player-faction battle/casualty counts, displacement/action summaries, and the lead territorial/action note per turn.
- Added an Army HQ RECORDS subtab:
  - `aftermath` / `TURN AFTERMATH`
- The modal's records action now opens `recordsSubTab: 'aftermath'` instead of dropping the player into generic AAR records.
- Shared shell handoff and game-store typing now accept `ArmyHQRecordsSubTab = 'aftermath' | 'aar' | 'ops' | 'opportunities'`.

## C3 Turn-Cost Packet Extension

Turn Aftermath now carries a compact in-campaign cost packet without invoking the endgame Cost Ledger:

- Added `TurnAftermathView.cost`, derived from existing `TurnSummary` fields only:
  - friendly military casualties this turn
  - theater military casualties this turn
  - displaced population this turn
  - own formations destroyed
  - own supply and heavy-munitions spent
  - severity band: `low | moderate | severe | critical`
  - short reason strings for the scan line
- Added a `Turn Cost` panel to `TurnAftermathModal`.
- Added cost severity and cost metrics to the persistent Army HQ `TURN AFTERMATH` records.

This is deliberately not a second endgame War Cost Summary. It is a per-turn projection over upstream summary truth so the player feels the price of each advance-turn before the final reckoning.

## C4 Campaign Pulse Extension

The persistent Army HQ records surface now has a ledger summary above the individual aftermath cards:

- Added `buildTurnAftermathLedgerSummary(records)`, a pure aggregation over already-built `TurnAftermathView` records.
- Army HQ `TURN AFTERMATH` now summarizes:
  - archive record count
  - cumulative net friendly territory
  - cumulative friendly casualties in the archive
  - cumulative displaced population in the archive
  - own formations destroyed in the archive
  - severe/critical turn count

This keeps the player from manually scanning every card to understand recent trajectory, while preserving the one-way read-model contract.

## C5 Strategic Signals Extension

Archived turn packets now carry a scan-friendly strategic signal stack derived from existing `TurnSummary` fields:

- scenario/historical `events_fired`
- `notable_events` such as siege formation/breakage, first battles, truce breaks, and Operation Storm
- decoration awards
- formation arc transitions
- supply transitions
- notable brigade movements

The signal stack is deliberately read-only. It does not create a second event log, second history writer, or second source of truth. It converts the already persisted turn summary into an Army HQ briefing surface so records explain not only "how many casualties / OSIDs" but why the turn mattered.

## C6 Campaign Momentum Pulse Extension

The Army HQ `TURN AFTERMATH` archive now classifies the visible record window as:

- `advancing`
- `contested`
- `bleeding`
- `quiet`

The classifier uses the existing record views: net friendly territory, friendly casualties, displacement, hard-turn count, and strategic signal count. It is an explanatory read model over archived turns, not a balance input.

The records surface now shows:

- date window
- momentum band
- short briefing sentence
- signal count
- event count
- decoration count
- severe/critical turn count
- theater cost in the visible archive

## C7 Review Filters Extension

The Army HQ `TURN AFTERMATH` archive now has commander review filters:

- `All`
- `Hard turns`
- `Signals`
- `Actions`
- `Territory`

The filter owner is `filterTurnAftermathRecords(records, mode)`, a pure helper over already-built views. The UI shows per-filter counts and recomputes the campaign pulse, ledger summary, and record list from the visible set. This keeps long campaigns navigable without adding a second archive, second query store, or simulation-side state.

## C8 Immediate Strategic Signals Extension

The post-advance `TurnAftermathModal` now renders a `Strategic Signals` panel from the same `TurnAftermathView.signals` read model used by Army HQ records.

This closes the immediate-report gap: the player sees major events, decorations, arc changes, supply shocks, and notable movements as soon as the turn resolves, before deciding whether to continue, review records, open the War Summary, or inspect the Inbox.

## C9 Active Campaign Cost Extension

The Turn Aftermath archive now feeds an active campaign cost-so-far read model:

- Added `buildTurnAftermathCampaignCost(...)`, which aggregates the full archived turn set into cumulative friendly/opposing/theater casualties, displacement, own formations destroyed, hard-turn count, net OSIDs, casualty exchange, top cost drivers, and the costliest archived turn.
- Army HQ `TURN AFTERMATH` records now show a `Campaign cost so far` section above the archive metrics.
- War Summary overview now has a compact `Campaign Cost` block for severity, friendly casualties, displacement, and net OSIDs.

This remains a read model over `turnSummaries` / `latestTurnSummary`. It is not a second endgame Cost Ledger and does not write simulation truth.

## Files

- `src/ui/map/data/turnAftermath.ts`
- `src/ui/map/components/TurnAftermathModal.tsx`
- `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx`
- `src/ui/map/components/army_hq/RecordsContent.tsx`
- `src/ui/shared/shellHandoff.ts`
- `src/ui/map/desktop/turnAftermathAdvanceDeps.ts`
- `src/ui/map/desktop/orderActions.ts`
- `src/ui/map/store/gameStore.ts`
- `src/ui/map/App.tsx`
- Advance-turn entrypoints listed above
- Tests:
  - `tests/ui/turn_aftermath.test.ts`
  - `tests/ui_map_order_actions.test.ts`
  - `tests/ui/gamestore_load_reset.test.ts`
  - `tests/ui_turn_aftermath_wiring.test.ts`
- `tests/ui_shell_navigation.test.ts`

## Verification

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_turn_aftermath_wiring.test.ts`
  - 20/20 pass
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts`
  - 43/43 pass after C2
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts`
  - 44/44 pass after C3
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts`
  - 6/6 pass after C4 ledger-summary helper
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts`
  - 13/13 pass after C5-C6 strategic signals and momentum pulse
  - 15/15 pass after C7 review filters
  - `tests/ui_turn_aftermath_wiring.test.ts` 7/7 pass after C8 immediate strategic signals
- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts`
  - 48/48 pass after C5-C6
  - 50/50 pass after C7
  - 51/51 pass after C8
- `npx.cmd tsc --noEmit`
  - clean
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean after C2 and after C5-C6
- `npm.cmd run desktop:map:build`
  - succeeded after C2 and after C5-C6; Vite emitted existing chunk-size/dynamic-import warnings only.

## 2026-05-02 Current-Main Rebase + Browser Proof

The branch was rebased over current `main` after the combat-math / Sana follow-on integration work landed. The implementation remains UI/read-model-only: no simulation mechanics, scenario data, operation catalog, painted targets, OOB, or run artifacts changed.

Fresh verification after the rebase:

- `npx.cmd vitest run tests/ui/turn_aftermath.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_map_order_actions.test.ts tests/ui/gamestore_load_reset.test.ts`
  - 51/51 pass
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - clean
- `npm.cmd run desktop:map:build`
  - succeeded; Vite emitted existing dynamic-import/chunk-size/browser-external warnings only.
- Browser proof through the live Vite map shell on `127.0.0.1:5176`:
  - desktop viewport: modal renders the immediate aftermath packet with metrics, notable territory, strategic signals, turn cost, command desk, and the three review actions.
  - 390px mobile viewport: modal remains readable and all footer actions (`War Summary`, `Turn Records`, `Review Inbox`) are visible without wrapping or clipping.

The browser pass found one responsive defect: the modal footer used a wrapping flex row, so `Review Inbox` could clip on narrow mobile viewports inside the fixed-height modal. The footer now uses a stable three-column grid with smaller mobile type and spacing, restoring the normal size at `sm` breakpoints.

No scenario run is required: this is a UI/read-model bridge over already-persisted state. It does not alter the turn pipeline, combat, control, operation execution, or saved simulation truth except for existing UI store state after load.

## Remaining Product-Spine Work

- Consider a Chronicle cross-link once Chronicle gets a unified campaign timeline filter.
- If final Cost Ledger grows an active-campaign API, use it for richer reckoning details while keeping the Turn Aftermath cost surface as the scan-line campaign view.
