# OQ-Growth Path Phase 0 Panel — CONDITIONS Verdict

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-QUALITY-GROWTH-PATH-PHASE-0-PANEL
**Type:** Read-only Phase 0 panel synthesis — verdict + recommended numerics + binding conditions for any future Phase 1.
**Audit-only.** No engine, scenario, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` touch. No combat-math number tuned in this lane.
**Scope:** Evaluates Fix Shape **B** (per-faction CADRE-REPLACEMENT-OPTIMISM TAX implemented as step-curve on `FACTION_LEARNING_RATE`) and Fix Shape **C** (cohort-experience formula replacement). Fix Shape A (per-faction `OFFICER_QUALITY_CAP` record) is **OUT OF SCOPE** per parent dispatch + cross-lane lesson "When two proximate levers both fail to bend a target arc, the defect is upstream of both — STOP investigating proximate levers." Per-faction caps are a third proximate lever; the parent dispatch correctly excludes them.

---

## Predecessor Chain (binding context)

1. `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` (Wave 3, commit `20c3aa05`) — Gap 2 trace; named the casualty path as the proximate lever for tuning.
2. `docs/40_reports/implemented/20260504_RECONSTITUTION_POLICY_REVIEW.md` (Wave 4, commit `e9584dd3`) — `getFactionReinforcementMult` step-curve; faction-symmetric mechanism via `lookupStepCurve(...)`. **The canonical step-curve precedent this panel mirrors.**
3. `docs/40_reports/implemented/20260504_RECONSTITUTION_188W_VERIFICATION.md` (Wave 6, commit `cc829ebb`) — DISPROVED Wave 4 hypothesis at 188w.
4. `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` (Lane A panel, commit `7c3792d7`) — CONDITIONS verdict; recommended `RS:2.5/HRHB:2.0/RBiH:1.0`. **Pattern this report mirrors.**
5. `docs/40_reports/implemented/20260505_OFFICER_CASUALTY_MULT_PHASE_1.md` (Lane A redo, commit `411f6843`) — VERDICT-REPORT-ONLY; implementation reverted under panel criterion 8 stop trigger after 188w trajectory failure (VRS Δ/turn = +0.00059, HRHB = +0.00218, RBiH = +0.00396). **Proves the panel-with-stop-trigger pattern works.**
6. `docs/40_reports/audits/20260505_OFFICER_QUALITY_GROWTH_PATH_AUDIT.md` (this lane's parent audit, commit `a4b71ac5`) — named the defect; produced n1665 stayer-Δ attribution showing growth dominates faction-mean drift ~3:1 (HRHB 77.6%, RBiH 63.2%, RS 74.4%). FULL READ.

## Cross-Lane Finding (load-bearing for this panel)

> **When two proximate levers both fail to bend a target arc, the defect is upstream of both.**

Wave 4 `getFactionReinforcementMult` (per-faction reinforcement budget) and Lane A `OFFICER_CASUALTY_MULT` (per-faction casualty-side multiplier) both DISPROVED on 188w trajectory. The parent audit n1665 attribution proves the defect is in the per-brigade growth code itself (`updateBrigadeOfficerQuality:164-170`) — stayer Δ/turn ≈ faction Δ/turn for all three factions, demonstrating per-formation growth (not survivorship) drives the ~3:1 ratio. Fix Shape B and Fix Shape C operate on the growth code directly. The per-faction CAP (Fix Shape A) is a third proximate lever; correctly excluded from this panel's scope.

## Source Surface (read-only inspection)

`src/sim/combat/officer_quality_update.ts:164-170` — the named defect site:

```ts
if (inCombat) {
    const growth = combatGrowthPerTurn * (1.0 - quality * 0.5);
    quality += growth;
} else if (onFrontline) {
    const growth = frontlineGrowthPerTurn * (1.0 - quality * 0.5);
    quality += growth;
}
```

Where `combatGrowthPerTurn = COMBAT_GROWTH_BASE × FACTION_LEARNING_RATE[faction]` (`:146`) and `FACTION_LEARNING_RATE: Record<string, number> = { RBiH: 1.5, RS: 0.7, HRHB: 1.0 }` (`:63-67`).

Step-curve precedent (`src/state/formation_constants.ts:222-225`):

```ts
export function getFactionReinforcementMult(faction: string, turn: number, timeline?: WarTimeline): number {
    if (timeline?.reinforcement_mult?.[faction]) {
        return lookupStepCurve(timeline.reinforcement_mult[faction], turn, 1.0);
    }
    // Hardcoded fallback ...
}
```

`lookupStepCurve(entries, turn, defaultValue)` (`src/state/war_timeline.ts:107-113`) — sequential scan, deterministic for sorted entries, no randomness, accepts numeric `value` field of any sign. **The mechanism imposes no constraint on the sign of the data.** Wave 4 used positive multipliers; Fix Shape B requires extending the data range to include negative values, but the predicate is unchanged.

---

## Panel Member 1 — /game-designer

**Skill file:** `.claude/skills/game-designer/SKILL.md`
**Authority:** Design intent and mechanic consistency with Game Bible / Rulebook; canon interpretation; Ring boundary interpretation under `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md`.
**Question:** Does Fix Shape B (negative-going `FACTION_LEARNING_RATE` step-curve) align with the negative-sum thesis (Game Bible §1, §13, §17–§18)? Does it cross any §6 surface? Is it Ring 1, Ring 2, or Ring 3? Verdict on whether B should ship vs C alternative.

### Findings

**Negative-sum thesis alignment (Game Bible §1, §13, §17–§18):** Game Bible §1 establishes the war as a *"negative-sum process in which all actors operate under compounding political, military, and societal constraints."* §13 makes exhaustion the *"primary strategic currency."* §17 enumerates invariants: *"no retroactive legitimacy, no unitless control, no cost-free violence, and no purely military solutions."* §18 *"thematic coherence"*: *"This is a war without victory. The simulation models exhaustion, constraint, and negative-sum conflict. Military power matters but never resolves the war alone. Political collapse is as dangerous as military defeat."*

The current growth code (`updateBrigadeOfficerQuality:164-170`) *positively* feeds force quality every turn for every active frontline / engaged brigade across ALL factions. It cannot model degradation. This is misaligned with §13/§18: military power has no decay term in the per-formation growth path. Fix Shape B introduces the **first faction-symmetric mechanism that allows force quality to actively decline as a function of cumulative war duration**. This aligns with the negative-sum thesis: officer cadre is a *finite, exhaustible* resource that gets *worse* under sustained pressure, not just plateau at a cap. Fix Shape B is more thesis-aligned than Fix Shape A would be (which only flatlines).

**Ring classification (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1):**

Ring 1 — modeled mechanically. The growth path is already a Ring 1 mechanic. Negative test against §1.5 Ring 3 prohibitions:

| §1 Ring 3 prohibition | Crosses? |
|---|---|
| #1 commit genocide decision tree | No — no player surface |
| #2 concentration camp system | No |
| #3 negotiable condemnation | No — no rupture flag touched |
| #4 body-count optimization surface | No — Pyrrhic score not inverted |
| #5 atrocity efficiency metric | No — officer_quality is force-quality, not territorial-gain coupling |
| #6 alternate-history minimization | No |
| #7 ranking factions by atrocity | No |
| #8 granular victim attribution | No |
| #9 justified atrocity framing | No |
| #10 gamified prevent-genocide | No |
| #11 calendar-driven atrocity recording | **No — but adjacent.** The step-curve is calendar-keyed (turn brackets) but governs force-quality decline, NOT atrocity recording. §1.5 #11 explicitly forbids calendar-driven *atrocity* recording (rupture/condemnation flags). Force-quality decay keyed off `turn` is canonically permitted (Wave 4 `reinforcement_mult` step-curve precedent already shipped this exact shape). The directional distinction is binding: calendar→atrocity = forbidden; calendar→force-quality = permitted. |

§6 sign-off chain (`SENSITIVE_HISTORY_DESIGN_GATE.md` §6) review row-by-row:
- New rupture? No.
- Change to rupture trigger? No.
- New atrocity event? No.
- Change to atrocity event content? No.
- New condemnation flag? No.
- Paramilitary policy surface change? No.
- Cost Ledger wording change? No.
- New essay? No.
- Change to enclave mechanics? No.
- "Reward for atrocity" effect? No — officer_quality is internal combat-math, decoupled from `war_crimes_record` (Engine Invariants §15.2 binding informational-only).

**§6 sign-off chain: NOT TRIGGERED.**

**Faction-symmetric mechanism / asymmetric data precedent:** Wave 4 `getFactionReinforcementMult` (commit `e9584dd3`) is the canonical precedent. Per `20260504_RECONSTITUTION_POLICY_REVIEW.md`: the mechanism is `lookupStepCurve(...)` — a single faction-agnostic predicate; only data parameters drive asymmetry. RBiH 4-band, HRHB 4-band, RS 4-band — all read by the same predicate. The Wave 4 lane shipped on this precedent and 40w n1638 hash `ef03ab4d6c5ecd28` was clean (anchors 26/27, benchmarks 6/6, area 93.3%).

**Fix Shape B = step-curve over `FACTION_LEARNING_RATE` mirrors this precedent exactly.** The mechanism is faction-agnostic (single accessor); the data parameters drive faction asymmetry; the step-curve mechanism `lookupStepCurve` already in tree handles the bracket structure deterministically. The structural difference vs Wave 4: data range extends to negative values. The mechanism's contract on the value field is `number` (no sign constraint per `war_timeline.ts:80-84` `StepCurveEntry` shape — `value: number`).

**Fix Shape C (cohort-experience replacement) — design assessment:** Doctrinally most accurate; directly models cadre-replacement-quality erosion. But:
1. Restructures the growth math itself (not just data), invalidating the Wave 4 precedent's faction-symmetric-mechanism shape.
2. Touches `recruitment_engine.ts`, `formation_spawn.ts`, `brigade_reconstitution.ts` — three additional surfaces beyond `officer_quality_update.ts`.
3. Requires new state field tracking `personnel_replaced_this_turn` per formation OR new derivation from existing fields — serialization / hash-stability surface change.
4. **Phase 1.5 design review trigger:** the parent audit §5.1 explicitly flags Fix C as *"largest implementation surface; high calibration regression risk; would invalidate the 40w hash baseline broadly."* The parent audit panel scaffold (§7.1 question 3) explicitly asks whether C requires Phase 1.5 design review with Game Bible / Rulebook authority before any code lands. **My answer: yes.** Fix C should not ship in the immediate Phase 1 lane following this panel; it should be deferred to a B-then-C-future track if B fails to bend the arc.

**One concern flagged for Phase 1 (Fix B):** the negative-going step curve must respect the `OFFICER_QUALITY_FLOOR=0.05` clamp at line 179 — this floor is the structural backstop that prevents officer_quality from going negative. With negative growth multipliers, the floor will start to bind for VRS/HRHB late-war, which is the design intent. The floor must NOT be lowered (Fix B out-of-scope guard #2 below).

### Verdict on Fix Shape B: **GO** — Ring 1, faction-symmetric mechanism, faction-asymmetric data; mirrors Wave 4 step-curve precedent shape; aligns with Game Bible §13/§18 negative-sum thesis (first per-formation force-quality decay path)

### Verdict on Fix Shape C: **DEFER** — doctrinally most accurate but largest implementation surface; requires Phase 1.5 design review and would invalidate the 40w hash baseline broadly; recommend B-first track, defer C as future-successor lane if B fails

### Recommended numerics for Fix Shape B (step-curve bands per faction)

Following the Wave 4 reinforcement-mult 4-band shape:

| faction | <w52 | w52–w77 | w78–w103 | w104+ | rationale |
|---|---|---|---|---|---|
| RBiH | 1.5 | 1.5 | 1.5 | 1.5 | **CONTROL** — preserves canonical professionalization arc; should not be touched (parent audit §7.5 explicit); Δ/turn already on doctrinal +1 sign |
| RS | 0.7 | 0.4 | 0.0 | -0.4 | VRS late-war cadre erosion: 1992 baseline → reduced growth → flat → decline through 1995 |
| HRHB | 1.0 | 0.7 | 0.3 | -0.2 | HRHB intermediate: HV-rotation plateau through Federation transition; smaller absolute decline than VRS |
| DEFAULT | 1.0 | 1.0 | 1.0 | 1.0 | preserves byte-stability for non-canonical faction codes |

These numerics mirror the parent audit's illustrative bands (parent dispatch §"THREE CANDIDATE FIX SHAPES" Fix B example) with the two adjustments grounded in /historian and /scenario-creator-runner-tester findings below.

### Concerns flagged
1. Phase 1 must promote `FACTION_LEARNING_RATE` from `Record<string, number>` to step-curve format (`Record<string, StepCurveEntry[]>`) AND provide a faction-agnostic accessor `getFactionLearningRate(faction, turn): number` with `?? DEFAULT` fallback. No `if (faction === 'RS')` branches anywhere. Mirrors `getFactionReinforcementMult` shape.
2. The hardcoded fallback in `officer_quality_update.ts:146` (`COMBAT_GROWTH_BASE * (FACTION_LEARNING_RATE[faction] ?? 1.0)`) must route through the new accessor; the existing `timelineConfig.learning_rate_per_turn` / `learning_rate_multiplier` / `learning_rate` precedence chain (`:138-145`) must be preserved, with the accessor taking priority over the step-curve fallback ONLY if no timeline config is provided. Phase 1 must not regress timeline-overridden faction configs.
3. Tone alignment: this lever encodes "VRS replacement cadre is increasingly drawn from short-course reservists / non-JNA-academy officers through 1994-95" (per /historian below). It is a doctrine-grounded arithmetic statement, not a narrative claim. No Cost Ledger string changes are required (§4 wording constraints unaffected).

---

## Panel Member 2 — /historian

**Skill file:** `.claude/skills/historian/SKILL.md`
**Authority:** Bosnian war historical knowledge derived from Balkan Battlegrounds + ICTY-cited primary sources. Authority for "what does the record say?"
**Question:** Are negative late-war learning rates historically defensible? VRS cadre quality through 1994-95 (cumulative casualties of experienced officers; conscription dilution); HVO 1994-95 reorganization effect on officer corps; ARBiH professionalization arc. Cite ICTY / Balkan Battlegrounds where applicable. Verdict on numerics shape.

### Findings

**VRS late-war cadre erosion 1994-95 — historically defensible (per BB1/BB2 + Lane A panel /historian section, commit `7c3792d7`):**
- VRS inherited the JNA Sarajevo command structure on 12 May 1992. Initial cadre depth was high — career JNA officers at Corps and Army HQ levels, technical specialists across artillery/armor/signals/engineering. (BB1 timing canonical.)
- Through 1992-1993, VRS sustained heavy combat in Posavina corridor + Drina + Krajina; cadre attrition was real. OOB master `VRS_ORDER_OF_BATTLE_MASTER.md` documents progressive officer reassignments to fill gaps. (BB1 extensive Posavina campaign coverage.)
- By 1994-1995, mobilization shortfall was severe: Republika Srpska conscription crisis, draft-evasion to FRY, exhaustion of reservist pool. Replacement officers were drawn from short-course reserves, NOT JNA-academy cadre. (BB2 chapters on RS late-war manpower.)
- **The empirical phenomenon is not "JNA cadre dies and is replaced one-for-one"; it is "JNA cadre dies and the surviving JNA cadre + new short-course replacements together produce LOWER per-formation officer_quality than the cadre at any prior point."** This is precisely what a negative-going learning rate models: NEW combat experience accruing to CADRE that is increasingly drawn from lower-quality replacement streams produces NET DECLINE, not net growth.
- The proposed `RS: 0.7 → 0.4 → 0.0 → -0.4` step-curve encodes: w0-51 doctrinal baseline (JNA professionalism slowly absorbing combat); w52-77 reduced absorption rate (cadre attrition starting to bite); w78-103 zero net growth (replacement cadre quality matches the experience-absorption rate; equilibrium); w104+ active decline (replacement cadre worse than the absorption rate; doctrinally correct for 1994-95 RS conscription crisis).

**HVO 1994 Federation transition — historically defensible:**
- HVO experienced parallel pressures: Lasva Valley operational losses through 1993 (Ahmići, Stupni Do, Vitez); Washington Agreement transition (March 1994, w92-93) that rerouted some officers to ARBiH-Federation structures; chronic NATO-quality patron influence variance from HV (Croatian Army). OOB master `HVO_ORDER_OF_BATTLE_MASTER.md` documents corps-structure pressure during this window.
- Smaller initial cadre than VRS; smaller absolute decline; intermediate magnitudes appropriate. The proposed `HRHB: 1.0 → 0.7 → 0.3 → -0.2` step-curve encodes: w0-51 baseline HV-rotation plateau; w52-77 Lasva Valley operational losses absorbing (reduced growth); w78-103 Federation-transition rotation plateau; w104+ slight active decline (HV politicization through 1994-95).

**ARBiH professionalization arc — historically defensible; CONTROL faction:**
- ARBiH transitioned from rabble (TO improvisation, militia-leader cadre, April-June 1992) to mature corps (II Tuzla, V Bihać, I Sarajevo professional structures by 1994-1995). OOB master `ARBIH_ORDER_OF_BATTLE_MASTER.md` documents structural evolution.
- The empirical phenomenon: locally-promoted-from-combat replacement officers were HIGHER quality than the militia-leaders they replaced. Combined with the strong learning rate (`FACTION_LEARNING_RATE.RBiH = 1.5`), this produces the doctrinal "rabble-to-corps" arc cleanly.
- **Recommendation: do NOT touch RBiH numerics.** Constant `1.5` across all bands preserves the n1665 measured RBiH stayer Δ/turn = +0.004019/turn (parent audit §4.2), which is exactly the doctrinally-correct rabble-to-corps trajectory (climbs from 0.087 t1 → 0.831 t188; matches the 0.05–0.85 expected canonical band).

**BB-citation strengthening for Phase 1 lane report (recommended, not blocking):**
- The directional claim (VRS/HRHB late-war replacement cadre is lower-quality than cadre it replaces) is doctrine-grounded but the parent audit and Lane A panel did not produce specific BB volume/page citations. Phase 1 lane report should add a citation block grounding:
  - VRS conscription crisis 1994-95 (BB2; specific volume/page TBD by /historian during Phase 1 dispatch)
  - HVO Federation-transition rotation impact 1994 (BB1 + BB2 chapters on Washington Agreement aftermath)
  - ARBiH local-promotion pattern 1993-95 (BB2 II Tuzla / V Bihać corps maturation)
- Numeric magnitudes are trace-grounded (n1665 stayer-Δ data) and parent-audit-grounded (§5.1 illustrative bands); BB citations strengthen the directional grounding without affecting the magnitudes.

**Atrocity-as-tactic check (§1 #4, #5, #9):** The proposed lever does NOT couple officer quality to civilian-casualty events, paramilitary-sweep approvals, or any §3 player-authorized war-crime surface. It is a calendar-keyed force-quality lever; calendar-keying force quality is canonically permitted (Wave 4 step-curve precedent), distinct from §1.5 #11's prohibition on calendar-keying ATROCITY recording. Satisfies §1.5 #4 (no body-count optimization), #5 (no atrocity-efficiency metric), #9 (no justified-atrocity framing). No interaction with `war_crimes_events`, `genocide_condemnation`, paramilitary mechanics, or `war_crimes_record` (Engine Invariants §15.2 binding informational-only).

**Cost Ledger §4 wording check:** No new player-facing string surfaces are introduced. The lever is internal to combat math.

**Fix Shape C historical review:**
- Cohort-experience replacement directly models the empirical phenomenon (replacement-cadre quality dilutes per-formation officer_quality at the moment of replacement, NOT calendar-spread). This is doctrinally MORE accurate than Fix B's calendar-keyed approach.
- However, modeling cohort-experience directly requires the engine to track per-formation `personnel_replaced_this_turn` and weight it against `personnel_total` to compute a dilution coefficient. This couples officer_quality to the reconstitution / mobilization paths in a way that the current code does not — the dilution effect would fire on every reconstitution event, every mobilization spawn, every reinforcement absorption.
- **Historical defensibility caveat:** the cohort-experience model presupposes that the engine's reconstitution + mobilization pipelines correctly model the historical replacement quality (i.e., that VRS reconstitution actually pulls from a "lower-quality short-course reserve pool" in the engine). If they don't, Fix C will not bend the arc either; it will just shift the defect upstream to the reconstitution pipeline.
- **Recommendation: defer Fix C** — Phase 1 should ship Fix B first; if Fix B fails to bend the 188w arc, the next investigation is whether the reconstitution pipeline actually models cadre-replacement quality before Fix C ships.

### Verdict on Fix Shape B: **GO** — historically defensible; non-atrocity surface; numerics directionally correct

### Verdict on Fix Shape C: **DEFER** — doctrinally most accurate but presupposes correct upstream reconstitution-pipeline modeling; ship B first, defer C as future-successor lane

### Recommended numerics for Fix Shape B (concur with /game-designer with one strengthening note)

| faction | <w52 | w52–w77 | w78–w103 | w104+ |
|---|---|---|---|---|
| RBiH | 1.5 | 1.5 | 1.5 | 1.5 |
| RS | 0.7 | 0.4 | 0.0 | -0.4 |
| HRHB | 1.0 | 0.7 | 0.3 | -0.2 |
| DEFAULT | 1.0 | 1.0 | 1.0 | 1.0 |

**Strengthening note on band boundaries:** The Wave 4 reinforcement-mult chose w52/w78/w104 as bracket boundaries. These align historically with: w52 = early 1993 (post-formation-establishment), w78 = mid 1993 (Lasva Valley + corridor consolidation), w104 = early 1994 (Federation Agreement, Washington). For OQ-Growth Path Phase 1, the same bracket boundaries are the appropriate choice — they align with the historical cadre-erosion phases identified above, AND match the Wave 4 precedent shape exactly (faction-symmetric mechanism / consistent bracket boundaries across multiple step-curve data tables).

### Concerns flagged
1. Phase 1 lane report should add a BB-citation block grounding the directional claim (VRS/HRHB late-war cadre erosion) at volume/page level. Numeric magnitudes are trace-grounded; BB citations strengthen the directional grounding without affecting numerics.
2. The lever does not directly model UNPROFOR officer-liaison effects, comms-quality asymmetry, or per-brigade ammo scarcity (per `MEMORY.md` "P0 historical gaps"). Those remain separate calibration handoffs and are not in scope here.
3. The lever is independent of the `war_crimes_record` informational-only invariant (Engine Invariants §15.2). Phase 1 must not couple officer_quality to `war_crimes_record` in any direction (§15.2 binding).

---

## Panel Member 3 — /scenario-creator-runner-tester

**Skill file:** `.claude/skills/scenario-creator-runner-tester/SKILL.md`
**Authority:** Scenario harness, run interpretation, calibration regression assessment, ahistorical-result flagging.
**Question:** What calibration regression is required for each fix shape? 40w anchors / benchmarks tolerance bands; 188w trajectory shape (per-formation stayer Δ/turn ≤0 for VRS+HRHB; RBiH continues canonical positive arc); 188w final state hash drift expected; 5 stop triggers from audit §7.7. Recommended Phase 1 acceptance gate band sizes.

### Findings

**Current calibration baseline:**
- 40w n1640: hash `ef03ab4d6c5ecd28`, anchors 26/27 (only `op:brcko:brka_2` failing — pre-existing P0, unrelated to officer-quality), benchmarks 6/6, area-weighted 93.3%.
- 40w hash post-Lane-A-implementation (n1665 predecessor): `4d2a55f6afa75254` (drift expected per Lane A panel; not a gate).
- 188w hash gates dispatchable post-Wave-7-Lane-B streaming finalizer (Lane A redo n1665 first successful full-emit 188w `final_state_hash = 6d3ff5b4669ccb80`).
- New diagnostic available: `tools/diagnostics/officer_quality_growth_trace.cjs` (parent audit ship). This is the binding gate Lane A could not test — per-formation stayer-Δ attribution.

**Hash-drift expectation:** Fix Shape B will drift the 40w hash. The drift is the point — the lever exists to bend the late-war arc that the 188w trajectory exposed. Hash drift is **expected, not a stop trigger**, per the Wave 4 + Lane A precedent. However, the drift must remain **bounded**: anchor count and benchmark count must not degrade. Fix Shape B's 40w drift expected to be smaller than Fix Shape C's (B is data-only on existing predicate; C is mechanism replacement).

**Per-faction trajectory expectation (Fix Shape B):**

For Fix Shape B at the recommended numerics, the predicted 188w trajectory (extrapolating from n1665 stayer-Δ data + linear projection of the new step-curve product `COMBAT_GROWTH_BASE × FACTION_LEARNING_RATE_step_curve(turn)`):
- VRS surviving brigades: stayer Δ/turn shifts from current +0.000463 toward decline in w104+ band (combat term `0.01 × -0.4 = -0.004` plus `0.005 × -0.4 = -0.002` frontline; over the w104-w188 span = 84 turns × ~−0.003/turn = ~−0.252 ceiling-pushing decline). Net 188w whole-run VRS stayer Δ/turn projected: roughly **−0.001 to +0.001** (i.e., bending nonpositive or near-zero).
- HRHB surviving brigades: stayer Δ/turn shifts from current +0.002224 toward decline in w104+ band (84 turns × ~−0.0015/turn = ~−0.126). Net 188w whole-run HRHB stayer Δ/turn projected: roughly **+0.0005 to +0.0010** (i.e., much closer to zero but possibly still positive). **This may not bend HRHB stayer Δ/turn fully nonpositive.** If the HRHB step-curve is insufficient, criterion 3 (HRHB faction Δ/turn ≤0) may FAIL even on Fix Shape B; Phase 1 must either ship and verify, or pre-tune HRHB w104+ deeper (e.g., −0.4 instead of −0.2). My recommendation: ship the recommended numerics and let the 188w smoke be the verdict — if HRHB criterion 3 fails, the stop trigger fires and a follow-up lane re-tunes HRHB band depths only.
- RBiH surviving brigades: unchanged trajectory; stayer Δ/turn = +0.004019/turn doctrinal arc preserved (control-faction sanity check).

**The new binding gate Lane A and Wave 6 could not test:**

The parent audit's stayer-Δ diagnostic (`tools/diagnostics/officer_quality_growth_trace.cjs`) IS the per-formation-level test of whether the fix actually constrains per-formation growth (not just faction-mean drift via cohort-turnover survivorship). This is criterion 4 in the parent audit's scaffold (§7.6 stop trigger #2). **Phase 1 MUST run this diagnostic on the 188w output and gate on per-formation stayer Δ/turn for VRS+HRHB.**

If the faction-mean Δ/turn bends nonpositive but the stayer Δ/turn does NOT, that means survivorship contamination has finally bitten — the fix is filtering low-quality cadre out of the active set rather than constraining per-formation growth. This is the canonical failure mode the parent audit anticipated; the stayer-Δ gate catches it.

**Acceptance gate proposal — full calibration regression required:**

| Gate | Current baseline (Lane A redo n1665) | Phase 1 (Fix B) ship requirement | Rationale |
|---|---|---|---|
| 40w anchors | 26/27 PASS | **≥ 26/27 PASS** (no new failures beyond pre-existing brka_2) | Anchor count is primary stability metric |
| 40w benchmarks | 6/6 PASS | **6/6 PASS** | Benchmark band is bot-behavior calibration floor |
| 40w area-weighted | 93.3% (n1640) | **≥ 91.5%** (≥ -1.8pp tolerance) | Fix B perturbs growth code which is read every turn for every active brigade; tolerance band 1pp wider than Lane A's -0.8pp because the perturbation is on a per-turn-per-formation surface, not a per-battle surface |
| 40w hash | `ef03ab4d6c5ecd28` | DRIFT EXPECTED — NOT A GATE | Lane intent is to drift |
| 40w faction OSID counts | RS=381, RBiH=245, HRHB=86 | Within ±5 OSIDs per faction | Sanity check that early-war dynamics aren't perturbed |
| 188w `final_state_hash` | Available post-Wave-7 Lane B | **Must emit** (no OOM during summary write) | Wave 7 Lane B unblocked this gate |
| **188w VRS faction-mean officer_quality whole-run Δ/turn** | +0.000597 (n1665 baseline; +0.000775 Wave 6 baseline) | **≤ 0** (nonpositive; doctrinal sign -1) | Primary success criterion |
| **188w HRHB faction-mean officer_quality whole-run Δ/turn** | +0.002192 (n1665 baseline; +0.002225 Wave 6 baseline) | **≤ 0** (nonpositive; doctrinal sign -1) | Primary success criterion |
| 188w RBiH faction-mean officer_quality whole-run Δ/turn | +0.003979 (n1665 baseline; +0.003865 Wave 6 baseline) | **≥ +0.001** (positive; control-faction; slight slowdown allowed) | Control-faction sanity check |
| **188w VRS STAYER Δ/turn** (NEW BINDING GATE — `officer_quality_growth_trace.cjs`) | +0.000463 (n1665) | **≤ 0** (nonpositive) | The per-formation gate Lane A could not test; THIS is the binding criterion that disambiguates per-brigade-growth-fix from survivorship-artifact |
| **188w HRHB STAYER Δ/turn** (NEW BINDING GATE) | +0.002224 (n1665) | **≤ 0** (nonpositive) | Same |
| 188w RBiH STAYER Δ/turn | +0.004019 (n1665) | **≥ +0.001** (positive) | Control-faction sanity check at per-formation level |
| 188w RS active brigade count | 51 (n1665) | **≥ 35** (no catastrophic dissolution cascade) | Must not destroy the VRS via officer-quality-driven cohesion drag into MORALE_OVERRIDE_TURNS dissolution |
| Existing tests | All GREEN | **≥ 5 new lane tests + GREEN focused regression** (officer_quality_update, attack_post_battle_effects, attack_resolution_osid clusters; war_timeline lookupStepCurve clusters) | Test suite is the floor |
| `npx tsc --noEmit` | clean | clean | Type-check is binding |

**Plausibility check (Fix B at recommended numerics):**
- VRS at quality 0.55 (current t1 mean) running on the new step-curve through 188 turns: w0-51 growth of `0.7 × COMBAT_GROWTH_BASE × dampener × ~52 turns` ≈ +0.18 (climbs to ~0.73); w52-77 growth at 0.4× ≈ +0.05; w78-103 zero growth flatline; w104-188 decay at -0.4× ≈ -0.15 (back down to ~0.63). Then COUPLED with the existing casualty-side decay term, the t188 outcome would land in the 0.30-0.50 band, doctrinally correct for VRS late-war.
- HRHB at quality 0.227 (current t1 mean) running on the new step-curve: similar arc; w0-51 climb to ~0.40, w52-77 to ~0.43, w78-103 plateau, w104-188 slight decline to ~0.36. Plus casualty decay → 0.20-0.30 band, doctrinally correct.
- RBiH at quality 0.087 (current t1 mean) running unchanged 1.5×: climbs to ~0.85 by t188 (clamped at OFFICER_QUALITY_CAP=0.90). Doctrinal arc preserved.

**The arcs are plausible. The 188w smoke is the binding verdict gate.**

**Stop triggers Phase 1 must respect (mirroring parent audit §7.7):**

1. If 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive → STOP, Wave-6-style verdict report, do NOT retune in-lane (third hypothesis-disproved precedent → escalate to canon review of `updateBrigadeOfficerQuality` semantics; B has failed; consider C).
2. If 188w VRS+HRHB STAYER Δ/turn does NOT bend nonpositive (per `officer_quality_growth_trace.cjs`) → STOP, indicates Fix B does not actually constrain per-formation growth (only constrains faction-mean drift via cohort turnover; survivorship hypothesis biting).
3. If 40w benchmarks drop below 6/6 → STOP, bot calibration regression.
4. If 188w RS active brigade count drops below 35 → STOP, officer-quality decay coupled with cohesion drag may be cascading into mass dissolution.
5. If `final_state_hash` fails to emit at 188w (replay-buffer streaming regression) → STOP, do NOT retry without diagnosis (Mission C precedent).

**Recommended Phase 1 dispatch shape:**
- Pre-engagement panel sign-off (this report) — **REQUIRED**
- Implementation: ~50-80 LOC change (`FACTION_LEARNING_RATE` shape promotion + new accessor + step-curve data + 1 caller update inside `officer_quality_update.ts:146`); test deltas comparable to Lane A's 26 lane tests
- New tests: ≥5 covering step-curve lookup at all 4 bands per faction, default fallback, faction-symmetric mechanism (same accessor for all factions), determinism across invocations, byte-stability for non-canonical faction codes, negative-value handling at OFFICER_QUALITY_FLOOR boundary
- 40w smoke gate (binding, per table above)
- 188w smoke + parent-audit diagnostic re-run (binding, per table above)
- Lane closeout report under `docs/40_reports/implemented/` named per Phase 1 ship day

**Fix Shape C dispatch shape (if deferred-to-future):**
- Significantly larger surface; touches 4+ files (`officer_quality_update.ts`, `recruitment_engine.ts`, `formation_spawn.ts`, `brigade_reconstitution.ts`); requires new state field tracking per-formation cohort-replacement metrics; 40w hash drift expected to be larger; expect -3pp to -5pp tolerance on area-weighted; +20-30 new lane tests; full-regression on reconstitution + mobilization clusters required.

### Verdict on Fix Shape B: **CONDITIONS** — full calibration regression at both 40w and 188w required before merge; PRIMARY binding gate is 188w stayer Δ/turn (criterion 4 in synthesis below)

### Verdict on Fix Shape C: **DEFER** — Phase 1 should ship B; if B fails 188w gate, the next investigation is reconstitution-pipeline modeling BEFORE C lands

### Recommended numerics for Fix Shape B (concur with /game-designer + /historian)

`RBiH: const 1.5 / RS: 0.7→0.4→0.0→-0.4 / HRHB: 1.0→0.7→0.3→-0.2 / DEFAULT: const 1.0`, brackets at w52/w78/w104.

### Concerns flagged
1. The 188w smoke is the binding verdict gate. Without it, the lane has no way to verify the late-war arc bend. This is a 12+ minute scenario run (per Wave 6 + Lane A wallclock) and must include the parent-audit diagnostic re-run. Phase 1 cannot ship on 40w gates alone — Wave 6 + Lane A both proved that 40w is unverifiable for late-war officer-quality levers.
2. The HRHB band magnitudes may be insufficient to bend HRHB stayer Δ/turn fully nonpositive. If the 188w smoke shows HRHB criterion 3 FAIL while VRS criterion 3 PASS, a follow-up lane should re-tune HRHB w104+ band only (e.g., −0.4 instead of −0.2). Do NOT bundle the re-tune into Phase 1; the stop trigger fires on first failure.
3. The `MORALE_OVERRIDE_ENABLED` flag is currently default-false; if Phase 1 also sets it true (out of scope for this lane!), the interaction with officer-quality-driven cohesion drag could cascade into VRS dissolution. Phase 1 MUST NOT touch the morale-override flag.
4. The recommended numerics produce a step-curve that crosses zero (positive → zero → negative). The `lookupStepCurve` mechanism (`war_timeline.ts:107-113`) handles negative values correctly (no sign constraint on `value: number`), but this is the FIRST time the step-curve mechanism will be invoked with negative-going data. Determinism review (Panel 4) covers the verification.

---

## Panel Member 4 — /determinism-auditor

**Skill file:** `.claude/skills/determinism-auditor/SKILL.md`
**Authority:** Identify nondeterminism risks; cite `DETERMINISM_TEST_MATRIX.md` and Engine Invariants §11.
**Question:** Does negative-going step-curve introduce determinism risks? `lookupStepCurve` is already proven (Wave 4); does extending the data range to negative reveal any rounding-mode / sign-comparison hazards? Faction-symmetric mechanism check (single accessor, no `if (faction === 'X')` branches).

### Findings

**Hash stability of Fix Shape B:**

Promoting `FACTION_LEARNING_RATE` from `Record<string, number> = { RBiH: 1.5, RS: 0.7, HRHB: 1.0 }` to `Record<string, StepCurveEntry[]>` with accessor `getFactionLearningRate(faction, turn): number`:

- **Object-key access is deterministic.** Accessor reads by `f.faction` string key, not by iteration. No iteration order introduced over the record's keys.
- **`lookupStepCurve` is deterministic** (`war_timeline.ts:107-113`): sequential scan of the entries array; returns the first match where `start_turn <= turn < end_turn`; falls through to `defaultValue` if no entry matches. Sequential scan is order-stable as long as the entries array is stored in-order, which is the canon for all step-curve data tables in `apr1992.json`.
- **Negative-value handling:** `lookupStepCurve` returns `e.value` directly without sign-clamping. The downstream multiplication `COMBAT_GROWTH_BASE * negativeMult` produces a negative `combatGrowthPerTurn`. The diminishing-returns dampener `(1.0 - quality * 0.5)` is positive-or-equal (since quality ∈ [0.05, 0.90], dampener ∈ [0.55, 0.975]). Product is therefore negative when multiplier is negative. Adding negative growth to `quality` produces a decrement. The `Math.max(OFFICER_QUALITY_FLOOR, ...)` clamp at line 179 floors at 0.05.
- **Float64 multiplication:** IEEE-754 conformant operations on the same inputs produce the same outputs across V8 versions (per Engine Invariants §11.4 + DETERMINISM_TEST_MATRIX.md). No rounding-mode hazard introduced by sign change.
- **Sign-comparison hazard:** the only comparison in the path is `engagedFormationIds.has(id)` (Set membership; faction-agnostic) and `frontlineAssigned.has(id)` (Set membership; faction-agnostic). No floating-point comparison on the multiplier itself. PASS.

**Faction-key lookup determinism:** `f.faction` is a canonical string ('RBiH' | 'RS' | 'HRHB'). Key set is closed in canon (per `MEMORY.md`: "Canonical faction IDs: RBiH, RS, HRHB only"). Object property access on string keys is deterministic across Node versions.

**Default-fallback determinism:** `?? 1.0` (or whatever DEFAULT we choose; recommended 1.0 to match current implicit default in line 146 `?? 1.0`) produces the legacy scalar value when faction key is not in the record. Any future test fixture or scenario using a non-canonical faction code receives 1.0 byte-identically to current behavior. This preserves byte-stability for all non-{RBiH, RS, HRHB} formations.

**Iteration-order risk in `updateBrigadeOfficerQuality`:** Already deterministic per existing code (line 117): `const formationIds = Object.keys(formations).sort(strictCompare);`. Phase 1 must not introduce iteration over `FACTION_LEARNING_RATE` keys at runtime; the accessor is single-key lookup. PASS.

**Serialization order risk:** `FACTION_LEARNING_RATE` is not persisted in `final_save.json` (it's a module-level constant). PASS.

**Timeline-config precedence chain (Phase 1 must preserve):** `officer_quality_update.ts:138-145` reads `state.military.war_timeline?.officer_config?.[faction]` first, with a 4-level precedence (`learning_rate_per_turn` > `learning_rate_multiplier` > `learning_rate` > hardcoded fallback). Phase 1 must route the new step-curve through the hardcoded-fallback level (level 4), preserving the timeline-override precedence. The new accessor `getFactionLearningRate(faction, turn)` should produce the COMBAT_GROWTH_BASE-multiplier value (i.e., `0.7` not `COMBAT_GROWTH_BASE * 0.7`) so that the existing line 146 multiplication shape is preserved: `combatGrowthPerTurn = COMBAT_GROWTH_BASE * getFactionLearningRate(faction, turn);`.

**No nondeterminism risks introduced by Fix B:**
- No iteration over `FACTION_LEARNING_RATE` keys at runtime.
- No serialization order risk (module constant).
- No timestamp coupling.
- No randomness coupling.
- No locale-dependent comparator.
- Sign extension to negative values does not introduce rounding-mode hazard.

**Determinism-Test-Matrix gate alignment:** Per `docs/DETERMINISM_TEST_MATRIX.md`, faction-asymmetric data on faction-symmetric mechanism is the canonical pattern (cited examples: existing `FACTION_LEARNING_RATE`, `getFactionReinforcementMult`, `FACTION_RESERVE_DRAW_RATE`, `FACTION_POOL_SCALE`). Fix Shape B promotes `FACTION_LEARNING_RATE` from `Record<string, number>` to `Record<string, StepCurveEntry[]>` — same pattern at higher arity. PASS.

**188w hash gate readiness:** Wave 7 Lane B (`107fe60b`) shipped streaming finalizer. Lane A redo n1665 validated 188w `final_state_hash = 6d3ff5b4669ccb80` emits cleanly post-streaming. No new test infrastructure required.

**Phase 1 verifications to add to the new test suite:**
- Step-curve at-band-boundaries determinism: invoke `getFactionLearningRate('RS', t)` for t = 0, 51, 52, 77, 78, 103, 104, 187; assert returns 0.7, 0.7, 0.4, 0.4, 0.0, 0.0, -0.4, -0.4 byte-identically.
- Faction-key determinism: invoke `getFactionLearningRate(f, t)` for f in {'RBiH', 'RS', 'HRHB'} at t = 100; assert returns 1.5, 0.4, 0.7 (or whatever the bracket says) byte-identically.
- Default fallback: invoke for f = 'JNA' (non-canonical); assert returns 1.0 byte-identically.
- Determinism-across-invocations: invoke 3× with same inputs; assert byte-identical outputs.
- Negative-value-into-clamp: synthetic test where a brigade is run through 200 turns at the deepest negative band; assert quality clamps at OFFICER_QUALITY_FLOOR = 0.05 and does not go negative.

**Fix Shape C determinism review (DEFER context):**
- Adding new state field `personnel_replaced_this_turn` per formation: serialization / hash-stability surface change. PHASE 1 BLOCKER — would require state-schema audit + final_save.json round-trip test + 40w hash-drift baseline establishment for the new field.
- Cohort-experience formula introduces order-of-application concern: officer_quality is decremented by reconstitution dilution AND by combat-driven decay AND by per-turn growth. The order of these in the war-phase pipeline must be deterministic. Currently, `update-officer-quality` runs at `war_phases.ts:1665-1675`; reconstitution runs separately. C requires explicit per-turn ordering audit before ship.
- C is not blocked on determinism specifically; it is blocked on broader engine-surface review and hash-baseline re-establishment. DEFER consensus.

### Verdict on Fix Shape B: **GO** — no new nondeterminism risks; sign extension to negative values is safe per IEEE-754 + clamp-at-floor; 188w hash gate infrastructure ready

### Verdict on Fix Shape C: **DEFER** — adds state-schema surface (per-formation cohort-replacement tracking); requires Phase 1.5 design review + state-schema audit + 40w hash-drift baseline re-establishment before any code lands

### Recommended numerics for Fix Shape B (concur with /game-designer + /historian + /scenario-creator-runner-tester)

Same step-curve as above. `DEFAULT_FACTION_LEARNING_RATE = 1.0` for the accessor's nullish fallback (matches existing `?? 1.0` default in `officer_quality_update.ts:146`).

### Concerns flagged
1. Phase 1 must not introduce iteration over `FACTION_LEARNING_RATE` keys at runtime (accessor-only is deterministic; iteration would require strictCompare-sort).
2. Phase 1 must preserve the `?? 1.0` default for any future non-canonical faction code; without it, an undefined faction would propagate `NaN` through multiplication and clamp to OFFICER_QUALITY_FLOOR (silently wrong, hash-stable but incorrect).
3. The 188w hash gate is technically dispatchable post-Wave-7 Lane B (validated by Lane A redo n1665) but Phase 1 will be the SECOND lane to use it as a binding regression gate. If the streaming finalizer regresses unexpectedly, Phase 1 must STOP rather than retry without diagnosis (Mission C precedent on gate failures).
4. No DETERMINISM_TEST_MATRIX.md updates required; the proposed shape conforms to canonical patterns documented there.
5. The `value: number` field in `StepCurveEntry` shape (`war_timeline.ts:80-84`) imposes no sign constraint. Phase 1 should add a comment in the data-table source noting that values may be negative for the OQ-Growth Path use case (`getFactionLearningRate` data) but must remain positive for `reinforcement_mult` data (Wave 4 lane semantics). This is a documentation note, not a mechanism change.

---

## Synthesis

### Combined Verdict on Fix Shape B: **CONDITIONS — Phase 1 GO with binding acceptance criteria**

All four panel members produce GO/CONDITIONS verdicts on Fix Shape B (no NO-GO). Three (`/game-designer`, `/historian`, `/determinism-auditor`) issue clean GO; one (`/scenario-creator-runner-tester`) issues CONDITIONS with a full-calibration-regression gate that the other three concur with. Synthesis verdict on Fix Shape B is therefore **CONDITIONS** — Phase 1 may proceed under the 10 binding acceptance criteria below.

### Combined Verdict on Fix Shape C: **DEFER — ship B first; revisit C as future-successor lane only if B fails**

All four panel members issue DEFER on Fix Shape C. Reasons converge:
- /game-designer: Phase 1.5 design review trigger; largest implementation surface; would invalidate the 40w hash baseline broadly.
- /historian: doctrinally most accurate but presupposes correct upstream reconstitution-pipeline modeling; if pipeline doesn't model cadre-replacement quality, C will not bend the arc either.
- /scenario-creator-runner-tester: 4+ files touched; new state field; +20-30 new lane tests; full-regression on reconstitution + mobilization clusters required.
- /determinism-auditor: state-schema surface; requires hash-baseline re-establishment + state-schema audit + per-turn-ordering audit.

**Successor handoff if Phase 1 (Fix B) fails 188w gate:** the next investigation is whether the reconstitution + mobilization pipelines correctly model cadre-replacement quality, BEFORE Fix C lands. Fix C is not the next-action; it is the deferred third-line lever after that investigation completes.

### Recommended numerics for Fix Shape B (unanimous)

```ts
// Proposed Phase 1 data shape — promote FACTION_LEARNING_RATE from
// Record<string, number> to Record<string, StepCurveEntry[]>; provide
// faction-agnostic accessor; preserve timeline-override precedence chain;
// data parameters drive faction asymmetry per Wave 4 + Lane A precedent.

