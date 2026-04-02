# 2026-04-02 - Warroom faction shell handoff

## Summary

Warroom's `FactionOverviewPanel` had drifted into a second command desk. It still listed detailed formations, rendered the faction's active officer roster, and exposed commander reassignment from inside the Warroom shell.

That violated the current product-shell contract:

- Warroom owns the high-level campaign shell and strategic overview.
- Army HQ owns command review, personnel context, reserve handling, and commander changes.

This slice removes the duplicate command-detail lane from Warroom and replaces it with a lightweight command-shell handoff summary.

## What changed

- removed detailed formations from the war-phase faction overview
- removed the officer roster and commander reassignment flow from the war-phase faction overview
- added a `COMMAND SHELL` summary block with:
  - corps in field
  - active brigades
  - officers on duty
  - units in transit
- added explicit player-facing copy telling the player that detailed formation dispositions, reserve handling, operations review, and commander changes belong to Army HQ via the desk map

## Files changed

- `src/ui/warroom/components/FactionOverviewPanel.ts`
- `tests/warroom_player_visibility.test.ts`

## Why this matters

- Warroom stops pretending to co-own command review
- Army HQ remains the single operational/personnel authority
- future agents are less likely to reintroduce duplicate commander tooling in the wrong shell
- the player experience becomes more coherent: Warroom summarizes, Army HQ decides

## Verification

- `node_modules\.bin\vitest.cmd run tests\warroom_player_visibility.test.ts tests\warroom_smoke.test.ts tests\ui_opord_player_safe_labels.test.ts tests\ui_army_hq_war_summary_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

- continue checking Warroom modal/hotspot flows for any remaining Army-HQ-style ownership drift
- restore/verify the standalone tactical-map path back to Warroom if still missing in the live shell
