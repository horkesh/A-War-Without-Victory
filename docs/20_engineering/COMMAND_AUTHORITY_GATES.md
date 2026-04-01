# Command Authority Gates

This file exists to stop the project from building beautiful but structurally dishonest command systems.

## Core principle

For any meaningful command system, one and only one system should own the decision.

The project should optimize for:

- singular ownership
- explicit boundaries
- visible demotion of legacy paths
- testable proof that cleanup is real

The project should avoid:

- overlapping decision writers
- compatibility layers that still mutate live truth
- UI surfaces implying a cleaner reality than the engine actually has
- fake flexibility through extra flags, extra types, or extra bypasses

## Required questions for any non-trivial command change

Before implementation is considered complete, the implementer must answer:

1. What is the canonical owner after the change?
2. What old path is removed, demoted, or declared non-authoritative?
3. What is the surviving decision boundary?
4. What downstream layer is execution-only?
5. What test, report, or visible behavior proves the change is real?
6. What UI or report surface reflects that truth?

If those six answers do not exist, the task is not done.

## Operations gate

Operations are the first command object that must become fully real.

Do not treat operations as "good enough" unless all of the following are true:

1. one canonical operation object exists
2. one canonical lifecycle exists
3. one canonical creation / launch / update path exists
4. UI surfaces are clearly views of the same operation truth
5. old catalogs, bypasses, or parallel operation worlds are retired or explicitly non-authoritative

If those are not true, do not begin commander personality expansion or LLM-flavored command work.

## Commander maturity gate

Do not call the commander "more intelligent" unless the work improves at least one of:

- memory
- competing options
- explicit tradeoffs
- belief state
- explanation traces

Flavor alone does not count.
Personality alone does not count.
More parameters alone do not count.

## Comment standard

High-value comments in this repo should mostly explain:

- what owns this
- what is legacy
- what is canonical
- what this layer must not also decide

Player-facing work should also explain when relevant:

- whether this surface is player-safe, staff abstraction, or debug-only
- which canonical UI surface owns the concept

Avoid comment spam.
Prefer boundary comments over narration comments.

## Review question

For every command-related change, ask:

**Did we make ownership clearer and narrower, or did we just make the system look more flexible?**
