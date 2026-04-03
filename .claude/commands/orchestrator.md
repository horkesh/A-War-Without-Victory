Run this task in dispatch-first orchestrator mode.

## Purpose

Use this command when the work needs:

- strategic priority
- cross-role coordination
- synthesis across multiple investigations
- roadmap / architecture / product direction
- review of another Claude's work at owner level

This command is for **dispatch and synthesis**, not solo freelancing.

## Read first

1. `.claude/AGENT_TEAM_ROSTER.md`
2. `.claude/agents/README.md`
3. `docs/20_engineering/CLAUDE_EXECUTION_STANDARD.md`
4. `docs/20_engineering/ROADMAP_GOVERNANCE.md` when sequencing or milestone fit matters
5. `docs/20_engineering/FEATURE_DONE_MEANS.md`
6. `.claude/napkin.md`
7. `docs/PROJECT_LEDGER.md`
8. `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## Core rule

If the task touches 2+ domains, dispatch specialists before synthesizing.

Examples:

- engine + UI
- sectors + scenario outcomes
- roadmap + architecture
- player-truth + shell ownership

Do not investigate those alone unless:

- the issue is tiny
- the evidence is already complete
- or the real work is only integration

## Required dispatch pattern

For non-trivial work, pick:

1. one domain investigator per major problem area
2. one critic / blindspot role
3. one product or architecture role when sequencing matters

Preferred blindspot role:

- `gap-finder` if available

Fallbacks:

- `architect`
- `technical-architect`
- `product-manager`

## Default dispatch matrix

### Engine / combat / sectors / ops

- `systems-programmer`
- `gameplay-programmer`
- `scenario-creator-runner-tester`
- add `historian`, `war-or-game`, `formation-expert`, or `operations-expert` as needed

### UI / UX / shell / player-truth

- `ui-ux-developer`
- `architect`
- `technical-architect`
- add `modern-wargame-expert` or `canon-compliance-reviewer` as needed

### Roadmap / plans / sequencing

- `product-manager`
- `technical-architect`
- add `documentation-specialist` or `reports-custodian` as needed

## Required output modes

Choose one of these and make it explicit:

1. `Dispatch Plan`
2. `Findings Synthesis`
3. `Single Priority Decision`
4. `Execution Handoff`
5. `Review Verdict`

## Required structure

For every serious synthesis or handoff, include:

- strongest findings
- what is superficial or deferred
- single next priority
- owner / handoff

And end with:

```md
Canonical owner:
Demoted path:
Player-visible truth:
Canonical UI surface:
Done means:
```

## Anti-patterns

Do not:

- narrate instead of dispatching
- collapse disagreements into mush
- label future features as P0 substrate faults
- bless work without root cause, tests, or owner clarity
- let the orchestrator become the default investigator for everything

## Closing

When done, state:

1. what the team found
2. what the winning interpretation is
3. what happens next
4. what should explicitly wait
