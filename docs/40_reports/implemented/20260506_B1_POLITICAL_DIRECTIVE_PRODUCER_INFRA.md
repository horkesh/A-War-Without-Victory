# B1 — Political Directive Producer Infrastructure (LANE-NIGHTSHIFT-B1-POLITICAL-DIRECTIVE-PRODUCER-INFRA)

**Date:** 2026-05-06
**Status:** SHIPPED (byte-stable)
**Predecessors:**
- A1 (CampaignPlan wiring): `18136710`
- A2 (Army CO substrate): `ba6955bf`
- A3 (Army order interpretation, consumer): `c8ff93d8`
- A4 (Army CO roster personalities): `93c75b1d`
- A-lane DDR (umbrella): `eee308e0`
- **B-lane DDR (this lane):** `941bd68e` + `168d65c2`

## Summary

A3 reads `PoliticalDirective` defensively from `state.military.political_directives_by_faction[faction]` (army_order_interpretation.ts:623–631) but no engine-side producer ever writes that slot. A3's `apply-army-directive-interpretation` step therefore short-circuits every turn — `readPoliticalDirective` returns null, `interpretArmyDirective` is never invoked, A4 personality differentiation is unobservable. B1 wires the producer infrastructure that closes that gap. The module is byte-stable (always-null) until B2 ships canonical `political_leader_data` substrate.

## Files

- **NEW:** `src/sim/political/political_directive_producer.ts` — `producePoliticalDirective(state, faction)`, `applyPoliticalDirectiveProducer(state)`, `B1_PIPELINE_STEP_NAME`, threshold constants.
- **EXTENDED:** `src/sim/turn_phases/war_phases.ts` — adds `produce-political-directive` step AFTER `evaluate-army-hq-gathering` and BEFORE `evaluate-army-co-transitions` (A4) / `apply-army-directive-interpretation` (A3).
- **NEW:** `tests/b1_political_directive_producer.test.ts` — 21 tests across substrate-empty, env-flag, determinism, byte-stability, faction-symmetry, static-grep guards, verb derivation, pipeline ordering, backward-compat, DDR provenance, and pipeline write semantics.

## Byte-stability guarantee

Until B2 populates `state.military.political_leader_data` and `state.military.political_leaders`, `producePoliticalDirective` returns null on every call:

1. Env flag short-circuit (`B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED=true`).
2. Player-faction skip (player issues directives via UI handler).
3. Missing leader profile in `political_leader_data` array.
4. Missing leader state in `political_leaders` map.

`applyPoliticalDirectiveProducer` lazily creates `political_directives_by_faction` ONLY when at least one faction yields a non-null directive — pre-B2 saves remain byte-identical.

## 40w byte-stability verification

| Run | Final state hash |
|---|---|
| Pre-B1 baseline (clean HEAD, B1 files removed, war_phases.ts reverted) | `575aca8c8adfdae2` (n1709) |
| Post-B1 (this commit) | `575aca8c8adfdae2` (n1708) |

Hash IDENTICAL → B1 is behaviorally inert vs. current HEAD (n1709 baseline).

**Note on n1703 (`7a1fddce105993e7`):** the predecessor hash recorded in the dispatch envelope is from before Krivaja-95 (`d622b762`) shipped its sanctioned t168→t170 floor shift. The sanctioned shift (Krivaja-95 closeout, 2026-05-06) drifted the 40w hash from `7a1fddce105993e7` → `575aca8c8adfdae2` independent of B1. B1's invariant is "match the CURRENT pre-B1 baseline" — confirmed.

## Test verification

| Suite | Tests | Status |
|---|---|---|
| `tests/b1_political_directive_producer.test.ts` | 21 | PASS |
| `tests/a1_army_hq_campaign_plan_wired.test.ts` | 7 | PASS |
| `tests/a2_army_co_substrate.test.ts` | 16 | PASS |
| `tests/a3_army_order_interpretation.test.ts` | 14 | PASS |
| `tests/a4_army_co_roster_personalities.test.ts` | 16 | PASS |
| `npx tsc --noEmit -p tsconfig.json` | — | CLEAN |

## Verb derivation table (DDR Q3)

Pure function of substrate inputs (faction-symmetric — no per-faction id branches except the alliance-corridor predicate which fires symmetrically for {RBiH, HRHB}):

| Predicate | Verb |
|---|---|
| `war_exhaustion[faction] >= 500` AND `international_sensitivity >= 4` | `HONOR_TRUCE` |
| `war_exhaustion[faction] >= 500` (alone) | `PREPARE_RESERVE` |
| `international_visibility_pressure.level >= 0.6` AND `international_sensitivity >= 4` | `HONOR_TRUCE` |
| `war_alliance_rbih_hrhb <= 0` AND faction ∈ {RBiH, HRHB} | `MAINTAIN_CORRIDOR` |
| `hawkishness >= 4` | `PRESS_OFFENSIVE` |
| `hawkishness <= 2` | `HOLD_AT_ALL_COSTS` |
| (default) | `BALANCE_FRONTS` |

Target corps selection: highest `priority_weight` in `state.military.campaign_plans[faction].front_priorities`, ties broken by `strictCompare(corps_id)`.

## Pipeline ordering (DDR Q4)

```
evaluate-army-hq-gathering          (A1 wire — produces CampaignPlan)
produce-political-directive         (B1 — this lane)
evaluate-army-co-transitions        (A4 — populates stubbornness from roster)
apply-army-directive-interpretation (A3 — consumes the directive we wrote)
generate-bot-corps-orders
```

## Sensitive-history compliance

- **Ring 1 mechanism only.** B1 ships zero data — `political_leader_data` is B2's territory.
- **§6 surface:** none introduced. Producer returns null until B2 wires data; A3 already accepts the parameter.
- **Faction-symmetric:** identical code path for RBiH / RS / HRHB. The alliance-corridor branch tests faction membership in {RBiH, HRHB} together (symmetric predicate, not a single-faction railroad — guarded by static-grep test T6b).

## Calibration risk band

**LOW.** B1 is byte-stable. Calibration risk lands with B2 when leader profiles populate.

## Next lane (B2 — out of scope here)

Populate `political_leader_data` for canonical leaders (Izetbegović, Karadžić, Boban) with hawkishness/flexibility/international_sensitivity/patron_deference values from canon, wire `political_leaders` initialization into scenario init, run mini-panel A/B 40w as required by DDR Q5.
