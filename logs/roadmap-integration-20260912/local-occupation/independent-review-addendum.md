# Independent review addendum — full-suite corrections

Verdict: **GO** for the narrow correction after candidate `8db305596`.

- `git diff 8db305596 -- src data` is empty. No engine, state, migration, startup artifact, protected data, or pin changed after the reviewed source candidate.
- The only codebase assertion edit is `tests/tg_schema_freeze.test.ts`: its title now names schema 38, and the exact sorted `military` key literal adds the already-supported `brigade_movement_orders` key between `brigade_front_assignment` and `cascade_penalties`. The exact equality guard and political/displacement assertions remain intact.
- `9ac9f11da..8db305596` has no change to `data/derived/startup/apr_1992_initial_save.json`, `src/state/game_state.ts`, `src/state/save_migration.ts`, or the pre-correction freeze test. The retained diagnosis traces the startup artifact change to ancestor `c126ddec3`; this correction therefore updates a stale sentinel rather than accepting new schema drift.
- The staged `logs/roadmap-integration-20260912/approved-coverage-tests.log` is the exact path already cited by `docs/PROJECT_LEDGER.md:4829`. Adding the retained receipt fixes the full-suite fresh-clone citation failure without weakening the citation validator. SHA-256: `2BFB801DE73C1FA5B9594850CED763C8C4608A4368F2D75E9204D3F3575987CB`.
- The retained full-suite log accounts for 13,945 passing assertions across its balanced shards, two genuine assertion failures (missing cited receipt and stale schema literal), one 10-second `beforeAll` timeout that skipped the 12 runtime-dependency tests, and 43 total skipped assertions. The focused rerun passes receipt citations 43/43, schema freeze 7/7, and runtime dependency resolution 12/12: 62/62 total in 4.63 seconds, with no raised timeout.
- `git diff --check` and `git diff --cached --check` both pass.

No additional tests or campaign were run for this addendum. Evidence: `schema-freeze-diagnosis.md`, `full-suite.log`, and `full-suite-corrections.log` in this directory.
