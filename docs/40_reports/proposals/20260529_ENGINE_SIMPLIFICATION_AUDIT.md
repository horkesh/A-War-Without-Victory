# Engine Simplification Audit — Phase I Packet 1

## Status + scope

- **Date.** 2026-05-29
- **Session.** Phase I Packet 1 (engine simplification audit, read-only)
- **Branch.** `codex/diagnostics-output-artifact-doc-closeout`
- **Scope.** `src/sim/**` + `src/state/**` (TypeScript engine surface)
- **Out of scope.** UI shell (`src/ui/`), tools/scripts, tests, canon docs, scenario JSON, derived data
- **Out of bounds (calibration parallel work).** The following files are touched on `claude/calibration-historical-army-arc-2026-05-24`; this audit deliberately avoids recommending edits to them or anything that would trigger merge friction:
  - `src/sim/combat/attack_resolution_osid.ts`
  - `src/sim/combat/bot_brigade_eval_attack.ts`
  - `src/sim/combat/brigade_assignment.ts`
  - `src/sim/combat/combat_math.ts`
  - `src/sim/combat/corps_front_sectors.ts`
  - `src/sim/combat/corps_operation_helpers.ts`
  - `src/sim/combat/jna_phantom_brigades.ts`
  - `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
  - `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
  - `src/sim/combat/operation_preparation.ts`
  - `src/sim/combat/operation_validation.ts`
  - `src/sim/combat/paramilitary_sweep.ts`
  - `src/sim/combat/pre_planned_operations.ts`
  - `src/sim/combat/sector_building.ts`
  - `src/sim/combat/sector_offensive.ts`
  - `src/sim/combat/sector_offensive_launch_helpers.ts`
  - `src/sim/combat/strategic_depth.ts`
  - `src/sim/combat/supply_pressure.ts`
  - `src/sim/events/{ai_default_response,bot_response,evaluate_events,event_types}.ts`
  - `src/sim/local_truces.ts`
  - `src/sim/turn_phases/war_phases.ts`
  - `src/sim/turn_pipeline_types.ts`
  - `src/state/game_state.ts`
  - `src/state/save_migration.ts`
  - `src/state/{serialize,serializeGameState,supply_reserves,validateGameState}.ts`
- **Output discipline.** This is a READ-ONLY audit. Zero code changes. All recommendations are queued for future remediation packets.
- **CLAUDE.md directive.** "Simplification roadmap (`docs/plans/MASTER_ROADMAP.md`-pointed): repo-wide cleanup between v0.8 and v0.9" — this packet identifies the cleanup backlog; subsequent packets execute it.

## Section 1: Dead-export candidates

Top-10 high-confidence dead exports (zero importers outside their own file across `src/**`):

| # | File:line | Symbol | Importers in src/ | Recommendation |
|---|-----------|--------|-------------------|----------------|
| 1 | `src/sim/combat/brigade_aor_legacy.ts:34` | `identifyFrontActiveSettlements` | 0 (only self) | DELETE — module-internal helper exported needlessly |
| 2 | `src/sim/combat/brigade_aor_legacy.ts:64` | `expandFrontActiveWithDepth` | 0 | DELETE — same as above |
| 3 | `src/sim/combat/brigade_aor_legacy.ts:106` | `resolveMunicipalityForSid` | 0 | DELETE |
| 4 | `src/sim/combat/brigade_aor_legacy.ts:114` | `buildSidToMunMap` | 0 | DELETE |
| 5 | `src/sim/combat/brigade_aor_legacy.ts:131` | `buildMunicipalityAdjacency` | 0 | DELETE |
| 6 | `src/sim/combat/brigade_aor_legacy.ts:155` | `ENCIRCLED_GARRISON_MULT` | 0 | DELETE — AoR-era constant; sector system has its own garrison math |
| 7 | `src/sim/combat/brigade_aor_legacy.ts:201` | `getSettlementGarrison` | 0 | DELETE |
| 8 | `src/sim/local_truces.ts:31` | `VIENNA_DECLARATION_TURN` | 0 (deprecated alias of `GRAZ_ACCORDS_TURN`) | DELETE — renamed, no callers |
| 9 | `src/sim/local_truces.ts:99` | `isViennaDeclarationActive` (`@deprecated`) | 0 | DELETE — renamed alias |
| 10 | `src/sim/local_truces.ts:259` | `viennaShouldBlockAttack` (`@deprecated`) | 0 | DELETE — renamed alias |

