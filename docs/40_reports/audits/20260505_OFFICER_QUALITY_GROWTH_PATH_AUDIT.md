# Officer-Quality Growth Path — Investigation Audit

**Date:** 2026-05-05
**Lane:** LANE-NIGHTSHIFT-OFFICER-QUALITY-GROWTH-PATH-INVESTIGATION
**Type:** Read-only audit — named defect mechanism + Phase 0 panel proposal for any successor implementation lane.
**Audit-only.** No engine code, scenario data, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` touched. No combat-math number tuned.

---

## 1. Lane and Predecessor Chain

| Lane | Commit | Lever | 188w VRS Δ/turn | Verdict |
|---|---|---|---|---|
| Wave 4 (`RECONSTITUTION_POLICY_REVIEW`) | `e9584dd3` | `getFactionReinforcementMult` step-curve (faction-asymmetric reinforcement budget) | +0.000775 (whole-run) | INVERSE; canon `-1` |
| Wave 6 (`RECONSTITUTION_188W_VERIFICATION`) | `cc829ebb` | (audit-only — disproved Wave 4) | n/a | Wave 4 hypothesis NOT supported |
| Lane A Phase 0 panel (`OFFICER_CASUALTY_MULT_PHASE_0_PANEL`) | `7c3792d7` | (panel) — recommended `RS:2.5/HRHB:2.0/RBiH:1.0` | n/a | CONDITIONS: GO with binding 188w gate |
| Lane A Phase 1 implementation redo (`OFFICER_CASUALTY_MULT_PHASE_1`) | `411f6843` | `OFFICER_CASUALTY_MULT` faction-asymmetric (faction-asymmetric casualty-side multiplier) | +0.00059 (whole-run) | INVERSE; canon `-1` — implementation reverted under Phase 0 panel criterion 8 stop trigger |
| **THIS LANE (`OFFICER_QUALITY_GROWTH_PATH_INVESTIGATION`)** | **(this commit)** | **Audit-only — trace per-brigade growth code** | n/a | **See §5 named defect** |

## 2. Cross-Lane Finding (load-bearing)

> **When two proximate levers both fail to bend a target arc, the defect is upstream of both — STOP investigating proximate levers.**

Both proximate levers around officer_quality have been DISPROVED on full 188w trajectory verification:

- Reinforcement-side budget (Wave 4 `getFactionReinforcementMult`) — the lever shrinks the force (VRS active brigades 78 → 51, -34.6%) but cannot starve per-brigade growth; surviving cadre absorbs the reinforcement ceiling.
- Casualty-side multiplier (Lane A `OFFICER_CASUALTY_MULT`) — even at `RS:2.5` (67% above legacy), VRS whole-run Δ/turn remained **+0.00059** when canon expects **≤ 0**. HRHB at `2.0` produced **+0.00218**. RBiH (control) `1.0` produced **+0.00396**.

The defect must be UPSTREAM of both: in the per-brigade growth term, NOT in the per-faction reinforcement budget OR the per-faction casualty-side multiplier. This audit traces the growth path and characterizes the named defect.

## 3. Source Path Inventory — every site that INCREMENTS `officer_quality`

Searched across `src/` for `officer_quality` write sites; results below classify each by direction (growth / decay / initialization / reconstitution-floor).

### 3.1 Growth sites (officer_quality INCREASES)

| Site | File:line | Inputs | Magnitude | Cap / Floor | Faction-symmetric? |
|---|---|---|---|---|---|
| **`updateBrigadeOfficerQuality` — combat growth** | `src/sim/combat/officer_quality_update.ts:165` | `engagedFormationIds` (per-turn from attack resolution); `combatGrowthPerTurn`; `quality` | `quality += combatGrowthPerTurn × (1.0 - quality × 0.5)` | clamped to `[OFFICER_QUALITY_FLOOR=0.05, OFFICER_QUALITY_CAP=0.90]` at `:179` | **No.** `combatGrowthPerTurn = COMBAT_GROWTH_BASE × FACTION_LEARNING_RATE[faction]` where `FACTION_LEARNING_RATE = {RBiH: 1.5, RS: 0.7, HRHB: 1.0}` (faction-asymmetric data on faction-symmetric mechanism) |
| **`updateBrigadeOfficerQuality` — frontline growth** | `src/sim/combat/officer_quality_update.ts:168` | `frontlineAssigned` set (sector-frontline truth); `frontlineGrowthPerTurn`; `quality` | `quality += frontlineGrowthPerTurn × (1.0 - quality × 0.5)` | same clamp | Same data path — frontline rate = combat rate × `FRONTLINE_GROWTH_BASE / COMBAT_GROWTH_BASE` = combat rate × 0.5 |

`COMBAT_GROWTH_BASE = 0.01` (`officer_quality_update.ts:28`). `FRONTLINE_GROWTH_BASE = 0.005` (`:31`). The growth function runs **every turn** during war-phase pipeline step `update-officer-quality` (`src/sim/turn_phases/war_phases.ts:1665-1675`), iterating ALL active formations of kind in `{brigade, militia, og, operational_group}`.

The diminishing-returns factor `(1.0 - quality × 0.5)` dampens growth as quality rises, but at `OFFICER_QUALITY_CAP = 0.90` the multiplier is still `(1.0 - 0.45) = 0.55`. So a VRS brigade (`FACTION_LEARNING_RATE.RS = 0.7`) on the frontline at quality 0.7:
- Frontline growth = `0.005 × 0.7 × (1.0 - 0.7 × 0.5)` = `0.005 × 0.7 × 0.65` = **+0.002275 / turn**.

Compare to per-turn casualty-side decay at the same brigade (using Lane A's `OFFICER_CASUALTY_MULT.RS = 2.5`, casualty ratio 0.05, quality 0.7):
- Casualty decay = `0.05 × 2.5 × (1.0 - 0.7 × 0.3)` = `0.05 × 2.5 × 0.79` = **−0.09875 / battle**.

The per-battle decay magnitude DOES dominate per-battle, but `applyOfficerCasualtyLoss` only fires when the brigade actually takes casualties (per call sites at `attack_resolution_osid.ts:770,772` — once per attacker formation, once per defender formation, only on battle resolution). The per-turn growth path fires on EVERY turn for every frontline / engaged brigade. In a 188w window, a brigade in a quiet sector may spend 100+ turns on frontline accumulating growth without ever taking battle casualties. **The growth term is unconditional-on-frontline-presence; the decay term is conditional-on-being-attacked.**

### 3.2 Initialization sites (officer_quality SET to a faction default)

| Site | File:line | Inputs | Effect |
|---|---|---|---|
| `oob_early_war_entry.ts:281` | `formation.officer_quality = b.initial_officer_quality ?? getFactionDefaultOfficerQuality(b.faction, currentTurn);` | OOB initial value or faction default | One-shot initialization at OOB entry |
| `formation_spawn.ts:585, 670, 769` | `officer_quality: getFactionDefaultOfficerQuality(faction, currentTurn)` | faction default at spawn turn | One-shot for newly spawned militia / brigade |
| `recruitment_engine.ts:309` | `officer_quality: brigade.initial_officer_quality ?? getFactionDefaultOfficerQuality(brigade.faction, currentTurn)` | OOB or default | One-shot at recruitment |
| `officer_quality_update.ts:153` | `f.officer_quality = getFactionDefaultOfficerQuality(faction, turn)` | faction default | Lazy-init guard inside the per-turn update; only fires if `officer_quality === undefined` |

`getFactionDefaultOfficerQuality(faction, turn)` (`src/sim/combat/combat_math.ts:432-446`):
- `RS`: `Math.max(0.45, 0.55 - turn * 0.002)` — VRS starts at 0.55 with calendar-driven decay floored at 0.45 (i.e. defaults to 0.45 from t=50 onward).
- `RBiH`: `Math.min(0.50, 0.05 + turn * 0.004)` — ARBiH starts at 0.05 with calendar-driven RISE capped at 0.50 (i.e. defaults to 0.50 from t=113 onward).
- `HRHB`: `0.225` — flat.

These are one-shot defaults at formation entry; once `officer_quality` is set, it is mutated only by the growth/decay/reconstitution paths, NOT re-read from the default.

### 3.3 Decay sites (officer_quality DECREASES)

| Site | File:line | Inputs | Magnitude |
|---|---|---|---|
| `applyOfficerCasualtyLoss` | `src/sim/combat/attack_post_battle_effects.ts:66` | per-battle casualty count, total personnel, quality, `OFFICER_CASUALTY_MULT` | `quality -= casualtyRatio × OFFICER_CASUALTY_MULT × (1.0 - quality × 0.3)`; floored at `OFFICER_QUALITY_FLOOR=0.05` |
| `brigade_reconstitution.ts:357` | reconstitution flow | `RECONSTITUTION_OFFICER_QUALITY_PENALTY = 0.10` | One-shot −0.10 at reconstitution; floored at 0.05 |

### 3.4 Effect of `(1.0 - quality × 0.5)` diminishing-returns factor — math sanity

| quality | dampener `(1 - q × 0.5)` | net growth at `combatGrowthPerTurn=0.007` (RS combat) | per-turn growth at `frontlineGrowthPerTurn=0.0035` (RS frontline) |
|---|---|---|---|
| 0.05 | 0.975 | +0.006825 | +0.003413 |
| 0.225 | 0.8875 | +0.006213 | +0.003106 |
| 0.45 | 0.775 | +0.005425 | +0.002713 |
| 0.55 | 0.725 | +0.005075 | +0.002538 |
| 0.70 | 0.65 | +0.004550 | +0.002275 |
| 0.90 | 0.55 | +0.003850 | +0.001925 |

At cap (`0.90`), growth is still **+0.001925/turn frontline / +0.003850/turn combat** for a VRS brigade. Multiplied across 188 turns, that's a ceiling-pushing force. **The diminishing-returns factor does NOT decay growth toward zero at the cap; it merely halves it.** The cap clamp at `:179` is what holds quality at 0.90, but it does so by truncating positive growth, NOT by a self-stabilizing equilibrium.

## 4. Per-Formation Trajectory Analysis from n1665 (188w trajectory data)

Diagnostic: `tools/diagnostics/officer_quality_growth_trace.cjs` (NEW, audit-only post-processor over `<run_dir>/brigade_temporal_log.jsonl`).

Run: `runs/apr1992_definitive_188w__210e69404d054959__w188_n1665` (Lane A redo full-emit; first 188w run since Wave 6 OOM; final_state_hash `6d3ff5b4669ccb80`).

### 4.1 Whole-run attribution (raw output)

| faction | n@t1 | n@tL | stayers | dropouts | newcomers | meanQ@t1 | meanQ@tL | faction Δ/turn | stayer Δ/turn | dropout Q@last | newcomer Q@first | newcomer Q@last | growth % | survivorship % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| HRHB | 28 | 34 | 26 | 2 | 8 | 0.2267 | 0.6366 | +0.002192 | +0.002224 | 0.1424 | 0.2599 | 0.6170 | **77.6** | 22.4 |
| RBiH | 77 | 123 | 77 | 0 | 46 | 0.0865 | 0.8307 | +0.003979 | +0.004019 | n/a | 0.1577 | 0.8182 | **63.2** | 36.8 |
| RS | 78 | 51 | 49 | 29 | 2 | 0.5518 | 0.6635 | +0.000597 | +0.000463 | 0.5247 | 0.5330 | 0.9000 | **74.4** | 25.6 |

(Note: t1 / tL final-mean values for HRHB, RBiH, RS in the diagnostic's "active@tL" column differ slightly from Lane A's whole-run report because Lane A computed `whole-run mean Δ/turn` over the entire run window with finer per-turn aggregation; the diagnostic's `mean@tL` here uses the t=tL snapshot only. The directional sign and magnitude relative ordering match Lane A's report exactly.)

### 4.2 Survivorship-vs-growth attribution

**All three factions show stayer-driven (per-formation) growth as the dominant share of the faction-mean drift. This is genuine per-formation growth, NOT survivorship bias.**

For each faction, the per-formation `stayer Δ/turn` (formations active at BOTH t1 and t188) very nearly matches the faction-mean drift:

- **HRHB:** stayer Δ +0.002224 / faction Δ +0.002192 — stayers contribute **77.6%** of the faction-mean drift; cohort turnover (low-quality dropouts removed from the active set + newcomers entering at 0.26 then climbing to 0.62 over their tenure) contributes 22.4%.
- **RBiH:** stayer Δ +0.004019 / faction Δ +0.003979 — stayers contribute **63.2%**; cohort turnover (46 newcomers entering at mean 0.158 then climbing to 0.818) contributes 36.8%.
- **RS:** stayer Δ +0.000463 / faction Δ +0.000597 — stayers contribute **74.4%**; cohort turnover (29 dropouts at quality 0.525 — actually LOWER than the t1 mean of 0.552 — and 2 newcomers reaching 0.90) contributes 25.6%.

**Critical observation for VRS:** Even with 29 of 78 t1-active formations dropping out (-37% headcount), and the dropouts skewing slightly LOW vs the t1 mean (0.525 vs 0.552), the surviving 49 VRS stayers individually grew +0.000463/turn over the 187-turn span — i.e. each VRS surviving brigade increased its officer_quality by ~+0.087 over the 188w window. The aggregate VRS climb is **74.4% real per-formation growth, 25.6% cohort-turnover effect.**

(Compare the survivorship-only hypothesis: if the +0.000597 faction Δ were pure survivorship, stayer Δ would be near 0 and growth % would be near 0. Observed growth % is 74.4% across all three factions — hypothesis (a) "actual per-formation growth" wins decisively over hypothesis (b) "pure selection". Hypothesis (c) "mixed" is also wrong; growth dominates ~3:1.)

**Newcomer arc (substrate of cohort-turnover share):** Newcomers (formations not active at t1, active at t188) enter the active set at low quality (HRHB 0.26, RBiH 0.16, RS 0.53) and end at high quality (HRHB 0.62, RBiH 0.82, RS 0.90). This is the SAME growth path operating on freshly-spawned formations — it climbs them from their initialization default to near the cap over their tenure. Newcomers add survivorship pressure ONLY if they enter at lower quality than the faction mean and their growth doesn't catch up by tL; here their growth DOES catch up, so the survivorship contribution is bounded.

### 4.3 Per-faction interpretation (stayer evidence)

- **VRS stayers grew +0.000463/turn × 187 turns = +0.087 over 188w** — i.e. surviving VRS brigades on average improved from ~0.55 (t1 mean) to ~0.64 (t188 mean) under doctrinal expectation that they should DEGRADE from 0.55 to ~0.20 by 1995. The growth path is producing positive per-brigade drift in a faction that should be losing cadre.
- **HRHB stayers grew +0.002224/turn × 187 turns = +0.416** — surviving HRHB brigades on average climbed from ~0.23 (Croatian-cadre stable baseline) to ~0.65 over 188w under doctrinal expectation that the Lasva Valley losses + Federation-transition rotation should be DEGRADING, not professionalizing them.
- **RBiH stayers grew +0.004019/turn × 187 turns = +0.752** — matches doctrinal "rabble to corps" arc cleanly. Control faction; growth path is correctly producing this arc.

The growth path is producing the ARBiH-correct arc (rabble to corps) but CANNOT produce the doctrinal-correct VRS / HRHB late-war degradation arc, because the growth path adds quality every turn for every active frontline / engaged brigade for ALL factions. There is no negative term on the growth path itself — the only mechanisms that reduce quality are `applyOfficerCasualtyLoss` (battle-conditional) and `RECONSTITUTION_OFFICER_QUALITY_PENALTY` (reconstitution-conditional). Both are conditional on combat events.

## 5. Named Defect Mechanism

> **The per-brigade combat / frontline growth term in `updateBrigadeOfficerQuality` is unconditional-on-frontline-presence and faction-symmetric in mechanism but lacks any per-faction CEILING or CADRE-REPLACEMENT-OPTIMISM TAX that would model 1994-1995 VRS/HRHB cadre erosion.**

Specifically, at `src/sim/combat/officer_quality_update.ts:164-170`:

```ts
if (inCombat) {
    const growth = combatGrowthPerTurn * (1.0 - quality * 0.5);
    quality += growth;
} else if (onFrontline) {
    const growth = frontlineGrowthPerTurn * (1.0 - quality * 0.5);
    quality += growth;
}
```

The growth term has THREE structural defect properties that produce the late-war arc inversion:

1. **Faction-asymmetric ONLY in magnitude, not in sign** — `FACTION_LEARNING_RATE = {RBiH: 1.5, RS: 0.7, HRHB: 1.0}` makes RBiH grow fastest, but VRS still grows at +0.7× the base rate, never at zero or negative. Doctrinal canon for late-war VRS / HRHB is that REPLACEMENT cadre is LOWER quality than the cadre it replaces; the growth path can model accumulated-experience growth but cannot model cadre-replacement-optimism erosion.
2. **Diminishing-returns dampener `(1.0 - quality × 0.5)` does not approach zero at the cap** — at quality 0.90, growth is still +0.001925/turn frontline. The cap clamp at `:179` is the only stop on growth, and it pins quality at 0.90 rather than producing a self-stabilizing equilibrium.
3. **No per-faction late-war ceiling / decay** — there is no calendar-driven OR cadre-erosion-driven term that pushes VRS / HRHB officer_quality DOWN as the war progresses. The deprecated `VRS_BRAIN_DRAIN_*` constants (removed Phase 3 of FORCE QUALITY FOUNDATION 2026-05-01, retained as `@deprecated` no-ops) once filled this role; they were removed because they were a calendar railroad. They were replaced by the casualty-driven decay path (Lane A's surface), which Lane A just proved is insufficient to bend the late-war arc when the growth path keeps adding +0.7× to +1.5× the base rate every turn for every frontline / engaged brigade.

**The Wave 6 lesson made explicit by the n1665 attribution data:** "per-brigade growth terms can overwhelm per-faction budget caps." The growth term is the per-brigade lever; faction-budget levers (Wave 4 reinforcement-mult) and per-faction casualty-side multipliers (Lane A `OFFICER_CASUALTY_MULT`) cannot bend the arc when the per-brigade growth term itself is unconditional-on-frontline-presence and faction-asymmetric only in magnitude.

### 5.1 Three candidate fix shapes (for the successor implementation lane to choose between)

The following three fix shapes are the candidate space; the Phase 0 panel (§7) should select between them based on game-design intent, historical defensibility, and calibration regression risk:

**Fix Shape A — Per-faction CADRE CEILING.** Promote the `OFFICER_QUALITY_CAP` constant to a faction-keyed record (`Record<string, number>` + accessor + default fallback). Recommended numerics anchored on Wave 3 trace evidence + doctrinal arc:
- `RBiH: 0.85` (rabble-to-corps; cap above pre-war RS to model end-state professionalization)
- `RS: 0.55` (JNA-inheritance baseline; cadre cannot exceed 1992 starting cadre under attrition)
- `HRHB: 0.40` (HV-patron variance; cadre stops climbing at HV-rotation-quality plateau)
- `DEFAULT: 0.90` (preserves legacy scalar for non-canonical faction codes)

The cap clamp at `:179` becomes faction-asymmetric data on a faction-symmetric mechanism (mirrors `FACTION_LEARNING_RATE`, `OFFICER_CASUALTY_MULT`, `getFactionReinforcementMult` precedents). Pure ceiling change; growth path math unchanged. **Strength:** doctrinally minimal; bends the arc by capping where it should; faction-symmetric mechanism. **Concern:** does not produce active decline, only flatlines at faction ceiling. If 188w trajectory needs to bend NEGATIVE (not just flat), this alone is insufficient.

**Fix Shape B — Per-faction CADRE-REPLACEMENT-OPTIMISM TAX on growth.** Add a per-turn tax term that scales with `(quality - faction_baseline)` so that growth above the faction's doctrinal baseline accrues a back-pressure. Mechanism: faction-symmetric `cadreOptimismTax = max(0, (quality - factionBaseline) × CADRE_TAX_RATE)`. Subtract from growth (or add to a per-turn decay floor). Recommended numerics (illustrative):
- `factionBaseline = {RBiH: 0.50, RS: 0.55, HRHB: 0.225}` — already in `getFactionDefaultOfficerQuality`'s asymptote values.
- `CADRE_TAX_RATE: 0.005 / turn / point-above-baseline` — illustrative; trace-grounded magnitude TBD by panel.

**Strength:** produces a self-stabilizing equilibrium AT the faction baseline; growth path is preserved as a positive force from below; only operates as a brake from above. Faction-symmetric mechanism with asymmetric data; mirrors precedents. **Concern:** introduces a new per-turn term that compounds with `applyOfficerCasualtyLoss`; calibration regression risk is higher than Fix A; needs trace-grounded `CADRE_TAX_RATE`.

**Fix Shape C — Cohort-experience formula replacement.** Replace the per-turn growth term entirely with a cohort-experience model: track `personnel_replaced_this_turn` / `personnel_total` per formation, and weight new growth ratio against the freshness of the cohort. New cadre injected via reconstitution / mobilization dilutes the per-formation officer_quality proportionally. Faction-symmetric mechanism; the asymmetric data is the per-faction `cadre_replacement_quality` (replacement officers come in at 0.05 for ARBiH local-promotion vs 0.30 for VRS short-course-reserve vs 0.20 for HRHB HV-rotation). **Strength:** doctrinally most accurate; directly models the empirical phenomenon (replacement-cadre quality erosion). **Concern:** largest implementation surface; touches `recruitment_engine.ts`, `formation_spawn.ts`, `brigade_reconstitution.ts`; high calibration regression risk; would invalidate the 40w hash baseline broadly.

The Phase 0 panel structure in §7 below contemplates all three shapes and gives the panel members specific role-grounded prompts to evaluate them.

## 6. Ring Classification

**Ring 1.** Per `SENSITIVE_HISTORY_DESIGN_GATE.md` §1, Ring 1 is the structured-state combat / morale / casualty surface that the engine simulates as deterministic state. The growth path (`updateBrigadeOfficerQuality`) is already a Ring 1 mechanic; promoting `OFFICER_QUALITY_CAP` to a faction-keyed record (Fix Shape A), adding a per-turn cadre-optimism tax (Fix Shape B), or replacing the growth term with a cohort-experience formula (Fix Shape C) all operate on the same Ring 1 surface.

Negative test against §1.5 Ring 3 prohibitions:

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
| #11 calendar-driven atrocity recording | No — change is per-formation-quality coupling, not calendar |

§6 (Sensitive History Design Gate sign-off chain) is **NOT triggered** for any of the three fix shapes. The change is not in any §6 row.

## 7. Phase 0 Panel Structure for the Successor Implementation Lane

Mirrors the Lane A `OFFICER_CASUALTY_MULT_PHASE_0_PANEL` pattern: 4 expert reads with role-specific questions, recommended numerics or fix-shape selection, GO/NO-GO/CONDITIONS verdict criteria, binding stop triggers.

### 7.1 Panel Member 1 — `/game-designer`

**Authority:** Design intent and mechanic consistency with Game Bible / Rulebook; canon interpretation; Ring boundary interpretation under `SENSITIVE_HISTORY_DESIGN_GATE.md`.

**Questions:**
1. Is per-faction `OFFICER_QUALITY_CAP` (Fix A) a Ring 1 honest-mechanic? Negative-sum thesis alignment?
2. Does Fix B (cadre-replacement-optimism tax) preserve the faction-symmetric mechanism / asymmetric data precedent set by `FACTION_LEARNING_RATE` / `OFFICER_CASUALTY_MULT`?
3. Does Fix C (cohort-experience replacement) cross into territory that should require a Phase 1.5 design review with Game Bible / Rulebook authority before any code lands?
4. Recommend a fix shape with grounded numerics or call for further investigation before Phase 1 dispatch.

**Recommended pre-engagement reading (mandatory):**
- This audit (§3 source inventory + §4 attribution + §5 named defect)
- `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` (Lane A panel — predecessor pattern)
- `docs/10_canon/Game_Bible_v0_9_0.md` §13 (negative-sum thesis)
- `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §1.5 (Ring 3 negative tests)

