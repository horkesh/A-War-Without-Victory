# AoR Phase-Out: Reference → OSID/ZoC Replacement (Reconciliation)

**Date:** 2026-02-23  
**Status:** Implementation checklist for AoR phase-out; Phase II spatial model is OSID/ZoC-only.  
**Authority:** Technical Architect (reconciliation); Game Designer (canon updates).

---

## 1. Phase II spatial model (sole model)

- **Brigade location:** `location_osid` (one OSID per brigade; stacking allowed). No territorial set (no AoR).
- **Fronts:** Derived from **OSID** hostile boundary edges (`phase_ii_front_edges_osid`); assignable segments from that list. Canonical `front_edges` retained for Phase I and display only.
- **Control change:** Only via **attack resolution** (target OSID) or **corps/frontline operations**. No passive pressure flip.
- **Zone of Control (ZoC):** Brigades project ZoC to adjacent OSIDs; enemy in ZoC is ZoC-locked (stay, retreat, or attack ZoC source only).

---

## 2. AoR reference → OSID/ZoC replacement

| Former (AoR / canonical) | Replacement (OSID/ZoC) |
|--------------------------|-------------------------|
| `brigade_aor` (Record<SID, FormationId \| null>) | Removed. Brigade location = `FormationState.location_osid` only. |
| `brigade_aor_orders` | Removed. Orders use OSID targets (attack orders, movement orders). |
| `brigade_mun_orders` | Removed. No municipality-level expansion orders; movement/attack in OSID space. |
| `brigade_municipality_assignment` | Removed. No mun-level assignment; location_osid only. |
| Front-active settlement (settlement requiring AoR) | **Front** = hostile OSID boundary; brigade **assigned to front segment** (`brigade_front_assignment`); reserve = null. |
| AoR assignment / validate-brigade-aor | Removed. No AoR. location_osid set at creation and updated by movement/attack only. |
| enforce-brigade-aor-contiguity, enforce-corps-aor-contiguity | Removed. No AoR contiguity. |
| surrounded-brigade-reform, detect-brigade-encirclement | Removed (AoR-based). ZoC/retreat handles constrained movement. |
| apply-municipality-orders, apply-aor-reshaping | Removed. No mun/AoR orders. |
| compute-brigade-pressure | No-op; control change only via attack resolution. |
| phase-ii-aor-init, initializeBrigadeAoR | Removed. Phase II entry: `backfillFormationLocationOsid` only; no AoR population. |
| formation-hq-aor-depth-sync | Replaced by location_osid-only validation (no depth/AoR). |
| getBrigadeAoRSettlements, hasDefenderBrigade (AoR-based) | Use `location_osid`, ZoC state, OSID front edges. |
| political_controllers key space (Phase II) | Phase II control: OSID-keyed (same `political_controllers` with OSID keys where Phase II writes). |
| assignable_front_segments source | Derived from `phase_ii_front_edges_osid` when operational data available. |

---

## 3. Control keying contract (Phase II)

- **Contract:** Phase II control reads and writes use **OSID keys** in the same store (`political_controllers` or dedicated `operational_political_control` per Architect decision). Implemented as OSID-keyed in existing `political_controllers`; init and Phase I use SID; Phase II attack resolution writes `political_controllers[targetOsid] = attackerFaction`.
- **Lookup:** `getPoliticalControllerOSID(state, osid, reverseMap)` for Phase II; canonical SID lookup for Phase I and display derivation.

---

## 4. Formation init and Phase I→II transition

- **At creation:** Every brigade gets `location_osid` (OOB spawn, recruitment, scenario init) via canonical_to_operational_map or deterministic OSID from home_mun.
- **Phase I→II:** Do not call `initializeBrigadeAoR`. Call `backfillFormationLocationOsid` so every formation has `location_osid`.
- **aor_init.ts:** Removed or repurposed for display-only; no Phase II AoR population.

---

## 5. Pipeline (canonical Phase II steps)

- **ZoC:** `zoc-computation`, `zoc-constrained-movement`.
- **Front snapshot:** `derive-osid-front-segments` sets `phase_ii_front_edges_osid`; `assignable_front_segments` derived from it when operational data present.
- **Attack:** `phase-ii-resolve-attack-orders` (resolveAttackOrdersOsid).
- **Bot:** `generate-bot_brigade_orders` gates on operational data / location_osid; no brigade_aor.

---

## 6. References

- docs/30_planning/20260222_HOI_BRIGADES_AND_ZONE_OF_CONTROL_DESIGN.md  
- docs/30_planning/20260222_ATTACK_RESOLUTION_FORMULA_SPEC.md  
- Phase_II_Specification_v0_5_0.md §2.3, §4.3, §5, §7.1  
- Systems_Manual_v0_5_0.md §2.1, §6, §7.4  
