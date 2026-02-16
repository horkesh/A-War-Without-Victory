# WARROOM SETUP & PHASE 0 EXECUTION PROPOSAL

**Project:** A War Without Victory  
**Date:** 15 February 2026  
**Status:** Proposal — For Review  
**Scope:** Warroom GUI asset refresh + Phase 0 gameplay loop (September 1991 – April 1992)  
**Depends On:** Phase 0 Spec v0.5.0, Warroom GUI MVP, Asset Generation Brief

---

## Table of Contents

**Part A: Warroom Visual Setup**
1. Current State Assessment
2. Asset Pipeline: Clean Background + Sprites
3. Warroom Render Pipeline Upgrade
4. Click Region Authoring
5. Faction-Specific Customization

**Part B: Phase 0 Gameplay Execution**
6. What Phase 0 IS (and is NOT)
7. The Phase 0 Gameplay Loop
8. Warroom Content per Turn
9. Capital Allocation UI
10. Declaration System & Escalation
11. Turn-by-Turn: September 1991 to April 1992

**Part C: Integration & Delivery**
12. Implementation Order & Dependencies
13. Handover to Desktop Agent
14. Open Questions

---

# PART A: WARROOM VISUAL SETUP

---

## 1. Current State Assessment

The warroom GUI is **functionally complete** at MVP level (8 interactive regions, modals, turn advancement, map zoom, news ticker) but has two structural issues that must be resolved before Phase 0 gameplay can be layered on top.

### 1.1 What Works

- Canvas-based HQ scene with background image, crest, tactical map, and calendar
- DOM modal system (Faction Overview, Newspaper, Magazine, Reports, News Ticker)
- War Planning Map (separate GUI system) with political control and contested crosshatch
- Turn advancement (counter increment; not yet wired to pipeline)
- Build pipeline: `npm run dev:warroom` and `npm run warroom:build` both succeed

### 1.2 What Must Be Fixed

**Problem 1: Click Alignment.** Desk props (phone, newspaper, magazine, reports, radio) are baked into the single background image. Clickable regions are defined in JSON coordinates for 2048×1152 space, but any Sora regeneration or Photoshop edit shifts prop positions. The crest, map, and calendar work because they are rendered as overlays at region bounds. Desk props do not.

**Problem 2: Placeholder Content.** All modal content is hardcoded placeholder text. Phase 0 needs real, dynamic content that changes each turn: newspaper headlines about political events, magazine statistics from game state, situation reports reflecting organizational investments, and a news ticker with historical international events.

### 1.3 Asset Inventory (Current)

| Asset | Path | Status |
|-------|------|--------|
| HQ Background (baked) | `assets/raw_sora/hq_background_mvp.png` | Working, but props baked in |
| RBiH Crest | `assets/raw_sora/crest_rbih_v1_sora.png` | Working (512×512 RGBA) |
| RS Crest | `assets/raw_sora/crest_rs_v1_sora.png` | Working |
| HRHB Crest | `assets/raw_sora/crest_hrhb_v1_sora.png` | Working |
| Settlements GeoJSON | `data/derived/settlements_viewer_v1.geojson` | Working (308 MB) |
| Clickable Regions | `data/ui/hq_clickable_regions.json` | Misaligned with baked props |
| Political Control Data | `data/derived/political_control_data.json` | Working |

---

## 2. Asset Pipeline: Clean Background + Sprites

The approved direction is **Option B** from the click alignment discussion: replace the single baked background with a clean background plus five individual desk prop sprites. This guarantees alignment by construction.

### 2.1 Assets to Generate

