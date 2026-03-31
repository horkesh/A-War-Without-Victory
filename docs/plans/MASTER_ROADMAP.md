# AWWV Master Roadmap — Pyrrhic Games

**Last Updated:** 2026-03-30
**Current Version:** 0.8.0 (Command Chain)
**Studio:** Pyrrhic Games
**Motto:** "Another such victory and we are undone."

---

## Supersedes

This document is the **single source of truth** for AWWV's development roadmap. The following files are superseded:

- `docs/plans/2026-03-22-v06x-master-roadmap.md` — v0.6.x detailed roadmap (Track A/B structure, nightshift execution model)
- `docs/30_planning/_legacy/ROADMAP_TO_1_0.md` — original v0.1-v1.0 roadmap with AI commander design and open design questions
- `docs/20_engineering/VERSIONING.md` — retains version scheme and protocol only; roadmap content now here

Individual milestone plan files (dated `2026-03-*.md` in `docs/plans/`) remain active as implementation specs referenced from this roadmap.

---

## Version Scheme

```
MAJOR.MINOR.PATCH[-tag]
```

- **MAJOR** — Game era (0 = development, 1 = release/gold)
- **MINOR** — Milestone within the era
- **PATCH** — Individual builds within a milestone
- **tag** — Optional pre-release qualifier (`-alpha`, `-beta`, `-rc1`)

**1.0.0 = Gold.** Everything before is development. Everything after is live product. Calibration n-numbers are internal session IDs, not version numbers.

---

## Completed (v0.1-v0.7)

### v0.1.0 — Proof of Concept (2026-02)
Core simulation loop, turn pipeline, faction definitions, map rendering. Established that a deterministic Bosnian War simulation was feasible in TypeScript/Electron.

### v0.2.0 — Core Engine (2026-03-15)
War phase combat resolution, 3-tier bot AI (army/corps/brigade), corps sector system, operations with preparation/execution/AAR, named officers with succession, supply reserves, OOB with 247 brigades, headless scenario runner, calibration pipeline (40w/52w area-weighted comparison). 627 tests.

### v0.3.0 — Playable Alpha (2026-03-15)
Full war phase playable with player orders and operations. Complete turn cycle through endgame. Save/load functional. Basic victory/defeat conditions. All three factions selectable. Desktop app stable. Dayton negotiation system with UI and dimension merge.

### v0.4.x — Content Alpha (2026-03-18)
AI Commander infrastructure (14 modules, multi-model routing). Operation preparation 5-phase state machine. Officer succession with player-choice. Equipment pipeline (scavenging, capture, barracks events). Commander override layer (Phase A strategic criteria + Phase B army HQ overrides). Corps-level operations replacing per-sector. HRHB-RBiH war transition (alliance breakdown, mobilization, 6 events). Settlement timeline (12 event types). 1100+ tests.

### v0.5.x — Feature Complete Beta (2026-03-22)
Emergent event system (pressure-based triggers, 14 condition types, recurrence). Strategic dimensions (6 per faction, hybrid base_value + event_modifier). 19 events migrated for 1992, 3 ICTY-sourced foundational decisions. Presidential Toolbar with army crest. Army HQ 4-tab command center (Briefing/Summary/Records/Personnel). Chief of Staff briefing (personality-driven). Event decision IPC. Deck.gl settlement labels and formation counters. 93.1% area-weighted calibration (n1026). 1410 tests, 116 suites.

### v0.6.x — Political Wargame (2026-03-23)
Transformed AWWV from military simulation into political wargame. Calibration framework with automated regression and baseline freeze. 1993-1994 events (42 total), Game Chronicle, AI Commander + Events integration, HQ deep drill-down. 1995 endgame events (20), Dayton dimension merge, Chronicle Wrapped, Staff/Situation Map. 96 historical essays (500 words each, /historian-generated, 5-round QA certified + deep audit). All delivered across v0.6.1-v0.6.4.

### v0.7.0 — Dynamic Codex (2026-03-28, core complete)
Event flag wiring (25 flags), exhaustion overhaul, Codex QA (30 essay corrections across 3-pass QA). 7 FIXED-to-CONDITIONAL endgame chain. Pool decay system. Contact graph shared_segments enrichment (48 phantom adjacencies filtered). SpatialContext shared spatial layer. 712 OSIDs (32 micro-OSIDs merged). n1211 = 90.2% true baseline with enriched contact graph.

**v0.7 sub-milestones reslotted (2026-03-30):** The following items were open when v0.8 started. They have been moved to their logical homes rather than left as floating "can parallel" debt:

