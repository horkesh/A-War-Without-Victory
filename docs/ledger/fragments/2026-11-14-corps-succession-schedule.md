## 2026-11-14 — Corps succession follows a dated, sourced schedule (L4 mechanism, empty schedule)

Command-loop proposal §5E, owner decision 3. Mechanism only; the dates are lane L8 (BC17, post-freeze).

- New `data/scenarios/corps_co_roster.json` (ships empty): per corps, tenures with `officer_id`, `tenure_start`, `tenure_end` (exclusive, null = to the end), `historical_fate` (`survived`, `killed`, `relieved`) and `source`. Validated at load (`corps_co_roster.ts`); bundled by `corps_co_roster_data.ts`; Node loader `corps_co_roster_loader.ts`.
- `officer_system.ts`:
  - vacancies are filled from the schedule first, with `findBestReplacement` as the fallback;
  - when a scheduled tenure starts, the fallback holder steps aside (a generic acting commander retires, a named one returns to the reserve); a holder commanding elsewhere moves, and his old corps is refilled the same turn;
  - the President's appointee (`co_replacement_record`) is never rotated out; a manually controlled player gets a replacement matter, not a swap;
  - officers the schedule records as surviving the war never accrue the casualty-exposure clock; scheduled deaths and reliefs are applied idempotently;
  - the autonomy-0 replacement suggestion reads the schedule first.
- Faction-symmetric (FORAWWV §X.4). FORAWWV §X.3 amended in the same change (panel record in the PR).
- Run provenance: the file is a deferred stamp (17 -> 18); L8 must stamp it when the dates land.
- **L4 alone changes no outcome.** With the empty schedule the engine is byte-identical to main. Dudaković surviving the war and Mahmuljin in the right corps arrive only with L8's dated schedule; this is not "the succession fix is done".
- Panel fixes (seven-seat convening; all schedule-gated):
  - a manually controlled player is never overruled, and a President-appointed, accepted or kept commander is protected;
  - the validator rejects cross-corps overlaps for one officer and tenures after a death, and checks faction, rank and availability against the officer and OOB data;
  - a relief removes only the stint seated before its date (same-week transfer off-by-one fixed), and the pool never re-picks an officer relieved from that corps;
  - a scheduled death clears `assigned_operation`;
  - war survival is derived: any tenure and none `killed`.
- Evidence: 188w on main 41fce0541 and on the branch, `final_state_hash` `ca6db798f436fedf` on both; per-cell delta zero at Jan93/Apr94/Apr95/Oct95 (712/705/706/698); strict health PASS; anchors 31/31. Re-proved after merging main e9ddaa6e5 (#625): see the PR record. Tests 90 across the five officer/roster/provenance files; `tsc` 0.
- L8 must: stamp the file in `run_provenance.ts` (and make the ships-empty test fail unless it is stamped); give calendar-dated sources with confidence; cover all three factions; ship its own measured run, naming any cell a defect buys; add idempotence and save/load tests; allow no corps-level `killed` row without a primary source and panel sign-off.
- **Hard L8 blocker (engine seat C4b):** for a manually controlled player with an acting commander, step 5a raises an "incumbent → holder" matter, and in the same turn the pool path in 5b can still replace the generic acting commander. That leaves the matter stale, and the unchecked `accept-officer-replacement` handler could then seat a second commander. Unreachable with the empty schedule. L8 must fix it (re-validate the matter on accept, or do not raise it when 5b will replace the incumbent) before any tenure lands.
- Open (not L4): there is no event-driven command-casualty path; scheduled deaths are the only dated ones.
