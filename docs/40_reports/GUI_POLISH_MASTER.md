# AWWV GUI Polish Master — Observations & AAA-Targeted Suggestions

**Purpose:** Living catalogue of UI/UX bugs, polish gaps, blank-space waste, balance issues, and AAA-grade refinements observed in the **tactical map** and **warroom** surfaces. Pure observation pass — **no code changes proposed for this pass**, recommendations only.

**Audience:** UI/UX, frontend, product, and design owners (Pyrrhic Games team). Use as a punch-list when prioritizing polish-phase work between v0.9.x and v1.0.

**Updated:** 2026-05-16

**Ownership:** This file is a **one-shot observation/punch-list**, not a competing canonical owner of GUI status. [GUI_MASTER.md](GUI_MASTER.md) remains the single living reference for GUI status, gates, and recent changes. Findings here should be closed out one at a time and the resolution logged in `GUI_MASTER.md` under "Recent GUI changes" with a link to the implementation report; once a finding is closed, mark it `RESOLVED — see [report link]` in this file (do not delete — keeps the historical audit traceable). Once the punch-list is fully drained, archive this file to `docs/40_reports/archive/`.

**Method:** Initial pass was a source audit of `src/ui/map/`, `src/ui/map/components/warroom/`, `src/ui/warroom/`, and the existing master refs ([GUI_MASTER.md](GUI_MASTER.md), [WARROOM_MASTER.md](WARROOM_MASTER.md), `HOI_VISUAL_GUI_OVERHAUL_SPEC.md`). Follow-up live pass on 2026-05-16 used `npm run dev:map` at `http://127.0.0.1:3002/tactical_map.html`, Chrome/Puppeteer screenshots, direct browser interaction, and the desktop simulation API in `dist/desktop/desktop_sim.cjs` to start an RS campaign and advance through turn 16. Saved RS turn snapshots were loaded back into the tactical map and warroom for direct UI observation. Evidence screenshots were written under `tmp_gui_observation/`.

**Severity legend:**
- **P0 — Aesthetic-break / blocker:** breaks the AAA illusion immediately on first contact (mixed palettes, emoji-in-wargame, dead chrome).
- **P1 — Polish gap:** notable but survivable; AAA competitors do it better.
- **P2 — Refinement:** small win; lifts the floor.

---

## Live observation addendum (2026-05-16)

**Action plan:** See [`docs/plans/2026-05-16-gui-polish-action-plan.md`](../plans/2026-05-16-gui-polish-action-plan.md) for the executable task breakdown, target files, tests, acceptance criteria, and recommended commit sequence.

**Implementation status 2026-05-17:** Phase 0 engineering closure is recorded in [`implemented/20260516_GUI_PHASE0_DECISION_SURFACE_AND_POLISH.md`](implemented/20260516_GUI_PHASE0_DECISION_SURFACE_AND_POLISH.md). The decision-surface audit is recorded in [`audits/20260516_PRESIDENTIAL_INBOX_DECISION_SURFACE_AUDIT.md`](audits/20260516_PRESIDENTIAL_INBOX_DECISION_SURFACE_AUDIT.md). LIV-P0-1, LIV-P1-2, LIV-P1-3, LIV-P1-4, LIV-P1-5, the high-confidence playtest D1-D7 defects, full onboarding consolidation, Track C browser validation, and the CRT command-surface overlay are closed for engineering scope. Remaining active work is later shipping-phase work: audio/localization/marketing/telemetry plus data-dependent playtest validation.

### Phase 0 closeout matrix (2026-05-16)

| Status | Scope | Closure note |
|---|---|---|
| RESOLVED | LIV-P0-1 paramilitary Inbox gap | `pending_paramilitary_requests` now reaches Presidential Inbox as a blocking `paramilitary_request` card with war-crimes/civilian-risk warning copy and routes to `ParamilitaryReviewModal` through the canonical resolver. |
| RESOLVED | Decision-surface audit | Inbox coverage was audited beyond paramilitary; Dayton negotiation and convoy decisions were added, and no other player-facing engine decision family was found without an Inbox consumer. |
| RESOLVED | LIV-P1-2 officer/personnel leak | Pending officer/personnel events are filtered to the current player faction before the Inbox renders them. |
| RESOLVED | LIV-P1-3 browser-dev QA split | The report and implementation closeout document the browser visual QA vs. Electron/desktop turn-loop split; blocked advance actions now provide clear Decision Room review routing. |
| RESOLVED | LIV-P1-4 Warroom no-state/hotspot affordances | Warroom no-state has a side-picker CTA, hotspot labels are visible on hover/focus, and blocked ADVANCE routes to the same Decision Room review path. |
| RESOLVED | LIV-P1-5 AdvanceTurnModal palette | Previously resolved in `20260516_TACTICAL_SHELL_FRAME_COHESION.md`; Phase 0 regression kept the dark-shell contract covered. |
| RESOLVED | Playtest D1/D2/D3/D4/D5/D6/D7 engineering lanes | Blocked advance feedback, deck.gl coordinate guards, peace-plan modal polish, War Summary empty states/count labels, tutorial persistence, Inbox dedupe/RECORDS clarity, typography/quiet Inbox/retired chrome/error boundary/pause regressions all have focused tests. |
| DEFERRED | Full onboarding consolidation | Persistence and sequencing regressions are fixed; replacing the multi-overlay start with a coachmark system remains Phase 1 Track D. |
| RESOLVED | CRT overlay / deeper art direction | Live command surfaces no longer use the CRT scanline overlay; see `implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md`. |
| DEFERRED | Full map information design | Contested bands, front stability, supply reach, and authority/legitimacy/control layering remain AAA+++ Phase 1 Track C. |

