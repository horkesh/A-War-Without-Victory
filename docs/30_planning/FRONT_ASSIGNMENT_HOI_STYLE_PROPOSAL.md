# Front Assignment (HoI-Style) Proposal

**Date:** 2026-02-21  
**Status:** Draft for review (amended)  
**Scope:** Three-tier front hierarchy (Army / Corps / Brigade); Phase I non-contiguous vs Phase II trench warfare; Operational Groups as subfronts with pooling; multi-level operations; dedicated GUI per tier.  
**Supersedes:** Initial draft 2026-02-21; incorporates Paradox team convene.

---

## 1. Executive Summary

Unlike Hearts of Iron (which has Army → Division assignment), AWWV uses a **three-tier front hierarchy**:

- **Army front** — top level; combination of all corps fronts for a faction
- **Corps front** — middle; combination of all brigade fronts in that corps
- **Brigade front** — bottom; settlement/edge coverage for a single brigade

Player and bot can edit each tier. **Phase I** allows non-contiguous brigade front coverage (enabling rear cleanup of enemy settlements without formations). **Phase II** enforces contiguous brigade fronts (trench warfare). **Operational Groups** are player/bot-created **subfronts** that can pool extra strength from brigades; otherwise OGs function per canon (temporary). **Operations and attack orders** can be planned at brigade, OG, corps, or army level, similar to HoI battle plans. Separate **GUI elements** are required for each tier.

**Goals:**
- Hierarchical front model aligned with OOB (Army → Corps → Brigade)
- Phase I flexibility for rear cleanup; Phase II rigidity for trench warfare
- OGs as subfronts with pooling; multi-level operations
- Dedicated UI per echelon; reduce micromanagement via delegation
- Compatibility with Bosnia’s irregular fronts, pockets, and enclaves

---

## 2. Three-Tier Front Hierarchy (Unlike HoI)

### 2.1 Structure

| Tier | Composition | Who Edits | Semantic |
|------|-------------|-----------|----------|
| **Army front** | Union of all corps fronts (faction-wide) | Player / bot | Strategic boundaries; army stance applies |
| **Corps front** | Union of brigade fronts in that corps | Player / bot | Operational sector; corps stance, named ops |
| **Brigade front** | Settlement/edge coverage for one brigade | Player / bot | Tactical responsibility; 1–4 settlements, personnel-capped |

**Invariant:** Brigade fronts partition the corps front; corps fronts partition the army front. Each tier is editable independently; changes propagate down (e.g. corps front shrinks → brigade fronts within it are constrained).

### 2.2 Phase I vs Phase II: Contiguity

| Phase | Brigade front contiguity | Rationale |
|-------|--------------------------|-----------|
| **Phase I** | **Not required** | Fluid war; rear cleanup of undefended enemy settlements; brigades may cover scattered pockets |
| **Phase II** | **Required** | Trench warfare; brigade fronts must be contiguous settlement clusters |

Phase I non-contiguity enables consolidation posture and cleanup of isolated enemy-held settlements without formations. Phase II contiguity enforces canonical “AoR = contiguous cluster” and front hardening.

---

## 3. Operational Groups as Subfronts

### 3.1 Definition

**Subfront** = a subset of a corps front, created by the player/bot. Subfronts are implemented as **Operational Groups (OGs)**. OGs remain temporary per canon; their spatial extent is the subfront.

### 3.2 Pooling

- OGs may **pool extra strength** from member brigades
- Pooled personnel: donated by brigades; each donor retains min 200; OG receives min 500 total
- Donor brigades keep their brigade fronts (AoR); pooled strength amplifies pressure within the OG’s subfront only
- Otherwise OGs function per canon: coordination bonus, cohesion drain, dissolution on cohesion &lt; 15 or max duration

### 3.3 Creation

- Player/bot creates a subfront (OG) by selecting a subset of a corps front
- Subfront = contiguous or non-contiguous (Phase I) set of edges/settlements within the corps front
- OG members = brigades whose brigade fronts overlap the subfront; optionally add “pool” contribution

### 3.4 Integration with Canon

Canon Rulebook §5.6 and Systems Manual §6.3: OGs do not own territory; coordinate brigades; may detach manpower. This proposal reframes OGs as **spatial subfronts** with pooling. Canon amendment required: OGs have an explicit **subfront extent** (edge_ids or settlement_ids) and **pool contribution** from members.

---

## 4. Multi-Level Operations and Attack Orders

### 4.1 HoI Analogy

