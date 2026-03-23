# Pyrrhic — Agent Team Roster (AWWV)

**Collective identity:** Pyrrhic. The specialists listed below are the Pyrrhic team for this repo. Individual role names are unchanged.

**Purpose:** Single source of truth for when and whom the main agent invokes. Pyrrhic specialists focus on different aspects; tension between roles produces better results. Do not collapse roles (e.g. use both Code Review and QA Engineer before merge).

**Process QA:** All Pyrrhic roles are **subject to Process QA** (quality-assurance-process). Process QA validates that others followed established process (context, ledger, napkin at session start, commit discipline). Invoking Process QA after handoffs or execution eliminates the need for micromanagement—others follow process, Process QA verifies.

**Last restructured:** 2026-03-24. 7 roles cut (zero activity), 3 roles hired, 1 role promoted to mandatory gate. Net: 66 → 62.

## Main agent instruction

**For every non-trivial task:** Consult this Pyrrhic roster; invoke the listed skill(s) for the relevant role(s) by reading and following the corresponding `.claude/skills/<name>/SKILL.md`. Use clarification-first for high-risk items; document handoffs when passing between roles.

---

## Mandatory consultation gates

These roles **MUST** be consulted before proceeding with their domain. No exceptions.

| Gate | Skill | Trigger |
|------|-------|---------|
| **Operations Expert** | operations-expert | ANY operation change — pre-planned, triggered, objectives, brigades, staging, timing, corps command |
| **Historian** | historian | ANY historical claim about the Bosnian War |
| **War or Game** | war-or-game | ANY calibration run — mandatory sign-off |
| **Formation Expert** | formation-expert | ANY OOB/brigade/militia pool change |
| **UI/UX Developer** | ui-ux-developer | ANY new UI component, modal, or panel — **PROMOTED 2026-03-24** |
| **Data Pipeline Engineer** | data-pipeline-engineer | ANY change to derived data scripts in `tools/` — **NEW 2026-03-24** |

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
| **Historian** | historian | Bosnian war historical authority; holds BB KB (pages, facts, extractions). Citation-backed answers for historical events, scenarios, plausibility; always cite BB1/BB2. **MANDATORY gate.** |
| **War or Game** | war-or-game | Realism auditor. Investigates sim outputs, battle logs, AARs, calibration runs — finds anything a real Bosnian War commander would find absurd. Primary owner of `REAL_WAR_MASTER.md`. **Mandatory advisor on every calibration attempt.** |
| BB Extractor | balkan-battlegrounds-historical-extractor | Extracts historical knowledge from Balkan Battlegrounds (BB1/BB2). Feeds Historian with citation-backed findings. |
| Scenario Author | scenario-creator-runner-tester | Creates historical BiH war scenario starting points, runs and tests scenarios, flags ahistorical results. |
| **Wargame Advisor** | modern-wargame-expert | Advisory: reviews UI/UX, strategic-layer information design against EU, HoI, AGEOD patterns. Does not invent mechanics or edit canon. |

### Development

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Gameplay Programmer | gameplay-programmer | Implementing or changing phase/sim logic, state, simulation behavior. |
| **Formation Expert** | formation-expert | Owns militia spawning, brigade formation, militia pools, formation lifecycle, OOB. **MANDATORY gate.** |
| **Operations Expert** | operations-expert | **MUST consult before ANY operation change.** Owns pre-planned ops, triggered ops, sector offensive lifecycle, operation preparation, corps command. **MANDATORY gate.** |
| Systems Programmer | systems-programmer | Engine core, ordering, serialization, invariants, determinism. |
| **UI/UX Developer** | ui-ux-developer | **MUST consult before ANY new UI component, modal, or panel.** Owns design consistency, accessibility, warroom palette enforcement. Reads/updates `GUI_MASTER.md`. **MANDATORY gate — PROMOTED 2026-03-24.** |
| **Narrative Designer** | narrative-designer | Owns player-facing prose: event text, dynamic essay sections, briefing narratives, headlines. Works with /historian for facts, /game-designer for context. **NEW 2026-03-24.** |
| **Data Pipeline Engineer** | data-pipeline-engineer | Owns derived data pipelines (contact graph, OSID derivation, polygon processing). **MUST consult before ANY change to tools/ that write to data/derived/.** **NEW 2026-03-24.** |

