# GUI Visual & Interaction Audit — 2026-05-22

**Scope:** Desktop UI of *A War Without Victory* — Tactical Map shell and Warroom shell (one integrated React app), plus Army HQ, Presidential Decision Room, Presidential Inbox, peace/event modals.
**Method:** Source-level audit (3 focused passes over `src/ui/map`, `src/ui/warroom`, `src/desktop`, GUI docs) + live click-through driven through Claude in Chrome against the running dev server.
**Constraint honored:** No code, scenario, OOB, or calibration changes were made. The only runtime intervention was hiding two IPC-locked peace overlays via DevTools `display:none` so surfaces behind them could be inspected; this is reverted by a page reload and touches no repo files. Working tree unchanged by this audit.

**Implementation status (2026-05-24):** SUPERSEDED BY IMPLEMENTED FIX PACKETS. The findings below remain as the original audit evidence, but the actionable batches A-H are now tracked as closed in `docs/40_reports/GUI_MASTER.md` and the implementation reports under `docs/40_reports/implemented/20260522_GUI_AUDIT_*.md`. Do not reopen these findings from this audit alone; verify current source/tests first. The closed packets include MapLibre dasharray repair, label discipline, peace/event modal hygiene, modal palette unification, stale-state resets, Warroom shell ownership, dead-control feedback, and H1-H9 polish cleanup.

> Severity key: **P0** broken/blocking · **P1** serious usability or player-truth issue · **P2** polish/clarity · **P3** optional enhancement.
> Provenance tags per finding: **[live]** observed in the running app · **[source]** found by code inspection · **[live+source]** both · **[verify]** needs confirmation.

---

## 1. Launch method and environment

- **App:** `npm run dev:map` (Vite + React + MapLibre/deck.gl) — the *full integrated shell*: Tactical Map, Warroom (`?view=warroom`), Army HQ, Decision Room, Inbox, modals. `dev:warroom` (legacy canvas desk shell) was not required and was not separately driven; the React shell at `dev:map` is canonical and hosts the Warroom.
- **Actual dev port: `http://localhost:3002`** (the brief/CLAUDE.md value of 3001 is stale; `src/ui/map/vite.config.ts:112` sets `port: 3002`). Legacy warroom is `3000`.
- **Audit URLs:** `http://localhost:3002/?live=1` (auto-loads `data/derived/latest_run_final_save.json`) and `http://localhost:3002/?view=warroom&live=1`.
- **Loaded state:** the only saves on disk are full-length end-game runs (104w/156w/188w). `latest_run_final_save.json` loads at **Turn 188 / 8 Nov 1995, player faction RBiH (ARBiH)**, mid-Dayton. No mid-war save exists, so the campaign opened directly into the peace-negotiation flow.
- **Browser:** Chrome on Windows, viewport rendered at 2294×735 CSS px (dpr 1.5).
- **Hard constraint — Electron bridge absent in browser:** `window.awwv` is `undefined`, so every mutating IPC call (advance-turn, order staging, recruitment, save, settings persist, peace accept/decline, AI advisor, combat estimate) is a **silent no-op**. Read/navigation/layout/visual surfaces are fully testable; state-mutating flows are verified by source only and are flagged as such.

### Verification corrections (claims checked and *retracted*)
Recorded for honesty and to save the implementer time:
- "Blank map = P0" — **retracted.** The cream map was a transient tile-load state; the map renders fully (control fills, terrain hillshade, fronts, counters) once PMTiles load.
- "Dayton 'Decline Talks' is not an accessible button" — **retracted.** The AX snapshot missed it, but the DOM confirms it is a real `<button>`.
- "Inbox/briefing buttons are unlabeled (a11y)" — **retracted.** A DOM sweep of all 116 buttons found **0 without an accessible name**.
- "Army HQ date inconsistency 1995/1996" — **retracted.** Zoom confirmed "8 NOV 1995"; the 1996 reading was a low-res misread.
- Reduced motion — the stylesheet *does* contain `prefers-reduced-motion` handling.

---

## 2. Surfaces inspected

