# Turn AAR System

**Date:** 2026-03-08
**Files changed:** 10 (3 new, 7 modified)
**Baseline:** No post-turn AAR — battles and territory data not retained between turns
**Result:** Full TurnSummary persisted in GameState; AARPanel in tactical map GUI

---

## Summary

- Implemented a complete after-action report system: simulation-side `TurnSummary` compilation, persistent storage in `GameState.turn_summaries[]`, and a collapsible GUI panel (`AARPanel`) accessible at any time via the "AAR" button in the top toolbar.
- Approach: snapshot-diff (pre/post state) for arcs, decorations, supply, and formation lifecycle; turn-tagged array filtering for battles, territory, displacement, and notable events. No event bus added — zero changes to existing simulation systems.
- Followed by a full `/simplify` pass that fixed five issues (wrong `washington_turn` cast, spawn/destruction detection blocked for non-brigades, OSID regex duplication, unstable React key, hardcoded faction literal).

---

## Changes Made

### New: `src/state/turn_summary.ts`

Defines the persisted AAR schema:

- `TurnSummary` — top-level record (turn, battles, territory, displacement, unit events, supply, notable events)
- `TurnBattle` — per-OSID battle record (factions, outcome, casualties, territory flipped, concentration)
- `NotableFlip` — territory flip with from/to faction and significance
- `DecorationAward` — new decoration earned this turn
- `ArcTransition` — war story arc change (e.g. bloodied→risen)
- `FormationSpawn` / `FormationDestruction` — formation lifecycle events
- `TurnNotableEvent` — Graz Accords, Washington Agreement, Operation Storm, truce breaks
- `MAX_TURN_SUMMARIES = 3` — rolling window; last 3 turns retained

### New: `src/sim/compile_turn_summary.ts`

Two exported functions:

- `captureAARSnapshot(state)` — called at turn start; captures pre-turn supply, arcs, decoration tiers, and formation lifecycle state. Stored transiently on `TurnContext` (never serialized).
- `compileTurnSummary(state, snapshot, report)` — called at turn end; pre-filters `control_events` once, delegates to six section compilers.

Section compilers:
- `compileBattles` — groups `report.attack_resolution_osid.battles` by target OSID; cross-references `brigade_history.engagements` for per-OSID casualties; uses pre-filtered control events for flip/mun_id lookup.
- `compileTerritory` — `territory_net` (faction gain/loss counts) + `notable_flips` list from combat-mechanism control events.
- `compileDisplacement` — totals from `displacement_event_log` filtered to current turn; by-ethnicity breakdown; hotspot municipality.
- `compileUnitEvents` — spawn/destruction for all formation kinds; arc diff and decoration diff for brigades only.
- `compileSupplyDeltas` — faction list derived from `Object.keys(state.general_supply_reserve)` (not hardcoded); delta per faction.
- `compileNotableEvents` — Graz Accords activation, truce breaks, Washington Agreement (`state.rbih_hrhb_state?.washington_turn`), Operation Storm (first occurrence only).

### Modified: `src/sim/turn_pipeline_types.ts`

- Added `AARSnapshot` interface after `SiegeStateCache`.
- Added `getAARSnapshot()` / `setAARSnapshot()` accessors using the same cast-based TurnContext extension pattern as `getOperationalData` / `getSiegeStateCache`.
- Imported `NarrativeArc` from `'./war_stories.js'` and `FormationId` from `'../state/game_state.js'`.

### Modified: `src/sim/turn_phases/war_phases.ts`

Two new pipeline steps:

- `capture-aar-snapshot` — position 2, after `initialize`. Calls `captureAARSnapshot(state)` and stores result via `setAARSnapshot()`.
- `compile-turn-summary` — second-to-last, before `resolve-noop`. Calls `compileTurnSummary(state, snapshot, report)`, prepends to `state.turn_summaries`, trims to `MAX_TURN_SUMMARIES`.

### Modified: `src/state/game_state.ts`

Added `turn_summaries?: import('./turn_summary.js').TurnSummary[]` after `control_events`.

### New: `src/ui/map/components/AARPanel.tsx`

Collapsible overlay panel (right side, 400px wide) with seven sections:

1. **Combat** (defaultOpen) — per-battle rows showing OSID, factions, outcome badge, casualties, flip indicator, concentration indicator
2. **Territory** — faction gain/loss net table + notable flip list with from→to arrows
3. **Unit Events** — formation spawns, formations destroyed/disbanded, arc transitions, decoration awards
4. **Faction Pulse** — supply delta and heavy munitions delta per faction
5. **Displacement** — total, by-ethnicity breakdown, hotspot municipality
6. **Notable Events** — Graz Accords, Washington Agreement, Operation Storm, truce breaks

Local sub-components: `Section`, `FactionTag`, `BattleRow`, `ArcRow`, `DecorationRow`, `TerritoryNet`.
Uses `humanizeOsid()` for OSID labels, `toTitleCase()` for municipality slugs. Stable React key on notable events.

### Modified: `src/ui/map/data/GameStateAdapter.ts`

Added `latestTurnSummary: (state.turn_summaries as TurnSummary[] | undefined)?.[0] ?? null`.

### Modified: `src/ui/map/data/types.ts`

Added `latestTurnSummary: import('../../../state/turn_summary.js').TurnSummary | null` to `LoadedGameState`.

### Modified: `src/ui/map/components/TopToolbar.tsx`

Added `onOpenAAR?: () => void` prop. Added "AAR" button in right-side controls.

### Modified: `src/ui/map/App.tsx`

Added `AARPanel` import, `aarOpen` state, `onOpenAAR` prop on `TopToolbar`, and `<AARPanel isOpen={aarOpen} onClose={() => setAarOpen(false)} />` mount.

---

## Simplify Pass Findings (all fixed)

| Finding | Agent | Fix |
|---------|-------|-----|
| `washington_turn` cast used wrong path — `rbih_hrhb?.washington_turn` always undefined | Quality | Changed to `state.rbih_hrhb_state?.washington_turn` |
| Spawn/destruction detection blocked for non-brigades (inside brigade-only `continue`) | Efficiency | Moved spawn/destruction check before the `continue`, keeping arc/decoration diff brigade-only |
| Three inline OSID regex chains duplicating `humanizeOsid()` | Reuse | Imported and used `humanizeOsid()` from `osidDisplayName.ts` |
| `key={i}` on notable events list (unstable) | Quality | Changed to stable key `e.kind + (e.faction ?? '') + (e.osid ?? '')` |
| Hardcoded `['RBiH', 'RS', 'HRHB']` literal for faction supply deltas | Quality | Derived from `Object.keys(state.general_supply_reserve ?? snapshot.supply)` |

---

## Design Doc

`docs/plans/2026-03-08-turn-aar-design.md` — full design covering schema, AARSnapshot, TurnContext extension, pipeline step positions, per-section compilation logic, GUI integration points, non-goals.

---

## Verification

- `tsc --noEmit` — clean
- `npm run test:vitest` — 378 tests passing

---

## Files Changed

| File | Change |
|------|--------|
| `src/state/turn_summary.ts` | NEW — TurnSummary schema + MAX_TURN_SUMMARIES |
| `src/sim/compile_turn_summary.ts` | NEW — captureAARSnapshot + compileTurnSummary |
| `src/ui/map/components/AARPanel.tsx` | NEW — collapsible 7-section AAR panel |
| `src/state/game_state.ts` | ADD `turn_summaries` field |
| `src/sim/turn_pipeline_types.ts` | ADD AARSnapshot interface + accessors |
| `src/sim/turn_phases/war_phases.ts` | ADD capture-aar-snapshot + compile-turn-summary steps |
| `src/ui/map/data/GameStateAdapter.ts` | ADD latestTurnSummary derivation |
| `src/ui/map/data/types.ts` | ADD latestTurnSummary to LoadedGameState |
| `src/ui/map/components/TopToolbar.tsx` | ADD onOpenAAR prop + AAR button |
| `src/ui/map/App.tsx` | ADD AARPanel mount + aarOpen state |
| `docs/plans/2026-03-08-turn-aar-design.md` | NEW — design document |

---

## Notes

- `turn_summaries` persists through save/load — AAR is accessible at any time, not only immediately after advancing a turn.
- Last 3 turns retained (`MAX_TURN_SUMMARIES = 3`). Turn picker (paginated history) deferred to a future session.
- Snapshot-diff approach requires zero changes to existing simulation systems; each system does not need to emit events.
- Peace phase pipeline (`peace_phases.ts`) does not have AAR steps — battles and territory changes only occur in war phase.
