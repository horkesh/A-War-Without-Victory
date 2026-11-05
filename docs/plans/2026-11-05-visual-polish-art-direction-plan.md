# Visual polish and art-direction packet (R7 subordinate presentation packet)

**Date:** 2026-11-05
**Status:** PLANNED — Phase 0 is the next action. No code changed by this registration.
**Owner lane:** R7 presentation (subordinate packet; R7's controlling plan is unchanged and this packet never closes R7).
**Command-board row:** R7. Registered in the roadmap §5 R7 row and the plans README as a linked packet, not a new workstream.
**Authority:** Owner, 2026-11-05: "game art, GUI and overall visual polish and player experience … let's see what would make this game the most beautiful wargame ever." Local implementation, focused checks, browser proof, independent review and local commits are authorized under the 2026-07-31 activation. Merge, push and release stay separately authorized.
**Findings record:** [20261105_VISUAL_INSPECTION_AND_ART_DIRECTION.md](../40_reports/working/20261105_VISUAL_INSPECTION_AND_ART_DIRECTION.md) with twelve screenshots. Read it first; this plan does not repeat its evidence.
**Collision rules:** see §3. Two other lanes are live on this machine and neither is touched.
**Current next action:** Phase 0 baseline capture, then Phase A.

## 1. Purpose and non-goals

**Purpose.** Close the art-to-UI gap. The shipped art library (about 130 plates, one documentary voice) is strong; the chrome laid over it is generic. This packet restyles the war map as a map, makes the warroom chrome diegetic, wires existing art into the dialogs that should carry it, gives Army HQ, Chronicle and Codex paper and type, and cleans the faction step of the opening. It adds vector and procedural assets only; new photographic plates are owner-generated from briefs this packet writes.

**Non-goals.**
- No simulation, state, save-schema, scenario, authored-control, OOB, calibration or baseline change. Nothing under `src/sim/**`, `src/state/**`, `tools/ai_play/**`, `data/calibration/**`, `data/derived/**` painted or control files.
- No change to modal focus, dismissal, keyboard trapping or required-decision semantics. Those are Codex's (CX-20261105-012/013). Presentation of a dialog may change; its behaviour may not.
- No audio, Settings, onboarding, Advance or Game Over work. Files Codex has open are listed in §3 and are off limits.
- No new queue, ledger, resolver, command owner, permanent HUD resource or UI-only state block (`UI_OWNERSHIP_MATRIX.md`).
- No FORAWWV edit. No atrocity imagery as decoration; sensitive-history illustrations follow §8.
- No raster generation by Claude. No image of a real person is introduced; the six `officers/source/*.jpg` photographs get a disposition, not a use.
- Localization is EN-first; any new string is added to both `messages.en.ts` and `messages.bcs.ts` in one batched commit at the end of the phase (see §3 collision rule on i18n files).

## 2. Visual direction (the contract every phase serves)

- **One voice, already set by the art:** desaturated documentary photography, cold-blue dusk, tungsten, paper, cardboard, cork, enamel. Chrome should look like something on that desk, not a web dashboard over it.
- **Materials:** cream paper (`texture_paper_cream.webp`), dark wood (`texture_wood_dark.webp`), cork (`warroomCorkSheet.ts` luminance contract), weathered enamel for crests. Glass and blur only where the existing ops-planning modal already uses them.
- **Type:** the two bundled families stay (`typography_contract.test.ts`). IBM Plex Sans Condensed carries headings and prose; IBM Plex Mono carries figures, dates and codes only. Monospace stops being the default body face in Army HQ, Chronicle and Codex.
- **Colour:** faction inks already exist (RBiH green, RS crimson, HRHB blue) and the accent-gold/phosphor-green interactive convention stands. The map gets a period cartographic palette (olive, ochre, slate, linen) under those inks.
- **Motion:** none added beyond what reduced-motion already gates.

## 3. External-agent execution contract

**Session start.**
```bash
git status --short
git log --oneline -3
node --version
(Get-Command bash).Source   # PowerShell: must be Git Bash, not WSL, before trusting any red suite
npm run plans:check
```

**Required reading.** `.claude/napkin.md` (index only), `docs/20_engineering/AGENT_WORKFLOW.md`, `docs/20_engineering/PYRRHIC_PLANNING_RULES.md`, `docs/plans/COMMAND_BOARD.md`, this plan, the findings record, `docs/40_reports/GUI_MASTER.md` ("Where to look" and "Gates / discipline"), `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `docs/20_engineering/MAP_UI_MASTER.md`, `docs/20_engineering/PLAYER_VISIBLE_STATE.md`, `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`, `docs/40_reports/WARROOM_MASTER.md`, memory topic `feedback_ui_visual_style`.

**Files to inspect before editing** (per phase lists below), plus `tests/ui/typography_contract.test.ts`, `tests/ui/accessibility_contrast_tokens.test.ts`, `tests/ui/warroom_board_luminance.test.ts`, `tests/ui/toolbar_fit_contract.test.ts`, `tests/ui/map_production_graphics_cleanup.test.ts`.

**Branch and collision rule.** Work on `claude/visual-polish-art-direction` from current main in its own worktree (never a junction of `node_modules`; see `junction_rm_rf_destroyed_main_checkout`). Before the first edit of each phase, append the phase's file list to `F:/AWWV-coordination/CODEX_CLAUDE_HANDOFF.md` as a `CL-` entry. Never edit:
- Codex's open files: `src/ui/map/audio/**`, `AudioSurfaceBedController.tsx`, `SettingsScreen.tsx`, `GameOverModal.tsx`, `onboarding/OnboardingOverlay.tsx`, `warroom/AdvanceTurnModal.tsx`, `docs/audio/**`, `assets/audio/**`; and treat `i18n/messages.en.ts` / `messages.bcs.ts` as shared: new keys go in one small commit per phase, announced in the handoff file, never a reflow of existing keys.
- The calibration worktree, `src/sim/**`, `src/state/**`, `tools/ai_play/**`, authored data.
- `docs/10_canon/FORAWWV.md`, `.claude/settings.json` hooks.

**Global stop rule.** Stop and write a decision packet instead of code when: a visual change needs a modal's focus or dismissal logic to move; a new persisted or UI-only state field is needed; an illustration would be attached to a §6 sensitive event; a map-style change alters any click, selection or counter-position contract; the roadmap or board size guards (`docs_desktop_v09_truth.test.ts`: roadmap < 60,000, board < 20,000 chars) would be exceeded by closeout text.

**Phase and commit boundaries.** One phase per commit series; `/simplify` between phases; each phase ends with a retained browser proof under `logs/visual-polish-20261105/<phase>/` and a one-paragraph entry in this plan's §11 execution record.

## 4. Task boundary rules

- Each phase may edit only the files it lists, plus tests under `tests/ui/` and this plan.
- Save/schema work: never allowed in this packet.
- Scenario or hash drift: never expected. A changed `final_save`, `weekly_report` or baseline hash means the packet crossed a boundary; revert and report.
- A decision packet replaces implementation for: event `image` keys on §6 events, officer source photos, the inbox-off-map layout if it needs a new owner, any new raster plate.

## 5. Phase sequence

Roles: **Orchestrator** (lead, integration, evidence, docs), **UI/UX Developer** (implementer, Phases B–E), **Graphics Programmer** (implementer, Phase A), **Independent reviewer** = code-review lens plus canon-compliance lens, with the **Historian** seat added for Phase C's event art and the **Game Designer** seat for any effect-row rewording. **Architect** decisions are flagged in §11 for owner review, never silently applied.

### Phase 0 — Baseline and contracts
- [ ] Capture reference screenshots at 1366x768 and 1920x1080 for all three factions: splash, menu, faction step, desk, command surface, war map (political, ethnic, supply, zoomed), Army HQ, Chronicle, Codex, first decision. Retain under `logs/visual-polish-20261105/00_baseline/`.
- [ ] Run and record green: `npx tsc --noEmit`, `npm run test:vitest -- tests/ui/typography_contract.test.ts tests/ui/accessibility_contrast_tokens.test.ts tests/ui/warroom_board_luminance.test.ts tests/ui/toolbar_fit_contract.test.ts tests/ui/map_production_graphics_cleanup.test.ts`.
- [ ] Hash the tracked RS/RBiH saves used for proof; zero turns advance in any phase.
- Handoff: baseline folder and hashes recorded in §11. Stop gate: any red test is a pre-existing defect to record, not to fix here.

### Phase A — The war map as a map (Graphics Programmer; reviewer: code-review + map-geometry-integrity)
Files: `src/ui/map/map/awwv_map_style.json`, `src/ui/map/map/MapContainer.tsx` (layer order and paint only), `src/ui/map/map/frontLineIcons.ts`, `src/ui/map/map/formationIcons.ts`, Deck counter layers under `src/ui/map/layers/`, `src/ui/map/components/MapModeLegend.tsx`, `src/ui/map/styles/globals.css` (map tokens only), the map-route shell wrapper that decides whether `PresidentialInbox` is mounted over the map.
- [ ] Tests first: a style-contract test asserting the base-layer order (paper → hillshade → water → roads → control fills → borders → fronts → labels → counters), that every paint colour comes from a named token, and that no remote glyph or sprite URL is introduced beyond the existing one recorded in `TACTICAL_MAP_SYSTEM.md`.
- [ ] Base: linen/paper fill under a muted hillshade tint; period palette tokens for the three control inks and neutral land; water from the existing rivers source; `major_roads_wgs84.geojson` at campaign zoom; settlement and city labels in one face with halo.
- [ ] Front line: inked, slightly irregular stroke on the existing `front-lines` source, keeping the dual defensive arcs and the sector glow filter.
- [ ] Counters: printed NATO sprites with faction ink body, echelon, strength bar and a worn edge; same size curve (16 px at Z6 to 40 px at Z14), same opaque halo and depth settings as `TACTICAL_MAP_SYSTEM.md` requires. No change to the DOM counter owner or fan rules.
- [ ] Declutter: the inbox is not mounted over the map route; the map keeps its width. Architect decision flagged: where the inbox badge lives on the map route (toolbar chip is the existing pattern).
- [ ] Borrow, do not duplicate: reuse the Staff Map's paper language (`TACTICAL_MAP_SYSTEM.md`, fourth zoom) for tokens and label style.
- Verification: `tsc`; `tests/ui/map_*`, `formation_counter_*`, `map_mode_counter_legend`, `toolbar_fit_contract`, the new style-contract test; `npm run desktop:map:build`; browser proof at both viewports, all three map modes, zoom in and out, click a counter and a settlement to prove routing unchanged. Artifacts: `logs/visual-polish-20261105/A/`.
- Stop gates: any counter position, click routing or selection-priority test goes red; any need to touch `src/ui/map/map/clickSelectionPriority.ts` or `mapSelectionRouting.ts`.
- `/simplify` → commit.

### Phase B — Diegetic warroom chrome (UI/UX Developer; reviewer: code-review + ui-ux lens)
Files: `src/ui/map/components/warroom/WarroomShellLayer.tsx`, `warroomCorkSheet.ts`, `warroomMarkerInk.ts`, `WarroomStatusBar.tsx`, `CommandCardStrip.tsx`, `CommandCard.tsx`, `src/ui/map/components/PresidentialInbox.tsx` (styling and placement only; queue logic untouched), `src/ui/map/components/PresidentialToolbar.tsx` (material only; single-line contract stays).
- [ ] Tests first: `warroom_board_luminance` and `warroom_shell_accessibility` stay green; add a test that the corkboard sheet draws the front line and faction inks from live control for a fixture save.
- [ ] Corkboard map: paper sheet with hand-inked control, front line, four pins, faction stamp; same luminance contract.
- [ ] Inbox as dossier: cream paper panel with tab, typewriter headings, crest; narrower, anchored to the desk edge so the room reads; same buttons, labels and aria.
- [ ] Nav strip as desk tab rail: same nine buttons and order, material and type matched to the room; `toolbar_fit_contract` stays green.
- [ ] Command cards: art-first card (image fills the card, text in a paper footer), count badges on the footer.
- Verification: `tsc`; `tests/ui/warroom_*`, `toolbar_fit_contract`, `presidential_toolbar_*`; map build; browser proof three factions, 1992 and 1995 rooms, both viewports. Artifacts: `logs/visual-polish-20261105/B/`.
- Stop gates: hotspot regions change (`data/ui/` clickable-region files are not edited); any Decision Room or docket logic change.
- `/simplify` → commit.

### Phase C — Art wiring (UI/UX Developer; reviewer: code-review + canon-compliance + Historian for event art)
Files: `src/ui/map/components/EventDecisionModal.tsx` (header only), `DecisionModalImageHeader.tsx`, `src/ui/map/data/presidentialDeskAssets.ts`, `src/ui/map/data/eventIllustrationArt.ts` (header comment is stale: directory is populated), `src/ui/map/components/TurnAftermathModal.tsx` (header art only), `src/ui/map/components/army_hq/ArmyHQModal.tsx` (crest header only).
- [ ] Tests first: `event_decision_modal_*`, `event_modal_*`, `decision_family_modals`, `modal_palette_unification` stay green; add a test that `EventDecisionModal` resolves a `decision_header_*` plate by decision family and falls back to text-only.
- [ ] First decision and every event decision get the image header. Effect rows become a typed staff memo (one line per faction effect, exact figures kept; copy change goes through Game Designer).
- [ ] Turn aftermath header uses the matching consequence still; Army HQ header carries the army crest.
- [ ] Decision packet, not implementation: which additional events should author an `image` key. Today 28 do. The packet lists candidates per catalog file, marks §6 events for the Historian and canon seats, and is implemented only after sign-off, as a data-only commit whose loader validation (`src/sim/events/event_loader.ts`) is run but not edited.
- Verification: `tsc`; the modal tests above; browser proof of the turn-1 decision for all three factions and of one aftermath. Artifacts: `logs/visual-polish-20261105/C/`.
- Stop gates: any focus, trap, Escape or backdrop behaviour change; any §6 image attachment without the panel.
- `/simplify` → commit.

### Phase D — Paper dossier material and type (UI/UX Developer; reviewer: code-review + ui-ux lens)
Files: `src/ui/map/components/army_hq/ArmyHQModal.tsx` and section components (class names only), `src/ui/map/components/chronicle/ChronicleOverlay.tsx`, `ChronicleCard.tsx`, `src/ui/map/components/CodexPanel.tsx`, `src/ui/map/styles/globals.css`, `src/ui/map/tailwind.config.ts` (tokens only).
- [ ] Tests first: `typography_contract`, `gui_polish_typography_floor`, `r7_army_hq_layout_readability`, `r7_codex_layout_readability`, `accessibility_contrast_tokens`, `army_hq_ultrawide_layout` stay green; add a test that Codex badges never wrap at 1366.
- [ ] Body text in Sans Condensed; Mono only for figures, dates, codes; cream paper panels with crest headers; chips sized to content; number formatting untouched (that is the R7 amendment's lane).
- Verification: `tsc`; tests above; browser proof of all three surfaces at both viewports. Artifacts: `logs/visual-polish-20261105/D/`.
- `/simplify` → commit.

### Phase E — Opening faction step (UI/UX Developer; reviewer: code-review)
Files: `src/ui/map/components/MainMenu.tsx`, `components/opening/*` as needed.
- [ ] Tests first: `main_menu_opening_flow`, `opening_readability_gate`, `opening_splash`, `opening_transition` stay green; add a test that no empty dossier box renders before a faction is chosen and the heading appears once.
- [ ] Faction list only until a faction is chosen; dossier opens over that faction's 1992 room plate with crest.
- Verification: `tsc`; tests above; five-viewport browser proof as the cinematic amendment already defines. Artifacts: `logs/visual-polish-20261105/E/`.
- `/simplify` → commit.

### Phase F — Asset QA decision packet (Orchestrator; no code)
- [ ] One packet for the owner: pseudo-text plates to regenerate (`tutorial_02_map.webp`, newspaper folds on `hq_rbih_*`, `hq_rs_1993`), the HRHB corkboard plate already in the §10 backlog, the officer source photos disposition, and generation briefs in the existing voice for any plate the phases above found missing.
- [ ] Record owner answers in §11; no asset is replaced by Claude.

## 6. Determinism and save-schema gates
No engine, data, diagnostic or persisted output is touched. The only generated outputs are screenshots and the map build; both are evidence, not artifacts under baseline. If any baseline hash moves, the packet has crossed a boundary: revert and report.

## 7. UI and player-truth gates
Canonical owners are unchanged: Desk owns triage, Decision Room owns action, Army HQ owns command review, Chronicle and Codex own record. No field that `PLAYER_VISIBLE_STATE.md` marks hidden becomes visible through art or layout. New strings exist in EN and BCS. Browser proof is required for every phase; packaged Electron proof is not claimed by this packet.

## 8. Historical and sensitive-history gates
Event art is attached only to events whose illustration already exists and whose subject the Historian confirms; the Sensitive-History Design Gate rings apply; atrocity illustrations are never used as decoration on unrelated surfaces. Unsupported identities are omitted. Real-person photographs are not introduced.

## 9. Roadmap and ledger closeout
Per phase: this plan §11; `docs/40_reports/GUI_MASTER.md` "Recent GUI changes"; `docs/PROJECT_LEDGER.md` entry; `docs/40_reports/implemented/2026MMDD_VISUAL_POLISH_<PHASE>.md`. At packet end: `COMMAND_BOARD.md` R7 row status line; `MASTER_ROADMAP.md` only if R7's row text changes; `GUI_POLISH_MASTER.md` punch-list closures; `WARROOM_MASTER.md` for Phase B. `plan_index.yml` is regenerated with `node tools/derive_plan_index.cjs` whenever a roadmap row changes.

## 10. Copy-ready prompt
```text
Role and objective: You are the implementation agent for the R7 visual polish and art-direction packet. Execute docs/plans/2026-11-05-visual-polish-art-direction-plan.md one phase at a time, starting with the next unfinished phase recorded in its §11.

Canon references: Read .claude/napkin.md (index), docs/20_engineering/AGENT_WORKFLOW.md, docs/20_engineering/PYRRHIC_PLANNING_RULES.md, docs/plans/COMMAND_BOARD.md, docs/40_reports/GUI_MASTER.md, docs/20_engineering/TACTICAL_MAP_SYSTEM.md, docs/20_engineering/PLAYER_VISIBLE_STATE.md, docs/20_engineering/UI_OWNERSHIP_MATRIX.md and the findings record docs/40_reports/working/20261105_VISUAL_INSPECTION_AND_ART_DIRECTION.md before editing. Inspect the phase's file targets and its listed tests.

Determinism and ledger constraints: Presentation only. No src/sim, src/state, tools/ai_play, authored or calibration data, save fields or persisted output. Never edit Codex's open files (audio, Settings, onboarding, Advance, Game Over, docs/audio) or modal focus/dismissal logic. Append the phase file list to F:/AWWV-coordination/CODEX_CLAUDE_HANDOFF.md before editing. Append docs/PROJECT_LEDGER.md per phase. Do not edit docs/10_canon/FORAWWV.md.

STOP AND ASK triggers: a visual change needs focus/dismissal logic to move; a new state field; a §6 event illustration; any click, selection or counter-position test goes red; a baseline hash moves; roadmap/board size guard; a new raster plate is needed.

Output format and validation: One phase per commit series with /simplify between phases. Handoff lists changed files, tests run with pass/fail, tsc and map build exits, browser-proof folder, ledger/docs updated, and the next unfinished phase.
```

## 11. Execution record
- 2026-11-05 — Packet registered from the findings record. No phase started. Plan index regenerated.
- 2026-11-05 — **Phase 0 done.** Worktree `F:/AWWV-worktrees/visual-polish`, branch `claude/visual-polish-art-direction`, own `npm ci`. Baseline screenshots at 1366 and the green `tsc` / contract-test logs are in `F:/AWWV-worktrees/_logs/visual-polish/00_baseline/`.
- 2026-11-05 — **Phase A done** (report: [20261105_VISUAL_POLISH_PHASE_A_MAP.md](../40_reports/implemented/20261105_VISUAL_POLISH_PHASE_A_MAP.md)). Palette module, style repaint, printed counters, legend/fog/label inks; style contract test RED then GREEN; `tsc` 0, 12 files / 94 tests, map build 0, browser proof at 1366 and 1920, simplify pass applied. **Architect decision flagged:** the inbox-off-map declutter moves to Phase B as an inbox-presentation change because the default `inbox` rail panel is a tested ownership contract (`panel_rail_ownership`, `panel_rail_exclusivity`, `ui_map_panel_rail`). Not started: Phase B.
- 2026-11-05 — **Owner accepted a re-order: Phase A PR first, then Phase C before Phase B.** Phase A is PR #525.
- 2026-11-05 — **Phase C done** on `claude/visual-polish-phase-c`, stacked on Phase A (report: [20261105_VISUAL_POLISH_PHASE_C_ART_WIRING.md](../40_reports/implemented/20261105_VISUAL_POLISH_PHASE_C_ART_WIRING.md)). The required event decision renders `DecisionModalImageHeader` with the authored illustration or a category plate (`getDecisionHeaderForEventCategory`); turn aftermath draws a tone-keyed consequence still; Army HQ crest at nameplate size. New art-wiring test RED 6/6 then GREEN; `tsc` 0; 23 files / 228 tests, then 13 files / 162 after the simplify pass; map build 0; browser proof of the turn-1 decision and Army HQ. Not done: the event `image` authoring decision packet (Historian and canon seats for §6 events) and the effect-row rewording (Game Designer seat). Next: Phase B.
- 2026-11-05 — **Phase B done** on `claude/visual-polish-phase-b`, stacked on C (report: [20261105_VISUAL_POLISH_PHASE_B_WARROOM_CHROME.md](../40_reports/implemented/20261105_VISUAL_POLISH_PHASE_B_WARROOM_CHROME.md)). The Warroom inbox mounts as a dossier on the desk (`material="dossier"`), the navigation is a brass rail, command cards are art first. **Scope decision flagged:** the corkboard map is the owner-accepted WR01 design (fronts only, luminance-matched, matte pins) and was left unchanged; the plan's "hand-inked control, front line, pins" were already true. New chrome test RED 3/4 then GREEN; `tsc` 0; 20 files / 263 tests, then 9 files / 84 after the simplify pass; map build 0; browser proof RBiH desk and command surface at 1366 and 1920, RS room verified through the DOM. Next: Phase D (paper and type for Army HQ, Chronicle, Codex), then E and F.
