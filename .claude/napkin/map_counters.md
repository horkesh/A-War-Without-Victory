# Map Counters Archive Pointer

Full pre-restructure archive: ./full_archive_20260708.md

Use this topic when working on tactical map counters, Deck.gl, MapLibre pitch/terrain, chrome occluders, stack expansion, hover context, or formation physical locations.

High-value current rule: Deck counters are screen-space command symbols. Keep tactical Deck overlay non-interleaved and counter layers depth-disabled on the 2.5D map.

2026-07-09 startup rule: critical formation counter visibility must not depend on `requestIdleCallback` or optional overlay source readiness in Electron iframes. Do instead: render the DOM fallback from player-visible formation GeoJSON immediately after control GeoJSON is ready, using the same truthful OSID screen projection as Deck.

2026-07-10 QA metric rule: desktop bridge raw formations live under `military.formations`, not top-level `formations`. Empty-map QA must report raw owned formations, located owned formations, rendered counter count, and region-specific matches (for example Krajina) before declaring units absent.

2026-07-12 current-state readiness rule: a MapLibre `load` event is not sufficient proof that the tactical map represents the loaded campaign. Keep the loading surface active until the required control source and formation-counter projection have rendered for the current turn and loaded-save fingerprint. Required-source readiness has a bounded timeout and retry; optional MapLibre source errors remain diagnostics. Direct Playwright/Electron harness runs must start and verify the tactical Vite host on port 3002 first, then require current-turn readiness and nonzero visible player counters whenever located player formations exist.

2026-07-12 exact-interaction rule: the accessible DOM overlay is the named-counter interaction owner. Synchronize its screen projection on viewport movement, discard buttons covered by live shell occluders, and pass exact selection intent so a stacked named counter opens that formation rather than a generic location stack. Deck/map background selection can remain stack-aware.

2026-07-12 replay-surface rule: Electron QA must test what the player can see, not merely what React left attached. Before selecting a route/tab/action, require the owning parent to be visible; after clicking, require the destination to become visible and capture evidence. Hidden mounted Warroom/React copies are not valid route success.

2026-07-12 truthful-edge/stack rule: never clamp or relocate a formation counter to the viewport edge; omit it when its true projection is off-screen or occluded. Fan co-located counters deterministically with at most 12 visible members, preserve the complete stable membership in the stack picker, and prove exact-member selection from a real final-state stack.

2026-07-12 stale-hit rule: while turn/save readiness is changing, cover and inert the previous canvas and publish fallback/Deck counters only from the current viewport-selected dataset. Hidden or stale formations must not remain interactive beneath loading or shell chrome.

2026-06-26 focused-control shortcut rule (demoted from the napkin index 2026-09-03 when the toolbar-budget rule took the tenth slot — the rule itself still stands): global shortcuts must respect focused controls. Guard app-level key handlers with interactive-focus checks and use modified shortcuts for global cycling, so typing in an input never triggers a map/shell action.


<!-- relocated-from-index-2026-09-12:Map & UI Shell -->
## Map & UI Shell
0a. **[2026-09-12] SOURCE-STRING TESTS CANNOT SEE LAYOUT — photograph a visual change before reporting it done**
   Do instead: drive the real app and assert the rendered result — non-zero font size, a laid-out bounding box, the intended font actually loaded, the element inside its container — and make the rig FAIL, not just save a picture. The warroom date was reported complete on 298 green tests, a clean `tsc` and a green build while it rendered at **`font-size: 0px`** in the **wrong year's room**. Both were invisible to every test because every test read source text. Rig: `logs/warroom-marker-date/capture-board.mjs` (route in: `?dev=1` → DESK → close `desk-close-overlay`; saves in `tmp_gui_observation/pitch_saves/`).
0b. **[2026-09-12] Percentage padding resolves against the CONTAINING BLOCK, not the element**
   Do instead: on an absolutely-positioned overlay, express inner margins as `left`/`top` on a positioned child, never as `%` padding. `paddingLeft: '10%'` on a 212px board over a 1920px plate became **192px**, inflated the box to a square (a border-box cannot be narrower than its padding) and collapsed the content box to **zero** inline size — so `cqw`, which resolves against that content box, made every glyph `font-size: 0`.
