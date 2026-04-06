# v0.8.2 Phase 6 — Per-Plan Threshold Specialization and Contact Group Branches

**Date:** 2026-04-06
**Type:** Feature + Data Fix
**Phase in series:** 6 of 7
**Status:** ACCEPTED
**Baseline:** 2646/2646 vitest, tsc clean (Phase 5 close)
**Verification:** tsc clean, 2661/2661 vitest (185 files), 15 new tests

---

## Purpose

Phase 5 landed the O-S data fix and RBiH tactical acceptance branch, confirming the RS floor gap for O-S is now correctly ~13pp (below the single 18pp hard-reject threshold). Phase 5 also confirmed the CG gap is ~14pp — but with the single 18pp threshold, the Contact Group plan was erroneously routing to personality scoring rather than hard-rejecting. Historically, RS rejected the Contact Group plan by 96% referendum in August 1994. That rejection was patron-proof.

Phase 6 closes four items from the Phase 5 debt register:

1. **VOPP proposed_split data fix** — `VANCE_OWEN_PLAN.proposed_split` was carrying Dayton-era numbers (`{RBiH:53, RS:30, HRHB:17}`) rather than the historical Vance-Owen allocation. The correct values (`{RBiH:39, RS:43, HRHB:18}`) are sourced from Owen, *Balkan Odyssey* (1995) pp. 98–105 and ICTY IT-95-5/18-T §§3526–3530. Post-fix, the RS gap for VOPP is ~22pp (RS holds ~65%, proposed RS=43%), which remains above the 18pp hard-reject floor — VOPP still hard-rejects correctly.

2. **Per-plan RS floor map** — Replaces the single `RS_TERRITORY_FLOOR_GAP = 18` constant with a plan-keyed `RS_PLAN_FLOOR_GAPS` lookup. The critical fix is Contact Group: the CG sim gap is ~14pp. Under the single 18pp floor, 14 < 18 — CG was routing to scoring. Under the new 10pp CG floor, 14 > 10 — CG hard-rejects. This matches the historical 96% RS referendum rejection (August 1994). VOPP and O-S floors both remain 18pp.

3. **Patron override immunity for VOPP and CG** — The 96-2 Bosnian Serb Assembly rejection of VOPP (May 1993) and the 96% RS referendum rejection of CG (August 1994) are each a direct popular mandate that no patron — not even Milosevic at full confidence — could override. A new `RS_PATRON_OVERRIDE_IMMUNE` set blocks the patron hard-override path for RS on these two plans. O-S remains patron-overrideable (51% Assembly vote; a plausible Milosevic-forces-acceptance counterfactual exists and is meaningful game design).

4. **HRHB Washington Agreement alignment on CG** — The Washington Agreement (March 1994, ~w102) created a documented structural pressure on HRHB to accept the Contact Group plan. Post-Washington, Zagreb was fully aligned with CG acceptance, and HRHB under sufficient patron pressure could accept. A new branch fires for `faction='HRHB' && plan.id='contact_group' && warWeek > 102 && patron_confidence >= 60` → `'accepted'`. This lowers the effective patron override threshold for HRHB on CG from 80 → 60 post-Washington, modelling Zagreb's institutional alignment. Source: Prlic IT-04-74-T Vol. 3 paras. 480–520.

---

## Deliverables

### 1. VOPP Proposed Split Data Fix (`peace_plan_data.ts`)

**File:** `src/sim/negotiation/peace_plan_data.ts`
**Commit:** `92bc67ad`

`VANCE_OWEN_PLAN.proposed_split` corrected:

| Faction | Before (erroneous) | After (historical) |
|---|---|---|
| RBiH | 53% | 39% |
| RS | 30% | 43% |
| HRHB | 17% | 18% |

**Source:** Owen, R. *Balkan Odyssey* (1995), pp. 98–105 — the Vance-Owen plan divided Bosnia into ten cantons, with Serb-majority provinces covering approximately 43% of territory. ICTY IT-95-5/18-T §§3526–3530 corroborates the Serb-majority canton allocations.

