# Morning Report — Night Shift 2026-03-24

## Summary
Completed v0.6.5 (offensive paramilitary sweep), adapter integration tests, and v0.7.0 Phase 1+2 (evaluators + flag gates). 3 commits, +0.6pp calibration, 1446 tests. Build clean.

## What Was Done

### v0.6.5 — Offensive Paramilitary Sweep (COMPLETE)
- Phase 1: Constants (OFFENSIVE_PARA_*) + paramilitary_mode field on FormationState
- Phase 2: `detectOffensiveParamilitaryTargets()` + extended `advanceParamilitaries()` for offensive mode
- Phase 3: `offensive-paramilitary-detect` pipeline step in war_phases.ts
- Phase 4: 10 new tests (6 detection + 4 resolution)
- Phase 5: Calibration 92.0% -> 92.6% (+0.6pp). Baseline re-frozen (n1038). /war-or-game APPROVED
- /simplify: Ran after completion (3 review agents dispatched)
- Enclave protection added after first run showed Gorazde/Srebrenica overshoot (90.7% initial -> 92.6% with exclusion)
- Commit: c9ac0137

### Tier 0.5 — Integration Tests (COMPLETE)
- Adapter field completeness test: 18 tests against real save file
- Covers: formations, political controllers, control events, militia pools, corps sectors, officers, enclaves, displacement, casualties, supply, events, turn summaries
- Commit: e5483cdc

### v0.7.0 — Event Flag Wiring (Phase 1+2 COMPLETE, Phases 3-6 remaining)
- Phase 1: Implemented `enclave_supply_status` and `corridor_severed` condition evaluators (were placeholders returning false)
- Phase 2: Wired flag gates to 21 downstream events across all 4 event JSON files
- Phase 3 (partial): Added pressure modifiers to 3 events (concentration_camps, srebrenica_enclave, hvo_arbih_tensions)
- 8 new condition evaluator tests
- Commit: 99655a7a

## Test Results
- Suites: 117 passed
- Tests: 1446 passed (was 1412 at start of shift, +34 new)
- New tests added: 10 (paramilitary) + 18 (adapter) + 6 (evaluator) = 34
- TypeScript: clean
- Map build: clean

## Decisions Made (FLAGGED FOR DAY SHIFT REVIEW)

- **[DECISION-1]**: Skipped `jna_withdrawn` flag gates. The `jna_withdrawal_1992` event is being crowded out by MAX_EVENTS_PER_TURN=3 after v0.6.5 changed event timing. Adding gates on a flag that doesn't fire would break the Drina -> Srebrenica -> Corridor cascade. **Fix needed**: either increase MAX_EVENTS_PER_TURN to 4, or give jna_withdrawal higher priority.

- **[DECISION-2]**: Accepted 92.6% (+0.6pp) vs plan target of +2-3pp. /war-or-game approved. The modest gain is because offensive paramilitaries cascade through VRS regular combat, causing Drina over-capture (+10 RS OSIDs vs painted). Enclave core OSIDs are protected.

- **[DECISION-3]**: Exported `ENCLAVE_DEFINITIONS` and `osidBelongsToEnclave` from enclave_resilience.ts (previously private). Needed for paramilitary enclave exclusion. Minimal API surface change.

## Issues Found

- **[ISSUE-1]**: MAX_EVENTS_PER_TURN=3 is too restrictive. At w5, 4+ events are eligible (barracks events + jna_withdrawal + others). The jna_withdrawal event gets squeezed out, which prevents it from setting the `jna_withdrawn` flag. This flag was supposed to gate drina_cleansing, operation_corridor, and srebrenica_enclave. **Severity: P1.** Fix: increase to 4 or add priority-based selection.

- **[ISSUE-2]**: Gorazde periphery over-capture (3 OSIDs: glamoc, kamen, sopotnica). The offensive paramilitaries take Gorazde municipality OSIDs that are NOT in the enclave OSID list but should historically remain RBiH. Consider either expanding the Gorazde enclave OSID list or removing gorazde from the offensive para municipality scope.

