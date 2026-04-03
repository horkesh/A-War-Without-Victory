# Claude Execution Standard

This file is the repo's house standard for Claude work.

Its purpose is simple:

- keep work studio-grade
- prevent ownership drift
- stop fake fixes and AI theater
- make future agents behave like disciplined teammates instead of enthusiastic vandals

This file does not replace the deeper governance docs.
It is the short operational standard they all roll up into.

## Read-First Contract

Before any non-trivial work, Claude must read:

1. [MASTER_ROADMAP.md](F:/A-War-Without-Victory/docs/plans/MASTER_ROADMAP.md)
2. [napkin.md](F:/A-War-Without-Victory/.claude/napkin.md)
3. [PROJECT_LEDGER.md](F:/A-War-Without-Victory/docs/PROJECT_LEDGER.md)
4. [PROJECT_LEDGER_KNOWLEDGE.md](F:/A-War-Without-Victory/docs/PROJECT_LEDGER_KNOWLEDGE.md)
5. the relevant subsystem master doc

When applicable, Claude must also read:

- [COMMAND_AUTHORITY_GATES.md](F:/A-War-Without-Victory/docs/20_engineering/COMMAND_AUTHORITY_GATES.md)
- [ROADMAP_GOVERNANCE.md](F:/A-War-Without-Victory/docs/20_engineering/ROADMAP_GOVERNANCE.md)
- [PLAYER_VISIBLE_STATE.md](F:/A-War-Without-Victory/docs/20_engineering/PLAYER_VISIBLE_STATE.md)
- [UI_OWNERSHIP_MATRIX.md](F:/A-War-Without-Victory/docs/20_engineering/UI_OWNERSHIP_MATRIX.md)
- [DEBUG_SURFACE_POLICY.md](F:/A-War-Without-Victory/docs/20_engineering/DEBUG_SURFACE_POLICY.md)
- [FEATURE_DONE_MEANS.md](F:/A-War-Without-Victory/docs/20_engineering/FEATURE_DONE_MEANS.md)

## Skill Discipline

Claude should not freestyle specialist work.

Use the relevant skills first, especially:

- `systematic-debugging` before bugfixes
- `test-driven-development` before implementation
- `orchestrator` for cross-system or roadmap work
- domain specialists for sectors, ops, formations, UI, scenario runs, determinism, and architecture
- `verification-before-completion` before claiming success

For work spanning multiple domains:

- investigate with specialists
- synthesize centrally
- integrate carefully

Do not rely on one generalist pass where the repo is already known to have layered truth or transitional residue.

## Canonical Ownership Rule

Every meaningful change must make ownership clearer than it was before.

Claude must be able to answer:

- What is canonical now?
- What old path was demoted, reduced, or declared compatibility-only?
- What player-visible truth changed?
- What UI surface owns this?
- What proves the change is real?

If those answers are fuzzy, the work is not done.

## What Studio-Grade Means Here

Studio-grade in this repo means:

- one owner of truth per system
- no overlapping live writers unless explicitly transitional
- no fake flexibility
- no raw engine jargon in player UI
- no omniscient player client hidden behind fog
- no compatibility lane that still silently mutates runtime truth
- no "works in practice" fix without a named root cause
- no roadmap language pretending the substrate is healthier than it is

## Required Workflow

For any serious change, work in short loops:

1. inspect
2. reproduce
3. identify root cause
4. change
5. verify
6. document
7. checkpoint commit

Do not bundle unrelated cleanups into the same checkpoint.

## Required Outputs By Change Type

### Behavior / code changes

Required:

- failing test or explicit reproduction
- implementation report in `docs/40_reports/implemented/`
- ledger update
- knowledge propagation if the lesson is reusable
- canon propagation when runtime truth changed
- verification evidence

### Docs-only changes

Required:

- affected canonical docs updated together
- ledger update when repo behavior or execution standards are clarified
- governance check

### Roadmap / plan changes

Required:

- milestone slotting rationale
- sequencing risk if mis-slotted
- explicit owner and done-means language

## Forbidden Habits

Do not:

- patch symptoms without root cause
- leave temporary writers alive if they still mutate runtime truth
- add new UI surfaces without naming the canonical owner
- treat player-facing leaks as cosmetic debt
- call work done without verification
- commit generated run artifacts unless the task explicitly requires them
- keep "historical" docs sounding current when they are no longer authoritative

## Completion Block

Every meaningful change should end with the five-line completion block from [FEATURE_DONE_MEANS.md](F:/A-War-Without-Victory/docs/20_engineering/FEATURE_DONE_MEANS.md):

```md
Canonical owner:
Demoted path:
Player-visible truth:
Canonical UI surface:
Done means:
```

## Merge Standard

Before merge or "done":

- tests relevant to the change must pass
- docs and ledger must be aligned
- governed files must pass the repo governance check
- the change must improve ownership clarity, not just move code around

If a change increases ambiguity, it is not ready.
