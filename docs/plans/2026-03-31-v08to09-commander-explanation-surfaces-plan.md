# v0.8-to-v0.9 Commander Explanation Surfaces

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** Architect / Technical Architect - may define trace-to-UI contracts, but must flag structural calls for user review  
**Primary implementer roles:** UI/UX Developer, Gameplay Programmer, Documentation Specialist, QA Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; UI Truth Keeper; Modern Wargame Expert; Code Review  
**Gate:** Starts after commander traces are real enough that explanation UI can consume truth rather than invent it  
**Prerequisites:** `docs/plans/2026-03-31-v081-commander-maturity-plan.md`; `docs/plans/2026-03-31-v081-intelligence-assurance-harness-plan.md`; army/corps coherence work explicit enough that explanation surfaces are not masking backend ambiguity  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, current Army HQ / Warroom surfaces

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: UI can lie even when the numbers are correct
- `docs/life_lessons.md`: Explanation should expose real reasons, not theatrical prose
- `docs/life_lessons.md`: Build one truthful surface, not debug-only truth plus player-facing fiction

---

## 0. Purpose

The commander can only feel intelligent to a player if its reasons are legible.

This plan turns raw traces into a truthful explanation layer for:

- Army HQ
- Warroom
- command review panels
- QA / debug surfaces that player UX can build on

The goal is not more flavor text.
The goal is player-visible reasons grounded in real structured traces.

---

## 1. Deliverables

- explanation payload contract from commander traces to UI
- prioritization of what players see vs what remains internal
- Army HQ / Warroom explanation surface specs
- QA checks for explanation truthfulness
- roadmap-ready bridge into order-interpretation and autonomy review UX

---

## 2. Pyrrhic Execution Plan

### Phase 1. Trace Consumer Contract (~1 session)

**Assigned to:** Gameplay Programmer + UI/UX Developer

- [ ] define the minimum trace fields explanation surfaces must consume
- [ ] identify gaps between current trace shape and future UI needs
- [ ] define stable names and meanings for candidate, winner, blocker, lesson, and confidence fields

**Gate:**
- UI does not need to infer semantics from ad hoc trace data

→ `/simplify` → commit

### Phase 2. Surface Taxonomy (~1 session)

**Assigned to:** UI/UX Developer + Documentation Specialist

- [ ] define which explanation surfaces exist: inline tooltip, HQ panel, after-action note, debug view, review modal
- [ ] define the purpose of each surface and the amount of detail it should show
- [ ] explicitly separate player-facing explanation from developer-facing diagnostics without allowing contradiction

**Gate:**
- every explanation surface has a clear job and no invented private logic

→ `/simplify` → commit

### Phase 3. Army HQ / Warroom Specs (~1-2 sessions)

**Assigned to:** UI/UX Developer + Modern Wargame Expert

- [ ] spec Army HQ explanation panels using real commander traces
- [ ] spec Warroom summary surfaces that show command intent, friction, and justification without info overload
- [ ] define visual hierarchy and wording rules that avoid fake certainty

**Gate:**
- implementers can build explanation UI from the spec without inventing their own truth model

→ `/simplify` → commit

### Phase 4. Truthfulness QA Rules (~1 session)

**Assigned to:** QA Engineer + UI Truth Keeper

- [ ] define tests/review checks for “surface matches backend truth”
- [ ] define anti-theater checks for explanation prose that claims more certainty than the trace provides
- [ ] define sample scenarios for validating explanations across success, refusal, delay, and failure

**Gate:**
- explanation surfaces can be validated systematically

→ `/simplify` → commit

### Phase 5. Integration With Review UX And Autonomy (~1 session)

**Assigned to:** Product Manager + UI/UX Developer

- [ ] align explanation surfaces with order review UX requirements
- [ ] align explanation surfaces with API-assisted review / rejection flows
- [ ] update roadmap/plan references if responsibilities change

**Gate:**
- later milestones consume the same explanation contract instead of creating their own

→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing explanation/data contracts are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when explanation truth surfaces materially change
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] engine/UI execution later uses smoke-test triad after each phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] explanation payload contract exists
- [ ] Army HQ / Warroom explanation specs exist
- [ ] truthfulness QA rules exist
- [ ] order-review and autonomy plans point at the same explanation substrate
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] A player-facing surface can explain commander behavior without inventing new logic
- [ ] QA can prove a surface reflects backend truth
- [ ] Explanation is informative without becoming theatrical
