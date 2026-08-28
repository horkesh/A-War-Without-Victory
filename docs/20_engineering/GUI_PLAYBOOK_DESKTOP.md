# GUI Playbook (Desktop)

## Core Flow

1. Launch desktop map (`npm run desktop`).
2. Open `Menu` -> **New War** or **Field Records**. **New War:** dismiss the splash, select from the neutral monitoring room, deliberately preview the faction's exact 1992 Warroom, review its dossier, choose historical/emergent mode, then Begin exactly once. The app consumes the baked `apr_1992` startup artifact (`data/derived/startup/apr_1992_initial_save.json`), a one-way derived copy of canonical builder truth that does not become a co-equal source; it then sets `meta.player_faction` and `meta.decision_mode`, initializes recruitment, and reveals that same selected Warroom. First-hour order is translucent date sting, one opening brief, foundational decision, then the ordinary command map/tutorial loop. **Field Records** lists validated saves newest-first and loads only an exact currently listed filename; the legacy arbitrary state-file picker remains a separate engineering load path.
3. Use `Advance turn` from the play controls in Layers panel.
4. Review:
   - Left sidebar `WAR STATUS` + `ORDER OF BATTLE`
   - Center map order arrows and front lines
   - Right panel tabs (`OVER`, `ADMIN`, `CTRL`, `INTEL`, `ORDERS`, `AAR`, `EVENTS`)
5. Review the loaded save state in-place. For completed saves, `VerdictScreen` loads replay summaries from `replay_save_manifest.json` rather than parsing a large full-frame sequence in the renderer. When a compatible full `replay_save_sequence.json` sidecar is loaded, the scrubber also exposes `Inspect Map` for read-only tactical-map inspection of the selected frame.

## New UI Elements

- Toolbar: `Menu`, `Summary`, `Settings`, `Help`.
- Main menu overlay: React-owned cinematic splash/monitoring-room/faction-Warroom entry plus inventory-backed Field Records.
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
- New War persists the selected faction and explicit decision mode; Field Records rejects stale, traversal, absolute, and unlisted filenames.
- Advance turn updates state and can surface AAR summary.
- Order arrows render when `brigade_attack_orders` / `brigade_mun_orders` exist in loaded state.
- Desktop replay validation: load an endgame save with sibling `replay_save_manifest.json`, open the verdict surface, and verify the Replay summary cards render without requiring full `replay_save_sequence.json` parsing. For a full sequence sidecar, scrub to a frame, click `Inspect Map`, verify the tactical map swaps to that frame, then use `Return to Final`.
