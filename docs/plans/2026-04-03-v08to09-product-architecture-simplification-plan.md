# v0.8-to-v0.9 Product Architecture Simplification - Implementation Plan

**Date:** 2026-04-03  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - owns architecture calls, but any product-shell or state-boundary re-slotting must be flagged for user review  
**Primary implementer roles:** Technical Architect, Systems Programmer, Documentation Specialist, Build Engineer  
**Primary reviewer roles:** Code Simplifier (`/simplify`), Authority Auditor, Determinism Auditor, Quality Assurance Process  
**Prerequisites:** truth-ownership and player-visible-state governance already landed; command-authority cleanup materially advanced  
**Authoring basis:** `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`, `docs/20_engineering/REPO_MAP.md`, `docs/20_engineering/CODE_CANON.md`, `docs/40_reports/audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`

**Relevant life lessons to respect while executing:**
- the scariest files are the ones every fix has to touch
- adapters are where products start lying to themselves
- transitional code with side effects is more dangerous than obviously dead code
- a roadmap can become a bug source if it overstates current truth

---

## 0. Purpose

This plan exists to make the repo feel like one intentional strategy-game product, not a sequence of overlapping eras.

It is not only about code style.
It is about:
- fewer false authorities
- fewer co-equal entrypoints
- fewer “compatibility” layers that still mutate live truth
- simpler, more studio-grade product architecture

---

## 1. Deliverables

- one updated product architecture map naming current authorities, transitional layers, and retirement targets
- one entrypoint simplification pass
- one adapter/boundary simplification pass
- one hotspot decomposition list for giant files or false authority hubs
- one retirement list for legacy files that still look alive

---

## 2. Scope

### In scope

- product-level entrypoints
- shell and desktop boundaries
- adapters / DTOs / payload shapers
- code-canon / repo-map architecture authority docs
- giant files or false-authority hubs repeatedly hit by fixes

### Out of scope

- engine-balance tuning
- cosmetic-only refactors with no ownership or maintainability gain
- speculative subsystem rewrites without a concrete simplification outcome

---

## 3. Canonical Target State

By the end of this lane:

1. Major product concepts have one named owner and one clear entrypoint.
2. Transitional paths are explicitly marked, demoted, or removed.
3. Adapters stop acting like parallel truth owners.
4. Root docs and entrypoints guide implementers toward current architecture authority instead of historical prose.
5. Future Claude work has fewer half-alive layers to get confused by.

---

## 4. Pyrrhic Execution Plan

### Phase 1. Architecture Truth Inventory (~1 session)
**Assigned to:** Technical Architect + Documentation Specialist

- [ ] inventory current product architecture authorities and false-authority hotspots
- [ ] classify each hotspot as:
  - canonical
  - transitional
  - compatibility-only
  - dead
- [ ] identify the top files every new fix keeps touching

**Primary target docs/files:**
- `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/20_engineering/CODE_CANON.md`
- `src/sim/turn_pipeline.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/desktop/*`

**Gate:** the architecture map reflects current reality, not just current aspirations.

→ `/simplify` → commit

### Phase 2. Entrypoint Simplification (~1-2 sessions)
**Assigned to:** Technical Architect + Build Engineer

- [ ] classify all live product entrypoints and variants
- [ ] demote or remove entrypoints that exist only as cognitive ballast
- [ ] make root guidance and startup scripts point to the canonical paths

**Likely targets:**
- `src/index.ts`
- `src/sim/turn_pipeline.ts`
- `src/turn/pipeline.ts`
- `src/sim/run_combat_browser.ts`
- root `README.md` and architecture primers

**Gate:** a new implementer can tell where the real product starts without archaeology.

→ `/simplify` → commit

### Phase 3. Adapter And Boundary Simplification (~1-2 sessions)
**Assigned to:** Systems Programmer + Technical Architect

- [ ] identify DTOs/adapters that still re-derive or reinterpret truth
- [ ] remove or annotate parallel interpretation layers
- [ ] keep player-facing boundaries simple and explicit

**Likely targets:**
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/desktop/preload.cjs`
- `src/desktop/electron-main.cjs`
- `src/ui/map/hooks/useDesktopSession.ts`

**Gate:** adapters shape truth; they do not invent it.

→ `/simplify` → commit

### Phase 4. Hotspot Decomposition (~1-2 sessions)
**Assigned to:** Technical Architect + Code Simplifier

- [ ] identify giant or repeatedly-touched files that should be decomposed
- [ ] split only where ownership and maintainability clearly improve
- [ ] annotate remaining hotspots with sharper ownership comments

**Likely candidates:**
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/App.tsx`
- `src/sim/combat/brigade_assignment.ts`
- `src/sim/turn_phases/war_phases.ts`

**Gate:** hotspot files are either simpler or more honestly owned.

→ `/simplify` → commit

### Phase 5. Legacy-Looking But Live Surface Triage (~1 session)
**Assigned to:** Technical Architect + Documentation Specialist

- [ ] audit files that still look alive despite being legacy/transitional
- [ ] explicitly retire or demote the ones that should no longer mislead future agents
- [ ] preserve the few that are still intentional compatibility surfaces

**Gate:** “looks alive” no longer means “probably canonical.”

→ `/simplify` → commit

---

## 5. File Targets

High-probability files for this plan:
- `docs/20_engineering/PRODUCT_ARCHITECTURE_AUTHORITY.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/20_engineering/CODE_CANON.md`
- `src/index.ts`
- `src/sim/turn_pipeline.ts`
- `src/turn/pipeline.ts`
- `src/sim/run_combat_browser.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`
- `src/desktop/preload.cjs`
- `src/desktop/electron-main.cjs`
- root guidance docs that still overclaim current authority

---

## 6. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] architecture re-slotting is flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when architecture authority changes materially
- [ ] `/simplify` runs between phases
- [ ] one logical phase per commit
- [ ] any giant-file decomposition includes ownership comments and proof of improved clarity

---

## 7. Completion Checklist

- [ ] architecture truth inventory exists
- [ ] entrypoint simplification executed
- [ ] adapter/boundary simplification executed
- [ ] hotspot decomposition list applied or annotated
- [ ] legacy-looking live surfaces triaged
- [ ] docs/ledger updated

---

## 8. Feature Done Means

Canonical owner:
- product architecture authority docs and canonical entrypoints own the repo’s top-level shape.

Demoted path:
- false co-equal entrypoints, misleading adapters, and historical root docs are removed, marked transitional, or explicitly demoted.

Player-visible truth:
- the player-facing product becomes more coherent because the underlying shells, boundaries, and entrypoints stop fighting each other.

Canonical UI surface:
- Warroom / Tactical Map / Army HQ / Chronicle / Codex follow the shell hierarchy instead of each accumulating private architecture.

Done means:
- implementers can identify the live entrypoints and architecture authorities quickly, repeated fixes stop clustering around the same misleading hubs, and the repo no longer keeps “looks alive” false-authority paths unmarked.
