# Roadmap to v1.0 — A War Without Victory

**Studio:** Pyrrhic Games
**Last Updated:** 2026-03-16
**Current Version:** v0.4.5 (AI Command Layer)

---

## Complete Version Map

Every milestone is pre-numbered. Implemented milestones are marked ✓ with their completion date.

| Version | Milestone | Status |
|---------|-----------|--------|
| **v0.1.0** | Proof of Concept | ✓ 2026-02 |
| **v0.2.0** | Core Engine | ✓ 2026-03-15 |
| **v0.3.0** | Playable Alpha | ✓ 2026-03-15 |
| **v0.3.1** | Endgame & Negotiation System | ✓ 2026-03-15 |
| **v0.3.2** | Humanitarian capital per-faction attribution fix | ✓ 2026-03-16 |
| **v0.3.3** | Brigade AoR sub-segment assignment | ✓ 2026-03-16 |
| **v0.4.0** | Peace Phase Interactivity | ✓ 2026-03-16 |
| **v0.4.1** | Complete Event System (41 events, decision events, UI) | ✓ 2026-03-16 |
| **v0.4.2** | Additional Scenarios (Sep 1991, Jan 1993 + selection screen) | ✓ 2026-03-16 (Phase 3 blocked) |
| **v0.4.3** | Economy & War Production | ✓ 2026-03-16 |
| **v0.4.4** | Officer Experience & Weight of Command | ✓ 2026-03-16 |
| **v0.4.5** | AI Command Layer (Army + Corps + Ops Planning AI) | ✓ 2026-03-16 |
| **v0.4.6** | Commander Override Layer (Strategic Intent) | PARTIAL (Phase A complete) |
| **v0.5.0** | Full Diplomatic System (Negotiations) | PLANNED |
| **v0.5.1** | UI Completion (all panels, modes, tooltips) | PLANNED |
| **v0.5.2** | Tutorial & Onboarding | PLANNED |
| **v0.5.3** | Audio (SFX + Music) | PLANNED |
| **v0.5.4** | AI Commander Full (all 3 armies + corps + advisor) | PLANNED |
| **v0.6.0** | Full Historical Event Set (1992-1995) | PLANNED |
| **v0.6.1** | Balance & Calibration (all factions, all scenarios) | PLANNED |
| **v0.6.2** | Campaign Structure & Achievements | PLANNED |
| **v0.6.3** | AI Dynamic Content (procedural events, peace negotiation dialogue) | PLANNED |
| **v0.6.4** | Historical Essays (AI-generated at dev time, shipped with game) | PLANNED |
| **v0.7.0** | Performance Optimization | PLANNED |
| **v0.7.1** | Accessibility (colorblind, keyboard, screen reader) | PLANNED |
| **v0.7.2** | Localization (BCS first, then English polish) | PLANNED |
| **v0.7.3** | Visual Polish (loading, transitions, art) | PLANNED |
| **v0.8.0** | External Playtesting (closed alpha) | PLANNED |
| **v0.8.1** | Final Balance from Playtest Feedback | PLANNED |
| **v0.8.2** | Platform Packaging (Win/Mac/Linux/Steam) | PLANNED |
| **v0.9.0** | Final QA Sweep | PLANNED |
| **v0.9.1** | Store Page, Press Kit, Community | PLANNED |
| **v1.0.0** | **GOLD — Ship it** | PLANNED |
| *v1.1.0* | *"Operation Corridor" — Posavina expansion* | POST-LAUNCH |
| *v1.2.0* | *"Autumn Leaves" — 1993-1994 deep content* | POST-LAUNCH |
| *v1.3.0* | *"Deliberate Force" — NATO intervention* | POST-LAUNCH |
| *v1.4.0* | *"The Hague" — war crimes consequences & moral choices* | POST-LAUNCH |
| *v1.5.0* | *AI Scenario Editor Assistant + Streaming Narrator* | POST-LAUNCH |

