# Phase C GUI — Execution Plan

**Owner:** Orchestrator  
**Oversight:** Architect (decisions flagged for user review)  
**Source:** HOI_VISUAL_GUI_OVERHAUL_SPEC.md §10 Phase C; AWWV_GUI_ARCHITECTURE_REWORK_v2.md §0  
**Rules:** docs/20_engineering/PARADOX_RULES.md (refactor between phases, delegate, concurrent where possible, tests → report → napkin/ledger/docs → commit/push)

---

## Phase C scope (from HOI spec §10)

| # | Item | Spec reference |
|---|------|----------------|
| 13 | Rich tooltip system (settlement, formation, front-edge hover) | §7 |
| 14 | MapModeToolbar (Political Control / Ethnic / Supply / Pressure) | §3.1, §6 |
| 15 | MapLayerToggles | §6 |
| 16 | Keyboard shortcuts (Enter, 1–4 for map modes; Escape done) | §10 Phase C |
| 17 | Attack confirmation modal | §4, §6.2 |
| 18 | Order queue panel | §6.2, v2 §5.2 |

---

## Concrete phases and todos

### C1 — Rich tooltip system

**Goal:** Settlement, formation, and front-edge hover show formatted tooltips per HOI spec §7 (300ms delay; dismiss on mouse-out; do not block click).

**Todos:**

- [ ] **C1.1** Add store slice or fields for tooltip state: `tooltipTarget: { type: 'osid'|'formation'|'front', id: string } | null`, set/clear from map/sidebar hover.
- [ ] **C1.2** Implement `Tooltip` component (warm palette §9.2, 300ms delay, position near cursor or anchored to feature).
- [ ] **C1.3** Settlement hover: content per §7.1 (name, municipality, controller, pop, ethnicity bars, brigade present, terrain, strategic importance).
- [ ] **C1.4** Formation hover: content per §7.2 (name, corps, personnel, cohesion bar, posture, AoR summary, order).
- [ ] **C1.5** Front-edge hover: content per §7.3 (factions, persistence, pressure, formations on each side).
- [ ] **C1.6** Wire map/sidebar hover events to set tooltip target; mouse-out and click-through behavior so tooltips never block clicks.

**Owner:** UI/UX Developer (primary); Gameplay Programmer for data shape if needed.  
**Refactor-pass:** After C1 done — remove dead hover code, dedupe tooltip positioning logic.

---

### C2 — MapModeToolbar and MapLayerToggles

**Goal:** Floating toolbar for map mode (Political / Ethnic / Supply / Pressure) and toggles for map layers (e.g. fronts, formations, labels). Placement per Architect.

**Todos:**

- [ ] **C2.1** ~~Architect: Decide placement~~ **Done.** Placement: bottom-right above minimap (see "Decisions for user review" below). Implement floating toolbar at that position; list of modes + layers per HOI §3.1/§6.
- [ ] **C2.2** Add `MapModeToolbar` component: buttons for Political Control, Ethnic, Supply, Front Pressure; store `mapMode`; wire to map style/sources visibility.
- [ ] **C2.3** Add `MapLayerToggles` (or integrate into same toolbar): visibility toggles for front lines, formation markers, labels, etc., wired to MapLibre layer visibility or source opacity.
- [ ] **C2.4** Ensure map state (mode, layer visibility) is in Zustand and persists across pan/zoom; no flicker on re-render.

**Owner:** UI/UX Developer; Architect for placement/decisions.  
**Refactor-pass:** After C2 — extract shared “floating toolbar” styles, remove duplicate visibility logic.

---

### C3 — Keyboard shortcuts

**Goal:** Enter (confirm/select), 1–4 (map modes), Escape already clears selection.

**Todos:**

- [ ] **C3.1** Add or extend `useKeyboardShortcuts`: Enter → confirm or focus primary action (e.g. confirm modal if open); 1–4 → set map mode to index 0–3.
- [ ] **C3.2** Document shortcuts in UI (tooltip or status strip) and in HOI spec / v2 if not already.
- [ ] **C3.3** Ensure shortcuts don’t fire when typing in inputs (target only map/canvas or global when no input focused).

**Owner:** UI/UX Developer.  
**Refactor-pass:** After C3 — single key-handler registration point, no duplicate key logic.

---

### C4 — Attack confirmation modal

**Goal:** When user stages an attack, show modal with attacker, target, defender, terrain summary, Confirm/Cancel. Optionally show odds if IPC/query available.

**Todos:**

- [ ] **C4.1** Add `AttackConfirmation` modal component (warm palette §9.2); props: attacker formation, target OSID, defender (if any), terrain summary, onConfirm, onCancel.
- [ ] **C4.2** Wire from order-staging flow: when attack target selected, open modal instead of committing immediately; on Confirm call IPC stage-attack-order (or equivalent).
- [ ] **C4.3** (Optional) If read-only IPC `query-combat-estimate` (or similar) exists, call it and show odds in modal; else show “—” or skip. Architect flags if this is deferred.