### LIV-P0-1 - RS paramilitary player requests are generated but invisible in Presidential Inbox
- **Observed path:** `desktop_sim.startNewCampaign(baseDir, 'RS', 'apr_1992')`, then `advanceTurn()` through turn 16. The turn report produced `paramilitary_sweep.pending_player_requests` for the RS player: turn 1 = 86, turn 2 = 29, turn 3 = 7, turn 4 = 6, turn 5 = 3, turn 6 = 1, turn 7 = 1, turn 8 = 2, turn 10 = 3.
- **Raw state evidence:** Saved turn states contain root-level `pending_paramilitary_requests` entries, e.g. `{ "faction": "RS", "strength": 150, "target_osid": "..." }`.
- **UI evidence:** Loading `tmp_gui_observation/desktop_rs_turn_1.json` and `tmp_gui_observation/desktop_rs_turn_8.json` into the tactical map showed the Presidential Inbox with reserve requests, personnel matters, and situation/date cards. It did **not** surface any paramilitary card and did not display "paramilitary", "war crimes", or "ethnic cleansing" warning copy.
- **Likely static cause:** `src/ui/map/data/inboxItems.ts` derives event decisions, peace plans, proposal reviews, reserve requests, officer events, and situation cards only. `InboxItemType` has no paramilitary decision type, and `GameStateAdapter.ts` does not expose root `state.pending_paramilitary_requests` into `LoadedGameState`.
- **Why it matters:** This is a sensitive-history blocker, not just polish. The simulation is asking the RS player about paramilitary deployments, but the UI appears to hide the decision and its war-crimes implications.
- **Suggested direction:** Add a dedicated Presidential Inbox decision type for `pending_paramilitary_requests`, with explicit warning language and approve/deny routing to the existing paramilitary decision resolver. This should be tested with RS turn 1 and turn 8 saved states.

### LIV-P1-2 - RS Inbox shows ARBiH personnel matters, apparently without player-faction filtering
- **Observed:** RS player turn 1 and turn 8 inboxes showed "Personnel Matter Regarding Sefer Halilovic." Turn 8 showed multiple duplicated personnel cards for the same ARBiH figure.
- **Likely static cause:** `derivePendingOfficerEvents()` in `src/ui/map/data/GameStateAdapter.ts` maps all unacknowledged `state.military.pending_officer_events` and does not filter by `state.meta.player_faction` / loaded `player_faction` before `deriveInboxItems()` renders them.
- **Why it matters:** The Presidential Inbox should be the player's executive desk. Enemy-faction personnel matters leaking into RS breaks player role, creates noise, and risks revealing information the player should not receive.
- **Suggested direction:** Filter pending officer events to the player faction at adapter time, or make a deliberate "foreign intelligence" lane with different copy and routing. Add an RS fixture that contains ARBiH officer events to prevent recurrence.

### LIV-P1-3 - Browser dev map cannot advance real turns; desktop/Electron path is required for turn-loop QA
- **Observed:** In `tactical_map.html` without Electron IPC, the top toolbar `ADVANCE TURN ->` remains disabled because `PresidentialToolbar.tsx` gates it on `ipc.isAvailable`. Side selection loads a baked startup snapshot fallback; it does not exercise the desktop advance-turn pipeline.
- **QA impact:** Live browser play is good for visual inspection, but not for end-to-end turn advancement. For this pass, actual turn advancement was observed through `dist/desktop/desktop_sim.cjs`, then the resulting turn saves were loaded into the browser UI.
- **Suggested direction:** Either document this as the required QA split, or add a clearly labelled browser-dev advance harness that calls the same local simulation API for non-Electron visual testing.

### LIV-P1-4 - Warroom no-state and hotspot findings were partially confirmed, with nuance
- **No-state warroom:** `?view=warroom` with no loaded campaign still renders "Warroom unavailable until a campaign side is selected." The placeholder itself has no CTA. In the full tactical shell, the SidePickerOverlay can also be visible, but the warroom fallback remains a dead-end if the picker is closed or absent.
- **Hotspots:** Source now sets `cursor: 'pointer'` and `aria-label` on hotspot buttons, so the old "no cursor change" part of P1-15 is stale. Live DOM inspection still shows empty-text hotspot buttons and no immediate visible label ribbon; discovery still depends on hover outline plus browser `title`.

