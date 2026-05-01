# Force-Quality Audit Metrics (read-only extraction)

### Run: apr1992_definitive_40w__3649b3861a87e6ea__w40_n1597
- weeks: 40
- final_state_hash: `cbd7d61db0bfbe97`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 116 | 0.266 | 0.290 | 0.232 | 0.322 | 0.050 | 0.487 |
| RS | 83 | 0.536 | 0.588 | 0.499 | 0.643 | 0.064 | 0.897 |
| HRHB | 33 | 0.286 | 0.238 | 0.225 | 0.375 | 0.060 | 0.394 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_1st_corps | 34 | 0.288 | 0.322 | 0.285 | 0.322 |
| RBiH/arbih_2nd_corps | 34 | 0.275 | 0.273 | 0.243 | 0.299 |
| RBiH/arbih_3rd_corps | 27 | 0.227 | 0.233 | 0.135 | 0.299 |
| RS/vrs_1st_krajina | 36 | 0.571 | 0.609 | 0.550 | 0.629 |
| RS/vrs_east_bosnian | 10 | 0.474 | 0.537 | 0.386 | 0.629 |
| RS/vrs_sarajevo_romanija | 10 | 0.567 | 0.612 | 0.533 | 0.647 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.310 | 0.360 | 0.227 | 0.375 |
| HRHB/hvo_central_bosnia | 12 | 0.240 | 0.225 | 0.225 | 0.228 |
| HRHB/hvo_northwest_bosnia | 4 | 0.276 | 0.293 | 0.202 | 0.368 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | 3.167 | n/a |
| RS | 3.364 | n/a |
| HRHB | 3.200 | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1992 | 0.350 | 0.250 | 0.150 | ATTACK=0.500, DEFEND=0.600, INFILTRATE=0.600 |
| RS | 1992 | 0.800 | 0.850 | 0.900 | ARTILLERY_COUNTER=1.000, ATTACK=0.900, STATIC_DEFENSE=0.950 |
| HRHB | 1992 | 0.500 | 0.450 | 0.600 | ATTACK=0.650, DEFEND=0.700 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 116 | 90900 | 55 | 169 | 8 |
| RS | 83 | 66400 | 609 | 1364 | 211 |
| HRHB | 33 | 26600 | 25 | 68 | 4 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 24 | 27 | 5 | 148 | 23 | 0 |
| RS | 332 | 233 | 44 | 1273 | 89 | 2 |
| HRHB | 14 | 12 | 1 | 63 | 8 | 0 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_1st_corps | 34 | 27500 | 30 | 49 |
| RBiH/arbih_2nd_corps | 34 | 25700 | 9 | 69 |
| RBiH/arbih_3rd_corps | 27 | 21650 | 7 | 29 |
| RS/vrs_1st_krajina | 36 | 28800 | 188 | 571 |
| RS/vrs_east_bosnian | 10 | 8000 | 70 | 149 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 212 | 237 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 21 | 47 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 4 | 14 |
| HRHB/hvo_northwest_bosnia | 4 | 3200 | 0 | 2 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 12 | 29 | 35 | 34 | 5 | 4 | 0 | 10 | 6 | 7 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 9 | 1 |

### Run: apr1992_definitive_104w__13abfd609800bba2__w104_n1598
- weeks: 104
- final_state_hash: `f4f03385770f06d1`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 120 | 0.524 | 0.610 | 0.425 | 0.670 | 0.050 | 0.748 |
| RS | 83 | 0.513 | 0.589 | 0.275 | 0.747 | 0.057 | 0.900 |
| HRHB | 40 | 0.441 | 0.492 | 0.225 | 0.622 | 0.060 | 0.632 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 39 | 0.564 | 0.623 | 0.479 | 0.659 |
| RBiH/arbih_1st_corps | 34 | 0.546 | 0.617 | 0.467 | 0.681 |
| RBiH/arbih_3rd_corps | 26 | 0.448 | 0.502 | 0.294 | 0.625 |
| RS/vrs_1st_krajina | 36 | 0.487 | 0.567 | 0.268 | 0.678 |
| RS/vrs_east_bosnian | 10 | 0.572 | 0.626 | 0.484 | 0.791 |
| RS/vrs_sarajevo_romanija | 10 | 0.534 | 0.569 | 0.293 | 0.766 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.567 | 0.622 | 0.615 | 0.631 |
| HRHB/hvo_central_bosnia | 12 | 0.353 | 0.435 | 0.165 | 0.492 |
| HRHB/hvo_tomislavgrad | 7 | 0.387 | 0.282 | 0.225 | 0.559 |

