## 2026-11-17 — §6: the RS back-channel card no longer locks the RBiH-HRHB alliance; loader guard for alliance effects (byte-identical left alone)

**Why.** `csq_back_channel_communication_RS` carried an `alliance_lock` floor of 0.15 for 25 turns. `alliance_lock` and `alliance_change` move only the RBiH-HRHB alliance, so this RS card propped up the Federation; it looks copied from the RBiH variant. The washington-2 lane measured that in play the card fires at t68 for a careless cooperative HRHB President and holds the alliance at 0.15 for 25 turns, so the Croat-Bosniak war comes only at t98. The historian found the card's premise unsupported after August 1994 (s6_belgrade_cards_historian.md).

**Ruling.** Orchestrator, 2026-11-17: pull this one card-batch item forward as a small early PR, with a catalog guard so it cannot recur.

**Change.**
- `consequences.json`: the `alliance_lock` is removed from `csq_back_channel_communication_RS`. Its other effects stay.
- `event_loader.ts`: new pass `validateAllianceEffectParties`. An alliance effect on a row whose `responding_faction` is not RBiH or HRHB fails the load, in `effect`, `effects[]` or any response option. A row with no `responding_faction` is global (for example `csq_early_peace_acceptance_w120`, which floors the alliance at 0 after a peace plan is accepted).
- The closed allowlist `NON_PARTY_ALLIANCE_EFFECT_ALLOWLIST` holds three authored RS choice options. Each is counterfactual and is never chosen hands-off in historical mode. They are held for the §6 card batch:
  - `rs_autonomy_path_decision_1993#accept_federation_status`;
  - `rs_owen_stoltenberg_response_1993#accept_with_modifications`;
  - `rs_washington_rejection_1994#propose_trilateral`, whose copy says the alliance "frays" while its effect raises it.
  A test fails if an entry stops matching, so the list can only shrink.
- Authoring guide §4: the new pass.

**Known gap, for the card batch.** The card's audit annotation still reads "soft alliance floor 0.15 for 25 turns".
- On current main the card fires hands-off at t119, and the annotation text is stored in the save, so changing it here would move the hash.
- After #797 and #804 the card no longer fires hands-off, and the copy fix becomes hash-neutral. The card batch already fixes or retires this card's copy.

**Measured** (official runner, base main 0e310a5fc): every run artifact is byte-identical in both modes, except `run_meta.json` (output folder, input digest, dirty flag).
- final_save: historical 964ab22c838c94a8, emergent 32f70252f45bebc4.
- On main the card still fires at t119. The identical outputs show its lock was inert in both hands-off runs. The lock expires at t144 and is then pruned from the save.

**Tests.** `tests/event_alliance_effect_parties.test.ts`: the shipped catalog loads; synthetic RS rows fail in `effects`, `effect` and options; RBiH, HRHB and global rows pass; the allowlist is closed and every entry still matches. RED: the guard run on main's catalog throws on exactly `csq_back_channel_communication_RS`. A 66-file slice (every test naming the card, `alliance_lock` or the loader) passes.
