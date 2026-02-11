# Scenario: September 1992 — Siege and Enclaves

**Author:** Scenario Creator, Runner and Tester (conceptual)  
**Date:** 2026-02-08  
**Status:** Design and data specification; implementation handoff to harness / data author.

---

## 1. Scenario definition (conceptual)

| Field | Value |
|-------|--------|
| **scenario_id** | `sep1992` (or `sep1992_siege_enclaves`) |
| **Start date** | September 1992 (mid-war; after Posavina corridor secured, before Jajce fall) |
| **init_control** | **Settlement-level** path (see §2). Not mun1990-only — one municipality can have mixed control. |
| **init_formations** | Key `sep1992` → `data/scenarios/initial_formations/initial_formations_sep1992.json` (see §4) |
| **start_phase** | `phase_i` (war already ongoing; no Phase 0) |
| **weeks** | e.g. 26 or 52 (run length) |
| **use_harness_bots** | true (optional) |
| **formation_spawn_directive** | Omit or set as desired for later spawn |

**Rationale for September 1992:**  
Sits between April 1992 (war outbreak) and December 1992 (VRS max extent). By Sept 1992: Posavina corridor secured (Brčko, Derventa, Odžak taken July 1992); Sarajevo under full siege; Srebrenica/Goražde/Žepa enclaves forming; Bihać isolated; **Jajce still ARBiH/HVO** (falls 29 Oct 1992). Sapna–Teočak remains critical RBiH stronghold. Settlement-level control is required to represent Sarajevo (city RBiH, ring RS), Srebrenica enclave (RBiH within srebrenica mun), and Sapna (RBiH part of zvornik mun).

---

## 2. Control: settlement-level init (required)

**Requirement:** Control must be **per settlement**, not per municipality, so that:

- **Sarajevo:** City and government-held settlements → RBiH; surrounding hills and ring → RS (siege).
- **Srebrenica:** Enclave settlements → RBiH; rest of municipality can be RS or contested.
- **Sapna (part of Zvornik mun):** Settlements in Sapna area → RBiH; rest of zvornik → RS (see SCENARIO_GAME_MAPPING: Sapna is post-1995; in 1990 part of zvornik).
- **Other mixed muns:** Where front lines split a municipality, assign controller per settlement.

**Engine capability:**  
When `init_control` is a **path** to a file that contains a **`settlements`** array (and is not mun1990-only), the loader uses the settlement-level init path. Schema per `SettlementInitialMasterRecord`: each record has `sid`, `political_controller` (RBiH | RS | HRHB | null), optional `mun1990_id`, `contested_control`, `control_status`, `stability_score`.

**Proposed asset:**  
- **Path:** `data/source/settlements_initial_sep1992.json` (or under a scenario-specific folder if preferred).  
- **Schema:** `{ "meta": { "schema_version": 1, "scenario_date": "1992-09" }, "settlements": [ { "sid": "...", "political_controller": "RBiH"|"RS"|"HRHB"|null, "mun1990_id": "...", ... }, ... ] }`.  
- **Coverage:** All settlements in the settlement graph must appear exactly once; use graph as source of `sid` list, then assign controller per sid from historical research (Balkan Battlegrounds, SCENARIOS_02-08, OOB area control).

**Validation anchors (examples):**

- Sarajevo: centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo — majority of settlements RBiH (city); outlying settlements in same muns may be RS where siege ring is.
- srebrenica: RBiH for enclave core settlements; RS or null for VRS-held parts.
- zvornik: RBiH for Sapna-area settlements (by geometry or list); RS for rest.
- brcko, bosanski_samac, derventa, odzak → RS (corridor secured by July 1992).
- jajce → RBiH or HRHB (still held; falls Oct 29).
- orasje → HRHB (small pocket).
- bijeljina, zvornik (non-Sapna), prijedor, banja_luka, etc. → RS where historically held by Sept 1992.
- tuzla, gradačac, zenica, travnik, bugojno, bihac, gorazde, maglaj → RBiH where historically held; Mostar area split HRHB west / RBiH east as per period.

**Handoff:** Data author or scenario-harness-engineer to produce `settlements_initial_sep1992.json` from settlement graph + historical sources. Scenario JSON then uses `init_control: "data/source/settlements_initial_sep1992.json"` (path).

---

## 3. Historical strongpoints to factor in

| Strongpoint | Sept 1992 state | Control intent |
|-------------|-----------------|----------------|
| **Sarajevo siege** | City surrounded; siege ring RS. | City settlements RBiH; ring and approaches RS. Use settlement-level so same mun can be split. |
| **Srebrenica enclave** | Enclave forming; refugees; under pressure. | srebrenica mun: enclave core RBiH; surrounding RS. |
| **Goražde** | Enclave; under siege. | gorazde → RBiH (enclave). |
| **Žepa** | Small enclave. | zepa (if in registry) or parent mun → RBiH for enclave. |
| **Bihać** | Isolated pocket; 5th Corps. | bihac → RBiH. |
| **Sapna–Teočak** | RBiH 2nd Corps stronghold; blocks VRS toward Tuzla. | Sapna-area settlements (zvornik mun) → RBiH; Teočak (ugljevik) → RBiH. |
| **Posavina corridor** | Secured by VRS (July 1992). | brcko, bosanski_samac, derventa, odzak → RS. |
| **Jajce** | Still ARBiH/HVO; falls Oct 29. | jajce → RBiH or HRHB (alliance). |
| **Orašje** | HVO pocket. | orasje → HRHB. |
| **Mostar** | Split: west bank HRHB, east bank RBiH. | Settlement-level so mostar mun can be split. |

---

## 4. Historically relevant OoB (September 1992)

