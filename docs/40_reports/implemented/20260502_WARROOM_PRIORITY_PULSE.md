# Warroom Priority Pulse

**Date:** 2026-05-02  
**Lane:** Presidential Decision Room / Strategic Priorities follow-on  
**Type:** UI shell wiring / read-model projection

## Summary

The Warroom status bar now exposes a compact Decision Room priority pulse while the Warroom overlay is active.

Instead of only showing a pending-review dot, `WarroomStatusBar` now consumes `buildPreAdvanceCommandReviewView(...)` and renders a `PRIORITIES` control with:

- advance-review item count,
- urgent count,
- existing pending-review pulse,
- direct route to Army HQ BRIEFING.

The route is App-owned: `App.tsx` passes `reviewPreAdvancePriorities` to both `AdvanceTurnModal` and `WarroomStatusBar`, and that handler calls `openArmyHQTab(gs, 'briefing')` before returning to the game shell.

## Ownership

This keeps the product shell hierarchy intact:

- Warroom summarizes urgency.
- Army HQ BRIEFING owns command review.
- Decision Room / pre-advance read models own synthesis.
- Source truth remains with existing DTO owners.

No new queue, ledger, Chronicle, event log, turn-history store, or combat-planning owner was introduced.

## Verification

Executed in `F:\A-War-Without-Victory`:

```powershell
npx.cmd vitest run tests/ui_warroom_priority_pulse_wiring.test.ts tests/army_hq_presidential_review_coherence.test.ts
```

Result:

- 11/11 tests passed.

The final lane closeout also re-ran the broader UI spine pack, TypeScript, desktop map build, and diff check.

## Files

| File | Purpose |
|---|---|
| `src/ui/map/components/warroom/WarroomStatusBar.tsx` | Renders the Warroom `PRIORITIES` pulse from the pre-advance/Decision Room projection. |
| `src/ui/map/App.tsx` | Passes the Army HQ BRIEFING review handoff into the status bar. |
| `tests/ui_warroom_priority_pulse_wiring.test.ts` | Source-level guard for projection, routing, and no combat/nondeterminism paths. |
| `docs/40_reports/GUI_MASTER.md` | GUI master status and recent-change row. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Tactical/Warroom shell read-model ownership note. |
| `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md` | Product shell hierarchy rule for Warroom urgency pulses. |
| `docs/PROJECT_LEDGER.md` | Behavioral ledger entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Durable lesson for Warroom urgency affordances. |
| `.claude/napkin.md` | Runbook update. |

