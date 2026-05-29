# ENGINE-1 Combat Concentration Design Memo

**Date:** 2026-05-23
**Status:** Proposal — read-only investigation, no edits applied
**Trigger:** Wave 32 expanded Sana 95 from 5→8 brigades; n1992↔n1994 OSID-diff = 0 flips.
Concentration of force in the operation catalog does NOT translate into
concentrated combat attacks. ICTY/BB cite Sana 95 used 5–7 brigades per axis
CONCENTRATED on single objectives sequentially; the sim's per-brigade-per-turn
dispersal cannot replicate this even with the same brigade pool.
**Predecessor audit:** `docs/40_reports/audits/20260523_SANA_95_COMBAT_BALANCE.md`
**Decision authority:** Combat / operations expert; no §6 Engine Invariant edits.

---

## 1. Current Combat Flow — One-Paragraph Summary

Each turn during op execution the bot AI runs `bot_brigade_eval_attack.ts` per
brigade. For each operation-participant brigade adjacent to its axis's current
objective, it calls `predictCombatOutcome(state, brigade.id, currentObjective, …, additionalAttackers=undefined)`
(`bot_brigade_eval_attack.ts:265-282`). The predictor evaluates this brigade
SOLO against the full defender stack. If the resulting `predicted_outcome`
clears `getSectorOffensiveProbeThreshold(activeOp, brigade.id)` (default
`'costly_victory'` ≥ 1.0, `bot_brigade_ai_osid.ts:349-360`), an attack order is
emitted (`result.attack_orders[brigade.id] = currentObjective`). A
short-circuit at lines 301-310 estimates a concentrated outcome from the count
of sibling-axis brigades already adjacent to the same objective
(`adjacentOperationParticipants > 1` → `estimateConcentratedOutcome(individualRatio, count-1)`
in `bot_brigade_targeting.ts:76-95`, scaling by `1 + N×0.85`). Orders then flow
into `state.military.brigade_attack_orders`, where `attack_resolution_osid.ts:347-358`
groups by target OSID into `targetToAttackers`. The resolver DOES sum
multi-brigade attacker power (`attack_resolution_osid.ts:605-614`) with
`coordPenalty` (0.85 for 2, 0.75 for 3+) and `getConcentrationBonus`, so
multi-brigade combat IS supported end-to-end — but the per-brigade GATE upstream
prevents brigades 2..N from EVER joining once brigade 1 has failed.

## 2. Combat Predictor Formula Citation

### 2.1 Attacker power (per brigade)

```
basePower(formation)
× POSTURE_ATTACK[posture]
× supplyMult
× corpsStanceMult
× operationsMult
× ogMult
× disruptionMult
× heavyWeaponsOffensiveMult
× threeTierOfficerMult
× fatigueMult
× homeDistanceMult
× criticalMoralePenalty
× equipmentQualityMult (if !== 1.0)
```

`combat_math.ts:1280-1303` — `computeAttackerPower`.

### 2.2 Defender power (per brigade, full product)

`combat_math.ts:1306-1330` (top) and `:1332-…` (`computeDefenderPowerBreakdown`).
14+ modifiers: posture, entrenchment (capped at MAX_ENTRENCHMENT),
corps-stance, resilience, disruption, terrain (river/slope/urban/enclave/
friction/road), defensive-fire (P1, MAX 1.8×), urban (P2, data-driven, 19 OSIDs),
graduated morale (P3, `1.0 + 0.15 × morale/100`), forest highland (P4,
elev≥900+slope≥0.5 → 106 OSIDs, +15%), war exhaustion tempo (P7, attacker only,
multiplicative penalty), entrenchment turns (P8), Lanchester concentration
(P10), ethnic-defense bonus, officer competence, fatigue, supply, equipment
quality, home-defense reactive bonus, suppression factor `1.0 −
artillerySuppression`.

### 2.3 Predictor force-ratio (per attack proposal)

`combat_predictor.ts:452-470` — `predictCombatOutcome`:

```
attackerPower = Σ_a computeAttackerPower(a) × coordPenalty × seasonal.attack_mult
defenderPower = (physicalPower + min(boostedReserves, attackerCount × avgBrigadePower × REACTIVE_DEFENSE_RATIO))
              × seasonal.defense_mult × fogMult
              + enclaveGarrisonPower
powerRatio    = defenderPower <= 0 ? 10 : attackerPower / defenderPower
predicted     = classifyOutcome(powerRatio)
```

`classifyOutcome` at `combat_math.ts:1244-1248`:

```
>= 2.0  → decisive_victory   (VICTORY_THRESHOLD_DECISIVE)
>= 1.5  → victory             (VICTORY_THRESHOLD_NORMAL)
>= 1.0  → costly_victory      (VICTORY_THRESHOLD_COSTLY)
>= 0.7  → stalemate           (STALEMATE_FLOOR)
>= 0.5  → repulsed            (REPULSED_FLOOR)
<  0.5  → catastrophic
```

### 2.4 Per-brigade gate at execution

`bot_brigade_eval_attack.ts:307-322`:

```ts
const canDirectAttackObjective =
    isOutcomeSufficientForAttack(predictedOutcome, probeThreshold) ||
    (concentratedOutcome != null &&
        isOutcomeSufficientForAttack(concentratedOutcome, probeThreshold));
if (canDirectAttackObjective && alreadyAssigned < MAX_ATTACKERS_PER_TARGET) {
    result.attack_orders[brigade.id] = currentObjective;
    chosenTargets.set(currentObjective, alreadyAssigned + 1);
    return true;
}
```

`getSectorOffensiveProbeThreshold` at `bot_brigade_ai_osid.ts:349-360` returns
the op's `min_attack_outcome` if set, else `momentum >= 2 ? 'stalemate' : 'costly_victory'`.

### 2.5 Resolver (already supports multi-brigade)

`attack_resolution_osid.ts:347-358` groups attack orders into
`targetToAttackers: Map<Osid, FormationId[]>`. `:597-614` sums power across all
attackers in the group with `coordPenalty` (3+ → COORDINATION_PENALTY_3PLUS,
2 → COORDINATION_PENALTY_2) and `getConcentrationBonus(N)`. The resolver is
already concentration-aware.

### 2.6 Launch-feasibility gate

`sector_offensive_launch_helpers.ts:116-125` sums attacker power across ALL
assigned attackers, then `:200-202` gates on
`ratio >= VICTORY_THRESHOLD_COSTLY`. The launch gate is concentration-aware. So
Sana 95 with 8 brigades launches feasibly. The bottleneck is the per-turn
execution loop, not the launch decision.

### 2.7 Concentration estimator (existing band-aid)

`bot_brigade_targeting.ts:76-95` — `estimateConcentratedOutcome`:

```ts
const combinedRatioMult = 1 + existingAttackers * 0.85;   // linear, not sqrt
const estimatedRatio    = individualRatio * combinedRatioMult;
```

Classifies via the same thresholds. **The 0.85 multiplier is linear**, not
sqrt — and only fires when `adjacentOperationParticipants > 1` AND the brigade
already chose to attack. Critically, the brigade also requires its SOLO
prediction to pass OR the concentrated estimate to pass; the disjunction means
the first brigade to evaluate (sorted ID-ascending) sees
`existingAttackers = 0`, so `concentratedOutcome = null` (line 80). Its
decision is purely solo. If solo ratio ≈ 0.62 (as in the Sana 95 audit), it
returns `'repulsed'`, no attack, `chosenTargets.set(obj, 0)` stays at 0, and
the NEXT brigade also sees `adjacentOperationParticipants` of POSITION (not
of attacker count) but `alreadyAssigned = 0`. Even though it can call
`estimateConcentratedOutcome(0.62, adjacentOperationParticipants-1)`, the
result is `0.62 × (1 + 7×0.85) = 0.62 × 6.95 = 4.31` — which DOES classify
decisive_victory.

**Hidden bug-or-feature:** the `estimateConcentratedOutcome` call uses
`Math.max(alreadyAssigned + 1, adjacentOperationParticipants) - 1` as the
existing-attackers count (`bot_brigade_eval_attack.ts:303-306`). If
`adjacentOperationParticipants = 8` for the first evaluator, the estimator
sees `existingAttackers = 7` and returns `decisive_victory`. So the
mechanism IS hooked, but only when 7 sibling brigades are PHYSICALLY adjacent
to the same OSID at the same turn. **The real failure mode is positional,
not arithmetic**: 5th Corps Sana 95 spreads 8 brigades across 25 objectives
on 3-5 axes; in practice ≤ 2 brigades are tactically adjacent to any single
objective each turn (audit p.186-192).

## 3. Concentration Design Options (Scored)

