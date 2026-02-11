# Militia and Brigade Formation System — Design Note

**Status:** Authoritative for implementation. Aligns with plan `militia_and_brigade_formation_system_e8487394.plan.md`.

---

## 1. Pool semantics and key structure

- **Source of truth:** `militia_pools` is **authoritative** and updated each turn by a dedicated **pool population step** that consumes settlement-level militia (derived or explicit), Phase I militia strength, and displacement.
- **Key:** Pools are keyed by **(mun_id, faction)**. Storage: composite key `"${mun_id}:${faction}"` so that `militia_pools` remains `Record<string, MilitiaPoolState>`. Each pool entry has `mun_id`, `faction` (required), `available`, `committed`, `exhausted`, `updated_turn`, and optional `tags`, `fatigue`.
- **Population:** Initial + per-turn. At Phase I entry (or war_start_turn), pools are seeded from Phase 0 organizational penetration when Phase 0 exists; otherwise from first-turn aggregation. Each turn after militia_emergence, the pool population step (1) derives or reads settlement-level militia per (settlement_id, faction), (2) aggregates to (mun_id, faction), (3) adds displaced contribution (see §6), (4) applies RBiH 10% rule when applicable. Existing `committed` and `exhausted` are preserved; `available` is only increased or scaled from strength/displaced, not decreased by this step (spawn step decreases it).
- **Relation to phase_i_militia_strength:** Settlement-level militia is derived from `phase_i_militia_strength` (per mun, per faction), distributed to settlements within the mun (e.g. by population share), then re-aggregated to (mun, faction) for the pool. So phase_i_militia_strength feeds pool population; no duplicate semantics.

---

## 2. Settlement → municipality flow

- **Settlement as source:** Militia manpower is derived from settlement population (census or scenario) and political control/demographics. (settlement_id, faction) → militia_strength.
- **Aggregation:** For each (mun_id, faction), `pool_available` = sum over settlements in that mun of settlement-level militia for that faction. Settlements within a mun are processed in **stable order** (e.g. settlement id sorted).
- **Two militias per settlement (pre-brigade):** Before RBiH has at least one brigade, a single settlement can contribute to two factions’ militia (mixed/contested). So (mun_id, faction) pools can exist for both RBiH and VRS (or HVO) in the same mun.

---

## 3. RBiH 10% from other nations (once brigades exist)

- **When:** Global state has at least one RBiH brigade (any formation with faction === 'RBiH' and kind === 'brigade').
- **Rule:** RBiH municipal pools may receive up to **10%** of eligible manpower from **non-Bosniak** (other-nation) settlements that RBiH controls. The rest (90%+) comes from Bosniak-aligned settlements.
- **Formula:** Deterministic. Sum eligible population from non-Bosniak settlements under RBiH control (using political_controllers), take 10%, add to RBiH pools (distribution by mun by stable ordering). No randomness.

---

## 4. Phase 0 link and agency

- **Phase 0 (pre-war):** Organizational penetration and pre-war capital allocation (Phase_0_Specification_v0_5_0.md §4.1–§4.2; police, TO, party, paramilitary) are the **player agency** that shape militia potential—e.g. capital allocation and organizational penetration outcomes feed “militia emergence friction”, “militia nucleus”, and “recruitment efficiency”. At Phase I entry (war_start_turn), militia pool initial state or first-turn growth **should be influenced by Phase 0 outputs** (stability, organizational penetration) when Phase 0 is implemented. Until then, pool population uses Phase I militia strength only.
- **Peace phase:** “Peace phase” here means **pre-war (Phase 0)**. Any future post-war demobilization is out of scope for this system and can be a separate extension.
- **Agency (FORAWWV H2.4):** Formation creation requires **explicit** player orders or harness directives. Formation spawn runs only when state or scenario contains a formation spawn directive (e.g. `state.formation_spawn_directive` or per-turn scenario action). No automatic spawn without directive.

---

## 5. Large-settlement resistance (control flip)

