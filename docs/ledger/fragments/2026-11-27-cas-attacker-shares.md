## 2026-11-27 — CAS-ATTACKER-SHARES: battle records and weekly_report rows carry each attacker's applied loss

Authority: orchestrator ruling §42 (MUST-FIX, pre-freeze, reporting only). Carries the two §41 FARZ-END-RECEIPT regression tests (`tests/farz_end_reopen.test.ts`, from e179683cc).

**Change.**
- The resolver's battle record gains `attacker_contributions`: each attacker's own applied loss (its casualty share plus any morale-absorption extra; a TG anchor's entry includes its donors' applied loss, as in brigade history), sorted by brigade id. It is report-only: `compile_turn_summary` does not copy it, so no GameState field changes.
- `weekly_report.jsonl` battle rows now always carry `attacker_brigades` and `attacker_contributions` (`weeklyAttackerStackFields`). `attacker_brigades` was emitted only under the `battle_stack` reason-code topic; `defender_contributions` stays under that topic.
- `attacker_casualties` is documented, on the record and the weekly row, as the whole stack's applied loss, not `attacker_brigade`'s (the lead).
- Player-visible surfaces were audited. The AAR panel labels its loss line by side and lists the whole stack, so it does not change. Two items outside this scope went to the steward's register: operation casualty attribution credits the stack's loss to the lead's operation (state-writing), and the letter home names the lead brigade (text only).
- Tests: `tests/attacker_casualty_applied_record.test.ts` (each attacker's entry equals its personnel drop, and the entries sum to the stack total; TG anchor), `tests/weekly_battle_attacker_stack_fields.test.ts`. Both were red on main.

**Measured.** MEASURED_PLACEHOLDER