All assets go to `F:\A-War-Without-Victory\assets\raw_sora\`

| Asset | Filename | Format | Dimensions | Notes |
|-------|----------|--------|------------|-------|
| Clean HQ Background | `hq_background_clean.png` | PNG RGB | 2048×1152 | Same scene, no desk props |
| Phone Sprite | `sprite_phone.png` | PNG RGBA | ~380×214 | Red 1970s rotary telephone |
| Newspaper Sprite | `sprite_newspaper.png` | PNG RGBA | ~350×200 | Folded newspaper, blank masthead |
| Magazine Sprite | `sprite_magazine.png` | PNG RGBA | ~300×200 | Glossy magazine, blank cover |
| Reports Sprite | `sprite_reports.png` | PNG RGBA | ~350×220 | Stacked typewritten pages |
| Radio Sprite | `sprite_radio.png` | PNG RGBA | ~320×210 | 1990s transistor radio |

> **ASSET GENERATION NOTE**
>
> The `WARROOM_ASSET_GENERATION_BRIEF.md` contains complete Sora/Midjourney prompts, coordinate specs, color grading instructions, and post-processing notes. The brief is self-contained for an external expert. Key: the clean background must have EMPTY prop zones at the specified desk coordinates. Crests are already generated and live in a different folder (the repo agent knows where).

### 2.2 Prop-Free Zones on Desk

These zones on the desk surface must be empty in the clean background (sprites overlay them):

| Zone | Approximate Bounds (x, y, w, h) | Position |
|------|----------------------------------|----------|
| Phone | (80–500, 800–1050) | Far left of desk |
| Newspaper | (550–900, 820–1020) | Left-center |
| Magazine | (950–1250, 800–1000) | Center-right |
| Reports | (1300–1650, 810–1030) | Right-center |
| Radio | (1680–2000, 790–1000) | Far right of desk |

### 2.3 Post-Processing Checklist

1. Verify clean background has empty prop zones at all five locations
2. Verify all sprites have transparent backgrounds (RGBA, no white fringing)
3. Run `npm run assets:validate` to check manifest integrity
4. Run `npm run assets:post` for deterministic PNG postprocessing (strip metadata)
5. Manually verify sprites at correct scale against desk perspective

---

## 3. Warroom Render Pipeline Upgrade

Once assets are in place, the warroom render code needs structural changes.

### 3.1 Render Order (New)

1. Clean background image (`hq_background_clean.png`)
2. Desk prop sprites at region bounds (5 sprites from regions JSON `sprite_src`)
3. National crest (faction-specific, already sprite-based)
4. Tactical map (settlement polygons on wall)
5. Wall calendar (rendered dynamically from turn state)
6. UI overlays (phase/turn indicator, news ticker)

### 3.2 Code Changes Required

| File | Change | Effort |
|------|--------|--------|
| `warroom.ts` | Swap `hq_background_mvp.png` → `hq_background_clean.png`; load sprite images from regions JSON; render sprites at scaled bounds between bg and crest | Medium |
| `ClickableRegionManager.ts` | Parse `sprite_src` from regions; add `getSpriteRegions()` returning region + bounds + sprite path | Small |
| `hq_clickable_regions.json` | Update schema v1.1: add `sprite_src` to desk prop regions; change type from `baked_prop` to `sprite_overlay` | Small |
| `warroom_stage_assets.ts` | Add clean bg + 5 sprites to COPY_FILES array for build staging | Trivial |
| `DeskInstruments.ts` | Keep as no-op; sprites rendered by `warroom.ts` from regions | None |

### 3.3 Hover and Active States

With sprites as separate images, we can add visual feedback without re-generating the background:

- **Hover:** Draw a subtle glow or border around the sprite bounds (CSS box-shadow equivalent on canvas)
- **Active/click:** Brief brightness pulse (draw sprite with globalAlpha variation)
- **Disabled (e.g. phone in Phase 0):** Draw sprite at 50% opacity with a small padlock icon overlay

---

## 4. Click Region Authoring

After asset delivery, regions must be re-mapped to match the actual sprite positions.

### 4.1 Process

1. Load `hq_background_clean.png` into the region mapper tool (`tools/ui/region_mapper.html`)
2. Place each sprite on the background at its intended position
3. Record pixel bounds (x, y, width, height) in 2048×1152 coordinate space
4. Update `hq_clickable_regions.json` with new bounds and `sprite_src` paths
5. Verify all 8 regions (3 wall + 5 desk) respond correctly in the warroom

### 4.2 Region Map (Target)

| Region ID | Type | Layer | Action | Phase 0 State |
|-----------|------|-------|--------|----------------|
| `national_crest` | sprite_overlay | wall | `open_faction_overview` | Active |
| `wall_map` | dynamic_render | wall | `open_war_planning_map` | Active |
| `wall_calendar` | dynamic_render | wall | `advance_turn` | Active |
| `red_telephone` | sprite_overlay | desk | `open_diplomacy_panel` | **DISABLED** (Phase II+) |
| `newspaper_current` | sprite_overlay | desk | `open_newspaper_modal` | Active |
| `magazine` | sprite_overlay | desk | `open_magazine_modal` | Active |
| `report_stack` | sprite_overlay | desk | `open_reports_modal` | Active |
| `transistor_radio` | sprite_overlay | desk | `toggle_news_ticker` | Active |

---

## 5. Faction-Specific Customization

The warroom should feel different depending on which faction the player chose. In Phase 0, this is subtle but sets the tone.

| Element | RBiH | RS | HRHB |
|---------|------|----|------|
| Wall Crest | RBiH coat of arms | RS eagle | HRHB checkerboard shield |
| Newspaper Masthead | OSLOBOĐENJE | GLAS SRPSKE | CROATIAN HERALD |
| Report Header | FROM: Gen. Staff / TO: Minister of Defense | FROM: Main Staff / TO: National Assembly | FROM: HVO HQ / TO: HR-HB Presidency |
| Magazine Title | BOSNIAN DEFENCE MONTHLY | SRPSKA VOJSKA REVIEW | HVO STRATEGIC MONTHLY |
| Color Accent | Green-gold (#2D6A4F) | Blue-red (#2E5C8A) | Red-white (#8B1A1A) |
| Desk Lamp Light | Warm fluorescent (neutral) | Slightly cooler (blue tint) | Slightly warmer (amber tint) |

*Note: Desk lamp color and deeper faction theming are Polish phase. For now, crest + masthead + report headers are the minimum differentiation.*

---

# PART B: PHASE 0 GAMEPLAY EXECUTION

---

## 6. What Phase 0 IS (and is NOT)

Phase 0 covers September 1991 through approximately April 1992. It is the pre-war phase: Yugoslavia is disintegrating, armed groups are organizing clandestinely, and political tensions are escalating. The player is shaping the war that will come, not fighting it.

> **CORE PRINCIPLE**
>
> Phase 0 is about PREPARATION, not combat. The player allocates scarce organizational capital to strengthen their faction's position in municipalities across Bosnia. No military formations exist. No control flips occur. No combat resolves. The player is planting seeds whose fruit will be reaped (or lost) in Phase I when war erupts.

### 6.1 What the Player CAN Do

- Allocate Pre-War Capital to organizational investments (police, TO, party, paramilitary)
- Choose between coordinated investment with allies or unilateral positioning
- Influence (but not control) the timing of RS and HRHB declarations
- Observe authority degradation and stability changes across municipalities
- Read intelligence (newspaper, magazine, reports) reflecting the evolving political situation
- Study the map to understand demographic composition and contested areas

### 6.2 What the Player CANNOT Do

- Recruit or create any military formations (no brigades, no militia)
- Fight, apply pressure, or flip control of any municipality
- Directly trigger or prevent declarations (they emerge from conditions)
- Use diplomacy (phone is disabled; no war to negotiate)
- Move units (none exist)
- Issue any military orders

### 6.3 Why This Matters for the Player

The Phase 0 gameplay loop must make the player feel the weight of preparation under uncertainty. They do not know exactly when war will erupt or where the first flashpoints will be. Every capital point spent on police loyalty in one municipality is a point not spent on paramilitary organization in another. The scarcity is the game.

---

## 7. The Phase 0 Gameplay Loop

Each turn represents one week. Phase 0 runs approximately 28–32 turns (September 1991 through March/April 1992). Each turn follows this structure:

### 7.1 Turn Sequence

| Step | System | Player Interaction | What Happens |
|------|--------|--------------------|--------------|
| 1 | Directive Phase | **ACTIVE — Player allocates capital** | Player chooses organizational investments from available capital pool |
| 2 | Investment Resolution | Observe | Investments modify organizational factors (police loyalty, TO control, party strength, paramilitary presence) |
| 3 | Alliance Update | Observe (informed by prior choices) | RBiH-HRHB relationship adjusts based on coordinated vs. unilateral actions |
| 4 | Declaration Pressure | Observe | RS/HRHB declaration pressure accumulates if enabling conditions are met |
| 5 | Declaration Check | Observe (critical event) | If pressure ≥ threshold, declaration triggers with major effects |
| 6 | Authority Degradation | Observe | Contested municipalities may lose authority tiers |
| 7 | Stability Score Update | Observe (via map/reports) | Stability scores update to reflect organizational changes |
| 8 | Escalation Check | Observe | Check if sustained violence threshold is met (triggers Phase I transition) |

**Player Agency Window:** Step 1 is the ONLY active decision point per turn. The rest is observation and consequence. This is intentional: the player is a political leader preparing for a storm, not a general commanding troops.

### 7.2 The Warroom as Gameplay Hub

The warroom is not just a pretty wrapper. In Phase 0, it IS the game interface. Every gameplay action and every piece of feedback flows through the warroom surfaces:

| Warroom Surface | Gameplay Function in Phase 0 |
|-----------------|------------------------------|
| Wall Map (War Planning Map) | View political control, contested status, demographic layers; identify investment targets |
| Wall Calendar | Advance turn (triggers entire turn pipeline); shows current date and remaining pre-war time |
| Faction Crest → Overview Panel | View faction stats: territory %, authority, capital remaining, organizational coverage |
| Newspaper | Narrative feedback: headlines about political events, declarations, international reactions |
| Magazine | Monthly aggregate stats: organizational penetration %, stability trends, authority changes |
| Reports (Situation Reports) | Field intelligence: per-municipality organizational status, warnings about hostile activity |
| Radio (News Ticker) | International context: Yugoslav dissolution events, EC/UN actions, recognition timeline |
| Phone (Diplomacy) | **DISABLED** with tooltip explaining diplomacy is not available until war begins |

---

## 8. Warroom Content per Turn

This is the critical gap in the current implementation. All modal content is placeholder. Here is what each surface should actually show during Phase 0.

### 8.1 Newspaper (Weekly)

The newspaper reflects events from the previous turn (T-1). Headlines are generated from game state changes.

| Trigger Condition | Example Headline (RBiH Perspective) | Example Headline (RS Perspective) |
|-------------------|-------------------------------------|-----------------------------------|
| RS declaration fires | KRAJINA SERBS DECLARE BREAKAWAY REPUBLIC | REPUBLIKA SRPSKA PROCLAIMED: NEW ERA BEGINS |
| HRHB declaration fires | CROAT LEADERS ANNOUNCE HERZEG-BOSNIA | CROAT SECESSIONISTS FOLLOW SERBIAN EXAMPLE |
| Player invests in police (own area) | GOVERNMENT STRENGTHENS SECURITY IN [REGION] | INTERIOR MINISTRY CONSOLIDATES POLICE FORCES |
| Authority degrades in key municipality | GROWING UNREST IN [MUNICIPALITY]: AUTHORITY SLIPPING | DISORDER SPREADS IN MIXED AREAS |
| Alliance strain increases | TENSIONS RISE BETWEEN SARAJEVO AND MOSTAR | MUSLIM-CROAT ALLIANCE SHOWS CRACKS |
| High stability in player territory | SECURITY SITUATION STABLE IN CONTROLLED AREAS | ORDER MAINTAINED ACROSS SERBIAN LANDS |
| JNA transition begins | FEDERAL ARMY BEGINS WITHDRAWAL FROM BOSNIA | JNA REDEPLOYMENT PROCEEDS ON SCHEDULE |
| No significant events | POLITICAL SITUATION REMAINS TENSE | VIGILANCE MAINTAINED AMID UNCERTAINTY |

*Implementation: A headline generation function maps game state deltas to a prioritized headline pool. Each faction gets faction-specific framing of the same events. This is not AI-generated prose; it is template-based with variable substitution.*

### 8.2 Magazine (Monthly, Every 4 Turns)

The magazine provides a monthly strategic overview with hard numbers.

- **Organizational Coverage:** % of own-ethnic municipalities with investment (by type: police, TO, party, paramilitary)
- **Authority Trend:** How many municipalities consolidated vs. contested vs. fragmented (trend arrows)
- **Stability Overview:** Average stability score in controlled municipalities; list of lowest-stability areas
- **Capital Spent / Remaining:** Budget burn rate and remaining capital pool
- **Alliance Status:** RBiH-HRHB relationship score and trend (for RBiH/HRHB players)
- **Declaration Watch:** Current declaration pressure levels for RS and HRHB (if intelligence allows)

### 8.3 Situation Reports (Weekly)

Reports are the closest thing to field intelligence. They arrive with a 1–2 turn delay (mimicking real intelligence lag).

**Format:** Military typewriter style. FROM / TO / DATE / SUBJECT header. Classified stamps.

**Content in Phase 0:**
- Municipality-level summaries of organizational status in areas where player has invested
- Warnings about hostile faction activity in contested areas (vague, since intelligence is limited pre-war)
- JNA posture updates (garrison movements, equipment movements visible to the player's faction)
- Alerts when authority degrades in a municipality the player controls
- Strategic assessment: which areas are most vulnerable to Phase I control flips

### 8.4 News Ticker (International Events)

The ticker provides historical international context as a scrolling feed. These are scripted events tied to specific turns, not procedurally generated.

| Turn (Approx.) | Date | Ticker Event |
|-----------------|------|--------------|
| 0 | Sep 1991 | FIGHTING INTENSIFIES IN CROATIA • EC PEACE CONFERENCE OPENS IN THE HAGUE |
| 4 | Oct 1991 | BOSNIAN PARLIAMENT VOTES ON SOVEREIGNTY • JNA ATTACKS DUBROVNIK |
| 8 | Nov 1991 | VUKOVAR FALLS AFTER 87-DAY SIEGE • UN ENVOY VANCE VISITS BELGRADE |
| 13 | Dec 1991 | GERMANY RECOGNIZES CROATIA AND SLOVENIA • VANCE PLAN FOR CROATIA |
| 17 | Jan 1992 | UN PROTECTION FORCE (UNPROFOR) ESTABLISHED • SDS BOYCOTTS SOVEREIGNTY VOTE |
| 22 | Feb 1992 | INDEPENDENCE REFERENDUM SCHEDULED FOR MARCH 1 • BARRICADES IN SARAJEVO |
| 26 | Mar 1992 | REFERENDUM: 99.7% VOTE FOR INDEPENDENCE • SDS BARRICADES GO UP IN SARAJEVO |
| 28–30 | Mar–Apr 1992 | FIRST SHOTS IN BOSNIA • EC RECOGNIZES BOSNIA AND HERZEGOVINA • SIEGE OF SARAJEVO BEGINS |

*These are hand-authored historical events, not procedural. They provide atmosphere and educational context. The ticker runs continuously when the radio is clicked.*

---

## 9. Capital Allocation UI

This is the core gameplay mechanic of Phase 0. The player must be able to spend their Pre-War Capital on organizational investments through the warroom interface.

### 9.1 Design: How Capital Allocation Works in the Warroom

There are several viable approaches. The proposal is to use the War Planning Map as the investment interface, keeping the warroom metaphor intact.

> **PROPOSED APPROACH: Map-Driven Investment**
>
> 1. Player clicks the wall map to open the War Planning Map
> 2. War Planning Map shows an "INVEST" layer (new toggle, only in Phase 0)
> 3. Player clicks a municipality or region on the map
> 4. A side panel shows: current organizational factors, available investment types, costs, and effects
> 5. Player confirms investment; capital deducted, organizational factor updated
> 6. Map reflects changes (color intensity, organizational icons, stability score change)
>
> This keeps the tactical map as the central decision surface, which is consistent with Phase II (where the map is used for military orders). The player builds muscle memory for map-driven decision-making from the very start.

### 9.2 Investment Types and Costs

| Investment | Cost (Mun.) | Cost (Region) | Effect | Constraints |
|------------|-------------|---------------|--------|-------------|
| Police Organization | 5 | 15 (3–5 mun) | Improves police loyalty; +stability | Cannot invest in hostile-majority areas |
| TO Positioning | 8 | 25 | Influences TO control; militia nucleus in Phase I | RBiH only (TO is BiH govt institution) |
| Party Organization | 4 | 12 | Strengthens party control; +recruitment efficiency | Less effective than armed org |
| Paramilitary Org. | 10 | 30 | Clandestine armed groups; immediate Phase I militia | High visibility risk; increases declaration pressure |
| Coordinated Invest. | −20% | −20% | Joint RBiH-HRHB investment; preserves alliance | RBiH/HRHB only; constrains future territorial division |

### 9.3 Capital Pools (Asymmetric)

| Faction | Starting Capital | Design Rationale |
|---------|-----------------|------------------|
| RS / SDS | 100 points | Institutional advantage: JNA coordination, FRY (Serbia) support, head start on clandestine organization |
| RBiH | 70 points | Government legitimacy and demographic majority, but limited military preparation; TO access compensates |
| HRHB | 40 points | Late formation, dependence on Croatia for support, small demographic base; must be highly selective |

**Capital is NOT renewable.** Once spent, it is gone. This is the fundamental strategic pressure of Phase 0: you cannot prepare everywhere, so where do you NOT prepare?

### 9.4 Faction Overview Panel: Capital Display

The Faction Overview (crest click) needs a new section for Phase 0:

- **CAPITAL:** [remaining] / [starting] points (with usage bar)
- **INVESTMENTS THIS TURN:** list of pending allocations (before confirming turn advance)
- **ORGANIZATIONAL COVERAGE:** visual summary of how many municipalities have been invested in (by type)
- **INVESTMENT HISTORY:** running log of where capital was spent (available in reports/magazine)

---

## 10. Declaration System & Escalation

Declarations are the dramatic turning points of Phase 0. They are NOT player buttons. They emerge from accumulated systemic pressure when enabling conditions are met.

### 10.1 RS Declaration

**Enabling Conditions (ALL must be true):**

1. RS organizational penetration in Serb-majority municipalities ≥ 60% coverage
2. JNA transition triggered or imminent
3. RBiH-RS relationship ≤ -0.5 (hostile)
4. FRY (Serbia) recognition confirmed

**When conditions met:** Declaration pressure accumulates at +10/turn. When pressure ≥ 100, RS declares independence. Historical window: January–April 1992.

**Effects on game state:**
- +0.2 RS legitimacy (internal), -0.3 RS legitimacy (international)
- +50% RS authority consolidation speed in core territories
- +0.1 RBiH legitimacy (victim narrative / defensive framing)
- -30% war escalation threshold (violence becomes more likely)
- International consequences: recognition crisis, sanctions eligibility, arms embargo pressure

### 10.2 HRHB Declaration

Similar mechanics with different conditions: HRHB organizational penetration ≥ 50%, Zagreb support confirmed, RBiH-HRHB relationship ≤ +0.2.

*HRHB declaration is historically later (Nov 1992) but game mechanics allow emergent timing. If alliance strain is high enough, it can occur in Phase 0.*

### 10.3 Escalation to War (Phase I Transition)

**The war begins when ALL of these are true:**

1. Sustained armed clashes: violent incidents between organized armed groups for 2+ consecutive weeks
2. Monopoly collapse: government monopoly on force broken in 3+ municipalities
3. Hostile relationships: at least one faction pair relationship ≤ -0.6

**This transition is emergent, NOT date-triggered.** Historical April 1992 is a reference point, not a mandate. The player's actions can slightly accelerate or delay it.

> **WARROOM PRESENTATION OF ESCALATION**
>
> When escalation is approaching, the warroom should communicate rising tension:
> - Newspaper headlines become increasingly alarming
> - Situation reports mention armed incidents and barricades
> - News ticker events accelerate (referendum, recognition, first shots)
> - Visual: subtle changes like a darkening color cast on the HQ background
> - Magazine stability charts show declining trends
> - When Phase I triggers: full-screen transition event — "WAR HAS BEGUN"

---

## 11. Turn-by-Turn: September 1991 to April 1992

This section outlines what the player experiences week by week. It is NOT a script; events are emergent. This is a representative timeline showing what a typical playthrough might look like.

### 11.1 Early Phase (Turns 0–10, Sep–Nov 1991)

**Player Experience:** Quiet preparation. The map shows political control from 1990 elections. The player studies demographics, identifies vulnerable municipalities, and begins organizational investments. News ticker reports fighting in Croatia.

- Capital allocation is the primary activity: 2–3 investments per turn
- No declarations yet; pressure is building but not visible
- Newspaper reports are political: parliamentary votes, sovereignty debates
- Alliance management (RBiH/HRHB): coordinated vs. unilateral investment choices begin to matter
- Reports show organizational factor improvements in invested areas

### 11.2 Rising Tension (Turns 11–20, Dec 1991–Jan 1992)

**Player Experience:** The pace quickens. Germany recognizes Croatia and Slovenia. RS declaration pressure is visibly building. The player may pivot investments based on emerging threat patterns.

- RS declaration pressure becomes visible in intelligence reports
- JNA transition signals begin appearing (equipment movements, garrison changes)
- Authority degradation starts in contested municipalities (Serb-majority areas with SDS penetration)
- Newspaper headlines shift from political to security-focused
- Capital is running low; player must make increasingly difficult prioritization choices
- HRHB players face the alliance dilemma: cooperate or prepare for the eventual split?

### 11.3 Crisis (Turns 21–28, Feb–Mar 1992)

**Player Experience:** The referendum. Barricades. First shots. The warroom atmosphere should feel urgent and foreboding.

- RS declaration likely fires (if conditions met, typically around turn 22–26)
- Independence referendum (turn 26) is a ticker event with major political consequences
- Stability scores dropping in contested areas; magazine charts show alarming trends
- Situation reports warn of armed group movements and weapons caches discovered
- Final capital allocation decisions feel critical: where will the first battles be?
- Escalation check becomes the key system: how many weeks until all three conditions are met?

### 11.4 War Begins (Turn 28–32, Apr 1992)

**Player Experience:** The escalation threshold is crossed. Phase I begins.

- Full-screen transition: "THE WAR HAS BEGUN" with date and escalation trigger explanation
- Warroom shifts: phone becomes active (diplomacy), reports become military, newspaper covers combat
- All Phase 0 investments crystallize into Phase I initial conditions (organizational penetration, stability scores, authority states)
- The player's preparatory work now determines where militia emerge fast, where control is vulnerable, and how strong their position is

---

# PART C: INTEGRATION & DELIVERY

---

## 12. Implementation Order & Dependencies

| Phase | Work | Depends On | Effort Est. |
|-------|------|------------|-------------|
| A1 | Generate clean background + 5 sprites (Sora/Midjourney + Photoshop) | Asset Generation Brief | External: 2–4 hours |
| A2 | Extend regions JSON schema v1.1 (add `sprite_src`) | Nothing | 1 hour |
| A3 | Update ClickableRegionManager for sprites | A2 | 2 hours |
| A4 | Update `warroom.ts` render pipeline (load/draw sprites) | A2, A3 | 3 hours |
| A5 | Author new regions JSON with actual sprite bounds | A1 (assets delivered) | 1 hour |
| A6 | Update `warroom_stage_assets.ts` for build | A1 | 30 min |
| A7 | Test all 8 regions + visual verification | A1–A6 | 1 hour |
| B1 | Implement Phase 0 turn pipeline (capital system, investment resolution, declaration pressure, authority degradation, stability updates) | Phase 0 Spec v0.5.0 | 8–12 hours |
| B2 | Wire warroom calendar click to Phase 0 turn pipeline | B1, A7 | 2 hours |
| B3 | Implement capital allocation UI in War Planning Map (INVEST layer) | B1, War Planning Map | 6–8 hours |
| B4 | Implement dynamic newspaper headline generation | B1 (state deltas) | 4 hours |
| B5 | Implement dynamic magazine content generation | B1 (monthly aggregates) | 3 hours |
| B6 | Implement dynamic situation report generation | B1 (per-municipality state) | 3 hours |
| B7 | Author historical news ticker events (hand-authored, ~30 events) | Nothing | 2 hours |
| B8 | Implement declaration event presentation (full-screen events) | B1 | 2 hours |
| B9 | Implement Phase 0 → Phase I transition event and state handoff | B1, Phase I pipeline | 4 hours |
| C1 | Faction Overview Panel: add capital display and organizational coverage | B1 | 2 hours |
| C2 | War Planning Map: add demographic/ethnicity layer (existing placeholder) | Map data | 3 hours |
| C3 | Escalation tension visual cues (darkening, urgent headlines) | B1, B4, B8 | 2 hours |
| C4 | Full integration test: play through Phase 0 start to finish | All above | 4 hours |

**Total Estimated Effort:** ~55–70 hours of implementation work, plus external asset generation time.

### 12.1 Critical Path

The critical path runs through: **A1** (assets) → **A5** (region authoring) → **A7** (testing) for visual setup, and **B1** (Phase 0 pipeline) → **B2** (calendar wiring) → **B3** (capital UI) for gameplay. These two tracks can run in parallel.

---

## 13. Handover to Desktop Agent

The desktop agent (Cursor/Claude Code on the repo) should receive this proposal along with the following context:

### 13.1 Files the Agent Needs to Read First

1. This proposal document (for scope and sequence)
2. `docs/10_canon/Phase_0_Specification_v0_5_0.md` (canonical Phase 0 rules)
3. `docs/40_reports/HANDOVER_WARROOM_GUI.md` (current warroom state)
4. `docs/40_reports/WARROOM_GUI_IMPLEMENTATION_REPORT.md` (MVP implementation details)
5. `docs/40_reports/WARROOM_OPTION_B_IMPLEMENTATION_HANDOVER.md` (Option B asset refresh plan)
6. `docs/40_reports/WARROOM_ASSET_GENERATION_BRIEF.md` (external asset generation spec)
7. `docs/40_reports/WARROOM_START_OF_GAME_INFORMATION_REPORT.md` (what info is available at start)
8. `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md` (IPC channels for desktop)
9. `src/ui/warroom/` directory (all warroom source code)

### 13.2 What the Agent Should NOT Touch

- Phase II systems (combat, fronts, AoR, supply) — these are separate and already working
- The tactical map (`src/ui/map/`) — this is the Phase II interface; warroom is Phase 0
- Simulation determinism invariants (no `Date.now()`, no `Math.random()`)
- Existing scenario files (`data/scenarios/`) — Phase 0 needs its own scenario
- Canon documents — the agent implements FROM canon, does not modify canon

### 13.3 Asset Locations

| Asset Type | Location |
|------------|----------|
| Raw Sora/generated assets | `F:\A-War-Without-Victory\assets\raw_sora\` |
| Faction crests | Agent knows the repo path (different folder from raw_sora) |
| Warroom source code | `src/ui/warroom/` |
| Clickable regions JSON | `data/ui/hq_clickable_regions.json` |
| Political control data | `data/derived/political_control_data.json` |
| Settlements GeoJSON | `data/derived/settlements_viewer_v1.geojson` |

---

## 14. Open Questions

| # | Question | Impact | Proposed Resolution |
|---|----------|--------|---------------------|
| 1 | Should Phase 0 have its own scenario file (`sep_1991_phase0.json`) or extend the existing scenario format? | B1 implementation | New scenario file with Phase 0-specific fields (capital pools, starting organizational factors, ticker events). This keeps Phase 0 clean and separate. |
| 2 | How much intelligence should the player have about opposing faction activities? | B6 (reports content) | Limited: player sees own investments clearly, sees stability scores for own-controlled areas, gets vague warnings about hostile activity in contested areas. No direct visibility into enemy capital allocation. |
| 3 | Should the warroom visually deteriorate as tension rises (desperation states)? | C3 (visual polish) | Defer to Polish phase (A5.0). For now, use newspaper tone and headline urgency as the primary tension indicator. |
| 4 | Should the player be able to undo investments within the same turn (before advancing)? | B3 (capital UI) | Yes, allow undo within the directive phase. Once the turn advances, investments are locked. This matches Phase II order staging (where orders can be cleared before advance). |
| 5 | How does the AI play Phase 0 when the human is not controlling a faction? | B1 (turn pipeline) | AI capital allocation should follow simple heuristics: prioritize own-ethnic majority municipalities, spread investments across types, maintain alliance if beneficial. This is Phase 0 bot AI, separate from Phase II bot AI. |
| 6 | Should the starting brief (first time opening warroom at Turn 0) be a one-time modal or integrated into existing surfaces? | UX polish | One-time starting brief as a newspaper EXTRA EDITION: gives historical context, date, and phase framing in-fiction. Never shows again after dismissal. |

---

*END OF PROPOSAL*
