# War Planning Map Viewer — Duty Delegation

**Date:** 2026-02-08  
**Trigger:** Standalone viewer (map_viewer_standalone.html + map_viewer_app.ts) shows political control correctly but does not match GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md.  
**Source of truth:** GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md, WAR_PLANNING_MAP_EXPERT_PROPOSAL.md, NATO_AESTHETIC_SPEC.md.

**No report.** Duties only.

---

## UI/UX Developer

- **Base map (§2.1):** Render base geographical map from A1_BASE_MAP (or settlements_a1_viewer) with national boundary, and where data exists: rivers, roads (MSR/secondary), settlement polygons. Apply NATO aesthetic (NATO_AESTHETIC_SPEC: background #F4EBD0, roads, rivers #0077B6, restraint).
- **Zoom levels (§2.3):** Implement Strategic (L0) / Operational (L1) / Tactical (L2) with correct behaviour: L0 full BiH + major cities labelled; L1 regional + front segments; L2 settlement-level. Add zoom cycle (click map or +/-) and keyboard shortcuts per expert proposal.
- **Settlement panel (§3.1, Expert Proposal §1):** Single right-side sliding panel 320–360px, stacked sections SETTLEMENT | MUNICIPALITY | CONTROL (and DEMOGRAPHICS when data available). Section headers ■ SETTLEMENT, ■ MUNICIPALITY, ■ CONTROL; collapsible blocks; faction color bar on panel edge. Map viewport shifts when panel opens so clicked settlement stays visible.
- **Hover tooltips (§3.2):** Settlement hover: name, controller, population. Labels with color (no color-only critical info).
- **Layer toggles:** Placement per expert proposal (floating or top bar); Political control, Contested live; OOB / ethnicity / displacement as labelled Phase II placeholders.
- **Accessibility (§6 handover):** Focus trap in map scene, keyboard nav (layer toggles, panel, close), no critical info by color alone.
- **Standalone vs warroom:** Keep standalone viewer aligned with same spec; warroom full-screen scene (PARADOX_WAR_PLANNING_MAP_FULL_SCENE_TEAM_CONVENE) uses same component/spec.

---

## Product Manager

- **Sequence:** Confirm order of work: base map + layers (political, contested) → settlement panel layout → hover → zoom behaviour → Phase II placeholders. Unblock any scope question (e.g. base map “rivers/roads” vs current data).
- **Acceptance:** Define done for “matches handover” for MVP (base map, zoom levels, settlement panel structure, tooltips, layers, NATO aesthetic baseline). Sign off after UI/UX implements.

---

## Game Designer

- **Settlement panel content:** Confirm fields per section (SETTLEMENT: name, SID, type, pop; MUNICIPALITY: name, mun1990_id, controller, settlement count; CONTROL: faction, state, since). Approve or correct labels and “Since” semantics (turn/week).
- **Design acceptance:** Confirm map is “inspection-first, command-second” and panel layout matches expert proposal (stacked sections, no tabs). Approve Phase II placeholders (MILITARY, STABILITY, OOB) as non-interactive until war system handover.

---

## Technical Architect

- **Data contracts:** Confirm A1_BASE_MAP / settlements_a1_viewer as single source for base geometry; political_control_data (both key formats) and mun1990_names, settlement_names for panel. No mixing of coordinate systems at render time.
- **OOB / brigade data:** Confirm Phase II placeholders require no new data until war system handover; document any stub endpoints or schemas if needed for future brigade/corps display.

---

## Wargame Specialist

- **NATO aesthetic:** Review map and panel against NATO_AESTHETIC_SPEC (colors, roads, rivers, urban density). Confirm faction colors and contested hatch align with JOG/tactical standard. Flag any deviation.
- **OOB placeholder:** Confirm Order of Battle layer is Phase II; ensure placeholder is clearly labelled and does not imply current brigade/corps data.

---

## Orchestrator

- **Sync:** Ensure UI/UX has access to handover, expert proposal, and NATO spec. Resolve any conflict between handover and expert proposal in favour of handover unless canon says otherwise.
- **Gate:** No closure of “viewer matches handover” until PM and Game Designer sign off and Wargame Specialist confirms NATO aesthetic baseline.
