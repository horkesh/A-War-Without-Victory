# Late-War Operation Combat Delivery Mega-Lane

**Date:** 2026-05-01
**Status:** CLOSED — Phases A, B, C committed; Phase D verification clean; Phase E deliverables landed.
**Commits:** A=`693ef166`, B=`dd083454`, C=`0a28762e`, E=this commit

## Mission and Scope

**Mission:** Investigate and fix the execution/delivery layer so launched late-war ops can deliver intent. Engine health, not map-painting. Targeted at the post-LANE-E `n1605` 188w evidence in which Sana 95 (t175) and Grmeč 94 (t133) launched but failed to deliver, with one axis silently never attacking.

**In-lane (this mega-lane owns):**
- `tools/diagnostics/operation_delivery_audit.cjs` (new, read-only)
- `src/sim/combat/operation_aar.ts` (additive shape)
- `src/sim/combat/sector_offensive_launch_helpers.ts` (additive shape — diagnostic write only, NO execution-flow change)
- `src/state/game_state.ts` (additive shape — new optional fields)
- `tests/operation_aar.test.ts` (Phase B regressions)
- `tests/operation_axis_unreachable_diagnostic.test.ts` (new, Phase C)

**Codex-owned READ-ONLY (honored):**
- `src/sim/combat/operation_storm.ts`
- `src/sim/combat/operation_storm_theater.ts`
- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
- `tests/operation_storm_theater_gate.test.ts`
- `tests/operation_opportunities_5th_corps_sana.test.ts`
- `tests/operation_opportunities_una_94.test.ts`
- `tests/operation_opportunities_breza_94.test.ts`
- `tests/operation_opportunities_pauk_94_95.test.ts`

## Six-Investigator Findings Synthesis

**Operations Expert:** Sana 95 has three axes (`sana_krupa`, `sana_bihac_petrovac`, `sana_sanski_most_kljuc`). At launch readiness check (`sector_offensive_launch_helpers.ts:215-243`), the third axis's first objective `op:sanski_most:lusci_palanka_2` had zero front edges anywhere in the operational graph — the catalog declared a polygon-interior first objective. The OUTER op still launched on its other axes; the unreachable axis silently stayed in `'executing'`, accumulated idle failures, advanced via skip-ahead, never attacked. **Fix-in-lane:** persist `axis.unreachable_at_launch=true` at the silent-skip path so post-mortem tooling sees the engine bug. **Catalog-content fix:** OUT (Codex-owned).

**Scenario-Harness-Engineer:** AAR layer was incomplete for post-mortem investigation. `recovery_reason` was on `CorpsOperation` (in-state) but not persisted on `OperationAAR`; `staging_osid` was on `OperationAxis` but not on `AxisAAR`. Multi-axis launch failures like Sana 95 (`recovery_reason='max_failures'`) had to be reconstructed from final-save spelunking. **Fix-in-lane:** Phase B carryover from `CorpsOperation/OperationAxis` to `OperationAAR/AxisAAR`.

**Corps-Army-Commander:** Grmeč 94 (t133, single axis `grmec_ridge_breakout`) was a HONEST FAIL — combat math, not engine bug. All 6 brigades engaged at front-adjacent `op:bihac:ripac` (front edges intact). 2 attacks, t134 first_blood, t135 heavy_losses; exchange ratio 1:6. Catastrophic-stall guard fired correctly (`MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT=2` at `sector_offensive.ts:1098-1106`). 5th Corps was 100% light_infantry, 0 tanks, 0 artillery vs RS dug-in 1+ year on Grmeč ridge. **Root owner: combat math (`estimateForceRatio` blind to defender modifiers, P14 from MEMORY).** OUT-of-lane.

**Sector-Expert:** All sub-segment topology in n1605 was sound; sector splitting / contiguity / triple-junction adjacency unchanged. The Sana axis C failure was NOT a sector bug — it was that the catalog declared an objective with no front edges at all. The sector subsystem cannot manufacture an approach OSID where the objective is polygon-interior with no enemy/friendly boundary. **No in-lane fix needed in sector subsystem.**

