# Force-Trajectory Wiring Plan — Implementation

**Codex execution update (2026-05-22):** Accepted as roadmap intake. Codex verified the referenced code surfaces locally and has begun execution. W1 shipped in `fix(combat): repair war exhaustion tempo threshold`; W2 shipped in `feat(opportunity): gate late-war ops on defender trajectory`; W2.5 shipped in `feat(opportunity): resolve headless scenario decisions`; W2.6 is now launch-boundary complete for Donji Vakuf via the live Komar contact edge and source-OOB roster. Continue one narrow behavior lane at a time with local tests, baseline evidence, docs, ledger, and push before the next lane.

**Date:** 2026-05-22
**Author:** orchestrator synthesis of five specialist memos (`docs/40_reports/audits/20260522_{TRAJECTORY_MECHANIC_GAPS,HISTORICAL_FORCE_TRAJECTORY_DATAPOINTS,CANON_TRAJECTORY_FRAME,FORCE_TRAJECTORY_ENGINE_INVENTORY,OPS_FORCE_TRAJECTORY_GATING}.md`).
**Status:** DRAFT — read-only proposal. No code edits. Awaiting user review before any `src/sim/combat/*` edit.
**Codex coordination required:** This plan touches **only `src/sim/combat/*`** — entirely within Codex's parallel-work zone. Execution must sequence after Codex's current H1/strict-null/sector-perf lane closes, or carve a single sync window. Do not execute Tier 1 changes while Codex has live edits in `combat_math.ts`, `operation_opportunity_catalog_*.ts`, or `corps_operation_readiness.ts`.

---

## 1. Goal

Convert the engine's already-existing force-trajectory state into an emergent driver of late-war territorial outcomes. The arc exists in the simulated data already; the missing piece is **wiring**, not new mechanics.

Specifically:
- The per-brigade force-quality state machine produces the historical "competent army → competent rubble" arc for VRS (n1741: morale 12.6 / cohesion 26.5 at w188) and the inverse arc for ARBiH (morale 89.5 / cohesion 73.6 / officer 0.087→0.807 at w188) per existing audit `docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` §11.
- Combat math is trajectory-responsive at the formation level — `getActiveEquipmentQualityMultiplier` is already multiplied into both attacker (`combat_math.ts:1301`) and defender (`combat_math.ts:1463`) power.
- Launch predicates never read trajectory state — no catalog op calls `computeCorpsOperationReadiness(state, vrsKrajinaCorps)` on a defender corps despite that pure faction-agnostic helper existing at `corps_operation_readiness.ts:380`.
- `casualty_ledger` has 9 writers and 0 combat-math readers; a faction can lose 80% of its army with no feedback.
- `war_exhaustion` is clamped at 100 (`exhaustion.ts:106`) but combat-math tempo penalty thresholds at 500/800 (`combat_math.ts:1575-1576`). The penalty can never fire. That's Issue #47's root cause — stale constants, not a missing mechanic.

The expected outcome from closing these gaps: ~6-8pp of the current 10pp Oct-1995 painted-target gap closes from Tier 1 wiring alone; an irreducible 3-4pp residue closes from Tier 2's four new ops.

---

## 2. Architecture decision

**Sequence Tier 1 (wiring) first, measure, then ship Tier 2 (new ops) if the measurement confirms the diagnosis.** The Tier 1 changes are 5 surgical edits (~85 LOC, mostly constants and one schema add) that activate existing substrate. If the painted-compare re-run after Tier 1 shows ≥6pp area-weighted improvement at 188w, the five-specialist diagnosis is confirmed and Tier 2 becomes precision-closure work. If the improvement is <3pp, the diagnosis needs revisiting before adding more code.

**No new mechanics. No new canon. Two trivial schema additions.** Per canon-compliance memo §7, the proposed schema additions (`MilitaryState.casualty_trajectory`, optional `MilitaryState.faction_force_quality` rollup) fit existing canon patterns (`equipment_quality_modifiers`, `casualty_ledger`, `faction_officer_maturity`) as templates. Per Engine Invariants §6.2 / §8 / §9.6 / §13.1 — confirmed canon-safe.