- **Definition of “large”:** Municipalities in the canonical list **LARGE_SETTLEMENT_MUN_IDS** (Sarajevo core: centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo; optionally extend with other major city muns). No population threshold in v1; list-only for determinism and clarity.
- **Rule:** When evaluating Phase I control flip, a municipality that is in LARGE_SETTLEMENT_MUN_IDS is **ineligible to flip** when the defender has **no formation**: defensive militia === 0 and (optionally) no brigade assigned to that mun. So the attacker (e.g. VRS) cannot take that mun in one turn when there is no defender—resistance is assumed.
- **Implementation choice:** Exclude such muns from flip candidates (do not add to candidates when large and defensiveMilitia === 0). Deterministic; no new persisted state.

---

## 6. Displaced civilians: reinforcement and formation

- **Reinforcement:** A fraction of displaced population in a municipality contributes to militia pools in that mun. Formula: `displaced_contribution = min(displaced * REINFORCEMENT_RATE, DISPLACED_CONTRIBUTION_CAP)`. REINFORCEMENT_RATE and cap are constants (e.g. 0.05 and 2000). Stable ordering by mun_id.
- **Per-faction displaced (ethnicity-traced):** When 1991 census is available at displacement time, routed displaced are **split by source municipality’s 1991 ethnic composition** (Bosniak→RBiH, Serb→RS, Croat→HRHB; other→RBiH). Destination mun state stores `displaced_in_by_faction` and pool population adds each faction’s share to that faction’s pool in that mun. So e.g. Bosniaks displaced from Prijedor to Travnik add to the **RBiH** pool in Travnik, not only to the controlling faction. When `displaced_in_by_faction` is absent (no census or legacy save), reinforcement falls back to attributing all `displaced_in` to the **controlling faction’s** pool.
- **Form new formation from displaced:** When (a) displaced_in in a mun exceeds a **threshold** (e.g. DISPLACED_FORMATION_THRESHOLD), and (b) the controlling faction has no brigade in that mun, and (c) a **directive** allows “displaced-origin” formation (FORAWWV H2.4), a new formation may be created from displaced. Naming: origin-based if displaced_origin is tracked (e.g. “17th Krajina Brigade” in Travnik); otherwise destination mun + ordinal. **Gating:** Explicit directive or scenario condition; no automatic formation-from-displaced without directive.
- **Killed and fled-abroad (ethnicity-based):** When 1991 census is available, not all displaced reach faction-held territory. A **killed** fraction (same for all ethnicities) and a **fled outside BiH** fraction are applied: Serbs and Croats have higher flee-abroad rates (Serbia/Croatia to flee to); Bosniaks have none. Remaining displaced are routed and attributed per faction as above. Constants: `DISPLACEMENT_KILLED_FRACTION`, `FLEE_ABROAD_FRACTION_RS`, `FLEE_ABROAD_FRACTION_HRHB`, `FLEE_ABROAD_FRACTION_RBIH` (0). Without census, a flat `LOST_POPULATION_FRACTION` continues to apply.

---

## 7. Formation-from-displaced conditions (summary)

- Formation-from-displaced is **gated by directive** (player/harness) to satisfy FORAWWV H2.4.
- When directive allows: threshold (displaced_in >= DISPLACED_FORMATION_THRESHOLD), faction has no brigade in that mun, and pool has enough available (or displaced contribution) to form one formation. Deterministic ordering when multiple muns qualify.

---

## 8. Brigade-per-municipality and militia vs formation

