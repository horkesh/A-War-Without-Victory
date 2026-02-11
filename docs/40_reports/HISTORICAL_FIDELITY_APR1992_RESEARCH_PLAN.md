# Historical fidelity Apr 1992 — Research-first plan

**Status:** Executed (2026-02-10). BB extractor, pattern report, model design, and formation-aware flip + OOB at start implemented; scenario runs show historicity and player agency. See HISTORICAL_FIDELITY_APR1992_SUCCESS_CRITERIA.md.  
**Traceability:** User: flip = political control; municipalities as research seeds; BB as ultimate source; holdouts, enclaves, pockets must be modeled; **JNA → VRS (12 May 1992) and early RS heavy-brigade advantage** must be considered; early-war model may need to change to suit.

---

## 1. Conceptual correction: Flip = political control

**Flip = political control, not necessarily territorial.**

- Example (Prijedor): RS took over the **building of the municipality governance** (political/administrative control). Then it still had to **bring formations to clean up** the municipality. That **also resulted in population exodus** of Bosniaks.
- Sequence: (1) **Political/administrative takeover** → (2) **Military/territorial consolidation** → (3) **Displacement/exodus**.
- Canon: Rulebook — “Political control is not the same as legitimate governance.” Systems Manual — political control is stored **per settlement**; municipality-level control is **derived** (e.g. majority). So the engine already supports settlement-level control.
- **User-mentioned municipalities are research seeds only.** All authoritative location lists and patterns come from Balkan Battlegrounds (and existing KB), not from user inputs.

---

## 2. Flipped muns can still contain holdouts, enclaves, and pockets

**Even when a municipality has “flipped” (political/administrative control changed), it may not be completely overrun.** Three patterns must be modeled:

### 2.1 Holdouts within a flipped municipality

- **Example:** **Sapna** (Zvornik municipality). Zvornik municipality came under RS control, but **Sapna held** because it was close to other major Bosniak settlements — the “Bosniak heartland.”
- **Implication:** Settlement-level control can remain with the original faction for some settlements even when the municipality is considered “flipped” at the governance level. Holding is influenced by **proximity/connectivity to friendly heartland** (and possibly supply, defensibility).
- **Model need:** Rules or factors that allow **settlements to hold** within a politically flipped mun: e.g. connectivity to contiguous friendly territory, heartland proximity, formation presence. No automatic “flip entire mun → flip every settlement.”

### 2.2 Enclaves (surrounded but surviving)

- **Examples:** **Srebrenica, Žepa, Goražde** — survived as **enclaves** even when surrounded.
- **Implication:** “Surrounded” must **not** automatically mean overrun. Enclave survival depends on integrity (supply, authority, population, connectivity), humanitarian pressure, and possibly external factors (UN, corridors). Canon already has **System 5: Enclave Integrity** (connectivity-based detection, integrity, humanitarian pressure).
- **Model need:** Ensure enclave detection and integrity (and any flip/breach logic) do **not** treat surrounded areas as auto-lost; BB research should inform **why** these enclaves held (supply corridors? UN? defensibility?) and how that maps to existing or extended enclave rules.

### 2.3 Pockets (coherent held regions)

- **Example:** The **Bihać pocket** — the entire northwestern pocket held as a coherent area despite being cut off from the rest of RBiH-held territory.
- **Implication:** A **pocket** is a contiguous friendly-held region with no (or tenuous) land connection to the faction’s main territory. Like an enclave but at regional scale; may need similar “resist overrun” behavior and possibly distinct detection (pocket vs single-enclave).
- **Model need:** Decide whether pockets are a subtype of enclave (connectivity-based) or a separate concept; ensure the engine can represent “pocket holds” and does not auto-overrun them. BB research should capture how Bihać held (terrain, defensibility, external support, political will).

---

## 3. JNA and early RS expansion (12 May 1992 conversion)