- v0.7.0.1 (13 missing 1992 essays) → **v0.8.0.x parallel track** — pure content, no engine risk
- v0.7.1 (essay template engine + Letter Home) → **v0.8-to-v0.9** — prerequisite for v0.9.1 dynamic essays
- v0.7.2 Warroom React migration → **v0.8-to-v0.9** — tech refactor, belongs with simplification
- v0.7.2 Ops Modal UX Overhaul + Ghost Map + Exhaustion Clock → **v0.9.1** — UI refinement after ops authority is real
- v0.7.3 (canon audit) → **v0.8-to-v0.9** — doc/code sync, matches that phase's goals

---

## Active: v0.8 — Command Chain

**Theme:** The player commands through a hierarchy of AI personalities that can be delegated to or overridden. Corps commanders make emergent decisions based on zone posture, force balance, and personality. The gap between intent and execution is where the Bosnian War lived.

**Architecture:** `docs/plans/2026-03-25-command-chain-architecture.md`

**Sequencing principles (non-negotiable):**
1. Operations are the first command object that must become singular and authoritative. Do not accept split operation state as "good enough."
2. Commander maturity (belief state, competing options, decision traces) happens before political-bot and LLM expansion. Building political personality on top of a threshold machine produces sophisticated illusion, not real command.
3. Cleanup work is feature-enabling, not optional polish. Overlapping ownership directly blocks believable commander behavior, future political bots, and any LLM layer.
4. UI refinement follows backend authority. A richer ops panel does not prove the underlying operation object is coherent.

### v0.8.0 — Corps Commander Intelligence (ON MAIN)

PERCEIVE-DECIDE-EXECUTE per-corps loop. 10 files in `src/sim/combat/commander/` (~3,800 lines). Zone detection, garrison allocation (Grigsby two-pass), multi-turn planning, intel-reactive stance, force fitness scoring. Replaces `generateCorpsDirectives` behind `USE_COMMANDER_LOOP` flag. Concurrent corps operations (multi-slot). Serializer Map/Set support.

**Status:** n1213 = 92.2% area-weighted, 22/22 anchors, 1661 tests, 41 commander-specific tests.

**P0 in progress:** Combat drought after w20 (19 zero-combat weeks). War-or-Game: NOT APPROVED. Fix targets plan lifecycle bugs + doctrine railroad removal. See `docs/plans/2026-03-30-p0-combat-drought-fix.md`.

**Next steps (in order):**
1. Fix P0 combat drought — restore healthy mid/late-war combat tempo
2. Two-tier post-run panel go/no-go on commander system (7 Tier 1 investigators + 5 Tier 2 analysts; Orchestrator issues verdict — see napkin §Post-Run Analysis Protocol)
3. Old code removal (Step 10) — remove `generateCorpsDirectives`, make `USE_COMMANDER_LOOP` permanent
4. Railroad cleanup per `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`

**Parallel content track (v0.8.0.x, no engine risk):**
- v0.7.0.1: Author 13 missing 1992 foundation essays (barracks seizures, Sarajevo siege, JNA withdrawal, Drina cleansing, etc.). Spec: `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md`. Assign to `/historian` + `/narrative-designer` — completely independent of engine work.

**Execution plan:** `docs/plans/2026-03-31-v080x-1992-foundation-essays-plan.md`

### v0.8.1 — Commander Maturity

**Gate:** Only starts after the full two-tier post-run panel (7 Tier 1 investigators + 5 Tier 2 analysts) produces Orchestrator go/no-go on the commander system, P0 (combat drought) is confirmed fixed, and operations singularity is credible enough that the commander is reasoning through one real command object rather than a split ops model. War-or-Game is one Tier 1 investigator — its sign-off alone is not sufficient.

**Theme:** Make the commander think structurally before adding personality. No LLM flavor, no political theater — real deterministic reasoning depth.

**Why this milestone exists before political-bot work:** If authority is still split and the commander is still a threshold machine, adding political personality, refusal logic, or LLM flavor builds better-organized illusion rather than better command. This milestone makes the commander genuinely mind-like first.

**Army-command note:** Army commanders are not getting a separate named maturity milestone inside early `v0.8.x`. During `v0.8.0` through `v0.8.2`, the existing army layer remains serviceable while corps command is made real first. If a dedicated army-commander maturity pass is needed, it belongs in `v0.8-to-v0.9` after corps maturity and command-authority cleanup, before any full corps/army LLM play.