#### 2. Faction officer maturity & capability profile

| Faction | faction_officer_maturity | named-officer mean (if persisted) |
|---|---:|---:|
| RBiH | 4.200 | n/a |
| RS | 3.300 | n/a |
| HRHB | 3.250 | n/a |

Capability profile snapshot (year, training, organizational maturity, key doctrine):

| Faction | year | training | org_mat | equipment | doctrine_summary |
|---|---:|---:|---:|---:|---|
| RBiH | 1994 | 0.750 | 0.700 | 0.400 | ATTACK=0.800, DEFEND=0.850, INFILTRATE=0.850 |
| RS | 1994 | 0.700 | 0.750 | 0.600 | ARTILLERY_COUNTER=0.750, ATTACK=0.650, STATIC_DEFENSE=0.800 |
| HRHB | 1994 | 0.500 | 0.450 | 0.500 | ATTACK=0.550, DEFEND=0.700 |

#### 3. Equipment totals & condition (faction)

| Faction | brigades | infantry | tanks | artillery | AAA |
|---|---:|---:|---:|---:|---:|
| RBiH | 120 | 94150 | 95 | 203 | 9 |
| RS | 83 | 66400 | 218 | 852 | 150 |
| HRHB | 40 | 36200 | 141 | 189 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 5 | 86 | 6 | 154 | 58 | 0 |
| RS | 2 | 181 | 35 | 439 | 373 | 41 |
| HRHB | 91 | 41 | 8 | 173 | 14 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 39 | 29750 | 20 | 121 |
| RBiH/arbih_1st_corps | 34 | 27500 | 31 | 43 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 16 | 14 |
| RS/vrs_1st_krajina | 36 | 28800 | 86 | 309 |
| RS/vrs_east_bosnian | 10 | 8000 | 43 | 111 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 44 | 173 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 69 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 1 | 7 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 86 | 93 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 13 | 26 | 26 | 26 | 3 | 6 | 0 | 9 | 6 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 8 | 11 | 5 | 5 | 2 | 2 | 0 | 5 | 3 | 0 | 8 | 1 |
| 40-104w | RS | 5 | 9 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Run: _phase5a_w156_from_188w
- weeks: 156
- final_state_hash: `6e76cc614062ac18`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 122 | 0.737 | 0.838 | 0.650 | 0.900 | 0.050 | 0.900 |
| RS | 83 | 0.517 | 0.564 | 0.256 | 0.731 | 0.057 | 0.900 |
| HRHB | 40 | 0.572 | 0.676 | 0.315 | 0.791 | 0.060 | 0.799 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.779 | 0.865 | 0.689 | 0.893 |
| RBiH/arbih_1st_corps | 34 | 0.759 | 0.857 | 0.714 | 0.900 |
| RBiH/arbih_3rd_corps | 26 | 0.676 | 0.768 | 0.597 | 0.869 |
| RS/vrs_1st_krajina | 36 | 0.503 | 0.558 | 0.269 | 0.718 |
| RS/vrs_east_bosnian | 10 | 0.588 | 0.627 | 0.368 | 0.792 |
| RS/vrs_sarajevo_romanija | 10 | 0.608 | 0.636 | 0.332 | 0.873 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.742 | 0.790 | 0.784 | 0.798 |
| HRHB/hvo_central_bosnia | 12 | 0.482 | 0.626 | 0.229 | 0.676 |
| HRHB/hvo_tomislavgrad | 7 | 0.491 | 0.492 | 0.225 | 0.735 |

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
| RBiH | 122 | 95750 | 103 | 240 | 9 |
| RS | 83 | 66400 | 181 | 468 | 124 |
| HRHB | 40 | 36200 | 127 | 205 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 1 | 101 | 1 | 198 | 53 | 0 |
| RS | 1 | 159 | 21 | 49 | 367 | 52 |
| HRHB | 52 | 66 | 9 | 193 | 10 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30550 | 23 | 163 |
| RBiH/arbih_1st_corps | 34 | 27500 | 35 | 40 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 16 | 13 |
| RS/vrs_1st_krajina | 36 | 28800 | 63 | 170 |
| RS/vrs_east_bosnian | 10 | 8000 | 40 | 78 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 44 | 103 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 85 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 1 | 7 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 79 | 93 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 13 | 26 | 26 | 26 | 3 | 6 | 0 | 9 | 6 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 8 | 11 | 5 | 5 | 2 | 2 | 0 | 5 | 3 | 0 | 8 | 1 |
| 40-104w | RS | 5 | 9 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 3 | 6 | 1 | 1 | 0 | 0 | 0 | 3 | 0 | 0 | 4 | 1 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### Run: _phase5a_w183_from_188w
- weeks: 183
- final_state_hash: `3eafd8bd62084418`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 124 | 0.797 | 0.900 | 0.763 | 0.900 | 0.050 | 0.900 |
| RS | 83 | 0.546 | 0.583 | 0.281 | 0.783 | 0.057 | 0.900 |
| HRHB | 40 | 0.636 | 0.762 | 0.425 | 0.870 | 0.060 | 0.877 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.841 | 0.900 | 0.815 | 0.900 |
| RBiH/arbih_1st_corps | 36 | 0.799 | 0.900 | 0.780 | 0.900 |
| RBiH/arbih_3rd_corps | 26 | 0.752 | 0.881 | 0.732 | 0.900 |
| RS/vrs_1st_krajina | 36 | 0.540 | 0.559 | 0.282 | 0.745 |
| RS/vrs_east_bosnian | 10 | 0.622 | 0.659 | 0.427 | 0.848 |
| RS/vrs_sarajevo_romanija | 10 | 0.636 | 0.668 | 0.409 | 0.897 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.824 | 0.869 | 0.864 | 0.877 |
| HRHB/hvo_central_bosnia | 12 | 0.550 | 0.716 | 0.316 | 0.762 |
| HRHB/hvo_tomislavgrad | 7 | 0.540 | 0.590 | 0.225 | 0.818 |

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
| RBiH | 124 | 97350 | 103 | 263 | 9 |
| RS | 83 | 66400 | 172 | 423 | 119 |
| HRHB | 40 | 36200 | 101 | 212 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 1 | 102 | 0 | 236 | 38 | 0 |
| RS | 1 | 155 | 16 | 16 | 366 | 41 |
| HRHB | 32 | 61 | 8 | 200 | 10 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30550 | 23 | 184 |
| RBiH/arbih_1st_corps | 36 | 29100 | 35 | 42 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 16 | 13 |
| RS/vrs_1st_krajina | 36 | 28800 | 63 | 170 |
| RS/vrs_east_bosnian | 10 | 8000 | 40 | 78 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 44 | 69 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 92 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 1 | 7 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 54 | 93 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 13 | 26 | 26 | 26 | 3 | 6 | 0 | 9 | 6 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 8 | 11 | 5 | 5 | 2 | 2 | 0 | 5 | 3 | 0 | 8 | 1 |
| 40-104w | RS | 5 | 9 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 3 | 6 | 1 | 1 | 0 | 0 | 0 | 3 | 0 | 0 | 4 | 1 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RBiH | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 1 | 9 | 3 |
| 156-188w | RS | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 156-188w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 2 |

