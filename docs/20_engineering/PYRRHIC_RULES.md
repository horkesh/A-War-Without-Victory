# Pyrrhic Rules

**Purpose:** Standard rules for **Pyrrhic** execution when the Orchestrator is in charge of a multi-phase implementation (e.g. Phase C GUI). All agents and subagents follow these unless overridden.

**Authority:** Set by user/orchestrator. When in force, Orchestrator runs the show; Architect oversees and flags decisions for user review.

---

## 1. Concrete phases with concrete todos

- Break the work into **named phases** (e.g. C1, C2, …) with **explicit deliverables**.
- Each phase has a **todo list** (concrete tasks, not vague "improve X").
- Document the plan in a single place (e.g. `docs/40_reports/phase_c/PHASE_C_EXECUTION_PLAN.md`) and keep todos updated as work completes.

---

## 2. Refactor-pass between each phase

- After **each phase** (before starting the next), run a **refactor-pass**:
  - Dead code: remove unused imports, types, functions, variables.
  - Duplication: extract shared helpers where logic is repeated.
  - Over-engineered stubs: inline or remove trivial wrappers.
  - Unnecessary complexity: simplify conditionals, early returns.
  - No backward-compat shims kept "just in case" if nothing uses them.
- Verify after refactor: `npx tsc --noEmit`, `npx vitest run` (and any phase-specific checks).

---

## 3. Use entire Pyrrhic team — delegate tasks

- **Orchestrator** owns priority, sequencing, and handoffs.
- **Architect** oversees process; makes implementation/design decisions when needed but **flags them for later user review**.
- Delegate implementation to the right roles: UI/UX Developer, Gameplay Programmer, Technical Architect, etc., per `.cursor/AGENT_TEAM_ROSTER.md` and skills.
- Document who owns what in the execution plan.

---

## 4. Concurrent execution — use hardware

- When tasks are **independent** (no shared mutable state or file conflicts), run them **in parallel**:
  - Multiple subagents (e.g. one on tooltips, one on MapModeToolbar).
  - Multiple terminal commands or processes where safe.
- Sequence only when there is a dependency or a single-source-of-truth file.
- Orchestrator identifies which slices can run concurrently and spins them up.

---

## 5. When done: tests and report

- **Run all tests** (`npx tsc --noEmit`, `npx vitest run`, and any project-specific gates e.g. `desktop:map:build`).
- If successful, **create a full report** in a suitable subfolder under `docs/` (e.g. `docs/40_reports/phase_c/` or `docs/40_reports/implemented/`).
- Report contents: what was built, what was refactored, decisions made (and which are flagged for user review), verification evidence, file list.

---

## 6. Update napkin, ledger, and documentation

- **Napkin** (`.claude/napkin.md`): Add any new gotchas, patterns, or user directives discovered during the work.
- **Ledger** (`docs/PROJECT_LEDGER.md`): Append changelog entry(ies) for the work; update thematic knowledge in `docs/PROJECT_LEDGER_KNOWLEDGE.md` if there are reusable decisions/patterns.
- **Canon and technical docs**: Update `context.md`, `CANON.md`, `REPO_MAP.md`, `AWWV_GUI_ARCHITECTURE_REWORK_v2.md` (or equivalent) so the next session sees accurate status and references.

---

## 7. Commit and push

- **Commit** all changes with a clear message (imperative, refs ledger).
- **Push** to the remote so the work is preserved and visible.

---

## 8. Architect oversight

- **Architect** oversees the process. He may make decisions (e.g. component placement, data flow) when blocking would otherwise stall progress.
- Any such decision must be **flagged for later user review** (e.g. in the phase report or a "Decisions for review" section).
- Orchestrator does not override Architect on technical/architectural choices; Orchestrator sets priority and order, Architect ensures coherence.

---

*These are the Pyrrhic rules. Reference this document from `docs/10_canon/context.md` or workflow docs when Orchestrator-led multi-phase execution is in effect.*
