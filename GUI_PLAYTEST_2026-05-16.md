# GUI Playtest — 2026-05-16

**Tester:** Claude (via Cowork mode + Claude in Chrome)
**Build:** v0.9.6-alpha.1 (dev servers, not packaged Electron)
**Faction played:** RS (VRS), Standard difficulty
**Date in game:** 1 Apr 1992, Turn 0 (WAR phase) — and a Continue save at Turn 40, 6 Jan 1993
**Environment:** Warroom dev server `http://127.0.0.1:3000`, Tactical Map dev server `http://localhost:3002` (auto-spawned)

> **Important caveat about this playtest.** The browser dev servers are renderer-only. The simulation engine runs in the Electron main process and communicates with the renderer via IPC. In the browser, that IPC bridge is absent, so any action that depends on the engine — most notably **ADVANCE_TURN** — is intentionally a no-op. Findings below are scoped to **rendering, layout, navigation, copy, data binding, and content errors that are visible without engine round-trips.** Any earlier framing that called ADVANCE_TURN a defect was a mistake on my part and is corrected below.

---

## Method

Driving Chrome remotely through the Claude in Chrome extension. Cannot reach the packaged Electron app directly. Both Vite dev servers were already running on the user's machine when the session started. Steps so far:

1. Open Warroom (`:3000`) → title screen renders.
2. New Campaign → Choose Side modal renders (RBiH HARD / RS STANDARD / HRHB MODERATE with flavor text).
3. Pick RS → game auto-opens a second tab `AWWV Map` at `:3002`, which is the actual gameplay shell.
4. Faction picker modal appears again on the map tab — re-select RS.
5. "WAR BEGINS — 1 Apr 1992" briefing modal renders with starting OOB.
6. Click BEGIN → main game state loads, tutorial overlay starts (Step 1 of 8).

## Initial state observations

### Top bar
`CHRONICLE · 1 APR 1992 · TURN 0 (WAR) · DEV` | SUMMARY · RECORDS · OPS | (centered crest) | EVENTS · CODEX · INBOX · AUTO ▰▰▰▰▰ 100 · ADVANCE_TURN

### Left panel (COMMAND)
- SITUATION header (collapsible)
- ARMY (77) header (collapsible)
- VRS crest, "11 formations"
- CO: Gen. Ratko Mladić
- **1st Krajina Corps**: 36,800 personnel, 36 brigades, Cdr. Momir Talić, units 200/200, arty 615/615, **STANCE: Offensive (GREAT)**
- **2nd Krajina Corps**: 8,200 personnel, 8 brigades, Cdr. Radivoje Tomović, 40, 135/135
- (more corps presumably below — needs scroll)

### Right panel (PRESIDENTIAL INBOX)
- PRESIDENTIAL BRIEF — Republika Srpska flavor text
- UNDERSTOOD | BEGIN action
- SITUATION cards: "Territory Gained" (Your forces secured 7 positions including Tasovčići [Čapljina]), "1 Apr 1992"

### Bottom bar
POLITICAL · ETHNIC · SUPPLY · OPERATIONS · +MORE overlays | RBA / ABS legend | Friendly 51.7% / Hostile-held 46.3% | BELGRADE: CAUTIOUS

### Starting OOB (from "WAR BEGINS" briefing)
| Faction | Brigades | Personnel | Tanks | Arty |
|---|---|---|---|---|
| ARBIH | 78 | 48.5k | 32 | 102 |
| **VRS (YOU)** | 77 | 82.5k | 360 | 1,350 |
| HVO | 30 | 23.8k | 16 | 52 |

Numbers match the canonical April 1992 starting state. ✓

## Tutorial walkthrough

Captured verbatim:

1. **You Are the President** — "You are the unnamed political leader of your faction in the 1992–1995 Bosnian War. This is a negative-sum war: you cannot win by conquest. You command through institutions, not in spite of them. Each turn is one week. Your job is to choose how to lose less."
2. **Reading the Map** — "Faction colors show political control. Front edges mark where your forces meet the enemy. Click a settlement to inspect it; click a front edge to inspect the sector. The map is a record, not a control panel — orders flow through your staff."
3. **The Brief** — "Each turn opens with your staff brief. Strategic priorities, command authority, and the morning report sit on the toolbar. RECORDS opens Army HQ. SUMMARY gives you the field situation. Read first; decide second."
4. **Inspect Before You Decide** — "The Warroom status bar shows the current phase, priorities, and pending reviews. The priority docket lists what your staff flags as urgent. Open Army HQ to drill into corps readiness, supply, and command friction before you commit."
5. _(pending)_
6. _(pending)_
7. _(pending)_
8. _(pending)_

## Working so far

- Boot path (Warroom → faction pick → spawned Map tab → faction pick → war-begins → game) is intact.
- Initial state, OOB, and political control overlay all render.
- Tutorial overlay step transitions work.
- Brigade icons render on the map after step 2.
- Two side panels (COMMAND, PRESIDENTIAL INBOX) populate with faction-correct data.
- Toolbar, overlay selector, status bar all render.

## Issues / questions noticed so far

- **Double faction picker.** Player has to choose their side once in the Warroom and again on the Map tab. This is likely an artifact of the Map tab being a separate origin (`localhost:3002` vs `127.0.0.1:3000`) and not sharing state. In a packaged Electron build this is presumably one process — but in dev it's friction. Recommend: persist the choice via `postMessage` from opener, or skip the second picker when an opener is detected.
- **Two host names** (`127.0.0.1` vs `localhost`). Inconsistent — likely irrelevant in Electron but causes CORS / cookie-isolation surprises in browser dev mode. Worth standardizing on one.
- **Auto-spawned tab.** New tab opened without explicit user action — browsers often block this as a popup. Worth checking what happens when a popup blocker is on.

## To verify next

- Click through tutorial steps 5–8.
- Open SUMMARY, RECORDS (Army HQ), OPS, EVENTS, CODEX, INBOX from the top bar.
- Toggle POLITICAL / ETHNIC / SUPPLY / OPERATIONS overlays.
- Click a settlement; click a front-edge sector.
- Inspect 1st Krajina Corps, change stance.
- ADVANCE_TURN once and confirm date/turn counter increments and state mutates.
- Watch console for errors throughout.

## Tutorial walkthrough (continued)

5. **The Decision Room** — "Before you advance the turn, the Decision Room surfaces every pending choice: command friction, peace plans, opportunity dossiers. Source handoffs route you back to the originating panel. Resolve what you can; defer what you must."
6. **Operations** — "Your corps commanders propose operations. Approve to authorize, decline to refuse, or force-launch to spend command authority and override their judgment. Brigades never attack alone — every assault flows through a corps operation."
7. **Advance and Read the Aftermath** — "When you advance the turn, the war moves forward by one week. The aftermath panel reports what changed: battles fought, ground gained or lost, casualties, command outcomes. Read it. The next turn begins with the consequences of this one."
8. **The Cost Ledger** — "The Cost Ledger remembers. Every approved operation, every override, every refusal accrues. At the end of the war, the verdict compares your choices against history. There is no winner here — only how heavy the cost, and on whom it fell."

Tutorial overlay transitions, copy, and Finish all work.

## Toolbar exercise

### SUMMARY → "War Summary" modal
Seven tabs: OVERVIEW · IVP · CONVOYS · CASUALTIES · SUPPORT · OPSEC · CAPITAL.

