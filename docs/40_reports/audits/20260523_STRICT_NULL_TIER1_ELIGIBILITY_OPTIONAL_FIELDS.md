# Strict-Null Audit: Tier1EntityEligibilityState Optional Fields

Date: 2026-05-23

Scope: `Tier1EntityEligibilityState` in `src/state/game_state.ts`.

## Finding

`Tier1EntityEligibilityState` contributes five optional fields to the strict-null `optional_fields_game_state` inventory:

| Field | Classification | Evidence |
|---|---|---|
| `debug` | Diagnostic optional | The active Phase 3C writer initializes and mutates required `domains`, `persistence`, `suppressed`, and `immune`; no production path requires `debug`. |
| `gates` | Diagnostic-detail optional | Nested under `debug`; absent in normal initialized state and not consumed by Phase 3D collapse resolution. |
| `authority` | Diagnostic-detail optional | Nested under `debug.gates`; the required authority eligibility bit lives at `domains.authority`. |
| `cohesion` | Diagnostic-detail optional | Nested under `debug.gates`; the required cohesion eligibility bit lives at `domains.cohesion`. |
| `spatial` | Diagnostic-detail optional | Nested under `debug.gates`; the required spatial eligibility bit lives at `domains.spatial`. |

## Producer/Consumer Review

`getOrInitTier1EligibilityState(...)` in `src/sim/pressure/phase3c_exhaustion_collapse_gating.ts` constructs the persisted Tier-1 state with required domain booleans, required persistence counters, and required suppression/immunity booleans.

`applyPhase3CExhaustionCollapseGating(...)` then mutates the required `domains` and `persistence` fields for each evaluated entity. The returned audit report carries aggregate Tier-1 stats separately from the persisted state.

`runPhase3DCollapseResolution(...)` in `src/sim/collapse/phase3d_collapse_resolution.ts` consumes only `domains[domain]` and `persistence[domain]` from each Tier-1 row. It does not require or read `debug`, `debug.gates`, or the nested diagnostic gate records.

## Decision

Do not promote these five fields generically in the strict-null cleanup lane.

The counted fields are optional diagnostic detail, not missing required gameplay state. Promoting them would either serialize empty debug objects into every Tier-1 row or require writing diagnostic gate breakdowns on the hot Phase 3C path even when no consumer reads them.

The correct future path, if richer Tier-1 explainability is needed, is a dedicated diagnostic-output lane that decides whether gate reasons belong in persisted state, turn reports, or a compact trace table. That is observability/schema work, not a counted optional-field cleanup.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `Tier1EntityEligibilityState` with five optional fields, intentionally classified rather than reduced.

## Roadmap Impact

This burns down one small `state` optional-field group by classification. It does not reduce the 477 optional-field floor. Future strict-null source work should continue with groups where optionals are either safely defaultable at the save boundary or known sparse state contracts that need explicit classification.
