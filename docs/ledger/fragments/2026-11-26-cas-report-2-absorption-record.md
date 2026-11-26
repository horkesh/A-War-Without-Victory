## 2026-11-26 — CAS-REPORT-2: the battle record includes the morale-absorption extras

Authority: the orchestrator's freeze-inventory rulings 2026-11-26 §16 (MUST-FIX before the freeze, record-only, its own measured pair). Hash-moving, behaviour-neutral.

**Change.**
- The battle record (`report.battles`) is pushed before morale absorption applies the homeland-determination extra on both sides, so the record under-reported applied losses that the AAR, Chronicle, letter home and turn aftermath read.
- `evaluateAndApplyMoraleAbsorption` (`src/sim/combat/attack_morale_absorption.ts`) books each extra at the figure `applyPersonnelLoss` removed and returns the per-side totals. The resolver adds them to the record's `attacker_casualties` / `defender_casualties` and to the primary defender's contribution row. Effects computed before absorption (the Pyrrhic check, officer casualty loss) keep the pre-absorption figure.
- Canon: Systems Manual, "Battle record figures". FORAWWV unchanged.
- Tests: `tests/battle_record_absorption_extras.test.ts` (record = personnel drop for absorbed battles; red on main, 2029 vs 3246) and unit cases in `tests/attack_morale_absorption.test.ts`.

**Measured.** 188w pair against main 5993d906c: control, every formation's personnel and status, and every battle (target, outcome, attackers, defender) equal in both modes. Checkpoint scores, the Farz receipt, the enclave guards and engine health are identical to main. Only records differ: operation AAR casualty and equipment tallies, the AAR exchange ratio (no grade star changes), and turn-summary contribution rows. Baselines re-pinned.
