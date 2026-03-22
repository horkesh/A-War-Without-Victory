# War Map UI/UX Tasks

## Phase 2: Roads, Rivers, Labels
- [x] Implement cased road network to Day texture
- [x] Add styled rivers (with stream order scaling) to Day texture
- [x] Implement progressive-disclosure label system in 3D
- [x] Add always-visible international boundaries
- [x] Add togglable municipality boundaries layer
- [x] Run `@[/refactor-pass]` workflow

## Phase 3: Tactical Data Overlay
- [x] Create [SettlementControlLayer.ts](file:///f:/A-War-Without-Victory/src/ui/map/SettlementControlLayer.ts) (faction-colored polygons)
- [x] Create [FrontLineLayer.ts](file:///f:/A-War-Without-Victory/src/ui/map/FrontLineLayer.ts) (faction-colored double borders on contact edges if units neighbor)
- [x] Add mode switch toggles UI component (`SettlementControlLayer`, etc)
- [x] Implement contested settlement patterns
- [x] Apply battle damage darkening and territorial depth shading
- [x] Run `@[/refactor-pass]` workflow

## Phase 4: Data Integration & Polish (NATO Counters)
- [ ] Create `FormationSpriteLayer.ts` for 3D counters
- [ ] Implement corps-color-coded backgrounds on sprites
- [ ] Attach soft-factors indicator triangles to sprites
- [ ] Build `D` key counter data-mode cycler
- [ ] Implement robust zoom-tier filtering and grouping (LOD)
- [ ] Run `@[/refactor-pass]` workflow

## Phase 5: Right-Click Orders and Movement Preview
- [ ] Create `RightClickHandler.ts` for 3D selection
- [ ] Wire `query-movement-range` and `query-movement-path` IPC queries
- [ ] Instantiate `MovementRangePreview.ts` overlays
- [ ] Generate an `OrderArrowLayer.ts` for 3D trajectory lines
- [ ] Assemble the `OrderQueuePanel.ts` HTML staging overlay
- [ ] Run `@[/refactor-pass]` workflow

## Phase 6: Attack Odds and Combat Estimate
- [ ] Wire IPC messaging to support `query-combat-estimate`
- [ ] Create `AttackOddsPreview.ts` hover tooltip
- [ ] Run `@[/refactor-pass]` workflow

## Phase 7: Fog of War
- [ ] Retain `last_seen_turn` in [ReconIntelligence](file:///f:/A-War-Without-Victory/src/state/game_state.ts#122-128) contract
- [ ] Create `FogOfWarLayer.ts` for ternary state shading
- [ ] Render decaying "ghost counters" for stale contacts
- [ ] Add recon quality gradients and `Shift+F` intel switching
- [ ] Run `@[/refactor-pass]` workflow

## Phase 8: Map Modes
- [ ] Abstract a `MapModeController.ts` for F-key inputs
- [ ] Build `SupplyOverlay.ts` (F3 mode)
- [ ] Build `DisplacementOverlay.ts` (F5 mode)
- [ ] Build `CorpsSectorOverlay.ts` (F8 mode)
- [ ] Run `@[/refactor-pass]` workflow

## Phase 9: Battle Visualization
- [ ] Add `battle_events[]` to `TurnReport`
- [ ] Create `BattleMarkerLayer.ts` effect meshes
- [ ] Orchestrate chronology-based inter-turn animation
- [ ] Apply visual indicators for snap events
- [ ] Run `@[/refactor-pass]` workflow

## Phase 10: Command Hierarchy View
- [ ] Author chain-of-command topology overlay (`~` key)
- [ ] Render named operation physical zones
- [ ] Sync map click-through behavior to Army/Corps tracking UI
- [ ] Run `@[/refactor-pass]` workflow

## Phase 11: Post-Processing and Audio
- [ ] Enable `EffectComposer` architecture in `postfx/`
- [ ] Setup CRT scanlines, vignette, and chromatic aberration layer
- [ ] Activate glowing bloom passes on text layer and frontlines
- [ ] Assemble `audio/` singleton connecting Web Audio API
- [ ] Run `@[/refactor-pass]` workflow

## Phase 12: Polish and Integration
- [ ] Scrutinize [MapApp.ts](file:///f:/A-War-Without-Victory/src/ui/map/MapApp.ts) and surgically extract DOM logic into `panels/`
- [ ] Conduct 52-week determinism validation against command-line
- [ ] Conduct WebGL shader loop framing optimization (lock to 60fps average)
- [ ] Populate user settings modal configuring visual overlays
- [ ] Run final `@[/refactor-pass]` workflow
