# LANE E — 5th Corps Opportunity Predicate Topology + 188w Validation

**Date:** 2026-05-01
**Type:** Substrate enum extension + per-entry predicate authoring + observability emit + 188w validation. No combat math, OOB, scenario data, painted targets, T4 sensitive-history, AAR aggregator, or hardcoded `<x>_completed → <y>_eligible` chains touched.
**Predecessor:** LANE D (`eb7e7b53`) identified railroad-by-omission topology + Codex AAR aggregator fix (`6ca0a0d2`) verified on HEAD before lane start.
**HEAD at run start:** `6ca0a0d2`

---

## 1. Headline

LANE E closes the railroad-by-omission identified by LANE D Gap-Finder by giving the 5th Corps catalog the predicate topology it always needed: a second genuine optional axis on T1 entries (so logistics-saturation alone cannot block them) and a live threat-pressure predicate on T3 defensive-crisis entries (so a defensive commit is gated on whether the enemy is actually pressing the pocket, not whether RBiH supply is in good shape). LANE E P2 also adds the observability breadcrumb LANE D recommended.

**188w stress validation (n1605, hash `488d2c6917e48fcb`):**

| Catalog entry | Tier | LANE D (n1604) | LANE E (n1605) | Outcome |
|---|---|---|---|---|
| sana_95 | T1 | surfaced + did_not_launch* | surfaced + failed | Codex AAR fix corrected exit_class |
| tigar_sloboda_94 | T1 | NEVER SURFACED | **surfaced + decisive_success** (4/4 captures, grade 5) | LANE E force_quality optional unlocked it |
| apwb_pressure_94 | T1 | NEVER SURFACED | **surfaced + decisive_success** (5/5 captures, grade 5) | LANE E force_quality optional unlocked it |
| grmec_94 | T1 | NEVER SURFACED | **surfaced + failed** (0/6 captures, grade 2) | LANE E force_quality optional unlocked it; combat-execution gap (LANE D §10 #4) determined outcome |
| una_94 | T3 | NEVER SURFACED | NEVER SURFACED | Now blocked by `alliance_context` (Storm trigger flag), not by railroad-by-omission |
| breza_94 | T3 | NEVER SURFACED | NEVER SURFACED | Same as Una — Storm-flag gate, not topology |
| pauk_94_95 | T3 | NEVER SURFACED | NEVER SURFACED | Same as Una/Breza |

\* misclassified per LANE D OE finding; Codex `6ca0a0d2` fixed the AAR aggregator.

**Surfaced + completed: 4 of 7** (was 1 of 7 in LANE D n1604). The T1 railroad-by-omission is closed. The T3 trio remains inert but for a different, separately-owned reason now visible via LANE E P2 observability — see §6.

## 2. What Shipped

### 2.1 Substrate (`src/sim/combat/operation_opportunities.ts`)

- New `PrereqAxis` enum value: `'force_quality'` (10th axis) — designed for use as an OPTIONAL alternative to `logistics` so a single saturating substrate signal cannot lock an entire opportunity family away. Predicate body should read specific traits from `computeCorpsOperationReadiness` (`staging_reliability`, `failure_recovery`, `axis_coordination`) — NOT `operation_readiness`, which `corps_readiness` already gates on.
- `AXES_IN_DETERMINISTIC_ORDER` extended to include `'force_quality'`.
- New observability type `OperationOpportunityIneligibilityDiagnostic` — per-turn record emitted when an opportunity is in its `date_window` but eligibility fails.
- `evaluateOperationOpportunities` return shape extended with `newDiagnostics`. Skip path now emits a diagnostic record (with failed required + optional axes + reasons + min_optional_axes counter) ONLY when the entry is in date_window AND not already enqueued under the one-shot guard.
- `runOpportunityEvaluationStep` wrapper appends new diagnostics to a new optional `state.military.operation_opportunity_diagnostics` field.

### 2.2 State (`src/state/game_state.ts`)

- New optional field `operation_opportunity_diagnostics?: OperationOpportunityIneligibilityDiagnostic[]` on military state.

### 2.3 Catalog content (`src/sim/combat/operation_opportunity_catalog_5th_corps.ts`)

T1 entries — added a second genuine optional axis backed by force-quality traits:

| Entry | force_quality predicate | Trait read | Floor |
|---|---|---|---|
| Tigar-Sloboda 94 | `forceQualityTigar` | `staging_reliability` | 0.30 |
| APWB Pressure 94 | `forceQualityApwb` | `failure_recovery` | 0.40 |
| Grmeč 94 | `forceQualityGrmec` | `axis_coordination` | 0.40 |

Each predicate names the relevant trait honestly in the player-safe `reason` text. The traits are deliberately distinct (no two T1 entries lean on the same trait) — this preserves the design intent that force-quality is a multi-dimensional measure, not a single scalar.

T3 entries — re-authored topology:

| Field | Before (LANE C) | After (LANE E) |
|---|---|---|
| `logistics` mode | `'required'` | `'optional'` (severity/risk only) |
| `enemy_weakness` mode | `'n_a'` | `'required'` (live threat pressure) |
| `enemy_weakness` predicate | `alwaysGreen` | `threatPressureT3` |
| `force_quality` mode | n/a | `'n_a'` (T3 has no offensive lifecycle to gate) |

New `T3_BIHAC_THREAT_RING` constant: 6 historically RS/SVK-controlled OSIDs around the Bihać pocket (`op:bihac:vrtoce_2`, `op:bihac:papari_2`, `op:bosanski_petrovac:bosanski_petrovac_2`, `op:bosanski_petrovac:vedro_polje_2`, `op:bosanska_krupa:arapusa_2`, `op:bosanska_krupa:donji_dubovik_2`). The `threatPressureT3` predicate counts live hostile-controller presence on the ring. Defensive crisis fires only when the enemy is actually pressing — historically true throughout 1992-1995 in any tracking run, but correctly disappears if 5th Corps somehow clears the entire ring.

Sana 95 (T1): `force_quality: 'n_a'` (already had `commander_confidence: optional` as its second optional partner — no topology change needed).

### 2.4 Tests

15 net new test cases across the 9-suite opportunity pack (was 163 → now 178):

- `tests/operation_opportunities_substrate.test.ts`: 8 new LANE E ineligibility-skip diagnostic cases (in-window emit, out-of-window suppression, no-emit-when-eligible, no-emit-when-one-shot-guard-blocks, multi-turn append, determinism, purity guard).
- `tests/operation_opportunities_tigar_sloboda_94.test.ts`: replaced "does not surface when supply pressure ≥ 95" with "LANE E: surfaces when supply pressure is critical IF force_quality is green."
- `tests/operation_opportunities_apwb_pressure_94.test.ts`: same shape.
- `tests/operation_opportunities_grmec_94.test.ts`: same shape.
- `tests/operation_opportunities_una_94.test.ts`: replaced "does not surface when supply pressure ≥ 95" with "LANE E: surfaces even when supply pressure is critical (logistics is severity, not gate)" + added "LANE E: does not surface when Bihać threat ring is clear" (negative case via new `threatRingClear` fixture flag).
- `tests/operation_opportunities_breza_94.test.ts`: same pair as Una.
- `tests/operation_opportunities_pauk_94_95.test.ts`: same pair as Una.
- 8 length assertions updated `9 → 10` to reflect the new `force_quality` axis in `last_axis_evaluation`.

T3 fixture buildState helpers gained a `threatRingClear` flag that defaults to `false` (historical state has hostile pressure on the pocket); positive paths automatically seed the threat ring as RS-controlled.

## 3. Verification

- `npx.cmd tsc --noEmit`: clean (one pre-existing untracked file `tests/ui/turn_aftermath.test.ts` references a non-existent module — Codex parallel-lane stub, not LANE E's responsibility).
- Full opportunity test pack: **178/178 pass across 9 suites** (was 163/163 at LANE C close-out).
- Fresh 188w stress run: exit 0, run dir `runs/apr1992_definitive_188w__210e69404d054959__w188_n1605`, `final_state_hash: 488d2c6917e48fcb`.
- Health audit script clean (0 broken-row predicates triggered).

## 4. 188w Run Evidence (post-LANE-E)

### Surfaced opportunities table

| Turn | Faction | Proposal | Opportunity | Tier | Response | Exit | AAR | Outcome | Attacks | Captures | Grade |
|---:|---|---|---|---|---|---|---|---|---:|---:|---:|
| 113 | RBiH | OPP_113_apwb_pressure_94 | Operation APWB Pressure | T1 | approve | decisive_success | `arbih_5th_corps:Operation APWB Pressure:t113` | success | 0 | 5/5 | 5 |
| 113 | RBiH | OPP_113_tigar_sloboda_94 | Operation Tigar-Sloboda | T1 | approve | decisive_success | `arbih_5th_corps:Operation Tigar-Sloboda:t113` | success | 0 | 4/4 | 5 |
| 133 | RBiH | OPP_133_grmec_94 | Operation Grmeč 94 | T1 | approve | failed | `arbih_5th_corps:Operation Grmeč 94:t133` | failure | 2 | 0/6 | 2 |
| 175 | RBiH | OPP_175_sana_95 | Operation Sana | T1 | approve | failed | `arbih_5th_corps:Operation Sana:t175` | failure | 4 | 0/31 | 3 |

### Ineligibility diagnostics (LANE E P2)

20 in-window ineligibility records emitted across the 3 T3 entries:

| Opportunity | In-window misses | Window | Failed required | Failed optional |
|---|---:|---|---|---|
| una_94 | 3 | w113-115 | `alliance_context` | `logistics` |
| breza_94 | 6 | w125-130 | `alliance_context` | `logistics` |
| pauk_94_95 | 11 | w135-145 | `alliance_context` | `logistics` |

Total: 20 records — bounded as expected (sum of T3 window widths).

### Health diagnostic

```
Total decisions: 4         (was 1 in n1604)
Approved/redirected/UR: 4  (all RBiH approve)
Declined: 0                Expired: 0
Completed: 4               Successes: 2 (Tigar, APWB)
T3 defensive sentinels: 0  (no T3 surfaced)
Unlinked approved: 0       Broken AAR links: 0
Duplicate proposal rows: 0
```

### Sana exit_class progression (Codex AAR fix verification)

| Run | Hash | Sana exit_class | Sana attacks (AAR vs op-counter) |
|---|---|---|---|
| n1602 (pre-LANE-C) | `c18c909fbb6fb62b` | pending (no AAR loop) | n/a |
| n1604 (post-LANE-D) | `dca64282334ae735` | `did_not_launch` (misclassified) | 0 (AAR) / 7 (`op.attack_attempt_count`) |
| n1605 (post-LANE-E + Codex AAR) | `488d2c6917e48fcb` | `failed` (correct) | 4 (canonical counter) |

Codex commit `6ca0a0d2` ("derive AAR attacks from lifecycle counters") is verified working: Sana now reports `total_attacks: 4` and is correctly classified as `failed`, not `did_not_launch`.

## 5. Hash Drift Classification

`488d2c6917e48fcb` (n1605) vs `dca64282334ae735` (n1604) is **BOTH additive-shape AND behavioral**:

**Additive shape:**
- New `state.military.operation_opportunity_diagnostics` array (20 records in 188w run).
- New `force_quality` axis evaluation appears on every proposal's `last_axis_evaluation` (length 9 → 10).
- New `threat_pressure` reason text in T3 evaluations.

**Behavioral:**
- Three additional CorpsOperations spawned (Tigar-Sloboda 94, APWB Pressure 94, Grmeč 94) executed real combat through `sector_offensive.ts`.
- 9 OSIDs flipped to RBiH at w113 from successful Tigar (4) + APWB (5) opportunity-spawned ops that did not flip in n1604.
- Brigade time, ammunition, and exhaustion budgets at the 5th Corps are different from w113 onward.

Per LANE D durable rule "additive shape changes are documented expected hash drift": the additive component is in scope and benign. Per the new behavior: this is the *intended* effect of fixing the railroad-by-omission. Three historically-anchored 5th Corps operations that should have been firing now fire when their predicates align with live state. Whether the resulting 9 OSID flips are a calibration improvement is a separate question (see §7 OSID flip note).

## 6. New Finding Outside LANE E Scope: T3 Storm-Flag Gate

LANE E's P2 observability surfaced a clean diagnosis the LANE D investigation could only guess at: every T3 entry in this 188w run is blocked by `alliance_context: required` returning red, because `state.meta.operation_storm_triggered === true` at all relevant T3 windows (w113-w145). The Storm narrative event fires at w174 per `weekly_report.events_fired` (`operation_storm_1995 — Croatia Retakes Krajina`), but the trigger flag itself transitions to true earlier in this scenario.

Single writer of `operation_storm_triggered = true`: `src/sim/combat/operation_storm.ts:112` (preconditions: Washington signed + RS share ≥ 0.35 + RBiH+HRHB exhaustion ≥ 60 + IVP momentum ≥ 0.55). If those preconditions all align before w113, the flag is set and every T3 historical defensive-crisis opportunity in the Una→Breza→Pauk arc is unconditionally blocked despite the historical Storm not having happened yet.

This is **out of LANE E scope** because:
1. LANE E's mandate was predicate topology fix, not Storm-trigger-timing investigation.
2. Touching `operation_storm.ts` thresholds would cross the "no combat tuning" stop gate.
3. Touching `allianceContextPreStorm` semantics is a `/historian` + `/game-designer` decision — the historian gate "Pauk impossible after Oluja" is real and shouldn't be relaxed without their sign-off.

Recommend next-lane investigation: trace `state.meta.operation_storm_triggered` per turn in this scenario, identify which precondition crosses first and when, and decide whether the trigger thresholds need adjustment OR whether the Storm-flag-vs-event distinction should be made explicit in the `allianceContextPreStorm` predicate (read the event-fired turn rather than the precondition-met flag). Owner: `/operations-expert` + `/historian` + `/game-designer`.

## 7. OSID Flip Note (Calibration Gradient)

The Tigar + APWB successful captures at t113 flip 9 OSIDs to RBiH that didn't flip in n1604. These OSIDs are in mid-1994 windows (Cazin southern flank + Velika Kladuša ring), so the jan1993 painted target isn't the right yardstick for evaluating whether this is a calibration regression. Historically, RBiH 5th Corps DID consolidate control of the Cazin flank and reduce APWB along the Pecigrad-Šturlić-Trzac-Velika Kladuša axis between Jul-Aug 1994. The LANE E surface alignment is therefore likely a calibration *improvement* against the apr1994 painted target (if one exists). A future packet should run `tools/compare_painted_vs_sim.cjs runs/<n1605> --target apr1994` to confirm. Owner: `/scenario-creator-runner-tester` (calibration class, not LANE E).

## 8. Determinism Statement

LANE E preserves engine determinism:

- No `Math.random` / `Date.now` / `localeCompare` introduced.
- Diagnostics emit sorted by `(turn, opportunity_id)` via `strictCompare`.
- Save shape backward-compatible: `operation_opportunity_diagnostics` and `force_quality` are both optional/additive; existing saves without them deserialize cleanly.
- Predicate bodies are pure reads of state fields (`political_controllers`, `corps_command`, computed traits) — no random sampling, no hidden iteration order.

## 9. Stop Gates Hit

None. All five stop gates preserved:

- ✅ No combat tuning — LANE E touched only opportunity predicates and observability.
- ✅ No OOB / scenario data edits — catalog file changed; no scenario JSON, no painted targets, no OOB.
- ✅ No T4 sensitive-history opportunities — Krivaja-95, Stupčanica-95, Goražde, Aug 1995 VK column remain calendar-triggered or Ring-2 narrative-only.
- ✅ No AAR aggregator changes — Codex `6ca0a0d2` already fixed; LANE E read its result, did not modify it.
- ✅ No hardcoded `<x>_completed → <y>_eligible` chains — emergent dependencies only (overlapping windows + shared brigade pools + live-state predicates).

## 10. Files Changed

| File | Change |
|---|---|
| `src/sim/combat/operation_opportunities.ts` | +`force_quality` PrereqAxis, +`OperationOpportunityIneligibilityDiagnostic` type, +`AXES_IN_DETERMINISTIC_ORDER` entry, +`newDiagnostics` return field, +skip-path emit, +wrapper append |
| `src/state/game_state.ts` | +`operation_opportunity_diagnostics?` field |
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | +`force_quality` mode/evaluator on all 7 entries (optional+predicate on Tigar/APWB/Grmec; n_a+alwaysGreen on Sana/Una/Breza/Pauk); T3 trio: `logistics: required → optional`, `enemy_weakness: n_a → required` with new `threatPressureT3`, +`T3_BIHAC_THREAT_RING` constant |
| `tests/operation_opportunities_substrate.test.ts` | +8 LANE E diagnostic cases, length 9→10 |
| `tests/operation_opportunities_phase2_decisions.test.ts` | +`force_quality` to test fixture |
| `tests/operation_opportunities_5th_corps_sana.test.ts` | length 9→10 |
| `tests/operation_opportunities_tigar_sloboda_94.test.ts` | logistics test rewrite + length 9→10 |
| `tests/operation_opportunities_apwb_pressure_94.test.ts` | logistics test rewrite + length 9→10 |
| `tests/operation_opportunities_grmec_94.test.ts` | logistics test rewrite + length 9→10 |
| `tests/operation_opportunities_una_94.test.ts` | logistics test rewrite + threatRingClear test + length 9→10 + `force_quality` flag in fixture |
| `tests/operation_opportunities_breza_94.test.ts` | same as Una |
| `tests/operation_opportunities_pauk_94_95.test.ts` | same as Una |

Net code delta: ~+250 lines across 12 files.

## 11. Hand-off

- **Bugs found / fixed**: predicate-topology railroad-by-omission (LANE D Gap-Finder) closed for all 4 T1 entries. T3 trio's blocker shifted from logistics-saturation (LANE D root cause) to alliance_context Storm-flag timing (NEW finding, out-of-scope).
- **Codex AAR fix verified**: Sana exit_class is now correct.
- **Run hash**: `488d2c6917e48fcb`. Drift classified as additive-shape + behavioral (intended).
- **Next-lane recommendations** (priority order):
  1. **Storm-flag timing investigation** (BLOCKING T3 trio): trace when `state.meta.operation_storm_triggered` becomes true in 188w; align trigger preconditions with historical Aug 1995 timing OR have `allianceContextPreStorm` read event-fired-turn instead of trigger flag. Owner: `/operations-expert` + `/historian` + `/game-designer`.
  2. **Combat-execution gap on Grmeč** (LANE D §10 #4 still open): Grmeč spawned + executed (2 attacks) but captured 0 of 6 objectives. Force-ratio investigation. Owner: `/corps-army-commander` + `/sector-expert`.
  3. **apr1994 painted target compare**: confirm whether Tigar + APWB OSID flips align with historical Jul-Aug 1994 captures. Owner: `/scenario-creator-runner-tester`.
  4. **Supply-pressure scale debt** (LANE D §10 #3 still open): 0-100 saturating step function carries no signal mid-war. Owner: `/systems-programmer` + `/war-or-game`.

## 12. Closing Line

The 5th Corps T1 opportunity surface is now alive: 4 of 7 entries fire when their predicates align, two of them succeed historically, and the player gets a clean ineligibility audit trail for the rest. The T3 trio's continued absence is now *visible* (LANE E observability) and *single-axis localized* (Storm-flag), not silent and multi-cause as it was in LANE D.
