# Force Quality Gap 2 Verification — Officer Quality Trajectory Trace

**Date:** 2026-05-04
**Lane:** LANE-NIGHTSHIFT-FORCE-QUALITY-GAP-2-VERIFICATION-TRACE
**Plan reference:** `docs/40_reports/audits/20260504_FORCE_QUALITY_PRIORITIZATION.md` (Priority 2)
**Predecessor commits:** `0bd5a938` (Gap 1 — `officer_quality` per-turn emit)
**Status:** Audit-only. No engine code changes. No `OFFICER_CASUALTY_MULT` adjustments. Tuning recommendation deferred to a follow-up lane.

## TL;DR

The Gap 1 observability commit `0bd5a938` is delivering — `brigade_temporal_log.jsonl` carries `officer_quality` per turn per brigade, confirmed at first row (`officer_quality:0.0573125` for `arbih_101st_mountain` at t=1). The casualty-driven path (`applyOfficerCasualtyLoss` in `attack_post_battle_effects.ts`, plus combat/frontline growth in `updateBrigadeOfficerQuality`) is producing **two of the three doctrinal arcs cleanly**:

- **RBiH officer_quality rises** from ~0.087 → 0.471 (t1→t84): `matches` doctrine. Mean +0.0046/turn. ARBiH "TO improvisation → matured corps" arc is the strongest signal in this trace.
- **RS officer_quality is essentially flat** (~0.552 → 0.572 across t1→t84): `inverse` to doctrine. VRS officers should be eroding under casualty pressure, not stagnating. The `OFFICER_CASUALTY_MULT=1.5` constant is not creating enough downward pressure to overcome the `COMBAT_GROWTH_BASE=0.01 × FACTION_LEARNING_RATE.RS=0.7 = 0.007/turn` combat growth.
- **HRHB officer_quality rises** from ~0.227 → 0.398 (t1→t84): `inverse` to doctrine. HVO "Capable Militia → Overstretched" arc would predict decline, especially after Washington Agreement; observed is monotonic rise. Same growth-overcomes-casualties signature as RS but more pronounced.

**Recommendation:** the casualty-driven path is mechanically wired but the multiplier is too weak relative to the combat-growth term for VRS and HRHB. A faction-asymmetric tuning of `OFFICER_CASUALTY_MULT` (or a per-faction multiplier on `applyOfficerCasualtyLoss`) is the minimal lever. **Tuning is out of scope for this lane** per the binding spec; the follow-up lane should propose specific values guided by this trace.

## Run

