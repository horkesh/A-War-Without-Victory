# Brigade Dissolution Threshold Closeout Progress

Date: 2026-05-17
Plan: `docs/plans/2026-05-17-brigade-dissolution-threshold-plan.md`

## What Changed

- Added focused path coverage in `tests/brigade_dissolution_paths.test.ts`.
- Added mechanism audit: `docs/40_reports/audits/20260517_BRIGADE_DISSOLUTION_THRESHOLD_AUDIT.md`.
- Added historical anchor register: `docs/40_reports/audits/20260517_BRIGADE_DISSOLUTION_HISTORICAL_ANCHORS.md`.
- No production code changed.
- No `data/scenarios/timelines/apr1992.json` threshold change was made.

## Test Evidence

Command:

```powershell
npx.cmd vitest run tests\brigade_dissolution_paths.test.ts
```

Result: PASS, 8 tests / 8 passed.

Focused regression command:

```powershell
npx.cmd vitest run tests\brigade_dissolution_paths.test.ts tests\krivaja_roster_phase_1.test.ts tests\krivaja_roster_phase_1_5_shape_de_epsilon.test.ts tests\morale_collapse_override.test.ts tests\integration_formation_integrity.test.ts
```

Result: PASS, 5 test files / 51 tests passed.

The tests cover:

- Battle-attrition 2-of-3 dissolution.
- Passive-drain low-personnel-only preservation.
- Personnel-cap preservation for large demoralized brigades.
- `MORALE_OVERRIDE_ENABLED` gating.
- Enclave 3-of-3 behavior.
- Personnel reserve and heavy-equipment salvage.
- Active-operation participant/axis removal.
- Deterministic dissolved-brigade ordering for identical inputs.

## Calibration Impact

Current status: no calibration impact. This lane has added only tests and documentation, so no 40w hash drift is expected from the local changes.

Outstanding verification before final backlog closure:

- `npm.cmd run typecheck`
- `npm.cmd run sim:scenario:run:40w` compared to current calibration baseline `0cb626c032204372`.
- 188w run/lifecycle table for the historical anchor register.

## Determinism

No nondeterminism risks found in this lane. The added test file is pure in-memory Vitest coverage, and the audited dissolution mechanism uses sorted formation ids and deterministic timeline lookup.