export const DEFAULT_FACTION_LEARNING_RATE = 1.0;

export const FACTION_LEARNING_RATE: Record<string, StepCurveEntry[]> = {
    RBiH: [
        { start_turn: 0, end_turn: 9999, value: 1.5 },  // CONTROL — preserves canonical professionalization arc
    ],
    RS: [
        { start_turn:   0, end_turn:  52, value:  0.7 },  // 1992 baseline (JNA professionalism absorbing combat)
        { start_turn:  52, end_turn:  78, value:  0.4 },  // mid-1993 cadre attrition starts
        { start_turn:  78, end_turn: 104, value:  0.0 },  // late-1993 / early-1994 equilibrium
        { start_turn: 104, end_turn: 9999, value: -0.4 }, // 1994-95 conscription crisis active decline
    ],
    HRHB: [
        { start_turn:   0, end_turn:  52, value:  1.0 },  // 1992 HV-rotation plateau
        { start_turn:  52, end_turn:  78, value:  0.7 },  // mid-1993 Lasva Valley operational losses
        { start_turn:  78, end_turn: 104, value:  0.3 },  // late-1993 / early-1994 Federation-transition rotation
        { start_turn: 104, end_turn: 9999, value: -0.2 }, // 1994-95 HV politicization slight decline
    ],
};

