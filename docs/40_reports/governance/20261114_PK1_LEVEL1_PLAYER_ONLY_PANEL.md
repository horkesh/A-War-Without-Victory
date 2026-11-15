# Pyrrhic panel: PK1, the level-1 approval hold is player-only, 2026-11-14

**Question.** Finding PK1. At autonomy level 1 ("Assisted") the engine held every faction's corps-commander plans at `ready` until a player approved them. It also switched off commander local occupation for every faction. Only the human player can give an approval, so bot commanders (RS and HRHB in an RBiH campaign) stopped launching their own operations while level 1 was in force. Evidence: R8 dry-run run m; `docs/40_reports/20261114_UNHELD_POCKETS_DIAGNOSIS.md` §8; PR horkesh/A-War-Without-Victory#620. A code-only fix (#624) closed unmerged. It could not land alone, because Engine Invariants §14.10b and the Systems Manual recorded the all-faction hold as shipped behaviour. This panel signs off the canon amendment to a player-only hold. The fix lands in the same change (PR #631).

**Authority.** The orchestrator's task brief of 2026-11-14 relays the owner's decision. The owner delegated these canon edits to the Pyrrhic panel. The owner approved the orchestrator's recommendation: amend canon to a player-only hold, land the fix in the same change, and switch the R8 strategic QA harness to level 2. A unanimous GO is required.

**Convened by.** The implementer: the Claude session that restored the fix and drafted the canon text. It convened the seats and does not vote. There are four seats: canon compliance, game designer, systems-programmer/determinism, and war-or-game. Each is an independent, read-only Agent subagent. They reviewed branch `claude/charming-cerf-mvpvoi`. A separate integrator, neither a seat nor the implementer, checked the resolutions against the files and `git diff origin/main...HEAD`, and wrote this record.

**Outcome. Unanimous GO (round 2).** Round 1, on `34f5e48`: all four seats returned GO WITH CONDITIONS. The implementer resolved the conditions in `d0c6977` (tests) and `8d3a596` (canon and records). Round 2, on `8d3a596`: all four seats returned FINAL VERDICT: GO.

## Commits

- `7f9c0c8`: fix restored from `archive/claude/autonomy1-player-only-gate` (`8a7efa9`). New `isLevel1PlayerApprovalFaction` in `src/sim/bot/staff_control.ts`. Used by `applyCommanderOutput` (`commander_loop.ts`) and the local-occupation gate (`emit.ts`). `generateAllCorpsOrders` (`bot_corps_ai.ts`) passes the corps' faction.
- `d61ec8e`: canon draft.
- `5870afe`: R8 harness selects level 2; `--strategic-autonomy` option.
- `34f5e48`: ledger fragment.
- `d0c6977`: test fixes and pins (round-1 conditions).
- `8d3a596`: canon round-1 resolutions. **This is the approved canon text.**

## Approved canon text (commit `8d3a596`)

- **Engine Invariants §14.10b** (`docs/10_canon/Engine_Invariants_v0_9_0.md`): the boundary paragraph, and the new note "*(Amended 2026-11-14, PK1 — the level-1 hold is player-only; ...)*".
- **Systems Manual §6.5** (`docs/10_canon/Systems_Manual_v0_9_0.md`): the operation-authorization paragraph ("Operation authorization is gated on autonomy 1 exactly ..."), and the new note "*(Amended 2026-11-14, PK1 — behaviour change in the same change. ...)*".
- **Systems Manual §6.4**: one sentence in the isolated-position implementation note: "A standalone local task cannot bypass player approval at autonomy level 1: it is withheld at that level for the selected player faction's corps only, and other factions' corps keep it at every level (amended 2026-11-14, PK1)."
- **Rulebook §17.3 item 3** (`docs/10_canon/Rulebook_v0_9_0.md`): one sentence: "The autonomy level governs only the president's own faction: every other faction's generals, allied or hostile, plan and launch their operations at every level and never wait on his authorization (clarified 2026-11-14, PK1; Engine Invariants §14.10b)."

## Seats

