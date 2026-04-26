# Option K — Diagnostic Findings (issue #20)

**Date:** 2026-04-24
**Investigator:** in-session diagnostic on `runs/apr1992_definitive_188w__c35fff9119f1a06b__w188_n2/`
**Status:** Root cause identified. **Earlier hypothesis (campaign-plan wiring) was wrong.** Real binding constraint is `fitness_offense` threshold + cohesion floor on HRHB brigades.

## Premise correction

Issue #20 originally framed Option K as a "campaign-plan wiring problem" based on `/scenario-creator-runner-tester` analysis. That hypothesis predicted `briefing.campaign_offensive_targets` would be empty for HRHB corps. **Empirical evidence contradicts this.**

At final turn (188), HRHB campaign plan is fully populated:

| Corps | Role | Stance | Off targets | Sample target |
|---|---|---|---|---|
| `hvo_southeast_herzegovina` | primary | offensive | 9 | op:mostar:mostar_istok_2 |
| `hvo_central_bosnia` | secondary | balanced | 10 | op:maglaj:cobe_2 |
| `hvo_tomislavgrad` | secondary | balanced | 8 | op:gornji_vakuf:gornji_vakuf_uskoplje_2 |
| `hvo_northwest_bosnia` | secondary | balanced | 3 | op:bosanski_samac:tisina |
| `hvo_main_staff` | secondary | balanced | 0 | — |

Targets are **geographically reachable** and historically relevant (Mostar east bank, Maglaj, Gornji Vakuf — 1994 Cincar axis, Posavina). The campaign plan generator's `computeCorpsTargets()` correctly draws enemy_osids from each corps's own front sectors.

## Real binding constraint

Decision traces persist in `state.military.corps_command[corpsId].commander_state.decision_trace`. At turn 188, all 5 HRHB corps show:

```
hard_constraints: ["corps_stance_forbids_offensive"]
candidates: 0
plan: null
```

This fires from `plan.ts:705`:
```ts
if (briefing.corps_stance === 'defensive' || briefing.corps_stance === 'reorganize') {
    return { action: 'none', hard_constraints: ['corps_stance_forbids_offensive'] };
}
```

So all HRHB corps are stuck in **defensive stance** at turn 188. Why?

### Force assessment per HRHB corps at turn 188

| Corps | main_effort | active_defense | garrison | surplus | E3 lock? |
|---|---:|---:|---:|---:|---|
| `hvo_central_bosnia` | 0 | 0 | 8 | 0 | NO (vitez not in heartland) |
| `hvo_southeast_herzegovina` | 0 | 0 | 14 | 0 | YES (citluk) |
| `hvo_tomislavgrad` | 0 | 0 | 3 | 0 | NO (duvno not in corridor list) |
| `hvo_northwest_bosnia` | 0 | 0 | 3 | 0 | NO (orasje excluded intentionally) |
| `hvo_main_staff` | **3** | 0 | 0 | 0 | YES (mostar) |

Two distinct gates fire:

1. **N1297 organizational readiness gate** (`bot_corps_stance.ts:144-150`) — fires for the 4 corps with `main_effort: 0`, capping stance at defensive.
2. **E3 Herzegovina blanket lock** (`bot_corps_stance.ts:212-219`) — fires for `hvo_southeast_herzegovina` (citluk) and `hvo_main_staff` (mostar), demoting offensive/balanced to defensive even when N1297 is satisfied.