**Coordination model**: all five Tier 1 changes plus the four Tier 2 ops live in `src/sim/combat/*`. Codex has been making ~10-15 commits/day in that directory (H1 diagnostic plumbing, sector perf, strict-null leaves). Tier 1 execution should pick a 24h window where the Codex combat-zone lane is quiet. Tier 2 op authoring tolerates more parallelism because new files don't conflict with edits to existing files.

---

## 3. Tier 1 — Wiring + calibration (5 changes)

**Current execution state (2026-05-22):**

| Item | State | Evidence |
|---|---|---|
| W1 war-exhaustion tempo threshold repair | DONE | `combat_math.ts` thresholds are now 30/80; Army HQ readout threshold is 30; focused tests, typecheck, baseline re-bless, and diff hygiene passed. |
| W2 defender-corps readiness predicate | DONE | `sana_95`, `sana_95_follow_on`, and `mistral_2_95` now read VRS 2nd Krajina trajectory when defender-corps evidence is present. |
| W2.5 headless opportunity decision bridge | DONE | Non-interactive scenario runs now resolve eligible player-faction opportunities through the existing deterministic staff/bot decision path. Fresh 188w `n1938` approves Sana and Donji with linked AARs. |
| W2.6 opening-attack launch feasibility | DONE FOR DONJI / SANA REOPENED UPSTREAM | Fresh 188w `n1941` moves `donji_vakuf_95` from accepted/no-contact to contacted under-delivery: linked AAR, 1 attack, `UNDERDELIV:1`, `max_failures`, no reachability warnings. Sana is no longer an accepted no-launch case under broad headless auto-control; it is blocked upstream by `enemy_weakness` and `commander_confidence`, so handle Sana as a separate predicate/trajectory lane. |
| W3 casualty-trajectory consumer | PENDING | Larger schema/output lane; defer until the accepted-operation launch boundary is diagnosed. |
| W4 Sana readiness floor recalibration | NOT NEEDED ON CURRENT TRACE | Fresh 188w `n1936` shows `sana_95` eligible at turn 175 with the 0.40 floor still in place. |
| W5 officer-maturity combat consumer | PENDING | `faction_officer_maturity` already feeds corps readiness; any combat-math consumer remains opt-in/default-off work. |

### W1. `war_exhaustion` threshold repair (gameplay-programmer S2)

**Diagnosis** (gameplay-programmer §A2): `war_exhaustion` value clamped at `[0, 100]` in `exhaustion.ts:106`. Combat-math tempo penalty `getWarExhaustionTempoMult` reads thresholds `WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW = 500` and `WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH = 800` at `combat_math.ts:1575-1576`. The penalty can never trigger because the value cannot reach the thresholds.

**Change**:

```typescript
// combat_math.ts lines 1575-1576 (BEFORE)
const WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW = 500;
const WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH = 800;

// AFTER
const WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW = 30;
const WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH = 80;
```

**Scope**: 2 lines. Constant repair, no new logic. Resurrects the only existing faction-trajectory → combat-math loop.

**Verification**: must drive sim faction_area_share at 188w in the direction of painted target (i.e. VRS area share drops from 61% toward 49%). If sim faction_area shifts <2pp at 188w from this change alone, the linkage from war_exhaustion → tempo → operation throughput is broken in additional places that need diagnosis before W2.

**Risk**: medium. War-or-game noted Issue #47's status is unverified in n1935 (still confirmed dead at n1741); if `exhaustion.ts` accumulation is also broken (e.g. delta never exceeds 0), the threshold fix alone won't help and we need to fix accumulation first. **Stop-gate**: if `state.military.war_exhaustion[faction]` at w188 still reads <10 after W1 ships, accumulation is broken — diagnose `exhaustion.ts` accumulation logic before continuing.

### W2. Defender-corps readiness in op `enemy_weakness` predicate (ops-expert change 1)