**Historically:** RS expanded in **April–May 1992** because of **existing JNA (Yugoslav People's Army) brigades** already deployed in BiH. Those units **formally converted to VRS on 12 May 1992** (on paper). So **RS had access to heavy, organized brigades from the very start** of the war — not only militia building up over time.

**Implications for the early-war model:**

- Current Phase I flip uses **militia strength** (phase_i_militia_strength) from adjacent muns as attacker/defender; capability modifiers scale effectiveness. Formations exist at init when using OOB but **do not currently contribute to Phase I flip strength** in code. So the engine does not yet represent "RS attacked with JNA/heavy brigades already in place."
- **12 May 1992** is a clear calendar milestone: before = JNA in BiH; after = those forces are VRS. Options (to be decided in model design, informed by BB research):
  - **Option A — Explicit JNA phase:** Until 12 May (or first N turns), treat "JNA" as present in certain muns (data-driven from BB); JNA contributes to RS-side flip strength or a dedicated JNA strength term; on 12 May a one-time **conversion event** renames/assigns those formations to VRS (same positions, same strength). Requires JNA as a temporal or logical entity and a dated event.
  - **Option B — Init state + formation-aware flip:** No JNA entity. April 1992 scenario **starts** with VRS formations (historically JNA-origin) already placed in the right muns (init_formations_oob or init formations from OOB + JNA deployment data). Phase I flip formula is **extended** so that **formation strength in adjacent muns** counts toward attacker strength (so RS gains from day one where those brigades sit). 12 May has no in-sim event; the init state is already "post–12 May" in terms of who owns the units, but their placement reflects JNA deployment.
  - **Option C — Time-bounded RS bonus:** No JNA formations. Until 12 May (or first N turns), in municipalities with **JNA presence** (BB-derived list), RS **attacker** strength gets a "heavy brigade" or "JNA legacy" multiplier so that flip outcomes match history without new entities. Simpler but less explicit.
  - **Option D — Rethink Phase I structure:** e.g. split Phase I into "JNA-backed expansion" (April–12 May) with different rules or strength sources, then "VRS phase" with standard formula. Or make Phase I flip formula always include formation strength when formations exist in adjacent muns (so any scenario with early RS formations gets the effect).

**Research and model design:**

- **BB extractor** must also extract **JNA deployment and 12 May conversion:** where JNA was in April 1992, which units became which VRS brigades, so that init formations or JNA-presence data are citation-backed.
- **Game Designer** (with Formation-expert, Scenario-creator) decides whether to introduce an explicit JNA phase/event, or to bake JNA legacy into **init formations + formation-aware Phase I flip**, or to use a time-bounded RS strength modifier. **Technical Architect** confirms fit with state (formations, factions, scenario timeline, determinism).

---

## 4. Balkan Battlegrounds as ultimate source

- **Authority:** `docs/Balkan_BattlegroundsI.pdf` and `docs/Balkan_BattlegroundsII.pdf` are the **ultimate historical knowledge repository**.
- **Existing pipeline:** ADR-0002, `docs/knowledge/balkan_battlegrounds_kb_pipeline.md`, `docs/knowledge/balkan_battlegrounds_kb_schema.md`. Script: `tools/knowledge_ingest/balkan_battlegrounds_kb.ts`. Outputs: `data/derived/knowledge_base/balkan_battlegrounds/pages/`, `maps/`, `map_catalog.json`.
- **Gap:** No **specialized agent/skill** that (1) uses BB to answer historical-pattern questions, (2) extracts sequences (takeover → cleanup → exodus) **and** holdout/enclave/pocket patterns, (3) produces structured, citation-backed findings for modeling.

---

## 5. Specialized subagent: Balkan Battlegrounds historical extractor

**Deliverable:** A dedicated skill or agent that extracts historical knowledge from Balkan Battlegrounds.

- **Purpose:** Query BB-derived content by theme and location; extract narrative about **political takeover**, **military operations**, **displacement**, **holdouts within flipped muns**, **enclave survival**, **pocket survival**, and **JNA deployment and 12 May 1992 conversion to VRS**; output **structured findings with citations** (volume + page).
- **Inputs:** Research questions; optional seed locations (user muns as **starting points**; expand from BB to other locations with similar patterns).
- **Outputs:** Pattern summaries; event sequences per location; **which settlements/areas held within flipped muns and why** (e.g. heartland proximity, Sapna); **how enclaves and pockets survived** (Srebrenica, Žepa, Goražde, Bihać); **where JNA was in April 1992, which units became which VRS brigades on 12 May**; candidate lists with BB citations; uncertainty where BB is ambiguous.
- **Implementation options:** New Cursor skill (e.g. `.cursor/skills/balkan-battlegrounds-historical-extractor/SKILL.md`); optional script for deterministic extractions (e.g. `data/derived/knowledge_base/balkan_battlegrounds/extractions/` by theme). Determinism: all derived lists citation-backed and reproducible.

---

## 6. Research phase (before any engine change)

1. **Create or designate the BB historical extractor** (skill and/or script) per §5.
2. **Run research** using BB as the only authoritative source:
   - **Takeover/consolidation/displacement:** Use user-mentioned muns only as seeds. Extract political takeover vs military operations vs displacement; produce pattern report with citations.
   - **Holdouts:** Search BB for **Sapna (Zvornik)** and similar cases where a settlement or sub-area **held within a flipped municipality**; extract factors (proximity to heartland, connectivity, formations, terrain). Produce “holdout pattern” with citations.
   - **Enclaves:** Search BB for **Srebrenica, Žepa, Goražde** — how they were defined, how they held, what prevented overrun (supply, UN, corridors, defensibility). Produce "enclave survival" pattern with citations.
   - **Pockets:** Search BB for **Bihać pocket** — how the pocket was sustained, relation to enclaves, why it held. Produce "pocket" pattern with citations.
   - **JNA and 12 May 1992:** Search BB for **JNA deployment** in BiH (April 1992), **12 May 1992 conversion** to VRS, which units became which VRS brigades, where JNA was stationed. Produce "JNA deployment and conversion" pattern with citations for init formations or JNA-presence data.

3. **Synthesize** into a short "BB-derived control, holdout, enclave, pocket and JNA model" note: what "flip" means; when settlements hold within a flipped mun; how enclaves and pockets resist overrun; how displacement ties to takeover vs consolidation; **how early RS expansion was driven by JNA and how to model it (12 May, formation placement, Phase I formula).**

---

## 7. Model design phase (after research)

- **Game Designer** (with Scenario-creator and Canon-compliance): Using the BB-derived report, decide:
  - **Flip** = political control only; consolidation and displacement as separate or combined steps.
  - **Holdouts:** How settlement-level control is preserved within a flipped mun (heartland proximity, connectivity, formation presence); whether we need explicit “heartland” or “friendly contiguous bloc” for resistance.
  - **Enclaves:** Align with System 5; ensure flip/breach logic does not auto-overrun surrounded areas; map BB findings to integrity/supply/humanitarian factors.
  - **Pockets:** Whether Bihać-style pockets use the same rules as enclaves (connectivity-based) or a separate “pocket” concept; how they resist overrun.
- **Technical Architect:** Confirm fit with existing state (political_controllers per settlement, control_status, enclaves array, connectivity) or identify minimal extensions. No implementation until agreed.

---

## 8. Implementation phase (after model design)

- Implement only what the agreed model requires:
  - Flip = political control; consolidation/displacement as designed.
  - **Holdouts:** Settlement-level control retention within flipped muns (e.g. heartland proximity, connectivity) per BB-derived rules.
  - **Enclaves:** Enclave detection and integrity (and any breach/flip exceptions for enclaves) per System 5 and BB patterns.
  - **Pockets:** Pocket detection and resistance (or reuse of enclave logic at regional scale) per agreed design.
  - **JNA / early RS:** Per model choice: JNA phase + 12 May event, or formation-aware Phase I flip + init formations (JNA-origin), or JNA-presence multiplier, or Phase I structure change.
- Municipality and settlement lists (flip-eligible, holdouts, enclave/pocket membership, JNA-presence if used) must come from **BB-derived research** (with citations) or explicit scenario override with ledger note.

---

## 9. Role assignments

| Role | Responsibility |
|------|----------------|
| **Orchestrator** | Prioritize research-first; no engine change until BB patterns and model design are agreed. |
| **Documentation / Skill author** | Create the **Balkan Battlegrounds historical extractor** skill (and optionally extraction script). |
| **Researcher (BB extractor user)** | Run BB extraction; produce pattern report including **holdouts, enclaves, pockets** with citations. |
| **Game Designer** | Decide flip semantics, consolidation/displacement, **holdout rules** (heartland/connectivity), **enclave/pocket** behavior, and **JNA / early RS model** (12 May, formation-aware flip, or Phase I rethink) from pattern report. |
| **Scenario-creator-runner-tester** | Map BB-derived locations to mun1990_id and settlement IDs; maintain scenario overrides only when documented; validate runs. |
| **Gameplay Programmer** | Implement only after model design; code flip, holdouts, enclave/pocket behavior, and **JNA/early RS** (Phase I formula or events) per agreed model. |
| **Canon-compliance-reviewer** | Align Phase I §4.3, System 5, System 11 with “flip = political control” and holdout/enclave/pocket design; implementation-notes as needed. |
| **QA** | Validate outcomes against BB-derived expectations; determinism preserved. |

---

## 10. Key files and references

| Purpose | File / doc |
|--------|-------------|
| BB KB pipeline | `tools/knowledge_ingest/balkan_battlegrounds_kb.ts`, `docs/knowledge/balkan_battlegrounds_kb_pipeline.md` |
| BB schema | `docs/knowledge/balkan_battlegrounds_kb_schema.md` |
| Political control (per settlement) | Systems Manual: political_controllers[sid]; municipality derived. |
| Enclave Integrity | Systems Manual System 5: enclaves, integrity, connectivity. |
| Sept 1992 settlement-level control | `docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md` (Sarajevo, Srebrenica, Sapna). |
| Control flip (current) | `src/sim/phase_i/control_flip.ts` |

---

## 11. Constraints and success criteria

- **No canonical lists from user input.** User-mentioned muns and places (Prijedor, Sapna, Zvornik, Srebrenica, Žepa, Goražde, Bihać) are **research seeds only**; authoritative lists from BB-backed research.
- **Canon:** Any change to flip semantics, holdouts, enclaves, pockets, or early-war/JNA model documented; implementation-notes where needed.
- **Determinism:** All new logic and lists deterministic; citations for any mun/settlement list.
- **FORAWWV.md:** Do not edit.
- **Ledger:** Entries for research deliverable, model decision, and implementation.

**Success:** (1) BB extractor exists and is used. (2) Pattern report covers takeover → consolidation → displacement, **holdouts** (e.g. Sapna), **enclaves** (Srebrenica, Žepa, Goražde), **pockets** (Bihać), and **JNA deployment and 12 May conversion** with BB citations. (3) Agreed model for flip, holdouts, enclaves, pockets, and **early RS/JNA** (Phase I formula or structure). (4) Engine and data reflect the model; game models history (including RS early heavy-brigade advantage) so the player can change it. (5) Every location or rule traceable to BB-derived pattern or explicit override (with ledger note).