| Opt | Description | Surface | Determinism | Calibration risk | Realism |
|---:|---|---:|---|---|---|
| **A** | Per-axis multi-brigade attack pooling — gather all eligible brigades of an axis adjacent to current objective, emit a single coordinated `attack_orders` set targeting the SAME OSID (pass `additionalAttackers` into predictor). | 50–100 LOC | Sorted iteration safe; deterministic | Medium — unlocks axis-concentration symmetrically across all 3 factions; Sarajevo + east-Bosnia enclaves at risk if not gated | High — matches BB1 doctrine ("attack with 1 main + 2-3 supporting brigades per axis") |
| **B** | Per-attack `sqrt(N)` concentration bonus — scale attacker power in resolver and predictor by `√N` (or tuned curve) when N brigades order same OSID same turn. | 20–30 LOC | Pure math; deterministic | Medium-low — affects existing multi-brigade attacks; brcko/enclave defenders unaffected if not also stacked | Medium — Lanchester square law is canonical but the existing `getConcentrationBonus` already approximates this |
| **C** | Per-op force_ratio computation — predictor evaluates "would all op brigades together cross threshold" and biases each brigade's go/no-go on that aggregate, not solo. | 40 LOC | Sorted iteration over op participants | Medium — ops with idle brigades suddenly mass-commit; cohesion management harder | High — emulates corps-CO "we attack with 5 brigades or we don't attack" doctrine |
| **D** | Lower victory threshold for "desperate push" ops — ops with `min_attack_outcome='repulsed'` use threshold 0.5 instead of 1.0. | ≤10 LOC | Trivial | High — doesn't address concentration mechanism; permits attacks that lose to fail forward | Low — historical doctrine NEVER deliberately attacks at 0.62 ratio; this hides the mechanic, not fixes it |
| **E** | Resolver stacking modifier — each brigade beyond first adds +N% effective attacker power. | 15 LOC | Pure math | Medium-low | Low — duplicates `coordPenalty`/`getConcentrationBonus` already in resolver; would compound, not concentrate |

### Detailed assessment

**Option A — Per-axis attack pooling (RECOMMENDED).** Modify
`bot_brigade_eval_attack.ts` execution branch (`activeOp.phase === 'execution'`)
to, before per-brigade evaluation, build a per-axis "concentration packet":
list of operation-participant brigades whose `location_osid` is tactically
adjacent to the axis's current objective. When evaluating brigade B:

1. If B is the FIRST evaluator of its axis this turn (lowest sorted ID among
   adjacent siblings), call `predictCombatOutcome(state, B.id, currentObjective,
   …, additionalAttackers=otherAdjacentSiblings)`. The predictor at
   `combat_predictor.ts:272-275, 452-466` already sums power across all listed
   attackers with `coordPenalty`.
2. If the AGGREGATE predicted outcome clears the probe threshold, emit attack
   orders for ALL adjacent siblings (set `attack_orders[sibling] = currentObjective`
   for each). The downstream resolver groups them at
   `attack_resolution_osid.ts:347-358`.
3. If aggregate fails, fall through to current per-brigade behavior (each
   brigade keeps its existing solo-or-march path).

This is the architecturally correct fix: it makes the corps's decision
("attack THIS objective with these N brigades") the unit of decision, not the
brigade's solo go/no-go. It matches the operation catalog's intent (brigade
list = intended axis force) and the historian's documentation of
Sana-95-class operations.

**Why NOT B alone:** A simple `√N` bonus in the resolver doesn't change the
DECISION layer. The brigade still evaluates solo and returns 'repulsed', so it
emits no attack order, so the resolver never sees N≥2 brigades on the same
OSID. The fix must move UP the chain to the order-emission gate.

**Why NOT C exclusively:** C is a subset of A. A does C plus emits the actual
orders. C without A would only adjust the predicate, not the order set.

**Why NOT D:** "Desperate push" lowers the bar but doesn't make 8 brigades
fight as one. With threshold 0.5, the first brigade attacks alone with
predicted 'repulsed' outcome, gets bled at 1:8 (per audit), retreats; the
next brigade tries the same. Mechanism unchanged.

**Why NOT E:** The resolver ALREADY has `getConcentrationBonus(N)`, `coordPenalty`,
`MULTI_BRIGADE_EFFICIENCY_2/3`, `SAME_CORPS_EFFICIENCY_2/3`,
`DEFENDER_OUTNUMBERED_BONUS`, `OG_COORDINATION_BONUS`,
`LINKING_DEFENSE_BONUS`, `LANCHESTER_BONUS_PER_BDE_ABOVE_2`. Adding another is
redundant; if those aren't producing enough effect when N>1 brigades actually
fire, the calibration knob is one of those, not a new modifier.