Done means for this milestone:
- belief state exists separately from raw world state (not just reading `GameState` directly)
- candidate intents compete against each other (not a single option evaluated in isolation)
- memory from prior turns affects future scoring
- constraints and preferences are structurally distinct from execution mechanics
- reasoning traces exist (for debugging + later UI surface)
- relationship model exists: commanders track trust/familiarity with the player, sibling corps, and patrons — prerequisite for order interpretation in v0.8.3
- intelligence assurance harness exists: sampled corps traces, anti-theater checks, and explicit proof criteria for “this is intelligent, not just decorated rails”

Primary targets: `src/sim/combat/commander/assess.ts`, `src/sim/combat/commander/allocate.ts`, `src/sim/combat/commander/plan.ts`, `src/sim/combat/commander/decide.ts`, `src/sim/combat/commander/briefing.ts`, `src/sim/combat/commander/emit.ts`

Plans: `docs/plans/2026-03-25-command-chain-architecture.md`, `docs/plans/2026-03-31-v081-commander-maturity-plan.md`, `docs/plans/2026-03-31-v081-intelligence-assurance-harness-plan.md`

### v0.8.2 — Political Leader Bot + Patron Phone Call

**Gate:** Requires v0.8.1 Commander Maturity to be complete. Political behavior built on a stable military command truth.

Political leader bot for non-player factions: event responses, alliance posture, war crimes policy, patron interaction. Replaces flat `pickBotResponseV1` with faction-specific political personality (Karadzic=expansionist-nationalist, Izetbegovic=survival-internationalist, Boban=opportunist-patron-dependent). Dual-track evaluator blending military situation and strategic dimensions.

**Patron Phone Call:** 8-12 dramatic patron pressure events with ICTY-sourced dialogue and player decisions. Milosevic calling Karadzic about the corridor. Tudjman ordering Boban to ceasefire. Holbrooke pressuring Izetbegovic. Events use existing event system with enhanced presentation (full-screen modal, dialogue, urgency timer).

Plans: `docs/plans/2026-03-24-v080-political-leader-bot-plan.md`, `docs/plans/2026-03-25-command-chain-architecture.md` section 1 and 3.

**Estimated scope:** ~1,660 new lines, ~105 new tests, 7 phases.

### v0.8.3 — Order Interpretation + Warlord Problem

**Gate:** Requires v0.8.2. Corps and army systems must be explicit enough that order interpretation is not hiding ownership confusion. The player must have a minimum viable command review surface for preview / understand / accept / override before “disobedience” is treated as a feature rather than backend ambiguity.

Order interpretation system: when the player issues a corps stance change, launches an operation, or force-launches an attack, the order passes through the assigned corps commander's personality filter. The commander may comply, creatively interpret, delay, or refuse. Political capital resource for overriding refusals.

**The Warlord Problem** as sub-feature: early-war militia commanders (low political_reliability) who refuse subordination. Political capital to integrate. Connects existing `warlord_friction.ts` stochastic triggers to the deterministic override pathway.

**Minimum viable command review surface owned here:** before finalizing this milestone, the player can inspect what order was issued, how the corps/army chain interpreted it, what was accepted or modified, why friction occurred, and what override cost is being proposed. This is the minimum truthful UX layer for command friction.

Plans: `docs/plans/2026-03-24-v081-order-interpretation-plan.md`, `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md`, `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md`, `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`, architecture section 2.

### v0.8.4 — Autonomy Depth + Claude API at Political Level

**Gate:** Requires v0.8.3. LLM integration sits on top of cleaned command ownership, not underneath it. Replay/log determinism, decision auditability, fallback behavior, and player review surfaces must be explicit before any API-assisted autonomy is treated as roadmap-ready.

Player political posture IPC (set war-crimes-policy, set alliance-posture, set political priorities). Optional LLM-assisted political leader decisions extending existing AI Commander architecture. Personality drift: leader personality changes based on war outcome.

**Determinism and review requirement:** every API-assisted action must be reviewable as a structured decision with deterministic replay semantics, fallback behavior if the API is unavailable, and a player-facing surface for understanding or rejecting the result.

Plans: `docs/plans/2026-03-24-v082-autonomy-api-plan.md`, `docs/plans/2026-03-31-v084-autonomy-determinism-and-review-plan.md`, `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md`.

### v0.8.x-final — Command Authority Cleanup + Old Code Removal

**What this milestone is about:** Making ownership singular. This is where the repo stops lying to itself about who is in charge.

