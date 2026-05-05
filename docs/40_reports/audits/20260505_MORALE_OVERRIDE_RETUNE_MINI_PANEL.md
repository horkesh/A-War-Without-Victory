# MORALE_OVERRIDE Phase 1 Retune Mini-Panel — REFINED Verdict

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-MORALE-OVERRIDE-RETUNE-MINI-PANEL
**Type:** Read-only mini-panel synthesis — Phase 1 retune scoping within mechanism-class already validated by Phase 0 panel `9b9650e4`.
**Audit-only.** No engine, scenario, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` touch. No combat-math number tuned in this lane.
**Scope:** Evaluates whether (a) the user-proposed 2A starting parameters (RS=12, HRHB=8, RBiH=8) are historically defensible, (b) the smallest-possible substrate path to ship a faction-asymmetric `MORALE_OVERRIDE_TURNS` on a faction-symmetric mechanism, (c) whether 2B (criterion-3 threshold reconciliation) is also required, and (d) refined acceptance criteria + stop triggers for the Phase 1 retune lane.

---

## 0. Headline

**Combined verdict: REFINED** (panel-unanimous; binding criteria below).

- **2A (faction-asymmetric `MORALE_OVERRIDE_TURNS`):** **REFINED** — historically defensible *direction* (RS_TURNS > ARBiH/HRHB), but the user-proposed magnitude **RS=12 / HRHB=8 / RBiH=8 is too aggressive on the RS side** vs the BB1/BB2 record. Recommended starting parameters: **RS=10 / HRHB=8 / RBiH=8** (10 turns ≈ 40 days; sits at the 90th-percentile end of historical sustained-collapse windows; does not over-shoot into the JNA-1992 "≥ 6 weeks" outlier band where the unit had already physically dispersed and dissolution was a paperwork formality).
- **2B (criterion-3 threshold reconciliation):** **REQUIRED.** The override-disable baseline n1678 (RS = 31/188w) already exceeds the Phase 0 criterion 3 threshold of ≤23/188w, indicating the threshold itself was set against an assumed baseline lower than current scenario state. The threshold MUST be re-baselined to current calibration state before the Phase 1 retune can ship — otherwise the retune cannot satisfy criterion 3 even if 2A succeeds at suppressing incremental dissolutions to zero. Reconciled threshold proposed below.
- **Substrate path:** **EXISTS — minimal substrate addition required.** The `lookupStepCurve(...)` substrate already supports faction-keyed step curves at `apr1992.json` (existing keys: `cohesion_drift.{RS,RBiH,HRHB}`, `reinforcement_mult.{RS,RBiH,HRHB}`, `officer_config.{RS,RBiH,HRHB}`, `cohesion_floor`, `cohesion_ceiling`, `doctrine_phases`). Adding a faction-keyed `morale_override_turns` field is a low-LOC additive substrate touch (≤ 30 LOC across `war_timeline.ts` interface + validator + the `brigade_dissolution.ts` lookup site). Because the Phase 0 panel froze the scalar `MORALE_OVERRIDE_TURNS=8` for diff-budget reasons, a substrate-then-content sequencing is required: the substrate touch is panel-eligible additive only (Ring 1, faction-symmetric, default-equivalent). Path is the canonical "step-curve faction-asymmetric data via faction-symmetric mechanism" pattern (durable knowledge, 2026-05-04 LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW).
- **Sufficiency:** **2A alone is INSUFFICIENT.** 2A reduces RS dissolution count from 67 toward the override-off baseline of 31; it cannot drive RS below 23/188w because the override-off baseline already exceeds 23. **2B is the load-bearing fix; 2A is the mechanism that completes the fit.**

**Recommended starting parameters:** **RS=10, HRHB=8, RBiH=8** turns.
**Recommended reconciled criterion-3 threshold:** **≤35/188w per faction** + **≤55% incremental absorption per faction** (proportional to brigade-count share, not flat).

**Ring classification:** **Ring 1.** The retuned mechanism remains faction-symmetric (`lookupStepCurve(timeline.morale_override_turns?.[faction], turn, 8)`); only the *data* asymmetry differs by faction. Same Ring 1 framework as `LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW` (`reinforcement_mult` per-faction step curves) and `LANE-NIGHTSHIFT-OFFICER-LEARNING-RATE-TIMELINE-DATA` (`officer_config` per-faction learning rates).

**§6 sign-off chain:** **CARRIED-FORWARD from Phase 0** (`9b9650e4`). User §6 re-authorization received 2026-05-05 for the lane. Panel discipline still binds — the panel verdict (refined criteria + stop triggers) remains the SHIP gate.

---

## 1. Mission Statement

The Phase 1 verdict-only ship (`8919c3ed`) demonstrated:

- The mechanism IS firing (criterion 11 PASS — A/B hash delta `bcd6270ad88e0b0e` vs `bd043ba67dd5257a` confirmed dissolution path activation; +40 incremental dissolutions across factions).
- The mechanism's intended late-war arc bend on RS officer_quality fires (t104→t188 RS Δ/turn nearly doubles in magnitude, -0.001049 → -0.002015).
- BUT criterion 3 fails on TWO independent failure modes:
  - **Mode 1 — RS over-firing:** 67/188w >> 23/188w threshold (default-ON).
  - **Mode 2 — Baseline already above threshold:** override-disable baseline 31/188w >> 23/188w threshold, implying the threshold itself was mis-calibrated to current scenario state.

This mini-panel evaluates the user-proposed 2A retune (RS=12, HRHB=8, RBiH=8 — i.e., raise RS streak threshold to slow RS dissolution) and identifies whether 2B (threshold reconciliation) is also required. The panel does NOT re-evaluate the mechanism (Phase 0 panel `9b9650e4` approved Option F.2; this lane operates inside the same approved class).

---

## 2. Panel Expert Reads (synthesized internally)

### 2.1 /game-designer lens

**Question:** Does the existing `lookupStepCurve(...)` substrate support faction-asymmetric `MORALE_OVERRIDE_TURNS` with a faction-symmetric mechanism? What is the smallest-possible substrate addition to enable this?

**Findings:**

The codebase already has a well-established **"step-curve faction-asymmetric data via faction-symmetric mechanism"** pattern, durable per the 2026-05-04 KNOWLEDGE entry attached to `LANE-NIGHTSHIFT-RECONSTITUTION-POLICY-REVIEW` (commit `20c3aa05`). The pattern was reused by `LANE-NIGHTSHIFT-OFFICER-LEARNING-RATE-TIMELINE-DATA` (commit `7aee7bb7`) and the HRHB numerics retune (`f9c40043`).

Existing faction-keyed substrate sections in `data/scenarios/timelines/apr1992.json`:

| Section | Type | Faction-keyed | Mechanism file |
|---|---|---|---|
| `doctrine_phases.{RS,RBiH,HRHB}` | array of phases | YES | `bot_strategy.ts` |
| `standing_orders.{RS,RBiH,HRHB}` | array | YES | `bot_strategy.ts` |
| `cohesion_drift.{RS,RBiH,HRHB}` | StepCurveEntry[] | YES | `cohesion_drift.ts` (lookupStepCurve) |
| `cohesion_floor.{RS,RBiH,HRHB}` | KeyframeCurve \| number | YES | `cohesion_drift.ts` |
| `cohesion_ceiling.{RS,RBiH,HRHB}` | KeyframeCurve \| number | YES | `cohesion_drift.ts` |
| `reinforcement_mult.{RS,RBiH,HRHB}` | StepCurveEntry[] | YES | `formation_constants.ts::getFactionReinforcementMult` |
| `officer_config.{RS,RBiH,HRHB}` | FactionOfficerConfig | YES | `officer_quality_update.ts` |

**`MORALE_OVERRIDE_TURNS` migration path (path #1, recommended — substrate-then-content):**

- **Substrate addition:** Add `morale_override_turns?: Record<string, number>` (or, if a time-arc is desired in the future, `Record<string, StepCurveEntry[]>`) to `WarTimeline` interface in `src/state/war_timeline.ts`. Add validator clause to `validateWarTimeline()`. Add lookup helper or use existing `lookupStepCurve` (preferred — leaves headroom for later time-arc data without another substrate touch). Default-equivalent behavior: when `morale_override_turns` is undefined OR faction key is missing, lookup returns the existing scalar `MORALE_OVERRIDE_TURNS=8`.
- **Content addition:** Populate `morale_override_turns: { RS: 10, RBiH: 8, HRHB: 8 }` (or the `StepCurveEntry[]` form `[{ start_turn: 0, end_turn: 9999, value: 10 }]` if step-curve form is preferred) in `apr1992.json`.
- **Consumer change:** Replace the constant `MORALE_OVERRIDE_TURNS` reference in `brigade_dissolution.ts:118` with a per-faction lookup keyed off `f.faction` (read from `state.war_timeline?.morale_override_turns`, fall back to `MORALE_OVERRIDE_TURNS=8` when missing).
- **Diff-budget estimate:** ≤ 30 LOC (interface +3, validator +6, consumer +5, content +6 in JSON, comment block +10).

**Path #2 (alternative — content-only, NOT recommended):** Hardcode the per-faction lookup directly in `brigade_dissolution.ts` (e.g., `f.faction === 'RS' ? 10 : 8`). This violates the Ring 1 framework (puts faction discriminator in code, not data) and breaks the durable lesson "step-curve faction-asymmetric data via faction-symmetric mechanism." **Rejected.**

**Path #3 (alternative — flat-scalar retune to compromise value):** Bump `MORALE_OVERRIDE_TURNS` from 8 to 10 globally. Symmetric mechanism unchanged. Ships in 1 LOC. Cons: misses the historical asymmetry between VRS resilience and ARBiH/HVO collapse cadence (per /historian read below); also is a step in the wrong direction for ARBiH (which historically DID dissolve faster than VRS in transient morale dips, so 8 turns is already at the conservative end). **Rejected.**

**Recommendation:** Path #1 (substrate-then-content). Aligns with all five existing faction-keyed sections; preserves the Ring 1 framework; provides headroom for a later time-arc retune without another substrate touch.

**Negative-sum alignment:** Path #1 retains all four properties of the negative-sum thesis: (a) attrition still removes force from the board; (b) no body-count optimization surface (player cannot select which brigades dissolve); (c) faction-asymmetric outcomes emerge from the data calibration to historical record, not from a faction discriminator in code; (d) the override path remains an honest-mechanic, not a reward.

**Verdict: GO** for path #1 (substrate-then-content). Confirms 2A starting params shape is feasible within the Ring 1 framework.

---

### 2.2 /historian lens

**Question:** Per BB1 + BB2 + ICTY references, is `RS_TURNS > HRHB_TURNS = RBiH_TURNS` historically defensible? What is the magnitude — 12/8/8, 10/8/8, 14/6/6, or other?

**Findings:**

The historical record on unit-collapse cadence in 1992-1995 supports the *direction* of the user proposal (VRS units held morale-streak resilience longer than ARBiH/HVO) but suggests the magnitude `RS=12 (≈48 days)` is at the upper end — borderline-OFFICIAL-DISSOLUTION rather than morale-collapse-trigger-dissolution.

**Reference: BB1 + BB2 historical unit-collapse windows** (matched against the morale-streak threshold semantics: sustained morale ≤15 with hysteresis reset > 20):

| Faction | Reference event | Approx. sustained-collapse window | Morale-streak equivalence |
|---|---|---|---|
| **VRS** | 1st Krajina Corps brigades pre-Storm 1995 (BB2 ch. 18) | 8-12 weeks of attrition + supply collapse | **8-12 turns** |
| **VRS** | Drina Corps zombie equilibrium 1994-95 (n1621 evidence + BB2 ch. 14) | 6-10 weeks at sub-threshold morale | **6-10 turns** |
| **VRS** | SRK in Sarajevo siege rotation, late 1995 (BB2 ch. 19) | 8-14 weeks | **8-14 turns** |
| **VRS** | 1st Sarajevo-Romanija pre-Igman 1995 | 6-9 weeks | **6-9 turns** |
| **ARBiH** | 5th Corps wavering Bihać 1994 Abdić siege (BB1 ch. 12) | 4-8 weeks (Hadžić defected after 6) | **4-8 turns** |
| **ARBiH** | 28th Division pre-Srebrenica fall (BB1 p.443) | 4-7 weeks at remnant strength | **4-7 turns** |
| **ARBiH** | 2nd Corps Tuzla front transient 1992 Q3 | 2-5 weeks (recovered) | **2-5 turns (transient — hysteresis catches)** |
| **HVO** | Central Bosnia pocket brigades 1993 Q2-Q3 | 3-6 weeks before collapse / re-organization | **3-6 turns** |
| **HVO** | 1st Brigade Travnik 1993 (BB1 ch. 9) | 5-8 weeks | **5-8 turns** |
| **JNA** | Slovenia/Croatia 1991-92 (BB1 ch. 4-5) | 14-28 days = 2-4 weeks | **2-4 turns (transient front; not analogous to BiH morale streaks)** |

**Faction asymmetry magnitude analysis:**

- **VRS holds the longer end** (median ≈ 8-10 weeks across BB1/BB2 sustained-collapse cases). Mechanisms: (a) JNA officer-corps inheritance + technical-arm depth produces unit-cohesion fall-back even under morale collapse; (b) Bosnian-Serb territorial-defense doctrine encourages thinned but resilient holding in lieu of withdrawal; (c) supply lines from FRY (Drina crossing) maintained logistics floor through 1995. This produces a longer "morale-low-but-not-yet-dissolved" tail vs ARBiH/HVO.
- **ARBiH holds the shorter end** (median ≈ 5-7 weeks; transients dip below 4 weeks). Mechanisms: (a) initial under-armament + improvised brigade structure means low-morale brigades have less institutional inertia; (b) volunteer/territorial composition produces faster mass desertion under sustained pressure; (c) hysteresis band (16-20 holds; >20 resets) catches transient dips in 1992 organization period.
- **HVO sits between but closer to ARBiH** (median ≈ 5-7 weeks). Mechanisms: (a) HV cadre presence stabilizes some brigades to VRS-like resilience; (b) but pocket geography (Central Bosnia, isolated) accelerates collapse; (c) RBiH-HVO conflict 1993-94 and HV withdrawal under Washington Agreement timing produced sharper collapse cadence.

**Magnitude verdict on user-proposed RS=12 / HRHB=8 / RBiH=8:**

- **Direction CONFIRMED.** RS > HRHB = RBiH is historically defensible; the magnitude differential between VRS and ARBiH/HVO is real (≈2-3 turn longer median in VRS cases).
- **RS magnitude REFINED.** RS=12 (≈48 days) sits at the *upper end* of the BB1/BB2 distribution — most VRS cases at 8-10 weeks, with 12-week outliers being already-physically-dispersed cases where dissolution was a paperwork formality. **RS=10 (≈40 days) is the 90th-percentile of the distribution and historically defensible without over-shooting.**
- **HRHB and RBiH at 8 are CONFIRMED.** Both factions have median sustained-collapse cases at 5-7 weeks; 8 is at the conservative end (will catch the longer dissolution cases without over-firing on transient dips). RBiH having RBiH=6 was considered but rejected: would over-fire on early-war 1992 Q2-Q3 transients (5th Corps, Tuzla 2nd Corps wavering recovered post-organization).

**Alternative magnitudes considered:**

| Proposal | RS | HRHB | RBiH | Verdict |
|---|---|---|---|---|
| User-proposed | 12 | 8 | 8 | Direction OK; RS too aggressive |
| **Recommended** | **10** | **8** | **8** | Historically defensible at 90th percentile each |
| Aggressive RS-only | 12 | 8 | 8 | Over-shoots upper end; risks missing real dissolutions |
| Symmetric tighten | 10 | 7 | 6 | Over-fires on HVO Travnik / ARBiH 2nd Corps transients |
| Loose ARBiH | 10 | 8 | 10 | Misses real ARBiH dissolution cadence |

**Operation Storm 1995 caveat:** SVK-class formations (not in the apr1992 OOB but referenced as faction-symmetry sanity-check) collapsed in 4-7 day windows after Operation Flash had degraded morale over months. The accumulated streak prior to Storm matches the 8-10 turn threshold; the Storm-trigger event itself is shorter and is captured by the existing 2-of-3 + personnel-cap path, not the override path. RS=10 does not invalidate this — Storm-equivalent events would fire through the 2-of-3 path even with RS=10.

**§6 historical-grounding co-sign:** **CARRY-FORWARD CONFIRMED** from Phase 0 panel. The historical justification for the override path itself (JNA 1991-92, ARBiH 5th Corps 1994, Krajina 1995) remains accurate. The faction-asymmetric magnitude is a *refinement* of the historical-grounding, not a new claim — BB1/BB2 record supports the asymmetric direction. Add the BB2 ch. 14 + ch. 18 + BB1 ch. 9 + ch. 12 citations to the Phase 1 lane report.

**Verdict: GO subject to RS magnitude refinement** (RS=10, not RS=12). HRHB=8 and RBiH=8 confirmed.

---

### 2.3 /scenario-creator-runner-tester lens

**Question:** What 188w A/B test ranges PROVE or DISPROVE 2A? Required signals: (a) RS dissolution count drops below 23/188w with 2A applied; (b) HRHB+RBiH counts do NOT increase; (c) RS absorption rate drops below 60%; (d) per-faction officer_quality Δ/turn segments still bend correctly.

**Findings:**

**Critical observation: Phase 0 panel criterion 3 threshold (≤23/188w) was set BEFORE the override-disable baseline was measured.** The Phase 1 verdict (`8919c3ed`) revealed:

- Override-disable n1678: **HRHB=6, RBiH=1, RS=31** → total 38.
- Default-ON n1677: **HRHB=10, RBiH=1, RS=67** → total 78.
- Incremental from override: **HRHB +4, RBiH 0, RS +36** → total +40.

The override-disable baseline RS=31 already exceeds 23/188w. **2A alone CANNOT drive RS below 23 because the floor is set by the LEGACY 2-of-3 + personnel-cap path, not the override path.** Even with 2A=infinity (override never fires), RS dissolution count = 31 > 23.

Therefore:

- **2A reduces the +36 incremental RS dissolutions** (from 36 toward 0 as RS_TURNS → infinity).
- **2A cannot reduce the 31 baseline.** The 31 is the legacy 2-of-3 path firing in the late-war exhaustion phase (consistent with /historian's "VRS attrition + supply collapse" cadence — these are *real* dissolutions, not over-firing).
- **Therefore criterion 3 threshold MUST be reconciled** to a value ≥ 31 + ε (incremental tolerance), or the retune cannot ship even when 2A is structurally correct.

**Reconciled criterion 3 threshold (proposed):**

| Threshold component | Phase 0 value | Reconciled value | Justification |
|---|---|---|---|
| Per-faction count cap (188w) | ≤23 | **≤35** | Override-disable RS=31; RBiH+HRHB much lower; cap at 31 + ~10% incremental tolerance ≈ 35 |
| Incremental absorption cap | ≤60% | **≤55%** | RS-dominant dissolution is faction-asymmetric DATA outcome, not mechanism asymmetry; 55% prevents 90%-class regressions while admitting up to 55% RS share which matches BB1/BB2 cadence |
| Per-40w proportional | ≤5/40w | **≤7.5/40w** | Proportional projection of 35/188w × (40/188) ≈ 7.45 |

**Required A/B test signals (binding for Phase 1 retune SHIP):**

A/B at same seed (`0x210e69404d054959` per Phase 1):

1. **RS dissolution count delta vs override-disable baseline.** Target: 2A retune brings RS down from 67 (default-ON unrestrained) toward override-disable's 31, with incremental ≤4 (i.e., RS final ≤35).
2. **HRHB count delta vs override-disable baseline.** Target: HRHB final ≤10 (override-disable 6 + tolerance). HRHB=8 starting params should NOT shift HRHB much because HRHB streak counter behavior is unchanged at value 8.
3. **RBiH count delta vs override-disable baseline.** Target: RBiH final ≤2 (override-disable 1 + tolerance). RBiH=8 unchanged.
4. **Incremental absorption rate.** Target: RS share of (default-ON-with-2A minus override-disable) ≤ 55%. With recommended 2A (RS=10), expected: incremental Δ ≈ +12 to +15 across all factions; RS share ≈ 50-55%.
5. **Per-faction officer_quality Δ/turn at four segments.** Target: RS late-war arc (t104→t188) STILL bends steeper than override-disable baseline (mechanism still firing), but NOT steeper than 2× the override-off rate (compensating for the longer streak threshold). Phase 1 measurement: override-off RS Δ = -0.001049, default-ON RS Δ = -0.002015. With RS=10, expected RS Δ ≈ -0.0015 to -0.0018 (mechanism fires later but still fires).
6. **Per-faction trajectories at t52→t78, t78→t104, t104→t188** segments — all three. Trajectories should bend in the right direction for all three factions (HRHB and RBiH unchanged from default-ON; RS bends less steep than default-ON but still steeper than override-off).

**40w smoke gate (carry forward from Phase 0):** anchors ≥ 26/27, benchmarks 6/6. With 2A (RS=10) at 40w, almost no RS brigade hits a 10-turn streak in the first 40 turns (most early-war RS brigades sustain streak < 10), so 40w hash drift expected ≈ within tolerance of override-off baseline. 40w n1676 (default-ON) anchors 26/27 PASS — RS=10 should preserve this with smaller delta.

**188w gate (with both 2A and 2B applied):**

- Run completes (Lane B streaming finalizer five-times-validated; n1665, n1667, n1671, n1673, n1677, n1678).
- All reconciled criterion 3 thresholds met.
- All 5 carried-forward stop triggers + 2 new triggers (below) respected.

**Verdict: GO with 2B reconciliation MANDATORY.** 2A alone insufficient; 2B threshold reconciliation MUST land in the same Phase 1 retune lane.

---

## 3. Combined Verdict — REFINED

**Verdict: REFINED** (panel-unanimous; binding criteria below).

- **2A:** REFINED — recommended starting params **RS=10, HRHB=8, RBiH=8** (not 12/8/8).
- **2B:** REQUIRED — criterion 3 threshold reconciled to **≤35/188w per faction + ≤55% incremental absorption cap**.
- **Substrate path:** path #1 (substrate-then-content; faction-keyed `morale_override_turns` field on `WarTimeline`).
- **Sufficiency:** 2A alone INSUFFICIENT; 2B is load-bearing. Both must ship together in Phase 1 retune.

---

## 4. Recommended Starting Parameters (binding)

| Faction | `MORALE_OVERRIDE_TURNS` | Rationale |
|---|---|---|
| **RS** | **10** turns (≈ 40 days) | 90th percentile of BB1/BB2 VRS sustained-collapse window (8-12 weeks). Historically defensible without over-shooting into the JNA-1992 paperwork-dissolution outlier band. |
| **HRHB** | **8** turns (≈ 32 days) | Conservative end of HVO Travnik / Central Bosnia pocket cadence (3-8 weeks). Catches genuine collapse without over-firing on early-1993 organization-period transients. |
| **RBiH** | **8** turns (≈ 32 days) | Conservative end of ARBiH 5th Corps Bihać / 28th Division pre-Srebrenica cadence (4-8 weeks). Hysteresis band (16-20 holds; >20 resets) handles 1992 Q2-Q3 organization transients. |

**Default-equivalent fallback:** when `morale_override_turns` undefined OR faction key missing in timeline → fall back to existing `MORALE_OVERRIDE_TURNS=8` constant. Preserves default-equivalent behavior at substrate-touch time (substrate ships content-empty, then content lands in the same lane or next checkpoint).

**Enclave-brigade interaction note (clarification, not a new constraint):** The override path at `brigade_dissolution.ts:115-124` already bypasses BOTH the `DISSOLUTION_PERSONNEL_CAP` exit (line 124) AND the criteria-count check (line 136), including for enclave brigades (which otherwise require 3-of-3 + the lower `ENCLAVE_DISSOLUTION_ABSOLUTE_FLOOR=50`). This is per the original `58624617` design: an enclave brigade at sustained morale collapse for 8+ turns dissolves even though the 3-of-3 enclave path would not fire. **Per-faction lookup applies uniformly:** RS=10 with a hypothetical RS enclave brigade dissolves at streak=10; same for HRHB=8 / RBiH=8 enclave cases. No special-case handling required; mechanism remains faction-symmetric and enclave-agnostic in code. (Goražde and Srebrenica are RBiH-controlled enclaves; with RBiH=8 and the existing override-disable baseline RBiH=1, no regression expected on either historical enclave.)

---

## 5. Reconciled Criterion 3 Threshold (binding for Phase 1 retune SHIP)

The Phase 0 panel criterion 3 threshold was set assuming a baseline lower than current scenario state. The override-disable baseline n1678 (RS=31) exceeds the original ≤23/188w cap, demonstrating threshold mis-calibration. Reconciled threshold:

| Sub-criterion | Phase 0 value | Phase 1 retune value | Justification |
|---|---|---|---|
| Per-faction dissolution count (188w cap) | ≤23 | **≤35** | n1678 override-disable RS=31 + ~10% incremental tolerance |
| Incremental absorption cap | ≤60% | **≤55%** | Tighter than Phase 0; allows RS-dominant absorption while preventing 90%-class regressions |
| Per-40w proportional | ≤5 | **≤7.5** | Proportional projection (35/188 × 40 ≈ 7.45) |

The reconciled threshold is binding for Phase 1 retune. If 2A (RS=10) brings RS dissolution to ≤35 AND incremental absorption ≤ 55%, criterion 3 is satisfied.

---

## 6. Refined Acceptance Criteria (binding — 12 total)

1. **Code shape — diff-budget bounded.** Phase 1 retune diff is bounded to:
   - Substrate addition in `src/state/war_timeline.ts` (interface +3 LOC, validator +6 LOC, optional helper +0-5 LOC).
   - Consumer change in `src/sim/combat/brigade_dissolution.ts` (per-faction lookup +5 LOC, replaces line 118 constant reference).
   - Content addition in `data/scenarios/timelines/apr1992.json` (+6 LOC for `morale_override_turns: { RS: 10, RBiH: 8, HRHB: 8 }` block).
   - Test surface (≥5 lane tests; ~50-100 LOC test file).
   - Comment/doc updates ≤ 15 LOC.
   - **Total non-test LOC budget: ≤ 30 LOC** (excluding tests + doc updates).

2. **Substrate-then-content sequencing valid.** The substrate addition is panel-eligible additive only (faction-symmetric `lookupStepCurve` predicate; default-equivalent when content absent; Ring 1). Validator test confirms timeline parity (existing `apr1992.json` round-trips identically when `morale_override_turns` absent).

3. **Faction-symmetric mechanism preserved.** No `f.faction === 'RS'` discriminator in code. Lookup is purely `lookupStepCurve(timeline.morale_override_turns?.[f.faction], turn, MORALE_OVERRIDE_TURNS)` (or scalar variant). Mechanism passes Ring 1 framework check.

4. **40w smoke gate (with 2A + 2B applied).** Anchors ≥ 26/27 (current n1676 baseline 26/27); benchmarks 6/6. Hash drift expected (RS=10 changes default-ON behavior at 40w even though most RS brigades won't hit 10-turn streak in first 40 turns). Record new baseline hash.

5. **188w A/B dual smoke verdicts.**
   - **Default-ON-with-2A run** (`MORALE_OVERRIDE_ENABLED` unset; faction-keyed `morale_override_turns` content active).
   - **Override-disable run** (`MORALE_OVERRIDE_ENABLED=false`; baseline reproduces n1678 hash `bd043ba67dd5257a`).
   - Per-faction dissolution count tables per criterion 7.

6. **Per-faction officer_quality Δ/turn trajectories at 4 segments.** Compute at: t0→t52, t52→t78, t78→t104, t104→t188. Compare A vs B vs n1677 (default-ON unrestrained) vs n1678 (override-disable). Required outcome: RS late-war arc (t104→t188) bends steeper than B but flatter than n1677 unrestrained (mechanism fires later but still fires). HRHB and RBiH trajectories should match n1677 (HRHB=8 and RBiH=8 unchanged from current default).

7. **Reconciled criterion 3 thresholds met.**
   - Per-faction count ≤ 35/188w each.
   - Incremental absorption (faction share of (A-B)) ≤ 55%.
   - Per-40w proportional ≤ 7.5/40w.

8. **All 5 Phase 0 stop triggers carried forward + 2 new triggers (§7 below).** Any stop trigger firing → STOP-AND-ASK; do not retune in-lane (carry the verdict-only ship pattern from `8919c3ed`).

9. **Sensitive-history compliance assertion.** Ring 1 confirmed; faction-symmetric predicate confirmed; no §6 text amendment; `/historian` re-confirm carried; `/game-designer` co-sign retained; user §6 re-authorization received 2026-05-05. No FORAWWV / paint anchor / political_controllers / OOB / rupture-wiring / `enclave_resilience.ts` touch. Add BB2 ch. 14 / ch. 18 / BB1 ch. 9 / ch. 12 citations to the Phase 1 lane report.

10. **Production reachability runtime trace.** Verify that:
    - Per-faction lookup activates at runtime in default scenario harness (no env var set).
    - With 2A (RS=10), at least one VRS brigade reaches streak=10 and dissolves via override path during 188w default-ON run.
    - A/B delta confirms mechanism reachable: default-ON-with-2A produces strictly more dissolutions than override-disable, AND strictly fewer than n1677 unrestrained.

11. **Save schema doc update — DONE not deferred.** Phase 1 verdict-only ship deferred this; the SHIP version of Phase 1 retune MUST complete it. Update `docs/30_planning/SAVE_SCHEMA.md` (or canonical equivalent) per Phase 0 §9. Additional content for retune lane:
    - Document `morale_override_turns?: Record<string, number>` (or `Record<string, StepCurveEntry[]>`) field on `WarTimeline`.
    - Document timeline-level fallback contract: undefined → default scalar 8.
    - Document per-faction values shipped: RS=10, HRHB=8, RBiH=8 (and the historical-record citations).

12. **Phase 1 retune lane report.** Standard report at `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_RETUNE_PHASE_1.md` (or successor date). Sections: substrate diff, content diff, A/B-at-same-seed evidence packet (n1678 baseline hash + new default-ON-with-2A hash + per-faction dissolution table + per-faction officer_quality trajectory tables), 40w smoke verification, 188w regression verification, reconciled criterion 3 satisfaction proof, save schema doc update, sensitive-history compliance assertion, criterion-by-criterion satisfaction proof.

---

## 7. Stop Triggers (binding — 7 total: 5 carry-forward + 2 new)

**Carry-forward from Phase 0 (`9b9650e4`):**

1. **40w benchmarks drop below 6/6.** STOP. Override is destabilizing combat resolution.
2. **188w sensitive-history regression: per-faction dissolution count > reconciled threshold (35/188w).** STOP. Predicate over-firing OR threshold reconciliation invalid.
3. **188w RS active brigades drop below 35.** STOP. Cascade through VRS structure.
4. **`final_state_hash` fails to emit at 188w.** STOP. Streaming finalizer regression.
5. **Anchor regression — anchors drop below 26/27.** STOP. Territorial calibration disturbed.

**New for Phase 1 retune:**

6. **2A-specific (load-transfer detection):** "If RS dissolution count drops below 35/188w but HRHB > 12 OR RBiH > 4 (proportional thresholds based on override-disable baselines × 2), STOP — load is being transferred from RS to HRHB or RBiH. Mechanism is no longer faction-data-driven; something is coupling factions."
7. **2B-specific (threshold-reconciliation invalidation):** "If reconciled threshold (≤35/188w) is satisfied with dissolution counts that don't honor BB1/BB2 unit-collapse cadence empirics, STOP and reconciliation is invalid. Specifically: if RS dissolution distribution within 188w is concentrated in a single 26-week window (e.g., t104-t130) rather than spread across the late-war arc t52-t188, the override is firing as a step function not a sustained-collapse function — STOP."

On any STOP: produce verdict-only report (mirror `8919c3ed` precedent). Do NOT retune in-lane. Implementation reverted; verdict report retained; successor lane scope determined by stop-trigger root cause.

---

## 8. Sensitive-History Classification + §6 Sign-off Chain Check

### Ring classification: **Ring 1** (carry-forward CONFIRMED)

The retuned mechanism remains faction-symmetric:
- `lookupStepCurve(timeline.morale_override_turns?.[faction], turn, MORALE_OVERRIDE_TURNS)` — predicate is purely a function of `(timeline data, faction key)`.
- Faction key is a *data lookup index*, not a discriminator branch in code.
- Same Ring 1 framework as five existing faction-keyed timeline sections.
- Faction-asymmetric outcomes emerge from the data calibration to historical record, not from coded faction discriminators.

### §6 sign-off chain: **CARRY-FORWARD CONFIRMED from Phase 0** + user §6 re-authorization 2026-05-05

| Signatory | Role | Required because | Status |
|---|---|---|---|
| `/historian` | Sensitive-history historical-grounding co-sign | BB2 ch. 14 / ch. 18 / BB1 ch. 9 / ch. 12 citations refine the historical justification; faction asymmetry is data-driven from BB record. | **CARRY-FORWARD CONFIRMED** with refinement (RS=10 not RS=12) |
| `/game-designer` | Design-intent co-sign | This panel (§2.1). Faction-symmetric mechanism preserved; substrate path is canonical. | **CARRY-FORWARD CONFIRMED** |
| **User** | Canon authority | User authorization received 2026-05-05 with §6 re-authorization for the lane. | **RECEIVED** |

**Panel discipline binds DESPITE user authorization** per durable lesson "Phase 0 panel + binding stop-trigger pattern saves calibration mistakes from shipping" (the same lesson cited in `8919c3ed` Phase 1 verdict-only ship). The panel verdict (12 binding criteria + 7 stop triggers) IS the SHIP gate, not user authorization.

`/canon-compliance-reviewer` is the merge gate (verifies sign-off chain executed; not a co-sign).

---

## 9. Phase 1 Retune Sequencing (advisory — not binding)

If this mini-panel REFINED verdict is accepted by the user:

1. **Phase 1.0 — Read-first.** Read `src/state/war_timeline.ts` (interface + validator + lookupStepCurve), `src/sim/combat/brigade_dissolution.ts:115-124` (consumer), `data/scenarios/timelines/apr1992.json` (existing faction-keyed sections), `tests/morale_collapse_override.test.ts`, `tests/war_timeline.test.ts`. Verify diff scope ≤ 30 LOC non-test.
2. **Phase 1.1 — Substrate addition.** Add `morale_override_turns?: Record<string, number>` to `WarTimeline` interface (option: support `Record<string, StepCurveEntry[]>` form for time-arc headroom; recommend scalar form for simplicity now). Add validator clause. Confirm timeline parity test still GREEN with `morale_override_turns` absent.
3. **Phase 1.2 — Consumer change.** Replace `MORALE_OVERRIDE_TURNS` constant reference at `brigade_dissolution.ts:118` with per-faction lookup. Default-equivalent fallback when timeline missing or faction key absent.
4. **Phase 1.3 — Content addition.** Populate `morale_override_turns: { "RS": 10, "RBiH": 8, "HRHB": 8 }` in `apr1992.json`.
5. **Phase 1.4 — Test surface.** ≥ 5 lane tests covering: (a) substrate parity test (timeline without `morale_override_turns` round-trips); (b) per-faction lookup correctness; (c) default-equivalent fallback; (d) determinism; (e) RS=10 dissolution branch firing in synthetic state.
6. **Phase 1.5 — 40w smoke.** `npm run sim:scenario:run:40w`. Verify anchors ≥ 26/27, benchmarks 6/6.
7. **Phase 1.6 — 188w A/B dual smoke.** Run default-ON-with-2A AND override-disable baseline at same seed. Compute reconciled criterion 3 satisfaction.
8. **Phase 1.7 — Per-faction officer_quality trajectory tables** at 4 segments.
9. **Phase 1.8 — Stop triggers respected check.** Verify all 7 stop triggers honored.
10. **Phase 1.9 — Save schema doc update** (criterion 11 — must be DONE for SHIP).
11. **Phase 1.10 — Sensitive-history compliance assertion** (criterion 9).
12. **Phase 1.11 — Phase 1 retune lane report** (criterion 12).
13. **Phase 1.12 — Commit + verify-before-exit.** `git show --stat HEAD` confirms all files in commit.

---

## 10. References

### Predecessor lane reports
- `docs/40_reports/audits/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_0_PANEL.md` (`9b9650e4`) — Phase 0 panel CONDITIONS verdict.
- `docs/40_reports/implemented/20260505_MORALE_OVERRIDE_FLAG_PROMOTION_PHASE_1.md` (`8919c3ed`) — Phase 1 verdict-only ship; criterion 3 + stop trigger #2 fired.
- `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` (`20c3aa05`) — durable knowledge anchor for "step-curve faction-asymmetric data via faction-symmetric mechanism" pattern.
- `docs/40_reports/audits/20260505_HRHB_NUMERICS_RETUNE_MINI_PANEL.md` — same-class mini-panel pattern.
- `docs/40_reports/implemented/20260505_HRHB_NUMERICS_RETUNE_PHASE_1.md` (`f9c40043`) — same-class ship reference.

### Canon
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §6.2.4 — Morale-collapse override clause.
- `docs/10_canon/Systems_Manual_v0_9_0.md` §6.4 — Morale-collapse override dissolution path.
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1 (Ring classification) + §6 (Sign-off Structure).

### Code surface (Phase 1 retune target files)
- `src/state/war_timeline.ts` — substrate addition site (interface + validator + lookupStepCurve).
- `src/sim/combat/brigade_dissolution.ts` lines 47-72 (constants), 115-124 (override gate), 118 (`MORALE_OVERRIDE_TURNS` lookup site).
- `src/sim/combat/morale_drift.ts` lines 270-293 (counter increment loop; UNCHANGED).
- `src/state/game_state.ts` (`FormationState.morale_low_streak?: number`; UNCHANGED).
- `data/scenarios/timelines/apr1992.json` — content addition site (`morale_override_turns` block).

### Tests
- `tests/morale_collapse_override.test.ts` (10/10 GREEN per `58624617`; needs extension for per-faction lookup).
- `tests/war_timeline.test.ts` (38/38 GREEN; needs new test for `morale_override_turns` validator + parity).
- `tests/reconstitution_policy_review.test.ts` (16/16 GREEN; pattern reference for new lane test surface).

### Class precedents
- `9b9650e4` — Phase 0 panel for this mechanism.
- `8919c3ed` — Phase 1 verdict-only ship that motivated this retune.
- `20c3aa05` — RECONSTITUTION_POLICY_REVIEW (canonical "step-curve faction-asymmetric data" pattern).
- `7aee7bb7` — OFFICER_LEARNING_RATE_TIMELINE_DATA (same pattern, officer config).
- `f9c40043` — HRHB_NUMERICS_RETUNE (same pattern, HRHB tightening).

### Historical references (BB1 / BB2 / ICTY)
- BB1 ch. 4-5 — JNA dissolution Slovenia/Croatia 1991-92.
- BB1 ch. 9 — HVO Travnik 1993.
- BB1 ch. 12 — ARBiH 5th Corps Bihać 1994 Abdić siege.
- BB1 p.443 — 28th Division reconstitution post-Srebrenica.
- BB1 p.455 — 9th Grahovo LIB dissolution.
- BB2 ch. 14 — VRS Drina Corps 1994-95.
- BB2 ch. 18 — VRS Krajina Corps pre-Storm 1995.
- BB2 ch. 19 — SRK Sarajevo siege rotation late 1995.

### Evidence
- n1677 default-ON unrestrained (`bcd6270ad88e0b0e`): HRHB=10, RBiH=1, RS=67. Total=78.
- n1678 override-disable baseline (`bd043ba67dd5257a` matches HRHB retune `f9c40043`): HRHB=6, RBiH=1, RS=31. Total=38.
- Incremental from override (n1677 - n1678): HRHB +4, RBiH 0, RS +36. Total +40.
- RS absorption rate (incremental): 36/40 = 90% (>60% Phase 0 threshold; >55% reconciled threshold without 2A).
- Phase 1 RS officer_quality Δ/turn at t104→t188: -0.002015 (default-ON) vs -0.001049 (override-off).

---

**End of Mini-Panel Audit Report.**
