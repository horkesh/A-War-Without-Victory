# Command Briefing Canonical Paths

**Date:** 2026-05-23
**Commit scope:** sim briefing read-model / serialized `last_briefing` truth
**Status:** Implemented

## Summary

The sim-side command briefing now reads three previously documented canonical state paths instead of preserving Batch C's broken tolerant fallbacks:

- Active operations are counted by joining each `corps_command` row to the owning corps/army-HQ formation faction.
- Disrupted brigade warnings read `FormationState.disrupted_turns`.
- Prolonged enclave-isolation alerts read `state.political.enclave_resilience`.

The briefing item contract is unchanged. This does not alter combat math, operation behavior, scenario data, turn ordering, calibration, painted targets, or UI ownership. It does change serialized `state.military.last_briefing` when the fixed signals are present.

## Evidence

New regression coverage in `tests/command_briefing.test.ts` proves:

- RBiH active operations are counted without leaking enemy corps operations.
- Three canonical disrupted RBiH brigades produce a warning.
- Political enclave resilience with prolonged isolation produces the expected humanitarian critical item.

The 52-week baseline drift is intentionally limited to serialized briefing output:

- Changed: `apr1992_52w/final_save.json`, `apr1992_52w/run_summary.json`
- Unchanged: `activity_summary.json`, `control_delta.json`, `end_report.md`, `formation_delta.json`, `watched_operations.json`, `weekly_report.jsonl`

The new 52-week final briefing surfaces prolonged isolation for Sarajevo, Gorazde, Srebrenica, Zepa, Bihac pocket, Teocak, Lasva Valley, and Zepce plus the existing officer-event item.

## Verification

- `npx.cmd vitest run tests\command_briefing.test.ts --reporter=dot` PASS 8/8 after red/green.
- `npx.cmd vitest run tests\command_briefing.test.ts tests\sim\command\phase4_ui_data_layer.test.ts tests\ui_map_game_state_adapter.test.ts tests\warroom_player_visibility.test.ts --reporter=dot` PASS 60/60.
- `npm.cmd run typecheck` PASS.
- `npm.cmd run test:baselines` PASS after surgical manifest refresh for the two intentional 52-week briefing hashes.

## Follow-Up

This closes the three `collect_briefing.ts` latent path bugs documented during strict-null Batch C. Remaining command-briefing work should focus on adding new briefing sections only when a canonical state signal already exists.
