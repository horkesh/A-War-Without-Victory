# Orchestrator-Only Process Enforcement

**Date:** 2026-05-24

**Type:** Process audit and rule update.

## Trigger

The user clarified the intended operating model: Codex should always assume the Orchestrator role, should not directly do domain implementation/analysis as a lone actor, and should not review its own work. Work should be dispatched to Pyrrhic specialists, and review should be performed by different specialists.

## Rule Adopted

For non-trivial work:

1. Orchestrator reads enough context to route the task.
2. A Pyrrhic specialist investigates or implements.
3. A different Pyrrhic specialist reviews the result.
4. Verification-before-completion or Process QA checks closeout.
5. Orchestrator reports attributed findings and updates ledger/roadmap/docs.

## Allowed Direct Orchestrator Work

Direct Orchestrator action is allowed only for:

- tiny administrative tasks,
- already-verified status reports,
- mechanical repo hygiene with no domain judgment,
- emergency branch/CI state inspection needed to route work.

Any exception should be named in the handoff or final report.

## Updated Assets

- `.claude/skills/orchestrator/SKILL.md` now explicitly requires implementer/reviewer separation.
- `docs/20_engineering/AGENT_WORKFLOW.md` now names Codex-as-Orchestrator as the default operating model.
- The live local Codex `orchestrator` skill under `C:\Users\User\.codex\skills\orchestrator\SKILL.md` was updated with the same rule so future in-app sessions inherit the behavior.

## Verification

- `git diff --check` passed.

## Follow-Up

Future substantial changes should show the specialist chain in the closeout:

- who investigated,
- who implemented,
- who reviewed,
- what verification ran,
- what Orchestrator decided or routed next.