**Source:** ARBIH_ORDER_OF_BATTLE_MASTER.md, VRS_ORDER_OF_BATTLE_MASTER.md, HVO_ORDER_OF_BATTLE_MASTER.md, SCENARIOS_02-08 (Dec 1992 OOB used as reference; Sept 1992 slightly lighter, same structure).

**Proposed initial formations (conceptual list for `initial_formations_sep1992.json`):**

**RBiH (ARBiH):**  
- 1st Corps (Sarajevo), 2nd Corps (Tuzla), 3rd Corps (Zenica), 5th Corps (Bihać).  
- 4th/6th/7th Corps forming or not yet present — optional 1–2 for Travnik/Mostar/Konjic if desired.  
- Suggested ids: `arbih_1st_corps`, `arbih_2nd_corps`, `arbih_3rd_corps`, `arbih_5th_corps` (plus optional 4th/6th/7th).

**RS (VRS):**  
- 1st Krajina Corps, 2nd Krajina Corps, East Bosnian Corps, Drina Corps, Sarajevo-Romanija Corps, Herzegovina Corps.  
- Suggested ids: `vrs_1st_krajina_corps`, `vrs_2nd_krajina_corps`, `vrs_east_bosnian_corps`, `vrs_drina_corps`, `vrs_sarajevo_romanija_corps`, `vrs_herzegovina_corps`.

**HRHB (HVO):**  
- Southeast Herzegovina OZ, Central Bosnia OZ, Northwest Bosnia/Posavina (Orašje).  
- Suggested ids: `hvo_herzegovina`, `hvo_central_bosnia`, `hvo_northwest_bosnia` (or similar from OOB masters).

Schema: same as existing init formations — array of `{ id, faction, name, kind?: "brigade", ... }`. Author from OOB masters; names and ids aligned with `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`.

**Handoff:** Data author to add `data/scenarios/initial_formations/initial_formations_sep1992.json` and add key `sep1992` to SCENARIO_DATA_CONTRACT well-known keys.

---

## 5. Scenario JSON (conceptual)

```json
{
  "scenario_id": "sep1992",
  "weeks": 26,
  "init_control": "data/source/settlements_initial_sep1992.json",
  "init_formations": "sep1992",
  "use_harness_bots": true,
  "turns": []
}
```

- No `start_phase: "phase_0"` — start directly in Phase I (war already ongoing).  
- If the harness expects a key for init_control and resolution only supports mun1990 keys, then **init_control must accept a path** (per SCENARIO_DATA_CONTRACT: "path-like → resolve against baseDir"). Confirm loader resolves path; if not, hand off to scenario-harness-engineer to support path for settlement-level file.

---

## 6. Flags and proposals

**Flags:**

1. **Settlement-level control:** Current well-known init_control keys (apr1992, apr1995, …) point to **mun1990-only** files (one controller per municipality). To represent Sarajevo siege, Srebrenica enclave, and Sapna within Zvornik, a **settlement-level** file is required. The engine supports it when the file has a `settlements` array and is passed as a path; the scenario loader must accept a path (not only a key) for init_control.
2. **No Sept 1992 in well-known keys yet:** SCENARIO_DATA_CONTRACT lists apr1992, apr1995, dec1992, etc., but not sep1992. Adding sep1992 requires a new control asset (settlement-level) and a new initial_formations asset.
3. **Sapna/Teočak:** Sapna is post-1995; in 1990 it is part of zvornik. So “Sapna RBiH” means a subset of settlements in zvornik mun (by geography or curated list). Same for Teočak in ugljevik. The settlement-level file is the only way to represent this without changing mun boundaries.

**Proposals:**

1. **Create `data/source/settlements_initial_sep1992.json`** (schema above). Owner: data author or scenario-harness-engineer. Source: settlement graph (full sid list) + Balkan Battlegrounds / SCENARIOS_02-08 / OOB area control; assign political_controller per sid for Sept 1992, with validation anchors (§2).
2. **Create `data/scenarios/initial_formations/initial_formations_sep1992.json`** with the OoB in §4. Owner: data author. Register `sep1992` in SCENARIO_DATA_CONTRACT.
3. **Confirm init_control path resolution:** Ensure scenario loader resolves init_control when it looks like a path (e.g. `data/source/...`) and that political_control_init uses settlement-level path when the file has `settlements` array. Owner: scenario-harness-engineer.
4. **Add scenario `data/scenarios/sep1992.json`** once assets exist, using the structure in §5. Owner: scenario creator or harness engineer.
5. **Run and assess:** After first run, compare control flips, formation deltas, and army strengths to Sept–Dec 1992 history (e.g. Jajce fall Oct 29, enclave stability); flag any ahistorical outcomes and propose conceptual adjustments (e.g. supply, exhaustion, or scenario date).

---

## 7. References

- `docs/knowledge/SCENARIO_GAME_MAPPING.md` — Faction IDs, mun1990_id, Sapna/Teočak note.
- `docs/knowledge/SCENARIO_DATA_CONTRACT.md` — init_control (key vs path), init_formations.
- `docs/knowledge/SCENARIOS_02-08_CONSOLIDATED.md` — Dec 1992 control and OOB; interpolate to Sept 1992.
- `docs/knowledge/SCENARIOS_EXECUTIVE_SUMMARY.md` — Scenario 1 & 2 narrative and validation.
- `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md` — Formation names and structure.
- `src/state/political_control_init.ts` — SettlementInitialMasterRecord, loadSettlementsInitialMaster, isMun1990OnlyControlFile.
- Balkan Battlegrounds Vol I & II — Authority for control and OOB (PDFs and KB pipeline under `docs/knowledge/`).
