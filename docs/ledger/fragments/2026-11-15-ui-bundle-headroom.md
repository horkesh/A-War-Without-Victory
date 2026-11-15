## 2026-11-15 — Entry-chunk headroom: Codex, Chronicle, Wrapped, Settings, Diplomacy, Peace plan, AI panels load on demand

UI build only; no sim, state or calibration change. Main's full-suite player-experience gate failed on the Vite chunk-size warning (`tactical_map` 3,000.38 kB vs the 3000 kB limit) after #643 and #639 landed, each under the limit alone. `App.tsx` now lazy-imports the views that open on demand (Codex, Chronicle, Wrapped, Settings, Diplomacy, Peace plan, AI settings, AI advisor), each behind its own open flag and a `Suspense` boundary. Entry chunk 3,000.38 -> 2,863.53 kB (136.85 kB under the limit); `chunkSizeWarningLimit` and the gate are untouched. Same pattern as the earlier Recruitment, Autonomy, Economy and Credits splits.

Proof: `tsc --noEmit` clean; 87 UI test files that reference App or these views pass (861 tests); rendered Codex and Chronicle open in the real desktop app. See `docs/40_reports/evidence/20261115_bundle_headroom/`.