### Testing

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Code Review (canon/specs) | canon-compliance-reviewer | Behavioral changes, gameplay logic, state schemas, phase rules; before merge for canon alignment. |
| Code Review (general) | code-review | PR review, pre-merge review, style, correctness, security; for canon defer to canon-compliance-reviewer. |
| QA Engineer | qa-engineer | Test plans, QA sign-off, regression; use determinism-auditor for determinism. |
| QA / determinism | determinism-auditor | Ordering, nondeterminism, pipelines, stable output. |
| **Integration Tester** | integration-tester | End-to-end testing: UI + sim + IPC + save/load. Verifies desktop app works as a whole. **NEW 2026-03-24.** |
| Performance Engineer | performance-engineer | Performance concerns, optimization, profiling. |
| Platform Specialist | platform-specialist | Platform bugs, packaging, Windows constraints. |
| Scenario / harness | scenario-harness-engineer | Scenario runner, preflight, diagnostics, pipeline code. |

### Release & Documentation

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Documentation Specialist | documentation-specialist | Docs updates, release notes; respect docs-only-ledger-handling and no auto-edit of FORAWWV. |

### Process and ledger

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Process / ledger | ledger-process-scribe, awwv-ledger-entry, awwv-pre-commit-check | Ledger updates, pre-commit checks, commit discipline, phase scope. |
| Map / geometry | map-geometry-integrity-reviewer | Map toolchain, GeoJSON, geometry, spatial outputs. |

### Meta

| Role | Skill path | When to invoke |
|------|------------|----------------|
| **Process QA** | quality-assurance-process | **Validates that other Pyrrhic roles followed process.** Single checkpoint — invoke after handoffs, after Orchestrator/PM execution, or before merge. |
| Retrospective Analyst | retrospective-analyst | After major milestone or comprehensive review; gaps, spec/code discrepancies. |

---

## Roles cut (2026-03-24)

The following roles were removed for zero activity and no foreseeable need:

| Cut Role | Reason |
|----------|--------|
| Lua Scripting | No Lua in the project. Not planned until post-1.0. |
| Graphics Programmer | No custom rendering. MapLibre + Deck.gl handle everything. |
| Frontend Design | Absorbed by UI/UX Developer. |
| DevOps Specialist | No CI/CD pipeline. Desktop app with no deployment. |
| Build Engineer | Vite + tsc is the build. Stable, no specialist needed. |
| Asset Integration | No art assets being integrated currently. |
| Canon Compliance Review | Duplicate of canon-compliance-reviewer. |

Skill directories retained (`.claude/skills/<name>/`) for future reactivation if needed.

---

## Handoff workflow

- **Big-picture / team** → Orchestrator (strategic priority, convening Pyrrhic). Orchestrator delegates scope to Product Manager (deputy).
- **Design/scope** → Game Designer, Technical Architect, or Product Manager.
- **Historical events / "what does the record say?"** → **Historian** (mandatory gate).
- **Realism audit / calibration review** → **War or Game** (mandatory gate).
- **Product architecture / cross-system** → Architect. Delegates implementation to Dev roles.
- **Operations / ops / corps command** → **Operations Expert** (mandatory gate).
- **Formation / militia / OOB** → **Formation Expert** (mandatory gate).
- **UI/UX (any new component, modal, panel)** → **UI/UX Developer** (mandatory gate).
- **Derived data pipelines** → **Data Pipeline Engineer** (mandatory gate).
- **Player-facing prose / narrative content** → **Narrative Designer**. Works with Historian + Game Designer.
- **Scenario authoring / run interpretation** → Scenario Author. Coordinates with Historian.
- **Wargame UI/UX patterns** → Wargame Advisor. Advisory only.
- **Implementation** → Relevant Dev role: Gameplay, Systems, UI/UX, Narrative Designer.
- **Pre-merge** → Code Review + Canon Compliance Reviewer + QA Engineer. **Process QA** validates process.
- **End-to-end verification** → **Integration Tester**.
- **After major milestone** → Retrospective Analyst.

Document handoffs when passing between roles.

---

## Clarification-first (high-risk)

For the following, require **questions with examples**, **documented assumptions with risk levels**, and **STOP AND ASK** before proceeding:

- Cross-phase changes.
- Changes touching canon (mechanics, phase specs, invariants).
- Architecture or entrypoint changes.
- Determinism, ordering, or serialization changes.
- Ledger or process rule changes.
- FORAWWV or canonical doc scope unclear.
- **New UI components or modals** (mandatory /ui-ux-developer gate).
- **Derived data pipeline changes** (mandatory /data-pipeline-engineer gate).

---

## Periodic Pyrrhic team review

For a **comprehensive review**, invoke in sequence or combined: **Game Designer**, **Technical Architect**, **Code Review** (canon-compliance-reviewer), **QA Engineer**. Produce a consolidated list of code discrepancies, spec gaps, performance issues.

Retrospective Analyst consumes this output for post-milestone review.
