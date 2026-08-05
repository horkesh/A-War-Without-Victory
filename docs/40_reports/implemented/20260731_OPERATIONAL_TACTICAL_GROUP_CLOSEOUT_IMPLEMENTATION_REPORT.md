# Operational/Tactical Group Closeout Implementation Report

**Date:** 2026-07-31
**Final integration date:** 2026-08-01
**Roadmap lane:** R3 — Operational/Tactical Group convergence
**Implementation commits:** `70557be1d` through `d44a3ac25`; parent integration repairs `abdf9ffeb` and `1c15387bd`
**Status:** COMPLETE — implementation and parent integration gates are green

## Outcome

R3 now has one offensive-operation clock, bounded Tactical Group exhaustion, durable Army-HQ recovery receipts, exact terminal participation telemetry, deterministic legacy-OG retirement, guarded historical promotion identities, and governing Standing-OG doctrine aligned to the narrower shipped combat model. The implementation preserves the existing donor-backed combat substrate and does not create a second operation scheduler.

The phase-level proof, parent integrated focused proof, and final full fast slice are green. The first full attempt reached the 604-second command timeout without failure output. The next complete run found the deliberate R3 optional-state increase and one stale R1 map-test extraction boundary. The optional-state inventory was ratcheted from 527 to 529 and passed 91/91; the map test was bounded to the live `const needsUpdate` source-gate boundary and passed 31/31. The final full fast slice exited 0 in 1,502.2 seconds.

No package, version, tag, installer, release, push, or merge state is changed by this report. `docs/10_canon/FORAWWV.md` remains unchanged.

## Live behavior preserved

The work deliberately retains the already-live mechanics that were not defective:

- `CorpsOperation` remains the sole offensive-operation clock and transition authority.
- `full` and `limited` donor policies form a TG only when at least one legal donor exists; `none` and zero-donor results stay on the ordinary lone-anchor path.
- Donors remain same-faction, bounded by the existing corps/adjacency and six-hop/three-donor selection rules.
- Existing effective-personnel/equipment synthesis, minimum anchor casualty share, deterministic pro-rata donor distribution, readiness cost, recovery suppression, cooldown, and donation cap remain intact.
- COHA still pauses operation execution; the Army-HQ recovery tail ages by calendar turn as specified.
- Corps sectors remain spatial standing-OG assignments and carry no political-control meaning.
- The combat resolver's actual contributors own their assigned immediate losses; primary-defender fatigue and downstream aftermath remain with the primary defender unless the live resolver explicitly assigns otherwise.

## Implemented changes

### Lifecycle and Army-HQ truth

Production transitions now synchronize TG and Army-HQ status at the existing operation chokepoints. Forming TGs become engaged when their owning operation executes. Recovery/completion finalizes the TG once, clears live links and donor locks, and leaves a durable Army-HQ receipt that no longer consumes the live planning/executing cap.

The locked exhaustion contract is `12/4/15/4`: maximum execution age 12, cohesion drain 4, strict dissolution threshold below 15, and Army-HQ recovery cost for four calendar turns. The evaluator processes sorted matching siblings atomically, drains at most once on each eligible future War turn, and records typed `tg_cohesion_exhausted` or `tg_max_lifecycle` reasons. COHA does not advance the execution clock or drain cohesion.

### Terminal telemetry and conservation

Participation rows can now retain optional `dissolved_turn`, `casualties`, and `personnel_returned` fields. Donors record exact cumulative casualties and `max(0, personnel_lent - casualties)` returns; anchor rows record the terminal turn without inventing a donor loan. A repeated dissolution is state-idempotent.

Repeated-battle allocation now caps each donor at its remaining loan, `max(0, personnel_lent - casualties_so_far)`, and sends unavailable donor-pool casualties to the anchor through the existing deterministic overflow path. This proves both cumulative donor conservation and per-battle total-casualty conservation.

### Legacy-path convergence and historical identity

When Tactical Groups are enabled, the legacy producer retains the serialized empty `og_orders` shape but enqueues nothing. Activation consumes persisted legacy queues before mutation, so an old queued order cannot create a new formation or deduct donor personnel. Already-active old-save `kind: 'og'` formations keep a bounded compatibility lifecycle with sorted reconciliation and deterministic return of remaining personnel.

