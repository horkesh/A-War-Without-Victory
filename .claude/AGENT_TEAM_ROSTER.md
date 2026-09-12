# Pyrrhic — Agent Team Roster (AWWV)

**Collective identity:** Pyrrhic. The specialists listed below are the Pyrrhic team for this repo. Individual role names are unchanged.

**Purpose:** Maintained project role map, consulted for relevant domain ownership. Skill bodies under `.claude/skills/` own detailed semantics; the [shared workflow](../docs/20_engineering/AGENT_WORKFLOW.md) owns execution policy. A separate implementer and reviewer are required for nontrivial implementation. One reviewer may cover multiple ordinary review lenses; mandatory canon panels and distinct seats remain separate.

**Process QA:** Preserve process compliance as a review lens. Consult `quality-assurance-process` for an explicit process audit or a disputed compliance question; a routine handoff does not automatically require an additional worker.

## Main agent instruction

Use the runtime catalog and the relevant rows below. Resolve available tools on the current host and read the selected `.claude/skills/<name>/SKILL.md`; a listed role is not evidence of a callable tool enum. Document bounded handoffs. Task-specific consultation duties apply even when the lead performs other integration work.

The lead owns framing, evidence interpretation, and integration. Delegate bounded independent work using the adopted model-cost policy. Claude's scenario-result specialist routing remains required where its unchanged hooks apply; see the shared workflow's host coverage.

## Mandatory consultation gates

Consultation means reading the applicable skill and covering its domain duties with qualified implementation/review. It does not automatically create another worker: the existing team can cover compatible lenses. Add a specialist for a distinct expertise gap, and keep every canon-panel or explicitly required review seat independent.

| Skill | Trigger |
|---|---|
| operations-expert | Any operation change, including preparation, objectives, brigades, staging, timing and corps command |
| historian | Any historical claim about the Bosnian War; preserve BB1/BB2 and applicable source requirements |
| war-or-game | Any calibration run; mandatory realism sign-off |
| formation-expert | Any OOB, brigade or militia-pool change |
| ui-ux-developer | Any new UI component, modal or panel; consult for UI/UX changes |
| data-pipeline-engineer | Changes to tools that write derived data |

