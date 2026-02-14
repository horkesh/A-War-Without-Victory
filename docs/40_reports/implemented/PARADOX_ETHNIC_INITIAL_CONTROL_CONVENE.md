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
- Yugoslav / undeclared majority → neutral or scenario-assigned (see §3.8)

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
- **Cascade effect:** Displaced populations fleeing holdout clearance swell populations in remaining same-ethnicity settlements. If those settlements later flip, the displacement numbers compound — mirroring the historical snowball of refugee waves. Consider tracking **displaced_population_in_settlement** so that secondary flips displace both original and refugee populations.
- **Atrocity reporting / international pressure:** High-volume displacement from ethnic-init holdout clearance could feed an international pressure mechanic (if one exists or is planned). Rapid clearing of many holdouts in a short window should carry political cost — sanctions, arms embargo tightening, or diplomatic penalties — giving the player a reason to pace operations rather than blitz every holdout on Turn 1.

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
- **Holdout resistance scaling:** Not all holdouts should be equal. Resistance should scale with (a) settlement population (larger settlements resist longer), (b) proximity to friendly frontline territory (hope of relief), and (c) whether armed paramilitaries / TO detachments are present. A village of 200 capitulates differently than a town of 8,000 with an organized militia.
- **Force diversion cost:** Brigades tied up clearing rear holdouts are **not available at the front**. This is the central strategic tension: push forward and leave hostile pockets behind (risking supply interdiction, partisan activity), or methodically clear the rear and cede initiative. The ethnic-init mode amplifies this dilemma dramatically versus the political-init baseline.

### 3.6 Historical vs counterfactual

- April 1992 historically had **institutional** control (e.g. SDA-run vs SDS-run muns), not a perfect ethnic map.
- **Ethnic 1991 start** is therefore **counterfactual** or **simplified** (“what if control had been assigned by 1991 census”). Scenario name and docs should state this (e.g. “April 1992 (ethnic 1991 start)”).

### 3.7 Displacement hooks

- **Current:** `displacement_hooks.ts` uses a **stub** for Hostile_Population_Share (e.g. 0.5). For ethnic init to drive depopulation correctly, Hostile_Population_Share should be computed from **census ethnicity** (share of losing-faction-aligned population in the mun or settlement). Small wiring task once census is available at flip/holdout-clearance time.
- **Displacement destination routing:** Currently displacement fires but destination logic may be underspecified. With ethnic init generating many more displacement events, the routing question becomes critical: do displaced populations go to (a) nearest same-ethnicity settlement under friendly control, (b) nearest major urban centre, (c) abroad? Routing choice affects downstream population distributions and can create overcrowded refugee centres that themselves become strategically important (or vulnerable).

### 3.8 Yugoslav / undeclared and minority populations

- The 1991 census includes significant **Yugoslav** and **undeclared** categories, as well as smaller minorities (Roma, etc.). These settlements don't map cleanly to any faction.
- **Options for unaligned-majority settlements:**
  - **Neutral (contested):** No faction controls; first to move in claims it. Creates a "land grab" dynamic on Turn 0/1 that rewards initiative and proximity.
  - **Scenario-assigned:** Designer manually assigns based on historical outcome or geographic context.
  - **Plurality rule with threshold:** If no ethnicity exceeds e.g. 45%, settlement starts neutral; otherwise plurality wins. Threshold is a scenario parameter.
- **Design note:** Historically, Yugoslav-identifying populations were often caught between all sides. Neutral settlements that must be "claimed" (not cleared) could use a lighter mechanic than holdout clearance — e.g. political persuasion, militia recruitment, or simple occupation — reflecting that these populations weren't necessarily hostile to any faction but weren't committed to one either.

### 3.9 Hybrid init mode — a potential third path

- Pure political init and pure ethnic init are two ends of a spectrum. A **hybrid** mode may better model early April 1992:
  - **Municipal authority** sets the baseline controller (political init).
  - **Settlement-level ethnic overrides** apply where a settlement's ethnic majority differs from the municipal controller **and** exceeds a threshold (e.g. ≥ 70% opposing ethnicity). These become **initial holdouts** or **contested** at Turn 0.
  - This captures the historical pattern: SDS-controlled municipalities still had Bosniak-majority villages that resisted (e.g. Kozarac in Prijedor), and SDA municipalities had Serb-majority villages that declared loyalty to RS.
- **Advantage:** More historically grounded than pure ethnic init; fewer holdouts than ethnic init (only the sharp mismatches), making early-war pacing more manageable; preserves the canon principle that institutional authority matters while acknowledging demographic reality.
- **Schema:** e.g. `init_control: "hybrid_1992"` with `ethnic_override_threshold: 0.70` as a scenario parameter.

---

## 4. Per-role synthesis

