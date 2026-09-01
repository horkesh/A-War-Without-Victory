# Militia Casualty Persistence Implementation Plan

> **SUPERSEDED IN PART, 2026-09-01.** Task 2's own preflight falsifier FIRED: 27 of 30
> militia-only battles draw on a pool with `available == 0`, because `available` is the
> post-mobilization recruitment residual. **Task 5 (the manpower cap) was dropped by owner
> decision** and is now prohibited by Engine Invariants §6.1; Task 8 Step 2 is deferred.
> The projections in "Established evidence" below (1,733/370 and 2,821/609) are stale — the
> committed diagnostic produces 1,728/380 and 2,792/614 using the engine's real
> KIA/WIA/MIA split (0.22/0.74/0.04). See `docs/PROJECT_LEDGER.md` 2026-09-01.

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make militia-only combat consume durable manpower and persist KIA/WIA/MIA exactly once in the canonical casualty ledger.

**Architecture:** Treat the existing `(municipality, faction)` militia pool as the authoritative manpower source for militia-only defense. Resolve militia defense and casualties through one atomic helper that caps defense by available pool manpower, debits raw losses, tracks wounded and permanent exhaustion, and writes a separate `per_militia_pool` ledger breakdown while preserving faction totals. Keep the existing population formula only as the local garrison ceiling; it must no longer create inexhaustible manpower.

**Tech Stack:** TypeScript, Vitest, deterministic GameState schema/migrations, Node 22 scenario tooling.

---

## Scope and non-goals

This is a **War-phase engine integrity change**. It does not alter initial control, scenario data,
painted calibration references, operation catalogs, casualty fractions, the baseline manifest, or
checkpoint floors.

Included:

- OSID militia-only defense and casualty resolution.
- Canonical casualty-ledger persistence and militia-pool depletion.
- Deterministic militia WIA recovery.
- Compatibility alignment of the older SID battle resolver.
- Save migration, validation, reporting, diagnostics, docs, and tests.

Excluded:

- Creating militia formations.
- Rebalancing casualty rates or the casualty-realism fractions.
- Reworking brigade recruitment or municipal mobilization rates.
- Recalibrating territory before engine verification is complete.
- Starting a 188-week run without fresh owner authorization.

## Established evidence

- The current 40-week artifact contains 42 null-defender militia battles and 3,844 raw defender
  casualties that are reported but not persisted. Applying current ledger fractions would add
  approximately 1,733 recorded casualties, including 370 killed.
- Clean 188-week baseline `n388` contains 66 such battles and 5,979 raw casualties, corresponding
  to approximately 2,821 recorded casualties, including 609 killed. This is magnitude evidence
  from the older clean baseline, not a current-branch result.
- `attack_resolution_osid.ts` writes defender losses only when a `defenderFormation` exists.
- `computeMilitiaDefensePower()` currently derives defense from population even when no matching
  militia-pool manpower remains.
- The legacy SID resolver debits `pool.available` but does not write a militia casualty-ledger row.
- `apply-casualty-pool-exhaustion` reconstructs approximate formation losses and ignores militia.

## Required reading before implementation

- `CLAUDE.md` sacred rules and smoke-test triad.
- `.claude/napkin.md`, especially engine runtime patterns.
- `docs/life_lessons.md` index; `docs/life_lessons/architecture.md` single-writer lesson;
  `docs/life_lessons/process.md` casualty magnitude and end-to-end attribution lessons.
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §§2.2, 13, 14.
- `docs/10_canon/Systems_Manual_v0_9_0.md` combat, persistence, and militia sections.
- `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md` §§1, 8, 9a.
- `docs/40_reports/REAL_WAR_MASTER.md` casualty and ledger open issues.
- `docs/40_reports/20260806_PHASE3_PREMISE_FALSIFIED_CASUALTY_REALISM.md`.

## Hard implementation invariants

