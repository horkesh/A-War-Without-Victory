# [074] Retained snapshot/schema gate — result (Claude f75b0a11, read-only)

Verdict: **No retained pre-order (w175–180) state exists in the bounded set.** Existing late-state prep fields are usable ONLY as late state. Exact remaining gate: per-turn (or w175–180 snapshot) Mistral 2 preparation inputs.

Commands saved first: `074-inventory.command.txt`, `074-grep.command.txt`. Outputs `074-inventory-out.json`, `074-compact.txt`, `074-grep.stdout.log`; exits `074-inventory.exit.txt`=0, `074-grep.exit.txt`=0 (compact formatter: no exit file). Set: n25/n29/n30/n37/n39 (`..6deb5845c150c196__w188_*`) + n38 (`..4658849344f21642__w186_n38`). No 073 timing extraction repeated.

## Inventory (live files, sizes in 074-compact.txt)
- Every run dir: initial_save.json (turn 0), final_save.json, replay_save_manifest.json, watched_operations.json, weekly_report.jsonl, brigade_temporal_log.jsonl, operation_aars.json, run_summary.json, etc. No other save/snapshot/checkpoint file in n25/n29/n30/n37/n39 (depth ≤3 walk).
- **n38 only** additionally has live `save_w186.json` (8.7 MB) — post-turn-186, not pre-order. n38's final_save is meta.turn 186.
- `replay_save_manifest.json` (all six): schema_version 1, keys {schema_version, frame_count, frames}; frames carry only {turn, date, activeFormations, totalCasualties, totalDisplaced, controlByFaction}. **0 frames reference any file** — manifest entries are summaries, not snapshots; no declared phase.
- Saved meta.turn: initial=0, final=188 (n38: 186).

## Correct address of Mistral 2 (from `src/state/game_state.ts:492,959,2761`)
`state.military.corps_command[corpsId].active_operations[]` (and `.last_completed_operation`), with the stored string field **`name`** (not `operation_name`; `operation_name` is only a weekly-diagnostic field). Mistral 2 is at `corps_command.hvo_tomislavgrad.active_operations` with `name="Operation Mistral 2"`, `started_turn=175`. CorpsOperation prep fields exist: `preparation_sub_phase`, `preparation_turns_elapsed`, `supply_readiness_at_assessment`, `intel_confidence_at_assessment`, `force_ratio_estimate`, `planning_duration` (game_state.ts ~566, 658–666). This explains the 073 operation_name-only lookup missing it; it was a search-shape miss, not absence of state.

## Late state (final_save; phase = execution at w186/188 — NOT the 175–180 gate)
| run | prep | prep_elapsed | supply | intel@assess | force_ratio | planning_duration | participants |
|---|---|---|---|---|---|---|---|
| n25 | ready | 3 | 1 | 1 | 10.96 | 4 | 1st Guard ABB, 3rd Guard Jastrebovi, Rama |
| n29 | ready | 3 | 1 | 1 | 17.47 | 4 | 4th Guards Split, 1st Guard ABB, 3rd Guard, Rama |
| n30 | ready | 5 | 1 | 0 | 1 | 4 | 4th Guards Split, 2nd Guard Mech |
| n37 | ready | 5 | 1 | 0 | 1 | 4 | same as n30 |
| n39 | ready | 5 | 1 | 0 | 1 | 4 | same as n30 |
| n38 (w186) | ready | 5 | 1 | 0 | 1 | 4 | 112th, 1st HGZ, 4th Guards, 2nd Guard Mech |
Measured: planning_duration identical (4); supply_readiness 1 in all; the split n25/n29 (elapsed 3, intel 1, FR ≫1) vs n30/37/39/38 (elapsed 5, intel 0, FR 1) matches the 073 execution split (w178 vs w180). Inference only (NOT measured): elapsed freezing at ready/launch, and intel 0 / FR 1 being a low-intel path, cannot be told from this late state; `intel_confidence_at_assessment` and FR are overwritten at assessment (static source operation_preparation.ts:1054–1056), so they describe the final assessment, not earlier turns, and say nothing about which sub-phase held weeks 175–180 or whether ASSEMBLY_TIMEOUT fired.
- Other files: preparation field names have 0 hits in run_summary/end_report/operation_aars/run_meta (n25, n30, n38); weekly_report 0 (073). watched_operations.json (5 entries, sample = Kotor Varos t10) was not shown to contain Mistral 2 (only first ~400 chars sampled; unverified beyond that).

## Remaining missing-data gate
Per-turn or w175–180 snapshot of Mistral 2 `preparation_sub_phase`, `preparation_turns_elapsed`, assembled-brigade count, intel/supply/assessment inputs and attached-brigade membership: **not retained** in the bounded set (no pre-186 save; manifest has no files). Not asserted for any other directory. No horizon prescribed; dirty-run source compatibility not assumed.