**Side effect (correct behavior):** Post-fix, the RS floor gap for VOPP is ~22pp (RS holds ~65% of territory; VOPP proposed RS ≈ 43%; gap = 22pp). This exceeds the 18pp floor — VOPP continues to hard-reject. The data fix tightens the historical accuracy of the gap without changing the VOPP rejection outcome.

---

### 2. Per-Plan RS Floor Map and Contact Group Hard-Reject Fix (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`
**Commit:** `2e5f35b7`

Replaced the single `RS_TERRITORY_FLOOR_GAP = 18` constant with a plan-keyed lookup:

```typescript
const RS_PLAN_FLOOR_GAPS: Record<string, number> = {
    vance_owen:       18,  // gap ~22pp > 18pp → hard-reject (correct)
    owen_stoltenberg: 18,  // gap ~13pp < 18pp → routes to scoring (correct)
    contact_group:    10,  // gap ~14pp > 10pp → hard-reject (correct; 96% referendum)
};
const RS_FLOOR_GAP_DEFAULT = 18;
```

**Critical fix — Contact Group:** Under the previous single 18pp floor, the CG territorial gap (~14pp) was below the threshold, routing CG to personality scoring. Historically, RS rejected the Contact Group plan by 96% referendum (August 1994) — the most decisive rejection of any peace plan in the war. The new 10pp CG floor correctly places the 14pp gap above the threshold, triggering hard-reject. This is the most important behavioral change in Phase 6.

**Floor selection logic:** `const floorGap = RS_PLAN_FLOOR_GAPS[plan.id] ?? RS_FLOOR_GAP_DEFAULT;` — unknown plan IDs fall back to 18pp. Existing VOPP and O-S behavior is unchanged at 18pp. O-S gap (~13pp) remains below its 18pp floor → continues to route to scoring (correct; Assembly voted 51% reject, not an obvious auto-reject).

---

### 3. Patron Override Immunity (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`
**Commit:** `2e5f35b7`

New set blocks patron hard-override for RS on specific plans:

```typescript
const RS_PATRON_OVERRIDE_IMMUNE = new Set(['vance_owen', 'contact_group']);
```

When `faction === 'RS'` and `RS_PATRON_OVERRIDE_IMMUNE.has(plan.id)`, `effectiveOverrideThreshold` is set to `Infinity` — no patron confidence value can trigger acceptance. The 96-2 Bosnian Serb Assembly rejection of VOPP and the 96% referendum rejection of CG are each a direct popular mandate that forecloses patron override. O-S is deliberately excluded from the immune set: the 51% Assembly vote was a contested decision, and a Milosevic-forces-acceptance counterfactual is historically plausible and game-mechanically meaningful.

**Dispatch chain position:** Immunity check fires after the floor gate (if plan has already hard-rejected on territorial grounds, the patron path is irrelevant). The immunity affects only the patron hard-override path — it does not affect personality scoring, which is the downstream path for plans that pass the floor gate.

---

### 4. HRHB Washington Agreement Alignment (`political_peace_plan.ts`)

**File:** `src/sim/political/political_peace_plan.ts`
**Commit:** `2e5f35b7`

New branch fires before normal scoring for HRHB × Contact Group post-Washington:

```typescript
// HRHB Washington alignment: warWeek > 102 && faction === 'HRHB'
// && plan.id === 'contact_group' && patron_confidence >= 60 → 'accepted'
// Washington Agreement (~w102, March 1994). Zagreb fully aligned with CG acceptance.
// Source: Prlic IT-04-74-T Vol. 3 paras. 480-520
if (
    faction === 'HRHB' &&
    plan.id === 'contact_group' &&
    warWeek > 102 &&
    patronOverrideAuthority >= 60
) {
    return 'accepted';
}
```

