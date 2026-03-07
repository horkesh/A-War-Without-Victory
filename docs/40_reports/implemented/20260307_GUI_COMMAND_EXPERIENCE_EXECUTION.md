# GUI Command Experience Execution

**Date:** 2026-03-07  
**Scope:** Command briefing hierarchy, map panel rail, warroom scene-plate contract, hotspot architecture, faction-identity presentation, secondary visibility/polish  
**Status:** Implemented and verified

## Summary

This execution pass converted the GUI plan from a research document into live map and warroom behavior:

- the tactical map now uses a deterministic primary/secondary panel rail for right-drill detail flow
- the tactical map summary flow now deep-links into focused command sections instead of opening one undifferentiated overview
- the warroom now encodes the single-scene-plate contract directly in code and hotspot data
- warroom interactions now read as physical room objects instead of generic launcher props
- faction-specific ceremonial voice is now present across the main warroom information surfaces

## What Landed

### 1. Map panel rail

- Added a pure rail selector in `src/ui/map/components/panelRail.ts`
- Made `src/ui/map/App.tsx` the composition root for primary and secondary detail surfaces
- Normalized `SelectionPanel`, `ArmyDetail`, `CorpsDetail`, `CorpsFrontPanel`, `FormationDetail`, and `OperationDetail` onto shared slide-right semantics
- Preserved parent context for army -> corps, corps -> sector / operation, and sector -> formation drill-down flows
- Normalized `Escape` and close behavior so the rail clears cleanly

### 2. Warroom scene-plate contract

- Locked warroom plate dimensions to `2752x1536`
- Kept runtime exceptions to `flag`, `calendar`, and `ticker`
- Added faction-keyed scene-plate lookup in `src/ui/warroom/warroom.ts`
- Renamed hotspot ids into physical-anchor language in canonical and public hotspot JSON
- Removed stale `DeskInstruments.ts` sprite-prop scaffolding

### 3. Warroom hotspot architecture

- Reworked `ClickableRegionManager.ts` so room-object identity drives behavior
- Kept legacy action strings only as compatibility fallback
- Standardized the main anchor set:
  - `desk_map`
  - `command_briefing_folio`
  - `newspaper_stack`
  - `intelligence_journal`
  - `diplomatic_telephone`
  - `desk_radio`
  - `wall_flag_area`
  - `wall_calendar_area`

### 4. Faction identity pass

- Added `warroom_identity.ts` for faction-specific ceremonial voice
- Applied it to:
  - `ReportsModal`
  - `NewspaperModal`
  - `MagazineModal`
  - `FactionOverviewPanel`
  - `NewsTicker`

### 5. Secondary visibility and polish

- Added focused summary destinations for `overview`, `ivp`, `convoys`, `casualties`, `support`, and `opsec`
- Routed `TopToolbar` IVP / convoy / briefing actions into focused command-summary destinations
- Extended `CommandBriefingLayer` targets so IVP/support/opsec items open the correct summary section
- Promoted `WarSummaryModal` into a summary shell with section navigation and embedded command sections
- Extended `SituationTab` with focused section scrolling plus an operational-posture section covering OPSEC and fragile operations
- Added OPSEC surfacing to `GameStateAdapter` command briefing synthesis
- Made `OperationsPanel` list cards health-first and `EnclaveDashboard` cards risk-first
- Promoted OPSEC state to the sector dossier header in `CorpsFrontPanel`

## Architect Decisions Flagged For Review

- Keep `warroom.ts` as the only scene composition root; no secondary prop/sprite rendering path
- Keep one shared hotspot geometry contract across faction variants unless later art paint-overs materially break silhouette alignment
- Keep `OperationDetail` as the canonical rail-mounted operation destination for now, while leaving `OperationsPanel` as a separate browser surface
- Keep `wall_flag_area` as a temporary path into faction overview until a dedicated dossier/binder anchor is added in a later art pass
- Keep the supply-lines/corridor overlay deferred; this finishing pass only surfaces corridor pressure textually through summary routing and existing panels

## Verification

- `node "F:\\A-War-Without-Victory\\node_modules\\tsx\\dist\\cli.mjs" --test "tests\\ui_map_panel_rail.test.ts"`
- `node "F:\\A-War-Without-Victory\\node_modules\\tsx\\dist\\cli.mjs" --test "tests\\ui_map_game_state_adapter.test.ts"`
- `npx tsc --noEmit`
- `npx vitest run`
- `npm run desktop:map:build`
- `npm run warroom:build`

## Scope Guard

- No gameplay mechanics changed
- No canon rules changed
- No persistence contract changed
- Work stayed inside GUI hierarchy, routing, presentation, and hotspot architecture
