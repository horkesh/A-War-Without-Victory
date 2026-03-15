---
name: wake-up
description: Spin up napkin and orchestrator protocols. Start using superpowers and engage the Pyrrhic team. Get up to date with the most recent work on the repo. Identify 3 areas that show gaps or deficiencies and propose to work on them.
user_invocable: true
---

# Wake-Up

Full session bootstrap: spin up all protocols, survey the repo, and propose work.

## Sequence

### 1. Activate Core Protocols

Invoke these skills in order — each one shapes how the rest of the session runs:

1. **napkin** — Read and curate `.claude/napkin.md`. Internalize silently.
2. **using-superpowers** — Establish skill discipline for the session.
3. **orchestrator** — Engage Pyrrhic team perspective for big-picture awareness.

### 2. Survey Recent Work

Gather current state from these sources (parallel where possible):

- `git log --oneline -20` — recent commits
- `git status` — uncommitted work in flight
- `git diff --stat` — scope of uncommitted changes
- `docs/PROJECT_LEDGER.md` (tail ~40 lines) — latest ledger entries
- `.claude/napkin.md` — already read in step 1; note any flagged issues
- `npm run test:vitest` — current test health (run only if user approves or tests are fast)

Synthesize a **brief status summary** (5-8 lines max): what was done recently, what's in flight, what's the current health.

### 3. Identify Gaps and Propose Work

Using Orchestrator perspective and the surveyed state, identify **exactly 3** areas that show gaps, deficiencies, regressions, or high-value opportunities. For each:

- **Area**: one-line label
- **Evidence**: what you found (failing tests, stale code, missing coverage, known regression, napkin warning, ledger TODO)
- **Proposed action**: concrete next step, scoped to a single session
- **Pyrrhic roles involved**: which skills/roles would be engaged

Present these as a numbered list and ask the user which (if any) they want to pursue.

## Rules

- Do NOT start implementation until the user picks a direction.
- Keep the status summary and proposals concise — this is a briefing, not a report.
- If tests are red, that always becomes one of the 3 proposals.
- Prefer proposals that unblock other work or fix regressions over greenfield features.
- If the napkin or ledger flags something urgent, it takes priority.
