# v0.7.2 -- Warroom React Migration

**Date:** 2026-03-24
**Status:** PLAN
**Prerequisite:** v0.6.1 stable on main (current). No feature branches required.
**Estimated tasks:** 34

---

## Context

The warroom (`src/ui/warroom/`) is a separate Vite app: 38 TypeScript files, 77 image assets, 3 CSS files, vanilla TS + Canvas rendering. It runs on port 3000 in dev and loads via `awwv://warroom/index.html` in Electron. The tactical map (`src/ui/map/`) is a React + Tailwind + Zustand app with MapLibre, running on port 3001.

Over v0.4--v0.6, significant warroom functionality was duplicated in React:
- MainMenu, SidePickerOverlay, SettingsScreen, CreditsScreen
- WarSummaryModal, VerdictScreen, GameOverModal, DaytonNegotiationModal
- DiplomacyOverview, PeacePlanModal, EventModal, EventDecisionModal
- ArmyHQ tabs (Briefing/Summary/Records/Personnel/Operations)
- PeaceWarTransition

The warroom still provides unique content not yet in React:
- Canvas scene plate (faction HQ backgrounds, hotspot click regions, hover effects)
- Newspaper, Magazine, IVP Breakdown, Command Briefing, Operational Situation modals
- News ticker (radio)
- Wall calendar
- War Planning Map + Phase 0 Preparation Map + Investment Panel
- Phase 0 turn runner (browser-side)
- Data layer: war_data_extractor, turn_event_generator, fog_of_war, warroom_state
- Content layer: headline_templates, ticker_events, war_headline_templates
- Identity/utils: warroom_identity, warroom_utils

**Goal:** Migrate all unique warroom content into the React app (`src/ui/map/`), then delete the warroom Vite app entirely. Electron loads only the React app. The warroom "room" aesthetic (HQ background, hotspot navigation) becomes a React view within the existing app, not a separate window.

**Non-goal:** Redesigning warroom content or adding new modals. This is a port, not a redesign. Content parity with current warroom is the acceptance bar.

---

## Architecture Decision

**Single-window React app.** The Electron main window loads the React tactical map app. The warroom becomes a "view" (route/overlay) within that app, toggled via a toolbar button or faction crest click. No more iframe embedding, no more separate Vite build, no more dual-window state sync.

State flows through the existing Zustand `gameStore` + IPC bridge. The warroom data layer (`war_data_extractor`, `fog_of_war`, etc.) moves to `src/ui/map/data/warroom/` as pure functions consumed by React components.

---

## Phases

### Phase 0: Data Layer Migration (no UI changes)

Move the warroom's pure data/content modules into the React app's tree. These have zero DOM dependencies -- they consume GameState and return plain objects. This phase has zero visual impact and can be verified by typecheck alone.

- [ ] **Task 0.1:** Move `src/ui/warroom/data/war_data_extractor.ts` to `src/ui/map/data/warroom/war_data_extractor.ts`. Update all import paths. Verify: `npx tsc --noEmit` passes.
  - Acceptance: File moved, old location has no references, typecheck passes.

- [ ] **Task 0.2:** Move `src/ui/warroom/data/fog_of_war.ts` to `src/ui/map/data/warroom/fog_of_war.ts`. Update imports.
  - Acceptance: Typecheck passes.

- [ ] **Task 0.3:** Move `src/ui/warroom/data/turn_event_generator.ts` to `src/ui/map/data/warroom/turn_event_generator.ts`. Update imports.
  - Acceptance: Typecheck passes.

- [ ] **Task 0.4:** Move `src/ui/warroom/data/warroom_state.ts` to `src/ui/map/data/warroom/warroom_state.ts`. Update imports. Note: this module uses module-level singleton state -- convert to Zustand slice in Phase 2 (for now, keep as-is).
  - Acceptance: Typecheck passes.

- [ ] **Task 0.5:** Move `src/ui/warroom/content/headline_templates.ts`, `ticker_events.ts`, `ticker_war_events.ts`, `war_headline_templates.ts` to `src/ui/map/data/warroom/content/`. Update imports.
  - Acceptance: Typecheck passes.

