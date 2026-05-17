# Master Roadmap and Backlog Execution Queue

**Date:** 2026-05-18
**Scope:** Parent-side execution queue for the user request to continue implementing the live `MASTER_ROADMAP.md` and `CONSOLIDATED_BACKLOG.md` backlog without stopping for manual prioritization.

## Active Batch 1

| Lane | Status | Owner | Source |
|---|---|---|---|
| Player-faction contract and Codex/event surfacing Phase A/B/B+ | Implemented | Halley | Report: `docs/40_reports/implemented/20260518_player_faction_contract_and_codex_visibility.md`; Phase C/D remain queued. |
| VRS Corridor 92 + ARBiH zero-attack operation stalls | Implemented/diagnosed | Hegel | Report: `docs/40_reports/implemented/20260518_OPERATION_STALL_BACKLOG_LANE.md`; 40w n1872 hash `42607f83870e01d5`. |
| Elite-loan recall/tracker + pressure-system cleanup | Verified stale/already closed | Dalton | `tests/elite_loan_recall.test.ts` and `tests/pressure_system.test.ts` passed; backlog rows reconciled. |

## Completed Batch 2

| Lane | Status | Owner | Source |
|---|---|---|---|
| Catastrophic attack stall guard | Implemented | Wegener | Report: `docs/40_reports/implemented/20260518_CATASTROPHIC_ATTACK_STALL_GUARD.md`; 40w n1873 hash `42607f83870e01d5`. |
| HRHB cohesion floor + 65th Protection Regiment tagging | Verified stale/already correct | Carson | Report: `docs/40_reports/implemented/20260518_HRHB_COHESION_65TH_TAGGING_VERIFICATION.md`. |
| SettingsScreen shell cleanup | Implemented | Singer | Report: `docs/40_reports/implemented/20260518_SETTINGS_SCREEN_SHELL_CLEANUP.md`. |
| Phase pipeline silent-skip diagnostics | Implemented | Godel | Report: `docs/40_reports/implemented/20260518_PHASE_PIPELINE_SKIP_DIAGNOSTICS.md`. |

## Completed Batch 3

| Lane | Status | Source |
|---|---|---|
| Morale floor + exhaustion/Washington drift audit | Verified / follow-up identified | `docs/40_reports/audits/20260518_BATCH3_MORALE_AND_EXHAUSTION_DRIFT_AUDIT.md` |
| Chronicle hybrid chapters | Implemented | `docs/40_reports/implemented/20260518_CHRONICLE_HYBRID_CHAPTERS.md` |
| Telemetry local-first crash diagnostics | Implemented | `docs/40_reports/implemented/20260518_TELEMETRY_LOCAL_FIRST_CRASH_DIAGNOSTICS.md` |
| Primary Army / Corps quick-select cleanup | Implemented | `docs/40_reports/implemented/20260518_PRIMARY_COMMAND_QUICK_SELECT_CLEANUP.md` |
| Wall-clock target-truth report | Implemented | `docs/40_reports/implemented/20260518_PERFORMANCE_WALL_CLOCK_TARGET_TRUTH_REPORT.md` |
| IVP breakdown modal stale row | Verified closed | `docs/40_reports/implemented/20260518_IVP_BREAKDOWN_MODAL_STALE_ROW_VERIFICATION.md` |
| Two-level event surfacing Phase C | Implemented behind flag | `docs/40_reports/implemented/20260518_TWO_LEVEL_EVENT_SURFACING_PHASE_C.md`; default 40w n1875 hash `42607f83870e01d5`. |

## Completed Batch 4

