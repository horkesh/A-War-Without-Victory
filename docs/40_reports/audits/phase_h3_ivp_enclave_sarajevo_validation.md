# Phase H3 Audit -- IVP, Enclaves, Sarajevo (v0.4)

## Purpose
Provide a lightweight validation checklist for v0.4 Systems 1, 5, and 6:
International Visibility Pressure (IVP), Enclave Integrity, and Sarajevo exceptions.

## Checklist
- Load a mid-war save and confirm Sarajevo mun_id 10529 is present in the map graph.
- Force Sarajevo to low supply and confirm `sarajevo_state.siege_status` flips to BESIEGED.
- Confirm IVP sarajevo visibility increases when siege intensity increases.
- Confirm enclaves are detected for isolated, critical-supply components.
- Confirm humanitarian pressure increases as enclave integrity declines.
- Confirm IVP enclave pressure reflects summed enclave humanitarian pressure.
- Confirm patron_state diplomatic isolation increases when Sarajevo siege persists.

## Notes
- This audit is read-only and does not alter simulation state.
- Use saved outputs for comparison; avoid any randomized inputs.
