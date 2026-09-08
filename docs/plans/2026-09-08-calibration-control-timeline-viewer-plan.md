# Calibration Control Timeline Viewer — Plan

**Date:** 2026-09-08
**Lane:** Development instrumentation (`tools/`) — NOT product surface, NOT a roadmap workstream
**Status:** IMPLEMENTED 2026-09-08 (branch `calibration-timeline-viewer`, not yet merged)
**Branch/worktree:** `calibration-timeline-viewer` at `F:/AWWV-worktrees/calibration-timeline-viewer`, isolated from the concurrent `codex/*` branches and from `r7-arbih-honorific-names`

## Why

Calibration is currently followed through a single number per checkpoint. That number cannot answer the question the work actually turns on — *which cells moved* — and it is provably ambiguous: `matched_osids` is **non-injective**, and two runs have scored an identical 637 over **different maps four cells apart**. A score is not an identity, so a delta cannot be attributed by reading the score alone.

The existing tools each answer part of this and none answers it over time:

| Tool | Answers | Missing |
|---|---|---|
| `tools/verify_checkpoints.cjs` | four-checkpoint scores replayed against current painted files, enclave guard | end state only, no per-cell view |
| `tools/compare_painted_vs_sim.cjs` | OSID match rate by region + mismatch list | `final_save` only, one checkpoint per invocation |
| `tools/build_calibration_map_html.mjs` | interactive HTML map, amber mismatches, merge-map handling | one static snapshot per rendered PNG |

## The finding that made this cheap

No new engine artifact is required. `final_save.json` already carries `political.control_events` — the **complete** flip log for the whole campaign (`{turn, settlement_id, mechanism, from, to, mun_id, battle_id, attacker_brigade}`) — plus `political.initial_political_controllers`. Replaying the log over turn-0 control yields the exact controller map at any week.

Verified on the tracked final save: **220 events spanning turns 1→188**, 64 distinct turns. Nothing prunes the log (no slice/splice/truncation anywhere in `src/state/` or `src/sim/turn_phases/`).

**Correction worth making separately:** the schema comment at `src/state/game_state.ts:3216` says `control_events` is *"Kept for last 3 turns"*. That is stale and load-bearing misinformation — someone could "restore" pruning to match the comment and silently break both this tool and `verify_checkpoints.cjs`, which is where the calibration floors come from.

## Design rules (each exists to stop a specific known failure)

1. **The four-snapshot rule.** Painted historical truth exists at four weeks only — jan1993 w39, apr1994 w104, apr1995 w156, oct1995 w188. Control is shown for every week; **mismatch is only defined at those four**, and the viewer refuses to colour mismatches anywhere else, stating why. Comparing a mid-period week against its era's snapshot (what `pickHistoricalReferenceKey` does for scoring) would report "mismatches" that are only the war not having happened yet — a confident, wrong instrument. Do not add that.
2. **Always replay against painted-on-disk-now, never the run's recorded `historical_fit`.** The same run has read 673 then, 675 replayed. Painted files are absent from `consumed_inputs.files`, so a repaint silently re-bases every recorded score with nothing recording it.
3. **Stamp provenance, and say when a run is inadmissible.** Run directory, the run's own commit/dirty/Node, painted-file sha256 + revision. Latest ≠ valid: a dirty tree or the wrong Node major disqualifies a run as a baseline however recent it is, and the page says so in red.
4. **Merged sub-1km² cells render and score under their parent** (`micro_osid_merge_map.json`, 32 entries, 744 drawn / 712 scored). Stated in the UI, because amber *polygons* can exceed the scored mismatch count.
5. **Reuse the existing projection**, identical to `build_calibration_map_html.mjs`, so the two viewers cannot drift.

## What was built

`tools/calibration_timeline.mjs` — zero dependencies, plain node, emits one self-contained HTML file (~660 KB, no CDN, no network).

```
node tools/calibration_timeline.mjs [run_dir] [--out <path>]
```

- `run_dir` defaults to the newest `runs/<dir>` **that actually holds a `final_save.json`** (an interrupted run leaves a directory without one and is skipped rather than chosen).
- Output defaults to `<run_dir>/control_timeline.html` (`runs/` is gitignored, so no artifact enters the repo).

The page provides: a week slider across the whole campaign with keyboard arrows; flip-stepping buttons (the map is static between flips, so stepping by *event* beats scrubbing empty weeks); a checkpoint scoreboard, click-to-jump; the mismatch list for the active checkpoint, click-to-highlight; per-week flips coloured by mechanism (combat / paramilitary / consolidation / abandoned / event / setup_control); hover detail per cell; and the provenance panel.

## Verification

- **Scoring agrees exactly with the authoritative tool.** Same run, `verify_checkpoints.cjs` and this tool both report **702 / 678 / 672 / 657**. The replay is the same `stateAt()` form, so agreement is by construction, not coincidence.
- **The four-snapshot rule holds under test:** mismatches shown at w39/104/156/188 (10 / 34 / 40 / 55, matching stdout exactly) and **zero, with an explicit refusal note, at w73 and w150**.
- **Rendered and driven in a real browser:** 744 cells drawn, no console errors, layout fits the viewport with the panel scrolling independently, flip-stepping / checkpoint-jump / mismatch-select all confirmed working.

## Deliberately not done

- **No second renderer and no new map stack** — same projection as the existing viewer.
- **No new engine artifact, no pipeline change, no re-run.** Everything derives from `final_save.json` as it is emitted today, so this cannot affect determinism, hashes, or calibration.
- **Not wired into Electron or any product surface.** This is dev instrumentation in `tools/`, the same category as `engine_health_gate.cjs` and `verify_checkpoints.cjs`; it does not expand the 1.0 product roadmap (§10).

## Worthwhile follow-ups (not built)

1. **Diff two runs cell-by-cell**, not just run-vs-painted. This is the highest-value extension, because it directly addresses the non-injective-score problem that motivated the tool.
2. **Classify the residual.** ~70% of the oct1995 residual has previously been shown to be "the engine never fought there" rather than "the engine fought and lost" (52 of 75 mismatches were not an objective of any authored operation; 53 never changed hands in 188 turns). Overlaying *ever contested? / ever an objective?* would make each mismatch self-sort into the two classes, which need completely different fixes.
