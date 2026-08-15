# Collapse D-selection Scaling Design

**Status:** MEASURED and FAIL_REVERTED on 2026-08-15.

**Decision:** retain the accepted symmetric two-turn D-selector unchanged and change only `STRAIN_FRACTION` from `0.15` to `3.0` behind the existing default-OFF collapse gate. Keep the 40 Tier-1 threshold, effective 55 Phase 3D severity floor, eligibility topology, Phase 3D formulas, control writers, and Section 6 guards unchanged.

## Evidence and objective

V3 solved selection: two fresh 188-week runs measured exact main-town exposure Sipovo 3 versus Drvar 2 with deterministic outputs, 31/31 anchors, and all seven engine-health gates. Scale remained inert: exposure maximum 33 became strain 4.95, no Tier-1 domain became true, and no live damage was written.

The currently open Tier-0 path is HRHB spatial. Its maximum measured exposure is 20 at `op:kupres:bucovaca`. A multiplier of 3.0 maps that to strain 60, above both Tier-1 threshold 40 and the effective Phase 3D severity floor 55. This is the smallest clean whole-number candidate expected to make the currently reachable path live; 2.75 lands exactly at 55, where severity is zero and the damage writer remains skipped.

## Selected contract

Phase 3C remains:

```text
local_strain = clamp(local_strain + exposure * STRAIN_FRACTION, 0, 100)
```

The packet changes only `STRAIN_FRACTION = 3.0`. Exposure still comes exclusively from the accepted two-turn combat-incidence window. No scenario switch, per-faction scale, geography weight, casualty weight, decay, threshold change, or new state field is introduced.

## Rejected alternatives

- **Scenario-configurable multiplier:** adds save/scenario surface before one retained value is known to work.
- **Lower Tier-1 or severity thresholds:** changes two downstream meanings and the severity floor rather than calibrating the new exposure unit.
- **Multiplier 2.75:** produces exactly strain 55 at the measured HRHB maximum; Phase 3D severity is zero there, so it cannot establish live damage.
- **Open RBiH/RS Tier-0 simultaneously:** confounds local scaling with faction eligibility and would immediately require broader Section 6 disposition.

## Acceptance and retirement

Retain 3.0 only if two fresh collapse-ON 188-week runs:

- are byte-identical except `run_meta.json` and share a final hash/fingerprint;
- preserve the selector's Sipovo/Drvar exposure ratio, yielding strain 9/6 absent clamping;
- produce at least one true HRHB Tier-1 domain and at least one non-enclave live damage/capacity write;
- retain 31/31 anchors, all bot benchmarks, and all seven engine-health gates;
- pass the Section 6 verifier and truthfully identify whether any protected OSID reached its live guard.

If live damage remains zero or health/anchor/Section 6 gates fail, revert the multiplier. Selector v3 remains accepted either way. D-shape is outside this packet.

## Measurement outcome

Two fresh collapse-ON 188-week runs completed at final hash `625ffd6b24154674` and structural fingerprint `22cf3c5d8884bfb8`. Fifteen of sixteen artifacts were byte-identical; only `run_meta.json` differed because it records the deliberately different output root. Both runs retained 31/31 anchors, six of six bot benchmarks, and all seven engine-health checks. The Section 6 verifier passed every named and full-scan exclusion.

The scale transform worked numerically: Sipovo/Drvar became strain 9/6, `op:kupres:bucovaca` reached 60, and campaign peaks reached 99. It did not work behaviorally. No Tier-1 domain became true and no `collapse_damage` or `capacity_modifiers` entry was written. The highest reachable HRHB candidate, `op:kupres:bucovaca`, ended with spatial persistence 3 against the required 4. HRHB Tier-0 spatial eligibility opened too late for that target to receive four post-gate exposure-bearing evaluations; multiplying the same sparse samples cannot repair that temporal mismatch.

Per the predeclared rule, `STRAIN_FRACTION=3.0` was reverted. The retained runtime remains 0.15 with the accepted selector v3. The next packet is D-shape: resolve `local_strain` against canon's reversible Control Strain rule and make Tier-1 evaluation/recovery semantics explicit before any combined scale measurement.

## Determinism and canon

The change adds no ordering, RNG, clock, state, or serialization behavior. Identical exposure inputs receive identical finite multiplication and existing clamping. It remains within the default-OFF War subsystem described by Phase Specifications v0.9.0 and War Specification v0.9.0; Engine Invariants §8 monotonicity and §9.8 stable ordering remain unchanged. Control can still change only through the existing authorized collapse/control path. No canon document is edited.
