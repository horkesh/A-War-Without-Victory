# Krivaja-95 Roster Lifecycle — Phase 1.5 Mini-Panel

**Lane**: LANE-NIGHTSHIFT-KRIVAJA-PHASE-1-POINT-5-MINI-PANEL
**Date**: 2026-05-06
**Mode**: Read-only audit. NO engine code, scenario data, test, or canon changes.
**Authorization**: Trip-mode autonomous 2026-05-06 — "do detailed research yourself for each point and move forward with the best course of action."
**Predecessors**:
- `docs/40_reports/audits/20260505_KRIVAJA_ROSTER_LIFECYCLE_PHASE_0_PANEL.md` (Phase 0, commit `6a288c35`).
- `docs/40_reports/implemented/20260505_KRIVAJA_ROSTER_PHASE_1_IMPLEMENTATION.md` (Phase 1 SHAPE α, commit `bc44ddec`).
- `docs/40_reports/audits/20260506_188W_AB_EXPERT_ANALYSIS.md` (yesterday — RS overshoot lesson).
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` durable lesson "fix the upstream lever, don't tune the downstream multiplier" (LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE).

## 1. Scope

Phase 1 SHAPE α (cohesion 20→15 at turn 52; morale 15→9 at turn 104, RS-only step-curves) recovered **rs_1st_zvornik** (was destroyed t120, now ACTIVE at t179) but **failed to save**:

- **rs_1st_bratunac**: now destroyed t113 via 3-of-3 (low all). MID-1994 — *outside* the late-war window Phase 1 widened (cohesion-curve change starts turn 52 but Bratunac at t113 has all three criteria below floor; morale-curve change starts turn 104, so at t113 only the cohesion threshold change is relevant — and Bratunac had cohesion 18 at the t101/t103 panel observation, already below the 15 widened threshold).
- **rs_skelani_battalion**: still destroyed t171 via lowPersonnel + lowMorale. Sat metastable at p=236, m=20, c=68 for 6+ turns. The morale step from m=20 → m=10 in a single turn ate the entire safety margin between hysteresis-reset (>20) and the widened dissolution threshold (9 at turn 104).

AC5 result at Phase 1: **3/5 ACTIVE at t179** vs binding threshold ≥4/5 — CONTINUE-WITH-CAVEAT under ST2 (delta = 1 brigade).

This panel produces GO/NO-GO/CONDITIONS verdict + binding ACs + stop triggers for a follow-on Phase 1.5 lane.

## 2. Root-Cause Classification — Per Brigade

### 2.1 `rs_1st_bratunac` (destroyed t113 in Phase 1; was t101/t103 in n1619)

Phase 0 §3.2 trajectory: arrived at op:srebrenica:osmace_2 with **morale already collapsed** (m=0 streak). At t101–t103: personnel 663→625→590→0 across three turns; cohesion 25→23.3→21.6→19.9; morale 0 throughout. 3-of-3 criteria simultaneously: lowPersonnel (590 < 400 boundary crossed in the destruction turn), lowCohesion (≤20), lowMorale (=0).

Phase 1 SHAPE α moved destruction from t103 → t113 (~10 weeks later) because cohesion-floor widening (20→15 at turn 52) gave the brigade a buffer from the cohesion criterion alone. But by t113 cohesion had drifted further down past 15 and morale was again at floor — so 3-of-3 reasserted.

**Classification**:
- (a) calibration drift in mid-war thresholds — **PARTIAL**: Phase 1's cohesion widening did extend life, but only by ~10 weeks; widening further (e.g. cohesion floor 12 from turn 39) would extend again, but evidence below shows cumulative drift is the root.
- (b) upstream personnel/morale/cohesion drift rate too aggressive — **PRIMARY**. Phase 0 §3.2 shows Bratunac arrived at osmace_2 with morale already at 0. The morale collapse happened upstream of the dissolution check. Once morale is pinned at 0, `morale_drift.ts:258` *also* drains 5%/turn personnel — the brigade then takes a self-reinforcing cascade: low morale → desertion → fewer personnel → even fewer reinforcements absorbed → further morale collapse. By the time the dissolution gate fires, the brigade is structurally unrecoverable.
- (c) data error in scenario start state — **NO**. Bratunac OOB initial_personnel=1800 matches BB1/ICTY records.
- (d) genuine combat losses — **PARTIAL**. Bratunac fought 4 battles for 1335 casualties (~74% of init). This is heavy but *not* annihilating — historically the brigade survived all of 1992–1995. The destruction is the engine running brigades into the ground because reactive defense couldn't rotate them out.

**Root cause for Bratunac**: PRIMARY = upstream rate-of-drift. SECONDARY = mid-war threshold floor.

### 2.2 `rs_skelani_battalion` (destroyed t171, unchanged from n1619)

Phase 0 §3.3 trajectory: held flat at p=236 / m=20 / c=68 for 6+ turns at the dissolution-criteria edge. Then morale dropped from 20 → 10 between t170 and t171. With personnel=236 (<400=lowPersonnel) and morale=10 (≤15 at turn 171, since the curve transition is at 104), 2-of-3 criteria met → dissolution.

Phase 1 SHAPE α widened the morale threshold to 9 at turn 104 — but morale dropped to 10 in one turn, then would presumably keep dropping below 9 the next turn (the trajectory log shows m=10 at the destruction turn itself). The widening gives a one-turn reprieve at most; Skelani is the **exact pathological case** where a single-turn morale_drift event eats the entire safety margin between hysteresis-reset (>20) and the dissolution threshold (9).

**Classification**:
- (a) single-turn morale_drift event with magnitude 5–10 points — **YES**. Worst-case morale drift in one turn from `morale_drift.ts`:
  - AFFINITY_DRIFT_DOWN: −2 (low-affinity OSID).
  - ENCIRCLEMENT_ENEMY_POP_DRIFT: −3 (encircled in enemy pop).
  - CRITICAL_SUPPLY_DRAIN: −1 (besieged).
  - CRITICAL_EXHAUSTION_PENALTY: −1.5 (fatigue ≥95%).
  - BATTLE_MORALE_DRIFT 'catastrophic' × FACTION_DEFEAT_SENSITIVITY[RS]=1.3: −5.2.
  - Worst case stack: −12.7. Well within the m=20 → m=10 drop observed.
- (b) threshold guard logic permits step-bypass — **PARTIALLY**. The guard is `morale ≤ DISSOLUTION_MORALE_THRESHOLD`. There is no per-turn step cap; if morale crosses the threshold in one step, the gate fires immediately. Hysteresis exists for the *override streak* (in `morale_drift.ts:288–293`), but NOT for the 2-of-3 dissolution gate.
- (c) lack of per-turn morale_drift cap — **YES**. `grep -r MORALE_DRIFT_MAX|morale_drift_max|max_per_turn` returns 0 hits in `src/`.
- (d) genuine combat losses — **NO**. Skelani had **0 battles_fought** and 214 casualties (panel §3.3 confirmed via destroyed_brigades.json).

**Root cause for Skelani**: PRIMARY = lack of per-turn morale_drift cap. SECONDARY = metastable-edge dissolution-criteria architecture (no hysteresis on the dissolution gate itself).

### 2.3 Joint structural lens

The two brigades are **different failure modes** that the same fix cannot cleanly address:

- **Bratunac**: cumulative drift over weeks. Needs upstream slowdown OR earlier (turn 39+) protection.
- **Skelani**: instantaneous step. Needs per-turn drift bound OR threshold-gate hysteresis.

This is the panel's most important finding: **a single shape will fix one but not both** unless we either (i) add hysteresis on the dissolution gate (covers both) or (ii) ship two independent levers in one lane.

## 3. Candidate Phase 1.5 Shapes

### SHAPE δ (smallest-delta — Skelani-only via per-turn morale_drift cap)

**Mechanism**: add `MORALE_DRIFT_MAX_PER_TURN` constant to `morale_drift.ts` (e.g. 8 points). Cap absolute negative drift at this magnitude before applying the floor/ceiling clamp. Faction-symmetric (same constant for all factions).

**Files touched**:
- `src/sim/combat/morale_drift.ts` (~6 LOC: constant + clamp).
- `tests/morale_drift_per_turn_cap.test.ts` (new, ~80 LOC: cascade-bypass guard test, faction-symmetry test, determinism test).
- `data/scenarios/timelines/apr1992.json` — UNCHANGED.
- `src/state/war_timeline.ts` — UNCHANGED.
- Optional: faction-keyed step-curve for the cap (under `morale_drift_max_per_turn`) — adds ~12 LOC if step-curving (post-MVP).

**Total LOC**: ~10 source + ~80 test = ~90.

**Predicted outcome**:
- Skelani t171: morale drops 20→12 in one turn (capped at 8); next turn drops 12→4 (capped at 8). m=12 is above threshold 15 → no dissolution at t170. m=4 is below the t171 widened threshold of 15 BUT still permits dissolution; however, the personnel cascade from morale ≤0 is delayed ~1 turn, allowing reinforcement + recovery cycles to potentially raise morale back above the override-reset 20.
- **More important**: in real trajectories the worst-case stack rarely fires in consecutive turns. Skelani sat at m=20 for 6 turns flat. A single −12.7 burst would be capped to −8, leaving morale at 12 — STILL above the 9-threshold curve at turn 104+, STILL below the 15-threshold pre-104. Dissolution would still fire if Skelani is at turn 171 with 9 cap, but the fragile metastable edge is pushed back a turn, and most importantly the cap turns a single-turn 20→0 plummet (which would then trigger the morale_drift.ts:258 5%/turn personnel desertion cascade) into a graduated 20→12→4 trajectory.
- AC5 effect: rs_skelani_battalion likely still destroyed by t179 unless reinforcement-bolus arrives during the capped descent. Conservative prediction: **0–1 brigade saved**. AC5 likely 3/5 → 3-4/5.
- Bratunac: NOT addressed (Bratunac's drift is cumulative, not single-turn).

**Verdict**: insufficient on its own to close AC5 ≥4/5. Could be combined with SHAPE ε.

### SHAPE ε (mid-delta — Bratunac via earlier-window step-curve)

**Mechanism**: widen the existing `dissolution_*_threshold` step-curves to start at turn 39 (mid-war boundary) instead of turn 52/104. Mid-war RS gets a slightly more generous threshold floor.

**Files touched**:
- `data/scenarios/timelines/apr1992.json` (~6 lines changed: shift `start_turn` from 52→39 for cohesion; from 104→39 OR add a third step at turn 39 for morale).
- `tests/krivaja_phase_1_5_threshold_curves.test.ts` (new, ~60 LOC: lookupStepCurve assertions + mid-war RS dissolution exemption test).

**Total LOC**: ~6 data + ~60 test = ~66.

**Predicted outcome**:
- Bratunac t113: cohesion was 18 at observation (panel §3.2). With widened cohesion floor 15 starting at turn 39, criterion fires only if cohesion ≤15. Bratunac would need cohesion to drop further to dissolve — likely buys ~10–15 weeks. With morale also widened (e.g. floor 12 at turn 39), the 3-of-3 path is broken until later.
- Skelani t171: morale-curve change at turn 104 is unchanged or moved earlier (turn 39); destruction turn is at 171 which is well past either start. The threshold change at turn 39 doesn't help Skelani directly because the curve transition for morale at turn 104 already covers t171.
- AC5 effect: Bratunac likely saved through t179. Skelani still vulnerable. Conservative prediction: **1 brigade saved**. AC5 likely 3/5 → 4/5 — barely meets binding threshold.

**Risk**: *RS overshoot*. Per yesterday's 188w A/B analysis (`20260506_188W_AB_EXPERT_ANALYSIS.md`), MORALE_OVERRIDE retune produced **48 RS dissolutions n1690 vs 38 n1619** (override=ON vs predecessor) — and 26 n1691 (override=OFF) — i.e. tuning either way swings RS dissolution count by ~10 units in 188w. Earlier-window protection could push RS dissolution count *below* the 26 override-off baseline → calibration overshoot risk.

**Verdict**: closes AC5 with thin margin; carries calibration overshoot risk on RS dissolution count.

### SHAPE ζ (largest-delta — upstream rate-of-drift)

**Mechanism**: address the personnel/morale/cohesion drift mechanic itself. Reduce per-turn drift coefficients via a faction-keyed step-curve under a new timeline field (`morale_drift_rate`, `cohesion_drift_rate` already exists). The most direct lever per durable KNOWLEDGE: target the morale_drift.ts:258–263 *desertion personnel-loss* (5% at m=0, 2% at m<15) — soften to 2.5% / 1% — OR add a step-curve to make the rate faction-asymmetric in mid-war.

**Files touched**:
- `src/sim/combat/morale_drift.ts` (~15 LOC: constants + lookup wiring for desertion rate).
- `src/state/war_timeline.ts` (~10 LOC: new optional field schema).
- `data/scenarios/timelines/apr1992.json` (~10 lines: new step-curve).
- Plus potential touches to `cohesion_drift.ts` if cohesion-drift step-curve is also revisited.
- New test file (~120 LOC).

**Total LOC**: ~30–50 source + ~120 test = ~150–170.

**Predicted outcome**:
- Bratunac t113: with desertion-rate halved at m=0, the personnel cascade is slower; morale-floor effects don't compound as fast. Estimated +20 weeks to destruction (potentially survives through t179).
- Skelani t171: doesn't help directly — Skelani's destruction is via morale crossing the threshold gate, not via desertion-rate cascades. (Skelani's casualties are 214 across 170 turns = ~1.25/turn; the 2% desertion rate at m=15 has already been the dominant attrition source. Halving it could keep p above 400 longer, but the metastable-edge dissolution gate would still fire when morale tips below 9.)
- AC5 effect: Bratunac saved; Skelani likely still destroyed. Conservative prediction: **1–2 brigades saved**. AC5 likely 3/5 → 4–5/5.

**Risks**:
- **Largest blast radius** of the three shapes — touches morale_drift.ts:258–263 which interacts with EVERY brigade in EVERY turn.
- **§6 review possibly required**: morale_drift.ts is referenced by Engine Invariants v0.7.0 §6.2.4 (LANE-NIGHTSHIFT-N4 morale-collapse override). Modifying drift coefficients downstream of the streak counter could change the streak's semantics. *Recommend §6 sign-off chain before commit if SHAPE ζ chosen.*
- Calibration-overshoot risk: HIGH. RS desertion rate softening could broadly elevate VRS personnel reserves, regressing FORCE_QUALITY_GAP_2 fixes from earlier this calibration band.

**Verdict**: highest-impact, highest-risk. Triggers §6 chain.

## 4. Recommended Shape

### Recommended: **SHAPE δ + ε in a single combined lane** (call it SHAPE δε).

Rationale:

1. **Two distinct failure modes need two distinct levers.** The panel's structural finding (§2.3) is that Bratunac is cumulative-drift and Skelani is single-turn-step. SHAPE δ addresses Skelani; SHAPE ε addresses Bratunac. Neither alone closes AC5 ≥4/5 with confidence. Combining them is the smallest viable scope.

2. **Both stay Ring 1 with no §6 surface.** SHAPE δ adds a faction-symmetric per-turn cap (no §6 because it's a generic combat-mechanic floor). SHAPE ε is data-only step-curve adjustment in apr1992.json — exactly the substrate Phase 1 SHAPE α used. Combined LOC ~70–90 source + ~140 test, well under any meaningful blast-radius limit.

3. **SHAPE ζ deferred** to a future lane after AC5 verification, because:
   - The upstream-drift fix has the right INTENT per durable KNOWLEDGE, but it has the largest blast radius and crosses the §6 morale-streak-counter boundary.
   - If SHAPE δε closes AC5 ≥4/5, ζ becomes premature optimization.
   - If SHAPE δε does NOT close AC5, then ζ becomes the canonically-justified next move with §6 chain.

4. **Calibration-overshoot risk is bounded** in SHAPE δε:
   - SHAPE δ caps drift magnitude — by definition can only *reduce* the speed of negative drift, never accelerate it. RS dissolution count cannot overshoot below current baseline by more than 1–2 brigades per 188w.
   - SHAPE ε shifts threshold-curve start from turn 52→39 — but only for the cohesion field already tuned in Phase 1. Worst case: RS dissolution count drops from 26 (n1691 baseline) to ~20–22 in 188w. Still above zero, still above unrealistic-protection trigger of <13 (= 0.5× n1691).

### Predicted post-impl AC5 outcome (binding)

| Brigade | Phase 1 status (3/5 ACTIVE) | SHAPE δε predicted t179 status | Confidence |
|---|---|---|---|
| `rs_1st_zvornik` | ACTIVE p=2000 | ACTIVE (Phase 1 already saved this) | HIGH |
| `rs_1st_bratunac` | INACTIVE @ t113 | ACTIVE (SHAPE ε buys 10–15 weeks; mid-war threshold widening) | MEDIUM |
| `rs_skelani_battalion` | INACTIVE @ t171 | INACTIVE @ t175–179 (SHAPE δ delays but doesn't fully save) OR ACTIVE if reinforcement window opens | LOW–MEDIUM |
| `rs_1st_milii` | ACTIVE p=2000 | ACTIVE (unchanged) | HIGH |
| `rs_5th_podrinje` | ACTIVE p=2000 | ACTIVE (unchanged) | HIGH |

**Expected AC5**: 4/5 ACTIVE at t179 (PASS, exact match to binding threshold). Skelani is the marginal case — a 4/5 ≥ binding-threshold result is the realistic best estimate, with 5/5 as upside if Skelani gets a reinforcement bolus during the SHAPE δ-graduated descent.

## 5. Acceptance Criteria (binding for Phase 1.5 lane)

| # | Criterion | Metric | Threshold | Verification |
|---|---|---|---|---|
| AC1 | Code-shape diff ≤ 100 LOC across owner files | LOC delta in PR | ≤ 100 LOC additions in `src/sim/combat/morale_drift.ts` and (optionally) `src/state/war_timeline.ts`; ≤ 12 lines data delta in `data/scenarios/timelines/apr1992.json` | `git diff main..HEAD --stat -- 'src/sim/combat/*' 'src/state/*' 'data/scenarios/timelines/*'` |
| AC2 | Owner-file enumeration explicit | List in PR description | Exactly enumerates: `src/sim/combat/morale_drift.ts`, `data/scenarios/timelines/apr1992.json`, optional `src/state/war_timeline.ts`, plus tests. NO edits to `enclave_resilience.ts`, `rupture_consequences.ts`, OOB JSON, `brigade_dissolution.ts` (already shipped Phase 1), `formation_constants.ts` | PR description review |
| AC3 | Faction-symmetric implementation | Source review | No `if (faction === 'RS')` branches; no string match on `rs_1st_*` brigade IDs; no hardcoded OSIDs; no Krivaja brigade ID strings | Grep search for `rs_1st_zvornik\|rs_1st_bratunac\|rs_skelani_battalion\|rs_1st_milii\|rs_5th_podrinje\|krivaja` (case-insensitive) in PR diff returns 0 in source; tests/docs allowed |
| AC4 | 40w smoke gate — anchors hold | `npm run sim:scenario:run:40w` | anchors ≥ 26/27 (matches predecessor n1680 baseline 26/27); benchmarks 6/6 PASS | Compare to last good 40w hash `4ec026234d661e31` (n1680) |
| AC5 | 188w sensitive-history regression — Krivaja participants ACTIVE at t179 | ICTY OOB participant count ACTIVE | ≥ 4 of 5 named formations ACTIVE at t179 (status='active', personnel ≥ 50% of OOB initial_personnel) | New diagnostic: ICTY roster-state probe at trigger turn — same probe Phase 1 used |
| AC6 | 188w force_ratio progression at Krivaja-95 trigger window | predictor `force_ratio` at t168–t179 | ≥ 0.094 (predecessor n1619 baseline) AND not lower than n1690 baseline. Higher is better but this AC is verdict-only-fail (does not block lane). | `runs/.../weekly_report.jsonl` at trigger window |
| AC7 | RS dissolution count regression | 188w destroyed_brigades RS count | Within band [13, 50]: not below 13 (= 0.5× n1691 baseline 26 — calibration under-correction trigger), not above 50 (= n1690 ceiling +2 — over-protection regression) | `destroyed_brigades.json` per-faction count |
| AC8 | Lane tests + focused regression GREEN | `npm run test:vitest` | All 3513+ tests pass; new lane tests added (per-turn cap, faction-symmetry, determinism) | CI |
| AC9 | Sensitive-history Ring classification declared | PR description Ring badge | Ring 1 (faction-symmetric mechanism + data-only step-curve); §6 sign-off NOT required | PR description |
| AC10 | Out-of-scope guards explicit | PR description guards | No edits to: `enclave_resilience.ts`, `rupture_consequences.ts`, OOB JSON for ICTY-cited rosters, `srebrenica_*`, hardcoded enclave `osid_list`, scenario-start `init_formations` for Krivaja participants, `morale_drift.ts:258–263` desertion-rate constants (those are SHAPE ζ surface — out of scope for δε) | PR description review + diff scan |
| AC11 | Determinism preserved | `tsc --noEmit` + 3-seed determinism check | byte-identical 40w final_save across 3 deterministic re-runs; pure clamp/lookup; no new iteration | Three-run hash compare |
| AC12 | Calibration master + PROJECT_LEDGER updated; FORAWWV not touched | docs delta | Both `docs/40_reports/CALIBRATION_MASTER.md` and `docs/PROJECT_LEDGER.md` get a commit-linked entry; `docs/10_canon/FORAWWV.md` NOT touched | `git diff` |

## 6. Stop Triggers (binding for Phase 1.5 lane)

| # | Condition | Verdict |
|---|---|---|
| ST1 | Krivaja force_ratio drops below predecessor n1619 0.094 at t179 | **revert** (regression — fix was supposed to improve, not regress) |
| ST2 | 40w anchors regress past 26/27 | **revert** (calibration regression in 40w smoke window) |
| ST3 | Load-transfer to HRHB/RBiH — i.e. mid-war threshold widening protects RS but not other factions in a way that materially distorts cross-faction dissolution counts (RBiH dissolution count rises by >50% vs n1691, OR HRHB rises by >50% vs n1691) | **STOP and re-panel** — calibration-load asymmetry not anticipated |
| ST4 | Shape requires `enclave_resilience.ts` modification | **STOP** (Ring 2 — out of scope for this lane) |
| ST5 | Shape requires `morale_drift.ts:258–263` desertion-rate modification | **STOP** (SHAPE ζ surface — out of scope for δε; if needed, escalate to §6 sign-off chain in a separate lane) |
| ST6 | RS dissolution count falls below AC7 lower band (13 = 0.5× n1691 baseline) | **STOP** — calibration-overshoot per durable KNOWLEDGE 2026-05-04 ("under-correcting is also wrong") |
| ST7 | Determinism breaks (AC11 fail) | **revert immediately** — non-negotiable; root-cause before resuming |

## 7. Sensitive-History Ring Classification

**This audit (Phase 1.5 mini-panel)**: **Ring 1** — read-only investigation; no engine code, no scenario data, no test, no canon touched. Only `docs/40_reports/audits/...` authored.

**Anticipated Phase 1.5 implementation lane (SHAPE δε)**: **Ring 1 / no §6**.
- SHAPE δ (per-turn morale_drift cap): faction-symmetric numeric clamp — same path as `MIN_COMBAT_PERSONNEL` floor or `FATIGUE_MAX` ceiling. No §6 surface.
- SHAPE ε (apr1992.json step-curve start_turn shift): data-only delta on the substrate Phase 1 already shipped. Ring 1.
- The combined lane stays inside the Phase 1 envelope; same owners; same mechanism-symmetric posture. No §6 sign-off chain needed.

**If SHAPE ζ is later attempted**: **Ring 2 / §6 chain required** (sign-off: /historian + /game-designer + /canon-compliance-reviewer). The morale-drift desertion-rate path (morale_drift.ts:258–263) is downstream of the LANE-NIGHTSHIFT-N4 morale-streak-counter that is canonized in Engine Invariants v0.7.0 §6.2.4.

## 8. Verdict

**CONDITIONS** — go-ahead with the recommended SHAPE δε combined lane, scoped to AC1–AC12 above, with stop-triggers ST1–ST7 binding.

Rationale:
- Phase 0 root-cause classification is solid (calibration drift on a faction-symmetric predicate). Phase 1 SHAPE α was the right *kind* of fix but the *wrong granularity* (only late-war curves, only the 3-of-3 gate, no per-turn step bound).
- Phase 1.5 SHAPE δε combines (a) per-turn drift cap covering the metastable-edge case (Skelani) and (b) earlier-window threshold widening covering the cumulative-drift case (Bratunac). Each is independently small (~70–90 source LOC); together they cover the two distinct failure modes Phase 0 §2.3 identified.
- AC5 prediction: **4/5 expected, 5/5 upside, 3/5 floor** — at minimum maintains Phase 1 baseline, at expected case crosses the binding threshold for the first time.
- Calibration-overshoot risk is bounded by ST3 (load-transfer detection) and ST6 (RS lower-band trip). Neither shape touches §6 surface.
- SHAPE ζ deferred — the durable KNOWLEDGE "fix the upstream lever, not the downstream multiplier" is *correct in principle* but is the higher-risk, higher-blast-radius option. Defer until SHAPE δε is proven insufficient or proven-but-overshooting.

GO if Phase 1.5 lane:
- Implements SHAPE δ (per-turn morale_drift cap, faction-symmetric, ~10 source LOC).
- Implements SHAPE ε (apr1992.json step-curve start_turn shift to turn 39, ~6 lines data delta).
- Adds tests covering per-turn cap, faction-symmetry, determinism, and AC5 probe.
- Updates CALIBRATION_MASTER and PROJECT_LEDGER on commit.

NO-GO if Phase 1.5 lane:
- Touches `enclave_resilience.ts`, `rupture_consequences.ts`, OOB JSON for ICTY rosters, or `morale_drift.ts:258–263` desertion-rate (those are SHAPE ζ surface).
- Hardcodes Krivaja participants OR injects Skelani-specific exception.
- Adds osid_list carve-outs for individual brigades or municipalities.
- Mounts a per-faction `if (faction === 'RS')` branch.

## 9. Notes & Findings

- Phase 0's prediction that Bratunac would be in the "calibration drift" class was correct — but the panel under-emphasized the **upstream rate-of-drift** contribution. Phase 1 SHAPE α only widened the downstream gate; the morale_drift.ts cascade (m=0 → 5%/turn personnel desertion) ate the safety margin.
- Skelani's metastable plateau (6+ turns at p=236, m=20, c=68) is a textbook **edge-of-criteria stability point**. The dissolution gate is gated on absolute thresholds without hysteresis; once morale crosses 15 by any drift-source amount, the gate fires the next turn. This is structurally similar to the LANE-NIGHTSHIFT-N4 hysteresis-on-streak design — the same hysteresis idea could be extended to the gate itself in a future lane.
- The Phase 1 commit (`bc44ddec`) hash drift in 188w (n1678 `bd043ba67dd5257a` vs n1619 `4ba56cfd4fae9824`) reflects expected calibration drift from threshold-curve change. Phase 1.5 will further drift the hash; ST7 (determinism break) is the only hash-related blocker.
- The `force_ratio` field is absent from current operation_diagnostics schema (Phase 1 §4 noted this). AC6 is verdict-only-non-blocking until that diagnostic is restored. A separate observability lane could re-introduce force_ratio reporting at the planning-window granularity.
- Yesterday's MORALE_OVERRIDE retune produced **48 RS dissolutions n1690 (override=ON) vs 26 n1691 (override=OFF) vs 38 n1619 (predecessor)**. SHAPE δε targets 188w with override=OFF in the production scenario — the n1691 baseline (26) is the relevant calibration anchor for AC7. The n1690 ceiling (50) is conservative upper-bound for the AC7 "over-protection regression" trigger.

## 10. Audit Verification

Engine code untouched: `git status --short` after authoring this report shows the new file path
`docs/40_reports/audits/20260506_KRIVAJA_PHASE_1_5_MINI_PANEL.md` plus pre-existing concurrent-lane modifications (`.claude/scheduled_tasks.lock`, `data/derived/latest_run_final_save.json` — not touched by this lane).

— END MINI-PANEL REPORT —