**Owner:** UI/UX Developer; Gameplay Programmer if odds integration touches engine contract.  
**Refactor-pass:** After C4 — reuse modal layout for future modals if applicable.

---

### C5 — Order queue panel

**Goal:** Panel showing list of staged orders (attack, move, posture, etc.) for current turn; allow remove or edit before commit.

**Todos:**

- [ ] **C5.1** Add `OrderQueue` component: list of staged orders from store (or IPC state); each row: type, subject, target/params, [Remove] (and [Edit] if feasible).
- [ ] **C5.2** Wire store/IPC: read staged orders; remove order action (clear one or clear all) via existing IPC or store action.
- [ ] **C5.3** Placement: per Architect/v2 — e.g. below sidebar or in a collapsible strip; ensure it doesn’t overlap selection panel.

**Owner:** UI/UX Developer; Gameplay Programmer if order state shape changes.  
**Refactor-pass:** After C5 — dedupe order display logic with FormationDetail or other panels.

---

## Execution order and refactor

| After phase | Action |
|-------------|--------|
| C1 | Refactor-pass (tooltip/hover); then run `npx tsc --noEmit`, `npx vitest run`. |
| C2 | Refactor-pass (toolbar/layers); then run same checks. |
| C3 | Refactor-pass (shortcuts); then run same checks. |
| C4 | Refactor-pass (modal); then run same checks. |
| C5 | Refactor-pass (order queue); then run same checks. |
| All | Full test run; write report; update napkin, ledger, canon/tech docs; commit and push. |

---

## Concurrency

- **C1** and **C2** can start in parallel (different components; shared store only).
- **C3** can run in parallel with C2 (shortcuts vs toolbar).
- **C4** and **C5** may depend on order-staging state; can be parallel to each other if both only read/write store and IPC.

Orchestrator will spin up subagents for C1 and C2 first, then C3; then C4 and C5 in parallel if feasible.

---

## Decisions for user review (Architect)

*(Filled by Architect during oversight. User should confirm or override.)*

### C2.1: MapModeToolbar + MapLayerToggles placement — **DECIDED, FLAGGED FOR REVIEW**

**Decision:** Place **MapModeToolbar** and **MapLayerToggles** in a **floating button cluster at bottom-right, above the minimap**, on the map canvas.

**Rationale:** HOI_VISUAL_GUI_OVERHAUL_SPEC.md §3.2 (Top Command Bar) explicitly states: *"Map layer toggles move to a floating toolbar on the map canvas itself (small button cluster, **bottom-right above minimap**)."* The HOI spec is the authoritative aesthetic and look-and-feel source (per napkin and v2 §0). AWWV_GUI_ARCHITECTURE_REWORK_v2.md §6.1 had offered "bottom-left or top-left" as alternatives; this decision resolves that by following the HOI spec.

**Concrete placement (for implementation):** Bottom-right corner of the map container, with a small vertical offset (e.g. 16–24px) above the minimap so the cluster sits directly above it. Exact pixel offset can be tuned in layout (e.g. `right: 16px`, `bottom: 200px` or relative to minimap top). Same floating toolbar may contain both mode buttons (Political / Ethnic / Supply / Pressure) and layer toggles (fronts, formations, labels) as a single compact cluster.

**Flagged for user review:** If you prefer bottom-left or top-left for accessibility or layout reasons, override this decision and document the alternative in this section.

---

### C4.3: Combat odds in attack confirmation modal — **FLAGGED FOR REVIEW**

**Options:** (a) Integrate in Phase C if read-only IPC `query-combat-estimate` (or equivalent) exists and returns odds; show in AttackConfirmation modal. (b) Defer to Phase 5 (Polish); modal shows attacker/target/defender/terrain only, with "—" or no odds field.

**Recommendation:** Defer to Phase 5 unless the IPC and engine contract for combat estimate are already implemented and stable. Phase C scope stays focused on modal UX (Confirm/Cancel, terrain summary); odds are a polish item per v2 Phase 5.

**Flagged for user review:** Confirm defer vs include in Phase C.

---

### Other flagged decisions (no change to plan; for awareness)

- **C5.3 OrderQueue placement:** Plan says "below sidebar or in a collapsible strip". v2 does not pin exact placement. If you have a preference (e.g. always-visible strip vs collapsible below Army tab), document it here or leave to implementer discretion.
- **Map modes 1–4 order:** Shortcuts 1–4 map to map mode indices 0–3. Confirm order: 1=Political, 2=Ethnic, 3=Supply, 4=Pressure (or match toolbar left-to-right order). Implementation detail; can be fixed in C3.

---

## Report and handoff

- **Report path:** `docs/40_reports/phase_c/20260228_PHASE_C_GUI_IMPLEMENTATION_REPORT.md` (or dated when completed).
- **Contents:** Phases completed, refactor summary, tests run and results, decisions flagged above, file list, napkin/ledger/doc updates, commit hash after push.
