# Engineering Open Questions — Recommendations (E1–E8)

**Date:** 2026-05-17
**Role:** Engineering / Architecture
**Status:** Picks, not options. Each ends with a `Recommendation:` line and cites concrete files.

Repo state references:
- `src/state/save_migration.ts` (99 lines) — registry, two registered migrations (v1, v2). `CURRENT_SCHEMA_VERSION = 2` (`src/state/game_state.ts:42`).
- `src/state/serialize.ts:194-706` — single `switch(version)` with one effective branch `case undefined: case CURRENT_SCHEMA_VERSION:` containing ~30+ in-place field defaults.
- `src/sim/turn_pipeline.ts:35` — canonical `runTurn(state, input)`.
- `src/ui/map/data/GameStateAdapter.ts` (2805 lines) — sole UI read chokepoint; canonicalized in its file header.
- `src/sim/combat/supply_pressure.ts` + `src/sim/combat/supply_condition.ts` — dual-source supply substrate.
- `package.json` — `typescript ^5.5.4`; **no `ts-morph` dependency**.
- `src/ui/warroom/run_phase0_turn.ts` — **does not exist on main** (grep confirms absent).

---

## E1 — Save migration v3..v_N grouping

The legacy default block at `src/state/serialize.ts:196-706` mutates state for fields added across many feature commits. Group them by origin-commit attribution (`git log --follow src/state/game_state.ts`) and bin contiguous fields by feature/phase.

| Version | Feature group | Example fields | Origin commit boundary |
|---|---|---|---|
| v3 | Front-edge/segments substrate (R10/R9 retire) | `mil.front_segments` defaults (`active_streak`, `friction`), `mil.assignable_front_segments`, `mil.front_pressure`, `mil.brigade_front_assignment` (`serialize.ts:202-211, 313-326`) | `bcf61e56 refactor: demote assignable front segment runtime` → `5b1431a4 refactor(R10) propagate R9 import paths` |
| v4 | Phase 0 (Peace) meta + faction declaration | `meta.referendum_held`, `meta.war_start_turn`, `meta.peace_*`, `faction.declaration_*`, `faction.declared` (`serialize.ts:216-227, 367-373`) | `5422f2a6 / 459a5b9e Integrate pending Phase 0/Warroom`, `cb249282 Consolidate repo: Phase 0` |
| v5 | Theatres + Formations Phase 10 | `mil.theatres`, `mil.army_theatre_assignment`, `mil.formations`, `form.ops.fatigue/last_supplied_turn` (`serialize.ts:205-208, 376-413`) | `de5ff94c feat(phase-m): year-one mechanics` (morale/displacement/enclave) + Phase 10 ops fields |
| v6 | Formation lifecycle (kind/readiness/cohesion/morale) | `form.kind`, `form.readiness`, `form.cohesion`, `form.morale`, `form.activation_gated`, `form.activation_turn` (`serialize.ts:416-440`) | Peace-phase formation lifecycle work consolidated in `eb238d6c mobilizing alliance phase` era |
| v7 | Militia pools | `mil.militia_pools`, `pool.fatigue`, militia faction canonicalization (`serialize.ts:213, 444-458`) | Pool-population era (`d52f6edb Battle of the Barracks`, `eb238d6c mobilizing alliance phase`) |
| v8 | Negotiation Phase 11A + 12A capital | `faction.negotiation.{pressure, last_change_turn, capital, spent_total}`, `pol.negotiation_status`, `pol.ceasefire`, `pol.negotiation_ledger` (`serialize.ts:271-309, 344-364, 461-475`) | Phase 11A/12A negotiation tranche |
| v9 | Supply rights + corridors (Phase 12C.3) | `pol.supply_rights.corridors`, beneficiary canonicalization (`serialize.ts:478-505`) | Phase 12C.3 supply rights |
| v10 | War-phase political/militia substrate | `pol.war_consolidation_until`, `pol.war_control_strain`, `mil.war_militia_strength`, `mil.war_jna.*`, `pol.war_alliance_rbih_hrhb` (`serialize.ts:541-573`) | Year-one + JNA-transition tranche (`de5ff94c`, `d52f6edb`) |
| v11 | War supply / exhaustion substrate (dual-source) | `pol.war_supply_pressure`, `pol.war_supply_condition`, `pol.war_exhaustion`, `pol.war_exhaustion_local` (`serialize.ts:580-596`) | `1c5e1323 LANE D-PRE`-adjacent supply-condition work + `20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md` |
| v12 | Phase F displacement + Lane D-PRE substrate | `disp.settlement_displacement*`, `disp.municipality_displacement`, `disp.displacement_event_log`, `disp.displacement_humanitarian_aggregates`, `disp.displacement_origin_dest_arrivals`, `disp.displacement_recent_by_turn` (`serialize.ts:599-642`) | `1c5e1323 feat(displacement): LANE D-PRE substrate` |

