# AWWV AAA+++ Shipping Plan — Path to a Paradox-Tier Launch

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan track-by-track. Each track is dispatch-able to a parallel agent under the autonomous parallel-workstream operating plan; phases are sequential but tracks within a phase are parallel.

**Goal:** Move AWWV from its current **B+ overall** rating (per `GAME_STATE_RATING_MASTER.md` 2026-05-16) to a credible **AAA+++ / Paradox-tier launch** in ~3 calendar months of disciplined polish, sequenced for highest impact-per-day first.

**Architecture:** This is **not a new feature milestone.** It is an integration / polish / production-readiness plan that consumes existing v0.9.x → v1.0 milestone plans and sequences the open work by leverage. It maps each of the 11 leverage moves from the rating master into a concrete track with files, steps, acceptance criteria, and a done-means contract.

**Tech Stack:** Existing (TypeScript / React / MapLibre / Deck.gl / Electron) + soundscape composer + BCS translator + press/asset producer (operator-owned non-engineering work explicitly tagged).

**Author / date:** 2026-05-16. **Owner of execution:** Pyrrhic Games team — orchestrator coordinates per-track dispatch; user retains all sensitive-history, scope, and design-meaning gates.

---

## Supersedes / Corrects

This plan does **not** supersede any existing milestone plan. It **integrates** them under a single ship-readiness lens:

- `docs/plans/2026-04-30-v1-gold-readiness-integration-plan.md` — remains the formal v1.0 gold-readiness integration gate; this plan feeds it.
- `docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md` — the v0.8→v0.9 scorecard. This plan updates that scorecard's grades against the 2026-05-16 rating and adds the production/shipping tracks the earlier scorecard didn't formally cover (audio, localization, marketing).
- `docs/plans/2026-04-06-v093-performance-accessibility-plan.md`, `2026-04-06-v094-visual-polish-legendary-map-features-plan.md`, `2026-04-06-v095-platform-packaging-store-plan.md`, `2026-03-31-v092-tutorial-and-onboarding-plan.md` — consumed.
- `docs/40_reports/GUI_POLISH_MASTER.md` — the 36-finding punch-list whose closure is **Track B** below.
- `docs/40_reports/GAME_STATE_RATING_MASTER.md` — the per-system rating this plan is the actionable answer to.

---

## Inputs

