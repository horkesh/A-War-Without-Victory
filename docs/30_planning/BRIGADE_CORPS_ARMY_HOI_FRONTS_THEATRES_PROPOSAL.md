# Full Proposal: Brigade/Corps/Army Rework — HoI-Style Fronts and Theatres

**Date:** 2026-02-21  
**Status:** Draft for review  
**Scope:** Complete rework of the brigade/corps/army system to align with Hearts of Iron: **theatres**, **fronts** as first-class entities, and a clear **assignment chain** (theatre → army → corps → brigade; fronts with length/name; units assigned to fronts; reserve rule).  
**Extends / supersedes:** [FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md](FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md) by adding theatres and making fronts and theatres first-class.  
**Canon impact:** Game Bible §7 (fronts as emergent) and Rulebook §5–§6 would require amendments; see §10.

---

## 1. Executive Summary

Hearts of Iron organizes land warfare around **theatres** (top-level geographic/strategic areas), **command groups** (armies / army groups under a theatre), and **fronts** (the boundary where you assign divisions). Divisions are assigned to a front; only then do they participate in battle plans and combat. This proposal reworks AWWV’s formation and front model so that:

1. **Theatres** exist as the top organizational layer (optional but first-class): named geographic/strategic areas (e.g. “Northern Bosnia”, “Sarajevo”, “Eastern Bosnia”) that contain one or more armies.
2. **Fronts** are first-class: a front = the **segment of boundary where two hostile settlements meet**, with optional **length** and **name**. Units are **assigned to fronts**; only assigned units can act (reserve rule).
3. **Hierarchy** is explicit and HoI-aligned: **Theatre → Army → Corps → Brigade** (with OGs as subfronts under a corps). Army = existing army_hq; corps and brigade stay; we add theatre above army.
4. **Assignment chain:** Player/bot assigns brigades to a **front** (and thus to a corps front / theatre). Unassigned = **reserve** (no attack, posture, or move orders). Fronts belong to a theatre (by geography); corps fronts are subsets of theatre fronts.

This is a **full rework** in the sense of state model, pipeline, and GUI: new state (theatres, front entities, assignment), new derivation (front segments from hostile boundaries, length, naming), and unified GUI (theatre/front hierarchy panel, assign-to-front flow). It does **not** remove brigade AoR or pressure mechanics; it **gates** them on “assigned to a front” and adds the theatre/front layer above.

---

## 2. HoI Reference Model (Short)

| HoI concept | Description |
|-------------|--------------|
| **Theatre** | Optional, player-created. Top level. Named (e.g. “Eastern Front”). Contains command groups. Used when managing many armies across regions. |
| **Command group** | Army or Army Group. Has a commander. Tied to a theatre. Receives battle plans. |
| **Battle plan** | Orders given to a command group along a **front**: advance, defend, withdraw. Front = the line between friendly and enemy territory. |
| **Division** | Basic combat unit. **Assigned to a front** (and thus to an army). Only then participates in plans and combat. |

In HoI, the **front** is the interface: you assign divisions to it; the game spreads them along the line. Fronts are derived from control boundaries but are the **unit of assignment**. We adopt the same idea: **front = named segment of hostile boundary; assign brigades (and thus corps/army) to it.**

---

## 3. AWWV Rework: Hierarchy and First-Class Concepts

### 3.1 Hierarchy (Top to Bottom)

| Tier | AWWV today | After rework | Who assigns / edits |
|------|-------------|--------------|----------------------|
| **Theatre** | — | First-class. Named geographic area (e.g. “Northern Bosnia”, “Sarajevo”). Contains armies. | Scenario or player (create/rename). |
| **Army** | army_hq (one per faction or per OOB) | Unchanged. Belongs to one theatre. | OOB / scenario. |
| **Corps** | corps | Unchanged. Belongs to one army. | OOB / scenario. |
| **Brigade** | brigade | Unchanged. Belongs to one corps. **Must be assigned to a front** to act. | Player / bot assign to front. |
| **OG** | og (operational group) | Subfront under a corps. Optional. | Player / bot create subfront. |