**Primary gate inside this milestone: Operations Singularity.** Treat this as the first real proof that command authority is becoming honest. It is not background cleanup. It is the prerequisite object-level cleanup that later commander maturity and ops UX work depend on.

**Gate requirement — every cleanup task must answer all five before it is considered done:**
1. What is the canonical owner after this change?
2. What competing path is being removed or demoted?
3. What test or observable behavior proves the change is real?
4. What UI or report surface now reflects the new truth?
5. What future milestone does this unblock?

If the implementer cannot answer all five, the task is not ready to start.

**Operations are the proof of concept.** Before this milestone closes, operations must answer yes to all of:
1. Is there one canonical operation object?
2. Is there one canonical lifecycle?
3. Is there one canonical creation / launch / update path?
4. Does the UI reflect that same truth?

**Implementation plan:** `docs/plans/2026-03-31-v08x-operations-singularity-plan.md`
**Overarching cleanup plan:** `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md`

**Cleanup targets:**

- Remove `generateCorpsDirectives`, make `USE_COMMANDER_LOOP` permanent
- Clean up hardcoded rails cataloged in `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md`: doctrine phase constants that override commander judgment, corps name-checks, blitz phase exemptions
- Operations ownership: one canonical operation object with one lifecycle (`sector_offensive.ts`, `operation_preparation.ts`, `bot_corps_operations.ts`)
- Movement ownership: reduce movement writers from ~7 competing sources to one intent owner + small execution stack
- Boundary comments in all hotspot files naming what is canonical vs transitional

Done means: `generateCorpsDirectives` is deleted (not flagged, not behind a dead branch — deleted). `apply_brigade_reposition.ts` dead ballast is removed. Every hotspot file has an ownership comment at its top.

---

## Planned: v0.8-to-v0.9 — Repo-Wide Simplification

No version bump — engineering milestone between feature releases. Stabilization and technical debt cleanup after Command Chain ships.

**Gate requirement — same 5-question rule as v0.8.x-final applies to every task here:** canonical owner after change / old path removed or demoted / done-means proof / UI or doc surface that reflects the new truth / future milestone unblocked.

**Hit list** (from Railroad Hunter Report):

| Area | Current State | Target |
|------|--------------|--------|
| Movement systems | 6 competing systems (column march, regular, interior, sector march, strategic reserve, pocket evacuation) | 1-2 unified systems with commander-owned priority |
| Pathfinding | 3 separate engines (settlement BFS, OSID Dijkstra, graph BFS), no shared cache | 1 engine with caching, unified tie-breaking |
| String hardcoding | Postures, classifications, faction IDs as string literals | TypeScript enums throughout |
| Dead branches | ZoC/AoR era code, old bot_corps_directives paths | Removed |
| Execution entrypoints | `src/turn/pipeline.ts` + `src/sim/run_combat_browser.ts` are live variants adding cognitive overhead alongside canonical `src/sim/turn_pipeline.ts` | Consolidate or explicitly mark non-authoritative with ownership comment |
| Magic numbers | bot_constants.ts scattered thresholds | Domain-grouped constant files |
| Canon docs | Systems Manual and Game Bible reference pre-v0.8 architecture | Updated for v0.8 command chain |
| Army-command maturity | Army layer is serviceable but still undernamed and too implicit as a real command substrate | Explicit army-command maturity and responsibility model. Plan: `docs/plans/2026-03-31-v08to09-army-command-maturity-plan.md` |
| Army ↔ corps command coherence | Assumed rather than owned; handshake and authority boundaries are still undernamed | Named handshake rules, ownership comments, and explicit authority boundaries. Plan: `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md` |
| Commander explanation surfaces | Traces are becoming real, but staff/player-facing surfaces are still implicit | Build truthful explanation surfaces from real traces, not theater. Plan: `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md` |
| Player command review UX | Order friction and later API autonomy assume preview/review/override surfaces that are not yet roadmap-owned strongly enough | Minimum viable review surface for order interpretation. Plan: `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md` |
| Autonomy determinism and review | API-assisted autonomy can still be mistaken for readiness without hardened replay/fallback/review gates | Explicit determinism, fallback, and player-review contract. Plan: `docs/plans/2026-03-31-v084-autonomy-determinism-and-review-plan.md` |
| Connectivity checks | Column march validates destination but not path; no enclave boundary check during transit | Full path validation |
| **Essay template engine + Letter Home** | Not built — v0.7.1 debt. Required before v0.9.1 dynamic essays. | Build `dynamic_sections`, divergence notes, ghost entries; Letter Home vignettes in CoS briefing. Plans: `docs/plans/2026-03-23-essay-template-engine-plan.md`, `docs/plans/2026-03-25-letter-home-and-essay-authoring-spec.md` |
| **Warroom React migration** | Vanilla TS + canvas — v0.7.2 debt. Refactor, not feature work. | Migrate to React. Plan: `docs/plans/2026-03-24-v072-warroom-react-migration-plan.md` |
| **Canon audit (v0.7.3)** | Sep 1991 start + peace phase refs still live in docs and code | Remove all references. Plan: `docs/plans/2026-03-23-canon-audit-checklist.md` |

