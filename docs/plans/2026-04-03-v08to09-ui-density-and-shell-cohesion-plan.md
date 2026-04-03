# v0.8-to-v0.9 UI Density And Shell Cohesion - Implementation Plan

**Date:** 2026-04-03  
**Status:** PLAN - READY FOR EXECUTION WHEN SIMPLIFICATION BAND OPENS  
**Roadmap slot:** v0.8-to-v0.9  
**Overseer:** Orchestrator  
**Architect:** UI/UX Developer / Modern Wargame Expert - may define density and shell-cohesion rules, but major hierarchy changes must be flagged for user review  
**Primary implementer roles:** UI/UX Developer, Modern Wargame Expert, Technical Architect, Documentation Specialist  
**Primary reviewer roles:** Code Simplifier (`/simplify`), UI Truth Keeper, Product Manager, Quality Assurance Process  
**Prerequisites:** player-truth leaks no longer actively fighting the UI; shell hierarchy docs are canonical  
**Authoring basis:** `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`, `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`, `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/implemented/20260326_UI_BLANK_SPACE_REMEDIATION_PLAN.md`, `docs/40_reports/implemented/20260402_COMMAND_SHELL_DENSITY_PASS.md`

**Relevant life lessons to respect while executing:**
- the renderer migration is never just visual
- a strategy game fails as a product before it fails as a simulation
- one shell should own one job; spacing should reinforce that, not blur it

---

## 0. Purpose

The product is becoming more truthful, but several shells still waste space, duplicate hierarchy, or feel like different UI eras stitched together.

This plan is not “make it prettier.”
It is:
- remove dead air
- tighten information hierarchy
- make Warroom, Tactical Map, Army HQ, Chronicle, and Codex feel like one strategy product
- ensure spacing and panel structure reinforce the shell hierarchy instead of fighting it

---

## 1. Deliverables

- one density audit across all major shells
- one shell-cohesion pass for spacing, panel hierarchy, and visual rhythm
- one component-level spacing/token guidance for shared shell primitives
- one rule set for when to use modal, panel, rail, or handoff instead of inventing another container
- one regression/smoke pass proving the product still reads clearly after density tightening

---

## 2. Scope

### In scope

- Warroom
- Tactical Map top shell and side rails
- Army HQ modal and major tabs
- Chronicle shell
- Codex panel
- shared panel/toolbar/rail primitives

### Out of scope

- wholesale art-direction rebrand
- major new features
- hiding important explanation or review detail purely to gain compactness
- late visual-polish legendary features (`v0.9.4`)

---

## 3. Canonical Target State

By the end of this lane:

1. No major shell wastes large blank regions without intentional purpose.
2. Shared panel and shell primitives use a consistent density language.
3. Warroom, Tactical Map, Army HQ, Chronicle, and Codex feel related, not like five separate UI generations.
4. The layout hierarchy reinforces shell ownership rather than duplicating it.
5. The player can see more of the meaningful game with less dead air and less panel friction.

---

## 4. Pyrrhic Execution Plan

### Phase 1. Density Inventory (~1 session)
**Assigned to:** UI/UX Developer + Documentation Specialist

- [ ] capture density and blank-space pain points across all primary shells
- [ ] classify each as:
  - wasted blank space
  - weak hierarchy
  - oversized wrapper
  - duplicate shell chrome
  - legitimate breathing room
- [ ] identify the shared components causing repeated spacing bloat

**Primary target files:**
- `src/ui/warroom/warroom.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/TopToolbar.tsx`
- `src/ui/map/components/OOBSidebar.tsx`
- `src/ui/map/components/GlassPanel.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/CodexPanel.tsx`
- `src/ui/map/components/chronicle/*`

**Gate:** one truthful inventory exists; we know where density debt lives.

→ `/simplify` → commit

### Phase 2. Shared Primitive Tightening (~1-2 sessions)
**Assigned to:** UI/UX Developer + Technical Architect

- [ ] define canonical spacing rules for shared shell primitives
- [ ] tighten panel padding, header chrome, rail spacing, and modal shells
- [ ] remove dead wrapper layers that exist only to maintain an older visual era

**Primary target files:**
- `src/ui/map/components/GlassPanel.tsx`
- `src/ui/map/components/panelRail.ts`
- `src/ui/map/components/TopToolbar.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/OOBSidebar.tsx`

**Gate:** shared primitives stop reintroducing blank-space debt in every shell.

→ `/simplify` → commit

### Phase 3. Shell Cohesion Pass (~1-2 sessions)
**Assigned to:** UI/UX Developer + Modern Wargame Expert

- [ ] align Warroom, Tactical Map, Army HQ, Chronicle, and Codex around one density language
- [ ] remove shell-specific “historical residue” wrappers that no longer serve product clarity
- [ ] make handoff destinations feel like siblings in one product

**Primary target files:**
- `src/ui/warroom/warroom.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/CodexPanel.tsx`
- `src/ui/map/components/chronicle/*`

**Gate:** shell transitions feel intentional instead of visually disjoint.

→ `/simplify` → commit

### Phase 4. Content Hierarchy And Legibility (~1 session)
**Assigned to:** UI/UX Developer + Modern Wargame Expert

- [ ] tighten hierarchy so high-value information wins space over decorative chrome
- [ ] verify command review, threat, records, and tactical context do not become harder to read when compacted
- [ ] keep “player-safe truth” visible while reducing clutter

**Gate:** compactness improves comprehension instead of hurting it.

→ `/simplify` → commit

### Phase 5. UX Regression Pass (~1 session)
**Assigned to:** QA Engineer + UI Truth Keeper

- [ ] run focused UI smoke checks across all shells
- [ ] verify standalone tactical map, Warroom return path, Codex access, and Army HQ command review still read clearly
- [ ] capture before/after screenshots or notes for the report

**Gate:** density cleanup is proven, not just asserted.

→ `/simplify` → commit

---

## 5. File Targets

High-probability files for this plan:
- `src/ui/warroom/warroom.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/TopToolbar.tsx`
- `src/ui/map/components/OOBSidebar.tsx`
- `src/ui/map/components/GlassPanel.tsx`
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/CodexPanel.tsx`
- `src/ui/map/components/chronicle/*`
- shared CSS/tailwind tokens used by those surfaces

---

## 6. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] shell-hierarchy changes are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when shell density/cohesion changes materially
- [ ] `/simplify` runs between phases
- [ ] one logical phase per commit
- [ ] visual verification accompanies implementation

---

## 7. Completion Checklist

- [ ] density inventory exists
- [ ] shared primitive spacing rules applied
- [ ] shell cohesion pass executed
- [ ] content hierarchy verified
- [ ] visual/report evidence recorded
- [ ] docs/ledger updated

---

## 8. Feature Done Means

Canonical owner:
- the product shell hierarchy owns high-level layout behavior; shared shell primitives own density rules.

Demoted path:
- shell-specific spacing residue, duplicate wrapper chrome, and older visual-era container habits are removed or reduced.

Player-visible truth:
- the player sees the same information more clearly and with less wasted space; density changes do not hide command/review truth.

Canonical UI surface:
- Warroom, Tactical Map, Army HQ, Chronicle, and Codex each keep their owned role while sharing one cohesive density language.

Done means:
- focused shell smoke checks pass, before/after evidence shows reduced dead space, and no major shell still looks like an out-of-family UI era.

