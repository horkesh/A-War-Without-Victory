# War Planning Map Expert Proposal — Paradox Team Discussion

**Date:** 2026-02-07  
**Convened by:** Orchestrator  
**Subject:** [WAR_PLANNING_MAP_EXPERT_PROPOSAL.md](WAR_PLANNING_MAP_EXPERT_PROPOSAL.md) — External expert advisor response to GUI handover  
**Participants:** Product Manager, Game Designer, Technical Architect, UI/UX Developer, Wargame Specialist, QA Engineer, Build Engineer, Orchestrator

---

## 1. Proposal Summary (Orchestrator)

The expert proposes:

| # | Decision | Expert Recommendation |
|---|----------|----------------------|
| 1 | Settlement info panel | Single right-side sliding panel (320–360px), stacked collapsible sections. No tabs, no modal. Sections: SETTLEMENT, MUNICIPALITY, CONTROL, DEMOGRAPHICS; MILITARY (Phase II), STABILITY (Phase I+). |
| 2 | Zoom interaction | Scroll wheel + click-to-drill (L0→L1→L2) + visible +/− buttons + keyboard (1/2/3, +/−, Esc cascade, Backspace, F/Home). Click settlement at L2 opens panel. |
| 3 | Layer toggles | Floating top-right panel, collapsible to icon. Unavailable layers visible but greyed with phase badges [II] [I+]. |
| 4 | Brigade/corps info (Phase II) | Hover tooltip + click replaces panel content. Same right-side panel, different content. |
| 5 | Accessibility | Tab focus, Arrow panning, Enter=click, Esc cascade, aria-live panel, focus ring, no color-only info. |
| 6 | Order-giving placeholder | Greyed "Issue Order" button at bottom of info panel. No toolbars, no right-click menus. |

**Additional recommendations:** Minimap inset, turn/date on map, search/jump-to-settlement, front-line emphasis at L1 (derived from control data), map legend. **Framing:** "NATO JOC situation display" — inspection-first, command-second; political leader, not tactical operator.

---

## 2. Product Manager Assessment

**Alignment with strategic direction:** Strong. The proposal aligns with GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION: base map → layers, settlement click → layered info, war system separate. The expert explicitly defers order-giving to a placeholder.

**Scope and priority:**
- P0 (settlement panel, zoom cascade, click-to-select at L2) matches our Phase C priority. Accept.
- P1 (layer toggles, Esc cascade, +/− buttons) — reasonable and low effort. Accept.
- P2 (front-line emphasis, minimap, search, legend) — desirable; front-line emphasis from control data has high payoff. Accept as P2. Minimap and search are standard wargame UX; accept.
- P3 (turn/date display, orders placeholder) — low effort, high clarity. Accept.

**Concerns:**
- DEMOGRAPHICS section in MVP: handover said "settlement, municipality, side." Expert adds DEMOGRAPHICS (1991 census ethnic breakdown). This enriches the panel but increases data dependency (census/ethnicity). **Recommend:** Include DEMOGRAPHICS if data exists; otherwise defer to Phase I+ with phase badge. Do not block MVP on ethnicity data.
- STABILITY section marked "Phase I+": clarify whether Phase 0 has stability_score. If not, grey out with badge. Accept.

**Phased delivery:** Expert estimate 8–10 days for P0+P1 is credible. Front-line emphasis (P2) adds 1–2 days. Minimap, search, legend add ~2.5 days. **Recommend:** Ship P0+P1 as MVP; P2 in follow-up sprint.

---

## 3. Game Designer Assessment

**Design intent alignment:** Excellent. The "NATO JOC situation display" framing — political leader inspecting a grease-pencil map, not tactical operator — matches our design intent. Inspection-first, command-second is exactly right.

**Canon check:** Proposal does not conflict with Rulebook or Game Bible. Canon is silent on UI layout. No fog-of-war or faction visibility changes. Accept.

