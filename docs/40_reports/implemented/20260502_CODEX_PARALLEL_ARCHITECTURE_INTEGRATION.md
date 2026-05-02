# Codex Parallel Architecture Integration

Date: 2026-05-02
Owner: Codex
Scope: integrate Codex parallel work back onto current `main` after Claude's combat-math mega-lane; verify the combined opportunity, Storm, AAR, and combat-predictor surfaces.

## Executive Verdict

GO. Claude's Combat-Math `estimateForceRatio` lane is accepted with one documentation correction: `OperationAAR.force_ratio_estimate` is a decision-time / launch-tick carryover, not a post-mortem recompute. Codex then merged two parallel architecture branches onto current `main`:

- `codex/opportunity-proof-platform`: read-only campaign proof matrix.
- `codex/storm-theater-gate`: split abstract Operation Storm readiness from actual western-theater rupture.

The combined repo now has a better proof stack for opportunity campaigns and a correct Storm gate semantics: pre-Storm defensive-crisis opportunities can occur before the theater actually opens, while Sana still requires the actual Storm/Oluja event.

## Commits Integrated

| Commit | Type | Summary |
|---|---|---|
| `857abdb6` | review fix | Clarify `force_ratio_estimate` AAR timing contract in code/test comments |
| `5c551d12` | merge | Merge opportunity campaign proof platform |
| `e8da4b5b` | merge | Merge Storm theater gate split |

Upstream Claude lane already on `main` before this integration:

- `3692db3c` red-first force-ratio tests
- `8b5a2902` defender-modifier integration in `estimateForceRatio`
- `cb7562a3` AAR `force_ratio_estimate` carryover
- `7c6fced3` combat-math close-out report / ledger / knowledge / napkin

## Code Review Result

No blocking code findings in the combat-math lane. The implementation uses the intended shared combat-math owners:

- `computeAttackerPower(...)`
- `rankDefendersByPower(...)`
- `getArtillerySuppression(...)`

The only correction shipped was wording: comments in `src/sim/combat/operation_aar.ts` and `tests/operation_aar.test.ts` now say the AAR value is written when preparation reaches assessment or anti-paralysis forced decision. This matches the report's staleness contract and prevents future readers from treating the field as finalize-tick truth.

## Verification

Focused tests:

```text
npx.cmd vitest run \
  tests/opportunity_campaign_proof_diagnostic.test.ts \
  tests/operation_storm_theater_gate.test.ts \
  tests/operation_opportunities_5th_corps_sana.test.ts \
  tests/operation_opportunities_una_94.test.ts \
  tests/operation_opportunities_breza_94.test.ts \
  tests/operation_opportunities_pauk_94_95.test.ts \
  tests/operation_aar.test.ts \
  tests/operation_preparation_force_ratio.test.ts
```

Result: 130/130 pass.

Typecheck:

```text
npx.cmd tsc --noEmit
```

Result: clean.

40w smoke:

- Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1609`
- Hash: `0c2fc264112dec1f`
- Jan 1993 comparison: 91.3% count / 93.3% area
- `diagnose_run`: 0 errors / 30 warnings
- `validate_run_consistency`: PASS
- Hash drift vs n1607 is additive only: direct JSON diff showed 15 changes, all `operation_history[*].force_ratio_estimate` fields added by Claude's AAR carryover.

188w verification:

- Run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1610`
- Hash: `9bfbcc19f7191ad6`
- Oct 1995 comparison: 70.8% count / 63.2% area
- `diagnose_run`: 0 errors / 35 warnings
- `validate_run_consistency`: 18 known sector-layer failures
- `opportunity_health_audit`: 7 decisions, 7 approved, 7 completed, 2 successes, 3 T3 sentinels, 0 broken AAR links, 0 duplicate rows
- `opportunity_campaign_proof`: 7 observed opportunities, 4 surfaced/executed, 3 T3-authorized, 1 reachability warning, 0 broken AAR links, 0 unlinked approved

## Storm Gate Proof

Final 188w n1610 state:

```json
{
  "operation_storm_preconditions_met": true,
  "operation_storm_precondition_turn": 85,
  "operation_storm_triggered": true,
  "operation_storm_turn": 174,
  "event_last_fired_turn.operation_storm_1995": 174
}
```

This is the intended split:

- Turn 85: abstract conditions align.
- Turn 174: actual Operation Storm event fires and the western theater opens.

Opportunity proof confirms the design effect:

| Opportunity | Outcome |
|---|---|
| APWB Pressure 94 | surfaced/executed, decisive success |
| Tigar-Sloboda 94 | surfaced/executed, decisive success |
| Una 94 | T3 authorized, no offensive created |
| Breza 94 | T3 authorized, no offensive created |
| Pauk 94/95 | T3 authorized, no offensive created |
| Grmec 94 | surfaced/executed, failed in combat |
| Sana 95 | surfaced/executed after Storm, failed in combat |

## Remaining Open Problems

This integration does not solve the late-war outcome gap. It makes ownership clearer:

1. **Srebrenica/Zepa P0 is still pre-existing.** Direct controller checks show Srebrenica and Zepa are RBiH in both n1608 and n1610.
2. **Sana and Mistral still fail delivery.** Sana has 4 attacks / 0 captures and one unreachable axis. Mistral still has no contact path.
3. **Krivaja-95 and Stupcanica-95 still do not execute effectively.** Both are `planning_invalidated` / no-contact in n1610.
4. **Oct 1995 painted gap remains mostly content/execution, not proof-system blindness.** The new proof matrix now shows where each opportunity dies.

## Next Recommended Mega-Lane

Give Claude the P0 sensitive-history plus late-war delivery mega-lane:

- Fix Krivaja-95 / Stupcanica-95 as opportunity/event-family surfaces behind `SENSITIVE_HISTORY_DESIGN_GATE.md`.
- Diagnose why VRS Drina can no longer deliver enclave operations in 1995.
- Keep atrocity/genocide content in locked consequence/reckoning surfaces, not tactical optimization.
- In parallel, have separate agents inspect catalog staging/reachability, VRS Drina OOB survival, sector pathing, and sensitive-history canon.

Codex should take the adjacent architecture lane: post-mortem AAR staleness contract and proof-surface naming, so future dashboards distinguish launch-tick estimates from finalize-tick truth without re-opening combat math.
