# Strict-Null Small Sim Optional Fields Classification

**Date:** 2026-05-22
**Scope:** Classification of small `sim` optional `GameState` interfaces reported by `tools/diagnostics/strict_null_inventory.cjs --field-interfaces`.

## Slice

This pass covers the `sim` interfaces with three or fewer optional fields:

| Interface | Count | Fields |
|---|---:|---|
| `FormationSpawnDirective` | 3 | `allow_displaced_origin`, `kind`, `turn` |
| `AssignableFrontSegmentState` | 2 | `name`, `theatre_id` |
| `MilitiaPoolState` | 2 | `fatigue`, `tags` |
| `ParamilitaryRequest` | 2 | `decision`, `estimated_civilian_risk` |
| `ArmyHQOverride` | 1 | `max_brigades` |
| `BrigadeMovementOrder` | 1 | `stance` |
| `CorpsFrontSubSegment` | 1 | `gap` |
| `OperationActiveProbe` | 1 | `result_confidence_gain` |
| `SectorIntelRecord` | 1 | `osid_confidence` |

## Classification

| Field group | Class | Decision |
|---|---|---|
| `FormationSpawnDirective.*` | runtime optional directive | Keep optional. Absent `kind` means legacy/default spawn behavior, absent `turn` means active when present, and absent `allow_displaced_origin` means displaced-origin formation is not enabled. |
| `AssignableFrontSegmentState.name`, `theatre_id` | derived/read-model optional | Keep optional. These are labels/ownership hints for assignable front display and should not become required without a sector/theatre migration. |
| `MilitiaPoolState.fatigue`, `tags` | additive lifecycle optional | Keep optional. Existing pools may predate fatigue/tags, and absence is a valid zero/no-label state. |
| `ParamilitaryRequest.estimated_civilian_risk` | ask-mode review optional | Keep optional until every producer is proven to emit ask-mode risk. Player-facing request rows should continue to require it at the adapter/UI boundary. |
| `ParamilitaryRequest.decision` | pending-decision optional | Keep optional. Absence means unresolved request; promoting it would erase pending-state semantics. |
| `ArmyHQOverride.max_brigades` | optional cap/default policy | Keep optional. Existing override types use defaults when no cap is authored; tests cover probe/feint fallback behavior. |
| `BrigadeMovementOrder.stance` | optional movement mode/default policy | Keep optional. Some producers omit stance and downstream movement treats absence as the non-column/default path. |
| `CorpsFrontSubSegment.gap` | derived diagnostic optional | Keep optional. Gap annotation is present only when a subsegment carries gap evidence. |
| `OperationActiveProbe.result_confidence_gain` | result-only optional | Keep optional. Active probes have no confidence gain until resolved. |
| `SectorIntelRecord.osid_confidence` | deep-intel optional | Keep optional. OSID confidence is emitted only when front-visible enemy OSIDs are available at sufficient confidence. |

## Decision

No field in this small sim slice should be promoted to required in a strict-null count-reduction pass. The only future implementation candidates are boundary-specific guards: adapter/UI requirements for player-facing paramilitary risk, or a producer audit for movement-order stance. Those must be behavior-specific lanes, not type-only optional-field cleanup.

## Verification

```powershell
node -e "const d=require('./tools/diagnostics/strict_null_inventory.cjs'); const r=d.buildInventory(process.cwd()).optional_field_interfaces; console.log(JSON.stringify(r.by_domain.sim.filter(x=>x.count<=3), null, 2));"
git diff --check
```