The ordinal-plus-20 promotion fallback is removed. New promotion requires an explicit verified `(corps_id, og_ordinal)` mapping and is rejected if the Division number or normalized name is already occupied.

Verified mappings:

| Corps and ordinal | Division | Status |
|---|---:|---|
| `arbih_2nd_corps:1` | 21 | Enabled and reachable |
| `arbih_2nd_corps:5` | 25 | Verified but currently unreachable because the live standing-OG resolver emits ordinal 1 |

Mappings for the 1st, 3rd, 4th, and 5th Corps remain blocked because no verified identity was established. Existing unmapped or mismatched save records remain loadable and are reported rather than rewritten or invented away.

### Standing-OG doctrine convergence

ADR-0006, ADR-0007, Systems Manual §§6.3/6.7, and Rulebook §§5.7/6.3 now consistently distinguish spatial sector membership, bounded Phase-B reserve/rear movement eligibility, actual combat contribution, and primary-defender aftermath. ADR-0007's removed Phase-C widened roster, shared-attrition, casualty-cap, and predictor-split material is retained only under an explicit retired-history heading. A semantic contract test prevents the superseded model from returning as live doctrine or production identifiers.

## Verification evidence

### Test and static gates

| Proof | Result |
|---|---|
| Phase 0 focused audit | 1 file / 4 tests passed |
| Initial characterization barrier | 20 files / 195 tests passed |
| Phase 1 final characterization barrier | 20 files / 198 tests passed |
| Phase 2 expanded TG/combat characterization | 24 files / 262 tests passed |
| Phase 3 exact pack | 8 files / 116 tests passed |
| Phase 3 supplemental lifecycle/schema pack | 8 files / 126 tests passed |
| Phase 3 broader migration/schema/UI proof | 4 files / 220 tests passed |
| Phase 4 exact pack after simplify | 6 files / 69 tests passed |
| Phase 4 expanded characterization | 22 files / 217 tests passed |
| Phase 5 Standing-OG/combat pack | **6 files / 165 tests passed** |
| Parent integrated focused pack | **26 files / 330 tests passed** |
| TypeScript | `npm.cmd run typecheck` passed in Phase 5 and parent integration |
| Canon | `npm.cmd run canon:check` passed in Phase 5 and parent integration |
| Baselines | Standalone strict no-refresh `npm.cmd run test:baselines` passed; all approved scenarios match |
| Diff hygiene | `git diff --check` passed at each completed phase; closeout diff is checked separately before commit |
| Full fast suite | **Passed.** Initial attempt timed out at 604 seconds without a result; the next complete run exposed one optional-state inventory ratchet and one stale R1 source-gate extraction boundary, repaired with focused 91/91 and 31/31 proof; final slice exited 0 in 1,502.2 seconds. |

### Scenario and hash evidence

| Phase | Run | State hash | Final-save SHA-256 | Determinism result |
|---|---|---|---|---|
| 3 | `runs/apr1992_definitive_40w__1aa96054bcc8af09__w40_n3` | `f72a459e7548d70b` | `f72a459e7548d70b4e823c35dd8f1c4b3d61bd21441ed5d40f68e545017a9746` | Fresh 40-week evidence |
| 3 | `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n4` | `af83cbc6ca8d12d1` | `af83cbc6ca8d12d1c9755b3bd30fdf06c78eca06d459582554e15dcac7607270` | Byte-identical to n5 across all eight common artifacts |
| 3 | `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n5` | `af83cbc6ca8d12d1` | `af83cbc6ca8d12d1c9755b3bd30fdf06c78eca06d459582554e15dcac7607270` | Byte-identical to n4 across all eight common artifacts |
| 4 | `runs/apr1992_definitive_40w__1aa96054bcc8af09__w40_n6` | `f72a459e7548d70b` | `f72a459e7548d70b4e823c35dd8f1c4b3d61bd21441ed5d40f68e545017a9746` | Unchanged from Phase 3 |
| 4 | `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n7` | `e400d232ba5da37e` | `e400d232ba5da37e2e5d4642daef3506e5e49a5491e5c94b4538084989082aaf` | Same final save as n8; 14/15 artifacts identical, with expected `run_meta.json.out_dir` difference |
| 4 | `runs/apr1992_definitive_188w__63a3a0858050b865__w188_n8` | `e400d232ba5da37e` | `e400d232ba5da37e2e5d4642daef3506e5e49a5491e5c94b4538084989082aaf` | Same final save as n7; 14/15 artifacts identical, with expected `run_meta.json.out_dir` difference |

