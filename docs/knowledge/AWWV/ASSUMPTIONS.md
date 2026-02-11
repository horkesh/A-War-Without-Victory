# AWWV Knowledge Base — Assumptions

Explicit and implicit assumptions recovered from ChatGPT and Claude archives. Recovery-oriented; no invention.

---

## Explicit assumptions (stated in conversations or canon)

1. **War is negative-sum; no total victory.** Design philosophy; wars often end without victory (Bosnia War Simulation Design; context.md).
2. **Territory is political and logistical, not spatial.** Not a tactical wargame; fronts emerge from interaction (Terrain Pipeline Execution handover).
3. **Control, legitimacy, logistics, exhaustion are distinct systems.** Stated in handovers and context.md.
4. **Determinism, auditability, and reproducibility are mandatory.** No tolerated nondeterminism (Phase A Invariants; Engine Invariants).
5. **Geometry is immutable across turns.** Population attributes separable, turn-indexed overlays (Project Handover AWWV).
6. **Political control must be initialized before fronts, AoR, pressure, exhaustion, supply.** Initialization precedence (Engine Invariants §9.2).
7. **Same initial state + same inputs → identical final state.** Determinism rule (Phase A; turn_pipeline tests).
8. **Canon docs override code.** If code contradicts canon, code is wrong (CANON.md).
9. **Settlement IDs canonical as S-prefixed (e.g. S104566); municipality IDs are mun1990.** Stated in Project Handover AWWV.
10. **No terrain scalars are consumed by the simulation yet.** H6.7-PREP; current state (Terrain Pipeline Execution).

---

## Implicit assumptions (inferred from repeated discussion)

1. **“Pressure” in design (pressure → exhaustion → negotiation) includes military pressure and possibly external/patron pressure;** external/patron pressure never formalized as a separate system in invariants.
2. **Negotiation capital / “EU-style peace score”** — design language; implementation exists but exact semantics may not be fully written in invariants.
3. **Rear political control zones do not generate or absorb pressure** — stated in Engine Invariants §9.4; implies pressure is tied to front/AoR activity.
4. **Formation coverage (AoR) implies a notion of “every settlement in exactly one brigade’s AoR”** — Claude stated explicitly; invariants imply it via political control and AoR derivation.
5. **Phase H0–H5 (and G0–G3.5) execution state is assumed to complete successfully** unless Cursor reports failure — handover assumption.
6. **Legacy master-derived substrate is authoritative for NW geometry** — no heuristic offsets; resolution anchored to legacy (Project Handover AWWV).
7. **Viewers are contract-first; data_index.json is single entry point; awwv_meta and SHA-256 checksums enforced** — architecture assumption from handovers.
8. **Population displacement will be modeled at settlement and municipality level** — future constraint; not implemented; “DO NOT implement yet.”

---

## Assumptions that later caused friction or redesign

1. **Phase 1 contact graph vs v3 shared-border graph** — CASE C mismatch led to explicit “not a bug” decision and FORAWWV addendum; assumption that both graphs would align was wrong.
2. **NW coordinate ambiguity** — initial assumption of single coordinate regime; resolved by anchoring to legacy master-derived substrate.
3. **Corridor rights in treaties** — initially in design; deprecated in favor of territorial annexes only.
4. **Derived state in serialization** — assumption that derived state could be stored led to denylist (fronts, corridors, derived, cache) and “recompute each turn” rule (Engine Invariants §13.1).

---

*Use for gap closure and explicit acceptance or rejection of assumptions; do not invent new mechanics.*
