# Comprehensive GUI Review — Player Perspective

**Date:** 2026-03-07  
**Type:** Orchestrator convene / research document  
**Status:** Implementation in progress  
**Audience:** Product Manager, UI/UX Developer, Technical Architect, Gameplay Programmer  

---

## Implementation Status Update

### 2026-03-07 — Phase 1 landed

The first implementation slice from this review is now live in the canonical map UI:

- a new **Command Briefing** layer is mounted in `App.tsx`
- it is fed by a deterministic `commandBriefing` view-model derived in `GameStateAdapter.ts`
- the toolbar now separates **utility/load controls** from **player-facing command signals**

Architect decision used for this cut, flagged for later review:

- keep the briefing layer as a **thin App-mounted orchestrator** that routes into existing panels/modals
- keep urgency synthesis in `GameStateAdapter`, not scattered across React components
- defer panel-rail coupling to the next phase

This means recommendation `P0.1` is partially implemented and recommendation `P0.2` has begun. The next implementation cut remains `P0.3`: right-drill panel behavior replacing competing stacked overlays.

### 2026-03-07 — Phase 2 landed

The panel choreography slice is now live in the canonical map UI:

- `App.tsx` now derives one canonical primary/secondary rail state and mounts active detail panels from that single source
- `panelRail.ts` now owns the deterministic rail selector used to keep parent detail context alive during drill-down
- settlement, army, corps, sector, formation, and operation surfaces now share the same slide-right rail semantics instead of mixing unrelated overlay rules
- sector, corps, and army drill-down clicks now preserve parent context so detail flow reads as `parent -> child` rather than `replace and forget`
- closing an operation detail no longer wipes its parent selection, and `Escape` now clears the whole active rail cleanly

Architect decision used for this cut, flagged for later review:

- keep rail ownership in `App.tsx` plus a pure selector in `panelRail.ts`, rather than trying to spread precedence across each panel component
- preserve existing detail surfaces and drill targets instead of redesigning the content of those panels during the motion pass
- keep `OperationsPanel` as a separate browser surface for now, while making `OperationDetail` the canonical rail-mounted operation destination

This means recommendation `P0.3` is now implemented in the map UI. The next implementation cut is the warroom scene-plate contract and hotspot alignment work.

### 2026-03-07 — Warroom contract, hotspot mapping, and identity pass landed

The warroom follow-on slices from this review are now live in the canonical warroom UI:

- the scene-plate contract is now explicit in code: `2752x1536`, one scene plate per faction key, and only `flag`, `calendar`, and `ticker` remain runtime-rendered overlays
- hotspot behavior is now anchored to physical room objects rather than loose legacy prop/action naming
- the canonical hotspot map now uses room-object ids such as `command_briefing_folio`, `newspaper_stack`, `intelligence_journal`, `diplomatic_telephone`, `desk_radio`, `wall_flag_area`, and `wall_calendar_area`
- stale sprite-prop scaffolding was removed so the implementation no longer points back toward detachable in-scene prop workflows
- warroom reports, newspaper, magazine, faction overview, and ticker now carry stronger faction-specific ceremonial voice and labeling

Architect decisions used for this cut, flagged for later review:

- keep `warroom.ts` as the only scene composition root; do not introduce a second prop/sprite rendering lane
- use physical anchor identity to drive modal routing, while keeping compatibility with older action strings during transition
- keep shared hotspot geometry across faction variants for now, with the assumption that future plates remain paint-overs of one fixed composition

This means the review’s warroom implementation lane is now active across scene contract, hotspot architecture, and faction identity/presentation. Remaining future improvement work is polish-on-top rather than missing foundational structure.

### 2026-03-07 — Phase 4 visibility and polish pass landed

The remaining visibility/polish lane from this review is now live in the canonical map UI:

- the summary modal now acts as a focused command hub instead of a generic static overview
- command-routing now supports focused summary destinations for IVP, convoy decisions, support posture, and OPSEC review
- the top toolbar’s IVP and convoy badges now deep-link into the correct summary focus instead of behaving like passive counters
- the command briefing now routes IVP/support into focused summary sections and now surfaces active OPSEC sectors
- `SituationTab` now exposes an operational-posture section so OPSEC and fragile operation health are summarized in one player-facing place
- operation list cards, enclave cards, and sector dossier headers now speak more clearly in terms of health/risk/posture rather than just raw values

