## 2026-11-14 — Level 1 (Assisted) approval holds the player's corps only (PK1); canon amended; R8 strategic runs at level 2

**Found.** The unheld-pockets diagnosis (`docs/40_reports/20261114_UNHELD_POCKETS_DIAGNOSIS.md` §8, #620) traced the owner's screenshot to R8 dry-run run m, which ran at autonomy level 1 because the harness's "strategic autonomy" clicked `autonomy-level-1`.
- `applyCommanderOutput` (`commander_loop.ts`) read the global `meta.autonomy_level` with no faction check. Only the desktop player UI writes `player_op_response`, so every bot corps plan waited at `ready` for an approval no one could give.
- Commander local occupation (`emit.ts`) was also switched off for every faction at level 1.
- In run m, 5 RS corps and 1 HRHB corps were "held at ready: awaiting player approval at Level 1" (1KK from turn 5). RS started 6 operations after week 20, all authored, none after t69; headless main started 19, 13 of them bot-generated. The 1992 islands that bot operations normally clear (Arapuša, Jezero+Volari, Lupnica, Baljvine) survived to 1995.
- Engine Invariants §14.10b and Systems Manual §6.5 recorded the all-faction hold as shipped behaviour, so the first fix PR (#624) closed unmerged. The owner delegated the canon edit to a Pyrrhic panel and approved landing canon and fix together.

**Fix (restored from `archive/claude/autonomy1-player-only-gate`, 8a7efa9).** New `isLevel1PlayerApprovalFaction(state, faction)` in `src/sim/bot/staff_control.ts`: true only at exactly level 1, for the human player's faction, and never under headless auto-control. Both gates use it.
- The player's corps keep the approval flow unchanged. Bot corps plan, launch and run local occupation at level 1 exactly as at levels 0 and 2.
- `applyCommanderOutput` takes the caller's faction, so a player corps that exists only in `corps_command` cannot skip the hold (determinism review finding on the first PR).
- No state, schema or serialization change. Comments in `desktop_sim.ts` and `desktop_campaign_start_contract.test.ts` that said level 1 holds "every" plan now say the player's.

**Canon (same change; unanimous Pyrrhic panel, `docs/40_reports/governance/20261114_PK1_LEVEL1_PLAYER_ONLY_PANEL.md`).** These passages now say the level-1 hold applies to the player's corps only:
- Engine Invariants §14.10b;
- Systems Manual §6.5 (the operation-authorization paragraph);
- Systems Manual §6.4 (the local-occupation sentence in the isolated-position note).

Each amendment note is dated, quotes the superseded text verbatim, and says that text recorded shipped behaviour, not intent (PROJECT_LEDGER 2026-09-05: "The Level-1 hold is NOT player-faction-scoped").

Rulebook §17.3 item 3 gains one clarifying sentence: the autonomy level governs only the president's own faction, and every other faction's generals, allied or hostile, never wait on his authorization.

Unchanged after checking: FORAWWV (no §6 or enclave question; no bright-line panel needed), PLAYER_TURN_GUIDE, and the Assisted UI copy in EN and BCS (it describes only the player's own staff).

**Follow-ups.** `docs/40_reports/REAL_WAR_MASTER.md` registers three open items for the player's own army at level 1:
- the withheld one-brigade local occupation, which has no approval path;
- plans built from authored operations, which carry empty `target_osids` and are never offered;
- fallback probes and reductions, which launch unasked, so the Assisted copy over-claims.

**R8 harness.** `tools/ui/paradox_local_qa.cjs` `--strategic` now selects autonomy level 2, the shipped default for new campaigns, and asserts level 2 after turn 1 and at the end. Level 1 stays selectable with `--strategic-autonomy=1`. Any other value, a repeated flag, or the flag without `--strategic` is refused. The R8 dry-run record (`docs/plans/2026-07-31-full-campaign-electron-validation-plan.md`) notes the change and adds these rules:
- every R8 record states its autonomy level and whether the build contains PK1;
- pre-PK1 level-1 runs, and pre-PK1 output from `desktop_calibration_compare.ts` (default level 1) and `run_rbih_best_outcome.ts`, carry a "bot side frozen" label;
- qualifying requires a packaged level-2 run in which bot-generated RS operations continue after week 20 and the four 1992 islands fall at about their headless turns.

**Calibration.** Zero drift: headless runs have no player faction and run at autonomy 0. `npm run test:baselines` printed "Baseline regression: all scenarios match." (exit 0). `npx tsc --noEmit` exit 0; the default 2 GB heap ran out of memory in this container, so it was re-run with `NODE_OPTIONS=--max-old-space-size=6144`.

**Tests.**
- **Restored gate tests.** `tests/sim/autonomy/level1_player_only_gate.test.ts`, `tests/commander/operation_emit_overlap_guards.test.ts` and `tests/sim/autonomy/autonomy_phase_d.test.ts` passed, 110 tests.
  - The panel's systems seat re-ran the new test file with the old faction-blind rule mocked in; 5 of its 8 tests failed, so it separates the two rules.
  - Two cases were added: headless with `player_faction` set, and a source pin that the production caller passes `faction`.
- **Two older tests the archived branch never ran.** The broader commander sweep failed `commander_operation_assignment` ("does not allocate an officer while Level-1 approval is absent") and `elite_formation_utilization` (local occupation, `playerAuthorityOutput`). Both built a level-1 state with no `player_faction`, so their RS corps became a bot under the new rule. Each now names RS as the player and adds a bot-side positive control.
- **Harness.** `tests/paradox_local_qa_harness.test.ts` passed, 131 tests, including a new test for the level-2 default and the `--strategic-autonomy` parser.

**Not done.** No packaged R8 run was taken at level 2 here (no Windows host or package in this session); the first one should confirm that unanswered stance matters do not block the harness at level 2. R8 bot-side evidence from before this change stays affected.