HoI allows battle plans at Army Group, Army, and Division level. AWWV mirrors:

- **Army level:** General offensive / defensive / total mobilization; sets stance for all corps
- **Corps level:** Named operations (planning → execution → recovery); stance (defensive / balanced / offensive / reorganize)
- **OG level:** Subfront-specific operation (e.g. “Corridor breach,” “Emergency defensive”)
- **Brigade level:** Posture (Defend, Probe, Attack, Elastic Defense, Consolidation); attack orders

### 4.2 Attack Orders by Echelon

- **Brigade:** Issues attack order to one target settlement (current behavior)
- **OG:** Issues coordinated attack; member brigades contribute; one brigade designated executor per target (canon: one brigade per target, OG exception for heavy resistance)
- **Corps:** Named operation defines axis/targets; subordinate brigades/OGs execute
- **Army:** Standing order influences corps behavior; no direct attack order

### 4.3 Planning vs Execution

- Operations have phases: planning (e.g. 3 turns, +5% defense) → execution (e.g. 4 turns, +50% pressure) → recovery → complete
- Attack orders at brigade/OG level resolve immediately (current Phase II attack resolution)
- Corps/army operations modulate posture and target selection for subordinates

---

## 5. Proposed State Model

### 5.1 Army Front

```ts
army_front: Record<FactionId, {
  extent: string[];  // edge_ids or region_ids; union of corps fronts
}>;
```

Or derived: army front = union of corps fronts; no separate state if always derived.

### 5.2 Corps Front

```ts
corps_front: Record<FormationId, {
  extent: string[];  // edge_ids; union of brigade fronts in this corps
  parent_faction: FactionId;
}>;
```

Corps front can be manually adjusted (player draws/shrinks) or derived from brigade fronts. If edited, it constrains which edges brigades may cover.

### 5.3 Brigade Front

```ts
brigade_front_assignment: Record<FormationId, {
  extent: string[];        // edge_ids or settlement_ids this brigade covers
  parent_corps_front: string;  // corps formation id
  coverage_count: number;  // 1–4 settlements, personnel-capped
  contiguous_required: boolean;  // true in Phase II
}>;
```

Phase I: `extent` may be non-contiguous. Phase II: `extent` must form a contiguous cluster.

### 5.4 Subfront (OG)

```ts
og_orders: Array<{
  og_id: FormationId;
  subfront_extent: string[];  // edge_ids within parent corps front
  member_brigades: FormationId[];
  pool_contribution: Record<FormationId, number>;  // personnel donated
  // ... existing OG fields (cohesion, duration, etc.)
}>;
```

### 5.5 Deriving `brigade_aor`

From `brigade_front_assignment.extent` → `brigade_aor[sid] = formationId` for each settlement in extent. Phase I: extent may include non-contiguous settlements (rear cleanup). Phase II: extent is contiguous.

---

## 6. GUI Elements (Separate per Tier)

### 6.1 Army Front UI

- **Location:** Strategic map mode; faction-level panel
- **Elements:** Army front boundary (thick outline); army stance selector (General Offensive / Defensive / Total Mobilization)
- **Interaction:** Read-only boundary (derived from corps); stance is editable

### 6.2 Corps Front UI

- **Location:** Operational map mode; corps selection
- **Elements:** Corps front boundary (medium outline); corps stance; named operation planner (planning / execution / recovery)
- **Interaction:** 
  - Draw/edit corps front extent (subset of army front)
  - Create subfront (OG) by lassoing part of corps front
  - Set stance and operation phase

### 6.3 Brigade Front UI

- **Location:** Tactical map mode; brigade panel
- **Elements:** Brigade front highlight (settlements/edges); coverage slider (1–4); posture selector
- **Interaction:** 
  - Assign brigade to corps front (or subfront)
  - Set coverage (1–4 settlements)
  - Phase I: multi-select non-contiguous settlements for rear cleanup
  - Phase II: contiguous assignment only

### 6.4 Subfront (OG) UI

- **Location:** Operational/tactical; OG creation flow
- **Elements:** Subfront boundary (dashed); member brigades list; pool contribution sliders
- **Interaction:** 
  - Create subfront from corps front selection
  - Add/remove member brigades
  - Set pool contribution per brigade
  - OG lifecycle: activate, monitor cohesion, dissolve

### 6.5 Operations UI

