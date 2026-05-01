# Force-Quality Audit Metrics (read-only extraction)

### Run: apr1992_definitive_40w__f9f143f4221f767c__w40_n941
- weeks: 40
- final_state_hash: `bd0d3a9c5c0c6b3e`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 125 | 0.080 | 0.058 | 0.050 | 0.100 | 0.050 | 0.350 |
| RS | 81 | 0.451 | 0.549 | 0.419 | 0.549 | 0.050 | 0.849 |
| HRHB | 29 | 0.197 | 0.225 | 0.225 | 0.225 | 0.050 | 0.227 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.077 | 0.070 | 0.050 | 0.086 |
| RBiH/arbih_1st_corps | 35 | 0.066 | 0.050 | 0.050 | 0.051 |
| RBiH/arbih_3rd_corps | 27 | 0.097 | 0.100 | 0.058 | 0.128 |
| RS/vrs_1st_krajina | 35 | 0.513 | 0.549 | 0.510 | 0.549 |
| RS/vrs_east_bosnian | 10 | 0.492 | 0.550 | 0.521 | 0.550 |
| RS/vrs_drina | 9 | 0.304 | 0.197 | 0.149 | 0.527 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.196 | 0.225 | 0.192 | 0.225 |
| HRHB/hvo_central_bosnia | 7 | 0.216 | 0.225 | 0.225 | 0.226 |
| HRHB/hvo_northwest_bosnia | 5 | 0.155 | 0.225 | 0.050 | 0.225 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | 3.444 | n/a |
| RS | 3.533 | n/a |
| HRHB | 3.125 | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1992 | 0.350 | 0.250 | 0.150 | ATTACK=0.500, DEFEND=0.600, INFILTRATE=0.600 |
| RS | 1992 | 0.800 | 0.850 | 0.900 | ARTILLERY_COUNTER=1.000, ATTACK=0.900, STATIC_DEFENSE=0.950 |
| HRHB | 1992 | 0.500 | 0.450 | 0.600 | ATTACK=0.650, DEFEND=0.700 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 125 | 98000 | 20 | 142 | 6 |
| RS | 81 | 64800 | 562 | 1343 | 202 |
| HRHB | 29 | 23350 | 10 | 53 | 3 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 11 | 8 | 1 | 142 | 0 | 0 |
| RS | 294 | 222 | 45 | 1263 | 80 | 0 |
| HRHB | 6 | 4 | 1 | 51 | 3 | 0 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30500 | 0 | 25 |
| RBiH/arbih_1st_corps | 35 | 28300 | 20 | 75 |
| RBiH/arbih_3rd_corps | 27 | 21600 | 0 | 27 |
| RS/vrs_1st_krajina | 35 | 28000 | 204 | 576 |
| RS/vrs_east_bosnian | 10 | 8000 | 34 | 140 |
| RS/vrs_drina | 9 | 7200 | 40 | 135 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 10 | 39 |
| HRHB/hvo_central_bosnia | 7 | 5600 | 0 | 6 |
| HRHB/hvo_northwest_bosnia | 5 | 4000 | 0 | 3 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 4 | 16 | 2 | 0 | 1 | 0 | 0 | 4 | 3 | 0 | 11 | 1 |
| 0-40w | RS | 11 | 43 | 36 | 0 | 4 | 3 | 0 | 8 | 5 | 6 | 7 | 3 |
| 0-40w | HRHB | 1 | 4 | 4 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 10 | 1 |

