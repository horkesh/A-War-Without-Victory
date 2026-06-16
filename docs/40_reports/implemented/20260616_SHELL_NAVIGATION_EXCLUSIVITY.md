# Shell Navigation Exclusivity

**Date:** 2026-06-16

**Type:** UI shell-route hardening; no simulation, scenario, save-schema, baseline, calibration, or packaging artifact changes.

## Problem

Live browser smoke found that top-toolbar Chronicle/Records clicks could leave the player in an ambiguous visual state: the tactical map and OOB sidebar remained dominant, while Records/Chronicle did not clearly take over as the active top-level surface. The same class of risk existed for deep links from Chronicle cards, Turn Aftermath, and Decision Room source handoffs because Army HQ navigation did not centrally close reference overlays.

The same live pass exposed a second top-level ownership leak: pressing Escape while Codex was open closed Codex, then the global tactical-map Escape shortcut opened the pause menu behind it on the same keypress.

The Pyrrhic read-only follow-up sweep found two more helper-contract holes in the same family: player-faction Records routes selected a Records subtab without forcing the Army HQ top tab to `records`, and Army HQ Records/Decision Consequence buttons opened Codex/Chronicle through raw store setters instead of the shared top-level navigation helpers.

## Fix

`src/ui/map/utils/shellNavigation.ts` now closes Codex and Chronicle before opening any Army HQ route:

- Army HQ summary/briefing/personnel routes.
- Army HQ Records subtabs.
- Focused aftermath records.
- Focused operation-history records.
- Focused decision-consequence records.
- Corps briefing drill-ins.

The Chronicle and Codex helpers still remain mutually exclusive with each other. Toolbar-specific clearing remains in place, but the route contract no longer depends on the toolbar being the caller.

`CodexPanel` now handles Escape in the capture phase and consumes the native key event before global map shortcuts can toggle pause. This matches the existing full-screen overlay ownership pattern used by Chronicle/Wrapped-style surfaces.

Records navigation now always forces `armyHQTab = 'records'`, including player-faction saves, and normal Records opens clear stale focused aftermath/operation/decision rows. Codex and Chronicle helpers close Army HQ before opening their top-level reference surface. Army HQ Records and Decision Consequence buttons now call `openCodex(...)` / `openChronicle(...)` instead of raw `setCodexOpen(true)` / `setChronicleOpen(true)`.

## Tests

Updated route tests now assert the exclusivity contract across direct shell handoffs, Chronicle card links, Turn record links, Decision Room source handoffs, Army HQ reference buttons, and the Records toolbar button. The CI stale-copy regression in `tests/ui/chronicle_decision_ledger.test.ts` was also corrected to match the neutral fallback copy used when authored display maps are unavailable. `tests/ui/pause_escape_shortcuts.test.ts` now guards the Codex Escape path so a single Escape closes Codex without opening Pause behind it.

Focused verification:

```text
node_modules\.bin\vitest.cmd run tests\ui_shell_navigation.test.ts tests\ui\shell_navigation_ownership.test.ts tests\ui_chronicle_operation_aar_link.test.ts tests\ui_chronicle_turn_record_link.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\ui\decision_consequence_trail.test.ts tests\ui\chronicle_decision_ledger.test.ts tests\ui\records_button_behavior.test.ts tests\ui\pause_escape_shortcuts.test.ts --pool=forks --reporter=dot
```

Result: 9 files / 71 tests passed.

Live browser verification on `http://127.0.0.1:4196/tactical_map.html?dev=1`:

- RS new campaign showed `WAR HAS STARTED`, then the `WAR BEGINS` presidential opening brief.
- The opening brief surfaced the RS Six Strategic Goals and Mladić genocide warning before the player entered the map.
- `The Assembly Speaks` opened as a Decision Required presidential modal with the historical default and alternate responses visible.
- Toolbar Records opened Army HQ directly on Records content, not Briefing.
- `Open Codex` from Army HQ Records closed Army HQ and opened Codex as the sole top-level reference surface.
- Escape on Codex closed Codex without opening Pause.
- Toolbar Chronicle opened Chronicle as the sole top-level surface, with Army HQ and Codex absent.

Browser logs showed no route/runtime errors. The existing coordinate-validation warnings for specific OSID damage/force-quality overlay polygons remain a separate map-data/rendering polish backlog item.

## 2026-06-17 App-Level Follow-Up

A second live/player sweep found that the shared `shellNavigation` fix did not cover App-local surfaces. Decision History could open over the wrong shell, Warroom exits could leave Warroom-owned overlay state hidden behind game shells, Presidential Inbox return routes could leave field/reference panels active, and Wrapped's final-slide Chronicle action still used a raw `setChronicleOpen(true)` setter.

The follow-up hardening centralizes these App transitions:

- `leaveWarroomForGame(...)` closes Warroom desk, decision-room host, native overlays, command strip, diplomacy, and Decision History before entering game-owned shells.
- `openWarroomDeskFromField(...)` closes Army HQ, Codex, Chronicle, Operations, Summary, and Decision History before opening the President's Desk.
- Decision History opens only from the game shell, closes Army HQ/Codex/Chronicle/field panels first, and owns Escape in capture phase so Pause cannot open behind it.
- Inbox-return routes close Codex/Chronicle/Army HQ/Operations and force the game shell.
- Wrapped's `View Chronicle` action now routes through `openChronicle(...)`.

Focused route and Escape tests cover the new App-level helpers. Live browser verification on `http://127.0.0.1:4197/tactical_map.html?dev=1` repeated the RS first-hour path, Decision History Escape, Records -> Codex, Codex Escape, Chronicle, and DESK/foundational-decision checks. Final strict browser smoke produced only known dev fallback/WebGL/invalid-coordinate warnings and no unexpected page/runtime errors.

## Follow-Up

Continue the separate DeckGL/coordinate-validation polish lane for invalid OSID overlay polygons; do not fold that into shell-route ownership. Also continue the separate turn-0 OOB/content-polish lane for commander gaps observed during live play, including Drina Corps still rendering `Command forming`.
