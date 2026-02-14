# Historical fidelity Apr 1992 — Model design decisions

**Status:** Agreed (execution of plan).  
**Reference:** Pattern report `data/derived/knowledge_base/balkan_battlegrounds/extractions/PATTERN_REPORT_APR1992_HISTORICAL_FIDELITY.md`, plan `docs/40_reports/HISTORICAL_FIDELITY_APR1992_RESEARCH_PLAN.md`.

---

## 1. Flip = political control

- **Decision:** Flip in the engine represents **political/administrative control** (who holds governance), not necessarily full territorial control. Consolidation and displacement remain as defined in Phase I §4.3–§4.4 (post-flip consolidation period, displacement on flip when Hostile_Population_Share > 0.30).
- **No change** to flip semantics in code; canon and implementation-notes already distinguish political control. Settlement-level control (political_controllers[sid]) is the source of truth; municipality control is derived (majority).

---

## 2. JNA / early RS (Option B)

- **Decision:** **Option B — Init state + formation-aware Phase I flip.**
  - No JNA entity or 12 May event. April 1992 scenario uses **init_formations_oob: true** so VRS (and RBiH/HRHB) formations are placed from OOB at start (historically JNA-origin for VRS).
  - **Phase I flip formula extended:** Attacker strength = militia in adjacent muns **plus formation strength** (personnel in formations whose home mun is in an adjacent municipality). So RS gains from day one where VRS brigades are present; RBiH defense benefits from its formations.
  - 12 May 1992 has no in-sim event; init is already "post–12 May" in terms of who owns units.
- **Rationale:** Minimal state change; uses existing formations and OOB; historically accurate early RS advantage without new calendar events.

---

## 3. Holdouts

- **Decision:** **Settlement-level control is authoritative.** No "flip entire mun → flip every settlement." Holdouts (e.g. Sapna in Zvornik) are represented by **init_control** or scenario override that sets political_controllers for specific settlements (e.g. Sept 1992 spec). Engine already supports this; no new "heartland" blob required for first iteration. Future: optional resistance factor for settlements connected to large friendly bloc (connectivity) can be added if needed.

---

## 4. Enclaves and pockets

- **Decision:** **Align with System 5 (Enclave Integrity).** No change to flip logic to "auto-overrun" surrounded areas; enclave detection and integrity (and humanitarian pressure) govern. Bihać-style pockets treated as enclave at regional scale (connectivity-based). No separate "pocket" entity in this phase.

---

## 5. Implementation summary

| Item | Action |
|------|--------|
| Phase I flip | Add formation strength (by mun, faction) from formations with tag `mun:<neighbor_mun>` to attacker strength in `getStrongestAdjacentAttacker`. Defender: already uses militia; optional future: add formation strength to effectiveDefense. |
| apr1992 scenario | Set `init_formations_oob: true`; keep `init_control: "apr1992"`. |
| Init control | Use existing `municipalities_1990_initial_political_controllers_apr1992.json` (East Bosnia RS where appropriate; Zenica, Tuzla, Sarajevo RBiH). |
| Defensive floor / RBiH hold | If RBiH still collapses in runs: (a) ensure defender formation strength is included in effectiveDefense, (b) or add a small defensive stability bonus for muns with RBiH formations, (c) or tune FLIP_* constants. Iterate after first run. |

---

## 6. Determinism and canon

- All new logic deterministic (formation list and mun extraction from tags sorted). No new randomness.
- Phase I §4.3 and Systems Manual implementation-notes: add note that implementation may include formation strength in adjacent muns in the flip formula (JNA/early RS historical fidelity). Ledger entry for this design and implementation.
