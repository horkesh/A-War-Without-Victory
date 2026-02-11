# Warroom Start-of-Game Information Report (UI/UX Developer)

**Date:** 2026-02-06  
**Scope:** Turn 0 / Phase 0 / September 1991 (game start)  
**Specialist:** ui-ux-developer (per `.cursor/skills/ui-ux-developer/SKILL.md`)  
**Sources:** HANDOVER_WARROOM_GUI.md, IMPLEMENTATION_PLAN_GUI_MVP.md, WARROOM_GUI_IMPLEMENTATION_REPORT.md, warroom code; Rulebook v0.4.0, Game Bible v0.4.0, Phase_0_Specification v0.4.0.

---

## 1. What information is available to the player at the start of the game (other than the map)

All items below are available at Turn 0 from the warroom UI. Citations are to implementation and handover docs.

**Wall (besides map geometry):**

- **Wall calendar** — Current week and month (September 1991, Turn 0). Rendered by `WallCalendar.ts` from `gameState.meta.turn` and fixed start (month 9, year 1991). See WARROOM_GUI_IMPLEMENTATION_REPORT (Date Conversion), `warroom.ts` render.
- **National crest** — Faction-specific (RBiH / RS / HRHB). Crest shown is `state.factions[0].id`; see `warroom.ts` `renderCrest()`.

**Crest click → Faction Overview Panel** (WARROOM_GUI_IMPLEMENTATION_REPORT § Interactive Elements 1; `FactionOverviewPanel.ts`):

- **Territory:** Settlements controlled / total, territory % — from `GameState.political_controllers` (count by faction) and total keys. **Source:** `political_control_data.json` (or fallback `settlements_initial_master.json`) via `warroom.ts` `loadInitialPoliticalControllers()`.
- **Military:** Personnel (placeholder: controlled × 500), exhaustion % (from `faction.profile.exhaustion`), supply days (placeholder: `profile.logistics * 30`). Personnel and supply are not from canonical sim data at start.
- **Authority:** Central authority (from `faction.profile.authority`), fragmented municipalities (placeholder 0).
- **Population:** Under control (placeholder: controlled × 4000), displaced (0 at Turn 0).
- **Strategic warnings** — Placeholder logic (e.g. “No strategic warnings at this time” when profile thresholds not exceeded).

**Map click → War Planning Map** (separate GUI system; HANDOVER_WARROOM_GUI § Warroom GUI; `WarPlanningMap.ts`):

- **Political control** — Per-settlement control from `political_control_data.json` (`by_settlement_id` or equivalent), colors by faction (RBiH/RS/HRHB/null).
- **Contested outline** — Crosshatch for CONTESTED/HIGHLY_CONTESTED from `control_status_by_settlement_id` (see HANDOVER, PIPELINE_ENTRYPOINTS “Canonical data for map/warroom UI”).
- **Layer toggles** — Political control and Contested are live; Order of Battle, Population/ethnicity, Displacement are placeholders (Phase II) in side panel.

**Desk:**

- **Newspaper modal** — Faction masthead (OSLOBOĐENJE / GLAS SRPSKE / CROATIAN HERALD), date T-1, placeholder headline/body. Content is hardcoded for Turn 0 (WARROOM_GUI_IMPLEMENTATION_REPORT § Content Generation Strategy).
- **Magazine modal** — Monthly layout; stat boxes (settlements gained, exhaustion %, displaced) are placeholders.
- **Reports modal** — Typewriter-style FROM/TO/DATE/SUBJECT; body is placeholder.
- **News ticker** — International events; placeholder content, T to T-7 range.
- **Red telephone** — Disabled (Phase II+); tooltip only.

**Overlay (phase/turn):**

- Phase and turn in UI overlay from `gameState.meta.phase` and `gameState.meta.turn` (`warroom.ts` `updateUIOverlay()`).

**Data loaded at start:**

- `political_control_data.json` preferred, else `settlements_initial_master.json` for `political_controllers`; mock `GameState` with `meta.turn: 0`, `meta.phase: 'phase_0'`, minimal faction profiles (authority/legitimacy/control/logistics 1, exhaustion 0). See `warroom.ts` `loadMockState()`, `loadInitialPoliticalControllers()`.

---

## 2. What should be available (per canon / design)

**Canon check:**

- **Rulebook v0.4.0** — Defines player-facing experience but does not list “information at game start” or a starting brief. Mentions player constraints (e.g. patron behavior, treaty acceptance) only in general.
- **Game Bible v0.4.0** — No explicit “what the player should know at start” found in search.
- **Phase_0_Specification v0.4.0** — Defines Phase 0 stability/control_status (SECURE, CONTESTED, HIGHLY_CONTESTED) and baseline external constraints; does not define UI or “information at game start.”

**Conclusion:** Canon is **silent** on what information should be available to the player at game start. **Recommend Product Manager or Game Designer clarification** for: (1) whether a formal “starting brief” or key constraints should be surfaced, (2) whether settlement-level tooltips or summaries at start are intended, (3) whether desk props at Turn 0 should show “no news yet” vs placeholder copy.

