# Night Shift — 2026-03-21

## Completed
- Sector combat ratings desync fix (n962, pipeline step 140→141)
- HRHB-RBiH P1 Backlog (n963): 3 enclaves, 3 brigade spawns fixed, CB doctrine
- v0.5.0 Full Diplomatic System: PeacePlanModal, DaytonNegotiationModal, patron/capital display, save migration. Tagged v0.5.0.
- v0.5.1 partial: briefing collector (registry pattern), menu components (MainMenu, PauseMenu, Settings, Credits)

## Blocked / Deferred
- Menu wiring into App.tsx (DECISION NEEDED: useGameFlow architecture)
- Settings persistence (DECISION NEEDED: Electron userData integration)
- @testing-library/react installation (DECISION NEEDED: inner workspace npm safety)

## Next: Continue v0.5.1 wiring, then v0.5.2-v0.5.4

## Build State
- tsc: clean | vitest: 105 suites, 1,254 tests | calibration: 91.0%
- Version: 0.5.0 (tagged) | 11 commits this session
