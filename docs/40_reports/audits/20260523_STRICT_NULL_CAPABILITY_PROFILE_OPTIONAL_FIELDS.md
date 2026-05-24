# Strict-Null Audit: CapabilityProfile Optional Fields

Date: 2026-05-23

Scope: `CapabilityProfile` in `src/state/game_state.ts`.

## Finding

`CapabilityProfile` currently contributes four optional fields to the strict-null `optional_fields_game_state` inventory:

| Field | Classification | Evidence |
|---|---|---|
| `equipment_access` | Intentionally sparse | Authored for RBiH and HRHB profiles in `src/state/capability_progression.ts`; RS profiles use `equipment_operational` instead. |
| `equipment_operational` | Intentionally sparse | Authored for RS profiles in `src/state/capability_progression.ts`; RBiH/HRHB profiles use `equipment_access` instead. |
| `croatian_support` | Intentionally sparse | Authored only for HRHB profiles and Washington Agreement mutation paths. Adding it to RBiH/RS would create fake state. |
| `doctrine_effectiveness` | Defaultable only with schema review | Current profile writers always emit it, but `getFactionCapabilityModifier(...)` and `computeCorpsOperationReadiness(...)` still preserve absence as a backward-compatible neutral/default path. |

## Producer/Consumer Review

- `updateCapabilityProfiles(...)` writes one profile per faction each turn.
- RBiH profiles use `equipment_access` and attack/defense doctrine curves.
- RS profiles use `equipment_operational` and artillery/static-defense/attack doctrine curves.
- HRHB profiles use `equipment_access`, `croatian_support`, and later `COORDINATED_STRIKE`.
- `computeCorpsOperationReadiness(...)` intentionally treats `equipment_access` and `equipment_operational` as alternate equipment signals, then falls back to neutral `0.5` if neither is present.
- `getFactionCapabilityModifier(...)` keeps absent `capability_profile` or absent `doctrine_effectiveness` neutral at `1.0` for old/minimal states.
- `washington_agreement.ts` mutates HRHB `equipment_access` and `croatian_support` only if the profile exists.

## Decision

Do not promote these four fields generically in the strict-null cleanup lane.

Making all four required would either:

1. Add semantically fake faction fields such as `croatian_support: 0` for RBiH/RS and duplicate equipment meanings across factions.
2. Change serialized save shape for no gameplay reason.
3. Risk changing readiness behavior if alternate equipment fields are defaulted carelessly.

The correct future path is a separate capability-profile schema lane if the design wants a discriminated profile shape, for example per-faction variants or an explicit `equipment_signal` object. That would be behavior/schema work, not a counted optional-field cleanup.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `CapabilityProfile` with four optional fields, intentionally classified rather than reduced.

## Roadmap Impact

This burns down one small `state` optional-field group by classification. It does not reduce the 477 optional-field floor. Future strict-null source work should continue with owned groups that have real save/default/validator evidence instead of promoting sparse historical profile fields.
