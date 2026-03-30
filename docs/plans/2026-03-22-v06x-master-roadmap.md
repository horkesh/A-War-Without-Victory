> **SUPERSEDED** — This document was the v0.6.x roadmap. It has been superseded by [`docs/plans/MASTER_ROADMAP.md`](MASTER_ROADMAP.md) as of 2026-03-30. Do not update this file.

---

# v0.6.x Master Roadmap — The Political War

**Date:** 2026-03-22
**Status:** APPROVED — single source of truth for v0.6.x
**Owner:** Orchestrator
**Deputy:** Product Manager
**Baseline:** v0.5.4, 92.8% area-weighted ATH, 1261 tests, 106 suites

---

## Supersedes

These plan files are now **SUPERSEDED** by this document:
- `2026-03-16-v0.6.0-full-historical-event-set.md` — absorbed into Track A
- `2026-03-16-v0.6.1-balance-calibration-framework.md` — preserved, minor additions
- `2026-03-16-v0.6.2-campaign-structure-achievements.md` — partially absorbed into event metagame
- `2026-03-16-v0.6.3-ai-dynamic-content.md` — partially absorbed into bot decision logic

These plan files remain **ACTIVE** and feed into this roadmap:
- `2026-03-21-emergent-event-system-design.md` — full event system design spec
- `2026-03-22-army-hq-nerve-center-roadmap.md` — HQ UI phases 3-5
- `2026-03-16-v0.6.4-historical-essays.md` — unchanged

---

## Vision

v0.6.x transforms AWWV from a military simulation into a **political wargame**. The map is where brigades fight; the events are where the war is won or lost. The player is the unnamed wartime political leader — making strategic decisions, managing alliances, navigating international pressure, and arriving at Dayton with the consequences of every choice they made.

Two parallel tracks deliver this:

| Track | Focus | Character |
|-------|-------|-----------|
| **Track A: The Metagame** | Emergent event engine, strategic dimensions, flags, pressure system, ahistorical branching, 1992-1995 event migration | Engine work — nightshift-heavy |
| **Track B: The Command Center** | Army HQ Phases 3-5, event decision UI, Dayton modal integration, intelligence polish | UI work — mixed day/night |

The tracks are mostly independent. They converge at two points:
1. **Event decision UI** — Track B displays Track A's decision events in the HQ
2. **Dayton synthesis** — Track B's Dayton modal reads Track A's flags + dimensions

---

## Milestone Overview

| Milestone | Name | Track A (Engine) | Track B (UI) | Gate |
|-----------|------|-----------------|--------------|------|
| **v0.6.0-alpha** | Event Infrastructure | Pressure system, dimensions, flags, conditions, queue, bot logic, constraint bus | HQ Phase 3: Player Actions | tsc + vitest + 40w run |
| **v0.6.0-beta** | 1992 Migration | Migrate 18 events, 3 foundational decisions, integration fixes | HQ Phase 3.5: Intelligence Polish | Calibration within 2pp of ATH |
| **v0.6.0** | First Playable Metagame | Merge: event decisions in HQ, full 1992 metagame loop | Event decision display, notification UI | War-or-Game sign-off |
| **v0.6.1** | Calibration Framework | Event timing snapshots, ahistorical plausibility bounds | — | Automated regression suite |
| **v0.6.2** | 1993-1994 + Missing Dynamics | 22 events migrated, new dynamics, event chains | HQ Phase 4: Deep Drill-Down | Calibration pass |
| **v0.6.3** | 1995 Endgame + Dayton | All 1995 rebuilt emergent, Dayton synthesis | HQ Phase 5: Staff Map, Dayton modal integration | Full calibration, all 3 tiers |
| **v0.6.4** | Historical Essays | — | Essay display in Codex | Content complete |

---

## v0.6.0-alpha — Event Infrastructure + HQ Player Actions

### Track A: Event Infrastructure

**Goal:** Build the engine foundation that all events will run on. No event content yet (except wiring the existing aggression stub).

**Deliverables:**