Bonus (also dead, lower-tier confidence on exact boundary):

- `src/sim/local_truces.ts:314` `checkAndFireViennaDeclaration` — deprecated alias, zero callers in `src/**`.
- `src/sim/combat/brigade_aor_legacy.ts:157` `getBrigadeAoRSettlements` — only consumed BY the same module's `getBrigadeAoRSize` (line 178) and by `src/sim/combat/brigade_pressure.ts:77,102` via `computeBrigadeDensity`. `brigade_pressure.ts` itself has ONE importer: `src/_archived/ui_legacy/sandbox/sandbox_engine.ts`. The entire chain is reachable only from archived code — confirm and delete as a unit.
- `src/sim/combat/brigade_pressure.ts:166` `applyBrigadePressureToState` — only call site is `src/_archived/ui_legacy/sandbox/sandbox_engine.ts:255`. Archived consumer = effectively dead.

Confidence note. These flags follow the platform.md life-lesson "use tsc as source of truth, not grep" — they are dead by `import` grep across `src/**`. A pre-deletion sweep should also grep `tests/**` and `tools/**` to confirm; in this audit, `brigade_aor_legacy` has two test importers (`engine_honesty_legacy_contracts.test.ts`, `brigade_aor.test.ts`) which would need migration or deletion alongside the module.

## Section 2: Zombie code (version-transition residue)

Top-15 zombie comments paired with delete-candidate code:

| # | File:line | Comment / pattern | Suggested action |
|---|-----------|-------------------|------------------|
| 1 | `src/sim/run_early_war_browser.ts:59-63` | `assertNoAoRInEarlyWar` guards a forbidden state that the AoR phase-out has already eliminated everywhere else | Confirm via runtime trace, then delete the guard + import |
| 2 | `src/sim/run_combat_browser.ts:4` | `* AoR phase-out: no AoR init; War phase uses location_osid / OSID fronts.` | Delete this comment; the phase-out is done — comment is residue |
| 3 | `src/sim/early_war/bot_early_war.ts:7` | `Simpler than War phase bot (no corps/brigade hierarchy, no AoR, no OGs)` | Trim "no AoR, no OGs" from comment — AoR is fully gone |
| 4 | `src/sim/early_war/militia_emergence.ts:4` | `Deterministic ordering; no AoR, no fronts.` | Trim "no AoR" |
| 5 | `src/sim/combat/battle_resolution.ts:2,872,950,977,1073` | "Legacy SID-based battle resolution engine" + AoR phase-out comments throughout a 1500-line file with ONE importer (`resolve_attack_orders.ts`) | AUDIT for removal — `attack_resolution_osid.ts` is now canonical. `resolve_attack_orders.ts` may still bridge old test consumers; verify and delete the legacy path as a separate Phase I packet |
| 6 | `src/sim/combat/officer_quality_update.ts:163` | `// DEPRECATED legacy field — treat as multiplier for backward compat.` | If save-migration upper bound has cleared the legacy field, delete the branch |
| 7 | `src/sim/combat/brigade_aor_legacy.ts:2-7` | Whole file header: "Legacy brigade AoR helpers — thin API ... will be removed when all consumers migrate" | The migration is effectively done — schedule entire-file deletion |
| 8 | `src/sim/emergence/aor_instantiation.ts:2-46` | Phase E Step 4 module declaring `deriveAoRMembership`; importers in `src/**`: `src/state/game_state.ts` (type only), `src/scenario/scenario_runner.ts`, `src/sim/displacement_pipeline/displacement_triggers.ts`, `src/sim/emergence/rear_zone_detection.ts` | NOT dead — but the comment block contradicts the AoR phase-out elsewhere. Reconcile: either AoR is gone or it isn't. The Phase E "AoR membership descriptor (derived each turn; not serialized per Engine Invariants §13.1)" usage is structurally different from the deleted brigade-AoR system, but the shared "AoR" vocabulary is misleading. Consider rename to disambiguate |
| 9 | `src/sim/combat/bot_brigade_targeting.ts:140` | `// Directive-driven: avoid zone (legacy — avoid_municipalities removed, but keep for future use)` | DELETE the dead branch. "Future use" with no concrete spec = railroad-hunter pattern violation |
| 10 | `src/state/game_state.ts:79-101` | `BrigadeAoROrder`, `BrigadeMovementOrder` "(Legacy; AoR removed.)", `LegacyBrigadeAoRState`, `getLegacyAoR` | NOTE: file is on calibration overlap. DEFER until calibration branch merges, then schedule removal |
| 11 | `src/state/game_state.ts:2062-2075` | `Legacy compatibility snapshot for old saves/tests only`; `brigade_desired_aor_cap` legacy AoR tuning field | NOTE: calibration overlap. Same — defer |
| 12 | `src/sim/combat/sector_offensive.ts:2049` | `/** @deprecated Use evaluateCorpsOffensiveLaunch — this alias maps the old sector-scoped signature. */` | NOTE: calibration overlap. Audit callers; if zero, delete alias post-merge |
| 13 | `src/sim/combat/brigade_assignment.ts:1438` | `* @deprecated Not called in production` | NOTE: calibration overlap. The lifecycle/canonical statement already exists in comment; delete the symbol post-merge |
| 14 | `src/sim/turn_pipeline_types.ts:194,247,249` | `Legacy SID combat fallback`; `legacy weekly-report column movement diagnostic`; `legacy weekly-report movement diagnostic mirror` | NOTE: calibration overlap. Each is on TurnReport — confirm zero readers in `src/**` and `tests/**` before deletion |
| 15 | `src/ui/warroom/components/InvestmentPanel.ts:10` + `WarPlanningMap.ts:7,112,516` + `FactionOverviewPanel.ts:11` | `@deprecated Phase 0 investment system removed (peace phase no longer exists). Stubs below.` — stubs for a removed peace phase | UI scope (outside audit boundary) but flagging: a Phase I packet should delete these stubs in coordination with warroom owner |

