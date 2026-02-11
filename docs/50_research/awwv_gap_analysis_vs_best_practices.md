# AWWV Gap Analysis vs Best Practices

**Phase H4.0 — A War Without Victory (AWWV)**  
**Purpose:** Compare current AWWV Warroom UI to the best-practice library; identify gaps, risks, and improvement candidates. Every claim is grounded in code inspection; every finding is tagged [Clarification] / [Extension] / [Out-of-scope].

**Canon references:** Rulebook_v0_4_0.md, Systems_Manual_v0_4_0.md, Engine_Invariants_v0_4_0.md, MVP_CHECKLIST.md, Phase_0_Specification_v0_4_0.md, HANDOVER_WARROOM_GUI.md, PIPELINE_ENTRYPOINTS.md.

---

## AWWV UI Inventory (Warroom) — Code-Grounded

### Entry and data flow
- **Entry:** `src/ui/warroom/index.html` → `warroom.ts` (WarroomApp). Canvas 1920×1080; overlay shows phase and turn from `gameState.meta` (warroom.ts:151–154).
- **State source:** `loadMockState()` builds initial GameState; `political_controllers` from `political_control_data.json` (by_settlement_id) or fallback `settlements_initial_master.json` (warroom.ts:124–146). No timestamps; turn/phase only.
- **Regions:** `data/ui/hq_clickable_regions.json` — 8 regions (national_crest, wall_map, wall_calendar, red_telephone, newspaper_current, magazine, report_stack, transistor_radio). Actions: open_faction_overview, map_zoom_in, advance_turn, open_newspaper_modal, open_magazine_modal, open_reports_modal, toggle_news_ticker/transistor_radio, open_diplomacy_panel (disabled). ClickableRegionManager.ts:46–52, 153–182.

### Components and data displayed
| Component | File | Data displayed | Source (code) |
|-----------|------|----------------|---------------|
| **TacticalMap** (wall) | TacticalMap.ts | Settlement polygons; color by political_controllers; zoom 0/1/2 (Strategic/Operational/Tactical); zoom center fixed 0.5,0.5 | state.political_controllers; getMasterSidForLookup (sid, municipality_id); SIDE_COLORS; settlements_viewer_v1.geojson |
| **WarPlanningMap** (separate GUI system) | WarPlanningMap.ts | Political control (by_settlement_id); control_status_by_settlement_id → contested crosshatch; layer toggles Political control, Contested; placeholders OOB, ethnicity, displacement | political_control_data.json; settlements_viewer_v1.geojson; getMasterSid |
| **WallCalendar** | WallCalendar.ts | Month 9, year 1991; currentTurn from state; startTurn 0 | Hardcoded 1991-09; gameState.meta.turn |
| **DeskInstruments** | DeskInstruments.ts | Desk props (phone sprite, etc.) | Assets only |
| **FactionOverviewPanel** | FactionOverviewPanel.ts | Territory (controlled/total, %); military (personnel placeholder, exhaustion, supply days); authority (centralAuthority, fragmentedMunicipalities placeholder); population (underControl, totalDisplaced placeholder); warnings | gameState.factions[0]; political_controllers counts; profile (authority, legitimacy, control, logistics, exhaustion) |
| **NewspaperModal** | NewspaperModal.ts | Faction masthead; T-1 date; placeholder headline/body | gameState.meta.turn; placeholder content |
| **MagazineModal** | MagazineModal.ts | Month/year; placeholder stats (settlements gained, exhaustion %, displaced); placeholder TOC | gameState; placeholder content |
| **ReportsModal** | ReportsModal.ts | FROM/TO/DATE/SUBJECT; placeholder body; T-1/T-2 delay mentioned | gameState; placeholder content |
| **NewsTicker** | NewsTicker.ts | Scrolling headlines; generateHeadlines(gameState) | gameState.meta.turn; placeholder copy |
| **ModalManager** | ModalManager.ts | showModal(content), hideModal(); tooltip 500ms delay, ESC/backdrop close | DOM; no state |
| **Advance turn** | ClickableRegionManager.ts | Confirmation dialog: current turn, next turn; on confirm: runPhase0TurnAndAdvance or meta.turn+1 | gameState.meta; run_phase0_turn |