1. One casualty event has one authoritative writer.
2. Raw casualties drive personnel/resource depletion; realism-scaled casualties drive the
   historical ledger. Do not mix those quantities.
3. `faction totals = sum(per_formation) + sum(per_militia_pool)` after every write.
4. A militia pool cannot spend more manpower than `available`.
5. Multiple OSIDs in one municipality share the same pool budget.
6. WIA may return; KIA/MIA may not.
7. No synthetic militia IDs may be inserted into `per_formation`.
8. Sorted iteration uses `strictCompare`; no randomness, timestamps, `Date.now()`, or transcendental
   state math.
9. Save/load continuation must be byte-identical to uninterrupted continuation.

### Task 1: Pin the defect with characterization tests and a diagnostic

**Files:**

- Create: `tests/militia_casualty_persistence.test.ts`
- Create: `tools/diagnostics/militia_casualty_gap.cjs`
- Reference: `src/sim/combat/attack_resolution_osid.ts`

**Step 1: Write a failing OSID battle test**

Build the smallest state with:

- one executing CorpsOperation attacker;
- enemy political control at the target;
- no defender formation;
- a positive matching militia pool;
- population sufficient to produce militia defense.

Assert all four desired postconditions:

```ts
expect(battle.defender_kind).toBe('militia');
expect(battle.defender_casualties).toBeGreaterThan(0);
expect(afterPool.available).toBe(beforePool.available - battle.defender_casualties);
expect(ledger.RBiH.per_militia_pool['gorazde:RBiH']).toBeDefined();
```

**Step 2: Run the test and prove the current defect**

Run:

```powershell
npx vitest run tests/militia_casualty_persistence.test.ts --pool=forks --reporter=dot
```

Expected: FAIL because `defender_kind` and `per_militia_pool` do not exist and the pool is unchanged.

**Step 3: Add the read-only diagnostic**

The diagnostic accepts a run directory, reads `weekly_report.jsonl`, and prints:

- null-defender battle count;
- raw casualties by faction;
- projected current-ledger KIA/WIA/MIA by faction;
- top 20 OSIDs by missing raw casualties.

Sort faction and OSID output with lexical ordering after the numeric casualty rank. Do not mutate
the run directory.

**Step 4: Validate the diagnostic against retained evidence**

Run it against:

```text
F:\A-War-Without-Victory\runs\codex_eastern_enclaves_final_review\apr1992_definitive_188w__7c3a0f299a8c80e9__w40_n0
F:\A-War-Without-Victory\runs\apr1992_definitive_188w__46834a3b41033bff__w188_n388
```

Expected totals: 42/3,844 and 66/5,979 respectively.

**Step 5: Commit the characterization**

```powershell
git add tests/militia_casualty_persistence.test.ts tools/diagnostics/militia_casualty_gap.cjs
git commit -m "test(engine): expose missing militia casualty persistence"
```

### Task 2: Preflight the municipal-pool architecture

**Files:**

- Modify: `tools/diagnostics/militia_casualty_gap.cjs`
- Test: `tests/militia_casualty_persistence.test.ts`

**Step 1: Add live reason-code fields needed for a bounded preflight**

In the test harness or a temporary diagnostic-only branch, record at every militia-only battle:

```ts
{
  target_osid,
  defender_faction,
  militia_pool_key,
  pool_available_before,
  population_garrison_ceiling
}
```

Do not persist this temporary structure in normal saves.

**Step 2: Run the shortest canonical proof that reaches militia combat**

Use the canonical 188-week scenario with a bounded week override. Do not use deprecated scenarios.

Expected: every claimed militia defense identifies a matching faction/municipality pool.

**Step 3: Apply the architecture stop condition**

STOP and report to the owner before implementation if any historically intended militia defense
has no matching pool or if zero-available pools routinely need to generate positive defense.
That result falsifies direct pool backing and requires a separately persisted OSID militia store.
Do not silently preserve the population ghost as a fallback.

**Step 4: Commit only durable diagnostic changes**

