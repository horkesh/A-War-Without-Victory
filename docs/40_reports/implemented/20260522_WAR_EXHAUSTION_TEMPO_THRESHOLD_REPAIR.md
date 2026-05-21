# War Exhaustion Tempo Threshold Repair (2026-05-22)

## Summary

Repaired the war-exhaustion attack-tempo threshold so the existing combat-math penalty operates inside the canonical 0-100 `political.war_exhaustion` range.

This is a wiring/calibration repair, not a new mechanic. It changes combat math for exhausted attackers and updates the Army HQ campaign-drag readout threshold to match.

## Change

- `src/sim/combat/combat_math.ts`
  - `WAR_EXHAUSTION_TEMPO_THRESHOLD_LOW`: `500` -> `30`
  - `WAR_EXHAUSTION_TEMPO_THRESHOLD_HIGH`: `800` -> `80`
  - The existing multiplier still interpolates from `1.0` to `0.85`.
- `src/ui/map/components/army_hq/CommandRelationshipSection.tsx`
  - Campaign-drag readout threshold now uses `30`, matching the engine low threshold.

## Verification

- Red engine test failed first: exhaustion `55` still returned multiplier `1.0`.
- Red UI test failed first: campaign-drag readout stayed hidden at exhaustion `62`.
- Green focused tests:
  - `npx.cmd vitest run tests\combat_exhaustion.test.ts --reporter=dot` PASS (7/7)
  - `npx.cmd vitest run tests\ui\command_relationship_campaign_drag_proof.test.ts --reporter=dot` PASS (6/6)

Broader verification is recorded in the PROJECT_LEDGER entry for the commit.
