# v0.9.5 Platform Test Matrix — Dev-Host Approximation (PARTIAL)

**Lane:** `LANE-NIGHTSHIFT-V095-DEV-HOST-TEST-MATRIX-APPROXIMATION`
**Date:** 2026-05-09
**Status:** PARTIAL — agent died mid-investigation; Linux portion verified; Windows portion not started
**Predecessor:** Build runbook `docs/40_reports/implemented/20260507_V095_P1_G3_G4_BUILD_RUNBOOK.md` + Build artifacts at `dist-packaged-fresh-linux/` (Linux AppImage 1.20 GB) and `dist-packaged-fresh/` (Windows NSIS 1.40 GB)

## What was verified (PASS)

### Linux (WSL2)

- **L-3 LAUNCH: PASS.** AppImage launched successfully under WSL2; tactical map server started on `http://127.0.0.1:45101/`. DBus errors observed (expected in WSL/headless environments) but non-fatal — process initialized the server cleanly.
- 20-second smoke timeout fired before clean exit, but the launch itself was confirmed functional via the server bind.

This is non-trivial: it confirms the AppImage build is structurally sound and runnable on a Linux environment, not just an artifact-on-disk.

## What was NOT verified

The agent terminated before completing:

### Linux (WSL2) — incomplete
- L-1 download / size check (artifact known to exist on disk)
- L-2 chmod +x (would happen during launch)
- L-4 New Game (programmatic interaction not attempted)
- L-5 advance turn
- L-6 save
- L-7 clean exit (timeout cut process)
- L-8 relaunch
- L-9 load saved
- L-10 advance from loaded
- L-11 remove AppImage
- L-12 ~/.config persistence

### Windows (dev host) — not started
- W-1 through W-20 — agent did not reach Windows phase

### Save round-trip — not started
- Pre-war / mid-war / late-war save+reload+hash+advance

### Version + AppUserModelId verification — not started

## What's clean-VM-only (legitimately deferred)

Per the lane prompt's spec, these items are inherent operator clean-VM work that no dev-host approximation can cover:
- W-2 / W-3 SmartScreen warning behavior (only fires on uncommon-binary unsigned downloads)
- W-15 Settings → Apps entry visual verification
- W-19 first-run %APPDATA% persistence (needs new user state)
- W-20 uninstaller registry cleanup

## Honest partial verdict

**v0.9.5 platform test matrix is PARTIALLY unblocked:**
- ✅ Build artifacts exist on disk (P1-G3 Linux + P1-G4 Windows; verified earlier in session)
- ✅ Linux AppImage launches cleanly under WSL2 (server bind confirmed)
- ⏸️ Windows NSIS launch + save round-trip + version verification still pending agent re-dispatch OR clean-VM operator
- ⏸️ Genuinely-clean-VM-only items remain (SmartScreen, registry cleanup) — minority of test matrix

## Recommendation

The v0.9.5 hard-blocker scope has shrunk meaningfully:
- Builds done on disk
- Linux launch path verified runnable
- Windows path UNVERIFIED — the agent died before reaching it; could be re-dispatched or operator-handled

If a re-dispatch is desired, target a NARROWER scope (Windows portion only, since Linux is partially verified) and use a separate agent to keep the surface bounded.

## Successor handoff

For a v0.9.5 final closure:
1. Re-dispatch a Windows-only test lane (smaller scope; dispatch with the runbook §4.2 W-1..W-20 minus operator-only items)
2. Operator clean-VM execution of SmartScreen + registry items (cosmetic)
3. Save round-trip via either approach

## Lane self-assessment

Honest accounting: this lane delivered ~1 verified item (Linux WSL2 launch) of an intended ~30. Most of the value the lane was supposed to deliver did not land due to agent termination mid-execution. The `dist-packaged-fresh-linux/` AppImage was confirmed launchable in a cleanish Linux environment, which is genuinely informative — but the bulk of the test matrix remains unverified.

The runbook + build artifacts + this partial verification together still constitute MORE evidence than the v0.9.5 surface had at session start (which was: builds-on-disk-but-untested). Net: marginal forward progress.