**Diagnosis** (ops-expert §3 + §key finding): `computeCorpsOperationReadiness(state, corpsId)` at `corps_operation_readiness.ts:380` is pure, deterministic, faction-agnostic — it can be called on a defender corps without state mutation. The trait pipeline already returns `collapse_susceptibility` and `operation_readiness` values. No catalog op has ever invoked it on a defender corps.

**Change** (sketch — actual diff at execution time):

Add a new `enemy_weakness` axis predicate to `sana_95`, `sana_95_follow_on`, and `mistral_2_95`:

```typescript
// catalog_5th_corps.ts near line 239 (sana_95 enemy_weakness section)
enemy_weakness: (state, turn, def) => {
    // Existing checks preserved...

    // NEW: trajectory-responsive defender weakness signal
    const vrsKrajinaCorps = 'vrs_2nd_krajina';
    const defenderReadiness = computeCorpsOperationReadiness(state, vrsKrajinaCorps);
    const vrsEqMult = getActiveEquipmentQualityMultiplier(state, 'RS', turn);

    // Composite weakness signal — high when defender is degraded
    const weakness =
        defenderReadiness.collapse_susceptibility * 0.5
        + (1.0 - defenderReadiness.operation_readiness) * 0.3
        + (1.0 - vrsEqMult) * 0.2;

    if (weakness < SANA_DEFENDER_WEAKNESS_FLOOR) {
        return { green: false, reason: 'defender corps not yet degraded enough' };
    }
    return { green: true, reason: 'defender corps trajectory degraded; weakness window open' };
},
```

Same pattern for `mistral_2_95` reading `vrs_2nd_krajina`.

**Scope**: ~30 lines additive across `catalog_5th_corps.ts:239` (sana_95), `catalog_5th_corps.ts:?` (sana_95_follow_on, if present), `catalog_federation_western_bosnia.ts:201` (mistral_2_95). New constant `SANA_DEFENDER_WEAKNESS_FLOOR` (suggested: 0.4 — tune at execution).

**Verification**: must produce defender-weakness signals that fire ≥w168 for sana_95 (historical Sana launch w178±3). H1 trace evidence (`docs/40_reports/audits/20260521_H1_DEFENDER_POWER_COMPONENT_REVIEW.md`) is the diagnostic baseline — re-run after W2 should show `sana_95` and `mistral_2_95` graduating from `build_defender_power_too_high` to `launched`.

**Risk**: low. Additive change reading existing pure helpers; no behavior change for ops that don't define `enemy_weakness`.

### W3. Casualty-trajectory consumer (gameplay-programmer S1)

**Diagnosis** (gameplay-programmer §A1): `state.military.casualty_ledger[faction]` accumulates correctly across 9 write sites but is read by zero combat-math or recruitment paths. The faction trajectory is invisible to combat outcomes.

**Change**:

1. **Schema add** in `game_state.ts` (template: `equipment_quality_modifiers` shape):

```typescript
// state.military.casualty_trajectory — derived per turn from casualty_ledger
casualty_trajectory?: Record<FactionId, {
    cumulative_kia: number;
    cumulative_wounded: number;
    cumulative_equipment_lost: number;
    pool_depletion_fraction: number; // [0, 1], monotonic increasing
}>;
```

2. **Derive step** in `war_phases.ts` (mirror placement of `apply-vrs-equipment-decay` at line 2213; add as a new phase after casualty resolution):

```typescript
{
    name: 'derive-casualty-trajectory',
    run: (state) => {
        for (const faction of POLITICAL_SIDES) {
            const ledger = state.military.casualty_ledger?.[faction];
            const startPool = getStartingPoolForFaction(faction); // OOB-derived constant
            const cumKia = ledger?.killed ?? 0;
            state.military.casualty_trajectory ??= {};
            state.military.casualty_trajectory[faction] = {
                cumulative_kia: cumKia,
                cumulative_wounded: ledger?.wounded ?? 0,
                cumulative_equipment_lost: ledger?.equipment_lost ?? 0,
                pool_depletion_fraction: Math.min(1.0, cumKia / startPool),
            };
        }
    },
},
```

