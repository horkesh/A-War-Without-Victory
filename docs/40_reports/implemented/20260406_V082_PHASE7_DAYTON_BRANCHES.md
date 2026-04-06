# v0.8.2 Phase 7 — Dayton Plan, RBiH Endgame Branch, and CG RBiH Bonus

**Date:** 2026-04-06
**Type:** Feature + Data
**Phase in series:** 7 of 7 (v0.8.2 CLOSED)
**Status:** ACCEPTED
**Baseline:** 2661/2661 vitest, tsc clean (Phase 6 close)
**Verification:** tsc clean, 2684/2684 vitest, 23 new tests

---

## Purpose

Phase 6 closed with four items deferred to Phase 7: the Dayton plan definition and branches, the HRHB alignment extension to Dayton, the Contact Group RBiH international standing bonus, and the `trendScore` component tests.

Phase 7 delivers all four. It also extends the HRHB Washington Agreement alignment branch (Phase 6) to cover Dayton alongside Contact Group — historically correct, since Dayton ratified the same 51/49 territorial framework that HRHB had already committed to under the Washington Agreement.

Dayton is the endgame plan. Its branches require different logic from all prior plans: RS compliance is not patron-proof (unlike VOPP and CG), the RS floor is a narrow 3pp calibrated to post-Krajina, post-Deliberate Force battlefield realities, and RBiH acceptance is driven by US pressure and war exhaustion rather than diplomatic opportunism. These three mechanics close the full peace plan arc from Cutileiro (w0) through Dayton (w185).

---

## Deliverables

### 1. DAYTON_PLAN Definition (`peace_plan_data.ts`)

**File:** `src/sim/negotiation/peace_plan_data.ts`

`DAYTON_PLAN` added as a named export and appended to `PEACE_PLANS`:

| Field | Value | Source |
|---|---|---|
| `id` | `'dayton'` | |
| `trigger_week` | 185 | November 1995 (~w185 from April 1992) |
| `proposed_split.RS` | 49% | Dayton Annex 2 IEBL (51/49 entity split) |
| `proposed_split.RBiH` | 33% | Washington Agreement canton geography; Burg & Shoup (1999) Ch. 8 |
| `proposed_split.HRHB` | 18% | Washington Agreement canton geography |
| `institutional_model` | `'two_entities'` | RS + Bosniak-Croat Federation |
| `credibility_change_on_reject.RS` | −30 | Highest in sequence — rejecting Dayton post-Krajina, post-Deliberate Force was diplomatic self-destruction. ICTY IT-95-5/18-T Vol. 4 §§4900–4940 |
| `credibility_change_on_reject.RBiH` | −15 | |
| `credibility_change_on_reject.HRHB` | −15 | |

**Source note:** The proposed split ratifies the Contact Group framework: same 51/49 entity split, same Federation internal geography from the Washington Agreement. Burg & Shoup *The War in Bosnia-Herzegovina* (1999) Ch. 8 documents the continuity between CG and Dayton territorial allocations.

---

### 2. Dayton RS Floor (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`

`RS_PLAN_FLOOR_GAPS` updated with Dayton entry:

```typescript
const RS_PLAN_FLOOR_GAPS: Record<string, number> = {
    vance_owen:        18,
    owen_stoltenberg:  18,
    contact_group:     10,
    dayton:             3,  // post-Krajina post-Deliberate Force; RS held ~52%, proposed ~49%
};
```

**Dayton floor rationale:** The Dayton gap is narrow (~3pp: RS held ~52% at w185, Dayton proposes 49%) because Operation Storm (August 1995) and NATO Operation Deliberate Force (August–September 1995) had significantly compressed RS territorial holdings from the ~63% held at CG time. The 3pp floor is calibrated to this compressed position. A strictly-greater-than condition means a gap of exactly 3pp routes to scoring (patron can override); a gap of 4pp+ hard-rejects before patron fires.