**Section structure:** Expert proposes SETTLEMENT, MUNICIPALITY, CONTROL, DEMOGRAPHICS. Our clarification said "settlement, municipality, side." Expert's CONTROL maps to "side" and adds control state (CONSOLIDATED/CONTESTED etc.) and "since when." DEMOGRAPHICS adds 1991 census. **Recommend:** Accept. CONTROL and DEMOGRAPHICS strengthen the briefing quality. Ensure "side" is explicit (controlling faction) in CONTROL section.

**Zoom level definitions:** Expert refines L0/L1/L2 with concrete LOD: L0 = municipality clusters (~50 polygons), L1 = sub-municipality (~200), L2 = full settlements (~1000+). This is more specific than our spec. **Recommend:** Accept. Matches information-echelon principle (President vs Corps vs Brigade view).

**Order placeholder:** Expert places "Issue Order" at bottom of panel. Aligns with "inspect → understand → act" flow. Accept. No right-click menus reserves that pattern for future order system design.

---

## 4. Technical Architect Assessment

**Implementation feasibility:** Proposal is implementable within current stack (Canvas-based WarPlanningMap.ts, DOM overlay for panel). No architectural changes required.

**Data dependencies:**
- Settlement panel: political_control_data.json, settlements_viewer/geo, municipality lookup — exists.
- DEMOGRAPHICS: settlement_ethnicity_data or census — check availability. If missing, grey out with phase badge.
- Front-line emphasis (§7.4): Derive from political control (shared edges between opposite factions). Similar to municipality border derivation. Feasible.
- Minimap: Requires second render of map at L0 resolution or bounds overlay. Moderate effort.
- Search: Fuzzy search over settlement names; jump to bounds. Needs settlement name index. Feasible.

**Concerns:**
- Smooth scroll zoom with cursor anchoring: Expert says "already done." Verify WarPlanningMap/TacticalMap has this. If not, add.
- Map viewport shift on panel open: Proposal says "map shifts left ~320px" to avoid obscuring clicked settlement. This implies canvas resize or viewport bounds change. Confirm implementation approach (canvas width reduction vs pan).
- Right-side panel: DOM overlay (div) over canvas is standard. Ensure pointer-events and z-order correct for click-through to map when panel closed.

**No concerns** on determinism, canon, or coordinate spaces. Proposal respects read-only MVP and existing constraints.

---

## 5. UI/UX Developer Assessment

**Panel design:** Single sliding panel with stacked sections is preferred over tabs. Matches War in the East 2, Shadow Empire precedent. Collapsible sections with default-expanded is good. Implement.

**Zoom model:** Separating scroll (navigate) from click-at-L2 (select) resolves click ambiguity. Current spec may have click-cycle zoom; proposal refines to click-to-drill then click-to-select. +/− buttons and keyboard shortcuts improve discoverability. Accept.

**Layer toggles:** Floating collapsible panel beats permanent side bar. Phase badges on greyed-out layers signal future capability without cluttering. Accept.

**Accessibility:** Tab, Arrow keys, Enter, Esc cascade, aria-live, focus ring — all standard. No color-only info is reinforced. Alt-text on faction swatches. Implement.

**Visual principles ("Tactical Brutalism"):** Sharp corners, no drop shadows, no gradients, stencil/monospace, paper grain. Aligns with NATO_AESTHETIC_SPEC. Reinforce in implementation.

**Risk:** Panel slide animation (200ms) and map shift must not cause layout thrash. Use CSS transform for panel; avoid reflow on open.

---

## 6. Wargame Specialist Assessment

**Military precedent:** Expert cites Gary Grigsby (War in the East 2), Decisive Campaigns, CMANO, Shadow Empire. These are appropriate references for operational-level, inspection-first design. The NATO JOC framing is correct for AWWV's political-leadership scope.

**Front-line emphasis (§7.4):** Deriving front segments from control data (inter-faction borders) at L1 gives immediate situational awareness without Phase II OOB. Strong recommendation. Algorithm is straightforward (shared edges between opposite factions).