**Invariants:** Every army belongs to exactly one theatre. Every corps belongs to exactly one army. Every brigade belongs to exactly one corps. Every **active** brigade is assigned to exactly one **front** (else reserve).

### 3.2 Front (First-Class)

- **Definition:** A **front** is a contiguous **segment of boundary where two hostile settlements meet** (canonical definition from user/clarifications).
- **Derivation:** From control + adjacency: all edges (a, b) such that political_controller(a) ≠ political_controller(b) and both are hostile. Group into contiguous segments (graph connectivity along the boundary).
- **Attributes (per front segment):**
  - **front_id:** stable identifier (e.g. derived from edge set or region).
  - **edge_ids:** list of boundary edges (sorted, deterministic).
  - **length:** total geometric length (or edge count) for display/balance.
  - **name:** optional player- or scenario-defined (e.g. “Orašje front”, “Sarajevo siege line”).
  - **theatre_id:** which theatre this front belongs to (by geography: centroid or majority of edges).
  - **sides:** two factions that oppose each other on this front (e.g. RS vs RBiH).

**Storage:** Fronts are either derived each turn from control + adjacency and cached, or persisted as `front_segments: FrontSegment[]` in state. Recommendation: **persist** so naming and assignment are stable; recompute geometry only when control changes.

### 3.3 Assignment and Reserve Rule

- **Brigade → front assignment:** Each brigade has `assigned_front_id: FrontId | null`. Null = **reserve**.
- **Reserve rule:** A brigade may issue attack, posture, move, or reposition orders **only if** `assigned_front_id !== null`. Reserve brigades do not contribute to pressure, do not receive attack orders, and do not move (except by explicit “assign to front” or transfer).
- **Corps front:** A corps’ **front** is the union of fronts that its brigades are assigned to (or the set of edge_ids the corps “holds”). So corps front is derived from brigade assignments + front_segments.
- **Theatre front:** Union of all corps fronts of armies in that theatre. Derived.

**Flow:**  
1. Engine derives **front_segments** (hostile boundary segments, length, optional name).  
2. Player/bot **assigns** brigades to a front_segment (and thus to a theatre by geography).  
3. Only assigned brigades participate in pressure, attack, posture, move.  
4. Corps front / army front / theatre front are derived for display and stance.

---

## 4. State Model (Proposed)

### 4.1 Theatres

```ts
// New top-level or under formations
theatres: Record<TheatreId, {
  id: TheatreId;
  name: string;
  faction: FactionId;
  army_ids: FormationId[];   // army_hq formation ids
  region_scope?: string[];   // optional: mun_ids or region tag for geography
}>;
```

**TheatreId:** string, e.g. `RS_north`, `RBiH_sarajevo`. Scenario or player creates; armies are assigned to a theatre (army.theatre_id).

### 4.2 Front Segments (First-Class)

```ts
front_segments: Array<{
  front_id: string;
  edge_ids: string[];           // sorted
  length_km?: number;           // or edge count
  name?: string;
  theatre_id: string;
  side_a: FactionId;
  side_b: FactionId;
}>;
```

Derived from control + adjacency; optionally persisted and named. Same data can be used for 2D/3D rendering and for assignment.

### 4.3 Brigade Front Assignment (Reserve Rule)

```ts
brigade_front_assignment: Record<FormationId, FrontId | null>;
// null = reserve
```

Brigade can act only if assigned to a front. Bot and GUI must set this.

### 4.4 Army → Theatre

```ts
// On formation (army_hq) or separate structure
army_theatre_assignment: Record<FormationId, TheatreId>;
// each army_hq belongs to one theatre
```

### 4.5 Corps Front (Derived or Stored)

As today: `corps_front_edges: Record<FormationId, string[]>` can be derived from brigade assignments + front_segments (edges that brigades of this corps hold on their assigned fronts). Or kept as player-drawn + auto-distribution per existing proposal.

### 4.6 Existing Preserved

