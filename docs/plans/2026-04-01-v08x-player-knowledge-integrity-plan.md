# v0.8.x-final - Player Knowledge Integrity - Implementation Plan

**Date:** 2026-04-01  
**Status:** PLAN - READY FOR EXECUTION  
**Roadmap slot:** v0.8.x-final (with immediate v0.8.0.x hotfix lane for worst live leaks)  
**Overseer:** Orchestrator  
**Architect:** Architect / Technical Architect - may define the player-facing state boundary and safe-vs-debug contracts, but any cross-surface ownership decision must be flagged for user review  
**Primary implementer roles:** Technical Architect, UI/UX Developer, Systems Programmer, Documentation Specialist, QA Engineer  
**Primary reviewer roles:** UI Truth Keeper, Authority Auditor, Modern Wargame Expert, Quality Assurance Process  
**Prerequisites:** desktop / map leak audit completed; `MASTER_ROADMAP.md` governs sequencing; `v0.8.x-final` command-authority cleanup lane is active  
**Authoring basis:** `docs/plans/MASTER_ROADMAP.md`, `docs/40_reports/GUI_MASTER.md`, `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`, desktop player-knowledge leak audit (2026-04-01)

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: UI can lie even when the code "works"
- `docs/life_lessons.md`: one surface should own one truth
- `docs/life_lessons.md`: flexibility is often unresolved architecture wearing makeup

---

## 0. Purpose

The current desktop / tactical-map stack still behaves like an omniscient staff debugger in too many places:

- the renderer receives near-full game truth
- fog is treated as a visual overlay instead of an information boundary
- several panels render enemy or internal state directly
- raw internal ids leak into player-facing text
- standalone tactical map lacks a truthful return path to Warroom
- Codex exists but its primary affordance is weak or hidden

This plan turns that audit into owned implementation work.

The governing principle is simple:

**The player must receive a player-facing state, not a prettified copy of the full simulation state.**

---

## 1. Deliverables

- one explicit player-facing knowledge contract
- one canonical player-scoped renderer state boundary for desktop / tactical map
- one classification system for UI surfaces:
  - `player-safe`
  - `staff abstraction`
  - `debug-only`
- one repo-wide display-name rule forbidding raw sim ids in player-facing UI
- one desktop navigation contract for Warroom, tactical map, and Codex
- one leak-harness / regression suite proving the client is no longer omniscient by accident

---

## 2. Scope

### In scope

- Electron payload boundary
- renderer adapter redaction / shaping
- tactical map formation / sector / operation visibility contracts
- operations, threat, settlement, tooltip, and personnel surfaces
- raw id cleanup in player-facing UI
- standalone tactical-map return-to-Warroom affordance
- visible Codex entrypoint restoration
- test / audit harnesses that prove knowledge integrity

### Out of scope

- changing actual simulation truth for AI or engine systems
- rewriting fog-of-war mechanics from scratch
- redesigning all command UX aesthetics
- post-v0.8 political / LLM autonomy surfaces except where they depend on this contract

---

## 3. Canonical Target State

By the end of this lane:

1. The renderer does **not** receive near-full omniscient state by default.
2. Enemy formations, operations, sectors, officer details, and internal ids are only exposed if the player-facing contract explicitly allows them.
3. Every UI surface is classified as player-safe, staff abstraction, or debug-only.
4. Raw ids like `arbih_3rd_corps`, `axis_1`, raw `sector_id`, raw `assigned_corps_id`, and similar backend strings are banned from normal player-facing rendering.
5. Tactical map has an explicit, visible return path to Warroom in standalone desktop use.
6. Codex has a visible top-level affordance again.
7. Leak tests fail loudly if a future change reintroduces omniscient payloads or raw-id rendering.

---

## 4. Execution Plan

### Phase 1. Player Knowledge Contract (~1 session)
**Assigned to:** Technical Architect + Documentation Specialist