**Live (driven in Chrome):** Tactical Map base render; top PresidentialToolbar; bottom map-mode bar incl. `+MORE`/`LESS` (all 9 modes); Political & Supply modes; left OOBSidebar (Situation/Territory/SITREP/Casualties/Alliance/IVP, Supply Status); Presidential Inbox + Presidential Brief; Army HQ (BRIEFING incl. Strategic Position + Decision Room command-loop lanes; RECORDS incl. AAR sub-tabs); Vance-Owen peace modal; Dayton Accords modal; Warroom desk scene + 8 hotspots; keyboard (Escape, `H`, focus ring); reduced-motion & accessible-name probes.

**Source-only (Electron-gated or canvas-internal):** advance-turn / Turn Aftermath; order staging; settlement SelectionPanel internals; CorpsFrontPanel; OperationBriefingModal; CommanderSelectionModal; OpsPlanningModal; EventModal; OrderInterpretationPanel; PresidentialAttentionPanel; Coachmark/Onboarding overlays; Codex/Chronicle/Verdict (entrypoints confirmed live).

**Not reachable this pass:** true mobile/narrow viewport (window-resize did not reflow the fixed 2294px dev viewport); per-settlement map picking (canvas has no element refs and coordinate clicks mis-scaled); Electron packaged shell.

---

## 3. Click-through coverage checklist

| Surface | Reached | Result |
|---|---|---|
| Top toolbar (Chronicle/Summary/Records/Ops/Events/Codex/Inbox/Reviews/Reserve/Tensions/Resolve/HQ/Advance) | live (enumerated, AX refs) | all present & labeled |
| Map base render + zoom/bearing controls | live | renders after tile load |
| Map modes (9): Political, Ethnic, Supply, Operations, Casualties, Morale, Defense, Authority, Legitimacy | live | switch works; Supply degraded (see P1-2) |
| `+MORE` / `LESS` mode expander | live | works |
| Layer toggles (LAYERS dropdown), Strategic Dashboard btn | live (present) | not opened |
| OOBSidebar accordion + SITREP | live | raw-slug leak (P1-3) |
| Settlement panel (click-select) | not (canvas/coords) | source-covered |
| Corps/sector/formation panels | source | findings P1-7/8/9 |
| Presidential Inbox + Brief | live | stale-backlog content; brief CTAs present |
| Army HQ BRIEFING + Strategic Position | live | OK; commander empty-state |
| Presidential Decision Room lanes | live | lane title repetition (P2) |
| Army HQ RECORDS (Aftermath/AAR/Op History/Opportunities) | live (AAR) | clean; enemy-detail to verify |
| Army HQ PERSONNEL / SUMMARY | not opened | source |
| Operation opportunity / planning / briefing modals | source | palette + draft-loss findings |
| Peace modals (Vance-Owen, Dayton) | live | P1-1, P1-4, exit fragility |
| Event modal / Order interpretation | source | P0/P1 |
| Warroom scene + 8 hotspots | live | shell-bleed (P2), calendar (P2) |
| Codex / Chronicle / Verdict | entrypoints live | not deep-driven |
| Onboarding / coachmarks | source | P0 (spotlight) |
| Settings/Preferences | source | Electron-gated |
| Keyboard / focus / reduced-motion | live (partial) | focus ring OK; reduced-motion present |
| Narrow/mobile viewport | not (dev viewport fixed) | gap — test in Electron |

---

## 4. Findings ordered by severity

Each finding lists **file/component** (section 6) and **suggested fix** (section 7) inline.

### P0 — Broken / blocking

**P0-1 — Onboarding "spotlight" never highlights anything. [source]**
`onboarding/OnboardingOverlay.tsx:315-370`. Steps 02-08 declare `target_ui_element` tokens and 7 components render matching `data-tutorial-step` markers, but the overlay only renders a centered modal — it never resolves a target, computes a rect, or draws a spotlight/arrow. The tutorial says "use the toolbar / open Army HQ" while pointing at nothing. *Fix:* resolve `next.target_ui_element` to a node, compute `getBoundingClientRect()`, render a cutout/arrow; or rewrite copy to drop spatial deixis. Add a startup assertion that every step token resolves.