Remove temporary debug-only state before committing.

```powershell
git add tools/diagnostics/militia_casualty_gap.cjs tests/militia_casualty_persistence.test.ts
git commit -m "test(engine): validate militia pool casualty source"
```

### Task 3: Add the v38 persistence contract

**Files:**

- Modify: `src/state/game_state.ts`
- Modify: `src/state/casualty_ledger.ts`
- Modify: `src/state/save_migration.ts`
- Modify: `src/state/validateGameState.ts`
- Modify: `tests/save_migration_versioned_steps.test.ts`
- Modify: `tests/save_migration_validator_rejection.test.ts`
- Modify: `tests/save_migration_round_trip_contract.test.ts`
- Create: `tests/fixtures/save_migration/v37_militia_casualties.json`

**Step 1: Write migration and validation tests first**

Assert that a v37 save migrates to v38 with:

```ts
pool.wounded_pending === 0
factionLedger.per_militia_pool === {}
```

Assert rejection of negative, non-finite, or malformed militia casualty rows and wounded values.

**Step 2: Run the migration tests and verify failure**

```powershell
npx vitest run tests/save_migration_versioned_steps.test.ts tests/save_migration_validator_rejection.test.ts tests/save_migration_round_trip_contract.test.ts --pool=forks --reporter=dot
```

Expected: FAIL because schema v38 and the fields do not exist.

**Step 3: Add the state types**

In `MilitiaPoolState` add:

```ts
wounded_pending?: number;
```

In `FactionCasualtyLedger` add:

```ts
per_militia_pool: Record<string, FormationCasualties>;
```

Use the existing canonical militia-pool key (`${mun_id}:${faction}`); do not create another key
format.

**Step 4: Add schema v38 migration**

- Increment `CURRENT_SCHEMA_VERSION` from 37 to 38.
- Initialize `wounded_pending = 0` for every sorted militia-pool key.
- Initialize `per_militia_pool = {}` for every faction ledger.
- Preserve all existing values exactly.
- Document forward-only migration and the expected final-state hash movement.

**Step 5: Extend validation and initialization**

- `initializeCasualtyLedger()` must create empty `per_militia_pool` records.
- `ensureFaction()` must repair the record for runtime-created faction ledgers.
- Validator must require the record for schema v38 and validate every casualty field.

**Step 6: Run migration tests and typecheck**

Expected: PASS.

**Step 7: Commit the schema contract**

```powershell
git add src/state/game_state.ts src/state/casualty_ledger.ts src/state/save_migration.ts src/state/validateGameState.ts tests/save_migration_versioned_steps.test.ts tests/save_migration_validator_rejection.test.ts tests/save_migration_round_trip_contract.test.ts tests/fixtures/save_migration/v37_militia_casualties.json
git commit -m "feat(state): persist militia casualty accounts"
```

### Task 4: Implement one atomic militia casualty writer

**Files:**

- Create: `src/sim/combat/militia_casualties.ts`
- Modify: `src/state/casualty_ledger.ts`
- Test: `tests/militia_casualty_persistence.test.ts`

**Step 1: Add failing pure-helper tests**

Cover:

- exact raw debit from `pool.available`;
- WIA addition to `pool.wounded_pending`;
- 75% of KIA+MIA added to `pool.exhausted`, matching the established demographic rule;
- realism-scaled KIA/WIA/MIA added to faction totals and `per_militia_pool`;
- zero/negative input is a no-op;
- requested casualties are capped to available manpower;
- faction mismatch between pool and casualty event is rejected.

**Step 2: Add a ledger-specific writer**

Add `recordMilitiaCasualties()` beside `recordBattleCasualties()`. It must use the same realism
scaling exactly once and update faction totals plus `per_militia_pool`, never `per_formation`.

**Step 3: Add the atomic engine helper**

Use a narrow contract:

```ts
applyMilitiaBattleCasualties({
  state,
  faction,
  targetOsid,
  rawCasualties,
}): {
  poolKey: string;
  appliedRaw: FormationCasualties;
  appliedTotal: number;
}
```

Resolve the municipality deterministically from the OSID, validate the pool faction, mutate the
pool and ledger in the same call, and update `pool.updated_turn` from `state.meta.turn`.

**Step 4: Run the focused test**

Expected: pure helper tests PASS; resolver integration remains failing until Task 6.

**Step 5: Commit**

```powershell
git add src/sim/combat/militia_casualties.ts src/state/casualty_ledger.ts tests/militia_casualty_persistence.test.ts
git commit -m "feat(engine): add atomic militia casualty writer"
```

### Task 5: Make militia defense consume the authoritative pool

**Files:**

- Modify: `src/sim/combat/combat_math.ts`
- Modify: `src/sim/combat/combat_predictor.ts`
- Modify: `src/sim/combat/attack_resolution_osid.ts`
- Test: `tests/militia_casualty_persistence.test.ts`
- Test: `tests/sector_offensive_in_transit_predictor.test.ts`

**Step 1: Write failing defense-budget tests**

Assert:

- local garrison personnel is `min(population-derived ceiling, pool.available)`;
- no pool means no militia defense after the Task 2 preflight passes;
- zero available means zero militia defense;
- two attacks in one municipality observe the first attack's pool debit;
- predictor and resolver return identical militia defender power for identical state.

**Step 2: Introduce one shared militia-defense query**

Replace population-only call sites with a helper returning:

```ts
{
  poolKey: string | null;
  personnel: number;
  power: number;
}
```

Preserve the existing population formula as the **local ceiling**:

```ts
populationCeiling = max(5000, osidPopulation) * MILITIA_DEFENSE_RATIO;
personnel = min(populationCeiling, pool.available);
power = personnel * 0.25;
```

Do not add a positive fallback after the pool cap.

**Step 3: Use the shared query in predictor and resolver**

The same query must drive both opening viability and actual combat. Cache only within the current
call; the pool is mutable between battles.

**Step 4: Run focused tests**

Expected: budget and predictor/resolver parity tests PASS.

**Step 5: Commit**

```powershell
git add src/sim/combat/combat_math.ts src/sim/combat/combat_predictor.ts src/sim/combat/attack_resolution_osid.ts tests/militia_casualty_persistence.test.ts tests/sector_offensive_in_transit_predictor.test.ts
git commit -m "fix(engine): bound militia defense by durable manpower"
```

### Task 6: Wire exact militia losses into OSID battle resolution

**Files:**

- Modify: `src/sim/combat/attack_resolution_osid.ts`
- Modify: `src/sim/combat/attack_resolution_types.ts`
- Modify: `src/sim/combat/attack_casualty_distribution.ts`
- Test: `tests/militia_casualty_persistence.test.ts`
- Test: `tests/probe_territory_flip.test.ts`

**Step 1: Extend battle provenance**

Add:

```ts
defender_kind: 'formation' | 'militia' | 'none';
defender_militia_pool_key?: string;
```

`defender_brigade: null` remains for compatibility but is no longer the only source classifier.

**Step 2: Apply losses in the no-formation branch**

After final defender casualties are computed, split them with `splitKiaWiaMia()` and call the
atomic militia writer. Set `appliedDefenderCas` to the helper's actual capped total so reports,
AARs, and ledger cannot disagree.

**Step 3: Preserve formation behavior**

Do not route formation casualties through the militia helper. Existing weighted defender
distribution remains unchanged.

**Step 4: Add double-write guards**

Tests must prove a militia battle creates no `per_formation` entry and one militia-pool entry, and
a formation battle creates no militia-pool entry.

**Step 5: Run focused combat suites**

```powershell
npx vitest run tests/militia_casualty_persistence.test.ts tests/probe_territory_flip.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/distance_weighted_defense.test.ts --pool=forks --reporter=dot
```

