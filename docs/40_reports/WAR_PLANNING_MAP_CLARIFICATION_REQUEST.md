# War Planning Map — Clarification Request (Product Manager & Game Designer)

**Date:** 2026-02-06  
**Status:** Filled (Orchestrator-convened PM + Game Designer per strategic direction)  
**Purpose:** Clarify what is necessary for the War Planning Map as a **separate GUI system** and produce joint recommendations.

**Strategic direction (Orchestrator):** When filling this document, align with [GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md](GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md). In short: (1) **One base geographical map** (not yet created), then color it with **information layers**. (2) **War system** is separate: user gives orders to brigades, corps, OGs, army, and orders must flow into one another. (3) **Settlement click** must provide layered information: **settlement**, **municipality**, and **side**.

---

## Context

The **War Planning Map** is a **separate GUI system** (not merely an overlay). It is currently opened from the warroom by clicking the wall map and is presented as a full-screen layer. It provides:

- Political control by settlement (from `political_control_data.json`)
- Contested crosshatch (CONTESTED / HIGHLY_CONTESTED from `control_status_by_settlement_id`)
- Layer toggles: Political control, Contested outline (live); Order of Battle, population/ethnicity, displacement (placeholders for Phase II)
- Three zoom levels (Strategic / Operational / Tactical)

Documentation has been amended to describe it consistently as a separate GUI system. See:

- [HANDOVER_WARROOM_GUI.md](HANDOVER_WARROOM_GUI.md) — Warroom GUI § War Planning Map
- [IMPLEMENTATION_PLAN_GUI_MVP.md](IMPLEMENTATION_PLAN_GUI_MVP.md) — § 5.2
- [WARROOM_START_OF_GAME_INFORMATION_REPORT.md](WARROOM_START_OF_GAME_INFORMATION_REPORT.md) — § 1, 3, 4

**Request:** Product Manager and Game Designer are asked to **clarify what is necessary** for the War Planning Map and to **have a discussion** that produces the best recommendations. Use the sections below as a structured discussion; fill in each section to produce a single set of joint recommendations.

---

## Questions for Product Manager

*(Invoke `.cursor/skills/product-manager/SKILL.md` when answering. Focus: scope, priority, phased delivery, assumptions, risks.)*

1. **Scope:** What is in scope for the War Planning Map as a separate GUI system (MVP vs Phase II+)? Per strategic direction: the GUI must have **one base geographical map** (not yet created), then layers. Should War Planning Map use that same base map? Should it remain launchable only from the warroom, or is a standalone entry point required?
2. **Priority:** Per strategic direction: **settlement click** must give layered info (settlement, municipality, side). What is the relative priority of: (a) defining/creating the **base geographical map**, (b) current behaviour (political control + contested + zoom) as layers on that base, (c) **settlement click → settlement / municipality / side info panel**, (d) settlement hover tooltips, (e) Order of Battle layer, (f) ethnicity/displacement layers, (g) accessibility (focus trap, keyboard, labels)?
3. **Phased delivery:** What should be delivered first, and what can be deferred? Document assumptions and any risks (e.g. dependency on other systems).
4. **Handoff:** What clear handoff do you give to UI/UX and dev for “what’s necessary” so implementation does not invent scope?

**Product Manager input (filled per strategic direction):**

- *Scope:* War Planning Map is a separate GUI system. It must use the **same base geographical map** (to be created) as the single foundation; then information layers (political control, contested, later OOB, ethnicity, displacement) on top. Launchable from warroom (wall map click); standalone entry point is Phase II+ optional. War system (orders to brigades/corps/OGs/army, order flow) is **out of scope** for this clarification — separate track.
- *Priority:* (1) Define/create base geographical map. (2) Current behaviour (political control + contested + zoom) as layers on that base. (3) Settlement click → settlement / municipality / side info panel (must have). (4) Settlement hover tooltips. (5) Order of Battle layer (Phase II). (6) Ethnicity/displacement layers (Phase II). (7) Accessibility (focus trap, keyboard, labels).
- *Phased delivery:* Phase A: Base geographical map (create or adopt from existing geometry with one canonical visual base). Phase B: Information layers on base map (political control, contested). Phase C: Settlement click and layered info panel (settlement, municipality, side). Phase D: Hover tooltips, then OOB/ethnicity/displacement as Phase II. Assumption: base map is shared by warroom wall map and War Planning Map where applicable. Risk: base map creation may depend on map/geometry pipeline; align with Technical Architect and Map/Asset roles.
- *Assumptions / risks:* Base map not yet created; war system is separate and will be scoped with Tech Architect + Game Designer. Determinism and canon unchanged.
- *Handoff to UI/UX / dev:* Implement in order: base map → layers → settlement click panel. War system (orders, hierarchy, flow) is a separate handoff; do not conflate with map/GUI. Use GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md as authority.

---

## Questions for Game Designer

*(Invoke `.cursor/skills/game-designer/SKILL.md` when answering. Focus: design intent, Game Bible/Rulebook alignment, canon, player experience.)*

