# Operations Force-Trajectory Gating Audit (2026-05-22)

**Status:** COMPLETE - read-only audit.
**Author:** Codex operations review.
**Question:** Can existing late-war opportunity operations (`sana_95`, `mistral_2_95`, `kupres_cincar_94`, `vlasic_ridge_95`) deliver the painted Krajina collapse organically under the current force-trajectory substrate, or do we need catalog/engine follow-up?

---

## 0. Method

Read-only inventory of:

- `src/sim/combat/operation_opportunity_catalog_5th_corps.ts`
- `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts`
- `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts`
- `src/sim/combat/corps_operation_readiness.ts`
- `docs/40_reports/audits/20260522_PAINTED_COMPARE_FRESH_DELTA_ANALYSIS.md`
- `docs/40_reports/audits/20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md`

No source, scenario, anchor, or tuning edits were made.

## 1. Findings

### 1.1 Existing late-war ops are macro-gated, not comparative-force-gated

The current catalog gates late-war opportunities on:

- Date window.
- Political/alliance context.
- Staging control.
- Live enemy-held objectives.
- Attacker corps readiness.
- Attacker faction supply pressure.
- Optional commander/axis-coordination traits.

The catalog does not currently gate on attacker-versus-defender trajectory comparison. There is no predicate that asks whether VRS Krajina defender readiness, officer quality, equipment condition, cohesion, morale, or supply state has fallen below the attacking corps by a required margin.

Concrete examples:

- `sana_95` checks Storm theater rupture, Bihac pocket staging anchors, 5th Corps `operation_readiness >= 0.40`, live RS-held objectives, and RBiH supply pressure below 90. See `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:186`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:194`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:217`, `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:236`, and `src/sim/combat/operation_opportunity_catalog_5th_corps.ts:266`.
- `mistral_2_95` checks Federation authorization, HVO/HV readiness floors, HRHB supply pressure, Livno/Kupres-Cincar staging, RS-held objectives, Storm rupture, and HVO axis coordination. See `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:136`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:145`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:163`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:171`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:201`, `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:213`, and `src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:220`.
- `kupres_cincar_94` and `vlasic_ridge_95` follow the same pattern: attacker readiness/supply/staging plus live RS-held objectives, not defender trajectory comparison. See `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:229`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:240`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:296`, `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:308`, and `src/sim/combat/operation_opportunity_catalog_central_bosnia.ts:319`.

### 1.2 The force-quality helper has enough attacker substrate, but its contract stops before combat math

`computeCorpsOperationReadiness(...)` already combines officer quality, faction officer maturity, capability profile, cohesion, morale, exhaustion, pool pressure, equipment support, and consecutive failures into named traits. The file header explicitly states that this helper "does NOT touch combat math" and "only shapes whether/how plans get proposed, accepted, and staged" (`src/sim/combat/corps_operation_readiness.ts:9`).

The computed traits include `operation_readiness`, `axis_coordination`, `support_delivery`, `failure_recovery`, `reserve_response`, and `collapse_susceptibility` (`src/sim/combat/corps_operation_readiness.ts:380`). This is enough to express an attacker readiness threshold. It is not yet a complete late-war collapse mechanism because current opportunity gates do not compare those attacker traits against the defending corps/faction at the target theater.

### 1.3 The painted gap is too large to treat as a pure threshold-tuning problem

The fresh painted-compare packet reports a flat sim faction-area profile from w104 to w188: RS 61.0%, RBiH 26.4%, HRHB 12.6%. The historical Oct 1995 target is approximately RS 47-51%, RBiH 28-33%, HRHB 18-23%. That leaves the current sim overholding RS by roughly 10 percentage points and underholding HRHB by roughly 5.4 percentage points at the Oct 1995 target.

Because the current profile is flat across Apr 1994, Apr 1995, and Oct 1995, the issue is not merely "late-war ops launch but are slightly weak." The current evidence indicates that the Mistral/Sana/Storm delivery chain is not producing enough territorial transfer in the current run set.

### 1.4 The code-gap memo remains valid, but it is not the whole answer

`20260521_OPERATIONS_EXPERT_BB_CODE_GAPS.md` identifies four catalog-coverage gaps:

- Ljeto 95 for Glamoc/Bosansko Grahovo.
- Donji Vakuf 95.
- Jajce arm inside `mistral_2_95`.
- Juzni Potez extraction from `mistral_2_95`.

Those gaps explain a real subset of missing Oct 1995 HRHB/RBiH painted OSIDs. They do not replace the need for force-trajectory gating because even a complete catalog still needs the engine to decide whether the live VRS defender state has degraded enough for late-war operations to execute with appropriate tempo and failure risk.

## 2. Verdict

Existing late-war ops are necessary but not sufficient.

The current catalog can represent opportunity availability, staging, and attacker readiness. It cannot yet prove that Krajina collapse emerges organically from relative force trajectory because the decisive comparison is missing: attacker operational readiness versus defender theater degradation.

Do not solve this by adding broad global multipliers or by relaxing every late-war operation threshold. The safer path is:

1. Preserve the current catalog as the macro-availability layer.
2. Add compact diagnostics that record why each late-war opportunity is eligible, blocked, launched, skipped, or under-delivered.
3. Add a targeted comparative defender-trajectory predicate/read model for Krajina-facing late-war opportunities.
4. Fill the lowest-risk catalog gaps in the order already identified: Donji Vakuf 95, Jajce arm, Juzni Potez, then Ljeto 95.

## 3. Next implementation lane

The next code lane should not tune outcomes yet. It should persist enough trace to separate four cases that currently look similar in painted output:

- Catalog operation never became eligible.
- Catalog operation became eligible but was blocked by live prerequisites.
- Operation launched but failed on launch feasibility or validation.
- Operation launched and progressed, but combat resolution under-delivered.

After that trace exists, implement the lowest-risk catalog gap (`donji_vakuf_95`) or the Krajina defender-trajectory predicate depending on which trace row proves to be the actual blocker in the fresh 188w run.
