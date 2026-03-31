# v0.8-to-v0.9 Army Commander Maturity

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - may define army-command boundaries and state shape, but must flag architectural calls for user review  
**Primary implementer roles:** Gameplay Programmer, Systems Programmer, Technical Architect, QA Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; Code Review; War-or-Game; Quality Assurance Process  
**Gate:** Starts only after corps commander maturity is credible, operations singularity is no longer in active dispute, and core command-authority cleanup has named the remaining army-layer seams  
**Prerequisites:** `docs/plans/2026-03-31-v081-commander-maturity-plan.md`; `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md`; `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`; current army layer identified as serviceable but under-specified  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, `docs/plans/2026-03-25-command-chain-architecture.md`

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Build on one truthful substrate, not on layered exceptions
- `docs/life_lessons.md`: Decisions without traces are undebuggable
- `docs/life_lessons.md`: Fix the symptom in ALL callers - army and corps layers must agree on ownership

---

## 0. Purpose

Early `v0.8` quite deliberately focuses on corps commanders first.
That does **not** mean the army layer can stay a vague “good enough” shadow forever.

This plan exists to make army command:

- explicit rather than assumed
- structurally coherent with corps command
- believable as a higher-order command layer rather than a grab bag of overrides
- ready for later order interpretation, review UX, and eventual optional LLM extension

The target is not “smart army flavor.”
The target is a real deterministic army-command layer with:

- named responsibilities
- bounded authority
- traceable support / intervention logic
- clear relationship to corps autonomy

---

## 1. Deliverables

- explicit army-command state model and responsibility map
- named army-level decisions separated from corps-level decisions
- army support / intervention / approval rules that no longer depend on inference
- army-command traces sufficient for UI and QA surfaces
- a documented contract for how army command participates in later order interpretation and political/autonomy work

---

## 2. Existing Scaffolding

The repo already has useful partial scaffolding:

- army HQ surfaces in the desktop/UI layer
- existing army-level bot behavior in the older AI stack
- command-chain architecture docs that distinguish political / army / corps roles conceptually
- corps commander maturity work that can become the lower-level substrate

What is missing is not “an army system from zero.”
What is missing is a named, bounded, truthful army-command contract.

---

## 3. Army Command Contract This Plan Must Establish

By the end of this work, the project must be able to answer all of these without hesitation:

1. What does army command decide that corps command does not?
2. When can army command shape, deny, delay, or reinforce a corps choice?
3. When is army command only advisory?
4. What state, memory, and trace data belongs to army command rather than corps command?
5. What UI/report surfaces show army-command reasoning truthfully?

If those answers remain fuzzy, the plan failed.

---

## 4. Pyrrhic Execution Plan

### Phase 1. Inventory Current Army Touchpoints (~1 session)

**Assigned to:** Technical Architect + Gameplay Programmer

- [ ] inventory current army-level decision sites in sim, IPC, and UI docs; scope = analysis + doc references only
- [ ] identify every place where army logic currently approves, overrides, shapes, or shadows corps behavior
- [ ] classify each touchpoint as canonical, transitional, or suspicious overlap
- [ ] record likely owner files and hotspots for later implementation

**Gate:**
- one inventory exists that shows current army-command reality instead of assumed architecture

→ `/simplify` → commit

### Phase 2. Define Army Responsibility Boundaries (~1-2 sessions)

**Assigned to:** Technical Architect + Systems Programmer

- [ ] define army-only decision set: reinforcement, cross-corps prioritization, reserve release, support approval, patron/political translation, corps arbitration
- [ ] define army-not-allowed decision set: direct brigade micromanagement, silent replacement of corps intent, UI-only reinterpretation
- [ ] map each decision type to current or future owning file/module
- [ ] write boundary comments / doc notes naming canonical owner and forbidden duplicate ownership

**Gate:**
- implementers can point to a written army/corps authority split without guessing

→ `/simplify` → commit

### Phase 3. Army State And Memory Design (~1-2 sessions)

**Assigned to:** Systems Programmer + Gameplay Programmer

- [ ] design army-command state additions needed for intervention memory, support confidence, subordinate trust, and cross-corps prioritization
- [ ] separate army beliefs from corps beliefs so the hierarchy is real rather than duplicated
- [ ] define persistence and trace shape for army-command decisions
- [ ] define serialization / replay implications so future implementation does not improvise

**Gate:**
- army-command state contract is explicit and replay-safe on paper

→ `/simplify` → commit

### Phase 4. Army Intervention And Support Rules (~1-2 sessions)

**Assigned to:** Gameplay Programmer + War-or-Game

- [ ] define deterministic rules for army support requests, reserve release, corps deconfliction, and army-level “not now” intervention
- [ ] define when army command may push a corps toward a broader campaign objective
- [ ] define when army command must defer to corps local judgment
- [ ] define failure and friction cases: ignored request, delayed reinforcement, competing corps priorities

**Gate:**
- army command has real levers that are neither omniscient nor decorative

→ `/simplify` → commit

### Phase 5. Army Trace And QA Surface Contract (~1 session)

**Assigned to:** QA Engineer + Documentation Specialist

- [ ] define the minimum structured trace for army-command decisions
- [ ] define how QA should distinguish healthy army guidance from hidden override behavior
- [ ] define sampled scenarios needed later to prove army maturity is real

**Gate:**
- later implementation can be tested for truth instead of vibes

→ `/simplify` → commit

### Phase 6. Roadmap / Plan Integration (~1 session)

**Assigned to:** Product Manager + Documentation Specialist

- [ ] keep `MASTER_ROADMAP.md`, army maturity plan, order-interpretation plan, and autonomy plan aligned
- [ ] document what this plan unblocks and what still remains outside its scope
- [ ] append ledger and knowledge notes when the army-command contract changes materially

**Gate:**
- roadmap no longer treats army maturity as an implicit future understanding

→ `/simplify` → commit

---

## 5. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing hierarchy boundaries are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when roadmap meaning or command hierarchy changes materially
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] engine-touching future execution runs `npx tsc --noEmit`, `npm run test:vitest`, and `npm run desktop:map:build`
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before claiming completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/` when this plan closes

## 6. Completion Checklist

- [ ] army-command responsibilities are explicitly named
- [ ] army/corps authority boundary exists in docs and comments
- [ ] army state / memory / trace contract exists
- [ ] army intervention and support rules are specified
- [ ] roadmap and dependent plans point at the same army maturity contract
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated with recurring army-command lessons
- [ ] implementation report created in `docs/40_reports/implemented/`

---

## 7. Success Criteria

- [ ] An implementer can explain what army command owns that corps command does not
- [ ] A reviewer can tell the difference between army guidance and army override
- [ ] Future order interpretation and autonomy work have a concrete army substrate instead of assumptions
- [ ] The project can add army-level intelligence later without reinventing hierarchy boundaries