Expected: PASS.

**Step 6: Commit**

```powershell
git add src/sim/combat/attack_resolution_osid.ts src/sim/combat/attack_resolution_types.ts src/sim/combat/attack_casualty_distribution.ts tests/militia_casualty_persistence.test.ts tests/probe_territory_flip.test.ts
git commit -m "fix(combat): persist militia-only battle losses"
```

### Task 7: Add deterministic militia WIA recovery

**Files:**

- Modify: `src/sim/formation_spawn.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`
- Modify: `src/state/formation_constants.ts` only if a separate rate is historically required
- Modify: `tests/wia_trickleback.test.ts`
- Test: `tests/militia_casualty_persistence.test.ts`

**Step 1: Write failing recovery tests**

Assert stable pool-key order, no return above pending, no negative values, and exact conservation:

```text
available increase == wounded_pending decrease
```

**Step 2: Implement pool WIA trickleback**

Extend the existing WIA recovery surface rather than creating an unrelated pipeline system. Use
the existing rate unless historical review requires a militia-specific rate. Process sorted pool
keys and return wounded to `available`.

**Step 3: Preserve pipeline ordering**

Run militia WIA recovery in the existing `wia-trickleback` phase. It must occur after current-turn
combat and before the next turn can spend the returned manpower.

**Step 4: Run tests and commit**

```powershell
npx vitest run tests/wia_trickleback.test.ts tests/militia_casualty_persistence.test.ts --pool=forks --reporter=dot
git add src/sim/formation_spawn.ts src/sim/turn_phases/war_phases.ts src/state/formation_constants.ts tests/wia_trickleback.test.ts tests/militia_casualty_persistence.test.ts
git commit -m "feat(engine): recover militia wounded deterministically"
```

### Task 8: Remove approximate/double accounting and align the legacy resolver

**Files:**

- Modify: `src/sim/combat/battle_resolution.ts`
- Modify: `src/sim/turn_phases/war_phases.ts`
- Modify: `src/sim/early_war/pool_population.ts`
- Test: `tests/combat_pipeline.test.ts`
- Test: `tests/early_war_pool_population.test.ts`
- Test: `tests/militia_casualty_persistence.test.ts`

**Step 1: Add exact-receipt tests**

Prove the post-combat exhaustion result uses casualties actually applied by resolution, not a
second estimate from already-reduced personnel.

**Step 2: Replace approximate reconstruction**

Preferred implementation: emit exact casualty receipts from battle resolution and pass those to
`applyCasualtyPoolExhaustion`. Remove the ATK/DEF rate reconstruction block from
`apply-casualty-pool-exhaustion` once all formation paths supply exact receipts.

Do not add militia exhaustion twice: the atomic militia writer already owns its pool mutation.

**Step 3: Align legacy SID combat**

Replace its direct `pool.available` subtraction with the same atomic militia writer and provenance
shape. If the legacy path cannot supply an OSID, resolve the canonical municipality/pool key from
its existing settlement-to-municipality map and record that explicit limitation in the receipt.

**Step 4: Run tests and commit**

```powershell
npx vitest run tests/combat_pipeline.test.ts tests/early_war_pool_population.test.ts tests/militia_casualty_persistence.test.ts --pool=forks --reporter=dot
git add src/sim/combat/battle_resolution.ts src/sim/turn_phases/war_phases.ts src/sim/early_war/pool_population.ts tests/combat_pipeline.test.ts tests/early_war_pool_population.test.ts tests/militia_casualty_persistence.test.ts
git commit -m "fix(engine): use exact casualty exhaustion receipts"
```

### Task 9: Propagate truthful reporting and consumers

**Files:**

