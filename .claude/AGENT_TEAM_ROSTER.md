# Pyrrhic — Agent Team Roster (AWWV)

**Collective identity:** Pyrrhic. The specialists listed below are the Pyrrhic team for this repo. Individual role names are unchanged.

**Purpose:** Single source of truth for when and whom the main agent invokes. Pyrrhic specialists focus on different aspects; tension between roles produces better results. Do not collapse roles (e.g. use both Code Review and QA Engineer before merge).

**Process QA:** All Pyrrhic roles are **subject to Process QA** (quality-assurance-process). Process QA validates that others followed established process (context, ledger, napkin at session start, commit discipline). Invoking Process QA after handoffs or execution eliminates the need for micromanagement—others follow process, Process QA verifies.

## Main agent instruction

**For every non-trivial task:** Consult this Pyrrhic roster; invoke the listed skill(s) for the relevant role(s) by reading and following the corresponding `.claude/skills/<name>/SKILL.md`. Use clarification-first for high-risk items; document handoffs when passing between roles.

**Dispatch-first rule:** When the task spans 2+ domains, the Orchestrator should dispatch specialists before synthesizing. Use `.claude/commands/orchestrator.md` or pair with `.claude/agents/orchestrator-dispatcher.md` to keep the role from sliding into solo investigation.

---

## Role → skill mapping

### Leadership

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Orchestrator | orchestrator | Big-picture direction, team coordination, strategic priority, convening Pyrrhic, aligning roadmap and ledger; resolves cross-role conflicts. **Deputy:** Product Manager. **Default mode:** dispatch-first, synthesis second. |
| Product Manager | product-manager | Roadmap, MVP, sequencing work, handoff to dev; reports to Orchestrator for big-picture alignment. References awwv-plan-change, awwv-make-cursor-prompt. |

### Planning

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Game Designer | game-designer | Design questions, mechanic changes, canon interpretation, balance, narrative. |
| Technical Architect | technical-architect | New systems, refactors, cross-cutting concerns, tech choices, architecture. |
| Architect | architect | Holistic product architecture: cross-system integration design, UI/UX architecture, feature feasibility across engine+UI+data, industry research, vision documents. Operates above Technical Architect. |
| **Historian** | historian | Bosnian war historical authority; holds BB KB (pages, facts, extractions). Citation-backed answers for historical events, scenarios, plausibility; always cite BB1/BB2. Invoke when discussing historical events, scenario design, or "what does the record say?" |

### Development

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Gameplay Programmer | gameplay-programmer | Implementing or changing phase/sim logic, state, simulation behavior. |
| Systems Programmer | systems-programmer | Engine core, ordering, serialization, invariants, determinism. |
| UI/UX Developer | ui-ux-developer | UI components, flows, UX changes, accessibility. |
| Graphics Programmer | graphics-programmer | Rendering, shaders, map visuals, map rendering pipeline. |
| Lua Scripting | lua-scripting | Lua APIs, scriptable behavior, bindings. |
| Asset Integration | asset-integration | Integrating art, map data, external content; can use map-geometry where relevant. |

### Testing

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Code Review (canon/specs) | canon-compliance-reviewer | Behavioral changes, gameplay logic, state schemas, phase rules, outputs; before merge for canon alignment. |
| Code Review (general) | code-review | PR review, pre-merge review, style, correctness, security; for canon defer to canon-compliance-reviewer. |
| QA Engineer | qa-engineer | Test plans, QA sign-off, regression; use determinism-auditor for determinism. |
| QA / determinism | determinism-auditor | Ordering, nondeterminism, pipelines, stable output. |
| Performance Engineer | performance-engineer | Performance concerns, optimization, profiling. |
| Platform Specialist | platform-specialist | Platform bugs, packaging, Windows/platform constraints. |
| Scenario / harness | scenario-harness-engineer | Scenario runner, preflight, diagnostics, pipeline code. |

### Release

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Build Engineer | build-engineer | Build config, CI build steps, reproducible builds. |
| DevOps Specialist | devops-specialist | Pipeline changes, deployment, CI/CD. |
| Documentation Specialist | documentation-specialist | Docs updates, release notes; respect docs-only-ledger-handling and no auto-edit of FORAWWV. |

### Process and ledger

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Process / ledger | ledger-process-scribe, awwv-ledger-entry, awwv-pre-commit-check | Ledger updates, pre-commit checks, commit discipline, phase scope. |
| Map / geometry | map-geometry-integrity-reviewer | Map toolchain, GeoJSON, geometry, spatial outputs. |

### Meta

| Role | Skill path | When to invoke |
|------|------------|----------------|
| **Process QA** | quality-assurance-process | **Validates that other Pyrrhic roles followed process** (context, ledger, napkin at session start, commit discipline). Single checkpoint—invoke after handoffs, after Orchestrator/PM execution, or before merge. *Process QA changes everything: eliminates micromanagement.* |
| Retrospective Analyst | retrospective-analyst | After major milestone or comprehensive review; gaps, spec/code discrepancies, performance. |

---

## Handoff workflow

- **Big-picture / team** → Orchestrator (strategic priority, convening Pyrrhic, aligning roadmap and ledger). Orchestrator delegates scope and sequencing to Product Manager (deputy).
- **Design/scope** → Game Designer, Technical Architect, or Product Manager (by question type).
- **Historical events / scenario plausibility / "what does the record say?"** → **Historian** (historian). Historian holds all Balkan Battlegrounds–derived knowledge; invoke for citation-backed BiH war facts, control/holdouts/enclaves/JNA, scenario design.
- **Product architecture / cross-system** → Architect (UI/UX architecture, cross-system integration, feasibility assessment, vision documents). Architect delegates implementation to relevant Dev roles.
- **Implementation** → Relevant Dev role: Gameplay, Systems, UI/UX, Graphics, Lua, Asset.
- **Pre-merge** → Code Review (code-review and/or canon-compliance-reviewer) + QA Engineer (qa-engineer, determinism-auditor as needed). **Process QA** (quality-assurance-process) validates that process was followed—invoke to avoid micromanagement.
- **Release** → Build Engineer, DevOps Specialist, Documentation Specialist.
- **Process validation** → **Process QA** (quality-assurance-process). Validates that other roles followed context, napkin at session start, ledger, commit discipline. Invoke after handoffs or after Orchestrator/PM execution.
- **After major milestone** → Retrospective Analyst (retrospective-analyst).

Document handoffs when passing between roles (e.g. "Handoff: Orchestrator → Product Manager for Phase 4 sequencing"; "Handoff: Product Manager → Gameplay Programmer for Phase X implementation").

---

## Clarification-first (high-risk)

For the following, require **questions with examples**, **documented assumptions with risk levels**, and **STOP AND ASK** before proceeding. This Pyrrhic roster is the checkpoint list for when to escalate.

**High-risk triggers:**

- Cross-phase changes.
- Changes touching canon (mechanics, phase specs, invariants).
- Architecture or entrypoint changes.
- Determinism, ordering, or serialization changes.
- Ledger or process rule changes.
- FORAWWV or canonical doc scope unclear.

**Required:** State assumptions, give 1–2 concrete examples, label risk (high/medium/low), then STOP AND ASK for confirmation.

---

## Periodic Pyrrhic team review

For a **comprehensive review**, invoke in sequence or combined: **Game Designer**, **Technical Architect**, **Code Review** (canon-compliance-reviewer), **QA Engineer** (qa-engineer). Produce a consolidated list of:

- Code discrepancies
- Spec gaps
- Performance issues

Retrospective Analyst can consume this output for post-milestone review.
