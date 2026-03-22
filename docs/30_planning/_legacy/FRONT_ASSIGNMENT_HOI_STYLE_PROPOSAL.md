# Front Assignment (HoI-Style) Proposal

**Date:** 2026-02-21  
**Status:** Draft for review (amended per FRONT_ASSIGNMENT_PROPOSAL_REVIEW.md)  
**Scope:** Three-tier front hierarchy (Army / Corps / Brigade); corps fronts derived initially; drawable corps fronts once auto-distribution exists; OGs as subfronts; one map with zoom-driven modes; Phase 0 holdout integration.  
**Supersedes:** Initial draft 2026-02-21; incorporates Paradox team convene and proposal review 2026-02-21. See `docs/30_planning/FRONT_ASSIGNMENT_PROPOSAL_REVIEW.md` for the review that informed these amendments.

---

## 1. Executive Summary

Unlike Hearts of Iron (which has Army → Division assignment), AWWV uses a **three-tier front hierarchy**:

- **Army front** — top level; derived as union of corps fronts (never stored)
- **Corps front** — middle; edge_ids (front line); derived from brigade positions initially; player-drawable once auto-distribution exists
- **Brigade front** — bottom; settlement_ids (existing `brigade_aor`); contiguous always

**Corps fronts are derived initially** (union of brigade AoR edges). Player-drawn corps fronts require an **auto-distribution engine**; without it, drawing is worse UX than manual assignment. Bot corps fronts are **always derived**; bot never draws fronts. **Phase I rear cleanup** uses the existing control_flip → wave_flip → holdout pipeline, **not** non-contiguous brigade AoR (see §4 Phase 0 Integration). **Operational Groups** are subfronts with pooling. **GUI:** one map with zoom-driven modes (Strategic / Operational / Tactical), not five separate UIs.

**Goals:**
- Hierarchical front model aligned with OOB
- Extend existing `brigade_aor` (do not replace); add `corps_front_edges`
- Drawable corps fronts + auto-distribution as Phase 2 priority (HoI killer feature)
- Phase 0 holdout integration (org penetration → holdout resistance)
- Compatibility with Bosnia’s irregular fronts, pockets, and enclaves

---

## 2. Three-Tier Front Hierarchy (Unlike HoI)

### 2.1 Structure

| Tier | Composition | Who Edits | Semantic |
|------|-------------|-----------|----------|
| **Army front** | Union of corps fronts; derived only, never stored | — | Strategic boundaries; army stance |
| **Corps front** | edge_ids; derived from brigade AoR initially; player-drawable once auto-distribution exists | Player (when engine ready) | Operational sector; corps stance, named ops |
| **Brigade front** | settlement_ids (existing brigade_aor); contiguous always | Player / bot | Tactical responsibility; 1–4 settlements, personnel-capped |

**Invariant:** Brigade AoR is always contiguous. Corps front = edge_ids. Army front = union of corps fronts (derived). Corps fronts derived initially; bot never draws fronts.

### 2.2 Extent Representation by Tier

- **Brigade** = settlement_ids (existing `brigade_aor`). Brigades operate at settlement level.
- **Corps** = edge_ids (front line). What the player would draw; what front_edges.ts computes.
- **Army** = derived; no state field.

**Phase I rear cleanup** uses the existing control_flip → wave_flip → holdout pipeline, not non-contiguous brigade AoR. See §4 Phase 0 Integration.

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
- Subfront = contiguous set of edges within the corps front; must be subset of one corps (canon: OGs at Corps level)
- OG members = brigades whose brigade fronts overlap the subfront; optionally add “pool” contribution

### 3.4 Integration with Canon

Canon Rulebook §5.6 and Systems Manual §6.3: OGs do not own territory; coordinate brigades; may detach manpower. This proposal reframes OGs as **spatial subfronts** with pooling. Canon amendment required: OGs have an explicit **subfront extent** (edge_ids or settlement_ids) and **pool contribution** from members.

---

## 4. Phase 0 Integration: Holdout Resistance (Review Addition)

Phase I rear cleanup uses the existing control_flip → wave_flip → holdout pipeline. The proposal does **not** use non-contiguous brigade AoR. The following improve holdout outcomes and root them in Phase 0:

### 4.1 Amended Holdout Formula: Org Penetration Bonus

The defending faction's Phase 0 organizational penetration in the municipality amplifies holdout resistance:

- `to_control == 'controlled'`: +0.4 (RBiH organized militia nucleus)
- `patriotska_liga > 0`: +0.3 (RBiH paramilitary cadre)
- `sda_penetration > 50`: +0.2 (RBiH political org)
- `paramilitary_rs > 0`, `sds_penetration > 50`: +0.3 / +0.2 (RS)
- `paramilitary_hrhb > 0`, `hdz_penetration > 50`: +0.3 / +0.2 (HRHB)
- `police_loyalty == 'loyal'`: +0.2
- `jna_presence` (if defending RS): +0.4