### Run: apr1992_definitive_188w__210e69404d054959__w188_n1599
- weeks: 188
- final_state_hash: `2c851756827d5906`

#### 1. Officer quality (brigade-level)

| Faction | n | mean | median | p25 | p75 | min | max |
|---|---:|---:|---:|---:|---:|---:|---:|
| RBiH | 124 | 0.806 | 0.900 | 0.786 | 0.900 | 0.050 | 0.900 |
| RS | 83 | 0.549 | 0.583 | 0.288 | 0.794 | 0.057 | 0.900 |
| HRHB | 40 | 0.648 | 0.778 | 0.444 | 0.884 | 0.060 | 0.891 |

Per-corps officer quality (top 3 by brigade count per faction):

| Corps | n | mean | median | p25 | p75 |
|---|---:|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 0.849 | 0.900 | 0.838 | 0.900 |
| RBiH/arbih_1st_corps | 36 | 0.808 | 0.900 | 0.803 | 0.900 |
| RBiH/arbih_3rd_corps | 26 | 0.762 | 0.891 | 0.756 | 0.900 |
| RS/vrs_1st_krajina | 36 | 0.543 | 0.559 | 0.294 | 0.756 |
| RS/vrs_east_bosnian | 10 | 0.628 | 0.665 | 0.437 | 0.858 |
| RS/vrs_sarajevo_romanija | 10 | 0.641 | 0.674 | 0.423 | 0.899 |
| HRHB/hvo_southeast_herzegovina | 14 | 0.839 | 0.883 | 0.878 | 0.891 |
| HRHB/hvo_central_bosnia | 12 | 0.563 | 0.732 | 0.331 | 0.778 |
| HRHB/hvo_tomislavgrad | 7 | 0.548 | 0.608 | 0.225 | 0.832 |

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
| RBiH | 124 | 97350 | 103 | 270 | 9 |
| RS | 83 | 66400 | 172 | 423 | 119 |
| HRHB | 40 | 36200 | 101 | 213 | 21 |