### Staging and assets
- **warroom_stage_assets.ts:** Copies crests, hq_background_mvp.png, political_control_data.json, settlement_edges.json, settlements_viewer_v1.geojson, settlements_initial_master.json, hq_clickable_regions.json to dist/warroom and to src/ui/warroom/public for dev. Deterministic COPY_FILES order (sorted by dest). Uses loadMistakes/assertNoRepeat.

---

## Best-Practice Mapping: Already / Partially / Missing / N/A

| Pattern (from library) | AWWV status | Notes |
|------------------------|-------------|--------|
| Progressive disclosure | Partially | Faction overview is summary; modals are detail; map has no click-to-detail yet. |
| Headline vs detail | Partially | Newspaper/ticker/reports exist; content placeholder. |
| Stable hierarchy (phase, turn) | Already | ui-overlay shows PHASE, TURN. |
| No false precision | Partially | No “estimate” labels yet; Phase G requires explicit delay/uncertainty where applicable. |
| Layer toggles | Already | War Planning Map: Political control, Contested; placeholders for OOB, ethnicity, displacement. |
| Zoom that preserves context | Partially | Zoom level cycle exists; center fixed (0.5,0.5); no “center on click”. |
| Hover tooltips (map) | Missing | Wall map and War Planning Map: no settlement hover tooltip (name, control, authority). Region tooltips only on HQ props (ClickableRegionManager). |
| Click for detail (settlement) | Missing | No settlement click → detail panel. Phase G spec: map diagnostic only; click-for-detail is extension. |
| Sitrep metaphor | Partially | Reports/newspaper/ticker structure in place; placeholder content. |
| Placeholder → generated | Missing | Future; MVP explicitly placeholder (MVP_CHECKLIST, WARROOM_GUI_IMPLEMENTATION_REPORT). |
| Consistent date/turn | Already | Turn from state; calendar and overlays use same meta.turn. |
| Advance-turn confirmation | Already | ClickableRegionManager advanceTurn() shows dialog with current/next turn. |
| Post-turn feedback | Partially | Overlay updates via onGameStateChange; no “what changed” summary. |
| Phase indicator | Already | val-phase in overlay. |
| Certainty signaling | Missing | No “T-1 report” or “Estimate” labels on values. |
| Font/contrast | Partially | Modals use CSS; canvas text and overlay could be audited. |
| Zoom/scale (accessibility) | Partially | No in-app zoom; modal focus not fully trapped. |
| Keyboard/focus | Partially | ESC closes modal (ModalManager); War Planning Map ESC; no documented focus trap or back stack. |
| Destructive actions confirmed | Already | Advance turn confirmed. |
| Safe defaults | Already | Layers default on (Political control, Contested checked). |

---

## Findings (Tagged, with Doc and Code Paths)

1. **[Extension] Map hover tooltips (settlement name, control, authority)**  
   - **Gap:** No hover on settlement polygon in TacticalMap or WarPlanningMap. Best practice: hover shows name, control, optional authority from existing state.  
   - **AWWV docs:** Rulebook v0.4 (control, legitimacy); Phase G (map diagnostic, inspection). Systems_Manual §4 (legitimacy), §8 (AoR).  
   - **Code:** `src/ui/warroom/components/TacticalMap.ts` (no hover handler); `WarPlanningMap.ts` (canvas click for zoom only). Data available: political_control_data.json, settlements_viewer_v1.geojson; settlement names would need settlement_names or equivalent (see PIPELINE_ENTRYPOINTS, HANDOVER).  
   - **Determinism:** Tooltip content from state/canonical JSON only; no randomness or timestamp.  
   - **Risk:** None if read-only and sourced from canonical data.

