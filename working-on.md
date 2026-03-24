# Working On: Emergent Brigade Phase 2 — Troop Strength Calibration

## Context
Enclave fix + pool rerouting + tiered caps implemented. Calibration in progress.

## What's Done
- Enclave capacity gate fix (ENCLAVE_FORMATION_CAPACITY_THRESHOLD=0.30)
- Surplus pool rerouting (new pipeline step)
- deriveMaxPersonnel activated (OOB loader fix)
- Tiered caps lowered to w40-effective range
- Strategic reserve RBiH draw rate 0.02->0.15
- Life lessons restructured (8 topic files)
- 9 skills wired with Required Reading
- Historian OOB master hierarchy

## What's Next
- Run calibration with lowered caps (n1074 was before lowered caps took effect — need n1075)
- If RBiH still trails RS+HRHB: asymmetric mobilization reduction (RS/HRHB cut more than RBiH)
- Then return to v0.7.0 Phase 4 (engine flag reads)

## Key Metrics to Hit
- RBiH: 115-130k, 114+ brigades
- RS: 85-95k
- HRHB: 35-42k
- RBiH > RS+HRHB combined