(v1 already holds HRHB enclave_resilience entries; v2 already holds `corps_command.active_operations[]` migration — keep as-is in `save_migration.ts:65-98`.)

The "AoR phase-out delete" sweep (`serialize.ts:662-665`) does NOT need a migration version — it is destructive cleanup; fold it into the v3 migration `migrate` body (legacy keys deleted up-front before any defaults).

**Recommendation:** Adopt v3..v12 (10 new versions). Each is one named migration registered in `save_migration.ts` with `description` matching the table's "Feature group". Bump `CURRENT_SCHEMA_VERSION` in `src/state/game_state.ts:42` from `2` to `12`. After registration, `case CURRENT_SCHEMA_VERSION` body in `serialize.ts:196` shrinks to ONLY the rescue/sweep logic (`rescueLegacyTopLevelFields` + the post-sweep block at 662-703); all field defaults move to versioned `registerMigration` entries.

---

## E2 — Save migration v0 deprecation policy

The v0.9.2 playtest package shipped saves before `CURRENT_SCHEMA_VERSION` was integrated — those saves arrive with `schema_version === undefined`. The current `switch(version)` at `serialize.ts:194-196` treats `undefined` the same as the current version (both run the full default sweep). Once E1 promotes 10 versioned migrations, an `undefined` save would still be load-able through the registry path (`applyMigrations` at `save_migration.ts:40-52`).

Cost of carrying v0 forward indefinitely:
- 10 sequential migration passes per legacy save on every load. Cheap (`O(N_fields)`).
- Migrations themselves are pure data patches with no engine semantics — low rot risk.

Cost of carrying v0 indefinitely is dominated by **test surface**: every new schema version needs the v0 round-trip test (see E3). At v12 the test matrix is 13 entries; at v25 it is 26. The matrix is linear in versions, not in field count.

The playtest-package implication is asymmetric: a player's save from v0.9.2 is irreplaceable; the cost of a single permanent v0 migration entry is negligible.

**Recommendation:** Keep v0 load-able indefinitely (no deprecation). Encode "v0 = pre-registry" as the explicit baseline: `applyMigrations` already treats `schema_version ?? 0` as the floor (`save_migration.ts:41`). After v1.0 ships, freeze the v0..v12 chain as a permanent compatibility wedge; if a future migration is destructive (drops a field that v0 saves require), add it ONLY at a new version boundary, never by editing existing migrations. Document the freeze in `docs/20_engineering/SAVE_MIGRATION_POLICY.md` (new file out of scope here).

---

## E3 — `runOneTurn` for round-trip test

The canonical per-turn entrypoint is `runTurn(state, input): Promise<{ nextState, report }>` at `src/sim/turn_pipeline.ts:35`. It is the function `runScenario` uses (`src/scenario/scenario_runner.ts`); the war-only pipeline guard at `turn_pipeline.ts:40-42` means a test fixture must set `meta.phase = 'war'` (which all real saves do).