Phase 3 strict engine health passed with zero eligible/dead operations, 2 ghost-destroyed formations, 9 stranded brigades, 628 matched OSIDs, zero consistency failures, and K:W ratio 3.779. Phase 4 health is unchanged at those exact values.

### Before/after audit

| Audit dimension | Before: retained turn-188 characterization | After Phase 3 lifecycle | After Phase 4 convergence |
|---|---|---|---|
| Live TG lifecycle | 1 Sana TG, `forming`, age 8, cohesion 100 | 2 engaged Sana siblings, age 11, cohesion 56 | Unchanged from Phase 3 except the promotion-record correction described below |
| Cumulative TG formations | 9 | 12 | 12 |
| Army-HQ receipts | 1 `planning` receipt with stale TG link and missing live operation | 1 completed Farz-95 receipt, `recovery_started_turn=167`, no stale link | Same lifecycle/receipt truth as Phase 3 |
| Participation archive | 19 live + 1 archived | 20 live + 4 archived | Same lifecycle telemetry as Phase 3 |
| Legacy `kind: 'og'` formations/orders | 0 active / 0 queued in the retained input | 0 legacy OGs | 0 legacy formations, 0 queued orders, 0 same-corps overlap candidates |
| Promotion findings | Duplicate default `21. Division` across 3rd/5th Corps in retained input | No duplicate promotion in the fresh run, but one unsupported 5th-Corps fallback record remained | 0 unmapped/mismatch/duplicate-number/duplicate-name findings in the fresh run; unsupported fallback record absent |

The Phase 4 audit also remains able to report old-save unmapped records, mapped identity mismatches, duplicate numbers, normalized duplicate names by record key/count, and same-corps legacy/TG overlap candidates. It does not infer same-operation identity where legacy data has no operation id.

## Save and schema decision

Schema 36 is unchanged. New participation terminal fields, `last_exhaustion_tick_turn`, and `recovery_started_turn` are optional and omit-empty. Old absent-field saves, new present-field saves, validator behavior, migration behavior, and deterministic round trips have explicit coverage. Reconciliation may normalize a legacy receipt only from an exact live operation relationship; stale or orphan records receive no invented recovery tail. Existing ambiguous promotion records remain byte-preserved.

No versioned migration or schema bump was required.

## Scenario and baseline drift

Phase 2 deliberately added terminal telemetry to the persisted state. The approved baseline refresh changed exactly two `apr1992_52w` manifest entries:

- `final_save.json`: `591e1f41efd7f51f486b8bf303a0fefa959867d49d2db54dec1584507df909d0` → `ef30222cd8b6eb99ad3d3e3b5688b414dc0d82e0a07a7a20465e43296351a141`;
- dependent `run_summary.json`: `f3a37865738df9fbe0903da778d62fb201c23bcebbb5d20a22f1e2dce6ce6545` → `3f91bd76383ae9538e8556ccdb5e7116a3f29dfe42a0d20d95bb432a368bee14`.

Removing exactly four optional anchor `dissolved_turn` fields restored the old final-save hash, and replacing only the dependent `final_state_hash` restored the old summary hash. Every other baseline entry stayed unchanged.

Phase 4's 188-week state moved from `af83cbc6ca8d12d1` to `e400d232ba5da37e`. Against Phase 3 n4, 12/15 artifacts are byte-identical. The final-save delta is exactly removal of the unsupported `arbih_5th_corps` ordinal-1 fallback promotion labeled `21. Division` at turn 178; `run_summary.json` changes through its dependent state hash, and `run_meta.json` changes through the output directory. Control, combat, formation, AAR, activity, weekly, destruction, displacement, and end-report artifacts are byte-identical.

