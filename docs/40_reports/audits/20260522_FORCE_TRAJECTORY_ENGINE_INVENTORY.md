# Force-Trajectory Engine Inventory (2026-05-22)

**Status:** COMPLETE - read-only audit.
**Author:** Codex gameplay review.
**Context:** Fresh painted-vs-sim diagnostics show the sim area profile flat at RS 61.0%, RBiH 26.4%, HRHB 12.6% from w104 through w188. Historical Oct 1995 requires the late-war RS area collapse and Federation/ARBiH advance that the current run set does not yet express.

---

## 1. Existing force-quality inputs

The engine already stores or derives useful trajectory inputs:

- Brigade officer quality, faction officer maturity, capability profile, cohesion, morale, exhaustion, pool pressure, and equipment support are consumed by `computeCorpsOperationReadiness(...)`.
- The helper returns seven normalized readiness traits: `operation_readiness`, `staging_reliability`, `axis_coordination`, `support_delivery`, `failure_recovery`, `reserve_response`, and `collapse_susceptibility`.
- The helper is pure and writes nothing, which makes it suitable for diagnostics and deterministic gates.

Evidence: `src/sim/combat/corps_operation_readiness.ts:4`, `src/sim/combat/corps_operation_readiness.ts:25`, `src/sim/combat/corps_operation_readiness.ts:380`, and `src/sim/combat/corps_operation_readiness.ts:401`.

## 2. Existing consumers

The opportunity catalog uses attacker-side readiness traits and faction supply pressure as eligibility gates:

- `sana_95` uses 5th Corps `operation_readiness` and RBiH supply pressure.
- `mistral_2_95` uses HVO/HV readiness, HRHB supply pressure, and HVO/HV `axis_coordination`.
- `kupres_cincar_94` and `vlasic_ridge_95` use the same attacker-side pattern.

Evidence: `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:217`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:266`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:145`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:220`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:229`, and `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:308`.

## 3. Missing comparative surface

The current force-trajectory surface is partial for late-war collapse:

| Surface | State |
|---|---|
| Attacker readiness threshold | Exists |
| Attacker supply pressure gate | Exists |
| Live objective ownership check | Exists |
| Staging/control dependency check | Exists |
| Defender readiness degradation by target theater | Missing as a catalog gate |
| Attacker-vs-defender readiness margin | Missing as a catalog gate |
| Per-OSID/theater defender supply degradation | Missing as a catalog gate |
| Per-operation trace for eligible/block/launch/under-deliver | Partial; H1 watched triggered-operation trace is separate from opportunity catalog lifecycle |

## 4. Minimum next surface

The smallest useful next surface is not a new global combat multiplier. It is a deterministic trace/read model for opportunity lifecycle outcomes plus one comparative predicate that can be tested without changing scenario anchors:

- `opportunity_id`
- turn and canonical window
- required/optional predicate results
- attacker readiness traits
- defender theater readiness traits or defender degradation snapshot
- launch decision
- validation/build failure reason if any
- resulting operation/AAR link if launched

This should be compact and sorted deterministically, and it should live at the scenario-runner/save diagnostic boundary before any outcome tuning.

## 5. Recommendation

Proceed with evidence-first lifecycle trace persistence for opportunity operations, then decide between:

- Catalog-fill lane: implement `donji_vakuf_95` first because it is the lowest-risk BB gap and uses the existing single-corps pattern.
- Trajectory-gate lane: add a Krajina-facing defender degradation predicate if the trace proves existing opportunities are eligible but under-delivering or never launching because the current gates cannot express VRS collapse.

Do not wire Oct 1995 RS as a Tier 1 pass/fail anchor until this trace and at least one late-war delivery lane are proven on a fresh 188w run.