**Patron override NOT immune:** Dayton is not added to `RS_PATRON_OVERRIDE_IMMUNE`. Unlike VOPP (96-2 Assembly vote) and CG (96% referendum), there was no equivalent RS constitutional act blocking Dayton acceptance — Milosevic's intervention and US military guarantees created a patron-overrideable path. This is the designed counterfactual space: high US/IC patron confidence can force RS acceptance of Dayton.

**Calibration note (in code comment):** If the full-campaign scenario (not yet implemented) shows RS holding 60%+ at w185 because Operation Storm is not modelled, the floor should be raised to 10pp to prevent patron from trivially forcing acceptance.

---

### 3. RBiH Dayton Endgame Acceptance Branch (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`

New branch fires before RS floor evaluation:

```typescript
if (faction === 'RBiH' && plan.id === 'dayton' && warWeek >= 180 && patronOverrideAuthority >= 50) {
    return 'accepted';
}
```

**Trigger conditions:**
- `faction === 'RBiH'` — faction discriminator
- `plan.id === 'dayton'` — plan discriminator; does not affect VOPP, O-S, CG, or Cutileiro
- `warWeek >= 180` — temporal gate; Dayton proximity talks began late October 1995 (~w181); gate set to 180 to allow a narrow pre-initialing window
- `patronOverrideAuthority >= 50` — patron pressure gate; Izetbegovic accepted under US pressure and war exhaustion, not freely; requires credible US/IC backing

**Historical basis:** Izetbegovic accepted Dayton at Wright-Patterson Air Force Base (November 1995) under direct US pressure and the weight of three years of war exhaustion. This was acceptance from constrained leverage — not the diplomatic opportunism of the O-S tactical branch (accept knowing RS will refuse), but genuine end-of-war closure under US guarantee. The lower patron threshold (50 vs 80 normal override) reflects that Izetbegovic required less coercion than RS given RBiH's trajectory of international legitimacy. Source: Holbrooke, *To End a War* (1998) pp. 298–305; ICTY IT-95-5/18-T Vol. 4.

**Contrast with O-S branch:** The O-S tactical branch fires on `situation_score < 50` (RBiH in a weak position, accepting for optics). The Dayton branch fires on `warWeek >= 180` with patron pressure — a different causal mechanism. The two branches are independent and do not interact.

---

### 4. HRHB Alignment Extended to Dayton (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`

The Phase 6 HRHB Washington Agreement alignment branch was extended from CG-only to CG + Dayton:

```typescript
const isHrhbCgAlignment =
    faction === 'HRHB'
    && (plan.id === 'contact_group' || plan.id === 'dayton')
    && isPostWashington;
```

**Historical basis:** Dayton ratified the same 51/49 territorial framework as the Contact Group plan, which HRHB had already accepted under the Washington Agreement. Zagreb's institutional alignment with the Western diplomatic track post-Washington (March 1994) applied equally to Dayton as to CG — the entity split was identical. Source: Prlic IT-04-74-T Vol. 3 paras. 480–520; Dayton GFAP (December 1995).

**Behavior unchanged:** The patron threshold (60), temporal gate (`warWeek > 102`), and faction discriminator (`faction === 'HRHB'`) are unchanged from Phase 6. The only change is the plan discriminator now includes `'dayton'`.

---

### 5. Contact Group RBiH Acceptance Bonus (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`

When `faction === 'RBiH'` and `plan.id === 'contact_group'`, an additional `+8` international standing delta is pushed into the accept option's `dimension_shifts`:

```typescript
if (faction === 'RBiH' && plan.id === 'contact_group') {
    acceptOption.dimension_shifts!.push({
        faction: 'RBiH',
        dimension: 'international_standing',
        delta: 8,
    });
}
```

**Historical basis:** RBiH accepted the Contact Group plan (July 1994) while RS rejected it by 96% referendum (August 1994). This produced a documented asymmetric diplomatic outcome: UNSCR 942 (23 September 1994) imposed targeted sanctions on RS while RBiH's cooperative stance accrued international legitimacy. The +8 delta translates to +2.4 on the accept option score via RBiH's `international_standing` weight (0.30), making acceptance more attractive relative to rejection across all RBiH personality types. This is an unconditional structural bonus — RBiH's diplomatic capital from CG acceptance is independent of game state.

