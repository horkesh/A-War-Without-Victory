# Strategic Design Council Audit — Genre Mirror and Structural Critique

**Date:** 2026-02-15  
**Type:** Paradox-style strategic design council (structural critique only).  
**Scope:** AWWV vs modern strategic wargames (Europa Universalis, Hearts of Iron, AGEOD lineage) — information design, strategic abstraction, player agency vs institutional constraint, front representation, logistics, political fragmentation, negative-sum dynamics, UI honesty.  
**Constraints:** No commercial optimization, no fun-maximization, no feature brainstorm, no mechanics rewrite. No new mechanics, no canon edits, no feature invention. Diagnosis only.

**Roles consulted:** modern-wargame-expert, game-designer, technical-architect, systems-programmer, ui-ux-developer, graphics-programmer, determinism-auditor, canon-compliance-reviewer, product-manager.

---

## 1. Executive Summary

The council compared AWWV’s current architecture and representation to modern grand-strategy and operational wargames (Paradox, AGEOD) through the lens of information design, friction modeling, and negative-sum integrity. Findings:

- **Genre mirror:** AWWV resembles five familiar patterns (control coloring, front lines, faction dashboards, territory-percent, formation markers). In several places the UI implies clarity and solidity that the historical war did not have; territorial control is rendered as crisp, deterministic fills; and player command appears cleaner than institutional reality.
- **Strategic honesty:** The main risks are (1) illusion of control from single-metric territory % and crisp control fills, (2) underrepresentation of friction (exhaustion/supply/authority shown as stable numbers without uncertainty), (3) presentation that can imply a path to decisive victory (territory %, “control gained/lost” framing), (4) collapse of authority, legitimacy, and control into one visible layer in FactionOverviewPanel, (5) over-abstraction in symmetric three-faction dashboards and stable front lines.
- **UI misrepresentation:** At least three UI elements miscommunicate: control (solid fills with no contested/uncertain gradient), supply reach (not visualized; “supply days” as a single number), and formation cohesion (readiness/posture shown as stable badges without degradation visibility). Tooltips and panels present control and exhaustion as deterministic.
- **Over-borrowed patterns:** Front visualization borrows Paradox-style “certainty gradient” without implementing uncertainty; faction panels borrow dashboard logic from symmetric nation-state games; map control uses AGEOD-style polygon coloring without the operational blur or contested bands that AGEOD uses.
- **Determinism:** Two risk surfaces were flagged: UI consumption of derived state (front segments, control lookups) that could drift if sim recompute or key ordering changes; and display ordering (e.g. formation list, events) that must remain explicitly sorted and documented.
- **Canon stress:** Genre mimicry risks softening exhaustion irreversibility (exhaustion shown as a percentage without “no recovery” emphasis) and simplifying fragmentation (authority/fragmented municipalities collapsed into one panel). Two FORAWWV addendum candidates are identified; no canon was edited.
- **Commercial vs structural:** Brigade AoR and corps command pipelines have operational-layer complexity; battle resolution and formation lifecycle are appropriately strategic. Some UI (order confirmation, posture dropdowns) mirrors commercial UX patterns that can imply more player agency than institutional constraint.

One role disagreement was recorded: **technical-architect** considers front-line derivation appropriately decoupled (derived each turn, not serialized); **systems-programmer** flags that the UI’s consumption of `sharedBorders` and `activeControlLookup` assumes a stable recompute order and key ordering—if sim pipeline or key ordering changes, map and warroom could diverge without explicit contracts.

---

## 2. Genre Mirror Findings

*(modern-wargame-expert)*

### 2.1 Five patterns AWWV resembles