| Role | Question | Synthesized answer |
|------|----------|--------------------|
| **Game Designer** | Alternate scenario type or new default? Canon wording? | Decide: (a) scenario option only, or (b) new default. Add canon/context note that “initial control may be set from 1991 census majority (per-scenario)” if adopted as option. Name clearly (e.g. “Ethnic 1991”). |
| **Technical Architect** | Schema and entry point? | Define e.g. `init_control: "ethnic_1991"` or `init_control_source: "ethnicity"`. Init either computed at load from ethnicity data or from pre-generated settlement-level file. Settlement-level init path already exists (Sept 1992). |
| **Gameplay Programmer** | Init implementation? | New code path: from `settlement_ethnicity_data` (and/or `majority_ethnicity`) assign political_controller per sid (majority → faction; mixed/other → rule). Deterministic; sorted iteration. |
| **Formation-expert** | Holdout balance when many from Turn 0? | Review cleanup limits (2 per brigade, resistance, isolation surrender) and brigade count vs holdout count so early war pacing is acceptable. |
| **Scenario-creator-runner-tester** | One ethnic-1991 scenario? | Specify one scenario (e.g. April 1992 with ethnic init); document as counterfactual; list implications (more mixed muns, more holdouts, more displacement). |
| **Canon-compliance-reviewer** | Conflict with Rulebook "demographic majority insufficient"? | That sentence applies to **overriding municipal authority** in the current (political) init. Ethnic init is a **different init mode**, not an override rule; canon can describe it as a scenario parameter. Hybrid init (§3.9) may be the cleanest canon fit. |
| **Product Manager** | Phasing? | Design decision first (Game Designer): pure ethnic, hybrid, or both as scenario options. Then: schema + init implementation (Tech Architect / Gameplay). Then: one scenario + balance pass (Scenario Creator / Formation-expert). Consider international pressure hooks (§3.2) in phasing. |
| **Displacement / population modeller** | Refugee cascades and routing? | Define displacement destination routing (§3.7): nearest friendly, urban centre, or abroad. Track displaced-in-settlement counts so secondary flips cascade correctly. Ethnic init dramatically increases displacement volume — routing must be robust. |

---

## 5. Recommended priority and next steps

**Recommendation:** Treat ethnic-based init as a **scenario-level option** alongside existing political init, not an immediate replacement of the canon definition of political control. Strongly consider **hybrid init** (§3.9) as the historically grounded middle path.

**Proposed next steps:**

1. **Game Designer:** Decide on init modes to support: (a) political only (current), (b) ethnic 1991 (counterfactual), (c) hybrid 1992 (§3.9), or all three as scenario parameters. Define naming and canon language.
2. **Technical Architect / Gameplay Programmer:** Define schema supporting multiple init modes (e.g. `init_control: "apr1992_political" | "ethnic_1991" | "hybrid_1992"`); implement init from ethnicity data or pre-generated settlement-level file. For hybrid mode, implement ethnic override threshold as a scenario parameter.
3. **Formation-expert:** Review holdout cleanup and isolation surrender (and brigade limits) for balance when many rear holdouts exist from Turn 0. Implement **holdout resistance scaling** by population size and proximity to friendly territory (§3.5). Evaluate the force-diversion tradeoff and whether cleanup rate limits (2/brigade/turn) create acceptable pacing across all init modes.
4. **Displacement / population modeller:** Wire Hostile_Population_Share from census data (replacing stub). Define displacement **destination routing** (§3.7). Implement **displaced-in-settlement tracking** so refugee cascades compound on secondary flips (§3.2).
5. **Scenario-creator-runner-tester:** Specify at least two scenarios: one "ethnic 1991" (counterfactual) and one "hybrid 1992" (semi-historical); document assumptions; compare holdout counts, displacement volumes, and early-war pacing against political-init baseline.
6. **Canon:** If adopted as options, add short note: "Initial political control may be set from 1991 census majority, hybrid political-ethnic, or institutional authority (per-scenario); this does not change the definition of political control for dynamics after Turn 0."
7. **International pressure (future):** If an international pressure / diplomacy system exists or is planned, wire displacement volume from holdout clearance as an input. Rapid mass displacement should carry escalating political cost (§3.2).

**Handoff:** Orchestrator → **Product Manager** for phased plan (design decision → schema + init → scenario + balance). **Game Designer** owns the canon/design decision; **Technical Architect** owns init path and schema.

---

## 6. References

- Canon: Rulebook v0.5 §4.2, Game Bible v0.5 §5.1, Phase I §4.3–§4.4
- Init: `src/state/political_control_init.ts`, `src/state/initialize_new_game_state.ts`, `src/scenario/scenario_runner.ts`
- Settlement control / holdouts: `src/sim/phase_i/settlement_control.ts`, `src/sim/phase_i/control_flip.ts`
- Displacement: `src/sim/phase_i/displacement_hooks.ts`, Phase I §4.4
- Scenario settlement-level: `docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md`
- Ethnicity data: `settlement_ethnicity_data.json`, tactical map “Ethnic majority” view (`src/ui/map/`)
