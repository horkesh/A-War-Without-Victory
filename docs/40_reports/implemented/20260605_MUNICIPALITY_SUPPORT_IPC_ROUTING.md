# Municipality Support IPC Routing

Date: 2026-06-05
Branch: `codex/player-command-routing-backlog`
Type: Desktop IPC / player order routing

## Summary

The desktop `stage-municipality-support-order` IPC path now stages municipality support orders into the namespaced military order surface consumed by the simulator and guarded by save validation:

- Reads militia pools from `state.military.militia_pools`.
- Writes staged orders to `state.military.municipality_support_orders[faction]`.
- Rejects non-player-faction orders when `meta.player_faction` is present.
- Enforces the faction-specific support type contract: RBiH `weapons_shipment`, RS `staff_priority`, HRHB `croatian_support_package`.
- Packages the extracted helper with the Electron runtime.

No simulation turn logic, scenario data, baseline manifest, save schema, migration, or player-facing copy changed.

## Behavior

The old desktop handler wrote to a top-level `state.municipality_support_orders` field and looked for top-level `state.militia_pools`. That made the staged order effect-dead for the engine and inconsistent with the optional `GameState` validator contract.

The handler now delegates to `src/desktop/municipality_support_staging.cjs`, which owns validation and mutation. Keeping the logic in a small CommonJS helper gives the IPC path focused unit coverage without booting Electron.

## Verification

- `npx.cmd vitest run tests/municipality_support_staging.test.ts tests/desktop_packaging_contract.test.ts tests/phase_e_municipality_support.test.ts tests/ui_map_game_state_adapter.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `node tools/diagnostics/strict_null_inventory.cjs --field-domains`
- `git diff --check`