| Component | Spec Reference | Notes |
|-----------|---------------|-------|
| Pressure system | Design spec §5 | `event_readiness` on state, per-turn increment/decay, threshold firing |
| Unified strategic dimensions | Design spec §14.1 | Replace `NegotiationCapital` with hybrid `base_value + event_modifier`. Migrate `compute_capital.ts`. Update all consumers. |
| Event flags | Design spec §7.1 | `event_flags` on state, `flag_equals` condition type |
| Expanded condition evaluator | Design spec §4.3 | ~15 new condition types (supply, corridor, territory%, dimension, flag, etc.) |
| Event queue with cap | Design spec §11 | Max 3/turn, overflow to next turn, priority sorting |
| Recurrence model | Design spec §6 | `max_fires`, `cooldown_turns`, `escalation` on EventDefinition |
| TurnIncidents collection | Design spec §13.4 | Battles, OSID flips, dissolutions, op completions collected per turn |
| Bot decision logic v1 | Design spec §10 | Personality-weighted scoring replaces placeholder `pickBotResponse` |
| Event constraint bus | Design spec §14.2, Layers A+B | Wire `event_aggression_modifiers` (broken stub). Add `event_constraints` state (operation blocks, doctrine overrides, scope restrictions). Add bot AI check points. |
| Patron system reconciliation | Design spec §14.5 | `patron_confidence` dimension replaces `support_level`. `override_authority` becomes derived. |
| Dead code removal | Design spec §15.6 | Kill `narrative`-only effect path, dead `siege_active`/`operation_completed` handlers |

**Tests:** Unit tests for every new condition type. Pressure system tests (increment, decay, threshold, modifier). Dimension hybrid tests (base + modifier = effective). Constraint bus tests (operation block respected by bot AI). Event queue cap tests.

**Done gate:** `tsc --noEmit` + `vitest run` + 40w scenario produces same results as baseline (infrastructure is inert until events use it).

### Track B: HQ Phase 3 — Player Actions

**Source:** Army HQ Nerve Center Roadmap, Phase 3

**Goal:** The HQ becomes a command center. Intelligence panels (Phase 2.5, complete) show what needs attention; this phase lets the player act.

**Deliverables:**

| Feature | IPC | Notes |
|---------|-----|-------|
| Replace corps commander | `forceReplaceCorpsCommander` (new) | InlineOfficerPicker in corps card |
| Change corps stance | `stageCorpsStanceOrder` (existing) | Already wired |
| Change sector stance | `stageSectorStanceOrder` (existing) | Dropdown per sector in SectorsSection |
| Force launch operation | `forceOperationLaunch` (existing) | Button on ops awaiting GO/NO-GO |
| Stand down operation | `standDownOperation` (existing) | Button on stalled ops |
| Quick stance sweep | New army-level action | "Set All Corps" dropdown |
| Officer dismissal | `dismissOfficer` (new) | Within CommanderSection |

**Zero engine/calibration changes.** All actions are state mutations via existing or simple new IPC handlers.

**Done gate:** Player can command army from HQ without returning to map. Smoke-test triad passes.

---

## v0.6.0-beta — 1992 Event Migration + Intelligence Polish

### Track A: 1992 Event Migration

**Goal:** Replace all 18 1992 events with new-system equivalents. Add 3 foundational decisions. Add ~3-5 new events for missing dynamics.

**Deliverables:**

| Work | Count | Notes |
|------|-------|-------|
| Cut wallpaper events | 4 | un_convoys, bihac_isolation, posavina_corridor_fighting, (1 more TBD) |
| Rewrite calendar → emergent | 10 | sarajevo_siege (BFS), srebrenica_enclave (BFS), drina_cleansing (territory%), mostar_liberation (condition), etc. |
| Tweak existing | 4 | Barracks events (add dimensions, convert to decisions), jajce (mutual blame), corridor (strengthen) |
| RS foundational: Six Strategic Goals | 1 | ICTY research: Karadzic judgment. 3 options. Sets `rs_strategic_goals` flag + scope restrictions. |
| RBiH foundational: State Identity | 1 | ICTY research: Presidency platform. 3 options. Sets `rbih_state_identity` flag + recruitment modifiers. |
| HRHB foundational: Political Goal | 1 | 3 options. Sets `hrhb_political_goal` flag. "United Front" blocks Croat-Bosniak war chain. |
| New: Drina cleansing (RS decision) | 1 | Condition: RS territory in Drina > threshold. RS player chooses intensity. |
| New: Camp revelations (RS decision) | 1 | Condition: Prijedor controlled + war_crimes_above. RS player: deny/obstruct/cooperate. |

**ICTY research required:** Karadzic Trial Judgment (2016) §Strategic Goals. Presidency platform (May 1992). Web research via /historian.

**Calibration:**
- Tier 1: 40w run, compare to painted control. Target: within 2pp of 92.8%.
- Tier 2: event timing snapshot — key events fire within expected windows.
- Tier 3: run each ahistorical path once, check plausibility bounds.
- War-or-Game sign-off.

### Track B: HQ Phase 3.5 — Intelligence Polish

**Source:** Army HQ Nerve Center Roadmap, Phase 3.5

**Deliverables:**
- Chief of Staff briefing (Haiku-generated, personality-driven, cached per turn)
- Strategic Situation Dashboard (icon + value + delta cards)
- Dispatches & Field Reports section
- CoS fallback when no API key