- **Location:** Corps/OG panel; timeline or phase indicator
- **Elements:** Operation name; phase (Planning / Execution / Recovery / Complete); target highlights
- **Interaction:** 
  - Plan operation (select axis, targets)
  - Execute (advance phase)
  - View subordinate attack orders aligned with operation

### 6.6 Summary Table

| Tier | GUI Component | Primary Actions |
|------|---------------|-----------------|
| Army | Army front panel, strategic map | Stance |
| Corps | Corps front editor, operational map | Extent, stance, operations, create subfront |
| Brigade | Brigade panel, tactical map | Assignment, coverage, posture, attack |
| OG | Subfront editor, OG panel | Extent, members, pool, lifecycle |
| Operations | Corps/OG operation panel | Plan, execute, phase |

---

## 7. Paradox Team Discussion

### 7.1 Orchestrator

**Thoughts:** Three-tier hierarchy creates clear handoffs: army sets direction, corps executes, brigades fight. Multi-level operations align with HoI player expectations. OGs as subfronts give players a tangible way to create “task forces” without inventing new mechanics.

**Pushback:** Scope is large. Phasing is critical—we should ship Army/Corps/Brigade fronts first, then OGs as subfronts, then multi-level operations. GUI work is substantial; each tier needs dedicated components.

**Suggestions:** Convene PM for phased roadmap. Consider “Phase 2a: Brigade fronts only” as MVP; add corps/army front aggregation in Phase 2b. OGs as subfronts in Phase 3.

---

### 7.2 Architect

**Thoughts:** Data flow is clean: Army front = union(corps fronts); Corps front = union(brigade fronts) or user-edited; Brigade front = assignment. Derivation preserves downstream consumers (pressure, attack) if we derive `brigade_aor` from `brigade_front_assignment.extent`.

**Pushback:** Phase I non-contiguity changes pressure attribution. Rear cleanup settlements may not be adjacent to brigade’s “main” front. Need to define: does pressure from non-contiguous settlements apply? Canon says pressure propagates across adjacency—non-contiguous means gaps. Clarify: non-contiguous = multiple pockets, each pocket contiguous within itself, or truly scattered single settlements?

**Suggestions:** 
- Define Phase I “pocket” semantics: a brigade may have multiple contiguous pockets, each with its own mini-front. That preserves pressure propagation within each pocket.
- Integration with supply: corps front extent could feed supply corridor computation (front length → overextension).
- Integration with displacement: front movement (corps front advance) could trigger displacement eligibility.

---

### 7.3 Game Designer

**Thoughts:** Phase I non-contiguity for rear cleanup is historically apt—Bosnia had consolidation of isolated Serb/Croat pockets. Phase II contiguity matches trench warfare. OGs as subfronts extend canon rather than contradict it; pooling is already in Rulebook §5.6.

**Pushback:** Canon currently says “Every settlement is assigned to exactly one brigade AoR.” Phase I non-contiguity means a brigade’s AoR can be disjoint—multiple clusters. That’s a canon change: “AoR may consist of one or more contiguous clusters (Phase I)” vs “AoR is a single contiguous cluster (Phase II).” Need Rulebook amendment.

**Blockers:** None if canon is updated. Must not invent mechanics beyond what’s proposed—e.g. no new formation types, no new control-change rules.

**Suggestions:**
- Add “Consolidation posture” explicitly for Phase I rear cleanup in Phase I spec (if not already).
- Clarify: in Phase I, can a settlement be in two brigades’ AoRs if they’re in different pockets? No—still one brigade per settlement. Non-contiguity = brigade’s AoR is a *set* of contiguous clusters, not one cluster.

---

### 7.4 Technical Architect

**Thoughts:** State schema grows: army_front, corps_front, brigade_front_assignment, og_orders (extended). Need ADR for front hierarchy. Determinism: all extent assignments must use sorted iteration; no RNG.

**Pushback:** `extent` as `string[]` (edge_ids) can get large. Consider extent as region_id + coverage fraction for brigade, and derive edge list. Or: extent = list of (region_id, edge_subset). Trade-off: flexibility vs schema complexity.

**Suggestions:**
- ADR-0005: Three-tier front hierarchy and state schema
- Extent representation: `edge_ids: string[]` for brigade/corps; deterministic sort for serialization
- Migration: existing `brigade_aor` → derive from new `brigade_front_assignment` during transition; support both during Phase 1 impl

---

### 7.5 Formation Expert

**Thoughts:** OOB gives us corps and brigades; army = faction’s army HQ. Front extent per corps should align with OOB geographic responsibility (e.g. 1st Krajina Corps → northwestern BiH). Brigade assignment to corps front follows parent formation.

