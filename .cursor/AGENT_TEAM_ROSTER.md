# Pyrrhic — Agent Team Roster (AWWV)

**Collective identity:** Pyrrhic. The specialists listed below are the Pyrrhic team for this repo. Individual role names are unchanged.

**Purpose:** Single source of truth for when and whom the main agent invokes. Pyrrhic specialists focus on different aspects; tension between roles produces better results. Do not collapse roles (e.g. use both Code Review and QA Engineer before merge).

**Process QA:** All Pyrrhic roles are **subject to Process QA** (quality-assurance-process). Process QA validates that others followed established process (context, ledger, napkin at session start, commit discipline). Invoking Process QA after handoffs or execution eliminates the need for micromanagement—others follow process, Process QA verifies.

## Main agent instruction

**For every non-trivial task:** Consult this Pyrrhic roster; invoke the listed skill(s) for the relevant role(s) by reading and following the corresponding `.cursor/skills/<name>/SKILL.md`. Use clarification-first for high-risk items; document handoffs when passing between roles.

---

## Role → skill mapping

### Leadership

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Orchestrator | orchestrator | Big-picture direction, team coordination, strategic priority, convening Pyrrhic, aligning roadmap and ledger; resolves cross-role conflicts. **Deputy:** Product Manager. |
| Product Manager | product-manager | Roadmap, MVP, sequencing work, handoff to dev; reports to Orchestrator for big-picture alignment. References awwv-plan-change, awwv-make-cursor-prompt. |

### Planning

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Game Designer | game-designer | Design questions, mechanic changes, canon interpretation, balance, narrative. |
| Technical Architect | technical-architect | New systems, refactors, cross-cutting concerns, tech choices, architecture. |
| Architect | architect | Holistic product architecture: cross-system integration design, UI/UX architecture, feature feasibility across engine+UI+data, industry research, vision documents. Operates above Technical Architect. |
| **Historian** | historian | Bosnian war historical authority; holds BB KB (pages, facts, extractions). Citation-backed answers for historical events, scenarios, plausibility; always cite BB1/BB2. Invoke when discussing historical events, scenario design, or "what does the record say?" |
| **War or Game** | war-or-game | Realism auditor. Investigates sim outputs, battle logs, AARs, calibration runs — finds anything a real Bosnian War commander would find absurd. Primary owner of `REAL_WAR_MASTER.md`. **Mandatory advisor on every calibration attempt.** Escalates findings to Orchestrator. Best pal of Historian. |
| BB Extractor | balkan-battlegrounds-historical-extractor | Extracts historical knowledge from Balkan Battlegrounds (BB1/BB2) for control, takeover, holdouts, enclaves, pockets, JNA/VRS. Feeds Historian with citation-backed findings for scenario and engine design. |
| Scenario Author | scenario-creator-runner-tester | Creates historical BiH war scenario starting points, runs and tests scenarios, flags ahistorical results with conceptual proposals. Invoke when authoring scenarios, defining init_control/init_formations, interpreting run outputs, or assessing whether outcomes match history. |
| **Wargame Advisor** | modern-wargame-expert | Advisory: reviews UI/UX, strategic-layer information design, and player-intent vs institutional-constraint representation against modern PC grand strategy and operational wargame patterns (EU, HoI, AGEOD). Does not invent mechanics or edit canon. |

### Development

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Gameplay Programmer | gameplay-programmer | Implementing or changing phase/sim logic, state, simulation behavior. |
| **Formation Expert** | formation-expert | Owns militia spawning, brigade formation, militia pools, formation lifecycle, AoR, OOB. Invoke when working on militia emergence, pool population, formation spawn, formation_spawn_directive, batchSize, max_brigades_per_mun, or when explaining why formations did or did not spawn. |
| **Operations Expert** | operations-expert | **MUST consult before ANY operation change.** Owns pre-planned ops, triggered ops, sector offensive lifecycle, operation preparation, brigade attack evaluation, corps command. Knows: synthetic JNA corps, per-axis parallel execution, preparation-aware assembly, staging adjacency, coupled anchors. Session report: `docs/40_reports/20260321_HERZEGOVINA_CALIBRATION_SESSION.md`. |
| Systems Programmer | systems-programmer | Engine core, ordering, serialization, invariants, determinism. |
| UI/UX Developer | ui-ux-developer | **Invoke for any UI/GUI related issues:** map, warroom, components, flows, UX, accessibility. Role must read `docs/40_reports/GUI_MASTER.md` first and update it during the session. |
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
- **Realism audit / "is this war or game?" / calibration review** → **War or Game** (war-or-game). Mandatory advisor on every calibration attempt. Owns `REAL_WAR_MASTER.md`. Finds absurdities in sim output, escalates to Orchestrator. Works closely with Historian for historical grounding.
- **Product architecture / cross-system** → Architect (UI/UX architecture, cross-system integration, feasibility assessment, vision documents). Architect delegates implementation to relevant Dev roles.
- **Operations / ops / corps command / sector offensive / pre-planned / triggered** → **Operations Expert** (operations-expert). **MANDATORY** before ANY op change. Owns lifecycle, preparation, attack evaluation, corps command. No op gets touched without this role in lead or consulting.
- **Formation / militia / OOB** → **Formation Expert** (formation-expert). Owns spawn logic, pool population, brigade lifecycle. Coordinates with Gameplay Programmer for phase/sim integration.
- **Scenario authoring / run interpretation** → **Scenario Author** (scenario-creator-runner-tester). Creates init_control/init_formations, interprets run results, flags ahistorical outcomes. Coordinates with Historian for plausibility.
- **UI/UX wargame patterns** → **Wargame Advisor** (modern-wargame-expert). Advisory on information display, truthfulness, player-intent representation. Does not edit canon.
- **UI/GUI (map, warroom, components, flows, UX)** → **UI/UX Developer** (ui-ux-developer). Invoke for any UI/GUI related issues. Role must read `docs/40_reports/GUI_MASTER.md` first and update it during the session.
- **BB extraction / historical research** → **BB Extractor** (balkan-battlegrounds-historical-extractor). Feeds Historian with citation-backed BB1/BB2 findings.
- **Implementation** → Relevant Dev role: Gameplay, Formation Expert, Systems, UI/UX, Graphics, Lua, Asset.
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
