# GUI and War System — Strategic Direction (Orchestrator)

**Date:** 2026-02-06  
**Source:** User direction, worked through by Orchestrator  
**Status:** Authoritative for Product Manager and Game Designer when filling WAR_PLANNING_MAP_CLARIFICATION_REQUEST and sequencing work  
**Purpose:** One place that states the three pillars so implementation and Paradox roles have a single source of truth.

---

## Three pillars

### 1. GUI map — one base geographical map, then information layers

- The GUI must always have **one basic visual geographical map**, which we have **not yet created**. That base map is the foundation.
- Once the base geographical map exists, we **color it with layers** for information (political control, contested, ethnicity, displacement, Order of Battle, etc.).
- So the order is: **create the base geographical map first**, then add information layers on top. We do not treat “layers” as replacing the need for a single, clear base geography.

**Implications:** War Planning Map (and any other map view) should sit on top of or use this same base geographical map. Roadmap and clarification request should reflect “base map → layers” as the sequence.

---

### 2. War system — separate from the map; orders flow through the chain of command

- The **war system** is **different** from the map. It is about **giving orders** and **order flow**.
- The user must be able to **give orders to**: brigades, corps, OGs (operational groups), army.
- Orders **must flow into one another** (e.g. army → corps → brigades, or the correct hierarchy). The chain of command and order propagation are first-class; they are not “just another map layer.”

**Implications:** Document and design the war system (order input, hierarchy, flow) as its own system. Map shows *result* of orders and state; order-giving and order-flow are a separate UX and simulation concern. Technical Architect and Game Designer should align on hierarchy (army / corps / OGs / brigades) and how orders propagate; PM should scope “war system” separately from “map/GUI” in the roadmap.

---

### 3. Settlement click — layered information (settlement, municipality, side)

- The user must be able to **click on a settlement** and get **several layers of information**:
  - **Settlement** — information about the settlement itself.
  - **Municipality** — information about the municipality the settlement belongs to.
  - **Side** — information about the side (faction/control) for that settlement (and optionally municipality).

**Implications:** Settlement click is a first-class interaction. The UI must support a panel or drill-down that surfaces settlement-level, municipality-level, and side-level information in a clear, layered way. This applies to the War Planning Map and any other map view that shows settlements. HANDOVER and clarification request should call out “settlement click → settlement / municipality / side info” as required.

---

## Alignment with existing docs

- **WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md:** Product Manager and Game Designer should fill their sections and Joint recommendations **with these three pillars in mind**. In particular: (1) base geographical map then layers, (2) war system (orders) kept separate from map, (3) settlement click with settlement / municipality / side info as required.
- **PARADOX_STATE_OF_GAME_MEETING.md:** This direction supplements the recommended next steps; “Phase 4 (turn pipeline → GUI)” and any “state of the game” views should align with base map + layers and settlement click.
- **HANDOVER_WARROOM_GUI.md / IMPLEMENTATION_PLAN_GUI_MVP.md:** When updated after clarification, they should reference this document and reflect base map → layers and settlement click behaviour.

---

## Next single priority (Orchestrator)

1. **Product Manager + Game Designer:** Work through [WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md](WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md) using this strategic direction. Fill PM input, Game Designer input, and Discussion — Joint recommendations so that:
   - Base geographical map (to be created) and “then layers” are explicit in scope and sequence.
   - War system (orders to brigades/corps/OGs/army, order flow) is explicitly out of scope for “map/GUI” and called out as separate workstream (Tech Architect + Game Designer for hierarchy and flow).
   - Settlement click with settlement / municipality / side information is listed as necessary (must have) for the map/GUI.

2. **Product Manager:** After the clarification request is filled, produce a phased plan that sequences: (a) base geographical map creation, (b) information layers on that map, (c) settlement click and layered info panel, (d) war system (order-giving and order-flow) as a separate track.

3. **Process QA:** After doc updates and any implementation that follows, invoke quality-assurance-process to confirm process (context, ledger, mistake guard) is followed.

---

*This document is the Orchestrator’s capture of the strategic direction. It does not change canon (FORAWWV, phase specs); it directs scope and sequencing for GUI and war system.*
