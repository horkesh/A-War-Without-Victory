Prepare a roadmap patch without drifting into AI theater or milestone confusion.

## Required reading

1. `docs/plans/MASTER_ROADMAP.md`
2. `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`
3. `docs/20_engineering/ROADMAP_GOVERNANCE.md`
4. `docs/20_engineering/COMMAND_AUTHORITY_GATES.md`
5. `.claude/agents/roadmap-slotter.md`
6. `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md`

## Required output before any roadmap edit

Write these sections first:

1. Exact milestone changes
2. Exact renumbering
3. Items moved between milestones
4. Why each move is required
5. Sequencing risks avoided
6. What must not be started before operations and authority cleanup are complete

## Hard rules

- Do not create a parallel roadmap-analysis master doc.
- Do not move cleanup work into later AI milestones just because it sounds more advanced there.
- Do not let UI polish outrun backend authority.
- Do not place commander personality or LLM-expression work before operations are singular and authoritative.

## Edit rule

Only after the required output is complete may `MASTER_ROADMAP.md` be edited.

Also update `docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md` so the roadmap rationale is durable and reviewable.

## Closing block

End with:

- canonical owner affected by this roadmap change
- cleanup band affected
- commander/ops gate status
- next 3 implementation actions unlocked