## 4. Determinism Impact

Option A passes the determinism audit:

1. **Sorted iteration.** The axis-concentration-packet construction iterates
   `activeOp.axes[ax].assigned_brigades` (already sorted by op-construction
   contract — see `sector_offensive.ts` Phase 3 sector-anchored contract,
   `:25-40`). Within an axis, brigade IDs are sorted by `strictCompare`. The
   "first evaluator" rule (lowest sorted ID among adjacent siblings) is
   deterministic.

2. **No `Math.random()`.** All math is pure arithmetic over existing combat
   modifiers.

3. **No timestamps / `Date.now()`.** Aggregate prediction uses
   `state.meta.turn` already threaded through.

4. **Faction symmetry.** The gate runs identically for RBiH 5th Corps,
   VRS Drina Corps (Krivaja-95), and HRHB. No faction-conditional branches.
   This is critical — must NOT cherry-pick Sana 95 in a faction-specific way.

5. **Save/load contract.** No new state field needed if the
   axis-concentration-packet is recomputed per-turn from
   `activeOp.axes[*].assigned_brigades` and `formation.location_osid`.
   Optional: stash a per-turn audit field `axis_attack_concentration` for
   diagnostics, deterministic and faction-agnostic.

6. **Existing tests.** `attack_resolution_osid.ts` multi-brigade tests already
   exercise N≥2 attacker grouping; we're feeding the existing pipeline more
   orders, not changing resolution math. `predictCombatOutcome` with
   `additionalAttackers` is already tested in combat_predictor.test paths
   (the API has been there since the multi-brigade Phase D rollout).

## 5. Calibration Risk Assessment

**Symmetric unlock means everyone gets the new behavior.** What could break?

### 5.1 ARBiH-side risks

* **Sarajevo siege.** ARBiH 1st Corps trying to break the ring with axis-
  concentration MAY suddenly succeed in spots they shouldn't (e.g., southern
  Sarajevo near Trnovo / Hadžići). Mitigations:
  - Existing Sarajevo entrenchment is at MAX_ENTRENCHMENT after 50+ turns
    (P8 effect).
  - Defensive fire MAX 1.8× (P1) on VRS Sarajevo-Romanija defenders is
    historically heavy (artillery dominance).
  - Urban data-driven multiplier (P2) covers Sarajevo core.
  - The aggregate predicted ratio must STILL clear `costly_victory` (≥1.0)
    against a defender stack with all those multipliers; in practice ARBiH
    1st Corps lacks the attacker power to cross.
  - **Watchpoint:** if calibration shows ARBiH 1st Corps suddenly cracking 3+
    Sarajevo OSIDs in a 40w run, add per-OSID `axis_concentration_cap` or
    raise minimum-objective entrenchment threshold for major-city OSIDs.

* **East-Bosnia ARBiH enclaves.** ARBiH 28th Division in Srebrenica /
  Žepa / Goražde COULD now mass for breakouts. Historically attempted (e.g.,
  Operation Zvijezda 1993) but broke against VRS rings. Mitigations:
  - `getEnclaveGarrisonPower` adds civilian garrison contribution to BOTH
    sides (enclave defenders benefit too).
  - VRS Drina Corps has its own axis-concentration unlock under the same
    rule (so Krivaja-95 / Stupčanica-95 also concentrate better against
    those enclaves — symmetric).
  - **Watchpoint:** if 28th Division flips ≥3 VRS OSIDs out of enclave in
    a baseline 52w run, scope-down: require all axis brigades to share a
    sector OR require axis to have ≥3 `assigned_brigades`.

### 5.2 VRS-side risks

* **Srebrenica fall acceleration.** Krivaja-95 in the sim currently FAILS to
  launch (audit: `build_defender_power_too_high` att=110 def=689). With A,
  the launch gate doesn't change — but if Krivaja launches under any future
  rebalance, the per-turn concentration unlock would let VRS Drina Corps
  break through faster. This is actually HISTORICALLY CORRECT for July 1995.
  Not a calibration regression.

* **Brčko corridor.** VRS already holds Brčko all 40w without `must_hold`
  (n1289 baseline). A doesn't affect VRS defense; it AFFECTS VRS offense
  on the Posavina corridor. The historical VRS pushed at Brčko-area in
  1992, succeeded — sim parity is desired here.

### 5.3 HRHB-side risks

