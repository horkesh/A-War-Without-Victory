# R4 Phase 3 Event Reachability Checkpoint

**Date:** 2026-08-01
**Roadmap:** R4, Phase 3, Tasks 3.1-3.2
**Baseline parent:** `408d39ec09fd7425b1ee45b418b546040893d06c`
**Result:** source checkpoint complete; baseline/canon acceptance waits on the R5 exclusive runtime lease

## Outcome

Phase 0 already proved every presidential decision family reachable: `9/9` families had a production writer, action, durable receipt, and reader, with zero missing producers, unreachable surfaces, or duplicate surfaces. Phase 3 therefore changed no decision family. It repaired the one production writer gap that was proven by source inspection: event notification delivery depended on `AWWV_TWO_LEVEL_NOTIFICATIONS`, but no packaged startup or production configuration set that process variable.

Notification delivery is now reachable in ordinary event evaluation, player event resolution, and the packaged foundational-decision writer. These notices remain informational monitor rows and do not block Advance. The same retired gate no longer controls AI response policy.

## Runtime policy correction

Historical or migrated-unset mode now records `bot_ai_default` only when the event data authors either `bot_response_logic: accept_first` or a valid `historical_default_response_id`. `selectAIDefaultResponse` fails closed when called without such data. Events that lack an authored AI default use the existing deterministic political/v1 path and are no longer mislabeled as authored defaults.

Emergent mode remains signal-driven. Stable event ordering, notification sorting/IDs, firing counts, once-only suppression, and cooldown eligibility were not changed. The existing evaluator and surfacing tests retain direct coverage of those contracts.

## Authored content correction

No event, trigger, response, effect, or historical decision was invented. The existing `hrhb_washington_agreement_1994` event is owned by HRHB, but its notification payload incorrectly addressed HRHB and described Sarajevo/RBiH as the actor. Its two recipients are now the actual nonresponding factions, RS and RBiH, and the text identifies HZ HB/Mostar as the source.

Every one of the `76` `requires_player_response` rows retains exactly one canonical respondent. The residual notification diagnostic improves from `3` events / `6` missing recipient blocks with `2` unclassified blocks to `2` events / `4` blocks with `0` unclassified blocks. All remaining blocks are the pre-existing `visit_to_front_rs` and `visit_to_front_hrhb` press responses classified `blocked-sensitive`; R7 owns their source/content review.

The broader event catalog remains `NOT_READY` because of the inherited R7 authoring/source queue. This checkpoint does not remediate or relabel the inherited `57` sensitive-history catalog findings.

## TDD and verification

RED produced exactly six expected failures: unreachable notifications without the environment variable, unset-mode policy coupled to that flag, false `bot_ai_default` attribution for missing data, a permissive AI-default helper, inverted Washington recipients, and the stale residual floor.

GREEN evidence:

```powershell
npm.cmd run test:vitest -- tests/event_decisions.test.ts tests/events_evaluate.test.ts tests/free_war_decision_mode.test.ts tests/sim/events/event_presidential_acceptance.test.ts tests/sim/events/event_notification_residuals_diagnostic.test.ts tests/sim/events/event_notification_content_backfill.test.ts tests/sim/events/two_level_surfacing.test.ts tests/sim/events/dismiss_notifications.test.ts tests/ui/inboxItems.notifications.test.ts tests/ui/presidential_blockers.test.ts tests/event_timeline_integrity.test.ts --pool=forks --reporter=dot
# 11 files / 137 tests passed

npm.cmd run test:vitest -- tests/desktop_campaign_start_contract.test.ts tests/sim/events/two_level_surfacing.test.ts --pool=forks --reporter=dot
# 2 files / 12 tests passed

npm.cmd run typecheck
# passed

npm.cmd run test:vitest -- tests/determinism_static_scan_r1_5.test.ts tests/event_loader.test.ts tests/state/serialize.notifications.test.ts tests/ui_adapter_boundary.test.ts --pool=forks --reporter=dot
# 4 files / 56 tests passed

npx.cmd tsx tools/diagnostics/event_presidential_acceptance.ts
# READY: 46 player-surfaced, 46 player-resolved, 46 headless-auto-resolved; 0 failures; 0 stuck

node tools/diagnostics/event_notification_residuals.cjs --json
# 2 rows / 4 missing blocks; 4 classified; 0 unclassified
```

`war_1994.json` parses successfully and `git diff --check` passes.

## Explicit blocked gates and routed bug

`tests/event_state_shape_validation.test.ts` remains red on the untouched parent `408d39ec09fd7425b1ee45b418b546040893d06c`. Its shared `baseState` fixture omits schema-v37 `military.corps_front_sectors` and `military.sector_intel`, although the parent validator already requires both. This is an inherited R5 state-contract test-fixture bug, not an event-reachability defect, and was intentionally not repaired in R4.

`npm.cmd run test:baselines` and canon/runtime scenarios were not run because R5 owns the exclusive scenario/performance lease. No baseline was refreshed. R4 Phase 3 cannot claim runtime acceptance until that lease is released and the deferred gates pass.

## Scope

Changed only event evaluation/default/notification writers, the packaged foundational-decision writer, the existing HRHB Washington notification payload, focused tests, and governance/report truth. No save schema, event order, once/cooldown rule, scenario, baseline, package, Electron run, version, tag, installer, publication, release state, push, merge, or `docs/10_canon/FORAWWV.md` change occurred.
