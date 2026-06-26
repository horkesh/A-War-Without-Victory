# P15 Browser And Affordance Hardening

**Date:** 2026-06-26
**Branch:** `codex/p15-browser-affordance-hardening`
**Result:** Local candidate implemented and locally verified; PR/GitHub merge closeout pending.

## Summary
- Hardened OOB/CorpsCard, Corps Detail, and Formation Detail affordances found during the owner-playthrough scout wave.
- Added real browser-gate network/status failure detection and deterministic startup cleanup for browser evidence folders.
- Kept the packet UI/read-model/browser-QA scoped; no simulation, scenario, calibration, save-schema, packaging, or Srebrenica/Zepa event-owned fall behavior changed.

## Changes Made

### Command Affordances
- `CorpsCard` renders no-op command headers as static non-focusable headers instead of inert buttons.
- Corps card flip controls now expose action-specific accessible names: show details / show summary.
- Corps card front/back and Corps Detail overview use fielded-brigade language instead of generic brigade totals.

### Corps And Formation Detail
- Corps Detail computes the operation-planning seed sector once and exposes it in the `Prepare Operation in HQ` button title and accessible name.
- Formation Detail sector assignment options now explain why a disabled option cannot be selected: already automatic, already override, or desktop command bridge unavailable.

### Browser Gates
- `qa:first-hour:browser` and `qa:live-surface:browser` now collect Puppeteer `requestfailed` and HTTP response status failures.
- The gates fail on real request failures and HTTP 4xx/5xx, while ignoring deterministic cancellation noise such as deliberate `net::ERR_ABORTED` during reload/navigation.
- Each gate removes stale success/failure JSON and stale screenshots at startup, then preserves current pass/fail evidence for inspection.

## Verification
- `node node_modules/vitest/vitest.mjs run tests/ui/oob_drilldown_routing.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/first_hour_browser_gate_contract.test.ts` passed 4 files / 70 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 675 tests.
- `npm.cmd run desktop:map:build` passed with existing non-fatal Vite warnings.
- `git diff --check` passed.
- Live in-app browser proof on `http://127.0.0.1:3003/` verified RBiH start, war-start splash, opening brief, OOB CorpsCard flip affordances, Corps Detail seed-sector operation CTA, Formation Detail bridge-disabled sector reasons, and console health with only the expected dev-map desktop-bridge fallback warning.
- GitHub inspection found no open PRs; latest `main` checks are green.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/CorpsCard.tsx` | Header affordance, flip labels, fielded-brigade copy |
| `src/ui/map/components/CorpsDetail.tsx` | Seed-sector operation planning accessible copy; fielded-brigade copy |
| `src/ui/map/components/FormationDetail.tsx` | Disabled sector-option reason copy |
| `src/ui/map/i18n/messages.en.ts` | New English UI keys |
| `src/ui/map/i18n/messages.bcs.ts` | BCS mirrors for new keys |
| `tools/ui/first_hour_browser_gate.cjs` | Network/status failure detection and stale evidence cleanup |
| `tools/ui/live_surface_browser_sweep.cjs` | Network/status failure detection and stale evidence cleanup |
| `tests/ui/*` | Focused regressions for affordances and browser-gate contracts |

## Remaining Closeout
- Remove generated `.tmp_first_hour_browser_gate` and `.tmp_live_surface_browser_sweep` evidence folders after recording verification; preserve `.tmp_dev_server` only if it backs the active local browser session.
- Push PR, inspect GitHub checks/comments, merge only after green, then prune local/remote branch refs.
