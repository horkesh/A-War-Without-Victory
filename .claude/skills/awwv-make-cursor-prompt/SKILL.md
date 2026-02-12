---
name: awwv-make-cursor-prompt
description: Generate a structured prompt for Cursor or subagents. Use when the user runs /awwv_make_cursor_prompt or asks for a prompt to guide an agent.
---

# /awwv_make_cursor_prompt

## Trigger
Generating a prompt for Cursor or subagents.

## Inputs
- Role, task, relevant files, constraints.

## Output
- A structured prompt with STOP AND ASK clauses.

## Determinism safeguards
- Include explicit determinism constraints and canon list.

## STOP AND ASK
- If canon scope is unclear.
