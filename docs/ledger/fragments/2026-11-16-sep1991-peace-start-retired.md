## 2026-11-16 — The September 1991 peace start is removed; schema v40 deletes `meta.peace_war_start_control_path`

The campaign structure decision of 2026-03-23 (`PROJECT_LEDGER_KNOWLEDGE.md`) cut the September 1991 start: April 1992 is the only campaign. `sep1991_to_dayton` survived as a leftover scenario file, and its peace start wrote an ABSOLUTE filesystem path into GameState (`meta.peace_war_start_control_path`), so its state hash depended on where the repo was checked out. Orchestrator ruling: retire the dead path rather than make it repo-relative (the `relative-control-path` branch is dropped, never opened as a PR).

**Removed.**
- `data/scenarios/sep1991_to_dayton.json` and its `SCENARIO_REGISTRY` entry ("Peace to War"; it still said `available: true`, but no runtime code reads the registry).
- The runner's peace-start block (`start_lifecycle_phase === 'peace'`), the peace war-start turn for org-pen seeding (now always 0), the 1991 start date branch, and the control-map read at the peace-to-war transition.
- The scenario fields `peace_referendum_held_at_start`, `peace_rs_declared_at_start`, `peace_hrhb_declared_at_start`, `peace_referendum_turn`, `peace_war_start_turn`, `peace_war_start_control`. The loader now rejects `start_lifecycle_phase: "peace"`; `"war"` is the only start.
- `meta.peace_war_start_control_path`: removed from the `GameState` type and the player-visible meta projection. Nothing in `src/sim`, the desktop or the UI read it.

**Later starts retired too: 1.0 ships ONE start, April 1992.** Owner ruling 2026-11-17: "All I want for 1.0 is one game, one start, one truthful game. Those scenarios are leftovers."
- `data/scenarios/apr1993_start.json` and `apr1994_start.json` were placeholders: they differed only in `scenario_id` and briefing text, set no `init_control`, start week or start formations, and so both ran April 1992 for 52 weeks with the identical final hash (`914c6aaa7ed5cbe1` on main 23d130286). Deleted.
- `data/scenarios/apr1995_start.json` was a real start (`init_control` and `init_formations` = `apr1995`) but is not 1.0 content. Deleted.
- Nothing in `src` or the desktop offered any of the three; no registry entry named them.
- The generic mid-war start capability is KEPT (the loader's `init_control` / `init_formations` key resolvers and the runner path), so later starts can arrive after 1.0 as pure data. It is now covered by `tests/fixtures/scenarios/mid_war_start_init_control.json` (`tests/scenario_init_control.test.ts`) instead of a shipped scenario. The apr1995 control and formation data files stay; the fixture uses them. No loader code was reachable only from these files.
- Dated evidence records that list the files (the October 2026 provenance pins, cleanup audits, reports) are left as written. Real 1993 and 1994 starts are a content item, not engine work.

**Schema v40.** `CURRENT_SCHEMA_VERSION` 39 → 40. Migration v40 deletes the key. The validator stops requiring it from v40 (`retiredAtVersion`) and rejects it if present on a v40 state. Fixture `v39_peace_control_path_retired.json` holds a legacy absolute path; an old v39 save loads, validates and round-trips without it. The startup snapshot is rebuilt at v40.

**Hash-moving.** Removing the key changes every save, so the manifest pin moves (historical final `ed32f0ddc872082c`, re-blessed). Proof: apr1992 historical and hands-off emergent differ from main ONLY by the deleted key and the schema number (deep diff of the final saves: two paths each, `meta.peace_war_start_control_path` null → absent and `schema_version` 39 → 40). The 40-week structural fingerprint (`3b1ddd64fb4f1600`) is unchanged. These two runs are the whole proof set from now on.

**Not in this change.** The in-sim peace phase (`runOneTurn`'s peace branch, referendum and declaration logic, `peace_scheduled_*` meta, the UI `phase === 'peace'` branches) is retired pre-freeze in its own PR, with the canon edits it needs.

Tests: new `tests/sep1991_peace_start_retired.test.ts`; registry, schema-freeze, versioned-steps and drift-audit pins updated; the postturn-boundary "remaining-peace branch" case removed (a peace start can no longer be built).
