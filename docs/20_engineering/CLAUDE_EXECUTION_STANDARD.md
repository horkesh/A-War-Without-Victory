# Claude Execution Standard

This is Claude's short operational entrypoint. The shared authority, reading, review, validation, failure, and closeout rules live in [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md).

## Claude-specific use

- Use `.claude/skills/` and `.claude/agents/` as the repo-shipped role and handoff layer.
- Use the host's available Task tooling and supported model settings; do not translate Codex model names or collaboration APIs into Claude configuration.
- `.claude/settings.json` hooks apply only to Claude sessions that load them. They currently check scenario-related specialist attribution/routing; they do not prove equivalent enforcement in Codex or Cursor.
- Keep those hooks and their blocking sets unchanged unless a separately authorized hook task owns them.

## Working standard

For cross-domain work, frame the question and dispatch only the specialists needed. The lead remains responsible for evidence, synthesis, integration, scope, and owner decisions. Keep implementer and reviewer separate; preserve mandatory canon seats.

Use the task-to-document map in `AGENT_WORKFLOW.md`. The napkin is an index: read the index, then only the topic files relevant to the task. Current roadmap, ledger, GUI, calibration, release, and local-executor detail remain in their maintained authorities rather than being duplicated here.

For authorized implementation, continue through applicable checks, targeted correction, documentation, and independent review where required. Small reversible administrative work may be handled directly. Stop for a change in authority, acceptance criteria, or costly scope, or for a consolidated blocker that project evidence cannot resolve.

## Evidence

Run checks proportionate to changed behavior. Documentation/process-only work uses focused documentation checks. Production, deterministic, calibration, 188-week, package, save-preservation, provenance, and canon gates remain mandatory when their trigger applies.

Use `tools/local_executor/README.md` for the local planner/executor workflow and measured routing rules. The local executor proposes text; Claude owns repository writes and the acceptance oracle.

## Long-running work

For a long Claude-hosted command, use background execution and a `Monitor` so completion or failure wakes the session; do not end a turn merely to narrate waiting. Arm selectors for both success and failure signatures because silence cannot distinguish a running job from a crash. Do useful independent work while it runs.

Judge the result from the command's actual exit status, not a background wrapper, partial log, or happy-path phrase. Capture the command status before piping when necessary and retain the log used for the verdict.
