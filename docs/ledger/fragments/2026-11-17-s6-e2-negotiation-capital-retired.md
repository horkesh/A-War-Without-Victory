## 2026-11-17 — §6 E2: the dead `negotiation_capital` event effect is retired; the ruled atrocity and diplomacy costs are live standing shifts

**Why.** The `negotiation_capital` effect kind was a silent no-op on all 51 rows that used it. `applyNegotiationBreakdown` wrote only to keys of the raw `NegotiationBreakdown` counters, and none of the three dimension names it was given (`international_credibility` ×40, `negotiating_leverage` ×10, `military_credibility` ×1) is such a key. The cards still printed those costs. For six atrocity cards it was the only cost carrier, so the player was told of an international cost that the engine never applied: Ahmići, the Stari Most destruction, Markale 1994 and 1995, Srebrenica and Žepa.

**Ruling.** §6 E2, unanimous over two rounds. Seats: engine/systems, canon-compliance, game designer, historian; scenario-tester and red-team for the §6 gate. Record: SHDG §6 "Record (§6 E2 …)".

**Change.**
- Data: every `negotiation_capital` effect is deleted. Each one is either made live as a `dimension_shifts` entry or dropped, so there is one carrier per effect.
  - Made live (international_standing): Ahmići HRHB −25; Srebrenica falls RS −30; Žepa RS −10; Markale 1994 RS −15 and 1995 RS −20 (swapped on the historian's attribution record); Stari Most HRHB −10, an international reaction to the cultural loss and not a crime (Prlić et al. AJ, IT-04-74-A, 2017, cited; "UNESCO-recognized" removed, the bridge was inscribed in 2005); the HRHB Washington card credits HRHB +10 / +3, not RBiH.
  - Made live (negotiating_leverage): political split RBiH −3 and RS −3; mediator engagement streak +4 for each side.
  - Dropped: the three peace-plan cards' accept/reject (the plan resolution already carries them), the HRHB political split (its live leverage −3 carries it), and the 31 rows whose live same-target twin already carries the cost.
  - The Srebrenica patron event's −30 now applies only when the card has not fired (`humanitarian_delta_unless_event_fired`), so the cost is paid once.
- Engine: the loader rejects the kind; `applySingleEffect` throws on an unknown kind; `applyDimensionShift` throws on an unknown dimension id (a missing store stays a quiet no-op).
- Save migration **v41** strips the kind from pending decisions. Known limit: a decision pending at upgrade loses the converted shift.
- UI: the automatic-card acknowledgement list shows the card's own standing and leverage shifts. The retired kind's copy and i18n keys are deleted.
- Notice audience (#784): the audience rule reads a consequence card's faction from its `effects`, and `csq_force_quality_inversion` named RS only through the dead effect. It now authors `audience: ["RS"]`, the audience #784 ruled; a full diff of every card's resolved audience against main shows no other change.
- Docs: Systems Manual §7.10.3, authoring guide §4/§5.2/§5.3, SAVE_SCHEMA_EVOLUTION v41, open_gates (Grabovica entry resolved).

**Measured (188w, on main `5d0a951e1`; main pins 2c63bd10fecd6bc7 / bfcbfa55dd206585 reproduced).**
- Historical `c7f9cefc4c0e1a37` and emergent `396922770611e479`: both 709/709/708/682, guards intact (Farz P1, P-A, P-B), control_delta byte-identical to main, 181 fired events identical with identical counts.
- The only state change is the standing accumulator: RS −295 → −340 (historical) and −275 → −320 (emergent); HRHB −64 → −89. Effective standing is unchanged for every side (RS and HRHB at the floor, RBiH at the ceiling). E3 (saturation) decides whether these costs bite; E2 makes them real.
- Baselines manifest re-pinned in this PR.

**Follow-up: the Srebrenica standing cost is charged once (Codex P2 on #793; three §6 seats, unanimous).**
- **The defect.** A combat fall at or after w170 let the aftermath charge −30. An RBiH retake then let the card fire, script a second fall and charge −30 again.
- **The fix:** one fall, one record, one cost.
  - The genocide rupture now sets `srebrenica_fell` at a combat fall.
  - The card requires that flag unset, so no scripted second fall follows a retake.
  - The aftermath also fires on a recorded fall, so a combat fall at t160-169 retaken before w170 still pays −30 once.
  - The three cards that say Srebrenica holds no longer fire after a recorded fall.
- **Tests:** `s6_e2_negotiation_capital_retired` (4)-(6).
- **Measured on main `ffe0fdb50`** (pin `6dbecd4913d6d7df` reproduced): historical `3e0e76d8a0197ae5` and emergent `c3437e5ffc7bd5dd`. Control is byte-identical to main, fired events and decisions are identical, 709/709/708/682, guards intact. Re-pinned.
- **Registered for the card batch:** the Drina double charge (`drina_cleansing_decision_1992#systematic`), the HVO camps weight, Markale I's early-NATO card firing after Markale, and the hands-off order of "The Enclave Holds". **For E3:** atrocity standing is charged through both the war-crimes base and the card shift.
