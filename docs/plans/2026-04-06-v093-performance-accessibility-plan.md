# v0.9.3 Performance + Accessibility

**Date:** 2026-04-06  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.9.3  
**Overseer:** Orchestrator  
**Architect:** Technical Architect - keeps performance/accessibility tied to product-truth surfaces  
**Primary implementer roles:** Performance Engineer, Graphics Programmer, UI/UX Developer, Platform Specialist  
**Primary reviewer roles:** QA Engineer, Process QA, Documentation Specialist  
**Sign-off:** Orchestrator, Technical Architect, UI/UX Developer

**Purpose:** Recompose the old deferred performance/accessibility notes into one milestone-grade plan that matches current product architecture and live build warnings.

**Supporting inputs:**
- `docs/plans/2026-03-16-v0.7.0-performance.md`
- `docs/plans/2026-03-16-v0.7.1-accessibility.md`

---

## 0. Scope

### In scope

- turn-time profiling and optimization
- tactical-map chunking / build-warning reduction
- renderer performance and startup profiling
- accessibility baseline:
  - colorblind support
  - keyboard navigation
  - screen-reader/ARIA review
  - text scaling

### Out of scope

- content/balance changes
- cosmetic-only redesign
- speculative micro-optimization without profiling evidence

---

## 1. Deliverables

1. one performance baseline and benchmark artifact
2. one prioritized hot-path optimization pass
3. one map/render/startup performance pass
4. one accessibility baseline and implementation pass
5. one explicit disposition of current build warnings

---

## 2. Pyrrhic Execution Plan

### Phase 1. Performance Baseline
**Assigned to:** Performance Engineer

- [ ] establish turn-time benchmark
- [ ] profile hot simulation paths
- [ ] profile startup and map build/render behavior
- [ ] classify current known warnings:
  - large tactical-map chunk
  - dynamic/static import overlap
  - loaders.gl browser `spawn` warning

### Phase 2. Hot-Path Optimization
**Assigned to:** Performance Engineer + Systems Programmer

- [ ] optimize proven hot paths only
- [ ] preserve determinism
- [ ] measure before/after with the same benchmark harness

### Phase 3. Accessibility Baseline
**Assigned to:** UI/UX Developer

- [ ] keyboard navigation audit
- [ ] ARIA/screen-reader audit
- [ ] text scaling pass
- [ ] colorblind-mode baseline

### Phase 4. Verification
**Assigned to:** QA Engineer

- [ ] targeted perf/accessibility tests where possible
- [ ] benchmark evidence captured
- [ ] full vitest
- [ ] `npx.cmd tsc --noEmit -p tsconfig.json`
- [ ] `npm.cmd run build`

### Phase 5. Documentation
**Assigned to:** Documentation Specialist

- [ ] performance/accessibility report
- [ ] benchmark artifact referenced in docs
- [ ] roadmap status updated if warning classes are retired

---

## 3. Required Outputs

- exact benchmark harness and thresholds
- exact hot-path fixes landed
- exact accessibility baseline landed
- exact build-warning disposition
- exact verification results