---

## Completed Milestones (Detail)

---

## v0.4 — Interactive Alpha

**Goal:** The game is genuinely interactive. Player makes meaningful decisions in both phases. The war ends for real reasons, not just a timer.

**Execution order (revised per cross-plan review):**
```
v0.3.2 → v0.3.3 → INFRASTRUCTURE → v0.4.0 → v0.4.1 → v0.4.2 → v0.4.3 → v0.4.4 → v0.4.5
```
Note: v0.4.4 (Officer Experience) and v0.4.5 (AI Commander) SWAPPED from original numbering. Officer experience implemented before AI Commander so Claude has the full officer picture. See `CROSS_PLAN_REVIEW_V04.md` for rationale.

Milestones are implemented via the night shift system when plans are ready and approved by day shift. Plans must comply with Pyrrhic Planning Rules (`docs/20_engineering/PYRRHIC_PLANNING_RULES.md`) and use the handoff template (`docs/20_engineering/NIGHTSHIFT_HANDOFF_TEMPLATE.md`). See `.claude/skills/nightshift/SKILL.md` for the autonomous execution protocol.

### Infrastructure (pre-v0.4.0)
- [ ] **`GlassPanel.tsx`** — shared glassmorphism panel component (position, title, width, onClose). Used by ALL subsequent panels (EconomyPanel, EventLogPanel, PeaceStatusPanel enhancement, friction log). Matches canonical ops-planning visual style.
- [ ] **`deterministic_random.ts`** — canonical utility for controlled pseudo-random: `deterministicRandom(seed, context) → number [0,1)`. Used by event system (random events), smuggling disruption, warlord friction. Same input = same output. Replay-safe.
- [ ] **`scenario_preseeding.ts`** — derives initial state from scenario start date: negotiation capital, patron override, officer experience, economy state. Shared by all scenario manifests. Avoids duplicating pre-seeding logic per scenario.
- [ ] **Command Briefing enhancement spec** — define the unified post-turn brief that aggregates military + economy + diplomacy + officer events. Cross-cutting deliverable, implemented incrementally with each v0.4.x milestone.

### 0.4.0 — Peace Phase Interactivity
- [ ] **Investment queue UI** — player allocates pre-war capital (Police/TO/Party/Paramilitary) to municipalities via modal. Cost preview, coordination toggle (RBiH+HRHB), undo/edit staged investments before turn commit.
- [ ] **Peace turn flow** — "End Turn" commits investments, runs 22-step peace pipeline, displays events. Turn report: capital spent, declarations, militia changes.
- [ ] **Peace map overlays** — political control colors + org-pen heat map during peace phase. Municipality click shows stability score, org-pen breakdown.
- [ ] **Peace→War transition screen** — dramatic "War Begins" modal: date, OOB summary, faction briefing, initial front overview. Smooth UI transition from peace panels to war panels.

### 0.4.1 — Complete Event System
- [ ] **Event engine** — `src/sim/events/`: event types (historical, random, decision), trigger conditions (turn, territory, exhaustion, alliance), effects (morale, supply, political, alliance). Deterministic evaluation.
- [ ] **Historical events** — 15-20 key events for 1992 (JNA withdrawal May 12, Sarajevo siege, Operation Corridor June, London Conference August, Vance-Owen January 1993). Each has narrative text, mechanical effect, and player response options where applicable.
- [ ] **Event UI** — newspaper-style modal or command briefing. Events queue when multiple fire same turn. Player acknowledges or chooses response.
- [ ] **Decision events** — player-initiated choices at key moments (accept/reject ceasefire proposals, commit reserves, break alliances). Consequences affect alliance, international pressure, morale.

