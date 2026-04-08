# Packaged Desktop Tactical-Map State Push Contract

Date: 2026-04-08  
Lane: `Packaged Desktop Tactical-Map State Push Contract`

## Summary

This lane strengthened the canonical packaged runtime probe from minimal tactical-map pull interaction proof to minimal tactical-map push interaction proof.

Before this lane, `desktop:package:probe` already proved:

- packaged resources exist
- the baked April 1992 startup snapshot loads
- the packaged tactical-map server serves packaged resources
- the real packaged Warroom window loads
- the real packaged operational and sandbox tactical-map windows load
- both tactical-map windows can pull desktop state through:
  - `window.awwv.getMapServerUrl()`
  - `window.awwv.getCurrentGameState()`

What remained implicit was the real desktop push path used after load:

- `game-state-updated`

The packaged probe now proves that both packaged tactical-map windows can subscribe to that real desktop event channel and receive a deterministic pushed state update.

## Chosen seam

Chosen seam: route load and preload pull interaction were already covered, but the real packaged tactical-map push channel was still only assumed.

Why this was the right bounded seam:

- it is a real product path already used by the desktop app
- it stays under the same canonical packaged probe
- it proves meaningful runtime behavior without widening into broad UI automation

## Canonical contract after cleanup

The canonical packaged runtime path remains:

1. `desktop:startup-snapshot:check`
2. `desktop:release:check`
3. `desktop:package:dir`
4. `desktop:package:probe`

`desktop:package:probe` now proves:

- packaged route-load contracts for Warroom, operational tactical-map, and sandbox tactical-map windows
- packaged preload pull interaction contracts for tactical-map windows
- packaged tactical-map push interaction contract:
  - the operational tactical-map window receives `game-state-updated`
  - the sandbox tactical-map window receives `game-state-updated`
  - both pushed payloads resolve deterministically to:
    - `route_mode`
    - `player_faction = RBiH`
    - `turn = 0`

## Files changed

- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`
- `docs/40_reports/implemented/20260408_V08TO09_PACKAGED_DESKTOP_TACTICAL_MAP_STATE_PUSH_CONTRACT.md`

## Implementation details

### `src/desktop/electron-main.cjs`

Added `waitForGameStatePush(...)`, which executes in the real packaged tactical-map window and proves:

- `window.awwv.subscribeGameStateUpdated` exists
- the real subscription bridge receives a pushed `game-state-updated` payload
- the payload resolves to deterministic values for route mode, player faction, and turn

`runPackagedRuntimeProbe()` now:

- arms the subscription promise in both tactical-map windows
- triggers the real desktop push path through `sendGameStateToRenderer(currentGameStateJson)`
- records deterministic `tactical_push_checks` in the probe manifest

### `tools/desktop_packaged_runtime_probe.mjs`

The external probe command now fails loudly if either tactical-map window is missing its packaged state-push proof.

### `tests/desktop_packaged_runtime_probe.test.ts`

The source-level contract test now guards:

- the push helper exists
- the push helper requires the real subscription bridge
- the probe manifests `tactical_push_checks`
- the external probe requires both operational and sandbox push proofs

### `src/desktop/README.md`

Updated the desktop contract documentation so the packaged probe is described truthfully as proving tactical-map push behavior as well as route load and preload pull interaction.

## Verification

Verification for this lane:

- `node --check src\desktop\electron-main.cjs`
- `npx.cmd tsx --test tests\desktop_packaged_runtime_probe.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All commands passed.

## Residual risks

This lane proves a real pushed game-state payload, but not downstream UI rendering semantics after receipt.

Still deferred:

- full packaged UI automation
- turn-report push proof
- state-push reaction semantics inside tactical-map UI components
- non-Windows packaged targets
- installer/store/publish flow

## Integration notes for protected canon files

This lane intentionally did **not** edit:

- `docs/PROJECT_LEDGER.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

Suggested `PROJECT_LEDGER.md` note:

`2026-04-08 - Packaged Desktop Tactical-Map State Push Contract: strengthened desktop:package:probe so packaged tactical-map operational and sandbox windows must successfully receive a deterministic game-state-updated push through the real desktop subscription bridge after load. The packaged probe now records tactical_push_checks for both windows under the same canonical packaged runtime path.`

Suggested `MASTER_ROADMAP.md` note:

- mark the lane complete only if wording matches delivered scope:
  - tactical-map state-push proof under the canonical packaged probe
  - no claim of packaged UI automation or renderer-behavior coverage

Suggested `.claude/architect_notes.md` note:

- after proving route load and preload pull interaction for packaged desktop windows, the next bounded runtime contract should prove the real desktop push channel through the same packaged probe by arming subscriptions in-window and triggering the existing main-process broadcast path, rather than inventing a synthetic second test route
