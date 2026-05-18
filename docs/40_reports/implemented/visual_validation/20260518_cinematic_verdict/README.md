# Cinematic Verdict Visual Validation

**Date:** 2026-05-18
**URL:** `http://127.0.0.1:3002/?dev=1&live=1`
**Command:** `node docs\40_reports\implemented\visual_validation\20260518_cinematic_verdict\capture.cjs`

## Method

The probe opens the local Vite tactical-map shell and injects a deterministic game-over `loadedGameState` into the already-loaded `gameStore` module. This validates the real `VerdictScreen` shell and `CinematicVerdict` component without changing victory scoring, Cost Ledger calculation, historical comparison, simulation state, or scenario artifacts.

## Captures

| Viewport | Screenshot | Metrics |
|---|---|---|
| 390x844 | `mobile_390x844.png` | `mobile_390x844.json` |
| 768x1024 | `tablet_768x1024.png` | `tablet_768x1024.json` |
| 1440x900 | `desktop_1440x900.png` | `desktop_1440x900.json` |

## Result

- Verdict surface and cinematic band were present in all three captures.
- The initial mobile run exposed a zero-height cinematic band from flex shrink; `CinematicVerdict` now uses `shrink-0`.
- The mobile layout keeps the share copy action visible and hides the full plain-text preview below `sm` to prevent the verdict band from consuming the full viewport.
- Remaining polish scope: the legacy lower verdict sections still exceed the 390x844 viewport after the cinematic band; future work should make the full endgame modal internally tabbed or independently scrollable on small screens.