### LIV-P1-5 - AdvanceTurnModal light-theme claim is live-confirmed
- **Observed:** Opening the advance-turn modal in the warroom/browser shell produced a white/neutral panel inside the dark campaign shell: `bg-neutral-50`, `bg-neutral-100`, `bg-white`, and `border-neutral-400` surfaces. This confirms P0-1 visually, not only by source inspection.
- **Subsequent status:** Current source and `docs/PROJECT_LEDGER.md` now indicate this has been fixed in `20260516_TACTICAL_SHELL_FRAME_COHESION.md`; keep the plan's verification task so Electron/browser smoke closes the loop before archiving the finding.

### LIV-P2-6 - First-run overlay stack has improved since the original report, but still needs sequence judgment
- **Observed:** Current source and live inspection show the recent fix is present: the SidePicker load/continue emoji glyphs are gone in `SidePickerOverlay.tsx`, and first-run surfaces no longer visibly stack over both rails in the same broken way noted by earlier audits.
- **Remaining UX issue:** A new game can still require several sequential acknowledgements: side picker -> War Begins -> Presidential Brief / Inbox -> tutorial. The problem is now pacing and ceremony, not raw z-index stacking.

---

## 0. Cross-cutting / palette discipline

### P0-1 — AdvanceTurnModal uses a LIGHT theme inside an entirely DARK shell
- **File:** `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- **What:** Backdrop `bg-black/65`, panel `bg-neutral-50`, header `bg-neutral-100`, cells `bg-white`, action row `bg-neutral-100`, buttons `bg-amber-100`/`bg-green-600`/`bg-neutral-200`. Text colors all `neutral-900` / `neutral-600` on near-white surfaces.
- **Why it stings:** Every other modal in the shell (TurnAftermath, AttackConfirmation, SidePicker, ArmyHQ, EventModal, PeacePlan, Dayton, EnclaveDashboard, OpsPlanningModal) is dark/parchment over panel-bg. AdvanceTurn is the **single most-used modal in the entire product** (fires every turn). The light-on-dark flash is the AAA illusion-break the player gets the most often.
- **AAA reference:** HOI4, EU4, AGEOD — confirmation/turn-advance dialogs always inherit the campaign chrome palette.
- **Suggested direction:** Migrate to `bg-panel-bg` / `bg-panel-card` / amber-on-near-black like TurnAftermathModal. Keep status pip colors (red/amber/emerald) for severity, but switch surface tokens.
- **Live check 2026-05-16:** Confirmed in browser/warroom screenshot (`tmp_gui_observation/advance-modal-warroom.png`): the modal is still a light neutral panel against the dark shell.
- **Status 2026-05-16:** RESOLVED in current source after the live observation; see `docs/40_reports/implemented/20260516_TACTICAL_SHELL_FRAME_COHESION.md`. Retain one Electron/browser smoke check before removing this from the active polish backlog.

### P0-2 — Emojis in SidePickerOverlay break the wargame register
- **File:** `src/ui/map/components/SidePickerOverlay.tsx:94, 102`
- **What:** "📂 Load Save from Disk" and "🔄 Continue (Last Run)".
- **Why it stings:** Faction picker is the first surface the player sees. AAA grand-strategy and operational wargames do not ship emoji — they use a glyph set, an SVG icon family, or just typography. This breaks tone in the first 5 seconds.
- **Suggested direction:** Replace with the existing `Icon` component family used by `BottomStatusStrip` (`Icon name="balanced"`, etc.), or a small SVG set; keep the uppercase tracking discipline.
- **Status 2026-05-16:** RESOLVED in current source and live re-check. `SidePickerOverlay.tsx` now uses `<Icon name="locked">` and `<Icon name="transit">`; the rendered buttons read "Load Save from Disk" and "Continue (Last Run)" without emoji. See `docs/40_reports/implemented/20260516_TACTICAL_SHELL_FRAME_COHESION.md`.

### P0-3 — Mixed severity palettes across components
- **What:** Severity colors do not align across surfaces:
  - `AdvanceTurnModal` uses `amber-100/700`, `red-50/500/700`, `emerald-50/500/700` (light-mode scale).
  - `PresidentialDecisionRoomPanel` uses `amber-300/400`, `red-300/400/500`, `emerald-300/400`.
  - `WarroomStatusBar PriorityDocketPanel` uses `amber-300/500/700/900/950`, `red-300/700/900/950`, `emerald-300/600/700/950`.
  - `ExhaustionClock` uses an entirely bespoke `amber-200/300/400/500`, `orange-400/500`, `red-400/500/900` state ladder.
  - `BottomStatusStrip` hardcodes hex (`#e05050`, `#d4a055`, `#d4d455`, `#50b850`).
