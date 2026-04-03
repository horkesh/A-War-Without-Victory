# 20260403 — Warroom React Shell Entry Path Wiring

## Summary

Wired the live product entry path for the `WarroomShellLayer` React component. The React warroom shell foundation existed (committed in 6b8afa1b) but was unreachable in normal product use because `warroom.ts` never passed `?view=warroom` to the iframe.

This slice makes the React path the active runtime path when `REACT_SHELL_ENABLED = true`.

## What changed

### `src/ui/warroom/warroom.ts`

1. Added `REACT_SHELL_ENABLED = true` constant at the top (after imports). Set to `false` to revert to the legacy canvas path. Documented as migration-safety only — remove once React path is canonical.

2. Added `private tacticalMapInWarroomMode = false` instance field to track whether the iframe is currently loaded with `?view=warroom`.

3. Extended `showTacticalMapScene` signature from `'operational' | 'sandbox'` to `'operational' | 'sandbox' | 'warroom'`. When `mode === 'warroom'`, the iframe URL is built as `${mapBaseUrl}/index.html?embedded=1&view=warroom&${cacheBuster}`. The `tacticalMapInWarroomMode` flag is set/cleared accordingly on every iframe load or URL change.

4. Updated `applyGameStateFromJson`: when game state is applied and neither the tactical scene nor the map scene is visible, and `REACT_SHELL_ENABLED` is true, calls `showTacticalMapScene('warroom')` instead of `showScreen('none')`. This eagerly initialises the React iframe with the warroom view as soon as a campaign starts.

5. Updated the `awwv-back-to-hq` message handler: when `REACT_SHELL_ENABLED && tacticalMapInWarroomMode`, instead of calling `showWarroomScene()` (which would swap back to the legacy canvas desk), posts `{ type: 'awwv-shell:show-warroom' }` to the iframe so React handles the screen transition. The tactical scene stays visible — no DOM scene swap required.

6. Updated `openTacticalShellHandoff`: when `REACT_SHELL_ENABLED && tacticalMapInWarroomMode && tacticalMapReady`, posts the shell handoff command directly to the already-loaded iframe instead of reloading it with `?view=operational`. React transitions from warroom to game view on receipt.

### `src/ui/map/App.tsx`

Updated the `handleShellHandoff` `useEffect` (line ~588):

- Added a handler for `awwv-shell:show-warroom`: sets `appScreen('warroom')` so React switches from game view back to the warroom screen.
- Added `setAppScreen('game')` in the `awwv-shell:handoff` handler so React transitions from warroom view to game view when a handoff command arrives from a hotspot click.

### `tests/warroom_shell_layer.test.ts`

Added three new describe blocks (6 new tests, 14 total):

- **Message type contracts**: verifies the three message type strings (`awwv-shell:show-warroom`, `awwv-shell:handoff`, `awwv-back-to-hq`) are correct at the test level — a typo in either direction fails here rather than silently at runtime.
- **onNavigate contract**: verifies that when App.tsx wires `onNavigate`, calling it with a mapped command both applies the command AND sets `appScreen('game')`; calling it with `undefined` skips apply but still transitions to game.
- **All mapped regions produce valid ShellHandoffCommands**: guards against `regionToShellHandoff` returning a non-command object.

## Runtime flow (new)

```
Electron loads awwv://warroom/index.html
  → warroom.ts init() runs
  → existingStateJson or startNewCampaign result → applyGameStateFromJson()
  → REACT_SHELL_ENABLED → showTacticalMapScene('warroom')
  → iframe loaded: http://localhost:{port}/index.html?embedded=1&view=warroom&v=...
  → React App.tsx useEffect detects ?view=warroom → setAppScreen('warroom')
  → WarroomShellLayer renders with faction scene plate + hotspot overlays

Player clicks hotspot (e.g. flag area):
  → tacticalMapInWarroomMode=true && tacticalMapReady=true
  → warroom.ts posts { type: 'awwv-shell:handoff', command: { kind: 'army-hq', tab: 'summary' } }
  → App.tsx handleShellHandoff → applyShellHandoffCommand + setAppScreen('game')
  → React renders full tactical map with Army HQ open

Player clicks "◀ HQ" in TopToolbar or PresidentialToolbar:
  → window.parent.postMessage({ type: 'awwv-back-to-hq' })
  → warroom.ts receives it → REACT_SHELL_ENABLED → posts { type: 'awwv-shell:show-warroom' }
  → App.tsx handleShellHandoff → setAppScreen('warroom')
  → WarroomShellLayer renders again (no iframe reload, no scene swap)
```

## Legacy canvas path

`REACT_SHELL_ENABLED = false` reverts to the previous behaviour:
- `applyGameStateFromJson` → `showScreen('none')` (shows canvas desk)
- `awwv-back-to-hq` → `showWarroomScene()` (swaps canvas back)
- `openTacticalShellHandoff` → `showTacticalMapScene('operational')` (reloads iframe)

The legacy canvas render loop, scene plate assets, click handlers, and hotspot system in `warroom.ts` are untouched.

## Smoke test results

```
npx.cmd tsc --noEmit -p tsconfig.json        → CLEAN (no output)
node .../vitest.mjs run tests/warroom_shell_layer.test.ts → 14/14 PASS
npm run test:vitest                           → 1925 pass, 20 fail (all pre-existing, no new failures)
cd src/ui/map ; node_modules/.bin/vite build → ✓ built in 6.79s
powershell ... check_claude_governance.ps1   → Claude governance check: OK
```

## Completion block

```
Canonical owner:   React WarroomShellLayer (src/ui/map/components/warroom/WarroomShellLayer.tsx)
Demoted path:      warroom.ts canvas room art (still present, REACT_SHELL_ENABLED=false reverts)
Player-visible truth: Warroom room art and hotspots now rendered by React; tactical scene never unloads between room/game transitions
Canonical UI surface: WarroomShellLayer (React) for room navigation; warroom.ts retains main menu / side picker / scenario picker ownership
Done means:        ?view=warroom activates WarroomShellLayer; hotspot click transitions to game view; back-to-HQ returns to warroom without iframe reload; tsc + vitest + build all clean
```
