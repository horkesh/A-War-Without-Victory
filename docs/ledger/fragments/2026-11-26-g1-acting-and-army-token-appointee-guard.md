## 2026-11-26 — G1: the acting-commander branch and the army-CO token pick spare a presidential appointee

Authority: owner ruling G1 (explicit player input outranks the staff at every autonomy level) and the orchestrator's rulings of 2026-11-26 on lane C brief 13 (path 1 MUST-FIX after a probe, path 2 ACCEPT with a §15.1 note, path 3 FOLD, hygiene in separate commits).

**Change.**
- `src/sim/combat/officer_system.ts` step 5: REPLACE-CO seats its appointee acting (`relieveOfficer`), and step 5 retired an acting holder once another corps officer was free. Probe through the real `apply-co-replacements` and `officer-succession` steps: red on aa76f6fc3 at a0-a3 (the appointee was retired the same turn), green here. A named presidential appointee now keeps the seat and the acting combat modifier. A generic stopgap (REPLACE-CO on an empty reserve) still gives way.
- `src/sim/combat/army_co_lifecycle.ts`: the roster promotion skips a token whose holder is the President's appointee in his corps, and falls through to the next token or `political_bot_pick`.
- Hygiene: `findHistoricalSuccessor` removed (no caller; exhaustive check), and the `processOfficerSuccession` docblock now states the current steps.
- Canon: Engine Invariants §15.1 (acting guard, token guard, "a dissolved seat releases its holder, appointee included", line references). Two-seat panel, unanimous. FORAWWV unchanged. No GameState field added.

**Measured.** Headless writes no appointment, so the headless pair is unchanged by construction; the PR body lists the measured pair and the live RBiH a2 hist and a2 emer cells.
