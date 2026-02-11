# Militia/Brigade System — Research Review and Rework Plan

**Purpose:** Study docs/50_research (and the working militia pool JS/demo), compare to current game design and code, resolve contradictions (newest wins), and produce a rework plan for the militia/brigade system.

**Audience:** Formation-expert, gameplay-programmer, technical-architect. Product/canon owner for any decisions marked “needs approval.”

---

## 1. Research sources reviewed

| Source | Type | Relevance to militia/brigade |
|--------|------|------------------------------|
| **militia-system.js** | Patch (diff) | Core: settlement militias → municipal TOs, authority states, turn effects, brigade eligibility. |
| **militia-demo.html** | HTML + inline JS | Demo: SettlementSystem (census CSV), MilitiaSystem.initialize(), municipal TO list, historical validation (Kozarac, Sapna, Teočak, Vozuča). |
| **awwv_gap_analysis_vs_best_practices.md** | MD | UI/gap; faction overview placeholders (personnel, supply); no direct militia rule changes. |
| **war_sims_best_practices.md** | MD | UI/UX patterns; no militia mechanics. |
| **gui_improvements_backlog.md** | MD | Warroom backlog; no militia/formation logic. |
| **PDFs in 50_research** | PDF | Not machine-readable here. Titles suggest: control/stability/flip, declaration, corps/supply, geographic ref, historical events, master docs, UI design. **Action:** Treat as secondary; if a PDF is “newest” or “corrected” (e.g. Control_Formula_Demonstration_v2, CORRECTED_CORPS_SUPPLY_RESEARCH), a human should extract militia/brigade/authority/TO-relevant bullets and add to this doc or to MILITIA_BRIGADE_FORMATION_DESIGN. |

---

## 2. Working militia pool (militia-system.js + militia-demo.html) — extracted model and rules

**Note:** militia-system.js in repo is a **patch (Begin Patch / End Patch)**; the following is inferred from the patch and the demo HTML.

### 2.1 Data model

- **Settlement militias:** Per settlement, **per faction/ethnicity** (multiple militias per settlement possible). Fields: size, militaryAgeMales, mobilizationRate, controller, ethnicity, ethnicPopulation, ethnicPct, quality (exceptional/organized/poor/chaotic), qualityMultiplier, training, cohesion, morale, equipment, armedPct, effectiveness, baseStrength, defensiveStrength, offensiveStrength, settlementId, municipalityId, authorityState.
- **Municipal TOs:** One per (municipalityId, faction). Aggregates constituent settlement militias. Fields: totalSize, totalBaseStrength, defensiveStrength, offensiveStrength, overallQuality, qualityScore, qualityBreakdown, settlementCount, canFormBrigade (totalSize >= 800 and not fragmented), brigadeFormed, authorityState.

### 2.2 Flow

1. **Initialize:** calculateSettlementMilitias() → createMunicipalTOs() → setInitialEquipment() → **applyAuthorityStateModifiers()**.
2. **Settlement militia:** Military-age males ≈ 20% of ethnic group population; mobilization rate from organization; baseStrength = militiaSize × quality multiplier; equipment sets defensive/offensive strength.
3. **Municipal TO:** Sums settlement militias for (mun, faction); quality from average; **canFormBrigade** = (authorityState !== 'fragmented') && (totalSize >= 800).
4. **Authority states:** consolidated | contested | fragmented. From gameState.municipalities[munId].authorityState (stub in demo).
5. **Authority modifiers:**
   - Settlement: contested → baseStrength × 0.85; fragmented → baseStrength × 0.70.
   - TO: contested → offensiveStrength × 0.75; fragmented → offensiveStrength × 0.60 and **canFormBrigade = false**.
   - Quality: contested −0.10 quality score; fragmented −0.20.
6. **Per-turn (applyTurnEffects, turns 1–3):** Minority militia decay in **non-urban** settlements when municipality is **consolidated** and militia’s faction ≠ settlement controller. Decay 20–40% of size; morale −10. Then TOs recomputed from updated militias.
7. **Constraint:** Settlement militias are **not** maneuver units; only Municipal TOs/Brigades contribute to corridors/frontlines.

### 2.3 Historical validation (demo)

- Kozarac: ~450 militia, fall in ~3 days.
- Sapna, Teočak: survive as enclaves (defensive strength / survival chance).
- Vozuča: VRS pocket survival.

---

## 3. Current AWWV design and code (summary)