**Determinism-Auditor:** All proposed Phase B/C fields are optional (`?:`) and write-only diagnostic. Final-state hash drift expected from new persisted fields is purely additive shape. No `Math.random`, no timestamps, no locale-sort iteration introduced. Sorted iteration via `strictCompare` preserved across all touched code. **Determinism preserved.**

**Game-Designer:** A multi-axis op silently launching with one axis structurally guaranteed to never deliver is an internal-model violation: the corps commander cannot reason about "this axis is launching" if that axis has no path to its objective. The diagnostic gives the commander layer (and post-mortem tools) the truth. The execution-flow stays silent-skip — the engine's late-war ladder rests on it — but the "what happened" is now legible. **Diagnostic is correct shape; deeper combat-math fix is the next mega-lane.**

## Root-Cause Table

| # | Failure | Class | File:line | Lane | Status |
|---|---|---|---|---|---|
| 1 | Grmeč ripac repulse 1:6 | combat-math | `operation_preparation.ts:192-249` `estimateForceRatio` | OUT | Documented; next mega-lane |
| 2 | Sana A/B repulse | combat-math | same | OUT | Documented; next mega-lane |
| 3 | Sana C silent-skip + interior first obj | engine + catalog | `sector_offensive_launch_helpers.ts:215-243` (engine, IN) + 5th Corps catalog (Codex, OUT) | IN engine + OUT catalog | **Engine fixed in Phase C**; catalog handoff to Codex |
| 4 | force_ratio 7.19 vs reality | combat-math | `operation_preparation.ts:192-249` | OUT | Documented; next mega-lane |
| 5 | Top-level staging proxy passes prematurely | preparation lifecycle | `operation_preparation.ts:333-374` `countAssembledBrigades` | LOWER PRIORITY | Documented; deferred — n1605 evidence shows brigades couldn't reach axis staging anyway |
| 6 | recovery_reason not on AAR | diagnostic gap | `operation_aar.ts:683-708` | IN | **Fixed in Phase B** |
| 7 | staging_osid not on AxisAAR | diagnostic gap | `operation_aar.ts:625-678` | IN | **Fixed in Phase B** |
| 8 | No per-op delivery diagnostic tool | diagnostic gap | new `tools/diagnostics/operation_delivery_audit.cjs` | IN | **Fixed in Phase A** |
| 9 | Catalog axis-staging reachability not validated | catalog content | 5th Corps catalog | OUT (Codex) | Handoff to Codex |
| 10 | Failed-objective cooldown ↔ predicate | predicate ↔ lifecycle | needs new lane | OUT | Handoff to next mega-lane |
| 11 | Corps stance gate timing | plan.ts | `plan.ts ai_recommended_stance` | OUT | Handoff to next mega-lane |

## Verdict per Op