## Section 3: Defunct comment-claims of exclusion

Per the Stupčanica precedent (napkin lesson: "Bot/AI generators must exclude canonical names by DATA, not by comments"), these comment-claims merit a data-not-comment audit:

| # | File:line | Comment | Verification result |
|---|-----------|---------|---------------------|
| 1 | `src/sim/combat/bot_brigade_targeting.ts:140` | `// Directive-driven: avoid zone (legacy — avoid_municipalities removed, but keep for future use)` | The comment claims `avoid_municipalities` is "removed" yet `src/sim/combat/bot_strategy.ts:434` still declares `avoid_municipalities?: string[];` on the directive type. Data CONTRADICTS the comment. Recommend: remove the field from `BotCorpsDirective` AND the related branch in `bot_brigade_targeting.ts`. |
| 2 | `src/state/game_state.ts:1426-1430` (calibration overlap; do not edit now) | `@deprecated Non-empty values are banned calibration escapes. Fix bot targeting, OOB stats, or painted targets instead.` for `avoided_osids_by_faction` | Data CONTRADICTS in spirit: 3 consumers in `src/sim/combat/bot_brigade_eval_attack.ts:245,417,804` still READ this field. `src/scenario/scenario_loader.ts:371` rejects non-empty at load — runtime is effectively dead, but the reader code remains live. Per CLAUDE.md sacred rule "NEVER use `avoided_osids_by_faction`": after calibration merge, delete all 3 readers AND the field, then convert the `@deprecated` to a hard build-time ban (TypeScript type elimination + lint rule). |
| 3 | `src/sim/combat/bot_corps_operations.ts:20-35` | `OWNERSHIP: Transitional — legacy/compatibility operation creation` + `TWO OP SYSTEMS exist: legacy injectQueuedOperation ... runs BEFORE commander` | The napkin (lines 793-794) confirms this: "Legacy `injectQueuedOperation` ... consumes queued_operations ... `tryCreateFromPrePlanned` = dead code (queue already consumed)". Comment AGREES, but the dead branch still ships in the binary. Recommend: delete `tryCreateFromPrePlanned` after confirming napkin claim in a single trace run. |
| 4 | `src/sim/combat/sector_offensive.ts:1213` | `// Legacy flat: check completion and failures` | NOTE: calibration overlap. The flat-axis legacy path is documented as legacy; check whether `axes` is now mandatory and delete the flat branch post-merge. |
| 5 | `src/sim/combat/combat_math.ts:738,1200` | `// Legacy fallback` (urban_osids.json fallback) | NOTE: calibration overlap. Determine if the JSON load can fail in production; if not, delete the fallback path. |

