# Legendary Features Brainstorm

**Date:** 2026-03-25
**Source:** Full Pyrrhic team convene (Game Designer, Narrative Designer, War-or-Game Realism Auditor, Modern Wargame Expert, UI/UX Developer, Historian)
**Purpose:** Transformative features that would make AWWV 10x more powerful. Prioritized by impact and feasibility.
**Status:** BACKLOG -- ideas preserved for future planning sessions.

---

## Core Insight

AWWV already calculates the horror with extraordinary fidelity (712 OSIDs, 247 brigades, ICTY-sourced events, per-settlement demographics, displacement tracking). The gap is not in the engine -- it is in the interface between the engine and the player's emotions. The 10x leap is in what the game SHOWS, not what it calculates.

---

## Tier 1: Ship Soonest (presentation layer, minimal engine work)

### 1. The Cost Ledger -- ICTY-Style Tribunal Endgame
**Proposed by:** Narrative Designer + War-or-Game Realism Auditor
**Effort:** Medium (template engine + endgame screen)
**Dependencies:** v0.7.1 essay template engine, existing war_crimes tracking + event flags

Every decision -- ethnic cleansing tolerated, enclaves abandoned, paramilitary sweeps authorized -- is silently recorded. After Dayton, the player receives a prosecutorial narrative adapted from real ICTY case structures. Not a score. An indictment.

**Example:** You play RS. You authorized the Drina sweep. Srebrenica falls. You "win." Then: "The accused, as supreme political authority, directed or failed to prevent the systematic forcible displacement of approximately 47,000 Bosniak civilians from the Drina valley between weeks 8 and 16. [Adapted from IT-95-5]." You cannot unsee it. You load the game again. There is no clean path. That is the point.

**What exists:** 27 officers with `war_crimes_record`. 96 ICTY-sourced essays. `drina_cleansing_occurred`, `camps_revealed`, `sarajevo_siege_active` flags. Displacement tracking per-OSID. Casualty ledger per-brigade.

---

### 2. The Ghost Map -- Pre-War Demographics as Overlay
**Proposed by:** Historian + UI/UX Developer
**Effort:** Low (one Deck.gl layer + 1991 census data already loaded)
**Dependencies:** None -- data exists in `bih_census_1991.json`

A toggle layer showing pre-war ethnic composition beneath the current military situation. As the war progresses, the gap between ghost layer and reality grows. Settlements that were 80% Bosniak in 1991 are now RS-controlled and depopulated. You play on top of a graveyard.

**Example:** Toggle ghost layer over Prijedor. 1991: 44% Serb, 42% Bosniak. Now: 100% RS, 49,000 Bosniaks displaced. The ghost dots are still visible beneath the military overlay, like an X-ray of what was destroyed. Click Omarska -- the essay "Omarska Detention Camp (IT-97-24)" is available.

**What exists:** `bih_census_1991.json` (per-settlement ethnic breakdown). Deck.gl layers already rendering formations and labels. `displacement_state` tracking displaced-out per municipality.

---

### 3. The Map That Scars -- Visual Degradation Over Time
**Proposed by:** UI/UX Developer
**Effort:** Low-Medium (desaturation + overlay effects keyed to existing data)
**Dependencies:** None -- all data already in saves

The tactical map visually degrades as the war progresses. Fought-over settlements show damage. Depopulated settlements fade. Corridors under pressure pulse. Week 1: clean and colorful. Week 120: a wound.

**Example:** Drina valley starts green with Bosniak names labeled. By week 20: grey, depopulated, names faded to near-invisibility. Sarajevo siege ring visible as a dark band. Posavina corridor visually narrows as RS advances. The map tells the story without tooltips.

**What exists:** Per-OSID population, displacement, control flips, combat events all in saves. Settlement labels already rendered via Deck.gl TextLayer.

---

### 4. The Letter Home -- Procedural Human Stories From Casualties
**Proposed by:** Narrative Designer
**Effort:** Low (template engine + 3-5 sentence vignettes in CoS briefing)
**Dependencies:** v0.7.1 essay template engine (can use simpler templates)

One random casualty per week generates a short vignette -- a wife's letter, a child's name, a village that lost its last young man. Appears in the Chief of Staff briefing alongside military data.

**Example:** You force-launch an operation against your commander's advice. It fails. 1,200 casualties. Next briefing: "Private Enes Hadzihasanovic, age 19, from Prijedor. Displaced May 1992, volunteered at 17. Killed during the failed offensive at Doboj. His mother is among the displaced at Travnik." You forced the launch. You did this.

**What exists:** Per-settlement demographics (origin municipality for each casualty). KIA/WIA/MIA breakdown per brigade. Casualty ledger with faction/formation/municipality. Bosnian name lists derivable from census data.

---

### 5. The Refugee Column -- Displacement as Visible Map Entity
**Proposed by:** War-or-Game Realism Auditor + Historian
**Effort:** Medium (PathLayer/IconLayer + displacement routing animation)
**Dependencies:** None -- displacement_routing.ts already has origin/destination mapping

When a settlement is ethnically cleansed or a front collapses, displaced population appears on the map as a moving column of dots flowing along roads toward safe territory. Not a number. A visible thing you caused.

**Example:** Your Drina Corps completes the sweep. You watch 23,000 dots flow westward toward Tuzla over three turns. When they arrive, Tuzla's population indicator spikes. Next turn: "Tuzla humanitarian crisis -- displaced population exceeds local capacity." You didn't just take territory. You created a crisis in your enemy's rear.

**What exists:** `displacement_routing_data.ts` with per-municipality origin-to-destination mapping. Deck.gl PathLayer/ArcLayer already used for operations visualization.

---

