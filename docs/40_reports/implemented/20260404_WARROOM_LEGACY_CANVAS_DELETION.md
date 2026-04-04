# Warroom Legacy Canvas Deletion Pass

Date: 2026-04-04
Commit: 8346e869

## What was deleted

### Imports removed
- 12 HQ scene plate URLs: `hqRbih1992Url` through `hqHrhb1995Url`
- `import { HoverRenderer } from './HoverRenderer.js'`
- `import { WallCalendar } from './components/WallCalendar.js'`
- `import { TacticalMap } from './components/TacticalMap.js'`
- `import { OsidThumbnailRenderer } from './components/OsidThumbnailRenderer.js'`
- `import { ClickableRegionManager } from './ClickableRegionManager.js'`
- `import { NewspaperModal } from './components/NewspaperModal.js'`
- `turnToCalendarMonthYear`, `turnToDateString` from warroom_utils (no remaining callers)

### Constants / module-level helpers removed
- `const REACT_SHELL_ENABLED = true`
- `const WARROOM_SCENE_WIDTH = 1376`
- `const WARROOM_SCENE_HEIGHT = 768`
- `const WARROOM_CALENDAR_REGION_IDS = [...]`
- `const WARROOM_YEAR_PLATE_URLS = {...}`
- `function getPlateYear(...)`
- `const OVERRIDE_REGIONS_URL`
- `function getFactionRegionsUrl(...)`
- `function getInitialRegionCandidates()`

### Class fields removed from WarroomApp
- `private canvas: HTMLCanvasElement`
- `private ctx: CanvasRenderingContext2D`
- `private calendar = new WallCalendar()`
- `private map = new TacticalMap()`
- `private hoverRenderer = new HoverRenderer()`
- `private scenePlateImages: Map<string, HTMLImageElement>`
- `private flagImages: Map<string, HTMLImageElement>`
- `private regionManager = new ClickableRegionManager()`
- `private thumbnailCanvas: HTMLCanvasElement`
- `private thumbnailDirty = true`
- `private osidThumbnail = new OsidThumbnailRenderer()`
- `private renderLoopRunning = false`
- `private lastLoadedRegionsFaction: FactionId | null`

### Methods deleted entirely
- `private loadScenePlateAssets(faction?: FactionId)`
- `private loadImage(src: string)`
- `private loadFlagAssets()`
- `private startRenderLoop()`
- `private stopRenderLoop()`
- `renderLoop()` (was public)
- `render()`
- `private renderCorkBoardMap(...)`
- `private drawPushPin(...)`
- `private renderWhiteboardDate(...)`
- `private onMouseMove(e: MouseEvent)`
- `private onClick(e: MouseEvent)`
- `private loadInitialRegions()`
- `private ensureRegionsLoadedForFaction(faction: FactionId)`
- `private showMapScene()` (only reached via dead regionManager path)

## What was simplified

### `constructor()`
Removed canvas element lookup, width/height assignment, and ctx setup. Now just calls `this.init()`.

### `async init()`
- Removed `Promise.all` containing `loadScenePlateAssets`, `calendar.loadAssets`, `map.loadAssets`, `loadFlagAssets`, `osidThumbnail.load`
- Removed `loadInitialRegions()` call and all `regionManager.*` setup calls
- Removed `map-scene.appendChild(warPlanningMap.getContainer())` ... wait, that was kept (warPlanningMap is still live)
- Removed canvas `mousemove` and `click` event listeners
- Inlined `awwv-back-to-hq` message handler: removed `REACT_SHELL_ENABLED &&` prefix
- Removed `startRenderLoop()` call at end

### `applyGameStateFromJson()`
- Removed `ensureRegionsLoadedForFaction` call
- Inlined `REACT_SHELL_ENABLED` branch: `showTacticalMapScene('warroom')` is now unconditional (dead `else { this.showScreen('none') }` removed)

### `updateUIOverlay()`
- Removed `osidThumbnail.setControlFromState`, `osidThumbnail.setPlayerFaction`, `thumbnailDirty = true`
- Kept `warPlanningMap` calls and `updateToolbarTurnDisplay`

### `loadMockState()`
- Removed `ensureRegionsLoadedForFaction(params.faction)` call

### `showWarroomScene()`
- Removed legacy canvas comment, `tacticalMapInWarroomMode = false`, and `startRenderLoop()` call

### `openTacticalShellHandoff()`
- Removed `REACT_SHELL_ENABLED &&` prefix from the if-guard

## What was preserved

- `showMainMenu()`, `showSidePicker()`, `showScenarioPicker()`, `showScreen()` — intact
- `wireMainMenuButtons()`, `wireSidePickerButtons()`, `wireScenarioPickerButtons()` — intact
- `wireToolbar()` — intact (toolbar wires mapBtn/sandboxBtn to `showTacticalMapScene()` which still works)
- `loadScenarioFallback()` — intact
- `loadMockState()`, `loadInitialPoliticalControllers()` — intact (minus ensureRegions call)
- `updateToolbarTurnDisplay()` — intact
- `showTacticalMapScene()`, `injectBridgeIntoTacticalMap()` — intact
- `openTacticalShellHandoff()` (simplified), `flushPendingShellHandoff()` — intact
- `handleEmbeddedBridgeSubscription()`, `handleEmbeddedBridgeInvoke()`, `broadcastEmbeddedBridgeEvent()` — intact
- `pullLatestGameState()`, `getDesktopBridge()` — intact
- Flag asset imports (`flagHrhbUrl`, `flagRbihUrl`, `flagRsUrl`) — kept (used in `showSidePicker`)
- `scnApr1992Url` — kept (used in `showScenarioPicker`)
- `gameStartBgUrl` — kept (used in `init()` for main menu background)
- `warPlanningMap` field and `WarPlanningMap` import — kept (still used in `init()` DOM setup and `updateUIOverlay`)

## ClickableRegionManager status
Still exists as a standalone class file (`src/ui/warroom/ClickableRegionManager.ts`). No longer instantiated in `WarroomApp`. Its tests in `warroom_smoke.test.ts` exercise it independently — this is still valid. A note comment was added to the test file documenting this.

## REACT_SHELL_ENABLED status
Deleted. All branches were inlined as the React (true) path. The legacy canvas fallback path is gone.

## Verification
- tsc: clean (0 errors)
- vitest: 1941 passed, 20 failed (all pre-existing — engine_honesty_legacy_contracts, war_phase_step_order; unrelated to warroom)
- vite build: clean (`built in 6.31s`)
- governance: OK (`no governed files changed`)
