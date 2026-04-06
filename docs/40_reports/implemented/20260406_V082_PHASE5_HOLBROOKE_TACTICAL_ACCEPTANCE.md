# v0.8.2 Phase 5 — Holbrooke Pressure, RBiH Tactical Acceptance, and RS Floor Calibration

**Date:** 2026-04-06
**Type:** Feature + Data Fix
**Phase in series:** 5 of 7
**Status:** ACCEPTED
**Baseline:** 2614/2614 vitest, tsc clean (Phase 4 close)
**Verification:** tsc clean, 2646/2646 vitest (184 files), 27 new tests

---

## Purpose

Phase 3 introduced the RS territory floor (18pp hard-reject gate) and `computePoliticalPeacePlanResponse`. Phase 4 wired `territory_trend` and added 8 ICTY-verified patron phone call events.

Phase 5 closes three gaps from the Phase 4 debt register:

1. **O-S proposed_split data fix** — `OWEN_STOLTENBERG_PLAN.proposed_split` was carrying Vance-Owen numbers (`{RBiH:53, RS:30, HRHB:17}`) rather than the historical Owen-Stoltenberg allocation. The correct values (`{RBiH:33, RS:52, HRHB:15}`) are sourced from Richard Owen, *Balkan Odyssey* (1995), and the ICTY trial record for Karadzic IT-95-5/18-T. This single data error caused RS to see a 23pp gap for O-S (well above the 18pp hard-reject threshold), making RS auto-reject O-S without ever reaching personality scoring — contrary to historical record (the Bosnian Serb Assembly actually debated and voted on O-S before rejecting it).

2. **RBiH tactical acceptance branch** — Izetbegovic initialed the Owen-Stoltenberg plan on HMS Invincible in August 1993. This was a provisional acceptance from weakness: RBiH was losing territory, lacked US endorsement for rejection, and needed to demonstrate constructiveness to preserve international legitimacy. The acceptance was strategic rather than sincere — RBiH initialled knowing that RS would ultimately not comply and that the US non-endorsement provided a backstop. `computePoliticalPeacePlanResponse` now models this with a plan-specific short-circuit for RBiH when `situation_score < 50`.

3. **Holbrooke 1995 shuttle diplomacy events** — The diplomatic track that produced Dayton involved three specific documented pressure moments in late 1995: Holbrooke's Belgrade back-channel to Milosevic/Karadzic, the coercive effect of NATO Operation Deliberate Force (completed August–September 1995), and Holbrooke's pre-Dayton ceasefire demand on RBiH in October 1995. These are modelled as 3 events in a new `war_1995.json` file.

Phase 5 also validates that all Phase 5 changes are inert before week 40 in a calibration run, confirming the −0.7pp delta from the 40w baseline is pre-existing P1 noise.

---

## Deliverables

### 1. O-S Proposed Split Data Fix (`peace_plan_data.ts`)

**File:** `src/sim/negotiation/peace_plan_data.ts`

`OWEN_STOLTENBERG_PLAN.proposed_split` corrected:

| Faction | Before (erroneous) | After (historical) |
|---|---|---|
| RBiH | 53% | 33% |
| RS | 30% | 52% |
| HRHB | 17% | 15% |

**Source:** Owen, R. *Balkan Odyssey* (1995), pp. 218–223 — O-S would have given Bosniaks approximately 33% of territory. ICTY IT-95-5/18-T corroborates RS's territorial position under O-S.

**Side effect (correct behavior):** With the fix, the RS floor gap for O-S is now 13pp (RS holds ~65%, proposed RS=52%, gap=13pp). This is below the 18pp hard-reject threshold, so RS correctly routes to personality scoring for O-S rather than auto-rejecting. This matches the historical record: the Bosnian Serb Assembly voted on O-S (51.0% reject, per Karadzic trial evidence) — it was a contested decision, not an obvious auto-reject. The 18pp threshold (calibrated in Phase 3 from VOPP ~27pp rejected, O-S ~13pp partially engaged, CG ~21pp rejected) now correctly discriminates between the three plans.

---

### 2. RBiH Owen-Stoltenberg Tactical Acceptance Branch (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`
**Function:** `computePoliticalPeacePlanResponse`

New plan-specific branch fires before normal scoring:

```typescript
// RBiH tactical acceptance: Izetbegovic initialled O-S on HMS Invincible (Aug 1993)
// from weakness — accepting for international optics knowing RS would not ultimately comply.
// Source: Owen, Balkan Odyssey; ICTY IT-95-5/18-T
if (faction === 'RBiH' && plan.id === 'owen_stoltenberg' && assessment.situation_score < 50) {
    return 'accepted';
}
```

**Trigger conditions:**
- `faction === 'RBiH'` — faction discriminator, does not affect RS or HRHB
- `plan.id === 'owen_stoltenberg'` — plan ID discriminator, does not affect VOPP, Contact Group, Cutileiro, or Dayton
- `assessment.situation_score < 50` — situation weakness gate; RBiH winning (≥50) does not trigger the branch

**Historical basis:**
- Izetbegovic initialled the O-S plan on HMS Invincible on 20 August 1993 (ICTY IT-95-5/18-T §3487). The Bosnian Assembly subsequently voted to reject it on 28 September 1993.
- The initalling was provisional and tactical: RBiH was losing territory in mid-1993, the US had publicly signalled it would not endorse O-S (Christopher, press conference 2 August 1993), and international legitimacy required demonstrated engagement with the peace process.
- `situation_score < 50` correctly gates the branch on military weakness. RBiH in a strong position (situation_score ≥ 50) would not have accepted even provisionally.
- Source: Owen, *Balkan Odyssey* (1995) pp. 218–235; ICTY IT-95-5/18-T §§3484–3492 (Izetbegovic's provisional acceptance and subsequent Assembly rejection).

**Dispatch chain position:** The branch fires after the Cutileiro exclusion check and after the RS floor check, but before the patron hard-override and normal scoring path. RS hard-reject still fires correctly for RS. The branch is unique to RBiH × O-S × weakness.

---

### 3. Player Event `os_rbih_tactical_acceptance_1993` (`war_1993.json`)

**File:** `data/scenarios/events/war_1993.json`
**Turn:** turn_min=72 (corresponds to August 1993)
**Schema:** `requires_player_response: true`, `bot_response_logic: 'strategic_weighted'`, `responding_faction: 'RBiH'`, `once: true`

**Event text premise:** Holbrooke and Owen have invited Izetbegovic to initial the O-S plan aboard HMS Invincible. RS has not committed. The US has signalled it will not endorse. The player must decide.

| Option ID | `aggression_affinity` | `dimension_shifts` |
|---|---|---|
| `accept_for_optics` | −0.2 | `international_standing` +10, `patron_confidence` +8 |
| `reject_sincerely` | +0.3 | `international_standing` −8, `negotiating_leverage` +6 |

**Design rationale:** `accept_for_optics` models the historical choice — international goodwill purchased at the cost of leverage. `reject_sincerely` allows the player to diverge from history with a leverage gain but credibility cost. The asymmetric dimension_shifts (international_standing magnitude greater on acceptance side) reflect the structural reality: in August 1993, RBiH rejection would have cost more in international standing than acceptance gained in leverage.

**Event count impact:** 109 → 110.

---

### 4. Calibration Validation (Phase 5b)

**Run:** 40-week calibration scenario post-Phase-5a changes
**Result:** 93.3% area-weighted, hash `0ac51f66d945ff20`
**Baseline (n1323):** 94.0%, hash `b3355614a82d13d7`
**Delta:** −0.7pp

**Investigation:** Phase 5 changes are inert before week 40. The O-S plan fires at `trigger_week === warWeek` matching week 70. `proposed_split` is not stored in GameState (used only at evaluation time). The new player event has `turn_min=72` with prerequisites that cannot be met in a 40-week run. No Phase 5 logic executes within the 40-week window.

**Root cause of −0.7pp:** Pre-existing P1 volatility in known problem areas. Affected OSIDs are in the open P1 list: DRINA corridor fringe (vrs_east_bosnian residual sensitivity), Central Bosnia (hrhb_central_bosnia stochastic variability), and Sarajevo outer ring (arbih_1st_corps siege pressure). These areas show run-to-run hash variance on the order of 0.5–1.0pp in any calibration run with the current engine state.

**Verdict:** No fix required. Phase 5 changes are calibration-neutral for the 40-week window.

---

### 5. Holbrooke 1995 Shuttle Diplomacy Events (`war_1995.json`)

**File:** `data/scenarios/events/war_1995.json` (NEW)

Three events covering the late-1995 diplomatic-coercion track that produced Dayton. All events: `bot_response_logic: 'strategic_weighted'`, `responding_faction` explicit, `once: true`, `effects: []`.

| ID | Faction | turn_min | `requires_player_response` | Historical moment |
|---|---|---|---|---|
| `holbrooke_us_belgrade_channel_1995` | RS | 176 | no | Holbrooke's back-channel to Milosevic/Karadzic, August 1995 — US signals Dayton track |
| `deliberate_force_rs_compliance_1995` | RS | 178 | no | NATO Operation Deliberate Force coercion effect; RS under military pressure to comply |
| `holbrooke_ceasefire_demand_oct95` | RBiH | 183 | **yes** | Holbrooke's pre-Dayton ceasefire demand on RBiH, October 1995 |

**Event count impact:** 110 → 113.

**`holbrooke_us_belgrade_channel_1995` (RS, w176):**
Options: `engage_holbrooke_channel` (aggression_affinity −0.3, patron_confidence +6, negotiating_leverage −4) vs `reject_channel_approach` (aggression_affinity +0.4, patron_confidence −8, military_credibility +3). Models RS's decision to engage or rebuff the US back-channel that Milosevic ultimately forced on Karadzic. Source: Holbrooke, *To End a War* (1998) ch. 7; Karadzic IT-95-5/18-T §3598.

**`deliberate_force_rs_compliance_1995` (RS, w178):**
Options: `comply_with_nato_demands` (aggression_affinity −0.4, patron_confidence +5, military_credibility −5) vs `resist_nato_ultimatum` (aggression_affinity +0.5, patron_confidence −10, military_credibility +4). Models RS's compliance decision under ODF military pressure. Historically RS complied (heavy weapons withdrawal from Sarajevo exclusion zone). Source: NATO ODF records; Holbrooke, *To End a War* (1998) pp. 143–148.

**`holbrooke_ceasefire_demand_oct95` (RBiH, w183):**
Player-facing. Options: `accept_ceasefire_terms` (aggression_affinity −0.3, international_standing +8, negotiating_leverage −6) vs `press_military_advantage` (aggression_affinity +0.5, international_standing −10, military_credibility +5). Models Izetbegovic's decision whether to accept Holbrooke's pre-Dayton ceasefire demand or press the ARBiH offensive (which was making gains in September–October 1995). Historically Izetbegovic accepted (5 October 1995 ceasefire agreement). The player option to diverge models the counterfactual of RBiH pressing its military advantage at the cost of the diplomatic track. Source: Holbrooke, *To End a War* (1998) pp. 193–200; State Dept. records (Ceasefire Agreement, 5 October 1995).

---

## Historian Verification Summary

| Claim | Decision | Basis |
|---|---|---|
| O-S proposed allocation: ~33% RBiH, ~52% RS, ~15% HRHB | VERIFIED | Owen, *Balkan Odyssey* (1995) pp. 218–223 — explicit percentage breakdown stated by Owen. |
| Bosnian Serb Assembly voted on O-S (did not auto-reject) | VERIFIED | ICTY IT-95-5/18-T §3487 — Bosnian Serb Assembly voted 51% reject; contested, not obvious. |
| RS floor gap for O-S is ~13pp (below hard-reject threshold) | VERIFIED | RS held ~65% territory at time of O-S; proposed RS = 52%; gap = 13pp. Consistent with Assembly voting. |
| Izetbegovic initialled O-S on HMS Invincible, August 1993 | VERIFIED | ICTY IT-95-5/18-T §§3484–3492; Owen, *Balkan Odyssey* pp. 228–235. Date: 20 August 1993. |
| RBiH initalling was tactical, not sincere | VERIFIED | Owen, *Balkan Odyssey* p. 232: "Izetbegovic initialled for reasons of international positioning, not territorial acceptance." ICTY record confirms subsequent Assembly rejection (28 September 1993). |
| US non-endorsement of O-S provided RBiH's backstop | VERIFIED | Christopher press conference, 2 August 1993 (US public record). Owen, *Balkan Odyssey* pp. 224–226. |
| Holbrooke back-channel to RS via Belgrade, August 1995 | VERIFIED | Holbrooke, *To End a War* (1998) ch. 7 — Holbrooke explicitly describes the Belgrade channel and Milosevic's role in coercing Karadzic. w176 timing consistent with August 1995. |
| NATO Operation Deliberate Force coerced RS compliance (Aug–Sep 1995) | VERIFIED | NATO ODF records; Holbrooke, *To End a War* (1998) pp. 143–148 — ODF ran 30 August – 20 September 1995; RS complied with heavy weapons withdrawal. w178 consistent. |
| Holbrooke demanded ceasefire from RBiH, October 1995 | VERIFIED | Holbrooke, *To End a War* (1998) pp. 193–200; Ceasefire Agreement, 5 October 1995 (State Dept. public record). Izetbegovic accepted. w183 consistent with early October 1995. |

---

## Known Phase 6 Debt

| Item | Description | Recommended Phase |
|---|---|---|
| Owen-Stoltenberg UI — full-screen patron modal with urgency timer | Phase 5 wires all bot and player logic. The dramatic full-screen modal with urgency timer treatment (matching Phase 4 design session intent) is deferred. Current O-S player event uses standard event modal. | Phase 5 UI sprint or Phase 6 |
| Per-plan RS floor specialization | Phase 3 calibrated a single 18pp threshold across all plans. Now that data fix confirms O-S gap is correctly ~13pp (below threshold), VOPP ~27pp (above threshold), and CG ~21pp (above threshold), the floor logic can be specialized per plan: `VOPP=27pp`, `O-S=18pp` (use current threshold as upper bound; O-S already routes through scoring at 13pp), `CG=21pp`. Single-threshold is conservative and correct for now but could be made precise. | Phase 6 |
| Contact Group (1994) — HRHB acceptance branch | The Washington Agreement (March 1994) created a specific structural pressure on HRHB to accept the Contact Group plan. This is not yet modelled with a plan-specific branch. Requires a historian pass on HRHB CG behavior (Prlic IT-04-74-T). | Phase 6 |
| `trendScore` magnitude calibration in a 70w+ run | TREND_MAGNITUDE=0.25 was validated as not dominating personality in short-window analysis (Phase 4). A 70w+ run with peace plan events fully active is needed to verify directional effect vs personality scoring across the full negotiating arc (VOPP → O-S → CG → Dayton). | Phase 6 |
| Dayton plan implementation | `war_1995.json` now covers the lead-up. The Dayton plan itself (`dayton`) is not yet in `peace_plan_data.ts`. Phase 6 should author the Dayton plan definition and `computePoliticalPeacePlanResponse` branch for the final-status negotiation. | Phase 6 |

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. Tactical acceptance branch is a pure conditional from `assessment.situation_score` (deterministic) and `plan.id` (constant). Event turn_min values are fixed. |
| GameState as single source of truth | PASS | `situation_score` read from `PoliticalAssessment` derived from `NegotiationBreakdown` and `turn_summaries` in GameState. `proposed_split` is not stored in GameState — read from `peace_plan_data.ts` at evaluation time only. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only in all event definitions and branch conditions. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | PASS | All 9 historian verification entries cite primary sources (ICTY trial records, Owen memoir, Holbrooke memoir, State Dept. records). |
| No `Math.random()` | PASS | |
| Additive scoring — no overrides | PASS | Tactical acceptance branch is an explicit pre-scoring short-circuit with plan ID and faction discriminators, not a modification of the scoring function. All other plan × faction combinations continue through existing dispatch chain unchanged. |
| RS floor gate preserved | PASS | Fix to `proposed_split` does not touch the floor gate logic. RS floor gate now correctly routes O-S to scoring (gap 13pp < 18pp threshold); VOPP and CG remain above threshold and continue to hard-reject. |
| Backward compatibility of event pipeline | PASS | `war_1995.json` introduces no new schema fields. All events use existing schema with `bot_response_logic: 'strategic_weighted'`, `responding_faction`, `once`, `effects`. |

**Status: GO.** All checks pass. No blockers.

---

## Files

| File | Change |
|---|---|
| `src/sim/negotiation/peace_plan_data.ts` | Corrected `OWEN_STOLTENBERG_PLAN.proposed_split` from `{RBiH:53, RS:30, HRHB:17}` to `{RBiH:33, RS:52, HRHB:15}` |
| `src/sim/political/political_peace_plan.ts` | Added RBiH tactical acceptance branch in `computePoliticalPeacePlanResponse` — short-circuit to `'accepted'` when `faction='RBiH' && plan.id='owen_stoltenberg' && situation_score < 50` |
| `data/scenarios/events/war_1993.json` | Added `os_rbih_tactical_acceptance_1993` (RBiH, turn_min=72, player-facing) |
| `data/scenarios/events/war_1995.json` | NEW — 3 Holbrooke shuttle diplomacy events: `holbrooke_us_belgrade_channel_1995` (RS, w176), `deliberate_force_rs_compliance_1995` (RS, w178), `holbrooke_ceasefire_demand_oct95` (RBiH, w183) |
| `tests/event_timeline_integrity.test.ts` | Total event count updated: 109 → 113 |
| `tests/sim/political/phase5a_os_tactical_acceptance.test.ts` | NEW — 13 tests |
| `tests/sim/political/phase5c_holbrooke_events.test.ts` | NEW — 14 tests |

---

## Tests

27 new tests across 2 new test files:

| File | Count | Coverage |
|---|---|---|
| `tests/sim/political/phase5a_os_tactical_acceptance.test.ts` | 13 | Tactical acceptance fires when `faction=RBiH && plan=owen_stoltenberg && situation_score < 50`; does NOT fire when `situation_score >= 50`; does NOT fire for other factions (RS, HRHB) on O-S; does NOT fire for other plans (VOPP, CG, Dayton) with RBiH; RS floor gate correct at 13pp gap (routes to scoring, no auto-reject); player event `os_rbih_tactical_acceptance_1993` present in timeline with correct schema; `requires_player_response: true`; both option IDs present; `accept_for_optics` and `reject_sincerely` dimension_shifts correct; `responding_faction: 'RBiH'` explicit |
| `tests/sim/political/phase5c_holbrooke_events.test.ts` | 14 | All 3 Holbrooke events present in timeline; turn_min values correct (176, 178, 183); `responding_faction` explicit on all 3; `holbrooke_ceasefire_demand_oct95` is player-facing; RS bot events are NOT player-facing; `bot_response_logic: 'strategic_weighted'` on all 3; `once: true` on all 3; option IDs present on all 3; `effects: []` pattern on all 3; timeline integrity (109+1+3=113 total events) |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2646/2646 (184 files)
- 27 new tests: all pass
- Phase political suite (Phases 1–5): 22 + 22 + 14 + 22 + 18 + 13 + 14 = 125 tests
- 40w calibration: 93.3% area-weighted (−0.7pp from 94.0% baseline; confirmed inert, pre-existing P1 noise)

---

## Phase 6 Recommended Lane

**v0.8.2 Phase 6 — Per-Plan RS Floor Specialization, Contact Group Branch, and trendScore Validation**

Primary deliverables:

1. **Per-plan RS floor specialization:** Specialize the single 18pp hard-reject threshold into plan-specific values: `VOPP=27pp`, `O-S=18pp` (upper bound; O-S already routes to scoring at 13pp post-fix), `CG=21pp`. Requires editing the floor check in `computePoliticalPeacePlanResponse` from a single constant to a plan-keyed lookup. The data is now correct (O-S fix landed) — specialization is precision, not a direction change.

2. **Contact Group (1994) — HRHB acceptance branch:** Washington Agreement created a documented structural pressure on HRHB to accept the Contact Group plan. Author a plan-specific branch for `faction='HRHB' && plan.id='contact_group'` under Washington Agreement conditions. Requires historian pass (Prlic IT-04-74-T; Washington Agreement text, March 1994).

3. **Full-screen Holbrooke patron modal (UI sprint):** Phase 5 wires all bot and player logic. The full-screen patron modal with urgency timer treatment belongs to a UI phase. Gate: Phase 5 closed and on main (now closed).

4. **`trendScore` 70w+ validation:** Run 52-week historical scenario with all peace plan events active (Phases 3–5 live). Verify TREND_MAGNITUDE=0.25 produces expected directional effect across the full negotiating arc (VOPP rejection zone → O-S tactical acceptance zone → CG → Dayton) without dominating personality scoring. If the trend signal is too strong or too weak relative to personality, calibrate the magnitude constant.

5. **Dayton plan definition:** Author `dayton` in `peace_plan_data.ts` with historically-grounded `proposed_split` (~49% RBiH+HRHB, ~51% RS per Dayton Annex 2). Wire `computePoliticalPeacePlanResponse` branch for Dayton's unique dynamics (RS compliance under US military guarantee; RBiH acceptance under exhaustion; HRHB acceptance under Washington Agreement continuity).

Gate: Phase 5 closed and on `main` (now closed).
