# SRK Siege Collapse Bug Report

**Date:** 2026-03-24
**Severity:** P1
**Discovered by:** Manual review of sector brigade assignments
**Baseline:** n1044 (92.6% area-weighted)

---

## Summary

The Sarajevo-Romanija Corps (SRK) siege of Sarajevo is **non-functional after w5**. Three SRK brigades physically drifted to Gorazde municipality OSIDs (~80km south), leaving the primary siege-ring sector (Centar, Ilidza, Novi Grad, Novo Sarajevo, Stari Grad, Vogosca) with **zero brigades and zero density**. The SRK has **zero eligible attackers from w6 through w40** — 35 consecutive weeks of total inactivity for the corps that historically maintained a 43-month siege with 13,000+ troops.

This is the defining siege of the Bosnian War. It is completely absent from the simulation after the first 5 weeks.

## Evidence

### Brigade locations at w40

| Brigade | Home OSID | Location at w40 | Distance |
|---------|-----------|-----------------|----------|
| rs_3rd_sarajevo_infantry | op:vogosca:vogosca_3 | op:gorazde:glamoc | ~80km south |
| rs_4th_sarajevo_light_infantry | op:pale:bulozi | op:gorazde:kamen | ~60km south |
| rs_igman_brigade | op:hadzici:misevici_2 | op:gorazde:glamoc | ~80km south |
| rs_trnovo_brigade | op:trnovo:gornja_presjenica | op:trnovo:gornja_presjenica | At home (south fringe) |

### Sector state at w40

| Sector | Brigades | Front Edges | Threat | Density |
|--------|----------|-------------|--------|---------|
| sector:vrs_sarajevo_romanija:0 (siege ring) | **0** | 14 | 0 | 0 |
| sector:vrs_sarajevo_romanija:1 (Gorazde/Pale) | 4 | 23 | 0 | 0 |
| sector:vrs_sarajevo_romanija:2 (Hadzici/Ilidza) | 4 | 19 | 161.9 | 0.21 |
| sector:vrs_sarajevo_romanija:3 (Ilijas/Vares) | 1 | 20 | 108.3 | 0.05 |

### Operation diagnostics timeline

- **w1-w5**: SRK attacking at op:ilidza:sarajevo_dio_ilidza_2. 2-3 eligible attackers, 1-2 battles/week.
- **w6-w12**: Zero attacks, zero battles, zero eligible attackers. Objective unchanged.
- **w13-w27**: Objective changed to op:hadzici:binjezevo. Still zero everything.
- **w28-w40**: Objective changed to op:centar_sarajevo. Still zero everything.

### Battle history (rs_3rd_sarajevo_infantry)

Only 3 engagements, all at op:vogosca:hotonj (w3, w4, w5). All decisive victories. Then silence — the brigade drifted to Gorazde with no further combat.

## Root Cause Analysis

**Not yet determined.** Two hypotheses:

### Hypothesis A: Attack-through drift
During early-war RS blitz (w0-12), SRK brigades attacked southward through enemy territory via the attack-through mechanism. After the operation stalled, they were stranded in Gorazde territory with no march-back mechanism to return to their home sector.

### Hypothesis B: Column march to wrong sector
The `distribute-brigades-to-front` pipeline step or sector assignment BFS placed these brigades in Sector 1 (Gorazde/Pale/Rogatica) because that sector had front edges and needed coverage. The algorithm prioritized filling empty sectors over keeping siege brigades at the siege.

### Why it wasn't caught
- **Calibration % is blind to this.** The Sarajevo OSIDs are painted RBiH in both the sim and the painted map — the siege doesn't flip them. 92.6% looks fine because the RBiH holds Sarajevo in both versions.
- **No diagnostic checks brigade-to-sector coverage.** We verify OSID control but never verify that key corps have brigades in their primary operational area.
- **No "siege health" metric exists.** The SRK siege ring should maintain minimum brigade density — we never check this.

