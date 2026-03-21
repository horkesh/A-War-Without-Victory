# Morning Report — Night Shift 2026-03-21

## Summary
Completed 3 major work items: sector combat ratings pipeline fix, HRHB-RBiH P1 backlog (3 enclaves + brigade spawns + doctrine), and v0.5.0 Full Diplomatic System milestone. Started v0.5.1 (briefing collector + menu components). 11 commits, version bumped to v0.5.0.

## What Was Done

### Pre-roadmap: Sector Combat Ratings Desync Fix (n962)
- Pipeline step `recompute-sector-combat-ratings` added after bot corps rearrangement
- Root cause: bot directives renumber sector IDs after initial rating computation
- Result: 59/59 sector match (was 51 overlap + 13 mismatches + 9 orphans)

### Pre-roadmap: HRHB-RBiH P1 Backlog (n963)
- Phase 1: 3 HRHB enclaves (Kiseljak, Lasva Valley, Zepce)
- Phase 2: Brigade spawn fix (buildOsidToMunFromReverseMap mun1990_id bug). CB: 7 to 10 brigades.
- Phase 3: Lasva Valley Offensive army priority (w40-100)
- Calibration: 91.4% to 91.0% (expected, 3 new brigades)

### v0.5.0 — Full Diplomatic System (MILESTONE COMPLETE, tagged)
- Phase 0: Save migration registry + tests
- Phase 1: PeacePlanModal wired (GameStateAdapter + IPC + App.tsx)
- Phase 2: DaytonNegotiationModal (territorial/institutional packages + IPC)
- Phase 3: Patron pressure gauges + negotiation capital display

### v0.5.1 — UI Completion (IN PROGRESS)
- Phase 1: SKIPPED (MapModeLegend already implemented in UI Overhaul)
- Phase 2: Sim-side briefing collector with registry pattern (4 collectors, 5 tests)
- Phase 3: Menu components created (MainMenu, PauseMenu, SettingsScreen, CreditsScreen)
- Phase 3 wiring DEFERRED — needs day shift review of App.tsx flow architecture
- Phase 4: Settings persistence DEFERRED

## Test Results
- Suites: 105 passed (was 103 at start)
- Tests: 1,254 passed (was 1,246 at start, +8 new)
- TypeScript: clean
- Build: clean

## Decisions Made (FLAGGED FOR DAY SHIFT REVIEW)
- **[DECISION-1]**: @testing-library/react installation deferred — npm install in inner workspace risks breaking Vite per napkin item 7.
- **[DECISION-2]**: Menu routing architecture (useGameFlow state machine) deferred. Components built, not wired. Restructuring flow control needs review.
- **[DECISION-3]**: Settings persistence (Phase 4) deferred — requires Electron userData integration.

## Issues Found
- **[ISSUE-1]**: v0.5.1 Phase 1 already done in UI Overhaul. Plan is 5 days stale. Adapted by skipping.
- **[ISSUE-2]**: buildOsidToMunFromReverseMap silently mapped 3 municipalities wrong. Fix comprehensive.

## Observations & Proposals
- **[OPP-1]**: DiplomacyOverview reusable in VerdictScreen (~20 lines).
- **[OPP-2]**: Registry pattern (briefing + settings) should be documented as team standard.
- **[PROB-1]**: v0.5.x plans reference changed file paths. Audit plans before execution.
- **[PROB-2]**: 3 empty CB sectors (Konjic, 2x Vares) are structural — no OOB brigades for those municipalities.
- **[IDEA-1]**: HRHB enclave resilience thresholds could trigger Washington Agreement.
- **[IDEA-2]**: DaytonNegotiationModal mini-map preview of proposed territorial split.

## Lessons Learned
- OSID key format is authoritative for municipality. Never trust canonical SID mun1990_id.
- Pipeline derived data is stale after mutation steps. Recompute or move.
- Plans 5+ days old need audit against current codebase.

## Build State at End of Shift
- tsc: clean
- vitest: 105 suites, 1,254 tests, 1 skipped
- Last commit: dae2e6e
- Current version: 0.5.0 (tagged)
- Calibration: 91.0% (40w)

## Recommended Next Steps
1. Review DECISION-2 (menu routing) and wire components into App.tsx
2. Complete v0.5.1 (settings persistence, menu wiring)
3. Continue v0.5.2 (Tutorial & Onboarding)
4. Address PROB-2 (empty CB sectors) — may need OOB additions
