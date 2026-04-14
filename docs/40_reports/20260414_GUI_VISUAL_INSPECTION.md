# GUI Visual Inspection Report — 2026-04-14

**Purpose:** Thorough browser-based inspection of every visible aspect of the tactical map GUI. No code changes — observation and documentation only.

**Server:** Vite dev server, port 3002 (1920×1080 viewport)
**State:** Turn 40, 6 Jan 1993, RS faction, 312 formations, 822 control entries
**Method:** Claude Preview tools (snapshot, screenshot, eval, console). Screenshots intermittently failed due to WebGL canvas display surface issue.

---

## P0 — Bugs (Broken/Incorrect Behavior)

### 1. Deck.gl WebGL device import failure (repeated console error)
- **Error:** `deck: Failed to fetch dynamically imported module: .../webgl-device-I3YC5VBZ.js?v=7a48b3e6` — 504 Outdated Optimize Dep
- **Impact:** Deck.gl formation counters, health bars, supply dots, status icons, stack badges, and glow rings are ALL broken. These are the default render path (`deckFormationCounters: true`). No formation markers visible on the map at all.
- **Cause:** Stale Vite dependency optimization cache. The `v=7a48b3e6` hash is outdated.
- **Fix:** `rm -rf src/ui/map/node_modules/.vite` and restart dev server. Consider pinning `optimizeDeps.include` in vite config for deck.gl WebGL device.

### 2. Faction picker version shows "v0.6.1" (should be v0.8.x)
- **Location:** `SidePickerOverlay` dialog, bottom-left corner
- **Text:** `v0.6.1`
- **Impact:** Misleading to player and developer. The game is at v0.8.4+.
- **Fix:** Update the version string source (likely hardcoded in `SidePickerOverlay.tsx` or read from package.json which may be outdated).

### 3. Peace plan modal: all territorial divisions show 0%
- **Location:** Peace plan modal (Vance-Owen), "Proposed Territorial Division" section
- **Text:** "Republic of Bosnia and Herzegovina 0% / Republika Srpska 0% / Croatian Republic of Herzeg-Bosnia 0%"
- **Impact:** The peace plan offers no information about what the player is accepting or rejecting. The territorial percentages are the core decision input.
- **Observation:** Other faction responses show "accepted" — the modal is functional but data-empty.

### 4. Peace plan modal: "Proposed: Week 40" — raw week number, not a date
- **Location:** Peace plan header
- **Text:** "Proposed: Week 40"
- **Impact:** Inconsistent with the rest of the UI which uses "6 Jan 1993" date format. Player sees raw engine week number.
- **Fix:** Use `turnToDateString()` like other UI components.

### 5. ARBiH decoration visible to VRS player in RECORDS tab
- **Location:** Army HQ → RECORDS → After-Action Report → Decorations Awarded
- **Text:** "ARBiH — 108th 'Brčko' Brigade — tier 2"
- **Impact:** Player sees enemy faction's decorations. This violates the player-safe information boundary. Only own-faction records should appear.

### 6. War Summary modal (toolbar SUMMARY) appears empty
- **Location:** War Summary modal opened via SUMMARY toolbar button
- **Content:** Title "War Summary", date, and 7 sub-tabs (Overview, IVP, Convoys, Casualties, Support, OPSEC, Capital) are present, but no content renders below the tabs.
- **Impact:** The SUMMARY toolbar button is a dead end — no useful information displayed. The identical War Summary in Army HQ → SUMMARY tab works fine.
- **Note:** This may be the same content that the HQ SUMMARY tab shows (which DID work). Possibly a render context issue where the standalone modal version doesn't receive data.

### 7. Map right half appears blank/missing terrain
- **Observation:** In the screenshot, the right ~40% of the map shows pale/empty terrain (no hillshade, no control colors, no front lines). The left side renders correctly with territory fills and front edges.
- **Possible cause:** PMTiles tile loading failure for higher zoom extents, or the map center is panned to the edge of Bosnia data coverage (showing Croatia/Serbia which have no data).

---

## P1 — Visual/UX Issues (Functional but Wrong)

