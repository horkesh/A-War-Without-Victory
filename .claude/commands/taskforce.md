Run this task in owner-safe taskforce mode.

## Operating pattern

1. Read `.claude/AGENT_TEAM_ROSTER.md`.
2. Read `.claude/agents/README.md`.
3. Read `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`.
4. Read `docs/20_engineering/ROADMAP_GOVERNANCE.md` when roadmap, planning, or milestone slotting is involved.
5. Pick the smallest useful taskforce:
   - `self-correcting-implementer.md`
   - `authority-auditor.md`
   - `ui-truth-keeper.md`
6. Add `operations-reality-checker.md` for operations work.
7. Add `roadmap-slotter.md` for roadmap/planning work.
8. Update `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md` before major edits.

## Required structure before doing work

State:

- canonical owner after the change
- demoted or removed path
- done means
- UI/report truth
- roadmap slot
- sequencing risk if mis-slotted
- active governance artifact updated

## Loop discipline

Work in short loops:

1. inspect
2. change
3. verify
4. checkpoint

Do not do long silent runs without a checkpoint.

## Enforcement

Before commit or handoff, run:

`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/repo/check_claude_governance.ps1`

If governed files changed and the governance artifact is incomplete, the task is not ready.
