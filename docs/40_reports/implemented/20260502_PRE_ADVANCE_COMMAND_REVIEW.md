# Pre-Advance Command Review

**Date:** 2026-05-02  
**Lane:** Presidential Decision Room / Strategic Priorities follow-on  
**Type:** UI/read-model/product spine  

## Summary

The advance-turn confirmation now surfaces the Decision Room's `Review Before Advance` readiness before the player commits to ending the turn.

This closes the loop between the high-level priority board and the irreversible turn action:

- `src/ui/map/data/preAdvanceCommandReview.ts` projects `buildPresidentialDecisionRoomView(...).advanceReadiness` into a compact modal-safe view.
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx` renders urgent, pending, operation, and hard-turn counters plus up to four priority rows.
- `src/ui/map/App.tsx` wires `Review Priorities` to `openArmyHQTab(gs, 'briefing')`, dismissing the confirmation and opening Army HQ BRIEFING.
- `Advance Turn` still uses `advanceTurnAndSync(...)` with `getTurnAftermathAdvanceDeps()`.

## Product Contract

This is a reminder and handoff surface only.

- It does not create a second inbox.
- It does not create a second cost ledger, Chronicle, or event log.
- It does not block advancement beyond the existing backend/system blockers.
- It does not mutate simulation state.
- It does not import combat, operation catalog, OOB, Drina, Krivaja, rupture, or sensitive-history logic.
- It only consumes existing player-facing `LoadedGameState` DTOs through the Decision Room read model.

## Tests

Added:

- `tests/ui/pre_advance_command_review.test.ts`
- `tests/ui_pre_advance_command_review_wiring.test.ts`

Coverage proves:

- pre-advance rows are derived from Decision Room readiness,
- blocked/review/clear/unavailable states are safe,
- pending review count routes to Army HQ BRIEFING,
- the modal reads `loadedGameState` and `osidDisplayNames`,
- the App shell routes `Review Priorities` through `openArmyHQTab`,
- the helper remains deterministic and free of combat/sensitive-history imports.

## Verification

Executed in `F:\A-War-Without-Victory`:

```powershell
npx.cmd vitest run tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts
npx.cmd vitest run tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/warroom_shell_layer.test.ts tests/ui_turn_aftermath_wiring.test.ts tests/ui_shell_navigation.test.ts
npx.cmd tsc --noEmit -p tsconfig.json
npm.cmd run desktop:map:build
```

Results:

- 6/6 pre-advance tests passed.
- 75/75 focused surrounding UI tests passed.
- TypeScript passed.
- Desktop map build passed with the repo's existing Vite chunk/dynamic-import warnings.

## Files

| File | Purpose |
|---|---|
| `src/ui/map/data/preAdvanceCommandReview.ts` | Pure pre-advance projection of Decision Room readiness. |
| `src/ui/map/components/warroom/AdvanceTurnModal.tsx` | Dense confirmation modal with review-before-advance rows and priority action. |
| `src/ui/map/App.tsx` | Routes `Review Priorities` to Army HQ BRIEFING through shell navigation. |
| `tests/ui/pre_advance_command_review.test.ts` | Pure read-model behavior coverage. |
| `tests/ui_pre_advance_command_review_wiring.test.ts` | Source-level shell/wiring guardrails. |
| `docs/40_reports/GUI_MASTER.md` | GUI master status and recent change entry. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Tactical shell/read-model ownership note. |
| `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md` | Product shell loop and ownership update. |
| `docs/PROJECT_LEDGER.md` | Behavioral ledger entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Durable lesson for advance-turn confirmations. |
| `.claude/napkin.md` | Runbook update for future Decision Room/pre-advance work. |
