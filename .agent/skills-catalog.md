# Skills & Subagents Catalog

**Purpose:** The Orchestrator MUST consult this catalog at invocation to be aware of all available skills and subagent capabilities, then select and invoke the ones best suited for the task.

**Source:** `.cursor/skills/*/SKILL.md`. Regenerate this catalog when skills are added or removed.

---

## Dispatching & Subagents (use when delegating or parallelizing)

| Skill | When to use |
|-------|-------------|
| **dispatching-parallel-agents** | 2+ independent tasks without shared state; dispatch one agent per problem domain to work concurrently |
| **subagent-driven-development** | Executing implementation plans in this session; dispatch fresh subagent per task with spec + code review between tasks |
| **executing-plans** | Written implementation plan to execute in a separate session with review checkpoints |

---

## Process & Flow (invoke first when applicable)

| Skill | When to use |
|-------|-------------|
| **using-superpowers** | Always at start; invoke relevant skills before responding (even ~1% chance) |
| **awwv-read-first** | Before nontrivial changes; produce required reading list and compliance checklist |
| **awwv-plan-change** | When planning a change; produce stepwise plan, docs, tests, ledger notes |
| **brainstorming** | Before any creative work (features, components, functionality); explore intent, requirements, design |
| **systematic-debugging** | Any bug, test failure, or unexpected behavior; before proposing fixes |
| **test-driven-development** | Before implementing features or bugfixes; write test first, watch fail, then code |
| **verification-before-completion** | Before claiming work complete; run verification, evidence before assertions |
| **quality-assurance-process** | After handoffs or Orchestrator/PM execution; validates process compliance |

---

## Paradox Roles & Domain Experts

| Skill | When to use |
|-------|-------------|
| **orchestrator** | Strategic direction, convening team, resolving cross-role conflicts, aligning roadmap and ledger |
| **product-manager** | Scope, priority, phased delivery, roadmap, MVP, sequencing, handoff to dev |
| **technical-architect** | Architecture, entrypoints, ADR, CODE_CANON, REPO_MAP, new systems, refactors |
| **architect** | Holistic product architecture: cross-system integration, UI/UX architecture, feature feasibility spanning engine+UI+data, industry research, vision documents; operates above Technical Architect |
| **game-designer** | Design intent, mechanics, Game Bible, canon interpretation, balance, narrative |
| **gameplay-programmer** | Phase logic, state, simulation behavior per phase specs and Systems Manual |
| **formation-expert** | Militia spawning, brigade formation, pools, formation lifecycle, AoR, OOB |
| **scenario-creator-runner-tester** | Historical BiH scenarios, init_control, init_formations, run outputs, ahistorical flags |
| **systems-programmer** | Core systems, invariants, determinism, engine core, ordering, serialization |
| **balkan-battlegrounds-historical-extractor** | Historical knowledge from BB1/BB2; control, holdouts, enclaves, JNA/VRS |
| **modern-wargame-expert** | Advisory on modern PC grand strategy/operational wargame UI/UX and info design (EU, HoI, AGEOD); UI truthfulness, coupling, player-intent vs friction; no new mechanics |

---

## Compliance, Canon & Ledger

| Skill | When to use |
|-------|-------------|
| **canon-compliance-reviewer** | Verify changes align with canon and phase specs; gameplay, state, scenarios, outputs |
| **canon-compliance-review** | Gameplay logic, state, output changes comply with canon |
| **awwv-ledger-entry** | User runs /awwv_ledger_entry or change affects behavior/outputs/scenarios |
| **awwv-pre-commit-check** | Pre-commit review; canon, determinism, ordering, tests, ledger |
| **docs-only-ledger-handling** | Documentation-only edits; PROJECT_LEDGER handling and canon checks |
| **ledger-process-scribe** | Process compliance: ledger updates, commit discipline, validation |

---

## Engineering & Implementation

| Skill | When to use |
|-------|-------------|
| **code-review** | PR review, pre-merge; style, correctness, security; defers canon to canon-compliance-reviewer |
| **receiving-code-review** | When receiving code review feedback; verify before implementing suggestions |
| **requesting-code-review** | Completing tasks, major features, before merge |
| **code-simplifier** | Simplify code for clarity, consistency, maintainability |
| **refactor-pass** | Refactor/cleanup pass, dead-code removal, simplification |
| **determinism-auditor** | Nondeterminism risks in code, scripts, workflows, simulation, serialization |
| **deterministic-script-implementation** | Scripts, pipelines, tooling affecting simulation outputs |
| **build-engineer** | Build system, scripts, reproducible builds |
| **devops-specialist** | CI/CD, pipelines, deployment |
| **performance-engineer** | Performance, profiling, bottlenecks |
| **platform-specialist** | Platform-specific (Windows, packaging), platform bugs |

---

## Map, Assets & UI

| Skill | When to use |
|-------|-------------|
| **asset-integration** | Integrating art, map data, external content |
| **map-geometry-integrity-reviewer** | Map data, geometry, GeoJSON, spatial outputs |
| **graphics-programmer** | Rendering, map pipeline, shaders, visual output |
| **frontend-design** | Web components, pages, applications; high design quality |
| **ui-ux-developer** | UI/UX, accessibility, wireframes |

---

## Documentation & Prompts

| Skill | When to use |
|-------|-------------|
| **documentation-specialist** | User-facing and engineering docs; respects docs-only-ledger-handling |
| **prompt-construction** | Drafting prompts for Cursor or subagents |
| **awwv-make-cursor-prompt** | Generate structured prompt for Cursor or subagents |
| **visual-explainer** | Technical diagrams, visualizations, data tables as self-contained HTML; open in browser; proactive for 4+ rows or 3+ columns; never ASCII art when loaded |
| **reports-custodian** | docs/40_reports structure; CONSOLIDATED_* sync; archive superseded reports |

---

## Planning, Finishing & Meta

| Skill | When to use |
|-------|-------------|
| **writing-plans** | Spec or requirements for multi-step task; before touching code |
| **finishing-a-development-branch** | Implementation complete, tests pass; decide merge/PR/cleanup |
| **using-git-worktrees** | Feature work needing isolation; before executing implementation plans |
| **scenario-harness-engineer** | Scenario runner, preflight, diagnostics, artifacts, run pipeline |
| **scenario-report** | Run a scenario and produce a full Paradox team report with tracked metrics and per-role assessments; "everyone weighing in" |
| **qa-engineer** | Test strategy, coverage, regression; determinism-auditor for determinism |
| **writing-skills** | Creating, editing, verifying skills |
| **retrospective-analyst** | Post-milestone review; what went well, gaps, spec/code discrepancies |
| **lua-scripting** | Lua bindings, scripting surface, scriptable behavior |
