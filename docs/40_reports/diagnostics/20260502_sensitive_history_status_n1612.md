# Sensitive-History Enclave Status — n1612

**Command:** `node tools/diagnostics/sensitive_history_status.cjs runs/apr1992_definitive_188w__210e69404d054959__w188_n1612`

**Run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1612`  
**Turn:** 188  
**Hash:** `a86614b8e9afd1c1`  
**Verdict:** `OPEN_P0`

## Enclave Controllers

| Enclave | RS held | RBiH held | Missing | Capital controller | All RS? | Summary |
|---|---:|---:|---:|---|---|---|
| srebrenica | 1/11 | 10/11 | 0 | RBiH | no | RBiH:10, RS:1 |
| zepa | 0/1 | 1/1 | 0 | RBiH | no | RBiH:1 |

## Events And Rupture

| Event | Fired? | Count | Last turn | Rupture path(s) |
|---|---|---:|---:|---|
| srebrenica_falls_1995 | yes | 1 | 162 | - |
| srebrenica_genocide_1995 | no | 0 | - | - |
| zepa_falls_1995 | yes | 1 | 164 | - |

## Watched Operations

| Operation | Turn | Outcome | Recovery | Attacks | Captures | Ratio | Axes |
|---|---:|---|---|---:|---:|---:|---|
| Operation Cerska-Kamenica | 40 | failure | planning_invalidated | 0 | 0/3 | 1 | cerska_pocket:0/1@op:srebrenica:brezovice_2; kamenica:0/2@op:srebrenica:osmace_2 |
| Operation Krivaja-95 | 168 | failure | planning_invalidated | 0 | 0/5 | 0.084 | srebrenica_enclave:0/5@op:bratunac:bratunac_2 |
| Operation Stupčanica-95 | 172 | failure | planning_invalidated | 0 | 0/1 | 0.282 | zepa_pocket:0/1@op:vlasenica:grabovica |

## Watched Brigades

| Brigade | Status | Personnel | Cohesion | Morale | Corps | Location |
|---|---|---:|---:|---:|---|---|
| rs_1st_birac | active | 2000 | 21.350 | 0 | vrs_drina | op:zvornik:kozluk_2 |
| rs_1st_bratunac | active | 2000 | 20 | 0 | vrs_drina | op:bratunac:bratunac_2 |
| rs_1st_milii | active | 2000 | 20 | 0 | vrs_drina | op:vlasenica:grabovica |
| rs_1st_podrinje | active | 2000 | 20 | 0 | vrs_drina | op:rogatica:pljesevica |
| rs_1st_vlasenica | active | 2000 | 21.350 | 0 | vrs_drina | op:visegrad:prelovo_2 |
| rs_1st_zvornik | active | 1254 | 18 | 0 | vrs_drina | op:olovo:slivnje |
| rs_5th_podrinje | active | 2000 | 20 | 0 | vrs_drina | op:vlasenica:bacici |
| rs_skelani_battalion | inactive | 0 | 65 | 10 | vrs_drina | op:srebrenica:mala_daljegosta_2 |
| rs_visegrad_brigade | inactive | 0 | 20 | 78 | vrs_drina | op:visegrad:zlijeb |

## Read

The new diagnostic agrees with Claude's partial-close classification: the sensitive-history P0 is open. It also makes the handoff sharper than the prose report alone:

- Srebrenica is not simply "all RBiH"; one peripheral Srebrenica OSID is RS, while the capital and 10/11 enclave OSIDs remain RBiH.
- Narrative fall events fired, but the rupture consequence did not.
- The late-war operations did not attack; Krivaja remains at a very low launch-tick ratio, while Stupčanica shows the 6x correction but still cannot launch.
- The watched Drina brigade table captures both roster depletion (`rs_skelani_battalion`, `rs_visegrad_brigade`) and co-location / morale-collapse evidence for successor lanes.