---

## Planned: v0.9 — Consequences + Polish

**Theme:** Ahistorical choices produce realistic consequences. Ship preparation begins.

### v0.9.0 — Consequence System

Divergence events: ahistorical player decisions trigger realistic consequence chains. No cleansing leads to partisan resistance. Alliance holds eliminates Washington Agreement chain. Srebrenica defended changes NATO intervention calculus.

Plan: `docs/plans/2026-03-24-v090-consequence-system-plan.md`.

**+ Cost Ledger** (Legendary Feature): ICTY-style prosecutorial endgame narrative. Every decision — ethnic cleansing tolerated, enclaves abandoned, paramilitary sweeps authorized — silently recorded. After Dayton, the player receives a prosecutorial narrative adapted from real ICTY case structures. Not a score. An indictment. Template-driven, reads event flags + casualties + displacement.

Spec: `docs/plans/2026-03-26-cost-ledger-template-format.md`.

### v0.9.1 — Dynamic Essay Content + Endgame Comparison

~30 Tier 3 dynamic sections + ~15 Tier 4 ahistorical essay templates. The Codex morphs based on player decisions — essays gain divergence notes, ghost entries for paths not taken.

**+ Endgame Comparison** (Legendary Feature): Split-screen your-war-vs-real-war at milestone weeks. Territory, casualties, displacement side by side. "Could I have done better? Could anyone?"

Spec: `docs/plans/2026-03-26-endgame-comparison-data-requirements.md`.

**Gate:** Requires essay template engine (v0.8-to-v0.9) to be complete — dynamic sections and divergence notes depend on it.

**+ Ghost Map** (Legendary Feature, reslotted from v0.7.2): 1991 census demographics overlay beneath current military situation. Shows what the land looked like before the war. Low effort, high interpretive power.

**+ Exhaustion Clock** (Legendary Feature, reslotted from v0.7.2): Visual depletion indicator (candle metaphor) in Army HQ. Shows faction-level exhaustion at a glance.

**+ Ops Modal UX Overhaul** (reslotted from v0.7.2): Redesign the operations panel to reflect the canonical operation object established in v0.8.x-final. Must follow ops authority cleanup — do not build UI on top of split ops state. Spec: `docs/40_reports/PROMPT_OPS_MODAL_UX_OVERHAUL.md`

### v0.9.2 — External Playtesting + Balance

Closed alpha: 10-20 testers from strategy game community. Structured feedback collection: clarity, pacing, difficulty, bugs, UX confusion points. Balance pass incorporating playtest feedback.

### v0.9.3 — Performance + Accessibility

**Performance:** Profiling pass on hot paths (sector building, BFS, combat resolution). Target: <100ms per turn on mid-range hardware. Map rendering optimization. Memory audit for 208-turn games. Startup < 3 seconds.

**Accessibility:** Colorblind modes (deuteranopia/protanopia/tritanopia). Keyboard navigation (full game playable without mouse). Screen reader support (ARIA labels). Rebindable keys. Text scaling.

Plan: `docs/plans/2026-03-16-v0.7.0-performance.md`, `docs/plans/2026-03-16-v0.7.1-accessibility.md`.

### v0.9.4 — Visual Polish + Legendary Map Features

Loading screens, transitions, warroom art finalization, icon polish.

**+ Map That Scars** (Legendary Feature): The tactical map visually degrades as the war progresses. Fought-over settlements show damage. Depopulated settlements fade. Corridors under pressure pulse. Week 1: clean and colorful. Week 120: a wound. Visual degradation keyed to per-OSID population, displacement, control flips, combat events.

**+ Refugee Column** (Legendary Feature): When a settlement is ethnically cleansed or a front collapses, displaced population appears on the map as a moving column of dots flowing along roads toward safe territory. Not a number. A visible thing you caused. Deck.gl TripsLayer, threshold-triggered.

**+ Corridor Heartbeat** (Legendary Feature): Supply corridors (Posavina, Brcko) visually pulse with flow rate. Faster = healthy, slowing = interdicted, flatline = severed. Makes logistics visceral.

