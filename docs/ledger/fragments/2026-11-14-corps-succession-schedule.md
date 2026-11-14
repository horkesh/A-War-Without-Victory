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
- Evidence: with the empty schedule the succession pass returns an identical state and report (unit test); tests 13 new, 100 across the officer and roster suites; `tsc` 0. The measured 188-week run is pending (after #623 and #625).