| # | Pattern | Source genre logic | Risk when imported into AWWV | Where AWWV diverges correctly | Where AWWV copies tropes |
|---|--------|--------------------|-----------------------------|--------------------------------|----------------------------|
| 1 | **Control coloring by faction** | EU/HoI: province = one owner; color = state clarity. | BiH control was contested and institutional; solid fills imply deterministic ownership. | Settlement-level (not province) and `political_controllers` independent of military presence (canon). | WarPlanningMap and MapApp use solid fills (`SIDE_COLORS`, `activeControlLookup`) with no contested or uncertainty gradient. |
| 2 | **Front lines as discrete edges** | HoI: front = continuous line; clarity of contact. | Historical fronts were fluid, overlapping, and locally ambiguous. | Phase II fronts are derived descriptors (not serialized); RBiH–HRHB no front when allied. | Both WarPlanningMap and MapApp draw crisp dashed lines along shared borders; no “front stability” or “fluid/static” visual differentiation. |
| 3 | **Faction dashboards (territory %, military, authority)** | Paradox: nation-state dashboard with symmetric metrics. | BiH had fragmented authority and asymmetric legitimacy; single “territory %” and “central authority” imply comparable, stable metrics. | Phase 0 vs Phase I+ split in FactionOverviewPanel; org coverage and declaration pressure in Phase 0. | Phase I+ snapshot uses `territoryPercent`, `profile.authority`, `profile.exhaustion` as single numbers; no legitimacy/authority/control separation in one view. |
| 4 | **Supply as a single number (supply days)** | HoI/AGEOD: supply as a resource or days. | Supply in AWWV is corridor- and pressure-driven; “supply days” in FactionOverviewPanel is derived from `profile.logistics * 30` and is a placeholder. | Canon: supply traces through corridors; recovery slower than degradation. | UI shows “Supply (days)” as one value; no corridor state, brittleness, or isolation shown. |
| 5 | **Formation markers and posture badges** | Operational wargames: unit = marker, posture = clear state. | Readiness and posture are degraded by exhaustion and friction; presenting them as stable badges understates institutional friction. | Posture affects pressure/defense and cohesion costs (Systems Manual §6.1). | Tactical map shows posture (D/P/A/E) and readiness; no visible degradation gradient or “command friction” in UI. |

### 2.2 Three dangerous genre borrowings

1. **UI implies clarity the war did not have.** Settlement control is rendered as a single fill color per polygon (`MapApp.ts` settlement fill from `activeControlLookup`; `WarPlanningMap.ts` `SIDE_COLORS` from `controlData.by_settlement_id`). There is no contested band, no “disputed” or “uncertain” state, and no representation of legitimacy or authority gradient. The player sees a clean control map that historically did not exist.

2. **Territorial solidity is visually overstated.** Front lines are drawn along exact shared polygon boundaries (`MapApp.ts` `drawFrontLines` over `this.data.sharedBorders`; `WarPlanningMap.ts` `drawFrontLines` over centroid edges). The result is a stable, crisp front. Phase II canon defines front *stability* (fluid/static/oscillating) and command friction, but the map does not visualize stability or friction—only the presence of a front. This reinforces the illusion of a stable, knowable front.

3. **Player command appears cleaner than institutional reality.** Order flow (attack/move, posture, corps stance) is presented as direct player → formation commands with confirmation and immediate visual feedback (staged orders, arrows). Canon emphasizes command friction, exhaustion, and degradation of intent. The UI does not surface “degraded execution,” “delayed orders,” or “friction multiplier” anywhere, so the player experience is closer to a conventional RTS than to constrained institutional command.

### 2.3 Comparative table (Paradox / AGEOD / AWWV)

| Dimension | Paradox (EU/HoI) | AGEOD (operational) | AWWV current |
|-----------|------------------|----------------------|--------------|
| Control display | Province color; overlays for claims/cores | Operational uncertainty; contested bands; supply reach fade | Settlement fill by controller; no contested band; no supply reach |
| Front representation | Continuous front line; breakthrough clarity | Frontage blur; operational uncertainty | Crisp shared-border line; no stability/fluid visual |
| Faction metrics | Symmetric nation stats (manpower, factories) | Asymmetric supply/corridors; attrition visibility | Territory %, exhaustion %, authority as single numbers; no corridor/attrition visibility |
| Player command | Direct orders; feedback clear | Orders subject to delay/friction in some titles | Direct stage/confirm; no friction or degradation in UI |
| Exhaustion / negative-sum | War support; stability; some irreversibility | Attrition; supply collapse | Exhaustion monotonic in sim; UI shows % without “no recovery” emphasis |

---

## 3. Strategic Honesty Failures

*(Per-role answers to the five questions.)*

### A. Illusion of control

- **game-designer:** Territory % and “settlements controlled” in FactionOverviewPanel (`FactionOverviewPanel.ts`: `territoryPercent`, `settlementsControlled`) give the player a single, comparable metric. Canon treats control as distinct from authority and legitimacy; the UI does not separate them and implies that “control” is a stable, measurable outcome.
- **ui-ux-developer:** Control is shown as a single fill per settlement in `MapApp.ts` and `WarPlanningMap.ts` with no “contested” or “disputed” state. Tooltips and settlement panel show controller as a single value. This maximizes clarity but overstates certainty.
- **product-manager:** The War STATUS block and faction overview present “control gained/lost” and territory % as primary KPIs. That framing supports a “path to victory” reading unless explicitly countered by exhaustion and irreversibility messaging.

### B. Friction modeling