- **Why it stings:** The player learns a severity language with one component and has to re-learn it for the next. "Critical" should look identical wherever it appears.
- **Suggested direction:** Lock 4 severity tokens (`severity-blocking|critical|warning|clear`) in Tailwind theme + the same hex pair (border/fill) everywhere. Audit can be a single sweep.

### P1-4 — Modal wrapper exists, but each migrated modal styles its own panel
- **File:** `src/ui/shared/Modal.tsx` (canonical) vs `AdvanceTurnModal`, `TurnAftermathModal`, `AttackConfirmation`, `SidePickerOverlay`, `EnclaveDashboard`, etc.
- **What:** `<Modal>` wrapper centralizes z-index, ESC, focus, aria — but `panelClassName` is set per-modal, so the **visual** language drifts (light vs dark, max-w-md vs max-w-4xl, `border-2 border-neutral-400` vs `border border-white/15`, `border-panel-border` vs none).
- **Suggested direction:** Add 3 canonical panel preset classes — `modal-panel-confirm`, `modal-panel-dossier`, `modal-panel-fullbleed` — and have each modal pick one instead of inventing.

---

## 1. Tactical map shell

### P0-5 — Two map-mode toolbars in the codebase; one is dead chrome
- **Files:** `MapModeToolbar.tsx` (97 LOC, **mounted nowhere** outside its own grep) vs `BottomStatusStrip.tsx` (the live owner).
- **Also:** `TopToolbar.tsx` (427 LOC) still on disk; GUI_MASTER explicitly marks it "legacy/non-authoritative."
- **Suggested direction:** Delete or move to `_archive/` so newcomers (and Codex agents) don't waste a session "improving" the wrong file.

### P1-6 — Dev tools strip stacks under the toolbar in dev mode but the spacing token doesn't widen
- **File:** `PresidentialToolbar.tsx:443–456`
- **What:** When `devMode === true`, a second strip mounts at `top-12` adding ~1rem, and `--awwv-toolbar-clearance` jumps from `5.5rem` to `6.5rem`. But the dev strip itself is ~1.5rem tall, so the clearance under-counts by ~0.5rem and the OOBSidebar can graze the dev strip's bottom border.
- **Suggested direction:** Verify with Playwright in dev mode; bump clearance to `7rem` if confirmed.

### P1-7 — "Inbox" + "INBOX 0" badge feels duplicative on the right side
- **File:** `PresidentialToolbar.tsx:347-360` + `InboxBadge`
- **What:** The right-hand toolbar group reads `EVENTS · CODEX · INBOX · [REVIEWS pill?] · [RESERVE pill?] · [TENSIONS RISING?] · [AUTH gauge] · [ADVANCE TURN →]`. Up to 8 surfaces. Even with all alerts off it's `EVENTS · CODEX · INBOX · AUTH · ADVANCE`.
- **Suggested direction:** Collapse `EVENTS / CODEX / CHRONICLE` into an explicit "Reference" cluster with a single divider; or move `CHRONICLE` / `CODEX` to a left-rail bookmark menu (they are reference, not command).

### P1-8 — `text-[7px]` and `text-[8px]` are pervasive and probably too small
- **Examples:**
  - `WarroomStatusBar PriorityDocketPanel`: `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]` all in the same card.
  - `PresidentialToolbar`: floating crest label is `text-[7px]`.
  - `PresidentialDecisionRoomPanel MetricCell`: labels are `text-[8px]`.
- **Why it stings:** Sub-9px breaks WCAG comfort and burns eyes at 1080p; AAA wargame UIs (HOI4, Eu4, Stellaris) settle into 11–13px floor for labels and reserve 8–9px for column headers only.
- **Suggested direction:** Establish a typography scale — `xs=10`, `sm=11`, `base=12`, `md=14` — and refuse sub-10 outside true micro-labels (legend stops, gauge ticks).

### P1-9 — CRT overlay in the OOBSidebar feels dated

**Status 2026-05-17:** RESOLVED for live command surfaces. `OOBSidebar.tsx` and `OperationsPanel.tsx` no longer render `crt-overlay`; `tests/ui/no_crt_command_surfaces.test.ts` guards against reintroduction. See [`implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md`](implemented/20260517_CRT_COMMAND_SURFACE_ART_DIRECTION.md).
- **File:** `OOBSidebar.tsx:240-243` — `<div className="absolute ... crt-overlay pointer-events-none z-50 opacity-40">`
- **What:** Full-height scanline/curvature overlay across the entire sidebar.
- **Why it stings:** AAA serious-history wargames moved past CRT skeuomorphism years ago. The Game Bible's tone (archival, sober, "no victory") wants an institutional / archival look (paper, blueprint, ribbon), not a 1980s greenscreen.
- **Suggested direction:** Either remove, or scope it to one narrow tactical use (e.g., the radio/intel ticker only). Replace with subtle parchment grain at `opacity-0.05–0.08`.

