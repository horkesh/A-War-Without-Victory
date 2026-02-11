# GUI Improvements Backlog (Warroom-Focused)

**Phase H4.0 — A War Without Victory (AWWV)**  
**Purpose:** Prioritized, implementation-ready backlog for Warroom GUI improvements. All items are Clarification (align UI with canon), Extension (expose existing state, no new mechanics), or Out-of-scope (require new canon/mechanics). Each item includes player value, canon alignment, determinism note, implementation sketch, verification plan, and acceptance criteria.

---

## Priority buckets

- **P0:** Safe, MVP-compatible polish / correctness / clarity; low effort, high clarity.
- **P1:** Medium effort, high UX value, mechanics-neutral.
- **P2:** Requires new canon/mechanics or Phase II+.

---

## P0 (Safe, MVP-compatible)

### WR-1. Label placeholder content in newspaper, magazine, reports, ticker
- **Type:** Clarification  
- **Player value:** Players do not mistake placeholder text for real turn-generated content; aligns with “no false precision” (Phase G, Rulebook).  
- **Canon alignment:** MVP_CHECKLIST (“Placeholder content for newspapers, magazines, reports”); WARROOM_GUI_IMPLEMENTATION_REPORT (placeholder strategy).  
- **Determinism note:** Labels are static or derived from turn index only; no randomness.  
- **Implementation sketch:** In NewspaperModal, MagazineModal, ReportsModal, NewsTicker — add a small subtitle or footer e.g. “Sample content — dynamic generation post-MVP” or “Placeholder”. Files: `src/ui/warroom/components/NewspaperModal.ts`, `MagazineModal.ts`, `ReportsModal.ts`, `NewsTicker.ts`.  
- **Verification:** `npm run warroom:build`; open each modal and ticker; confirm label visible.  
- **Done means:** Every placeholder surface shows a clear “sample/placeholder” indicator.

### WR-2. Diplomacy panel: show “Phase II+” message when red phone clicked
- **Type:** Clarification  
- **Player value:** Clear feedback that diplomacy is planned, not broken.  
- **Canon alignment:** ROADMAP Phase II+; MVP_CHECKLIST post-MVP; region already disabled, tooltip “Diplomacy (Phase II+)”.  
- **Determinism note:** UI-only; no sim state.  
- **Implementation sketch:** In ClickableRegionManager, either enable red_telephone click (remove disabled) and in openDiplomacyPanel() show a small modal “Diplomacy panel — Phase II+. Not available in MVP.” or keep disabled and ensure tooltip is visible. Files: `ClickableRegionManager.ts`; optionally `hq_clickable_regions.json` (enable action, still no backend).  
- **Verification:** Click red phone (or hover if kept disabled); see message or tooltip.  
- **Done means:** User never wonders why diplomacy does nothing; message or tooltip explains Phase II+.

### WR-3. Faction overview: label estimates (personnel, supply days, displaced)
- **Type:** Clarification  
- **Player value:** No false precision; player understands which values are derived/placeholder.  
- **Canon alignment:** Systems_Manual (personnel, supply, exhaustion); Rulebook; Phase G (no false precision).  
- **Determinism note:** Labels are static; values already from state/formulas.  
- **Implementation sketch:** FactionOverviewPanel.ts — add “(Est.)” or “(Placeholder)” next to personnel, supply days, fragmented municipalities, total displaced where formulas are placeholder.  
- **Verification:** Open faction overview; confirm labels on estimated/placeholder fields.  
- **Done means:** Every placeholder or formula-derived field in faction overview is labeled as such.

### WR-4. Document wall map vs War Planning Map (separate GUI system; contested display)
- **Type:** Clarification  
- **Player value:** Design intent clear: wall = simplified, overlay = full contested.  
- **Canon alignment:** HANDOVER_WARROOM_GUI (“wall tactical map still uses simple fill”); Phase_0, Systems_Manual §11 (control_status).  
- **Determinism note:** Docs only; no code change required for this item.  
- **Implementation sketch:** Add short subsection to HANDOVER_WARROOM_GUI or IMPLEMENTATION_PLAN_GUI_MVP: “Wall map shows political control only; contested crosshatch is in War Planning Map (separate GUI system). Both use political_control_data.json; War Planning Map additionally uses control_status_by_settlement_id.”  
- **Verification:** Doc review.  
- **Done means:** Single place in docs states which surface shows contested and why.

### WR-5. Modal ESC and backdrop close consistency
- **Type:** Clarification  
- **Player value:** All modals close the same way; no surprise.  
- **Canon alignment:** UX best practice; already implemented in ModalManager and WarPlanningMap.  
- **Determinism note:** UI only.  
- **Implementation sketch:** Audit ModalManager, WarPlanningMap, advance-turn dialog: all support ESC and backdrop (or explicit close). Ensure advance-turn dialog also closes on ESC. File: ClickableRegionManager.ts (advance turn dialog).  
- **Verification:** Open each modal; press ESC and click backdrop; confirm close.  
- **Done means:** Every modal/overlay can be closed with ESC and (where applicable) backdrop click.

