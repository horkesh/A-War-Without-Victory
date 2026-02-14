# GUI Playbook (Desktop)

## Core Flow

1. Launch desktop map (`npm run desktop`).
2. Open `Menu` → **New Campaign** (or **Load Save** / **Load Replay**). **New Campaign:** a side-picker overlay appears (RBiH, RS, HRHB with flags). Choose a side; the app loads the fixed April 1992 start (`apr1992_historical_52w.json`), sets your side as the player faction, injects recruitment state for the toolbar and Recruit modal, and applies the state to the map. **Load Save** and **Load Replay** open file pickers as before.
3. Use `Advance turn` from the play controls in Layers panel.
4. Review:
   - Left sidebar `WAR STATUS` + `ORDER OF BATTLE`
   - Center map order arrows and front lines
   - Right panel tabs (`OVER`, `ADMIN`, `CTRL`, `INTEL`, `ORDERS`, `AAR`, `EVENTS`)
5. Use replay scrubber for week-by-week review when replay is loaded.

## New UI Elements

- Toolbar: `Menu`, `Summary`, `Settings`, `Help`.
- Main menu overlay: campaign/save/replay entrypoint.
- AAR modal: auto-opens when turn-to-turn control events are detected.
- Settings modal:
  - CRT visual pass (optional)
  - UI audio cue toggle (optional)
- Help modal: keyboard shortcuts.
- Replay scrubber: direct week jump.

## Keyboard Shortcuts

- `Space`: play/pause replay
- `M`: toggle main menu
- `O`: toggle OOB sidebar
- `R`: open replay loader
- `Esc`: close overlays/search

## Validation Checklist

- Scenario/state load updates map + OOB + war status.
- Advance turn updates state and can surface AAR summary.
- Order arrows render when `brigade_attack_orders` / `brigade_mun_orders` exist in loaded state.
- Replay load enables scrubber and week label.