### 0.4.2 — Additional Scenarios (1993, 1994, 1995 starts)
- [ ] **January 1993 start** — post-Corridor, Drina valley situation, Croat-Bosniak tensions rising.
- [ ] **March 1994 start** — post-Washington, joint RBiH-HVO operations, NATO involvement beginning.
- [ ] **January 1995 start** — endgame: Srebrenica → Storm → Dayton.
- [ ] **Scenario selection screen** — map-based scenario picker showing starting date, situation summary, difficulty rating per faction.

### 0.4.3 — Economy & War Production
- [ ] **War economy** — simple production system: each faction has industrial capacity (factories, workshops). Produces equipment replacement, ammunition. Capacity degrades from bombing/territory loss.
- [ ] **Smuggling & black market** — RBiH tunnel system (Sarajevo), smuggling routes. Player can invest in these. Affects enclave supply.
- [ ] **Equipment lifecycle** — weapons degrade over time, captured equipment has lower effectiveness, JNA inheritance pools deplete.

### 0.4.4 — Officer Experience & Weight of Command
- [ ] **Post-operation experience gain** — commanding officer gains competence from operations. Outcome scales gain (decisive > costly > stalemate). Skill shift toward combat type (offensive → aggressive, defensive → defensive specialist).
- [ ] **ARBiH learning curve** — militia/TO-origin officers gain 1.5× experience. Faction maturity thresholds (avg competence ≥ 2.0 → officer_quality base rises, ≥ 3.0 → cohesion recovery bonus). The transformation arc emerges organically.
- [ ] **RS brain drain** — departures via `available_until_turn`. Competence loss displayed prominently. Player feels institutional decay.
- [ ] **Warlord friction** — low `political_reliability` commanders occasionally ignore directives. Uses `deterministicRandom()`. Player tolerates (loses cohesion capital) or relieves (loses competence).
- [ ] **Commander relationship events** — posted through v0.4.1 event bus. Rivalry, mentorship, insubordination, heroic stand, defeatism. Feed into negotiation capital (political cohesion).
- [ ] **Capital integration** — officer maturity → military_effectiveness capital, friction count → political_cohesion capital.
- [ ] **Experience UI** — OfficerProfile progression bar, trend indicators, maturity in ArmyDetail.

### 0.4.5 — AI Command Layer (Army + Corps + Ops Planning AI)
Bundled: Army Commander + Corps Commander + Ops Planning AI share prompt builder, response parser, fallback system.
- [ ] **Army Commander AI** — all 3 factions (Mladić, Halilović/Delić, Petković) with historical personality prompts. Structured JSON output: corps directives, operation approvals, peace plan responses, strategic reasoning, briefing text. Multi-model: Opus for army decisions.
- [ ] **Corps Commander AI** — operational decisions from named officer personalities. Interprets army orders with judgment (cautious delays, aggressive rushes). Haiku for routine turns, Sonnet for operation planning.
- [ ] **Ops Planning AI** — when player opens ops planning modal, AI analyzes target/terrain/force/supply/intel. Generates commander's assessment, recommends force composition, axis, timing, warns about risks. ~$0.01-0.05 per plan (Haiku).
- [ ] **Player Advisor** — "Ask Commander" on-demand situation analysis. Top 3 recommendations displayed in briefing panel.
- [ ] **Shared infrastructure** — `src/sim/ai_commander/`: claude_client.ts, prompt_builder.ts, response_parser.ts, personality_profiles.ts, decision_log.ts, fallback.ts.
- [ ] **Decision logging** — all AI decisions saved for deterministic replay.
- [ ] **Formula bot fallback** — works offline without API key. Cadet Mode always available.
- [ ] **Multi-model routing** — Commander/Officer/Recruit/Cadet tiers. Player-selectable. BYOK or Pyrrhic Credits.
- [ ] **Reads ALL accumulated state** — territory, capital, events, economy, officers, friction, smuggling, production. Richest possible decision surface.

---

## v0.5 — Feature Complete Beta

**Goal:** All game systems exist and are integrated. A player can have a complete, meaningful experience from start to finish. No placeholder mechanics.

