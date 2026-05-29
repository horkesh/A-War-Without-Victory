# Plan Execution Standard

**Date:** 2026-05-24
**Status:** ACTIVE planning standard
**Owner lane:** Roadmap/process lane
**Purpose:** Make every active AWWV plan executable by an external agent without rediscovery, while avoiding churn in closed historical plans.

## Scope

This standard applies to every `ACTIVE`, `GATED`, `OPERATOR-ONLY`, and `OWNED-ELSEWHERE` lane on `docs/plans/COMMAND_BOARD.md`, every newly authored implementation plan, and any older plan reopened as current work.

Closed implementation reports and superseded historical plans do not need retroactive rewrites unless they become the active handoff document again.

## Required Sections

Every executable plan must include these sections or explicitly state why a section is not applicable.

### 1. Header Contract

Required fields: date, status, owner lane, related command-board row, collision rules, phase/workstream covered, and current next action.

### 2. Purpose and Non-Goals

The plan must say what changes and what is deliberately excluded. Non-goals must call out forbidden canon changes, branch ownership collisions, save/schema boundaries, calibration or GUI ownership boundaries when relevant, and sensitive-history gates when relevant.

### 3. External-Agent Execution Contract

Required items:

- session-start commands;
- required reading list;
- files to inspect before editing;
- branch collision rule;
- global stop rule;
- expected phase/commit boundaries.

### 4. Task Boundary Rules

Required items:

- what each phase may edit;
- what each phase must not edit;
- when save/schema work is allowed;
- when scenario/hash drift is allowed;
- when a decision packet is required instead of implementation.

### 5. Phase Sequence

Each phase must include assigned specialist owner, independent reviewer roles, exact file targets where known, tests to write first, implementation order, expected artifacts, verification commands, handoff criteria, and stop gates.

### 6. Determinism and Save-Schema Gates

Required when the plan touches engine, data, diagnostics, save/load, scenario artifacts, or generated output:

- no timestamps, randomness, environment-dependent behavior, or unordered iteration;
- stable sorting rules for emitted rows, persisted arrays, queues, maps, and diagnostics;
- migration/default/validator/fixture requirements for new persisted fields;
- baseline regression requirement rules;
- manifest-refresh approval rules.

### 7. UI and Player-Truth Gates

Required when the plan touches player-facing UI or read models:

- canonical owner surface;
- no duplicate queues, ledgers, or resolver authorities;
- player-safe/fog-safe field policy;
- localization requirements;
- browser/Electron visual proof expectations when feasible;
- GUI branch collision rules.

### 8. Historical and Sensitive-History Gates

Required when the plan touches historical claims, Codex, events, scenarios, OOB, painted targets, or sensitive history:

- source hierarchy and citation requirements;
- historian review trigger;
- sensitive-history ring classification;
- explicit refusal of atrocity as a player lever;
- handling for unsupported claims;
- live-state-vs-calendar/emergence rules when applicable.

### 9. Roadmap and Ledger Closeout

Every implementation slice must state exactly which docs are updated:

- `docs/plans/COMMAND_BOARD.md`;
- the active plan itself;
- `docs/plans/MASTER_ROADMAP.md` only for phase/packet closure;
- `docs/PROJECT_LEDGER.md`;
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` only for reusable process/design lessons;
- `docs/40_reports/implemented/` for code/data changes;
- `docs/40_reports/CONSOLIDATED_BACKLOG.md` and `docs/40_reports/GAME_STATE_RATING_MASTER.md` only when status/rating changes.

### 10. Copy-Ready Prompt

Every plan intended for external-agent use must end with a copy-ready prompt containing:

1. Role and objective.
2. Canon references.
3. Determinism and ledger constraints.
4. STOP AND ASK triggers.
5. Output format and validation.

## Minimal External-Agent Prompt Template

```text
Role and objective: You are the implementation agent for <lane>. Execute <plan path> one phase at a time, starting with the next unfinished phase recorded in docs/plans/COMMAND_BOARD.md.

Canon references: Read .claude/napkin.md, docs/20_engineering/PYRRHIC_PLANNING_RULES.md, docs/plans/COMMAND_BOARD.md, docs/plans/MASTER_ROADMAP.md, docs/10_canon/CANON.md, and the canon/engineering docs named in the plan before editing. Inspect the file targets listed in the plan.

Determinism and ledger constraints: No timestamps, randomness, environment-dependent logic, or nondeterministic iteration. Stable ordering is required for diagnostics, persisted output, generated artifacts, and migrations. Do not add save fields without migration/default/validator tests. Append docs/PROJECT_LEDGER.md for behavior/output/scenario/data/roadmap changes; update docs/PROJECT_LEDGER_KNOWLEDGE.md only for reusable lessons. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: Canon conflicts or canon silence on required decision; determinism or stable ordering cannot be guaranteed; ledger update requirement is unclear; scope expands beyond prompt objective; branch ownership collision; sensitive-history judgment required; unexplained scenario hash drift; save-schema default could affect scenario output without sign-off.

Output format and validation: Work one phase per commit. In the handoff, include changed files, phase completed, tests run with pass/fail, scenario hash/baseline result if applicable, drift explanation if any, docs/ledger updates, and next unfinished phase.
```

## Acceptance Gate

A plan is command-board ready only if an external agent can answer these questions without searching the whole repo:

1. What is the next phase?
2. Which files may I touch?
3. Which files must I avoid?
4. Which tests do I write first?
5. Which commands prove the slice?
6. What makes me stop instead of improvise?
7. What docs/ledger updates close the slice?
8. What prompt do I paste into the next agent?

If any answer is missing, the plan is not yet execution-grade.
