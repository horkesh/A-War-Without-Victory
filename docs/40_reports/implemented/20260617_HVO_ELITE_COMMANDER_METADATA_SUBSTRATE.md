# HVO Elite Commander Metadata Substrate

## Summary

Bernoulli's HVO OOB sidecar found that `data/source/oob_brigades.json` already contains `elite_commander` metadata for several elite units, but `src/scenario/oob_loader.ts` dropped the field. This made any future Vitezovi commander metadata dead data and hid existing ARBiH/RS/HVO elite commander source rows from typed consumers.

## Implementation

- Added `OobEliteCommander` and typed optional `elite_commander` parsing to `loadOobBrigades(...)`.
- Preserved nested `war_crimes_record` metadata when present.
- Added focused OOB loader coverage proving existing ARBiH, RS, and HVO elite commander rows round-trip.
- Left `hrhb_vitezovi_brigade_vitez` unchanged: no commander attached, no rename, no personnel change, no `is_elite` change, no formation split. The report-backed residual is a separate historical modeling decision between a local Vitez brigade and the PPN "Vitezovi" abstraction.

## Verification

- `npx.cmd vitest run tests\oob_loader.test.ts --pool=forks --reporter=dot` -> 1 file / 4 tests passed.
- `npm.cmd run typecheck` passed.

## Scope

Data-loader/read-model substrate only. No simulation behavior, generated startup, scenario data, save schema, baseline manifest, calibration floor, 40w/188w output, packaged artifact, formation count, personnel, or elite-loan behavior changed.

## Residual

The Vitezovi content lane remains open. Bernoulli's recommendation is to avoid assigning Darko Kraljevic to the regular Vitez brigade unless the row is intentionally modeling the PPN "Vitezovi" special unit; the cleaner fix may be to distinguish the local brigade from a smaller PPN abstraction.