**P0-2 — Order "OVERRIDE" is a no-op duplicate of "ACCEPT". [source]**
`OrderInterpretationPanel.tsx:107-120`. The OVERRIDE button calls the same `handleAcknowledge(event.event_id)` as ACCEPT, so the override path (relieve officer / force order, with the morale penalty teased at :124) is never invoked — a dead control on a command-authority surface. *Fix:* wire OVERRIDE to a distinct override/relieve action, or hide it until the backend exists. (Player-command-authority change — see §10.)

### P1 — Serious usability / player-truth

**P1-1 — Vance-Owen peace modal: all three territorial-share meters read 0%. [live+source]**
Live AX: "Republic of Bosnia and Herzegovina 0% / Republika Srpska 0% / Croatian Republic of Herzeg-Bosnia 0%" on the "Proposed Territorial Division" meters. A division summing to 0% is meaningless. Matches the previously-flagged "Vance-Owen 0% bars" regression — it is back / unresolved. *Component:* the PeacePlan/Vance-Owen modal (peace-plan modal component under `src/ui/map/components/`). *Fix:* bind meters to the proposal's actual share fields; add a test asserting the three shares are >0 and sum ≈ 100.

**P1-2 — Two MapLibre layers fail to add (data-driven `line-dasharray` unsupported). [live+source]**
Console errors confirmed live: `layers.front-line-stripe.paint.line-dasharray: data expressions not supported` (`MapContainer.tsx:1051`) and `layers.supply-reach-outline.paint.line-dasharray: data expressions not supported` (`MapContainer.tsx:2622`). The base front line still renders, but the decorative front stripe is lost and **Supply mode shows no supply-reach outlines** (confirmed live: Supply mode renders dimmed control + counters only). *Fix:* MapLibre forbids data-driven `line-dasharray`; replace with either static dash arrays split across step/zoom-keyed layers, or move the dashed visualization to a deck.gl `PathLayer`. Add a `map error` console assertion to CI so layer-add failures fail the build.

**P1-3 — SITREP leaks raw settlement slugs into the president's briefing. [live]**
Left OOBSidebar "OPERATIONAL SITREP → Priority fronts" renders: `Bijeljina Cadjavica_gornja_2 - Ugljevik Srednja_trnova_2; Bijeljina Suho_polje_2 - Ugljevik Srednja_trnova_2` — raw snake_case settlement IDs with numeric suffixes instead of player-safe names. Violates label discipline (settlement labels must route through `getOsidDisplayName`). *Component:* OOBSidebar SITREP / situation builder (`src/ui/map/components/OOBSidebar.tsx` + the SITREP/front-cue source feeding "Priority fronts"). *Fix:* resolve every settlement token in priority-front strings through the display-name helper before render; add a test that SITREP strings contain no `_` slug pattern.

**P1-4 — Stacked / stale peace modals on load. [live]**
On loading the latest save (Turn 188), the DOM holds **three** stacked dialogs: Army HQ (when opened) + Vance-Owen ("Proposed: Week 40") + Dayton Accords — i.e. a 148-week-stale Vance-Owen proposal is still mounted alongside Dayton. Two diplomatic modals render at once. *Component:* peace-plan / Dayton modal mount gating (store flags fed from save). *Fix:* ensure only one peace surface mounts at a time; clear superseded proposals; never re-present a resolved/expired plan. (Could be save-data debt — see §10.)

**P1-5 — Peace modals have fragile exit affordances. [live]**
Dayton modal: Escape does **not** dismiss (focus just moves to the first Demand button); the only exits are SUBMIT PROPOSAL / DECLINE TALKS, both IPC-gated (no-op in browser, so unclosable there). *Component:* Dayton/PeacePlan modal — does not use the shared `Modal` (which provides Escape/backdrop/focus-trap). *Fix:* migrate peace modals to shared `Modal`, or add an Escape→"Review Later/Decline" handler; ensure a non-IPC dismissal path exists.