- `brigade_aor`: unchanged; still settlement_ids per brigade. **Invariant:** Brigade has AoR only if assigned to a front; AoR is the settlements it “holds” on that front (or derived from corps front + auto-distribution).
- `formations`, `corps_command`, OGs: unchanged in kind; extended by theatre_id, front_segments, brigade_front_assignment.

---

## 5. Derivation and Pipeline

### 5.1 Front Segment Derivation

1. Compute **hostile boundary edges:** all edges (a, b) where control(a) and control(b) are different factions and at war.
2. Build **contiguous segments** (graph on edges: two edges adjacent if they share a settlement). Each connected component = one front segment.
3. Assign **front_id** (deterministic from edge set, e.g. sorted edge_ids hash or first edge).
4. Compute **length** (sum of edge lengths or count).
5. **Theatre:** Map front segment (e.g. centroid of edges) to theatre by geography (theatre region_scope or mun overlap). Default: one theatre per faction if not defined.
6. Optionally **merge** small segments into larger named fronts for UX.

### 5.2 Reserve Rule in Pipeline

- Before **pressure / attack / posture / move** resolution: filter brigades to those with `brigade_front_assignment[id] !== null`.
- Reserve brigades: no pressure contribution, no attack orders, no move (unless order is “assign to front” or “transfer to front”).

### 5.3 Corps / Army / Theatre Front (Display)

- **Corps front:** Union of edge_ids from front_segments that are assigned to brigades of this corps.
- **Army front:** Union of corps fronts of that army.
- **Theatre front:** Union of army fronts of armies in that theatre.

All derived; no need to store except for caching.

---

## 6. GUI (Unified HoI-Style)

### 6.1 Theatre / Front Hierarchy Panel

Single panel, collapsible tree:

- **Theatre** (e.g. “Northern Bosnia”)
  - **Army** (e.g. “1st Krajina Corps” — or army name)
    - **Corps** (e.g. “1st Corps”)
      - **Brigades** (list; show “Front: Orašje” or “Reserve”)
      - **OGs** (as children; show subfront if any)
  - …

Click node → focus map on that tier’s extent. Right-click brigade → “Assign to front” → list of fronts (by theatre or by distance).

### 6.2 Map Modes (F1–F4)

- **F1 Strategic:** Theatres (outlined), army sectors, stance.
- **F2 Operational:** Corps fronts (lines), fronts (named labels), brigade counters.
- **F3 Tactical:** Brigade AoR, postures, attack arrows.
- **F4 Command:** Same hierarchy panel; click to focus.

### 6.3 Assign to Front Flow

- Select brigade (or many). Button or context: “Assign to front”.
- List fronts: by theatre, by name, by distance. Show front length and current assignment count.
- Choose front → set `brigade_front_assignment[id] = front_id`. If front is in another corps’ sector, optionally allow (transfer) or forbid (same corps only) per design.

### 6.4 Create / Name Theatres

- Scenario defines default theatres (e.g. by region). Player can create new theatre (name + optional region), assign armies to it.
- Player can name front segments (e.g. “Sarajevo siege line”) for clarity.

---

## 7. Bot

- **Assign brigades to fronts:** Before generating orders, for each brigade with `brigade_front_assignment[id] === null`, assign to a front (e.g. same corps’ front, or nearest front by HQ distance). Then only assigned brigades run attack/posture/move logic.
- **Theatre:** Bot can use default theatres from scenario; no need to create new ones unless we add strategic theatre-switching.
- **Corps front:** As today: derived from brigade positions; bot does not draw fronts.

---

## 8. Compatibility with Existing Design

- **FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL:** This document adds **theatres** and **front_segments** as first-class; keeps Army/Corps/Brigade and OGs as subfronts. Reserve rule and “assign to front” from the gap doc are implemented here.
- **Canon “fronts emerge dynamically”:** We keep emergence at the **geometry** level (front segments are derived from control + adjacency). We add **assignment** and **naming** so fronts become the unit of play. Canon change: fronts are not only emergent; they are **named segments** to which units are assigned (see §10).
- **Brigade AoR:** Remains. AoR is the set of settlements the brigade covers **on its assigned front**. So: assign to front first; then AoR is derived (from corps front + auto-distribution, or from current logic restricted to that front’s settlements). Contiguity still required in Phase II.

