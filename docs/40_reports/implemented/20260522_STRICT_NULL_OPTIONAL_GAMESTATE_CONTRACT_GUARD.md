# Strict-Null Optional GameState Contract Guard

**Date:** 2026-05-22

**Scope:** Strict-null diagnostic and roadmap guard only. No simulation behavior, save schema, migration, scenario data, UI behavior, calibration/army-arc tuning, combat math, or serialized output contract changed.

## Summary

The visible strict-null escape lanes are mostly closed: counted `as FactionId`, `as any`, dot non-null, and index non-null sites are zero, while three `as unknown` boundary casts remain. The larger remaining strict-null inventory is the optional `GameState` field contract lane.

This slice pins that lane as an explicit test contract:

| Category | Count |
|---|---:|
| `as_factionid_casts` | 0 |
| `as_unknown_casts` | 3 |
| `as_any_casts` | 0 |
| `non_null_assertions_dot` | 0 |
| `non_null_assertions_index` | 0 |
| `optional_fields_game_state` | 486 |

Optional-field domain floor:

| Domain | Count |
|---|---:|
| `sim` | 304 |
| `state` | 174 |
| `derived` | 8 |
| `scenario` | 0 |
| `ipc` | 0 |
| `ui_adapter` | 0 |
| `unknown` | 0 |

## Changes

- Added a strict-null progress test that pins the current counted escape floor and optional `GameState` domain split.
- Added CLI test coverage for `tools/diagnostics/strict_null_inventory.cjs --field-domains` so the optional-field schema lane has a stable, machine-readable report surface.

## Interpretation

This is not a signal to promote optional fields wholesale. The 486 fields remain a save-shape/defaulting review problem. Future work should classify and migrate small owned groups only when loaders, migrations, validators, and baseline behavior prove the required shape.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory.test.ts tests\strict_null_inventory_progress.test.ts --reporter=dot` passed 94/94.
