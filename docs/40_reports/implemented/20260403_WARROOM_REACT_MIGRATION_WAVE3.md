# Warroom React Migration Wave 3 — Presidential Presence

Date: 2026-04-03
Commit: b3272a58

## What changed

Five targeted changes to complete the warroom hotspot surface and add live campaign context:

1. `shellHandoff.ts` — two new `ShellHandoffCommand` kinds: `strategic-overview` and `event-log`
2. `shellNavigation.ts` — handlers for both new kinds + new exported `warroomCommandStaysInRoom()` helper
3. `WarroomShellLayer.tsx` — three previously-unmapped hotspots now wired
4. `App.tsx` — `onNavigate` gated by `warroomCommandStaysInRoom`; `WarroomStatusBar` rendered inside warroom block
5. `WarroomStatusBar.tsx` — new component (created)

## Unmapped hotspots now wired

- `wall_cork_board` → `strategic-overview` → opens `StrategicDashboard` without leaving warroom
- `desk_radio` → `event-log` → opens `EventLogPanel` without leaving warroom
- `diplomatic_telephone` → `army-hq:summary` (routes to Army HQ until dedicated diplomacy surface exists)

All five warroom hotspot groups now have React-owned behavior. No hotspot falls through to undefined silently.

## In-room vs navigating commands

`warroomCommandStaysInRoom(command)` returns `true` for commands handled entirely within the warroom:
- `advance-turn` — triggers AdvanceTurnModal, no screen change
- `strategic-overview` — opens StrategicDashboard overlay, no screen change
- `event-log` — opens EventLogPanel, no screen change

Returns `false` for everything else (army-hq, codex, chronicle, undefined) — those transition to `setAppScreen('game')`.

The `onNavigate` handler in App.tsx now reads:
```tsx
if (!warroomCommandStaysInRoom(command)) {
  setAppScreen('game');
}
```

`setEventLogOpen` (local useState in App.tsx) is threaded into `applyShellHandoffCommand` via object spread:
```tsx
applyShellHandoffCommand({ ...useGameStore.getState(), setEventLogOpen }, command)
```

`ShellNavigationState` declares both setters as optional so neither the store nor callsite is burdened when the other is absent.

## WarroomStatusBar

A fixed thin strip at `bottom-4 right-4 z-[60]` inside the warroom overlay. Shows:
- Current date/turn via `formatTurnLabel(loadedGameState.label)`
- Phase badge: WAR (red) or PEACE (amber) derived from `loadedGameState.phase`
- Pending events dot (amber pulse) when `loadedGameState.firedEvents.length > 0`
- ADVANCE button that calls `setAdvanceTurnPending(true)` — same flow as wall calendar hotspot

Style: `bg-black/70 text-amber-400 font-mono text-[10px]` with backdrop blur. Minimal — not a dashboard.
Returns `null` when no game state is loaded.

## Tests

30 tests in `tests/warroom_shell_layer.test.ts` (was 17, +13 new/updated):

New tests added:
1. `wall_cork_board` → `{ kind: 'strategic-overview' }`
2. `desk_radio` → `{ kind: 'event-log' }`
3. `diplomatic_telephone` → `{ kind: 'army-hq', tab: 'summary' }`
4. `isShellHandoffCommand({ kind: 'strategic-overview' })` → true
5. `isShellHandoffCommand({ kind: 'event-log' })` → true
6. `warroomCommandStaysInRoom({ kind: 'strategic-overview' })` → true
7. `warroomCommandStaysInRoom({ kind: 'event-log' })` → true
8. `warroomCommandStaysInRoom({ kind: 'advance-turn' })` → true
9. `warroomCommandStaysInRoom({ kind: 'army-hq', tab: 'summary' })` → false
10. `warroomCommandStaysInRoom(undefined)` → false
11. in-room command does NOT call `setAppScreen('game')`
12. navigating command (army-hq) DOES call `setAppScreen('game')`
13. all 10 mapped regions produce valid ShellHandoffCommands (updated from 7)

Updated: stale `wall_cork_board → undefined` test replaced; `onNavigate contract` tests updated to Wave 3 gated pattern.

## Verification

- tsc: clean (0 errors)
- vitest: 30/30 in warroom_shell_layer; 1941 passed total, 20 failed (all pre-existing, none in warroom/shell/nav domain)
- vite build: clean (built in 6.35s)
- governance: OK

## Completion block

Canonical owner: React WarroomShellLayer + WarroomStatusBar
Demoted path: legacy warroom.ts hotspot dispatch for cork board / radio / telephone
Player-visible truth: all room hotspots have React-owned behavior; warroom shows live campaign context
Canonical UI surface: `src/ui/map/components/warroom/`
Done means: all 5 hotspots mapped, onNavigate fixed, WarroomStatusBar renders campaign context, 10 new tests pass, smoke triad clean — ALL MET.