### P1-10 — OOBSidebar sits below a deep empty band on the left
- **Already in GUI_MASTER:** `[20260327_COMMAND_SIDEBAR_LAYOUT_KNOWLEDGE.md]`. Confirmed: toolbar is `h-12` (48px) but `--awwv-toolbar-clearance` is `5.5rem` (88px) to clear the floating crest. Left rail thus starts ~2.5rem below the toolbar with nothing in that band.
- **Suggested direction (AAA polish):** Mount a short situational ribbon in the empty band — date in large type, alliance / patron status, current-turn objective headline — so the eye lands somewhere meaningful instead of empty pixels.

### P2-11 — Three "exit" buttons clustered in ArmyHQ header
- **File:** `ArmyHQModal.tsx:216-249, 297-303`
- **What:** `← BACK / ← FIELD` button, then `WARROOM` button (if return is showable), then `×` close button. All three close-ish actions sit within ~10rem of each other.
- **Suggested direction:** Keep `×` as the only chrome-level dismiss; promote `WARROOM` into a left-rail breadcrumb (`Warroom › Army HQ › <Corps>`), demote `BACK` into the same breadcrumb.

### P1-12 — `Emergency Posture` native `<select>` bulk-applies to all corps with no confirmation
- **File:** `ArmyHQModal.tsx:271-288`
- **What:** Selecting `ALL OFFENSIVE` immediately fires a stance order for every corps in a loop. Native `<select>` styling also doesn't match the rest of the amber-on-dark chrome.
- **Why it stings:** Wargame players overwrite per-corps stance carefully; one accidental hover-click on this dropdown can flatten that work for the rest of the campaign.
- **Suggested direction:** Replace with a styled button row that opens a confirm-modal: "Apply OFFENSIVE to all 3 corps? This will overwrite per-corps stance for Bos. 1st, Tuzla 2nd, Krajiški 5th."

### P1-13 — Bottom-right pile-up risk: minimap + bottom strip + warroom status bar
- **Files:** `Minimap.tsx` (right:1rem; bottom:76px; 250×180), `BottomStatusStrip.tsx` (`absolute bottom-0`), `WarroomStatusBar.tsx` (`fixed bottom-4 right-4`).
- **Risk:** Warroom status bar lives only in `appScreen === 'warroom'`, so no live collision on the tactical map. But the **minimap (256×180) right-edge** and **BottomStatusStrip's `LAYERS` dropdown** (anchored to the bottom-right of the strip) both want the bottom-right corner. The `LAYERS` dropdown opens `bottom-full right-0` — it ends up roughly behind the minimap's lower edge.
- **Suggested direction:** Either move minimap to bottom-left (mirrors HOI4 / Eu4) or pull the layers dropdown leftward to avoid the minimap rectangle. Run a Playwright pass to confirm.

### P2-14 — MapModeLegend (`bottom-24 left-4`) has no faction-aware political-mode legend
- **File:** `MapModeLegend.tsx:62` — explicit `null` for political mode.
- **What:** Player loads in political mode (default) and sees no legend — has to switch to ethnic/supply/morale before any visual aid appears.
- **Suggested direction:** Political mode legend should show the 3 faction swatches with current territory percentages — same data the BottomStatusStrip stacks but anchored to the map mode the player is in.

---

## 2. Warroom (React shell)

### P1-15 — Hotspot hover affordance is a thin outline only; no visible label
- **File:** `WarroomShellLayer.tsx:411-454`
- **What:** Hovering a region shows a `2px rgba(255,220,100,0.7)` outline + `rgba(255,220,100,0.08)` fill. Source now sets `cursor: 'pointer'` and `aria-label`, so the old cursor/accessibility part is resolved. There is still no visible tooltip/ribbon rendered in the scene. The `title` attribute remains the only visible label path, and browsers render that with a delay.
- **Why it stings:** AAA point-and-click war-room scenes (Wargame: Red Dragon, X-COM 2 Avenger) reveal a labelled tag the moment the hotspot is hovered. Title attribute is fine for accessibility, not for discoverability.
- **Suggested direction:** Render `getWarroomRegionLabel(region)` as a small ribbon attached to the outline rectangle, with the same amber-on-dark language as the rest of the shell.

### P1-16 — Wall-calendar date is in a cursive font with Comic Sans as the fallback
- **File:** `WarroomShellLayer.tsx:393` — `fontFamily: '"Segoe Print", "Bradley Hand ITC", "Comic Sans MS", cursive'`
- **What:** The blue marker date inscription falls back to **Comic Sans MS** on systems missing the first two fonts. Linux distros without those fonts will render Comic Sans on a serious wargame's wall calendar.
- **Suggested direction:** Bundle one handwriting webfont (e.g. Caveat, Kalam, Architects Daughter — all open source) and drop the Comic Sans fallback entirely.

