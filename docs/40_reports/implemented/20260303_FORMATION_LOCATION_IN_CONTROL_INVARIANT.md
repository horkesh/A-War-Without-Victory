# Formation Location-in-Control Invariant Implementation

**Date:** 2026-03-03  
**Scope:** Enforce invariant that every active formation with `location_osid` is in an OSID controlled by its faction; fix 282nd East Bosnian Light OOB; prevent formation-in-enemy-territory validation failure on serialize.

---

## 1. Summary

- **Invariant:** `political_controllers[formation.location_osid] === formation.faction` for all active formations with `location_osid` set (War phase).
- **Enforcement:** Pipeline step `phase-ii-displace-enemy-territory` (after `update-sector-offensive-results`); scenario runner initial-state displacement after backfill; validation `validateBrigadeLocationControl` in `validateState` before serialize.
- **OOB fix:** 282nd East Bosnian Light `home_osid` changed from `op:srebrenica:mala_daljegosta_2` (RS at apr1992 init) to `op:srebrenica:srebrenica_2` (RBiH-held Srebrenica town) in `data/source/oob_brigades.json`.

---

## 2. Code and Data Changes

| Area | File | Change |
|------|------|--------|
| Displacement helper | `src/sim/combat/attack_resolution_osid.ts` | Exported `displaceFormationsInEnemyTerritory(state, edges, reverseMap)` — retreat to friendly neighbor, friendly fallback, or set inactive |
| Pipeline | `src/sim/turn_phases/war_phases.ts` | New step `phase-ii-displace-enemy-territory` after `update-sector-offensive-results`; runs when operational data + edges present |
| Scenario runner | `src/scenario/scenario_runner.ts` | After `backfillFormationLocationOsid`, when phase war and operational data present: load edges, call `displaceFormationsInEnemyTerritory` before first serialize |
| Validation | `src/validate/brigade_location_control.ts` | New `validateBrigadeLocationControl(state)` (war phase; active formations with `location_osid` must have controller === faction) |
| Validation wiring | `src/validate/validate.ts` | `validateState()` calls `validateBrigadeLocationControl`; `serializeState()` calls `validateState()` before serialize |
| OOB | `data/source/oob_brigades.json` | 282nd: `home_osid` → `op:srebrenica:srebrenica_2` |

---

## 3. Documentation Propagated

- **PROJECT_LEDGER.md** — Changelog entry 2026-03-03 (formation-in-enemy-territory fix).
- **context.md** — "Formation location-in-control invariant (2026-03-03)" paragraph.
- **REPO_MAP.md** — "Formation location-in-control" bullet in Change X → Go Here.
- **PIPELINE_ENTRYPOINTS.md** — `phase-ii-displace-enemy-territory` in Phase II step list.
- **Engine_Invariants_v0_6_0.md** — Implementation-note under §9.8 (formation location-in-control, 2026-03-03).

---

## 4. Failure Mode Prevented

Before fix: 40-week scenario could fail at first serialize with  
`State failed validation before serialize: formation.location_not_controlled @ formations.arbih_282nd_east_bosnian_light.location_osid: Formation arbih_282nd_east_bosnian_light (RBiH) has location_osid op:srebrenica:mala_daljegosta_2 but controller is RS`.  
Root cause: 282nd homed in RS-held OSID at init; no displacement run before first snapshot.  
After fix: Initial state and every turn satisfy location-in-control; 40w run completes; validation runs before every serialize.

---

*See PROJECT_LEDGER 2026-03-03, context.md "Formation location-in-control invariant", Engine Invariants §9.8 implementation-note.*
