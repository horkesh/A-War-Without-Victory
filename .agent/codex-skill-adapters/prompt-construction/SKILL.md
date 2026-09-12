---
name: prompt-construction
description: Use when drafting a task prompt, agent handoff, or instructions for another coding environment.
---

# Prompt Construction

Write a compact handoff with the concrete outcome, exact files and established evidence, governing sources, applicable boundaries, authorization and non-goals, checks and pass criteria, stopping rule, done condition, and requested output. Use only role, model, and tool names supported by the target runtime. Ask for intervention only when a real authority, acceptance, safety, or scope decision remains.

## AWWV project source

In an AWWV checkout, read `.claude/skills/prompt-construction/SKILL.md` there as the maintained project template, plus repository `AGENTS.md` and relevant Codex runtime instructions. Carry AWWV canon, determinism, data/control/save, history, provenance, and cost boundaries only when triggered by the task.

Outside AWWV, use the generic template above and the target project's own authorities; do not copy AWWV-relative references into unrelated prompts.