A thin test-local wrapper is unnecessary — `runTurn` is already the slim orchestrator (per file header at `turn_pipeline.ts:1-7`). The only thing a per-schema-version round-trip test needs around it is:
1. A minimal `TurnInput` builder (seed string + any required RNG fixtures). The type lives in `turn_pipeline_types.ts` (re-exported at `turn_pipeline.ts:19-27`).
2. A `serializeState`/`deserializeState` pair, both exported from `src/state/serialize.ts:18, 30`.
3. Determinism harness already provides `stableStringify` (used at `scenario_runner.ts:1609`).

Reusing `runScenario` itself would over-pull: it writes artifacts, builds a startup state, and runs N weeks. A test that needs exactly one turn should NOT invoke `runScenario`.

**Recommendation:** Reuse `runTurn` from `src/sim/turn_pipeline.ts:35` directly. Test pattern: `deserializeState(legacySaveText) → runTurn(state, {seed: 'v3-roundtrip'}) → serializeState(nextState) → deserializeState(...) → byte-stable assertion against a stored golden`. Put the harness at `tests/save_migration_roundtrip.test.ts` and parametrize over each `vN` golden under `tests/fixtures/save_migration/vN.json`.

---

## E4 — strictNullChecks inventory tooling

`package.json:406-457` shows `typescript ^5.5.4` in devDependencies; **`ts-morph` is NOT present** (grep of `package.json` confirms). Adding ts-morph is one devDep but pulls TypeScript's compiler API surface — non-trivial when project already has `tsc --noEmit` as canonical typechecker.

Regex-grep tradeoff (per CLAUDE.md, prefer Grep tool which is ripgrep-based):
- Pro: zero new deps; runs in seconds across 2805-line files like `GameStateAdapter.ts`.
- Con: noisy on `as any` casts (12 occurrences in GameStateAdapter alone per grep), false positives on string contents.

ts-morph tradeoff:
- Pro: precise AST classification (truly nullable vs `| undefined` literal vs `?` optional chain). Catches `state.political?.x?.y` chains regex misses.
- Con: new devDep; takes longer; AST traversal across `tsconfig.json` `include: ["src", "tests"]` (line 14) is non-trivial.

The actual question the inventory answers — "how many strict-null sites exist per file, what shape are they?" — is dominated by **per-file aggregation**, not per-site classification. Regex-grep matches the shape because `tsc --noEmit -p tsconfig.json --strictNullChecks` already gives a precise per-file diagnostic list; the inventory tool's job is to count + sort + bucket, not to re-implement TS's analyzer.

**Recommendation:** Build `tools/diagnostics/strict_null_inventory.cjs` as a thin wrapper that runs `tsc --noEmit -p tsconfig.json --strictNullChecks` (already installed), captures stdout, parses `path(line,col): error TS2532/TS2533/TS18047/TS18048` lines via regex, and aggregates per-file counts. Zero new devDeps. Path: `tools/diagnostics/strict_null_inventory.cjs`. Out: `data/derived/_debug/strict_null_inventory.json` with `{ by_file: {[path]: {count, error_codes: {[code]: n}}}, total }`.

---

## E5 — strictNullChecks GameStateAdapter.ts phase sequencing

`GameStateAdapter.ts` is the sole UI read chokepoint — per its own header at `src/ui/map/data/GameStateAdapter.ts:2-13`: "OWNERSHIP: Canonical — UI Read Path. DECIDES: Nothing — read-only transformation layer." 2805 lines, 12 known `as any` cast sites (grep confirmed), and the memory entry explicitly flags it: "wrong nested path silently returns undefined, killing entire display chains."