- **OVERVIEW** ✓ — Territory 51.7% friendly, Personnel 118k (mismatch with "WAR BEGINS" 82.5k — see issues), KIA/WIA 0, displacement 0, Fronts 603 engaged / 402 exposed, 14 hostile takeover timers, 5 active operations.
- **IVP** ✓ — Composite IVP 0; thresholds "30% Drina · 60% sanctions · 80% NATO threat"; consequences: none.
- **CONVOYS** ✗ — Empty panel, no placeholder text.
- **CASUALTIES** ✓ — "VRS · No data" placeholder present.
- **SUPPORT** ✗ — Empty panel, no placeholder text.
- **OPSEC** ⚠ — "No sectors are currently running OPSEC." Operation Health lists **only** Operation Drina and Operation Koridor (Supply 100% · Failures 0). But the OPS view shows **five** active operations (see below) — this list is incomplete.
- **CAPITAL** ✗ — Empty panel, no placeholder text.

### RECORDS
Button highlights in toolbar, but no visible modal/panel opens (or opens behind something). Tutorial copy says "RECORDS opens Army HQ" — Army HQ functionality may already be the persistent left COMMAND panel, in which case the button toggle is a no-op when the panel is already visible. Confusing.

### OPS → field-ops view
Map jumps to north-Bosnia (Sanski Most / Banja Luka / Tuzla / Doboj corridor — the strategic VRS operating area). Targeting reticles appear on hostile units. A right-side "Field Ops Snapshot" / "Operations list" panel renders **five** planned ops:

| Op | Corps | Brigades | State |
|---|---|---|---|
| Prijedor | 1st Krajina | 8 | Planning · Stable · Turn 1 · Supply 100% |
| Drina | Drina Corps | 5 | Planning · Stable · Turn 1 · Supply 100% |
| Koridor | East Bosnian | 7 | Planning · Stable · Turn 1 · Supply 100% |
| Višegrad | Herzegovina | 6 | Planning · Stable · Turn 1 · Supply 100% |
| Prsten ("Ring") | Sarajevo-Romanija | 10 | Planning · Stable · Turn 1 · Supply 100% |

Total 36 of 77 brigades committed at start. Operation code names are historically and canonically accurate for VRS 1992.

## Console errors observed

Two deck.gl `SolidPolygonLayer` initializations fail on page load:

```
deck: initialization of SolidPolygonLayer({id: 'osid-damage-overlay-fill'})
deck: initialization of SolidPolygonLayer({id: 'force-quality-glow-overlay-fill'})
```

Both throw `@math.gl/web-mercator: assertion failed` in `lngLatToWorld` → `WebMercatorViewport.projectFlat` → `getSurfaceIndices` → `PolygonTesselator._updateIndices`. Cause: invalid coordinates (NaN or out-of-bounds lat/lng) somewhere in the polygon set those two layers consume. Real bug — those overlays are silently absent until fixed.

## Bugs / issues confirmed so far

1. **Literal escape sequence in UI text** (real bug, easy fix). The Presidential Brief action button shows `UNDERSTOOD \U2014 BEGIN` — the `\U2014` should have been rendered as an em-dash (`—`). The body text in the same panel renders em-dashes correctly, so the bug is local to the action label / button string. Likely a JSON-decoded source that wasn't run through Unicode unescape, or a missed `\u` → char conversion.
2. **WAR SUMMARY: missing empty-state placeholders** on CONVOYS, SUPPORT, CAPITAL tabs. CASUALTIES does it right ("VRS · No data"). Three other tabs render a blank container, which reads as broken.
3. **WAR SUMMARY OPSEC tab inconsistency** with OPS view. OPSEC lists 2 operations (Drina, Koridor); OPS view lists 5 (adds Prijedor, Višegrad, Prsten). Either OPSEC is filtering by something undocumented, or it's just stale/incomplete.
4. **Personnel total mismatch.** "WAR BEGINS" briefing → 82.5k VRS personnel. WAR SUMMARY · OVERVIEW → 118k. These almost certainly count different things (e.g. at-arms vs. mobilizable, or excluding/including TO/police), but the same screen should label the difference. As shown, a player can't reconcile them.
5. **RECORDS button does nothing visible.** Either it's a no-op when the COMMAND panel already serves as Army HQ, or the intended Army HQ modal is broken. Either way confusing.
6. **OPS-view right panel z-order.** The "Field Ops Snapshot" panel is partly hidden behind the Presidential Inbox column on the right — only "FIE…", "Arm…", "sta…", "PL…" peek through. The Inbox needs to collapse, share, or move when OPS view is active.
7. **Double faction picker.** Warroom asks once; the auto-spawned Map tab asks again (different origin). In dev this is acceptable; in the packaged Electron app it shouldn't repeat. Add postMessage hand-off or skip the second pick when an opener is present.
8. **Inconsistent host names** (`127.0.0.1:3000` vs `localhost:3002`) — irrelevant in Electron, painful in dev (CORS, cookies, popup blockers).
9. **Auto-spawned popup** is technically a "user-action triggered window.open" so most browsers will allow it, but it should be documented. Strict popup-blocker setups will silently break the boot path.