### 7.2 Panel Member 2 — `/historian`

**Authority:** Bosnian war historical knowledge derived from Balkan Battlegrounds + ICTY-cited primary sources.

**Questions:**
1. Is the empirical claim "VRS / HRHB late-war replacement cadre is LOWER quality than the cadre it replaces" historically defensible? BB volume / page citations preferred.
2. Does the doctrinal arc support an active DECLINE in VRS / HRHB officer_quality through 1995 (Fix B / C), or merely a flat ceiling (Fix A)?
3. Are the proposed Fix A numerics (`RBiH: 0.85 / RS: 0.55 / HRHB: 0.40`) historically grounded? Recommend revisions or independent values.
4. Does Fix C (cohort-experience) require modeling specific historical events (Krajina exodus, Operation Storm refugee impact on RS reserves, Federation-transition rotation) that are currently outside the growth-path scope?

**Recommended pre-engagement reading (mandatory):**
- This audit (§3 source inventory)
- BB1/BB2 chapters on VRS officer corps 1992-1995, HRHB Federation transition 1994
- `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` /historian section (predecessor history)

### 7.3 Panel Member 3 — `/scenario-creator-runner-tester`

**Authority:** Scenario harness, run interpretation, calibration regression assessment, ahistorical-result flagging.

**Questions:**
1. What 40w smoke regression tolerance is acceptable for each fix shape? (Fix A is most conservative, Fix C most aggressive)
2. What 188w trajectory acceptance gates are binding? Mirror Lane A's gates: VRS+HRHB whole-run Δ/turn ≤ 0; RBiH whole-run Δ/turn ≥ +0.001; RS active brigade count at t188 ≥ 35; final_state_hash emits cleanly.
3. Per-formation gate: stayer Δ/turn for VRS+HRHB must drop nonpositive (binding new gate; this audit shows growth IS per-formation, so the binding gate must be at the per-formation level too).
4. What Wave-6-style stop trigger fires if 188w trajectory still doesn't bend? (Same pattern: STOP and produce verdict report; do NOT retune in-lane.)

