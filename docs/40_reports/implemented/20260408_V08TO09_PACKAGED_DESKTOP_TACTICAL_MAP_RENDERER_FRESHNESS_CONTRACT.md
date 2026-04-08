# Packaged Desktop Tactical-Map Renderer Freshness Contract

Date: 2026-04-08
Owner roles: Orchestrator, Technical Architect, Systems Programmer, Build Engineer, QA Engineer, Documentation Specialist, Process QA, Code Review (canon/specs), Determinism Auditor

## Seam chosen

The next highest-value bounded packaged-runtime seam after operational renderer reaction proof was renderer freshness and payload identity. The packaged probe already proved that the operational tactical-map React renderer reacted to `game-state-updated` and `turn-report-updated`, but it still did not prove that the renderer-side store state came from the exact current pushed payload rather than merely ending in a valid-looking state.

This lane stayed inside the canonical packaged-runtime path by strengthening `npm.cmd run desktop:package:probe` only.

## Why this was the highest-value bounded next step

- It strengthens the real product-owned operational tactical-map renderer path in `useDesktopSession()`.
- It proves more than bridge delivery without widening into broad UI automation.
- It avoids inventing synthetic routes or a second probe command.
- It is architecturally clearer than adding another route/window: the probe now proves not just that the renderer reacts, but that it reacts to the exact payload it was pushed.

## Contract after cleanup

`desktop:package:probe` now proves all prior packaged-runtime guarantees plus this renderer freshness contract for the operational tactical-map renderer:

- the store fingerprint recorded by `loadSave()` matches the exact pushed `game-state-updated` payload string
- the renderer-side reaction records deterministic payload identity fields derived from the actual pushed state payload
- the renderer-side `lastTurnReport` state preserves the exact pushed turn-report probe marker and expected player faction

This remains scoped to the operational tactical-map React renderer, which is the actual owner of `useDesktopSession()`-based store reactions.

## Files changed

- `F:\A-War-Without-Victory\src\ui\map\hooks\useDesktopSession.ts`
- `F:\A-War-Without-Victory\src\ui\map\store\gameStore.ts`
- `F:\A-War-Without-Victory\src\desktop\electron-main.cjs`
- `F:\A-War-Without-Victory\tools\desktop_packaged_runtime_probe.mjs`
- `F:\A-War-Without-Victory\tests\desktop_packaged_runtime_probe.test.ts`
- `F:\A-War-Without-Victory\src\desktop\README.md`
- `F:\A-War-Without-Victory\data\derived\startup\apr_1992_initial_save.json`

## Implementation summary

### Renderer-side freshness instrumentation

In `useDesktopSession()`:

- game-state reaction records:
  - `fingerprint_matches_payload`
  - `payload_length`
  - `player_faction`
  - `route_mode`
  - `turn`
- turn-report reaction records:
  - `payload_matches_probe`
  - `player_faction`
  - `probe`
  - `route_mode`
  - `turn`

These values are written to the existing deterministic dataset-based probe surface on `document.documentElement`.

### Probe validation strengthening

In `electron-main.cjs`:

- renderer-reaction collection now validates:
  - exact game-state payload identity preservation
  - deterministic payload length equality against `currentGameStateJson`
  - exact turn-report probe marker preservation
  - deterministic `player_faction = RBiH`
- the manifest’s `renderer_reaction_checks` now carries the stronger freshness fields

In `desktop_packaged_runtime_probe.mjs`:

- the external packaged probe now hard-fails if the manifest omits the strengthened operational renderer freshness proof

## Verification

### Targeted checks

- `node --check src\desktop\electron-main.cjs`
  - Passed
- `npx.cmd tsx --test tests\desktop_packaged_runtime_probe.test.ts`
  - Passed: `4/4`

### Required packaged-runtime chain

- `npm.cmd run desktop:startup-snapshot:check`
  - Passed
- `npm.cmd run desktop:release:check`
  - Passed
- `npm.cmd run desktop:package:probe`
  - Passed

Successful packaged manifest excerpt:

```json
{
  "renderer_reaction_checks": [
    {
      "game_state_updated": {
        "fingerprint_matches_payload": true,
        "location_path": "/",
        "payload_length": 1002666,
        "player_faction": "RBiH",
        "route_mode": "operational",
        "turn": 0
      },
      "route_mode": "operational",
      "turn_report_updated": {
        "location_path": "/",
        "payload_matches_probe": true,
        "player_faction": "RBiH",
        "probe": "awwv_turn_report_probe",
        "route_mode": "operational",
        "turn": 0
      }
    }
  ]
}
```

### Full verification

- `npm.cmd run test:vitest`
  - Passed: `216/216` files, `3018/3018` tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Passed
- `npm.cmd run build`
  - Passed

## Notes from debugging during verification

One intermediate `desktop:package:probe` run failed during the nested `warroom:build` step with:

- `EPERM, Permission denied: \\?\F:\A-War-Without-Victory\dist\warroom\data`

Root-cause investigation showed:

- no lingering Electron or packaged desktop process remained alive
- `dist\warroom\data` was deletable by hand immediately afterward
- a clean sequential rerun of `desktop:package:probe` passed

This was treated as a transient output-directory lock during verification, not as a code-path regression introduced by this lane.

The final verification pass also required rebuilding the baked startup snapshot so `desktop:startup-snapshot:check`, `desktop:release:check`, and `desktop:package:probe` all ran against the current engine state instead of a stale desktop bundle input.

## Residual risks after this lane

- The probe now proves operational renderer freshness, but not broad renderer behavior beyond the specific store-backed reaction seam
- Sandbox remains covered for route load, pull interaction, and pushed delivery, but not for React store-backed freshness because it is a separate legacy renderer today
- Remaining plausible packaged-runtime work trends toward lifecycle edge cases or broader UI-style behavior, which is materially less bounded than the lanes completed so far

## Integration notes for protected docs

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-08 - Packaged Desktop Tactical-Map Renderer Freshness Contract: strengthened desktop:package:probe so the packaged operational tactical-map renderer must prove its store-backed reaction preserves the exact current pushed payload identity. The canonical packaged runtime probe now records renderer_reaction_checks with game-state fingerprint equality against the pushed state payload and turn-report probe-marker equality against the pushed turn-report payload, rather than only asserting that valid-looking state eventually appeared in the renderer.`

### `docs/plans/MASTER_ROADMAP.md`

Mark complete only if wording matches delivered scope:

- operational tactical-map renderer freshness and payload identity proof under the canonical packaged probe
- no claim of sandbox renderer freshness parity
- no claim of broad UI automation

Suggested next-step note if needed:

- packaged desktop window lifecycle / ownership proof was considered, but deferred because the next remaining seams are lower-yield edge cases rather than materially clearer runtime-contract improvements

### `.claude/architect_notes.md`

Add:

`After proving packaged bridge delivery and operational renderer reaction, the next bounded runtime proof is payload identity freshness: verify that the renderer-owned store path preserves the exact pushed payload, not just that it settles into some plausible state. Prefer validating against the same store fingerprint and probe marker the real renderer already owns rather than inventing synthetic side channels or second probe commands.`