**Canon Compliance Reviewer.** Round 1: GO WITH CONDITIONS (seven). (1) Quote the superseded EI text verbatim, including "(`desktop_sim.ts:331-346`)"; say the first sentence was narrowed; cite PROJECT_LEDGER 2026-09-05 "The Level-1 hold is NOT player-faction-scoped". (2) Remove the "froze ... for a whole campaign / whole war" overstatement. Say plans were held while level 1 was in force (RS and HRHB in an RBiH campaign), and that authored operations still launched. (3) The headless sentence must cover a scenario-set `player_faction`. (4) The default-level reason keeps "without a human in the loop". (5) The Rulebook says "only the president's own faction". (6) The ledger fragment names SM §6.5 and §6.4 separately. (7) This record exists. Confirmed no FORAWWV text needs change. Round 2: FINAL VERDICT: GO. All seven resolved.

**Game Designer.** Round 1: GO WITH CONDITIONS (two). (1) The Rulebook's "opposing armies" becomes "every other faction's generals, allied or hostile". (2) This record exists. Recommendations: keep the qualifier in the default-level reason; register the player-side level-1 gaps (fallback probes and reductions launch unasked, so the Assisted copy over-claims; the lost one-brigade local occupation); COMMAND_BOARD row 8 still names #624; one level-1 R8 shakedown after the engine freeze. Round 2: FINAL VERDICT: GO. Both met. The COMMAND_BOARD item goes to the integration steward, which the seat accepted.

**Systems programmer / determinism.** Round 1: GO WITH CONDITIONS (three). (1) Commit fixes for two older tests that failed on `34f5e48`: `commander_operation_assignment` and `elite_formation_utilization`. Both built level-1 states with no `player_faction`. Full vitest green on the committed tree. (2) This record exists. (3) Recommended: a source pin that `generateAllCorpsOrders` passes `faction` to `applyCommanderOutput`. Findings: the predicate is correct for all inputs; every other autonomy gate is already player-scoped; no new state, schema or serialization; headless is byte-identical by construction. Positive control: run against the old faction-blind rule, the new gate test fails 5 of its 8 tests. Round 2: FINAL VERDICT: GO. All three met. 388 tests passed across 14 files on the committed tree, exit 0. Pre-merge gate: the full `npm run test:vitest` must be green on the final head, locally and in CI, before auto-merge.

**War-or-Game.** Round 1: GO WITH CONDITIONS (four). (1) This record exists. (2) Record the player-side level-1 follow-ups in REAL_WAR_MASTER or COMMAND_BOARD: the withheld local occupation, and authored-operation plans with empty `target_osids` that are never offered. (3) Every R8 record states its autonomy level and whether the build contains PK1. A pre-PK1 label, quoted in the R8 record, applies to old level-1 runs and to pre-PK1 output of `desktop_calibration_compare.ts` and `run_rbih_best_outcome.ts`. (4) R8 qualifying precondition: the first packaged level-2 run shows bot-generated RS operations after week 20, and the four 1992 islands fall at about their headless turns. Round 2: FINAL VERDICT: GO. All four met.

Every seat noted that this record must exist at this path in PR #631 before merge.

## How each condition was resolved

**Canon compliance.**
1. `8d3a596`. The EI note quotes both superseded sentences verbatim, ending "(`desktop_sim.ts:331-346`)". The quote matches `origin/main`. The note says the first sentence now names the player's corps and the second is replaced. It cites PROJECT_LEDGER 2026-09-05; the phrase is at `docs/PROJECT_LEDGER.md` line 2396. The SM §6.5 note cites the same entry.
2. `8d3a596` (both canon notes) and `d0c6977` (the `commander_loop.ts` comment). The notes say plans were held "while level 1 was in force", name RS and HRHB in an RBiH campaign, and say authored historical operations still launched. No "froze" or "whole war" remains in the amended canon.
3. `8d3a596`. EI §14.10b: "Under headless auto-control the hold never applies, even when the scenario sets `player_faction`." Test added in `d0c6977`.
4. `8d3a596`. EI §14.10b keeps "without a human in the loop" and points to the `desktop_sim.ts` comment "LEVEL 2, NOT LEVEL 1".
5. `8d3a596`. Rulebook §17.3 item 3: "governs only the president's own faction".
6. `8d3a596`. The ledger fragment lists EI §14.10b, SM §6.5 and SM §6.4 as separate items.
7. This file.

**Game designer.**
1. `8d3a596`. Rulebook §17.3 item 3: "every other faction's generals, allied or hostile".
2. This file.
- Recommendations: the default-level qualifier is kept (canon 4). The three player-side gaps are in REAL_WAR_MASTER (`8d3a596`). The level-1 shakedown after the engine freeze is in the R8 record (`8d3a596`). COMMAND_BOARD row 8: see "Not decided here".