## Overlay exercise (bottom bar)

- **POLITICAL** ✓ — default, pink/green/yellow control polygons.
- **ETHNIC** ✓ — legend "MAJORITY ETHNICITY · Serb · Bosniak · Croat" appears bottom-left.
- **SUPPLY** ✓ — legend "SUPPLY STATUS · Critical · Adequate" + "LOGISTICS: Reserves disabled, 0 open, 0 strained, 0 cut".
- **OPERATIONS** ✓ — legend "OPERATIONAL EFFORT · Holding · Supporting · Main Effort". Red threat arrows appear pointing into VRS territory near Posavina (Brčko corridor).
- **+MORE → expands** to CASUALTIES · MORALE · DEFENSE.
- **DEFENSE** ✓ — legend "DEFENSE DENSITY · Dense · Moderate · Thin".
- Bug: when +MORE is expanded, the label "DEFENSE" appears twice in the overlay row — once in the primary slot and once at the far right. Either two distinct overlays share the label or the row wraps the wrong way.

## Corps inspection

Clicking 1st Krajina Corps in the COMMAND panel:
- Map zooms / pans to the corps' operating area.
- All brigade icons in that corps's zone are highlighted with white borders.
- The right column swaps from PRESIDENTIAL INBOX to **FIELD OPS SNAPSHOT** with the panel header "Army HQ owns command review. This panel stays map-facing." plus a small `HQ REVIEW` button.

So `RECORDS` button vs corps-click → both seem to be paths into Army HQ, just with different entry framings. The empty-state of the toolbar `RECORDS` may simply be the same view when nothing's selected — the tutorial promise still over-sells it.

## HQ REVIEW click → broken page

Clicking the `HQ REVIEW` button on the Field Ops Snapshot panel **broke the entire map view** — all overlays, all brigade icons, all political polygons disappeared, leaving only the cream-colored base layer and a few city labels in barely-visible light-gray text. The page never recovered without a full reload.

Console at the time showed a cascade of Vite HMR failures across 12+ components (`PresidentialInbox.tsx`, `PresidentialToolbar.tsx`, `App.tsx`, `MapContainer.tsx`, `PeaceStatusPanel.tsx`, `TurnAftermathRecordsPanel.tsx`, `WarSummaryContent.tsx`, `AdvanceTurnModal.tsx`, `FormationDetail.tsx`, `PresidentialDecisionRoomPanel.tsx`, `WarroomStatusBar.tsx`, …) — these were `[hmr] Failed to reload` errors, meaning the dev server caught a file mid-edit and couldn't compile. **In dev mode this is a development-environment problem, not a game bug** — but the production-mode equivalent would be the panel never rendering, and the user wouldn't know why. The HQ REVIEW path needs a defensive boundary so that a render failure inside the right panel doesn't take the map with it.

## Continue (Last Run)

After reloading the page, the faction-picker came back with "→ CONTINUE (LAST RUN)" highlighted. Clicking it loaded a different campaign state — Turn 40, 6 Jan 1993:

- Gameplay state: 314 formations, 822 control entries (per `[gameStore] Loaded save: Turn 40 (war)` console log).
- Army count up to **83 brigades** (from 77 at Turn 0).
- 1st Krajina Corps commander has changed: **Slavko Lisica** (replaced Talić — a leadership event happened off-screen). Tanks 130/210, arty 497/526 — readiness has degraded from 100% at start.
- 2nd Krajina Corps: 8,950 pers / 8 bde / Tanks 19/?? / arty 123/??.
- Friendly territorial control: **64.2%** (up from 51.7%) — meaningful VRS gain.
- Hostile-held: **26.5%** (down from 46.3%) — corresponds to RBiH/HVO losses.
- Belgrade attitude: **SUPPORTIVE** (was CAUTIOUS) — diplomatic relations improved.
- INBOX: **41** pending items.

State changes are coherent — VRS-canonical campaign for the period. Good signal that the sim is producing plausible mid-war states.

Bugs at Turn 40:

10. **The tutorial overlay replays on Continue.** Re-tutorial-ing a player at week 40 after they've finished it once is a UX regression. The tutorial-seen flag isn't persisted in saves.
11. **Vance-Owen Peace Plan modal renders 0% / 0% / 0% territorial division.** The bar above the labels is empty. Either the percentages aren't being threaded from the proposal data, or the modal is rendering before the proposal payload loads.
12. **Vance-Owen modal lists "Republika Srpska — REJECTED" under "OTHER FACTION RESPONSES",** but the player is RS. Either the proposal is leaking the player's own pending response into the "other factions" list, or the label is wrong.
13. **Vance-Owen modal has no close/dismiss button** — only Accept/Reject. Players who want to inspect the plan without committing are forced into a decision.
14. **REJECT PLAN doesn't dismiss the inbox card.** After clicking REJECT, the modal closes, but the URGENT Vance Owen card remains in the inbox and the INBOX badge still says 41. So either REJECT silently failed, or this op was already rejected and the card never expired.
15. **Duplicate "PERSONNEL Matter — Regarding Ratko Mladić" cards** stack in the Presidential Inbox — at least 4 visible without scrolling. Likely the same underlying event being emitted on every turn it remains unresolved, with no dedupe.
16. **ADVANCE_TURN button is unresponsive to clicks** at Turn 40. The button is in the toolbar, isn't aria-disabled, accepts clicks, but no state change, no console log, no error toast, no modal appears. If it's gated on resolving the inbox / decision room, the button needs to surface that gate (tooltip, "Resolve N pending decisions to continue", or a Decision Room modal that auto-opens on click). Right now it's a silent no-op — the worst UX state for a primary action.
17. **`AdvanceTurnModal.tsx` was in the HMR failure list** earlier. It's possible the advance modal *would* open if the component weren't broken from the HMR cascade. Verifying after a clean reload would isolate the dev/HMR cause from any real bug.

## Bugs / issues — final consolidated list

### Real defects (real-mode bugs, not dev-server artifacts)

1. **Literal `\U2014` instead of em-dash** in "UNDERSTOOD \U2014 BEGIN" button label on the Presidential Brief panel. Body text in the same panel uses em-dashes correctly. Localized to the action label.
2. **deck.gl polygon-layer assertion failures** on every page load:
   - `osid-damage-overlay-fill` — `@math.gl/web-mercator: assertion failed` (`lngLatToWorld` → `projectFlat` → `getSurfaceIndices`).
   - `force-quality-glow-overlay-fill` — same stack.
   These two overlays are silently absent. The cause is invalid (NaN or out-of-range) coordinates in the polygon data those layers consume.
