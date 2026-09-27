# Project skills and Claude entrypoints

[AGENTS.md](../AGENTS.md) is the shared contract. [CLAUDE.md](../CLAUDE.md) adds Claude-specific routing; consult the relevant section of [AGENT_WORKFLOW.md](../docs/20_engineering/AGENT_WORKFLOW.md) for execution details.

Project skill semantics are maintained in `skills/<name>/SKILL.md`. Use the runtime catalog to select relevant skills, then read their bodies and conditional references. The [role map](AGENT_TEAM_ROSTER.md) preserves domain consultation gates and distinct canon seats. It is a routing reference, not a mandatory startup read or a request to launch every role.

Derive the available names from the actual files instead of trusting a roster count:

```powershell
Get-ChildItem -LiteralPath .claude/skills -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } |
    Select-Object -ExpandProperty Name
```

Supporting files remain beside each skill. [Agent briefs](agents/) and [commands](commands/) compose roles; they do not add runtime tool enum values. Use only the agent tools and model identifiers exposed by the current host.

`settings.json` registers Claude hooks. Git-hook coverage depends on the configured `core.hooksPath`; inspect `git config --show-origin --get core.hooksPath` and the [Git-hook documentation](../.githooks/README.md). Source presence alone proves neither activation nor Codex/Cursor parity. The modernization does not change hook enforcement.

The [distribution manifest](../.agent/skill-distribution.json) records source ownership and staged host adapters. Existing locations stay in place. Same-name skills are not a merge mechanism; do not expose a second copy without checking the actual runtime catalog and the installed version.

The [legacy importer](../tools/install_superpowers.ps1) now previews one explicit name. Keep the review receipt outside both trees, inspect its `.diff`, then repeat the same command with `-Apply`. An existing skill is refused by default. Intentional replacement requires `-Replace` on preview and apply, plus a fresh `-BackupRoot` on apply; source/destination drift invalidates the preview. Reconcile host-specific differences first. Never run a bulk copy over the project or installed skill tree.

```powershell
# Example only: supply reviewed source/destination and a disposable receipt path.
./tools/install_superpowers.ps1 -Name example -SourceRoot <source> -DestinationRoot <destination> -ReviewPath <receipt.json>
```

Governed work retains [roadmap governance](../docs/20_engineering/ROADMAP_GOVERNANCE.md), [command authority gates](../docs/20_engineering/COMMAND_AUTHORITY_GATES.md), and the [existing task governance artifact](../docs/30_planning/_task_artifacts/ACTIVE_TASK_GOVERNANCE.md). Use focused checks for documentation/process changes; preserve checks required by affected production behavior.