3. **Combat consumer** in `combat_math.ts` (mirror `getActiveEquipmentQualityMultiplier` pattern):

```typescript
function getCasualtyAttritionMultiplier(
    state: GameState,
    faction: FactionId,
): number {
    const traj = state.military.casualty_trajectory?.[faction];
    if (!traj || traj.pool_depletion_fraction < 0.2) return 1.0; // no penalty below 20% depletion
    // Linear penalty 0.85× at 50% depletion → 0.6× at 80% depletion
    const penalty = Math.max(0.6, 1.0 - (traj.pool_depletion_fraction - 0.2) * 0.5);
    return penalty;
}
```

Apply at both attacker and defender power computation, gated `if (mult !== 1.0)` for byte-stability on early-war runs where no faction has hit 20% pool depletion yet.

**Scope**: ~50 lines (schema + derive step + consumer + one constant). Pure additive — early-war runs (where no faction is depleted >20%) produce byte-identical output to the pre-change manifest.

**Verification**: post-W3, sim should show RBiH and VRS taking a measurable combat-power hit by ~w120-w140 (after ~2 years of casualties accumulate beyond 20% pool depletion). If no measurable change at w188, the pool-depletion fraction is mis-scaled — re-tune `getStartingPoolForFaction` constants.

**Risk**: low for early-war (byte-stable below 20% depletion threshold). Medium for late-war (combat math behavior change). Baseline regression must re-bless after this lands.

### W4. SANA readiness floor recalibration (ops-expert change 2)

**Diagnosis** (ops-expert §3 change 2): `SANA_READINESS_FLOOR = 0.40` at `catalog_5th_corps.ts:218` blocks the historical Aug-1995 Sana launch under realistic post-Pauk exhaustion. ARBiH 5th Corps historically launched Sana 95 with corps readiness depressed from prior operations.

**Change**:

```typescript
// catalog_5th_corps.ts:218 (BEFORE)
const SANA_READINESS_FLOOR = 0.40;

// AFTER
const SANA_READINESS_FLOOR = 0.35;
```

**Scope**: 1 line. Insurance change to prevent W2's predicate from being blocked by an unrelated readiness floor.

**Verification**: must let `sana_95` reach `eligible_pending_review` at w178±3 in the 188w run. If `sana_95` still blocks despite W2 + W4, the blocker is a different predicate (likely `force_quality` or supply).

**Risk**: trivial. One constant.

### W5. Officer-maturity consumer (gameplay-programmer S3, env-gated default-off)

**Diagnosis** (gameplay-programmer §A1): `state.military.faction_officer_maturity` field already exists at `game_state.ts:2156` and accumulates correctly. Combat math does not read it. The substrate `docs/40_reports/audits/20260501_FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT.md` CC2/CC3 already proved this is decorative.

**Change**:

```typescript
// combat_math.ts — new helper
function getFactionOfficerMaturityMult(
    state: GameState,
    faction: FactionId,
): number {
    if (process.env.AWWV_FACTION_OFFICER_MATURITY_ENABLED !== 'true') return 1.0;
    const maturity = state.military.faction_officer_maturity?.[faction] ?? 0.5;
    // ARBiH 0.087→0.807 trajectory → multiplier 0.85→1.15
    return 0.85 + 0.30 * maturity;
}
```

Wire at attacker/defender power computation, multiplied in if env flag set.

**Scope**: ~15 lines. Env-gated default-off lets it ship without affecting baseline regression — opt-in calibration knob until magnitude is tuned.

**Verification**: ship default-off. Toggle `AWWV_FACTION_OFFICER_MATURITY_ENABLED=true` in a focused calibration run and measure delta. If sim faction_area_share at 188w improves toward painted target, tune the magnitudes and flip default to `true` in a follow-on commit + baseline re-bless.

**Risk**: zero with flag default-off. The risk lives in the calibration tuning, not the wiring.

### Tier 1 LOC summary

