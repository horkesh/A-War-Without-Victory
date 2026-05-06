# LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE — Implementation Report

**Date**: 2026-05-06
**Lane**: LANE-NIGHTSHIFT-API-DIRECTIVE-BRIDGE
**Ring**: 0 (tooling-only — `claude_plays_vrs` is a QA harness, not part of default sim)
**§6 surface**: NONE — exposes already-persisted state, no new game state introduced
**Faction symmetry**: yes — same code path for RBiH / RS / HRHB

## Problem

Two parallel systems were not talking:

1. **Deterministic substrate (C1, commit `5084071d` re-applied as `c084dd86`)** — `persistCorpsDirectives` writes per-corps role overlays to `state.military.army_corps_directives_by_faction[faction][corpsId]`. The deterministic corps commander reads this via `briefing.campaign_role` (`src/sim/combat/commander/briefing.ts:367`).
2. **Claude API commander harness** — `tools/claude_plays_vrs/api_commander.ts` builds its prompt from a hand-rolled state summary that never read either the political directive (B1) or the per-corps overlays (C1).

Result: API commander runs were "blind" to the political → army → corps chain that the bot path uses every turn.

## Change

`tools/claude_plays_vrs/api_commander.ts` now exports a helper `buildChainContextSection(state, faction)` that emits a deterministic plain-text block surfacing both slots, and `buildStatePrompt` injects that block immediately after the `RECENT EVENTS` line and before the JSON response schema.

### Format

```
=== Political-Army Chain Context ===
Political directive (from president): PRESS_OFFENSIVE -> target corps_id=vrs_drina
Army CO translation (per-corps role overlays):
  - vrs_drina: role=primary (compliance: full)
  - vrs_east_bosnian: role=secondary (compliance: full)
  - vrs_sarajevo_romanija: role=contain (compliance: deviated)
```

### Fallback (when slots empty / env flag disabled)

```
=== Political-Army Chain Context ===
(no political directive issued this turn)
```

### Determinism

Corps iteration sorted via `strictCompare(a, b)` — alphabetical. No `Math.random` / `Date.now` / timestamps. Pure function of `state.military.{political_directives_by_faction,army_corps_directives_by_faction}`.

### Env flag

`C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` short-circuits to the fallback section regardless of slot contents (mirrors C1's persist short-circuit — the slot would be empty anyway, but explicit for clarity / A/B testing parity).

## Files touched (lane-exclusive)

- `tools/claude_plays_vrs/api_commander.ts` — added `buildChainContextSection` helper + injection point in `buildStatePrompt`. Drive-by fix for pre-existing TS2538 in territory-tally loop (added `f !== null` guard) so file typechecks clean.
- `tests/api_commander_directive_context.test.ts` — NEW. 7 tests, all green.
- `docs/40_reports/implemented/20260506_API_DIRECTIVE_BRIDGE.md` — this file.

## Files NOT touched (per lane charter)

- `src/sim/combat/army_order_interpretation.ts` (C1 frozen)
- `src/sim/combat/commander/briefing.ts` (C1 frozen)
- `src/sim/political/political_directive_producer.ts` (B1 frozen)
- `src/sim/turn_phases/war_phases.ts` (frozen)
- `tools/claude_plays_vrs/api_corps_commander.ts` — the corps-level prompt does not need its own chain context: it already receives the army CO's `armyBriefing` string in its system prompt, which is downstream of B1/C1 in the deterministic path.

## Tests

`npx vitest run tests/api_commander_directive_context.test.ts` — **7/7 PASS**.

| ID | Description | Verdict |
|----|-------------|---------|
| T1 | surfaces political directive verb when slot populated | PASS |
| T2 | per-corps role overlays sorted alphabetically by corps_id | PASS |
| T3 | notes deviation flag when `deviated=true` | PASS |
| T4 | emits fallback when neither slot populated | PASS |
| T5 | env flag forces fallback even with populated slot | PASS |
| T6 | deterministic — re-build yields byte-identical output | PASS |
| T7 | faction-symmetric (RBiH/RS/HRHB same shape) | PASS |

`@anthropic-ai/sdk` is `vi.mock`-ed at the test module level so no real network calls are made.

## Verification

- `npx vitest run tests/api_commander_directive_context.test.ts` — all green (7/7).
- `npx tsc --noEmit -p tsconfig.json` — clean.
- A real API call cost test is **explicitly out of scope** for this lane and deferred to parent.

## Refs

- C1 (persistence): `5084071d` (re-applied as `c084dd86`)
- C-lane DDR: `docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md` (`57cec91c`)
- B-lane DDR: `docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md` (`941bd68e`)
- C-lane 188w A/B verdict: BEHAVIORAL CASCADE YES (7/8 derived artifacts differ enabled vs disabled)