Equipment condition (count-weighted; tank_op = sum of fraction-operational × tanks per brigade):

| Faction | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---:|---:|---:|---:|---:|---:|
| RBiH | 1 | 102 | 0 | 246 | 35 | 0 |
| RS | 1 | 156 | 15 | 14 | 370 | 39 |
| HRHB | 31 | 62 | 8 | 201 | 10 | 2 |

Per-corps equipment (top 3 by brigade count per faction):

| Corps | brigades | infantry | tanks | artillery |
|---|---:|---:|---:|---:|
| RBiH/arbih_2nd_corps | 40 | 30550 | 23 | 191 |
| RBiH/arbih_1st_corps | 36 | 29100 | 35 | 42 |
| RBiH/arbih_3rd_corps | 26 | 20850 | 16 | 13 |
| RS/vrs_1st_krajina | 36 | 28800 | 63 | 170 |
| RS/vrs_east_bosnian | 10 | 8000 | 40 | 78 |
| RS/vrs_sarajevo_romanija | 10 | 8000 | 44 | 69 |
| HRHB/hvo_southeast_herzegovina | 14 | 11350 | 17 | 93 |
| HRHB/hvo_central_bosnia | 12 | 9650 | 1 | 7 |
| HRHB/hvo_tomislavgrad | 7 | 9600 | 54 | 93 |

#### 4-7. Operations by faction × date window

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w | RBiH | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w | RS | 13 | 26 | 26 | 26 | 3 | 6 | 0 | 9 | 6 | 9 | 8 | 3 |
| 0-40w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w | RBiH | 8 | 11 | 5 | 5 | 2 | 2 | 0 | 5 | 3 | 0 | 8 | 1 |
| 40-104w | RS | 5 | 9 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w | RS | 3 | 6 | 1 | 1 | 0 | 0 | 0 | 3 | 0 | 0 | 4 | 1 |
| 104-156w | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | RBiH | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 1 | 9 | 3 |
| 156-188w | RS | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 156-188w | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 2 |

