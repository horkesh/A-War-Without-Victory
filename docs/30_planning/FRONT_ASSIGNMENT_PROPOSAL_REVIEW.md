# Review: Front Assignment (HoI-Style) Proposal

**Date:** 2026-02-21
**Status:** Review feedback for architects of FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md
**Scope:** Consolidated assessment — architecture, UX, Phase 0/I integration, rear cleanup, historical fidelity, implementation strategy
**Reviewed document:** `docs/30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md`

---

## 1. Overall Assessment

The proposal is **directionally correct**. HoI4's front system is the right model for AWWV. But the document as written has structural problems: it undersells what already exists, proposes a parallel state model instead of extending the current one, misidentifies rear cleanup as a front-assignment problem when it's a control-flip problem, and buries the highest-value feature (drawable corps front lines) in a Phase 2b backlog item.

This review provides specific corrections, new mechanics to add, and a revised architecture that integrates with the existing codebase rather than replacing it.

---

## 2. What the Proposal Gets Right

**Three-tier hierarchy aligned with OOB.** Army → Corps → Brigade is the correct decomposition. The existing codebase already has corps_command with stances/operations and brigade_aor with settlement-level 1–4 assignments. The proposal correctly identifies that these should be unified under a single front concept.

**OGs as subfronts with spatial extent.** Currently OGs are floating formations with a loose spatial concept (focus_settlements). Giving them an explicit subfront extent makes them tangible — the player says "concentrate force here" by drawing a subfront. This extends canon (Rulebook §5.6) rather than contradicting it.

**Phase II contiguity enforcement.** Correct and already implemented. Brigade fronts in Phase II must be contiguous settlement clusters. No change needed.

**Multi-level operations.** The planning → execution → recovery lifecycle already exists in corps_command. Extending it with spatial axes of advance is the right direction.

---

## 3. Critical Corrections

### 3.1 Corps Fronts Must Be Derived, Not Player-Edited (For Now)

The proposal says "Corps front can be manually adjusted (player draws/shrinks) or derived from brigade fronts." This is the right long-term vision, but **corps fronts should always be derived (union of brigade fronts)** in the initial implementation. This is how the system works today and it should stay that way until the auto-distribution engine exists.

The reason: a player-drawn corps front requires an **auto-distribution engine** that takes a drawn line and automatically assigns brigades along it. Without that engine, "draw corps front" just means "manually reassign every brigade to match the line you drew" — worse UX than the current system. Build the auto-distribution engine first, *then* expose corps front drawing.

**For the bot:** Corps fronts are always derived. The bot never draws fronts — it adjusts by moving brigades (existing bot_brigade_ai behavior). The bot's corps front emerges from its brigade decisions. This eliminates the hardest bot AI problem (spatial reasoning about front lines) while preserving all existing bot behavior.

### 3.2 Drop Phase I Non-Contiguous Brigade AoR — Use Control Flips for Rear Cleanup

The proposal's §2.2 says Phase I allows non-contiguous brigade fronts for "rear cleanup of undefended enemy settlements without formations." This is wrong on two levels:

**Mechanically wrong:** A single brigade cannot exert combat power at two disconnected locations simultaneously. If a brigade's AoR has two disjoint pockets, which pocket defends when attacked? Does the brigade's total personnel defend both? Can personnel teleport between pockets? Does pressure propagate from both? These questions don't have good answers because the premise is flawed.

**Historically wrong:** Phase I rear cleanup did not involve brigades operating in scattered pockets. What actually happened:

1. **Municipality-level institutional takeover** (April 1992): A faction (typically RS) seizes a municipality through organizational penetration — SDS captures institutions, police switch loyalty, JNA provides heavy weapons. The *municipality* flips via the existing stability/pressure/control_flip system. Zvornik, Prijedor, Bijeljina, Foča, Višegrad all followed this pattern.

2. **Settlement-level wave flip + holdouts**: After the municipality flips, ethnically aligned settlements wave-flip immediately (existing WAVE_FLIP_ETHNIC_THRESHOLD = 0.30). Hostile-majority settlements become *holdouts*. This is already implemented in settlement_control.ts.

