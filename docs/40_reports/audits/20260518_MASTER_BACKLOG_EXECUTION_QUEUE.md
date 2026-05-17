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

## Next Implementable Batches

| Batch | Candidate lanes | Notes |
|---|---|---|
| Batch 3 design/data cleanup | Morale-resist-floor documentation/data decision, ceasefire/Washington threshold drift check | Keep canon/doc decisions separate from behavior changes unless evidence requires data promotion. |
| Batch 3 product/UI | Chronicle hybrid chapter implementation, telemetry local-first implementation, primary Army/Corps quick-select cleanup | `App.tsx` is available again after Batch 1 integration; keep UI-only lanes disjoint. |
| Batch 3 diagnostics/perf | Wall-clock performance follow-up, strict-null Phase 2 | Tooling/quality lanes can proceed in parallel with product/UI. |
| Batch 4 notifications/content | Phase C two-level event surfacing, Phase D notification content backfill | Phase C is implementable behind flag; Phase D content still needs historian/narrative review before broad copy lands. |
| Batch 4 launch/operator support | Gold gate/launch-day automation, clean-VM evidence templates, external playtest artifact dry-run support | Operator-only validation remains outside autonomous repo execution; repo can improve scripts/templates. |

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
