# P15 Browser And Affordance Hardening

**Date:** 2026-06-26
**Branch:** `codex/p15-browser-affordance-hardening`
**Result:** PR #457 candidate implemented and locally verified through the focused follow-up pack; GitHub merge closeout pending.

## Summary
- Hardened OOB/CorpsCard, Corps Detail, and Formation Detail affordances found during the owner-playthrough scout wave.
- Added real browser-gate network/status failure detection and deterministic startup cleanup for browser evidence folders.
- Absorbed the Einstein/Kepler follow-up scout findings: desktop/full-suite path filters now cover packaged runtime resources, the Windows release job runs the packaged runtime probe before publishing artifacts, and Enclave Dashboard routing/budget/label affordances are hardened.
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

### Release Guardrails
- Desktop path detection now treats `package-lock.json`, `.github/workflows/release.yml`, `build/icon.png`, `assets/`, `data/derived/`, `data/ui/`, and `data/scenarios/events/` as desktop release-relevant.
- Full-suite path detection now treats packaged runtime data and assets as browser/full-suite relevant.
- The Windows release workflow runs `npm run desktop:package:probe` before NSIS packaging/publishing.
- CI trusted-detector steps now restore the checked-out head detector script after base-branch relevance detection, so later tests/builds do not see a stale base copy.

### Enclave Dashboard
- Army HQ handoff to the Enclave Dashboard closes Army HQ first, preventing overlapping command shells.
- Airdrop allocations are capped against the remaining turn budget, and over-budget staging is rejected before IPC.
- Enclave faction and supply-state chips render player-facing labels instead of raw faction/status ids.
- The dashboard close control has an accessible name/title.

## Verification
- `node node_modules/vitest/vitest.mjs run tests/ui/oob_drilldown_routing.test.ts tests/ui/command_drilldown_routing.test.ts tests/ui/formation_detail_parity.test.ts tests/ui/first_hour_browser_gate_contract.test.ts` passed 4 files / 70 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:first-hour:browser` passed.
- `npm.cmd run qa:live-surface:browser` passed.
- `npm.cmd run qa:player-journeys` passed 43 files / 675 tests.
- `npm.cmd run desktop:map:build` passed with existing non-fatal Vite warnings.
- `git diff --check` passed.
- Live in-app browser proof on `http://127.0.0.1:3003/` verified RBiH start, war-start splash, opening brief, OOB CorpsCard flip affordances, Corps Detail seed-sector operation CTA, Formation Detail bridge-disabled sector reasons, and console health with only the expected dev-map desktop-bridge fallback warning.
- Follow-up focused proof passed `node node_modules/vitest/vitest.mjs run tests/ui/command_surface_repurpose_panels.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/desktop_release_ci_guardrails.test.ts tests/ui/first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` (4 files / 34 tests).
- CI repair focused proof passed `node node_modules/vitest/vitest.mjs run tests/desktop_release_ci_guardrails.test.ts tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/command_surface_repurpose_panels.test.ts tests/ui_presidential_decision_room_wiring.test.ts --pool=forks --reporter=dot` (4 files / 35 tests), after the first PR run exposed that Baseline Regression left the base-branch detector file in the test worktree.
- PR #457 is open for GitHub checks/comments and merge closeout.

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
| `.github/scripts/detect-changed-paths.sh` | Desktop release-relevant packaged runtime/resource detection |
| `.github/scripts/detect-full-suite-changes.sh` | Browser/full-suite packaged runtime/resource detection |
| `.github/workflows/release.yml` | Packaged runtime probe before Windows artifact publishing |
| `.github/workflows/baseline-regression.yml` | Restore head detector after trusted relevance detection |
| `.github/workflows/desktop-release-guard.yml` | Restore head detector after trusted relevance detection |
| `.github/workflows/full-suite-and-fingerprint.yml` | Restore head detector after trusted relevance detection |
| `src/ui/map/App.tsx` | Enclave Dashboard handoff closes Army HQ shell |
| `src/ui/map/components/EnclaveDashboard.tsx` | Airdrop budget guard, player-facing labels, accessible close affordance |

## Remaining Closeout
- Remove generated `.tmp_first_hour_browser_gate` and `.tmp_live_surface_browser_sweep` evidence folders after recording verification; preserve `.tmp_dev_server` only if it backs the active local browser session.
- Push the follow-up commit to PR #457, inspect GitHub checks/comments, merge only after green, then prune local/remote branch refs.
- Deferred scout queue: packaged-probe network/status capture, an opt-in real-PMTiles browser smoke, Army HQ raw sector-detail id fallback, and Corps Situation "healthy silence" copy.
