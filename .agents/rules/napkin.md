---
trigger: always_on
---

---
description: At session start, read the repo napkin before doing anything else.
globs: 
alwaysApply: true
---

# Napkin at session start

At the start of every session, read `.agent/napkin.md` before doing anything else.

- Apply its corrections, preferences, and patterns silently.
- **Update napkin during work:** After each significant change, fix, or discovery, add to Corrections, Patterns That Work, Patterns That Don't Work, or Domain Notes. Do not wait until end of session.