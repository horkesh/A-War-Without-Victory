# Pyrrhic role discovery for Cursor

The maintained [role map](../.claude/AGENT_TEAM_ROSTER.md) and [shared contract](../AGENTS.md) apply to this repository. Read the relevant role's `.claude/skills/<name>/SKILL.md`; do not infer a missing `.cursor/skills` or `.cursor/agents` tree from old inventories.

Use [task-type guidance](TASK_SUBAGENT_TYPES.md) to map role instructions to the tools actually exposed by the current Cursor runtime. A role name is not a tool enum. The lead may integrate evidence. Nontrivial implementation defaults to an implementer and a separate reviewer; small reversible administrative work can be handled directly. Domain consultation means applying the relevant skill and qualified review lens, not automatically creating another worker. Required canon panels and explicitly mandated review seats remain distinct; operations, history, calibration, formations, UI and derived-data consultation duties remain in force.

The March 2026 cut/hire lists in repository history are historical inventories, not current capability or authority decisions. In particular, neither a renamed role nor an old duplicate label retires a canon reviewer. Derive available skills with the command in [the skill README](../.claude/README.md); model selection follows the host's supported options and the adopted cost policy, without translating OpenAI model IDs into unsupported settings.

Hook execution is host-specific. See [shared workflow](../docs/20_engineering/AGENT_WORKFLOW.md); no Codex/Cursor hook parity is asserted.
