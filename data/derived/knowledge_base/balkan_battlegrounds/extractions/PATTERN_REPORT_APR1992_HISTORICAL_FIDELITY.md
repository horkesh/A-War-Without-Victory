# BB-derived pattern report: Control, holdouts, enclaves, pockets, JNA (Apr 1992 historical fidelity)

**Produced by:** Balkan Battlegrounds historical extractor (skill + pipeline).  
**Sources:** BB page JSONs in `data/derived/knowledge_base/balkan_battlegrounds/pages/`, VRS/ARBiH OOB masters (BB1 Appendix G), existing knowledge docs.  
**Purpose:** Inform model design per `docs/40_reports/HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN.md`.

---

## 1. Takeover → consolidation → displacement

- **Pattern:** Political/administrative takeover (e.g. seizure of municipal building) often preceded or accompanied military operations ("cleanup," formations); displacement/exodus followed in many cases (e.g. Prijedor).
- **BB citation:** Narrative in BB1/BB2 on early 1992 takeovers; Appendix G (BB1 pp. 496–501) gives VRS brigade locations (1st Krajina, East Bosnian, etc.) that align with areas of early RS control expansion.
- **Implied model:** Flip = political control; consolidation and displacement as separate or sequential effects. Displacement triggered on flip when Hostile_Population_Share > threshold (already in Phase I §4.4).

---

## 2. Holdouts within a flipped municipality

- **Example:** Sapna (Zvornik municipality). Zvornik came under RS control; Sapna held due to proximity to Bosniak-held territory (heartland).
- **Source:** Scenario-creator-runner-tester / Sept 1992 spec (`docs/knowledge/SCENARIO_SEPTEMBER_1992_SPEC.md`): settlement-level control for Sapna. Napkin: "Settlement-level control (Sarajevo siege, Srebrenica enclave, Sapna in Zvornik)."
- **Implied model:** Settlement-level control (political_controllers[sid]) already exists; holdouts = settlements that retain original controller when municipality is "flipped" at derived level. Resistance factor: connectivity to contiguous friendly territory (heartland). No "flip entire mun → flip every settlement."

---

## 3. Enclaves (surrounded but surviving)

- **Examples:** Srebrenica, Žepa, Goražde — survived as enclaves when surrounded.
- **BB citation:** BB1 p.404 (clean_text): "plans for Bihac," "Muslim enclave," "wiping the enclave off the map," "UN defenders," "withdraw from Bihac" — Bihać as enclave with UN dimension; Serb plans changed under HV threat. Srebrenica/Žepa/Goražde similarly referenced in BB narrative.
- **Canon:** System 5 (Enclave Integrity): connectivity-based detection, integrity (supply, authority, population), humanitarian pressure. Surrounded must not auto-mean overrun.
- **Implied model:** Use System 5; ensure flip/breach logic does not auto-overrun surrounded areas; integrity and humanitarian pressure drive outcomes, not adjacency alone.

---

## 4. Pockets

- **Example:** Bihać pocket — coherent northwestern area held despite being cut off from rest of RBiH territory.
- **BB citation:** BB1 p.404 (Bihać as enclave/pocket; Serb withdrawal under accord; UN role).
- **Implied model:** Pockets as contiguous friendly-held region; treat as enclave at regional scale (connectivity-based) or same "resist overrun" rules as enclaves.

---

## 5. JNA deployment and 12 May 1992 conversion

- **Fact:** RS expanded in April–May 1992 using existing JNA brigades in BiH; formal conversion to VRS on 12 May 1992 (on paper). RS had heavy, organized brigades from the start.
- **Source:** Napkin ("JNA garrison" modifiers in Systems Manual); VRS Appendix G (BB1 pp. 496–501) — VRS OOB by corps/municipality; these units largely JNA-origin. HISTORICAL_TRAJECTORY doc: "VRS/JNA rapidly seize territory" in April 1992.
- **Implied model:** Option B — No separate JNA entity; April 1992 scenario starts with VRS formations (JNA-origin) placed per OOB; Phase I flip formula includes **formation strength in adjacent muns** so RS gains from day one where those brigades sit. 12 May = no in-sim event; init state is post–12 May in terms of ownership.

---

## 6. Traceability

| Theme | Citation / source |
|-------|-------------------|
| Takeover/consolidation/displacement | BB1 narrative; Phase I §4.3–§4.4 |
| Holdouts (Sapna) | SCENARIO_SEPTEMBER_1992_SPEC, napkin; settlement-level control |
| Enclaves (Srebrenica, Žepa, Goražde, Bihać) | BB1 p.404; System 5 |
| Pockets (Bihać) | BB1 p.404 |
| JNA / 12 May / VRS OOB | BB1 Appendix G (pp. 496–501); VRS_APPENDIX_G_FULL_BRIGADE_LIST.md; napkin |

---

*Full BB page sweep for JNA mentions, Prijedor narrative, and East Bosnia takeovers can be run via `tools/knowledge_ingest/balkan_battlegrounds_kb.ts` and grep over `pages/*.json` to add more granular citations.*