3. **WAR SUMMARY: missing empty-state placeholders** on CONVOYS, SUPPORT, CAPITAL tabs. CASUALTIES handles it correctly.
4. **WAR SUMMARY · OPSEC inconsistency.** Lists 2 operations (Drina, Koridor) where OPS view lists 5 (adds Prijedor, Visegrad, Prsten). Either filter is undocumented or list is stale.
5. **Personnel total mismatch** between "WAR BEGINS" briefing (82.5k) and WAR SUMMARY · OVERVIEW (118k). Same screen needs to label what each number includes.
6. **RECORDS button: ambiguous behavior.** Highlights in the toolbar but opens nothing distinct from clicking a corps. Tutorial promise oversells it.
7. **OPS-view right panel z-order.** Field Ops Snapshot panel is partially hidden behind the Presidential Inbox column when OPS view is active.
8. **Bottom-bar "DEFENSE" appears twice** when +MORE is expanded.
9. **Tutorial overlay replays on Continue.** Tutorial-seen flag isn't persisted in the save.
10. **Vance-Owen modal: 0% / 0% / 0% territorial division.** Empty data fed to bars, or modal rendered before data loaded.
11. **Vance-Owen modal: RS listed under "OTHER FACTION RESPONSES"** when the player IS RS.
12. **Vance-Owen modal: no close/dismiss option.** Only Accept/Reject — no way to review without committing.
13. **REJECT PLAN doesn't dismiss the inbox card.** Inbox count stays at 41.
14. **Duplicate "Personnel Matter — Regarding Ratko Mladić"** cards stack without dedupe.
15. ~~**ADVANCE_TURN silently no-ops** when blocked. No tooltip, no toast, no auto-open of the Decision Room. Primary action gives zero feedback.~~ — **Retracted.** ADVANCE_TURN is an IPC action serviced by the Electron main process. The browser dev server doesn't have that bridge, so the no-op behavior is expected, not a defect.

### UX / friction (worth fixing but not critical)

16. **Double faction picker** (Warroom on `:3000`, Map auto-spawned on `:3002`, each asking separately).
17. **Inconsistent host names**: `127.0.0.1:3000` vs `localhost:3002`. Standardize on one for dev parity with packaged Electron behavior.
18. **Auto-spawned popup** — strict popup blockers will break the boot path silently.

### Dev-environment only (not bugs, but worth a note)

- **HMR cascade failure** observed when files were modified during the session. Vite couldn't reload 12+ components and the page entered a broken state. Not a game defect, but the failure mode (blank cream-colored map) is identical to what a real render-bug would look like — adding an error boundary at the map-container level would protect users from ever seeing this in production.

## Recommendations

1. **Add a unit test that fails on `\u`/`\U` in any rendered text.** A single render-pass linter would have caught the `\U2014` bug. Audit all string sources (briefings, ops, peace plans) and route them through one Unicode-unescape pipeline.
2. **Add a `<EmptyState>` component and make WAR SUMMARY tabs require either rows or it.** Fix Convoys/Support/Capital today by typing the panel-render contract: `rows: Row[] | EmptyMessage`.
3. **Reconcile OPSEC and OPS-view operation lists.** If "OPSEC" filters for operations under OPSEC restriction, label the sub-heading to say so and add a count. Otherwise show all 5 ops.
4. **Label personnel numbers explicitly** on both the WAR BEGINS briefing and WAR SUMMARY overview. `82.5k at arms · 118k mobilized` (or whatever the distinction is).
5. **Hand off faction choice via `postMessage`** from Warroom → Map opener. Eliminate the double picker. Bonus: persist the choice in `localStorage` so reload preserves it.
6. **In OPS view, hide or collapse the Presidential Inbox column** so it doesn't overlap with Field Ops Snapshot. Single right-column container that swaps content based on top-bar selection.
7. ~~**Make ADVANCE_TURN's blocked state visible.**~~ — **Retracted** for the same reason as findings #15 and #23. (Optional carryover: in dev-server mode, the button could render a "engine offline — run in Electron" hint instead of staying silent, so testers don't chase a non-bug. Low priority.)
8. **Dedupe inbox events by `(event_kind, subject_id)`.** "Personnel Matter — Ratko Mladić" shouldn't stack four times — one card with a "+3 updates" indicator is enough.
9. **Persist tutorial-seen flag in the save file** so Continue doesn't replay it.
10. **Wire the Vance-Owen modal to its proposal payload.** 0%/0%/0% rendering means the modal is binding to an empty struct. And add a Close (X) button at the modal top-right for non-committal inspection.
11. **Filter the proposing/responding faction out of "OTHER FACTION RESPONSES."** Show only true others.
12. **Add error boundaries** around the right panel and the map container so a render failure in one doesn't blank the other. The HQ REVIEW → blank map scenario today (even if caused by HMR) would be indistinguishable from a real prod bug to a player.
13. **Investigate the deck.gl `lngLatToWorld` assertion failures.** Find which polygon set feeds `osid-damage-overlay-fill` and `force-quality-glow-overlay-fill`, identify the offending coords (likely NaN), and either clamp or skip the bad geometries. Right now both overlays silently fail to render.

