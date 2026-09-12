---
name: using-superpowers
description: Use when skill discovery or workflow selection is unclear, or the user explicitly requests this skill.
---

# Using Skills

Use this meta-skill when the catalog does not make the relevant workflow clear or when the user requests it explicitly. Ordinary tasks can select a clearly described domain skill directly without loading this meta-skill.

Use skills that materially improve the current task. An explicit user request for a named skill routes to it. Otherwise, select by the frontmatter trigger and read the full skill before applying it.

Prefer the smallest set that covers the work. Domain and safety rules still apply when triggered; generic process skills do not activate merely because they could be tangentially relevant.

Follow the user's authorized scope and `docs/20_engineering/AGENT_WORKFLOW.md`. If multiple skills conflict, preserve the more specific repository/canon authority and report a conflict only when it changes scope, authority, acceptance criteria, or safety.