- [ ] Write a short engineering contract that defines what the player may know, what the renderer may receive, and what belongs in `player-safe`, `staff abstraction`, and `debug-only` classes.
- [ ] Inventory the current high-risk desktop payload paths:
  - `src/desktop/preload.cjs`
  - `src/desktop/electron-main.cjs`
  - `src/ui/map/hooks/useDesktopSession.ts`
  - `src/ui/map/data/GameStateAdapter.ts`
  - `src/ui/map/data/types.ts`
- [ ] Name the canonical player-facing boundary object that should replace "full state plus fog".
- [ ] Record the immediate v0.8.0.x hotfix targets for worst live leaks so they can be fixed before the full boundary refactor lands.

**Gate:** one explicit contract exists and the boundary owner is named.

→ `/simplify` → commit

### Phase 2. Renderer Boundary Redaction Plan (~1-2 sessions)
**Assigned to:** Systems Programmer + Technical Architect

- [ ] Specify exactly which `GameState` families are allowed through to the player renderer and in what form.
- [ ] Define the redaction / projection rules for:
  - formations
  - operations
  - corps front sectors
  - officer state
  - threat / intel views
  - diplomacy / event metadata
- [ ] Define how player-visible enemy information is represented without shipping hidden truth by accident.
- [ ] Identify which existing adapter fields become transitional and which become canonical.

**Target files for later execution:**
- `src/desktop/preload.cjs`
- `src/desktop/electron-main.cjs`
- `src/desktop/desktop_sim.ts`
- `src/ui/map/hooks/useDesktopSession.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/data/types.ts`

**Gate:** future implementer can say exactly what leaves the main process and why.

→ `/simplify` → commit

### Phase 3. UI Leak Surface Cleanup Plan (~1-2 sessions)
**Assigned to:** UI/UX Developer + Documentation Specialist

- [ ] Classify each audited surface as player-safe, staff abstraction, or debug-only.
- [ ] Write explicit cleanup tasks for the known hot spots:
  - `src/ui/map/components/OperationsPanel.tsx`
  - `src/ui/map/components/OperationDetail.tsx`
  - `src/ui/map/components/army_hq/ThreatAssessment.tsx`
  - `src/ui/map/components/SelectionPanel.tsx`
  - `src/ui/map/components/SettlementDetailContent.tsx`
  - `src/ui/map/components/Tooltip.tsx`
  - `src/ui/map/components/army_hq/PersonnelContent.tsx`
  - `src/ui/map/utils/officerUtils.ts`
  - `src/ui/map/components/FormationDetail.tsx`
  - `src/ui/map/components/CommanderSelectionModal.tsx`
  - `src/ui/map/components/RawIntelTab.tsx`
- [ ] Define what each surface may show to the player without leaking engine labels or enemy omniscience.
- [ ] Mark any surface that should remain debug-only and therefore must not ship in normal player mode.

**Gate:** every known leak surface has an owned cleanup task and target classification.

→ `/simplify` → commit

### Phase 4. Display-Name Discipline (~1 session)
**Assigned to:** UI/UX Developer + Documentation Specialist

- [ ] Define the repo rule: player-facing UI must render display names, not internal ids.
- [ ] Inventory the current raw-id leak families and decide the canonical display formatter for each:
  - corps
  - sectors
  - operations
  - axes
  - OSIDs
  - staff assignments
- [ ] Identify shared formatting helpers that should become canonical.
- [ ] Write a ban list of backend labels that must never appear outside debug surfaces.

**Gate:** there is one clear display-name contract for all player-facing surfaces.

→ `/simplify` → commit

### Phase 5. Desktop UX Ownership: Warroom / Tactical Map / Codex (~1 session)
**Assigned to:** UI/UX Developer + Architect

- [ ] Decide whether standalone tactical map remains a supported primary path or becomes explicitly secondary to embedded Warroom.
- [ ] If standalone remains supported, define the mandatory visible "Return to Warroom" affordance and its owner.
- [ ] Restore one clear top-level Codex entrypoint in the live UI contract.
- [ ] State where command review, Codex, and faction-limited intelligence belong across Warroom and tactical map.
- [ ] Align this with the existing UI surface ownership matrix rather than creating a second truth.