- [ ] **Task 0.6:** Move `src/ui/warroom/components/warroom_utils.ts` and `warroom_identity.ts` to `src/ui/map/utils/warroom_utils.ts` and `src/ui/map/utils/warroom_identity.ts`. Update all warroom-side imports to point to new locations.
  - Acceptance: Typecheck passes. Both old and new warroom code can import from new locations.

- [ ] **Task 0.7:** Smoke-test triad: `npx tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`. All three pass.
  - Acceptance: Zero regressions.

### Phase 1: Unique Warroom Modals as React Components

Port the 5 modals that have no React equivalent. Each is a self-contained class with a `render(): HTMLElement` method that builds DOM via `document.createElement` + innerHTML. Convert each to a React functional component that receives GameState from Zustand and renders JSX with Tailwind.

- [ ] **Task 1.1:** Create `src/ui/map/components/warroom/NewspaperModal.tsx`. Port `NewspaperModal.ts` render logic to React. Consume `headline_templates`, `war_headline_templates`, `turn_event_generator` from the migrated data layer. Props: `isOpen`, `onClose`. Reads GameState from `useGameStore`. Preserves the faction-specific masthead, headline, subhead, body, urgency styling. Uses Tailwind classes matching the existing `modals.css` aesthetic (dark paper texture, courier font, faction accent colors).
  - Acceptance: Component renders newspaper content for all 3 factions in both peace and war phase. Typecheck passes.

- [ ] **Task 1.2:** Create `src/ui/map/components/warroom/MagazineModal.tsx`. Port `MagazineModal.ts`. Monthly operational review with real game stats. Peace: capital/org/stability. War: forces/casualties/territory/displacement via `war_data_extractor`.
  - Acceptance: Component renders magazine content for peace and war phases. Typecheck passes.

- [ ] **Task 1.3:** Create `src/ui/map/components/warroom/IvpBreakdownModal.tsx`. Port `IvpBreakdownModal.ts`. Reads IVP state from GameState. Shows composite IVP, 4 weighted components, thresholds, active consequences.
  - Acceptance: Component renders IVP breakdown. War-only (returns null in peace). Typecheck passes.

- [ ] **Task 1.4:** Create `src/ui/map/components/warroom/CommandBriefingModal.tsx`. Port `CommandBriefingModal.ts`. Shows urgent matters, logistics, front alarms, convoy questions, enclave warnings. Footer button opens IVP breakdown.
  - Acceptance: Component renders briefing for peace and war. IVP link works. Typecheck passes.

- [ ] **Task 1.5:** Create `src/ui/map/components/warroom/OperationalSituationModal.tsx`. Port `OperationalSituationModal.ts`. Shows op health, sector stress, logistics. "Open Tactical Map" button wired.
  - Acceptance: Component renders for peace and war. Typecheck passes.

- [ ] **Task 1.6:** Create `src/ui/map/components/warroom/NewsTicker.tsx`. Port `NewsTicker.ts`. Scrolling bottom ticker with scripted + dynamic war headlines. Toggle via radio button.
  - Acceptance: Component renders ticker, scrolls, toggles visibility. Typecheck passes.

- [ ] **Task 1.7:** Smoke-test triad passes. Manually verify each modal renders by temporarily mounting them in App.tsx behind a dev flag.
  - Acceptance: All 6 new components render without errors. Triad passes.

### Phase 2: Warroom View (Scene + Hotspots) in React

Create the warroom "room" as a React view. The canvas scene plate (faction HQ background image) becomes a React component with CSS background-image + positioned clickable regions. Hotspot click opens the appropriate modal.

- [ ] **Task 2.1:** Add warroom Zustand state slice to `gameStore.ts`: `waroomOpen: boolean`, `setWarroomOpen`, `warroomModal: string | null` (active modal ID), `setWarroomModal`, `newsTickerVisible: boolean`, `setNewsTickerVisible`. Previous-turn snapshot state (replacing module singleton from `warroom_state.ts`).
  - Acceptance: Store compiles. Typecheck passes.

