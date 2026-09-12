# Task tools and project roles

Inspect the task/subagent tool exposed by the current Cursor runtime before dispatch. This document cannot add values to its enum. If a named role is unavailable, use an exposed general-purpose worker with a bounded role brief; preserve separate contexts when a panel requires distinct seats.

Verified project instruction paths, relative to the repository root:

| Role | Guidance |
|---|---|
| formation-expert | [.claude/skills/formation-expert/SKILL.md](../.claude/skills/formation-expert/SKILL.md) |
| scenario-creator-runner-tester | [.claude/skills/scenario-creator-runner-tester/SKILL.md](../.claude/skills/scenario-creator-runner-tester/SKILL.md) |
| historian | [.claude/skills/historian/SKILL.md](../.claude/skills/historian/SKILL.md) |

Do not combine required panel seats to fit an enum. For historical questions, retain the Historian and Balkan Battlegrounds source requirements. For scenario interpretation, retain domain, determinism and provenance gates. Use the [role map](../.claude/AGENT_TEAM_ROSTER.md) for other domain duties and [shared workflow](../docs/20_engineering/AGENT_WORKFLOW.md) for cost, review and authorization rules.

Earlier requests to add `mcp_task` enum values are historical. No missing `.cursor/agents` or `.cursor/skills` path is an available capability.