Action pattern. Per data-not-comment rule, convert claimed exclusions into static guarantees: `as const` type unions for forbidden names, `never` returns for forbidden code paths, and unit tests for the property. Don't trust comments to keep contracts.

## Section 4: Overlapping ownership candidates

Top-5 state-field writers with potential multi-owner risk:

| # | State field | Writers | Risk level | Notes |
|---|-------------|---------|------------|-------|
| 1 | `political_controllers` / `control_overrides` | 20 files write (`grep` count); see grep output above | HIGH | Per CLAUDE.md sacred rule "NEVER override initial OSIDs". The 20 writers include scenario init, treaty apply, control flip, end-state snapshot, sector ops, jna phantom, paramilitary sweep, etc. Per architecture.md life-lesson #119 "Secondary checks that duplicate primary system logic are always dead code", at least some of these writers are likely overlapping. **Recommend**: ownership audit packet — catalog writers as (init / scenario / sim / migration / display-only) and confirm single-owner per turn-pipeline phase. Defer concrete deletions until ownership table is published. |
| 2 | `brigade_aor` / `brigade_aor_orders` (legacy top-level) | `src/sim/combat/brigade_aor_legacy.ts` (read), `src/sim/combat/brigade_pressure.ts` (read), `src/state/serialize.ts:194-195` (rescue+delete), `src/sim/combat/corps_sector_partition.ts` (?) | MEDIUM | The state types are explicitly "legacy; not serialized" yet still readable on old saves. Once `save_migration` has fully purged them (verify version cutoff), delete the type AND `getLegacyAoR`. Calibration overlap on `game_state.ts` defers this. |
| 3 | `concentration_orders` (PlanDecision return field) | WRITERS: `src/sim/combat/commander/plan.ts` (19 sites). READERS: ZERO in `src/**`. | HIGH | Per CLAUDE.md feedback memory "Concentration orders are planning artefacts, never executed". `PlanDecision.concentration_orders` is populated at 19 return-sites but never consumed. **Recommend**: delete the field from `PlanDecision` and all 19 populations. Net: ~50 lines removed, type narrowed. Note: `commander/plan.ts` is NOT on calibration overlap → safe to schedule. |
| 4 | `meta.avoided_osids_by_faction` | WRITERS: `src/scenario/scenario_runner.ts:1596`. READERS: `src/sim/combat/bot_brigade_eval_attack.ts:245,417,804` (calibration overlap), `src/scenario/scenario_runner.ts:804,814,1596`. | HIGH | Banned per CLAUDE.md sacred rules. Reader code in `bot_brigade_eval_attack.ts` should be removed post-calibration-merge. The writer in scenario_runner is dead at runtime (loader rejects non-empty), but ships in binary. Recommend: post-merge, delete the writer + readers + the meta type field. |
| 5 | `event_decision_log` (player vs bot) | WRITERS: scattered across events/* (`evaluate_events`, `resolve_decision`, `bot_response`, `ai_default_response`) | LOW | Sources are stratified via `decision_source` enum (per H2 wave 1 query helper `getPlayerDecisionHistory`). Single-owner per source-tag pattern works. No action — leave as-is. |

## Section 5: Unused config flags

Per-flag consumer check:

| # | Flag | File:line (definition) | Consumers in `src/**` | Recommendation |
|---|------|------------------------|------------------------|----------------|
| 1 | `AWWV_TWO_LEVEL_NOTIFICATIONS` | `src/sim/events/emit_notifications.ts:11` | `src/sim/events/resolve_decision.ts:14,64`; `src/sim/events/evaluate_events.ts:18,556,565,595` | KEEP — actively read. Documented Phase H/H2 substrate flag. |
| 2 | `AWWV_COMMANDER_FRONT_GEOMETRY` | `src/sim/combat/commander/briefing.ts:79` | self-only (read in same file) | KEEP — single-file flag is a valid pattern for narrow consumers. Confirm via napkin whether the gate is still planned to expand. |
| 3 | `AWWV_FORCE_ROUTINE_DIAGNOSTICS` | `src/utils/routine_console_diagnostics.ts:4` | self-only (returned via `shouldEmitRoutineDiagnostics` — needs separate verification) | LOW-CONFIDENCE FLAG: need to verify call sites of the wrapper function. Audit before recommending deletion. |
| 4 | `AWWV_POLITICAL_DIMENSION_PROPAGATION` | `src/sim/political/political_dimension_propagation_gate.ts:39` | gate functions exported via `isPoliticalDimensionPropagationEnabled` etc.; checked broadly across Phase E gate consumers | KEEP — actively gating Phase E3 propagation. Documented in MEMORY. |
| 5 | `AWWV_PDP_INTL_STANDING_OPS_HESITATION` | `src/sim/political/political_dimension_propagation_gate.ts:62` | gate sub-flag for N4 shadow-flag (see MEMORY.md "Trip session 2 (2026-05-03)") | KEEP — active shadow-flag. |
| 6 | `AWWV_PDP_COHESION_CAUTION_BIAS` | `src/sim/political/political_dimension_propagation_gate.ts:86` | gate sub-flag | KEEP — active shadow-flag. |

No truly-dead config flags found in `src/sim` / `src/state`. The flag surface is healthy.

## Section 6: Prioritized cleanup backlog

Recommended remediation packet sequence:

### Packet 2 (small — under 1 hr, zero calibration risk)

1. **Delete `concentration_orders` field** from `PlanDecision` in `src/sim/combat/commander/plan.ts` (19 populations + 1 declaration). NOT on calibration overlap. ~50 line reduction. (Section 4 #3)
2. **Delete `vienna_*` deprecated aliases** in `src/sim/local_truces.ts` (4 symbols at lines 31, 99, 259, 314). NOT on calibration overlap (file IS on overlap — DEFER until merge). Recheck.
3. **Trim "no AoR" residual phrases** from comments in `run_early_war_browser.ts`, `run_combat_browser.ts`, `early_war/bot_early_war.ts`, `early_war/militia_emergence.ts` — pure comment cleanup. (Section 2 #2-4)

### Packet 3 (medium — 2-4 hrs)

4. **Audit + delete `brigade_aor_legacy.ts`** as a unit, including `brigade_pressure.ts` chain. Tests `engine_honesty_legacy_contracts.test.ts` + `brigade_aor.test.ts` + `brigade_pressure.test.ts` must be migrated or deleted in the same commit. Net: ~1100 lines removed (the .ts file is ~250 lines + the test files). (Section 1 #1-7, Section 2 #7)
5. **Delete `tryCreateFromPrePlanned` dead branch** in `src/sim/combat/bot_corps_operations.ts` per napkin lines 793-794 confirmation. (Section 3 #3)
6. **Delete `avoid_municipalities` zombie** from `bot_strategy.ts:434` + `bot_brigade_targeting.ts:140` branch. Data + comment now agree code is dead. (Section 3 #1)

### Packet 4 (large — post calibration merge, blocking on calibration branch merge into main)

7. **Audit + delete `battle_resolution.ts` legacy SID path** (~1500 lines). Single importer is `resolve_attack_orders.ts`. Confirm `attack_resolution_osid.ts` is the sole canonical path; remove the bridge. (Section 2 #5)
8. **Delete `avoided_osids_by_faction` system** — 3 readers in `bot_brigade_eval_attack.ts`, writer in `scenario_runner.ts`, meta type field. Convert deprecation to hard ban. (Section 4 #4, Section 3 #2)
9. **`game_state.ts` legacy AoR types sweep**: `BrigadeAoROrder`, `BrigadeMovementOrder`, `LegacyBrigadeAoRState`, `getLegacyAoR`, `brigade_desired_aor_cap` field. Coordinate with `save_migration` version bump if needed. (Section 2 #10-11)
10. **Single-owner audit for `political_controllers`**: catalog the 20 writers, publish ownership table in `docs/20_engineering/`. (Section 4 #1)

### Packet 5 (rename / disambiguation)

11. **Rename Phase E "AoR membership" terminology**: `aor_instantiation.ts`, `PhaseEAorMembership`, `rear_zone_detection.ts` reference the deleted brigade-AoR vocabulary even though they describe a structurally different overlapping-influence concept. Recommend renaming to "Phase E Influence Membership" or similar to disambiguate from the deleted brigade-AoR system. (Section 2 #8)

### IF YOU PICK ONE THING FIRST: Packet 2 step 1

Delete `concentration_orders` from `PlanDecision`. Zero calibration risk (commander/plan.ts not on calibration overlap), high test-coverage protection, CLAUDE.md feedback memory explicitly flags it as "planning artefact, never executed", and the deletion is mechanical (remove field declaration, remove 19 `concentration_orders: []` / `concentration_orders: concentrationOrders` populations, run tsc). Net reduction of ~50 lines and a structurally false data field disappears from the commander API.

## Section 7: Cross-references

- **CLAUDE.md.** Top-level project doc — "Sacred Rules" lists banned patterns (Math.random, `avoided_osids_by_faction`, AoR overrides) and the canon/FORAWWV Pyrrhic-panel sign-off requirement. Simplification roadmap directive: repo-wide cleanup between v0.8 and v0.9.
- **MEMORY.md simplification roadmap.** `versioning_roadmap_location.md` → `docs/plans/MASTER_ROADMAP.md` is single source of truth.
- **Napkin entries** (`.claude/napkin.md`):
  - Line 291 — "legacy `TUTORIAL_OBJECTIVES` is dead code (zero importers)" (UI scope; flagged but not in audit boundary)
  - Lines 793-794 — "Legacy `injectQueuedOperation` ... `tryCreateFromPrePlanned` = dead code (queue already consumed)" (Section 3 #3)
- **Life lessons referenced**:
  - `architecture.md` #119 — "Secondary checks that duplicate primary system logic are always dead code"
  - `architecture.md` lines 335-338 — "Dead code is invisible failure (`captureEquipment` example)"
  - `architecture.md` lines 392-396 — AoR removal as precedent for full-system cleanup
  - `platform.md` lines 19-22 — "Use tsc as source of truth for dead code, not grep" — this audit's grep findings must be verified via `tsc --noEmit` after removing each batch
  - `process.md` lines 155-159 — "/simplify with 3 parallel review agents catches real bugs"
  - `process.md` line 232 — "`generateArmyHQOverrides` filtered for `kind: 'corps'` but corps formations use `kind: 'corps_asset'` — entire system dead"
  - `process.md` lines 304-305 — "Every new function must be imported and called — dead code is invisible failure"
- **CALIBRATION_MASTER context.** All recommendations explicitly exclude files on `claude/calibration-historical-army-arc-2026-05-24` (see Status + scope). Packet 4 is gated on calibration merge.
- **PROJECT_LEDGER.** This audit entry will be appended as `## [2026-05-29] codex: Phase I Packet 1 (engine simplification audit)`.

---

**Audit summary.** 11 high-confidence dead-export candidates flagged (7 from one file, `brigade_aor_legacy.ts`, suggesting the entire module is a delete candidate). 15 zombie-comment matches. 5 defunct exclusion-claims (with one — `avoid_municipalities` — directly contradicted by live type declaration). 5 overlapping-ownership candidates (1 HIGH-priority dead field `concentration_orders`, 1 HIGH-priority banned field `avoided_osids_by_faction`, 1 audit-needed `political_controllers` 20-writer surface). 0 truly-dead config flags (all 6 AWWV flags have live consumers). Recommended first remediation: delete `concentration_orders` from `PlanDecision` (small, safe, mechanical). Recommended whale: `brigade_aor_legacy.ts` + chain removal (medium effort, ~1100 line reduction across module + tests).

## Corrections

- **Section 3, Entry #3 (`tryCreateFromPrePlanned`)** — file pointer was wrong. Audit cited `src/sim/combat/bot_corps_operations.ts:20-35` but the function actually lives at `src/sim/combat/commander/plan.ts:1130` (the bot_corps_operations.ts coordinates show the ownership comment block, not the function). Verified 2026-05-29 during Phase I Packet 6 triage via `grep -n "tryCreateFromPrePlanned"`: declaration at `commander/plan.ts:1130`, sole call site at `commander/plan.ts:929`. Recommendation (delete the dead branch) stands unchanged; only the location pointer is corrected.