Architect decisions used for this cut, flagged for later review:

- keep Phase 4 centered in the canonical React map app rather than adding a second warroom-side command architecture
- treat casualty pressure and OPSEC as presentation/routing of existing state, not as new derived mechanics
- defer a full supply-lines/corridor overlay to a later dedicated slice instead of inflating this finishing pass

This means the foundational recommendations from this review are now implemented end-to-end, with remaining future work now in the category of optional expansion rather than missing core command flow.

---

## 1. Mandate

Review the current state of the AWWV GUI across both:

- the **warroom**
- the **canonical live tactical map**

This review is from the **player's perspective**, with emphasis on:

- clarity
- sufficiency of information
- consistency
- emotional engagement
- faction identity and pride
- polish and slickness
- systems that already exist but are not visible enough in the GUI

This document absorbs and extends the earlier expert report in `docs/knowledge/GUI Expert Review - A War Without Victory.mhtml`, but does **not** rely on it alone.

---

## 2. Sources and method

### Sources consulted

- Prior expert report: `docs/knowledge/GUI Expert Review - A War Without Victory.mhtml`
- Engineering reference: `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- Warroom implementation context: `docs/40_reports/implemented/HANDOVER_WARROOM_GUI.md`
- React tactical map status/context: `docs/40_reports/20260228_REACT_MAP_APP_COMPREHENSIVE_STATUS.md`
- Figma Make reference: `https://www.figma.com/make/QFD2hlec0zuP1jx206kPnV/Wargame-Simulation-GUI`
- Direct code review of current GUI surfaces in `src/ui/map/` and `src/ui/warroom/`
- Specialist review input from UI/UX and wargame-comparative perspectives

### Important limitation

Runtime browser automation proved unstable during this session, so this report is primarily a **code-and-document-backed audit** with limited runtime confirmation. That is still sufficient for structural GUI recommendations because the important issues here are information architecture, hierarchy, affordance, consistency, and thematic presentation, all of which are visible in the implementation and docs.

---

## 3. Big-picture assessment

### Where we are

The current GUI already has a strong identity:

- the tactical map has a serious command-post tone rather than a generic game HUD
- the dossier treatment for sector intelligence is memorable
- the OOB, operations, and sector tooling are moving toward a real staff-work workflow
- the warroom has a promising "institutional power center" fantasy

### Where we are not yet good enough

The current experience still undersells the game in three key ways:

1. **It does not consistently tell the player what matters most right now.**
2. **It has many real systems, but too many of them are buried, fragmented, or discoverable only if the player already knows they exist.**
3. **It creates competence, but not enough attachment.** The player can operate a faction, but does not yet feel enough pride, ceremony, fear, or ownership in it.

### Overall grade

- **Clarity:** B-
- **Information sufficiency:** B
- **Consistency:** B-
- **Faction identity / emotional pull:** C+
- **Polish and motion language:** C
- **Underlying strategic honesty:** B+

The important takeaway is positive: **the foundation is already strong enough that targeted GUI work can create a large perceived quality jump without inventing new mechanics.**

---

## 4. What already works well

### 4.1 Tactical map strengths

- The map is already the most mature player-facing surface.
- `OOBSidebar`, `OperationsPanel`, `FormationDetail`, `CorpsFrontPanel`, `SelectionPanel`, `SituationTab`, and `EnclaveDashboard` together cover much of the real command loop.
- Sector intelligence presentation is distinctive and more atmospheric than the average strategy-game side panel.
- The dossier metaphor suits the setting.
- The use of fog, REDACTED states, operational overlays, and corps/formation drilldown is aligned with the game's friction-first identity.

### 4.2 Warroom strengths

- The warroom still has the best chance of giving AWWV a unique identity compared to genre peers.
- It provides a narrative and institutional wrapper around the operational map.
- The desk/room concept can carry faction pride, fatigue, ceremony, and political pressure better than the map alone.