### 8. Corps card casing inconsistency: "Sarajevo Romanija corps" vs "1ST KRAJINA CORPS"
- **Location:** Command sidebar, corps card headers
- **Details:** Five corps show uppercase names ("1ST KRAJINA CORPS", "2ND KRAJINA CORPS", "DRINA CORPS", "EAST BOSNIAN CORPS", "HERZEGOVINA CORPS"). The sixth shows mixed case with lowercase "corps": "Sarajevo Romanija corps".
- **Impact:** Visual inconsistency. Likely a data source issue (the corps name string itself has inconsistent casing).

### 9. "Sarajevo Romanija corps" card wraps to 2 lines (49px vs 33px for others)
- **Location:** Command sidebar, last corps card
- **Impact:** The longer name causes the card header to be taller than all other cards, breaking the visual rhythm of the corps list.

### 10. Strategic Position panel shows raw numeric scores
- **Location:** Army HQ → BRIEFING → Strategic Position (right side)
- **Values:** "NEGOTIATING CAPITAL 65", "77", "62", "0", "95", "45", "73" with percentage weights (25%, 25%, 10%, 15%, 10%, 15%)
- **Impact:** Per life lesson "Player-facing state must go through tier-gated abstraction functions — never expose raw numerics." These raw numbers should be abstracted to labels like "Strong", "Weak", "Critical".

### 11. Exhaustion clock shows raw "400" with "WANING"
- **Location:** Army HQ → BRIEFING → center right, next to faction crest
- **Text:** "WANING" and "400"
- **Impact:** Raw number "400" is meaningless to the player without context. Should show a descriptive label or progress bar.

### 12. OPS panel doesn't toggle off when clicking OPS button again
- **Location:** Presidential toolbar OPS button
- **Behavior:** Clicking OPS opens the Field Ops Snapshot panel on the right. Clicking OPS again does not close it. Escape key also doesn't close it.
- **Impact:** No clear way to dismiss the OPS panel without opening a different panel.

### 13. "Institutional model:" field is empty in peace plan modal
- **Location:** Peace plan modal, below territorial division
- **Text:** "Institutional model: " (no value follows the colon)
- **Impact:** Missing data. Should show the proposed institutional model (e.g., "Decentralized provinces" for Vance-Owen).

### 14. Operational SITREP "162 exposed front sectors require immediate attention"
- **Location:** Army HQ → SUMMARY → Operational SITREP
- **Text:** "162 exposed front sectors require immediate attention. 609 hostile takeover timers remain active."
- **Impact:** 162 exposed sectors out of 297 engaged (55%) seems like an absurdly high number. This may be a genuine engine data issue rather than a display bug, but it reads as alarming to the player. Also, "hostile takeover timers" is engine jargon — not player-safe language.

### 15. Bottom status bar: "Friendly 64.5% →|Hostile-held 35.5%" — pipe separator
- **Location:** Bottom status strip, center
- **Text:** Uses `→|` as separator between friendly and hostile territory
- **Impact:** The pipe character `|` looks like a rendering artifact. Should use a proper separator (em dash, bullet, or spacing).

### 16. "AUTH 100" badge in toolbar — unexplained
- **Location:** Presidential toolbar, right side, before ADVANCE TURN
- **Text:** "AUTH" with "100"
- **Impact:** "AUTH" is not a self-explanatory label for the player. This is likely the Command Authority score. Should show a tooltip or use a clearer label like "AUTHORITY" or show it as a gauge.

### 17. Peace plan modal: "Republika Srpska: accepted" when player IS RS
- **Location:** Peace plan modal, "Other Faction Responses"
- **Text:** "Republika Srpska — accepted"
- **Impact:** The player's own faction is listed under "Other Faction Responses" — but the player hasn't made a decision yet (the Accept/Reject buttons are showing). This implies RS already accepted before the player chose. Bug in decision state.

---

## P2 — Polish/Enhancement Opportunities

### 18. Left sidebar (COMMAND) visible behind Army HQ modal
- **Location:** When Army HQ is open, the Command sidebar with corps cards is still visible on the left behind the semi-transparent modal overlay.
- **Impact:** Visual noise. The sidebar content is not interactive when the modal is open. Consider hiding or dimming the sidebar more aggressively.

