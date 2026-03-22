# Officers Phase E — GUI Design

**Date:** 2026-03-02  
**Scope:** All three Phase E pieces in one implementation: FormationDetail officer info, warroom officer list, succession notifications.  
**Prerequisite:** Officers System Phases A–D implemented (see `docs/40_reports/implemented/20260303_OFFICERS_SYSTEM_IMPLEMENTATION.md`).

---

## Approaches (2–3 options)

### Approach 1: Minimal view types, UI-only (recommended)

- **Data:** Add optional officer view types to the existing loaded-state pipeline. `LoadedGameState` gets `namedOfficersView?: NamedOfficerView[]` and `namedOfficerStateById?: Record<string, NamedOfficerStateView>`. `FormationView` gets `officer_quality?: number` and optionally `corps_commander_id?: string` (or derived in UI from corps_id + officer state). GameStateAdapter maps `state.named_officers`, `state.named_officer_data`, and `formation.officer_quality` into these views. No new IPC; warroom already receives full `GameState` and can derive officer list and succession from `state.named_officers` + turn report.
- **FormationDetail:** One block: "Command" — for brigades show brigade officer quality (bar or %); for corps/brigade show corps commander name + status (acting/named) + modifier hint if data present.
- **Warroom:** Extend `WarDataSnapshot` (or equivalent) with an officer list per faction (active, reserve, killed/retired). Render in a new "Officers" subsection inside FactionOverviewPanel or a small "Command" panel; sorted by id for determinism.
- **Succession:** Expose `TurnReport.officer_succession` (or equivalent) in the payload the map and warroom already get. Map: show last succession in a small "Recent command changes" in FormationDetail when viewing a corps, or in a top-bar ticker. Warroom: append succession lines to the turn AAR / newspaper / event stream so they appear after advance-turn.
- **Pros:** Reuses existing state and report flow; no new contracts; single source of truth (engine state).  
- **Cons:** Warroom must parse GameState and turn report for officers (already has gameState).

### Approach 2: Dedicated IPC and officer-specific API

- **Data:** New IPC methods e.g. `get-officer-list`, `get-officer-succession-log` returning pre-shaped JSON for the UI. Map and warroom call these when loading state or after advance-turn.
- **Pros:** UI gets exactly what it needs; can evolve API without touching GameState shape.  
- **Cons:** Duplication of state derivation (main process vs adapter); more surface for bugs and determinism (ordering must be guaranteed in both places).

### Approach 3: Officer data only in tactical map; warroom shows “Command changes” only

- **Data:** Only the map app gets officer views (via GameStateAdapter). Warroom does not get a full officer list; it only shows succession lines in the AAR (from turn report).
- **Pros:** Smallest change set; FormationDetail is the main consumer.  
- **Cons:** No single place in warroom to see “all my commanders”; weaker for players who stay in HQ.

**Recommendation:** **Approach 1.** One pipeline (GameState + adapter for map, GameState + extractWarData for warroom), one turn report for succession; no new IPC; deterministic ordering in both UIs.

---

## Section 1 — Data and view types

**Map app (`src/ui/map`)**  
- **FormationView:** Add optional `officer_quality?: number` (Tier 2). Add optional `corps_commander_id?: string` only if we want to avoid lookups in the UI; otherwise the UI can resolve commander from `formation.corps_id` + `loadedGameState.namedOfficerStateById` (filter by `assigned_corps_id`). Prefer deriving in UI from `corps_id` + officer state so adapter stays simple.  
- **LoadedGameState:** Add optional `namedOfficerData?: NamedOfficerView[]` (static) and `namedOfficerStateById?: Record<string, NamedOfficerStateView>` (mutable). Both keyed/sorted by id for stable iteration.  
- **NamedOfficerView / NamedOfficerStateView:** Flatten enough of `NamedOfficer` and `NamedOfficerState` for UI (id, name, faction, rank, status, assigned_corps_id, competence, aggressiveness, defensive_skill, acting_commander, turns_in_command, battles, victories; no internal-only fields).  
- **GameStateAdapter:** In `parseGameState`, if `state.named_officer_data` and `state.named_officers` exist, map them into the new view fields with sorted order; map `formation.officer_quality` onto each FormationView.

**Warroom**  
- **WarDataSnapshot (or equivalent):** Add optional `officersByFaction?: Record<FactionId, OfficerListEntry[]>` where each entry has id, name, rank, status, assigned_corps_id, acting_commander. Sorted by id per faction.  
- **extractWarData:** Derive officer list from `gameState.named_officers` + `gameState.named_officer_data`; apply fog of war if needed (e.g. only player faction or allies).  
- **Turn report:** Ensure `officer_succession` (or current equivalent) is included in the payload passed to the warroom and map after advance-turn (e.g. in `game-state-updated` or AAR payload). Structure: `{ departures, arrivals, casualties, successions }` per existing pipeline.

**Determinism:** All arrays (officer list, succession entries) sorted by id or (turn, id). No randomness; no timestamps in view types.

---

## Section 2 — FormationDetail (tactical map)

**Location:** `src/ui/map/components/FormationDetail.tsx`.