- [ ] **Task 2.2:** Create `src/ui/map/components/warroom/WarroomView.tsx`. Full-screen overlay (z-index above map, below modals). Renders faction HQ background image (webp) sized to viewport. 12 hotspot regions as absolutely-positioned invisible `<button>` elements with hover outlines. Click dispatches `setWarroomModal(anchorId)`. Close returns to map view.
  - Acceptance: Renders HQ background for player faction. Hotspots visible on hover. Click opens correct modal. ESC closes.

- [ ] **Task 2.3:** Copy warroom image assets needed by React: `src/ui/warroom/assets/*.webp` (HQ backgrounds, flags, crests) to `src/ui/map/assets/warroom/`. Only copy files actually referenced. Update imports. Delete duplicated `_old/` and `raw_sora/` directories (they are source materials, not runtime assets).
  - Acceptance: All warroom background images load in WarroomView. No broken image references.

- [ ] **Task 2.4:** Create `src/ui/map/components/warroom/WarroomHotspotMap.tsx`. Reads hotspot geometry from the existing `hq_*_clickable_regions.json` files. Renders positioned buttons. Handles hover styling (red outline, glow, cursor changes per region spec). Scales geometry from 2752x1536 authoring resolution to current viewport.
  - Acceptance: All 12 anchor hotspots render, scale correctly, show correct hover style.

- [ ] **Task 2.5:** Wire modal routing in WarroomView: `wall_flag_area` -> FactionOverview (existing `WarSummaryModal`), `newspaper_stack` -> NewspaperModal, `intelligence_journal` -> MagazineModal, `command_briefing_folio` -> CommandBriefingModal, `diplomatic_telephone` -> IvpBreakdownModal (war) / "Line dead" message (peace), `desk_radio` -> toggle NewsTicker, `desk_map` -> close warroom (return to map), `wall_calendar_area` -> advance turn via IPC.
  - Acceptance: Each hotspot opens correct modal. Modal close returns to warroom view.

- [ ] **Task 2.6:** Wire WarroomView into `App.tsx`. Add toolbar button "HQ" (or faction crest) to `TopToolbar.tsx` that toggles `warroomOpen`. When warroom is open, render `<WarroomView />` as overlay.
  - Acceptance: Player can toggle between map and warroom. State persists across toggles.

- [ ] **Task 2.7:** Smoke-test triad. Manual test: open warroom, click each hotspot, verify modal opens, close modal, return to map.
  - Acceptance: Triad passes. Full hotspot flow works.

### Phase 3: Phase 0 (Pre-War) React Migration

The Phase 0 pre-war flow (investment map, preparation map, Phase 0 turn runner) currently runs in the warroom's canvas-based War Planning Map. This is the most complex migration because it involves interactive map rendering and turn advancement logic.

- [ ] **Task 3.1:** Move `src/ui/warroom/run_phase0_turn.ts` to `src/ui/map/data/warroom/run_phase0_turn.ts`. This is a pure function (GameState in, GameState out) with no DOM dependencies. Update imports.
  - Acceptance: Typecheck passes. Function callable from React app.

- [ ] **Task 3.2:** Move `src/ui/warroom/components/Phase0DirectiveState.ts` to `src/ui/map/data/warroom/Phase0DirectiveState.ts`. This is a state container for staged investments -- convert to Zustand slice or keep as importable class.
  - Acceptance: Typecheck passes.

- [ ] **Task 3.3:** Create `src/ui/map/components/warroom/InvestmentPanel.tsx`. Port `InvestmentPanel.ts`. Shows municipality details, org-pen factors, investment types with costs, INVEST/CANCEL buttons. Wires to Phase0DirectiveState.
  - Acceptance: Component renders investment options for selected municipality. Typecheck passes.