### Run: apr1992_definitive_104w__3e41e64e390a2768__w104_n1594
- weeks: 104
- final_state_hash: `6b6daa39dcaf66f7`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 118 | 0.601 | 0.661 | 0.609 | 0.681 | 0.050 | 0.782 |
| RS | 83 | 0.657 | 0.719 | 0.624 | 0.730 | 0.056 | 0.807 |
| HRHB | 40 | 0.458 | 0.496 | 0.247 | 0.626 | 0.225 | 0.632 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 37 | 0.652 | 0.647 | 0.627 | 0.672 |
| RBiH/arbih_1st_corps | 34 | 0.545 | 0.681 | 0.332 | 0.681 |
| RBiH/arbih_3rd_corps | 26 | 0.570 | 0.639 | 0.570 | 0.674 |
| RS/vrs_1st_krajina | 36 | 0.673 | 0.714 | 0.657 | 0.728 |
| RS/vrs_east_bosnian | 10 | 0.590 | 0.671 | 0.513 | 0.730 |
| RS/vrs_sarajevo_romanija | 10 | 0.573 | 0.636 | 0.575 | 0.711 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.437 | 0.437 | 0.247 | 0.631 |
| HRHB/hvo_central_bosnia | 12 | 0.532 | 0.555 | 0.484 | 0.632 |
| HRHB/hvo_tomislavgrad | 7 | 0.401 | 0.282 | 0.225 | 0.609 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | n/a | n/a |
| RS | n/a | n/a |
| HRHB | n/a | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1994 | 0.750 | 0.700 | 0.400 | ATTACK=0.800, DEFEND=0.850, INFILTRATE=0.850 |
| RS | 1994 | 0.700 | 0.750 | 0.600 | ARTILLERY_COUNTER=0.750, ATTACK=0.650, STATIC_DEFENSE=0.800 |
| HRHB | 1994 | 0.500 | 0.450 | 0.500 | ATTACK=0.550, DEFEND=0.700 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 118 | 92500 | 56 | 233 | 7 |
| RS | 83 | 66400 | 247 | 1076 | 185 |
| HRHB | 40 | 36200 | 144 | 199 | 22 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 4 | 47 | 5 | 197 | 38 | 0 |
| RS | 2 | 205 | 40 | 658 | 382 | 36 |
| HRHB | 90 | 45 | 9 | 182 | 15 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 37 | 28100 | 13 | 132 |
| RBiH/arbih_1st_corps | 34 | 27500 | 32 | 50 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 9 | 32 |
| RS/vrs_1st_krajina | 36 | 28800 | 91 | 462 |
| RS/vrs_east_bosnian | 10 | 8000 | 37 | 121 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 54 | 158 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 70 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 4 | 13 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 86 | 95 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 15 | 16 | 25 | 25 | 5 | 10 | 0 | 9 | 5 | 8 | 9 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 8 | 13 | 2 | 2 | 0 | 2 | 0 | 4 | 0 | 0 | 4 | 1 |
| 40-104w | RS | 16 | 1 | 0 | 0 | 0 | 15 | 0 | 5 | 0 | 0 | 3 | 1 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Run: apr1992_definitive_188w__38158c1babaf1590__w156_n1595
- weeks: 156
- final_state_hash: `57f742a558d8e619`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 122 | 0.083 | 0.061 | 0.057 | 0.093 | 0.050 | 0.501 |
| RS | 83 | 0.275 | 0.337 | 0.050 | 0.437 | 0.050 | 0.735 |
| HRHB | 40 | 0.211 | 0.230 | 0.225 | 0.232 | 0.050 | 0.500 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.111 | 0.075 | 0.059 | 0.137 |
| RBiH/arbih_1st_corps | 34 | 0.063 | 0.061 | 0.059 | 0.061 |
| RBiH/arbih_3rd_corps | 26 | 0.070 | 0.057 | 0.054 | 0.061 |
| RS/vrs_1st_krajina | 36 | 0.294 | 0.386 | 0.091 | 0.437 |
| RS/vrs_east_bosnian | 10 | 0.315 | 0.412 | 0.216 | 0.437 |
| RS/vrs_sarajevo_romanija | 10 | 0.325 | 0.368 | 0.220 | 0.437 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.219 | 0.232 | 0.232 | 0.232 |
| HRHB/hvo_central_bosnia | 12 | 0.176 | 0.230 | 0.105 | 0.231 |
| HRHB/hvo_tomislavgrad | 7 | 0.221 | 0.225 | 0.225 | 0.230 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | 4.200 | n/a |
| RS | 3.400 | n/a |
| HRHB | 3.250 | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900, DEFEND=0.900, INFILTRATE=0.900 |
| RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650, ATTACK=0.550, STATIC_DEFENSE=0.750 |
| HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800, COORDINATED_STRIKE=0.900, DEFEND=0.850 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 122 | 95750 | 100 | 264 | 9 |
| RS | 83 | 66400 | 186 | 544 | 136 |
| HRHB | 40 | 36200 | 125 | 207 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 2 | 98 | 1 | 235 | 38 | 0 |
| RS | 1 | 163 | 21 | 62 | 423 | 59 |
| HRHB | 50 | 66 | 9 | 195 | 10 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30550 | 29 | 175 |
| RBiH/arbih_1st_corps | 34 | 27500 | 32 | 48 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 10 | 11 |
| RS/vrs_1st_krajina | 36 | 28800 | 64 | 211 |
| RS/vrs_east_bosnian | 10 | 8000 | 45 | 100 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 43 | 108 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 85 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 2 | 8 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 76 | 94 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 5 | 1 |
| 0-40w | RS | 12 | 28 | 27 | 27 | 3 | 4 | 0 | 10 | 7 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 3 | 3 | 1 | 1 | 0 | 1 | 0 | 2 | 0 | 0 | 3 | 1 |
| 40-104w | RS | 6 | 2 | 0 | 0 | 0 | 4 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Run: apr1992_definitive_188w__e51a693239cc130c__w183_n1596
- weeks: 183
- final_state_hash: `dd2d560c3e68a443`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 124 | 0.092 | 0.063 | 0.058 | 0.098 | 0.050 | 0.502 |
| RS | 83 | 0.263 | 0.325 | 0.050 | 0.411 | 0.050 | 0.709 |
| HRHB | 40 | 0.212 | 0.231 | 0.225 | 0.233 | 0.050 | 0.500 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.112 | 0.077 | 0.061 | 0.139 |
| RBiH/arbih_1st_corps | 36 | 0.089 | 0.063 | 0.061 | 0.063 |
| RBiH/arbih_3rd_corps | 26 | 0.072 | 0.059 | 0.056 | 0.063 |
| RS/vrs_1st_krajina | 36 | 0.281 | 0.359 | 0.066 | 0.410 |
| RS/vrs_east_bosnian | 10 | 0.296 | 0.386 | 0.191 | 0.411 |
| RS/vrs_sarajevo_romanija | 10 | 0.311 | 0.351 | 0.199 | 0.410 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.220 | 0.233 | 0.233 | 0.233 |
| HRHB/hvo_central_bosnia | 12 | 0.177 | 0.231 | 0.107 | 0.232 |
| HRHB/hvo_tomislavgrad | 7 | 0.222 | 0.225 | 0.225 | 0.231 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | 4.200 | n/a |
| RS | 3.455 | n/a |
| HRHB | 3.250 | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900, DEFEND=0.900, INFILTRATE=0.900 |
| RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650, ATTACK=0.550, STATIC_DEFENSE=0.750 |
| HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800, COORDINATED_STRIKE=0.900, DEFEND=0.850 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 124 | 97350 | 100 | 287 | 9 |
| RS | 83 | 66400 | 179 | 452 | 124 |
| HRHB | 40 | 36200 | 103 | 214 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 1 | 99 | 0 | 261 | 36 | 0 |
| RS | 1 | 161 | 16 | 23 | 386 | 43 |
| HRHB | 32 | 63 | 8 | 202 | 10 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30550 | 29 | 196 |
| RBiH/arbih_1st_corps | 36 | 29100 | 32 | 50 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 10 | 11 |
| RS/vrs_1st_krajina | 36 | 28800 | 64 | 211 |
| RS/vrs_east_bosnian | 10 | 8000 | 38 | 75 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 43 | 50 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 92 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 2 | 8 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 54 | 94 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 5 | 1 |
| 0-40w | RS | 12 | 28 | 27 | 27 | 3 | 4 | 0 | 10 | 7 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 3 | 3 | 1 | 1 | 0 | 1 | 0 | 2 | 0 | 0 | 3 | 1 |
| 40-104w | RS | 6 | 2 | 0 | 0 | 0 | 4 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RS | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 156-188w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 2 |

