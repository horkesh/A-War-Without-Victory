# Presidential UI Redesign Research

**Date:** 2026-05-24
**Status:** Living planning document
**Scope:** Current Warroom, Army HQ Briefing, Presidential Inbox, Decision Room, modal decision flow, and comparable genre patterns.

## 1. Working Thesis

The current GUI is not one bad screen. It is several partly-correct command surfaces competing for the same job.

The product fantasy is strong: the player is the president, not a brigade commander. The president should receive staff briefings, call commanders, approve exceptional decisions, track consequences, and inspect the war when needed. The current UI has many of those pieces, but they are distributed across Warroom hotspots, a right-rail Inbox, Army HQ tabs, Decision Room cards, Command Briefing, War Summary, Turn Aftermath, Chronicle, and several modals. That creates the exact confusion reported in play: getting to the right place requires knowing the implementation architecture.

Recommendation direction: do not immediately scratch the tactical map or the underlying read models. Do consider replacing the first-layer shell and briefing experience with a simpler presidential desk loop:

1. **Brief:** What changed, what is urgent, what my staff recommends.
2. **Decide:** Modal/card decisions requiring presidential authority, with visible consequences.
3. **Call:** Contact Army CO / Foreign desk / Interior / Humanitarian channel, then receive bounded options.
4. **Inspect:** Open the map, records, or dossiers only when deeper detail is needed.
5. **Advance:** Preview what remains unresolved, then move the week forward.
6. **Review:** Turn aftermath reports consequences, costs, and unresolved follow-ups.

## 2. Current Implementation Research

### 2.1 Entrypoints and Ownership

Current code paths:

- `src/ui/map/App.tsx` is the real shell orchestrator. It mounts the map, Presidential Toolbar, Command Briefing, right rails, Army HQ modal, Inbox, event modals, convoy modal, peace/Dayton modals, Chronicle, Codex, Warroom layer, Warroom Status Bar, and Advance Turn modal.
- `src/ui/map/components/warroom/WarroomShellLayer.tsx` is the current React Warroom scene layer. Hotspots map physical regions to navigation commands.
- `src/ui/map/components/warroom/WarroomStatusBar.tsx` adds a Warroom priority docket and advance-turn affordance.
- `src/ui/map/components/PresidentialInbox.tsx` derives the president's right-rail queue from `src/ui/map/data/inboxItems.ts`.
- `src/ui/map/components/army_hq/ArmyHQModal.tsx` contains the current Army HQ tabs: Briefing, Summary, Records, Personnel.
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` renders the Decision Room inside Army HQ Briefing.
- `src/ui/map/data/presidentialDecisionRoom.ts` builds the Decision Room read model from existing DTOs.

Observed structural problem: the shell has too many first-class ways to say "look here now." The Inbox, Decision Room, Command Briefing, Warroom priority docket, pre-advance review, and Turn Aftermath all synthesize urgency. They are individually defensible, but together they make navigation feel arbitrary.

### 2.2 Briefing Room Problems

Army HQ Briefing currently stacks:

- Chief of Staff briefing.
- Commander dossier.
- Critical/warning/active-ops counters.
- Strategic Position.
- Presidential Decision Room.
- Presidential Attention Panel.
- Situation Briefing.
- Corps cards.

That is too much for the first presidential briefing screen. The player enters expecting a structured staff report and gets a dense tabbed modal with many local affordances. The "Decision Room" being inside the Army HQ Briefing tab also makes the route opaque: Warroom -> Command Briefing folio -> Army HQ -> Briefing -> Decision Room.

Recommendation: collapse the presidential briefing into one front-door "President's Desk" surface. Army HQ should be contacted from that desk for military matters, not be the container that owns every presidential priority.

### 2.3 Navigation Confusion

Current Warroom hotspot mappings are too implementation-shaped:

- `command_briefing_folio` opens Army HQ Briefing.
- `wall_flag_area` and `commander_coatrack` open Army HQ Summary.
- `diplomatic_telephone` opens Army HQ Summary until a dedicated diplomacy surface exists.
- `desk_map` opens tactical map by returning undefined from `regionToShellHandoff`.
- The Warroom status bar separately opens a priority docket.

This means the room objects do not always match the mental model. The player sees a telephone but gets a summary. The map is a navigation escape rather than a framed inspection mode. The calendar can either open advance turn or redirect to priorities depending on blocking state.

Recommendation: make Warroom objects correspond to presidential verbs:

- Desk folio: daily briefing.
- Telephone: call Army CO / diplomacy / humanitarian desk.
- Calendar: advance-week protocol only.
- Map board: inspect war.
- Radio/newspaper: public record / news / chronicle.
- Flag/crest: faction state and legitimacy, not generic Army HQ Summary.

### 2.4 Leak and Player-Truth Risks

Known repo guidance already says normal UI must not leak raw ids, all-faction data, hidden enemy truth, or debug vocabulary. The current code has good filters in several places, but leak risk remains because many panels read the same broad `LoadedGameState`.

Concrete current risks found:

- `src/ui/map/data/inboxItems.ts` convoy cards print `route_faction` and `target_enclave` directly. These can surface raw faction/enclave identifiers instead of staff-safe display language.
- The same file reserve cards derive corps names with `req.corps_id?.replace(/_/g, ' ')`, which can surface implementation names and non-player-facing corps ids.
- `src/ui/map/data/presidentialDecisionRoom.ts` still has a generic `humanize(...)` fallback that converts ids to title case. That is safer than raw ids but still not a player-safe label contract.
- `src/ui/map/components/SettlementDetailContent.tsx` still renders faction keys in some population/displacement snippets; these may be acceptable in dev, but player-facing settlement dossiers should use political/military display names consistently.
- `src/ui/map/components/WarCostSummary.tsx` renders `entry.faction` and response ids with underscore replacement; war-cost surfaces are player-facing, so these should use label helpers.
- `src/ui/map/components/VerdictScreen.tsx` still uses "OSIDs controlled" in outcome detail. OSID is engine vocabulary, not player language.
- Legacy `src/ui/warroom` still exists beside React Warroom. Some legacy surfaces are disciplined, but the dual stack increases the chance that older leak fixes are not applied consistently.

Planning implication: a redesign must start with a player-truth boundary, not component styling. The correct shape is a single "presidential visibility snapshot" consumed by all first-layer surfaces.

## 3. Comparable Game Patterns

### 3.1 Europa Universalis

EU's alert pattern is useful because alerts are compact, severity-coded, persistent, and actionable. They do not explain everything on the first screen; they point to the owning correction surface. The lesson for AWWV is not to copy EU's omniscience, but to adopt the "alert -> owning screen -> correction" rhythm.

Applied to AWWV:

- A pending convoy decision should be one alert card with a clear action.
- A fragile front should link to the military briefing or map focus.
- A humanitarian/political pressure spike should link to the responsible briefing, not a generic summary tab.

Sources consulted:

- Paradox Wikis, Europa Universalis IV interface and alert/message concepts: https://eu4.paradoxwikis.com/Interface
- Paradox Wikis, Europa Universalis IV outliner: https://eu4.paradoxwikis.com/Outliner

### 3.2 Hearts of Iron

HoI's useful lesson is the event/decision loop: popups interrupt when they matter, choices are explicit, and the player can inspect effect language before choosing. National identity is also constant through flags, leaders, focuses, and map color. The risk for AWWV is copying HoI's direct-control fantasy. AWWV should not make the president drag brigades or optimize divisions.

Applied to AWWV:

- Presidential decisions should appear as modals or high-weight desk cards, not as another tab.
- Each option should preview political, military, humanitarian, and command-relationship effects in plain language.
- Army CO calls should present intent options: "stabilize front," "prepare offensive," "conserve force," "probe," "refuse/push back," not brigade orders.

Sources consulted:

- Paradox Wikis, Hearts of Iron IV interface: https://hoi4.paradoxwikis.com/Interface
- Paradox Wikis, Hearts of Iron IV events: https://hoi4.paradoxwikis.com/Event

### 3.3 AGEOD / Civil War II

Civil War II and related AGEOD games lean on reports, messages, tooltips, regional decisions, and post-turn logs. This is closer to AWWV's tone than HoI. The player often works through orders, reports, regional cards, and turn processing rather than real-time manipulation. The useful lesson is that friction can be enjoyable if the paper trail is readable and consequential.

Applied to AWWV:

- "Turn-end intelligence packet" should be a first-class post-turn artifact.
- Decisions can be cards with art, issuer, affected area, and expected effects.
- Records should be a campaign memory layer, not a raw all-faction archive.
- The map should remain inspectable, but reports should tell the president where to look first.

Sources consulted:

- Matrix Games / AGEOD Civil War II manual: https://ftp.matrixgames.com/pub/CivilWarII/Civil_War_II_Manual%5BE-Book%5D.pdf
- AGEOD Civil War II product/manual page: https://www.matrixgames.com/game/civil-war-ii

## 4. Redesign Options

### Option A: Consolidate Existing Shell

Keep Warroom, Army HQ, Inbox, Decision Room, and current map. Rename and route more clearly. Fix leaks. Move the Decision Room higher in the hierarchy.

Pros: lowest risk; preserves implemented work.
Cons: still likely to feel like patched architecture because the player can see too many inherited surfaces.

### Option B: New Presidential Desk Shell Over Existing Read Models

Build a new first-layer presidential shell that consumes existing read models but presents them as one desk workflow. Warroom remains atmospheric background/room navigation. Army HQ becomes one callable office, not the briefing container. Tactical map remains the inspection surface.

Pros: best balance. It keeps working data and map systems while changing the confused experience.
Cons: requires strong product discipline to retire or hide duplicate entry points.

### Option C: Scratch GUI and Rebuild

Replace the Warroom/Army HQ/Inbox/Decision Room shell wholesale while preserving simulation and map renderers as lower-level modules.

Pros: cleanest mental model.
Cons: high regression risk; likely repeats solved issues unless the visibility snapshot and decision routing contracts are designed first.

Recommendation: Option B. Scratch the user-facing shell if needed, not the whole GUI stack. The map, adapter, event-decision modal, pre-advance model, and many read models are valuable. The problem is composition and ownership.

## 5. Proposed Target Experience

### 5.1 First Screen

The first screen after loading a campaign should be the Warroom / President's Desk, not the tactical map with many panels.

The player sees:

- Current date and war phase.
- One primary staff briefing card.
- Blocking presidential decisions.
- Top three risks/opportunities.
- One visible "Call Army CO" action.
- One "Inspect War Map" action.
- One "Review Last Week" action if turn aftermath exists.
- Advance-week calendar action with a clear blocked/clear state.

No tabs on the first screen. No all-faction dashboards. No raw ids.

### 5.2 Decision Cards and Modals

Decision cards should replace many tab-like surfaces. A card should contain:

- Title.
- Issuer or source office.
- Affected place/front/faction in player-safe language.
- Why this reached the president.
- Options.
- Expected effects grouped by Military / Political / Humanitarian / Command relationship.
- "After I choose" follow-up: where the effect can be tracked.

Use modals for decisions that block advancement. Use cards for advisory or review items. Avoid image cards as navigation tabs; image cards are useful for events and office identity, not for hiding a tab system under pictures.

### 5.3 Calling the Army CO

The president should not order brigades. The "Call Army CO" flow should ask the CO for:

- Situation estimate.
- Recommended posture.
- Concerns and constraints.
- Options the president can authorize at army/corps/sector level.
- Pushback when the request exceeds capability.

This aligns with the existing command doctrine: Army -> Corps -> Sector, with brigades executing through commanders.

### 5.4 Tracking Consequences

Every decision card should create or point to a follow-up record:

- "This affected IVP by..."
- "This increased command strain..."
- "This changed convoy/humanitarian state..."
- "This operation is now authorized/postponed..."
- "This will appear in next turn's aftermath under..."

The player should not have to remember which modal caused which result.

## 6. Image Asset Strategy

The game has too few image assets, but the fix is not generic decoration. AI image generation should enrich identity, event memory, and office context.

High-value assets:

- Warroom scene plates by faction and war year, with stable hotspot geometry.
- Office/person desk backgrounds for Army CO, diplomacy, humanitarian desk, intelligence, and records.
- Event/decision card images: newspapers, telegrams, typed orders, convoy photos, map annotations, radio transcripts, refugee dispatches.
- Commander portrait treatments where historically and ethically appropriate; otherwise use dossier silhouettes, ID-card crops, rank insignia, office desk photos, or document bundles.
- Turn aftermath packet covers and report imagery.
- Faction-specific record book covers, stamps, seals, and document textures.

Guardrails:

- Do not use images as fake tabs unless the image itself communicates the office or decision.
- Keep text rendered by the app, not baked into images, except purely decorative stamps/seals.
- Use stable aspect ratios and measured hotspot geometry.
- Avoid glamorizing sensitive violence. Humanitarian and atrocity-adjacent decisions should use sober document/report imagery, not spectacle.

## 7. Open Questions

1. Should the tactical map remain accessible immediately, or should the Warroom/President's Desk be the default home every turn?
2. Should "Army HQ" be renamed in the player shell to "Call Army Commander" / "Main Staff" to reinforce indirect control?
3. Which surfaces should be retired from the first-layer shell after the new desk exists: Inbox, Command Briefing Layer, Decision Room advanced loop, Warroom priority docket, or some combination?
4. What is the minimum player-safe visibility snapshot needed before any UI rebuild begins?
5. Which decisions deserve blocking modals versus non-blocking desk cards?

## 8. Proposed Next Work

1. Create a player-safe presidential visibility snapshot contract.
2. Inventory all current player-facing surfaces that read broad `LoadedGameState`.
3. Decide which first-layer surfaces survive in the new desk model.
4. Prototype one static President's Desk screen using current read models.
5. Convert one decision family, preferably convoy or event decision, into the target card/modal structure.
6. Run a leak audit on the prototype before visual polish.
7. Generate a small asset brief for one faction/year Warroom plus five decision-card image templates.