**Pushback:** Multi-corps coordination (e.g. two corps attacking same axis) is in bot design but not yet in canon. Front hierarchy doesn’t inherently solve inter-corps handoff—that’s still “named operation” or ad-hoc. Need to ensure corps fronts can overlap at boundaries (e.g. corridor strip) for historical operations like Corridor 92.

**Suggestions:**
- Init: corps front extent from OOB HQ municipality + adjacent front-active regions (from computeFrontRegions). Player can adjust.
- OG creation: only from brigades in same corps (canon: OGs authorized at Corps level).

---

### 7.6 Gameplay Programmer

**Thoughts:** Phase II attack resolution already uses brigade_aor. Derivation from brigade_front_assignment is straightforward. Phase I non-contiguity: attack orders can target any settlement in brigade’s extent; pressure eligibility must handle multiple pockets—each pocket’s edges contribute to pressure independently.

**Pushback:** Bot today generates brigade-level posture and attack orders. Adding corps/army operations means bot must also generate corps_front edits and named operation phases. That’s a new bot layer. Existing bot_corps_ai has stance and OGs; extending to “corps front extent” and “operation phase” is non-trivial.

**Suggestions:**
- Phase 1: Only brigade_front_assignment; corps/army fronts derived (union). No corps front editing.
- Phase 2: Add corps front editing; bot proposes extent changes based on strategic objectives.
- Operations: Reuse existing named operation logic; hook into corps stance. Operation “targets” could be municipality/region IDs; brigade AI picks settlements within those.

---

### 7.7 UI/UX Developer

**Thoughts:** Separate GUI per tier is correct—avoids mode confusion. Strategic = army; operational = corps; tactical = brigade. OG/subfront needs its own creation flow (e.g. right-click corps front → “Create subfront” → lasso).

**Pushback:** Five distinct UIs (army, corps, brigade, OG, operations) is a lot. Risk of fragmentation. Need a unified “front hierarchy” panel that shows all tiers in one tree, with drill-down to edit. TACTICAL_MAP_SYSTEM and WARMAP_UI_UX_ARCHITECTURE_PROPOSAL don’t yet specify front-editing flows.

**Suggestions:**
- **Front Hierarchy Panel:** Collapsible tree (Army → Corps → Brigades; OGs as children of Corps). Click node to focus map and show that tier’s extent.
- **Map overlay modes:** F1 = Army fronts, F2 = Corps fronts, F3 = Brigade fronts, F4 = OGs. Or single mode with layered opacity.
- **Lasso/select for subfront:** Polygon or box select on operational map; creates OG with that extent.
- **Accessibility:** Keyboard shortcuts for tier switch; screen-reader labels for front boundaries.

---

### 7.8 Systems Programmer

**Thoughts:** Determinism: extent assignment, edge ordering, derivation of brigade_aor must all be deterministic. No `Object.keys()` without `.sort()`; no `Set` iteration without sorted `Array.from(set).sort()`.

**Pushback:** Phase I non-contiguous extent: when multiple brigades have overlapping *potential* coverage (e.g. rear cleanup), which brigade gets which settlement? Need deterministic tie-break. Canon: one settlement per brigade. So assignment order matters.

**Suggestions:**
- Determinism matrix: add “Front assignment derivation” row. Inputs: brigade_front_assignment, front_regions. Output: brigade_aor. All intermediate steps sorted.
- Invariant: `brigade_aor` keys (settlement IDs) are disjoint across brigades. Validation in game_state or pre-pipeline check.

---

### 7.9 Product Manager

**Thoughts:** Phased delivery is essential. MVP = brigade fronts + derivation; then corps/army aggregation; then editing at each tier; then OGs as subfronts; then multi-level operations. GUI can trail: start with brigade panel only, add corps/army/OG panels incrementally.

**Pushback:** This is a major feature set. Risk of scope creep. Recommend strict phasing and “ship when brigade fronts work” before expanding.

**Suggestions:**
- **Phase 2a (MVP):** Brigade front assignment; Phase I non-contiguous, Phase II contiguous; derive brigade_aor; no corps/army front editing.
- **Phase 2b:** Corps front derivation and display; corps front editing.
- **Phase 2c:** Army front display; stance propagation.
- **Phase 3a:** OGs as subfronts; pool contribution.
- **Phase 3b:** Multi-level operations; attack orders at OG/corps level.
- **Phase 4:** Full GUI parity for all tiers.