3. **Holdout fate depends on connectivity**, not brigade AoR:
   - **Kozarac** (Prijedor): Bosniak pocket, surrounded by RS territory. No BFS path to RBiH settlements. Isolated. Falls within weeks. Historically destroyed May 1992.
   - **Kamenica/Cerska/Sapna** (Zvornik municipality): Bosniak settlements connected to the Tuzla front via chain of friendly settlements. BFS reaches RBiH main territory. NOT isolated. Held for months/years. Historically held until Srebrenica fell 1995.
   - **Sarajevo, Goražde**: RBiH brigades present → FLIP_ELIGIBLE_MILITIA_THRESHOLD (5000) blocks the municipal flip entirely. Never becomes a holdout. Historically besieged but never fell.

4. **External intervention**: Zvornik had direct FRY military involvement (Arkan's Tigers, JNA crossing the Drina). This is already modeled through RS's higher initial capital (100 vs RBiH 70) and JNA presence in organizational_penetration, but border municipalities need an explicit amplifier (see §4.2 below).

**The fix:** Remove Phase I non-contiguous brigade AoR from the proposal entirely. Rear cleanup is handled by the existing control_flip → wave_flip → holdout pipeline. What needs improvement is the *holdout resistance formula* and its integration with Phase 0 organizational penetration (see §4 below).

### 3.3 Extent Representation: Edges for Corps, Settlements for Brigades

The proposal uses `extent: string[]` (edge_ids) for all tiers. This conflates two different things:

- **Brigade front** = the set of settlements the brigade is responsible for. Brigades operate at settlement level. Their AoR is `settlement_ids[]`. This is the existing `brigade_aor: Record<SettlementId, FormationId>` and it should stay that way.

- **Corps front** = the visual front line, i.e., the set of edges where this corps meets the enemy. This is naturally `edge_ids[]`. It's what the player would draw on the map. It's what front_edges.ts already computes.

- **Army front** = derived, never stored. Union of corps fronts. No state field needed.

The derivation chain:

```
corps_front_edges (derived from brigade positions OR player-drawn)
  → auto-distribute → brigade settlements along the front
  → write → brigade_aor (existing format, unchanged)
```

All downstream consumers (pressure, attack, supply, displacement) read `brigade_aor` as before. Zero breakage.

### 3.4 One Map With Zoom Levels, Not Five Separate GUIs

The proposal's §6 specifies five separate GUI components (army panel, corps panel, brigade panel, OG panel, operations panel). This will never ship. It fragments the UX and requires five parallel development efforts.

**Replace with one unified map interaction using three zoom-driven modes:**

| Mode | Trigger | What You See | What You Do |
|------|---------|-------------|-------------|
| **Strategic** | F1 or zoomed out | Army fronts (thick outlines), corps sectors (shaded), faction stances | Click corps → set stance; click army → set standing order |
| **Operational** | F2 or medium zoom | Corps fronts (edge lines), brigade positions (counters), named operations | Draw offensive arrows; create OG subfronts; plan operations |
| **Tactical** | F3 or zoomed in | Brigade AoR (settlement highlights), individual postures, attack arrows | Click brigade → set posture; click settlement → issue orders |

This is exactly how HoI4 works: one map, zoom levels. You zoom in, you get more detail. A single **Front Hierarchy Panel** (collapsible tree: Army → Corps → Brigades, OGs as children of Corps) provides drill-down navigation across all tiers without mode-switching.

The existing F-key infrastructure (F1..F4 map modes in map_operational_3d.ts) already supports this pattern.

---

## 4. Phase 0 Integration: Holdout Resistance Rooted in Organizational Penetration

This is the missing piece the proposal doesn't address. Phase I rear cleanup resistance must be rooted in Phase 0 decisions. The pipeline exists but the holdout formula doesn't use it.

### 4.1 Current Holdout Formula (settlement_control.ts)

```
holdout_resistance = hostile_share × 100 × holdoutPopulationFactor(pop) × holdoutProximityFactor(degree)
```

Where `holdoutPopulationFactor` uses `log10(pop)/4` — a 2.5× range from village to city. Demographics and geography only. Phase 0 organizational investments have no effect on holdout resistance.

### 4.2 Amended Holdout Formula: Add Defending Faction Org Bonus

The defending faction's Phase 0 organizational penetration in the municipality should directly amplify holdout resistance. If RBiH invested TO capital in Zvornik municipality during Phase 0, the Bosniak holdout settlements there should fight harder after RS takeover (organized defense, weapons caches, local command structure).

```
holdout_resistance = hostile_share × 100
                   × holdoutPopulationFactor(pop)
                   × holdoutProximityFactor(degree)
                   × (1.0 + org_defense_bonus)

org_defense_bonus (defending faction's org in this municipality):
  to_control == 'controlled':      +0.4  (organized militia nucleus — RBiH only)
  patriotska_liga > 0:             +0.3  (RBiH paramilitary cadre)
  sda_penetration > 50:            +0.2  (RBiH political organization)
  paramilitary_rs > 0:             +0.3  (RS paramilitary — if RS is the holdout faction)
  sds_penetration > 50:            +0.2  (RS party org)
  paramilitary_hrhb > 0:           +0.3  (HRHB paramilitary)
  hdz_penetration > 50:            +0.2  (HRHB party org)
  police_loyalty == 'loyal':       +0.2  (institutional control intact)
  jna_presence (if defending RS):  +0.4  (heavy weapons, fortifications)
```

The `organizational_penetration` per municipality is already carried forward from Phase 0 into Phase I state. This change only requires reading it in the holdout resistance formula.

**Design consequence:** Phase 0 investment creates differentiation. RBiH investing TO capital in Zvornik during Phase 0 means those Bosniak holdout settlements fight harder after the RS takeover. RS investing paramilitary capital in Prijedor means Kozarac (Bosniak settlement within Prijedor) faces stronger RS cleanup militia — not because the holdout is weaker, but because the *attacking* militia is stronger (reflected in higher RS militia_strength from Phase 0 org).

### 4.3 Steeper Population Factor

The current `log10(pop)/4` compresses the range too much. Replace with a piecewise function:

```
holdoutPopulationFactor(pop):
  pop < 500:       0.3  (hamlet — collapses fast)
  500–2000:        0.6  (village — modest resistance)
  2000–10000:      1.0  (town — baseline)
  10000–30000:     1.8  (large town — serious holdout)
  30000+:          2.5  (city — major strongpoint)
```

A city holdout has 8× the resistance of a hamlet, versus 2.5× currently. However, note that **most holdouts that enter this path are small** — large cities with hostile populations (Sarajevo, Tuzla, Banja Luka) are protected by brigade presence (FLIP_ELIGIBLE_MILITIA_THRESHOLD blocks the municipal flip). The population factor mainly differentiates between hamlets, villages, and towns.

### 4.4 Border Municipality Intervention Modifier

Zvornik's takeover wasn't just local SDS + JNA. Serbia sent paramilitaries across the Drina. Municipalities adjacent to FRY (eastern Drina border — Bijeljina, Zvornik, Bratunac, Višegrad, Foča, Rudo) should receive an **external intervention bonus** to RS flip pressure during early war.

```
If municipality is FRY-adjacent AND turn < RS_EARLY_WAR_END_WEEK (26):
  RS attack pressure += BORDER_INTERVENTION_BONUS (e.g., +15)
```

This is a geographic modifier in the existing control_flip pressure calculation, not a new system. It reflects that RS could project military force across the border into Drina valley municipalities — a capability that diminished as FRY reduced direct involvement.

### 4.5 Holdout Connectivity Is the Primary Survival Mechanic

The existing holdout isolation system (BFS through same-faction settlements, surrender after 4 turns if isolated) is the correct primary mechanic. **Connected holdouts persist; isolated ones fall.** This produces the right historical outcomes:

- Kozarac: surrounded → isolated → surrenders in weeks ✓
- Zvornik Bosniak settlements connected to Tuzla: BFS reaches friendly territory → persists ✓
- Srebrenica/Goražde/Sarajevo: brigade present → flip blocked entirely ✓

The isolation surrender timer (4 turns) is adequate for the settlements that actually enter the holdout path (villages and small towns). Large settlements are protected by brigade presence and never become holdouts.

---

## 5. New Mechanics to Add to the Proposal

### 5.1 Front Line Drawing → Auto-Distribution (The Killer Feature)

This is what HoI does and what would transform AWWV's UX. The proposal mentions "corps front editing" but doesn't specify how it works. This is the core interaction:

1. Player draws a front line (a set of edges on the map) for a corps.
2. Engine auto-distributes brigades along that line, assigning each brigade a contiguous segment of settlements behind the line.
3. Brigades with "attack" posture push the line forward; "defend" holds it.
4. Player drags the line forward → auto-generates attack orders for brigades to reach the new line.
5. Player drags the line backward → brigades orderly retreat to new positions.

**Implementation:** The "front line" is a set of front edges. The engine partitions it into segments (one per brigade), then assigns settlements within N hops behind each segment as that brigade's AoR. This replaces manual 1–4 settlement assignment for most cases.

**What this changes:** The player thinks in terms of "where is my front line" and "which direction should it move," not "which 3 settlements should this brigade cover."

**This must be Phase 2, not Phase 2b.** It's the hardest engineering but the highest-value feature. Everything else in the proposal is secondary to this.

### 5.2 Offensive Arrow Plans

Player draws an arrow from their current front line to an objective (a settlement, municipality, or target line):

1. Arrow defines the axis of advance.
2. Engine computes which brigades participate (those whose AoR overlaps the arrow's base).
3. During execution, brigades advance along the arrow, taking settlements in sequence.
4. Named operation wraps the arrow plan (planning → execution → recovery phases already exist in corps_command).

**What this changes:** Currently the player issues individual attack orders per brigade per settlement per turn. With offensive arrows, the player says "advance along this axis" and the engine handles settlement-by-settlement execution over multiple turns.

### 5.3 Fallback Lines (Defensive Depth)

Player draws a secondary line behind the current front:

1. If the main front is breached, brigades fall back to the fallback line.
2. Automatic elastic defense rather than the player manually reassigning AoR after territory loss.
3. Maps to existing "elastic_defense" posture but with spatial definition.

**What this changes:** Currently when you lose territory, your AoR becomes inconsistent and the player has to manually fix it. With fallback lines, the game auto-adjusts.

### 5.4 Front Pressure Visualization

The existing `front_pressure` and supply_pressure systems should be visualized on the front line:

- Thick red sections = high enemy pressure (danger)
- Thin green sections = low pressure (safe)
- Directional arrows showing pressure source

This gives the player the same "at a glance" understanding HoI4's colored front lines provide. Turns pressure from an abstract number into a visual signal for where to reinforce. The data already exists — it just needs rendering.

### 5.5 Front Width / Overextension Mechanic

Each front-line edge has terrain-based width (mountain=narrow, plains=wide). Brigade density along the front matters:

- Too few brigades per front length = gaps (enemy can exploit weak points)
- Too many brigades per front length = stacking penalty (diminishing returns, logistic strain)
- Corps front length / available brigades = coverage quality metric

This naturally creates the HoI tension: concentrate for a breakthrough (narrow front, high density) or spread to defend everything (wide front, thin coverage). The terrain_scalars data already exists. This mechanic would feed into both combat resolution and supply_pressure (overextension component).

### 5.6 Pocket/Enclave Mechanics (Bosnia-Specific)

Unlike HoI4's mostly contiguous fronts, Bosnia had enclaves (Srebrenica, Goražde, Bihać, Sarajevo). The front system needs explicit pocket handling rather than treating enclaves as edge cases:

- A pocket is a disconnected component of a faction's controlled territory (already detected by supply_reachability.ts → isolated_controlled).
- Pockets get their own mini-front automatically (front edges around the pocket perimeter).
- Pocket brigades operate independently of the main front hierarchy (they can't coordinate with a corps HQ 100km away through enemy territory).
- Supply state for pocket brigades is "critical" unless a corridor exists (already computed by supply_state_derivation.ts).

The existing brigade_encirclement detection (brigade_aor.ts) and supply corridor classification (Open/Brittle/Cut) provide the foundation. The front system should integrate with these rather than ignoring them.

---

## 6. Integration With Existing Systems

### 6.1 Preserving `brigade_aor` as the Runtime Interface

**Do not replace `brigade_aor`.** It's used everywhere — pressure, attack resolution, supply, displacement, settlement_control, bot AI. Instead, add `corps_front_edges` as a new state field. The derivation chain:

```
corps_front_edges: Record<FormationId, string[]>
  ↓ (auto-distribute)
brigade_front_assignment (intermediate)
  ↓ (write)
brigade_aor: Record<SettlementId, FormationId | null>  (existing, unchanged)
```

All downstream consumers read `brigade_aor` as before. Zero breakage.

### 6.2 Corps Command Integration

`corps_command` already has stance, operations, og_slots. Add:

```ts
corps_command[corpsId].front_edges: string[]  // the front line for this corps (derived or drawn)
```

When `front_edges` changes (player draws a new line, or territory shifts), re-derive `brigade_aor` for subordinate brigades via auto-distribution.

### 6.3 Operation Integration

Named operations already have planning → execution → recovery. Add:

```ts
corps_command[corpsId].active_operation.attack_arrow: SettlementId[]
  // Ordered list of target settlements defining axis of advance
```

During execution phase, participating brigades advance along the arrow one settlement per turn (subject to attack resolution). This hooks into existing attack_orders generation.

### 6.4 Bot Integration

**The bot never draws fronts.** It uses existing logic:

- `bot_corps_ai` sets stance, launches operations, activates OGs → unchanged
- `bot_brigade_ai` generates posture, attack orders, reshape orders → unchanged
- After bot decisions, derive `corps_front_edges` from brigade positions (union of brigade AoR edges that are front-active)
- Player sees bot fronts on the map as derived lines

This means the bot's front behavior emerges naturally from its existing decision-making. No new bot AI layer needed for Phase 2.

---

## 7. Revised Implementation Phases

The proposal's phasing buries the most important feature (drawable fronts) in Phase 2b and starts with the least impactful piece (brigade front assignment, which already exists). Revised:

| Phase | What | Effort | Impact |
|-------|------|--------|--------|
| **1: Visual front lines** | Render existing front_edges as continuous lines on the 3D map, colored by faction. Render corps sectors as shaded regions. Front pressure visualization (thick/thin/color). | Small | Players see fronts for the first time. Massive visual payoff for near-zero engineering. |
| **2: Drawable corps fronts** | Player draws/adjusts corps front line on the operational map. Auto-distribution engine assigns brigades along the drawn line. Fallback lines. | Large | The HoI killer feature. Eliminates manual brigade assignment. This is the hard engineering. |
| **3: Offensive arrows** | Player draws attack axis → engine generates multi-turn advance via named operations. Integrates with existing corps_command operations lifecycle. | Medium | Eliminates per-brigade per-settlement per-turn attack micromanagement. |
| **4: OG subfronts** | Player draws subfront region within corps front → creates OG with spatial extent and pool contribution. Existing OG lifecycle (cohesion, dissolution) applies. | Small–Medium | OGs become spatial and intuitive. |
| **5: Front width + polish** | Front width mechanic (terrain-based). Overextension feedback. Pocket/enclave integration with front hierarchy. Full pressure visualization. | Medium | Strategic depth — concentrate vs. spread tradeoff. |
| **6: Phase 0 holdout integration** | Org penetration → holdout resistance formula. Steeper population factor. Border intervention modifier. | Small | Phase 0 decisions matter for Phase I outcomes. Can ship independently of front phases. |

**Phase 1 is nearly free** — front_edges are already computed every turn. Just render them as a line on the 3D operational map. That alone makes the game look like a real wargame.

**Phase 2 is the core engineering challenge** — auto-distribution of brigades along a drawn front. This is where most of the design effort should focus. The proposal should specify the auto-distribution algorithm in detail.

**Phase 6 (holdout integration) is independent** — it doesn't depend on front mechanics at all. It can ship before or after any other phase. It's a small change to settlement_control.ts.

---

## 8. Answers to Open Questions

### 8.1 Phase I pocket semantics (Q1)

**Answer: Drop non-contiguous brigade AoR entirely.** Phase I rear cleanup uses control_flip → wave_flip → holdout pipeline. No brigade AoR changes needed. Holdout fate determined by BFS connectivity to main front (existing mechanic). Holdout resistance improved by Phase 0 org integration (§4 above).

### 8.2 Corps front overlap at boundaries (Q2)

**Answer: Yes, allow overlap.** Two corps can share edges at a boundary strip. The engine assigns settlements to the closer corps's brigades by BFS distance from brigade HQ. This enables historical multi-corps operations like Corridor 92 (Posavina) where multiple corps converged on the same axis.

### 8.3 OG subfront scope (Q3)

**Answer: Subfront must be subset of one corps front.** Multi-corps OGs break the hierarchy. For multi-corps coordination, use army standing orders (already exist) or named operations at army level. Canon (Rulebook §5.6) says OGs are authorized at Corps level — cross-corps OGs would be a canon violation.

### 8.4 Army front storage (Q4)

**Answer: Derived only, never stored.** Army front = union of corps fronts. No state field. Computed on demand for rendering. Storing it creates a synchronization problem with no benefit.

### 8.5 Init from scenario (Q5)

**Answer: Yes.** Add `init_corps_fronts` to scenario schema. For the April 1992 start, derive from OOB HQ positions + computeFrontRegions. For later starts (e.g., mid-war scenarios), author explicit front lines. Brigade assignment is always derived from corps front via auto-distribution, so `init_brigade_fronts` is unnecessary — just init the corps fronts and let the engine distribute.

---

## 9. Additional Risks Not in Original Proposal

| Risk | Severity | Mitigation |
|------|----------|------------|
| Auto-distribution algorithm produces bad assignments (brigades in wrong positions, gaps in line) | High | Extensive test suite with historical scenarios; manual override always available; fallback to current manual assignment |
| Front line drawing UX is awkward on a settlement graph (jagged, not smooth) | Medium | Snap-to-edge drawing tool; smooth interpolation for visual display while internal representation stays edge-based |
| Performance of front derivation on every state change | Low | Cache corps_front_edges; only recompute when brigade_aor or political_controllers change; existing front_edges computation is already fast |
| Enclaves don't fit the "draw a front line" paradigm | Medium | Auto-detect pockets (existing supply_reachability); auto-generate enclave mini-fronts; player can't draw fronts for enclaves (they're auto-managed) |
| Phase 0 holdout integration creates balance issues | Low | Tune org_defense_bonus coefficients via scenario runs; all values are constants, easily adjusted |
| Border intervention modifier makes RS too strong in Drina valley | Medium | Gate by RS_EARLY_WAR_END_WEEK (26); historical — RS *was* stronger there in early war; tune bonus value via 52w scenario runs |

---

## 10. Canon Changes Required (Revised)

The proposal's §9 canon changes are mostly correct but should be amended:

### 10.1 Rulebook

- **§5.2 Areas of Responsibility:** Keep existing text. Add: "Brigade AoR may be derived from corps front assignment via auto-distribution." Do NOT add Phase I non-contiguous AoR — that's been dropped.
- **§5.4 Reshaping AoRs:** Add: "Corps front adjustment (player or auto) triggers brigade AoR redistribution."
- **§5.6 Operational Groups:** Add subfront extent and pool contribution as proposed. Add: "OG subfront must be subset of parent corps front."

### 10.2 Systems Manual

- **§6.2:** Add front line derivation and auto-distribution algorithm description.
- **§6.3:** Add OG subfront extent and pooling as proposed.
- **§6.4:** Add offensive arrow plans and multi-turn operation execution.
- **§7:** Pressure continues to use `brigade_aor` (unchanged). Add front width / overextension mechanic.

### 10.3 Phase I Spec

- Add: holdout resistance formula now includes defending faction org bonus from Phase 0.
- Add: border municipality intervention modifier for RS in FRY-adjacent municipalities.
- Do NOT add Phase I non-contiguous brigade AoR.

### 10.4 Phase II Spec

- Add: corps front as explicit state field; derivation from brigade positions.
- Add: offensive arrow plan integration with named operations.
- Existing contiguity requirement unchanged.

---

## 11. Summary of Amendments for Architects

1. **Drop Phase I non-contiguous brigade AoR.** Rear cleanup uses existing control_flip → holdout pipeline. Holdout resistance improved via Phase 0 org integration.
2. **Corps fronts are always derived initially.** Player-drawn corps fronts require auto-distribution engine (Phase 2). Bot corps fronts are always derived.
3. **Extent types differ by tier.** Brigade = settlement_ids (existing). Corps = edge_ids (front line). Army = derived, no state.
4. **One map with zoom levels, not five GUIs.** Strategic/Operational/Tactical modes on a single map with F-key switching. One Front Hierarchy Panel for tree navigation.
5. **Add Phase 0 → holdout resistance integration.** Org penetration bonus in holdout formula. Steeper population factor. Border intervention modifier for RS/FRY-adjacent municipalities.
6. **Add drawable front lines as the Phase 2 priority.** This is the HoI killer feature — not a backlog item.
7. **Add offensive arrow plans.** Player draws attack axis → multi-turn automated advance via named operations.
8. **Add fallback lines.** Automatic elastic defense retreat when front is breached.
9. **Add front pressure visualization.** Render existing pressure data on the front line (thick/thin, color).
10. **Add front width mechanic.** Terrain-based width per edge; brigade density determines coverage quality; overextension penalty.
11. **Integrate pocket/enclave handling.** Auto-detect disconnected territory; auto-generate enclave mini-fronts; pocket brigades operate independently.
12. **Rephase implementation.** Start with visual front lines (nearly free), then drawable corps fronts (core feature), then offensive arrows, then OG subfronts. Holdout integration is independent and can ship anytime.

---

## 12. References

- `docs/30_planning/FRONT_ASSIGNMENT_HOI_STYLE_PROPOSAL.md` — reviewed document
- `docs/10_canon/Phase_0_Specification_v0_5_0.md` §4.1–4.6 — pre-war capital, org penetration, stability
- `docs/10_canon/Phase_I_Specification_v0_5_0.md` §4.3–4.6 — control flips, holdouts, consolidation, control strain
- `docs/10_canon/Phase_II_Specification_v0_5_0.md` — brigade AoR, contiguity, attack resolution
- `src/sim/phase_i/settlement_control.ts` — wave flip, holdout creation/cleanup, isolation surrender
- `src/sim/phase_i/control_flip.ts` — stability/pressure evaluation, consolidation period, FLIP_ELIGIBLE_MILITIA_THRESHOLD
- `src/sim/phase_ii/brigade_aor.ts` — settlement-level AoR assignment, encirclement detection
- `src/sim/phase_ii/corps_command.ts` — stance, operations, OG slots
- `src/sim/phase_ii/bot_corps_ai.ts` — corps-level AI (stance, operations, OGs, standing orders)
- `src/sim/phase_ii/bot_brigade_ai.ts` — brigade-level AI (posture, attack, reshape)
- `src/map/front_edges.ts` — front edge computation
- `src/map/front_regions.ts` — connected front components
- `src/state/supply_reachability.ts` — BFS supply connectivity, isolated territory detection
- `src/state/supply_state_derivation.ts` — corridor classification (Open/Brittle/Cut)
- `src/phase0/investment.ts` — organizational penetration investments
- `src/phase0/stability.ts` — stability score computation