### 0.5.0 — Full Diplomatic System (Negotiations)
- [ ] **IVP (International Visibility Pressure)** — composite score from atrocities, media coverage, UN resolutions. Build on existing `patron_pressure.ts`.
- [ ] **International intervention thresholds** — NATO air strikes, safe areas, UNPROFOR mandate changes. Triggered by IVP milestones.
- [ ] **Sanctions/embargo formalization** — RS sanctions, RBiH arms embargo. Mechanical effects on supply and equipment.
- [ ] **Patron commitment curves** — historical support profiles exposed to UI.

### 0.5.1 — UI Completion
- [ ] **All panels finalized** — settlement detail, corps detail, army detail, sector management. No missing data, no placeholder text.
- [ ] **Operations Planning Modal Redesign** — Command Dashboard, Tactical Cards, Bezier Arrows, G-2 Forecast, Commander Integration.
- [ ] **All map modes polished** — 7 modes with proper legends, gradient scales, tooltips.
- [ ] **Warroom completion** — all faction HQ screens with clickable regions, situation overlays, briefing modals.
- [ ] **Menu system** — main menu, settings (graphics, audio, gameplay), credits, quit confirmation.
- [ ] **Settings persistence** — game settings saved to disk, restored on launch.

### 0.5.2 — Tutorial & Onboarding
- [ ] **Interactive tutorial scenario** — guided 10-turn scenario teaching core mechanics.
- [ ] **Tooltips & help system** — contextual help on every UI element. "What's this?" mode.
- [ ] **Encyclopedia/Codex** — in-game reference for factions, corps, history, mechanics, key figures.

### 0.5.3 — Audio (SFX + Music)
- [ ] **Sound effects** — UI clicks, turn advance, battle notifications, map interactions, events.
- [ ] **Music system** — ambient war-era music, faction-specific themes, tension escalation.
- [ ] **Audio settings** — master/music/SFX volume controls.

### 0.5.4 — AI Narrative Layer + Auto-Play
- [ ] **After-Action Reports in character** — corps commander writes field reports after each battle in their voice. Haiku, ~$0.005/battle.
- [ ] **Post-game analysis** — AI writes full war analysis at Dayton: strategy assessment, turning points, Pyrrhic Score commentary. Sonnet, ~$0.10/game.
- [ ] **AI-vs-AI Auto-Play** — spectator mode: Claude commands all 3 factions. Game runs automatically. Full AAR at end. Calibration tool + entertainment.
- [ ] **Contextual tutorial/advisor** — player clicks "Why am I losing?" and gets situation-specific explanation with actionable recommendations. Haiku, ~$0.01/query.

---

## v0.6 — Content Complete Beta

**Goal:** All content authored and tested. Balance verified across all factions and scenarios. The game is feature-frozen — only fixes from here.

### 0.6.0 — Full Historical Event Set
- [ ] **1992 events** — 30-40 events covering JNA withdrawal, ethnic cleansing campaigns, siege of Sarajevo, Operation Corridor, international responses.
- [ ] **1993 events** — Croat-Bosniak war, Srebrenica shelling, Vance-Owen collapse, Operation Neretva, Vitez massacre.
- [ ] **1994 events** — Markale massacre, NATO ultimatum, Washington Agreement, Federation formation, Contact Group plan.
- [ ] **1995 events** — Srebrenica fall, Operation Storm, NATO bombing (Deliberate Force), Dayton negotiations.
- [ ] **Event chain validation** — run full 1991-1995 with all events, verify causal chains, no broken triggers.

### 0.6.1 — Balance & Calibration
- [ ] **All scenarios calibrated** — each start date produces historically plausible trajectories for all 3 factions.
- [ ] **Faction balance** — each faction has a viable path to "best achievable outcome" (not victory — this is negative-sum).
- [ ] **Difficulty differentiation** — RBiH hardest (historical underdog), RS most straightforward (military advantage + declining), HRHB most complex (two-front alliance management).
- [ ] **Play-length targets** — April 1992 scenario: 3-5 hours. September 1991: 5-8 hours. Each tested with real players.