- `docs/40_reports/GAME_STATE_RATING_MASTER.md` (2026-05-16, the rating)
- `docs/40_reports/GUI_POLISH_MASTER.md` (2026-05-16, the punch-list, includes live-observation `LIV-P0-1` paramilitary inbox finding)
- `docs/plans/MASTER_ROADMAP.md`
- `docs/plans/2026-04-30-v1-gold-readiness-integration-plan.md`
- `docs/plans/2026-04-10-v08to09-a-plus-plus-system-scorecard-plan.md`
- `docs/40_reports/audits/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md` (the "UI implies clarity the war did not have" findings that drive Track C)
- `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`
- `docs/40_reports/audits/20260402_ENGINE_HEALTH_TRIAGE_AND_BLINDSPOTS.md`
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` (gates Track A0)
- `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` (gates Track E1)
- `docs/20_engineering/UI_OWNERSHIP_MATRIX.md`
- `docs/20_engineering/PLAYER_VISIBLE_STATE.md`
- `docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md` (the operating discipline this plan uses)

---

## Headline framing

**Where AWWV is today (per rating):**
- **Simulation core A−** — already near AAA+++ in determinism, calibration, sector truth, operations singularity.
- **Frontend / shell B+** — works, but visualization implies more clarity than the historical war had; density/onboarding gaps; one open engine↔UI truth drift (paramilitary inbox).
- **Content / lore B+** — rich text, missing media (audio, localization, art animation).
- **Code / engineering A−** — above industry average for team size.
- **Production / shipping C+** — dragging the whole average down; no audio, no localization, no store, no trailer.

**Path to AAA+++:** lift production/shipping to B+ minimum and lift frontend visualization to A. Simulation and code are already there.

**Estimated total effort:** ~265 person-days across the 11 leverage moves. With ~5 parallel workstreams (engine dev / UI dev / composer / translator / artist+PM) ~**3 calendar months** to a credible A+ launch.

---

## Phase / Track structure

This plan organizes the 11 leverage moves into **5 sequential phases** containing **15 parallel-capable tracks**. Each phase has a target version bump. Tracks within a phase are parallel-safe under file-disjoint ownership.

| Phase | Window | Version target | Tracks | Theme |
|------:|--------|----------------|--------|-------|
| **0** | Week 1 | `v0.9.8-alpha` | A0, B | **Unblock.** Close the sensitive-history credibility blocker + ship the UI polish punch-list. |
| **1** | Weeks 2–5 | `v0.9.9-alpha` | C, D | **Inform.** Make the map look like a wargame. Make the first 10 minutes survivable. |
| **2** | Weeks 6–9 | `v1.0-rc1` | E, F, G, H | **Lift.** Diplomacy panel, accessibility, officer character, soundscape kickoff (composer in parallel). |
| **3** | Weeks 10–12 | `v1.0-rc2` | I, J | **Memorable.** Cinematic verdict + Chronicle chapter. Endgame is the moment that drives word-of-mouth. |
| **4** | Weeks 13–16+ | `v1.0.0` Gold | K, L, M, N, O | **Ship.** Soundscape integration, localization to BCS, press kit, store presence, launch-day. |

---

## PHASE 0 — Unblock (Week 1)

Goal: clear the one launch-credibility blocker and the entire scoped UI polish backlog before any feature work begins. These two together are ~10 person-days of work and lift the whole shell category by half a grade.

### Track A0 — Sensitive-history Presidential Inbox audit (LIV-P0-1)

**Origin:** GUI_POLISH_MASTER `LIV-P0-1` (2026-05-16 live observation). RS player paramilitary deployment queue (86 requests turn 1, 29 turn 2, … 2 turn 8) is generated by the sim but **not surfaced** in the Presidential Inbox. The engine is asking the player a war-crimes-adjacent question and the UI silently drops it. This is rated as **the single highest-impact-per-day fix in the whole roadmap.**

**Owner agents:** `ui-ux-developer` (lead) + `canon-compliance-reviewer` (sensitive-history gate) + `historian` (decision copy). User retains §6 sign-off.

**Files:**
- Modify: `src/ui/map/data/inboxItems.ts` (add `paramilitary_decision` to `InboxItemType` enum + derivation)
- Modify: `src/ui/map/data/GameStateAdapter.ts` (expose root `state.pending_paramilitary_requests` into `LoadedGameState`)
- Modify: `src/ui/map/App.tsx` (`onAction` router gets `paramilitary_decision` case routed to the existing decision modal or a new approve/deny modal)
- Create: `src/ui/map/components/ParamilitaryDecisionModal.tsx` (or extend existing decision flow) — sensitive-history copy must clear `canon-compliance-reviewer`
- Modify: `src/ui/map/data/types.ts` (LoadedGameState extension)
- Modify: `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` if a new decision-family pattern is introduced (likely not — extending existing surface)
- Modify: `docs/40_reports/GAME_STATE_RATING_MASTER.md` (§32 + §12 grade upgrade from B+⚠ back to A−)
- Modify: `docs/40_reports/GUI_POLISH_MASTER.md` (mark `LIV-P0-1` `RESOLVED — see [report]`)

**Steps:**
1. **Audit pass first.** Run a desktop sim per the GUI_POLISH `LIV-P0-1` reproduction (RS campaign, advance to turn 8) and confirm raw state has `pending_paramilitary_requests`. Generate a fresh `tmp_aaa_track_a0/desktop_rs_turn_*.json` snapshot set.
2. **Audit every engine decision family** against the Inbox surface. For each producer in `src/sim/events/`, `src/sim/combat/`, `src/sim/negotiation/`, `src/sim/early_war/` that writes a `pending_*` field intended for player decision, verify there is a corresponding `inboxItems.ts` consumer. Output: `docs/40_reports/audits/YYYYMMDD_PRESIDENTIAL_INBOX_DECISION_SURFACE_AUDIT.md`.
3. Add `paramilitary_decision` to `InboxItemType`. Add derivation in `deriveInboxItems()` reading `state.pending_paramilitary_requests` filtered by `player_faction`.
4. Wire approve/deny IPC routing through the existing paramilitary decision resolver (do not invent new sim authority).
5. Author warning copy per `historian` (ICTY-anchored, names paramilitary unit class, names target OSID, names ethical weight). Sensitive-history clearance required.
6. Add focused tests: RS turn 1 + turn 8 fixtures must surface the cards; RBiH/HRHB fixtures must NOT (faction filtering).
7. Run the full smoke triad (`tsc --noEmit` + `vitest run` + `desktop:map:build`).

**Acceptance criteria (Done Means):**
- ✅ RS turn 1 Inbox renders ≥1 paramilitary decision card with explicit war-crimes-adjacent warning copy.
- ✅ Approve/deny actions write through canonical paramilitary decision resolver — no new sim authority introduced.
- ✅ Engine-decision-surface audit committed; every player-facing `pending_*` family in engine has a documented Inbox consumer or a documented reason for omission.
- ✅ `canon-compliance-reviewer` and `historian` sign off on decision copy.
- ✅ User §6 sign-off recorded.
- ✅ `GUI_POLISH_MASTER LIV-P0-1` marked RESOLVED; `GAME_STATE_RATING_MASTER` systems #12 and #32 grades restored to A−.

**Estimated effort:** 3–5 person-days. **Hard gate before any "shippable" claim.**

### Track B — GUI polish punch-list close (36 findings)

**Origin:** `GUI_POLISH_MASTER.md` 2026-05-16 — 36 findings (5 P0, 20 P1, 11 P2). Suggested 10-step polish ordering already enumerated in §8 of that file.

**Owner agents:** `ui-ux-developer` lead; one agent per cluster.

**Track B is intentionally parallel-dispatched** along the 10 clusters in `GUI_POLISH_MASTER.md` §8. Each cluster is a self-contained sub-track:

| Sub | Cluster | Files most touched | Effort |
|----:|---------|--------------------|------:|
| B1 | Palette unification (P0-1 AdvanceTurnModal dark theme + P0-3 severity tokens + P1-4 Modal panel presets + P0-2 emoji removal) | `src/ui/map/components/warroom/AdvanceTurnModal.tsx`, `src/ui/shared/Modal.tsx`, `src/ui/map/components/SidePickerOverlay.tsx`, theme tokens | 1d |
| B2 | Right-rail empty-state fill (P1-27, P1-28) | `src/ui/map/components/PresidentialInbox.tsx`, `src/ui/map/App.tsx` panel rail | 0.5d |
| B3 | Decision Room progressive disclosure (P1-22, P1-23) | `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`, `ChiefOfStaffBriefing.tsx` | 1d |
| B4 | Typography floor (P1-8, P1-30) | mass-replace `text-[7px]`/`text-[8px]` outside legend stops | 0.5d |
| B5 | Warroom hero polish (P1-15, P1-16, P1-19, P0-20, P1-18) | `src/ui/map/components/warroom/WarroomShellLayer.tsx`, `WarroomStatusBar.tsx`, web font bundle | 1d |
| B6 | Dead chrome retirement (P0-5, P2-36) | move `MapModeToolbar.tsx`, `TopToolbar.tsx`, legacy DOM warroom modals to `_archive/` | 0.5d |
| B7 | Emergency-posture guard (P1-12) | `src/ui/map/components/army_hq/ArmyHQModal.tsx` confirm modal | 0.5d |
| B8 | CRT overlay decision (P1-9) | `src/ui/map/components/OOBSidebar.tsx` — design call required from user first | 0.5d |
| B9 | Onboarding sequence cleanup (P1-31, P2-34, P2-35) | merge first-run overlays — overlaps with Track D, sequence carefully | 1d |
| B10 | Pause binding + ESC tree (P2-32) | `src/ui/map/hooks/useKeyboardShortcuts.ts`, `App.tsx` ESC handler | 0.5d |

**Acceptance criteria (Done Means):**
- ✅ All 36 GUI_POLISH findings marked RESOLVED / DEFERRED-WITH-REASON / RECLASSIFIED.
- ✅ `GUI_POLISH_MASTER.md` archived to `docs/40_reports/archive/` per its own §0 contract.
- ✅ `GUI_MASTER.md` "Recent GUI changes" table cites this track's report.
- ✅ Smoke triad clean (`tsc --noEmit` + `vitest run` + `desktop:map:build`).
- ✅ Playwright visual regression added for the 8 hero screens (covers Phase 0 work + protects against Phase 1+ regressions).

**Estimated effort:** ~7 person-days parallel-dispatched (calendar ~3 days at full parallelism).

**Phase 0 done means:** v0.9.8-alpha bump. The whole shell category lifts from B+ to A−. Sensitive-history credibility unblocked. **Ready to start the visualization + onboarding work that takes longer.**

---

## PHASE 1 — Inform (Weeks 2–5)

Goal: close the open Strategic Design Council audit findings on map information design + ship a tutorial the player can survive. These are the two biggest "this is a Paradox-tier wargame" signals.

### Track C — Map information-design pass

**Origin:** Strategic Design Council Audit 2026-02-15 §2.2 / §3.A / §4 — **still mostly unaddressed.** Rated as #2 leverage move (highest single-effort impact on tactical-map grade).

**Implementation status (2026-05-16):** C1-C4 implemented by `docs/40_reports/implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`. The live tactical map now has contested bands, front-stability styling, supply-reach/isolation overlay, and separate Authority/Legitimacy map modes. Remaining Track C work is validation/polish: browser/Playwright captures and any richer art-direction choices for oscillating fronts.

**Owner agents:** `ui-ux-developer` + `graphics-programmer` + `game-designer` (per-element design call) + `determinism-auditor` (data derivation must stay deterministic).

**Files:**
- Modify: `src/ui/map/map/MapContainer.tsx` + `src/ui/map/map/buildControlGeoJSON.ts` + new `buildContestedBandsGeoJSON.ts`
- Modify: `src/ui/map/map/buildFrontLinesGeoJSON.ts` + new front-stability classifier
- Create: `src/ui/map/map/buildSupplyReachGeoJSON.ts` (consumes existing supply state)
- Modify: `src/ui/map/components/SettlementDetailContent.tsx` — show control + authority + legitimacy as three rows, not collapsed
- Modify: `src/ui/map/components/BottomStatusStrip.tsx` — territory bar gets a hairline annotation when contested
- Modify: `docs/40_reports/MAP_GEOMETRY_MASTER.md` (record the new layers)
- Modify: `docs/40_reports/audits/STRATEGIC_DESIGN_COUNCIL_AUDIT_2026_02_15.md` — mark findings 1/2/3 RESOLVED with link
- Modify: `docs/40_reports/GAME_STATE_RATING_MASTER.md` (#17 grade lift)

**Steps (sequenced, four sub-tracks parallel-safe):**

1. **C1 — Contested / disputed band rendering** (~7d)
   - Derive "contested" status per OSID: any OSID where control flipped within last N turns OR where adjacent enemy formations have power-ratio > 0.5.
   - Render as a hatched / dual-tone fill over the existing solid fill, **not** replacing it.
   - Add to political map mode + ethnic map mode.
   - Acceptance: minimum 1 contested band visible per 40w run on at least one OSID per faction.
   - 2026-05-16 status: IMPLEMENTED; see `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`.

2. **C2 — Front stability visualization** (~7d)
   - Classify each front edge as `fluid` / `static` / `oscillating` from the existing `recent_control_events` + sub-segment ID history.
   - Visual: `static` = solid black/cream (current), `fluid` = animated dashed pulse, `oscillating` = wavy line.
   - Acceptance: 188w run produces visible mix of all three classifications.
   - 2026-05-16 status: IMPLEMENTED; see `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`.

3. **C3 — Supply reach fade** (~7d)
   - New supply map mode overlay: fade gradient from supply source outward through corridor.
   - Render isolated pockets distinctly (red ring + "isolated" badge).
   - Acceptance: Bihać pocket visually unmistakable as isolated when isolated.
   - 2026-05-16 status: IMPLEMENTED; see `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`.

4. **C4 — Authority / legitimacy / control as three layers** (~7d)
   - Add two new map modes: `authority` (per-municipality, from `central_authority` data) + `legitimacy` (per-faction-per-OSID).
   - Settlement panel shows the three values stacked, not collapsed into one "control %".
   - Acceptance: viewing the same OSID in three different modes produces three visibly different fills.
   - 2026-05-16 status: IMPLEMENTED; see `implemented/20260516_TACTICAL_MAP_INFORMATION_DESIGN_TRACK_C.md`.

**Acceptance criteria (Done Means):**
- ✅ Strategic Design Council Audit findings 1, 2, 3 from §2.2 marked RESOLVED.
- ✅ 4 new visual layers (contested bands, front stability, supply reach, authority/legitimacy) live.
- ✅ Determinism preserved — `determinism-auditor` signs off; 40w hash stable.
- ✅ `GAME_STATE_RATING_MASTER` #17 lifts from C+ to B+ minimum.
- ✅ Playwright regression covers the 4 new modes.

**Estimated effort:** ~28 person-days (4 sub-tracks at 7d each, 2 in parallel).

### Track D — Onboarding consolidation

**Origin:** Rating #24 + GUI_POLISH P1-31. v0.9.2 closed for agent scope but operator-owned; the in-product tutorial flow still requires 4–5 sequential overlays.

**Implementation status (2026-05-16):** Track D D1-D4 is implemented for engineering scope. `App.tsx` no longer mounts the legacy first-turn orientation overlay; `PeaceWarTransition` is armed only by a live peace-to-war loaded-state transition; `CoachmarkLayer` covers Decision Room, Operation Opportunity, Chronicle filters, and Codex with first-hover `localStorage` persistence; opening briefs are three scan bullets with `Begin` / `Read later`; proof report: `docs/40_reports/implemented/20260516_FIRST_SESSION_PRODUCT_PROOF.md`.

**Owner agents:** `ui-ux-developer` + `narrative-designer` (copy) + `game-designer` (sequencing).

**Files:**
- Modify: `src/ui/map/components/onboarding/OnboardingOverlay.tsx` + steps
- Modify: `src/ui/map/components/FirstTurnOrientationCard.tsx` (merge into onboarding step 7-8)
- Modify: `src/ui/map/components/PeaceWarTransition.tsx` (gate by turn, sequence after onboarding)
- Modify: `src/ui/map/components/PresidentialInbox.tsx` — OpeningBrief stays inside Inbox; no auto-promote to overlay
- Create: `src/ui/map/components/CoachmarkLayer.tsx` — interactive in-context tooltips on first hover of new surface
- Modify: `docs/plans/2026-03-31-v092-tutorial-and-onboarding-plan.md` (update with this Track's report)

**Steps:**
1. **D1 — Consolidate overlays** (~5d): IMPLEMENTED 2026-05-16. FirstTurnOrientationCard is no longer mounted by `App`; onboarding is single-owned by `OnboardingOverlay`; PeaceWarTransition no longer fires on direct save load.
2. **D2 — Coachmark system** (~10d): IMPLEMENTED 2026-05-16. `CoachmarkLayer` persists first-hover tooltips for Decision Room, Operation Opportunity, Chronicle filter, and Codex via `localStorage`.
3. **D3 — First-session walkthrough proof** (~3d): IMPLEMENTED 2026-05-16 as engineering proof report `docs/40_reports/implemented/20260516_FIRST_SESSION_PRODUCT_PROOF.md`; live browser/Playwright first-session capture remains recommended validation.
4. **D4 — Opening brief rewrite** (~3d): IMPLEMENTED 2026-05-16. `PresidentialInbox` opening briefs are three bullets with `Begin` / `Read later`.

**Acceptance criteria (Done Means):**
- ✅ First-run sequence reduced from ≥4 overlays to ≤2 overlays + coachmark layer.
- ✅ Coachmark layer covers Decision Room, Opportunity, Chronicle filters, Codex first-encounter.
- ✅ First-session product proof report committed per integration plan Task 3.
- ✅ `GAME_STATE_RATING_MASTER` #24 lifts from C to B+ minimum.

**Estimated effort:** ~21 person-days.

**Phase 1 done means:** v0.9.9-alpha bump. Tactical map looks like a wargame. New player survives first turn. Strategic Design Council audit core findings RESOLVED.

---

## PHASE 2 — Lift (Weeks 6–9)

Goal: lift the secondary systems (diplomacy, accessibility, officer character) to AAA bar + start the soundscape commission early because it has the longest lead time.

### Track E — Diplomacy panel

**Origin:** Rating #11 (B- → B+). Currently routes to Army HQ summary as placeholder.

**Owner agents:** `ui-ux-developer` + `game-designer` + `historian` (per-power dialogue).

**Files:**
- Create: `src/ui/map/components/DiplomacyOverview.tsx` (currently a shell stub per Memory; expand)
- Modify: `src/ui/map/components/warroom/WarroomShellLayer.tsx` — `diplomatic_telephone` hotspot routes to new panel
- Modify: `src/ui/map/data/GameStateAdapter.ts` — expose patron pressure, alliance, negotiation capital, IVP
- Modify: `docs/40_reports/GAME_STATE_RATING_MASTER.md` (#11 grade lift)

**Steps:**
1. **E1 — Per-power stance dashboard** (~3d): UN / NATO / Russia / US / Belgrade / Zagreb per faction. Stance + recent change + open proposals.
2. **E2 — Negotiation timeline** (~3d): current/past Dayton-style talks, capital deltas per dimension.
3. **E3 — "What would move the needle"** (~4d): hint per power on which decisions/events would shift their stance — surfaced from existing patron_distance + IVP wiring, not new sim authority.

**Acceptance criteria:**
- ✅ `diplomatic_telephone` warroom hotspot opens a real Diplomacy panel, not Army HQ summary.
- ✅ Three sections live: per-power stance / negotiation timeline / what-moves-the-needle.
- ✅ Reads only — no new sim authority. All data from existing canonical surfaces.
- ✅ Rating #11 lifts from B- to B+.

**Estimated effort:** ~10 person-days.

### Track F — Accessibility 4 P0 close

**Origin:** Rating #40. v0.9.3 a11y lane shipped semantic landmarks + tablist arrow keys; **4 P0 v1.0-ship blockers** still tracked. Required for v1.0.

**Owner agents:** `ui-ux-developer` per a11y lane plan.

**Files / lanes:** per `2026-04-06-v093-performance-accessibility-plan.md` — the 4 P0 blockers are:
1. Clickable-div anti-pattern in 4 files (replace with `<button>`)
2. WCAG-AA contrast borderline tokens
3. Zero `prefers-reduced-motion` support
4. Zero form-label `htmlFor=`

**Acceptance criteria (Done Means):**
- ✅ All 4 P0 blockers RESOLVED per the existing a11y plan.
- ✅ Axe-core / pa11y CI gate added.
- ✅ Rating #40 lifts from C- to B+ minimum.

**Estimated effort:** ~14 person-days per the existing lane plan.

### Track G — Officer character / mini-bio

**Origin:** Rating #10. Officers are rosters, not characters.

**Owner agents:** `narrative-designer` + `historian` (bios) + `ui-ux-developer` (Personnel tab).

**Files:**
- Modify: `src/sim/combat/officer_system.ts` + `officer_experience.ts` + `officer_quality_update.ts` (extend officer shape with `bio` + `trait` fields — additive)
- Modify: named-officer data sources under `data/scenarios/` + `data/source/` (OOB markdown enrichment) — exact paths to confirm in Step G0 audit pass
- Modify: `src/ui/map/components/army_hq/PersonnelContent.tsx` — render bio + traits
- Modify: `src/ui/map/components/OfficerProfile.tsx` — extend with trait pills
- Create: 2–3 traits per named officer (`historian`-authored, ICTY/BB-anchored)
- Create: 1-paragraph mini-bio per named officer

**Acceptance criteria:**
- ✅ Every named officer in OOB has bio + ≥2 traits.
- ✅ Personnel tab surfaces bio + traits visibly.
- ✅ Chronicle "Officer of the Week" card emits when an officer's traits trigger.
- ✅ Rating #10 lifts from B to B+.

**Estimated effort:** ~14 person-days (content-heavy; can parallelize across factions).

### Track H — Soundscape commission (kickoff, parallel)

**Origin:** Rating #33 (F → C+ minimum at v1.0). **Roadmap pushes audio to v1.3 "The Silence" post-1.0** — but the rating finds silence is the loudest tell that a wargame is not AAA. **Kickoff in Phase 2 because of the 60-day lead time;** integration is Phase 4.

**Owner:** External composer (operator-owned). Internal: `audio-engineer` role does not exist; `technical-architect` + `platform-specialist` will own integration when assets arrive.

**Phase 2 work (kickoff):**
1. **H1 — Brief composer** (~3d operator): write a 1-page audio brief: 1 main theme + 4–6 ambient pieces (per faction × phase) + UI feedback set (button click, modal open/close, turn advance) + 3–5 stinger cues (battle, peace plan, advance turn, sensitive-history rupture). Reference: AGEOD, HOI4, AGEOD's *Wars of Napoleon*.
2. **H2 — Stub audio system** (~5d engineering): create an `AudioBus` interface in `src/ui/audio/` that consumes a manifest and plays Howler.js or Web Audio cues. Stubbed sounds for now; integration happens in Phase 4 when real assets arrive.
3. **H3 — Soundtrack hooks** (~3d engineering): instrument `advanceTurn`, `attackResolved`, `peacePlanFired`, `verdictRendered`, `sensitiveRuptureFired` with `AudioBus.play()` calls behind a feature flag.

**Acceptance criteria for Phase 2 (kickoff):**
- ✅ Audio brief written + sent to composer + estimated delivery committed.
- ✅ `AudioBus` interface lives + can play a single stubbed cue.
- ✅ Hooks instrumented behind `AUDIO_ENABLED=false` flag.
- ✅ Rating #33 stays F until Phase 4 integration; lifts to D+ on kickoff.

**Estimated effort:** ~11 person-days (Phase 2) + 60 days lead time (operator + composer).

**Phase 2 done means:** v1.0-rc1 bump. Diplomacy panel real. a11y blockers closed. Officers feel like people. Soundscape commissioned (real assets arriving Phase 4).

---

## PHASE 3 — Memorable (Weeks 10–12)

Goal: make the endgame moments memorable enough to drive word-of-mouth. CK3 sells on the dynasty close; AWWV's verdict screen currently is a stat table.

### Track I — Cinematic Verdict

**Origin:** Rating #15. VerdictScreen exists per `v0.9.0` Pyrrhic scoring contract; presentation is screen-thin.

**Owner agents:** `ui-ux-developer` + `narrative-designer` + `game-designer`.

**Files:**
- Modify: `src/ui/map/components/VerdictScreen.tsx`
- Reference: `src/sim/endgame/cost_ledger.ts`, `compareToHistorical(...)`, `resolveCodexEssay(...)`
- Create: new components for the cinematic sequence

**Steps:**
1. **I1 — Dynasty-style summary card** (~3d): a single hero card with faction crest, final outcome class, Pyrrhic score, 1-sentence verdict.
2. **I2 — 3 best moments / 3 worst moments** (~4d): pulled from `turnSummaries` filtered by judgment packet `severe/critical`. Each is a Chronicle card with date, headline, and one-line consequence.
3. **I3 — Counterfactual divergence narrative** (~3d): reads `compareToHistorical(...)` output and renders the player's divergence from history as one paragraph: "Your war ended 18 weeks later than history. Srebrenica did not fall. Dayton produced a federal Bosnia."

**Acceptance criteria:**
- ✅ Verdict screen plays a 3-screen cinematic sequence (hero / moments / divergence).
- ✅ All data from existing Cost Ledger + historical baseline + turn summaries — no new sim authority.
- ✅ Rating #15 lifts from B+ to A−.

**Estimated effort:** ~10 person-days.

### Track J — Chronicle Chapter (LLM-assisted)

**Origin:** Rating #31. Chronicle reads as log, not story.

**Owner agents:** `narrative-designer` + `technical-architect` (LLM integration boundary) + `determinism-auditor` (must remain deterministic at run-time).

**Files:**
- Modify: `src/ui/map/components/chronicle/ChronicleOverlay.tsx` + `ChronicleSpine.tsx`
- Create: `src/ui/map/components/chronicle/ChapterView.tsx`
- Create: `src/scenario/chronicle_chapter_generation.ts` — session-boundary LLM call that takes Chronicle entries and emits a prose chapter; output is hashed and cached so re-renders are deterministic
- Modify: `docs/10_canon/Engine_Invariants_v0_9_0.md` — document the LLM-at-boundary, deterministic-at-runtime contract

**Steps:**
1. **J1 — Chapter generation boundary** (~5d): define when chapter generation fires (end-of-month? end-of-phase? user-triggered "save bookmark"?) and what inputs it consumes. Output is committed to save file so re-load is deterministic.
2. **J2 — Chapter view UI** (~5d): book-style page renderer with chapter headlines, generated prose, embedded Chronicle cards as inline figures.
3. **J3 — Prompt + template engineering** (~4d): author the LLM prompt that takes Chronicle entries and produces sober historian-style prose. `narrative-designer` owns voice; `historian` reviews for accuracy.

**Acceptance criteria:**
- ✅ Chapter view renders 1-paragraph chapters per month from existing Chronicle entries.
- ✅ Same save loaded twice produces byte-identical chapter text (determinism preserved via cache).
- ✅ Rating #31 lifts from B to B+.

**Estimated effort:** ~14 person-days.

**Phase 3 done means:** v1.0-rc2 bump. Endgame and Chronicle feel like a Paradox dynasty close. Game produces shareable moments.

---

## PHASE 4 — Ship (Weeks 13–16+)

Goal: integrate soundscape (assets arrive ~end of Phase 3), localize to BCS, build the press kit + Steam page, and clear v1.0 gold gate per `2026-04-30-v1-gold-readiness-integration-plan.md`.

### Track K — Soundscape integration

**Files:**
- Modify: `src/ui/audio/AudioBus.ts` (real backend implementation)
- Add: `data/audio/` (or asset CDN) — composer-delivered files
- Modify: `src/ui/map/components/SettingsScreen.tsx` — audio sliders (master, music, ambient, SFX)

**Steps:**
1. **K1** receive composer deliverables; QA against brief.
2. **K2** wire real assets to `AudioBus` hooks placed in Phase 2.
3. **K3** ship settings UI for audio control.
4. **K4** sensitive-history audio review — no glorification of violence, no national anthems, no inflammatory cues per `SENSITIVE_HISTORY_DESIGN_GATE`.

**Acceptance:** main theme plays on title; ambient bed shifts per faction × phase × exhaustion; UI cues fire on canonical events; sensitive-history sign-off recorded; rating #33 lifts to C+ minimum.

**Estimated effort:** ~14 person-days.

### Track L — Localization to BCS

**Origin:** Rating #41 (currently F; roadmap defers to v1.1 "Mother Tongue"). **Recommend bringing forward to v1.0** — the Bosnian War without BCS is a credibility cap that defeats the launch narrative.

**Owner:** External translator (operator-owned) + i18n engineering.

**Files:**
- Create: i18n framework wiring (`react-intl`/`i18next`) across `src/ui/map/`, `src/ui/warroom/`
- Extract: every player-facing string into a translation memory
- Add: language picker in Settings
- Translate: BCS pass (Latin script; Cyrillic optional)

**Acceptance:** language picker offers EN/BCS; switching language re-renders all chrome and content; rating #41 lifts from F to B-.

**Estimated effort:** ~60 person-days first language. **OPTIONAL for v1.0 — if dropped, must explicitly own as v1.1.0 launch with date.**

### Track M — Marketing / press kit / store

**Origin:** Rating #43, #45. Operator-owned.

**Items (operator delivers):**
- 1 announce trailer (~2 min)
- 1 deep-dive dev video per major system
- 8 press screenshots (hero, faction, map mode, warroom, verdict, chronicle, ops, sensitive-history handling)
- High Concept one-pager (per canon-vs-industry audit Option A)
- Steam page + Steamworks integration
- Press kit (presskit() format)
- Discord / forum

**Acceptance:** Steam page live; press kit live at `pyrrhicgames.com/awwv/press`; trailer published; 5+ reviewer outreach completed.

**Estimated effort:** ~30 operator-days + ~5 engineering days for Steamworks.

### Track N — v1.0 gold gate execution

Per `docs/plans/2026-04-30-v1-gold-readiness-integration-plan.md` — Tasks 1–4: build gold gate matrix, define release-candidate proof bar, first-session product proof, release content freeze.

### Track O — Launch day

- Tag `v1.0.0`. Push.
- Publish trailer + Steam page goes live.
- Send press kit to reviewer list.
- Post launch announcement.
- Monitor Sentry / crash reporter (Track O depends on Track P below).

### Track P (bonus / parallel) — Telemetry + crash reporter

**Origin:** Rating #39 (C+). Required for sane post-launch ops.

**Files:** Sentry SDK wiring + opt-in analytics + privacy policy.

**Acceptance:** anonymized opt-in telemetry; crashes auto-report; player-controlled.

**Estimated effort:** ~14 person-days. **Required for v1.0 launch.**

**Phase 4 done means:** **v1.0.0 Gold.** Game ships. Press has it. Players can play in BCS or English. Soundscape integrates. Telemetry covers launch.

---

## Sequencing / dependency graph

```
PHASE 0  (Week 1)
 ├─ A0  Paramilitary inbox  ──┐
 └─ B   GUI polish (10 subs)  │
                              ↓
