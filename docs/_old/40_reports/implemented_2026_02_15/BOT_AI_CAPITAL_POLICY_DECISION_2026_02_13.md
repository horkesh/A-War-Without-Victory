# Bot AI Capital Policy Decision (2026-02-13)

## Scope

Evaluate whether historical-MVP mismatch is primarily driven by recruitment capital/equipment policy or by upstream pool/spawn scaling.

## Evidence from calibration runs

- `historical_mvp_apr1992_52w__a7d8c17fb49e148e__w30` (pre pool-scale recalibration): personnel totals were inflated (RBiH 143472, RS 128646, HRHB 65878).
- `historical_mvp_apr1992_52w_tuned_v2__584f75b265241d0d__w30` (capital/equipment adjusted): control and personnel remained materially similar; inflation persisted.
- `historical_mvp_apr1992_52w__a7d8c17fb49e148e__w30` after deterministic pool-scale recalibration: personnel moved close to Dec 1992 knowledge bands (RBiH 134867, RS 116482, HRHB 43467), while preserving deterministic behavior.

## Decision

Do not apply further structural changes to recruitment capital/equipment policy in core code at this time. Keep scenario-level capital knobs available, but treat them as secondary.

Primary calibration lever is now fixed in deterministic manpower intake (`src/sim/phase_i/pool_population.ts`):

- `POOL_SCALE_FACTOR`: `38 -> 30`
- `FACTION_POOL_SCALE`: `RBiH 1.32 -> 1.18`, `RS 1.08 -> 0.98`, `HRHB 0.78 -> 0.58`

## Rationale

- Capital and trickle adjustments alone did not materially correct overgrowth once pools saturated.
- Pool scaling directly impacts the op->pool->spawn->reinforcement chain and produced the intended historical envelope movement.
- This keeps policy deterministic and auditable without introducing faction-specific randomization or hidden compensators.

## Residual risk

- RBiH and RS totals in 30w still run above strict lower-bound historical narratives in some checkpoints.
- If tighter envelope matching is required, next step should be controlled refinement of pool-scale coefficients (not capital policy inflation/deflation loops).