**Relevant files for later execution:**
- `src/ui/map/components/TopToolbar.tsx`
- `src/ui/map/desktop/useIPC.ts`
- `src/desktop/preload.cjs`
- `src/desktop/electron-main.cjs`
- `src/ui/warroom/warroom.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/army_hq/RecordsContent.tsx`
- `src/ui/map/components/CodexPanel.tsx`

**Gate:** desktop shell ownership is explicit and the "lost way back / hidden Codex" problem has one sanctioned solution.

→ `/simplify` → commit

### Phase 6. Leak Harness and Regression Gates (~1-2 sessions)
**Assigned to:** QA Engineer + Systems Programmer

- [ ] Define tests that fail if the player renderer receives disallowed full-truth payload families.
- [ ] Define tests that fail if raw ids appear in player-facing strings.
- [ ] Define desktop smoke checks for:
  - standalone tactical map return path
  - visible Codex entrypoint
  - faction-limited operations / threat / formation visibility
- [ ] Define how debug-only surfaces are gated so they cannot silently ship as player surfaces.

**Target test areas for later execution:**
- `tests/desktop_*`
- `tests/ui_map_*`
- `tests/integration_*`

**Gate:** knowledge integrity has proof, not just intent.

→ `/simplify` → commit

### Phase 7. Roadmap / Master Doc Propagation (~1 session)
**Assigned to:** Product Manager + Documentation Specialist

- [ ] Align `MASTER_ROADMAP.md` so player-knowledge integrity is named under `v0.8.x-final`, with immediate leak hotfixes allowed in `v0.8.0.x`.
- [ ] Update master GUI / desktop docs so future work does not recreate the "full truth plus fog" model.
- [ ] Append ledger and knowledge entries that preserve the player-knowledge integrity rule as a reusable repo doctrine.

**Gate:** roadmap, docs, and architecture say the same thing.

→ `/simplify` → commit

---

## 5. Immediate Hotfix Lane (v0.8.0.x)

These are allowed before the full boundary refactor because they are live player-facing leaks:

- [ ] remove or redact enemy operations from player surfaces that should never have shown them
- [ ] remove raw internal ids from player-facing strings
- [ ] restore a visible return path from standalone tactical map to Warroom
- [ ] restore one visible Codex affordance

These are not a substitute for the full plan. They are emergency integrity fixes.

---

## 6. Dependency / Slotting Notes

- This plan belongs primarily in **`v0.8.x-final`** because it is about singular ownership of player-facing truth.
- Worst live leaks may be fixed immediately in **`v0.8.0.x`**.
- **`v0.8.1` Commander Maturity** should not be treated as player-ready if the client still receives omniscient state.
- **`v0.8.3` Order Interpretation** and **`v0.8.4` Autonomy** both depend on this plan, because command review and API-assisted decisions are meaningless if the player UI is still cheating.
- **`v0.8-to-v0.9` UI surface ownership** remains complementary; this plan defines what truth the surfaces may expose, while the ownership matrix defines which surface owns which job.

---

## 7. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions affecting player knowledge boundaries are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when this plan is created and when it is executed
- [ ] `docs/PROJECT_LEDGER_KNOWLEDGE.md` records the doctrine once confirmed
- [ ] `docs/life_lessons.md` is scanned before each execution phase
- [ ] `/simplify` runs between phases
- [ ] verification evidence exists before any claim of completion
- [ ] one logical phase per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/`

---

## 8. Completion Checklist

- [ ] player knowledge contract written
- [ ] canonical renderer boundary defined
- [ ] leak surface inventory classified
- [ ] display-name discipline specified
- [ ] desktop navigation / Codex ownership specified
- [ ] leak harness / regression plan specified
- [ ] roadmap updated
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `docs/PROJECT_LEDGER_KNOWLEDGE.md` updated
- [ ] implementation report produced after execution

---

## 9. Success Criteria

- [ ] the player renderer no longer depends on omniscient `LoadedGameState`
- [ ] player-facing UI no longer leaks raw sim ids outside explicit debug surfaces
- [ ] tactical map / Warroom / Codex have an explicit, non-accidental navigation contract
- [ ] future command-review and autonomy work can rely on an honest player-facing information boundary
- [ ] leak regressions are caught by tests instead of discovered by the player
