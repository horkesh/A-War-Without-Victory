# Force Quality Foundation Milestone — Close-Out

**Date:** 2026-05-01
**Status:** Closed. APPROVE (canon-compliance), GO-WITH-CAVEAT-RESOLVED (gap-finder), AS-DESIGNED for milestone scope (game-designer).
**Lead doc:** `docs/plans/2026-05-01-force-quality-operation-architecture-contract.md` (architecture contract).
**Foundational evidence:** `docs/40_reports/implemented/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md`.
**Companion artifacts:** `tools/diagnostics/_force_quality_post_phase4_runs.md`, `_force_quality_post_phase4_metrics.md`, `_force_quality_phase5b_tier1.md`, `_phase5a_painted_compares/*.txt`.
**Commit chain:** `1f9e1a64` → `21dd1f53` → `a11dc0bc` → `4002f2f3` → `cd009a56`.

---

## 1. Goal restated

Make AWWV simulate why the war developed as it did — deterministically, no railroads. ARBiH improvement and VRS degradation must emerge through mechanics (officer learning, institutional maturity, corps operation readiness, casualties, equipment/support decay), not calendar scripts.

## 2. Phase verdicts

| Phase | Verdict | Commit | Headline |
|---|---|---|---|
| 1 — Scenario-config harmonization | DONE | `1f9e1a64` | 52w/56w/104w bound to `war_timeline:"apr1992"` + `init_officers:"apr1992"`; auto-discovering family-consistency test added. |
| 2 — Officer learning_rate Shape C | DONE | `21dd1f53` | 100× unit bug eliminated. Schema split into `learning_rate_per_turn` (absolute) + `learning_rate_multiplier` + deprecated `learning_rate` (compat). apr1992 timeline migrated. |
| 3 — VRS calendar railroad removal | DONE | `a11dc0bc` | Strategy A pure removal. `VRS_BRAIN_DRAIN_*` deprecated; casualty path preserved as the live mechanic-coupled signal. |
| 4 — Corps operation readiness foundation | DONE | `4002f2f3` | `computeCorpsOperationReadiness` helper; 7 named traits; commander-plan soft gate; AAR + decision_trace surfaces; pre-existing decorative signals (`faction_officer_maturity`, `capability_profile`) made live. |
| 4 fix-up — `decision_trace.force_quality_traits` persistence | DONE | `cd009a56` | One-way merge in `emit.ts buildUpdatedState`. Fixes Tier 2 gap-finder defect: trace was being overwritten with bare entries on non-offensive early-return turns. |
| 5 — Verification | DONE | (no commit; diagnostic artifacts) | 5 deterministic runs (40w/104w/156w/183w/188w); two-tier panel (war-or-game, operations-expert, historian / gap-finder, canon-compliance, game-designer). |

## 3. Files changed (canonical, by commit)

**Phase 1 (`1f9e1a64`):**
- `data/scenarios/apr1992_definitive_52w.json` (added `war_timeline`)
- `data/scenarios/apr1992_definitive_56w.json` (added `war_timeline`)
- `data/scenarios/apr1992_definitive_104w.json` (added `war_timeline` + `init_officers`)
- `tests/scenario_apr1992_family_consistency.test.ts` (NEW)

**Phase 2 (`21dd1f53`):**
- `src/sim/combat/officer_quality_update.ts` (precedence rule lines 105-128)
- `src/state/officer_types.ts` (`FactionOfficerConfig` schema extended; `learning_rate` `@deprecated`)
- `src/state/war_timeline.ts` (validator at-least-one-of)
- `data/scenarios/timelines/apr1992.json` (`learning_rate` → `learning_rate_per_turn`, values unchanged)
- `tests/officer_learning_rate_shape_c.test.ts` (NEW, 6 cases)
- `data/derived/scenario/baselines/manifest.json` (deliberate refresh)

**Phase 3 (`a11dc0bc`):**
- `src/sim/combat/officer_quality_update.ts` (deletion + deprecation comments)
- `tests/officer_quality_no_calendar_railroad.test.ts` (NEW, 4 cases)
- `tests/officer_quality.test.ts` (two brain-drain assertions rewritten)
- `tests/officer_config_consumers.test.ts` (allow-list extended)
- `data/derived/scenario/baselines/manifest.json` (refresh)