### 0.6.3 — AI Dynamic Content
- [ ] **Procedural events** — AI generates events reacting to what actually happened (early Srebrenica fall → different international response). Haiku evaluates, guardrails keep it historical. ~$0.01/turn.
- [ ] **Peace negotiation dialogue** — negotiate with AI-Milošević/Izetbegović/Tuđman. Multi-turn conversation. AI pushes back based on capital position. Must reach game-mechanical outcomes. Sonnet, ~$0.05-0.20/negotiation.

### 0.6.4 — Historical Essays
- [ ] **AI-generated at dev time** — 500-word historical essays tied to in-game events. Generated once with Sonnet (~$5 total), shipped with game. Unlocked after player experiences the event. Educational value differentiator.

### 0.6.2 — Campaign Structure
- [ ] **Campaign flow** — structured progression: early war → mid-war turning points → late war → endgame. Pacing mechanics (event frequency, crisis escalation).
- [ ] **Mid-game saves** — verified stable across all scenarios, all factions, all game phases.
- [ ] **Statistics & tracking** — per-campaign stats: battles fought, territory gained/lost, casualties inflicted/taken, operations launched. End-of-game summary.
- [ ] **Achievements** — 20-30 achievements (faction-specific + universal). "Defend Sarajevo for 52 weeks", "Complete Corridor 92 by w12", "Sign Washington Agreement before Markale".

---

## v0.7 — Polish Beta

**Goal:** The game looks, sounds, and feels professional. Performance is smooth. Accessibility is handled.

### 0.7.0 — Performance
- [ ] **Profiling pass** — identify hot paths in simulation (sector building, BFS, combat resolution). Target: <100ms per turn on mid-range hardware.
- [ ] **Map rendering optimization** — GeoJSON layer caching, tile loading priorities, smooth pan/zoom at all scales.
- [ ] **Memory audit** — no leaks across 208-turn games. Canvas cleanup, event listener hygiene.
- [ ] **Startup time** — app launches in <3 seconds. Map loads in <2 seconds.

### 0.7.1 — Accessibility
- [ ] **Colorblind modes** — deuteranopia/protanopia/tritanopia alternatives for faction colors, map overlays.
- [ ] **Keyboard navigation** — full game playable without mouse. Tab order, focus indicators, keyboard shortcuts for all actions.
- [ ] **Screen reader support** — ARIA labels on all interactive elements. Turn summaries as text.
- [ ] **Rebindable keys** — all shortcuts customizable. Saved to settings.
- [ ] **Text scaling** — UI text scales with system font size preferences.

### 0.7.2 — Localization
- [ ] **i18n infrastructure** — string extraction, translation file format, locale switching.
- [ ] **Bosnian/Croatian/Serbian** — first localization (the subject matter demands it).
- [ ] **English polished** — all UI text, events, tooltips, tutorial reviewed by native speaker.
- [ ] **RTL preparation** — layout supports RTL if future Arabic/Hebrew localization needed.

### 0.7.3 — Visual Polish
- [ ] **Loading screens** — faction-themed loading art, progress indicators.
- [ ] **Transitions** — smooth panel open/close, map mode transitions, turn advance animation.
- [ ] **Warroom art finalization** — archival-quality faction HQ screens (real photography, not AI art per napkin directive).
- [ ] **Icon polish** — consistent NATO symbology, formation status indicators, map markers.

---

## v0.8 — Release Candidate

**Goal:** External players can play the game end-to-end without confusion or crashes. Final tuning based on feedback.