| Aspect | Current design (MILITIA_BRIGADE_FORMATION_DESIGN + code) |
|--------|----------------------------------------------------------|
| **Pool structure** | militia_pools keyed by (mun_id, faction); available, committed, exhausted. No settlement-level militia entities. |
| **Source of pool** | phase_i_militia_strength (from organizational_penetration) × POOL_SCALE_FACTOR; optionally weighted by 1991 census eligible pop (Bosniak/Serb/Croat) and FACTION_POOL_SCALE. |
| **Authority** | No consolidated/contested/fragmented in pool or spawn. Control flip uses LARGE_SETTLEMENT_MUN_IDS (no flip when no defender). |
| **Settlement → mun** | Design doc says “settlement as source” and “aggregate to (mun, faction)”; implementation aggregates from **phase_i_militia_strength** per mun (no per-settlement census in pipeline). Census used only as weight in pool_population. |
| **Brigade formation** | Spawn when formation_spawn_directive active, pool.available >= batchSize (1000), and brigade count < getMaxBrigadesPerMun(mun_id). No “canFormBrigade” from TO strength threshold (800). |
| **Turn effects** | No minority decay; no early-war suppression. Displaced contribution adds to pool. |
| **RBiH 10% rule** | Design: RBiH pools may get up to 10% from non-Bosniak settlements under RBiH control once RBiH has a brigade. Not implemented in pool_population. |

---

## 4. Current vs research/intent comparison

| Topic | Research / working JS | Current AWWV | Gap / conflict |
|-------|------------------------|--------------|----------------|
| **Settlement-level militia** | Yes: per settlement, per faction/ethnicity; size, quality, morale, equipment, strengths. | No: only mun-level phase_i_militia_strength and pool (mun, faction). | **Gap:** No explicit settlement militias; no per-settlement quality/morale/equipment. |
| **Municipal TO** | Explicit TO object per (mun, faction); aggregates settlement militias; totalStrength, canFormBrigade (≥800), quality. | Implicit: pool is the “TO” analogue (available = manpower); no TO object; no 800 threshold. | **Gap:** No TO entity; brigade eligibility is cap-based (max_brigades_per_mun) and pool size, not “totalStrength >= 800”. |
| **Authority state** | consolidated / contested / fragmented; modifies strength and canFormBrigade (fragmented → false). | Not used in militia/pool or spawn. | **Gap:** Authority not integrated into pool or formation eligibility. |
| **Minority decay** | Turns 1–3; minority in non-urban under opposing consolidated authority; 20–40% size decay. | Not implemented. | **Gap:** No early-war minority militia decay. |
| **Brigade threshold** | canFormBrigade = totalSize >= 800 (and not fragmented). | Spawn when available >= 1000 (batchSize) and under mun cap. | **Align:** 1000 is close to 800; difference is threshold vs batch size. |
| **Settlement militias not maneuver** | Explicit: only TOs/Brigades for corridors/frontlines. | Formations (brigades) are the maneuver units; pool is not. | **Align:** Conceptually same. |
| **Bottom-up flow** | Settlement militias → Municipal TOs → Brigades. | phase_i_militia_strength (mun) → pool → spawn brigades. | **Gap:** No settlement layer in code; no explicit TO layer. |

---

## 5. Contradictions and “newest wins”

- **Research vs current:** Research (and working JS) introduces settlement-level militias, TO layer, and authority/turn effects. Current code is mun-level pool only. **Resolution:** Treat research + JS as the **newer intent**. Prefer bringing design and code toward: (1) settlement-derived militia where data exists, (2) explicit or conceptual TO (pool as TO), (3) authority state affecting pool/eligibility when we have authority in state, (4) optional minority decay as a turn effect when we have control + demographics.
- **PDFs:** If any PDF contradicts the above (e.g. “no settlement militia”), use the **newest** dated or “v2”/“corrected” document and note the conflict in this section.

---

## 6. Rework plan (prioritized)

### 6.1 Design and canon (docs)

1. **Update MILITIA_BRIGADE_FORMATION_DESIGN.md**
   - Add a section “Settlement → TO → Brigade (target model)” reflecting: settlement-level militia (where census/control exist), aggregation to municipal TO (pool as TO), brigade formation eligibility (e.g. TO total >= 800 and not fragmented when authority is used).
   - Document authority state (consolidated/contested/fragmented) and effect on pool strength and brigade eligibility (fragmented → cannot form brigade).
   - Document optional “early-war minority militia decay” (turns 1–3, non-urban, minority under opposing consolidated control); gate on “when implemented” so canon does not require it for MVP.
   - Keep FORAWWV H2.4 (formation creation only with directive); keep pool key (mun_id, faction); keep RBiH 10% rule as design intent; add reference to docs/50_research (militia-system.js, militia-demo.html) as research/prototype.

2. **Phase I spec / Systems Manual**
   - If authority state is already in canon, add a line that “fragmented municipality” denies brigade formation from that mun’s pool. If not in canon, add to rework plan as “needs canon” and implement only after canon update.

### 6.2 Code (implementation order)

3. **Settlement-derived pool (optional first step)**
   - When census and settlement control exist: compute per-settlement militia potential (e.g. eligible pop × mobilization factor); aggregate to (mun, faction) for pool.available. This aligns with “settlement as source” without yet introducing full settlement militia entities. Reuse or extend current population weighting (eligible pop, normalizer, FACTION_POOL_SCALE).
   - **Determinism:** Stable sort of settlements and muns; no RNG.

