# Working On: v0.3 Playable Alpha Implementation

## Current Task
Implementing v0.3.0 Playable Alpha — 4 parallel streams. User is AFK (napping).
Plan: `docs/plans/2026-03-15-v0.3-playable-alpha-plan.md`

## Stream Status
- **Stream 1 (War Termination)**: Background agent — adds check-victory-conditions pipeline step, turn-limit, faction collapse
- **Stream 2 (Desktop Save)**: Background agent — adds save/quick-save/auto-save IPC + SAVE button
- **Stream 3 (Peace UI)**: DONE — PeaceStatusPanel, GameOverModal, adapter peace fields
- **Stream 4 (Alliance)**: Background agent — enables alliance dynamics, Phase B1 refugee pressure

## Stream 3 Completed Files
- `src/ui/map/data/types.ts` — peaceFactions, peaceAllianceValue, peaceReferendum, peaceEvents, gameOver, gameOutcome
- `src/ui/map/data/GameStateAdapter.ts` — derivePeacePhaseData() + gameOver/gameOutcome
- `src/ui/map/components/PeaceStatusPanel.tsx` — NEW
- `src/ui/map/components/GameOverModal.tsx` — NEW
- `src/ui/map/App.tsx` — wired both components

## Next Steps
1. Wait for background agents
2. Integrate changes, resolve conflicts
3. Full tsc + vitest
4. Integration test: peace→war→endgame
5. Commit + version bump to v0.3.0

## Build State
- tsc: clean
- vitest: 643 passed, 1 skipped (61 suites)
