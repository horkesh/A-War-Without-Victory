# Run brief — live-equivalent January 1993 measurement (evidence only)

Date: 2026-11-05. Calibration owner: Claude (owner-delegated; owner asleep, standing instruction "continue the calibration work on valid assumptions"). This brief is written BEFORE the run and fixes what is run and how it is judged.

## Purpose
Measure, on current `main` (post #521/#522), how the LIVE game path (`live-equivalent-desktop-v1`: `src/desktop/desktop_sim.ts#advanceTurn`, production startup, explicit policies) performs at the FIRST checkpoint, January 1993 (turn 39), against the authoritative reference `data/source/calibration/painted_control_jan1993.json`. Nothing is tuned, adopted, re-pinned or re-blessed by this run (README "Evidence_only output is never automatic baseline adoption").

## What runs
`tools/ai_play/desktop_calibration_compare.ts --turns 39` for each player faction (RBiH, RS, HRHB), plus a final-state export (`--final-save-dir`, added in the same change) so that both branches can be scored with the existing `tools/compare_painted_vs_sim.cjs --target jan1993`.

Branches inside each run:
- `headless`: the no-player desktop path (bots on all sides) from the baked startup.
- `player`: `startNewCampaign` as the faction, autonomy 1, with the policies below.

Policies (matched to the historical playthrough the owner calibrates against):
- `--event-policy historical_default`: every player event takes the game's historical default.
- `--paramilitary-policy deny`: matches the historical `always_deny` used in the retained native RBiH runs (CALIBRATION_MASTER:90-108). §6-sensitive: deny is the conservative, historically attested setting for RBiH. RS/HRHB are reported with the same flag for comparability; their paramilitary history differs, so their numbers are read as divergence evidence, not targets.
- `--historical-operation-policy accept`: authored historical operations are accepted (the default).

## How it is judged (fixed in advance)
- Primary: RBiH player branch score /712 vs painted January 1993. Compare against the last matched live figure, 700/712 at `950501b` (ledger 2026-10-27), the 2026-09-22 acceptance bar (≥700/712 plus the eight named operation captures), and the original target 707.
- Divergence: the player-minus-headless difference for each faction (control counts, and per-OSID mismatches unique to each branch).
- Reported as raw numbers; interpretation goes to an independent scenario-tester review. No numbers are carried into CALIBRATION_MASTER as accepted.

## Preconditions
Clean tree on the measured source; `AWWV_SLACK_WEBHOOK_URL` excluded; outputs under the ignored `runs/live-jan1993-20261105/`; source commit recorded in the output provenance (scenario/startup/entrypoint hashes are emitted by the tool).
