## 2026-11-16 — F7b: the Army HQ plan's army stance and aggression modifier retired (freeze Batch C1b; control-identical)

- **Finding** (from the F7 build; measured on main 2026-11-16).
  - `computeSupplyStatus` (`army_hq_gathering.ts`) read a missing supply reserve as `critical` when reserves are off, so every army planned under "critical" supply.
  - A fix measured on main changed only `campaign_plans.{RBiH,RS}.doctrine_override.{army_stance,aggression_modifier}`. Control and every other field stayed identical, and no general_offensive or strategic_defense op appeared, before or after.
  - Those two stored values have no reader anywhere: not in sim, UI, desktop, briefing or the Desk. The only consumer of `doctrine_override` reads `corps_stance_ceilings`. The UI's army stance is the separate `military.army_stance`, and the Chronicle's doctrine comes from the authored war timeline.
- **Ruling (orchestrator, clean-engine rule):** retire, not fix. A stored value nobody reads is removed. Wiring it would be new behaviour before the freeze.
- **Retired.**
  - `DoctrineOverride.army_stance` and `aggression_modifier`.
  - Their only inputs, the theater `territory_trend`, `supply_status` and `manpower_status`, with `computeTerritoryTrend`, `computeSupplyStatus` (and its reserves-off bug), `computeManpowerStatus`, and the two threshold constants.
  - `generateDoctrineOverride` now builds only `corps_stance_ceilings`, which is kept.
- **Save compatibility.** The validator accepts `army_stance` and `aggression_modifier` as optional legacy fields, checked only when present.
  - New test in `tests/save_migration_validator_rejection.test.ts`: a save carrying them loads, with the fields intact.
- **Measured** (one 188-week run against main `b1a79a844` = `799e43a7ee2f4764`).
  - Final hash `70f4dc05bf375bc7`.
  - **0 cells differ** at w39, w104, w156 and w188, and all 251 control_events are identical. The whole final-state diff is the 6 retired fields (3 plans × 2).
  - Guards: verify_checkpoints "guard intact" (enclave 9/9, Farz, cascade 31, eastern provenance CLEAN), and engine_health_gate --strict PASS (consistency 0).
  - Re-pinned `data/derived/scenario/baselines/manifest.json`. The 40-week structural fingerprint is unchanged (`3b1ddd64fb4f1600`).
- **Tests.** `tests/army_hq_gathering.test.ts` now asserts the assessment's and the doctrine's retired fields are gone and that the corps ceilings still apply. 296 tests in the affected files pass, and tsc is clean.