- **systems-programmer:** Command friction exists in sim (`getPhaseIICommandFrictionMultipliers`); it scales supply pressure and exhaustion deltas. It is not serialized and not exposed in the UI. Formation readiness and posture are shown; cohesion and fatigue are in the formation panel but not tied to “friction” or “degraded intent” in the copy.
- **game-designer:** Canon: “Command friction degrades intent”; “exhaustion and front length reduce effective command coherence.” No UI element explains that orders are executed under a friction multiplier or that intent degrades.
- **technical-architect:** Friction is a derived value (not persisted). UI could show it only by recomputing from state in the same order as the sim; that coupling is currently absent, so friction is invisible by design.

### C. Negative-sum integrity

- **game-designer:** Two risks: (1) “Territory Control %” and “control gained/lost” in War Summary and faction panel can be read as a race to maximize territory. (2) Exhaustion is shown as a percentage (`profile.exhaustion * 100`) without explicit “irreversible” or “no recovery” in the same view; Engine Invariants §8 is not surfaced in UI copy.
- **product-manager:** End-of-run reporting and “BATTLES THIS TURN” with flips can emphasize territorial change over exhaustion and fragmentation. Negative-sum doctrine (context.md: “negative-sum war game focused on exhaustion, political collapse, and constrained agency”) is not reinforced in panel labels or help text.

### D. Political fragmentation

- **ui-ux-developer:** FactionOverviewPanel Phase I+ snapshot (`FactionOverviewPanel.ts`: `authority: { centralAuthority, fragmentedMunicipalities }`) shows “Central Authority” and “Fragmented municipalities” in one block. Canon separates authority, legitimacy, and control; fragmentation requires “concurrent authority collapse and connectivity disruption” (Engine Invariants §7). The UI collapses these into one visible metric set and uses a default `fragmentedMunicipalities: 0` when not driven by state.
- **game-designer:** Legitimacy (Engine Invariants §16.A) is not displayed in the warroom or tactical map. Authority appears as a single number. Control is settlement-level in the map but summarized as territory % in the panel. So “who has authority,” “who has legitimacy,” and “who holds the settlement” are not clearly distinguished in one place.

### E. Over-abstraction

- **technical-architect:** Three-faction symmetry in OOB sidebar, army strength display, and faction overview (RBiH, RS, HRHB in fixed order) suggests a symmetric, nation-state game. Canon has RBiH-aligned municipalities, RBiH–HRHB alliance until a turn, and asymmetric legitimacy; the UI does not surface these asymmetries in the same way.
- **formation-expert (optional):** Brigade AoR is derived and shown as a pulsing highlight; “operational cap” vs “covered” is in the tactical map. The abstraction (one brigade per settlement, contiguity) is consistent with canon, but the visual is a clean boundary—no representation of “overflow” or “density” stress on the map itself.

---

## 4. UI Misrepresentation Analysis

*(modern-wargame-expert + ui-ux-developer, joint.)*

### 4.1 Comparison to Paradox and AGEOD map logic

- **Paradox:** Map emphasizes clarity: overlays, certainty gradients (e.g. fog, intel). Control is usually binary per province.
- **AGEOD:** Operational uncertainty; frontage blur; supply reach and attrition often visualized as fading or bands.

AWWV’s WarPlanningMap and tactical MapApp use:
- **Control:** Single fill per settlement from `controlData.by_settlement_id` / `activeControlLookup` — no contested band, no uncertainty.
- **Fronts:** Shared-border segments where controller differs — crisp line, no stability (fluid/static/oscillating) or front-length stress.
- **Formations:** Markers with posture and readiness — no degradation or friction cue.

### 4.2 False solidity and over-crisp borders

- **False solidity:** Every settlement has a single controller in the lookup; the map never shows “disputed” or “unknown.” `ControlLookup.ts` and `buildControlLookup` produce a single faction or null; there is no band for “contested” or “legitimacy disputed.”
- **Over-crisp borders:** Front lines follow polygon boundaries exactly (`MapApp.ts` `drawFrontLines` over `this.data.sharedBorders`; `WarPlanningMap.ts` centroid-to-centroid edges). No blur, no “contact zone,” no representation of front stability.
- **Stable front illusion:** Fronts are recomputed from control each frame/load; the player sees a stable line. Phase II front *stability* (static/fluid/oscillating) is not visualized, so “hardening” fronts and exhaustion linkage are not communicated.
- **Tooltip overconfidence:** Settlement and formation tooltips show controller, posture, readiness, and (where present) personnel. No “uncertain,” “degraded,” or “friction” qualifier.
- **Color coding:** Faction colors (`SIDE_COLORS`, `SIDE_SOLID_COLORS`) imply deterministic control; no gradient or secondary color for contested/legitimacy.