- [ ] **Task 3.4:** Create `src/ui/map/components/warroom/Phase0MapOverlay.tsx`. Instead of porting the canvas-based War Planning Map, create a MapLibre-based overlay mode for the existing tactical map. When Phase 0 is active, the tactical map shows municipality polygons colored by org-pen / control status, with click-to-select that opens InvestmentPanel. This replaces both `WarPlanningMap.ts` and `Phase0PreparationMap.ts` with the existing React map infrastructure.
  - Acceptance: Phase 0 map mode renders municipalities with correct colors. Click selects municipality and opens InvestmentPanel. Investment flow works end-to-end.

- [ ] **Task 3.5:** Wire Phase 0 turn advancement from React. When player clicks "End Turn" in Phase 0, call `runPhase0TurnAndAdvance()` via IPC (Electron) or direct call (dev mode). Update gameStore with new state.
  - Acceptance: Phase 0 turns advance correctly. Events fire. War transition triggers.

- [ ] **Task 3.6:** Smoke-test triad. Manual test: start new campaign, play through Phase 0 (invest, advance turns), verify war transition.
  - Acceptance: Triad passes. Phase 0 playable in React app.

### Phase 4: Electron Integration + Warroom Deletion

Rewire Electron to load only the React app. Delete the warroom Vite app entirely.

- [ ] **Task 4.1:** Update `src/desktop/electron-main.cjs`: change `mainWindow.loadURL('awwv://warroom/index.html')` to load the React tactical map app directly (e.g., `awwv://tactical-map/index.html` or `http://localhost:3001` in dev). Remove all warroom-specific protocol routing (`awwv://warroom/*`).
  - Acceptance: Electron opens React app directly. No warroom window.

- [ ] **Task 4.2:** Remove warroom build from `package.json` scripts. Update `"desktop"` script to remove `warroom:build`. Remove: `dev:warroom`, `warroom:build`, `warroom:preview`, `warroom:regions:*`, `warroom:assets:*`.
  - Acceptance: `npm run desktop` works without warroom build step.

- [ ] **Task 4.3:** Delete `src/ui/warroom/` entirely. All 38 TS files, 77 assets, 3 CSS files, 2 HTML files, vite.config.ts. Also delete `dist/warroom/` build output if present.
  - Acceptance: Directory gone. `npx tsc --noEmit` passes (no dangling imports).

- [ ] **Task 4.4:** Delete warroom staging tools: `tools/ui/warroom_stage_assets.ts`, `tools/ui/warroom_regions_all_modals.ts`, `tools/ui/warroom_resize_assets.ts` (if they exist and are warroom-only).
  - Acceptance: No warroom-specific tooling remains. Typecheck passes.

- [ ] **Task 4.5:** Update `docs/40_reports/WARROOM_MASTER.md` to reflect the migration. Mark canvas warroom as deprecated/removed. Update code entrypoints to point to `src/ui/map/components/warroom/`.
  - Acceptance: Documentation accurate.

- [ ] **Task 4.6:** Final smoke-test triad: `npx tsc --noEmit` + `npm run test:vitest` + `npm run desktop:map:build`. Then `npm run desktop` and manually verify: main menu -> new campaign -> side picker -> Phase 0 -> war -> warroom view -> all hotspots -> map -> Army HQ -> verdict.
  - Acceptance: Full game flow works. Zero regressions. Triad passes.

---

## Files Summary

### Created (new React components + migrated data)
```
src/ui/map/data/warroom/                          # Migrated data layer
  war_data_extractor.ts
  fog_of_war.ts
  turn_event_generator.ts
  warroom_state.ts
  run_phase0_turn.ts
  Phase0DirectiveState.ts
  content/
    headline_templates.ts
    ticker_events.ts
    ticker_war_events.ts
    war_headline_templates.ts

src/ui/map/utils/warroom_utils.ts                 # Migrated utilities
src/ui/map/utils/warroom_identity.ts

src/ui/map/components/warroom/                     # New React components
  WarroomView.tsx                                  # Scene plate + hotspot container
  WarroomHotspotMap.tsx                            # Positioned hotspot buttons
  NewspaperModal.tsx
  MagazineModal.tsx
  IvpBreakdownModal.tsx
  CommandBriefingModal.tsx
  OperationalSituationModal.tsx
  NewsTicker.tsx
  InvestmentPanel.tsx
  Phase0MapOverlay.tsx

src/ui/map/assets/warroom/                         # Migrated image assets
  hq_rbih_1991.webp ... hq_hrhb_1995.webp         # 15 HQ backgrounds
  flag_RBiH.webp, flag_RS.webp, flag_HRHB.webp    # 3 flags
  crest_*.png                                      # 6 crests
```