### WR-6. Phase and turn overlay always visible
- **Type:** Clarification  
- **Player value:** Critical info (phase, turn) never hidden.  
- **Canon alignment:** Phase G (phase indicator, turn feedback); MVP.  
- **Determinism note:** Values from state.meta only.  
- **Implementation sketch:** Confirm ui-overlay is not covered by modals (z-index) or that phase/turn are also in a persistent strip. File: index.html, modals.css.  
- **Verification:** Open modal; confirm phase/turn still visible or re-check z-index.  
- **Done means:** Phase and turn remain visible in all normal states (or documented exception).

---

## P1 (Medium effort, high UX value, mechanics-neutral)

### WR-7. Map hover tooltips: settlement name, control, authority (War Planning Map)
- **Type:** Extension  
- **Player value:** Hover over settlement shows name, controlling faction, optional authority without opening a panel.  
- **Canon alignment:** Phase G (settlement inspection); Rulebook (control, legitimacy). Data: political_control_data.json, settlement names if available (settlement_names.json or HANDOVER), authority from state if exposed.  
- **Determinism note:** Tooltip content from canonical data/state only; stable sort for iteration; no timestamp or random.  
- **Implementation sketch:** WarPlanningMap: on mousemove, hit-test polygon (point-in-polygon using same project() as render); lookup masterSid, then name (settlement_names.by_settlement_id[sid] or sid), controller (controlData.by_settlement_id), optional control_status; show tooltip div. Use stable iteration (e.g. polygons sorted by sid). Files: WarPlanningMap.ts; optional settlement_names.json load if present.  
- **Verification:** Hover settlements in overlay map; see name and control; same run twice gives same tooltips.  
- **Done means:** Hover on settlement in War Planning Map shows at least name (or sid) and controlling faction; deterministic.

### WR-8. Map hover tooltips: wall TacticalMap (settlement name, control)
- **Type:** Extension  
- **Player value:** Same as WR-7 on wall map (smaller hit area).  
- **Canon alignment:** Same as WR-7.  
- **Determinism note:** Same as WR-7.  
- **Implementation sketch:** TacticalMap needs mouse events passed from warroom canvas (region “wall_map”) and coordinate transform from canvas to map; then point-in-polygon, lookup, tooltip. More complex due to canvas-in-canvas. Alternatively: only add hover in War Planning Map (WR-7) and document wall as “no hover” for MVP.  
- **Verification:** If implemented: hover wall map settlements, see tooltip; deterministic.  
- **Done means:** Either wall map has hover tooltips or docs state hover is overlay-only for MVP.

### WR-9. Zoom center on click (War Planning Map)
- **Type:** Extension  
- **Player value:** Click map to center zoom on that point; better focus.  
- **Canon alignment:** Phase G (map interaction); no new mechanics.  
- **Determinism note:** Zoom center is view state only; does not affect simulation.  
- **Implementation sketch:** WarPlanningMap: on canvas click, get mouse position in canvas; convert to geo coords using inverse of project(); set zoomCenter to that (normalized 0–1); then cycle zoom or keep level and re-render. File: WarPlanningMap.ts.  
- **Verification:** Click different map areas; zoom centers on click; no sim state change.  
- **Done means:** Clicking the overlay map sets zoom center to click position and preserves or updates zoom level.

### WR-10. Zoom center on click (wall TacticalMap)
- **Type:** Extension  
- **Player value:** Same as WR-9 for wall map.  
- **Canon alignment:** Same.  
- **Determinism note:** View only.  
- **Implementation sketch:** TacticalMap must receive click coordinates in map space (warroom.ts passes canvas coords; region manager gives wall_map bounds; transform to map coords); set zoomCenter and re-render. Files: TacticalMap.ts, ClickableRegionManager.ts or warroom.ts.  
- **Verification:** Click wall map; zoom centers on click.  
- **Done means:** Wall map click (when not opening overlay) centers zoom on click.

### WR-11. Modal focus trap (keyboard tab stays inside modal)
- **Type:** Extension  
- **Player value:** Accessibility; tab does not escape to background.  
- **Canon alignment:** Phase G (accessibility); UI best practice.  
- **Determinism note:** UI only.  
- **Implementation sketch:** ModalManager.showModal: on open, focus first focusable in content; add keydown listener for Tab — if focus would leave modal container, wrap to first/last focusable. Files: ModalManager.ts, modals.css (ensure focusable elements).  
- **Verification:** Open modal; tab repeatedly; focus never leaves modal until close.  
- **Done means:** When modal is open, Tab cycles only within modal content.