* **Operation Mistral / Maestral.** HRHB ops on western Bosnia (Drvar, Šipovo,
  Mrkonjić) currently mis-execute (audit `20260522_OPS_FORCE_TRAJECTORY_GATING.md`).
  With A, HRHB axis-concentration would help these ops succeed — matching
  Sep-Oct 1995 history. Desired.

* **HRHB-vs-ARBiH 1993 war.** Vitez / Kiseljak pocket axis-concentration could
  swing the central-Bosnia war. Mitigation: alliance gating is upstream
  (`isRbihHrhbCombatBlocked`) and already suppresses combat during the
  ceasefire/Washington period.

### 5.4 Suggested telemetry

Add to the per-turn op-watch report (already partially exists in
`watched_operations`):

```
axis_attack_concentration: {
  axis_id: string,
  current_objective: Osid,
  adjacent_brigades: FormationId[],   // sorted
  aggregate_predicted_outcome: PredictedOutcome,
  attacked_this_turn: boolean,
}
```

This is a new diagnostic, not state — emitted per turn for ops in `execution`.
Faction-agnostic, deterministic.

## 6. Recommended Option

**RECOMMEND OPTION A: Per-axis multi-brigade attack pooling.**

### Rationale

The audit (`docs/40_reports/audits/20260523_SANA_95_COMBAT_BALANCE.md` §c-e)
demonstrates the engine is mathematically self-consistent: one ARBiH brigade
at 1860 power vs a 15th Bihać defender at >3000 power correctly classifies as
`repulsed`. The casualty engine reports the 1:8 favorable ratio honestly. The
launch-feasibility gate is already concentration-aware (sums 8 brigades'
power). The resolver is already concentration-aware (sums grouped attacker
power with coord penalty + concentration bonus). The PREDICTOR has the
`additionalAttackers` parameter and uses it correctly when supplied
(`combat_predictor.ts:272-275, 452-466`).

The single missing link is the per-brigade DECISION gate at
`bot_brigade_eval_attack.ts:265-322`. Each brigade asks "can I take this
objective alone?" and the answer is reasonably "no" for Sana 95's defender
stack. The `estimateConcentratedOutcome` heuristic at lines 301-310 attempts
to compensate but is positionally fragile — it only fires when sibling
brigades are physically adjacent to the same OSID at the same turn, which
the bot's spread-axis movement actively prevents (each brigade marches to its
nearest approach OSID, not a shared one).

Option A moves the decision UP one level: the axis (not the brigade) decides
whether to attack the current objective, with all eligible adjacent
brigades pooled into a single `predictCombatOutcome` call. The downstream
resolver and casualty machinery require zero changes. The launch gate and
predictor are unchanged. This is the smallest surgical change that resolves
the Wave 32 regression and is faction-agnostic by construction.

Anticipated 40w hash effect: NON-ZERO (changes order-emission for any op with
≥2 brigades adjacent to current objective). Calibration sign-off required.
Anticipated win: Sana 95 produces 5-15 ARBiH-side flips on the Bihać-Sanski
Most axis in turns 170-180. Risk-managed by symmetric application: VRS
Krivaja-95 and HRHB Mistral/Maestral get the same unlock, restoring
proportional historical pressure.

### Implementation sketch (NOT yet applied; for executing-plans skill)

1. In `bot_brigade_eval_attack.ts`, before the per-brigade loop in the
   execution branch, build per-active-op axis-concentration packets:
   `Map<axis_id, FormationId[]>` of all op participants tactically adjacent
   to that axis's current objective, sorted by `strictCompare`.
2. When evaluating brigade B, look up its axis packet. If `packet.length > 1`
   AND B is the lowest-sorted ID in the packet, call
   `predictCombatOutcome(state, B.id, currentObjective, …, additionalAttackers=packet.slice(1))`.
3. If aggregate `predicted_outcome` clears `probeThreshold`, emit attack
   orders for ALL brigades in the packet (set `attack_orders[id] =
   currentObjective` for each). Set posture per existing logic ('assault'
   if cohesion ≥ 60 else 'attack'). Update `chosenTargets` accordingly.
4. If aggregate fails OR B is not the lowest-sorted ID, fall through to
   existing per-brigade logic (preserves march/probe/fallback paths).
5. Telemetry: emit `axis_attack_concentration` diagnostic into the
   operation's per-turn watched-record (no schema change to GameState).
