# v0.9.5 Platform Packaging + Store

**Date:** 2026-04-06  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.9.5  
**Overseer:** Orchestrator  
**Architect:** Technical Architect - ensures packaging follows real platform/state ownership and save-path truth  
**Primary implementer roles:** Build Engineer, Platform Specialist, Documentation Specialist  
**Primary reviewer roles:** QA Engineer, Process QA  
**Sign-off:** Orchestrator, Build Engineer, Platform Specialist

**Purpose:** Replace the older packaging note with a milestone-grade plan aligned to the real shipping target: reproducible installers, platform-specific save/update behavior, and store/distribution readiness.

**Supporting input:**
- `docs/plans/2026-03-16-v0.8.2-platform-packaging.md`

---

## 0. Scope

### In scope

- Windows installer and update path
- macOS universal/notarized package
- Linux package
- store/distribution readiness
- Steam integration if still product-approved

### Out of scope

- pre-feature-freeze packaging experiments
- platform-specific feature branches unrelated to packaging

---

## 1. Deliverables

1. one reproducible Windows installer path
2. one reproducible macOS package path
3. one reproducible Linux package path
4. one store/distribution readiness checklist
5. one save/update/platform-behavior verification matrix

---

## 2. Pyrrhic Execution Plan

### Phase 1. Packaging Baseline
**Assigned to:** Build Engineer

- [ ] verify current Electron/build layout against packaging needs
- [ ] define canonical packaging config owner
- [ ] define artifact names and output paths

### Phase 2. Desktop Packaging
**Assigned to:** Build Engineer + Platform Specialist

- [ ] Windows installer
- [ ] macOS package/notarization path
- [ ] Linux package path

### Phase 3. Update and Store Readiness
**Assigned to:** Platform Specialist

- [ ] update strategy
- [ ] save-path verification by platform
- [ ] store/distribution checklist
- [ ] Steam integration decision and scope confirmation

### Phase 4. Verification
**Assigned to:** QA Engineer

- [ ] install → launch → play → save/load verification per platform
- [ ] `npm.cmd run build`
- [ ] packaging artifact validation

### Phase 5. Documentation
**Assigned to:** Documentation Specialist

- [ ] shipping/packaging report
- [ ] platform support matrix
- [ ] roadmap status update

---

## 3. Required Outputs

- exact packaging targets landed
- exact platform readiness matrix
- exact update/store stance
- exact verification results