**Systems / determinism.**
1. `d0c6977`. Both tests now set RS as `player_faction`, so the hold still applies to them. Each adds a bot-side positive control (RBiH as player; the RS corps launches). The seat's round-2 run passed 388 tests in 14 files, exit 0. The full suite is a pre-merge gate (see "Pending").
2. This file.
3. `d0c6977`. `tests/sim/autonomy/level1_player_only_gate.test.ts` pins that the only call in `bot_corps_ai.ts` is `applyCommanderOutput(state, corps.id, output, faction)`.

**War-or-game.**
1. This file.
2. `8d3a596`. `docs/40_reports/REAL_WAR_MASTER.md`, new section "Open: the player's own army at autonomy level 1 (Assisted), after PK1". It lists three items: the withheld one-brigade local occupation; authored-operation plans with empty `target_osids` that are never offered; fallback probes and reductions that launch unasked.
3. `8d3a596`. `docs/plans/2026-07-31-full-campaign-electron-validation-plan.md`, R8 dry-run record. Every record states the autonomy level and whether the build contains PK1. The pre-PK1 label is quoted there. It covers old level-1 runs and pre-PK1 output of both tools.
4. `8d3a596`. Same record: the qualifying precondition names bot-generated RS operations after week 20 and Arapuša, Jezero/Volari, Lupnica and Baljvine falling at about their headless turns.

## Scope

- FORAWWV is untouched. `git diff origin/main...HEAD` changes no FORAWWV file. The canon seat confirmed no FORAWWV text needs change, so the 8-seat bright-line panel is not triggered.
- No §6 or enclave question is decided here.
- PLAYER_TURN_GUIDE and the Assisted UI copy (EN and BCS) are unchanged. They describe only the player's own staff.
- The R8 harness change (`5870afe`: `tools/ui/paradox_local_qa.cjs`, `tests/paradox_local_qa_harness.test.ts`) is owner-directed tooling. It is outside the canon scope. The seats reviewed it only as R8 evidence policy.

## Evidence

- Diagnosis: `docs/40_reports/20261114_UNHELD_POCKETS_DIAGNOSIS.md` §8. In run m, 5 RS corps and 1 HRHB corps were held at `ready`, and RS launched no bot-generated operation after week 20.
- PR #620 (diagnosis). PR #624 (code-only fix, closed unmerged).
- `npm run test:baselines`: "Baseline regression: all scenarios match.", exit 0 (implementer; systems seat).
- `npx tsc --noEmit`: exit 0. The default heap ran out of memory in the container, so it ran with `NODE_OPTIONS=--max-old-space-size=6144`.
- Test files: `tests/sim/autonomy/level1_player_only_gate.test.ts` (new), `tests/commander/commander_operation_assignment.test.ts`, `tests/commander/elite_formation_utilization.test.ts`, `tests/commander/operation_emit_overlap_guards.test.ts`, `tests/sim/autonomy/autonomy_phase_d.test.ts`, `tests/desktop_campaign_start_contract.test.ts`, `tests/paradox_local_qa_harness.test.ts`.
- Systems seat, round 2, on `8d3a596`: 388 tests in 14 files passed, exit 0.
- Integrator spot check, on `8d3a596`: the seven files above, 303 tests passed, exit 0.

## Pending at time of writing

The systems seat's gate: the full `npm run test:vitest` must be green on the final head, locally and in CI, before auto-merge. At time of writing, CI `full-suite` and `typecheck` on `8d3a596` were still queued. The final head is the commit that adds this record. The result is posted on PR #631 before auto-merge is enabled.

Implementer's corrections after the integrator wrote this record (wording only): `run_rbih_best_outcome.ts` runs three strategies at level 1, not one (here and in the R8 record); the ledger fragment gives the gate-file test count after `d0c6977` (112).

## Not decided here

- The three REAL_WAR_MASTER player-side items. Each needs its own ruling: an approval identity for the task, or a ruling that it sits below the president's threshold.
- COMMAND_BOARD row 8 still names #624 as the PK1 fix. The integration steward updates it.
- The AI-play tool defaults. `desktop_calibration_compare.ts` defaults `--autonomy-level` to 1. `run_rbih_best_outcome.ts` runs three of its four strategies (`maximal_activist`, `faithful_activist`, `lever_isolated`) at level 1; its `baseline_historical` runs at level 0. Their pre-PK1 output is labelled; the defaults are not changed here.