**Trigger conditions:**
- `faction === 'HRHB'` — faction discriminator; does not affect RS or RBiH
- `plan.id === 'contact_group'` — plan discriminator; does not affect VOPP, O-S, Cutileiro, or Dayton
- `warWeek > 102` — temporal gate; Washington Agreement concluded approximately w102 (March 1994); pre-Washington HRHB behavior is unchanged
- `patronOverrideAuthority >= 60` — patron pressure gate; Zagreb alignment requires credible pressure (lower than the 80pp standard patron threshold, reflecting the structural institutional alignment rather than mere pressure)

**Historical basis:** The Washington Agreement (1 March 1994) normalized HRHB–RBiH relations and ended the Bosnian Croat–Bosniak war. Following Washington, Zagreb's policy fully aligned with Western diplomatic initiatives including the Contact Group plan (July 1994). The lowered threshold (80 → 60) models that Zagreb's alignment reduced the friction of HRHB CG acceptance from active resistance to conditional compliance. Source: Prlic IT-04-74-T Vol. 3 paras. 480–520.

**`warWeek` parameter:** Added `warWeek: number = 0` parameter to `computePoliticalPeacePlanResponse`. `computeBotResponse` in `peace_plans.ts` now passes `getWarWeek(state)` to this function. Default value of 0 preserves backward compatibility for existing callers that omit the parameter.

**Strictly separate from RS immunity path:** The HRHB branch is a conditional acceptance under patron pressure. The RS immune path is an unconditional block regardless of patron confidence. These are independent mechanisms; neither interacts with the other.

---

### 5. Tests (`phase6_per_plan_floors.test.ts`)

**File:** `tests/sim/political/phase6_per_plan_floors.test.ts` (NEW)
**Commit:** `0a9b47aa`

15 new tests across three groups:

**Per-plan floor group (5 tests):**
- VOPP gap ~22pp > 18pp floor → hard-rejects
- CG gap ~14pp > 10pp floor → hard-rejects (the critical fix)
- O-S gap ~13pp < 18pp floor → routes to scoring (not auto-reject)
- Default fallback: unknown plan ID uses 18pp floor
- Floor lookup returns per-plan value, not global constant

**Patron immunity group (5 tests):**
- VOPP with `patron_confidence=100`: RS still rejects (immunity blocks override)
- CG with `patron_confidence=100`: RS still rejects (immunity blocks override)
- O-S with `patron_confidence=90`: RS can be overridden (O-S not in immune set)
- Immunity applies only to RS, not to HRHB or RBiH
- O-S routes to personality scoring when gap below floor, regardless of patron

**HRHB alignment group (5 tests):**
- Pre-Washington (warWeek ≤ 102): HRHB CG with patron=90 does NOT trigger alignment branch
- Post-Washington (warWeek > 102): HRHB CG with patron=60 returns `'accepted'`
- Post-Washington: patron < 60 does NOT trigger branch (patron gate enforced)
- Post-Washington: HRHB on a different plan (O-S) does NOT trigger branch (plan discriminator enforced)
- Post-Washington: RS on CG with patron=60 does NOT trigger HRHB branch (faction discriminator enforced)

---

## Historian Verification

| Claim | Decision | Basis |
|---|---|---|
| VOPP proposed RS allocation ~43% (Serb-majority cantons) | VERIFIED | Owen, *Balkan Odyssey* (1995) pp. 98–105 — explicit canton breakdown. ICTY IT-95-5/18-T §§3526–3530 corroborate RS canton assignments. |
| VOPP 96-2 Bosnian Serb Assembly rejection (May 1993) | VERIFIED | ICTY IT-95-5/18-T — Assembly vote documented; 96-2 is the record cited in the trial record. |
| Contact Group proposed RS ~49% (CG plan July 1994) | VERIFIED | ICTY IT-95-5/18-T §3587 period; UNSCR 942 (23 September 1994) — CG plan referenced in Security Council record. |
| Contact Group 96% RS referendum rejection (August 1994) | VERIFIED | ICTY IT-95-5/18-T — referendum result cited in Karadzic trial record. |
| Washington Agreement concluded March 1994 (~w102) | VERIFIED | Public record; Burg & Shoup *The War in Bosnia-Herzegovina* Vol. II — Washington Agreement signed 1 March 1994. |
| HRHB Zagreb alignment on CG acceptance post-Washington | VERIFIED | Prlic IT-04-74-T Vol. 3 paras. 480–520 — Zagreb's post-Washington policy alignment with Western diplomatic track including CG documented. |

