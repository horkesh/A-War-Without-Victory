# Packaged Desktop Turn-Report Push Contract

Date: 2026-04-08

## Scope

Bounded `v0.8-to-v0.9` platform/runtime hardening lane:

- strengthen the existing canonical packaged probe
- prove the real packaged `turn-report-updated` push path
- avoid a second packaged-runtime path
- avoid broad UI automation

## Seam chosen

The packaged runtime contract already proved:

- packaged resources
- startup snapshot loading
- initial Warroom window load
- operational and sandbox tactical-map route loads
- tactical-map preload pull interaction
- tactical-map `game-state-updated` push delivery

The remaining real pushed desktop channel exposed by preload was still implicit:

- `turn-report-updated`

That meant packaged tactical-map windows could load and use pull APIs while the real turn-report broadcaster remained unproven.

## Contract after cleanup

`npm run desktop:package:probe` remains the one canonical packaged runtime probe.

It now proves:

1. packaged resources exist
2. baked startup snapshot loads
3. packaged tactical-map server serves packaged resources
4. Warroom packaged window reaches `did-finish-load`
5. operational tactical-map window reaches `did-finish-load`
6. sandbox tactical-map window reaches `did-finish-load`
7. both tactical-map windows can pull:
   - `getMapServerUrl()`
   - `getCurrentGameState()`
8. both tactical-map windows can receive:
   - `game-state-updated`
   - `turn-report-updated`

## Implementation

Changed files:

- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`

Key changes:

- added `armTurnReportPushProbe(...)`
- added `collectTurnReportPushProbe(...)`
- extended `runPackagedRuntimeProbe()` to:
  - arm the real preload subscription in tactical-map windows
  - trigger the existing `sendTurnReportToRenderer(...)` broadcaster
  - record deterministic `turn_report_push_checks`
- extended the external probe tool to hard-fail unless both operational and sandbox turn-report push proofs exist
- documented the stronger packaged probe contract

## Determinism

The probe stays deterministic:

- one canonical command path
- stable manifest structure
- fixed probe marker: `awwv_turn_report_probe`
- fixed expected fields:
  - `route_mode`
  - `player_faction`
  - `turn`
  - `probe`

No hidden snapshot regeneration was introduced.

## Verification

Required commands run:

- `node --check src\desktop\electron-main.cjs`
- `npx.cmd tsx --test tests\desktop_packaged_runtime_probe.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

## Residual risks

- This proves deterministic turn-report push delivery, not renderer behavior after receipt
- Packaged runtime still stops short of broad UI automation
- Windows unpacked packaged target remains the only packaged runtime target under probe

## Integration notes

Do not edit protected files from this parallel lane automatically. Apply these notes manually:

- `docs/PROJECT_LEDGER.md`
  - Add:
    - `2026-04-08 - Packaged Desktop Turn-Report Push Contract: strengthened desktop:package:probe so packaged tactical-map operational and sandbox windows must successfully receive a deterministic turn-report-updated push through the real desktop subscription bridge after load. The canonical packaged runtime probe now records turn_report_push_checks alongside tactical state-push proofs and validates the real main-process turn-report broadcaster instead of assuming turn-report delivery.`

- `docs/plans/MASTER_ROADMAP.md`
  - Mark complete only if wording matches delivered scope:
    - packaged `turn-report-updated` push proof under the canonical packaged probe
    - no claim of full renderer automation

- `.claude/architect_notes.md`
  - Add:
    - `After proving packaged preload pull interaction and game-state push delivery, extend the same packaged probe to cover the other real desktop push channels instead of creating separate smoke paths. For turn-report proof, arm the actual in-window preload subscription and trigger the existing main-process broadcaster so the probe validates the same channel the product uses.`