**Dependencies:** Haiku API access for CoS briefing (graceful degradation if unavailable).

**Done gate:** HQ intelligence panels feel like briefings, not dashboards.

---

## v0.6.0 — First Playable Metagame (merge point)

### Convergence: Event Decisions in HQ

**Goal:** Track A's decision events display inside Track B's Army HQ. The player receives political decisions in their command center.

**Deliverables:**

| Feature | Notes |
|---------|-------|
| Event decision display in HQ | Pending decisions appear as priority briefing items in Situation Briefing (already built). Click → expand to full decision modal with options. |
| Decision consequence preview | Each option shows dimension shifts and flag changes in plain language ("International standing -20", "Restricts future operations to corridor") |
| Notification events | Slide-in panel (auto-dismiss after 5s) for consequence/forced events. Logged in event history. |
| Event history log | Collapsible sidebar or tab showing last 8-10 events with category icons + titles. Click to re-read. |
| Pressure indicators | "Tensions rising" warnings on relevant corps cards or in Situation Briefing when event readiness > 50% of threshold. |

### UI Chrome Redesign (v0.6.0 merge)

| Feature | Notes |
|---------|-------|
| Presidential Toolbar | Army crest center (→ Army HQ), date left, advance turn right. ~5 elements. Dev strip below in dev mode. |
| Bottom strip cleanup | 4-5 map modes + territory % (player faction prominent + trend arrows, others compact) + faction-contextual indicator (alliance or patron pressure). Layer toggles behind gear icon. |
| Command Briefing compact | Frosted glass strip under toolbar with dark pills per item. Red title, dismiss button. |
| Strategic Position bars | 6 dimension bars replace StatRow in Army HQ (DONE). |

### Operation Detail Redesign (v0.6.0 merge)

| Feature | Notes |
|---------|-------|
| Commander SITREP | Typewriter-style situation report from op commander: status, timeline, force assessment, enemy situation, recommendation, projected outcome. Same visual treatment as G2 NarrativeTab. Pure function from game state. |
| Halt / Force-Launch buttons | Player can stop or force-launch operations from OperationDetail (IPC exists, just missing UI buttons). |
| Commander personality in reports | Aggressive commanders recommend pressing the attack; cautious ones recommend abort. Uses existing aggressiveness/competence scores. |

Design spec: `docs/plans/2026-03-22-operation-detail-redesign.md`

### Game Timeline (v0.6.0 merge or v0.6.2)

War chronicle showing the story of THIS war — decisions, consequences, dimension shifts, operations, peace plans. Vertical spine like settlement timeline but at game level. See `docs/plans/2026-03-22-game-timeline-design-notes.md`.

**Done gate:** Player can play through 1992 (first 40 weeks) experiencing the full metagame loop — foundational decision at w1-2, emergent events through w4-40, dimension shifts visible, flags set, consequences arriving. Operations feel like presidential briefings. War-or-Game sign-off on the experience.

---

## v0.6.1 — Calibration Framework

**Mostly unchanged from original plan.** Now includes event-specific tooling:

| Deliverable | Notes |
|-------------|-------|
| Automated benchmark suite | Per-faction, per-scenario acceptance criteria |
| Regression detection | Diff against frozen baseline |
| Event timing snapshot tests | Assert key events fire within expected windows (Design spec §14.4, Tier 2) |
| Ahistorical plausibility bounds | Defined per foundational branch (Design spec §14.4, Tier 3) |
| Calibration freeze protocol | After v0.6.1, any sim-affecting change needs regression check |
| `npm run calibrate:40w` convenience script | Run + compare + report in one command |

**Done gate:** `npm run calibrate:40w` produces a pass/fail report. Baseline frozen.

---

## v0.6.2 — 1993-1994 Events + Missing Dynamics + HQ Deep Drill

### Track A: 1993-1994 Event Migration + New Dynamics

**Deliverables:**

| Work | Count |
|------|-------|
| Migrate 1993 events | 13 → 11 (cut 2, rewrite 9, tweak 2) |
| Migrate 1994 events | 9 → 8 (cut 1, rewrite 8) |
| New effect types | `doctrine_override`, `disable_operations`, `scope_restriction`, `spawn_formation`, `truce_action`, `supply_route_modifier` (Design spec §14.2, Layer C) |
| Incident-based triggers | Battles, OSID flips, operation outcomes feed into conditions |
| Event chain system | `enables_events` + `requires_enabled` (Design spec §13.1) |
| Embargo system | Standing constraint, not one-shot. Continuous supply impact. |
| Sarajevo tunnel | Fires after N turns of siege. Supply trickle. |
| Milosevic-Pale split | RS war_crimes accumulation → Belgrade distancing |
| Serbia embargo on RS | Massive supply hit, fires from Milosevic split |
| UNPROFOR hostage-taking | RS response option to NATO strikes |
| Abdic secession chain | Recurring with deterioration. Bihac isolation + supply crisis. |
| ICTY research | Prlic et al. (HRHB), Blaskic (Ahmici), Karadzic (camps, Drina) |

