# Q2 — Compliance Deviation Reason

**Lane:** `LANE-NIGHTSHIFT-Q2-COMPLIANCE-DEVIATION-REASON`
**Date:** 2026-05-07
**Status:** SHIPPED (Ring 1 mechanism, no §6 surface).
**DDR:** `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (Q2 advisory thresholds).
**Predecessors:** A3 c8ff93d8 • C1 5084071d • API-DIRECTIVE-BRIDGE c084dd86.

## Why

API smoke run `bft5bixcj` on `a2d564e6` surfaced as DG-CLUSTER-3 (10 observations across all 3 commanders) the universal default `compliance: deviated` with no reason field. Commanders see "deviated" but cannot act on it — there's no signal whether the army CO wanted more aggression, less aggression, or refused outright.

## What

Extended the A3 compliance evaluator to emit a canonical `deviation_reason` string when `deviated=true`. The reason propagates through:

1. A3's `interpretArmyDirective` return shape (`ArmyCorpsDirective.deviation_reason`).
2. C1's `persistCorpsDirectives` → `state.military.army_corps_directives_by_faction[faction][corpsId].deviation_reason`.
3. Briefing's overlay reader → optional `briefing.campaign_role_deviation_reason` structural field.
4. API commander's `=== Political-Army Chain Context ===` prompt section: each deviated line now reads `(compliance: deviated, reason: <code>)`.

## Reason-code enum (closed, 3 values)

| Code | Trigger condition | Mapping |
|---|---|---|
| `aggressive_preference` | category=`modified` AND officer's preferred role rank > raw role rank | Officer wants more aggressive posture (e.g. `primary` when directive said `secondary`) |
| `cautious_preference` | category=`modified` AND officer's preferred role rank < raw role rank | Officer wants less aggressive posture (e.g. `contain` when directive said `primary`) |
| `compliance_score_low` | category=`partial` OR `refused` (score < 0.50) | Officer's overall trust in the directive is low; per-corps deviation is explicit pushback |

Set membership is closed — every `deviated=true` outcome maps to exactly one code; `undefined` when `deviated=false`. Mapping is purely deterministic over the existing scoring outputs (`categoryForScore` + `deviationStepsForCategory`); no new design decisions.

## Files touched

- `src/sim/combat/army_order_interpretation.ts` — type extended, `deviationReasonForCorps` helper, emission in `interpretArmyDirective`, forwarding in `persistCorpsDirectives`.
- `src/state/game_state.ts` — slot value type extended with optional `deviation_reason`.
- `src/state/validateGameState.ts` — validator accepts optional canonical-enum string.
- `src/sim/combat/commander/briefing.ts` — overlay reader carries reason; `collectCampaignIntent` returns it; structural `campaign_role_deviation_reason` attached to briefing.
- `tools/claude_plays_vrs/api_commander.ts` — chain-context section emits `, reason: <code>` suffix on deviated lines.
- `tests/q2_deviation_reason.test.ts` (NEW; 9 tests across 7 cases T1-T7 + T5b/T7b guards).
- `tests/c1_corps_directive_consumer.test.ts` (T7 only — relaxed strict-equal to `toMatchObject` to accommodate the new optional field; C1's role-mirror invariant unchanged).

## Verification

- `npx vitest run tests/q2_*.test.ts tests/c1_*.test.ts tests/c2_*.test.ts tests/api_commander_directive_context.test.ts` — **48/48 GREEN** (Q2: 9, C1: 15, C2: 17, API bridge: 7).
- `npx tsc --noEmit -p tsconfig.json` — **clean**.
- 40w smoke (parent): hash WILL drift since `deviation_reason` is a new persisted field on the C1 slot. Drift is expected and confined to the C1 slot serialization — no behavioral change to combat / movement / scoring paths.

## Sensitive-history compliance

- Ring 1 mechanism: faction-symmetric reason emission. No `if (faction === 'X')` branches in writer (A3) or reader (briefing); `T7b` guards.
- Ring 2 data: canonical reason-code enum.
- §6 surface: NONE introduced. No FORAWWV / paint anchor / `political_controllers` / OOB / rupture-wiring touch.

## Tests (per-test verdict)

| Test | Verdict |
|---|---|
| T1 — `deviation_reason` is a string when `deviated=true` | PASS |
| T2 — `deviation_reason` is undefined when `deviated=false` | PASS |
| T3 — Reason matches one of the canonical codes (set membership) | PASS |
| T4 — Persisted slot includes `deviation_reason` after C1 persist | PASS |
| T5 — API chain-context section includes reason for deviated corps | PASS |
| T5b — Briefing overlay reader carries reason field structurally | PASS |
| T6 — Determinism: same state produces same reason | PASS |
| T7 — Faction-symmetric: same reason logic for all 3 factions | PASS |
| T7b — No per-faction string-equality branches in Q2 mechanism source | PASS |