**+ Front Line Terrain Tinting:** Friction data rendered on front edges.

**+ Elevation Profile on Ops Axes:** SVG chart along axis of advance.

Plan: `docs/plans/2026-03-16-v0.7.3-visual-polish.md`.

### v0.9.5 — Platform Packaging + Store

Windows installer (Electron-builder, auto-update). Mac build (notarized, universal binary). Linux build (AppImage or Flatpak). Steam integration (Steamworks SDK, achievements, cloud saves). Store page, press kit, community setup.

Plan: `docs/plans/2026-03-16-v0.8.2-platform-packaging.md`.

---

## Planned: v1.0.0 — Gold

**Ship it.** Full campaign from April 1992. Dynamic Codex. Command hierarchy. Consequence system. Tutorial. Ship it.

### What ships in v1.0:
- Complete 1992-1995 campaign (all phases, all factions playable)
- Corps Commander Intelligence (PERCEIVE-DECIDE-EXECUTE)
- Political Leader Bot (all 3 factions, personality-driven)
- Order Interpretation (comply/creative/delay/refuse + political capital override)
- 94+ events with emergent triggering, 96+ certified historical essays
- Dynamic Codex (template engine, divergence notes, ghost entries)
- Consequence system (ahistorical branching with realistic consequences)
- Cost Ledger (ICTY-style endgame narrative)
- Ghost Map, Map That Scars, Refugee Column, Corridor Heartbeat
- Letter Home (procedural casualty vignettes)
- Endgame Comparison (your war vs real war)
- Army HQ command center + Warroom (React, unified)
- Game Chronicle + Chronicle Wrapped
- Tutorial / onboarding
- Patron Phone Calls
- Full UI polish, accessibility, performance optimization
- Platform packaging (Win/Mac/Linux/Steam)

### NOT in v1.0:
- Localization (v1.1 — B/C/S + English polish)
- Historical scenarios April 1993/1994/1995 (v1.2)
- Sound/audio system (v1.3 — "The Silence")
- AI Commander via Claude API at corps level (v2.0)
- Multiplayer
- Modding tools

---

## Post-1.0 Content Plan

| Update | Codename | Content |
|--------|----------|---------|
| **1.0.x** | — | Day-one patch, critical bugfixes. No new features. |
| **1.1.0** | "Mother Tongue" | Localization: Bosnian/Croatian/Serbian (Latin script) + English polish. Faction-specific B/C/S dialect flavor optional. |
| **1.2.0** | "Autumn Leaves" | Historical scenarios: April 1993, April 1994, January 1995 start dates. Each with scenario-specific event sets and calibrated starting positions. |
| **1.3.0** | "The Silence" | Full audio degradation design. No background music. Ambient environmental audio that degrades as the war progresses. Birds in spring 1992. Wind and distant thuds by winter 1993. Near-silence by 1995. When the Dayton ceasefire fires, you hear a human voice for the first time. |
| **1.4.0** | "The Other Side's Briefing" | After major battles, optionally view the enemy's CoS briefing about the same engagement. Their casualties, their assessment, their morale. Humanizes the enemy and reveals information asymmetry. Requires v0.8.2+ AI Commander maturity. |
| **1.5.0** | "Operation Corridor" | Posavina expansion: expanded Brcko/Orasje scenarios, VRS 1KK operations deep content. |
| **1.6.0** | "Deliberate Force" | NATO intervention mechanics, 1995 endgame expansion, Operation Storm. |
| **1.7.0** | "The War Room" | AI Scenario Editor Assistant (help build what-if scenarios) + Streaming Narrator (AI commentary for streamers). |
| **2.0.0** | TBD | Claude API at corps level — AI IS the opposing general. Major engine overhaul for full LLM-driven command chain. Save-breaking changes acceptable. |

Each 1.x.0 can have its own hotfix patches (1.1.1, 1.1.2, etc.).

---

## Open Design Questions

These need design sessions before implementation. Preserved from the original roadmap — each represents a genuine unsolved problem.

1. **Negotiation counter-offers** — How much agency does the player have at Dayton? Can they propose territorial splits on the map? Or choose from pre-defined packages? Current system uses dimension-derived capital + flag-driven packages, but player agency in the negotiation itself is limited.

2. **International intervention** — Is NATO bombing a single event or a multi-turn campaign the player can influence? Current: single event with conditions. Design question: should the player be able to affect the timing, intensity, or targeting of Deliberate Force?