**Calibration:** Tier 1 + Tier 2 regression. War-or-Game sign-off.

### Track B: HQ Phase 4 — Deep Drill-Down

**Source:** Army HQ Nerve Center Roadmap, Phase 4

**Deliverables:**
- Brigade sub-card expansion (stats, history, equipment)
- Operation sub-card expansion (axes, objectives, per-brigade status)
- Sector sub-card expansion (positions, battles, intel)
- ArmyDetail.tsx retirement (all functionality in HQ)
- Operation readiness composite indicator

### Track B addition: Game Chronicle (Living Timeline)

**Design spec:** `docs/plans/2026-03-22-game-chronicle-design.md`

The Chronicle is the story of YOUR war — a vertical spine timeline weaving military, political, humanitarian, diplomatic, and narrative threads. Transcends the Two Rooms metaphor (not Army HQ, not Warroom — its own top-level feature).

**Deliverables:**
- `ChronicleOverlay.tsx` — full-screen overlay with spine renderer
- `ChronicleSpine.tsx` — multi-layered ribbon (territory bands, casualty line, supply line)
- `ChronicleCard.tsx` — 6 card types (Combat/Political/Humanitarian/Military/Diplomatic/Narrative)
- `generateChronicleEntries()` — pure function reading all 20 engine data sources
- Toolbar CHRONICLE button + clickable date label + `C` keyboard shortcut
- Significance filtering (not every battle — only territory flips, major casualties, decisions)
- Minimal engine addition: `territory_snapshot` + `supply_snapshot` per-turn on TurnSummary (~10 lines)

**Absorbed from old v0.6.2 (Campaign Structure & Achievements):**
- Campaign statistics module → folded into Chronicle data + Wrapped slides
- Achievement registry (12+ achievements computed from game state) → Wrapped slide content
- Save metadata

**Done gate:** Chronicle opens from toolbar, shows full war history as scrollable spine with cards. All 6 card types rendering. Spine ribbon shows territory/casualty/supply trends.

---

## v0.6.3 — 1995 Endgame + Dayton Synthesis + Staff Map (major convergence)

### Track A: 1995 Event Rebuild + Dayton

**The capstone.** Every 1995 event rebuilt as emergent. Dayton synthesizes the full metagame.

**Deliverables:**

| Work | Notes |
|------|-------|
| Rebuild ALL 1995 events | Zero calendar rails. Srebrenica falls ONLY if VRS captures it. Deliberate Force ONLY if pressure threshold crossed. ~15 events. |
| New 1995 events | Serbia embargo consequences, ICTY indictments (Karadzic/Mladic), Bihac relief, Krajina collapse, Croatian rearmament. |
| Endgame chain | Srebrenica → Deliberate Force → Federation offensive → Ceasefire → Dayton. All condition-gated. |
| Dayton synthesis (Design spec §14.3) | Dimensions → capital budget. Flags → territorial packages (e.g., `srebrenica_assault: 'declined'` → Srebrenica corridor package). Bot responses from disposition profiles × current dimensions. |
| Dayton detailed design doc | Separate document at this stage specifying exact package/flag/dimension mappings. |
| Player-initiated decisions | AGEOD-style "play this card when ready" for select events. |
| ICTY research | Krstic (Srebrenica), Mladic (command responsibility), Tolimir (Zepa) |

### Track B: HQ Phase 5 — Staff Map + Surrounding UI

**Source:** Army HQ Nerve Center Roadmap, Phase 5

**Deliverables:**
- Staff Situation Map (canvas 2D, not MapLibre)
- Territory shading, corps boundaries, front lines, operation arrows, threat zones, enclave markers
- Interactive: hover → highlight, click → detail
- CorpsFrontPanel interior theme
- Keyboard shortcut system (1-5 for corps, Tab to cycle)

### Track B addition: Chronicle Wrapped (Game End Experience)

**Design spec:** `docs/plans/2026-03-22-game-chronicle-design.md` §Wrapped