### WR-12. War Planning Map: focus trap and focus on open/close
- **Type:** Extension  
- **Player value:** Keyboard users can open (from wall map), close (ESC), and not tab into background.  
- **Canon alignment:** Same as WR-11.  
- **Determinism note:** UI only.  
- **Implementation sketch:** WarPlanningMap show(): focus close button; trap focus in overlay. close(): restore focus to previously focused element (e.g. wall map region or body). File: WarPlanningMap.ts.  
- **Verification:** Open overlay with keyboard; Tab stays in overlay; ESC closes and restores focus.  
- **Done means:** Overlay has focus trap and predictable focus restore.

### WR-13. Post-turn summary (optional): “Turn advanced to N; phase X”
- **Type:** Extension  
- **Player value:** Explicit confirmation of turn advance; optional one-line “what changed” if derived from state.  
- **Canon alignment:** Phase G (turn feedback); state already exists.  
- **Determinism note:** Message from state.meta only; no randomness.  
- **Implementation sketch:** After runPhase0TurnAndAdvance and onGameStateChange, optionally show a toast or brief modal “Turn advanced to N. Phase: X.” and auto-close after 2s, or leave as overlay update only. Files: ClickableRegionManager.ts advanceTurn callback.  
- **Verification:** Advance turn; see confirmation; same state always same message.  
- **Done means:** Player gets explicit feedback that turn advanced (beyond overlay update) or documented decision to keep overlay-only.

### WR-14. Faction overview: support “current faction” or “all factions” (clarify + optional selector)
- **Type:** Clarification + Extension  
- **Player value:** If “current faction”: clear. If “all factions”: selector or tabs to switch RBiH/RS/HRHB.  
- **Canon alignment:** Rulebook, Systems_Manual (three factions).  
- **Determinism note:** Display only; data from state.  
- **Implementation sketch:** Document that overview is “current faction” (e.g. first in list) or add tab/selector in FactionOverviewPanel to pick faction; panel re-renders from gameState.factions[id]. Files: FactionOverviewPanel.ts; docs.  
- **Verification:** Open overview; see one or three factions; switching is deterministic.  
- **Done means:** Canon and UI agree on what “faction overview” shows; optional selector implemented or deferred and documented.

### WR-15. Tooltip delay configurable (e.g. 300ms)
- **Type:** Clarification  
- **Player value:** Slightly snappier tooltips if desired.  
- **Canon alignment:** UX polish.  
- **Determinism note:** No sim impact.  
- **Implementation sketch:** ModalManager: constant or option for tooltip delay; change 500 to 300 or make configurable. File: ModalManager.ts.  
- **Verification:** Hover region; tooltip appears at new delay.  
- **Done means:** Tooltip delay is documented and optionally reduced.

---

## P2 (Requires new canon/mechanics or Phase II+)

### WR-16. Order of Battle layer on War Planning Map
- **Type:** Out-of-scope  
- **Player value:** Show formations/corps on map.  
- **Canon alignment:** Phase II+; ROADMAP; placeholder already in overlay.  
- **Determinism note:** Would use formation state when implemented; must be deterministic.  
- **Implementation sketch:** N/A for MVP; requires formation/OOB state and canon.  
- **Verification:** N/A.  
- **Done means:** Deferred to Phase II+; no implementation in H4.0.

### WR-17. Ethnicity / population layer on map
- **Type:** Out-of-scope  
- **Player value:** Visualize population or ethnicity by settlement.  
- **Canon alignment:** Phase II+ or data already derived (e.g. settlement_ethnicity_data); HANDOVER placeholder.  
- **Determinism note:** If data exists (e.g. settlement_ethnicity_data.json), layer could be extension; if not, out-of-scope.  
- **Implementation sketch:** If canonical dataset exists: add layer toggle and render; else defer.  
- **Verification:** If implemented: layer shows data from canonical file only.  
- **Done means:** Either implemented as extension using existing data or explicitly deferred.

### WR-18. Displacement layer on map
- **Type:** Out-of-scope  
- **Player value:** Show displacement or capacity effects.  
- **Canon alignment:** Phase F, Phase II+; placeholder in overlay.  
- **Determinism note:** Would use displacement state.  
- **Implementation sketch:** Defer until displacement state and canon available.  
- **Done means:** Deferred; no implementation in H4.0.

### WR-19. Dynamic newspaper/magazine/reports from turn events
- **Type:** Out-of-scope (content generation)  
- **Player value:** Real headlines and reports from simulation.  
- **Canon alignment:** MVP_CHECKLIST “dynamic generation is post-MVP”; ROADMAP.  
- **Determinism note:** Generation must be deterministic (turn + state only).  
- **Implementation sketch:** Event log or key-events API from turn pipeline; fill existing modal surfaces.  
- **Done means:** Post-MVP; not in this backlog for implementation.

