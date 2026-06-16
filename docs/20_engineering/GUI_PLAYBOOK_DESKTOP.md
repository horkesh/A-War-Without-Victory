# GUI Playbook (Desktop)

## Core Flow

1. Launch desktop map (`npm run desktop`).
2. Open `Menu` -> **New Campaign** (or **Load Save**). **New Campaign:** a side-picker overlay appears (RBiH, RS, HRHB with flags). Choose a side; the app consumes the baked `apr_1992` startup artifact (`data/derived/startup/apr_1992_initial_save.json`), a one-way derived copy of canonical builder truth from `data/scenarios/apr1992_definitive_52w.json`; sets your side as the player faction; injects recruitment state for the toolbar and Recruit modal; queues the selected faction's foundational opening decision; and applies the state to the map. First-hour order should be: war-start briefing, President's Desk opening brief, foundational decision, then the ordinary command map/tutorial loop. **Load Save** opens the state-file picker and loads replay summaries from `replay_save_manifest.json` when that file sits beside the selected save.
3. Use `Advance turn` from the play controls in Layers panel.
4. Review:
   - Left sidebar `WAR STATUS` + `ORDER OF BATTLE`
   - Center map order arrows and front lines
   - Right panel tabs (`OVER`, `ADMIN`, `CTRL`, `INTEL`, `ORDERS`, `AAR`, `EVENTS`)
5. Review the loaded save state in-place. Completed saves with replay sidecars expose the `VerdictScreen` replay scrubber; large replay sidecars use manifest summaries rather than parsing the full frame sequence in the renderer. When a full `replay_save_sequence.json` sidecar is loaded, the scrubber also exposes `Inspect Map` for read-only tactical-map inspection of the selected frame.

## New UI Elements

- Toolbar: `Menu`, `Summary`, `Settings`, `Help`.
- Main menu overlay: campaign/save entrypoint.
- AAR modal: auto-opens when turn-to-turn control events are detected.
- Settings modal:
  - CRT visual pass (optional)
  - UI audio cue toggle (optional)
- Help modal: keyboard shortcuts.
- Replay scrubber: available on the endgame verdict surface when `replay_save_manifest.json` or a compatible `replay_save_sequence.json` sidecar is present. Full sequences support selected-frame map inspection; sparse manifests are summary-only.

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
- Desktop replay validation: load an endgame save with sibling `replay_save_manifest.json`, open the verdict surface, and verify the Replay summary cards render without requiring full `replay_save_sequence.json` parsing. For a full sequence sidecar, scrub to a frame, click `Inspect Map`, verify the tactical map swaps to that frame, then use `Return to Final`.