Source: UNSCR 942 (23 September 1994); Holbrooke, *To End a War* (1998) p. 44; Burg & Shoup pp. 311–315.

---

### 6. `trendScore` Component Tests (`political_event_decision.test.ts`)

**File:** `tests/sim/political/political_event_decision.test.ts` (UPDATED)

4 new tests in Group 6b:

| Test | Coverage |
|---|---|
| 23 | `territory_trend=gaining` + `aggression_affinity=1.0` → score delta = +0.25 vs stable baseline |
| 24 | `territory_trend=losing` + `aggression_affinity=1.0` → score delta = −0.25 vs stable baseline |
| 25 | `territory_trend=stable` → `trendScore=0` regardless of `aggression_affinity` |
| 26 | `territory_trend=gaining` + `aggression_affinity=0.0` → `trendScore=0` (affinity zeroes trend signal) |

These tests verify `TREND_MAGNITUDE=0.25` is correctly wired: gaining territory amplifies aggressive options, losing territory discourages them, and the effect is gated on `aggression_affinity`. A faction on a stable front is unaffected by the trend signal entirely.

---

### 7. Dayton Plan Tests (`phase7_dayton_plan.test.ts`)

**File:** `tests/sim/political/phase7_dayton_plan.test.ts` (NEW)

18 tests (16 numbered + 2 boundary tests) across four groups:

**Group 1 — Dayton plan definition (4 tests):**
- `DAYTON_PLAN.id === 'dayton'`
- `proposed_split.RS === 49`
- `credibility_change_on_reject.RS <= -25` (highest severity in sequence)
- `DAYTON_PLAN` present in `PEACE_PLANS` array

**Group 2 — RS floor and patron behavior (5 tests):**
- Gap=3pp equals floor=3pp → routes to scoring (strictly-greater condition; patron=85 can override → accepted)
- Gap=4pp > 3pp floor → hard-rejects (floor fires before patron)
- Gap=2pp < 3pp floor → routes to scoring; patron=85 overrides → accepted
- Patron=85, gap=2pp → patron override fires → accepted (Dayton not patron-immune)
- Patron=85, gap=5pp > 3pp → hard-rejects before patron override (floor precedes patron in dispatch chain)

**Group 3 — RBiH and HRHB Dayton branches (7 tests, including 2 boundary tests):**
- RBiH warWeek=185, patron=60 → accepted (endgame branch fires)
- RBiH warWeek=170, patron=60 → branch NOT triggered (warWeek < 180); valid result from scoring
- RBiH warWeek=185, patron=40 → branch NOT triggered (patron < 50); valid result from scoring
- HRHB warWeek=110, patron=65, plan=dayton → accepted (extended CG alignment branch fires)
- HRHB warWeek=90, patron=65, plan=dayton → NOT triggered (pre-Washington); valid result from scoring
- **Boundary test (14b):** HRHB warWeek=102 on CG → NOT triggered (strictly-greater; 102 > 102 is false)
- **Boundary test (14c):** HRHB warWeek=103 on CG → triggers (103 > 102 is true; patron=65 >= 60 → accepted)

**Group 4 — CG RBiH bonus (3 tests):**
- RBiH accepting CG with neutral assessment → accepted (happy-path; bonus does not break normal acceptance)
- RBiH + VOPP: plan discriminator enforced (no bonus; valid scoring result)
- RS + CG: faction discriminator enforced (floor fires first; RS hard-rejects)

---

## Historian Verification

