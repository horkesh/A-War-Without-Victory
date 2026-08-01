# R4 Phase 3 Event Reachability Checkpoint

**Date:** 2026-08-01
**Roadmap:** R4, Phase 3, Tasks 3.1-3.2
**Baseline parent:** `408d39ec09fd7425b1ee45b418b546040893d06c`
**Result:** complete; independently reviewed canonical baseline and canon gates pass

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

## Canonical baseline and canon acceptance

After R5 released the exclusive runtime lane, the orchestrator owned the canonical refresh with `UPDATE_BASELINES=1 npm.cmd run test:baselines`. Independent review accepted exactly six manifest replacements and no others: `final_save.json` and `run_summary.json` for `apr1992_52w`, `baseline_ops_4w`, and `noop_4w`.

| Scenario | Artifact | Previous SHA-256 | Accepted SHA-256 |
|---|---|---|---|
| `apr1992_52w` | `final_save.json` | `2cdb02b9a63b1a48146485675b137247a1bd7a86c7a2cdbc3ba07fe0a2ec4b84` | `371373793515d823761bad7ac3d91cc9b4120b946cfc03cc85846b93b5cd2574` |
| `apr1992_52w` | `run_summary.json` | `baeb33369e8a9d0647f21b17cc77ba2081e7218a207d6cdfe4dba488d68b53d6` | `33ef1aec18a74c46d902f1a6af320f645c10cbafa2774f74bc44605302894941` |
| `baseline_ops_4w` | `final_save.json` | `7e827b29542adb1fa125aee8fdc29604643c14ca194fee6fd15b8666c30d3840` | `25c5e6909717e647558e99397243c401c7d6cbbb412ab0af07a75441717d28ab` |
| `baseline_ops_4w` | `run_summary.json` | `6088c10e5f249f75668d5c6b99bc0fb98989abd7430bf26023f1186030f62061` | `517f5240fad05252687aee75d6ea8faffdd98df5a41107f1c6c4e09ffff9195e` |
| `noop_4w` | `final_save.json` | `3030d42846e5b2347c946d275f2834dd3d675c27470959ce6a8890be228a49ad` | `9b334f8f848934762decb22185f9d3fac4a12b90ddfd92c311c51e70fae86bf7` |
| `noop_4w` | `run_summary.json` | `e8df144d500c08bb047974ec04f83fe8a91f95331461c0a8a83fe832a07df212` | `297d32b464cd05353b82c9e6ffda5162e5c3556fd80e063bcc5b3cec19bbb2dc` |

The byte-exhaustive before/after audit classified every changed JSON leaf. `apr1992_52w` has `272` notification-delivery leaf changes plus `1` truthful bot decision-source label; each four-week scenario has `18` notification-delivery leaf changes plus `1` truthful bot decision-source label. No response effect, event firing/choice, political control, combat, formation, casualty, displacement, operation, or other simulation result changed. Every other baseline artifact hash is unchanged.

A fresh no-refresh `npm.cmd run test:baselines` exited `0` with all scenarios matching, and `npm.cmd run canon:check` exited `0`. The refresh did not hide unexplained behavior; it froze the reviewed production-notification and attribution correction.

The inherited `tests/event_state_shape_validation.test.ts` schema-v37 fixture bug remains correctly routed to R5. R5 has repaired the fixture by adding the already-required empty `military.corps_front_sectors` and `military.sector_intel` fields without relaxing validation; that independently approved correction is pending integration and is not part of this R4 commit.

## Scope

Changed event evaluation/default/notification writers, the packaged foundational-decision writer, the existing HRHB Washington notification payload, focused tests, governance/report truth, and the six causally reviewed canonical manifest hashes above. No save schema, event order, once/cooldown rule, scenario source, package, Electron run, version, tag, installer, publication, release state, push, merge, or `docs/10_canon/FORAWWV.md` change occurred.