**LOD discipline:** L0 = big blocks, major cities only; L1 = corps/fronts; L2 = settlements. Matches command echelon. Avoid showing settlement names at L0 — correct.

**Brigade/corps (Phase II):** Hover + click-to-panel, same right-side panel. Shared panel for settlement/brigade/corps avoids UI proliferation. Breadcrumb "← Back to Settlement" is good for context. Accept.

**Color discipline:** Faction colors only for control. Neutral (blacks, whites, beiges, greys) for UI. Prevents confusion. Accept.

---

## 7. QA Engineer Assessment

**Testability:** Discrete zoom levels (L0/L1/L2), explicit click semantics (zoom vs select), Esc cascade — all testable. State machine in §8 is clear.

**Regression risks:** Changing zoom from click-cycle to click-drill + scroll may affect existing tests. Update test expectations. Panel open/close, content swap on settlement change — add regression tests.

**Accessibility:** Keyboard nav, aria-live, focus ring — verify with screen reader (basic pass). No color-only info — add checklist item for each panel field.

**Determinism:** Proposal does not introduce non-determinism. Map rendering, panel content are derived from GameState. No timestamps or randomness. Accept.

---

## 8. Build Engineer Assessment

**No build impact.** Proposal affects runtime UI (WarPlanningMap, DOM overlays). No new assets beyond existing map/control data. No pipeline changes. Staging and bundling unchanged.

---

## 9. Orchestrator Synthesis

### 9.1 Team Consensus

All roles **accept the proposal** with minor clarifications:

| Area | Consensus |
|------|-----------|
| Panel layout | Single right-side sliding panel, stacked sections. No tabs, no modal. |
| Zoom model | Scroll wheel + click-to-drill + keyboard + +/− buttons. Click settlement at L2 opens panel. |
| Layer toggles | Floating top-right, collapsible. Phase badges on unavailable layers. |
| Brigade/corps (Phase II) | Hover tooltip + click replaces panel content. Same panel. |
| Accessibility | Full keyboard nav, aria-live, focus ring, no color-only info. |
| Order placeholder | Greyed button at panel bottom. No toolbars or right-click. |
| P2 features | Front-line emphasis, minimap, search, legend — all accepted. |

### 9.2 Clarifications to Apply

1. **DEMOGRAPHICS:** Include in MVP if ethnicity/census data exists; otherwise grey out with phase badge.
2. **Map viewport shift:** Confirm approach (resize vs pan) with Technical Architect during implementation.
3. **Smooth scroll zoom:** Verify existing support; add if missing.

### 9.3 Implementation Priority (Adopted)

- **P0:** Settlement panel (stacked sections), zoom cascade, click-to-select at L2. ~3–4 days.
- **P1:** Layer toggles, Esc cascade, +/− buttons, keyboard shortcuts. ~2 days.
- **P2:** Front-line emphasis, minimap, search, legend. ~3–4 days.
- **P3:** Turn/date on map, orders placeholder. ~1 day.

### 9.4 Next Steps

1. **Update GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md** — Add "Expert Proposal Adopted" note and link to this discussion.
2. **Create implementation ticket/plan** — Sequence P0 → P1 → P2 → P3. Assign to UI/UX Developer.
3. **Data check** — Verify settlement_ethnicity_data or equivalent for DEMOGRAPHICS section. If absent, scope as Phase I+.
4. **PROJECT_LEDGER** — Add entry when implementation starts: "War Planning Map: expert proposal adopted; settlement panel, zoom model, layer toggles per WAR_PLANNING_MAP_EXPERT_PROPOSAL."

### 9.5 Document Status

**WAR_PLANNING_MAP_EXPERT_PROPOSAL.md** is adopted as the design authority for War Planning Map UI implementation. This discussion record captures team consensus and clarifications. Deviations require Orchestrator approval.

---

*Discussion complete. All roles consulted. Proposal adopted with clarifications.*