| Change | Files | LOC | Behavior change | Baseline re-bless |
|---|---|---|---|---|
| W1 | `combat_math.ts` | 2 | YES (tempo penalty fires) | YES |
| W2 | `catalog_5th_corps.ts`, `catalog_federation_western_bosnia.ts` | ~30 | YES (ops launch differently) | YES |
| W3 | `game_state.ts`, `war_phases.ts`, `combat_math.ts` | ~50 | YES (late-war combat) | YES |
| W4 | `catalog_5th_corps.ts` | 1 | YES (Sana launches earlier) | YES |
| W5 | `combat_math.ts` | ~15 | NO (env-gated off) | NO |
| **Total** | 5 files | **~98** | 4 behavior changes | 4 re-blesses |

---

## 4. Tier 2 — New ops for irreducible 3-4pp residue (4 ops)

These ops have **no current code-side owner** in the catalog directory and cannot emerge from existing ops even under perfect trajectory wiring (ops-expert §4). They cover ~24-30 OSIDs not deliverable by Tier 1.

### N1. Ljeto 95 (Grahovo + Glamoč, ~w171, pre-Storm)

- **Historical**: BB1 p.411 — HV/HVO Operation Ljeto-95 takes Bosansko Grahovo + Glamoč in late July 1995, giving Operation Storm its jump-off.
- **OSIDs**: 6 OSIDs to HRHB (Grahovo cluster + Glamoč halapic/stekerovci).
- **Constraint**: `mistral_2_95` window starts w175 AND requires post-Storm. This op must fire **pre-Storm** (w168-w173) — can't reuse mistral_2_95 framing.
- **Primary corps**: `hvo_main_staff` + HV-attached brigades via `hv_integration.ts:38` (`hvo_tomislavgrad`).
- **Predicate**: must NOT require `isWesternTheaterRuptured` (Ljeto precedes Storm).
- **Scope**: ~150 LOC new file `operation_opportunity_catalog_pre_storm.ts` OR new entry in existing federation_western_bosnia catalog with a pre-Storm gate.

### N2. Donji Vakuf 1995 (ARBiH 7th Corps, w178±3)

- **Historical**: BB1 p.419 — "General Zec at last had to give up Donji Vakuf and swing his right flank back toward Jajce on 13 September." ARBiH 7th Corps captured Donji Vakuf + Mt. Komar area.
- **OSIDs**: 10 OSIDs to RBiH (`op:donji_vakuf:*` cluster).
- **Constraint**: No existing op covers this geometry. `vlasic_ridge_95` is Travnik-area only; `sana_95` is 5th Corps.
- **Primary corps**: `arbih_7th_corps`.
- **Dependencies**: Reuses brigades currently in `vlasic_ridge_95.variants[1] = bugojno_support` (3 shared OSIDs flagged by ops-expert memo `20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md` Gap 2). Single-owner cleanup needed: retire/rescope the `bugojno_support` variant.
- **Scope**: ~200 LOC new entry in `operation_opportunity_catalog_central_bosnia.ts` + variant cleanup.

### N3. Jajce 1995 arm (split or extend `mistral_2_95`)

- **Historical**: BB1 p.418 — "On 13 September, Jajce — the jewel of the operation — was restored to Croat hands." HVO Maestral Phase 1 axis.
- **OSIDs**: 8 OSIDs (7 to HRHB + 1 to RBiH at `op:jajce:grdovo` — 7th Corps area east of Jajce).
- **Constraint**: `mistral_2_95` objective list contains zero Jajce OSIDs. Either split into `maestral_95` and `juzni_potez_95` (cleaner historical attribution) OR add a Jajce sub-axis to existing `mistral_2_95`.
- **Recommendation**: split. The current `mistral_2_95` conflates Maestral (Sep 8-15) with Juzni Potez (Oct 8-11), which causes timing-precision issues per BB extractor's findings.
- **Scope**: ~250 LOC if splitting, ~120 LOC if extending.

### N4. Juzni Potez Mrkonjić (extracted from `mistral_2_95`, w181-w182)