---

## Phase 7 Debt Register

| Item | Description | Recommended Phase |
|---|---|---|
| Dayton plan definition and branches | `dayton` plan not yet in `peace_plan_data.ts`. Requires historically-grounded `proposed_split` (~49% RBiH+HRHB, ~51% RS per Dayton Annex 2) and `computePoliticalPeacePlanResponse` branches for RS compliance under US military guarantee, RBiH acceptance under exhaustion, HRHB acceptance under Washington Agreement continuity. Dayton is the endgame plan — Phase 7 primary deliverable. | Phase 7 |
| Full-screen Holbrooke patron modal with urgency timer | Phase 5 wired all bot and player logic for Holbrooke events. The dramatic full-screen modal with urgency timer treatment (matching Phase 4 design session intent) is deferred. Current events use standard event modal. | Phase 7 UI sprint |
| `trendScore` 70w+ calibration validation | TREND_MAGNITUDE=0.25 validated as non-dominating in short-window analysis (Phase 4). A 70w+ run with all peace plan events active (Phases 3–6 live) is needed to verify directional effect across the full negotiating arc (VOPP → O-S → CG → Dayton) without dominating personality scoring. | Phase 7 |
| Contact Group RBiH acceptance bonus (international standing) | CG acceptance by RBiH was an asymmetric diplomatic win — RBiH accepted, RS rejected, producing an international standing gain for RBiH. This documented asymmetry from Phase 6 research is not yet modelled. Requires a plan-specific `dimension_shifts` effect on RBiH acceptance of CG. | Phase 7 |

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()`. Per-plan floor lookup is a pure map access. Immunity check is a pure Set membership test. HRHB alignment branch is a pure conditional from `warWeek` (derived from GameState turn count), `plan.id` (constant), and `patronOverrideAuthority` (deterministic score). |
| GameState as single source of truth | PASS | `warWeek` derived from `getWarWeek(state)` (GameState turn count). `patronOverrideAuthority` read from `PoliticalAssessment` derived from GameState. `proposed_split` read from `peace_plan_data.ts` at evaluation time only — not stored in GameState. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only in all branch conditions and test fixtures. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| No `avoided_osids_by_faction` | PASS | Not relevant to this phase. |
| Historical claims sourced | PASS | All 6 historian verification entries cite primary sources (ICTY trial records, Owen memoir, Prlic trial record, UNSCR). |
| No `Math.random()` | PASS | |
| Additive scoring — no overrides | PASS | Per-plan floor replaces a single constant with a lookup — same logic, more precise values. Immunity check and HRHB alignment branch are explicit pre-scoring short-circuits with faction, plan, and temporal discriminators. All other plan × faction combinations continue through existing dispatch chain unchanged. |
| RS floor gate preserved | PASS | Floor gate logic is structurally unchanged — only the threshold value is now plan-keyed rather than a single constant. O-S routing behavior unchanged (13pp < 18pp → scores). VOPP behavior unchanged (22pp > 18pp → rejects). CG corrected (14pp > 10pp → rejects). |
| `warWeek` parameter backward compatible | PASS | Default value `warWeek: number = 0` preserves all existing callers. Pre-Washington guard (`warWeek > 102`) never fires at 0, leaving pre-existing behavior intact. |

**Status: GO.** All checks pass. No blockers.

---

## Files

| File | Change |
|---|---|
| `src/sim/negotiation/peace_plan_data.ts` | Corrected `VANCE_OWEN_PLAN.proposed_split` from `{RBiH:53, RS:30, HRHB:17}` to `{RBiH:39, RS:43, HRHB:18}` |
| `src/sim/political/political_peace_plan.ts` | (1) `RS_TERRITORY_FLOOR_GAP` replaced with `RS_PLAN_FLOOR_GAPS` lookup + `RS_FLOOR_GAP_DEFAULT`. (2) `RS_PATRON_OVERRIDE_IMMUNE` set — VOPP and CG patron-override blocked for RS. (3) HRHB Washington alignment branch — `warWeek > 102 && plan.id='contact_group' && patron >= 60 → 'accepted'`. (4) `warWeek: number = 0` parameter added to `computePoliticalPeacePlanResponse`. |
| `src/sim/negotiation/peace_plans.ts` | `computeBotResponse` now passes `getWarWeek(state)` to `computePoliticalPeacePlanResponse`. |
| `tests/sim/political/political_peace_plan.test.ts` | Updated to pass `warWeek` parameter where required by updated signature. |
| `tests/sim/political/phase6_per_plan_floors.test.ts` | NEW — 15 tests (per-plan floors, patron immunity, HRHB alignment) |

---

## Tests

15 new tests in 1 new file:

| File | Count | Coverage |
|---|---|---|
| `tests/sim/political/phase6_per_plan_floors.test.ts` | 15 | Per-plan floors: VOPP 22pp>18pp rejects, CG 14pp>10pp rejects (critical fix), O-S 13pp<18pp routes to scoring, default fallback at 18pp, lookup returns per-plan value. Patron immunity: VOPP patron=100 still rejects, CG patron=100 still rejects, O-S patron=90 can override, immunity applies only to RS, O-S scoring path unaffected by immunity. HRHB alignment: pre-Washington warWeek≤102 branch does NOT fire, post-Washington patron≥60 returns 'accepted', patron<60 does NOT trigger, plan discriminator enforced (O-S unaffected), faction discriminator enforced (RS unaffected). |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2661/2661 (185 files)
- 15 new tests: all pass
- Phase political suite (Phases 1–6): 22 + 22 + 14 + 22 + 18 + 13 + 14 + 15 = 140 tests

---

## Phase 7 Recommended Lane

**v0.8.2 Phase 7 — Dayton Plan, Full-Screen Modal, and trendScore Validation**

Primary deliverables:

1. **Dayton plan definition and RS/RBiH/HRHB branches:** Author `dayton` in `peace_plan_data.ts` with historically-grounded `proposed_split` (~49% RBiH+HRHB, ~51% RS per Dayton Annex 2). Wire `computePoliticalPeacePlanResponse` branches for Dayton's unique dynamics: RS compliance under US military guarantee (patron immune override mechanism inverted — high US pressure forces acceptance), RBiH acceptance under exhaustion (situation_score gate for acceptance from war fatigue), HRHB acceptance under Washington Agreement continuity (already aligned post-w102). Dayton is the endgame plan and Phase 7 primary deliverable.

2. **Full-screen Holbrooke patron modal with urgency timer (UI sprint):** Phase 5 wired all bot and player logic for Holbrooke events. The full-screen modal with urgency timer treatment (Phase 4 design session intent) is deferred to Phase 7 UI sprint. Gate: Phase 5 and Phase 6 closed and on main (now closed).

3. **`trendScore` 70w+ calibration validation:** Run 52-week historical scenario with all peace plan events active (Phases 3–6 live). Verify TREND_MAGNITUDE=0.25 produces expected directional effect across the full negotiating arc (VOPP rejection zone → O-S tactical acceptance zone → CG → Dayton) without dominating personality scoring. If the trend signal is too strong or too weak relative to personality, calibrate the magnitude constant.

4. **Contact Group acceptance bonus for RBiH (international standing gain):** CG acceptance by RBiH produced a documented asymmetric diplomatic win — RS rejection isolated RS internationally while RBiH's acceptance accrued legitimacy. Model this as a plan-specific `dimension_shifts` effect on RBiH acceptance of CG: `international_standing` gain proportional to RS rejection. Requires a small historian pass to source the magnitude.

Gate: Phase 6 closed and on `main` (now closed).
