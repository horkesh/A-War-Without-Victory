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
| Post-D2 residuals and do-not-autobuild list | [POST_D2_RESIDUALS.md](POST_D2_RESIDUALS.md) |

## Current State

As of 2026-06-16, the technical road to 1.0 is closed. The remaining 1.0 path is:

1. D2 owner full-campaign playthrough.
2. D3 operator release gate.
3. D4 final docs/release sweep.
4. 1.0 tag.

Historical execution packets in this folder are retained for traceability. Do not treat a dated plan as active unless the command board or this index points to it.

The active pre-D2 quality lane is player-polish only: `qa:player-journeys`, first-hour choreography, warroom/Army HQ/map legibility, and live browser checks. These guard the owner playthrough but do not reopen calibration or system-roadmap work.

## Archive Policy

- Active plans stay in `docs/plans/`.
- Superseded tracked plans move to `docs/_old/plans/superseded/` in batches after checking inbound links.
- Implemented execution packets move to `docs/_old/plans/implemented/` only after their closure is represented in the ledger or consolidated reports.
- Ignored local legacy doc folders are not tracked repo history; they may be quarantined under `F:/AWWV_REPO_HYGIENE_20260615/`.
