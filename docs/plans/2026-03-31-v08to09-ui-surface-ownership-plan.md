# v0.8-to-v0.9 UI Surface Ownership Matrix

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** Architect / Technical Architect - may define canonical UI ownership, but must flag cross-surface decisions for user review  
**Primary implementer roles:** UI/UX Developer, Technical Architect, Documentation Specialist, Modern Wargame Expert  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; UI Truth Keeper; Modern Wargame Expert; Quality Assurance Process  
**Gate:** Starts before command review, explanation surfaces, and autonomy controls are implemented in multiple places  
**Prerequisites:** current Army HQ, Warroom, map panels, and ops modal inventory exists; backend authority lanes are becoming explicit  
**Authoring basis:** `MASTER_ROADMAP.md`, `REPO_MAP.md`, GUI architecture docs, `20260330_REPO_HEALTH_CONSOLIDATED.md`

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: UI can lie even when the code “works”
- `docs/life_lessons.md`: one surface should own one truth
- `docs/life_lessons.md`: duplicate half-UIs are architecture debt wearing makeup

---

## 0. Purpose

Army HQ, Warroom, map sidebars, ops modal, and future command review panels are all alive.

That is fine.
What is not fine is letting all of them “kind of” own the same command truth.

This plan defines which surface is canonical for which job.

---

## 1. Deliverables

- UI ownership matrix for command, review, explanation, ops, and autonomy surfaces
- canonical-vs-secondary rules for Army HQ / Warroom / map panels / modal flows
- anti-duplication rules for future features
- roadmap integration so later milestone plans stop assuming the UI will sort itself out
- Primary file families this plan must touch or explicitly classify:
  - `src/ui/warroom/*`
  - `src/ui/map/App.tsx`
  - `src/ui/map/components/PresidentialToolbar.tsx`
  - `src/ui/map/components/TopToolbar.tsx`
  - `src/ui/map/components/OperationsPanel.tsx`
  - `src/ui/map/components/army_hq/*`
  - `src/ui/map/components/chronicle/*`
  - `src/ui/map/components/CodexPanel.tsx`
  - `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`
  - `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`

---

## 2. Pyrrhic Execution Plan

### Phase 1. Surface Inventory (~1 session)
**Assigned to:** UI/UX Developer + Documentation Specialist
- [ ] inventory all live command-facing UI surfaces
- [ ] classify each as canonical, secondary, legacy, or debug-only
- [ ] note where the same concept appears in multiple places today
**Gate:** one truthful surface inventory exists
→ `/simplify` → commit

### Phase 2. Ownership Matrix (~1 session)
**Assigned to:** Architect + UI/UX Developer
- [ ] assign canonical surfaces for operations, commander explanations, order review, autonomy controls, and after-action summaries
- [ ] define which surfaces may summarize but not own
- [ ] define which surfaces must never become independent logic owners
**Gate:** each concept has one UI owner
→ `/simplify` → commit

### Phase 3. Integration Rules (~1 session)
**Assigned to:** Technical Architect + UI Truth Keeper
- [ ] define rules for shared components vs duplicated views
- [ ] define how trace-driven surfaces stay truthful across multiple UIs
- [ ] define what gets removed or demoted when a canonical surface is chosen
**Gate:** later UI work has explicit anti-duplication rules
→ `/simplify` → commit

### Phase 4. Roadmap / Plan Propagation (~1 session)
**Assigned to:** Documentation Specialist + Product Manager
- [ ] align roadmap, command review UX, explanation surfaces, and autonomy plans with the ownership matrix
- [ ] append ledger/knowledge notes for the canonical-surface rule
**Gate:** roadmap no longer handwaves multi-surface ownership
→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing canonical UI ownership are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when canonical UI ownership changes
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future execution runs relevant UI validation after each phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] surface inventory exists
- [ ] ownership matrix exists
- [ ] integration rules exist
- [ ] roadmap and dependent plans aligned
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] no major command concept is owned by multiple UIs without an explicit hierarchy
- [ ] later UX plans can point to a canonical surface instead of inventing one

---

## 6. Feature Done Means

**Canonical owner:** `docs/20_engineering/UI_OWNERSHIP_MATRIX.md` plus canonical shell/product docs  
**Demoted path:** duplicate half-owners, summary surfaces acting like primary owners, hidden shell-local review flows  
**Player-visible truth:** the player can tell which screen owns campaign shell, battlespace, command review, records, memory, and reference  
**Canonical UI surface:** Warroom, Tactical Map, Army HQ, Chronicle, and Codex each keep one explicit owned role  
**Done means:** every major concept names one canonical surface, linked docs agree, and later feature plans can point to one owner instead of inventing one