## Attempt to prepare and launch a VRS operation (Turn 40)

### What I did

1. Opened the OPS view from the toolbar. At Turn 40 the active operations are different from Turn 0 — three planning-state ops:
   - **Operation Cerska-Kamenica** — Drina Corps, OiC: Vinko Pandurević, 2 bdes, Since W40, Obj 0/2.
   - **Operacija Hrast** — East Bosnian Corps, 3 bdes, Since W38.
   - **Operacija Ponor** — Sarajevo-Romanija, 3 bdes, Since W36.
2. Clicked Cerska-Kamenica in the OPS list. Got back: brigades **1st Bratunac, 1st Zvornik**; objectives **Radovčići (Srebrenica), Sulice (Srebrenica)**. All historically and geographically accurate — Drina Corps' Eastern Bosnia offensive of Jan/Feb 1993.
3. Searched the accessibility tree for any approve / authorize / commit / force-launch / hold / freeze / veto control. **None exist for this operation.**
4. Found the corps stance dropdowns instead (one per corps), described as: *"Corps operational posture — affects aggression, operations, and entrenchment"* with options Defensive · Balanced · Offensive · Reorganize.
5. Drina Corps was on Defensive. Changed it to **Offensive** using keyboard input on the native `<select>`. The change held — STANCE label updated, Drina Corps zone highlighted on map.
6. Looked for an Order Queue indicator — none was visible after the order. Console showed 4 redundant Vite HMR rebuilds of `/components/OrderQueue.tsx` but no `[gameStore]` log of an order being recorded.
7. Clicked **ADVANCE TURN**.

### Result

Date and turn counter did not change. No modal opened. No toast appeared. No console error fired. Nothing.

### Findings from this attempt

18. **No exposed "force-launch" control.** Tutorial step 6 explicitly says "force-launch to spend command authority and override their judgment." There is a Command Authority gauge in the top bar (100/100, +2 recovery per turn, accessible aria description: *"Spent on Level 3 overrides (force-launch, manual orders)"*) — so the mechanic is implemented at the data layer — but no button surface to spend it from. Either the UI affordance was cut, or it only appears under conditions I didn't trigger.
19. **Approve / decline are also missing.** Same situation — the tutorial promises three controls (approve, decline, force-launch); the accessibility tree exposes zero of them for any operation.
20. **Operation rows in Army HQ → Operation History are display-only.** No click handler, no drill-in. The data is presented but uninteractable.
21. **Drina Corps detail panel says "No active operations"** while OPS view and Army HQ → Operation History both list **Operation Cerska-Kamenica** as a Drina Corps operation. One of these views is wrong. The corps-level detail panel is probably what the player will check first ("what's my corps doing?"), and saying "nothing" when an op is in flight is a bad bug.
22. **Stance change leaves no audit trail in the UI.** No Order Queue badge, no toast, no inbox confirmation, no preview of what the change will trigger next turn. The Drina Corps STANCE pill is the only feedback.
23. ~~**ADVANCE_TURN remains unresponsive after a valid order.**~~ — **Retracted.** ADVANCE_TURN is an IPC call into the Electron main process, which isn't reachable from the dev-server browser. The no-op is expected. To validate the stance change actually executes, the test has to be run inside the packaged Electron app (`npm run desktop`) — out of reach for me from Cowork's browser-only Chrome driver.