- **Spawn threshold:** A brigade **spawns** when the recruitment pool for (mun, faction) reaches **800** (MIN_BRIGADE_SPAWN). One formation is created at 800 personnel. Research (militia-system.js): canFormBrigade = totalSize ≥ 800 and not fragmented.
- **Brigade growth:** An existing brigade can **increase in size** from the same pool up to **MAX_BRIGADE_PERSONNEL** (1,000; tuned for historical personnel band ~1k/brigade). Each turn, before spawning new brigades, existing brigades in that (mun, faction) are reinforced from the pool until they reach that cap or the pool is exhausted.
- **Second (and further) brigade:** When the pool still has ≥800 after existing brigades in that mun are filled to MAX_BRIGADE_PERSONNEL, a **second** brigade is formed (subject to max_brigades_per_mun). So: reinforce first, then spawn; repeat until pool &lt; 800 or no headroom.
- **One brigade per municipality (default):** Max brigades per (mun, faction) is 1 by default, 2 for large/mixed muns (derived data). Spawn only when brigade count &lt; max and pool ≥ 800. **Authority:** In a **fragmented** municipality no new brigade can form from that mun’s pool (see §8.1).
- **Militia is not a formation kind:** Militia is the **pool** (manpower source). Formations created from militia pools are **brigades** only. The formation_spawn_directive may still mention `kind: 'militia' | 'brigade' | 'both'` for backward compatibility; when spawning from pools, the pipeline and spawn logic treat all as brigade. No "militia formation" is created from the pool step.

### 8.1 Authority state

- **Values:** consolidated | contested | fragmented (per docs/50_research militia-system.js and MILITIA_BRIGADE_SYSTEM_RESEARCH_AND_REWORK_PLAN.md). Stored in `state.municipalities[munId].control`; when absent treat as consolidated.
- **Effect on brigade formation:** **Fragmented** → cannot form a brigade from that mun’s pool (canFormBrigade = false in research). Spawn step skips (mun, faction) when mun is fragmented.
- **Effect on pool strength:** Contested → pool strength scaled by 0.85; fragmented → 0.70 (research: baseStrength/offensive modifiers). Applied in pool population step before writing pool.available.

### 8.1.1 Authority numeric map (implementation reference)

- **Function:** `deriveMunicipalityAuthorityMap(state)` in `src/state/formation_lifecycle.ts`.
- **Mapping:** consolidated = 1.0, contested = 0.5, fragmented = 0.2.
- **Use:** `update-formation-lifecycle` passes this map into brigade activation gating; activation requires municipality authority >= `BRIGADE_AUTHORITY_THRESHOLD` (0.4), so fragmented municipalities fail authority gating by design.
- **Determinism:** Municipality IDs are traversed in sorted order; no randomness.

### 8.2 Early-war minority militia decay (MVP)

- **When:** First 3 turns of Phase I (meta.turn in [war_start_turn, war_start_turn + 2]).
- **Condition:** (mun, faction) pool where: mun is **non-urban** (e.g. not in LARGE_SETTLEMENT_MUN_IDS for v1), mun **controller** (majority of settlements) is an **opponent** of faction, and mun authority is **consolidated** (or absent).
- **Effect:** Reduce pool.available by a deterministic **20–40%** (formula from research: decay = clamp(0.20 + (0.25 − ethnicPct), 0.20, 0.40) using faction’s share in mun from 1991 census). Then pool is used by reinforcement and spawn as usual.

### 8.3 RBiH 10% rule (implementation reference)

- See §3. Implemented in pool_population when at least one RBiH brigade exists: add up to 10% of non-Bosniak eligible population from RBiH-controlled muns to RBiH pools (deterministic, stable mun order).

---

## 9. Constants (reference)

| Constant | Value / source | Purpose |
|----------|----------------|---------|
| LARGE_SETTLEMENT_MUN_IDS | [centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo] | Control flip: ineligible to flip when no defender |
| REINFORCEMENT_RATE | 0.05 | displaced_in → pool contribution factor |
| DISPLACED_CONTRIBUTION_CAP | 2000 | Max added to pool per mun per turn from displaced |
| DISPLACED_FORMATION_THRESHOLD | (design: e.g. 5000) | Min displaced_in to allow formation-from-displaced when directive present |
| max_brigades_per_mun | 1 default; 2 from derived data (1991 census: large/mixed) | **Total** brigade cap per (mun, faction); spawn skips when at cap |
| MIN_BRIGADE_SPAWN | 800 | Pool must reach this to spawn a new brigade; new brigade starts at 800 personnel (research: canFormBrigade ≥800). |
| MAX_BRIGADE_PERSONNEL | 2500 | Brigade can grow from pool up to this size; only then do we form a second brigade (if pool still has ≥800). |
| nominal brigade size (batchSize) | 800 | Initial size when spawned; reinforcement step fills to 2500 from pool before next spawn. |
| max_brigades_per_mun | 1 default; 2 from derived data | Total brigade count cap per (mun, faction). |