### P1-17 — Paper map sits at `rotate(-0.6deg)` permanently
- **File:** `WarroomShellLayer.tsx:335`
- **What:** Authentic detail; combined with the cursive date this enters "twee" territory. Plenty of AAA games (Civilization VI, Crusader Kings 3) use rotated paper, but always paired with detailed map artwork. AWWV's projected map is a flat cream rectangle with stripes — the rotation amplifies the impression of a thin overlay rather than a baked piece of art.
- **Suggested direction:** Either commit to physicality (subtle drop shadow, pinned corners, dog-eared edge, weathered grain) or drop the rotation to keep the projection clean.

### P1-18 — Warroom `Map updating` placeholder is bland for a hero surface
- **File:** `WarroomShellLayer.tsx:354-368`
- **What:** When `model` hasn't resolved, the paper map shows `Map updating` in 9px cream uppercase — looks like a dev placeholder.
- **Suggested direction:** Either show the static authored map plate as the initial state (instant), or replace the placeholder with a faction-coloured stamp ("AWAITING REPORTS · WEEK 14"). It's a hero surface; treat it like one.

### P1-19 — Warroom advance-turn affordance vs tactical advance-turn affordance have different visual weight
- **Warroom (`WarroomStatusBar.tsx:235-242`):** `ml-1 px-2 py-0.5 text-[9px] amber outline + dashed`
- **Tactical (`PresidentialToolbar.tsx:406-413`):** `px-5 py-1.5 text-[11px] amber border solid + active:scale-95`
- **Why it stings:** The most important action in the game (commit the turn) reads as a footnote inside the warroom and as a hero CTA on the tactical map. Should be visually identical or at least visually equivalent in weight.

### P0-20 — Warroom unavailable placeholder dead-ends the user
- **File:** `WarroomShellLayer.tsx:566-595`
- **What:** When no faction is selected, the warroom renders only `"Warroom unavailable until a campaign side is selected."` — no CTA, no button, no path forward. The user has to know to navigate to `?view=game` or close the window.
- **Suggested direction:** Render an `[Open Side Picker]` button right beneath the message, calling the same SidePickerOverlay flow as the main app.

### P2-21 — PriorityDocketPanel stacks 5+ severity signals per card
- **File:** `WarroomStatusBar.tsx:80-110`
- **What:** Each docket row shows: `category` chip (Decision/Opportunity/etc.) + `severity` chip + `title` + `sourceOwner` + `actionLabel` chip. Five tokens per row in a 26rem panel. Combined with the panel's own `tone`, `status` badge, summary line, and "Source Handoffs" / "Open Decision Room" footer — the eye has nowhere to land.
- **Suggested direction:** Pick one of `category` or `severity` to chip, encode the other via the row's left border color. Keep the row to: `[severity-color rail] Title · "via Source"  →`.

---

## 3. Army HQ / Decision Room

### P1-22 — Decision Room surfaces 30+ interactive elements on first paint
- **File:** `PresidentialDecisionRoomPanel.tsx:395-501`
- **What:** Visible at once on the BRIEFING tab below the Chief-of-Staff strip: 5 MetricCells + 8 Product Loop steps + 5 Command Loop lanes + N lens chips + 7 PriorityCards + 1 active Dossier panel (multi-card) + up to 5 Inspect Next + N Source Handoffs.
- **Why it stings:** AAA strategic-management games (HOI4 focus tree, Eu4 missions) reveal hierarchy via progressive disclosure: 3–5 "next moves" at the top, drill-down on click. AWWV currently dumps the whole loop view on first render.
- **Suggested direction:** Default to **Command Loop only** (5 lanes) as the primary surface; collapse the Product Loop, Lenses, and Inspect-Next behind a `View advanced` toggle. Active Dossier becomes a side sheet that animates in on card click rather than a permanent column.

### P1-23 — Chief-of-Staff briefing + Decision Room overlap in purpose
- **Files:** `ChiefOfStaffBriefing.tsx` + `PresidentialDecisionRoomPanel.tsx`, mounted back-to-back in the BRIEFING tab.
- **What:** CoS briefing was added "to give context before Decision Room synthesis" (per GUI_MASTER 2026-05-16). In source, both surfaces synthesize over `commandBriefing.items` + presidentialReviewQueue. The player sees what looks like the same dataset twice with different framing.
- **Suggested direction:** Either fold CoS briefing into the Decision Room headline strip ("`Chief reports: 3 critical, 6 warnings — Strategic Priorities below`") or differentiate strongly: CoS = narrative paragraph, Decision Room = list of actionable cards.

### P2-24 — ExhaustionClock has no scale labels and no "what's bad" cue
- **File:** `ExhaustionClock.tsx`
- **What:** Vertical candle, 5 state names (strong/steady/waning/critical/spent), numeric value at bottom. No max scale, no "you collapse at X" warning, no historical anchor ("Yugoslav republics collapsed at ~600").
- **Suggested direction:** Add a hairline at the 50% mark and a small caption ("Past ~600: faction-wide collapse risk") when in `waning`/`critical`.