**P1-6 — OperationBriefingModal uses a light theme on the key Go/No-Go surface. [source]**
`OperationBriefingModal.tsx` (~62 hardcoded light classes; action bar :588-625) renders `bg-neutral-50/100/200`, `bg-green-100 text-green-800`, `bg-white` while every other command surface uses the dark console palette (`bg-panel-bg`, `text-text-primary`, `accent-gold`). The single most consequential operation decision reads as a different app. *Fix:* re-skin to panel tokens.

**P1-7 — CommanderSelectionModal light-theme leak. [source]**
`CommanderSelectionModal.tsx:111` — `bg-white border-2 border-neutral-400`, `text-neutral-500`, footer `bg-neutral-50`. Inconsistent with its launching modal. *Fix:* re-skin to panel tokens.

**P1-8 — EventModal can only be dismissed by one button. [source]**
`EventModal.tsx:97-237` is built on `GlassPanel`, not shared `Modal`: no Escape, no backdrop-click, no ×. The header comment claims "auto-dismisses" but no such code exists. For an event *queue* this forces a mouse click-through with no keyboard path. *Fix:* migrate to shared `Modal` or add a keydown-Escape → `onAcknowledge`.

**P1-9 — Stale confirmation messages bleed across selection changes. [source]**
(a) `CorpsFrontPanel.tsx:151-156,540` — `sectorActionMessage` is not reset when `selectedSectorId` changes; a "Sector stance staged…" toast shows against the wrong sector. (b) `SelectionPanel.tsx:36,210,292` — `supportMessage` ("Local support staged…") persists onto the next settlement. *Fix:* reset each message in a `useEffect` keyed on the selection id.

**P1-10 — Army HQ re-opens on the last tab, not the intended landing. [source]**
`gameStore.ts:412-420` resets `expandedCorpsId`/sections on close but **not `armyHQTab`**; reopening lands on the last-used tab (e.g. PERSONNEL) instead of BRIEFING, and a stale `armyHQTab` can override a Warroom hotspot's requested tab (`WarroomShellLayer.tsx:82-88`). *Fix:* reset `armyHQTab:'briefing'` on close, or have the open path always apply the requested tab.

**P1-11 — Decision-action buttons silently no-op when the bridge is unavailable. [source]**
`PresidentialAttentionPanel.tsx:62-72` (Accept Replacement / Acknowledge / response options) and Army HQ Emergency-Posture (`ArmyHQModal.tsx`) `return` silently with no feedback and no `setLoadError` when `!ipc.isAvailable`; buttons stay enabled. Degrades to dead buttons in browser, and hides genuine IPC failures in Electron. *Fix:* surface failures via `setLoadError`; disable or annotate controls when the bridge is unavailable.

**P1-12 — Warroom "Diplomacy" telephone may route to the wrong surface. [source][verify]**
`WarroomShellLayer.tsx:99-101` maps `diplomatic_telephone` to `{kind:'army-hq', tab:'summary'}` despite the hotspot being labeled "Diplomacy" (confirmed labeled live as `ref` "Diplomacy"). If routing still points at the military summary, the telephone opens content with no diplomacy and no "pending" affordance. *Fix:* route to an actual diplomacy view or disable with a "diplomacy pending" state. *Verify live in Electron.*

### P2 — Polish / clarity

**P2-1 — Map-mode count drifted to 9; docs and keyboard shortcuts are stale. [live]**
Live `+MORE` reveals **9** modes (Political, Ethnic, Supply, Operations, Casualties, Morale, Defense, Authority, Legitimacy). `MAP_UI_MASTER` lists 5 (§4.4/§8) or 7 (§3.3), and keyboard `1-5` only covers the first five. *Fix:* update docs; extend/retire number-key bindings; consider grouping 9 modes (primary row + overflow already exists, keep). `src/ui/map/components/MapModeToolbar.tsx` / `utils/mapModes.ts`.

