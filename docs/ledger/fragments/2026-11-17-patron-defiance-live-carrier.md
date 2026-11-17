## 2026-11-17 — Patron defiance: a defiance answer carries one live combat cut (patron_supply_cut)

**Why.** Defying a patron (Zagreb for HRHB, Belgrade for RS) recorded a "defiance supply cut" that lowered `material_support_level`, whose only engine reader was the retired supply-reserve module. So defiance cost nothing in combat while the cards promised "the cost is borne at the front". Measured on E4 head `cbd683997`: the per-turn term was not a defiance signal. A hands-off emergent RS that answered every Belgrade demand with compliance logged 90 weeks of "defiance cuts" (t56-t188, 7-12%), and every played HRHB game was charged from turn 4 for the 1992 compact answers, which already carry their own live combat cut.

**Ruling.** Patron-defiance panel, game designer, historian and engine seats, two rounds (R1 3 of 3; R2 sizes 2 of 3, the game designer asking 26 weeks for `defy_belgrade_directive`; everything else 3 of 3). Liveness measured first: 40w historical, RS combat power ×0.95 moved the hash and cost 1.6% of RS personnel; recruitment ×0.9 moved the hash and cost 0.3%.

**Change.**
- New effect kind `patron_supply_cut {faction, multiplier, duration_turns, tag}`: one `equipment_quality_modifiers` entry (`source: 'patron_supply_cut'`) read by the combat-power reader, plus one receipt per answer. The reader floors a faction's combined patron cuts (RS 0.85, HRHB 0.75) on read.
- Thirteen defiance answers carry it (Systems Manual §7.10.3 has the table). `united_front` and `formal_alliance_persists` move to the new kind with their same numbers. `belgrade_embargo_rs_1994#defiant` swaps recruitment ×0.9/52 for ×0.93/26.
- Loader `validatePatronSupplyCut`: options only, never the historical default, RS/HRHB, 0 < multiplier < 1, tag `<event>#<option>`, a negative patron move on the same option, one material carrier.
- The per-turn term in `updatePatronState` is retired; `material_support_level` is a display value.
- Save v43: pending decisions get their cut; pre-panel receipts (no tag) are dropped.
- Copy (EN + BCS): the decision card shows the price before the choice; the patron panel, ledger, timeline and turn aftermath show the cut, its end week and, when it binds, the floor. No "support to the front fell", no promise of lost ground.

**Measured (alone, E4 head).** Historical 188w `28f02e09cda50cd6` → `ac824789cc0b3ad6`: the final save differs only in `schema_version`. Emergent 188w `eced6db612c514b7` → `637be6c7e4a75100`: also RS `material_support_level` and the absent per-turn receipts. Both 709/709/708/682, every guard intact, cascade 31. No hands-off answer changes (no bot scorer reads a multiplier), so nothing moves after w118. Played A2b / Path A' probes (E4 + main): A, B, C, ack and refuse keep their outcomes (Path C t102; war t71 / t102; t105 / t150 / t154; refuse t116 / t120). Played RS probe, VOPP refusal at t54 (×0.95/13): the VRS is 3.1% smaller by week 100 (122,426 vs 126,370), map unchanged.

**Known limits.** The 1994 Zagreb-ceasefire refusal cut is live but costs no ground in the played probes, because no one attacks the HVO after week 89 (HVO passivity, an engine gap). Equipment entries a mid-war save already applied stay unfloored until they expire. A live cost for the hands-off August 1994 blockade is a separate measured change.