### Modified
```
src/ui/map/App.tsx                                 # Add WarroomView rendering
src/ui/map/store/gameStore.ts                      # Add warroom state slice
src/ui/map/components/TopToolbar.tsx                # Add HQ/warroom toggle button
src/desktop/electron-main.cjs                      # Load React app instead of warroom
package.json                                       # Remove warroom build scripts
docs/40_reports/WARROOM_MASTER.md                  # Update documentation
```

### Deleted (entire warroom app)
```
src/ui/warroom/                                    # All 38 TS + 77 assets + 3 CSS + 2 HTML + vite.config.ts
dist/warroom/                                      # Build output
tools/ui/warroom_stage_assets.ts                   # Staging tool
tools/ui/warroom_regions_all_modals.ts             # Region tool
tools/ui/warroom_resize_assets.ts                  # Asset resize tool
```

---

## Risk Assessment

### High Risk
- **Phase 0 flow**: The War Planning Map and Phase 0 Preparation Map are complex canvas renderers with custom zoom, pan, click-to-select, and investment UI. Porting to MapLibre is simpler architecturally but requires careful feature parity testing. **Mitigation:** Task 3.4 explicitly reuses the existing MapLibre map infrastructure (which already renders OSID polygons with faction colors) rather than building a new canvas map.

- **Electron routing change**: Changing `loadURL` from warroom to React app is a single-point-of-failure change that affects all desktop users. **Mitigation:** Phase 4 is last. By then, all warroom content is verified working in React. The old warroom build can be kept as fallback until Phase 4.6 passes.

### Medium Risk
- **Hotspot geometry scaling**: The 2752x1536 region JSON coordinates must scale correctly to the React viewport. **Mitigation:** Task 2.4 uses the same scaling math already in `ClickableRegionManager.ts`.

- **Module singleton state**: `warroom_state.ts` uses module-level singletons (`_previousSnapshot`). In React this should be Zustand state. **Mitigation:** Task 2.1 adds Zustand slice; Task 0.4 moves the file as-is first.

- **IPC contract changes**: Phase 0 turn advancement currently runs browser-side (`run_phase0_turn.ts`) without IPC. In Electron mode, turns advance via `advanceTurn` IPC. Both paths must work. **Mitigation:** Task 3.5 preserves both paths (IPC for Electron, direct for dev).

### Low Risk
- **CSS migration**: Warroom uses 3 CSS files (`modals.css`, `ticker.css`, `war-planning-map.css`). React components use Tailwind inline. **Mitigation:** Port styles to Tailwind classes during modal conversion. No CSS files to maintain.

- **Asset size**: 77 image files (~30MB est.) moving into the React build. **Mitigation:** Only copy runtime-used assets (HQ backgrounds, flags, crests). Drop `_old/`, `raw_sora/`, and source PNGs (keep webp only).

---

## Done Gate

All of the following must be true:

1. `npx tsc --noEmit` passes with zero errors
2. `npm run test:vitest` passes (1204+ tests)
3. `npm run desktop:map:build` succeeds
4. `npm run desktop` launches and the full game flow works: Main Menu -> Side Picker -> Phase 0 (if applicable) -> War -> Warroom View (all hotspots) -> Tactical Map -> Army HQ -> End Game -> Verdict Screen
5. `src/ui/warroom/` directory is deleted
6. No `warroom` entries in `package.json` scripts
7. `docs/40_reports/WARROOM_MASTER.md` updated with new architecture
8. No warroom-related TypeScript compilation warnings or unused imports
