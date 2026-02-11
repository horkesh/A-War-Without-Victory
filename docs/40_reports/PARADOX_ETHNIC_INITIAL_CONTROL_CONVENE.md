# Paradox convening: Initial starting points tied to ethnic settlements

**Date:** 2026-02-11  
**Purpose:** Convene Paradox to analyse tying initial starting points to **ethnic majority by settlement** (1991 census) instead of **political/institutional control**, and implications for early war: formations mopping up opposing ethnic-majority settlements in the rear, depopulation, and ethnic cleansing.

**Status:** Design analysis and recommendations; no implementation. Handoff to Game Designer and Product Manager for decision and phased plan.

---

## 1. Proposal summary

**Current design:** Initial political control is set from **pre-war institutional authority** (municipality default from e.g. `municipalities_1990_initial_political_controllers_apr1992.json`). Rulebook: “Demographic majority alone is insufficient to override municipal authority.”

**Proposed alternative:** At Turn 0, set **political_controller(sid)** from **1991 ethnic majority** per settlement:

- Bosniak majority → RBiH  
- Serb majority → RS  
- Croat majority → HRHB  
- Mixed / no clear majority / other → defined rule (e.g. null, or plurality, or scenario override)

**Intent:** Early war then requires the player (and bots) to use **formations to clear opposing ethnic-majority settlements in the rear** (holdouts), leading to **depopulation and ethnic cleansing** when those settlements flip (Phase I §4.4 displacement).

---

## 2. Current design (baseline)

### 2.1 Canon

- **Rulebook v0.5 (§4.2):** Political control = municipal authority (administrative control, policing, taxation). “Demographic majority alone is insufficient to override municipal authority.” Settlement-level overrides are rare, deterministic, precomputed.
- **Game Bible v0.5 (§5.1):** “Political control is initialized deterministically before any military interactions and remains stable by default.”
- **Phase I §4.3–§4.4:** Control changes via flip (stability + militia + optional formation strength). Displacement on flip when **Hostile_Population_Share > 0.30** (losing-faction-aligned population).

### 2.2 Implementation

| Component | Role |
|-----------|------|
| **Init** | `prepareNewGameState` → `initializePoliticalControllers`; mun-level mapping or settlement-level file (e.g. Sept 1992). Source: political authority data. |
| **Settlement-level control** | `settlement_control.ts`: after a mun flips, **wave** (attacker ethnicity ≥ 30% → flip; else **holdout**) and **cleanup** (formations clear holdouts, max 2 per brigade per turn; or **isolation surrender** after 4 turns). |
| **Displacement** | Phase I: on flip, one-time displacement when hostile share > 0.30; routing, killed, fled-abroad when census exists. |

**Data:** `settlement_ethnicity_data.json` and/or `majority_ethnicity` on settlement features already exist (tactical map “Ethnic majority” view uses them). No new data source required for ethnic-based init.

---

## 3. Implications by concern

### 3.1 Early war: “mopping up” in the rear

- With **ethnic init**, each faction “owns” only settlements where its aligned ethnicity is majority. Many municipalities become **mixed** from Turn 0 (some sids RBiH, some RS, some HRHB).
- **Opposing-majority settlements behind the line** do not flip in the wave (hostile majority) → they become **holdouts**. They are cleared only by:
  - **Formation cleanup** (existing: up to 2 settlements per brigade per turn when resistance < threshold), or  
  - **Isolation surrender** (4 turns without supply to same-faction territory).
- So **formations must be used to clear rear-area opposing-majority settlements**. This becomes the dominant early-war dynamic instead of only after municipality flips.

### 3.2 Depopulation and ethnic cleansing

- When a holdout is **cleared** (or a mun flips), Phase I §4.4: if **Hostile_Population_Share > 0.30**, displacement runs (losing-faction-aligned population; routing, killed, fled abroad when census available).
- Clearing Bosniak-majority settlements as RS (or vice versa) therefore **triggers displacement** of that population → **depopulation** and **ethnic homogenization**. The mechanic is already in canon; ethnic init would make it the dominant early-war outcome of clearing territory.

### 3.3 Canon and design

- **Tension:** Canon states that political control reflects institutional authority and “demographic majority alone is insufficient.” Basing **initial** control on ethnicity is a different premise: “control at start = 1991 census majority.”
- **Options:**
  - **Alternate init mode:** Keep political init as default; add scenario option (e.g. `init_control_source: "ethnicity"` or `init_control: "ethnic_1991"`). Canon describes “ethnic start” as a scenario type (counterfactual or simplified).
  - **Replace default:** Make ethnic-based init the default; then canon and Rulebook need an explicit update that “initial control may be set from 1991 census majority” where applicable.
- **Game Designer** should decide: alternate scenario type vs new default, and naming (e.g. “Ethnic 1991” vs “April 1992 political”) for clarity in scenarios and AARs.

### 3.4 Technical / harness

- **Init path:** Either (a) derive initial `political_controllers` from `settlement_ethnicity_data` (and/or GeoJSON `majority_ethnicity`) with a deterministic rule (majority → faction; mixed → null or scenario rule), or (b) precompute a settlement-level init file (like Sept 1992) from ethnicity data.
- **Scenario schema:** e.g. `init_control: "apr1992"` (political) vs `init_control: "ethnic_1991"` or new field `init_control_source: "ethnicity"` with optional thresholds.
- **Settlement-level from day one:** Ethnic init is inherently **settlement-level** (each sid by its own majority). Settlement-level init is already supported (Sept 1992 spec); all scenarios using ethnic init would use it.

