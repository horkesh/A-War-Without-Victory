# LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX

**Date:** 2026-05-07
**Lane:** LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX
**Ring:** Ring 0 (tooling-only QA harness)
**Sensitive-history:** No engine touch, no §6 surface, faction-symmetric.

## Summary

Closed the second wiring gap surfaced by the D3 chain v2 review:
`tools/claude_plays_vrs/persona_telemetry.ts` was authored by the
D1+D2 lane (commit `e25c18c3`) and unit-tested via T4 in
`tests/d2_run_orchestration.test.ts`, but **none of the three persona
API entry points actually called `emitDecision()` at runtime**. As a
result, D3.1/D3.2/D3.3 v2 ran 240/120/840 API calls each, returned
shaped results to the caller, and never produced a single line in
the side-channel `data/derived/_debug/d_lane_persona_decisions.jsonl`.

This lane wires `emitDecision()` into the response-parse step of all
three API entry points so per-decision telemetry becomes observable
without touching the frozen `persona_telemetry.ts` / `persona_loader.ts`
surfaces or the parent's `run_three_commanders.ts` orchestration file.

## Files modified

- `tools/claude_plays_vrs/api_president.ts` — emit one
  `PersonaDecisionRecord` (role=`president`) at the end of
  `producePresidentDirective` after `safeParseJson`.
- `tools/claude_plays_vrs/api_commander.ts` — emit one record
  (role=`army_co`) at the end of `generateApiDecision`. Uses the
  active army-CO persona via `loadPersonaByTenure` for the
  `officer_id`; falls back to the deterministic profile commander
  name when no persona is registered.
- `tools/claude_plays_vrs/api_corps_commander.ts` — emit one record
  (role=`corps_co`) at the end of `generateCorpsApiDecision`. Uses
  the corps-id persona-id mapping that already exists in this file
  for the `officer_id`.

## Files added

- `tests/d2_persona_telemetry_wire.test.ts` — six wire-up tests
  verifying each API entry point calls `emitDecision` exactly once
  per response with the correct role/faction/officer_id payload.
  Mocks both the Anthropic SDK and `persona_telemetry` (spy on
  `emitDecision`).
- `docs/40_reports/implemented/20260507_D2_TELEMETRY_WIRE_FIX.md`
  (this report).

## Frozen surfaces (not touched)

- `tools/claude_plays_vrs/persona_telemetry.ts` — D2 frozen surface;
  its public exports (`emitDecision`, `PersonaDecisionRecord`,
  `D2_TELEMETRY_OUTPUT_REL_PATH`) are imported and called.
- `tools/claude_plays_vrs/persona_loader.ts` — D2 frozen surface;
  used read-only via `loadPersonaByTenure` for officer_id resolution.
- `tools/claude_plays_vrs/run_three_commanders.ts` — parent's
  territory; not touched.
- All persona JSON files.
- All engine code (`src/sim/`, `src/state/`).

## Determinism / sensitive-history compliance

- The wire-up calls `emitDecision()` after the API response is parsed.
  `emitDecision` itself is a no-op when `CLAUDE_PERSONA_TELEMETRY_DISABLED=true`.
- No `Math.random()`, no `new Date()`, no `setTimeout`. The records
  reuse the same `latency_ms` already computed in each module via
  `Date.now()` (already permitted in api_*.ts files for latency).
- Faction-symmetric: identical code path per faction; voice/data is
  faction-asymmetric only via persona JSON.
- No GameState mutation; the JSONL side-channel is append-only.

## Implementation diff (pre-test, pre-typecheck)

```
tools/claude_plays_vrs/api_commander.ts       | 47 ++++++++++++++++++++++++++-
tools/claude_plays_vrs/api_corps_commander.ts | 33 +++++++++++++++++--
tools/claude_plays_vrs/api_president.ts       | 20 ++++++++++++
3 files changed, 97 insertions(+), 3 deletions(-)
```

## Verification

```
npx vitest run tests/d2_persona_telemetry_wire.test.ts \
              tests/d1_persona_infrastructure.test.ts \
              tests/d2_run_orchestration.test.ts \
              tests/api_commander_directive_context.test.ts

✓ tests/d1_persona_infrastructure.test.ts        (14 tests) 38ms
✓ tests/d2_persona_telemetry_wire.test.ts         (6 tests) 50ms
✓ tests/api_commander_directive_context.test.ts  (7 tests)  5ms
✓ tests/d2_run_orchestration.test.ts              (9 tests) 15ms

Test Files  4 passed (4)
     Tests  36 passed (36)
  Duration  1.74s
```

```
npx tsc --noEmit -p tsconfig.json  → exit 0 (clean)
```

Per-test verdicts (D2 wire-fix file):
- T1: producePresidentDirective emit-once / role=president / officer=karadzic — PASS
- T2: producePresidentDirective skips emit when env flag absent — PASS
- T3: generateApiDecision emit-once / role=army_co / stances+briefing summary — PASS
- T4: generateApiDecision emits on parse-failure path with summary='parse_failure' — PASS
- T5: generateCorpsApiDecision emit-once / role=corps_co / officer=vrs_drina_corps_co — PASS
- T6: faction-symmetric emit-up across RS/RBiH/HRHB president layer — PASS
- 40w smoke (parent runs separately): with any `CLAUDE_AS_*=true`
  flag set, expect `data/derived/_debug/d_lane_persona_decisions.jsonl`
  to exist and grow with one row per per-turn API call.

## Commit

`fix(tools): wire persona_telemetry.emitDecision into api_president/api_commander/api_corps_commander (LANE-NIGHTSHIFT-D2-TELEMETRY-WIRE-FIX)`

Commit SHA: `59805cd6`

## Notes for downstream reviewers

- The decision_summary content varies by role:
  - president → `verb=<verb>` (e.g. `verb=hold_corridor`)
  - army_co → `briefing_len=<n>;stances=<corpsId:stance,...>`
  - corps_co → `assessment_len=<n>;sectors=<count>`
  These are short-strings only; the full reasoning is left in the
  caller's returned object so the JSONL row stays compact (one
  decision = one line).
- `chain_context_section_present` is fixed to `true` for army_co
  (always emitted via `buildChainContextSection`) and `false` for
  president and corps_co (chain context is built upstream and not
  visible to those modules).
