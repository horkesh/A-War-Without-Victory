---
name: deterministic-script-implementation
description: Enforces deterministic behavior in scripts that affect simulation outputs. Use when implementing or modifying scripts, data pipelines, or tooling that can change simulation results, ordering, or persisted outputs.
---

# Deterministic Script Implementation

## When to use
Use for any script changes that can affect simulation outputs, ordering, or persisted artifacts.

## Instructions
1. Read determinism docs and relevant phase specs before editing.
2. Identify every traversal and aggregation; list ordering dependencies.
3. Enforce stable ordering for all iteration paths (explicit sort, deterministic traversal).
4. Remove or avoid timestamps, randomness, and system time.
5. Add or update determinism tests when outputs or ordering can change.
6. Append an entry to `docs/PROJECT_LEDGER.md` if behavior or outputs change; if the change documents a deterministic pattern or lesson, update `docs/PROJECT_LEDGER_KNOWLEDGE.md` per `docs/10_canon/context.md` §1.

## Must never
- Add nondeterministic behavior.
- Assume ordering from object keys, map/set iteration, or filesystem traversal.

## Examples
**Example 1 (ordering fix):**
When iterating over IDs from an object, sort the keys before processing to ensure stable outputs.

**Example 2 (time removal):**
If a script writes metadata, avoid `Date.now()` and system time; use a fixed or input-provided value if needed.
