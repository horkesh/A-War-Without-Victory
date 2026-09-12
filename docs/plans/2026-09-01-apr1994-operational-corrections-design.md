# April 1994 Operational Corrections — Design

**Status:** Implemented and superseded by the integrated April calibration summarized in
[`20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md`](../40_reports/implemented/20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md).

## Objective

Correct two causes of the April 1994 calibration divergence without introducing scripted control transfers: ARBiH should be the attacking side in the open Croat–Bosniak war while HVO primarily defends, and the two major VRS eastern offensives should draw on Army Main Staff elite formations.

## Design

The bilateral-war assignment will retain the existing deterministic corps-selection and diversion machinery, but reverse its operational posture. The selected ARBiH corps will receive an offensive stance and the selected HVO corps a defensive stance. The same doctrine will be applied in the organic corps-stance path so a force that misses the diversion threshold cannot fall back to the opposite policy. This changes operation generation, not attack resolution or control authority: probes remain non-occupying, while qualifying offensive sector operations may change control through the canonical combat path.

Operation Cerska–Kamenica will explicitly roster the VRS 1st Guards Motorized Brigade and 65th Protection Motorized Regiment. Both are Army Main Staff elite formations supported by the BB2 account of the offensive. Triggered historical operations will admit explicitly rostered Army-HQ elites through the existing shared loan validity and deployment functions, preserving reachability, availability, attachment, and deterministic ordering invariants.

Operation Zvezda 94 will roster the same two Army-HQ elite formations as a deliberate scenario allocation. BB2 supports Main Staff direction and higher-HQ concentration for Zvezda but does not identify these exact formations there; documentation and ledger evidence will distinguish that design allocation from the stronger unit-specific Cerska evidence.

## Compliance

- Control changes remain authorized only by combat/operation resolution.
- Elite participation uses the canonical Army-HQ loan lifecycle.
- No calibration-only territorial event or hidden control rewrite is added.
- All candidate and loan processing remains stably ordered.

## Required reading completed

- Phase Specifications v0.9.0
- War Specification v0.9.0
- Engine Invariants v0.9.0
- Systems Manual v0.9.0
- CODE_CANON and determinism/invariant mappings
- PROJECT_LEDGER and PROJECT_LEDGER_KNOWLEDGE relevant entries