- Modify: `src/state/turn_summary.ts`
- Modify: `src/sim/compile_turn_summary.ts`
- Modify: `src/scenario/scenario_reporting.ts`
- Modify: `src/scenario/scenario_runner.ts`
- Modify: `src/desktop/player_visible_state.cjs`
- Modify: `src/ui/map/components/AARPanel.tsx`
- Modify: `src/ui/map/data/GameStateAdapter.ts`
- Modify: `tools/engine_health_gate.cjs`
- Modify: `tools/diagnostics/engine_truth_checkpoint.cjs`
- Modify: `tests/scenario_reporting_contracts.test.ts`
- Modify: `tests/desktop_player_visible_state.test.ts`
- Modify: `tests/ui_map_game_state_adapter.test.ts`

**Step 1: Write consumer tests first**

Assert that:

- weekly and turn-summary battle rows preserve `defender_kind` and pool key;
- player-visible output says local militia rather than inventing a brigade;
- `GameStateAdapter` does not treat militia-pool keys as formation IDs;
- engine truth verifies faction totals equal both breakdown classes;
- health-gate K:W reads the expanded faction totals without fallback double counting.

**Step 2: Propagate the fields**

Forward existing values only. Do not recompute casualty source in reporting or UI code.

**Step 3: Add the accounting invariant**

The diagnostic must fail if, for any faction:

```text
top-level KIA/WIA/MIA != per_formation sum + per_militia_pool sum
```

**Step 4: Run consumer suites and map build**

```powershell
npx vitest run tests/scenario_reporting_contracts.test.ts tests/desktop_player_visible_state.test.ts tests/ui_map_game_state_adapter.test.ts --pool=forks --reporter=dot
npm run desktop:map:build
```

Expected: PASS.

**Step 5: Commit**

```powershell
git add src/state/turn_summary.ts src/sim/compile_turn_summary.ts src/scenario/scenario_reporting.ts src/scenario/scenario_runner.ts src/desktop/player_visible_state.cjs src/ui/map/components/AARPanel.tsx src/ui/map/data/GameStateAdapter.ts tools/engine_health_gate.cjs tools/diagnostics/engine_truth_checkpoint.cjs tests/scenario_reporting_contracts.test.ts tests/desktop_player_visible_state.test.ts tests/ui_map_game_state_adapter.test.ts
git commit -m "feat(reporting): expose militia casualty provenance"
```

### Task 10: Update canon, engineering truth, and ledger

**Files:**