- **Historical**: BB1 p.427-428 — Juzni Potez 8-11 Oct 1995 delivers Mrkonjic Grad on 10 Oct.
- **OSIDs**: 6 OSIDs to HRHB (Mrkonjic Grad cluster).
- **Conditional**: depends on N3 splitting decision. If N3 splits, N4 lands as the latter half. If N3 extends, N4 becomes a separate op.
- **Scope**: ~150 LOC if separate; absorbed into N3 if split-mode.

### Tier 2 sequencing (per ops-expert §recommended sequence)

**Order**: N2 → N3 → N4 → N1.

- N2 (Donji Vakuf) first: lowest risk, single-corps, reuses existing brigades, no joint-ops dependencies.
- N3 (Jajce arm) second: largest impact (8 OSIDs); requires the `mistral_2_95` split decision.
- N4 (Juzni Potez) third: depends on N3's split decision.
- N1 (Ljeto 95) last: requires the new pre-Storm gate, riskier predicate authoring.

---

## 5. Files to touch (exhaustive)

All in `src/sim/combat/*` and `src/state/*` — **Codex parallel-work zone**.

| File | Tier 1 changes | Tier 2 changes |
|---|---|---|
| `src/sim/combat/combat_math.ts` | W1 (2 lines) + W3 consumer (~20 lines) + W5 consumer (~15 lines) | None |
| `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` | W2 (~15 lines) + W4 (1 line) | None |
| `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts` | W2 (~15 lines) | N1 (Ljeto 95 if extending this catalog) |
| `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts` | None | N2 (Donji Vakuf), variant cleanup |
| `src/sim/combat/operation_opportunity_catalog_pre_storm.ts` (NEW file, optional) | None | N1 (Ljeto 95 if new file) |
| `src/state/game_state.ts` | W3 schema (~10 lines) | None |
| `src/sim/turn_phases/war_phases.ts` | W3 derive step (~20 lines) | None |
| Tests | Coverage for each W + each N | Coverage for each N |

**Outside Codex zone (safe)**: regression tests + ledger entries. No `docs/10_canon/` edits required (canon-compliance: no canon work needed).

---

## 6. Verification

### Pre-execution

- Confirm Codex's combat lane is quiet (`git log origin/main -10 -- src/sim/combat/` — last 10 commits with no edits to the 5 target files within 24h).
- `npm.cmd run typecheck` clean.
- `npm.cmd run test:vitest` clean.
- `npm.cmd run test:baselines` PASS at current manifest.

### Per-change