### 4.2 Steeper Population Factor

Replace `log10(pop)/4` with piecewise: pop &lt; 500 → 0.3; 500–2000 → 0.6; 2000–10000 → 1.0; 10000–30000 → 1.8; 30000+ → 2.5.

### 4.3 Border Municipality Intervention Modifier

FRY-adjacent municipalities (Bijeljina, Zvornik, Bratunac, Višegrad, Foča, Rudo): if turn &lt; RS_EARLY_WAR_END_WEEK (26), RS attack pressure += BORDER_INTERVENTION_BONUS (e.g. +15). Models FRY paramilitary intervention.

### 4.4 Holdout Connectivity

Existing BFS isolation and 4-turn surrender for isolated holdouts remains primary. Connected holdouts persist; isolated ones fall. Phase 0 integration is independent of front mechanics and can ship anytime.

---

## 5. Multi-Level Operations and Attack Orders

### 5.1 HoI Analogy

HoI allows battle plans at Army Group, Army, and Division level. AWWV mirrors:

- **Army level:** General offensive / defensive / total mobilization; sets stance for all corps
- **Corps level:** Named operations (planning → execution → recovery); stance (defensive / balanced / offensive / reorganize)
- **OG level:** Subfront-specific operation (e.g. “Corridor breach,” “Emergency defensive”)
- **Brigade level:** Posture (Defend, Probe, Attack, Elastic Defense, Consolidation); attack orders

### 5.2 Attack Orders by Echelon

- **Brigade:** Issues attack order to one target settlement (current behavior)
- **OG:** Issues coordinated attack; member brigades contribute; one brigade designated executor per target (canon: one brigade per target, OG exception for heavy resistance)
- **Corps:** Named operation defines axis/targets; subordinate brigades/OGs execute
- **Army:** Standing order influences corps behavior; no direct attack order

### 5.3 Planning vs Execution

- Operations have phases: planning (e.g. 3 turns, +5% defense) → execution (e.g. 4 turns, +50% pressure) → recovery → complete
- Attack orders at brigade/OG level resolve immediately (current Phase II attack resolution)
- Corps/army operations modulate posture and target selection for subordinates

---

## 6. Proposed State Model

### 6.1 Army Front

**Derived only, never stored.** Army front = union of corps fronts. No state field. Computed on demand for rendering.

### 6.2 Corps Front

```ts
corps_command[corpsId].front_edges: string[]  // edge_ids; derived or player-drawn
```

Add to existing `corps_command`. Corps front = edge_ids (front line). Initially derived from brigade AoR edges; player-drawable once auto-distribution engine exists. When front_edges changes, re-derive brigade_aor via auto-distribution.

### 6.3 Brigade Front / brigade_aor

**Do not replace `brigade_aor`.** It stays as `Record<SettlementId, FormationId>`. Brigade front = settlement_ids (existing format). Always contiguous.

### 6.4 Subfront (OG)

```ts
og_orders: Array<{
  og_id: FormationId;
  subfront_extent: string[];  // edge_ids within parent corps front
  member_brigades: FormationId[];
  pool_contribution: Record<FormationId, number>;  // personnel donated
  // ... existing OG fields (cohesion, duration, etc.)
}>;
```

### 6.5 Derivation Chain (Review)

```
corps_front_edges: Record<FormationId, string[]>
  ↓ (auto-distribute)
brigade_front_assignment (intermediate, when player draws)
  ↓ (write)
brigade_aor: Record<SettlementId, FormationId>  (existing, unchanged)
```

All downstream consumers (pressure, attack, supply, displacement) read `brigade_aor` as before. Zero breakage.

---

## 7. GUI: One Map With Zoom Levels (Review Amendment)

**Replace five separate GUIs with one unified map using zoom-driven modes.** F-key infrastructure (F1..F4 in map_operational_3d.ts) already supports this.

| Mode | Trigger | What You See | What You Do |
|------|---------|--------------|-------------|
| **Strategic** | F1 or zoomed out | Army fronts (thick outlines), corps sectors (shaded), faction stances | Click corps → set stance; click army → set standing order |
| **Operational** | F2 or medium zoom | Corps fronts (edge lines), brigade positions (counters), named operations | Draw offensive arrows; create OG subfronts; plan operations |
| **Tactical** | F3 or zoomed in | Brigade AoR (settlement highlights), postures, attack arrows | Click brigade → set posture; click settlement → issue orders |

**Front Hierarchy Panel:** Collapsible tree (Army → Corps → Brigades; OGs as children of Corps). Click node to focus map and show that tier's extent. Single panel for drill-down across all tiers.

---

## 8. Paradox Team Discussion

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

## 9. Additional Features and System Integrations

### 9.1 New Mechanics (from Review)