"Spotify Wrapped for your war." A 10-slide cinematic reveal at game end:
1. Your War (faction, weeks, verdict)
2. The Opening (foundational decision, early territory)
3. Your Bloodiest Week (max casualties turn)
4. The Brigade That Wouldn't Die (most decorated/resilient unit)
5. What You Built (peak territory, peak personnel, ops launched)
6. What It Cost (total casualties all factions, displacement, civilian toll)
7. The World Was Watching (international standing trajectory, war crimes)
8. Your Decisions (3-5 event choices with largest dimension impact)
9. At The Table (Dayton capital, packages won/lost, final split)
10. Another Such Victory (spider chart, pyrrhic score, historical comparison)

Post-reveal: Chronicle annotated with "turning point" gold markers at Wrapped-identified moments.

**Deliverables:** `WrappedOverlay.tsx`, `WrappedSlide.tsx` (10 variants), `SpiderChart.tsx`, `generateWrappedSlides()`.

### Track B: Dayton Modal Integration

**Convergence point.** The existing Dayton modal is retrofitted to read the new system:

| Integration | Notes |
|-------------|-------|
| Capital budget from `negotiating_leverage` dimension | Replaces old computation |
| Territorial packages from event flags | Flag-specific packages appear/disappear |
| Institutional choices from dimension state | Options weighted by `internal_cohesion`, `patron_confidence` |
| Bot responses from disposition profiles | State-sensitive accept/reject |
| Patron override from derived `override_authority` | Uses new `patron_confidence` dimension |

### Track B: Event Decision UI polish

- Notification vs decision visual distinction (border/glow treatment)
- Event log sidebar (last 8-10 events, category icons, expandable)
- Pressure visibility refined ("Strategic Assessment: NATO intervention risk ELEVATED")
- Event validation tool (`npm run validate:events`)

**Done gate:** Full 52-week game playable with complete metagame loop. Every choice from w1 flows through to Dayton. War-or-Game sign-off on the experience. Full 3-tier calibration pass.

---

## v0.6.4 — Historical Essays

**Unchanged from original plan.**

- 100 essays, 500 words each
- Sonnet-generated at development time, baked into binary
- Essays unlock when player experiences corresponding event
- Cost: ~$5-10 for generation
- No runtime API calls
- Display in Codex (already built in v0.5.2)

**Done gate:** All essays generated, reviewed, integrated. Codex displays them after event unlock.

---

## Cross-Track Dependencies

```
Track A (Engine)                    Track B (UI)
─────────────────                   ─────────────
v0.6.0-alpha                        v0.6.0-alpha
  Event infrastructure                HQ Phase 3: Player Actions
  (independent)                       (independent)
       │                                   │
v0.6.0-beta                         v0.6.0-beta
  1992 event migration                HQ Phase 3.5: Intel Polish
  (independent)                       (independent)
       │                                   │
       └──────────┐    ┌──────────────────┘
                  v│    │v
              v0.6.0 MERGE
              Event decisions in HQ
              Notification UI
              Pressure indicators
                     │
              v0.6.1 (solo)
              Calibration framework
                     │
       ┌─────────────┴─────────────┐
       │                           │
v0.6.2                        v0.6.2
  1993-1994 migration          HQ Phase 4 + Campaign Stats
  (independent)                (independent)
       │                           │
       └──────────┐    ┌──────────┘
                  v│    │v
              v0.6.3 MERGE
              1995 endgame events
              Dayton synthesis
              HQ Phase 5: Staff Map
                     │
              v0.6.4 (solo)
              Historical essays
```

**Key insight:** Tracks A and B can be worked in parallel by different sessions (or the same session alternating). They only MUST converge at v0.6.0 and v0.6.3. Everything else is independent.

---

## Nightshift Execution Model

| Phase | Nightshift Work | Day Session Work |
|-------|----------------|------------------|
| **v0.6.0-alpha** | Track A: build all infrastructure. Track B: wire IPC handlers for HQ Phase 3. | Brainstorm, review, ICTY research |
| **v0.6.0-beta** | Track A: migrate events (mechanical work). Track B: HQ Phase 3.5 UI. | ICTY research for foundational decisions. Review event content. |
| **v0.6.0 merge** | Wire event decisions into HQ. Notification UI. | Playtest the metagame loop. War-or-Game review. |
| **v0.6.1** | Build calibration tooling. | Define plausibility bounds for ahistorical paths. |
| **v0.6.2** | Track A: migrate 1993-1994. Track B: HQ Phase 4. | ICTY research (Prlic, Blaskic). Review events. |
| **v0.6.3** | Track A: rebuild 1995. Track B: HQ Phase 5 + Dayton integration. | Dayton design doc. Playtest endgame. |
| **v0.6.4** | Generate essays via Sonnet. | Review and approve essays. |

---

## Estimated Timeline