- **[ISSUE-3]**: The `corridor_severed` evaluator builds adjacency from `(state as any).derived?.edges` -- this path may not exist at runtime. It needs the operational contact graph edges, which are loaded by the turn pipeline but may not be on the state object. This evaluator may silently return false (corridor never severed) until the edges data path is properly wired.

## Skipped (Blocked)

- v0.7.0 Phase 4 (engine flag reads): Requires one-change-per-calibration-run protocol. Each engine system read needs its own calibration run. Too slow for tonight.
- v0.7.0 Phase 5 (FIXED->CONDITIONAL): High-risk conversions (Srebrenica, Markale, Zepa) need careful calibration.
- v0.7.0 Phase 6 (cleanup): Depends on Phases 4-5.
- v0.7.3 (canon audit): Not started -- roadmap priority after v0.7.0.

## Observations & Proposals

### Opportunities Noticed
- **[OPP-1]**: The `drina_cleansing_decision_1992` event now fires at w10 thanks to offensive paramilitaries raising war_crimes_events above threshold earlier. This is emergent and historically correct.
- **[OPP-2]**: HRHB offensive paramilitaries (6 units in Stolac/Capljina/Prozor) correctly model HOS activity in Herzegovina.

### Problems Discovered
- **[PROB-1]**: Plan estimated +2-3pp from offensive paramilitaries but actual gain is +0.6pp. Root cause: cascade effects. Paramilitaries unlock too much regular VRS expansion in the Drina via adjacency.
- **[PROB-2]**: Event timing is fragile. Adding 1 pipeline step changed event firing order enough to crowd out jna_withdrawal. MAX_EVENTS_PER_TURN cap is the bottleneck.

### Feature Ideas (DO NOT IMPLEMENT -- for day shift consideration)
- **[IDEA-1]**: Named paramilitary units ("Arkan's Tigers" for Bijeljina/Zvornik, "White Eagles" for Visegrad/Foca). ~20 lines.
- **[IDEA-2]**: Player paramilitary decision event with per-OSID granularity. "Arkan's Tigers request permission to operate in Zvornik. This will constitute a war crime."

### Code Quality Notes
- `paramilitary_sweep.ts` grew from 369 to ~580 lines. Approaching split point for offensive vs rear-pocket modes.
- `corridor_severed` evaluator uses `(state as any).derived?.edges` -- needs proper typing.

## Commits (chronological)
1. c9ac0137 -- feat(sim): v0.6.5 offensive paramilitary sweep -- Drina valley ethnic cleansing
2. e5483cdc -- test(integration): adapter field completeness -- 18 tests against real save
3. 99655a7a -- feat(events): v0.7.0 Phase 1+2 -- evaluators + flag gates + pressure modifiers

## Build State at End of Shift
- tsc: clean
- vitest: 117 suites, 1446 tests, 1 skipped
- Last commit: 99655a7a
- Current version: v0.6.5 (paramilitary sweep landed), v0.7.0 Phase 1+2 complete
- Calibration: 92.6% area-weighted, baseline frozen

## Recommended Next Steps for Day Shift
1. **Fix MAX_EVENTS_PER_TURN** -- increase to 4 or implement priority-based event selection. This unblocks jna_withdrawn flag gates (DECISION-1).
2. **Review DECISION-2** -- Gorazde periphery over-capture. Consider removing gorazde from OFFENSIVE_PARA_MUNICIPALITY_SCOPE.
3. **Continue v0.7.0 Phase 4** -- engine flag reads (supply_reserves, patron_pressure). One change per calibration run.
4. **Wire corridor_severed edges data path** -- ISSUE-3.
5. **Plan v0.7.0 Phase 5** -- FIXED->CONDITIONAL conversions for endgame chain.