3. **Multiplayer** — Hot-seat only or network? Asymmetric information? Each player commands one faction; Claude fills others. Deferred to post-1.0 but needs architectural consideration (save format, turn structure, information hiding).

4. **Modding** — Event definitions are JSON. Scenario manifests are JSON. The modding surface exists implicitly. Do we formalize it? Expose a scenario editor? Lua bindings exist but are not surfaced. Workshop integration with Steam?

5. **Endgame scoring / victory conditions** — What does "winning" mean in a negative-sum game? Historical proximity? Faction survival? Population preserved? Pyrrhic Score? The `evaluateVictoryConditions()` function exists but no scenario JSON specifies `victory_conditions`. This is the most fundamental design question after Srebrenica.

6. **Play length** — Target session length per scenario? April 1992 full campaign: 3-5 hours target. Are there "quick battle" modes? Speed controls?

7. **Srebrenica** — How do we handle the genocide mechanically and narratively? Currently: territory control + event flags + essay. The Cost Ledger addresses the narrative reckoning. But the mechanical representation of mass atrocity in a game system remains the most sensitive design question in the entire project. ICTY case IT-95-5 provides the legal framework; the question is how a game can honor it.

8. **War economy depth** — How detailed? Current: abstract capacity numbers, smuggling routes, equipment lifecycle. Paradox-style production queues would add complexity without clear benefit for the negative-sum thesis. Probably stays abstract.

---

## Current Status Assessment

| System | Status |
|--------|--------|
| Core simulation | Complete |
| War phase combat | Complete |
| Bot AI (3-tier: army/corps/brigade) | Complete |
| Corps Commander Intelligence (v0.8) | Active — on main, P0 fix in progress |
| Corps sectors | Complete |
| Operations + preparation | Complete (concurrent multi-slot) |
| Named officers + succession | Complete |
| Supply reserves | Complete |
| Equipment pipeline | Complete |
| OOB (247 brigades, 166 active) | Complete |
| Scenario runner | Complete |
| Calibration pipeline | Complete (92.2% area-weighted, n1213) |
| Desktop app (Electron v41) | Functional |
| Tactical map (React + MapLibre + Deck.gl) | Functional |
| Warroom (vanilla TS + canvas) | Functional (React migration reslotted → v0.8-to-v0.9) |
| Army HQ (4-tab command center) | Functional |
| Events/decisions | Functional (94 events, pressure system, 14 condition types) |
| Historical essays (Codex) | Complete (96 certified, 13 missing 1992 essays pending) |
| Strategic dimensions | Functional (6 dimensions, Dayton merge) |
| Scenarios (40w/52w/56w) | Complete |
| AI Commander infrastructure | Functional (14 modules, multi-model routing) |
| Commander Maturity (belief state, motive stack, traces) | Not started (v0.8.1) |
| Political Leader Bot | Not started (v0.8.2) |
| Order Interpretation | Not started (v0.8.3) |
| Consequence system | Not started (v0.9.0) |
| Cost Ledger | Not started (v0.9.0) |
| Ghost Map | Not started (v0.9.1) |
| Map That Scars | Not started (v0.9.4) |
| Letter Home | Not started (v0.8-to-v0.9) |
| Refugee Column | Not started (v0.9.4) |
| Corridor Heartbeat | Not started (v0.9.4) |
| Endgame Comparison | Not started (v0.9.1) |
| Tutorial | Not started |
| Sound/audio | Not started (post-1.0) |
| Localization | Not started (post-1.0) |
| Peace phase | CUT — game starts April 1992 |
| Save/load | Partial (headless OK, desktop partial) |
| Victory conditions | Stub |
| Diplomacy layer | Partial (patron pressure, alliance, IVP) |

**Current:** 1661 tests, 98 suites. 92.2% area-weighted calibration (n1213, ties ATH). 712 OSIDs. 94 events. 96 certified essays.

---

## Legendary Features Summary

Features that make AWWV 10x more powerful, assigned to specific versions. Source: `docs/30_planning/design/LEGENDARY_FEATURES_BRAINSTORM.md`.