- **Drawable front lines + auto-distribution (Phase 2 priority):** Player draws corps front line → engine assigns brigades along it. Killer HoI feature.
- **Offensive arrow plans:** Player draws attack axis → engine generates multi-turn advance via named operations.
- **Fallback lines:** Player draws secondary line behind front; brigades auto-retreat if breached.
- **Front pressure visualization:** Render existing front_pressure on line (thick red = danger, thin green = safe).
- **Front width mechanic:** Terrain-based width per edge; brigade density → coverage quality; overextension penalty.
- **Pocket/enclave handling:** Auto-detect disconnected territory; auto-generate enclave mini-fronts; pocket brigades operate independently.

### 9.2 Supply Integration

- Corps front length → overextension component of supply pressure
- Brigade front extent → supply responsibility (which brigade “owns” a settlement for supply trace)

### 9.3 Displacement Integration

- Front movement (corps front advances) → displacement triggers for civilians in newly contested settlements
- Rear cleanup (Phase I) → displacement from cleared pockets

### 9.4 Exhaustion Integration

- Front length per tier → exhaustion contribution (army front total, corps front per corps)
- Static corps front → hardening; reduces maneuver but increases exhaustion

### 9.5 Negotiation Integration

- Front stability (from front_segments) already feeds negotiation
- Corps front extent could inform “control percentage” for ceasefire proposals

### 9.6 Fog of War Integration

- Army/corps front boundaries visible only for controlled faction (or recon-covered)
- Enemy corps front extent could be intel estimate (fuzzy boundary)

### 9.7 Scenario Init

- Scenario can define `init_corps_fronts`; brigade assignment derived via auto-distribution (no `init_brigade_fronts` needed)

---

## 10. Canon Changes Required (Amended per Review)

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

## 11. Implementation Phases (Revised per Review)

| Phase | What | Effort | Impact |
|-------|------|--------|--------|
| **1: Visual front lines** | Render existing front_edges as continuous lines on 3D map; corps sectors shaded; front pressure visualization (thick/thin/color) | Small | Massive visual payoff; nearly free |
| **2: Drawable corps fronts** | Player draws/adjusts corps front line; auto-distribution engine assigns brigades along line; fallback lines | Large | HoI killer feature; eliminates manual brigade assignment |
| **3: Offensive arrows** | Player draws attack axis → engine generates multi-turn advance via named operations | Medium | Eliminates per-brigade per-settlement per-turn micromanagement |
| **4: OG subfronts** | Player draws subfront region within corps front → creates OG with spatial extent and pool | Small–Medium | OGs become spatial and intuitive |
| **5: Front width + polish** | Terrain-based front width; overextension feedback; pocket/enclave integration | Medium | Concentrate vs spread tradeoff |
| **6: Phase 0 holdout integration** | Org penetration → holdout resistance; steeper population factor; border intervention modifier | Small | Phase 0 decisions matter; ships independently |

---

## 12. Risks and Mitigations

| Risk | Mitigation |
|------|-------------|
| Phase I non-contiguous pressure semantics unclear | Define “pocket” = contiguous cluster; pressure within pocket; validate with Formation Expert |
| GUI fragmentation | Unified Front Hierarchy Panel with tier drill-down |
| Bot complexity | Phase 2a bot = brigade only; add corps/OG bot in 3a/3b |
| State bloat (extent arrays) | Consider region_id + coverage for brigade; edge_ids for corps/OG |
| Determinism | Determinism matrix; sorted iteration throughout |

---

## 13. Open Questions (Answers from Review)

1. **Phase I pocket semantics:** Drop non-contiguous brigade AoR entirely. Rear cleanup uses control_flip → holdout pipeline.
2. **Corps front overlap:** Yes. Two corps can share edges at boundary. Engine assigns settlements by BFS distance from brigade HQ.
3. **OG subfront vs corps front:** Subfront must be subset of one corps front. Multi-corps OGs violate canon (Rulebook §5.6).
4. **Army front storage:** Derived only, never stored.
5. **Init from scenario:** Yes, `init_corps_fronts`. `init_brigade_fronts` unnecessary — brigade assignment derived from corps front via auto-distribution.

---

## 14. References

- `docs/10_canon/Rulebook_v0_5_0.md` §5, §5.6
- `docs/10_canon/Systems_Manual_v0_5_0.md` §6
- `docs/10_canon/Phase_I_Specification_v0_5_0.md`, `Phase_II_Specification_v0_5_0.md`
- `src/map/front_regions.ts`, `src/map/front_edges.ts`
- `src/sim/combat/brigade_aor_legacy.ts`
- `docs/30_planning/WARMAP_UI_UX_ARCHITECTURE_PROPOSAL.md`
- `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`
- HoI4 wiki: Battle plan, Unit controller, Front line
- `docs/30_planning/FRONT_ASSIGNMENT_PROPOSAL_REVIEW.md` — review that informed these amendments
