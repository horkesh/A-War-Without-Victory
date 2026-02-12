---
name: prompt-construction
description: Constructs structured prompts for Cursor usage or subagents. Use when drafting task prompts, agent instructions, or when the user asks for a "prompt" to guide Cursor or a subagent.
---

# Cursor Prompt Construction

## When to use
- Drafting prompts for Cursor usage or subagents.
- The user asks for a prompt template or structured agent instructions.

## Instructions
Follow these steps in order:
1. **State role and objective in one sentence.**
2. **List canonical references required.**
3. **Specify determinism and ledger constraints.**
4. **Define STOP AND ASK triggers.**
5. **Define output format and validation steps.**

## Required sections
Use this exact order:
1. Role and objective
2. Canon references
3. Determinism and ledger constraints
4. STOP AND ASK triggers
5. Output format and validation

## Canon references
If the task affects gameplay logic, state, outputs, or rules, require reading:
- Canon specs (phase specs, invariants, rulebook, ADRs as applicable)
- Existing tests and state schema files relevant to the change

If canon conflicts are discovered, STOP AND ASK with conflict list.

## Determinism and ledger constraints
Always include:
- No timestamps, randomness, or nondeterministic iteration
- Stable ordering for any sets, maps, aggregates, or persisted outputs
- Append entry to `docs/PROJECT_LEDGER.md` (changelog) for behavior/output/scenario changes; when the change carries reusable knowledge (pattern, decision, lesson), add or update `docs/PROJECT_LEDGER_KNOWLEDGE.md` per `docs/10_canon/context.md` §1

## STOP AND ASK triggers
Include these triggers verbatim:
- Canon conflicts or canon silence on required decision
- Determinism or stable ordering cannot be guaranteed
- Ledger update requirement is unclear
- Scope expands beyond prompt objective

## Output format and validation
Define:
- Output structure (bullets, sections, or template)
- Validation steps (tests to run, files to check, or invariants to verify)

## Must never
- Omit canon references for gameplay changes.
- Allow nondeterministic shortcuts.

## Examples

### Example: subagent prompt
**Role and objective:** You are a code review agent; verify Phase I control flip logic against canon and tests.

**Canon references:** Phase I spec, invariants, `docs/PROJECT_LEDGER.md`, relevant state schema and tests.

**Determinism and ledger constraints:** No nondeterministic iteration; stable ordering for outputs; update `docs/PROJECT_LEDGER.md` if behavior/output changes.

**STOP AND ASK triggers:** Canon conflicts or silence; determinism risks; ledger requirement unclear; scope expands.

**Output format and validation:** Provide findings ordered by severity, cite files; propose tests to run and confirm invariants.

### Example: Cursor task prompt
**Role and objective:** You are a tooling agent; draft a prompt for a phase simulation change with deterministic constraints.

**Canon references:** Phase spec, invariants, any ADRs touching the change, affected tests.

**Determinism and ledger constraints:** No timestamps or randomness; stable ordering required; ledger entry required for behavior/output changes.

**STOP AND ASK triggers:** Canon conflicts or silence; nondeterminism risk; ledger requirement unclear; scope expansion.

**Output format and validation:** Output a numbered checklist and required validation steps; include tests to run.