| Lane | Status | Source |
|---|---|---|
| Strict-null Phase 2 combat leaf slice | Partial implemented | `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`; integrated 40w n1878 stayed hash-stable at `42607f83870e01d5`. |
| Notification dismiss command path + first Phase D content backfill | Implemented / content partial | `docs/40_reports/EVENT_NOTIFICATION_BACKFILL.md`; dismissal tests and notification projection tests pass. |
| Washington live-state vs narrative milestone reconciliation | Implemented | `docs/40_reports/audits/20260518_WASHINGTON_TIMING_RECONCILIATION.md`; live predicate AAR now uses `rbih_hrhb_framework_activated`, while `washington_agreement_1994` remains the week-102 calendar event. |
| Gold/operator templates, clean-VM evidence templates, external playtest dry-run artifacts | Repo-side implemented | `tools/release/prepare_launch_artifacts.cjs`, `docs/50_launch/release/launch_day_automation_template.md`, `docs/40_reports/release/20260518_CLEAN_VM_OPERATOR_EVIDENCE_TEMPLATE.md`, `docs/40_reports/playtest/20260518_EXTERNAL_PLAYTEST_ARTIFACT_DRY_RUN_TEMPLATE.md`. |

## Next Implementable Batches

| Batch | Candidate lanes | Notes |
|---|---|---|
| Batch 5 strictness | Continue strict-null Phase 2 beyond the cleaned combat leaf slice | Must remain type-only and 40w hash-stable. |
| Batch 5 notifications/content | Continue Phase D notification content backfill | Remaining sensitive-history and late-war diplomacy rows still need historian/narrative review; sparse coverage remains tolerated until backfill closes. |
| Batch 5 operator evidence | Execute clean-VM and external playtest evidence outside the repo when an operator has target machines/artifacts | Repo now has templates/scripts; actual SmartScreen, Settings -> Apps, `%APPDATA%`, uninstaller registry, outreach, and response triage remain operator-only. |

## Stale Or Already Closed Rows To Reconcile

| Row | Current evidence | Required parent action |
|---|---|---|
| Brigade dissolution threshold | `docs/40_reports/implemented/20260517_BRIGADE_DISSOLUTION_THRESHOLD.md` exists | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| RBiH-HRHB Phases B/C | Implemented reports exist, but older backlog prose still said Phases B/C not started | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| B3 negotiation counter-offers | Implemented report exists, but old Phase 7 themed prose still said B3 not started | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| Paramilitary flavor/consequences | Implemented report exists, but older prose still said consequence scaling/UI/named units remain | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| RBiH supply constraint | Implemented report exists, but n292 table still showed open | Reconciled in `CONSOLIDATED_BACKLOG.md`. |
| Elite-loan recall/tracker and pressure-system cleanup | Current code/tests prove rows are already closed or stale | Reconciled in `CONSOLIDATED_BACKLOG.md`; durable lesson added to `PROJECT_LEDGER_KNOWLEDGE.md`. |

## Operator Or Design-Gated Work

| Lane | Reason not autonomous code-only |
|---|---|
| Clean-VM cosmetic finalization | Requires actual Windows VM evidence for SmartScreen, Settings -> Apps, `%APPDATA%`, and uninstaller registry behavior. Repo can add templates/scripts only. |
| External playtest outreach and weekly digest | Requires operator outreach, form deployment, and incoming-response triage. Repo can maintain templates and manifests. |
| Warroom single-image art pipeline / asset commissioning | Requires visual asset generation/selection and likely user taste gate. |
| Phase D notification content backfill | Requires historian/narrative review for per-recipient event copy before shipping all authored blocks. |

## Batch 1 Done Means

- Agent changes land on disk and are parent-verified, not accepted from summaries alone.
- Focused tests and `npm.cmd run typecheck` pass, or failures are isolated to documented pre-existing/operator-only conditions.
- Scenario-affecting changes record 40w hash/anchor/benchmark evidence.
- `MASTER_ROADMAP.md`, `CONSOLIDATED_BACKLOG.md`, `PROJECT_LEDGER.md`, `PROJECT_LEDGER_KNOWLEDGE.md`, and `.claude/napkin.md` are updated before commit.