### 0.8.0 — External Playtesting
- [ ] **Closed alpha** — 10-20 testers from strategy game community. Each plays 2+ full campaigns.
- [ ] **Feedback collection** — structured questionnaire: clarity, pacing, difficulty, bugs, crashes, UX confusion points.
- [ ] **Critical fixes** — address all crash bugs, save-breakers, and top-5 UX confusion points.

### 0.8.1 — Final Balance
- [ ] **Incorporate playtest feedback** — adjust difficulty, event pacing, victory thresholds.
- [ ] **Edge case hardening** — long games (300+ turns), unusual faction choices, alliance-break timing edge cases.
- [ ] **Determinism verification** — identical inputs produce identical outputs across Windows/Mac/Linux.

### 0.8.2 — Platform & Packaging
- [ ] **Windows installer** — NSIS or Electron-builder. Auto-update capability.
- [ ] **Mac build** — notarized, universal binary (Intel + Apple Silicon).
- [ ] **Linux build** — AppImage or Flatpak.
- [ ] **Steam integration** — Steamworks SDK, achievements, cloud saves, workshop (if modding supported).

---

## v0.9 — Gold Candidate

**Goal:** Ship-ready. Final QA. Marketing and store presence prepared.

### 0.9.0 — Final QA
- [ ] Full regression test — all scenarios, all factions, all game phases.
- [ ] Save compatibility verified across all v0.8→v0.9 changes.
- [ ] Performance benchmarks documented.
- [ ] No known crash bugs. No known save-breaking bugs.

### 0.9.1 — Store & Marketing
- [ ] Steam store page — description, screenshots, trailer, tags.
- [ ] Press kit — logo, key art, fact sheet, review copies.
- [ ] Community — Discord/forum setup, developer blog.

---

## v1.0.0 — Gold

Ship it. "Another such victory and we are undone."

---

## Post-1.0 Content Plan (Tentative)

| Update | Codename | Content |
|--------|----------|---------|
| 1.1.0 | "Operation Corridor" | Posavina focus: expanded Brčko/Orašje scenarios, VRS 1KK operations |
| 1.2.0 | "Autumn Leaves" | 1993-1994 deep content: Croat-Bosniak war, Mostar siege, Vitez |
| 1.3.0 | "Deliberate Force" | NATO intervention mechanics, 1995 endgame, Operation Storm |
| 1.4.0 | "The Weight of Command" | Enhanced officer system: personality events, war crimes consequences, moral choices |
| 1.5.0 | "The War Room" | AI Scenario Editor Assistant (help build what-if scenarios) + Streaming Narrator (AI commentary for streamers) |
| 2.0.0 | TBD | Major engine overhaul or new conflict scenario |

---

## Open Design Questions

These need design sessions before implementation. Subsystems and mechanics are yet to be worked out.

1. **Negotiation counter-offers** — how much agency does the player have? Can they propose territorial splits on the map? Or choose from pre-defined options?
2. **International intervention** — is NATO bombing a single event or a multi-turn campaign the player can influence?
3. **War economy** — how detailed? Paradox-style production queues or abstract capacity numbers?
4. **Multiplayer** — is this a v1.0 feature or post-launch? Hot-seat only or network? Asymmetric information?
5. **Modding** — do we expose scenario JSON + event scripting as a modding surface? Lua bindings exist but aren't surfaced.
6. **Endgame scoring** — what does "winning" mean in a negative-sum game? Historical proximity? Faction survival? Population preserved? All of the above?
7. **Play length** — target session length per scenario? Are there "quick battle" modes?
8. **Srebrenica** — how do we handle the genocide mechanically and narratively? This is the most sensitive design question in the entire game.

---

## Reminder: Discuss Victory Conditions

The current `checkWarTermination()` system is functional but the **scenario victory conditions themselves are not yet defined** for any scenario. The `evaluateVictoryConditions()` function exists but no scenario JSON specifies `victory_conditions`. What should the per-faction goals be? What constitutes a "good outcome" for each side in a negative-sum war? This needs a design session.