0c. **[2026-09-12] A translucent fill over adjacent polygons REPRINTS the borders you removed**
   Do instead: fill shared-edge polygon meshes with an OPAQUE colour. `factionInkColor` is `rgba(…,0.72)`; ~600 adjacent municipalities double-blend along every shared edge and the mesh reappears as darker lines with no stroke at all. Widening a same-colour stroke makes it worse — that is the tell. Going opaque also removes the blending that was quietly muting the hue, so pre-mute the colour or it comes back fire-engine bright. **AUDITED 2026-09-12 — the tactical map is NOT affected, and the reason is the rendering model, not the colour.** `osid-control-fill` uses the same translucent values (`rgba(180,50,50,0.25)` for RS) but is a MapLibre `fill` layer: one tessellated mesh composited once, with `"fill-antialias": false`. The artefact needs ~600 INDEPENDENT SVG `<path>` elements each blended separately against what is beneath. So the rule is "independently-composited elements", not "translucent faction colours" — carry it to any other SVG overlay, not to MapLibre layers.
0d. **[2026-09-12] `desk_map` / region rects are CLICK TARGETS, not the painted object**
   Do instead: size a diegetic overlay from geometry measured out of the art, not from the hotspot rectangle. Measured against real cork: RBiH within 1%, RS 9% short, HRHB **15% short in width and 35% in height** — the same overlay at the same inset filled one board and floated small on another. `tools/derive_warroom_board_luminance.cjs` measures and commits cork extent per faction. Corollary still open: the hotspots still drive the CLICK, so HRHB's clickable area is now smaller than its board appears.
0e. **[2026-09-12] Cork is not a light meter; the whiteboard is**
   Do instead: estimate a room's illumination from a near-white, near-constant-albedo surface. Cork colour varies by plate (RS 1993 L\*59.5 vs RBiH 1993 L\*28.1) while both rooms are lit, so keying paper to cork gave proper cream on one plate and a dead grey card on the other from one rule.
1. **[2026-09-03] A fixed-center element makes each toolbar half a hard budget**
   Do instead: with the crest pinned over the centre grid column, every item must be `whitespace-nowrap shrink-0` with ONE designated shrinkable (the date); keep reference routes in the left group; give alert chips short labels + full sentence in `title`. **`scrollWidth === clientWidth` CANNOT SEE THIS** — a `justify-end` cluster overflows from the START edge, which LTR `scrollWidth` excludes; that check passed at 1280/1440/1920 while the chip was 74px under the crest at 1400 (caught by Codex review, not by me). Measure child rects against the track and the crest instead (`verify_toolbar_fit.mjs`), and give chips a compact band. See MAP_UI_MASTER "Tactical toolbar single-line contract".
   **[2026-09-09] Also inspect ancestor clipping and actual pixels:** transformed glyph rectangles can be clear while an unchanged region `clipPath` removes every painted character. See the R7 date-label lesson in `docs/PROJECT_LEDGER_KNOWLEDGE.md`.
2. **[2026-07-05] Deck counters are screen symbols, not terrain decals**
   Do instead: keep tactical Deck overlay non-interleaved and counter/label layers depth-disabled.
3. **[2026-07-09] Critical counters do not wait for idle**
   Do instead: render the DOM fallback as soon as control GeoJSON is ready; keep optional overlay sources out of counter readiness gates.
4. **[2026-07-12] Tactical readiness is state-revision readiness**
   Do instead: keep the loading surface active until the required control source and formation counters have rendered for the current turn and loaded-save fingerprint; timeout only required-source failure and leave optional MapLibre errors diagnostic.
5. **[2026-07-04] Stack counters in pixels, not coordinates**
   Do instead: anchor to OSID coordinate, apply Deck pixel offsets, and verify against live UI occluders by screenshot.
6. **[2026-06-25] Formation physical anchors differ from navigation anchors**
   Do instead: use physical location_osid for counters, hovers, stacks, arrows, and settlement truth.
7. **[2026-07-12] Map context and telemetry must be bounded**
   Do instead: clear tactical overlays/selections before Warroom transitions; release MapLibre/Deck contexts and callbacks on unmount; expose only bounded aggregate formation-counter status in DOM telemetry.
8. **[2026-07-12] Named counter controls own exact selection**
   Do instead: synchronize accessible DOM counters on camera movement, filter live chrome occluders, and open the button's exact formation id even when its OSID is stacked; keep generic Deck hits stack-aware.
9. **[2026-07-12] QA routes must be visibly mounted**
   Do instead: require visible parent surface, visible target control, and visible changed destination; hidden React/Warroom copies in the DOM are not player-reachable proof.
10. **[2026-07-15] Modal completion actions stay outside narrative scrolling**
   Do instead: keep the only acknowledge/commit action in a persistent footer and scroll the long dispatch body independently; pin DOM ownership and inspect a real Electron viewport.

> Demoted from Map & UI Shell on 2026-09-03 to keep the 10-cap: the 2026-06-26 focused-control shortcut rule now lives in [map counters](map_counters.md) — demoted to [map counters], not dropped.
