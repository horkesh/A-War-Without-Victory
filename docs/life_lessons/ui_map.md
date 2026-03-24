# Life Lessons — UI, GUI, MapLibre, Rendering, React
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [MapLibre] visibility:hidden > display:none for stable context (2026-03-20)
- **Problem**: Toggling `display:none` on a MapLibre container (like the Minimap) frequently causes layer re-render failures or blank screens if context isn't handled perfectly (M1 - P1 UI Audit).
- **Right approach**: Keep the map in the layout to preserve its context. Use `visibility: hidden`, `opacity: 0`, and `pointer-events: none` to hide it.
- **Do instead**: When toggling map visibility, use CSS opacity/visibility and always call `map.resize()` inside a `requestAnimationFrame` to ensure the resize happens after the DOM has updated.

### [MapLibre] Never use setData() on dynamic sources in modal maps — VIOLATED 2026-03-19
- **Violation evidence**: Marked GUI_MASTER section 4 as "RESOLVED" after the ops modal redesign, claiming `setData()` worked. It worked for the initial render only. When the user changed staging OSID, arrows silently stopped updating. Spent 3 fix cycles on wrong theories (distance scaling, empty centroid lookup, stale deps) before recognizing the same bug documented since 2026-03-11.
- **Cost**: 3 wasted fix iterations. User saw broken arrows across multiple test cycles.
- **Root cause**: `setData()` on `map.addSource()`-created GeoJSON sources works for initial data but silently fails on updates in modal/secondary MapLibre instances. Sources defined in base style JSON work fine.
- **Right approach**: The workaround was already documented in GUI_MASTER section 4 and in the old `OpsPlanningModal.tsx` (`replaceArrowSourceData`): remove all layers + source, re-add with new data. Should have applied this from the start.
- **Rule**: In ANY MapLibre map inside a modal/overlay, NEVER use `setData()` for dynamically-added sources. Always use remove+re-add. Before claiming a known bug is "resolved," reproduce the specific failure mode (update after initial render), don't just verify initial render works.

### [Rendering] Front line continuity requires cross-group stitching + BFS bridging through ALL polygon edges (2026-03-19) — NEW
- **Context**: Front lines had gaps at triple junctions where 3 OSIDs meet. The game renderer (`buildCorpsFrontLinesGeoJSON.ts`) stitched segments within sector groups but not across groups. The BFS bridge initially only walked through edges shared by exactly 2 OSIDs, missing exterior polygon edges.
- **Wrong approach**: (1) Stitching only within sector groups — gaps at group boundaries. (2) BFS through `osids.size === 2` edges only — exterior polygon edges (shared by 1 OSID) are essential for boundary walks at triple junctions. (3) Adding bridge connector features instead of merging chains in-place — disconnected short segments instead of continuous lines.
- **Right approach**: Three-step algorithm proven in edges viewer, then ported verbatim: (1) Flatten ALL segments across all groups, stitch via exact endpoint matching. (2) BFS-bridge dead ends through ALL non-hostile polygon edges (including exterior), max 8 hops. (3) Merge chains in-place during bridging. Results: 359 chains -> 22 after 339 bridges.
- **Do instead**: When rendering polygon boundary features (front lines, sector demarcation, etc.), always include exterior/boundary edges in the adjacency graph. The `osids.size === 2` filter is correct for finding HOSTILE edges but wrong for building the FRIENDLY walk graph. The walk needs to traverse any non-hostile edge, including exterior ones.

### [Rendering] MapLibre symbol layers are globally broken — use Deck.gl TextLayer (2026-03-21) — NEW
- **Context**: Settlement labels (27 major cities) were added as a MapLibre `symbol` layer with correct data (27 features), correct font PBFs (200 OK), correct layer config — but `queryRenderedFeatures` returned 0 for ALL 7 symbol layers in the map. "Unimplemented type: 4" errors from OSM PMTiles corrupt the symbol rendering pipeline.
- **Wrong approach**: Debugging the label layer in isolation (font loading, source data, layer ordering, collision detection). The problem is global — no symbol layer renders, not just labels.
- **Right approach**: Bypass MapLibre symbols entirely. Use Deck.gl `TextLayer` for text rendering — it uses its own WebGL pipeline and is unaffected by MapLibre's broken symbol pass. `fontSettings: { sdf: true }` for outlines, `characterSet: 'auto'` for Bosnian diacritics (C, S, C, Z).
- **Do instead**: Never use MapLibre `type: 'symbol'` layers for text in this project. All text rendering goes through Deck.gl TextLayer. If you need icons, use Deck.gl IconLayer (already used for formation counters).

