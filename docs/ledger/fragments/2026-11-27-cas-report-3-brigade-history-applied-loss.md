## 2026-11-27 — CAS-REPORT-3: brigade history, the turn summary and capital read each brigade's applied loss

Authority: orchestrator ruling §21 (MUST-FIX, pre-freeze; the same false-record class as §15/§16). Seats: systems AMEND (applied), game-designer GO (wording applied), scenario-creator-runner-tester GO. Hash-moving (records only on the measured runs).

**Change.**
- `evaluateAndApplyMoraleAbsorption` also returns the extra applied to each attacker brigade. The resolver builds per-brigade applied-loss maps (attacker: casualty share plus absorption extra; defender: share, the primary also taking the extra) and passes them, with the record totals, to `recordBattleHistory`.
- Brigade history engagement rows therefore hold each brigade's own applied loss. Before, they held the pre-absorption figures and split the attacker loss evenly. Every defender that lost men gets a row. The AAR narrative queue reads the record totals.
- Through brigade history, the turn-summary casualty totals and `compute_capital`'s `military_casualties_taken` / `military_casualties_inflicted` now read the applied loss.
- Canon: Systems Manual brigade-history paragraph. FORAWWV unchanged.
- Tests: `tests/battle_record_absorption_extras.test.ts` (engagement rows equal each brigade's personnel drop; red before: 518 vs 740), `tests/attack_post_battle_effects.test.ts`.

**Measured.** 188w pair on main 55cafb82b + CAS-REPORT-3: hist `da0df7577544c3c0`, emer `7284a48cc5a2befa` (main c4289172048c5b87 / 656d69e6db269a6d); baselines re-pinned. Against main in both modes, control_delta, formation_delta, activity_summary, watched_operations and weekly_report are byte-identical: battles 469/470, checkpoints 692/690/687/657, the same 182 events at the same weeks. Consistency PASS, health --strict PASS (idle 33), Washington t99. §26 gates green, tripwire clear; the SHAPE rows equal main's (one path: Brijesnica t163, Spreča). Faction capital (hist; emer within a few men):

| | taken before → after | inflicted before → after |
|---|---|---|
| RBiH | 362,762 → 369,456 | 89,408 → 96,125 |
| RS | 138,977 → 145,904 | 203,926 → 211,092 |
| HRHB | 47,884 → 49,263 | 19,068 → 20,080 |

No other capital field moves, and no event or capital-driven decision changes on these runs (the ruling expected behaviour could move through capital; it did not). About 40 `arc_transitions` (narrative war-story arcs) move; arcs feed no mechanic (traced: display and records only). Calibration on hold: recorded, not tuned.
