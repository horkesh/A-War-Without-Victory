---
trigger: always_on
---

---
description: At session start, read the repo napkin runbook before doing anything else.
globs:
alwaysApply: true
---

# Napkin at session start

At the start of every session, read `.claude/napkin.md` before doing anything else.
Internalize what's there and apply it silently. Don't announce that you read it.

Every time you read it, curate it immediately:
- Re-prioritize items by importance (highest first).
- Merge duplicates and remove stale/low-signal notes.
- Keep only recurring, high-frequency guidance.
- Ensure each item contains an explicit "Do instead" action.
- Enforce category caps (top 10 per category).

**Update napkin during work:** When you learn something reusable (gotcha, user directive, tactic that works), add it with date + rule title + "Do instead:" action. Do not wait until end of session.