**Recommended pre-engagement reading (mandatory):**
- This audit (§4 attribution + §6 ring classification)
- `docs/40_reports/audits/20260505_OFFICER_CASUALTY_MULT_PHASE_0_PANEL.md` /scenario-creator-runner-tester section (predecessor gate pattern)
- `docs/40_reports/implemented/20260504_RECONSTITUTION_188W_VERIFICATION.md` (Wave 6 verdict — first hypothesis-disproved-by-verification precedent)
- `docs/40_reports/implemented/20260505_OFFICER_CASUALTY_MULT_PHASE_1.md` (Lane A verdict — second precedent)

### 7.4 Panel Member 4 — `/determinism-auditor`

**Authority:** Identify nondeterminism risks; cite `DETERMINISM_TEST_MATRIX.md` and Engine Invariants §11.

**Questions:**
1. Does Fix A (faction-keyed cap record + accessor) introduce iteration-order or rounding-mode risk? Faction-key lookup determinism check.
2. Does Fix B (per-turn cadre-optimism tax) introduce a new arithmetic order dependency? Verify formula is per-formation pure with no cross-formation side-channel.
3. Does Fix C (cohort-experience replacement) require new state fields on `FormationState`? Serialization / hash-stability surface change?
4. 188w hash gate readiness post-Wave-7 Lane B — confirm streaming finalizer emits `final_state_hash` reliably for all three fix shapes.

