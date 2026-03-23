# Skills & Subagents Catalog

**Purpose:** The Orchestrator MUST consult this catalog at invocation to be aware of all available skills and subagent capabilities, then select and invoke the ones best suited for the task.

**Source:** `.claude/skills/*/SKILL.md`. Regenerate this catalog when skills are added or removed.

**Last restructured:** 2026-03-24. 7 roles cut, 3 hired, 1 promoted. 62 active skills.

---

## Mandatory Consultation Gates (MUST invoke before proceeding)

| Skill | Trigger |
|-------|---------|
| **operations-expert** | ANY operation change (pre-planned, triggered, objectives, brigades, staging, corps command) |
| **historian** | ANY historical claim about the Bosnian War |
| **war-or-game** | ANY calibration run — mandatory sign-off |
| **formation-expert** | ANY OOB/brigade/militia pool change |
| **ui-ux-developer** | ANY new UI component, modal, or panel |
| **data-pipeline-engineer** | ANY change to scripts in `tools/` that write to `data/derived/` |

---

## Dispatching & Subagents (use when delegating or parallelizing)

| Skill | When to use |
|-------|-------------|
| **dispatching-parallel-agents** | 2+ independent tasks without shared state; dispatch one agent per problem domain |
| **subagent-driven-development** | Executing implementation plans in this session; dispatch fresh subagent per task |
| **executing-plans** | Written implementation plan to execute in a separate session with review checkpoints |

---

## Process & Flow (invoke first when applicable)

| Skill | When to use |
|-------|-------------|
| **using-superpowers** | Always at start; invoke relevant skills before responding |
| **awwv-read-first** | Before nontrivial changes; produce required reading list and compliance checklist |
| **awwv-plan-change** | When planning a change; produce stepwise plan, docs, tests, ledger notes |
| **brainstorming** | Before any creative work (features, components, functionality) |
| **systematic-debugging** | Any bug, test failure, or unexpected behavior; before proposing fixes |
| **test-driven-development** | Before implementing features or bugfixes; write test first |
| **verification-before-completion** | Before claiming work complete; run verification, evidence before assertions |
| **quality-assurance-process** | After handoffs or Orchestrator/PM execution; validates process compliance |

---

## Pyrrhic Roles & Domain Experts

| Skill | When to use |
|-------|-------------|
| **orchestrator** | Strategic direction, convening team, resolving cross-role conflicts |
| **product-manager** | Scope, priority, phased delivery, roadmap, MVP, sequencing |
| **technical-architect** | Architecture, entrypoints, ADR, CODE_CANON, new systems, refactors |
| **architect** | Holistic product architecture: cross-system integration, UI/UX architecture, feasibility |
| **game-designer** | Design intent, mechanics, Game Bible, canon interpretation, balance |
| **gameplay-programmer** | Phase logic, state, simulation behavior |
| **formation-expert** | Militia spawning, brigade formation, pools, OOB (**mandatory gate**) |
| **operations-expert** | Military operations, preparation, execution, corps command (**mandatory gate**) |
| **scenario-creator-runner-tester** | Scenario authoring, run interpretation, ahistorical flags |
| **systems-programmer** | Core systems, invariants, determinism, serialization |
| **historian** | Bosnian war historical authority, citation-backed facts (**mandatory gate**) |
| **balkan-battlegrounds-historical-extractor** | BB1/BB2 knowledge extraction; feeds Historian |
| **modern-wargame-expert** | Advisory on wargame UI/UX patterns (EU, HoI, AGEOD) |
| **narrative-designer** | Player-facing prose: event text, dynamic essay sections, briefings, headlines (**NEW**) |
| **data-pipeline-engineer** | Derived data pipelines: contact graph, OSID, polygons (**NEW, mandatory gate**) |

---

## UI, Map & Design

| Skill | When to use |
|-------|-------------|
| **ui-ux-developer** | UI/UX, accessibility, design consistency, new components (**mandatory gate**) |
| **map-geometry-integrity-reviewer** | Map data, geometry, GeoJSON, spatial outputs |
| **visual-explainer** | Technical diagrams, visualizations, HTML output |

---

## Compliance, Canon & Ledger

| Skill | When to use |
|-------|-------------|
| **canon-compliance-reviewer** | Verify changes align with canon and phase specs |
| **awwv-ledger-entry** | Change affects behavior/outputs/scenarios |
| **awwv-pre-commit-check** | Pre-commit review; canon, determinism, tests, ledger |
| **docs-only-ledger-handling** | Documentation-only edits |
| **ledger-process-scribe** | Process compliance: ledger, commit discipline |

---

## Engineering & Quality

| Skill | When to use |
|-------|-------------|
| **code-review** | PR review, pre-merge; style, correctness, security |
| **receiving-code-review** | When receiving feedback; verify before implementing |
| **requesting-code-review** | Completing tasks, before merge |
| **refactor-pass** | Cleanup, dead-code removal, simplification |
| **determinism-auditor** | Nondeterminism risks in code, scripts, workflows |
| **deterministic-script-implementation** | Scripts/pipelines affecting simulation outputs |
| **performance-engineer** | Performance, profiling, bottlenecks |
| **platform-specialist** | Platform-specific (Windows, packaging) |
| **integration-tester** | End-to-end testing: UI + sim + IPC + save/load (**NEW**) |

---

## Documentation & Reports

| Skill | When to use |
|-------|-------------|
| **documentation-specialist** | Docs updates, release notes |
| **prompt-construction** | Drafting prompts for Cursor or subagents |
| **awwv-make-cursor-prompt** | Structured prompt generation |
| **reports-custodian** | docs/40_reports structure, CONSOLIDATED_* sync |
| **propagate-to-canon** | Propagate code changes to canonical docs |

---

## Planning, Finishing & Meta

| Skill | When to use |
|-------|-------------|
| **writing-plans** | Spec or requirements for multi-step task; before code |
| **finishing-a-development-branch** | Implementation complete; decide merge/PR/cleanup |
| **using-git-worktrees** | Feature work needing isolation |
| **scenario-harness-engineer** | Scenario runner, preflight, diagnostics, artifacts |
| **scenario-report** | Full Pyrrhic team report with tracked metrics |
| **qa-engineer** | Test strategy, coverage, regression |
| **writing-skills** | Creating, editing, verifying skills |
| **retrospective-analyst** | Post-milestone review; gaps, discrepancies |
| **war-or-game** | Realism auditor; calibration sign-off (**mandatory gate**) |

---

## Cut roles (2026-03-24) — skill dirs retained for reactivation

lua-scripting, graphics-programmer, frontend-design, devops-specialist, build-engineer, asset-integration, canon-compliance-review (duplicate of canon-compliance-reviewer)