### [MapLibre] isStyleLoaded() returns false during map.on('load') after adding sources — don't use style-loaded guards in init (2026-03-19) — NEW
- **Context**: Ops modal arrow source and layers were never created during map init. `replaceArrowSource()` was called inside the `map.on('load')` callback, but after adding other sources (territory, front lines, objectives, staging) in that same callback, `isStyleLoaded()` returns false. MapLibre's style state transitions to "loaded" before the callback, but adding sources during the callback puts the style back into a non-loaded state internally. Any code that guards on `isStyleLoaded()` will skip.
- **Wrong approach**: Using `replaceArrowSource()` (which does remove+re-add) during init. The remove step finds nothing to remove (source doesn't exist yet), then the add step runs, but the style-loaded state is already compromised by earlier source additions in the same callback. The source appears to be added but layers silently fail to render.
- **Right approach**: During the `map.on('load')` init callback, create sources and layers directly via `map.addSource()` + `map.addLayer()` without any `isStyleLoaded()` guards. Reserve the remove+re-add pattern (`replaceArrowSource`) for subsequent updates triggered by React effects, where the style IS fully loaded.
- **Do instead**: In any MapLibre `map.on('load')` callback, never gate source/layer creation on `isStyleLoaded()`. If you have a helper function that does remove+re-add (designed for updates), do NOT call it during init — the "remove" step is a no-op and the "add" step may silently fail. Create init sources/layers inline, then use the helper for updates only. This is distinct from the `setData()` modal bug (GUI_MASTER section 4) — that bug affects updates, this one affects init.

### [GUI] GameStateAdapter field paths: always verify `state.military.*` (2026-03-10)
- **Context**: Sectors stopped being clickable, hoverable, and highlighting. No white glow line. No zoom from Command. Investigation took hours across MapLibre layer timing, queryRenderedFeatures, line-offset, React race conditions — all red herrings.
- **Wrong approach**: Debugging MapLibre layers, adding diagnostic click handlers, testing line-offset behavior. The entire rendering and interaction pipeline was correct — it simply had no data to work with.
- **Right approach**: A single `console.warn` showing `frontEdgesOsid: undefined` in `runUpdate` revealed the root cause in seconds. `GameStateAdapter.ts:1201` read `(state as any).war_front_edges_osid` instead of `state.military.war_front_edges_osid`. The field was in the save data but at the wrong path — silently returning `undefined`, causing the entire downstream chain (source -> layers -> interactions -> highlights) to never initialize.
- **Do instead**: When a GUI feature "stops working," check `GameStateAdapter.ts` field paths first. Log the field value before any layer/interaction debugging. Watch for `(state as any).X` patterns that should be `state.military.X`. The `front_edges` field (line 1185) correctly uses `state.military.front_edges` — use it as a reference pattern.

### [GUI] Never show raw engine values to the player (2026-03-07)
- **Context**: Officer stats were displayed as raw 1-5 integers. Players saw "Competence: 3" with no context.
- **Wrong approach**: `Math.round(stat * 100)` or showing raw integers. Meaningless to players, breaks immersion, invites min-maxing.
- **Right approach**: `OfficerProfile` component with archetype labels ("Master Strategist"), pip ratings, descriptive text, and origin badges. The underlying 1-5 values drive mechanics but are never shown.
- **Do instead**: Every engine value shown to the player must go through a presentation layer that gives it meaning. Pips, bars, descriptive labels, archetypes — never raw numbers.

### [GUI] Defer heavy work off the main thread (2026-03-01)
- **Context**: Formation icon creation (canvas draw + getImageData + MapLibre GPU upload) was synchronous in a single rAF, freezing the UI for hundreds of milliseconds per load.
- **Wrong approach**: Doing DOM manipulation, image encoding, and GPU operations synchronously in the render path.
- **Right approach**: `requestIdleCallback` with 400ms timeout deferred icon loading without blocking UI. Heavy work belongs off the hot path.
- **Do instead**: Any work touching DOM, canvas, or GPU inside a render callback needs a `requestIdleCallback` or next-tick defer. If the UI stutters during load, find the synchronous work in the render path.

### [UI] Agent-generated aesthetics must match the established design language — never CRT/terminal on a warroom game (2026-03-21) — NEW
- **Context**: An external agent restyled ArmyHQModal as a green CRT terminal ("NATO MISSION TERMINAL v4.2", `#4af626` phosphor green, scanline overlay, teletype ticker, glowing dots). The game's design spec (HOI_VISUAL_GUI_OVERHAUL_SPEC.md) explicitly says "warmth of wood-paneled offices and brass fixtures rather than CRT terminals."
- **Wrong approach**: Letting agents make autonomous aesthetic decisions without referencing the design spec or matching existing panels. The agent invented a new design language instead of extending the existing one.
- **Right approach**: All UI panels must use the established warroom palette: `bg-panel-bg`, `bg-panel-card`, `border-panel-border`, `text-text-primary`, `text-text-secondary`. Amber/gold accents for headings. No green terminal, no CRT effects. Reference CorpsDetail, FormationDetail, SettlementPanel for the canonical style.
- **Do instead**: Before any UI aesthetic work, read HOI_VISUAL_GUI_OVERHAUL_SPEC.md and GUI_MASTER.md. Match existing panels. When reviewing agent-generated UI, immediately check for palette violations (green text, CRT effects, terminal chrome).

### [UI] Never share MapLibre layers between independent selection highlights (2026-03-16) — NEW
- **Context**: Brigade AoR highlighting needed to show the selected brigade's sub-segment front line. Five attempts tried to reuse the existing sector edge glow layers (shared between sector/corps highlight and brigade highlight). Each attempt caused one system to break the other — race conditions between useEffects, hover overwriting click, clear paths erasing each other's state.
- **Wrong approach**: Sharing MapLibre layers between two independent selection features (sector highlight and brigade highlight). Setting filters on shared layers from two different useEffects creates a last-writer-wins race. Suppressing hover when a brigade is selected broke sector navigation.
- **Right approach**: Create DEDICATED MapLibre layers for each selection feature. Brigade AoR uses `brigade-aor-pos` and `brigade-aor-neg` layers on the same source but with independent filters and opacity. Sector highlight is completely untouched.
- **Do instead**: When adding a new map highlight feature, ALWAYS create new layers. Never reuse layers owned by another useEffect. Shared source is fine; shared layers are not.

### [UI] Verify which server the user is testing on before debugging (2026-03-17) — NEW
- **Evidence**: Spent multiple iterations debugging map click handlers that were "not working." The user was testing on port 3002 (Electron built bundle) while code changes only went to port 3001 (Vite dev server via HMR). All fixes were correct but invisible to the user.
- **Root cause**: Assumed the user was on the dev server. Console errors showed `MapContainer.tsx:253` (main map) and `localhost:3002` (Electron port), not the OpsMap renderer.
- **Rule**: When a UI fix "doesn't work" despite code being correct, check: (1) Which port/server is the user on? (2) Is HMR reaching them or do they need a rebuild? (3) Are console errors from the right component? Ask early: "Are you on localhost:3001 or 3002?"

### [React] useEffect timing: never set external handlers in a separate effect from object creation (2026-03-17) — NEW
- **Evidence**: OpsMapRenderer's `onOsidClick` was set in a useEffect with deps `[state.selectedAxisId, state.axes, ...]`. The renderer was created in a different useEffect with dep `[isOpen]`. React's effect lifecycle cleared the handler between re-runs, leaving `onOsidClick = undefined` at click time. Console confirmed: map fired, features found, but `onOsidClick? false`.
- **Root cause**: Separate useEffects with different dependency arrays create a timing gap where cleanup of one effect clears state that another effect set.
- **Rule**: When an external object (class instance, MapLibre map, etc.) needs a callback from React state, use a **ref** to hold the latest state and set the callback ONCE in the same effect that creates the object. The callback reads from the ref at invocation time. Never use a separate useEffect to wire callbacks to externally-created objects.
- **Fix**: `clickStateRef.current = { selectedAxisId, axes, ... }` updated every render. `onOsidClick` set once in `[isOpen]` effect, handler reads from ref.