**Recommended pre-engagement reading (mandatory):**
- This audit (§3 source inventory + §5 named defect)
- `docs/DETERMINISM_TEST_MATRIX.md`
- `docs/10_canon/Engine_Invariants_v0_9_0.md` §11 (Determinism Invariants)
- `docs/40_reports/implemented/20260505_REPLAY_BUFFER_STREAMING.md` (Wave 7 Lane B 188w hash gate readiness)

### 7.5 Verdict criteria (synthesis)

**GO** — All 4 panel members issue GO; fix shape selected unanimously; numerics grounded by /historian + /scenario-creator-runner-tester; no `/determinism-auditor` flagged risks unresolved.

**CONDITIONS** — Fix shape selected with binding acceptance criteria mirroring Lane A's 10-criterion shape:
1. **Code shape conformance** — faction-symmetric mechanism preserved; no `if (faction === 'X')` branches; default fallback for non-canonical faction codes.
2. **40w smoke gate** — anchors ≥ 26/27, benchmarks 6/6, area ≥ 92.0% (Fix A) / ≥ 91.5% (Fix B) / ≥ 90.5% (Fix C). Hash drift expected, not a gate.
3. **188w smoke gate** — `final_state_hash` emits cleanly; VRS+HRHB whole-run faction Δ/turn ≤ 0; RBiH whole-run faction Δ/turn ≥ +0.001; RS active brigade count at t188 ≥ 35.
4. **Per-formation stayer gate (NEW, binding)** — diagnostic at `tools/diagnostics/officer_quality_growth_trace.cjs` re-run on the 188w output; VRS+HRHB STAYER Δ/turn ≤ 0; this is the per-brigade growth-arc gate that Wave 6 + Lane A could not test because no diagnostic existed for it.
5. **Tests** — ≥ 5 new lane tests GREEN (faction-keyed cap / tax / cohort lookup, default fallback, per-faction numeric verification, determinism across invocations, byte-stability for non-canonical faction codes); focused regression on `officer_quality_update`, `attack_post_battle_effects`, `attack_resolution_osid` clusters all GREEN.
6. **Type-check** — `npx tsc --noEmit` clean.
7. **Sensitive-history compliance assertion in lane report** — explicit Ring 1 classification, no §6 sign-off chain triggered, no FORAWWV / paint anchor / political_controllers / OOB / rupture wiring / `enclave_resilience.ts` touch.
8. **Stop triggers respected** — if 188w VRS+HRHB faction Δ/turn does NOT bend nonpositive, STOP and produce Wave-6-style verdict report; do NOT retune in-lane. If per-formation stayer Δ/turn does NOT bend nonpositive but faction Δ/turn does, INVESTIGATE survivorship contamination (cohort-turnover share inversion) before merge.
9. **Out-of-scope guards** — Phase 1 MUST NOT touch `MORALE_OVERRIDE_ENABLED` flag, MUST NOT alter `OFFICER_QUALITY_FLOOR` (Fix A only — Fix B / C may need to revisit), MUST NOT alter `FACTION_LEARNING_RATE` (covered by Fix B / C selection if needed; Fix A leaves it untouched), MUST NOT couple to `war_crimes_record` (Engine Invariants §15.2 binding), MUST NOT extend scope to UNPROFOR / comms-asymmetry / ammo-scarcity surfaces.
10. **Phase 1 lane report** — under `docs/40_reports/implemented/` named per Phase 1 ship day with the standard predecessor-chain / files-changed / acceptance-gate / sensitive-history-compliance / determinism / counterfactual-safety / successor-handoff sections.

