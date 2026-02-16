# Audit: Documented or Envisioned Systems Not Yet Implemented or in Implementation Plan

**Date:** 2026-02-15  
**Purpose:** Single audit of systems/mechanics that appear in project docs (canon, engineering, planning, reports) but are not yet implemented or not yet included in a formal implementation plan.  
**Scope:** All of `docs/` (10_canon, 20_engineering, 30_planning, 40_reports).  
**Audience:** Orchestrator, PM, and role owners for prioritization and plan inclusion.

---

## 1. Summary

- **Canon (Engine Invariants v0.5, Systems Manual, Phase specs)** describe several systems that are either absent in code, only scaffolded, or explicitly stubbed.
- **Planning docs** (missing_systems_roadmap, gap_analysis, AWWV_Gap_Systems_*) already list eight major “missing systems” and Tier 1–3 conceptual gaps.
- **CONSOLIDATED_BACKLOG** and **Phase 7 / Master Early Docs** cover post-MVP work (B3 negotiation, events, campaign, production, victory, etc.) but do not restate every canon-level “required” system.
- This audit **merges** canon-stated requirements, planning gap docs, and backlog into one list and flags items that appear in canon/specs but are **not** in CONSOLIDATED_BACKLOG or missing_systems_roadmap.

---

## 2. From Canon (Engine Invariants §16–17, Systems Manual, Phase Specs)

These are **required or specified** in canon but either not implemented or only partially/scaffolded.

| System / mechanic | Canon source | Implementation status | In implementation plan? |
|-------------------|-------------|------------------------|--------------------------|
| **Legitimacy** (settlement-level; distinct from control/authority; erosion/recovery; gates authority) | Engine Invariants §16.A; Systems Manual §9 | State modules and pipeline hooks exist; full integration with authority consolidation, recruitment, exhaustion not fully wired per spec | Yes — missing_systems_roadmap Phase 1 (System A) |
| **External patron pressure and IVP** | Engine Invariants §16.C; Systems Manual §19 | patron_pressure / IVP code and pipeline steps exist; “patron-enforced” outcomes (e.g. Washington-style) not fully modeled | Yes — missing_systems_roadmap Phase 2 (System C); gap_analysis Tier 1 |
| **Arms embargo asymmetry** | Engine Invariants §16.D; Systems Manual §2 (recruitment), embargo profiles | embargo.ts and recruitment use; differential effects and ceilings as in invariants not fully enforced | Yes — missing_systems_roadmap Phase 2 (System D); gap_analysis Tier 1 |
| **Heavy equipment and maintenance degradation** | Engine Invariants §16.E; Systems Manual (equipment) | heavy_equipment.ts, maintenance.ts exist; Phase II spec §12: “maintenance module is not yet integrated with the typed equipment system” | Yes — missing_systems_roadmap Phase 3 (System E); gap_analysis Tier 1 |
| **Enclave integrity and humanitarian pressure** | Engine Invariants §16.F; Systems Manual §16 | enclave_integrity.ts and pipeline report; full decay/collapse triggers and IVP feed not fully implemented | Yes — missing_systems_roadmap Phase 4 (System F) |
| **Sarajevo exception** (integrity floors, visibility → IVP, treaty clauses) | Engine Invariants §16.G; Systems Manual §17 | sarajevo_exception.ts and pipeline; special treaty/Sarajevo clauses and dual-channel supply not full | Yes — missing_systems_roadmap Phase 4 (System G) |
| **Negotiation capital and territorial valuation** (acceptance computed; required clauses; liabilities cheaper) | Engine Invariants §16.H; Systems Manual §20 | negotiation_capital.ts and pipeline; treaty acceptance and peace-triggering logic exist in state; full “liabilities cheaper” and clause enforcement not complete | Yes — missing_systems_roadmap Phase 5 (System H); Phase O deferred |
| **Tactical doctrines** (INFILTRATE, ARTILLERY_COUNTER, COORDINATED_STRIKE; posture eligibility) | Engine Invariants §16.I | doctrine.ts exists; doctrine postures and eligibility not fully wired to combat/posture | Mentioned in canon only; not in missing_systems_roadmap |
| **Capability progression and milestone events** (Washington Agreement, Drina blockade; time-indexed/precondition-driven) | Engine Invariants §16.J | washington_agreement.ts and Phase I wiring exist; “Drina blockade” and full milestone set not implemented | Partially in plan (Washington); other milestones not listed |
| **Contested control initialization** (SECURE/CONTESTED/HIGHLY_CONTESTED from Phase 0 stability) | Engine Invariants §16.K | Phase 0 stability and control status exist; carry-over into Phase I flip resistance and authority as in §16.K not fully specified in implementation | gap_analysis Tier 2 (early-war coercive authority) |
| **phase_ii_exhaustion_local** | Phase II Spec §12 | In schema; not driven by mechanics (explicit stub) | No dedicated plan |
| **JNA equipment transfer to RS brigades** | Phase II Spec §12 | Not implemented; RS brigades use default composition from equipment_effects | Not in CONSOLIDATED_BACKLOG |
| **OG donor tracking** (proportional return to original donors) | Phase II Spec §12 | Returns equal to same-corps brigades at dissolution, not proportional to original donors | Not in CONSOLIDATED_BACKLOG |
| **One-brigade-per-target exception** (OG + operation toward target + heavy resistance) | Phase II Spec §12; Systems Manual §6.5 | Exception “not yet implemented”; duplicates currently disallowed | In IMPLEMENTED_WORK_CONSOLIDATED as stub; no follow-up plan |
| **Phase 3A/3B/3C** (pressure diffusion, pressure→exhaustion coupling, exhaustion→collapse gating) | Phase II Spec §14 (Phase_Specifications); Systems Manual §7.1–7.3 | Phase 3A eligibility and diffusion scaffolded and feature-gated; 3B/3C not implemented | Phase 3A in pipeline; 3B/3C not in CONSOLIDATED_BACKLOG |
| **Command hierarchy (Corps/OG) coordination** | Phase I Spec | “Corps/OG coordination not yet active” | Bot AI backlog (CONSOLIDATED_BACKLOG §7) |
| **Phase 0 supply** (“Activate supply systems; logistics not yet militarized”) | Phase 0 Spec | Deferred / not fully activated | Not in CONSOLIDATED_BACKLOG |
| **MCZs** (Municipal Control Zones; fragmentation, reunification) | Systems Manual §11 | Described; no MCZ implementation in code | In missing_systems_roadmap implicitly (fragmentation); not named |
| **War economy and local production** (capacity, degradation) | Systems Manual §15 | production_facilities and local production exist; “capacity degrades irreversibly” and full war economy not complete | Partially in IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS (production facilities) |
| **Corridor collapse and supply states** (Adequate/Strained/Critical; cascade) | Systems Manual §14 | Corridor/supply logic exists; treaty-level corridor rights deprecated; full collapse cascade as in manual not confirmed | Referenced in canon only |
| **Intra-side political fragmentation** (splinter, refusal to support, divergent negotiation) | Systems Manual §10 | Described; no explicit fragmentation state machine | gap_analysis Tier 2 (intra-faction fragmentation) |
| **Command and control degradation** (delays, partial compliance, non-execution) | Systems Manual §8 | Command friction multipliers in Phase II; full “command degradation” behavior not complete | Partial (friction); not in backlog as full system |
| **Player action constraints** (forbidden but attemptable; penalties) | Systems Manual §21 | Not implemented as a system | Not in CONSOLIDATED_BACKLOG |
| **Negotiation windows and end states** (imposed settlement, negotiated compromise, frozen conflict, collapse) | Systems Manual §20 | Treaty acceptance and territorial clauses exist; “negotiation windows” and full end-state set not implemented | Phase O / post-MVP |