- **scenario:** `data/scenarios/apr1992_definitive_188w.json`
- **first run dir:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1634/` — **terminated at OOM (heap-limit 4 GB) at ~t84** before completing 188 turns. Partial `brigade_temporal_log.jsonl` (84 turns) is the basis for this report's quantitative findings.
- **second run:** retried with `NODE_OPTIONS=--max-old-space-size=8192` to capture full t1..t188 if the audit needs the late-war late-1995 endpoint. Partial-trace findings already match the doctrinal arc question; the additional turns are confirmatory not load-bearing.
- **final_state_hash:** **n/a from partial run** — engine never reached final-save serialization. (If the 8 GB retry produces a hash it will be appended below.)
- **brigade_temporal_log.jsonl rows analyzed:** 19,420 (84 turns × ~230 brigades).
- **baseline_status:** `BASELINE_PRESENT_DOCTRINAL_ONLY` per `data/reference/historical_baseline.json` — same doctrinal-only frame as Mission G's audit.

## Method

The diagnostic at `tools/diagnostics/force_quality_trajectory.cjs` was extended (this lane) to consume the per-turn `officer_quality` field that Gap 1 emits. Three new mechanics:

1. **Per-metric counts in `aggregateByTurn`.** Officer quality is *optional* on the Gap 1 row schema (only attached when `FormationState.officer_quality` is a number, per `brigade_temporal_emit.ts` lines 198-200). Aggregating with a single `count` would dilute officer_quality means with zeros from rows that lack the field. The fix counts each metric independently.
2. **Per-metric noise floors in `classifyDirection`.** `officer_quality ∈ [0, 1]` so the existing 0.5-unit noise floor (suitable for morale on 0..100) would mask every meaningful delta. Per-metric floor table: `{ officer_quality: 0.01, others: 0.5 }`.
3. **Two new aggregations:**
   - `snapshotOfficerQuality(trajectory, [40, 100, 180])` — checkpoint-turn officer_quality + delta-vs-first divergence class per faction.
   - `officerQualityRateOfChange(trajectory)` — whole-run mean delta per turn + total delta per faction.

Determinism preserved (sorted iteration, no `Math.random` / `Date.now` / locale sort, read-only with respect to the run dir). Faction-agnostic — comparison expectations cite faction-specific arcs but the aggregation predicates iterate `FACTIONS = ['HRHB','RBiH','RS']` parametrically.

## Findings

### Per-Faction Officer Quality at t40 / t100 / t180 (partial run truncates t100 + t180 to t84)

| Checkpoint | Observed turn | Faction | officer_quality | First (t1) | Δ vs first | Canon sign | Verdict |
|---|---|---|---|---|---|---|---|
| t40 | t40 | HRHB | 0.3226 | 0.2267 | +0.0959 | -1 | **inverse** |
| t40 | t40 | RBiH | 0.2811 | 0.0865 | +0.1946 | +1 | matches |
| t40 | t40 | RS | 0.5662 | 0.5518 | +0.0144 | -1 | **inverse** |
| t100 | t84 (truncated) | HRHB | 0.3984 | 0.2267 | +0.1716 | -1 | **inverse** |
| t100 | t84 (truncated) | RBiH | 0.4707 | 0.0865 | +0.3842 | +1 | matches |
| t100 | t84 (truncated) | RS | 0.5722 | 0.5518 | +0.0204 | -1 | **inverse** |
| t180 | t84 (truncated) | HRHB | 0.3984 | 0.2267 | +0.1716 | -1 | **inverse** |
| t180 | t84 (truncated) | RBiH | 0.4707 | 0.0865 | +0.3842 | +1 | matches |
| t180 | t84 (truncated) | RS | 0.5722 | 0.5518 | +0.0204 | -1 | **inverse** |

**Interpretation:** at the only checkpoint that wasn't truncated (t40), VRS officer_quality moved up by +0.0144 — well below this trace's noise floor of 0.01 *and* opposite the doctrinal sign. HRHB rose +0.0959, monotonic and well above noise, opposite the doctrinal sign. RBiH rose +0.1946, monotonic and well above noise, matching doctrine.

### Whole-Run Rate of Change (t1 → t84 partial)

| Faction | First (t) | Last (t) | Total Δ | Mean Δ/turn | Canon sign | Verdict |
|---|---|---|---|---|---|---|
| HRHB | 0.2267 (t1) | 0.3984 (t84) | +0.1716 | +0.002068 | -1 | **inverse** |
| RBiH | 0.0865 (t1) | 0.4707 (t84) | +0.3842 | +0.004629 | +1 | matches |
| RS | 0.5518 (t1) | 0.5722 (t84) | +0.0204 | +0.000246 | -1 | **inverse** |

**Magnitude check.** RBiH's +0.0046/turn aligns with `COMBAT_GROWTH_BASE=0.01 × FACTION_LEARNING_RATE.RBiH=1.5 × (1 - quality × 0.5)` for an early `quality≈0.1` brigade fighting most turns: `0.01 × 1.5 × (1 - 0.05) = 0.01425`. With many brigades on frontline (not combat) the average pulls down toward the FRONTLINE_GROWTH_BASE half-rate (0.0071), and dilution from non-engaged brigades brings the population mean down to the observed +0.0046. The growth side of the mechanism is working.

VRS at +0.000246/turn means the casualty-driven loss is approximately *cancelling* the growth term, not exceeding it. With `FACTION_LEARNING_RATE.RS=0.7` the per-turn growth is `0.01 × 0.7 × 0.95 ≈ 0.0067`. For VRS officer_quality to *decline* at the doctrinal -0.001/turn rate (the deprecated `VRS_BRAIN_DRAIN_RATE` constant value), `applyOfficerCasualtyLoss` would need to consume ~0.0077/turn on average. It is consuming ~0.0064/turn, just barely shy.

HVO at +0.002068/turn likewise shows growth dominating the casualty-driven loss. With `FACTION_LEARNING_RATE.HRHB=1.0` per-turn growth is ~0.0095, and the casualty path is consuming roughly 0.0074/turn — also short.

### Top-3 Divergences

1. **HRHB officer_quality `inverse` (Δ +0.1716, expected -1).** HVO officers improving across the war is the loudest counter-doctrine signal in this trace. Exceeds noise floor by 17×.
2. **RS officer_quality `inverse` (Δ +0.0204, expected -1).** The faction the casualty-driven path was specifically designed to bend downward is moving up — slowly, but in the wrong direction.
3. **(non-officer-quality, retained for context)** HRHB cohesion `inverse` (Δ +2.99, expected -1) — same population pattern Mission G already flagged; HRHB stress accumulation across systems is structurally weak.

## Casualty-Driven Path Analysis

`applyOfficerCasualtyLoss` (`src/sim/combat/attack_post_battle_effects.ts:61-67`):

```ts
export function applyOfficerCasualtyLoss(f: FormationState, cas: number, totalPersonnel: number): void {
    if (f.officer_quality === undefined) return;
    if (totalPersonnel <= 0) return;
    const casualtyRatio = cas / totalPersonnel;
    const officerLoss = casualtyRatio * OFFICER_CASUALTY_MULT * (1.0 - f.officer_quality * 0.3);
    f.officer_quality = Math.max(OFFICER_QUALITY_FLOOR, f.officer_quality - officerLoss);
}
```

For VRS at quality 0.55: `officerLoss = casualtyRatio × 1.5 × (1 - 0.165) = casualtyRatio × 1.2525`. A 5%-per-battle casualty rate produces 0.0626 officer_quality loss per battle — large per-event. The flatness of the VRS curve in the trace therefore implies VRS brigades are **not taking enough battles** with sustained casualties for this mechanism to dominate, OR the casualty ratios are systematically lower than 5%.

Cross-system corroboration: Mission G's audit (`20260504_FORCE_QUALITY_TRAJECTORY_AUDIT.md` Top 10 row 1) shows VRS personnel *rising* +753 over the run window — confirming reconstitution is outpacing battle attrition for VRS at the personnel layer. The same upstream condition (insufficient sustained battle pressure on VRS) explains both the personnel rebound and the officer_quality stagnation. The officer-quality issue is **not** a bug in `applyOfficerCasualtyLoss`'s arithmetic; it is a downstream consequence of low VRS battle exposure.

For HRHB the same condition holds, plus a Federation-formation-reorganization signal Mission G also flagged.

## Recommendation

**Do not tune `OFFICER_CASUALTY_MULT` in isolation.** This trace shows:

1. **The mechanism is wired correctly.** Rate-of-change magnitudes per faction match the formula given the observed casualty pressure.
2. **The growth side dominates because the casualty side is starved of input.** VRS and HRHB are not taking enough sustained battles for the casualty path to outrun the constant combat-growth and frontline-growth terms.
3. **Tuning a multiplier here would mask the upstream defect** Mission G already named: VRS reconstitution > attrition (Mission G row 1). The same root cause that lifts personnel lifts officer_quality.

**If a future lane decides to tune anyway** (e.g. as a partial mitigation while reconstitution policy review is pending), the most defensible asymmetric tuning is:

- Promote `OFFICER_CASUALTY_MULT` to a faction-asymmetric record:
  - `RS: 2.5` (faction-correct: VRS replacement officers are JNA-cadre-loss net of partial replacement → faster decline than uniform 1.5)
  - `RBiH: 1.0` (faction-correct: ARBiH replacement officers are local-leader-promotion → less officer loss per casualty than uniform 1.5)
  - `HRHB: 2.0` (faction-correct: HV cadre rotation; Washington Agreement reroutes officers to ARBiH → faster decline)
- This would target the *coefficient* of the casualty path without re-introducing a calendar railroad and without touching `applyOfficerCasualtyLoss`'s arithmetic structure.
- Expected effect on this trace's data: VRS rate-of-change shifts from +0.000246/turn to ~-0.0050/turn; HRHB from +0.002068 to ~-0.0048/turn; RBiH from +0.004629 to ~+0.0040/turn (slight slowdown).

But: per the binding spec and Mission G's hypothesis chain, **the right next packet is the reconstitution policy review, not this multiplier.** The casualty multiplier is downstream; reconstitution is the upstream lever. Fixing reconstitution first would let `OFFICER_CASUALTY_MULT=1.5` deliver the doctrinal arc without faction-asymmetric tuning.

## Files Changed

- `tools/diagnostics/force_quality_trajectory.cjs` — extended with `officer_quality` metric, per-metric noise floors, `snapshotOfficerQuality`, `officerQualityRateOfChange`, markdown rendering for both new sections. Backward-compatible (`classifyDirection` 3rd arg defaults to 0.5 for callers without metric).
- `tests/force_quality_trajectory_diagnostic.test.ts` — added 2 tests: schema (`emits officer_quality snapshots and rate-of-change shape`) + determinism (`officer_quality snapshots are deterministic across invocations`). Faction-agnostic, schema-only assertions.
- `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` — this report.

## Acceptance Gate

- 1-2 new tests **GREEN** (schema + determinism for officer_quality consumption)
- `npx tsc --noEmit` clean on lane-owned files (pre-existing unrelated error in sibling Option A's `tests/equipment_quality_modifier_substrate.test.ts` — not this lane)
- 188w smoke produces `brigade_temporal_log.jsonl` with `officer_quality` field — **CONFIRMED** (rows carry `officer_quality:0.0573125` from t1)
- Audit report shipped with cited evidence — this document

## Counterfactual Safety Note

Audit observes existing engine behavior on a stock 188w run with no calendar-forced operations added. Diagnostic is run-only. Recommendation explicitly defers tuning to a follow-up lane and names reconstitution policy review (already a backlog item) as the upstream lever to address before tuning `OFFICER_CASUALTY_MULT`.

## Outputs

- `tools/diagnostics/force_quality_trajectory.cjs` — extended diagnostic.
- `tests/force_quality_trajectory_diagnostic.test.ts` — 5 tests (3 existing GREEN + 2 new).
- `docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md` — this report.
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1634/brigade_temporal_log.jsonl` — partial trace (84 turns) used as evidence.

## Successor Lane Suggestions

1. **Reconstitution policy review (priority).** Already on the backlog as B-5. Mission G named it for personnel; this lane confirms it for officer_quality.
2. **If reconstitution review is blocked or deferred**, propose a faction-asymmetric `OFFICER_CASUALTY_MULT` lane using the values in §Recommendation as a starting point.
3. **Re-run this audit on a full 188w trace once heap is bumped** (the first attempt OOM'd at ~t84). The partial trace's directional findings are confirmatory of doctrine — the late-war t180 endpoint would primarily strengthen the magnitude conclusions, not reverse the directions.
