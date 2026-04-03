# Adapter Defense-in-Depth: Player-Faction Scoping

**Date:** 2026-04-03
**Wave:** Player Knowledge Integrity Wave 1 (v0.8.0.x hotfix lane)
**Roles:** UI/UX Developer, Systems Programmer, QA Engineer

---

## Summary

Added adapter-level defense-in-depth filtering so that four all-faction GameState families are scoped to the player's faction before reaching the renderer. Also fixed a cross-faction supply pressure leak in `SituationTab`.

## Problem

The `GameStateAdapter` shipped four faction-keyed families to the renderer unfiltered:
- `casualtyLedger` — all factions' KIA/WIA/MIA
- `factionReserves` — all factions' supply/ammo reserves
- `warPhaseSupplyPressure` — all factions' corridor pressure
- `warPhaseExhaustion` — all factions' exhaustion values

Most UI components already gated by `isPlayerFaction` at the component level, so no raw enemy data was visibly rendered. However, the adapter was architecturally omniscient — any future component that forgot to filter would leak enemy truth.

Additionally, `SituationTab.computeSupplySummary()` aggregated supply pressure across ALL factions, displaying "2 open, 1 cut" which included enemy corridor status.

## Changes

### 1. GameStateAdapter.ts — `scopeToPlayerFaction` helper
- Added generic `scopeToPlayerFaction<T>()` at line 36 that filters a faction-keyed record to the player's faction when set, passes through unchanged in observer mode.
- Applied to `casualtyLedger`, `factionReserves`, `warPhaseSupplyPressure`, `warPhaseExhaustion` at the adapter return block.

### 2. SituationTab.tsx — player-scoped supply summary
- `computeSupplySummary()` now takes `playerFaction` parameter and scopes to the player's supply pressure entry only.
- Call site updated to pass resolved player faction.

### 3. Regression tests — `player_knowledge_integrity.test.ts`
- 6 tests verifying all 4 filtered families are scoped to player faction when `player_faction` is set.
- Observer mode test verifying all factions pass through when no player faction is set.
- RS faction test verifying scoping works for non-default factions.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/GameStateAdapter.ts` | Added `scopeToPlayerFaction()`, applied to 4 families at output |
| `src/ui/map/components/SituationTab.tsx` | Scoped `computeSupplySummary` to player faction |
| `tests/player_knowledge_integrity.test.ts` | 6 new regression tests |

## Verification

- `npx tsc --noEmit` — clean
- `vitest run tests/player_knowledge_integrity.test.ts` — 6/6 pass
- `vite build` — success
- `check_claude_governance.ps1` — OK

## What Was Already Clean

Three parallel audits found that prior work (2026-04-02/03) had already resolved:
- **Raw ID leaks** — all components use `getPlayerSafe*` helpers. Zero raw IDs rendered.
- **Codex entrypoint** — visible in PresidentialToolbar + keyboard shortcut X.
- **Warroom return** — working in both embedded and desktop modes.
- **Debug surface gating** — all dev surfaces properly gated behind `devMode`.
- **Operations** — already player-scoped at adapter output.
- **Component-level faction gating** — StrategicDashboard, SupplyPanel, EconomyPanel, SelectionPanel all already branch on `isPlayerFaction`.

## Completion Block

```
Canonical owner: GameStateAdapter.scopeToPlayerFaction() — adapter-level defense-in-depth filter
Demoted path: Direct all-faction casualtyLedger/factionReserves/warPhaseSupplyPressure/warPhaseExhaustion at adapter output
Player-visible truth: Player sees only their own faction's casualties, reserves, supply pressure, and exhaustion
Canonical UI surface: SituationTab (supply summary), StrategicDashboard/SupplyPanel/EconomyPanel (already component-gated)
Done means: 6 regression tests pass; tsc clean; vite build clean; governance OK
```