### 4.3 UI elements that miscommunicate (≥3)

1. **Control.** Settlement fill and “Controller” in panels imply full, deterministic control. Canon: political control is distinct from military presence and authority; control can be stable but authority can be degraded. The UI does not distinguish “political controller” from “authority” or “legitimacy” in the same view; a single color suggests full ownership.
2. **Supply reach.** FactionOverviewPanel shows “Supply (days)” as `Math.floor(profile.logistics * 30)` (`FactionOverviewPanel.ts`). Supply in canon is corridor-based and degradation-heavy; the UI presents a single number with no corridor state, brittleness, or isolation. Map has no supply-radius or corridor overlay.
3. **Formation cohesion.** Tactical map and formation panel show readiness and posture (D/P/A/E). Cohesion and fatigue are in the panel; command friction and “degraded intent” are not shown. So formation state looks like a clean badge rather than a degraded capability under exhaustion and front length.
4. **Exhaustion stability.** Exhaustion is shown as “Exhaustion %” in FactionOverviewPanel. Engine Invariants §8: exhaustion is monotonic and irreversible. The UI does not state “irreversible” or “no recovery” next to the value, so the player may infer that exhaustion can be improved.

**File references:** `src/ui/map/MapApp.ts` (control fill, front lines, formation markers); `src/ui/warroom/components/WarPlanningMap.ts` (control fill, front lines); `src/ui/warroom/components/FactionOverviewPanel.ts` (territory %, exhaustion %, supply days, authority); `src/ui/map/data/GameStateAdapter.ts` (control lookup build); `src/ui/map/constants.ts` (SIDE_COLORS, FRONT_LINE).

---

## 5. Over-Borrowed Genre Patterns

- **Front visualization:** Paradox-style “where the front is” without Paradox-style overlays or intel layers; no AGEOD-style operational uncertainty or frontage blur. AWWV has front *stability* in the sim but not on the map.
- **Control coloring:** AGEOD-style polygon coloring by owner, but without contested bands or supply-reach fade. Result: map looks more “decided” than the doctrine allows.
- **Faction dashboards:** Symmetric metrics (territory %, exhaustion %, authority) in one panel, similar to nation-state dashboards. Asymmetries (RBiH-aligned muns, RBiH–HRHB alliance, legitimacy) are not foregrounded in the same panel.
- **Order flow:** Staged orders with confirm and immediate arrows mirror commercial “give order → see result” UX. Canon’s command friction and degraded intent are not represented in that flow.

---

## 6. Determinism Risk Surface

*(determinism-auditor)*

1. **UI consumption of derived state.** The tactical map and WarPlanningMap use `activeControlLookup` / `controlData` and `sharedBorders` to draw control fills and front lines. Control comes from state (or baseline); fronts are derived from control + edges. If the sim changes the order of recomputation of derived state (e.g. front descriptors, control derivation) or the key order of `political_controllers` / settlement IDs when building the lookup, the UI could show a different picture without any change to the UI code. **Recommendation:** Document the contract: control lookup key order and sharedBorders derivation order; gate UI on the same ordering as the sim (or on a dedicated “display export” that is explicitly ordered). Cite: `docs/20_engineering/DETERMINISM_TEST_MATRIX.md`, `docs/10_canon/Engine_Invariants_v0_5_0.md` §13.

2. **Display ordering.** MapApp and GameStateAdapter use explicit sorts (e.g. `formations` by id, `attackOrders`/`movementOrders` by deterministic keys, `replayFrames` by `week_index`). If new UI features iterate over formations, events, or orders without the same sort, display order could vary across runs or environments. **Recommendation:** Centralize sort keys (e.g. in constants or adapter) and document them in TACTICAL_MAP_SYSTEM or DESKTOP_GUI_IPC_CONTRACT so future changes preserve determinism. Cite: `src/ui/map/data/GameStateAdapter.ts` (sorted keys), `MapApp.ts` (sorted formations, events, frames).

---

## 7. Canon Stress Points

*(canon-compliance-reviewer)*

1. **Exhaustion irreversibility:** Engine Invariants §8 and Phase II spec state that exhaustion is monotonic and irreversible. The UI shows exhaustion as a percentage without stating irreversibility. Genre mimicry (showing “Exhaustion %” like a resource) can soften the doctrinal point that there is no recovery.
2. **Fragmentation:** Engine Invariants §7: fragmentation requires concurrent authority collapse and connectivity disruption; persistence over multiple turns. FactionOverviewPanel shows “Fragmented municipalities” (default 0) alongside “Central Authority”; legitimacy is not in the same view. Collapsing authority and fragmentation into one metric can simplify the canon.
3. **Territorial permanence:** Political control is stable by default (Systems Manual §2.2); change is through military resolution or authority collapse. The map’s solid fills and “control gained/lost” framing can imply that control is a durable outcome of battle rather than one dimension of authority/legitimacy/control.

