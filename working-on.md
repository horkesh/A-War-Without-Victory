# Night Shift — Final Stage (2026-03-18)

## Completed
1. ALL engine changes committed: 6fd88bf + 22d6f65
2. Calibration: n884 = 90.4% area-weighted
3. Run 1 (API army-only): DONE — 90.9% area-weighted, 375 obs (93 bugs from 0%-territory prompt bug)
4. CO cross-assessments: DONE — saved to `runs/three_commanders/co_cross_assessments.json`
5. Run 2 (API army+corps): IN PROGRESS — background task byo32qg3v (~6 of 40 turns, ~70 min remaining)

## When Run 2 Completes
1. `node tools/compare_painted_vs_sim.cjs runs/three_commanders` — get area-weighted %
2. `npm run sim:qa:diagnostics` — get observation summary
3. Build morning HTML report at `docs/60_visualisations/morning_report_2026_03_18.html`
4. Report must include:
   - Territory progression (area-weighted) for Run 2
   - Force strength over time
   - CO briefings at key weeks (0, 4, 8, 12, 20, 30, 39)
   - CO CROSS-ASSESSMENTS (the twist) — data in `runs/three_commanders/co_cross_assessments.json`
   - Diagnostic comparison: pre-fix 345 → Run 1 375 (with territory bug) → Run 2 (???)
   - Run comparison table: formula bot vs Run 1 vs Run 2
   - Corps-level assessments from Run 2 (`runs/three_commanders/corps_assessments.json`)
5. Commit report
6. Update napkin with final results
7. Delete this working-on.md

## Data Sources for Report
- `runs/three_commanders/campaign_log.json` — per-turn territory, personnel, decisions, events
- `runs/three_commanders/diagnostic_report.json` — all observations
- `runs/three_commanders/co_cross_assessments.json` — the good/bad/ugly per CO pair
- `runs/three_commanders/corps_assessments.json` — corps-level API assessments (Run 2 only)
- `runs/three_commanders/final_save.json` — end state

## Key Numbers to Include
- Calibration: n884 = 90.4% (formula bot baseline, post-Phase A)
- Run 1 (army API): 90.9%, 375 obs, $0.45
- Run 2 (army+corps API): TBD, TBD obs, ~$3-5 estimated
- Tests: 1101, 89 suites
- Engine changes: stance override, density gate, status_reason, gate trace, entrenchment cap, offensive cooldown, alliance fix (0.35→0.75), conditional events (3 converted), patron pressure (0.015→0.018)