### P2-25 — Inbox InboxCard severity badge + type label is two pieces of the same flag
- **File:** `PresidentialInbox.tsx:51-81`
- **What:** When severity has a label (`BLOCKING`/`URGENT`), the type label (`DECISION`/`PEACE PLAN`) sits beside it. When severity has no label (`normal`/`info`), the type label *replaces* it inside the colored chip. The shape changes per severity — confusing.
- **Suggested direction:** Always show `[severity chip] [type chip]`; drop the conditional collapse.

### P2-26 — OpeningBrief mixes em-dash style: `—` (—) and "—" — confirm a single source
- **File:** `PresidentialInbox.tsx:22-31`
- **Note:** Cosmetic; cross-check all opening briefs use the same dash convention.

---

## 4. Information density / blank space

### P1-27 — `OOBSidebar` shows only one accordion expanded by default (`army: true`); others stay collapsed
- **File:** `OOBSidebar.tsx:78-84`
- **What:** Situation, Mobilization, Operations, Sectors all start collapsed. No badge / dot on a collapsed accordion to indicate "new content here."
- **Suggested direction:** Render a colored dot beside the count when a collapsed accordion has changed since last view (`new operations`, `sector at risk`, etc.). Easy way to surface signal without forcing expansion.

### P1-28 — Empty band on the right when nothing is selected and Inbox is empty
- **File:** `App.tsx:792-822` + `PresidentialInbox.tsx:166-177`
- **What:** When no selection and Inbox has nothing actionable, the right rail is a 22rem column showing only `"No pending decisions / Advance the turn to continue."` — a lot of empty real estate.
- **Suggested direction:** Fill the empty rail with the **active dossier** from the Decision Room (or a war-summary capsule, or the latest Chronicle entry). The home-screen real estate should never be empty.

### P2-29 — `BottomStatusStrip` hides `Friendly XX%` label below `md` breakpoint (`hidden md:flex`)
- **File:** `BottomStatusStrip.tsx:178`
- **Note:** On narrow desktops (1024px / dev split-screen) the stacked territory bar vanishes. Verify minimum supported resolution and either drop the breakpoint or render a compact variant.

### P1-30 — `PresidentialToolbar` right-edge `AUTH gauge` text is `text-[9px]`; legend is buried in title attribute
- **File:** `PresidentialToolbar.tsx:65-80`
- **What:** "AUTH" label and current/max numeric live in 9px text with the meaning only in the `title=` tooltip (`"Command Authority: ... Recovers +2 per turn"`).
- **Suggested direction:** Either lift the gauge into the Decision Room (where the player would use it) or give it a visible hover popover, not a browser tooltip.

---

## 5. Modal & chrome stack

