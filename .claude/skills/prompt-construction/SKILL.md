---
name: prompt-construction
description: Use when drafting a task prompt, Cursor instruction, or agent handoff.
---

# Prompt Construction

This is the maintained prompt template. Compatibility entrypoints should point here rather than duplicate it.

Write a compact handoff containing:

1. role and concrete outcome
2. exact files/surfaces and evidence already established
3. governing sources and applicable canon/determinism/data/save/history boundaries
4. authorization, non-goals, and actions that still require owner approval
5. required checks, pass criteria, evidence paths, and expensive-run stopping rule
6. done condition and requested output

Add STOP/ASK conditions only for a real decision: conflicting or silent authority, inability to preserve determinism or protected boundaries, changed acceptance criteria, destructive/external action without authority, or scope expansion. Routine reversible implementation choices should be resolved from project evidence.

Use role and tool names supported by the target runtime. Do not embed host-specific model names or APIs in a cross-host prompt.
