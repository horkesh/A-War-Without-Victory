# Diagnostic G — Orašac operation receipt

Run: `runs/january_operations_20260914/diagnostic_g/apr1992_definitive_188w__9137f75e9f35be20__w39_n0` at clean `ac3e5e152`.

## Result

Orašac (`op:bihac:orasac_2`) was captured by RS combat on turn 29. `Operacija Bunar` produced one logged militia battle, a `costly_victory` at ratio **1.17**, and entered recovery as `completed`. The AAR records `logged_capture`, operation outcome `success`, and a four-star **Solid Victory**.

## Actual lifecycle

- Turns 21–22: `Operacija Odmazda` occupied the corps operation slot; it completed on turn 22.
- Turns 23–24: `probe_vrs_2nd_krajina_t23` occupied the slot; it completed on turn 24.
- Turn 25: `vrs_2nd_krajina:Operacija Bunar:t25` was emitted with the same three-brigade roster as F: 11th Krupa, 17th Ključ, and 1st Drvar. The saved operation marks 17th/Drvar as primary-sector brigades and 11th as the adjacent-sector attachment.
- Turn 25: 11th Krupa received the real march order from Veliki Badić to Račić. It was in transit on turns 26–27 and arrived on turn 28. The two primary brigades stayed at Prkosi and Trubar.
- Turns 25–28: normal planning/preparation. The saved completed operation records commander `vrs_samardzija` (Drago Samardžija), competence 4, aggressiveness 4, `preparation_turns_elapsed: 4`, `preparation_max_turns: 4`, sub-phase `ready`, assessment `launch`, intel confidence 0.445, and supply readiness 1. Its operation-owned probe started on turn 28 and resolved with confidence gain 0.175.
- Turn 29: all three participants were eligible and received attack orders. One combined battle against RBiH militia resolved as `costly_victory`, ratio 1.17. Weekly battle fields record 115 RS and 35 militia casualties and three attacker artillery losses. Orašac flipped to RS; the operation immediately entered completed recovery.
- The AAR ended the operation on turn 30. It reports 110 RS personnel casualties (25 killed, 85 wounded), 34 militia casualties inflicted (8 killed, 26 wounded), initial strength 2821, and final strength 2693. AAR aggregates differ from the weekly battle fields, as in prior diagnostics.

## Comparison with F

The emission turn, roster, real donor march, and donor arrival are unchanged from F. F had no assigned operation commander, retained the default five-turn preparation, first attacked on turn 30, and lost its first battle at ratio 0.84. G assigned the available reserve officer through the canonical admission lifecycle, yielding the officer-derived four-turn preparation; the same assembled force attacked one turn earlier at ratio 1.17 and captured the target. This run directly establishes the timing and realized battle result. It does not claim that commander assignment changes combat strength or predetermine capture; the material difference observed here is the one-turn earlier opening under the turn-29 combat context.

## Evidence

- `weekly_report.jsonl`, turns 21–29: slot sequence, operation phases, roster, movement counts, eligible attackers, orders, battle ratio/outcome, casualties, friction, and capture.
- `brigade_temporal_log.jsonl`, turns 23–30: participant ownership, donor transit/arrival, locations, and post-battle state.
- `final_save.json` → `military.corps_command.vrs_2nd_krajina.last_completed_operation`: commander, preparation, probe, roster/attachment metadata, capture and completion.
- `operation_aars.json`: commander identity, logged-capture provenance, totals, result, and grade.

No source edit, scenario rerun, or broader validation was performed for this extraction.