| Claim | Decision | Basis |
|---|---|---|
| Dayton proposed RS allocation = 49% (Annex 2 IEBL) | VERIFIED | Dayton GFAP Annex 2, International Boundary and Entity Line; the 51/49 entity split is the document's formal allocation. |
| Dayton signed November–December 1995 (~w185 from April 1992) | VERIFIED | Initialed Wright-Patterson AFB 21 November 1995; signed Paris 14 December 1995. Public record. |
| Dayton ratified Contact Group 51/49 framework | VERIFIED | Burg & Shoup *The War in Bosnia-Herzegovina* (1999) Ch. 8 — continuity of CG and Dayton territorial allocations explicitly documented. |
| Izetbegovic accepted Dayton under US pressure and war exhaustion | VERIFIED | Holbrooke, *To End a War* (1998) pp. 298–305 — Holbrooke's first-person account of Izetbegovic's acceptance at Dayton. ICTY IT-95-5/18-T Vol. 4. |
| RS credibility cost for rejecting Dayton is the highest in the sequence | VERIFIED | ICTY IT-95-5/18-T Vol. 4 §§4900–4940 — post-Krajina, post-Deliberate Force position of RS documented. Rejection at that point would have been diplomatically catastrophic. |
| HRHB Washington Agreement alignment extends to Dayton (same territorial framework) | VERIFIED | Prlic IT-04-74-T Vol. 3 paras. 480–520 — Zagreb's alignment with Western diplomatic track post-Washington. Dayton GFAP (December 1995) — Dayton ratifies the Washington Agreement entity geography. |
| CG acceptance by RBiH produced asymmetric diplomatic capital (UNSCR 942) | VERIFIED | UNSCR 942 (23 September 1994) — targeted RS sanctions following RS rejection of CG while RBiH had accepted. Holbrooke p. 44; Burg & Shoup pp. 311–315. |

---

## Phase 7 Debt Register

| Item | Description | Recommended Lane |
|---|---|---|
| Holbrooke full-screen patron modal with urgency timer | Phase 5 wired all bot and player logic for Holbrooke events. The full-screen modal with urgency timer treatment (Phase 4 design intent) remains deferred. Current events use the standard event modal. | v0.8.3 UI sprint or standalone |
| `trendScore` 70w+ full-arc validation | `TREND_MAGNITUDE=0.25` validated at unit level and in short-window analysis (Phase 4). A 52-week or full-campaign run with all peace plan events active (Phases 3–7 live) is needed to verify the directional effect across the full negotiating arc (VOPP → O-S → CG → Dayton) is non-dominating. The 40w and 52w scenarios do not reach w185 (Dayton trigger), so the Dayton branch cannot be exercised in integration until the full-campaign scenario exists. | Post-v0.8.3 (requires full-campaign scenario) |
| Dayton RS floor recalibration at w185 | The 3pp floor is calibrated assuming post-Krajina RS holdings (~52%). If the full-campaign scenario (not yet implemented) shows RS holding 60%+ because Operation Storm is not modelled, the floor should be raised to 10pp. Flag for calibration pass when full-campaign scenario exists. | Post-v0.8.3 |

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. `DAYTON_PLAN` is constant data. All branches are pure conditionals from `warWeek` (GameState turn count), `plan.id` (constant), and `patronOverrideAuthority` (deterministic score). |
| GameState as single source of truth | PASS | `warWeek` derived from `getWarWeek(state)`. `patronOverrideAuthority` read from `NegotiationState` derived from GameState. `DAYTON_PLAN.proposed_split` read from `peace_plan_data.ts` at evaluation time — not stored in GameState. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only in all branch conditions, plan data, and test fixtures. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | PASS | All 7 historian verification entries cite primary sources (Dayton GFAP, ICTY trial records, Holbrooke memoir, Burg & Shoup, UNSCR). |
| Additive scoring — no overrides | PASS | CG RBiH bonus is a `dimension_shifts` push into the accept option — additive to the existing score, not a score override. All other plan × faction combinations continue through the existing dispatch chain unchanged. |
| RS floor gate preserved | PASS | Dayton floor (3pp) is added to `RS_PLAN_FLOOR_GAPS` using the same per-plan lookup introduced in Phase 6. No structural change to floor gate logic. |
| RS patron override immunity | PASS | Dayton is deliberately NOT added to `RS_PATRON_OVERRIDE_IMMUNE`. This is the designed counterfactual path: US pressure can force RS Dayton acceptance. VOPP and CG patron immunity unchanged. |
| `warWeek` default = 0 backward compatible | PASS | Default value preserved from Phase 6. No new callers required to pass `warWeek`. |

