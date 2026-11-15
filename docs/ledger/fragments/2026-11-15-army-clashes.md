## 2026-11-15 — Command loop L7: army clashes (proposal 2A step A1; owner decision 4)

- **What.** A clash is raised only by something the president did, when he stages it: stop an operation, request one, withhold a Level-1 plan, or decline a recommended opportunity. All three must hold:
  - The act crosses the faction's current campaign plan. A stop crosses it when the operation is the main effort or its objectives are the corps' offensive targets. A request crosses it when the corps is on economy or containment, a withhold when the corps is primary, and a decline when the staff recommended approval with every required check green.
  - The army commander's A3 compliance with the act is short of full (modified, partial or refused), with the category kept as the clash's severity. Fable consult 1, appendix A, replaced the proposal's "partial or refused, never modified": the weekly noise that rule guarded against cannot reach A1.
  - The act concerns a corps operation or larger.
  - A crossing he fully complies with, or one with no army commander or an acting one, is a `noted` Record line.
- **Answers.** Accept stages the army's version at its own price: a withdrawn halt or request is refunded; a withheld plan or declined opportunity is backed at the owner decision 1 price (10 or 20), refused when unaffordable. Both ratification seats flagged that a free Accept would let withhold-then-Accept back an offensive for nothing. Insist costs 15 Authority, and one `override` goes on the army commander's `recent_overrides`. Replace is the existing Replace-CO lever for the corps commander, at 25. It never reaches the army commander (owner decision 4).
  - Unanswered at Advance, a clash lapses and the order stands.
  - Caps: one open, eight weeks apart, four per faction per calendar year. A clash over the caps becomes a `not_put` line.
- **Code.**
  - `src/state/army_clash_types.ts` holds the types.
  - `src/sim/combat/army_clashes.ts` holds detection, caps and lapse, exported through `desktop_sim`.
  - `src/desktop/army_clash_ipc.cjs` applies the answers through the `resolve-army-clash` IPC.
  - Hooks after the four staging handlers in `electron-main.cjs`. Lapse sweep after `advance-turn`.
  - The A3 helpers `computeArmyComplianceScore` and `categoryForScore` are now exported.
  - Fields:
    - `meta.army_clashes` and `meta.army_clash_history` (projected for the player faction);
    - `military.army_clash_state` (`@persistence optional-persisted`, kept in the main process).
  - Validator blocks; an advisory `army_clash` manifest family; inbox row; Decision Room card (lever `army_clash`).
  - UI: a lazily loaded `ArmyClashActions.tsx`. Strings are under `clash.*` in EN and BCS.
- **Canon.**
  - Engine Invariants §14.10d (new);
  - Rulebook line 13 and §5.5;
  - Systems Manual §6.5;
  - PLAYER_TURN_GUIDE (War - Decisions row);
  - DETERMINISM_TEST_MATRIX.
  - No FORAWWV change: Replace stays with corps commanders.
- **Tests.**
  - `tests/sim/army_clashes.test.ts`, 32 tests: detection per act, compliance and live-president gates (with the appendix A chief-by-act table under masked and roster stubbornness), caps, lapse, the three answers and refusals, validation, old-save migration on the real startup save, canonical round-trip, advisory manifest, projection, and the attribution firewall (no verdict owner reads the fields; the verdict is equal with and without them).
  - `tests/ui/army_clash_card.test.ts`, 9 tests.
  - Pin updates: manifest family list, strict-null optional count (595 → 598), act-art map, packaging list.
- **Inertness** (evidence in `C:/Pyrrhic/AWWV-worktrees/_logs/cl-l7-clashes-20261115/`).
  - 40-week headless run against main `0f3146c7`: 14/14 simulation artifacts byte-identical. `run_meta.json` differs only in `git_commit`; `final_state_hash` is `c5d49a21a9db379f` on both.
  - Live strip-compare over 40 turns (`tools/diagnostics/army_clash_strip_compare.ts`): the player and headless saves are byte-identical even unstripped, all per-turn control counts match, and there are no clash fields.
- **Authority at cap after week 26 (L6 metric, with L7 in): 100% in every mode**, 78 of 78 turns, 104 turns, `desktop_calibration_compare.ts --price-backing on [--clash-policy insist]`. Clash runs in the table used a president who withholds every primary-corps plan and insists on every clash.

  | Run | Clashes | At cap |
  | --- | --- | --- |
  | RBiH, autonomy 2 | 0 | 100% |
  | RBiH, autonomy 1, clash policy insist | 0 (5 proposals in 104 weeks, none from a primary corps, so all backed) | 100% |
  | HRHB, autonomy 1, clash policy insist | 0 (no proposals) | 100% |

  - Why no clash fired: no presidential act in these runs crossed the plan. At autonomy 2 the simulated president initiates nothing. At autonomy 1 no proposal came from a primary corps, so nothing was withheld. The gate change (short of full) does not alter these runs. Under the old "partial or refused" gate, only Praljak could have clashed with stubbornness masked to 3 (appendix B: the roster values are masked; a separate RF fix).
  - Even at the cap of four Insists a year (60 Authority), income of about 4 a week (about 200 a year) keeps the meter full. The §5D target and its replacement (Fable's two-President test, appendix C) are pending ratification. Nothing retuned.
