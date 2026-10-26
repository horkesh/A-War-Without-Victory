# Retained Ajnie participation finding

The prior classification is preserved: the candidate’s only parent-relative 712-map delta is Kolovarice (parent RS, candidate RBiH), and the retained records show no new malformed boundary or illegal actor.

Any characterization of the unchanged 13 health IDs as a lawful baseline is attributed to the prior independent canon/supply review supplied in the task handoff, not to a direct human lawfulness ruling.

The participation difference follows a recorded combat path. Both runs keep `rs_ajnie_brigade` in `vrs_herzegovina:Operation Foca:t4` at Batotići through T13. At T9, candidate Ajnie+Foča stalemates at Kolovarice (ratio 0.72); parent Ajnie+Foča is repulsed (0.69). The candidate then issues Ajnie alone at T10: catastrophic, ratio 0.25, 313 attacker casualties. Parent has no T10 Ajnie order. Candidate Ajnie falls to 505 personnel/cohesion 24.4 and later records `last_repulsed_from` Kolovarice@T10. Its `cajnice_south` axis records one consecutive catastrophe, two consecutive failures, and `launch_blocker: recent_catastrophic_losses_at_objective`.

At T14 the same Foca owner remains recorded in both runs; both enter recovery. Candidate reports `max_failures`, one eligible attacker/order (`rs_foa_brigade`), and a Foča-only stalemate. Parent reports `completed`, two orders (`rs_ajnie_brigade`, `rs_foa_brigade`), and their victory/capture. Candidate Ajnie remains active/readiness active at Batotići in saves 15/16; parent is active at captured Kolovarice. This supports a normal divergent combat/eligibility path under changed fatigue, not an owner/handoff or movement anomaly.

UNREPORTED: the exact T14 predicate that excluded Ajnie, because `axis_reject` was not enabled; any post-T10/pre-T14 save; and any named movement rejection. Temporal rows have blank movement state/destinations, and saves 15/16 contain no Ajnie movement order/state.

`battle_power` was enabled, but source gates `power_breakdown` fields onto battle artifacts via `whenReasonCodeTopic`; it defines no `[battle_power]` stdout emitter. Zero stream markers are expected. The smallest remaining question, only if the owner chooses another bounded run, is the exact T14 `axis_reject` predicate for Ajnie. No replay is authorized here.

The unmet 707 gate leaves this correctness patch unqualified and available to park. This finding does not recommend reverting the confirmed bug fix, tuning thresholds or paint, or adopting the candidate.
