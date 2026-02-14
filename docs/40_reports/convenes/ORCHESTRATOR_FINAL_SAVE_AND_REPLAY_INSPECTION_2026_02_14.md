# Inspection: final save not loadable, replay loading failing

**Date:** 2026-02-14

---

## 1. Findings

### 1.1 Final save

- **`data/derived/latest_run_final_save.json`** — **Exists** and is valid JSON (~319k lines). It is the file the tactical map “Latest run” option loads (`fetch(`${base}/data/derived/latest_run_final_save.json`)`).
- **Why you might not see it:**
  1. **Dev server working directory:** The map’s Vite plugin serves `/data/` from the **project root** (either `process.cwd()` or the config dir). If you run `npm run dev:map` from a directory that is not the repo root, the server may not find `data/derived/latest_run_final_save.json` and “Latest run” will fail.
  2. **When it gets written:** The file is only updated when a scenario run **finishes successfully** with `--map`. If the last run you did was the **timestamped** one (`apr1992_historical_52w__8f38ea4a52d0448f__w52_1771072951168`), that run **did not complete** (it stopped around week 20). So no `final_save.json` was written and `--map` never ran; `latest_run_final_save.json` is still from whatever **previous** run completed with `--map`.
  3. **Looking in the run folder:** The timestamped run folder has **no** `final_save.json` (run was interrupted). So “I don’t see final save” is correct for that folder. To load a final state from disk, use **“Load state file”** and pick a **completed** run’s `final_save.json` (e.g. `runs/apr1992_historical_52w__8f38ea4a52d0448f__w52/final_save.json` if it exists, or any other run that has `final_save.json`).

### 1.2 Replay loading failing

- **`runs/apr1992_historical_52w__8f38ea4a52d0448f__w52_1771072951168/replay_timeline.json`** — **Truncated (invalid JSON).** The file ends at line 317997 in the middle of a value (`"will_not_recover": false, "w`). The run was stopped before the runner could close the stream (no `]`, no `"control_events": [...]`, no final `}`). So `JSON.parse` in the map fails and replay load fails.
- **Fix for this run:** Do **not** use that file for replay. Use a **completed** run that was executed with `--video` and has a full `replay_timeline.json` (e.g. `runs/historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52/replay_timeline.json` or any run that finished 52 weeks with `--video`).

---

## 2. Recommendations

1. **Run from repo root:** Start the map with `npm run dev:map` from the project root (`f:\A-War-Without-Victory`) so `/data/derived/` resolves correctly and “Latest run” can load.
2. **Use “Latest run” for final state:** In the map, choose **Dataset → Latest run**. That loads `data/derived/latest_run_final_save.json`. If that still fails, the last run with `--map` did not complete; run a full 52w with `npm run sim:scenario:run:default` and wait for it to finish, then try again.
3. **Load state from a run folder:** Use **“Load state file”** and select a **completed** run’s `final_save.json` (e.g. under `runs/<run_id>/final_save.json`). Avoid the timestamped run that only has `save_w1`…`save_w20` and no `final_save.json`.
4. **Replay:** Use **“Load replay…”** only with a **complete** `replay_timeline.json` from a run that finished and had `--video`. Do not use the replay file from the interrupted timestamped run.

---

## 3. Run folder summary

| Run folder | final_save.json | replay_timeline.json |
|------------|-----------------|----------------------|
| `apr1992_historical_52w__8f38ea4a52d0448f__w52_1771072951168` | No (run interrupted ~w20) | Yes but **truncated** (invalid JSON) |
| `apr1992_historical_52w__8f38ea4a52d0448f__w52` | Yes | No (run without --video) |
| `historical_mvp_apr1992_52w__1f30fc5bbf33b750__w52` | Yes | Yes (complete) |

Use a completed run’s `final_save.json` for “Load state file” and a run that had `--video` and completed for “Load replay…”.
