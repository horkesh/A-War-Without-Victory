# Strict-Null Audit: MunicipalityState and OrganizationalPenetration Optionals

Date: 2026-05-23

Scope:

- `MunicipalityState` in `src/state/game_state.ts`
- `OrganizationalPenetration` in `src/state/game_state.ts`

## Finding

These two related state groups contribute 15 optional fields to the strict-null `optional_fields_game_state` inventory:

- `MunicipalityState`: `authority`, `control`, `legitimacy`, `stability_score`, `control_status`, `organizational_penetration`
- `OrganizationalPenetration`: `police_loyalty`, `to_control`, `sds_penetration`, `sda_penetration`, `hdz_penetration`, `patriotska_liga`, `paramilitary_rs`, `paramilitary_hrhb`, `jna_presence`

## Producer/Consumer Review

`src/state/political_control_init.ts` initializes `control_status`, `control`, and sometimes `stability_score` for municipalities reached by the chosen initial-control path.

`src/state/seed_organizational_penetration_from_control.ts` seeds `organizational_penetration` for municipalities in the settlement graph when political control or explicit municipality controller inputs are available.

`src/state/organizational_penetration_formula.ts` currently emits a nearly full organizational-penetration object:

- `police_loyalty`
- `to_control`
- `sda_penetration`
- `sds_penetration`
- `hdz_penetration`
- `patriotska_liga`
- `paramilitary_rs`
- `paramilitary_hrhb`

`jna_presence` is not emitted by that formula and remains an additive external-support signal.

Consumers preserve sparse-state behavior:

- `militia_emergence.ts` treats missing `police_loyalty` / `to_control` as neutral `0.5`, and missing party/paramilitary fields as `0`.
- `settlement_control.ts` applies organizational-defense bonuses only when specific optional signals are present.
- `militia_garrison.ts` treats missing party/paramilitary/police signals as no extra militia-garrison support.
- `legitimacy.ts`, `recruitment_engine.ts`, `formation_spawn.ts`, and early-war control/pool code keep default paths when `municipalities` or individual municipality fields are absent.

## Decision

Do not promote these 15 fields generically in the strict-null cleanup lane.

`MunicipalityState` is a multi-phase sparse record. Some fields are initialized by political control setup, some are placeholders or future mechanics, and `organizational_penetration` depends on a separate seeding step.

`OrganizationalPenetration` has a stronger current producer than many optional groups, but old/minimal states and partial authoring remain supported by explicit neutral/zero fallbacks. `jna_presence` is also genuinely optional because it is not part of the formula output.

## Future Path

Safe reduction would require a dedicated municipality-state migration lane:

1. Define which scenario/init modes must always carry municipality rows.
2. Add save migration/default construction for existing saves.
3. Decide whether `OrganizationalPenetration` should become a required nested object with explicit neutral values.
4. Preserve the special `jna_presence` semantics or move it to a separate typed external-support field.
5. Run baseline and scenario roundtrip tests because save shape would change.

Until that lane exists, these optionals are classified as sparse state-contract fields rather than cleanup targets.

## Verification

Fresh inventory command:

```powershell
node tools\diagnostics\strict_null_inventory.cjs --field-interfaces
```

Current result still includes `OrganizationalPenetration` with nine optional fields and `MunicipalityState` with six optional fields, intentionally classified rather than reduced.

## Roadmap Impact

This burns down two adjacent `state` optional-field groups by classification. It does not reduce the 477 optional-field floor. Future source work should target groups with stronger save/default/validator evidence or open a municipality-state migration lane explicitly.
