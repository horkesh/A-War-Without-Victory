# v0.8-to-v0.9 Save/Load And Replay Hardening

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** Systems Programmer / Technical Architect - may define serialization and migration contracts, but must flag structural changes for user review  
**Primary implementer roles:** Systems Programmer, Scenario Harness Engineer, QA Engineer, Platform Specialist  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; Determinism Auditor; Code Review; Quality Assurance Process  
**Gate:** Starts before any autonomy or pre-gold work that depends on replay truth, desktop saves, or schema evolution being trustworthy  
**Prerequisites:** current save/load docs, decision-log work, and scenario harness contracts are in place; desktop save/load still recognized as partial  
**Authoring basis:** `MASTER_ROADMAP.md`, `PIPELINE_ENTRYPOINTS.md`, `REPO_MAP.md`, existing serialization and replay contracts

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Determinism is sacred
- `docs/life_lessons.md`: Replay truth beats live reconstruction
- `docs/life_lessons.md`: Save/load gaps become gold blockers when ignored

---

## 0. Purpose

This plan turns save/load and replay from “mostly works” into a ship-grade contract.

It exists because too many later milestones assume:
- commander state survives round-trip
- autonomy logs replay cleanly
- desktop saves are trustworthy
- schema growth will not silently corrupt runs

If that is not made explicit, `v0.8.4` and `v1.0` will be built on sand.

---

## 1. Deliverables

- explicit save/load ownership matrix
- desktop save/load hardening plan
- replay contract for commander and autonomy traces
- migration/versioning rules for new state fields
- deterministic QA matrix for round-trip and replay

---

## 2. Pyrrhic Execution Plan

### Phase 1. Current Contract Inventory (~1 session)
**Assigned to:** Systems Programmer + Scenario Harness Engineer
- [ ] inventory current save, load, replay, and serializer entrypoints
- [ ] identify which state families are already round-tripped and which are still partial on desktop
- [ ] identify command-chain/autonomy fields most likely to break replay or migration
**Gate:** one truthful inventory exists
→ `/simplify` → commit

### Phase 2. Ownership And Schema Rules (~1 session)
**Assigned to:** Systems Programmer + Technical Architect
- [ ] define canonical owners for save serialization, replay logs, and migration/version checks
- [ ] define rules for adding commander, army, and autonomy state without silent save drift
- [ ] define compatibility posture: strict fail, migrate, or recompute
**Gate:** new state can no longer be added casually
→ `/simplify` → commit

### Phase 3. Desktop Save/Load Hardening Plan (~1-2 sessions)
**Assigned to:** Platform Specialist + Systems Programmer
- [ ] identify desktop-specific gaps vs headless path
- [ ] define fix list for IPC, file dialogs, schema checks, and post-load reconstruction
- [ ] define user-visible failure behavior for incompatible saves
**Gate:** desktop is no longer the vague weaker cousin of headless
→ `/simplify` → commit

### Phase 4. Replay Truth Contract (~1-2 sessions)
**Assigned to:** Scenario Harness Engineer + Determinism Auditor
- [ ] define replay contract for commander traces, AI decision logs, event decisions, and post-run review surfaces
- [ ] define what must come from persisted logs vs recomputation
- [ ] define replay acceptance tests
**Gate:** replay is a product feature, not a debug accident
→ `/simplify` → commit

### Phase 5. QA Matrix And Roadmap Integration (~1 session)
**Assigned to:** QA Engineer + Documentation Specialist
- [ ] define round-trip, reload, and replay tests
- [ ] align roadmap and linked plans with the hardening gate
- [ ] append ledger/knowledge notes for recurring save/load lessons
**Gate:** later milestones can reference a real hardening lane
→ `/simplify` → commit

---

## 3. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions changing schema or replay contracts are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when contracts materially change
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] future execution runs `npx tsc --noEmit`, `npm run test:vitest`, and relevant replay/load tests
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

## 4. Completion Checklist

- [ ] save/load ownership matrix exists
- [ ] desktop hardening plan exists
- [ ] replay truth contract exists
- [ ] schema/migration rules exist
- [ ] QA matrix exists
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated
- [ ] implementation report created

---

## 5. Success Criteria

- [ ] later command-chain milestones can point to a real save/replay substrate
- [ ] desktop save/load is no longer roadmap-implicit debt
- [ ] replay determinism has an explicit owner and test surface
