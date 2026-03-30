# Claude CLI Agent Briefs

This folder exists to give Claude CLI a reusable taskforce layer on top of the repo's skills.

These are not replacements for `.claude/skills`.
They are short mission briefs that tell Claude how to combine skills into durable working roles.

## Default taskforce

For any non-trivial architecture or implementation task, use:

1. `self-correcting-implementer.md`
2. `authority-auditor.md`
3. `ui-truth-keeper.md`

For roadmap or planning changes, also use:

4. `roadmap-slotter.md`

For operations work, swap in or add:

5. `operations-reality-checker.md`

## Core rule

Every agent brief in this folder assumes the same owner-level standard:

- identify the canonical owner
- identify what becomes non-authoritative
- prefer narrower stricter systems over fake flexibility
- checkpoint work in short loops
- correct structural drift directly when found

## Suggested usage in Claude CLI

Tell Claude:

- "Use the agent brief in `.claude/agents/self-correcting-implementer.md`"
- "Pair it with `.claude/agents/authority-auditor.md`"
- "Add `.claude/agents/ui-truth-keeper.md` for player-facing truth"

For roadmap work:

- "Also use `.claude/agents/roadmap-slotter.md`"

For operations work:

- "Also use `.claude/agents/operations-reality-checker.md`"

## Expected outputs

A good Claude CLI run using these briefs should end with:

1. canonical owner
2. demoted or removed path
3. done means
4. UI/report truth
5. next roadmap slot