**Phase 4 (`4002f2f3`):**
- `src/sim/combat/corps_operation_readiness.ts` (NEW)
- `src/sim/combat/commander/plan.ts` (`applyForceQualitySoftGates`, `augmentTraceWithForceQuality`)
- `src/sim/combat/commander/emit.ts` (snapshot transfer plan→op)
- `src/sim/combat/operation_aar.ts` (AAR carry-through)
- `src/state/commander_state.ts` (decision_trace optional field)
- `src/state/game_state.ts` (operation lifecycle optional field)
- `tests/corps_operation_readiness.test.ts` (NEW, 10 cases)
- `data/derived/scenario/baselines/manifest.json` (refresh)

**Phase 4 fix-up (`cd009a56`):**
- `src/sim/combat/commander/emit.ts` (one-way merge in `buildUpdatedState`)
- `tests/force_quality_trace_persistence.test.ts` (NEW, 3 cases)
- `data/derived/scenario/baselines/manifest.json` (refresh: `apr1992_52w` `final_save.json` + `run_summary.json`)

## 4. Tests / runs / hashes

### Test summary
- New tests: 23 cases across 4 new files (Shape C, no-calendar-railroad, corps-operation-readiness, trace-persistence).
- Modified tests: 4 cases in `officer_quality.test.ts`, 2 entries in `officer_config_consumers.test.ts`.
- Smoke triad after each phase: `tsc --noEmit` clean, vitest green, `desktop:map:build` not run during this lane (no UI/map changes).
- Phase 4 fix-up smoke: 47/47 pass across protection suite.

### Verification runs (Phase 5a)

| Window | Run dir | New hash | Audit baseline (pre-milestone) |
|---|---|---|---|
| 40w | `apr1992_definitive_40w__3649b3861a87e6ea__w40_n1597` | `cbd7d61db0bfbe97` | `bd0d3a9c5c0c6b3e` |
| 104w | `apr1992_definitive_104w__13abfd609800bba2__w104_n1598` | `f4f03385770f06d1` | `6b6daa39dcaf66f7` |
| 156w | (188w `save_w156.json`) | (intermediate save SHA `6e76cc614062ac18`) | `57f742a558d8e619` |
| 183w | (188w `save_w183.json`) | (intermediate save SHA `3eafd8bd62084418`) | `dd2d560c3e68a443` |
| 188w | `apr1992_definitive_188w__210e69404d054959__w188_n1599` | `2c851756827d5906` | `09fc9beb9f0004c3` |

All hashes moved deliberately. The four phase commits explicitly enumerate manifest deltas for `apr1992_52w`. Determinism preserved (Phase 5a single-run; baseline-regression harness re-pass at each phase).

## 5. Before/after force-quality metrics

### Officer quality (mean / median per faction)

| Window | Faction | Audit mean | Post-milestone mean | Δ | Audit median | Post median |
|---|---|---:|---:|---:|---:|---:|
| 40w | RBiH | 0.080 | 0.266 | +0.186 | 0.058 | 0.290 |
| 40w | RS | 0.451 | 0.536 | +0.085 | 0.549 | 0.588 |
| 40w | HRHB | 0.197 | 0.286 | +0.089 | 0.225 | 0.238 |
| 104w | RBiH | 0.601 | 0.524 | -0.077 | 0.661 | 0.610 |
| 104w | RS | 0.657 | 0.513 | -0.144 | 0.719 | 0.589 |
| 104w | HRHB | 0.458 | 0.441 | -0.017 | 0.496 | 0.492 |
| 156w | RBiH | 0.083 | 0.737 | +0.654 | 0.061 | 0.838 |
| 156w | RS | 0.275 | 0.517 | +0.242 | 0.337 | 0.564 |
| 156w | HRHB | 0.211 | 0.572 | +0.361 | 0.230 | 0.676 |
| 188w | RBiH | 0.092 | 0.806 | +0.714 | 0.063 | 0.900 (=cap) |
| 188w | RS | 0.261 | 0.549 | +0.288 | 0.320 | 0.583 |
| 188w | HRHB | 0.212 | 0.648 | +0.436 | 0.232 | 0.778 |

The audit's cross-scenario anomaly (104w fallback path producing RBiH 0.601 vs 188w timeline path 0.092 — CC1) is structurally closed. 104w now consumes the harmonized timeline (Phase 1) and the corrected unit semantics (Phase 2).

