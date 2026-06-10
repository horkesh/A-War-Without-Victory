# Pyrrhic Process Rules

> Canonical source for all Pyrrhic team process rules. Referenced by all planning skills,
> execution skills, and Process QA. If a rule is not here, it is not enforced.
>
> Last updated: 2026-03-20

---

## 1. Session Startup (BEFORE any work)

1. Read `.claude/napkin.md` — curate on read (re-prioritize, merge dupes, cap 10/category).
2. Read `docs/PROJECT_LEDGER.md` (latest 80 lines — current state).
3. Read `docs/life_lessons.md` — scan active lessons, flag any relevant to current task.
4. If `working-on.md` exists at project root, read it (interrupted task from previous session). Delete after reading.
5. Check crons via `CronList` — reschedule if missing (two required: Daily Standup, Life Lessons Review).

---

## 2. Planning Rules

Every plan (whether written via `/awwv-plan-change`, `/writing-plans`, or ad-hoc) MUST include:

### 2.1 Structure
- **Phases** — discrete, sequential deliverables. One phase = one shippable increment.
- **Done gate** per phase — concrete, testable criteria. Not "it works" but "X displays Y, Z test passes."
- **Deliverables** per phase — explicit file list or component list.

### 2.2 Role Assignments
Every phase MUST specify:

| Field | Required |
|-------|----------|
| **Implementer** | Which Pyrrhic role(s) write the code |
| **Reviewer** | Which skill reviews (always `/simplify` minimum; `/code-review` for non-trivial) |
| **Sign-off** | Who approves phase completion (Orchestrator minimum; add `/war-or-game` if engine-touching) |

### 2.3 Architectural Decision Flags
`/architect` MUST flag decisions for documentation when a phase introduces:
- New state fields (gameStore, GameState)
- New IPC channels
- New component directories
- New design-system tokens
- Changes to data flow or event propagation

Flag = note in commit message + propagate to `docs/20_engineering/REPO_MAP.md` or relevant engineering doc.

### 2.4 Post-Phase Discipline Block
Every phase MUST end with this 7-step block. No exceptions. No shortcuts.

```
1. /simplify — review changed code for reuse, quality, efficiency. Fix issues.
2. Smoke-test triad: `npx tsc --noEmit` ; `npm run test:vitest` ; `npm run desktop:map:build`
3. /verification-before-completion — run verification, confirm output. Evidence before assertions.
4. /pre-commit-check — canon, determinism, ordering, tests, ledger, life lessons.
5. Commit with descriptive message.
6. Documentation:
   a. Behavioral/output changes → append to docs/PROJECT_LEDGER.md
   b. Thematic knowledge → append to docs/PROJECT_LEDGER_KNOWLEDGE.md
   c. Update .claude/napkin.md (current state + backlog)
   d. Update working-on.md (progress snapshot for session continuity)
7. Canon propagation (if applicable):
   a. New IPC → Systems Manual
   b. New state fields → REPO_MAP
   c. New components → GUI_MASTER, REPO_MAP
   d. /canon-compliance-review if gameplay mechanics or state schemas changed
```