6. Tests:
   * Unit: 3-brigade axis adjacent to 1 OSID with solo ratio 0.6 each →
     aggregate ratio ≈ 1.5 → all 3 emit attack orders.
   * Unit: 1-brigade axis (legacy single-brigade ops) → identical behavior.
   * Unit: faction symmetry — same scenario with RS attackers → identical
     order set.
   * Integration: Sana 95 40w slice → expect at least 1 axis with N≥3
     attack-grouped orders per turn during execution window.
   * Regression: full 40w `n1289` baseline — diff hashes, sign off on
     anchor count (target ≥ baseline 25/25), benchmarks (6/6).

### Out of scope for this proposal

* Combat-math constant changes (defensive_fire MAX, terrain mults, P1-P14
  knobs). Not needed — math is honest.
* Per-OSID concentration caps. Defer to post-implementation calibration if
  Sarajevo or enclave watchpoints fire.
* Launch-feasibility gate changes. Already concentration-aware.
* `attack_resolution_osid.ts` changes. Resolver is concentration-aware.

---

## 7. References

* `src/sim/combat/combat_math.ts:92-96` — VICTORY_THRESHOLD_* constants.
* `src/sim/combat/combat_math.ts:1244-1248` — `classifyOutcome`.
* `src/sim/combat/combat_math.ts:1280-1303` — `computeAttackerPower`.
* `src/sim/combat/combat_math.ts:1306-1330` — `computeDefenderPower`.
* `src/sim/combat/combat_predictor.ts:245-470` — `predictCombatOutcome`,
  including `additionalAttackers` parameter (line 253) and aggregate power
  sum (line 463-465).
* `src/sim/combat/combat_predictor.ts:547-580` — `predictAllAdjacentTargets`
  (passes `undefined` for additionalAttackers — line 570).
* `src/sim/combat/bot_brigade_eval_attack.ts:229-322` — execution branch of
  brigade AI.
* `src/sim/combat/bot_brigade_eval_attack.ts:301-310` — existing
  `estimateConcentratedOutcome` band-aid.
* `src/sim/combat/bot_brigade_targeting.ts:76-95` — `estimateConcentratedOutcome`.
* `src/sim/combat/bot_brigade_ai_osid.ts:349-360` — `getSectorOffensiveProbeThreshold`.
* `src/sim/combat/sector_offensive_launch_helpers.ts:116-202` —
  `evaluateLaunchFeasibility` (sums attacker power across all assigned ids
  and gates ≥ VICTORY_THRESHOLD_COSTLY).
* `src/sim/combat/attack_resolution_osid.ts:347-358` — order-to-target
  grouping.
* `src/sim/combat/attack_resolution_osid.ts:597-614` — multi-brigade attacker
  power sum with `coordPenalty` and `getConcentrationBonus`.
* `src/sim/combat/battle_resolution.ts:55-66` — multi-brigade efficiency
  constants (legacy peace-phase SID path; same numerics).
* `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:163-167` —
  Wave 31 SCRT note acknowledging concentration as the missing element.
* `docs/40_reports/audits/20260523_SANA_95_COMBAT_BALANCE.md` — predecessor
  audit.
* `docs/40_reports/audits/20260522_AUTONOMOUS_ARC_RUN_CLOSEOUT.md:336` —
  identifies "Combat predictor concentration — Sana 95 has 8 brigades but each
  attacks individually" as engine-deep gap requiring this work.
* `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md:297-307` — prior
  multi-brigade design that included the resolver-side concentration logic but
  did not close the per-brigade-decision gap.

---

## 8. Sign-off Gates

Before implementation:

1. Operations-expert review (mandatory consultation per CLAUDE.md).
2. Determinism-auditor sign-off on the order-emission change.
3. Game-designer concur that "axis attacks as one" matches Game Bible /
   Rulebook doctrine.
4. Historian concur that ICTY/BB Sana-95 doctrine — and reciprocally
   Krivaja-95 / Mistral — supports axis-grouped attack as the canonical
   behavior.

After implementation:

1. 40w `n1289` re-run → 40w hash diff; anchors ≥ 25/25, benchmarks 6/6,
   no new probe-capture regressions.
2. 52w `default` re-run → Sana 95 produces 5-15 captures in turns 170-180;
   Krivaja-95 / Stupčanica-95 launch feasibility unchanged or improved (NOT
   degraded); HRHB Mistral / Maestral show western-Bosnia progress.
3. Sarajevo siege OSID count steady (no ARBiH 1st Corps breakouts).
4. Enclave (Srebrenica / Žepa / Goražde) breakouts ≤ 1 OSID flip in 52w
   baseline.

---

*End of design memo.*
