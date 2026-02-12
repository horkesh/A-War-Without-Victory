---
name: balkan-battlegrounds-historical-extractor
description: Extracts historical knowledge from Balkan Battlegrounds (BB1/BB2) for control, takeover, holdouts, enclaves, pockets, and JNA/VRS. Use when researching BiH war patterns, producing citation-backed findings for scenario and engine design.
---

# Balkan Battlegrounds Historical Extractor

## Mandate

- **Query** BB-derived content (page JSON, indexes, proposed facts) by **theme** and **location**.
- **Extract** narrative about: political takeover, military operations, displacement, **holdouts within flipped muns** (e.g. Sapna in Zvornik), **enclave survival** (Srebrenica, Žepa, Goražde), **pocket survival** (Bihać), **JNA deployment and 12 May 1992 conversion to VRS**.
- **Output** structured findings with **citations** (volume + page). No canonical municipality or location list without a BB (or pipeline) source.

## Authority

- **Primary source:** `docs/Balkan_BattlegroundsI.pdf`, `docs/Balkan_BattlegroundsII.pdf` (CIA, 2002–2003).
- **Pipeline:** `tools/knowledge_ingest/balkan_battlegrounds_kb.ts`. Run: `npx tsx tools/knowledge_ingest/balkan_battlegrounds_kb.ts --mode extract --page-start N --page-end M`.
- **Outputs:** `data/derived/knowledge_base/balkan_battlegrounds/pages/*.json` (raw_text, clean_text), `map_catalog.json`, `facts_proposed.json`. Schema: `docs/knowledge/balkan_battlegrounds_kb_schema.md`.

## How to use this skill

1. **When asked to research a location or pattern:** Read from `data/derived/knowledge_base/balkan_battlegrounds/pages/` (or run the pipeline if pages are missing). Search page text for:
   - Place names (Prijedor, Zvornik, Sapna, Srebrenica, Žepa, Goražde, Bihać, Bijeljina, etc.).
   - Themes: "JNA", "12 May", "VRS", "takeover", "municipality", "enclave", "pocket", "exodus", "displacement", "cleanup", "consolidation".
2. **Produce a short report** with: pattern summary, event sequence where relevant, **citation (BB1/BB2 + page number)** per finding. Note uncertainty or conflicts.
3. **Structured outputs (optional):** If extracting for model design, emit:
   - Takeover/consolidation/displacement patterns (with citations).
   - Holdout cases (settlement/area that held within a flipped mun; factor e.g. heartland proximity).
   - Enclave/pocket cases (how they held; supply, UN, defensibility).
   - JNA deployment and 12 May conversion (where JNA was; which units became VRS).

## Constraints

- **Determinism:** Any derived list (e.g. "muns where BB describes governance takeover") must be citation-backed and reproducible.
- **No invention:** Do not add locations or rules without a BB (or pipeline) citation. User-mentioned municipalities are **research seeds only**.
- **Traceability:** Findings feed `docs/40_reports/HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN.md` and model design; every location or rule in the engine that drives control/holdouts/enclaves/JNA should be traceable to this extractor's output or an explicit override (with ledger note).

## Related

- Plan: `docs/40_reports/HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN.md`
- Scenario-creator-runner-tester: uses this extractor's outputs for scenario authoring and plausibility.
- Formation-expert: JNA-origin formations and OOB placement use JNA deployment findings.