**NO-GO** — Any panel member issues NO-GO; lane closes with synthesis report; do NOT escalate to user without full panel verdict for review.

### 7.6 Binding stop triggers

1. If 188w VRS+HRHB faction-mean Δ/turn does NOT bend nonpositive → STOP, Wave-6-style verdict report, do NOT retune in-lane (third hypothesis-disproved precedent → escalate to canon review of `updateBrigadeOfficerQuality` semantics).
2. If 188w VRS+HRHB stayer Δ/turn (per `officer_quality_growth_trace.cjs`) does NOT bend nonpositive → STOP, indicates the fix shape selected does not actually constrain per-formation growth (only constrains faction-mean drift via cohort turnover, which is the survivorship hypothesis from §4 finally biting).
3. If 40w benchmarks drop below 6/6 → STOP, bot calibration regression.
4. If 188w RS active brigade count drops below 35 → STOP, officer-quality decay coupled with morale-override may be cascading into mass dissolution.
5. If `final_state_hash` fails to emit at 188w (replay-buffer streaming regression) → STOP, do NOT retry without diagnosis (Mission C precedent).

## 8. Sensitive-History Compliance (THIS lane)

- **Ring classification:** **Ring 1** (audit only; no Ring 1 surface modified by this audit).
- **§6 (`SENSITIVE_HISTORY_DESIGN_GATE.md`) sign-off chain:** **NOT TRIGGERED** for this audit. The audit reads engine source files for inventory; the new diagnostic (`tools/diagnostics/officer_quality_growth_trace.cjs`) is a CJS post-processor over `brigade_temporal_log.jsonl`; neither writes engine state nor enters the sim path.
- **Read-only assertion:** No source modified. No test modified. No scenario data modified. No paint anchor / political_controllers / OOB / FORAWWV / rupture-wiring / `enclave_resilience.ts` touched. No combat-math number tuned. The report + diagnostic are the deliverables.
- **Faction-symmetric mechanism check (this audit + diagnostic):** PASS. Diagnostic iterates `['HRHB', 'RBiH', 'RS']` in canonical sorted order; no faction-special-case logic; uses `strictCompare` for formation iteration; no `Math.random` / `Date.now` / locale-sort.
- **Engine Invariant §11 (Determinism) compliance:** Diagnostic uses sorted faction iteration, sorted formation iteration via `strictCompare`, numeric-ascending turn iteration. Pure aggregation; no temporal dependency.