### 19. DEV strip and DEV badge always visible
- **Location:** Top bar shows "DEV" badge next to date, and a DEV strip below toolbar with LOAD/LATEST/SYNC/SAVE buttons.
- **Impact:** Expected in dev mode. But the DEV badge sits between the date and the toolbar buttons, consuming horizontal space. Consider moving it to the far edge or making it smaller.

### 20. Corps card flip: both front and back are in DOM simultaneously
- **Location:** Command sidebar, every corps card
- **Observation:** The accessibility snapshot shows both the front (corps name, personnel, equipment) and the back (← Back, COMMANDER, FRONT SECTORS, OPERATIONS, Personnel, Brigades, Avg Cohesion) for every corps card simultaneously.
- **Impact:** Screen readers will read duplicate/confusing content. The hidden side should have `aria-hidden="true"` or be conditionally rendered.

### 21. "Order Queue (0)" label visible but no queue content
- **Location:** Bottom of Command sidebar (at y=1004 in the viewport)
- **Text:** "ORDER QUEUE (0)"
- **Impact:** Shows an empty queue label. If the queue is always empty in the current game state, consider hiding it until there are orders queued.

### 22. "Mobilization 3 ▶" / "Operations 1 ▶" / "Sectors 27 ▶" — collapsed sections below corps list
- **Location:** Command sidebar, below all corps cards (y > 1800, requiring extensive scrolling)
- **Impact:** These important sections are buried below 6 corps cards that each take ~240px. On a 1080p viewport, the user must scroll past all corps cards to see Mobilization, Operations, and Sectors summaries.

### 23. Minimap renders in bottom-right (249×179) but no toggle visible
- **Location:** Bottom-right corner of the map
- **Impact:** The minimap is showing but there's no visible toggle button to hide/show it. The GUI_MASTER mentions a minimap toggle exists — it may be in the bottom status strip.

### 24. No formation markers visible on map
- **Location:** Main map area
- **Observation:** No brigade/formation markers, labels, or icons visible anywhere on the map. Related to P0 #1 (Deck.gl failure). Without Deck.gl, the fallback MapLibre markers should display but appear to also be hidden (`formation-markers`/`formation-labels` hidden when `deckFormationCounters: true`).
- **Impact:** The player cannot see where any units are positioned. This is the most visually impactful bug.

### 25. Map click does not open a selection panel
- **Location:** Clicking center of map
- **Observation:** Clicking on the map at the center (which should be over Bosnia territory) does not open any settlement/OSID selection panel on the right side.
- **Possible cause:** Without Deck.gl working, the click hit-test layer may also be broken, or the clicked area may be outside data coverage.

### 26. "Hostile-held 35.5%" — friendly percentage has no label prefix
- **Location:** Bottom status strip territory bar
- **Text:** "64% 36% Friendly 64.5% →| Hostile-held 35.5%"
- **Impact:** The "64%" and "36%" appear as redundant label-less percentages before the labeled ones.

---

## Console / Network Issues

### 27. Only error type: Deck.gl WebGL import (12+ occurrences)
- All console errors are the same `webgl-device-I3YC5VBZ.js` 504 failure, repeated across multiple HMR reconnections.
- No React rendering errors, no data loading errors, no TypeScript runtime errors.
- The app is otherwise stable — state loads correctly, navigation works, modals open/close.

### 28. Multiple Vite HMR reconnection cycles
- Console shows 3+ cycles of `[vite] connecting... / connected` pairs.
- Likely caused by port conflicts at startup (3001/3002/3003 all in use).

---

## Summary

| Priority | Count | Key Items |
|----------|-------|-----------|
| **P0 — Bugs** | 7 | Deck.gl broken (no formation markers), version wrong, peace plan 0% data, ARBiH leak to VRS, War Summary empty |
| **P1 — UX** | 10 | Corps casing, raw numbers in Strategic Position, OPS toggle, pipe separator, AUTH label |
| **P2 — Polish** | 9 | Sidebar behind modal, flip card a11y, buried sidebar sections, empty order queue |

**Most critical path:** Fix P0 #1 (Deck.gl dep cache) — this single issue causes P0 #24 (no markers) and likely P0 #25 (no click interaction). Clearing the Vite dep cache should restore formation counters, health bars, and likely fix map click interactions.

**Second priority:** P0 #3 (peace plan 0%) and P0 #5 (ARBiH leak) are data/logic bugs that affect gameplay correctness.