### Run: apr1992_definitive_188w__210e69404d054959__w188_n1587
- weeks: 188
- final_state_hash: `09fc9beb9f0004c3`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 124 | 0.092 | 0.063 | 0.059 | 0.098 | 0.050 | 0.503 |
| RS | 83 | 0.261 | 0.320 | 0.050 | 0.406 | 0.050 | 0.704 |
| HRHB | 40 | 0.212 | 0.232 | 0.225 | 0.233 | 0.050 | 0.500 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.113 | 0.077 | 0.062 | 0.139 |
| RBiH/arbih_1st_corps | 36 | 0.089 | 0.063 | 0.061 | 0.064 |
| RBiH/arbih_3rd_corps | 26 | 0.073 | 0.059 | 0.056 | 0.064 |
| RS/vrs_1st_krajina | 36 | 0.278 | 0.355 | 0.062 | 0.405 |
| RS/vrs_east_bosnian | 10 | 0.294 | 0.381 | 0.188 | 0.406 |
| RS/vrs_sarajevo_romanija | 10 | 0.308 | 0.351 | 0.195 | 0.405 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.220 | 0.233 | 0.233 | 0.233 |
| HRHB/hvo_central_bosnia | 12 | 0.178 | 0.232 | 0.107 | 0.232 |
| HRHB/hvo_tomislavgrad | 7 | 0.222 | 0.225 | 0.225 | 0.231 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | 4.200 | n/a |
| RS | 3.400 | n/a |
| HRHB | 3.250 | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900, DEFEND=0.900, INFILTRATE=0.900 |
| RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650, ATTACK=0.550, STATIC_DEFENSE=0.750 |
| HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800, COORDINATED_STRIKE=0.900, DEFEND=0.850 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 124 | 97350 | 100 | 294 | 9 |
| RS | 83 | 66400 | 179 | 446 | 124 |
| HRHB | 40 | 36200 | 103 | 215 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 1 | 99 | 0 | 268 | 35 | 0 |
| RS | 1 | 162 | 15 | 19 | 387 | 41 |
| HRHB | 32 | 64 | 8 | 203 | 10 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30550 | 29 | 203 |
| RBiH/arbih_1st_corps | 36 | 29100 | 32 | 50 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 10 | 11 |
| RS/vrs_1st_krajina | 36 | 28800 | 64 | 211 |
| RS/vrs_east_bosnian | 10 | 8000 | 38 | 69 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 43 | 50 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 93 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 2 | 8 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 54 | 94 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 5 | 1 |
| 0-40w | RS | 12 | 28 | 27 | 27 | 3 | 4 | 0 | 10 | 7 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 3 | 3 | 1 | 1 | 0 | 1 | 0 | 2 | 0 | 0 | 3 | 1 |
| 40-104w | RS | 6 | 2 | 0 | 0 | 0 | 4 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RS | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
