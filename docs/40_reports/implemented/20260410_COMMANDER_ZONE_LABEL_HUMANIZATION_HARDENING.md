# 2026-04-10 Commander Zone-Label Humanization Hardening

## Lane summary

- **Lane:** `fix(ui): humanize commander zone labels in reserve and autonomy text`
- **Type:** UI / player-truth hardening
- **Canonical owner after cleanup:** canonical `zone:<corps>:<anchor>` ids in commander and reserve state, rendered through one downstream display helper
- **Demoted path:** raw zone-id leakage and one-off local string formatting in reserve/autonomy surfaces

## Candidate seams considered

1. **Commander zone-label humanization**
   - Chosen.
   - Highest-value bounded wrong-now seam after the autonomy player-faction fix because it was the remaining live UI truth leak in the active worktree.
2. **Gorazde residual territorial pair**
   - Demoted.
   - Still content/runtime audit territory; not yet tight enough for a truthful hardening claim.
3. **Podrinje stranded lifecycle ownership**
   - Demoted.
   - Redesign-blocked because no canonical lifecycle owner exists.
4. **444th Konjic overextension**
   - Demoted.
   - Doctrine/realism, not a truth-owner contradiction.

## Exact seam

Two player-facing surfaces still printed raw internal zone ids:

- `src/ui/map/utils/armyReserveSeverity.ts` rendered `commander_focus_zone_id` directly inside reserve provenance detail.
- `src/sim/ai_commander/proposal_generation.ts` rendered `staging_zone` directly inside commander op-proposal descriptions.

The sim-owned ids were correct, but the player-facing text leaked internal routing syntax like `zone:vrs_2nd_krajina:ozren` and `zone:arbih_1st_corps:gorazde_2`.

## Change

1. Added `src/utils/player_facing_zone_label.ts`
   - `formatPlayerFacingZoneLabel(zoneId)` strips the `zone:<corps>:` prefix when present and humanizes the anchor token deterministically.
2. Updated `src/sim/ai_commander/proposal_generation.ts`
   - `buildOpProposalDescription(...)` now routes `staging_zone` through the shared formatter, so commander op proposals read `Zone: Gorazde 2` instead of raw internal ids.
3. Updated `src/ui/map/utils/armyReserveSeverity.ts`
   - reserve provenance detail now routes `commander_focus_zone_id` through the same shared formatter, so reserve requests read `Ozren` instead of raw internal ids.
4. Added regression coverage
   - `tests/army_reserve_provenance_legibility.test.ts`
   - `tests/sim/autonomy/autonomy_phase_e_enrichment.test.ts`

## Why scenario proof is not relevant

This lane does not change:

- simulation behavior
- persisted schema
- scenario outputs
- anomaly generation

So the strongest truthful proof is source-boundary regression coverage plus the full verification bar.

## Before / after proof

### Baseline

- reserve provenance could render `Commander signal: critical priority for 3 brigades in zone:vrs_2nd_krajina:ozren.`
- autonomy op proposals could render `Zone: zone:arbih_1st_corps:gorazde_2`

### Post-fix

- reserve provenance now renders `Commander signal: critical priority for 3 brigades in Ozren.`
- autonomy op proposals now render `Zone: Gorazde 2`
- both surfaces consume the same shared downstream formatter instead of each inventing its own cleanup rule

## Verification

### Targeted

- `npx.cmd vitest run tests/army_reserve_provenance_legibility.test.ts tests/sim/autonomy/autonomy_phase_e_enrichment.test.ts`
  - passed
  - `2` files / `21` tests

### Full verification bar

- `npm.cmd run test:vitest`
  - passed
  - `240` files / `3119` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed
- `npm.cmd run recovery:check`
  - passed

## Files changed

- `src/utils/player_facing_zone_label.ts`
- `src/sim/ai_commander/proposal_generation.ts`
- `src/ui/map/utils/armyReserveSeverity.ts`
- `tests/army_reserve_provenance_legibility.test.ts`
- `tests/sim/autonomy/autonomy_phase_e_enrichment.test.ts`
- `docs/40_reports/implemented/20260410_COMMANDER_ZONE_LABEL_HUMANIZATION_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Residual board after lane

- **Next board action:** global reassessment after the UI truth batch
- **Content/runtime audit:** Gorazde residual territorial pair
- **Redesign-blocked:** Podrinje stranded same-faction brigade lifecycle
- **Later realism:** 444th Konjic salient discipline