**P2-2 — Tactical chrome bleeds into the Warroom shell. [live]**
On `?view=warroom`, the tactical map is mounted underneath and its chrome shows at the screen edges: the bottom **map-mode bar (Political/Ethnic/Supply/Operations/+MORE) + Friendly/Hostile %**, plus zoom buttons / LAYERS / Strategic Dashboard. Map-mode buttons on the president's desk are meaningless. *Fix:* hide tactical-only chrome (mode bar, zoom, LAYERS, dashboard, control %) when `appScreen==='warroom'`. `App.tsx` / `MapModeToolbar` / `BottomStatusStrip` mount guards.

**P2-3 — Decision Room command-loop lanes show identical titles. [live]**
3 of the 5 lanes (URGENT, DECISIONS, INSPECT) all read "Dayton negotiation pending" with near-identical sublabels. Reads as monotone/duplicated rather than five distinct lenses. *Fix:* de-duplicate top-card titles across lanes, or show the lane's distinguishing item; `army_hq/PresidentialDecisionRoomPanel.tsx`.

**P2-4 — Army HQ header has duplicate close controls; no Warroom return in browser. [live]**
Header exposes **two** buttons both labeled "Close Army Headquarters" plus "Return to field observation"; the Warroom-return button is conditionally hidden (`shouldShowWarroomReturn`) and absent here. Redundant exits + missing canonical return. *Fix:* one × + one explicit "Field" + always offer "Warroom" when launched from Warroom; `ArmyHQModal.tsx:261-280` and header cluster.

**P2-5 — Command Briefing banner overlaps map counters with low-contrast text. [live]**
The semi-transparent COMMAND BRIEFING banner sits over the top-center map, obscuring counters; its "N critical item(s) require attention" line is barely legible against terrain. *Fix:* give the banner an opaque/blurred backing or move it out of the counter field; raise text contrast. Banner component in `MapContainer`/overlay layer.

**P2-6 — "Phase E Local Support" internal label shown to players. [source]**
`SelectionPanel.tsx:276` and `SituationTab.tsx:302` render the dev phase tag "Phase E" as a heading. *Fix:* rename to "Local Support."

**P2-7 — Decision Room lens filter can get stuck while hidden. [source]**
`PresidentialDecisionRoomPanel.tsx:386 vs :458` — lens buttons render only under `showAdvanced`, but `effectiveLens` still filters `mainCards` (:383). Selecting a lens then hiding Advanced leaves the list filtered with no visible control. *Fix:* reset `activeLens:'all'` when `showAdvanced` is turned off, or keep the lens row visible.

**P2-8 — OpsPlanningModal discards an in-progress plan with no confirm. [source]**
`OpsPlanningModal.tsx:108,417` — Escape and × both call `clearContext()` immediately; the title warns "draft will be lost" but there's no guard, unlike AdvanceTurnModal. *Fix:* confirm discard when objectives/brigades are assigned.

**P2-9 — Wall-calendar date truncated and in a marker font. [live]**
Warroom whiteboard shows "8 Nov …" (truncated, no year) in a casual marker style (matches the documented Comic Sans fallback risk). *Fix:* render full localized date; ensure the intended marker webfont loads with a sober fallback. `warroom/WarroomShellLayer.tsx` calendar overlay.

**P2-10 — CoachmarkLayer carries a dead `target` field; anchors not guaranteed. [source]**
`CoachmarkLayer.tsx:18-42,67-75` — each def has a `target` selector that `resolveCoachmarkTarget` never uses (it only reads `data-coachmark-id` off the hovered element); some anchor ids only exist inside overlays. *Fix:* delete the unused field; add a startup assertion that every coachmark id resolves.

**P2-11 — Inbox badge "return home" leaves overlays open. [source]**
`PresidentialToolbar.tsx:375-386` — clicking the inbox badge clears all 8 selection ids but leaves Army HQ / Codex / Chronicle / Operations overlays open, so the "inbox home" it returns to is obscured. *Fix:* also close those overlays, or document it as selection-only.

**P2-12 — OpportunityLedger exposes a tier sentinel. [source]**
`OpportunityLedgerPanel.tsx:182` renders "T3 Authorized." *Fix:* rename to a player phrase (e.g. "Reserve-Crisis Authorizations").