**Gaps (candidate “shoulds” based on current design):**

- No settlement-level info on the wall map (click settlement → info panel is future per WARROOM_GUI_IMPLEMENTATION_REPORT).
- No explicit “starting brief” (e.g. date, phase, referendum-to-war framing); only phase/turn in overlay and date in Faction Overview.
- Newspaper/Magazine/Reports at Turn 0 show placeholder content rather than “pre-war” or “no reports yet” framing; design intent not stated in canon.

---

## 3. Best way to present it using the warroom concept

Recommendations stay within the warroom metaphor (desk, wall map, calendar, crest, phone) and align with HANDOVER_WARROOM_GUI and IMPLEMENTATION_PLAN_GUI_MVP.

**Allocation of information by surface:**

- **Faction Overview (crest)** — Keep as the main strategic summary: territory, military, authority, population. Use for “what do we control and how are we doing.” Add a one-line context (e.g. “September 1991 — Pre-referendum”) if a starting brief is approved.
- **War Planning Map (separate GUI system; map click opens it)** — Keep for spatial/control and contested status. Order of Battle, ethnicity, displacement (when available) belong here as layers; avoid duplicating in desk props.
- **Newspaper** — Use for “yesterday’s news” / narrative events (T-1). At Turn 0, either show “pre-war” placeholder or short “No major events” plus date; avoid fake headlines unless design explicitly allows.
- **Magazine** — Use for monthly aggregates (4 turns). At Turn 0, one clear “September 1991” summary or “No monthly report yet” is better than invented stats.
- **Reports** — Use for field/situation reports (T-1 to T-2 lag). At start, “No situation reports” or a single “Initial situation” line is consistent with the metaphor.
- **News ticker** — International / wire events. At start, optional “Pre-referendum period” or quiet ticker; placeholder international copy is acceptable if labeled as such.
- **Calendar** — Keep as sole source of current date and turn; advance turn stays here. No extra info needed.
- **Red telephone** — Reserve for diplomacy (Phase II+); do not overload with other info.

**Starting brief (if PM/Designer approves):**

- Option A: First time the player opens Faction Overview at Turn 0, include a short “Starting situation” block (date, phase, one sentence on referendum/war start framing) then collapse or never repeat.
- Option B: Non-intrusive line under phase/turn in the overlay (e.g. “September 1991 — Phase 0”).
- Do not add a separate “tutorial” panel unless specified; keep fiction (command room, desk, map).

**Accessibility / UX:**

- Modals: DOM overlays with ESC and backdrop close (WARROOM_GUI_IMPLEMENTATION_REPORT § Modal System) — keep for keyboard and screen readers.
- War Planning Map (separate GUI system): when presented as a full-screen layer, ensure close button and layer toggles are focusable and labeled (e.g. “Close map”, “Political control”).
- Faction Overview: Use headings (Territory, Military, Authority, Population) for structure; keep contrast and font size readable (existing modals.css).
- Avoid critical info only in color (political control); keep side panel labels and zoom pill text (STRATEGIC/OPERATIONAL/TACTICAL) so control is not color-only.

---

## 4. Spec gaps / conflicts

- **Asset paths:** HANDOVER lists `hq_base_stable_v1.png`, `wall_map_frame_v1.png`, `wall_calendar_frame_v1.png`, `phone_rotary_red_v1.png`; implementation uses `hq_background_mvp.png` and 3 crests (WARROOM_GUI_IMPLEMENTATION_REPORT, warroom_stage_assets). HANDOVER “Known gaps” already notes static paths and that warroom uses MVP assets. **No change needed**; consider updating HANDOVER “Static asset paths” to match current MVP set.
- **Map click behavior:** IMPLEMENTATION_REPORT § 2 says “Click map” → “Zoom levels” with cycle 0→1→2→0 on wall. Current code: map click opens **War Planning Map** (separate GUI system); zoom is inside that system (WarPlanningMap.ts canvas click cycles ZOOM_LABELS). So wall map no longer cycles zoom on the canvas; zoom is only in the War Planning Map. **Flag:** If design intent was “zoom on wall first, then open War Planning Map,” current behavior is a mismatch; otherwise document “map click opens War Planning Map, zoom inside it.”
- **Faction shown:** Faction Overview and crest use `factions[0]` only. No selector for “which faction am I”; if the player is always one faction, this is fine; if not, spec should state how faction is chosen (e.g. scenario or main menu).
- **Placeholder copy:** IMPLEMENTATION_PLAN and IMPLEMENTATION_REPORT say “generic placeholders” and “placeholder for MVP.” No spec yet for “Turn 0 acceptable content” (e.g. “No reports” vs placeholder text). Recommend a short product/design note so UI copy stays consistent and canon-aligned.

---

**Report end.** Canon silent on “what should be available at start”; recommend clarification via Product Manager or Game Designer before locking starting content and starting-brief behavior.
