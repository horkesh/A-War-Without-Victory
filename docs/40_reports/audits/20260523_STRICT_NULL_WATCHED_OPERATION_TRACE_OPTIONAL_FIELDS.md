# Strict-Null Watched Operation Trace Optional Fields

**Date:** 2026-05-23
**Scope:** Classification of the `WatchedOperationTraceRow` optional `GameState` fields reported by `tools/diagnostics/strict_null_inventory.cjs --field-interfaces`.

## Slice

`WatchedOperationTraceRow` is a diagnostic row emitted for watched-operation visibility, lifecycle, and evidence packets. It can represent catalog-present/no-launch rows, blocked rows, accepted launch rows, and launch-feasibility rows. The current strict-null inventory reports it as a `sim` interface with nine optional fields:

| Field | Classification | Decision |
|---|---|---|
| `launch_objective_osid` | launch/build evidence optional | Keep optional. Catalog-present or blocked rows can be valid without a concrete launch objective. |
| `launch_primary_defender_id` | launch/build evidence optional | Keep optional. Rows without a resolved defender stack should not synthesize a primary defender. |
| `launch_defender_count` | launch/build evidence optional | Keep optional. Defender counts exist only after launch feasibility has defender context. |
| `launch_defender_ids` | launch/build evidence optional | Keep optional. The row can describe non-launch outcomes where no defender list exists. |
| `launch_defender_power_by_id` | launch-feasibility evidence optional | Keep optional. Detailed defender-power rows are emitted only when feasibility evaluated defender inputs. |
| `breakdown` | nested launch-feasibility detail optional | Keep optional. Per-defender breakdown is more specific than the parent power row and should remain sparse. |
| `launch_feasibility_ratio` | launch-feasibility metric optional | Keep optional. No ratio exists when feasibility did not run. |
| `launch_attacker_power` | launch-feasibility metric optional | Keep optional. Attacker power is a computed launch-feasibility input, not a universal row property. |
| `launch_defender_power` | launch-feasibility metric optional | Keep optional. Defender power is a computed launch-feasibility input, not a universal row property. |

## Decision

These fields should not be promoted to required in a strict-null count-reduction pass. Absence is part of the row contract: it distinguishes no-launch, blocked, and unavailable-evidence rows from launch-feasibility evidence rows. Any future change that requires these fields must be a watched-operation output/schema lane with baseline review, not cosmetic optional-field cleanup.

The progress test now pins the current `WatchedOperationTraceRow` optional-field list so inventory changes are intentional.

## Verification

```powershell
node -e "const d=require('./tools/diagnostics/strict_null_inventory.cjs'); const w=d.buildInventory(process.cwd()).optional_field_interfaces.interfaces.find(x=>x.interface==='WatchedOperationTraceRow'); console.log(JSON.stringify(w, null, 2));"
npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot
git diff --check
```