---

## 10. Historical OOB

- **Purpose:** Premade formation slots from Balkan Battlegrounds OOB (brigades, corps), filled from militia pools each turn. **Ahistorical path:** If a faction gains control/pool in a mun where it has no OOB slot (e.g. RBiH in Prijedor after Phase 0), the existing **emergent spawn** creates a new brigade there. OOB slots are created **only when** the faction has presence in the home mun at **Phase I entry** (no ghost formations).
- **Data:** **Primary source for historical brigades:** `data/source/oob_brigades.json`. **Primary source for corps:** `data/source/oob_corps.json`. Brigades: `id`, `faction`, `name`, `home_mun` (mun1990_id), optional `corps`, `kind`. Corps: `id`, `faction`, `name`, `hq_mun`. Order: deterministic (by faction then name). Validation: faction in RBiH|RS|HRHB; home_mun/hq_mun in `data/source/municipalities_1990_registry_110.json`.
- **Phase I entry:** When scenario has `init_formations_oob: true` (or string key), **once** at Phase I entry the harness calls OOB slot creation: for each OOB corps/brigade, if the faction has presence in the HQ/home mun (and mun is not fragmented), create a `FormationState` with `personnel: 0`, `tags: ['mun:<id>', ...]`, `hq_sid` from `data/derived/municipality_hq_settlement.json`. Idempotent: skip if formation id already exists. Reinforce step then fills brigades from pools; emergent spawn adds new brigades only where (mun, faction) has no OOB slot and pool ≥ 800.
- **HQ placement:** Every brigade/corps has a clickable HQ on the map. HQ settlement = municipality capital (name match, normalized) or largest settlement in mun (1991 census); one lookup table `data/derived/municipality_hq_settlement.json` (built by `tools/formation/build_municipality_hq_settlement.ts`). Emergent spawn sets `hq_sid` on new brigades via the same lookup.
- **Optional tool:** `tools/formation/derive_oob_brigades.ts` validates and optionally normalizes OOB JSON; can be extended to derive from `docs/knowledge/*_ORDER_OF_BATTLE_MASTER.md` or BB extract.

---

## 11. AoR assignment (how AoRs are assigned)

**Canon:** Engine_Invariants §B, Systems_Manual §8. AoR is prohibited in Phase I; in Phase II front-active settlements must have exactly one brigade AoR; rear settlements may have none. AoR does not confer control; pressure generation is valid only from AoR-assigned settlements.

**Initial assignment (Phase II entry):** When the game enters Phase II (all faction `areasOfResponsibility` empty), the pipeline step `phase-ii-aor-init` (1) populates each faction’s AoR from current political control (settlements where `political_controllers[sid]` equals that faction), and (2) adds every formation’s home mun settlements (tag `mun:X`) to that faction’s AoR so fronts are populated. Implementation: `populateFactionAoRFromControl` plus `ensureFormationHomeMunsInFactionAoR` in scenario_runner / turn transition.

**When control flips (Phase II):** When a control flip is applied (e.g. breach-based `applyControlFlipProposals`), the flipped settlements are removed from all factions’ AoR and added to the new controller’s `areasOfResponsibility`. Political control and AoR are updated together so that AoR always matches control.

**Player reassignment:** The current implementation does not expose player-directed AoR reassignment. "User can change AoR later" is a design placeholder; any such change must preserve exclusivity, faction-match, and front-active requirement. If implemented, it would be a separate step or UI that updates `faction.areasOfResponsibility` (and optionally `assigned_brigade` per settlement if that schema is added).

**State representation:** Canon mentions `assigned_brigade` per settlement (Systems_Manual Appendix A). In code, the source of truth is `faction.areasOfResponsibility` (array of settlement IDs). An `assigned_brigade` field can be derived for display (e.g. from which formation’s home mun or commitment covers that settlement) or added to schema later; pressure and validation use the AoR list.