2. **[Clarification] Wall map does not show contested crosshatch**  
   - **Gap:** TacticalMap renders only political control fill. Contested crosshatch exists only in WarPlanningMap (control_status_by_settlement_id). HANDOVER states this explicitly.  
   - **AWWV docs:** Phase_0_Specification, Systems_Manual §11 (control_status SECURE/CONTESTED/HIGHLY_CONTESTED); Engine_Invariants contested control.  
   - **Code:** TacticalMap.ts renderGeoPolygons() uses political_controllers only; no control_status. WarPlanningMap.ts uses controlData.control_status_by_settlement_id.  
   - **Recommendation:** Clarify in UI spec whether wall map should mirror contested state from same canonical source (political_control_data.json) for consistency — or document that wall = simplified, overlay = full.

3. **[Extension] Zoom center on click (map)**  
   - **Gap:** Zoom level cycles but center is fixed (0.5, 0.5). Best practice: click to center zoom on point of interest.  
   - **AWWV docs:** Phase G (map interaction); no canon change.  
   - **Code:** TacticalMap.ts zoomCenter = { x: 0.5, y: 0.5 }; WarPlanningMap.ts same. Click handler on overlay only cycles zoom.  
   - **Determinism:** Zoom center is view state only; does not affect simulation. Safe.

4. **[Clarification] Faction overview shows first faction only**  
   - **Gap:** FactionOverviewPanel uses `this.gameState.factions[0]` and single crest. AWWV has three factions (RBiH, RS, HRHB).  
   - **AWWV docs:** Rulebook (factions); Systems_Manual (per-faction state). MVP may be “player faction” view; need clarity.  
   - **Code:** FactionOverviewPanel.ts:42 (factions[0]); warroom.ts renderCrest uses factions[0].id.  
   - **Recommendation:** Clarify: is overview “current player faction” or “all factions”? If all, add selector or tabs (extension).

5. **[Extension] Modal focus trap and keyboard navigation**  
   - **Gap:** ModalManager closes on ESC and backdrop; no documented focus trap (tab cycles within modal) or back stack. War Planning Map has ESC and close button.  
   - **AWWV docs:** Phase G (accessibility); UI_SYSTEMS_SPECIFICATION if present.  
   - **Code:** ModalManager.ts (ESC, backdrop); no focus trap; WarPlanningMap closeBtn.focus() on show.  
   - **Determinism:** UI-only; no sim impact.

6. **[Clarification] Placeholder content labeled as such**  
   - **Gap:** Newspaper, magazine, reports show placeholder text without “Placeholder” or “Sample” label. MVP_CHECKLIST and WARROOM_GUI_IMPLEMENTATION_REPORT state placeholders explicitly.  
   - **AWWV docs:** MVP_CHECKLIST (placeholder content; dynamic generation post-MVP).  
   - **Code:** NewspaperModal, MagazineModal, ReportsModal, NewsTicker — hardcoded strings.  
   - **Recommendation:** Add small “Sample content” or “Placeholder” label so players do not infer real events (align with “no false precision”).

7. **[Extension] Post-turn “what changed” summary**  
   - **Gap:** After advance turn, overlay updates (phase, turn) but no summary of key changes (e.g. control flips, exhaustion delta). Best practice: short post-turn feedback.  
   - **AWWV docs:** Phase G (turn feedback); state is in gameState; no new mechanics.  
   - **Code:** run_phase0_turn advances state; onGameStateChange updates overlay only.  
   - **Determinism:** Summary derived from state diff or key fields only; no randomness.  
   - **Out-of-scope if:** Requires new “event log” mechanic not in canon. If derived from existing state (e.g. political_controllers diff), extension.

8. **[Clarification] Diplomacy panel disabled; no stub message**  
   - **Gap:** red_telephone region has action open_diplomacy_panel, disabled in regions JSON. ClickableRegionManager openDiplomacyPanel() only console.log.  
   - **AWWV docs:** ROADMAP Phase II+; MVP_CHECKLIST post-MVP diplomacy.  
   - **Code:** hq_clickable_regions.json disabled:true; executeAction open_diplomacy_panel → console.log.  
   - **Recommendation:** Show “Diplomacy (Phase II+) — not yet available” in tooltip or modal when clicked (even if disabled, or enable click for message).

