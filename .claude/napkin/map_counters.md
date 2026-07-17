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