**P2-13 — SUPPLY STATUS legend overlaps the Alliance Gauge label. [live][verify]**
In Supply mode the left "SUPPLY STATUS" box appears to overlap the "ALLIANCE GAUGE (BOSNIAK-CROAT)" label beneath it. *Fix:* reserve vertical space / make the SITUATION accordion mutually exclusive with the supply legend. `OOBSidebar.tsx`.

### P3 — Optional enhancement

- **P3-1** — Briefing quote number-templating is awkward ("1 engagement this turn. 1 went in our favor… We gained 1 position"); add singular/plural handling. [live] — Army HQ briefing builder.
- **P3-2** — `OrderInterpretationPanel.tsx:71` uses a `//`-style dev separator in a header. [source]
- **P3-3** — `OperationBriefingModal.tsx:69,101` use raw ⚠ emoji instead of styled badges. [source]
- **P3-4** — `FORCE_LAUNCH_COST = 15` duplicated (`OperationBriefingModal.tsx:18-19`, `OperationsSection.tsx:506`); import one shared constant. [source]
- **P3-5** — `OpsMapRenderer.ts:284-306` ships 7 `console.log('[OpsMap]…')` lines; gate behind `devMode`. [source]
- **P3-6** — Dead/retired code on disk: `_retired_chrome/MapModeToolbar.tsx`, legacy `TopToolbar.tsx`; delete to avoid confusing future audits. [source]
- **P3-7** — Warroom `desk_map` projection is small/faint on a large empty corkboard; scale it up or frame it. [live]
- **P3-8** — Army HQ BRIEFING "COMMANDER: No commander data available" empty state at turn 188; confirm a commander should be present and either populate or hide the card. [live][verify]
- **P3-9** — `OpsPlanningModal.tsx:15` module-global `nextAxisCounter` climbs across opens; derive axis ids from plan state. [source]
- **P3-10** — `PresidentialToolbar` handler props are optional with no disabled-on-missing guard; latent dead buttons if a caller omits one. [source]

---

## 5. Screenshots

Screenshot-to-disk is **not supported in this session** (the browser tool returned "screenshots are not persisted to disk"), so file paths cannot be provided. Each visual finding above is described precisely (surface, location, exact on-screen text) so it can be reproduced. To regenerate images for the tracker, load `http://localhost:3002/?live=1`, dismiss/observe the peace modal, and capture: (a) Vance-Owen modal 0% meters, (b) left SITREP "Priority fronts" raw slugs, (c) Supply mode missing reach outlines, (d) Army HQ BRIEFING + Decision Room lanes, (e) Warroom with bottom map-mode bar visible, (f) DevTools console showing the two `line-dasharray` errors.

---

## 6 & 7. Responsible component + suggested fix

Provided inline with every finding in §4 (file/line where known, plus a concrete fix). No component is referenced without a fix.

---

## 8. Recommended implementation batches

**Batch A — Map render correctness (P1-2).** Replace data-driven `line-dasharray` on `front-line-stripe` and `supply-reach-outline`; restore Supply-mode reach visualization; add a CI guard that any MapLibre `map error` fails the build.

**Batch B — Player-truth & label discipline (P1-3, P2-6, P2-12).** Route SITREP priority-front tokens through `getOsidDisplayName`; rename "Phase E"/"T3" leaks. Add a lint/test forbidding `_`-slug and `T\d`/`op:` patterns in player-facing strings.

**Batch C — Peace/event modal hygiene (P1-1, P1-4, P1-5, P1-8).** One peace surface at a time; clear superseded proposals; bind Vance-Owen meters to real shares; migrate peace + event modals to shared `Modal` (Escape/backdrop/focus-trap).

**Batch D — Palette unification (P1-6, P1-7).** Re-skin OperationBriefing + CommanderSelection modals to panel tokens; (folds into the documented P0-3 palette-consistency item).

**Batch E — Stale-state resets (P1-9, P1-10, P2-7, P2-11).** Reset per-selection messages, `armyHQTab`, stuck lens filter, and inbox-home overlay state.