## 9. Successor Handoffs

1. **Phase 0 panel for `OFFICER_QUALITY_GROWTH_PATH` Phase 1 implementation** — dispatch the 4-member panel (`/game-designer`, `/historian`, `/scenario-creator-runner-tester`, `/determinism-auditor`) with this audit as the binding pre-engagement read. Panel selects between Fix Shape A / B / C. User authorization required to dispatch Phase 1 lane after panel verdict.

2. **Canon amendment opportunity (potential successor lane):** if the Phase 0 panel selects Fix Shape A or Fix Shape B and the successor implementation lane succeeds at bending the 188w arc, propose a canon amendment to `Engine_Invariants_v0_9_0.md` §15 (Officer System Invariants) adding a new sub-clause documenting the per-faction cadre ceiling (Fix A) or cadre-optimism tax (Fix B) as canonical. Audit-only this lane; the amendment is downstream once the implementation ships.

3. **Out-of-scope guards for the implementation lane:**
   - MUST NOT extend scope to UNPROFOR / comms-asymmetry / ammo-scarcity surfaces (per `MEMORY.md` "P0 historical gaps"; those remain separate calibration handoffs).
   - MUST NOT couple `officer_quality` to `war_crimes_record` (Engine Invariants §15.2 binding informational-only).
   - MUST NOT touch `MORALE_OVERRIDE_ENABLED` flag (per LANE-NIGHTSHIFT-N4 lane handoff; default-off promotion is its own lane).
   - MUST NOT touch `OFFICER_CASUALTY_MULT` numerics (Lane A reverted; revisiting would re-litigate Lane A's verdict and is out of scope for this growth-path lane).
   - MUST NOT touch `FACTION_LEARNING_RATE` numerics WITHOUT explicit Phase 0 panel re-verdict (Fix B / C may necessitate; Fix A does not).

4. **Wave 6 OOM perf concern remains a separate lane** — the 188w post-sim summary write OOM is now mitigated by Wave 7 Lane B streaming finalizer (`107fe60b`); n1665's full-emit run validates the mitigation at scale. No further perf work needed for the growth-path Phase 1 lane.

## 10. Files Changed

| File | Type | Note |
|---|---|---|
| `tools/diagnostics/officer_quality_growth_trace.cjs` | NEW (audit) | Per-formation survivorship-vs-growth attribution post-processor over `<run_dir>/brigade_temporal_log.jsonl` |
| `docs/40_reports/audits/20260505_OFFICER_QUALITY_GROWTH_PATH_AUDIT.md` | NEW | This report |

No engine, scenario, test, paint anchor, OOB, FORAWWV, political_controllers, rupture-wiring, or `enclave_resilience.ts` files modified.