### P1-31 — Three first-run / first-turn overlays in sequence
- **Files:** `OnboardingOverlay`, `FirstTurnOrientationCard`, `PeaceWarTransition`, plus `OpeningBrief` inside the Inbox.
- **What:** A new player can sequentially see: side picker → onboarding 8-step → PeaceWarTransition (if in war) → FirstTurnOrientationCard → OpeningBrief inside the Inbox. Even staged, that's 4–5 dismissals before the game proper.
- **Suggested direction:** Merge `FirstTurnOrientationCard` into the onboarding flow as steps 7–8, and let the OpeningBrief live exclusively inside the Inbox (don't auto-promote to overlay).
- **Status 2026-05-16:** Partially improved by `20260516_FIRST_RUN_INBOX_HQ_FLOW_POLISH.md` and `20260516_TACTICAL_SHELL_FRAME_COHESION.md`: War Begins no longer stacks under side rails, and first-turn orientation is suppressed while War Begins/tutorial are active. The remaining issue is still the number of sequential onboarding/briefing acknowledgements.

### P2-32 — No keyboard pause / no obvious pause menu binding
- **File:** `App.tsx` keyboard handler (`H`, `S`, `E`, `C`, `X`)
- **What:** PauseMenu only renders when `pauseMenuOpen` is true; no ESC-to-pause, no `P` binding visible. ESC currently closes ArmyHQ. AAA games invariably bind ESC or `P` to pause.
- **Suggested direction:** ESC → if any modal open, close it; if no modal, open Pause Menu. Standard pattern.

### P1-33 — Z-index proliferation (existing knowledge, restating)
- **File:** `src/ui/shared/zIndex.ts`
- Tracked already in napkin / Z-tier-expansion lane. Worth reaffirming here because of the polish target: an AAA shell typically uses **6–10 tiers**, AWWV is at **36**. Polish-phase win: collapse to 12.

---

## 6. Tutorial / onboarding text quality

### P2-34 — Opening brief paragraph runs ~5 sentences in one wrapped block
- **File:** `PresidentialInbox.tsx:19-32`
- **What:** Each faction's brief is one ~300-word `<div>` with `whitespace-pre-wrap`. Reads like a long blockquote.
- **Suggested direction:** Break into 3 bullets — `Your nation`, `Your military`, `Your strategy`. Players read bullets; they skim paragraphs.

### P2-35 — `Understood — Begin` is the brief's only CTA
- **What:** No `Skip`, no `Read again later`. Once dismissed, the brief is in `briefDismissed` state and can only be retrieved by restarting localStorage.
- **Suggested direction:** Add a `Read later` link that re-opens via the Codex / Help menu.

---

## 7. Asset / file inventory hygiene

### P2-36 — Dead chrome files inflate the surface area
- `TopToolbar.tsx` — legacy per GUI_MASTER, still present.
- `MapModeToolbar.tsx` — not mounted anywhere outside its own grep.
- Several `_archive`-eligible files in `src/ui/warroom/` (legacy DOM warroom modals: `IvpBreakdownModal.ts`, `CommandBriefingModal.ts`, etc.) coexist with the React shell.
- **Suggested direction:** Single pass to either retire (`_archive/`) or document why kept (`// SUPERSEDED-BY:` header), so future polish work doesn't fork on a dead branch.

---

## 8. Sequenced AAA polish roadmap (suggested ordering)

If polish-phase wants a directly-executable backlog, this ordering minimizes blast radius:

1. **Sensitive inbox blocker** — close LIV-P0-1 before cosmetic polish: surface RS `pending_paramilitary_requests` with explicit war-crimes warning copy and approve/deny routing. Also close LIV-P1-2 by filtering officer events to the player faction. (~1 day)
2. **Palette unification pass** — verify/close P0-1 (AdvanceTurnModal already appears resolved in current source), then close P0-3 (severity tokens) and P1-4 (modal panel presets). P0-2 emoji removal is already resolved in current source. (~1 day)
3. **Right-rail empty-state fill** — close P1-27 / P1-28. Decision Room dossier or Chronicle capsule shows when Inbox is quiet. (~½ day)
4. **Decision Room progressive disclosure** — close P1-22 / P1-23. CoS → command-loop default; everything else under `View advanced`. (~1 day)
5. **Typography floor** — close P1-8 / P1-30. Mass-replace `text-[7px]` / `text-[8px]` outside legends. (~½ day)
6. **Warroom hero polish** — close P1-15 (visible hotspot labels), P1-16 (Comic Sans), P1-19 (advance-turn parity), P0-20 (placeholder CTA), P1-18 (Map updating). (~1 day)
7. **Dead chrome retirement** — close P0-5 / P2-36. Move TopToolbar, MapModeToolbar, dead warroom DOM modals. (~½ day)
8. **Bulk-stance + emergency posture guard** — close P1-12. Confirm modal before bulk actions. (~½ day)
9. **CRT overlay decision** — close P1-9. Either kill or contain. Aesthetic call by design owner. (~½ day)
10. **Onboarding sequence cleanup** — close P1-31 / P2-34 / P2-35. Merge first-run surfaces. (~1 day)
11. **Pause binding + ESC tree** — close P2-32. (~½ day)

Total: ~8 person-days of polish, with the first day spent on the sensitive-history inbox blocker before cosmetic polish.

---

## 9. What this audit did NOT cover

- Full resolution matrix verification at 1080p / 1440p / 4K. This update includes targeted live screenshots and turn-loop observation, but not a full viewport matrix.
- Mobile / narrow viewport — AWWV ships desktop-only; out of scope.
- Color-blind contrast pass — separate WCAG audit recommended (a11y lane already tracks 4 P0 v1.0-ship blockers per napkin).
- Animation quality / micro-interactions beyond basic modal/hotspot behavior.
- Audio chrome — out of scope (no audio system observed in this audit).
- Localization — current strings are mostly English-only.
- Tutorial copy quality — only structural notes; narrative tone needs `narrative-designer` review.
- Actual Electron renderer observation. Browser-dev and desktop-sim paths were used; the Electron IPC UI should still get a final smoke pass before closing turn-advance and inbox findings.

---

## 10. Cross-references

- [GUI_MASTER.md](GUI_MASTER.md) — overall GUI status and recent changes table.
- [WARROOM_MASTER.md](WARROOM_MASTER.md) — warroom scene/asset/modal contracts.
- [`HOI_VISUAL_GUI_OVERHAUL_SPEC.md`](../30_planning/20260221_settlement%20remapping%20and%20GUI%20rework/HOI_VISUAL_GUI_OVERHAUL_SPEC.md) — design authority for look-and-feel.
- [`audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md`](audits/20260505_V094_PHASE_1_2_UI_SHELL_AUDIT.md) — predecessor shell audit.
- [`a11y/`](audits/) — accessibility audit pipeline (4 P0 v1.0 blockers).
- napkin `Current State` — pending polish items mentioned but not yet scoped.

---

**End of observation pass — no code changes made. Next step (suggested):** Fix the RS paramilitary inbox blocker first, then schedule a Playwright/Electron visual-verification pass on the 8 hero screens (warroom plate, side picker, tactical map empty, tactical map mid-game, ArmyHQ briefing, advance-turn modal, turn-aftermath modal, inbox-home) at 1920×1080 and 2560×1440 to confirm spatial findings before scheduling the remaining polish backlog.
