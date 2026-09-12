# Skill discovery

Project skill semantics are maintained in `.claude/skills/<name>/SKILL.md`. The runtime catalog selects relevant guidance; [the project role map](../.claude/AGENT_TEAM_ROSTER.md) preserves domain ownership and mandatory consultation gates. Neither this index nor an old roster count proves what the host can invoke.

Derive names from files with the inventory command in [the skill README](../.claude/README.md). Read [the shared contract](../AGENTS.md) and only the [workflow](../docs/20_engineering/AGENT_WORKFLOW.md) sections relevant to the task. Do not load the full catalog at every startup.

Generic routing:

| Guidance | Use when |
|---|---|
| using-superpowers | Skill selection or discovery needs clarification, or explicitly requested |
| brainstorming | Material requirements or design tradeoffs remain unresolved |
| awwv-read-first | A reading guide is requested or subsystem ownership is unclear |
| writing-plans | A scoped plan is requested or authorized multi-step work needs a plan |
| executing-plans | Executing an authorized implementation plan through checks and closeout |
| prompt-construction | Preparing a bounded handoff or Cursor prompt |
| awwv-make-cursor-prompt | Compatibility entrypoint for the maintained prompt-construction template |
| verification-before-completion | Matching a completion claim to fresh, sufficient evidence |

This table does not waive operations, historical-source, realism/calibration, formation, UI, derived-data, canon-panel or determinism duties. A documentation typo does not trigger those domains; an actual behavior or canon change does.

The former March 2026 cut/hire inventory is retained in Git history as historical context. Skills were not removed by modernization, and no domain seats were consolidated.

See [skill-distribution.json](skill-distribution.json) for current locations, deliberate host differences and activation status. The importer previews explicit names and refuses overwrite by default; never bulk-synchronize repository and installed skills.
