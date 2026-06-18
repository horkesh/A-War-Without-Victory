# Records and Sitrep Player-Safe Labels

**Date:** 2026-06-18
**Type:** UI/read-model presentation hardening
**Result:** Reserve consequence records and operational sitreps no longer expose internal enum, operation, phase, or OSID-derived debug copy.

## Summary

- Army HQ Records reserve-decision details now label enum-like reserve reasons before rendering.
- Operational sitrep active-operation summaries now render readable operation, phase, and deterministic calendar-date copy.
- Operational sitrep front labels now use the established OSID humanizer rather than a local ad hoc formatter.

## Changes Made

### Decision Consequence Records

- Added a reserve-reason label guard in `decisionConsequenceLedger.ts`.
- Known reserve reasons such as `defensive_gap` now render as player-safe copy (`defensive gap`).
- Unknown identifier-like reasons are suppressed in favor of neutral fallback copy instead of leaking snake_case.

### Operational Sitrep

- Active operation summaries changed from debug-style `Op: sector_attack | Phase: execution (since T8)` to player-facing summaries such as `Sector Attack in Execution since 1 Jun 1992.`
- Calendar labels use deterministic turn-to-date arithmetic, not `Date` construction, so the core determinism static scan remains clean.
- Front-edge labels now use `humanizeOsid(...)`, matching the established OSID display fallback instead of deriving labels from raw `op:` structure locally.

## Verification

- `npx.cmd vitest run tests\ui\decision_consequence_trail.test.ts --pool=forks --reporter=dot`
- `npx.cmd vitest run tests\ui\decision_consequence_trail.test.ts tests\operational_sitrep_views.test.ts --pool=forks --reporter=dot`
- `npx.cmd vitest run tests\determinism_static_scan_r1_5.test.ts tests\warroom_player_visibility.test.ts tests\operational_sitrep_views.test.ts --pool=forks --reporter=dot`
- `npm.cmd run test:vitest:fast`

## Files Changed

| File | Change |
| --- | --- |
| `src/ui/map/data/decisionConsequenceLedger.ts` | Added reserve-reason display guard and neutral fallback. |
| `src/ui/shared/operational_sitrep_views.ts` | Added player-safe operation summary and OSID display fallback usage. |
| `tests/ui/decision_consequence_trail.test.ts` | Pinned reserve enum reason display. |
| `tests/operational_sitrep_views.test.ts` | Pinned operation summary and OSID fallback labels. |
| `tests/warroom_player_visibility.test.ts` | Synced visibility assertion with the shared OSID humanizer's label order. |

## Scope

UI/read-model presentation only. No simulation logic, scenario data, save schema, serialization, generated artifacts, calibration floor, golden baselines, or packaged installer artifact changed.

## Next Steps

- Continue remaining raw-copy queue: event-modal effect fallback, War Cost Summary, and Army HQ Campaign Cost wording.