### 4.3 Genre position

Compared to many operational/strategy games, AWWV is already strongest when it emphasizes:

- institutional friction over omniscient control
- command atmosphere over sterile dashboards
- decisions under partial information
- consequences that feel political and humanitarian, not merely territorial

That is the right lane.

---

## 5. Main findings

## Finding 1: The GUI knows more than it tells the player

This is the single biggest problem.

Many systems already exist in state and in parts of the UI, but they are not surfaced with enough priority, explanation, or continuity. The player can miss important mechanics simply because they are hidden in secondary panels, visible only after selection, or presented as passive numbers rather than active decision signals.

### Consequence

- Players will underuse systems that already work.
- The game risks feeling more opaque than it truly is.
- When bad outcomes happen, the player may blame randomness or confusion instead of understanding the chain of cause and effect.

---

## Finding 2: The tactical map has good components but weak global hierarchy

Individually, many panels are solid. Together, the screen still lacks a single crystal-clear answer to:

**What should I look at first? What is urgent? What decision is the game asking me to make?**

Current problem patterns:

- important values are shown as static labels instead of actionable briefings
- several surfaces compete equally for attention
- some panels are rich internally but weakly connected to the rest of the command flow
- the top toolbar mixes debug/load utility with strategic information

### Example

`TopToolbar.tsx` surfaces `IVP` and convoy counts, but in a compressed "badge" form, while the more meaningful IVP breakdown and convoy decision UI live elsewhere. This is accurate but not legible as a player-facing command rhythm.

---

## Finding 3: The warroom concept is stronger than the current warroom execution

The warroom has excellent thematic potential, but some current elements still read as placeholders, utility screens, or disconnected icons rather than a coherent command environment.

In particular:

- some warroom actions still feel like menu launchers rather than diegetic command decisions
- "coming soon" and placeholder behavior weakens trust
- the room needs more ceremonial identity per faction and stronger emotional cadence between turns

The warroom should feel less like a shell around tools and more like the place where political, operational, and symbolic authority converge.

---

## Finding 4: Faction pride is present visually, but not yet systemically dramatized

There are already crests, flags, and faction colors in places like `TopToolbar.tsx`, `FormationDetail.tsx`, and the army/corps detail surfaces. This is good.

But pride is still too cosmetic.

What is missing is a stronger sense that:

- your faction has a distinct institutional character
- your commanders, honors, sacrifices, and vulnerabilities belong to *your side*
- the interface itself recognizes service, suffering, and continuity

Future patriotic players will respond not just to flag treatment, but to:

- memorialization
- ceremonial language
- faction-specific briefings
- honors
- command lineage
- "we are still holding" moments

---

## Finding 5: The map itself is solid, but some touch-ups would improve legibility and drama

The map does **not** need a fundamental redesign.

It **does** need selective touch-up in:

- priority highlighting
- front pressure readability
- supply-path communication
- enclave jeopardy visibility
- stronger differentiation between "important background geography" and "current operational problem"

The map should preserve its current serious tone, but become better at spotlighting danger, opportunity, and commitment.

---

## 6. Existing systems that are under-surfaced

These are the most important "already exists, but the player can still miss it" systems found in the current GUI/state surface.