**New block: "Command"**  
- Rendered after the existing stats (cohesion, fatigue, personnel, location) and before War Story / Combat summary.  
- **Brigade:** Show "Officer quality" with a small progress bar or percentage (from `formation.officer_quality`); if no data, show "—" or hide the row.  
- **Corps / Army HQ:** Show "Corps commander" (or "Army commander" for army_hq): name from `namedOfficerData` + `namedOfficerStateById` (lookup by `formation.corps_id` → assigned officer). If acting, show "(Acting)". Optionally show a one-line modifier hint (e.g. "Combat mod: 1.02") from existing combat math constants.  
- **Brigade again:** If `formation.corps_id` is set, also show "Corps commander: [Name]" (same lookup) so the player sees chain of command.  
- **Empty state:** If no officer data in loaded state, do not render the Command block (or show "No officer data").

**Accessibility:** Ensure the new block is in the panel’s focus order and readable by screen readers (no information only in color).

---

## Section 3 — Warroom officer list

**Location:** Warroom UI that shows faction overview (e.g. `FactionOverviewPanel.ts` or a new panel).

**Option A — Subsection in FactionOverviewPanel**  
- For each faction, add a collapsible "Command" or "Officers" section. List officers in stable order (e.g. by id): name, rank, status (Active / Reserve / Killed / Retired), assigned corps (or "—"). For active, show assigned_corps_id (resolve to corps name if available).  
- Data from `WarDataSnapshot.officersByFaction[faction]` (or equivalent). If snapshot has no officer data, hide the section.

**Option B — Dedicated "Officers" panel/modal**  
- A separate panel or modal opened from the desk (e.g. "Command" button) listing all factions’ officers in tabs or sections. Same fields; same sorted order.  
- Prefer Option A (subsection) for YAGNI unless you explicitly want a dedicated command view.

**Fog of war:** Only show officer list for player faction (and optionally allies). Enemy officers stay hidden or show only "Enemy command" placeholder.

---

## Section 4 — Succession notifications

**Source:** Turn report already has (or will have) an `officer_succession` (or similar) field: departures, arrivals, casualties, successions. Each entry: turn, officer id/name, event (killed, retired, assigned, departed), corps id if applicable.

**Map app**  
- **Option 1:** Small "Recent command changes" in FormationDetail when the selected formation is a corps: show last N succession events for that corps (from current turn or last turn).  
- **Option 2:** A compact ticker in the top bar (e.g. next to "Turn N") that shows one line per succession event for the current turn after load (e.g. "Lt. Gen. X assigned to 1st Krajina Corps").  
- Recommend Option 1 for FormationDetail (corps-focused); Option 2 optional if you want global visibility.

**Warroom**  
- Append succession lines to the existing AAR / newspaper / event stream shown after advance-turn. Each line: "[Turn N] Commander X assigned to Y Corps" / "Commander Z killed in action", etc. Order: use the same deterministic order as in the turn report (e.g. by (turn, officer_id)).

**Data flow:** Ensure the turn report (or `game-state-updated` payload) includes the succession blob so both map and warroom can render it without new IPC.

---

## Section 5 — Testing and docs

**Tests**  
- **Map:** Unit or integration test that, given a LoadedGameState with `namedOfficerData` and `namedOfficerStateById` and a formation with `corps_id` and `officer_quality`, FormationDetail renders the Command block and shows the commander name and quality (and optionally a test that with no officer data the block is hidden).  
- **Adapter:** Test that `parseGameState` with `state.named_officers` and `state.named_officer_data` produces sorted view arrays and that `formation.officer_quality` is passed through.  
- **Warroom:** Test that extractWarData (or equivalent) includes officer list for a faction when state has named officers, and that order is stable.

**Docs**  
- Update `TACTICAL_MAP_SYSTEM.md` to mention FormationDetail Command block and officer data source.  
- Update `DESKTOP_GUI_IPC_CONTRACT.md` only if any new IPC is added (Approach 1 does not require it).  
- Add a short "Officers Phase E" subsection to the Officers implementation report or to `CONSOLIDATED_IMPLEMENTED.md` once implemented.

**Ledger:** One entry for Phase E GUI: blast-radius (map types, adapter, warroom snapshot, FormationDetail, warroom panel, succession in AAR) and verification (manual check: load run with officers, open formation, open warroom faction, advance turn and see succession in AAR).

---

## Summary

| Piece | Location | Data source | Determinism |
|-------|----------|------------|-------------|
| FormationDetail officer info | `src/ui/map/components/FormationDetail.tsx` | LoadedGameState (namedOfficerData, namedOfficerStateById, FormationView.officer_quality) | Sorted officer arrays by id |
| Warroom officer list | FactionOverviewPanel (or new panel) | WarDataSnapshot.officersByFaction from extractWarData | Sorted by id per faction |
| Succession notifications | FormationDetail (corps) + warroom AAR | Turn report officer_succession in game-state-updated / AAR | Order by (turn, officer_id) |

**Next step:** Implementation plan (bite-sized tasks, TDD, commits) in `docs/plans/YYYY-MM-DD-officers-phase-e-implementation.md` when you are ready to implement.