Field-path consumers I traced:
- `state.political.war_supply_pressure` at line 1190 (typed `as any`)
- `state.political.war_supply_condition` at line 1201 (typed `as any`)
- `state.political.last_supply_state_by_osid` at line 1212 (typed via cast)
- `state.political.political_controllers` at line 1213 (typed via cast)
- `state.supply_state_by_osid` at line 1199 — **note: this references a top-level key but `political.last_supply_state_by_osid` is the canonical nested location** — this is exactly the silent-undefined hazard the memory warns about.
- `state.military.general_supply_reserve` at line 1218

Risk of moving Adapter to Phase 5 (last): every preceding phase's strict-null changes can break the Adapter's silent contracts before strict-null surfaces them. Risk of moving Adapter earlier: it depends on the schema types in `src/state/game_state.ts`, which Phase 1 (state) tightens.

Sequencing principle: the Adapter is downstream of state types but upstream of every UI component. Tightening it AFTER state types are strict but BEFORE UI components are migrated lets the Adapter act as a typed firewall — once it returns non-null `LoadedGameState` fields, all UI code below it gets correct types without per-component reasoning.

**Recommendation:** Promote GameStateAdapter to its own phase between current Phase 1 (state types) and Phase 5 (UI). Call it Phase 2.5 or rename phases: 1=state, **2=adapter (NEW)**, 3=sim, 4=scenario, 5=UI. The adapter migration becomes a single ~2-week focused effort that resolves all 12 `as any` casts and audits every nested path the memory entry warns about (verify each `state.X.Y.Z` chain against `game_state.ts` declaration). UI Phase becomes a near-mechanical sweep afterward.

---

## E6 — Supply pressure dual-source reconciliation

Reader inventory from grep of `src/sim/`:
- **Live readers (correct, use `getFactionLiveSupplyPressure`)**: `operation_opportunity_catalog_5th_corps.ts:268,512,791,1023,1507`, `operation_opportunity_catalog_central_bosnia.ts:241,320`, `operation_opportunity_catalog_federation_western_bosnia.ts:164`, `corps_operation_readiness.ts:301`, `exhaustion.ts:75`. **10 sites.**
- **Legacy direct readers (`state.political?.war_supply_pressure?.[faction]`)**: only one — `supply_condition.ts:100` inside `getFactionLiveSupplyPressure` itself as the fallback path. **Zero non-helper readers.**
- **Writer**: `supply_pressure.ts:105-126` accumulates cumulative pressure (monotonic, never decreased: `current + effectiveIncrement`, see line 125 — pressure[fid] = max of current and computed).
- **Live state**: `supply_pressure.ts:111-112` writes `state.political.war_supply_condition` from `liveCondition` every turn and deletes it when no live data.

The semantics differ:
- `war_supply_pressure`: monotonic-cumulative (overextension * front-edge count + isolation, with `pressure[fid] = current + effectiveIncrement * multiplier`). Never decreases.
- `war_supply_condition`: live snapshot derived from OSID supply state (`liveCondition = deriveFactionSupplyConditionFromOsidReport(...)`). Can decrease.

The post-2026-05-16 plan (`docs/40_reports/implemented/20260516_SUPPLY_CONDITION_LIVE_AGGREGATE.md:20`) already routes legitimate readers through `getFactionLiveSupplyPressure`, which prefers live and falls back to legacy. **No legacy direct reader remains in `src/sim/` outside the helper itself.**

UI reader at `GameStateAdapter.ts:1190-1196` still maps `war_supply_pressure` directly to `warPhaseSupplyPressure` — that's a separate UI surface (cumulative trace for diagnostic display), distinct from sim decisions.

Option (a) — keep cumulative, annotate — preserves the diagnostic trace value (warroom can show "cumulative supply pressure since war start") AND the live decision path is already isolated.
Option (b) — deprecate entirely with migration — destroys the cumulative-trace product surface and is risky for replay-stability of past saves.
Option (c) — compute from live for back-compat — defeats the cumulative semantic; pressure is monotonic by design (per `supply_pressure.ts` comment line 31 "Pressure is monotonic per faction").