| System | Evidence in current UI/state | Why player needs it | Best surface |
|---|---|---|---|
| IVP breakdown and consequences | `SituationTab.tsx`, `TopToolbar.tsx`, adapted state in `GameStateAdapter.ts` | Lets the player understand political cost, not just see a number | Clickable IVP briefing drawer from top bar and warroom desk briefing |
| Humanitarian convoy decisions | `SituationTab.tsx`, top-bar convoy count | This is a high-value moral/political decision point | Alert tray + decision card, not just buried in situation accordion |
| Municipality support orders | `SelectionPanel.tsx`, `SituationTab.tsx` | Gives player local agency with faction-specific flavor | Settlement panel plus faction briefing queue |
| Officer quality and named officers | `FormationDetail.tsx`, `OOBSidebar.tsx`, adapted named officer state | Explains why formations and corps behave differently | Always-visible commander chips in OOB and corps headers |
| Decorations, honors, war stories | `FormationDetail.tsx`, `ArmyDetail.tsx`, `CorpsDetail.tsx` | Major faction-pride and attachment lever | Expand into honors/record strips, not just occasional badges |
| OPSEC state | `CorpsFrontPanel.tsx`, adapted sector intel state | A real player decision with clear tradeoff | Sector header banner + map overlay iconography |
| Intel confidence and offensive signs | `CorpsFrontPanel.tsx` | Core to truthful uncertainty | Better global warning language and map-level signal |
| Operation health | `OperationsPanel.tsx` with momentum, supply, cohesion, failures, readiness | Essential to deciding whether to continue, halt, or refocus | Operation cards should be more prominent and summary-first |
| Enclave resilience and airdrop allocation | `EnclaveDashboard.tsx`, adapted enclave state | High-stakes humanitarian and military story | Persistent warning strip plus direct jump from top bar/map |
| Displacement / population change | `SelectionPanel.tsx` via `SettlementDetailContent` | Human cost and control consequences | Settlement and map overview should foreground it more |
| Casualty ledger | `SituationTab.tsx` | Makes the war feel costly and real | Always-visible strategic ticker / end-turn summary |
| Strategic reserves | adapted in `GameStateAdapter.ts`, weak surface presence | Explains strategic flexibility and emergency response | Situation/war summary and faction overview |

### Key judgment

The issue is **not** "missing mechanics."  
The issue is **missing dramatic and navigational emphasis.**

---

## 7. Player-perspective recommendations

## 7.1 Make the command loop explicit

The player-facing loop should read clearly as:

1. **What changed?**
2. **What is urgent?**
3. **Where is the danger?**
4. **What can I decide now?**
5. **What will likely happen if I do nothing?**

Today that loop exists implicitly, but not strongly enough in the presentation.

### Recommendation

Add a compact **Command Briefing layer** that sits above the current component set:

- urgent warnings
- major pending decisions
- strategic pressure summaries
- quick links into sectors, enclaves, operations, and diplomacy/political cost

This should not replace the rich panels. It should **orchestrate** them.

---

## 7.2 Separate player-facing command information from developer/load utilities

The current top bar still blends:

- load/save/run tooling
- campaign creation
- strategic information

That is useful during development, but weakens the feel of a finished command interface.

### Recommendation

Split the current top toolbar into:

- a **player-facing command strip**: date, phase, faction crest, IVP state, urgent decisions, turn advance, summary
- a **secondary utility/debug strip** or hidden drawer for load/latest/run ID and similar workflow tools

This change alone would make the GUI feel more intentional.

---

## 7.3 Promote consequence surfaces, not just state surfaces

Static state is less valuable than causal explanation.

For example:

- "IVP 62%" is weaker than "IVP elevated: Sarajevo + enclaves + atrocities"
- "Convoys 2" is weaker than "2 humanitarian corridor decisions pending"
- "Enclaves" is weaker than "2 enclaves at risk within 2 turns"

### Recommendation

Convert more labels into **explaining labels**.

This especially applies to:

- IVP
- enclaves
- supply pressure
- operation failures
- alliance strain
- casualties

---

## 8. Warroom recommendations

## 8.1 Treat the warroom as the emotional and ceremonial layer

The map is for operational truth.  
The warroom is where the player should feel:

- burden
- command legitimacy
- institutional identity
- fatigue
- pride
- political pressure

### Recommendation

Lean the warroom further into:

- faction-specific room dressing and atmosphere
- turn-opening briefings
- bulletin or dispatch treatment for major events
- stronger command ritual when advancing turns
- faction-voiced summaries rather than neutral generic modal language

Examples:

- RS: formal military-state authority, staff confidence, heavy apparatus, grim inevitability
- RBiH: survival, improvisation, endurance, civic defense, sacrifice
- HRHB: dual political-military balancing, external dependence, compact but identity-charged command tone

No new mechanics are required. This is presentation, language, framing, and art-direction logic.