**Status: GO.** All checks pass. No blockers.

---

## Files

| File | Change |
|---|---|
| `src/sim/negotiation/peace_plan_data.ts` | Added `DAYTON_PLAN` (named export): `id='dayton'`, `trigger_week=185`, `proposed_split={RS:49,RBiH:33,HRHB:18}`, `credibility_change_on_reject={RS:-30,RBiH:-15,HRHB:-15}`. Appended to `PEACE_PLANS` array. |
| `src/sim/political/political_peace_plan.ts` | (1) `RS_PLAN_FLOOR_GAPS` extended with `dayton: 3`. (2) `RS_PATRON_OVERRIDE_IMMUNE` unchanged — Dayton deliberately excluded. (3) HRHB alignment branch plan discriminator extended: `plan.id === 'contact_group' \|\| plan.id === 'dayton'`. (4) RBiH Dayton endgame branch added: `faction=RBiH && plan.id=dayton && warWeek >= 180 && patronOverrideAuthority >= 50 → 'accepted'`. (5) CG RBiH bonus: `faction=RBiH && plan.id=contact_group` → `+8 international_standing` pushed into `acceptOption.dimension_shifts`. |
| `tests/sim/political/phase7_dayton_plan.test.ts` | NEW — 18 tests (Groups 1–4: Dayton definition, RS floor, RBiH/HRHB branches, CG RBiH bonus) |
| `tests/sim/political/political_event_decision.test.ts` | UPDATED — 4 new tests in Group 6b (`trendScore` component: gaining/losing/stable/zero-affinity) |

---

## Tests

23 new tests across 2 files:

| File | Count | Coverage |
|---|---|---|
| `tests/sim/political/phase7_dayton_plan.test.ts` | 18 | Group 1: Dayton plan definition (id, RS split, credibility severity, presence in PEACE_PLANS). Group 2: RS floor — gap=3pp routes to scoring, gap=4pp hard-rejects, gap=2pp routes to scoring, patron override fires when gap < floor, floor precedes patron in dispatch chain. Group 3: RBiH endgame branch fires at warWeek≥180 + patron≥50; warWeek gate enforced; patron gate enforced; HRHB Dayton alignment fires post-Washington with patron≥60; pre-Washington blocked; boundary tests warWeek=102 (not triggered) and warWeek=103 (triggered). Group 4: CG RBiH bonus happy-path acceptance; plan discriminator enforced (VOPP no bonus); faction discriminator enforced (RS unaffected). |
| `tests/sim/political/political_event_decision.test.ts` | 4 | Group 6b trendScore: gaining trend amplifies aggressive options (+0.25), losing trend discourages them (−0.25), stable trend produces zero contribution, zero aggression_affinity zeroes the trend signal entirely. |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2684/2684 (23 new tests pass)
- Phase political suite (Phases 1–7): 22 + 22 + 14 + 22 + 18 + 13 + 14 + 15 + 23 = 163 tests

---

## Recommended Next Lane

**v0.8.2 is CLOSED.** All 7 phases complete on `main`.

**Recommend v0.8.3 per `docs/plans/MASTER_ROADMAP.md`: Order Interpretation + Warlord Problem.**

Gate: v0.8.2 closed — now true.

Primary deliverables for v0.8.3:
1. **Order Interpretation** — player-issued orders parsed into structured intent; corps CO reconciles player intent against battlefield assessment before accepting or modifying. Closes the structural disconnect between player command and corps action.
2. **Warlord Problem** — factions that gain too much battlefield autonomy relative to political authority generate commander independence events. Models Mladic's structural independence from Karadzic and HVO warlordism in Central Bosnia.

Gate for Warlord Problem: requires v0.8.2 political personality framework (now complete) as the scoring substrate for commander–politician conflict events.