9. **[Extension] Settlement click → detail panel (read-only)**  
   - **Gap:** No click-on-settlement to show name, control, authority, municipality. Phase G: “municipality and settlement inspection”; “map is diagnostic and explanatory.”  
   - **AWWV docs:** Phase G (inspection); Rulebook (control, legitimacy).  
   - **Code:** WarPlanningMap and TacticalMap have no settlement hit-test or detail panel.  
   - **Determinism:** Panel content from state/canonical data only. Safe.

10. **[Clarification] Faction overview placeholders (personnel, supply days, fragmentedMunicipalities, displaced)**  
    - **Gap:** FactionOverviewPanel uses formulas like “controlledSettlements * 500” for personnel, “profile.logistics * 30” for supply days, “0” for fragmentedMunicipalities and totalDisplaced. Not labeled as estimates.  
    - **AWWV docs:** Systems_Manual (personnel, supply, exhaustion, fragmentation); Rulebook.  
    - **Code:** FactionOverviewPanel.ts generateSnapshot().  
    - **Recommendation:** Label as “Estimate” or “Placeholder” until real state exists; or align formulas with canon and document.

11. **[Extension] War Planning Map zoom center on click**  
    - **Gap:** Same as #3; overlay map also uses fixed center. Click currently cycles zoom only.  
    - **Code:** WarPlanningMap.ts canvas click → zoom cycle; zoomCenter fixed.  
    - **Determinism:** View only; safe.

12. **[Clarification] Single canonical political control source**  
    - **Already correct:** Warroom and War Planning Map use political_control_data.json (PIPELINE_ENTRYPOINTS, HANDOVER). TacticalMap (wall) uses state.political_controllers which is loaded from same file in loadMockState. Consistency: loadInitialPoliticalControllers() populates state from same source.  
    - **Recommendation:** Document in gap analysis that wall and overlay both ultimately derive from political_control_data.json (wall via state, overlay via direct fetch). No contradiction.

13. **[Out-of-scope] Order of Battle / corps on map**  
    - **Gap:** War Planning Map has “Order of Battle (Phase II)” placeholder.  
    - **AWWV docs:** ROADMAP Phase II+; Phase G post-MVP “corps/unit viz at map zoom”.  
    - **Recommendation:** Leave as placeholder; implementing OOB layer requires formation/corps state and canon, out of H4.0 scope.

14. **[Extension] Progressive rendering or simplification for large GeoJSON**  
    - **Gap:** settlements_viewer_v1.geojson is loaded in full; large feature count could affect performance. Best practice: progressive render or simplified LOD for zoom.  
    - **AWWV docs:** Engine_Invariants (determinism); MAP_BUILD_SYSTEM.  
    - **Code:** TacticalMap.ts loadPolygons() fetches full GeoJSON; WarPlanningMap loadData() same.  
    - **Determinism:** Rendering order must be stable (e.g. sort by sid) so draw order is deterministic; no randomness in LOD/simplification.

15. **[Clarification] Tooltip delay 500ms**  
    - **Gap:** ModalManager showTooltip uses 500ms delay. Could feel sluggish; best practice often 300–400ms.  
    - **Code:** ModalManager.ts setTimeout(..., 500).  
    - **Recommendation:** Clarify as configurable; no sim impact.

---

## Repo health snapshot (validations)

Validations run as part of Phase H4.0 (2026-02-06):

- **npm run typecheck:** Pass (exit 0).
- **npm run warroom:build:** Pass (exit 0); Vite build + warroom_stage_assets.ts completed.
- **npm test:** Partial — many tests passed (including determinism scan “no Date.now/new Date/Math.random in core pipeline”, audit artifacts determinism, calibration, competence, etc.). Run timed out before full suite completion; no failing test observed in partial output. Full result recorded in PROJECT_LEDGER entry “Phase H4.0 — Best-practices comparison + GUI recommendations”.

---

*All findings are mechanics-neutral unless marked Out-of-scope. Determinism: no timestamps, randomness, or non-reproducible UI state driving sim outcomes.*
