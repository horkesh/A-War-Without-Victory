# v0.9.4 Visual Polish + Legendary Map Features

**Date:** 2026-04-06  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.9.4  
**Overseer:** Orchestrator  
**Architect:** Technical Architect - ensures polish follows settled ownership, not split truth  
**Primary implementer roles:** UI/UX Developer, Graphics Programmer, Platform Specialist  
**Primary reviewer roles:** Game Designer, QA Engineer, Documentation Specialist, Process QA  
**Sign-off:** Orchestrator, UI/UX Developer, Technical Architect

**Purpose:** Replace the old deferred visual-polish note with a milestone plan aligned to current repo truth. Ghost Map and Exhaustion Clock are already live; this milestone covers the remaining visual polish and the still-open legendary map features.

**Supporting inputs:**
- `docs/plans/2026-03-16-v0.7.3-visual-polish.md`
- `docs/plans/2026-03-25-ghost-map-exhaustion-clock-spec.md`

---

## 0. Scope

### In scope

- loading / transition polish
- visual consistency and icon/state polish
- warroom shell polish and archival-art finalization
- Map That Scars
- Refugee Column
- Corridor Heartbeat
- remaining terrain/friction visualization that is still open

### Out of scope

- features already implemented:
  - Ghost Map
  - Exhaustion Clock
- operations UX authority cleanup
- accessibility baseline work owned by `v0.9.3`

---

## 1. Deliverables

1. one visual-polish pass on shell transitions and loading
2. one icon / status / archive-art consistency pass
3. one `Map That Scars` implementation
4. one `Refugee Column` implementation
5. one `Corridor Heartbeat` implementation

---

## 2. Pyrrhic Execution Plan

### Phase 1. Shell and Transition Polish
**Assigned to:** UI/UX Developer

- [ ] loading and transition polish
- [ ] shell cohesion review
- [ ] map-mode and panel transition consistency

### Phase 2. Visual Consistency
**Assigned to:** UI/UX Developer + Graphics Programmer

- [ ] iconography and status consistency pass
- [ ] warroom art finalization
- [ ] remaining terrain/friction visualization alignment

### Phase 3. Legendary Map Features
**Assigned to:** Graphics Programmer

- [ ] `Map That Scars`
- [ ] `Refugee Column`
- [ ] `Corridor Heartbeat`

### Phase 4. Verification
**Assigned to:** QA Engineer

- [ ] visual regression review
- [ ] targeted tests where possible
- [ ] `npx.cmd tsc --noEmit -p tsconfig.json`
- [ ] `npm.cmd run build`

### Phase 5. Documentation
**Assigned to:** Documentation Specialist

- [ ] implementation report
- [ ] roadmap references updated so already-live visual systems are not re-listed as future deliverables

---

## 3. Required Outputs

- exact visual-polish surfaces landed
- exact legendary map features landed
- exact tests/evidence produced
- exact verification results
