# Strict-Null Audit: FactionState Optional Fields

Date: 2026-05-23

Scope: `FactionState` in `src/state/game_state.ts`.

## Finding

`FactionState` contributes ten optional fields to the strict-null `optional_fields_game_state` inventory:

- `patron_state`
- `embargo_profile`
- `maintenance_capacity`
- `capability_profile`
- `command_capacity`
- `negotiation`
- `prewar_capital`
- `declaration_pressure`
- `declared`
- `declaration_turn`

## Producer/Consumer Review

These fields belong to separate faction subsystems rather than one required faction core:

- `patron_state`, `embargo_profile`, `maintenance_capacity`, and `capability_profile` are phased system profiles. Producers update them in their own subsystem lanes; consumers preserve neutral/empty behavior when the profile is absent.
- `capability_profile` has a narrower dedicated classification in `docs/40_reports/audits/20260523_STRICT_NULL_CAPABILITY_PROFILE_OPTIONAL_FIELDS.md`.
- `command_capacity` is explicitly documented as defaulting to `0` when absent; forcing serialization would be a save-shape change without adding information.
- `negotiation` is present only when negotiation accounting is initialized; scenario end reports and consumers use absence as zero/empty negotiation state.
- `prewar_capital`, `declaration_pressure`, `declared`, and `declaration_turn` are Phase 0 / peace-start lifecycle fields. Scenario runner initialization writes them for phase-0/peace paths, while war-start/minimal fixtures and older saves still tolerate absence.

## Decision

Do not promote these ten fields generically in the strict-null cleanup lane.

`FactionState` is the long-lived faction record shared across scenario phases. Required core identity is already represented by `id`, `profile`, `areasOfResponsibility`, and `supply_sources`. The optional fields are activated by independent systems with different historical/default semantics.

Safe reduction requires subsystem-specific lanes:

1. Capability-profile schema/default work for `capability_profile`.
2. Phase 0 lifecycle migration/default work for prewar capital and declaration fields.
3. Negotiation-state save-contract work for `negotiation`.
4. Command-capacity default/migration review if the design wants serialized `0`.
5. Patron/embargo/maintenance profile initialization proof before making their profiles required.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `FactionState` with ten optional fields, intentionally classified rather than reduced.

## Roadmap Impact

This burns down the `FactionState` optional-field group by classification. It does not reduce the 477 optional-field floor. Future promotion belongs in subsystem-specific schema/default/migration work, not broad optional cleanup.
