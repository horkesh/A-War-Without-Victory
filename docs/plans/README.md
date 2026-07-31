# AWWV Plans Index

**Purpose:** compact entrypoint for active planning truth. This folder contains both current governing plans and historical execution packets; use this index before opening individual plan files.

## Active Governing Docs

| Need | Use |
|---|---|
| Current dispatch board, ownership, stop gates | [COMMAND_BOARD.md](COMMAND_BOARD.md) |
| Current roadmap lineage and supersessions | [MASTER_ROADMAP.md](MASTER_ROADMAP.md) |
| 1.0 go/no-go definition | [2026-06-08-v1.0-definition-of-done.md](2026-06-08-v1.0-definition-of-done.md) |
| Pyrrhic decision register | [2026-06-07-owner-decision-backlog.md](2026-06-07-owner-decision-backlog.md) |
| Execution-plan handoff standard | [PLAN_EXECUTION_STANDARD.md](PLAN_EXECUTION_STANDARD.md) |
| Operational/Tactical Group lifecycle and convergence closeout | [2026-07-31-operational-tactical-group-closeout-implementation-plan.md](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| RS 104-week Desk -> Decision -> Advance friction remediation | [2026-07-31-rs-104week-friction-remediation-plan.md](2026-07-31-rs-104week-friction-remediation-plan.md) |
| Post-D2 residuals and do-not-autobuild list | [POST_D2_RESIDUALS.md](POST_D2_RESIDUALS.md) |

## Current State

As of 2026-07-31, the GUI decision-access runway remains merged and seven subsequent RBiH/RS/HRHB Electron owner diaries have exercised 10 to 104 turns. Their confirmed bugs have been remediated locally and are indexed in [the D2 owner diary closeout](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md). The remaining 1.0 path is:

1. Execute the active RS 104-week friction and Operational/Tactical Group closeout lanes, then run a fresh owner validation diary.
2. D3 operator release gate.
3. D4 final docs/release sweep.
4. 1.0 tag.

The 2026-07-31 operational/tactical-group audit supersedes the old “Tactical Groups = fully done” shorthand. The donor-backed offensive TG core is live and well tested, but lifecycle/AHQ status, dissolution telemetry, legacy-path convergence, and promotion identity still require closeout. Phases 0–2 of the [execution plan](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) are ready now; behavior-moving exhaustion, promotion-history, and Standing-OG doctrine work remain explicitly gated. D2 evidence work may continue, but D3 must not treat the system as fully closed until the command-board lane is green or explicitly waived.

Historical execution packets in this folder are retained for traceability. Do not treat a dated plan as active unless the command board or this index points to it.

The [RS 52-week canon/player-experience plan](2026-07-13-rs-52w-canon-player-experience-plan.md) is complete for all agent-actionable local work, with current evidence in [../40_reports/playtests/20260714_rs_52w_canon_player_experience.md](../40_reports/playtests/20260714_rs_52w_canon_player_experience.md). Fresh v17 reached exact turn/max 52 with 468 screenshots in 59 manually inspected sheets, final HRHB/RBiH/RS `87/266/359`, zero runtime diagnostics/blockers, no unlocated active combat formations, and complete operation/map/command/archive route proof. The bound comparator attributes seven Electron-only player inputs as expected divergence and does not claim nondeterminism. Work remains local only; D2, content expansion, release operations, commits, pushes, PRs, and remote CI are not complete.

The owner-directed [RBiH 52-week remediation and replay plan](2026-07-11-rbih-52w-remediation-and-replay-plan.md) is complete for agent-actionable local work with current evidence in [../40_reports/playtests/20260712_rbih_52w_remediation_replay.md](../40_reports/playtests/20260712_rbih_52w_remediation_replay.md). Fresh `final-v47` reached exact turn/max 52 with 334 screenshots in 42 manually inspected sheets, zero runtime diagnostics/blockers, no unlocated active combat formations, and successful recruitment, Assisted autonomy, two Command Authority actions, exact counter/stack selection, explicit category-filter proof, and complete major-route coverage. The bound comparator attributes the Electron delta to 28 additional player inputs, not nondeterminism. D2 has not passed. Work remains local only: no staging, commits, pushes, PRs, packaging, or release artifacts.

2026-07-10 local RS first-20-turn review is closed as a diary/repair packet at [2026-07-10-first-20-turn-game-review-plan.md](2026-07-10-first-20-turn-game-review-plan.md) with playtest evidence in [../40_reports/playtests/20260710_rs_first20_local_qa.md](../40_reports/playtests/20260710_rs_first20_local_qa.md). The owner-promoted friction follow-up is also completed locally at [2026-07-10-first-20-turn-friction-resolution-plan.md](2026-07-10-first-20-turn-friction-resolution-plan.md): the v6 fast 20-turn RS proof reached turn 20 with zero console messages, zero flagged actions, and zero final paramilitary requests. Both packets remain local-only and do not authorize commits, pushes, packaging, or PRs.

The 2026-07-11 opening-turn and comparison-truth correction is completed locally at [2026-07-11-opening-turn-calibration-equivalence-plan.md](2026-07-11-opening-turn-calibration-equivalence-plan.md). It supersedes the cross-scenario `RS -3` interpretation, restores accepted operation timing before lifecycle advancement, and requires one fingerprinted startup plus ordered decision provenance for player/headless comparison artifacts. It does not reopen calibration or displace WP-9/D2 owner play.

## Archive Policy

- Active plans stay in `docs/plans/`.
- Superseded tracked plans move to `docs/_old/plans/superseded/` in batches after checking inbound links.
- Implemented execution packets move to `docs/_old/plans/implemented/` only after their closure is represented in the ledger or consolidated reports.
- Ignored local legacy doc folders are not tracked repo history; they may be quarantined under `F:/AWWV_REPO_HYGIENE_20260615/`.
