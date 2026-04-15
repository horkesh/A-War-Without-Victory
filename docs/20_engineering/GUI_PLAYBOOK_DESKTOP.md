# GUI Playbook (Desktop)

## Core Flow

1. Launch desktop map (`npm run desktop`).
2. Open `Menu` → **New Campaign** (or **Load Save**). **New Campaign:** a side-picker overlay appears (RBiH, RS, HRHB with flags). Choose a side; the app consumes the baked `apr_1992` startup artifact (`data/derived/startup/apr_1992_initial_save.json`), which is a one-way derived copy of canonical builder truth from `apr1992_definitive_52w.json`, sets your side as the player faction, injects recruitment state for the toolbar and Recruit modal, and applies the state to the map. **Load Save** opens the state-file picker. Replay timelines are still harness artifacts, not a live desktop loading flow.
3. Use `Advance turn` from the play controls in Layers panel.
4. Review:
   - Left sidebar `WAR STATUS` + `ORDER OF BATTLE`
   - Center map order arrows and front lines
   - Right panel tabs (`OVER`, `ADMIN`, `CTRL`, `INTEL`, `ORDERS`, `AAR`, `EVENTS`)
5. Review the loaded save state in-place; the current desktop GUI does not expose replay loading or replay scrubbing.

## New UI Elements

- Toolbar: `Menu`, `Summary`, `Settings`, `Help`.
- Main menu overlay: campaign/save entrypoint.
- AAR modal: auto-opens when turn-to-turn control events are detected.
- Settings modal:
  - CRT visual pass (optional)
  - UI audio cue toggle (optional)
- Help modal: keyboard shortcuts.
- Replay loading and scrubbing are not currently exposed in the desktop GUI.

## Keyboard Shortcuts

- `M`: toggle main menu
- `O`: toggle OOB sidebar
- `Esc`: close overlays/search

## Troubleshooting

- **`TypeError: Cannot read properties of undefined (reading 'whenReady')`** â€” You ran `node src/desktop/electron-main.cjs` directly. Always use `npm run desktop` or `electron .` (via `node_modules/.bin/electron`). The main process now exits with an explicit error message if invoked from plain Node.js.

## Validation Checklist

- Scenario/state load updates map + OOB + war status.
- Advance turn updates state and can surface AAR summary.
- Order arrows render when `brigade_attack_orders` / `brigade_mun_orders` exist in loaded state.
- Desktop flow has no live replay loader or scrubber to validate; replay artifacts remain harness-side outputs.