**Batch F — Shell ownership & chrome scoping (P2-2, P2-4, P2-3).** Hide tactical chrome on the Warroom screen; de-duplicate Army HQ exits + always offer Warroom return; de-duplicate Decision Room lane titles.

**Batch G — Dead/no-op controls (P0-1, P0-2, P1-11).** Onboarding spotlight; OVERRIDE action; bridge-unavailable feedback. (P0-2 needs a product call — §10.)

**Batch H — Polish/cleanup (P2-1, P2-5, P2-8, P2-9, P2-10, P2-13, P3-*).** Docs/keyboard for 9 modes; banner contrast; ops-draft confirm; calendar font/format; coachmark dead field; supply legend overlap; emoji/console/dead-code/constants.

---

## 9. Tests / visual checks per batch

- **A:** unit test that `front-line-stripe`/`supply-reach-outline` add without throwing; a `map error` listener assertion; visual check Supply mode shows reach outlines.
- **B:** test that SITREP & panel strings match no `/_\w|\bT\d|op:/` slug/sentinel pattern; snapshot of SITREP "Priority fronts" with display names.
- **C:** test that at most one peace modal mounts; Vance-Owen shares >0 and sum ≈100; Escape closes peace + event modals; superseded-proposal cleared.
- **D:** visual/snapshot diff of the two modals against panel tokens; no `bg-white|neutral-50` in those files.
- **E:** tests that closing Army HQ resets `armyHQTab`; selection change clears `sectorActionMessage`/`supportMessage`; toggling Advanced off resets lens.
- **F:** test that map-mode/zoom/LAYERS components do not mount under `appScreen==='warroom'`; Army HQ header exposes exactly one × and a Warroom return when launched from Warroom.
- **G:** onboarding step targets all resolve to a visible rect; OVERRIDE dispatches a distinct action; bridge-unavailable shows feedback.
- **All:** `npm run typecheck`, `npm run test:vitest`, `npm run desktop:map:build`; `git diff --check`; re-run the live click-through on the fixed surfaces.

> Validation note: this audit changed no code, so typecheck/build/tests were not re-run for it; they are mandatory gates for the fix batches above. (The bash sandbox was intermittently unavailable at write time; no repo files were edited regardless.)

---

## 10. Items requiring user / product decision

1. **OVERRIDE semantics (P0-2):** wiring OVERRIDE changes player command authority (relieve/force an officer's order). Confirm the intended mechanic and morale cost before implementing, or hide the button until the backend lands. *(STOP-AND-ASK trigger: command-authority change.)*
2. **AAR enemy detail (verify):** Army HQ RECORDS names exact enemy VRS formations and their arc transitions (bloodied→shattered→destroyed), captioned "Stale intel (low confidence)." Confirm this is the intended player-truth model vs. a leak of enemy internals.
3. **Map enemy-counter density (verify):** at turn 188 a very large number of enemy (red/blue) counters render at once for a fogged player faction. Confirm this is correctly gated by `fogOfWar.visibleEnemyOsids` and not full-OOB leakage; also a readability concern (counter clutter).
4. **Peace-modal faction tags:** Dayton territorial packages use raw codes (`RS`, `RBIH`, `HRHB`). Decide whether codes are acceptable here or should use player-safe names.
5. **Save-data vs UI bug for P1-4:** the stale week-40 Vance-Owen modal at turn 188 may be debug-save debt rather than a pure UI defect; decide whether to fix in UI gating, in save hygiene, or both. (No mid-war save exists on disk, which also limited live coverage of active-operation surfaces — a fresh mid-war fixture would improve future audits.)
6. **Responsive scope:** the dev viewport is fixed and didn't reflow; the docs mark the full 1080p/1440p/4K matrix out of scope. Confirm whether a narrow/Electron-window responsive pass is wanted as a follow-up.

---

*Prepared as an audit-only first pass (no code/sim changes). Implementation of the batches above should update `docs/PROJECT_LEDGER.md` (behavioral/output changes) and `docs/PROJECT_LEDGER_KNOWLEDGE.md` (reusable UI rules) per the ledger protocol.*