| Feature | Version | Effort | Description |
|---------|---------|--------|-------------|
| **Ghost Map** | v0.9.1 | Low | 1991 census demographics overlay beneath current military situation |
| **Exhaustion Clock** | v0.9.1 | Low | Visual depletion indicator (candle metaphor) in Army HQ |
| **Letter Home** | v0.8-to-v0.9 | Low | Procedural casualty vignettes in CoS briefing |
| **Patron Phone Call** | v0.8.2 | Medium | 8-12 dramatic patron pressure events with ICTY-sourced dialogue |
| **Command Chain That Disobeys** | v0.8.3 | High | Officers interpret, delay, refuse orders |
| **Cost Ledger** | v0.9.0 | Medium | ICTY-style prosecutorial endgame narrative |
| **Endgame Comparison** | v0.9.1 | Medium | Your war vs real war side-by-side |
| **Map That Scars** | v0.9.4 | Low-Med | Visual degradation over time |
| **Refugee Column** | v0.9.4 | Medium | Displacement as visible map entity |
| **Corridor Heartbeat** | v0.9.4 | Low | Supply corridor pulse visualization |
| **The Silence** | v1.3.0 | Medium | Audio degradation design |
| **The Other Side's Briefing** | v1.4.0 | Medium | Enemy CoS briefing after major battles |

---

## Version Bump Protocol

1. Decide which milestone the work completes
2. Update `package.json` version field
3. Create git tag: `git tag -a v0.X.0 -m "Milestone: description"`
4. Update `docs/PROJECT_LEDGER.md` with version note
5. Push tag: `git push origin v0.X.0`

Patch bumps (0.X.1, 0.X.2) are for significant fixes within a milestone — not every commit. Post-1.0: patches are 1.0.x (bugfixes), feature updates are 1.x.0, major overhauls are 2.0.0.

---

## Key Plan Documents

| Document | Scope |
|----------|-------|
| `docs/plans/2026-03-30-v080-corps-commander-intelligence-architecture.md` | v0.8.0 commander system architecture |
| `docs/plans/2026-03-30-p0-combat-drought-fix.md` | v0.8.0 P0 fix plan |
| `docs/plans/2026-03-31-v080x-1992-foundation-essays-plan.md` | v0.8.0.x missing 1992 essays execution plan |
| `docs/plans/2026-03-25-command-chain-architecture.md` | v0.8 full architecture |
| `docs/plans/2026-03-31-v081-commander-maturity-plan.md` | v0.8.1 commander maturity implementation plan |
| `docs/plans/2026-03-31-v081-intelligence-assurance-harness-plan.md` | v0.8.1 anti-theater proof harness |
| `docs/plans/2026-03-31-v08x-operations-singularity-plan.md` | v0.8.x operations singularity implementation plan |
| `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md` | v0.8.x-final overarching command authority cleanup plan |
| `docs/plans/2026-03-31-v08to09-army-command-maturity-plan.md` | v0.8-to-v0.9 army-command maturity |
| `docs/plans/2026-03-31-v08to09-army-corps-authority-coherence-plan.md` | v0.8-to-v0.9 army/corps handshake and authority coherence |
| `docs/plans/2026-03-31-v08to09-commander-explanation-surfaces-plan.md` | v0.8-to-v0.9 truthful explanation surfaces |
| `docs/plans/2026-03-31-v083-player-command-review-ux-plan.md` | v0.8.3 player command review UX |
| `docs/plans/2026-03-31-v084-autonomy-determinism-and-review-plan.md` | v0.8.4 determinism, fallback, and review gates |
| `docs/plans/2026-03-24-v080-political-leader-bot-plan.md` | v0.8.2 political bot (38 tasks) |
| `docs/plans/2026-03-24-v081-order-interpretation-plan.md` | v0.8.3 order interpretation |
| `docs/plans/2026-03-24-v082-autonomy-api-plan.md` | v0.8.4 autonomy + Claude API |
| `docs/plans/2026-03-24-v090-consequence-system-plan.md` | v0.9.0 consequence system |
| `docs/plans/2026-03-29-concurrent-corps-operations.md` | v0.8.0 concurrent corps ops design |
| `docs/40_reports/20260330_RAILROAD_HUNTER_REPORT.md` | Simplification hit list |
| `docs/plans/2026-03-21-tech-debt-backlog.md` | Technical debt backlog (simplification phase) |
| `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md` | v0.8.x multi-brigade operation design |
| `docs/30_planning/OPERATION_REEVALUATION_DESIGN_SPEC.md` | v0.8.x operation reevaluation on brigade loss |
| `docs/30_planning/design/CLAUDE_AI_COMMANDER_DESIGN.md` | AI Commander full design |
| `docs/30_planning/design/LEGENDARY_FEATURES_BRAINSTORM.md` | Legendary features catalog |
| `docs/30_planning/design/ENDGAME_AND_NEGOTIATION_DESIGN.md` | Endgame, negotiation and scoring design |