## Tier 2: Roadmap Features (engine + presentation work)

### 6. The Command Chain That Disobeys -- Officers Who Interpret, Delay, Refuse
**Proposed by:** Game Designer + War-or-Game Realism Auditor
**Effort:** High (v0.8 roadmap item)
**Dependencies:** v0.8 Command Chain milestone

Officers filter orders through personality. Halilovic ignoring Izetbegovic. Mladic overruling Karadzic. Not a frustration mechanic -- a revelation mechanic. The delay teaches you why the real war went the way it did.

**Example:** You play RS. You order Drina Corps to assault Srebrenica. Zivanovic pushes back: "The enclave is under UN protection. An assault risks NATO intervention." You override him. It succeeds. International standing drops. Three turns later: "Belgrade demands your corps commander be replaced. Mladic recommends Krstic." You just replayed July 1995 from the inside.

**What exists:** 98 named officers with competence, aggressiveness, political reliability. Operation preparation already filters through commander personality. `interpretOrder()` architecture planned for v0.8.1.

---

### 7. The Patron Phone Call -- External Pressure as Dramatic Encounters
**Proposed by:** Narrative Designer + Modern Wargame Expert
**Effort:** Medium (event system + narrative content)
**Dependencies:** v0.7 event system (COMPLETE), patron pressure system (ACTIVE)

Patron pressure delivered as dramatic encounters -- phone calls, diplomatic cables, UN resolutions -- with actual historical positions quoted. Milosevic calling Karadzic. Tudjman instructing Boban. Holbrooke pressuring Izetbegovic.

**Example:** You play HRHB, week 35. Event fires: "INCOMING: Zagreb." Tudjman: "We cannot afford to be seen as aggressors. The international community is watching. [Paraphrased from ICTY IT-95-14]." Options: Comply (reduce ops, preserve patron) or Defy (continue, patron -15, hardliner cohesion +5).

**What exists:** Patron pressure system with per-faction accumulation. Strategic dimensions tracking patron confidence. Event system with decision responses. ICTY transcripts contain actual intercepted conversations.

---

### 8. The Endgame Comparison -- Your War vs The Real War Side-by-Side
**Proposed by:** Historian + Modern Wargame Expert
**Effort:** Medium (endgame screen + historical timeline data)
**Dependencies:** Historical timeline data (partially exists), Chronicle system

Split-screen comparison after Dayton: YOUR war on the left, the REAL war on the right. Same map, same timeline, different outcomes. Territory week by week. Casualties. Displacement. Events.

**Example:** You play RBiH. You hold Srebrenica by committing reserves that historically went to central Bosnia. Comparison shows: your Srebrenica held, but central Bosnia collapsed earlier. Your displacement was 12% lower, your casualties 22% higher. "Could I have done better? Could anyone?"

**What exists:** `compare_painted_vs_sim.cjs` (area-weighted comparison). Historical painted targets for w40. Chronicle event timeline. 96 certified essays with historical dates.

---

## Tier 3: Aesthetic / Atmospheric

### 9. The Silence -- Audio Design That Uses Absence
**Proposed by:** Game Designer + UI/UX Developer
**Effort:** Medium (layered ambient tracks, cross-fade logic)
**Dependencies:** Audio asset sourcing (noted in napkin as external need)

No background music. Ambient environmental audio that degrades as the war progresses. Birds in spring 1992. Wind and distant thuds by winter 1993. Near-silence by 1995. The map becomes quieter as population drains. When the Dayton ceasefire fires, you hear -- for the first time -- a human voice.

**What exists:** No audio system yet (noted as backlog). Would need pre-produced ambient loops keyed to turn number and aggregate exhaustion/displacement. Simple cross-fade implementation.

---

### 10. The Exhaustion Clock -- Physical Metaphor for Societal Collapse
**Proposed by:** Game Designer
**Effort:** Low (single UI component reading exhaustion value)
**Dependencies:** None -- exhaustion data exists

Replace abstract exhaustion numbers with a visual metaphor: a candle that burns down irreversibly. Always visible in HQ. Cannot be reversed. When it gutters out, the faction cannot fight anymore.

**Example:** Game start: tall, bright candle. Week 60: flickering. Week 100: a stub. You glance at it every turn. You watch it shrink. You cannot make it grow. Every decision about whether to attack or conserve is a decision about how fast to burn.

**What exists:** War exhaustion system with faction-level accumulation. Pool exhaustion per municipality. Irreversibility already enforced by design.

---

## Honorable Mentions

**The Warlord Problem:** Early-war militia commanders who refuse subordination. Political capital to integrate. Already hinted at in ARBiH officer system.

**The Corridor Heartbeat:** Supply corridors (Posavina, Brcko) visually pulse with flow rate. Faster = healthy, slowing = interdicted, flatline = severed. Makes logistics visceral.

**The Other Side's Briefing:** After major battles, optionally view the enemy's CoS briefing about the same engagement. Their casualties, their assessment, their morale. Humanizes the enemy and reveals information asymmetry.

---

## Implementation Priority (Recommended)

If picking ONE feature to prototype first: **#2 The Ghost Map**. Lowest effort, highest emotional impact per line of code. One Deck.gl ScatterplotLayer reading census data. Toggle button in the map toolbar. Could ship in a single session.

If picking a SEQUENCE for maximum cumulative impact:
1. Ghost Map (Tier 1, low effort) -- establishes the emotional register
2. Map That Scars (Tier 1, low-medium) -- makes the war visible
3. Letter Home (Tier 1, low) -- makes the war personal
4. Cost Ledger (Tier 1, medium) -- makes the player accountable
5. Endgame Comparison (Tier 2, medium) -- makes the player reflective