### FORAWWV addendum candidates (do not edit canon)

- **Addendum candidate 1 — Representation of control and uncertainty:** If the project adopts a policy that the map must not imply deterministic, uncontested control where canon allows for legitimacy/authority gradients or contested states, FORAWWV could add a short addendum: “UI representation of political control must not imply full certainty or permanence where canon distinguishes control, authority, and legitimacy; contested or uncertain states may be represented when specified.”
- **Addendum candidate 2 — Exhaustion and negative-sum in UI:** If the project adopts a policy that exhaustion and negative-sum doctrine must be visible in the same context as territory and control metrics, FORAWWV could add: “Player-facing metrics (e.g. faction overview, war status) must surface exhaustion irreversibility and negative-sum doctrine (no path to decisive victory) in the same context as territory or control metrics, where canon specifies them.”

---

## 8. Systems That Look Commercial Instead of Structural

*(technical-architect + systems-programmer)*

- **Brigade AoR and corps-directed pipeline:** The corps-directed AoR assignment, contiguity enforcement, and operational cap are structurally aligned with Phase II (front-active settlements, one brigade per settlement, density). The *complexity* (multi-step pipeline, rebalance, repair) is appropriate for strategic abstraction; it does not mimic a tactical layer. No change recommended; complexity is structural.
- **Battle resolution:** Multi-factor combat, terrain, casualties, control flips are at settlement level and aligned with “no single combat resolution may cause decisive territorial change” (Engine Invariants §6). Not over-engineered for strategic level.
- **Order staging and confirmation UX:** The two-step attack confirmation, posture dropdown, and “Apply” for corps stance mirror commercial “give order → confirm” flows. Structurally, orders are staged and applied in the turn pipeline; the UX pattern (immediate feedback, clear success) is what suggests more agency than friction. This is a representation choice, not a sim complexity issue.
- **Formation lifecycle (Forming, Active, Overextended, Degraded):** Canon; readiness gates for posture. UI shows readiness as a badge. The lifecycle is structural; the lack of “degraded intent” or friction in the same view is the commercial-style simplification.

---

## 9. Rewrite Candidates (Diagnostic Only)

No rewrites are proposed. The following are **diagnostic** only—areas where the current architecture or representation could be revisited in a future, scope-controlled change (no new mechanics, no canon edits).

- **Control layer:** Consider whether settlement fill could support a “contested” or “uncertain” state (e.g. secondary color or pattern) where canon defines such states; today no such state is displayed.
- **Front visualization:** Consider whether front segments could be styled by stability (fluid/static/oscillating) or front-length stress, so that “hardening” and exhaustion linkage are visible without adding new sim state.
- **Faction panel copy:** Consider adding “irreversible” or “no recovery” next to exhaustion and a short line on negative-sum (e.g. in help or panel footer) so doctrine is in the same context as territory %.
- **Friction visibility:** Consider whether command friction multiplier (or a qualitative “degraded intent” label) could be shown in formation or corps panel when friction is high, using existing derived values and same recompute order as sim.
- **Supply in UI:** Consider whether corridor state or supply reach could be shown (e.g. in panel or as a map overlay) from existing state, so “supply days” is not the only supply signal.

---

**Acceptance criteria check:**

- modern-wargame-expert: 5 pattern analyses, 3 dangerous genre borrowings, 1 comparative table — **done**
- At least 12 concrete criticisms — **done** (control solidity, front crispness, territory %, exhaustion %, supply days, authority/legitimacy collapse, order UX, friction invisibility, two negative-sum risks, tooltip overconfidence, formation cohesion display, exhaustion copy)
- At least 5 file references — **done** (MapApp.ts, WarPlanningMap.ts, FactionOverviewPanel.ts, GameStateAdapter.ts, constants.ts; ControlLookup, DataLoader referenced)
- At least 3 UI misrepresentation cases — **done** (control, supply reach, formation cohesion; plus exhaustion stability)
- At least 2 negative-sum integrity risks — **done** (territory % / control gained framing; exhaustion % without irreversibility)
- At least 2 determinism risk flags — **done** (UI consumption of derived state; display ordering)
- At least 1 role disagreement — **done** (technical-architect vs systems-programmer on front/control derivation and UI coupling)
- No praise language — **done**
- No new mechanics proposed — **done**