PHASE 1  (Weeks 2–5)        v0.9.8-alpha
 ├─ C1–C4 Map info design ──┐
 └─ D1–D4 Onboarding        │  (D9 overlaps with B9; coordinate)
                            ↓
PHASE 2  (Weeks 6–9)       v0.9.9-alpha
 ├─ E   Diplomacy        ──┐
 ├─ F   a11y P0 close      │
 ├─ G   Officer character  │
 └─ H   Soundscape kickoff │  (60d composer lead — runs into Phase 4)
                            ↓
PHASE 3  (Weeks 10–12)     v1.0-rc1
 ├─ I   Cinematic Verdict ──┐
 └─ J   Chronicle Chapter   │
                            ↓
PHASE 4  (Weeks 13–16+)    v1.0-rc2
 ├─ K   Soundscape integration (consumes Phase 2 H)
 ├─ L   Localization to BCS  (OPTIONAL v1.0 / DEFAULT v1.1)
 ├─ M   Marketing / press kit (operator)
 ├─ N   v1.0 gold gate execution
 ├─ O   Launch day
 └─ P   Telemetry + crash reporter
                            ↓
                          v1.0.0 GOLD
```

**Total person-days (eng + content + composer + translator + operator):** ~280
**With 5-way parallelism:** ~3 calendar months
**Hard gates:** A0 must close before any "shippable" claim; v0.9.5 clean-VM cosmetic finalization remains operator-only (parallel to all phases).

---

## Acceptance — Done Means (whole-plan level)

This plan is DONE when:

1. ✅ All 15 tracks have RESOLVED or DEFERRED-WITH-REASON status.
2. ✅ `GAME_STATE_RATING_MASTER.md` aggregate lifts from B+ to A or better.
3. ✅ Each category in the rating averages A− minimum (no category below B+).
4. ✅ `2026-04-30-v1-gold-readiness-integration-plan.md` Tasks 1–4 closed with reports.
5. ✅ Sensitive-history Inbox audit (Track A0 step 2) confirms zero hidden engine-decision families remain.
6. ✅ First-session product proof report classifies every confusion point.
7. ✅ Strategic Design Council audit findings 1/2/3 from §2.2 marked RESOLVED.
8. ✅ Playwright visual regression suite covers ≥8 hero screens.
9. ✅ Smoke triad clean (`tsc --noEmit` + `vitest run` + `desktop:map:build`) at v1.0 tag.
10. ✅ v1.0.0 tag pushed; Steam page live; press kit live; trailer published.

---

## Open design questions (must resolve before relevant track starts)

1. **Q-PARAMILITARY-COPY** (Track A0): Exact decision copy for paramilitary deployment cards. Owner: `historian` + `narrative-designer` + user §6 sign-off.
2. **Q-CRT-OVERLAY** (Track B8): Drop the CRT scanlines in OOBSidebar entirely, or scope to one narrow surface? Owner: user (aesthetic call).
3. **Q-FRONT-STABILITY-VISUAL** (Track C2): Which of dashed-pulse / wavy / solid maps to fluid / oscillating / static, and at what threshold? Owner: `game-designer` + `graphics-programmer`.
4. **Q-CHAPTER-BOUNDARY** (Track J1): Generate Chronicle chapters at end-of-month, end-of-phase, or user-triggered bookmark? Owner: user + `narrative-designer`.
5. **Q-BCS-IN-V1.0** (Track L): Bring localization into v1.0, or hold to v1.1? Owner: user (publishing call). Default = v1.1.
6. **Q-AUDIO-SCOPE** (Track H1): Is full degradation arc (v1.3 "The Silence" design) committed for v1.0, or just baseline ambient + UI feedback? Owner: user + composer.
7. **Q-CINEMATIC-BUDGET** (Track I): Pure CSS/React, or commission video stinger backgrounds? Owner: user.

---

## Risks / stop conditions

This plan stops or reroutes if any of:

- **R1** — Track A0 audit (Step 2) finds **multiple** hidden engine-decision families, not just paramilitary. Treat as a v0.9.7-band emergency, not as Phase 0 polish.
- **R2** — Strategic Design Council Track C lands and 40w calibration hash drifts. Roll back, re-derive the data layer without sim-path touch.
- **R3** — Soundscape composer delivery slips > 2 weeks past Phase 4 start. Decide: hold v1.0 for audio, or ship silent with v1.0.1 audio patch.
- **R4** — Localization translator quality is below historian bar. Ship EN-only at v1.0; commit to v1.1 with named translator.
- **R5** — v0.9.5 clean-VM cosmetic items become real blockers (SmartScreen UX, %APPDATA% persistence). Owner picks them up as operator work before Phase 4.

---

## Owner / dispatch responsibilities

Per `docs/plans/2026-05-01-autonomous-parallel-workstreams-operating-plan.md`:

- **Orchestrator (Claude):** coordinates per-track dispatch; reports phase progress; opens this plan's sub-reports as work happens; never executes directly.
- **Per-track owner agents:** named above per track.
- **User retains:**
  - All sensitive-history sign-off (Track A0, Track G traits, Track K audio review).
  - All §6 design-meaning decisions.
  - Publishing / commercial calls (Track L, Track M).
  - CRT overlay and visual identity calls (B8).
- **Operator-owned (non-engineering):** composer brief + delivery (H1, K), translator engagement (L), Steam page + trailer + press kit (M), Discord / forum / outreach.

---

## Roadmap integration

This plan integrates into `docs/plans/MASTER_ROADMAP.md`:
- Listed in the `Key Plan Documents` table.
- Referenced from the `Path to v1.0` section as the **cross-milestone shipping path**.
- A 2026-05-16 hardening board note marks plan acceptance.

This plan is the **execution answer** to the rating in `docs/40_reports/GAME_STATE_RATING_MASTER.md`. Update both when grades shift.

---

**End of plan. Status: AUTHORED 2026-05-16, AWAITING USER ACCEPTANCE before Phase 0 dispatch.**