### WR-20. Settlement click → detail panel (name, control, authority, municipality)
- **Type:** Extension (can be P1 if data available)  
- **Player value:** Click settlement to see full read-only detail.  
- **Canon alignment:** Phase G (settlement inspection); map diagnostic only.  
- **Determinism note:** Content from state/canonical data only.  
- **Implementation sketch:** WarPlanningMap (and optionally TacticalMap): click → hit-test → open small panel or modal with name, control, control_status, municipality, optional authority. Files: WarPlanningMap.ts, new small panel component or reuse modal.  
- **Verification:** Click settlement; panel shows correct data; deterministic.  
- **Done means:** Clicking a settlement opens a read-only detail panel with no new mechanics.

---

## Warroom Readability & Interaction Improvements (Special Section)

### WR-R1. Zoom behavior: center on click, preserve focus
- **Type:** Extension (same as WR-9, WR-10)  
- **Player value:** Zoom centers on point of interest; focus (which map, which level) is clear.  
- **Canon alignment:** Phase G; no new mechanics.  
- **Determinism note:** View state only.  
- **Implementation sketch:** War Planning Map: click sets zoomCenter from click position in geo coords; re-render. Wall map: forward click to TacticalMap with transformed coords; set zoomCenter. Preserve “focus” by not closing overlay on map click (click cycles zoom or centers).  
- **Verification:** Click map; zoom centers on click; no sim change.  
- **Done means:** Zoom center follows click in both wall and overlay map.

### WR-R2. Map hover tooltips (settlement name, control, authority) without new mechanics
- **Type:** Extension (same as WR-7, WR-8)  
- **Player value:** Instant readout on hover; no new game mechanics.  
- **Canon alignment:** Phase G; data from political_control_data, settlement_names (if present), state.  
- **Determinism note:** Content from canonical JSON/state; iteration order stable (e.g. sort by sid).  
- **Implementation sketch:** Point-in-polygon in map space; lookup by_settlement_id, control_status_by_settlement_id; optional settlement_names.by_settlement_id[sid].name; render tooltip.  
- **Verification:** Hover; same tooltip for same settlement every time.  
- **Done means:** Hover shows name (or sid), control, and optionally authority/status from existing data.

### WR-R3. Modal navigation consistency: keyboard, back stack, focus trap
- **Type:** Extension (same as WR-11, WR-12)  
- **Player value:** ESC closes; Tab stays in modal; optional “back” for nested modals (if any).  
- **Canon alignment:** Accessibility; UI best practice.  
- **Determinism note:** UI only.  
- **Implementation sketch:** ModalManager: focus trap (Tab), ESC close, focus restore on hide. WarPlanningMap: same. If multiple modals stack later, maintain stack and “back” to previous modal.  
- **Verification:** Keyboard-only close and tab; focus never lost into background.  
- **Done means:** All modals and overlay support ESC, focus trap, and focus restore.

### WR-R4. Performance strategy for huge GeoJSON (progressive rendering, simplification) while preserving determinism
- **Type:** Extension (P1/P2)  
- **Player value:** Smooth interaction with large settlement count.  
- **Canon alignment:** Engine_Invariants (determinism); MAP_BUILD_SYSTEM.  
- **Determinism note:** Any simplification or LOD must be deterministic: e.g. sort features by sid, then take first N by zoom level; or use precomputed simplified GeoJSON with stable ordering. No random sampling; no timestamp-based LOD.  
- **Implementation sketch:** Option A: Pre-build simplified GeoJSON (e.g. by zoom level) with stable feature order. Option B: In render, sort polygons by sid, draw up to K polygons at current zoom (K derived from zoom level only, not time). Option C: Use same full GeoJSON but reduce draw calls (batch) or use offscreen canvas. Files: TacticalMap.ts, WarPlanningMap.ts; optional build script for simplified geometry.  
- **Verification:** Two runs with same state and same zoom/pan produce identical frame; no Date() or Math.random() in render path.  
- **Done means:** Large map remains responsive and rendering remains deterministic (stable order, no randomness).

---

## Implementation tickets (optional, do not implement in H4.0)

- **Ticket WR-7:** “Add War Planning Map hover tooltips (settlement name, control) from political_control_data and optional settlement_names; stable iteration by sid.” Files: WarPlanningMap.ts. Verify: hover deterministic.  
- **Ticket WR-9:** “War Planning Map: set zoomCenter from click position (inverse project), re-render.” File: WarPlanningMap.ts. Verify: zoom centers on click.  
- **Ticket WR-11:** “ModalManager: focus trap (Tab wrap within modal), focus restore on hide.” File: ModalManager.ts. Verify: tab stays in modal.

---

*All items respect canon precedence and determinism. No timestamps or randomness in UI-driven sim outcomes.*
