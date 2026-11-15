## 2026-11-15 — RF-emergency-defense: the emergency defensive operation is retired (inert)

Follow-up (a) to F1g. With the threat ratio fixed, the emergency defensive operation could in principle fire at threat 2.0 or more.

**Premise, measured on main's 188w.** 166 corps-turns were defensive at threat >= 2.0. None had the two brigades at 70% of the 3,000 cap with cohesion 50 that the creator required, so it never fired.

**Ruling: retire (a2).** operations-expert and corps-army-commander were consulted separately before code, and both reached it.
- The operation was hollow: no axes, objectives or staging point. No tactical group formed, it made no attacks and wrote no control.
- It froze the corps' four strongest brigades for about seven turns, which cut them off from sector reassignment, the march back to the front and the reserve hold.
- It gave x1.05 defence in planning, then x0.9 defence and x0.6 attack in recovery, and added +15 corps exhaustion.
- It blocked the commander loop (`major_operation_already_active`) and survived the October 1995 ceasefire.
- Its targets were `nCtrl !== faction`, so HVO Northwest Bosnia (70 of the 166 candidate turns) would have listed ALLIED ARBiH ground. This is the corridor-breach flaw (#672) again.
- A threatened corps was worse defended with it than without. The defensive stance (x1.2 defence) is the reaction.
- A real emergency defence (committing reserves, a local counterattack) is a post-1.0 design item.

**Change.**
- Deleted:
  - `generateEmergencyDefensiveOperations` (`bot_corps_operations.ts`) and its step-3b call and re-export in `bot_corps_ai.ts`;
  - `buildEmergencyDefenseOperation` (`corps_operation_helpers.ts`);
  - `EMERGENCY_THREAT_THRESHOLD` (`bot_constants.ts`);
  - their tests in `concurrent_operations.test.ts` and `corps_operation_helpers.test.ts`.
- Kept for saves: `CorpsOperation.is_emergency` and the `limited` branch of `classifyOpDonorPolicy`. Also kept: `computeSectorThreat`, which the stance formula and player recommendations read.
- Comments: `oct1995_ceasefire.ts`, `game_state.ts`, `tactical_group_config.ts`, the council-fix-3 test.
- Canon: Systems Manual (the F1g note, the exhaustion-40 mention and the October-1995 bullet, plus a "do not revive" retirement note in §6); Engine Invariants (October 1995 ceasefire line).

**Tests.**
- New `tests/sim/emergency_defense_retired.test.ts`:
  - the creator, factory and threshold are gone;
  - a legacy save's `is_emergency` strategic-defence op walks planning, execution and recovery, then is removed.
- `tests/sim/f1g_corps_threat_osid.test.ts`: a corps at threat 2.5 goes defensive and gets no emergency op.

**Proof.**
- Headless 188w against main `16fc0a62f`: all 8 artifacts byte-identical (final_save `19262a0b19df1567`, weekly_report, control_delta, formation_delta, activity_summary, watched_operations, end_report, run_summary).
- `tsc` 0; `test:baselines` all scenarios match; full `npm run test:vitest` exit 0. No re-bless.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/rf-emergency-defense-20261115/`.