Exact four-seat and eight-seat membership is retained in [the shared workflow's canon boundary](../docs/20_engineering/AGENT_WORKFLOW.md#canon-and-protected-boundaries). Apply [SENSITIVE_HISTORY_DESIGN_GATE.md](../docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md), [FORAWWV.md](../docs/10_canon/FORAWWV.md), and [canon-compliance-reviewer](skills/canon-compliance-reviewer/SKILL.md) for the operative canon requirements. Similar names do not make `canon-compliance-review` and `canon-compliance-reviewer` interchangeable seats.

---

## Role → skill mapping

### Leadership

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Orchestrator | orchestrator | Big-picture direction, bounded team coordination, evidence interpretation, integration and cross-role decisions. **Deputy:** Product Manager. |
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
| Formation Expert | formation-expert | Militia spawning, brigade formation, militia pools, formation lifecycle, formation-driven availability questions. |
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
| Documentation Specialist | documentation-specialist | Docs updates, release notes; respect docs-only-ledger-handling; edits to FORAWWV.md require Pyrrhic-panel sign-off. |

### Process and ledger

| Role | Skill path | When to invoke |
|------|------------|----------------|
| Process / ledger | ledger-process-scribe, awwv-ledger-entry, awwv-pre-commit-check | Ledger updates, pre-commit checks, commit discipline, phase scope. |
| Map / geometry | map-geometry-integrity-reviewer | Map toolchain, GeoJSON, geometry, spatial outputs. |

### Meta

| Role | Skill path | When to invoke |
|------|------------|----------------|
| **Process QA** | quality-assurance-process | Explicit process audits or disputed compliance; ordinary review covers this lens without automatically adding a worker. |
| Retrospective Analyst | retrospective-analyst | After major milestone or comprehensive review; gaps, spec/code discrepancies, performance. |

---

## Handoff workflow

- **Big-picture / team** → Orchestrator (strategic priority, convening Pyrrhic, aligning roadmap and ledger). Orchestrator delegates scope and sequencing to Product Manager (deputy).
- **Design/scope** → Game Designer, Technical Architect, or Product Manager (by question type).
- **Historical events / scenario plausibility / "what does the record say?"** → **Historian** (historian). Historian holds all Balkan Battlegrounds–derived knowledge; invoke for citation-backed BiH war facts, control/holdouts/enclaves/JNA, scenario design.
- **Product architecture / cross-system** → Architect (UI/UX architecture, cross-system integration, feasibility assessment, vision documents). Architect delegates implementation to relevant Dev roles.
- **Implementation** → Relevant Dev role: Gameplay, Systems, UI/UX, Graphics, Lua, Asset.
- **Pre-merge** → Independent review covering relevant code, canon, QA, determinism and process guidance. Separately mandated panel seats remain mandatory; final merge still needs its own authorization.
- **Release** → Build Engineer, DevOps Specialist, Documentation Specialist.
- **Process validation** → **Process QA** (quality-assurance-process) when an explicit audit or disputed compliance question warrants it.
- **After major milestone** → Retrospective Analyst (retrospective-analyst).

Document handoffs when passing between roles (e.g. "Handoff: Orchestrator → Product Manager for Phase 4 sequencing"; "Handoff: Product Manager → Gameplay Programmer for Phase X implementation").

---

## Specialist bench for recurring AWWV problem shapes

Use the formal roster above as the base authority, then fit dispatch to the actual problem shape instead of reusing a generic fixed team block.

### Common dispatch patterns

| Problem shape | Primary specialists | Add when needed |
|------|------------|----------------|
| Formation spawning, militia pools, formation lifecycle | Formation Expert, Gameplay Programmer, Scenario Creator / Runner / Tester | Systems Programmer for invariants; Historian when historical plausibility is contested |
| Sector / frontline truth, brigade-to-sector ownership, reachability, front segmentation | Systems Programmer, Gameplay Programmer, Scenario Creator / Runner / Tester, operations-reality-checker | Map / geometry when spatial integrity is implicated; Historian only when historical plausibility is actually in question |
| Live operation behavior, dead fronts, zero-attack patterns | Scenario Creator / Runner / Tester, Gameplay Programmer, operations-reality-checker | Technical Architect for root-cause framing; Historian when the question is "bug or plausible quiet?" |
| Player-facing command truth, shell ownership drift, duplicate UI authority | UI/UX Developer, Architect, Technical Architect, ui-truth-keeper, authority-auditor | Modern Wargame Expert for comparative UX; Code Review (canon/specs) when mechanics meaning may drift |
| Roadmap slotting, phase sequencing, report placement | Product Manager, Technical Architect, roadmap-slotter, Documentation Specialist | Reports Custodian when report structure/retirement is part of the work |
| Cross-role implementation with built-in challenge loop | self-correcting-implementer plus the actual domain owner | Independent review includes process compliance |

### Repo taskforce briefs

The repo also ships task-focused coordination briefs in `.claude/agents/`. These are combinators and challenge roles, not replacements for domain ownership:

- `authority-auditor.md`
- `operations-reality-checker.md`
- `orchestrator-dispatcher.md`
- `roadmap-slotter.md`
- `self-correcting-implementer.md`
- `ui-truth-keeper.md`

Use them to sharpen dispatch and synthesis, but keep a real domain owner on every task.

---

## Decision boundaries

Continue authorized implementation and targeted failure correction. Resolve routine choices from evidence. Ask for an unresolved authority conflict, changed acceptance criterion, or costly scope outside the agreed plan. Plan-only and review-only requests remain read-only. Cross-phase, canon, determinism, architecture and protected data/save work retain their specific governing requirements; generic review cannot supply missing canon approval. Remote push, final merge, publication and shared live-instruction activation require their established authorization.

---

## Periodic Pyrrhic team review

For a **comprehensive review**, invoke in sequence or combined: **Game Designer**, **Technical Architect**, **Code Review** (canon-compliance-reviewer), **QA Engineer** (qa-engineer). Produce a consolidated list of:

- Code discrepancies
- Spec gaps
- Performance issues

Retrospective Analyst can consume this output for post-milestone review.
