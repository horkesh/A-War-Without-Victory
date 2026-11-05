# Live January 1993: player-staff prestage fix, re-measured (2026-11-05)

**Status: EVIDENCE ONLY.** No calibration was adopted. The baseline, painted references, thresholds and anchors are unchanged.

## What changed

Three gates in `pre_planned_operations.ts` and `triggered_operations.ts` skipped the authored concentration marches and queued-head reservations whenever the operation belonged to the player's faction. They did this at every autonomy level. They now use `selectStaffControlledFactions`, so they skip only a manual player (autonomy 0). At production autonomy (2) the player's staff executes these authorized historical plans the same way bot staff do.

Headless play is inert by construction: `apr1992_definitive_188w` authors no `player_faction`.

**Headless 188-week regression, measured on commit `f15cf3d80`:** `npm run sim:scenario:run:188w`, exit 0.
- `tools/verify_checkpoints.cjs` scores 702/704/701/691, identical to the 2026-11-04 re-pin.
- Four artifacts are byte-identical to `data/derived/scenario/baselines/manifest.json`: `final_save.json` (26b80117…), `weekly_report.jsonl` (5d25054d…), `control_delta.json` (27c9aaef…) and `activity_summary.json` (dbad0370…).

## Measurement

Tool: `tools/ai_play/desktop_calibration_compare.ts --turns 39 --autonomy-level production --event-policy historical_default --paramilitary-policy deny --historical-operation-policy accept`.

Each faction was scored with `tools/compare_painted_vs_sim.cjs --target jan1993` (712 OSIDs).

| Player faction | Before fix (player) | After fix (player) | No-player branch |
|---|---|---|---|
| RBiH | 698 | **698** | 702 |
| RS | 698 | **701** | 702 |
| HRHB | 703 | **703** | 702 |

Every no-player branch scores the same before and after the fix.

## Cells

- **RS player gains 3 cells:** Korenići, Donji Koričani and Gornje Krčevine. These are the RS staff's own western prestage marches, which now execute. The player-branch and no-player-branch diff fell from 6 cells to 3.
- **RBiH player is unchanged (6 cells):**
  - Goražde: Glamoč and Sopotnica;
  - Brčko: Bukvik Gornji;
  - Srebrenica: Obadi;
  - Pale: Prača;
  - Jajce: Lupnica.
- **Glamoč and Sopotnica are also wrong in the RS-player branch, but correct with an HRHB player.** So their remaining cause is not only the player's own prestage gate.

## Corps trace (new `--trace-corps` diagnostic, RBiH player)

File: `compare-L2-t39-RBiH-corps-trace.json`. It records the `arbih_1st_corps` queue and live operations every week for both branches.

1. **Trnovo Eastern Counterattack behaves differently in each branch.**
   - No-player branch: it plans t20–t23, goes to recovery at t24 without ever executing, and frees the 831st.
   - Player branch: it executes t21–t26, recovers t27–t28, and holds the 831st until t29.
2. **Operation Circle starts four weeks late.**
   - No-player branch: it plans at t25, executes at t26, and the 801st takes Sopotnica (t26) and Glamoč (t27).
   - Player branch: it starts planning only at t29, plans for 7 weeks, and goes to recovery at t36 without executing.
3. **Queue pollution, a separate engine defect.**
   - In the player branch, each operation's name is appended back onto the queue while that operation is active (Visoko–Breza from t9, Trnovo from t21, Circle from t30), and the names stay there after the operation ends.
   - Source: the per-turn `inject-player-pre-planned-operations` step (`war_phases.ts` ~1890) calls `injectPrePlannedOperations(..., { faction })`. Its deferred-queue loop (`pre_planned_operations.ts` ~2906) re-queues every `available_from` definition that is not already queued. It does not check `active_operations`, and it does not check whether the operation has already run. The dated-enqueue path (~2668) does check both.
   - Headless runs inject only once, so the defect is live-only.

### Independent operations review (read-only subagent, 2026-11-05)

- **Item 1 is not a lifecycle defect.**
  - The planning→execution gate (`sector_offensive.ts:1620-1758`) and `axisHasExecutableOpeningAttack` (`sector_offensive_launch_helpers.ts:764-911`) contain no player, autonomy or headless check.
  - Both branches have the 831st at Delijas and the 102nd at Podgrab from t13, with identical movement logs through t20.
  - At t21 the predictor approves the opening attack in the player branch and not in the no-player branch. The no-player op then times out at t24 (`zero_eligible_axis`, 0 attacks).
  - The verdict must come from a non-positional input, because **the branches already diverge at t1**:
    - control delta RBiH −2 at t1 and −4 from t2;
    - army-directive pushback events appear only in the no-player branch;
    - `rs_1st_podrinje` moves at t1 in the player branch and at t4 in the no-player branch.
  - HYPOTHESIS: which input flipped the verdict. Next step: re-run with reason-code topic `axis_reject` to record `power_ratio`.
- **Item 2:**
  - Circle starts late because `isSlot0AvailableForQueue` (`corps_operation_helpers.ts:270`) blocks the queue while Trnovo is active or recovering (t20–t28).
  - Circle then fails because in the player branch `rs_1st_podrinje` (about 2,000 men) moves into Sopotnica, Circle's first objective, at t23 and holds it to t39. In the no-player branch it goes to Rudo, and the t26 Sopotnica battle has no defending brigade.
  - Circle goes to recovery at t36 (`zero_eligible_axis`).
- **Item 3 is confirmed. It never re-runs an operation:** the AAR is in history before slot 0 frees, and stale heads shift out as resolved.
  - Each stale entry costs one queue turn.
  - A stale head holds its brigades as op participants for one turn (`getQueuedDatedPrestageBrigadeIds`, and in this run the 831st and 102nd at t37).
  - Minimal fix: in the deferred-queue loop (~2906), skip a definition already in `active_operations`, mirroring the dated path (~2673).
  - The fix is live-only: the per-turn step is gated off headless, and the runner injects once. It still needs its own measured run.
- **Next lane (queued, not started): the t1 live/no-player divergence.**
  - It is the first point of difference.
  - Army-directive pushback appears only in the no-player branch.
  - Find the player-gated mechanic before touching any operation.

## Still open (unchanged)

- **Bukvik Gornji and Obadi:** only t1–t2 bot paramilitary captures hold these. A historical `always_deny` RBiH player cannot reproduce them. This is an owner design question.
- **The Level-1 `commander_loop` guard** has no faction check.