**Recommendation:** Adopt option (a). Keep `war_supply_pressure` as cumulative-only with an annotation in `game_state.ts:2223-2224` (e.g. `/** CUMULATIVE supply pressure trace. For LIVE faction supply, read getFactionLiveSupplyPressure (supply_condition.ts:92). */`). Add a code-canon entry to `docs/PROJECT_LEDGER_KNOWLEDGE.md` documenting "dual-source supply: cumulative trace vs live snapshot." Forbid new direct reads of `state.political.war_supply_pressure` outside the helper via a lint rule or grep test (`tests/no_direct_war_supply_pressure_reads.test.ts`). UI consumer at `GameStateAdapter.ts:1190` stays as-is — labelled `warPhaseSupplyPressure` (cumulative diagnostic) distinct from `warPhaseSupplyCondition` (live).

---

## E7 — RBiH-HRHB Phase 0 → I transition site

`src/ui/warroom/run_phase0_turn.ts` does not exist on `main` (Glob and Grep both confirm absent). The legacy plan referenced a UI-layer phase-0 driver that no longer exists.

Current canonical transition substrate:
- `src/sim/early_war/alliance_update.ts:120-313` owns the alliance state machine. `isRbihHrhbMobilizing(state)` (line 120) and `isRbihHrhbCombatEnabled(state)` (line 133) are the gate predicates referenced by 4 combat gating sites (`bot_brigade_eval_attack.ts:223,365,715`, etc.).
- `src/sim/early_war/activate_corps.ts:50 activateCorpsForTurn(state, oobCorps, currentTurn, sidToMun?, municipalityHqSettlement?, canonicalToOperational?)` creates corps formations when `c.available_from <= currentTurn`. **This is the actual hvo_central_bosnia activation site** — called from war-phase step `activate-corps` at `src/sim/turn_phases/war_phases.ts:473-491`.
- `src/sim/turn_phases/early_war_phases.ts:46-52 isEarlyWarAllowed(state)` is the Peace-phase gate (`referendum_held && current_turn >= war_start_turn`).

The Phase 0 → I (Peace → War) transition itself happens inside `runTurn` (`src/sim/turn_pipeline.ts:35`) — the per-turn pipeline checks `state.meta.phase` and dispatches accordingly. No UI driver is involved; the war-only pipeline (`turn_pipeline.ts:40-42`) is canonical. The HRHB-RBiH transition specifically is a war-phase concern (alliance erodes during war), gated by `isRbihHrhbCombatEnabled` rather than a discrete Phase 0/I boundary.

**Recommendation:** The B/C plan should target `src/sim/turn_phases/war_phases.ts:473-491` (the `activate-corps` step) for any new hvo_central_bosnia / alliance-transition wiring, and `src/sim/early_war/alliance_update.ts:120-313` for the gate predicates. There is NO separate "phase 0 → I" file to target — that abstraction was removed in `a8f2b41d chore: Phase I/II terminology sweep — 400 references across 154 files` (per memory). Update the B/C plan to drop the `run_phase0_turn.ts` reference and replace with these two anchors.

---

## E8 — RBiH-HRHB Master report "FIXED" P1 verification approach

`BOSNIAK_CROAT_CONFLICT_MASTER.md:51-55` claims FIXED for three items the backlog still flags open:
1. **CB brigade redistribution** — "3 mandatory brigades failing to spawn (mun1990_id cross-boundary bug). 7→10 brigades."
2. **CB operations** — "Added Lašva Valley Offensive priority (w40-100). Gates correctly prevent ops before war starts."
3. **Kiseljak/Vitez pocket separation** — "Added 3 HRHB enclaves (Kiseljak, Lašva Valley, Žepče). Pockets already geographically separate."

Each claim is measurable from `runs/<run_dir>/final_save.json` (the canonical scenario-runner output, see `scenario_runner.ts:1606-1610`). A deterministic verification script should read it and emit pass/fail per item:

| Item | What to read from final_save.json | Pass condition |
|---|---|---|
| (1) CB brigade redistribution | `military.formations` → filter `corps_id === 'hvo_central_bosnia'` AND `kind === 'brigade'` AND `personnel > 0` | count >= 10 (HVO OZ Central Bosnia: Vitez, Busovaca, Kiseljak, Travnik, Novi Travnik, Vares + 4 mandatory adds). Source: `oob_corps.json` for hvo_central_bosnia membership. |
| (2) CB operations launched | `military.corps_command['hvo_central_bosnia'].active_operations[]` across all turns (need replay) OR scan `combat_history` / `operation_aar_log` for `corps_id === 'hvo_central_bosnia'` with `phase ∈ ('execution','recovery')` | at least 1 OZCB-launched operation present after `meta.war_start_turn + 8` (post-mobilization). For 40w scenario this might be too early; flag as "needs 56w scenario". |
| (3) Kiseljak/Vitez pocket separation | `political.enclave_resilience` keys include `'kiseljak'`, `'lasva_valley'`, `'zepce'` (per `save_migration.ts:65-78` v1 migration) AND each has `resilience >= 0`. ALSO `political.political_controllers` for OSIDs in Kiseljak group are `HRHB` AND no contiguous HRHB land-path connects Kiseljak group to Vitez/Busovaca group (BFS from Kiseljak-canonical OSID to Vitez-canonical OSID over HRHB-controlled OSIDs only fails). | enclave entries present + BFS isolation check holds. |

The script structure:
```
tools/verification/verify_bosniak_croat_p1.cjs
  1. argv: --save runs/<run>/final_save.json
  2. Load + parse JSON.
  3. Run three checks (above). Each emits {item, status: 'FIXED'|'OPEN'|'NEEDS_56W', evidence: {...}}.
  4. Exit 0 if all FIXED, 1 if any OPEN.
  5. Write report to data/derived/_debug/bosniak_croat_p1_verification.json.
```

Test (`tests/bosniak_croat_p1_verification.test.ts`) runs the script against the 56w scenario output (because (2) requires post-w40 evidence; the 40w cuts off at war start).

**Recommendation:** Build `tools/verification/verify_bosniak_croat_p1.cjs` that reads `final_save.json` and checks (1) brigade count under `military.formations` filtered by `corps_id === 'hvo_central_bosnia'`, (2) op presence in `military.corps_command['hvo_central_bosnia'].active_operations` plus AAR log scan, (3) `political.enclave_resilience` key presence plus BFS-on-HRHB-controlled-OSIDs isolation check. The script's output is authoritative — wherever it disagrees with the master report, update the master report; wherever it agrees with the backlog, close the backlog item. Add to `recovery:check` script in `package.json:50` as a non-blocking diagnostic.

---

## Summary Picks

- **E1:** v3..v12 grouping above; bump `CURRENT_SCHEMA_VERSION` to 12.
- **E2:** Keep v0 load-able indefinitely; freeze the v0..v12 chain post-v1.0.
- **E3:** Reuse `runTurn` from `src/sim/turn_pipeline.ts:35`. No wrapper.
- **E4:** Regex parsing of `tsc --strictNullChecks` diagnostics. No `ts-morph`.
- **E5:** Promote `GameStateAdapter.ts` to its own phase (Phase 2 of 5).
- **E6:** Option (a) — annotate `war_supply_pressure` as cumulative-only; live readers already go through `getFactionLiveSupplyPressure`.
- **E7:** Target `src/sim/turn_phases/war_phases.ts:473-491` and `src/sim/early_war/alliance_update.ts:120-313`. The legacy `run_phase0_turn.ts` does not exist.
- **E8:** Build `tools/verification/verify_bosniak_croat_p1.cjs` that reads `runs/<run>/final_save.json`; checks brigade count, op launch, enclave isolation BFS.