---

## 8. Additional Features and System Integrations

### 8.1 Supply Integration

- Corps front length → overextension component of supply pressure
- Brigade front extent → supply responsibility (which brigade “owns” a settlement for supply trace)

### 8.2 Displacement Integration

- Front movement (corps front advances) → displacement triggers for civilians in newly contested settlements
- Rear cleanup (Phase I) → displacement from cleared pockets

### 8.3 Exhaustion Integration

- Front length per tier → exhaustion contribution (army front total, corps front per corps)
- Static corps front → hardening; reduces maneuver but increases exhaustion

### 8.4 Negotiation Integration

- Front stability (from front_segments) already feeds negotiation
- Corps front extent could inform “control percentage” for ceasefire proposals

### 8.5 Fog of War Integration

- Army/corps front boundaries visible only for controlled faction (or recon-covered)
- Enemy corps front extent could be intel estimate (fuzzy boundary)

### 8.6 Scenario Init

- Scenario can define initial corps_front extent and brigade_front_assignment
- `init_corps_fronts`, `init_brigade_fronts` in scenario schema for historical setups

---

## 9. Canon Changes Required

### 9.1 Rulebook

- **§5.2 Areas of Responsibility** → Replace with “Three-Tier Front Hierarchy and Brigade Front Assignment”
  - Army front, corps front, brigade front; each editable
  - Brigade front = settlement/edge coverage; Phase I non-contiguous, Phase II contiguous
  - `brigade_aor` derived from brigade front extent
- **§5.4 Reshaping AoRs** → “Adjusting Front Assignment at Each Tier”
- **§5.6 Operational Groups** → Extend with “OGs as subfronts”; subfront extent; pool contribution

### 9.2 Systems Manual

- **§6.2** → Front assignment resolution; Phase I vs Phase II contiguity
- **§6.3** → OG subfront extent; pooling
- **§6.4** → Corps/army front; named operations at corps level
- **§7** → Pressure uses `brigade_aor` (derived); multi-level attack orders

### 9.3 Phase I Spec

- Brigade front assignment; non-contiguous allowed; rear cleanup semantics

### 9.4 Phase II Spec

- Brigade front contiguity required; trench warfare

---

## 10. Implementation Phases (Revised)

| Phase | Scope | GUI |
|-------|-------|-----|
| **2a** | Brigade front assignment; Phase I non-contiguous, Phase II contiguous; derive brigade_aor | Brigade panel: assignment, coverage |
| **2b** | Corps front derivation and editing; display | Corps front editor, operational map |
| **2c** | Army front display; stance | Army panel, strategic map |
| **3a** | OGs as subfronts; pool contribution | Subfront creator, OG panel |
| **3b** | Multi-level operations; attack at OG/corps | Operations panel |
| **4** | Full GUI parity; front hierarchy panel | All tiers, F-key modes |

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|-------------|
| Phase I non-contiguous pressure semantics unclear | Define “pocket” = contiguous cluster; pressure within pocket; validate with Formation Expert |
| GUI fragmentation | Unified Front Hierarchy Panel with tier drill-down |
| Bot complexity | Phase 2a bot = brigade only; add corps/OG bot in 3a/3b |
| State bloat (extent arrays) | Consider region_id + coverage for brigade; edge_ids for corps/OG |
| Determinism | Determinism matrix; sorted iteration throughout |

---

## 12. Open Questions

1. **Phase I pocket semantics:** Single contiguous cluster vs multiple pockets per brigade?
2. **Corps front overlap:** Can two corps share an edge at boundary (e.g. corridor strip)?
3. **OG subfront vs corps front:** Must subfront be subset of one corps front, or can it span corps (multi-corps OG)?
4. **Army front storage:** Derived only or persisted?
5. **Init from scenario:** `init_corps_fronts`, `init_brigade_fronts` schema?

---

## 13. References

- `docs/10_canon/Rulebook_v0_5_0.md` §5, §5.6
- `docs/10_canon/Systems_Manual_v0_5_0.md` §6
- `docs/10_canon/Phase_I_Specification_v0_5_0.md`, `Phase_II_Specification_v0_5_0.md`
- `src/map/front_regions.ts`, `src/map/front_edges.ts`
- `src/sim/phase_ii/brigade_aor.ts`
- `docs/30_planning/WARMAP_UI_UX_ARCHITECTURE_PROPOSAL.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- HoI4 wiki: Battle plan, Unit controller, Front line
