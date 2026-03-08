# AWWV GUI Master Reference

**Purpose:** Single living reference for GUI (map + warroom) status. Read first when starting GUI work; update during the session when completing GUI changes.

**Updated:** 2026-03-08

**Relationship to calibration:** Calibration has [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md) as its control file. This document is the GUI analogue — one place to see current status, gates, and where to record changes.

---

## Where to look

| Need | Go to |
|------|--------|
| **Implementation spec + §0 status table** | [AWWV_GUI_ARCHITECTURE_REWORK_v2.md](../20_engineering/AWWV_GUI_ARCHITECTURE_REWORK_v2.md) — Phases 1–5, component inventory, done/not yet |
| **Warroom (scene, modals, hotspots)** | [WARROOM_MASTER.md](WARROOM_MASTER.md) — warroom living reference; modals implemented vs proposed, commander assignment, nano banana brief |
| **Comprehensive status (external review)** | [20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md](20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md) — full done/remaining vs v2, file inventory, verification checklist |
| **Tactical map system (panels, layers, settlement)** | [TACTICAL_MAP_SYSTEM.md](../20_engineering/TACTICAL_MAP_SYSTEM.md) — §13.2 Settlement Panel, map modes, panel rail |
| **Aesthetic / design authority** | [HOI_VISUAL_GUI_OVERHAUL_SPEC.md](../30_planning/20260221_settlement%20remapping%20and%20GUI%20rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md) — look-and-feel, sidebar structure, panel patterns |
| **Latest comprehensive GUI review** | [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) — player perspective, panel choreography, recommendations |

---

## Current status (summary)

- **Canonical GUI:** React + MapLibre map app in `src/ui/map/`; warroom in `src/ui/warroom/`. Run map via `npm run dev:map`, desktop via `npm run desktop:map:build` (or Electron).
- **Panel rail:** One right-side rail (`panelRail.ts`); App mounts primary/secondary detail (settlement, army, corps, sector, formation, operation). Settlement panel: 3 horizontal tabs (Overview | Military | Orders & events); see [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md).
- **Command experience:** Command briefing in `App.tsx`; routing to IVP, convoys, support, OPSEC, operations. Warroom: scene-plate contract, physical hotspot anchors, faction identity. Reports: [20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md), [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md).
- **Fog of war:** Live from `sector_intel` via `GameStateAdapter` → `LoadedGameState.fogOfWar`; no legacy `recon_intelligence`.

---

## When working GUI

1. **Read this file first** before starting GUI changes (map or warroom). **For warroom-only work**, read [WARROOM_MASTER.md](WARROOM_MASTER.md) first instead (it defers to this file for overall GUI).
2. **Update this file during the session** when you complete a GUI slice (e.g. add a line under "Recent GUI changes" and refresh "Current status" if the summary is affected).
3. **Link implementation reports** from CONSOLIDATED_IMPLEMENTED and 40_reports README; add a row here under "Recent GUI changes" with date and report path.
4. **Propagate to** TACTICAL_MAP_SYSTEM (§13 for panels), AWWV_GUI_ARCHITECTURE_REWORK_v2.md §0, and optionally 20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md when doing a larger refresh.

---

## Recent GUI changes

| Date | Change | Report / spec |
|------|--------|----------------|
| 2026-03-08 | Warroom: unified room prompt doc — same layout prewar/war, everything painted except calendar; military-feel ideas; **map = geography only (no entity lines)**; **all text in Bosnian** | [handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md](handovers/20260308_WARROOM_UNIFIED_ROOM_PROMPT_AND_MILITARY_FEEL.md), WARROOM_MASTER |
| 2026-03-07 | Officer profile redesign: shared `OfficerProfile` component with archetype, origin badge, pip ratings, combat record, tenure. Replaces raw numeric display across 6 panels. `officerCharacter.ts` utilities. | MAP_UI_MASTER §12, §13.4, TACTICAL_MAP_SYSTEM §0 |
| 2026-03-07 | Settlement panel: 3 tabs, nation labels, current ethnic structure, formation click-through; Control tab removed | [20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md](implemented/20260307_SETTLEMENT_PANEL_RICH_CONTENT_AND_TABS.md), TACTICAL_MAP_SYSTEM §13.2 |
| 2026-03-07 | Settlement panel population: **settlement-level** (OSID) Pre-war/Now/Out/In/Lost from mun share; formula line; net change matches settlement | (this session) |
| 2026-03-07 | Settlement panel "Fled from this settlement": scaled to match Out+Lost when event-log total ≠ formula total so math checks | (this session) |
| 2026-03-07 | Settlement panel population: Arrived uses **nation labels** (Bosniaks/Serbs/Croats); "Arrived at this settlement" shown whenever arrivals data exists; both Fled and Arrived show who left/arrived by nation | (this session) |
| 2026-03-07 | Settlement panel Military tab: **Front sector** row clickable → opens sector (CorpsFrontPanel); Orders & events tab: **Operation target** rows clickable → open operation detail | (this session) |
| 2026-03-07 | **Displacement event log:** All sources now write to `displacement_event_log`: takeover, minority flight, control-flip displacement (`applyDisplacementFromFlips`), and pressure/encirclement/breach (`updateDisplacement`). Events distributed by OSID so "Fled from this settlement" shows nation breakdown for every source. | (this session) |
| 2026-03-07 | Settlement panel "Left this settlement": when no per-OSID events (e.g. Kamičani), use **mun-level fallback** — `departedByMun` from adapter, scaled to settlement's Out+Lost so "Fled from this settlement" shows nation breakdown. | (this session) |
| 2026-03-07 | Settlement panel ethnic structure charts: Pre-war and Current use **ethnic bar colors** — green (Bosniaks), red (Serbs), blue (Croats), neutral (Other). `ethnicBarColor()` + `bg-faction-rbih` / `bg-faction-rs` / `bg-faction-hrhb`. | (this session) |
| 2026-03-07 | Command experience: panel rail, right-drill flow, warroom scene-plate, hotspot anchors, faction identity, briefing routing | [20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md](implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md) |
| 2026-03-07 | Comprehensive GUI review (player perspective) — convene, not implementation | [convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md](convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md) |
| 2026-03-06 | Panel rework: CorpsFrontPanel accordions, numeric shortcuts 1–5, loading shimmer, TopToolbar glow | [20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md](implemented/20260306_GUI_PANEL_REWORK_AND_GENERAL_POLISH.md) |

---

## Gates / discipline

- **No new GUI in legacy stacks:** All new work goes to `src/ui/map/` (React map) or `src/ui/warroom/` (warroom). Do not add features to archived HoI/tactical_map paths.
- **Panel choreography:** Use the single rail and App-owned mounting; do not stack competing overlays or drift SelectionPanel to its own overlay rules (see napkin "GUI / HoI Map").
- **Fog contract:** Consume `LoadedGameState.fogOfWar` (derived from sector intel); do not wire map layers directly to raw engine intel.

---

*For calibration status and gates, use [CALIBRATION_MASTER.md](CALIBRATION_MASTER.md). For thematic GUI decisions and patterns, see docs/PROJECT_LEDGER_KNOWLEDGE.md and .claude/napkin.md § GUI / HoI Map.*