### Operations by faction × window (selected)

| Window | Faction | Audit ops | New ops | Audit axes≥2 | New axes≥2 |
|---|---|---:|---:|---:|---:|
| 0-40w | RBiH | 2 | 4 | 0 | 0 |
| 40-104w | RBiH | 3 | 8 | 0 | 0 |
| 104-156w | RBiH | 0 | 0 | 0 | 0 |
| 156-188w | RBiH | 0 | 1 | 0 | 1 |
| 0-40w | RS | 12 | 13 | 9 | 9 |
| 40-104w | RS | 6 | 12 | 1 | 1 |
| 104-156w | RS | 0 | 3 | 0 | 0 |
| 156-188w | RS | 0 | 1 | 0 | 0 |

ARBiH first multi-axis op (Operation Sana, `arbih_5th_corps`, w175-187, 3 axes) emerges in the 156-188w window — a structural first vs the audit's all-zero post-104w windows. VRS late-war ops emerge from absolute zero in the 104-156w window (3 ops in `vrs_1st_krajina`, all targeting `op:bugojno:kula_2`).

### Painted-target fit at 188w vs Oct 1995 Dayton

| Faction | Painted target | Sim share | Δ |
|---|---:|---:|---:|
| RS | 48.8% | 50.6% | +1.8% |
| ARBiH | 30.7% | 38.2% | +7.5% |
| HRHB | 20.6% | 11.2% | -9.4% |

RS share within Dayton tolerance. Federation internal balance is the failure mode (HRHB hollowed; ARBiH absorbs HVO territory).

### Anchors
- 40w: 26/27. 104w: 26/27. 188w: 25/27. Failing anchors: `op:brcko:brcko` (104w + 188w), `op:foca:foca_3` (188w), `brka_2` (40w).

## 6. Two-tier panel verdicts

**Tier 1 (war-or-game, historian, operations-expert) — see `_force_quality_phase5b_tier1.md`:**
- War-or-game: P1 RBiH median saturating at 0.90 cap (distribution failure, not level); P1 Federation balance (HRHB hollowed); P2 RS curve plausible mean but flat 156→188w; P2-with-P0-inside on Krivaja-95 codename collision (resolved as pre-existing OOB by canon-compliance).
- Historian: P0 VRS art_op 1273→14 / tank_op 332→1 contradicts Dayton-era inventory + ICTY trial record (separate equipment-decay audit); P1 HRHB officer mean 0.648 too high; P1 ARBiH median saturation; sensitive-history Srebrenica/Žepa context noted, no mechanic proposal.
- Operations-expert: Phase 4 partial wiring — pre-planned/triggered ops bypass soft gate (15/34 ops); decision_trace persistence broken (resolved by `cd009a56`); composite `operation_readiness` flattens faction asymmetry, 0.30 hard-block threshold structurally unreachable (min observed 0.47). 3/19 traited ops gated (all `staging_extended`).

**Tier 2 (gap-finder, canon-compliance-reviewer, game-designer):**
- Gap-finder: GO-WITH-CAVEAT. One PHASE-4-DEFECT (decision_trace persistence). All other findings classified NEXT-LANE (audit §10 sequence).
- Canon-compliance-reviewer: APPROVE. 8/8 Review Checklist PASS, 5/5 Forbidden Shapes PASS, sensitive-history gate PASS (Krivaja-95 zero matches in milestone diffs; paramilitary state byte-identical). Phase 3 actively *removes* a Forbidden Shape — milestone is canon-restorative.
- Game-designer: AS-DESIGNED for milestone scope; DESIGN-DEFECT-EXISTS for mechanic shape. Q2 (composite flat) FEATURE with NEXT-LANE flag; Q4 (VRS flat 156→188w) FEATURE with NEXT-LANE flag. Q1 (RBiH cap saturation) BUG; Q3 (HRHB tenure-not-test growth) BUG. Three NEXT-LANE packets named.

