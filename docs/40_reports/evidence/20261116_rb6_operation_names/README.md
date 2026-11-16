# RB6: bot operation-name pools hold fictional names only

`src/sim/combat/operation_names.ts` draws bot-generated operation names from three fictional pools. The historian found that 13 slots held either a real operation name or a loaded one, so a generated ARBiH operation called "Oluja" or "Bljesak" told the player something false and "Džihad" attached a loaded label to ordinary ARBiH operations. Owner ruling (via the orchestrator): replace all of them, in their slots.

| Pool | Slot's old name | Why | New name (gloss) |
| --- | --- | --- | --- |
| RS | Vihor | real Croatian Operation Vihor (Banija, December 1991; BB Vol. II) | Granit (granite) |
| RS | Odmazda | retribution; evokes reprisals against civilians | Smreka (spruce) |
| RS | Udar | real VRS Operation Udar (Cerska, January-February 1993; Karadžić trial judgment para 4954) | Nasip (embankment) |
| RBiH | Sabur | real ARBiH Operation Sabur-95 (Delić trial judgment para 393) | Temelj (foundation) |
| RBiH | Hajka | hunt of people: dehumanising hunting language | Ždral (crane, bird) |
| RBiH | Oluja | real HV Operation Oluja / Storm, August 1995 | Snijeg (snow) |
| RBiH | **Džihad** | **never an ARBiH operation (no hit in BB Vol. I and II, the KB or any ICTY judgment read); the ICTY uses "jihad" only for the foreign El Mujahed Detachment, and Serb rhetoric used "mujahedin" as a smear for all Muslims (Mladić trial judgment para 3703)** | Prevoj (mountain pass) |
| RBiH | Gazija | honorific of a warrior of the faith: reads as holy-war framing | Vedrina (clear weather) |
| RBiH | Grad | also the BM-21 Grad rocket launcher of the VRS and JNA | Magla (fog) |
| HRHB | Bljesak | real HV Operation Bljesak / Flash, May 1995 | Bujica (torrent) |
| HRHB | Vihor | as above | Mećava (blizzard) |
| HRHB | Udar | as above | Mlaz (jet, stream) |
| HRHB | Proboj | real VRS Operation Proboj (December 1992, Directive 4; Karadžić para 4948) | Zalet (run-up) |

Each replacement has zero hits in the three pools, the reserved list, the authored operation catalogues, BB Vol. I and II and the ICTY texts the historian could reach; each is neutral (geography, terrain, weather, neutral nouns) and in the documented style of its faction pool; two fallbacks per slot and the rejected candidates (Okop was a real 1991 JNA exercise name, Lasta an RS police battalion, Nalet an air-raid term) are in `historian_replacements.md`. Full search method, sources and the ARBiH naming conventions: `historian_note_dzihad.md`. Narrative seat: the names read naturally in the pool's registers.

**Deterministic**: each replacement sits in its original slot; pool lengths (38 / 39 / 35) are unchanged and selection uses the hash modulo the pool length, so only a run that draws one of these slots changes its label. A save that holds an old name in `used_operation_names` stays harmless. `tests/operation_names_no_real_operations.test.ts` pins the slots, the lengths and the absence of every removed name.

**Quotes of the old names elsewhere**: none in live source, events, essays or Chronicle templates (the real Oluja and Bljesak mentions in the Codex essays and the BCS "storm" label are the historical operations and stay). One test fixture, `tests/ui/settlement_timeline_i18n.test.ts`, uses "Operacija Proboj" as a display-name string and does not read the pool. Measured-run evidence in CALIBRATION_MASTER, the ledger and audits keeps the old names (history); rename map: Vihor→Granit (RS) / Mećava (HRHB), Odmazda→Smreka, Udar→Nasip (RS) / Mlaz (HRHB), Sabur→Temelj, Hajka→Ždral, Oluja→Snijeg, Džihad→Prevoj, Gazija→Vedrina, Grad→Magla, Bljesak→Bujica, Proboj→Zalet.

**Not changed (historian register, no source collision proven)**: Kopljem, Zavet, Ihlas (RBiH) and Bor (RS; a 1990 Slovenian arms shipment) remain in the pools for the owner's call.

## Measured pass

See the PR description for the 188-week hash against a clean `origin/main` run at the same commit.

### Result (one measured 188-week pass, this branch against a clean `origin/main` run at the same commit)

- Final state hash: `1391f69248072728` (this change) against `70f4dc05bf375bc7` (main). The hash moves, as expected for a rename of labels that live in state.
- 8 of 15 artifacts byte-identical (activity summary, control delta, destroyed brigades, displacement log, formation delta, initial save, replay manifest, watched operations). `brigade_temporal_log.jsonl`, `end_report.md`, `operation_aars.json` and `weekly_report.jsonl` are byte-identical once the new names are mapped back to the old ones (the labels only).
- `final_save.json`: after mapping the new names back and sorting object keys (`used_operation_names` is a keyed map, so renaming changes its key order), **zero differences**. `run_summary.json`: the only difference is `final_state_hash`. So the state moved by the labels alone: no territory, control, formation, displacement or checkpoint value changed.
- Slots actually drawn in the 188-week run: Prevoj 12 mentions, Granit, Smreka, Nasip, Temelj, Vedrina and Magla once each (the other seven new names were not drawn in this run).