export function getFactionLearningRate(faction: string, turn: number): number {
    const entries = FACTION_LEARNING_RATE[faction];
    if (entries) return lookupStepCurve(entries, turn, DEFAULT_FACTION_LEARNING_RATE);
    return DEFAULT_FACTION_LEARNING_RATE;
}
```

Caller change in `officer_quality_update.ts:146` (preserves the existing 4-level timeline-override precedence chain at lines 138-145):

```ts
} else {
    combatGrowthPerTurn = COMBAT_GROWTH_BASE * getFactionLearningRate(faction, turn);
}
```

### 10 Binding Acceptance Criteria for Phase 1 (Fix Shape B)

1. **Code shape conformance** — `FACTION_LEARNING_RATE` promoted to `Record<string, StepCurveEntry[]>`; new accessor `getFactionLearningRate(faction, turn): number` with `?? DEFAULT_FACTION_LEARNING_RATE` fallback (1.0); timeline-override precedence chain (`learning_rate_per_turn` > `learning_rate_multiplier` > `learning_rate` > hardcoded step-curve) PRESERVED at `officer_quality_update.ts:138-146`; no `if (faction === 'X')` branches anywhere; mirrors `getFactionReinforcementMult` shape (Wave 4 precedent commit `e9584dd3`).

2. **40w smoke gate** — anchors ≥26/27 (no new failures beyond pre-existing `op:brcko:brka_2` P0); benchmarks 6/6 PASS; area-weighted ≥91.5% (-1.8pp tolerance from current 93.3%); faction OSID counts within ±5 (RS=381, RBiH=245, HRHB=86); hash drift expected, NOT a gate.

3. **188w faction-mean smoke gate** — `final_state_hash` emits cleanly (Wave 7 Lane B streaming finalizer must hold); VRS+HRHB officer_quality whole-run faction-mean Δ/turn ≤ 0 (doctrinal sign -1); RBiH whole-run faction-mean Δ/turn ≥ +0.001 (control-faction); RS active brigade count at t188 ≥ 35 (no dissolution cascade).

4. **188w stayer-Δ trajectory gate (NEW BINDING — `tools/diagnostics/officer_quality_growth_trace.cjs`)** — re-run the parent-audit diagnostic on the 188w output; VRS+HRHB STAYER Δ/turn ≤ 0 (per-formation, not just faction-mean; this is the binding gate Lane A and Wave 6 could not test); RBiH STAYER Δ/turn ≥ +0.001 (control); growth % share for VRS+HRHB must demonstrate the per-formation growth path is constrained, not merely faction-mean drift via cohort-turnover survivorship.

5. **Tests** — ≥ 5 new lane tests GREEN (step-curve at-band-boundaries determinism for all 3 factions × 4 bands; faction-key determinism; default fallback for non-canonical faction codes; determinism-across-invocations; negative-value-into-floor-clamp synthetic 200-turn test); focused regression on `officer_quality_update`, `attack_post_battle_effects`, `attack_resolution_osid`, `war_timeline` (lookupStepCurve), `officer_config_consumers` clusters all GREEN.

6. **Type-check** — `npx tsc --noEmit` clean.

7. **Sensitive-history compliance assertion in lane report** — explicit Ring 1 classification, no §6 sign-off chain triggered, no FORAWWV / paint anchor / political_controllers / OOB / rupture wiring / `enclave_resilience.ts` touch; calendar-keyed force-quality decay distinguished from §1.5 #11's prohibition on calendar-keyed atrocity recording (the former is canonically permitted per Wave 4 step-curve precedent; the latter is forbidden).

8. **Stop triggers respected** — if 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive, STOP and produce Wave-6-style verdict report; do NOT retune in-lane. If faction-mean bends nonpositive but stayer Δ/turn does NOT, INVESTIGATE survivorship contamination (cohort-turnover share inversion) before merge — this is the canonical failure mode the parent audit anticipated. If HRHB criterion 3 fails while VRS criterion 3 passes, do NOT bundle a re-tune into Phase 1; produce verdict report and dispatch a follow-up HRHB-bands-only re-tune lane separately.

9. **Out-of-scope guards** — Phase 1 MUST NOT touch `MORALE_OVERRIDE_ENABLED` flag, MUST NOT alter `OFFICER_QUALITY_FLOOR=0.05`, MUST NOT alter `OFFICER_QUALITY_CAP=0.90`, MUST NOT alter `COMBAT_GROWTH_BASE=0.01` / `FRONTLINE_GROWTH_BASE=0.005`, MUST NOT touch `OFFICER_CASUALTY_MULT` (Lane A reverted; revisiting would re-litigate that lane's verdict), MUST NOT couple to `war_crimes_record` (Engine Invariants §15.2 binding informational-only), MUST NOT extend scope to UNPROFOR / comms-asymmetry / ammo-scarcity surfaces, MUST NOT touch `recruitment_engine.ts` / `formation_spawn.ts` / `brigade_reconstitution.ts` (those are Fix Shape C surfaces, not Fix Shape B).

10. **Phase 1 lane report** — under `docs/40_reports/implemented/` named per Phase 1 ship day with the standard predecessor-chain / files-changed / acceptance-gate / sensitive-history-compliance / determinism / counterfactual-safety / successor-handoff sections; include BB-citation block (per /historian concern) grounding the directional claim about VRS/HRHB late-war cadre erosion at volume/page level; include a determinism note documenting that the step-curve `value: number` field in this lane's data table may be negative (vs Wave 4 reinforcement_mult which is strictly positive).

### 5 Binding Stop Triggers (carried from parent audit §7.7)

1. If 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive → STOP, Wave-6-style verdict report, do NOT retune in-lane. **Third hypothesis-disproved precedent** → escalate to canon review of `updateBrigadeOfficerQuality` semantics; B has failed; consider Fix C as deferred-future lane after reconstitution-pipeline investigation.
2. If 188w VRS+HRHB **stayer** Δ/turn (per `officer_quality_growth_trace.cjs`) does NOT bend nonpositive → STOP, indicates the fix shape selected does not actually constrain per-formation growth (only constrains faction-mean drift via cohort turnover, which is the survivorship hypothesis from parent-audit §4 finally biting).
3. If 40w benchmarks drop below 6/6 → STOP, bot calibration regression.
4. If 188w RS active brigade count drops below 35 → STOP, officer-quality decay coupled with cohesion drag may be cascading into mass dissolution.
5. If `final_state_hash` fails to emit at 188w (replay-buffer streaming regression) → STOP, do NOT retry without diagnosis (Mission C precedent).

### Ring Classification

**Ring 1 — modeled mechanically.** Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, Ring 1 is the structured-state combat / morale / casualty surface the engine simulates as deterministic state. The growth path (`updateBrigadeOfficerQuality`) is already a Ring 1 mechanic; promoting `FACTION_LEARNING_RATE` from `Record<string, number>` to `Record<string, StepCurveEntry[]>` operates on the same Ring 1 surface. The Wave 4 reinforcement-mult step-curve precedent is the canonical Ring 1 pattern this lane mirrors. Fix Shape B is **data, not logic**: the predicate (`lookupStepCurve`) is faction-agnostic; only the data parameters drive asymmetry. This is the Ring 1 + faction-symmetric-mechanism + asymmetric-data canonical shape.

Calendar-keyed force-quality decay is canonically permitted (Wave 4 precedent already shipped this exact shape for `reinforcement_mult`). The §1.5 #11 prohibition applies specifically to calendar-keyed *atrocity* recording (rupture / condemnation flags); it does not apply to calendar-keyed force-quality data. The directional distinction is binding.

### §6 Sign-Off Chain Check

**NOT TRIGGERED** for Phase 1. Row-by-row negative test (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §6 table):
- New rupture? **No.**
- Change to rupture trigger or description? **No.**
- New atrocity event? **No.**
- Change to atrocity event content? **No.**
- New condemnation flag? **No.**
- Change to paramilitary policy surface? **No.**
- Cost Ledger wording change? **No.**
- New essay touching atrocity? **No.**
- Change to enclave mechanics? **No.**
- Any change that could produce a "reward for atrocity" effect? **No** (officer_quality is internal combat-math, decoupled from `war_crimes_record` per Engine Invariants §15.2 binding informational-only).

Phase 1 may proceed Ring-1-sufficient without §6 process.

### Sensitive-History Compliance Assertion (this Phase 0 report)

- **Ring classification:** **Ring 1** (per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1). Audit-only this report; no Ring 1 surface modified by this report.
- **§6 Sign-Off Chain (`SENSITIVE_HISTORY_DESIGN_GATE.md` §6):** **NOT TRIGGERED** for this Phase 0 panel. Audit-only. The implementation lane will proceed Ring-1-sufficient.
- **Faction-symmetric-mechanism check:** PASS. Recommended Phase 1 mechanism is `Record<string, StepCurveEntry[]>` with single faction-agnostic accessor `getFactionLearningRate(faction, turn)` and `?? DEFAULT_FACTION_LEARNING_RATE` fallback. No `if (faction === ...)` branches anywhere. Mirrors `getFactionReinforcementMult` (Wave 4 commit `e9584dd3`) and `FACTION_LEARNING_RATE` existing shape (just with step-curve data instead of scalar data).
- **Read-only assertion (this report):** No source modified. No test modified. No scenario data modified. No paint anchor / political_controllers / OOB / FORAWWV / rupture-wiring / `enclave_resilience.ts` touched. No combat-math number tuned. The report is the deliverable.
- **Determinism check (this report):** Pure prose; no executable code; no diagnostic emit. Phase 1 implementation deterministic per Panel 4.

### Why CONDITIONS rather than GO

The 188w binding gates (criteria 3 + 4) and the new stayer-Δ binding gate (criterion 4) are the load-bearing conditions. Wave 6 + Lane A both proved that 40w cannot verify late-war officer-quality arc bending — the 40w scenario terminates before the lever bites. Phase 1 cannot ship on 40w gates alone. The new diagnostic `tools/diagnostics/officer_quality_growth_trace.cjs` (parent audit ship) provides the per-formation gate that Lane A could not test; THIS gate is binding because it disambiguates whether Fix Shape B actually constrains per-brigade growth (the named defect) vs merely shifting faction-mean drift via survivorship.

The CONDITIONS verdict is the calibration-discipline answer: ship the lever per the unanimous panel numerics, but only with binding 188w trajectory + per-formation stayer-Δ verification gates. If those gates fail, this is the THIRD hypothesis-disproved-by-verification pattern in this calibration arc, and the next investigation surface (per Fix Shape C deferral) becomes the reconstitution + mobilization pipelines, BEFORE Fix C lands.

### Successor Handoffs (if Phase 1 Fix B succeeds)

1. **Canon amendment opportunity** — propose amendment to `Engine_Invariants_v0_9_0.md` §15 (Officer System Invariants) adding a new sub-clause documenting the per-faction step-curve `FACTION_LEARNING_RATE` as canonical. Audit-only this lane; amendment is downstream once Phase 1 implementation ships clean.
2. **Timeline-data deltas** — if HRHB criterion 3 fails while VRS criterion 3 passes (probable per /scenario-creator-runner-tester finding 2), follow-up HRHB-band-only re-tune lane (e.g., `-0.4` instead of `-0.2` for HRHB w104+).
3. **Documentation updates** — `MEMORY.md` / napkin entries reflecting the cross-lane lesson "growth-path step-curve is the third proximate-lever-class fix that DID bend the arc" (or did not, depending on outcome).
4. **Wave 7 Lane B streaming finalizer remains validated** — n1665 188w run was the first full-emit; Phase 1 will be the second. No further perf work needed for the growth-path Phase 1 lane.

### Successor Handoffs (if Phase 1 Fix B FAILS 188w gate)

1. Do NOT retune the step-curve magnitudes upward in a follow-up lane (the magnitudes are doctrinally and trace-grounded; further negative-going tuning is not doctrine-grounded; Lane A's "Lane B numerics tuned upward" failure mode applies).
2. Investigate the reconstitution + mobilization pipelines: do they correctly model cadre-replacement quality (i.e., do replacement officers enter at lower-than-mean quality)? If NO, Fix Shape C will not bend the arc either; the upstream defect is the pipeline.
3. Only after the pipeline investigation completes should Fix Shape C be considered for Phase 1.
4. Issue a Wave-6 + Lane-A-style verdict report and re-engage the panel.

---

## Output Summary (for orchestrator handoff)

- **Report path:** `docs/40_reports/audits/20260505_OFFICER_QUALITY_GROWTH_PATH_PHASE_0_PANEL.md` (this file)
- **Combined verdict on Fix Shape B:** **CONDITIONS** — Phase 1 GO with 10 binding acceptance criteria + 5 stop triggers
- **Combined verdict on Fix Shape C:** **DEFER** — ship B first; revisit C as future-successor lane only if B fails 188w gate AND pipeline investigation completes
- **Recommended numerics for Fix Shape B (unanimous):**
  - RBiH: `const 1.5` (CONTROL — unchanged; preserves canonical professionalization arc)
  - RS: `0.7 / 0.4 / 0.0 / -0.4` at brackets `<w52 / w52-77 / w78-103 / w104+`
  - HRHB: `1.0 / 0.7 / 0.3 / -0.2` at same brackets
  - DEFAULT: `1.0` for non-canonical faction codes (preserves byte-stability)
- **10 acceptance criteria summary:** Code shape (record + accessor + step-curve + timeline-override-precedence preserved + faction-symmetric mechanism); 40w smoke gate (anchors ≥26/27, benchmarks 6/6, area ≥91.5%); 188w faction-mean smoke gate (VRS+HRHB Δ/turn ≤0, RBiH ≥+0.001, RS brigades ≥35, hash emits); 188w stayer-Δ trajectory gate (per parent-audit diagnostic; VRS+HRHB stayer Δ/turn ≤0); ≥5 new lane tests GREEN + focused regression GREEN; tsc clean; sensitive-history compliance asserted; stop triggers respected; out-of-scope guards (no MORALE_OVERRIDE_ENABLED / FLOOR / CAP / OFFICER_CASUALTY_MULT / war_crimes_record / Fix C surfaces); Phase 1 lane report under `docs/40_reports/implemented/` with BB-citation block + determinism note
- **5 stop triggers summary:** (1) 188w faction-mean Δ/turn doesn't bend nonpositive; (2) 188w stayer Δ/turn doesn't bend nonpositive (per-formation gate); (3) 40w benchmarks drop below 6/6; (4) 188w RS active brigades drops below 35; (5) `final_state_hash` fails to emit at 188w
- **Ring classification:** **Ring 1** (data, not logic; mirrors Wave 4 step-curve precedent; calendar-keyed force-quality decay is canonically permitted per §1.5 #11 directional distinction)
- **§6 sign-off chain triggered:** **NO** — change is not in any §6 row; Phase 1 may proceed Ring-1-sufficient
- **Sensitive-history compliance:** Asserted; read-only Phase 0; no source / scenario / canon / FORAWWV / rupture / paint / OOB / political_controllers / `enclave_resilience.ts` touch; no combat-math number tuned; faction-agnostic mechanism with asymmetric data
- **Next action user should consider authorizing:** Phase 1 implementation lane for Fix Shape B, dispatched with this report as the binding panel approval, gated by the 10 acceptance criteria + 5 stop triggers, named `LANE-NIGHTSHIFT-OFFICER-QUALITY-GROWTH-PATH-PHASE-1-IMPLEMENTATION` (or session-equivalent). Fix Shape C remains DEFERRED pending Phase 1 outcome.
