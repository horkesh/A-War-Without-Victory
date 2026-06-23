# Map Interaction, Command Anchor, and Browser Command Polish

**Date:** 2026-06-23
**Run ID:** n/a
**Baseline:** `main` at `6d0065765`
**Result:** Implemented as the map-interaction command-anchor/browser-command polish packet.

## Summary
- Command-only corps and army HQ formations now carry `hq_osid` map anchors instead of tactical `location_osid`, preserving inspectability without implying field presence.
- Field inspection, Escape handling, Army Reserve, Settlement, Corps Front, and Formation Detail surfaces now clear stale state, use native/accessible controls, and render player-safe command labels.
- Browser-mode command controls that require desktop IPC now present disabled bridge-unavailable states, and the live surface sweep proves both enabled and disabled paths.

## Changes Made
### Command Anchors and Routing
- Added optional `hq_osid` to `FormationState` and `FormationView`.
- Updated OOB/activation/recruitment/startup loading paths to preserve command-only HQ anchors while keeping tactical `location_osid` off command structures.
- Updated field-inspection routing so corps and army HQ drilldowns can use `hq_osid` after a known tactical `location_osid` and before falling back to centroid-style behavior.
- Regenerated `data/derived/startup/apr_1992_initial_save.json` with deterministic command HQ anchors.

### Player-Surface Interaction Truth
- Escape now clears Army HQ, ORBAT corps, field-inspection, and stale side-panel state before opening Pause.
- Field inspection now clears hover and tooltip state so old map hovers do not remain visible over the newly inspected target.
- Receipt read models now scope patron defiance, force-launched AAR rows, and officer resentment rows to the loaded player faction/corps owner.
- Settlement stationed-unit rows render native buttons when they can inspect a formation and inert rows when no callback exists.

### Command Panel Polish
- Army Reserve pool and active-loan inspect controls now use the correct accessible labels and carry field context.
- Corps Front keeps missing logistics/OPSEC/stance/prep data as `Unreported`, preserves explicit neutral/inactive data, counts rear support in friendly manpower context, and disables directive drafting when the desktop bridge is unavailable.
- Formation Detail disables desktop-owned order controls in browser mode, shows bridge-unavailable copy, and renders the current movement stance from player-safe sector stance labels instead of hardcoded text.
- Live browser sweep now branches on disabled Draft New Directive state instead of treating bridge-unavailable browser proof as a failure.

## Scenario Results
- No calibration scenario was run for this packet.
- Startup snapshot was regenerated and checked because `hq_osid` changes deterministic startup serialization.
- Srebrenica/Zepa fall ownership remains event-owned; this packet does not touch fall delivery, scripted operations, or sensitive-history event mechanics.

## Lessons Learned
- Command HQ anchor data belongs in `hq_osid`; using `location_osid` for command containers creates false physical presence and validation ambiguity.
- Browser/dev command surfaces must not expose clickable controls that require Electron IPC. Disabled states with explicit bridge-unavailable copy are the correct browser proof.
- Field-inspection routes need to clear hover/tooltip residue, not only selection state.

## Files Changed
| File | Change |
|------|--------|
| `src/state/game_state.ts` | Added optional command HQ anchor field. |
| `src/scenario/initial_formations_loader.ts` | Preserves `hq_osid` when loading initial formations. |
| `src/scenario/oob_early_war_entry.ts` | Writes command HQ anchors for OOB command rows. |
| `src/sim/early_war/activate_corps.ts` | Carries command anchor data through corps activation. |
| `src/sim/recruitment_engine.ts` | Uses `hq_osid` for command formation creation. |
| `src/ui/map/data/GameStateAdapter.ts` and `src/ui/map/data/types.ts` | Projects command anchors and preserves missing command truth. |
| `src/ui/map/map/mapSelectionRouting.ts` and `src/ui/map/store/gameStore.ts` | Preserve compound field context and clear stale hover state. |
| `src/ui/map/components/ArmyReservePanel.tsx` | Fixes pool/loan inspect labels and context. |
| `src/ui/map/components/CorpsFrontPanel.tsx` | Adds bridge-disabled directive state and player-safe unknown labels. |
| `src/ui/map/components/FormationDetail.tsx` | Disables desktop-owned order controls in browser mode and fixes movement stance copy. |
| `src/ui/map/components/SettlementDetailContent.tsx` | Uses native buttons for clickable stationed formations. |
| `src/ui/map/data/*Receipts.ts` | Scopes receipts to loaded player/corps ownership. |
| `tools/ui/live_surface_browser_sweep.cjs` | Proves browser bridge-unavailable state when directive drafting is disabled. |
| `tests/**` | Adds regression coverage for command anchors, routing, receipts, controls, browser bridge discipline, and startup snapshot. |

## Next Steps
- Keep packaging paused until the active polish plan is merged and GitHub is green.
- Keep Vitezovi/OOB identity work separate from this command-anchor packet.
- Continue broad UI/player-truth sweeps, especially command surfaces that mix desktop-owned actions with browser/dev inspection.