Not providing time estimates per CLAUDE.md guidance. The sequencing is fixed; the pace depends on session availability and calibration iteration needs. Each milestone has clear done gates — ship when the gate passes, not when a calendar says.

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Calibration cascade from event migration | High | Pressure thresholds tuned so historical path fires at ~same turns. 2pp tolerance. Per-phase calibration. |
| ICTY research takes longer than expected | Medium | Foundational decisions are the priority. Other events can ship with BB-only citations first, ICTY added later. |
| Ahistorical paths produce degenerate outcomes | Medium | Plausibility bounds defined in v0.6.1. One validation run per branch. |
| Event constraint bus adds complexity to bot AI | Medium | Layer A (wire stub) is 5 lines. Layer B (constraint fields) is checked at 3 existing bot AI decision points. Layer C (new effects) deferred to v0.6.2. |
| Dimension/capital unification breaks Dayton modal | Low | Dayton modal currently reads 5 capital dimensions. Renaming to 6 dimensions with same structure is mechanical. |
| HQ Phase 3 discovers missing IPC handlers | Low | Existing handler patterns are well established. New handlers follow same pattern. |
| Event frequency annoys player | Medium | Hard cap 3/turn. Notifications auto-dismiss. Decision events block only when `requires_player_response`. |

---

## Success Criteria (v0.6.3 — full metagame)

When v0.6.3 ships, a player should be able to:

1. Start a game, receive the foundational decision for their faction, and understand that this choice shapes everything
2. Play through 52 weeks experiencing ~60 events (15-20 decisions, rest consequences/forced)
3. See their strategic dimensions shift based on their choices — and feel the consequences
4. Watch the Croat-Bosniak war emerge (or not) from their alliance management
5. Face Srebrenica as a genuine decision with genuine consequences (or never face it if VRS doesn't get there)
6. Arrive at Dayton with a hand shaped by every choice they made — territory, dimensions, flags
7. Understand that the player who won the map but lost the metagame gets a pyrrhic victory

**That is when v0.6.x is done.**

---

## The Two Rooms — Spatial UI Metaphor

The game has two physical spaces that map to two UI domains. The player (unnamed political leader) moves between them:

### The President's Office (Warroom)

The warroom is the president's desk. Wood paneling (RS), stucco walls (RBiH), stone arches (HRHB). Papers arrive: diplomatic cables, newspapers, international pressure reports, event decisions. The player makes **political decisions** here.

**Warroom owns (v0.7+ — React migration required):**
- Event decisions (political choices presented as documents on the desk)
- Event log / game timeline (history of your decisions and their consequences)
- Diplomacy / IVP breakdown (international pressure, patron relationships)
- Peace plans / Dayton negotiation
- Economy panel
- Newspaper / Magazine (flavor — already built as warroom modals)
- Settings / AI Commander config (pause menu overlay)

**Existing warroom modals (vanilla TS, `src/ui/warroom/components/`):**
- `CommandBriefingModal` — pre-war situation briefing
- `DeclarationEventModal` — dramatic Phase 0 events
- `DiplomacyModal` — patron status, alliance, ceasefires
- `IvpBreakdownModal` — international pressure breakdown
- `MagazineModal` — monthly operational review (every 4 turns)
- `NewspaperModal` — faction newspaper with headlines
- `OperationalSituationModal` — military situation overview
- `ReportsModal` — municipality intelligence reports
- `SettingsModal` — audio, system config

**Status:** Separate Vite app (vanilla TS + canvas). Cannot render React components. Migration to React deferred to v0.7+.

### The Command Center (Army HQ on War Map)

The player walks down the hall to meet the generals. Army HQ is the **military command center**. Everything the armed forces report to you lives here.

**Army HQ owns (v0.6.x — active development):**

| Tab | Content | Status |
|-----|---------|--------|
| **BRIEFING** | CoS brief (paper missive), situation briefing (card grid), corps cards (flip detail) | ✅ Built |
| **SUMMARY** | War Summary modal content: weekly after-action, territory changes, casualties, combat record | ✅ Absorbed `WarSummaryModal` |
| **RECORDS** | AAR (after-action reports), operation history, combat log | ✅ Absorbed `AARPanel`, `OperationHistoryPanel` |
| **PERSONNEL** | Recruitment, officer management, reserves, ORBAT overview | ✅ Absorbed `RecruitmentModal`, `OrbatPanel` |

**Header tabs** replace the current single-view layout. Each tab shows different content in the same full-screen modal. Corps cards remain accessible from all tabs via a persistent sidebar or bottom strip.

### Map-Contextual Panels (stay on the map, not modal)

These open in response to map clicks and stay as sidebar/overlay panels:
- `SelectionPanel` — click settlement/formation
- `CorpsFrontPanel` — click sector
- `OperationsPanel` — click operation on map
- `CommanderSelectionModal` — triggered by player action
- `OperationBriefingModal` — triggered by game event (GO/NO-GO)
- `GameOverModal` — triggered by endgame
- `EventDecisionModal` — triggered by event (stays on map until warroom absorbs it v0.7+)
- `EventModal` — narrative event display

### Orphan Audit (2026-03-22)

When `PresidentialToolbar` replaced `TopToolbar`, these modals lost their entry points:

| Modal | Old Entry | New Home | When |
|-------|-----------|----------|------|
| `WarSummaryModal` | SUMMARY button + IVP/Convoys/Briefing shortcuts | Army HQ → SUMMARY tab | v0.6.x Phase 3.5 |
| `AARPanel` | AAR button in History module | Army HQ → RECORDS tab | v0.6.x Phase 4 |
| `OperationHistoryPanel` | OPS button in History module | Army HQ → RECORDS tab | v0.6.x Phase 4 |
| `EventLogPanel` | EVENTS button in History module | Warroom (political history) | v0.7+ |
| `AiSettingsPanel` | AI button in History module | Pause menu / Settings | v0.7+ |
| `RecruitmentModal` | RECRUIT button in Personnel module | Army HQ → PERSONNEL tab | v0.6.x Phase 4 |
| `EnclaveDashboard` | ENCLAVES button (conditional) | Army HQ → SupplyIntelligence link | v0.6.x Phase 3.5 |
| `EconomyPanel` | (was planned) | Warroom (political) | v0.7+ |
| `DiplomacyOverview` | (was planned) | Warroom (political) | v0.7+ |

**Interim (until absorption):** Add keyboard shortcuts for critical orphans:
- `S` → War Summary
- `R` → AAR
- `E` → Event Log

These shortcuts are temporary — removed once the modals are absorbed into Army HQ tabs or warroom.

---

## v0.7.x Additions (from v0.6.x design sessions)

### Warroom React Migration (v0.7+)

The warroom (`src/ui/warroom/`) is currently a separate Vite app (vanilla TS + canvas). The tactical map (React + Tailwind + MapLibre) is a secondary Electron window. Different tech stacks, different BrowserWindows, IPC bridge.

**v0.7+ scope:**
- Migrate warroom to React — unify tech stack with tactical map
- Single Electron window with smooth view transitions (warroom ↔ map ↔ Army HQ)
- Integrate metagame: dimensions, event decisions, game timeline, pressure indicators
- Absorb political modals: event log, diplomacy, economy, peace plans
- Preserve rich visual assets: 15 faction HQ backgrounds (year-specific), flags, newspaper/magazine
- Navigation: faction crest → warroom (political domain), army crest → Army HQ (military domain)
- Settings/AI config → pause menu overlay accessible from both rooms

**Design notes:** `docs/plans/2026-03-22-warroom-redesign-backlog.md`

### Toolbar (v0.6.0 merge — DONE)

Presidential Toolbar implemented:
- Center: floating army crest (extends below toolbar, click → Army HQ)
- Left: week/date display
- Right: advance turn button
- Flanking: contextual alert badges (pending decisions, pressure warnings, officer events)
- Dev tools: compact sub-strip in dev mode

Bottom strip:
- 4 primary map modes + MORE dropdown
- Player territory % prominent, others compact
- Faction-contextual indicator (alliance or patron confidence)
- LAYERS dropdown

### Command Autonomy Slider (v0.7+)

Player chooses how autonomous the military is (full delegation → maximum control). See `memory/player_identity_and_command.md`.

### Officer Defiance Events (v0.7+)

Commanders exceed or ignore political directives, triggering events. Depends on command autonomy and officer personality system.

### Localization — B/C/S + English (v0.8+)

Full multilingual support. Two languages at launch: **English** and **Bosnian/Croatian/Serbian** (B/C/S). Scope:
- i18n framework (react-intl or lightweight key-based system)
- Extract all UI strings to locale files (toolbar, HQ, panels, modals, briefings, tooltips)
- Event text (titles, descriptions, option labels) — locale key per event in JSON
- Dimension names, stance labels, officer ranks, formation names
- Historical essays and in-game documentation
- Language selector in settings/pause menu
- B/C/S uses Latin script (not Cyrillic) — standard for all three variants
- Consider: faction-specific B/C/S dialect flavor (Bosnian for RBiH, Serbian for RS, Croatian for HRHB) as optional polish

### Anthropic Developer Relations Pitch (after v0.6.3)

**Trigger:** Working AI Commander prototype where Claude-as-Mladić makes real strategic decisions in a full game.

**Prerequisites:**
1. v0.4.5 AI Commander infrastructure exists (`src/sim/ai_commander/`)
2. Complete one full AI-vs-formula game with compelling moments
3. Record 2-minute demo video ("watch Claude decide whether to reinforce Srebrenica or press Brčko")
4. Steam page live with wishlists accumulating

**What to ask (not money):**
- API credits for dev + early access (~$500–1,000)
- Case study opportunity (they write, we get exposure)
- Technical guidance on prompt caching + structured output
- Early access to new models

**The pitch:** "We built a historically calibrated Bosnian War simulation where Claude commands opposing armies with historically accurate personalities — the first strategy game where your enemy genuinely thinks."

**Full strategy:** `docs/30_planning/design/PRICING_AND_BUSINESS_MODEL.md` §Anthropic Partnership
**AI Commander design:** `docs/30_planning/design/CLAUDE_AI_COMMANDER_DESIGN.md`

---

## v0.7.x–v1.0 Roadmap Outline

VERSIONING.md defines the path to Gold. Current actual version: v0.5.4 (VERSIONING.md needs update from v0.3.1). Here's the outline with scope notes:

| Version | Name | Scope | Status |
|---------|------|-------|--------|
| **v0.6.x** | Content Complete Beta | Emergent events, metagame, Dayton, Army HQ | **Active** (this roadmap) |
| **v0.7.x** | Polish Beta | Warroom React migration, unified UI, command autonomy, officer defiance | Planned (design notes exist) |
| **v0.8.x** | Release Candidate | Localization (B/C/S + EN), tutorial/onboarding, performance optimization, accessibility | Planned (scope only) |
| **v0.9.x** | Gold Candidate | Platform packaging, Steam integration, achievements, final balance pass, QA | Not scoped |
| **v1.0.0** | Gold / Public Release | Feature-complete, fully polished, localized, playtested | Target |

### Unscoped items that need homes:

| Item | Natural Home | Notes |
|------|-------------|-------|
| Tutorial / onboarding | v0.8.x | How does a new player learn? Guided first 5 turns? |
| Steam integration | v0.9.x | Achievements, cloud saves, workshop? |
| Performance optimization | v0.8.x | 52-week scenario speed, map render, memory |
| Accessibility | v0.8.x | Colorblind modes, key remapping, screen reader basics |
| Modding support | v1.x+ | JSON event definitions already moddable; scenario editor? |
| Multiplayer | v2.0+ | Each player controls one faction; Claude fills others |
| AI Commander demo video | Before Anthropic pitch | 2-minute compelling moment |
| Steam page + capsule art | Before v0.8.x | Wishlists need time to accumulate |

---

## Integration Review (2026-03-22)

Cross-cutting concerns that span multiple milestones:

### 1. AI Commander + Event System
The AI Commander (v0.4.5 infra, partially built) and the emergent event system (v0.6.x) need to integrate:
- **Events affect AI behavior:** Event flags (e.g., `rs_strategic_goals: 'all_six'`) should influence Claude's strategic personality. The prompt builder needs flag awareness.
- **AI responds to events:** When an event fires for a bot faction, `pickBotResponseV1` handles it. When AI Commander is active, Claude should make the event decision instead.
- **Event constraint bus:** `operation_blocks` and `scope_restrictions` constrain bot AI. The AI Commander prompt must include active constraints.
- **Status:** Infrastructure exists separately. Integration point is the prompt builder reading event state.

### 2. Dayton Synthesis
v0.6.3 says "dimensions → capital budget, flags → territorial packages" but no design spec exists:
- How do 6 dimensions × 3 factions map to Dayton negotiating positions?
- How do event flags (e.g., `drina_cleansing_intensity: 'systematic'`) affect what's on the table?
- Is Dayton player-driven (you negotiate) or emergent (dimensions auto-resolve)?
- **Action needed:** Design spec before v0.6.3 implementation.

### 3. Warroom ↔ Events
Events fire on the map but the warroom is the President's Office:
- In v0.6.x: event decisions appear as map overlay modals
- In v0.7+: event decisions should appear as documents on the president's desk
- **The transition:** v0.6.x event decisions must be designed so they can later be re-skinned as warroom documents without logic changes. Keep decision logic separate from presentation.

### 4. Version Number Drift
VERSIONING.md says v0.3.1 but actual state is v0.5.4:
- v0.4.x milestones (Content Alpha) were completed but VERSIONING.md not updated
- v0.5.x milestones (Feature Complete Beta) partially completed
- **Action needed:** Update VERSIONING.md milestone tracking to match reality.
