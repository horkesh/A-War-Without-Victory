# Operation Planning Campaign Orchestration Hardening

**Date:** 2026-04-08  
**Scope:** operation birth quality, triggered/historical-op injection relevance, probe planning-to-execution honesty, and combat-causality authority alignment  
**Result:** the broader operation planning / campaign orchestration / historical-op injection layer now injects only relevant triggered operations, launches probes only when they have a truthful immediate path, classifies dead-on-arrival probes as planning failures instead of fake combat recoveries, and stays clean across fresh 52-week and 56-week scenario runs

## Summary
- Tightened combat-causality so operation diagnostics read operation-local final attack truth instead of corps-wide pre-trim approximations.
- Protected active operation attackers from generic corps attack trimming and friction shedding so planned operations are not silently starved after launch.
- Reclassified dead-on-arrival probes from `no_logged_attempt` recovery into explicit `planning_invalidated` recovery when they miss their immediate launch window.
- Corrected a stale triggered-op brigade reference in Herzegovina and added a relevance gate so triggered operations with no remaining enemy objectives do not inject or warn.
- Verified the full planning/orchestration lane with fresh 52-week and 56-week runs, targeted regressions, and the recovery gate.

## Why This Was Necessary
After operation truth reconciliation and execution-quality hardening, the remaining pressure had moved upstream:
- probes could still be born from coarse geometry even when they had no truthful way to attack or even approach usefully on the live turn
- active operation attackers could be created honestly and then stripped by generic corps attack-share trimming or warlord friction after launch
- combat-causality still counted eligible attackers using corps-level snapshots, which could disagree with the operation's surviving attack orders
- triggered operations could still emit startup validation noise because the historical definition was stale against the current scenario state

Those failures were no longer about stale runtime truth. They were about operation birth quality and orchestration honesty.

## Changes Made

### Combat-causality now reads operation-local final truth
- [src/scenario/combat_causality.ts](/F:/A-War-Without-Victory/src/scenario/combat_causality.ts)
  - `eligible_attacker_count` is now derived from the operation's own participating brigade attack attempts rather than corps-wide `eligible_attackers_by_corps`.
  - `execution_without_attack_orders` and `execution_without_eligible_attackers` now only invalidate an operation when it has never logged prior objective attempts or captures, which prevents cleanup/bookkeeping turns from being mislabeled as fake execution.

### Active operation attackers are protected from generic trimming
- [src/sim/combat/bot_brigade_ai_osid.ts](/F:/A-War-Without-Victory/src/sim/combat/bot_brigade_ai_osid.ts)
  - Added `isPinnedActiveOperationAttacker(...)` so brigades participating in active execution-phase probes and sector attacks are protected from generic per-corps attack-share trimming.
  - RBiH warlord-friction trimming now only removes non-operation `trimmable` attack orders, leaving live operation attackers intact.

### Dead-on-arrival probes now die honestly as planning failures
- [src/sim/combat/sector_offensive.ts](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts)
  - Probes that spend one planning turn without becoming execution-ready now transition into one-turn `planning_invalidated` recovery instead of aging into `no_logged_attempt`.
  - Recovery-duration helpers treat `planning_invalidated` as a short deterministic cleanup path.
  - No-attempt recovery sites now classify probes through `getNoAttemptRecoveryReason(...)`, preserving `no_logged_attempt` for genuine execution failures while treating dead-on-arrival probes as birth/orchestration failures.
  - `recordFailedObjectives(...)` now skips `planning_invalidated`, so planning collapses do not contaminate objective-failure history.

### Triggered historical operations now require live relevance
- [src/sim/combat/triggered_operations.ts](/F:/A-War-Without-Victory/src/sim/combat/triggered_operations.ts)
  - Added `hasEnemyObjective(...)` and `opStillHasEnemyObjectives(...)` so triggered operations with no remaining enemy objectives are skipped before validation and injection.
  - Corrected `Operation Herzegovina Consolidation` to use the real brigade ID `rs_bilea_brigade` instead of the stale non-existent `rs_2nd_herzegovina_light_infantry`.
  - Tightened `Operation Kotor Varos` so its trigger requires at least one remaining enemy-held objective rather than a bare `turn >= 10` time gate.

## Test Coverage
- [tests/scenario_operation_diagnostics.test.ts](/F:/A-War-Without-Victory/tests/scenario_operation_diagnostics.test.ts)
  - Added coverage proving:
    - execution lulls after earlier real attacks do not invalidate the operation
    - eligible-attacker counts are operation-scoped rather than corps-scoped
- [tests/sector_offensive_idle_recovery.test.ts](/F:/A-War-Without-Victory/tests/sector_offensive_idle_recovery.test.ts)
  - Added coverage that probes missing their immediate launch window enter `planning_invalidated` recovery.
- [tests/triggered_operations.test.ts](/F:/A-War-Without-Victory/tests/triggered_operations.test.ts)
  - Added coverage that:
    - fully owned Kotor Varoš objectives suppress both injection and warning noise
    - Herzegovina Consolidation injects without brigade-missing warnings once prerequisites are met
- [tests/commander/operation_emit_overlap_guards.test.ts](/F:/A-War-Without-Victory/tests/commander/operation_emit_overlap_guards.test.ts)
  - Preserved overlap/emit coverage while the birth-quality changes landed around it.

## Verification

### Commands
- `cmd /c npx tsx --test tests\triggered_operations.test.ts`
- `cmd /c npx vitest run tests\scenario_operation_diagnostics.test.ts tests\sector_offensive_idle_recovery.test.ts tests\commander\operation_emit_overlap_guards.test.ts`
- `cmd /c npx tsc --noEmit`
- `cmd /c npm run sim:scenario:run:default`
- `cmd /c npm run sim:scenario:run:56w`
- `cmd /c npm run recovery:check`

### Outcome
- Targeted regressions passed.
- Typecheck passed.
- Fresh 52-week run `n1394` completed with:
  - `invalid_operation_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`
  - `op_injection_warning_count: 0`
- Fresh 56-week run `n1393` completed with:
  - `invalid_operation_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`
  - no `[op-validation]` lines in the captured run log
- Recovery gate passed.

## A+ Judgment
This broader planning/orchestration layer now meets the same standard as the hardened sector and execution cores:
- operation birth is constrained by brigade-side usefulness rather than loose geometric possibility
- triggered historical operations are live-relevant and tied to actual scenario truth
- dead-on-arrival probes fail as planning/orchestration events, not fake combat execution events
- combat-causality reads final operation-local truth
- fresh standard and long-form scenarios stay clean under the same code state

## Lessons Learned
- An operation system is not `A+` when execution is honest but birth is sloppy. Birth quality is part of truth.
- Corps-level trim logic must respect operation ownership or the planner and executor will silently fight each other.
- Historical-op triggers need both chronology and current-world relevance. A time gate alone is not a planning contract.
- `no_logged_attempt` should be reserved for genuine execution failure. If the operation never became usefully executable, that is a planning invalidation.