### 2.5 Special Triggers
- **Engine-touching phases** (IPC handlers, pipeline steps, state mutations): `/war-or-game` sign-off mandatory (napkin §Execution #2).
- **New IPC channels**: `/architect` ADR + Systems Manual propagation.
- **After final phase of a major feature**: `/create-report` → `docs/40_reports/`.
- **Multi-session plans**: Write `working-on.md` at session end. Read and delete at next session start.

### 2.6 Life Lessons Scan
Before starting each phase, scan `docs/life_lessons.md` for lessons relevant to the phase's work area. Document which lessons apply in the plan. If about to violate an active lesson, STOP and flag it.

### 2.7 Scope Discipline
- **No scope creep within a phase.** Discoveries during implementation go on the napkin backlog, not into the current phase.
- **Product Manager is the scope gatekeeper.** Orchestrator sets direction; PM cuts scope.
- **One change per calibration run** (napkin §Execution #3). Never bundle engine changes.

---

## 3. Execution Rules

### 3.1 Orchestrator Authority
- `/orchestrator` owns big-picture direction and team coordination.
- Convenes Pyrrhic team at phase boundaries (brief alignment, not full standup).
- Resolves cross-role conflicts.
- Documents team decisions in ledger or reports.

### 3.2 Process QA
- Process QA (`/quality-assurance-process`) validates that roles followed process.
- Invoke after significant handoffs, after Orchestrator/PM execution, or before merge.
- Checklist: context read, ledger updated, napkin read, commit discipline, FORAWWV untouched, canon/determinism considered.

### 3.3 Sacred Rules (from CLAUDE.md — always enforced)
- **Determinism is sacred**: No `Math.random()`, no timestamps, no `Date.now()` in sim code.
- **NEVER override initial OSIDs**: Fix engine/OOB/operations/scenario params instead.
- **NEVER use `avoided_osids_by_faction`**: Banned.
- **Canon hierarchy**: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible > context.md
- **Ops-only attacks**: Brigades NEVER attack independently.
- **One change per calibration run**: Change ONE thing, run scenario, compare, sign off.
- **GameState is single source of truth**: `src/state/game_state.ts`.
- **FORAWWV.md / canon edits require Pyrrhic-panel sign-off**: convene the appropriate panel; unanimous GO = signature; BLOCK or split surfaces to the owner; implementer ≠ reviewer.

### 3.4 Commit Discipline
- One commit per phase (or per logical unit within a phase).
- No multi-phase commits without explicit Orchestrator approval.
- Engine files (`src/sim/`, `src/state/`, IPC) and pure UI in SEPARATE commits.
- Descriptive messages following repo conventions.

### 3.5 GUI Rules (from /pre-commit-check)
- **No raw engine values displayed to player.** Use presentation layer: `Math.round()`, `.toFixed()`, `.toLocaleString()`, pips, labels, archetypes.
- **Update master docs during session.** If constants or GUI changed, update `CALIBRATION_MASTER.md` or `GUI_MASTER.md`.

---

## 4. Enforcement

### 4.1 Automatic Enforcement Points
These skills MUST check this document's rules when invoked:

| Skill | What it checks |
|-------|---------------|
| `/awwv-plan-change` | §2 Planning Rules (structure, roles, post-phase block, life lessons) |
| `/writing-plans` | §2 Planning Rules |
| `/executing-plans` | §2.4 Post-Phase Discipline per phase |
| `/awwv-pre-commit-check` | §2.4 steps 2-7, §3.3 Sacred Rules, §3.5 GUI Rules |
| `/quality-assurance-process` | §2 (was process followed?), §3.2 checklist |
| `/simplify` | §2.4 step 1 |
| `/verification-before-completion` | §2.4 step 3 |
| `/finishing-a-development-branch` | §2.4 full block, §2.5 special triggers |
| `/orchestrator` | §3.1 Authority, §2.2 Role Assignments at phase boundaries |
| `/create-report` | §2.5 after final phase |

### 4.2 Plan Validation Gate
Before any plan is approved for execution, it MUST pass this checklist:

- [ ] Every phase has a done gate
- [ ] Every phase has implementer, reviewer, sign-off assigned
- [ ] Post-phase discipline block is included (not abbreviated)
- [ ] Relevant life lessons are listed
- [ ] `/architect` flags are identified for phases with new state/IPC/components
- [ ] Engine-touching phases have `/war-or-game` sign-off scheduled
- [ ] Scope creep rule is stated
- [ ] `/create-report` is scheduled after the final phase (for major features)

If a plan fails this gate, it goes back to the author for remediation before execution begins.

---

## 5. Where Rules Live

| Document | What it contains | Authority |
|----------|-----------------|-----------|
| **This file** (`PYRRHIC_PROCESS_RULES.md`) | All process rules, consolidated | Canonical source |
| `CLAUDE.md` | Sacred rules, key commands, architecture pointers | Project instructions |
| `.claude/napkin.md` | Current state, session startup, execution patterns | Runbook (curated per session) |
| `docs/life_lessons.md` | Hard-won development rules from past violations | Enforcement via pre-commit |
| `docs/10_canon/context.md` | Ledger structure, canon hierarchy | Canon authority |
| `.claude/skills/quality-assurance-process/SKILL.md` | Process QA checklist | Validation authority |
| `.claude/skills/awwv-pre-commit-check/SKILL.md` | Pre-commit checklist | Commit gate |

If rules conflict, this file takes precedence for process. `CLAUDE.md` takes precedence for sacred/architectural rules. `docs/10_canon/` takes precedence for canon.
