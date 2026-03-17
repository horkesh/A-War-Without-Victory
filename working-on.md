# Night Shift — AI Commander Self-Correction Loop (2026-03-17/18)

## Status
1. ALL engine changes committed (6fd88bf): stance override, density gate, status_reason, gate trace, entrenchment cap, offensive cooldown, alliance fix, conditional events
2. Calibration verified: n884 = 90.4% area-weighted (zero regression)
3. Run 1 (API army-only) IN PROGRESS — post-Phase A fixes
4. Run 2 (API army+corps) — PENDING (after Run 1)
5. CO cross-assessments — PENDING (after Run 1)
6. Morning visual report — PENDING (after all runs)

## User Request
"Full visual report in the morning. Each CO assesses the other two — the good, the bad, the ugly. Second run with corps-level API."

## Next Steps
1. Wait for Run 1 → compare → run CO cross-assessments
2. Run 2 with --corps-api flag
3. Build morning HTML report with all data
4. Commit report + update napkin/ledger

## Key Files
- `tools/claude_plays_vrs/run_three_commanders.ts` — main runner (supports --mode api --corps-api)
- `tools/claude_plays_vrs/api_commander.ts` — army-level API
- `tools/claude_plays_vrs/api_corps_commander.ts` — corps-level API
- `tools/claude_plays_vrs/generate_co_assessments.ts` — cross-assessment generator