4. **Authority state in pool and spawn**
   - If state.municipalities[munId].authorityState (or equivalent) exists: in pool step, scale pool.available down for contested/fragmented; in spawn step, skip spawn for (mun, faction) when mun is fragmented. If authority does not exist in state yet, add a stub (e.g. all consolidated) or leave as follow-up.
   - **Newest wins:** Research says fragmented → canFormBrigade = false; implement as “fragmented → do not spawn from that mun”.

5. **Brigade eligibility threshold (optional)**
   - Add a minimum pool threshold (e.g. 800) for “can form a brigade” in a mun, in addition to batchSize (1000). So: spawn only if available >= 1000 and (e.g.) available + committed >= 800 for that mun. Or keep current “available >= 1000” and document 800 in design as historical reference; **newest wins:** prefer aligning with 800 if it does not break existing scenarios (e.g. make threshold configurable or 800 for “first” brigade only).

6. **Minority militia decay (optional, post-MVP)**
   - Per-turn step (turns 1–3): for each pool or settlement-militia analogue where faction is minority in mun and mun is “consolidated” under opponent control, reduce available (or settlement militia size) by 20–40% (deterministic formula). Then refresh pool/TO. Requires: control per settlement or per mun, demographics, “urban” flag if we restrict to non-urban. Mark as **extension** unless canon explicitly requires it.

7. **RBiH 10% rule**
   - Implement in pool_population when design is stable: add up to 10% of non-Bosniak eligible population from RBiH-controlled settlements to RBiH pools (when at least one RBiH brigade exists). Deterministic; stable ordering.

### 6.3 Data and constants

8. **Authority state source**
   - If not in state: define where it comes from (e.g. derived from control_status, or from a new field in municipalities). Document in design and in REPO_MAP or DATA_CONTRACT.

9. **Working JS as reference**
   - Keep militia-system.js and militia-demo.html in docs/50_research as reference. Do not wire the demo into the main app unless product decides to; use it to validate numbers (Kozarac, Sapna, Teočak, Vozuča) against our pool/formation outputs when we have settlement-level or mun-level outputs.

---

## 7. Handoff to formation-expert and gameplay-programmer

### 7.1 Read first

1. **This document** (MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md).
2. **docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md** (current authority; will be updated per §6.1).
3. **docs/50_research/militia-system.js** (patch) and **militia-demo.html** (flow and validation cases).
4. **docs/10_canon/FORAWWV.md** (H2.4 formation agency) and **Phase_I_Specification** (militia/organization).
5. **Current code:** src/sim/phase_i/militia_emergence.ts, pool_population.ts, formation_spawn.ts; src/state/formation_constants.ts, militia_pool_key.ts.

### 7.2 Decisions fixed (newest wins)

- **Settlement → TO → Brigade** is the target conceptual model; pool is the TO analogue; brigade formation eligibility should respect authority (fragmented → no spawn) when authority exists.
- **Same nominal brigade size** (1000) for all factions; differentiation via population-weighted pool and FACTION_POOL_SCALE (ARBiH largest).
- **Formation creation only with directive** (FORAWWV H2.4) unchanged.
- **Settlement militias are not maneuver units**; only formations (brigades) for corridors/frontlines — already the case.

### 7.3 Needs design/canon approval

- Whether **authority state** (consolidated/contested/fragmented) is in scope for Phase I and where it lives in state (municipalities vs control_status).
- Whether **early-war minority militia decay** (turns 1–3) is required for MVP or post-MVP.
- Whether **RBiH 10% rule** is required for next release and the exact formula (design doc already describes it).
- Whether to adopt an **explicit 800 minimum** for “first brigade” in a mun (and how it interacts with batchSize 1000).

### 7.4 PDFs in 50_research

- **Action for human:** If Control_Formula_Demonstration_v2, CORRECTED_CORPS_SUPPLY_RESEARCH, Declaration_System_* or DYNAMIC_CORPS_SYSTEM mention militia/TO/brigade/authority, extract one-paragraph summaries and add under §4 or §5 above (or to MILITIA_BRIGADE_FORMATION_DESIGN) so that “newest” and “corrected” positions are captured.

---

## 8. Summary table

| Item | Research/JS | Current | Rework action |
|------|-------------|---------|---------------|
| Settlement militia | Yes, per settlement per faction | No | Design: “target model”; code: optional settlement-derived pool |
| Municipal TO | Explicit TO, canFormBrigade ≥800 | Pool only, cap-based | Design: pool = TO; optional 800 threshold in code |
| Authority state | Modifies strength and canFormBrigade | Not used | Add to design; implement when state has authority |
| Minority decay | Turns 1–3, non-urban, minority | No | Design as optional; implement post-MVP or when approved |
| Brigade size | Implicit 800+ for TO | 1000 batchSize, cap per mun | Keep 1000; document 800 as historical ref or add threshold |
| Formation directive | N/A in JS | Required (H2.4) | Keep |

---

*This document is the orchestrator deliverable for the militia/brigade rework. Update it when PDFs are summarized or when rework steps are completed.*
