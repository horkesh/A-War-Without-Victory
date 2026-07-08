---
name: napkin
description: |
  Maintain a per-repo napkin as a continuously curated runbook index, not a
  session log. Activates EVERY session. Read and curate the bounded index
  before work, then open topic archives only when relevant. Keep recurring
  high-value guidance, organize by priority-sorted categories, and cap each
  category at top 10 items. The index lives at `.claude/napkin.md`; archives
  live under `.claude/napkin/`.
author: Codex
version: 7.0.0
date: 2026-07-08
---

# Napkin

You maintain a per-repo markdown runbook index, not a chronological log. The
napkin must be continuously curated for fast reuse in future sessions.

**This skill is always active. Every session. No trigger required.**

## Session Start: Read And Curate

First thing, every session: read `.claude/napkin.md` before doing anything
else. Treat it as the bounded index of current rules. Internalize what's there
and apply it silently. Do not announce that you read it. Open topic archives
under `.claude/napkin/` only when the index points to one relevant to the task.

Every time you read the index, curate it immediately:

- Re-prioritize items by importance.
- Merge duplicates and remove stale or low-signal notes.
- Keep only recurring, high-frequency guidance.
- Ensure each item contains an explicit "Do instead" action.
- Enforce category caps: maximum 10 entries per category.
- Enforce the index budget: `.claude/napkin.md` should stay at or below 400
  lines.
- Adding an index entry requires evicting or demoting another entry from that
  category to a topic archive.

If no napkin exists yet, create one at `.claude/napkin.md`:

```markdown
# Napkin Runbook Index

## Curation Rules
- Read this index every session; read topic archives only on demand.
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category; max 400 lines in this index.
- Adding an index entry evicts or demotes another entry.
- Topic archives live under `.claude/napkin/`.

## Execution & Validation
1. **[YYYY-MM-DD] Short rule**
   Do instead: concrete repeatable action.

## Shell & Command Reliability
1. **[YYYY-MM-DD] Short rule**
   Do instead: concrete repeatable action.

## Domain Behavior Guardrails
1. **[YYYY-MM-DD] Short rule**
   Do instead: concrete repeatable action.

## User Directives
1. **[YYYY-MM-DD] Directive**
   Do instead: exactly follow this preference.
```

Adapt categories to the repo, but keep category structure and priority
ordering. Do not use raw journal-style entries.

## Topic Archives

Use `.claude/napkin/` for detail that is useful but too verbose for the index.
The index must contain a pointer to each topic archive. Read a topic archive
only when it is relevant to the current task.

## Continuous Runbook Updates

Update during work whenever you learn something reusable.

What qualifies for inclusion:

- Frequent gotchas or surprising behavior in this repo/toolchain.
- User directives that affect repeated behavior.
- Non-obvious tactics that repeatedly work.

What does not qualify:

- One-off timeline notes.
- Verbose postmortems without reusable action.
- Pure mistake logs without "Do instead" guidance.

Index entry requirements:

- Include date added (`[YYYY-MM-DD]`).
- Include a short rule title.
- Include an explicit `Do instead:` line.
- Keep wording concise and action-oriented.
- If detail does not fit the bounded index, place it in a topic archive and
  point to that archive from the index.

## Category And Priority Policy

- Organize notes by category.
- Keep each category sorted by importance descending.
- Re-evaluate category choice and priority whenever editing.
- Maximum 10 items per category.
- Maximum 400 lines in `.claude/napkin.md`.
- Move detail to `.claude/napkin/*`.
- Prefer fewer high-signal items over broad coverage.

## Practical Rule

Think of the napkin as a live knowledge index for future execution speed and
reliability, not a history file.
