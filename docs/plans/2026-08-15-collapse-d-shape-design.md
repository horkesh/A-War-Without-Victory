# Collapse D-shape Design

**Status:** MEASURED and PASS_RETAIN on 2026-08-15.

## Canon ruling

`docs/10_canon/Engine_Invariants_v0_9_0.md` §8 distinguishes two quantities: Exhaustion is monotonic and irreversible; Control Strain is reversible. Phase 3C `local_strain` is the collapse pipeline's only local, control-facing strain quantity. It is produced from local combat pressure, gates per-OSID collapse eligibility, and is explicitly distinct from faction `profile.exhaustion`. It is therefore the §8 Control Strain quantity.

The current implementation only increments and clamps `local_strain`, so it cannot represent recovery. D-shape is a canon-compliance correction, not optional breadth tuning. No canon text needs amendment.

Phase 3A's `Math.exp` distance attenuation is outside this ruling. It is a transient geometry coupling coefficient, not a bounded exhaustion accumulator or consumer read. This packet does not change Phase 3A.

## Failure being corrected

The scale-only 3.0 probe reached HRHB strain 60 and global strain 99 but produced zero Tier-1 domains. Phase 3C evaluates Tier-1 only for entities present in the current turn's exposure map. `op:kupres:bucovaca` therefore received only three persistence evaluations after HRHB Tier-0 spatial eligibility opened, against the required four, even though its stored strain remained above threshold on quiet turns.

This creates two incorrect temporal properties:

1. stored strain never recovers during quiet periods;
2. stored above-threshold strain does not advance or reset its persistence clock during quiet periods.

## Selected recurrence

For every tracked or newly exposed entity, in canonical ID order, each enabled Phase 3C turn computes:

```text
recovered = max(0, previous_strain - 0.5)
next_strain = min(100, recovered + exposure_this_turn * 4.0)
```

Tier-1 then evaluates every tracked entity every turn using `next_strain`, even when its current exposure is zero. Persistence advances while all gates remain satisfied and resets when they do not.

The recovery step occurs before the current turn's combat shock. This models continuous weekly institutional recovery with acute combat pressure layered on top. It uses only deterministic IEEE-754 field operations, canonical iteration, and existing persisted state.

## Why 4.0 / 0.5

Replay of the accepted v3 battle stream compared bounded linear candidates without mutating engine state:

- 3.0 / 0.25 peaked at HRHB 51: no live severity;
- 4.0 / 0.5 peaked at HRHB 62: one HRHB entity above 55 and two above 40;
- 5.0 / 1.0 peaked at HRHB 64 but applies a larger per-battle shock than needed;
- slower recovery candidates left too much terminal strain; larger scale candidates widened the high-strain cohort without a liveness need.

At 4.0 / 0.5, `op:kupres:bucovaca` is expected to be above 40 when HRHB Tier-0 opens, remain there long enough for four every-turn persistence evaluations, cross the live 55 severity floor, and later recover below 40 if combat stays quiet. Sipovo/Drvar peak strain remains discriminating at approximately 11/7.5. These replay figures are design evidence only; fresh full runs decide retention.

## Boundaries

- Keep selector v3 and its two-turn queue unchanged.
- Keep Tier-0 eligibility, thresholds 40/55, persistence 4, Phase 3D formulas, monotonic `collapse_damage`, consumers, control writers, and Section 6 guards unchanged.
- Do not open RBiH/RS Tier-0, add neighbour coupling, change topology, or add state fields/schema version.
- Preserve default-OFF byte identity.

## Acceptance and retirement

Retain D-shape only if two fresh collapse-ON 188-week runs:

- are byte-identical except `run_meta.json` and share a final hash/fingerprint;
- preserve the Sipovo/Drvar peak ordering and approximate ratio;
- demonstrate reversible strain in real output: at least one entity's terminal strain is below its measured peak;
- produce at least one true non-protected HRHB Tier-1 spatial domain and at least one live non-enclave damage/capacity write;
- retain 31/31 anchors, all bot benchmarks, and all seven engine-health gates;
- pass the Section 6 verifier and report protected-boundary reach truthfully.

If liveness remains zero, or determinism/health/anchors/Section 6 fail, revert the D-shape production changes. D-topology remains reserved.

## Measurement outcome

Two fresh collapse-ON 188-week runs completed at final hash `70d5e04c6f49e041` and structural fingerprint `22cf3c5d8884bfb8`. Fifteen of sixteen artifacts were byte-identical; only `run_meta.json` differed because it records the deliberately different output root. Control, weekly, formation, activity, and AAR artifacts remained byte-identical to the accepted trajectory.

The replayed strain shape matched the design: `op:kupres:bucovaca` peaked at 62 on turn 138 and recovered to 37 terminal; Sipovo peaked at 11 and ended 7, while Drvar peaked at 7.5 and ended 4. One non-protected HRHB spatial domain crossed persistence and produced live damage at Bucovaca: spatial damage `0.35833333333333334`, with `supply_mult` and `pressure_cap_mult` `0.8566666666666667`. Eligibility later turned off as strain recovered; monotonic damage correctly remained.

Both runs retained 31/31 anchors, six of six bot benchmarks, all seven engine-health checks, and 629 matched OSIDs. The Section 6 verifier passed every named outcome and full-scan exclusion with one live global damage/capacity entry. No protected OSID itself reached Tier-1, so the campaign proves a live writer plus protected absence, while the existing discriminating fixture remains the proof that G1 withholds when protected input reaches Phase 3D. Opening RBiH/RS Tier-0 still requires fresh evidence.

D-shape is retained. The pre-1.0 narrow RC packet—hygiene, selection, shape, live writer, and Section 6 instruments—is complete. Neighbour-cascade D-topology remains reserved and moves to the post-1.0 backlog rather than blocking R7.