- **Grmeč 94:** HONEST FAIL — combat math, OUT-of-lane. All brigades fought at the right OSID; the engine's predictor said go because it counted personnel only; the actual battle was 5th Corps light_infantry vs entrenched VRS on commanding terrain. Combat math is the correct owner.
- **Sana 95:** ENGINE BUG + COMBAT MATH + CATALOG. The Phase C diagnostic surfaces the engine bug (silent-skip on front-unreachable axis) at the AAR layer. The combat math (axes A and B) and catalog content (axis C's polygon-interior first objective) are out-of-lane handoffs.

## In-Lane Fixes A-D

| Fix | File | Tests | Hash drift class | Commit |
|---|---|---|---|---|
| **A** Diagnostic script `operation_delivery_audit.cjs` | new `tools/diagnostics/operation_delivery_audit.cjs` | golden output on n1605 (audit log: `docs/40_reports/diagnostics/20260501_operation_delivery_audit_n1605.md`) | NONE (read-only tool) | `693ef166` |
| **B** Persist `recovery_reason` on AAR + `staging_osid` on AxisAAR | `operation_aar.ts:683-708`, `:625-678` | 4 red-first regressions in `tests/operation_aar.test.ts` (44→48 tests) | additive shape | `dd083454` |
| **C** Persist `axis.unreachable_at_launch` engine diagnostic | `sector_offensive_launch_helpers.ts:227-233` (write); `state/game_state.ts:259` (`OperationAxis` field); `operation_aar.ts:79`, `:697-700` (AxisAAR carryover) | 3 red-first regressions in new `tests/operation_axis_unreachable_diagnostic.test.ts` (write-side, no-write when reachable, AAR carryover) | additive shape (write-only diagnostic, NO execution-flow change) | `0a28762e` |
| **E** Mega-lane report + ledger + knowledge + napkin | this report + `docs/PROJECT_LEDGER.md` + `docs/PROJECT_LEDGER_KNOWLEDGE.md` + `.claude/napkin.md` + `working-on.md` | n/a | NONE (docs only) | this commit |

## Out-of-Lane Handoffs (Named Owners)

| Owner | Issue | Recommended start point |
|---|---|---|
| `/corps-army-commander` + `/sector-expert` + `/game-designer` | `estimateForceRatio` defender-modifier integration (combat math P14 / BRIEF-GAP-1 / COMBAT-P14) — predictor blind to defender artillery, tanks, entrenchment, terrain, urban, supply | `src/sim/combat/operation_preparation.ts:192-249`. Cited in MEMORY.md "Engine Health Audit". Strongly recommended as next mega-lane. |
| Codex (`operation_opportunity_catalog_5th_corps.ts` is Codex-owned) | 5th Corps catalog axis-staging reachability + first-objective validation. Sana axis C's first objective `op:sanski_most:lusci_palanka_2` has zero front edges anywhere — needs a different first objective or an explicit `staging_osid` that has a front-edge path to it. | `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` SANA_95_OPPORTUNITY axis definitions. |
| `/corps-army-commander` + `/operations-expert` | `plan.ts ai_recommended_stance` corps-stance gate timing — fires t188 not t133/t175 in n1605 | `src/sim/combat/commander/plan.ts`. |
| `/operations-expert` + `/scenario-harness-engineer` | Failed-objective cooldown ↔ opportunity predicate communication — opportunity predicate doesn't see that an axis is in catastrophic-stall on its current objective | `src/sim/combat/operation_opportunities.ts` evaluator + `sector_offensive.ts` lifecycle counters. |
| Codex | Force-quality brigade-fitness aggregate (catalog content) | Codex-owned 5th Corps catalog. |

## Verification Table

| Step | Command | Result |
|---|---|---|
| Typecheck | `npx.cmd tsc --noEmit` (with set-aside) | Clean (only pre-existing Codex WIP error in `tests/ui/turn_aftermath.test.ts`, not this lane's responsibility) |
| Phase B + C tests | `npx.cmd vitest run tests/operation_aar.test.ts tests/operation_axis_unreachable_diagnostic.test.ts` | 51/51 PASS |
| Broader op-suite tests | `npx.cmd vitest run tests/operation_aar.test.ts tests/operation_axis_unreachable_diagnostic.test.ts tests/multi_axis_operations.test.ts tests/corps_operation_readiness.test.ts tests/corps_operation_helpers.test.ts tests/concurrent_operations.test.ts tests/intel_gated_operations.test.ts tests/exhaustion_gate_sector_offensive.test.ts tests/sector_offensive.test.ts tests/sector_offensive_idle_recovery.test.ts` | 183/183 PASS across 10 suites |
| 40w smoke (post-Phase-C) | `npm run sim:scenario:run:40w` | Run dir: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1606`. Final hash `8692ee345b682598`. Anchors **26/27 PASS** (unchanged from n1603 26/27). |
| 40w previous baseline | n1603 (post-Codex AAR fix `6ca0a0d2`, pre-Phase B/C) | Hash `de0673d30a0381d3`. Anchors **26/27 PASS**. |
| Hash drift classification | n1603 → n1606 | **Additive shape only.** No anchor change. New persisted optional fields: `unreachable_at_launch` 0→2, `staging_osid` (on AAR) 19→40, `recovery_reason` (on AAR) 11→26. No controller flips, no battle changes, no captures changes. |
| Opportunity health audit | `node tools/diagnostics/opportunity_health_audit.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1606` | 0 unlinked / 0 broken AAR / 0 duplicates (CLEAN) |
| Operation delivery audit | `node tools/diagnostics/operation_delivery_audit.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1606` | 25 axes total: 11 DELIV / 6 UNDERDELIV / 5 NO-CONTACT-OTHER / 3 PRE-FRIENDLY. `Unreach@Launch` column populated from persisted AxisAAR data (all `false` in 40w window — Sana 95 fires at t175 in 188w, not 40w). |
| 188w | Skipped per lane brief ("optionally run 188w … if 40w smoke is clean") | n/a |

## Acceptance Criteria Check

| Criterion | Met | Proven by | Artifact |
|---|---|---|---|
| ≥1 launched op failure mode intelligible from persisted diagnostics without source spelunking | YES | n1606 final_save contains `recovery_reason` on AAR (26 occurrences), `staging_osid` on AxisAAR (40 occurrences), `unreachable_at_launch` on OperationAxis + AxisAAR (2 occurrences). `operation_delivery_audit.cjs` columns now read directly from these persisted fields. | n1606 final_save.json + audit run output |
| Code fix engine-general + red-first tests | YES | Phase C engine line at `sector_offensive_launch_helpers.ts:227-233` is generic (not Sana-specific). Red-first proven by commenting out engine line and confirming test 1 fails with `expected undefined to be true`. | `tests/operation_axis_unreachable_diagnostic.test.ts` |
| If Sana/Grmeč still fail: prove why in live-state terms + identify next engine owner | YES | Root-cause table above attributes each failure to its true owner; combat math (P14) is the cited next mega-lane. | this report root-cause table |
| No railroaded captures | YES | No painted-target reads, no hardcoded "Sana succeeds", no global combat buffs, no calendar captures, no T4 sensitive-history changes. | git diff of commits A/B/C |
| Docs/ledger/knowledge/napkin updated; commit phase by phase | YES | 4 commits: A=`693ef166`, B=`dd083454`, C=`0a28762e`, E=this commit. Each phase landed via the LANE E set-aside pattern (no `--no-verify`). | git log |

## Next Recommended Mega-Lane

**Combat-Math `estimateForceRatio` Defender-Modifier Integration.**

Rationale: rows 1, 2, 4 of the root-cause table all collapse to this single P14 / BRIEF-GAP-1 / COMBAT-P14 gap (cited in MEMORY.md "Engine Health Audit 2026-04-02"). The current predictor at `src/sim/combat/operation_preparation.ts:192-249` is a personnel-only ratio that produces fantasy values like 7.19 for ARBiH light_infantry vs entrenched VRS with artillery — that single function is the upstream cause of every combat repulse documented in n1605. Phase C closes the diagnostic gap; combat math closes the prediction gap.

Suggested scope:
- Integrate `getDefensiveFireMult`, `getForestMult`, `getUrbanMult`, entrenchment, supply state into the launch-readiness force-ratio prediction.
- Surface predicted-ratio band (low/medium/high confidence) on the corps commander briefing so high-loss attacks self-abandon before launching.
- Red-first: build a synthetic ARBiH light_infantry vs entrenched VRS scenario; assert predictor returns ratio < 1.0 (loss expected) instead of 7.19.
- Validate with 40w + 188w hash classification.

## Files Changed

**Phase A (`693ef166`):**
- `tools/diagnostics/operation_delivery_audit.cjs` (new)
- `docs/40_reports/diagnostics/20260501_operation_delivery_audit_n1605.md` (new)

**Phase B (`dd083454`):**
- `src/sim/combat/operation_aar.ts` (additive)
- `src/state/game_state.ts` (additive)
- `tests/operation_aar.test.ts` (4 new tests)

**Phase C (`0a28762e`):**
- `src/sim/combat/sector_offensive_launch_helpers.ts` (additive — diagnostic write)
- `src/sim/combat/operation_aar.ts` (additive — AxisAAR carryover)
- `src/state/game_state.ts` (additive — `OperationAxis.unreachable_at_launch?`)
- `tests/operation_axis_unreachable_diagnostic.test.ts` (new, 3 tests)

**Phase E (this commit):**
- `docs/40_reports/implemented/20260501_LATE_WAR_OPERATION_COMBAT_DELIVERY_MEGA_LANE.md` (this report)
- `docs/PROJECT_LEDGER.md` (entry prepended)
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` (durable lessons appended)
- `.claude/napkin.md` (Current State updated)
- `working-on.md` (closing note)
