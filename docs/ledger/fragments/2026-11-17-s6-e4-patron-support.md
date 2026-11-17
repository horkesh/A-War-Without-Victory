## 2026-11-17 — §6 E4: one patron-support semantics; one carrier per patron change; Belgrade's break follows a rejection

**Why.** The `patron_pressure` event effect wrote the patron's `support_level`, which is the `patron_confidence` base. But the 1992-95 condemnation, UN, NATO and atrocity cards were written in the pressure convention, so each one raised the perpetrator's patron backing: RS cards added +261, and RS ended at 91.5. That is a reward for atrocity (Ring 3 #4).

The first fix removed the masking and exposed three faults:
- 30 scopes charged the same patron change twice;
- four carriers charged Belgrade's break, one of them an endless decay;
- the break fired whatever RS answered.

RS then sat below 30 patron confidence from May 1993 and lost all support by t168. The record shows the opposite: Belgrade backed VOPP and Owen-Stoltenberg, and kept paying after the August 1994 blockade (BB1 pp.44, 45, 59).

**Ruling.** §6 E4, five rounds, every one unanimous. Record: SHDG §6 "Record (§6 E4 …)".
- Rounds 1-2: six seats (historian, canon-compliance, game designer, engine/systems, scenario-tester, red-team).
- Rounds 3-4: the same six seats plus the narrative designer.
- Round 5: historian, red-team, engine/systems.

**Change.**
- **Semantics:** the kind is renamed `patron_support`; positive means the patron's backing rises. Pressure-convention rows are dropped or set row by row. Support-convention rows are allowlisted with a reason.
- **One carrier:**
  - a scope with `patron_support` for a faction carries no `patron_confidence` shift for it (loader `validateOnePatronCarrier`; 24 twins stripped);
  - both bot scorers count the support delta at the confidence weight;
  - a scripted patron event and a card never both carry the same change.
- **One writer:** `applyPatronSupportDelta` handles the event effect, the patron events and the plan-rejection cost. A cost below the floor spills into `patron_confidence`.
- **Belgrade's break:**
  - the sanctions decay is retired;
  - `CONTACT_GROUP_REJECTION` and `belgrade_embargo_rs_1994` require RS's rejection on the plan record (new condition kind `peace_plan_response`);
  - one card carrier per faction.
- **Deliberate Force (round 5):**
  - `NATO_BOMBING` keeps override +20 and loses support −20;
  - `csq_alternative_nato_trigger_1995` loses support −10;
  - the compliance card is the one carrier.
- **Q2 rows**, ruled on the record: RS posture, VOPP override, Abdić, HVO coordination and the three address rows (copy rewritten).
- **Copy:** the narrative seat's strings. The `rbih_state_identity` reviewed-contract pin is re-pinned (strings only).
- **Save migration v42.**
- **Docs:** Systems Manual §7.10.1/§7.10.3/§7.10.7, WAR_TERMINATION_SPEC, Rulebook §14.1, authoring guide §4/§5.2, SAVE_SCHEMA_EVOLUTION v42.

**Measured** (188w; base E2 `c7f9cefc`).
- Historical `315a1593467de40b` (determinism twin equal) and emergent `9df2a93a98838988`.
- Guards intact. Checkpoints 709/709/708/682, equal to the base.
- 4 final cells change.
- RS support holds at 35 from the t118 break to the end, and RS never drops below 30 confidence.
- RBiH weeks below 30 fall from 98 to 26.
- The break and the embargo keep their hands-off weeks (t118, t121), and fired events equal the base.
- Spill: 0.
- One bot decision changes: RBiH's front visit at t91.

**Registered:**
- The NATO_BOMBING description and week.
- The Holbrooke card carries an override change as confidence.
- The t119 phase-order artifact behind the back-channel and equipment-delivery cards.
- The ungated Deliberate Force compliance card.
- HRHB confidence saturation.
- `WASHINGTON_AGREEMENT` without `requires`.
- Override writes that do not persist.
- The items from rounds 3-4.
