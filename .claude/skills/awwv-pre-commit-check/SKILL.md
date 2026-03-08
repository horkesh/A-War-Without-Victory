---
name: awwv-pre-commit-check
description: Provide pre-commit checklist covering canon, determinism, ordering, tests, ledger, and life lessons compliance. Use when the user runs /awwv_pre_commit_check or asks for a pre-commit review.
---

# /awwv_pre_commit_check

## Trigger
Before committing changes.

## Inputs
- List of modified files and intended commit scope.

## Output
- Checklist: canon compliance, determinism, ordering, tests, ledger (append to `docs/PROJECT_LEDGER.md`; if change carries reusable knowledge, update `docs/PROJECT_LEDGER_KNOWLEDGE.md` per `docs/10_canon/context.md` §1).

## Determinism safeguards
- Verify no timestamps or nondeterministic APIs were added.

## Life lessons compliance
Read `docs/life_lessons.md` and check the current change against each active lesson. Specifically:

1. **[Architecture] Organic emergence beats hard caps** — Does this change add a hardcoded cap, phase switch, or forced stance transition? If so, flag it and suggest an emergent lever instead.
2. **[Calibration] Fixing one faction cascades** — Does this change fix a single faction? If so, verify all three factions' troop strength, KIA, and territorial outcomes were checked.
3. **[Debugging] Bug is never where you think** — Is this change tuning constants? If so, verify the mechanic is actually executing first (trace data flow, not adjust rates).
4. **[Architecture] Port incrementally** — Does this change remove a legacy system? If so, verify ALL consumers were enumerated and ported first.
5. **[Calibration] Data vs engine** — Is this an engine fix for a calibration plateau? Verify operations are targeting the right OSIDs before debugging combat.
6. **[Architecture] Scope determines granularity** — Does this change use `friendly_osids` when `assigned_brigade_ids` (or broader scope) is appropriate?
7. **[Process] Classify by system impact** — Does this commit mix engine files (`src/sim/`, `src/state/`, IPC) with pure UI? If so, split into separate commits.
8. **[Debugging] Override direction** — Does this change add `avoided_osids` or `osid_control_overrides`? Verify direction: too much → avoided, too little → overrides.
9. **[Architecture] FormationKind beats conditionals** — Does this change add `if (f.is_X) continue;` checks? Consider a new Kind instead.
10. **[Calibration] Test overrides in isolation** — Are multiple override blocks being added in one commit? Each cluster should be tested independently.
11. **[Process] OSID-level anchors** — Are any new scenario anchors at municipality level? Use OSID-level.
12. **[GUI] No raw engine values** — Does this change display raw numeric values to the player? Use presentation layer (pips, labels, archetypes).
13. **[Process] Update master docs during session** — Were `CALIBRATION_MASTER.md` or `GUI_MASTER.md` updated if constants or GUI changed?

Report: for each applicable lesson, state PASS (compliant) or FLAG (potential violation + what to fix). Lessons that don't apply to the current change can be skipped.

## STOP AND ASK
- If commit spans multiple phases or lacks ledger entry.
- If any life lesson is flagged as violated.
