# First-Hour Codex and Ticker Knowledge Boundary

**Date:** 2026-06-29
**Run ID:** N/A
**Baseline:** Active campaign Codex and static Warroom chronology could render not-yet-faced future historical titles.
**Result:** Active campaigns hide future Codex dilemma titles, scripted peace-plan ticker rows require event receipts, and browser gates fail on future-knowledge leaks.

## Summary
- Closed the first-hour Codex leak where the Dilemma Spine displayed future historical titles such as Srebrenica demilitarization and peace-plan proposals before the player encountered them.
- Hardened locked Codex rows so graph-gated entries render neutral copy instead of the real essay title or raw upstream event id.
- Gated static Warroom ticker rows for Vance-Owen, Owen-Stoltenberg, Contact Group plan, and Dayton tracks on live event receipts so the ticker cannot narrate a peace path the campaign has not surfaced.
- Extended all-faction first-hour and live-surface browser gates to assert that future historical titles do not appear on key early player surfaces.

## Changes Made

### Codex campaign visibility
- `CodexPanel` now renders Dilemma Spine rows during an active campaign only when the dilemma has been faced. Full spine reflection remains available after game over.
- Locked graph-gated Codex rows now show `Locked historical entry` and generic event-dependency copy rather than the real future title or raw event id.

### Browser QA
- `first_hour_browser_gate.cjs` now checks Command Surface, Decision Room, Records, Chronicle, and Codex for first-hour knowledge leaks across RBiH, RS, and HRHB.
- `live_surface_browser_sweep.cjs` now applies the same future-title sentinel list during surface sweeps and Codex drilldown.

### Warroom ticker chronology
- Static peace-plan headlines for Vance-Owen, Owen-Stoltenberg, Contact Group plan, Dayton talks, and Dayton signing now require the corresponding live event receipt before appearing in the Warroom ticker.
- General external context rows remain date-driven where they do not name a branchable campaign diplomatic track.

### Regression tests
- Added Codex component coverage for active-campaign hidden future dilemma titles and endgame full-spine reflection.
- Added locked-row coverage proving graph-gated future essay titles remain hidden.
- Updated browser-gate contract tests to pin future-knowledge assertions.
- Added ticker receipt coverage proving sensitive diplomatic chronology rows stay hidden without matching live receipts.

## Lessons Learned
- Raw technical-token gates are not enough. Player-knowledge boundaries need named forbidden historical-title sentinels.
- The Dilemma Spine is a retrospective structure, but active campaign UI must treat it as revealed history, not a table of contents.
- Decision Room proof must follow the real Desk path: Command Surface strip first, then Decision Room.
- Static chronology is still a player-facing source of truth. Any ticker row naming branchable campaign diplomacy must be receipt-gated like event-owned safe-area fall rows.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/components/CodexPanel.tsx` | Filters active-campaign Dilemma Spine and redacts locked graph-gated row titles. |
| `src/ui/map/i18n/messages.en.ts` | Adds neutral locked Codex copy and generic event-unlock hint. |
| `src/ui/map/i18n/messages.bcs.ts` | Adds BCS equivalents for locked Codex copy and generic event-unlock hint. |
| `tools/ui/first_hour_browser_gate.cjs` | Adds all-faction future-knowledge checks for first-hour Command Surface, Decision Room, Records, Chronicle, and Codex. |
| `tools/ui/live_surface_browser_sweep.cjs` | Adds live-surface future-knowledge assertions. |
| `src/ui/warroom/content/ticker_events.ts` | Gates peace-plan and Dayton ticker rows on matching live event receipts. |
| `tests/ui/codex_panel_dynamic_mount.test.ts` | Adds active/endgame Dilemma Spine visibility coverage. |
| `tests/ui/codex_panel_unlock_state.test.ts` | Adds locked future-title redaction coverage. |
| `tests/ui/codex_panel_tier_graph.test.ts` | Updates locked graph hint expectations. |
| `tests/ui/first_hour_browser_gate_contract.test.ts` | Pins browser-gate future-knowledge checks. |
| `tests/ui/warroom_ticker_event_receipts.test.ts` | Adds diplomatic ticker receipt-boundary coverage. |

## Next Steps
- Extract a shared player-knowledge read model for Codex and static chronology surfaces so future UI work consumes a single campaign-safe visibility contract instead of local filtering rules.
