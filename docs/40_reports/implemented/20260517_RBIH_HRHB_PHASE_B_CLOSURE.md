# RBiH-HRHB Phase B Closure

Date: 2026-05-17
Lane: independent Phase B/C implementation

## Implemented

- Closed B2 territorial competition incidents:
  - direct RBiH-HRHB captures count as full territorial incidents;
  - RS-held captures in mixed RBiH-HRHB municipalities count as partial incidents;
  - alliance degradation now includes a one-turn-delayed `territorial_penalty` driver.
- Closed B4 Phase 0 handoff:
  - `phase0_relationships.rbih_hrhb` maps into the initial `political.war_alliance_rbih_hrhb` only when the alliance value is absent;
  - missing Phase 0 data preserves the existing April 1992 default.
- Verified C1 bilateral front-edge behavior:
  - RBiH-HRHB front edges remain suppressed while alliance is above the mobilization threshold;
  - edges appear at the mobilization threshold and remain during open war after the earliest bilateral-war turn.

## Verification

- `npx.cmd vitest run tests\alliance_territorial_incidents.test.ts tests\alliance_phase0_handoff.test.ts` — PASS.
- `npx.cmd vitest run tests\alliance_lifecycle.test.ts tests\alliance_mobilization.test.ts` — PASS.
- `npx.cmd vitest run tests\alliance_territorial_incidents.test.ts tests\alliance_phase0_handoff.test.ts tests\bilateral_front_edges.test.ts` — PASS.
- `git diff --check` — PASS, CRLF warnings only.

## Blocked Wider Gates

- `npm.cmd run typecheck` is blocked by unrelated supply/readiness lane errors in `src/sim/combat/corps_operation_readiness.ts` and `tests/bot_supply_awareness_target_scoring.test.ts`.
- `npm.cmd run sim:scenario:run:40w` is blocked by the same unrelated `factionPoolPressure` runtime error. No scenario hash was produced.

## Determinism

- New incident counting sorts flips by municipality/from/to before aggregation.
- No randomness, timestamps, filesystem ordering, or nondeterministic iteration were introduced.
- Scenarios with zero qualifying territorial incidents should be hash-inert for B2. Full scenario hash verification is pending the unrelated readiness blocker.

## Sensitive-History Gate

Focused tests do not touch Ahmici, Stupni Do, Grabovica, or Uzdol fixtures. The sensitive-history gate did not trip. Scenario-level confirmation remains pending once the readiness blocker is cleared.