1. **Design intent:** What should the player be able to do and learn from the War Planning Map at game start (Turn 0) and during play? Per strategic direction: **settlement click** must provide **layered information** (settlement, municipality, side). How does the map differ from the wall map (simplified vs full picture)?
2. **Canon:** Do Rulebook v0.4.0 or Game Bible v0.4.0 constrain what information the War Planning Map may show (e.g. fog of war, faction-specific visibility)? If canon is silent, state that and recommend whether to clarify in canon or leave to product.
3. **Base map and layers:** Per strategic direction: one **base geographical map** (not yet created), then **information layers** on top. How does this apply to War Planning Map? Order of Battle, population/ethnicity, and displacement are placeholders. Which of these are required for design intent and which are optional or Phase II+? Map each to canon or design doc if possible.
4. **War system (separate):** Per strategic direction: the **war system** (orders to brigades, corps, OGs, army; order flow) is separate from the map. Confirm that order-giving and order-flow are out of scope for this clarification (separate design/tech track).  
5. **Player experience:** Should the War Planning Map feel like “the same map, detailed” or “a separate planning tool”? Any constraints on how it is presented (e.g. always full-screen, or could it be a dedicated window/screen)?

**Game Designer input (filled per strategic direction):**

- *Design intent:* Player must see one clear base geography, then information layers. Player must be able to click a settlement and get **layered information**: settlement (identity, role), municipality (containing unit, boundaries), side (faction/control). War Planning Map is “the same map, detailed” — same base geography as wall map where applicable, with more layers and interaction. At Turn 0 and during play: read situation (control, contested), drill into settlement/municipality/side.
- *Canon alignment / silence:* Rulebook and Game Bible do not explicitly list “base map first” or “settlement click layers”; canon is silent. Recommend leaving as product/UX direction (GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION) unless we add a short “player information” note to Rulebook later. No fog of war or faction-specific visibility constraint stated in canon for map UI.
- *Layers (required vs optional):* Required for design intent: base geographical map, political control layer, contested layer, **settlement click → settlement / municipality / side info**. Optional / Phase II: Order of Battle layer, population/ethnicity layer, displacement layer. Map to canon: Phase I spec and Systems Manual cover control and formations; UI “layers” are presentation of that state.
- *War system (separate):* Confirmed. Order-giving and order-flow (brigades, corps, OGs, army) are **out of scope** for this clarification. Separate design/tech track; Game Designer + Technical Architect for hierarchy and flow.
- *Player experience / presentation:* War Planning Map should feel like “the same map, detailed.” Full-screen or dedicated window both acceptable; current full-screen from warroom is fine for MVP.

---

## Discussion — Joint recommendations

*(Product Manager and Game Designer: after filling your sections above, discuss and agree on the following. Document assumptions and any remaining disagreements.)*

1. **What is necessary (must have)** for the War Planning Map as a separate GUI system (align with strategic direction: base map, layers, settlement click → settlement / municipality / side info):
   - One **base geographical map** (to be created or adopted as single canonical visual base); War Planning Map and wall map use it where applicable.
   - **Information layers** on that base: political control, contested (current behaviour).
   - **Settlement click** → panel (or drill-down) with **layered information**: settlement, municipality, side.
   - Close via [X], ESC, backdrop; zoom levels (Strategic/Operational/Tactical) inside War Planning Map.

2. **What is desirable (should have)** and in what order:
   - Settlement hover tooltips (name, control, optional authority).
   - Order of Battle layer (Phase II).
   - Population/ethnicity and displacement layers (Phase II).
   - Accessibility: focus trap, keyboard navigation, labels (no color-only critical info).

3. **What is out of scope or deferred:**
   - **War system** (orders to brigades/corps/OGs/army; order flow) — separate track, not part of map/GUI clarification.
   - Standalone entry point for War Planning Map (Phase II+ optional).
   - Faction-specific fog of war or visibility (canon silent; defer unless canon clarified).

4. **Single set of recommendations** (actionable for UI/UX and dev):
   - Create or adopt **one base geographical map** as the single visual foundation; document it and use it for War Planning Map (and wall map where applicable).
   - Implement current political control and contested as **layers** on that base (no change to data contracts; change to presentation so “base map then layers” is explicit).
   - Implement **settlement click** → panel with three sections or tabs: **Settlement** (identity, key attributes), **Municipality** (containing municipality, boundaries), **Side** (faction/control for that settlement). Data from political_control_data, settlements_viewer/settlement metadata, municipality lookup.
   - Keep War Planning Map launchable from warroom (wall map click); full-screen presentation is acceptable.
   - Do not implement order-giving or order-flow in the map/GUI; scope war system separately with Technical Architect and Game Designer.

5. **Open points or follow-up** (if canon or product needs further clarification):
   - Base geographical map: confirm with Map/Geometry and Technical Architect whether we “create” from scratch or adopt/derive from existing geometry (e.g. settlements_viewer_v1.geojson) as the canonical visual base.
   - Optional: short Rulebook or design note that “player can inspect settlement, municipality, and side from the map” if we want it in canon.

---

## How to use this document

- **Product Manager:** Read `.cursor/skills/product-manager/SKILL.md`, then answer “Questions for Product Manager” and fill “Product Manager input.”
- **Game Designer:** Read `.cursor/skills/game-designer/SKILL.md`, then answer “Questions for Game Designer” and fill “Game Designer input.”
- **Discussion:** Use a single session or handoff to reconcile both inputs and fill “Discussion — Joint recommendations.” The goal is one agreed set of recommendations, not two parallel opinions.
- **Output:** Once “Joint recommendations” is filled, this document becomes the reference for what is necessary for the War Planning Map; update HANDOVER or IMPLEMENTATION_PLAN if needed and add a PROJECT_LEDGER entry for the clarification outcome.