| Change | Verification |
|---|---|
| W1 | (a) `sim_war_exhaustion` at w188 ≥ 50 for VRS (currently ~0-10 per Issue #47). (b) Tempo penalty fires for at least one faction by w120. (c) 40w byte-stable (war_exhaustion below threshold in 40w window). (d) 188w hash drifts intentionally; re-bless. |
| W2 | (a) `sana_95` reaches `eligible_pending_review` by w178±3 in the 188w run (H1 trace confirms). (b) `mistral_2_95` reaches `eligible_pending_review` by w177±3. (c) No regression on existing Tier 1 anchor contract tests. |
| W3 | (a) `state.military.casualty_trajectory` populates per turn. (b) Combat math reads it (sim faction_area % shifts ≥1pp at 188w). (c) 40w byte-stable (no faction crosses 20% depletion). (d) 188w hash drifts; re-bless. |
| W4 | (a) `sana_95` readiness gate passes at w177±3. (b) 40w byte-stable. (c) 188w hash drift expected (Sana launches earlier). |
| W5 | (a) Default-off (env flag false): 40w + 188w byte-stable. (b) Toggle env flag, observe delta in a focused calibration run, document magnitudes, then flip default in a follow-on commit + re-bless. |

### Post-Tier-1

- **Mandatory**: re-run painted-compare against the post-Tier-1 tip. Compare against the n1932-n1935 baseline at `tools/diagnostics/_phase5a_painted_compares/`. Target: ≥6pp area-weighted improvement at 188w (sim → ~78%+, up from 71.7%).
- If improvement <3pp: **STOP**. The diagnosis needs revisiting before Tier 2 ships. Investigate which combat-math consumer isn't reading what we think it's reading.
- If improvement ≥6pp: proceed to Tier 2 sequencing.

### Post-Tier-2

- Painted-compare re-run. Target: ≥9pp area-weighted improvement vs n1935 baseline (sim → ~81%+, closing most of the painted gap).
- All Tier 1 contract tests (`tests/scenario_historical_painted_anchors.test.ts`) PASS.
- Repaint regression tests (`tests/painted_control_targets.test.ts`) PASS.
- Tier 1 anchor plan's diagnostic-only bands re-evaluate for promotion to PASS/FAIL per the band-update sequence in `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md` §3.

---

## 7. Stop gates

- **STOP if** Codex has live edits to any of the 5 target files within 24h. Wait for the combat lane to quiet.
- **STOP if** W1 ships and sim war_exhaustion still reads <10 at w188. Accumulation is broken in `exhaustion.ts`; diagnose before continuing.
- **STOP if** W2 ships and `sana_95` + `mistral_2_95` still never reach `eligible_pending_review` in the 188w run. The blocker is upstream of the new predicate; diagnose H1 traces before W3.
- **STOP if** Tier 1 painted-compare delta is <3pp. The five-specialist diagnosis is wrong somewhere; revisit before shipping Tier 2.
- **STOP if** any Tier 1 change causes baseline regression to drift >15% area-weighted at 40w (a sharp 40w shift indicates the changes are landing harder on early-war than expected — calibration needs reduction before the 188w window is touched).
- **STOP if** canon-compliance audit finds a §6.2 (brigade no-destruction), §8 (exhaustion monotonic), or §9.6 (no passive-pressure flip) violation in any concrete patch. Refer to `docs/40_reports/audits/20260522_CANON_TRAJECTORY_FRAME.md` §10 anti-pattern table.

---

## 8. Open questions

1. **`getStartingPoolForFaction` constants for W3**: what's the starting manpower pool per faction? Per historian's data: VRS ~100-110k, ARBiH ~170-261.5k peak, HVO ~50-55k. These need a sourced canonical table. Recommendation: derive from OOB initial_personnel sums at scenario init; cache as `state.military.starting_pool_by_faction` written once at init.
2. **W2 weakness signal weights** (0.5 / 0.3 / 0.2 in the sketch): these are placeholder. Should the weights be tuned empirically against the 188w painted target, or derived from historian's "autumn 1994 morale crossover" timing?
3. **W3 penalty curve magnitudes** (0.85× at 50% depletion, 0.6× at 80%): same question — tune empirically or anchor to historical attrition data?
4. **W5 default-on flip timing**: ship default-off in the first Tier 1 wave, or hold W5 entirely until W1-W4 are calibrated?
5. **N3 split vs extend**: split `mistral_2_95` cleanly into `maestral_95` + `juzni_potez_95`, or extend `mistral_2_95` with a Jajce sub-axis? Plan recommends split; ops-expert agrees but flags it as a single-owner cleanup that touches `triggered_operations.ts` (already in Codex's H1 zone).
6. **Pre-Storm gate for N1**: new gate field on the catalog `OperationOpportunityDef`, or a date-only predicate?

---

## 9. Sequencing recommendation

**Wave 1 (Tier 1 continuation)**: W2 → W4 next, with W4 only if traces show the Sana readiness floor is the remaining blocker. Each commit is independently testable. Re-bless baseline after behavior drift.

**Measure**: re-run painted-compare. If ≥6pp at 188w, proceed.

**Wave 2 (Tier 1 W3 + W5)**: W3 schema + derive + consumer + W5 env-gated wiring. ~65 LOC. Two commits. Re-bless baseline.

**Measure**: re-run painted-compare. Target ≥8pp cumulative improvement.

**Wave 3 (Tier 2 N2)**: DONE. Donji Vakuf 1995 op shipped as `donji_vakuf_95`; it covers the ten Donji Vakuf painted-target OSIDs and retired the `vlasic_ridge_95` Bugojno-support redirect variant.

**Wave 4 (Tier 2 N3 + N4)**: `mistral_2_95` split + Juzni Potez extraction. ~400 LOC. Two commits. Re-bless baseline.

**Wave 5 (Tier 2 N1)**: Ljeto 95 with pre-Storm gate. ~150 LOC + gate authoring. One commit. Re-bless baseline.

**Total**: ~10 commits across 5 waves, all sequenced behind Codex's combat lane closures.

After all waves: Apr 1995 RS band promotes from diagnostic-only to PASS/FAIL per the plan-edit addendum from 2026-05-22; Oct 1995 RS band re-evaluates for promotion (likely re-passes after Tier 1 + Tier 2 close); Oct 1995 RBiH and HRHB bands likely tighten enough to promote.

---

## 10. Out of scope (explicit)

- New canon work (canon-compliance: no amendment needed).
- New schema beyond W3's `casualty_trajectory` (and optionally a starting-pool-by-faction cache for W3 constants).
- Per-corps modifier surface (parked as Path B in APWB cut plan; not blocking this).
- UNPROFOR mechanical entity (HIST-GAP-1; Tier 3 mechanic per the prior analysis; relevant for enclave dynamics, not Krajina collapse).
- VRS strangle-not-capture doctrine (HIST-GAP-2; Tier 3 mechanic).
- Per-brigade ammunition scarcity (HIST-GAP-4; Tier 3 mechanic per gameplay-programmer; closeable later if W1-W5 don't move the gap enough).
- Ethnic-cleansing-as-territorial-mechanism (HIST-GAP-6; war-or-game's anti-pattern; design-gated).
- Painted-map re-paint beyond the already-shipped Goražde repaint (Kupres `kupres_2` apr1994 still deferred pending BB-extractor follow-up).
- The two file-collision findings (FORCE_TRAJECTORY_ENGINE_INVENTORY + OPS_FORCE_TRAJECTORY_GATING both have an unattributed "Part 1" section). Cleanup is a separate audit task.

---

## 11. Source memos (for full rationale and citations)

- `docs/40_reports/audits/20260522_TRAJECTORY_MECHANIC_GAPS.md` (war-or-game, 34KB) — substrate-decorative diagnosis + 10-signal mechanic gap matrix.
- `docs/40_reports/audits/20260522_HISTORICAL_FORCE_TRAJECTORY_DATAPOINTS.md` (historian, 33.5KB) — BB1/BB2/ICTY-cited per-faction trajectory across 5 anchor dates.
- `docs/40_reports/audits/20260522_CANON_TRAJECTORY_FRAME.md` (canon-compliance, 39KB) — 9 canon-safe patterns + 8 anti-patterns + top 3 schema additions canon-frame.
- `docs/40_reports/audits/20260522_FORCE_TRAJECTORY_ENGINE_INVENTORY.md` (gameplay-programmer, 14KB) — EXISTS/PARTIAL/MISSING substrate inventory + S1-S3 ordered schema additions.
- `docs/40_reports/audits/20260522_OPS_FORCE_TRAJECTORY_GATING.md` (ops-expert, ~25KB) — launch-feasibility predicate inventory + 3 gating changes + 4 irreducible code gaps.
- `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md` (SCRT, ~31KB) — n1932-n1935 fresh painted-compare deltas + Tier 1 anchor band promotion/demotion recommendations.
- `docs/40_reports/audits/20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md` (ops-expert, prior) — original 4 BB code-gap proposals that this plan adopts as Tier 2.
- `docs/plans/2026-05-21-tier1-painted-target-anchors-plan.md` — parent plan; this plan's W1-W5 + N1-N4 unblock promotion of its diagnostic-only bands to PASS/FAIL.
- `docs/40_reports/audits/20260510_FORCE_QUALITY_TRAJECTORY_REASSESSMENT.md` — pre-existing diagnostic confirming the per-brigade trajectory substrate already produces the correct arc shape in simulated data.
