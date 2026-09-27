# Western-cascade attribution: retained POST-A vs local occupation

The eight-municipality score falls **33 → 25**. This is **11 newly lost matches offset by 3 recoveries**, not eight single-cell losses. The unchanged acceptance floor of 38 remains unmet.

| Municipality | POST-A | New | Change |
|---|---:|---:|---|
| Bosansko Grahovo | 3/4 | 4/4 | +1 Ugarci |
| Šipovo | 5/5 | 5/5 | 0 |
| Glamoč | 6/6 | 3/6 | -3 |
| Titov Drvar | 3/3 | 0/3 | -3 |
| Bosanski Petrovac | 7/8 | 8/8 | +1 Jasenovac |
| Mrkonjić Grad | 5/6 | 0/6 | -5 |
| Ključ | 2/7 | 3/7 | +1 Hadžići |
| Sanski Most | 2/10 | 2/10 | 0 |

The closest supported cause is operation scheduling and participant ownership:

- **Mistral 1 / Glamoč (-3):** POST-A Mistral 1 starts at t160 with `F_HRHB_0001`, Kralj Petar Krešimir IV, and HV 4th Guards and captures Kovačevci, Halapić, and Štekerovci. In the new run, it starts at the same turn with only `F_HRHB_0001` and HVO 1st Guard ABB, records `zero_eligible_axis`, zero attacks, and zero captures. The brigade log proves a real same-turn collision: candidate `Operacija Guja` owns Kralj Petar, HV 4th, HV 5th, and HV 7th at t160. Kralj Petar and HV 4th are precisely the baseline Mistral participants missing from the candidate roster. Guja is a four-brigade ordinary emergent operation, not a one-brigade local occupation.
- **Mistral 2 / Drvar (-3, Grahovo +1):** POST-A Mistral 2's first axis begins with Prekaja, Drvar, and Šipovljani and captures all three at t177-t180. The candidate's retained Mistral 2 objectives omit Titov Drvar entirely; it instead completes four Grahovo and five Šipovo objectives, recovering Ugarci. The artifacts establish the changed authored objective set after failed Mistral 1, but do not expose the exact predicate that omitted Drvar.
- **Southern Move / Mrkonjić Grad (-4):** POST-A starts at t182, reaches execution t185, and captures Gerzovo, Majdan, Podrašnica, and Mrkonjić Grad through t188. The candidate starts at t185 and remains planning at t188 with zero attacks. Its six-person roster includes HV 4th Guards and Rama while their temporal rows still report Mistral 2 recovery at t185-t186. The start delay and historical-operation overlap are real; the saves do not identify a single exclusive trigger or slot cause.
- **Operation Sana (+2):** start turn and ten-person roster are unchanged. Its Bihać-Petrovac axis advances one objective farther, capturing Jasenovac at t187 and Hadžići at t188. The stalled Sanski Most/Ključ axis is unchanged. There is no saved evidence of Sana participant loss from the new route.

One loss is directly caused by the new exception: one-brigade VRS `Operacija Bastion` starts at t31 with `rs_1st_gradika_light_infantry` and captures HRHB Baljvine at t32. Baljvine then becomes a sixth Southern Move objective. The other new one-brigade operations do not use any HVO/HV brigade later assigned to Mistral or Southern Move. Thus the artifacts do **not** show direct local-operation theft of the western historical participants. They do show downstream interference at Mistral 1, where a simultaneous generic operation owns two participants that POST-A gave to the historical operation.

Evidence: both runs' `final_save.json`, `operation_aars.json`, and `brigade_temporal_log.jsonl`; current `painted_control_oct1995.json`; and the two checkpoint logs. The retained artifacts prove the proximate capture, objective, and commitment differences. They cannot prove the complete counterfactual chain from the early local occupations to Guja/Mistral/Southern Move without a new run or engine trace, which was outside this diagnosis.