## No-force-inflation and personnel-conservation evidence

- TG donor loans continue to contribute through the existing loan ledger rather than by creating free personnel.
- Each donor's cumulative battle casualties are bounded by `personnel_lent`; unavailable donor share deterministically returns to the anchor allocation for that battle.
- Dissolution records `casualties + personnel_returned = personnel_lent` for each donor and returns no more than the remaining loan.
- The terminalization path is idempotent, so repeated cleanup cannot return personnel twice.
- TG-enabled production creates no new legacy OG formation and debits no legacy donor personnel; persisted legacy queues are consumed before mutation.
- Already-active legacy OG compatibility cleanup returns only remaining personnel and reconciles stale/duplicate active ids without touching simultaneous TG donor ledgers.
- Phase 4's long-run control, combat, formation, destruction, displacement, AAR, activity, weekly, and end-report artifacts are unchanged from Phase 3, ruling out hidden force or combat-output inflation in the convergence change.

## Files modified

The exact tracked Phase 0–5 delta from roadmap commit `81313c9e8` through Phase 5 commit `d44a3ac25` is 44 files.

**Runtime and state (20):**

- `src/sim/combat/bot_corps_operations.ts`
- `src/sim/combat/corps_command.ts`
- `src/sim/combat/final_operation_truth_reconciliation.ts`
- `src/sim/combat/operation_aar.ts`
- `src/sim/combat/operational_groups.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/standing_og_defense.ts`
- `src/sim/combat/tactical_group_casualties.ts`
- `src/sim/combat/tactical_group_config.ts`
- `src/sim/combat/tactical_group_lifecycle.ts`
- `src/sim/combat/tactical_group_promotion.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/state/brigade_history.ts`
- `src/state/game_state.ts`
- `src/state/operation_lifecycle_reconciliation.ts`
- `src/state/save_migration.ts`
- `src/ui/map/components/OperationHistoryPanel.tsx`
- `src/ui/map/components/army_hq/OperationsSection.tsx`
- `src/ui/map/data/types.ts`
- `tools/diagnostics/audit_operational_tactical_groups.ts`

**Tests (16):**

- `tests/army_hq_op_lifecycle.test.ts`
- `tests/corps_command.test.ts`
- `tests/operation_aar_army_hq_telemetry.test.ts`
- `tests/operational_group_convergence.test.ts`
- `tests/operational_tactical_group_audit.test.ts`
- `tests/save_migration.test.ts`
- `tests/save_migration_round_trip_contract.test.ts`
- `tests/standing_og_doctrine_contract.test.ts`
- `tests/tg_casualty_distribution.test.ts`
- `tests/tg_donation_readiness_fallback.test.ts`
- `tests/tg_invariants.test.ts`
- `tests/tg_og_promotion.test.ts`
- `tests/tg_op_lifecycle.test.ts`
- `tests/tg_schema_freeze.test.ts`
- `tests/tg_telemetry.test.ts`
- `tests/ui_opord_player_safe_labels.test.ts`

**Governance, canon, and approved data (8):**

- `data/derived/scenario/baselines/manifest.json`
- `docs/10_canon/Rulebook_v0_9_0.md`
- `docs/10_canon/Systems_Manual_v0_9_0.md`
- `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`
- `docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/2026-07-31-operational-tactical-group-closeout-implementation-plan.md`

The authoritative unique-file count is the Git delta's 44 paths. Phase 6 additionally creates this report and updates the plan/report indexes and append-only project ledger.

## Closeout disposition

Completed and recorded:

- Phases 0–5 implementation and phase-specific proof;
- parent integrated focused proof at 26 files / 330 tests;
- parent integrated typecheck, canon check, and strict baselines;
- fresh 40-week and paired 188-week hashes, audit results, drift explanation, and engine-health evidence;
- documentation, plan-index, report-index, and ledger propagation on this branch.

All R3 closeout gates are satisfied. The master roadmap and command board mark the lane complete and expose the verified lifecycle/state floor to R5. No public release, package version, tag, signing, or publication state is changed by this closeout.