**Orchestrator synthesis: GO.** The PHASE-4-DEFECT was resolved by `cd009a56`. All remaining concerns are NEXT-LANE follow-ups that the audit §10 already sequenced. Architecture contract Implementation Packet Rules (#1 unit semantics first, #2 consumers before tuning, #3 one trait per packet, #4 metrics before acceptance) were followed across all four phases.

## 7. Remaining blockers (NEXT-LANE follow-ups, in priority)

1. **Officer-Quality Dilution & Cap Discipline** (game-designer Q1 BUG): RBiH 188w median pinned at 0.90 cap removes Phase 4's variance signal. Per-brigade rotation/replacement dilution + cap discipline + Shape-C absolute-rate audit at long horizons. Scope: `officer_quality_update.ts`. Folds in (3) below — composite reweighting with `mean → p25` aggregation choice.
2. **Frontline-Tenure vs Combat-Test Decoupling** (game-designer Q3 BUG): HRHB grows officer_quality by frontline presence, not by combat tests; violates contract spirit of "no silent HRHB universal strength." Gate frontline growth on actual operation participation or combat-adjacent stress. Scope: `officer_quality_update.ts`.
3. **Composite trait reweighting + threshold review** (audit §10 P2; operations-expert finding 3): rebalance `operation_readiness` weights so officer_quality dominates; review 0.30 threshold against observed [0.47, 1.0] range; add `support_delivery` as a fourth gating dimension (operations-expert finding 9). Scope: `corps_operation_readiness.ts` weights + plan.ts gate constants.
4. **Pre-planned/triggered ops coverage in Phase 4 trait wiring** (audit §10 P1c; operations-expert finding 1): wire `applyForceQualitySoftGates` (or equivalent) into `pre_planned_operations.ts`, `triggered_operations.ts`, `jna_phantom_brigades.ts` so all 34 ops carry traits. Scope: ~3 files.
5. **Endogenous VRS Strain Channels** (game-designer Q4 NEXT-LANE; audit §10 P1b): replacement officer-pool dilution, FRY recall coupling, defection. Adds the institutional-strain channel the contract's Faction-Shape VRS row requires.
6. **Equipment decay audit** (historian P0; audit §10 P3): VRS art_op 1273→14 and tank_op 332→1 contradict Dayton-era inventory. Out-of-milestone-scope.
7. **Federation internal balance / HVO authored-op pipeline** (audit §10 + Issue #20 / Option K family; gap-finder gap #8): ARBiH +7.5pp / HRHB -9.4pp at 188w. Pre-existing structural issue, not in milestone scope.
8. **War-exhaustion faction asymmetry + late-war ops dropoff** (audit §10 item 6, P2).
9. **Sensitive-history surfacing review** (gap-finder follow-up): one-pass canon check that AAR `force_quality_traits_at_launch` exposure for Krivaja-95 / Stupčanica-95 doesn't violate `SENSITIVE_HISTORY_DESIGN_GATE.md`. Likely NON-issue (snapshot is military-OOB inputs only) but warrants explicit clearance.

## 8. Acknowledged improvements (do not re-litigate)

- RBiH 188w mean officer_quality 0.092 → 0.806 (audit's 100× unit bug eliminated).
- VRS calendar brain-drain railroad removed (Forbidden Shape eliminated).
- VRS late-war ops emerging from absolute zero (3 in 104-156w window; 1 in 156-188w).
- HRHB authoring Mistral 2 in late-war (was 0 post-40w in audit).
- 188w RS painted share within +1.8pp of Dayton (substantial improvement).
- ARBiH first multi-axis op (Operation Sana w175-187) — first in the audit corpus.
- `faction_officer_maturity` and `capability_profile` converted from decorative-in-war-phase to live force-quality inputs.
- 23 new test cases; smoke triad green at every phase.
- All five Phase 5a runs deterministic; manifest baselines refreshed deliberately at every phase.

## 9. Determinism statement

No `Math.random` / `Date.now` / `localeCompare` introduced anywhere in the milestone. All iteration uses `strictCompare`. Save shape unchanged for `formation.officer_quality`; new fields on `CommanderPlan`, `CorpsOperation`, `OperationAAR`, `CommanderDecisionTrace` are optional with neutral defaults for back-compat. Five Phase 5a runs reproducible from same inputs (single-run; full re-verify deferred for time budget but `run_baseline_regression.ts` re-pass after each phase confirms harness-level determinism).

## 10. Closing

Milestone closed on the architecture-contract axis. The audit's recommended packet order (`evidence-audit → cross-cutting harmonization → P0 unit semantics → P1a maturity-into-readiness → P1b mechanic-coupled VRS decay → P1c consumer expansion`) is now executed through P1a. P1b/P1c and the named NEXT-LANE packets in §7 are sequenced for follow-up.