---

## 8.2 Remove or hide placeholder dead ends

Any warroom control that opens a thin placeholder, "coming soon" panel, or inert affordance damages trust more than simply hiding the control.

### Recommendation

- hide unfinished tools from primary flow
- replace placeholders with minimal real briefings if removal is impossible
- use disabled states only when they communicate a clear future condition, not vague incompleteness

---

## 8.3 Make the end-turn moment feel consequential

The warroom should own the emotional cadence of the turn cycle.

### Recommendation

Before or after turn advance, add a short briefing layer with:

- control changes
- casualties
- major operation progress/failure
- enclave deterioration
- political/diplomatic shifts
- notable honors or severe losses

This is one of the highest-leverage ways to make the game feel memorable.

---

## 9. Tactical map recommendations

## 9.1 Keep the map, improve emphasis

Do not replace the current map language. Improve it through emphasis:

- stronger urgency highlighting for endangered sectors/enclaves
- clearer operation focus signaling
- more readable supply line/corridor communication
- more deliberate use of glow, pulse, and contrast for actionable items only

### Recommendation

Reserve motion for:

- imminent offensive signs
- pending decisions
- enclave danger
- currently selected operation objective chain

Everything else should remain disciplined and quiet.

---

## 9.2 Surface supply as a network, not only a condition

The current UI conveys supply state better than supply topology.

### Recommendation

Add an optional **Supply Lines / Corridors** overlay that shows:

- supply origin
- threatened route segments
- cut links
- enclave-relevant corridors

This will improve both clarity and the feeling that the player is commanding a living logistical struggle.

---

## 9.3 Make danger forecasts visible before disaster

The game already models many states that imply future danger, but the UI often surfaces them only once the problem is already advanced.

### Recommendation

Use forecast language such as:

- "Likely isolated in 2 turns"
- "Offensive signs rising"
- "Operation nearing exhaustion"
- "Sector under-supplied trend"

This should appear in summary surfaces first, detail panels second.

---

## 10. Panel architecture and motion

The user's requested direction is correct:

**detail panels should not feel like stacked clutter. They should drill right in a controlled animated rail.**

### Current state

The code already points partly in that direction:

- `FormationDetail.tsx` uses right-side panel styling and slide-in classes
- `CorpsFrontPanel.tsx` also uses right-side slide-in behavior
- there is a shared `panelRail` concept already in use

### Recommendation

Adopt a strict panel architecture:

- **Level 0:** map / OOB / operations overview
- **Level 1:** primary right-side detail panel
- **Level 2:** secondary child panel slides out to the right of the current one
- never open multiple overlapping "competing" detail surfaces on top of each other

### Motion rules

- use short horizontal slide transitions for drill-down
- keep easing restrained, military, and deliberate
- animate panel replacement, not whole-screen flourishes
- preserve context: parent panel remains partially visible when child panel is open

### Example target behaviors

- sector selected -> sector dossier opens
- operation inside sector selected -> operation detail slides out to the right
- brigade inside operation selected -> brigade detail slides out to the right

This is more legible, more polished, and more in line with command-software behavior than stacking.

---

## 11. Faction pride and attachment

This deserves explicit focus because it is a major opportunity.

## 11.1 Pride should come from record, not only symbolism

Flags and crests help, but attachment becomes stronger when the GUI preserves:

- unit honors
- named commanders
- notable actions
- cumulative sacrifice
- "what our side is holding onto"

### Recommendation

Strengthen faction pride through:

- honors strips
- memorialized fallen / severe-loss summaries
- named formation records
- campaign service badges
- turn-summary phrasing that reflects faction voice

This can all be done using data and surfaces that already exist or are adjacent to existing data.

---

## 11.2 Give each faction a stronger command personality

The interface should feel slightly different in mood and rhetoric depending on who the player is.

Not a different layout. A different tone.

### Recommendation

Use faction-sensitive:

- headings
- status labels
- briefing vocabulary
- ceremonial accents
- ambient palette weighting

The goal is not propaganda excess. The goal is **institutional specificity**.

---

## 12. Out-of-the-box ideas worth exploring