---

## 9. Implementation Phases (Suggested)

| Phase | Content | Dependencies |
|-------|---------|--------------|
| **1: Front segments** | Derive front_segments from hostile boundaries; persist; 2D/3D render by front_id; single source for 2D/3D. | Existing front_edges pipeline |
| **2: Reserve rule + assignment state** | Add brigade_front_assignment; gate pressure/attack/posture/move on assigned; bot assigns all brigades to a front. | Phase 1 |
| **3: Theatres** | Add theatres state; army_theatre_assignment; derive theatre front; GUI theatre list and army-in-theatre. | Phase 2 |
| **4: GUI assign-to-front** | “Assign to front” flow; Front Hierarchy Panel (Theatre → Army → Corps → Brigade); show Reserve vs front name. | Phase 2, 3 |
| **5: Naming and polish** | Name front segments; name theatres; front length in UI; corps front draw/edit if desired. | Phase 4 |
| **6: OGs as subfronts** | OGs with subfront extent; assign OG to subfront of corps front. Per existing FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL. | Phase 4 |

---

## 10. Canon Changes Required

### 10.1 Game Bible

- **§7 Fronts as emergent:** Extend to: “Fronts are derived from hostile boundaries and may be named. Units are assigned to fronts; only assigned units participate in combat. Unassigned units are in reserve.”

### 10.2 Rulebook

- **§5 (Formations / AoR):** Add “Brigade front assignment” and “Reserve rule”. Add “Theatre” as top level. AoR applies only to brigades assigned to a front.
- **§5.6 OGs:** Already aligned (OGs as subfronts); add that OGs operate within a corps front.
- **§6 Fronts:** Fronts are first-class segments (hostile boundary); assignment of brigades to fronts; reserve; theatre contains fronts by geography.

### 10.3 Systems Manual

- **§2 (Spatial):** Front segments derivation; theatre scope; brigade_front_assignment; reserve rule in resolution.
- **§6 (Deployment and fronts):** Theatre → Army → Corps → Brigade; front_segments; assignment and reserve.

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|-------------|
| Scope creep | Strict phasing: front segments + reserve first; then theatres; then full GUI. |
| Canon drift | Explicit canon amendments (§10); Game Designer sign-off. |
| Bot complexity | Bot assigns every brigade to *some* front (e.g. nearest); no theatre strategy in v1. |
| 2D/3D parity | Single source: front_segments in state; both 2D and 3D read same state. |
| Determinism | front_id and edge_ids sorted; assignment order deterministic. |

---

## 12. Summary Table (HoI vs AWWV After Rework)

| HoI | AWWV (after rework) |
|-----|----------------------|
| Theatre | **Theatre** (named, contains armies) |
| Army / Army Group | **Army** (army_hq) |
| — | **Corps** (under army) |
| Division | **Brigade** (under corps) |
| Front (line to assign to) | **Front segment** (hostile boundary segment, named, with length) |
| Assign division to front | **Assign brigade to front** (reserve if unassigned) |
| Battle plan | **Stance / named operation** at army/corps; attack orders at brigade/OG |

---

## 13. References

- [FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md](FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md)
- [FRONT_ASSIGNMENT_PROPOSAL_REVIEW.md](FRONT_ASSIGNMENT_PROPOSAL_REVIEW.md)
- [ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md](../40_reports/convenes/ORCHESTRATOR_FRONTS_AND_RESERVE_GAP_2026_02_21.md)
- [ORCHESTRATOR_3D_MAP_FRONT_ASSIGNMENT_CHECKLIST_GAP_2026_02_21.md](../40_reports/convenes/ORCHESTRATOR_3D_MAP_FRONT_ASSIGNMENT_CHECKLIST_GAP_2026_02_21.md)
- HoI4: Theatre, Command group, Battle plan (Paradox Wiki)
- docs/10_canon: Game_Bible_v0_5_0.md, Rulebook_v0_5_0.md, Systems_Manual_v0_5_0.md