- Modify: `docs/10_canon/Engine_Invariants_v0_9_0.md`
- Modify: `docs/10_canon/Systems_Manual_v0_9_0.md`
- Modify: `docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md`
- Modify: `docs/40_reports/CALIBRATION_MASTER.md`
- Modify: `docs/40_reports/REAL_WAR_MASTER.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Modify: `.claude/napkin.md`

**Step 1: Obtain required canon review**

Because canon files change, run the repository's canon-compliance/Pyrrhic review before merging.
The intended ruling is an alignment clarification: militia-only defense was already canon; this
change makes its manpower and casualties truthful.

**Step 2: Document the contract**

State explicitly:

- militia-only defense draws from a shared municipal faction pool;
- population sets a local ceiling, not renewable manpower;
- raw losses affect pool state;
- realism-scaled KIA/WIA/MIA affect historical totals;
- WIA recovery is deterministic;
- militia casualty provenance is separate from formation provenance.

**Step 3: Record calibration status honestly**

Mark all pre-change casualty totals as excluding militia-only defenders. Do not retroactively
rewrite old run numbers. Record new runs as a new accounting regime.

**Step 4: Commit docs**

```powershell
git add docs/10_canon/Engine_Invariants_v0_9_0.md docs/10_canon/Systems_Manual_v0_9_0.md docs/20_engineering/MILITIA_BRIGADE_FORMATION_DESIGN.md docs/40_reports/CALIBRATION_MASTER.md docs/40_reports/REAL_WAR_MASTER.md docs/PROJECT_LEDGER.md .claude/napkin.md
git commit -m "docs(engine): define durable militia casualty accounting"
```

### Task 11: Verification and calibration handoff

**Files:**

- No baseline-manifest edit in this task.
- Generated run artifacts stay outside the commit unless an existing policy explicitly tracks them.

**Step 1: Run focused tests**

```powershell
npx vitest run tests/militia_casualty_persistence.test.ts tests/wia_trickleback.test.ts tests/early_war_pool_population.test.ts tests/probe_territory_flip.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/distance_weighted_defense.test.ts tests/scenario_reporting_contracts.test.ts tests/save_migration_versioned_steps.test.ts tests/save_migration_validator_rejection.test.ts tests/save_migration_round_trip_contract.test.ts --pool=forks --reporter=dot
```

Expected: all pass.

**Step 2: Run the mandatory smoke triad**

```powershell
npm run typecheck
npm run test:vitest
npm run desktop:map:build
git diff --check
```

Expected: all pass.

**Step 3: Prove deterministic save/load continuation**

Run an uninterrupted bounded scenario and a save/resume at the midpoint. Compare canonical final
save hashes and militia pool/ledger objects byte-for-byte.

Expected: identical.

**Step 4: Run a bounded canonical proof**

Use `data/scenarios/apr1992_definitive_188w.json` with the shortest horizon that includes several
militia-only battles. Verify:

- zero accounting-invariant failures;
- pool debits equal raw militia casualties;
- militia casualty totals are nonzero;
- no pool becomes negative;
- no repeated battle spends already-depleted manpower.

**Step 5: Run one 40-week canonical development run**

Compare against the immediately preceding branch run on:

- killed, wounded, missing;
- operations, attacks, battles, dead_ops;
- militia-only battles and casualties;
- pool availability/exhaustion/wounded by faction;
- January checkpoint score;
- enclave guard;
- operation-schedule divergence.

If rung-4 schedule divergence exceeds 20%, mark checkpoint deltas unattributable and judge the
engine change on named accounting invariants and behavioral counts. Do not describe territory
movement as the change's cost under an unattributable schedule.

**Step 6: Apply magnitude sanity checks**

Compare recorded militia casualties with the retained projections (roughly 1.7k ledger casualties
at 40 weeks and 2.8k at the old 188-week baseline). A result outside 0.5×–2× of comparable battle
volume is a STOP condition requiring source-by-source audit.

**Step 7: Request owner authorization for the 188-week adoption run**

Do not start it automatically. Present the 40-week accounting proof, behavioral changes, and any
schedule divergence first.

**Step 8: After authorization only, run and reconcile**

- Run the full canonical 188-week scenario on Node 22.
- Run `engine_health_gate.cjs --horizon 188w` and checkpoint verification.
- Reconcile floors/manifest only if the owner separately accepts the new engine behavior and asks
  for reconciliation.

**Step 9: Final review, commit, and push**

Use `verification-before-completion`, `requesting-code-review`, `canon-compliance-review`, and
`awwv-pre-commit-check`. Confirm branch/upstream hashes match and the worktree is clean.

## Final acceptance checklist

- [ ] Militia battle casualties reduce durable manpower.
- [ ] Faction casualty totals include militia exactly once.
- [ ] `per_formation` contains formation IDs only.
- [ ] `per_militia_pool` uses canonical pool keys only.
- [ ] WIA recovery conserves personnel.
- [ ] KIA/MIA never return.
- [ ] Predictor and resolver use the same militia defense source.
- [ ] Multiple OSIDs cannot overspend one municipal pool.
- [ ] Legacy and OSID resolvers use the same writer.
- [ ] Approximate post-combat casualty reconstruction is removed or demonstrably non-overlapping.
- [ ] Save migration and validation pass.
- [ ] Save/resume is byte-identical.
- [ ] Reporting identifies militia defenders truthfully.
- [ ] Magnitude is historically plausible.
- [ ] Canon, engineering docs, Calibration Master, Real War Master, ledger, and napkin agree.
- [ ] No baseline manifest, painted control, or floor changes occur without separate authorization.

