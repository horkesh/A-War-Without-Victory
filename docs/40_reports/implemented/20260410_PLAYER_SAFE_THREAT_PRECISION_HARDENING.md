# 2026-04-10 - Player-Safe Threat Precision Hardening

## Lane summary

- **Lane title:** Own-sector force-balance precision demotion across player-facing threat surfaces
- **Why this lane:** After the startup board closed, the strongest remaining bounded hardening seam was no longer in engine/runtime truth. `CorpsFrontPanel` still printed exact `threat_ratio` values like `1.37:1`, and the same raw force-balance precision leaked through Army HQ sectors, the Situation tab OPSEC summary, and the player-safe front tooltip.
- **Canonical owner after cleanup:** the player-knowledge integrity contract for threat as a `staff abstraction`, implemented through `src/ui/map/utils/playerSafeThreat.ts`
- **Demoted path after cleanup:** direct rendering of raw sector `threat_ratio` precision in tactical and Army HQ player-facing shells

## Candidate seams considered

1. Remaining own-sector force-balance precision in `CorpsFrontPanel`.
2. The same raw `threat_ratio` leak in Army HQ `SectorsSection`, `SituationTab`, and the player-safe front tooltip.
3. Gorazde territorial residuals (`content/runtime audit`, not yet a clean hardening lane).
4. Podrinje stranded brigades (`redesign-blocked`).
5. 444th Konjic salient discipline (`realism/doctrine`, not truth-owner hardening).

## Exact seam chosen

The live leak was one coherent player-knowledge seam:

- `src/ui/map/components/CorpsFrontPanel.tsx` rendered exact force-balance precision through `ThreatBadge`
- `src/ui/map/components/army_hq/SectorsSection.tsx` printed `THREAT RATIO` with exact decimal values
- `src/ui/map/components/SituationTab.tsx` printed exact sector threat precision in the OPSEC summary
- `src/ui/map/components/Tooltip.tsx` and `src/ui/map/components/tooltipPlayerSafe.ts` still surfaced exact threat values in the player-safe front tooltip model

That contradicted `docs/20_engineering/PLAYER_VISIBLE_STATE.md`, which classifies threat as a `staff abstraction`, not a raw engine number.

## Why this was the highest-value bounded step

This lane was still squarely in hardening:

- the ownership rule already existed in canon and roadmap
- the remaining leak was downstream rendering, not missing doctrine
- one shared presentation helper could close the seam cleanly
- the strongest proof source was local player-visibility verification, not scenario reruns

## Files changed

- `src/ui/map/utils/playerSafeThreat.ts`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `src/ui/map/components/army_hq/SectorsSection.tsx`
- `src/ui/map/components/SituationTab.tsx`
- `src/ui/map/components/tooltipPlayerSafe.ts`
- `src/ui/map/components/Tooltip.tsx`
- `tests/ui_threat_precision_player_visibility.test.ts`
- `docs/40_reports/implemented/20260410_PLAYER_SAFE_THREAT_PRECISION_HARDENING.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

## Implementation

### Code

`src/ui/map/utils/playerSafeThreat.ts` now owns canonical player-safe threat presentation:

- qualitative threat label
- player-facing summary phrase
- matching UI tone class

The downstream threat surfaces now consume that helper instead of rendering exact ratios:

- `CorpsFrontPanel.tsx`
- `army_hq/SectorsSection.tsx`
- `SituationTab.tsx`
- `tooltipPlayerSafe.ts`
- `Tooltip.tsx`

The exact sim-owned `threat_ratio` value still exists where the engine and adapter need it, but normal player-facing shells now consume only the staff-abstraction presentation.

### Regression coverage

`tests/ui_threat_precision_player_visibility.test.ts` locks the leak closed by asserting that the normal player-facing threat shells no longer render exact ratio strings.

## Before / after proof

### Baseline

- `CorpsFrontPanel` rendered exact force-balance precision through `ratio.toFixed(2)`
- `SectorsSection` rendered `THREAT RATIO` with exact decimals
- `SituationTab` rendered `sector.threat_ratio.toFixed(2)`
- `Tooltip` rendered `model.threatValue.toFixed(2)`

### Post-fix

- the same surfaces now render qualitative staff-abstraction labels such as `OVERMATCHED`, `VULNERABLE`, and `balanced pressure`
- exact `threat_ratio` precision no longer appears in those player-facing files

## Scenario / anomaly relevance

This lane is UI/player-knowledge local. It does not change simulation behavior, persistence, anomaly ownership, or scenario outputs, so a 40-week rerun would be weaker proof than local boundary verification.

The strongest honest proof is:

- targeted player-visibility regression coverage
- typecheck/build integrity
- full repository verification to prove the presentation change did not break adjacent UI/runtime paths

## Verification

- `npx.cmd vitest run tests/ui_threat_precision_player_visibility.test.ts tests/ui_opord_player_safe_labels.test.ts tests/ui_player_visibility.test.ts`
- `npm.cmd run recovery:check`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks

- This lane demotes exact threat precision only on the touched player-facing threat shells. Other numeric military abstractions may still need future review under the same player-knowledge program.
- Gorazde residuals, Podrinje strandedness, and 444th salient doctrine remain on the board in their existing classifications; this lane does not claim to change them.