These are presentation ideas, not mechanics proposals.

### 12.1 Command Briefing Strip

A thin, high-priority strip summarizing:

- urgent decisions
- sector alarms
- enclave risk
- IVP spikes
- major operation failures

Clicking an item jumps to the correct panel and map focus.

### 12.2 Faction Record Book

A war record surface that aggregates:

- honors
- notable commanders
- casualties
- lost/gained key towns
- current symbolic strongholds

This is ideal for pride, memory, and campaign continuity.

### 12.3 Turn-end intelligence packet

Instead of a plain update, present a short packet:

- key front changes
- likely enemy intent
- humanitarian pressure
- political risk
- recommendation tags

### 12.4 Operational concern heat lens

Not a raw map mode, but a synthesized "command concern" lens that highlights places where multiple bad factors overlap:

- low supply
- low confidence
- high enemy pressure
- enclave fragility
- exhausted operation

This would help players parse the board at a glance without making the game omniscient.

---

## 13. Comparables and why they matter

### Hearts of Iron

Useful lesson:

- strong national identity and macro command framing

Do **not** copy:

- overly clean certainty
- false confidence in what the player supposedly knows

### AGEOD / Decisive Campaigns lane

Useful lesson:

- reports, friction, texture, and command atmosphere can carry a game

This is close to AWWV's strongest path.

### Unity of Command 2

Useful lesson:

- information priority and visual clarity of what matters now

AWWV should emulate the **clarity**, not the abstraction level.

### Command: Modern Operations

Useful lesson:

- serious operator tone and authentic control-room feeling

But AWWV must remain more legible and less spreadsheet-imposing than pure simulation software.

---

## 14. Prioritized recommendations

## P0 — Highest impact

1. **Establish a command-briefing hierarchy above existing panels.**
   Turn static labels into urgent, clickable decision summaries.

2. **Separate command information from load/debug utilities.**
   Move save/load/run tooling out of the primary player strip.

3. **Adopt right-drill panel behavior as the standard.**
   No more cluttered stacking for sector/operation/formation detail flows.

4. **Promote under-surfaced systems into obvious player signals.**
   Especially IVP, convoy decisions, enclave risk, OPSEC, and operation health.

5. **Strengthen faction identity in warroom and summary language.**
   Not new mechanics; stronger framing, ceremony, and record.

## P1 — Strong value

1. **Add supply-lines / corridor overlay.**
2. **Create a better end-turn briefing cadence.**
3. **Expand honors / commander / war-story presentation.**
4. **Improve forecast messaging for impending crisis.**
5. **Touch up map emphasis for danger and opportunity.**

## P2 — Polish and finishing

1. **Audit all placeholder or thin dead-end surfaces.**
2. **Normalize motion/easing across panel transitions.**
3. **Standardize tone, capitalization, and military language across surfaces.**
4. **Refine iconography and alert styling for urgency tiers.**

---

## 15. Single agreed priority and owner

### Single agreed priority

**Convert the current GUI from a collection of good panels into a guided command experience.**

### Owner

**Orchestrator -> Product Manager** for phase sequencing  
**Product Manager -> UI/UX Developer + Technical Architect** for implementation plan  
**Gameplay Programmer** to support only where surfacing requires state/IPC additions

---

## 16. Recommended next planning cut

Turn this report into a concrete plan with three workstreams:

1. **Information hierarchy pass**
   Command strip, alerts, decision queue, top-bar split

2. **Panel architecture + motion pass**
   right-drill panel rail, no-stacking rule, animation language

3. **Faction identity + briefing pass**
   warroom tone, faction voice, honors/record, end-turn packet

These three together would produce the biggest visible quality gain.

---

## 17. Final judgment

The GUI is **closer to excellent than it may feel during play**, because many of the hard systems and several strong interface concepts are already present.

What is missing is not a complete redesign.

What is missing is:

- hierarchy
- guided urgency
- stronger emotional framing
- better surfacing of existing systems
- cleaner panel choreography

If those are addressed, AWWV can move from "interesting and promising" to "coherent, distinctive, and memorable."