### Recommendations specific to the operations flow

14. **Surface the three op controls promised by the tutorial.** On each operation card (in OPS view's Field Ops Snapshot, in Army HQ's Operation History, and on the operation-detail drill-in), expose `Approve` / `Decline` / `Force-Launch (cost: N CA)` buttons explicitly. Disable + tooltip them when not applicable so the player understands the option still exists.
15. **Reconcile corps detail panel with operation list.** Drina Corps detail must show Cerska-Kamenica under its Operations section, not "No active operations." Either the panel binds to the wrong field or operations aren't being joined to corps in this view.
16. **Add an order-queue indicator** that surfaces every issued order until the turn advances. A small chip — *"1 order pending: Drina Corps stance → Offensive"* — would give the player feedback that their click registered and confidence in what next turn will execute.
17. ~~**Make ADVANCE_TURN's gating visible.**~~ — **Retracted.** Same reason as finding #15 / #23: ADVANCE_TURN is an IPC action and the browser dev server can't service it. The "issue order → resolve consequences" loop does work, just not from this surface. A proper test of the stance change requires running `npm run desktop`.

## What's working well

This is a serious, ambitious project and most of the surface works. The starting state matches canonical April 1992 OOB. Operation names (Prijedor, Drina, Koridor, Višegrad, Prsten) are all historically accurate VRS code names. The overlay system (Political/Ethnic/Supply/Operations/Defense) has thoughtful legends and renders fast. The Turn 40 save state showed coherent campaign progression — 51.7% → 64.2% friendly, Belgrade shift to SUPPORTIVE, leadership changes, 314 active formations, 822 control entries all moving on a credible trajectory. The tutorial copy is excellent — "you cannot win by conquest" / "there is no winner here — only how heavy the cost, and on whom it fell" sets the frame for a serious wargame, not a power fantasy. The Decision Room / Cost Ledger conceptual architecture is exactly right for the negative-sum thesis.

The bugs above are surface-layer: empty placeholders, escape sequences, button feedback, dedupe. The model underneath is doing the hard work correctly.


## Recommendations (draft, will be expanded)

1. Run all UI strings through a single Unicode-unescape pass at the build step, and add a unit test that fails on any rendered text containing `\u` or `\U`. The OPSEC inconsistency suggests the briefing/op JSON is not all going through the same renderer pipeline — unifying that pipeline would catch this kind of bug across the board.
2. Add a default `<EmptyState>` placeholder for WAR SUMMARY tabs so blank data never silently renders an empty container. Fix CONVOYS / SUPPORT / CAPITAL today; make the placeholder mandatory by typing the panel's render contract to require either rows or an explicit "no data" message.
3. Reconcile OPSEC vs. OPS-view counts. If "OPSEC" means "operations under OPSEC restriction" rather than "all operations", say so in a sub-heading or tooltip — currently it reads like all-ops and the player is left to wonder if 3 ops disappeared.
4. Label the personnel numbers. On both screens, render `82.5k at arms` vs `118k mobilized` (or whatever the actual distinction is). Players will not forgive a phantom 35k.
5. Make RECORDS either open a distinct Army HQ modal, or remove the button if COMMAND panel is the HQ. The tutorial promise creates expectation; an unresponsive button breaks trust.
6. In OPS view, collapse or replace the Presidential Inbox column with the Field Ops panel. Don't stack them on top of each other.
7. Hand off faction choice via `postMessage` from Warroom → Map, or persist a session token. Avoid the double picker.