### 3.5 Formation and brigade design

- **Holdout cleanup** (max 2 per brigade per turn, resistance threshold, isolation surrender) becomes **core** early game. Balance (number of brigades, number of holdouts, clearance and surrender rates) will drive whether early war feels right.
- **Mixed municipalities:** Many muns start with mixed control; Phase I already handles mun-level flip then wave + holdouts. No change to flip granularity; only the **initial** pattern changes.

### 3.6 Historical vs counterfactual

- April 1992 historically had **institutional** control (e.g. SDA-run vs SDS-run muns), not a perfect ethnic map.
- **Ethnic 1991 start** is therefore **counterfactual** or **simplified** (“what if control had been assigned by 1991 census”). Scenario name and docs should state this (e.g. “April 1992 (ethnic 1991 start)”).

### 3.7 Displacement hooks

- **Current:** `displacement_hooks.ts` uses a **stub** for Hostile_Population_Share (e.g. 0.5). For ethnic init to drive depopulation correctly, Hostile_Population_Share should be computed from **census ethnicity** (share of losing-faction-aligned population in the mun or settlement). Small wiring task once census is available at flip/holdout-clearance time.

---

## 4. Per-role synthesis

| Role | Question | Synthesized answer |
|------|----------|--------------------|
| **Game Designer** | Alternate scenario type or new default? Canon wording? | Decide: (a) scenario option only, or (b) new default. Add canon/context note that “initial control may be set from 1991 census majority (per-scenario)” if adopted as option. Name clearly (e.g. “Ethnic 1991”). |
| **Technical Architect** | Schema and entry point? | Define e.g. `init_control: "ethnic_1991"` or `init_control_source: "ethnicity"`. Init either computed at load from ethnicity data or from pre-generated settlement-level file. Settlement-level init path already exists (Sept 1992). |
| **Gameplay Programmer** | Init implementation? | New code path: from `settlement_ethnicity_data` (and/or `majority_ethnicity`) assign political_controller per sid (majority → faction; mixed/other → rule). Deterministic; sorted iteration. |
| **Formation-expert** | Holdout balance when many from Turn 0? | Review cleanup limits (2 per brigade, resistance, isolation surrender) and brigade count vs holdout count so early war pacing is acceptable. |
| **Scenario-creator-runner-tester** | One ethnic-1991 scenario? | Specify one scenario (e.g. April 1992 with ethnic init); document as counterfactual; list implications (more mixed muns, more holdouts, more displacement). |
| **Canon-compliance-reviewer** | Conflict with Rulebook “demographic majority insufficient”? | That sentence applies to **overriding municipal authority** in the current (political) init. Ethnic init is a **different init mode**, not an override rule; canon can describe it as a scenario parameter. |
| **Product Manager** | Phasing? | Design decision first (Game Designer). Then: schema + init implementation (Tech Architect / Gameplay). Then: one scenario + balance pass (Scenario Creator / Formation-expert). |

---

## 5. Recommended priority and next steps

**Recommendation:** Treat ethnic-based init as a **scenario-level option** alongside existing political init, not an immediate replacement of the canon definition of political control.

**Proposed next steps:**

1. **Game Designer:** Decide whether ethnic init is (a) an alternate scenario type only, or (b) a new default; and how it is named and described in canon (e.g. “Ethnic 1991 initial control” as a scenario parameter).
2. **Technical Architect / Gameplay Programmer:** Define schema and entry point (`init_control: "ethnic_1991"` or `init_control_source: "ethnicity"`); implement init from ethnicity data or pre-generated settlement-level file.
3. **Formation-expert:** Review holdout cleanup and isolation surrender (and brigade limits) for balance when many rear holdouts exist from Turn 0.
4. **Scenario-creator-runner-tester:** Specify one “ethnic 1991” scenario (e.g. April 1992 with ethnic init); document as counterfactual; list implications.
5. **Canon:** If adopted as an option, add short note: “Initial political control may be set from 1991 census majority (per-scenario); this does not change the definition of political control for dynamics after Turn 0.”

**Handoff:** Orchestrator → **Product Manager** for phased plan (design decision → schema + init → scenario + balance). **Game Designer** owns the canon/design decision; **Technical Architect** owns init path and schema.

---

## 6. References

- Canon: Rulebook v0.5 §4.2, Game Bible v0.5 §5.1, Phase I §4.3–§4.4
- Init: `src/state/political_control_init.ts`, `src/state/initialize_new_game_state.ts`, `src/scenario/scenario_runner.ts`
- Settlement control / holdouts: `src/sim/phase_i/settlement_control.ts`, `src/sim/phase_i/control_flip.ts`
- Displacement: `src/sim/phase_i/displacement_hooks.ts`, Phase I §4.4
- Scenario settlement-level: `docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md`
- Ethnicity data: `settlement_ethnicity_data.json`, tactical map “Ethnic majority” view (`src/ui/map/`)