`hvo_main_staff` has 3 mechanized Guards brigades (Option J's untouched-by-this-PR side beneficiaries) — N1297 is satisfied — but E3 still locks it defensive.

### Why N1297 still fires for hvo_central_bosnia after Option J

Option J promoted `hrhb_vitezovi_brigade_vitez` (Vitez) to motorized to specifically unblock this corps. At turn 188, Vitezovi state:

- `equipment_class: motorized` ✓ (Option J landed)
- `personnel: 2200` ✓
- `cohesion: 28.0` ✗
- `tier: garrison` (NOT main_effort)

Tier classification (`force_eval.ts:128`):
```ts
if (equipPriority >= MAIN_EFFORT_EQUIPMENT_PRIORITY (=2)
    && fitness_offense >= MAIN_EFFORT_FITNESS_THRESHOLD (=0.4)) {
    tier = 'main_effort';
}
```

`fitness_offense` (`force_eval.ts:114`):
```ts
fitness_offense = personnelNorm * supplyMult * cohesionNorm
                * (1 + equipPriority * 0.25)
                * fatigueOffenseMult
                * (isDisrupted ? 0 : 1);
```

Vitezovi computation:
- personnelNorm = 2200/2500 = 0.88
- cohesionNorm = 28/100 = 0.28
- equip multiplier = 1 + 2*0.25 = 1.5
- supplyMult = 0.8 (default for unknown supply state)
- fatigueMult = 1.0 (fatigue=0)
- fitness_offense = 0.88 × 0.8 × 0.28 × 1.5 = **0.296**

0.296 < 0.4 → tier = active_defense (since 0.296 ≥ ACTIVE_DEFENSE_FITNESS_THRESHOLD=0.3? No, 0.296 < 0.3) → **tier = garrison**.

For Vitezovi to clear the threshold at supply=0.8, motorized class:
- Required: 0.88 × 0.8 × cohesionNorm × 1.5 ≥ 0.4 → cohesionNorm ≥ 0.379 → **cohesion ≥ 38**

Vitezovi sits at 28, ten points short.

### Why Guards (mechanized) clear the threshold

Guards brigade computation:
- personnelNorm = 2800/2500 = 1.12
- cohesionNorm = 30/100 = 0.30
- equip multiplier = 1 + 3*0.25 = 1.75 (mechanized priority 3)
- fitness_offense = 1.12 × 0.8 × 0.30 × 1.75 = **0.470** ≥ 0.4 → main_effort ✓

The mechanized class buffer is exactly what saves them. Vitezovi at motorized is borderline; the cohesion deficit kills it.

### Cohesion floor pattern

Almost all HRHB brigades cluster at cohesion 28-30 at turn 188:

```
besieged enclaves (CB, NW Bosnia): coh=28
heartland (Herzegovina, Tomislavgrad): coh=30
3 outliers (CB, untouched by combat?): coh=50-53
```

The 28/30 split is suspiciously discrete — likely a floor mechanism, not organic attrition. After the initial cohesion hit from siege/exhaustion, brigades plateau here for the rest of the war. The cohesion recovery rate is too low (or recovery is gated on conditions HRHB brigades never satisfy in besieged corps).

## What Option J accomplished

- ✓ N1297 unblocked for **RBiH** (where promoted brigades have cohesion 55-62, comfortably clearing 0.4 threshold) → **142 attacks, 25 ops, 44 captures** in 188w
- ✓ N1297 unblocked for **VRS East Bosnian Corps** in principle (rs_1st_semberija coh=46 → main_effort) — though that corps stayed quiet for other reasons
- ✗ N1297 NOT meaningfully unblocked for **HRHB** because all promoted brigades are stuck at cohesion ~28-30 → stay garrison tier
- ✗ Even if it WERE unblocked, the E3 Herzegovina rule would still lock 2 of 5 HRHB corps defensive

## Revised conceptual fix proposals

### Fix candidate A — Soften N1297 to count `is_elite + motorized/mechanized`

Allow elite-marked brigades to count as main_effort regardless of fitness_offense threshold:

```ts
// In force_eval.ts tier assignment:
const isElite = brigade.elite_loan_state !== undefined;  // OOB is_elite propagates via elite_loan_state
if (isElite && equipPriority >= MAIN_EFFORT_EQUIPMENT_PRIORITY) {
    tier = 'main_effort';
} else if (equipPriority >= MAIN_EFFORT_EQUIPMENT_PRIORITY && fitness_offense >= 0.4) {
    tier = 'main_effort';
}
```

**Rationale:** Elite formations have officer cadre, training, and doctrine that preserves offensive capacity even at low cohesion. Historically Vitezovi launched Ahmići despite being besieged; Drina Wolves attacked from siege positions; Guards Brigades (any faction) maintained tempo even when battered. Cohesion measures unit-level coherence; elite designation captures organizational capacity that floor-cohesion calculations miss.

**Caveat (discovered mid-investigation):** `evaluateBrigade` reads from `FormationState`, which does NOT carry the OOB `is_elite` flag directly. The OOB `is_elite: true` propagates via `recruitment_engine.ts:312`, which sets `elite_loan_state` on the formation. So the elite check is `brigade.elite_loan_state !== undefined`.

**Caveat 2:** `hrhb_vitezovi_brigade_vitez` is **NOT** marked `is_elite: true` in `oob_brigades.json` despite the OOB master describing it as "Elite unit, best-equipped Central Bosnia HVO." Option J promoted it to motorized but did not flag it elite. To make Fix A unblock hvo_central_bosnia, Vitezovi needs both `is_elite: true` set in OOB AND the tier-classification override.

Current `is_elite` distribution (post-Option J):
- HRHB: 4/40 (4th Guard Sinovi Posavine + 1st/2nd/3rd Guards which are already mechanized → already main_effort)
- RS: 2/83
- RBiH: 2/126

For Fix A to unblock HRHB Central Bosnia / Tomislavgrad / NW Bosnia, additional `is_elite: true` flags are needed:
- `hrhb_vitezovi_brigade_vitez` (already motorized; just needs is_elite)
- `hrhb_kralj_petar_kreimir_iv_brigade` (Livno, Cincar axis) — needs both motorized + is_elite (BB1 Operation Cincar 1994)
- `hrhb_101st_oraje_brigade` (Orašje, HV-supplied) — needs both motorized + is_elite (HVO_OOB_MASTER.md "Posavina HV-supported defense")

**Risk:** Low for the code change. Higher for the OOB additions — every is_elite addition is a calibration touch. Total additions: 3 brigades + 1 force_eval edit. About the same risk envelope as Option J.

### Fix candidate B — E3 Herzegovina rule narrows to "no offensive across own front into Herzegovina"

Currently `bot_corps_stance.ts:212-219` blanket-demotes any HRHB corps with `home_mun ∈ HRHB_HERZEGOVINA` to defensive. This permanently silences `hvo_southeast_herzegovina` (Mostar push) and `hvo_main_staff` (Guards-equipped reserve).

Replace with: corps may go offensive if their primary axis points OUT of Herzegovina (into RBiH/RS-held territory). Specifically:
- `hvo_southeast_herzegovina` may attack east-bank Mostar / Konjic / Jablanica targets (toward ARBiH 4th Corps).
- `hvo_main_staff` may deploy Guards Brigades to support 1995 offensives (Cincar axis, Maestral, Ljeto '95).

**Risk:** Higher — could cause ahistorical Mostar over-pushes if not carefully scoped. Needs `/game-designer` consultation.

### Fix candidate C — Raise HRHB initial_cohesion baseline

Bump `initial_cohesion` for HRHB brigades from current ~65-70 to ~75-80. Buys cohesion buffer so siege attrition doesn't push them under the 38 threshold.

**Rationale:** HVO had Croatian state support — regular HV reinforcement, Croatian-supplied munitions, Croatian Army artillery from across borders. Cohesion-as-organizational-coherence should reflect this state-backed stability.

**Risk:** Medium. Affects early-war HVO performance broadly; could imbalance RBiH-HRHB war when it triggers.

### Fix candidate D — Cohesion recovery rate boost in defensive corps

Make cohesion recovery faster for brigades in corps under defensive posture. Current floor at 28-30 suggests recovery is too slow.

**Rationale:** Real-war recovery happens during defensive periods (units rotate to rear, rebuild). The simulation's grinding-floor behavior doesn't model this.

**Risk:** Higher — touches simulation core. Needs deeper investigation of cohesion mechanics.

## Recommended next step

**Fix candidate A** is smallest-risk and most surgical. It's a 4-line patch to `force_eval.ts`. It explicitly uses the existing `is_elite` flag, no new state. It targets exactly the case Option J was meant to solve.

Validation plan:
1. Add `is_elite` parameter to `evaluateBrigade` (read from brigade data).
2. Modify tier classification at `force_eval.ts:128` to include the elite override.
3. Run 188w; verify Vitezovi (and the 6 Option J promotions) tier as main_effort despite low cohesion.
4. Verify `hvo_central_bosnia` and `hvo_tomislavgrad` exit defensive stance.
5. Check `hvo_main_staff` remains stuck (E3 lock independent of N1297) — confirms surgical targeting.
6. Run baselines; expect drift (HRHB attacks rise from 0 toward 20+).

If Fix A produces meaningful HRHB activity but ahistorical patterns emerge, escalate to `/game-designer` with concrete observed behaviors.

## Why "campaign-plan wiring" was the wrong diagnosis

The earlier expert took an end-of-run state snapshot and saw "200 targets at w50" without realizing those targets came from `augmentOffensiveTargetsWithShifts` (event-driven shift augmentation), not from the campaign plan. The expert then hypothesized that the campaign plan was empty. In fact, the campaign plan WAS populated (we now have direct evidence), but the corps stance gate prevented `managePlan` from reading those targets at all (`plan.ts:705` returns early before `getPriorityTargetSet()` is called).

This case is a useful lesson: **always check `decision_trace.hard_constraints` before hypothesizing about target generation**. The trace tells you exactly which gate fired. We have direct evidence now: `corps_stance_forbids_offensive` is the universal blocker for HRHB.