## Impact

1. **Historical accuracy:** The longest siege in modern European history is absent from the simulation after week 5
2. **RBiH 1st Corps:** Faces zero opposition at the Sarajevo front — can push out freely
3. **Calibration:** Doesn't regress because both painted and sim agree on Sarajevo being RBiH. The bug is invisible to area-weighted metrics.
4. **Events:** Sarajevo siege events (tunnel, Markale, exclusion zone, anti-sniping) fire based on flags, not on actual siege pressure. The events describe a siege that isn't mechanically happening.
5. **Player experience:** A player commanding the RBiH would see zero VRS pressure on Sarajevo — completely ahistorical.

## Why this is invisible to current diagnostics

Current validation checks:
- Area-weighted match % (OSID control) -- siege doesn't flip OSIDs
- Anchor OSID checks (specific OSIDs must match) -- no anchor checks brigade positions
- Benchmark thresholds (faction territory shares) -- SRK collapse doesn't change RS share much
- Test suite (1446 tests) -- no test verifies siege sector staffing

**None of these catch "corps X has zero brigades in its primary operational area."**

## Proposed Detection Mechanisms

### 1. Siege Health Assertion (post-run diagnostic)

Add to calibration check: for each known siege (Sarajevo, Gorazde, Bihac, Srebrenica), verify:
- Besieging corps has >= N brigades within M hops of the siege target
- Siege sector has non-zero density
- Besieging corps has non-zero eligible attackers in at least K of the last 10 weeks

```
SIEGE_HEALTH_CHECKS = [
  { siege: 'sarajevo', corps: 'vrs_sarajevo_romanija', min_brigades_near: 4, target_muns: ['centar_sarajevo','ilidza','novi_grad_sarajevo','novo_sarajevo'] },
  { siege: 'gorazde', corps: 'vrs_drina', min_brigades_near: 2, target_muns: ['gorazde'] },
  { siege: 'bihac', corps: 'vrs_2nd_krajina', min_brigades_near: 2, target_muns: ['bihac'] },
]
```

### 2. Brigade Drift Alert (weekly report)

For each brigade, compute BFS distance from `location_osid` to `home_osid`. If distance > MAX_DRIFT_HOPS (e.g. 8) AND the brigade is not on an active operation, flag it in the weekly report. Aggregate as "N brigades drifted > 8 hops from home" per corps.

### 3. Corps Operational Coverage Test (vitest)

A calibration-level test that runs the 40w scenario and asserts:
- Every corps with > 4 brigades has at least 1 brigade in each of its sectors
- No sector with > 5 front edges has zero assigned brigades
- SRK specifically has >= 4 brigades within Sarajevo-ring municipalities

### 4. Home Distance Recall Mechanism (engine)

When a brigade has been > N hops from home for > M consecutive turns with no active operation, trigger a "recall" march back toward home_osid. This is the structural fix — the detection mechanisms above catch the symptom, but the engine needs a mechanism to prevent drift in the first place.

## Recommended Fix Sequence

1. **Immediate:** Add siege health assertions to `compare_painted_vs_sim.cjs` output (detect)
2. **Immediate:** Add brigade drift summary to scenario end report (detect)
3. **Investigation:** Trace exact mechanism that moved 3rd Sarajevo to Gorazde (root cause)
4. **Fix:** Implement home recall or SRK siege-lock mechanism (prevent)
5. **Test:** Add vitest assertion for SRK siege staffing (regression gate)

## Files Involved

- `src/sim/combat/corps_front_sectors.ts` — sector assignment
- `src/sim/combat/bot_brigade_ai_osid.ts` — brigade movement decisions
- `src/sim/turn_phases/war_phases.ts` — distribute-brigades-to-front step
- `src/sim/combat/sector_offensive.ts` — operation march/attack-through
- `tools/compare_painted_vs_sim.cjs` — add siege health check
- `src/scenario/scenario_runner.ts` — add drift summary to end report