---

## 3. From Planning Docs (30_planning, gap_analysis, missing_systems_roadmap)

Already captured in [missing_systems_roadmap.md](../../30_planning/missing_systems_roadmap.md) and [gap_analysis.md](../../30_planning/gap_analysis.md):

- **Missing systems roadmap (8 systems):** Legitimacy, AoR formalization (AoR is now implemented; formal “rules” doc may still be needed), External patron/IVP, Arms embargo asymmetry, Heavy equipment and maintenance, Enclave integrity, Sarajevo exception, Negotiation capital and territorial valuation.
- **Gap analysis Tier 1:** External patron pressure, Heavy equipment/maintenance burden, Arms embargo (asymmetric, time-dependent).
- **Gap analysis Tier 2:** Intra-faction political fragmentation, Legitimacy as distinct dimension, Early-war coercive authority shifts (pre-front).
- **Gap analysis Tier 3:** IVP (first-class vs modifier), Enclaves/city exceptions, JNA garrison and historical force placement data.

These are **in** planning docs but not all are in CONSOLIDATED_BACKLOG as discrete items; CONSOLIDATED_BACKLOG links to Phase 7 / Master Early Docs and historical fidelity, not to the eight missing systems by name.

---

## 4. From CONSOLIDATED_BACKLOG and Phase 7 / Master Early Docs

Already listed as not implemented or partially implemented:

- **B3 Negotiation counter-offers** — not started (PHASE7_BACKLOG_QUEUE).
- **Phase A (Master Early Docs):** AI opponent (partially done—bot AI), Victory conditions, Production facilities.
- **Phase B:** Event system (B1 done), Campaign branching (B2 done), B3 counter-offers (not started), Coercion tracking (B4 done).
- **Bot AI remaining work (CONSOLIDATED_BACKLOG §7):** AoR extreme imbalance, RS early-war underperformance, defender casualties at zero, HRHB near-passive, posture for forming brigades, corps command integration with brigade AI, operational groups not used by bot.
- **GUI/War Planning Map:** War Planning Map as separate system, start-of-game information, clickable regions, etc. (see CONSOLIDATED_BACKLOG §4–5).
- **Historical fidelity and research** (CONSOLIDATED_BACKLOG §2).
- **Brigade/military design** (brigade realism, militia rework, RBiH–HRHB alliance redesign options) (CONSOLIDATED_BACKLOG §3).

---

## 5. Items in Canon or Specs but Not Clearly in Any Implementation Plan

These are **documented or envisioned** but not clearly called out in CONSOLIDATED_BACKLOG or missing_systems_roadmap:

| Item | Where described | Suggestion |
|------|-----------------|------------|
| **Tactical doctrines** (INFILTRATE, ARTILLERY_COUNTER, COORDINATED_STRIKE) | Engine Invariants §16.I; doctrine.ts exists | Add to backlog or missing_systems_roadmap as “Doctrine posture eligibility and wiring” |
| **Phase 3B (pressure → exhaustion coupling)** | Phase_Specifications; Systems Manual §7.2 | Add to backlog as “Phase 3B implementation” |
| **Phase 3C (exhaustion → collapse gating)** | Phase_Specifications; Systems Manual §7.3 | Add to backlog as “Phase 3C implementation” |
| **phase_ii_exhaustion_local** (driven by mechanics) | Phase II Spec §12 | Add to backlog or Phase II follow-up list |
| **JNA equipment transfer to RS** | Phase II Spec §12 | Add to backlog (formation/OOB) |
| **OG donor proportional return** | Phase II Spec §12 | Add to backlog (OG lifecycle) |
| **OG + operation toward target exception** (one-brigade-per-target) | Phase II §12, Systems Manual §6.5 | Already noted as stub; add “OG operation targeting” to bot AI backlog |
| **Contested control initialization** (Phase 0 stability → Phase I) | Engine Invariants §16.K | Align with gap_analysis Tier 2; add to backlog if not covered by Phase 0 work |
| **Milestone events** (e.g. Drina blockade) beyond Washington | Engine Invariants §16.J | Add “Milestone event set” to backlog |
| **MCZs** (Municipal Control Zones) | Systems Manual §11 | Add to backlog or missing_systems_roadmap (fragmentation) |
| **Command and control degradation** (full) | Systems Manual §8 | Add to backlog if beyond current friction multipliers |
| **Player action constraints** (forbidden but attemptable; penalties) | Systems Manual §21 | Add to backlog (UX/game design) |
| **Phase 0 supply activation** (“logistics not yet militarized”) | Phase 0 Spec | Add to backlog if in scope |

---

## 6. Recommendations

1. **Orchestrator/PM:** Decide which of §5 items should be added to [CONSOLIDATED_BACKLOG.md](CONSOLIDATED_BACKLOG.md) or [missing_systems_roadmap.md](../../30_planning/missing_systems_roadmap.md) so they are in a formal implementation plan.
2. **Single reference:** Use this audit as the “documented-but-unimplemented” checklist; update it when canon or plans change (e.g. after Phase 7 or missing_systems_roadmap execution).
3. **Canon vs plan alignment:** Ensure every Engine Invariants §16–17 and Systems Manual §8–21 item is either implemented, in CONSOLIDATED_BACKLOG, or in missing_systems_roadmap (or explicitly out of scope).

---

## 7. References

- [Engine_Invariants_v0_5_0.md](../../10_canon/Engine_Invariants_v0_5_0.md) §14–17  
- [Systems_Manual_v0_5_0.md](../../10_canon/Systems_Manual_v0_5_0.md) §1–23  
- [Phase_II_Specification_v0_5_0.md](../../10_canon/Phase_II_Specification_v0_5_0.md) §12  
- [Phase_I_Specification_v0_5_0.md](../../10_canon/Phase_I_Specification_v0_5_0.md)  
- [Phase_0_Specification_v0_5_0.md](../../10_canon/Phase_0_Specification_v0_5_0.md)  
- [missing_systems_roadmap.md](../../30_planning/missing_systems_roadmap.md)  
- [gap_analysis.md](../../30_planning/gap_analysis.md)  
- [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md)  
- [IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md](../backlog/IMPLEMENTATION_PLAN_MASTER_EARLY_DOCS.md)  
- [PHASE7_BACKLOG_QUEUE_MASTER_EARLY_DOCS.md](../backlog/PHASE7_BACKLOG_QUEUE_MASTER_EARLY_DOCS.md)
