# AI-as-player President prototype

Proves the **LLM-as-player loop** end-to-end at the **President altitude**, with a
**byte-identical determinism replay**. The decision-maker (a human, or a wired LLM
API) sits exactly on the per-turn injection seam the Electron UI uses.

## Files

- `president_playthrough.ts` — the reusable, typed wrapper over the **desktop**
  sim API (not `scenario_runner`). Exposes:
  - `startCampaign(faction)` — April 1992 definitive start. Clears the snapshot's
    `headless_scenario_auto_control` flag so decisions route to the **player**
    (`pending_event_decisions`) instead of being bot-auto-resolved.
  - `serializeDecisionContext(state, faction)` — the per-turn context a player
    reads: command briefing + each pending decision flattened to
    `{situation, staff_assessment, options, historical_default, staff_rec}`.
  - `injectDecision(state, eventId, responseId, rationale?)` — applies the chosen
    response via `resolveEventDecision` (the same fn the Electron IPC calls) and
    returns a log entry. The choice is reduced to the primitive
    `{turn, eventId, responseId}`; the rationale is an annotation that **never
    reaches the sim**.
  - `advance(state)` — one war-phase turn via the desktop `advanceTurn`.
  - `stateHash(state)` — canonical hash, same recipe as the scenario runner's
    `final_state_hash`: `sha256(serializeState(state)).slice(0,16)`.
  - `replayDecisionLog(faction, log, turns)` — replays a recorded log against a
    fresh campaign; returns the final hash for the determinism proof.
- `run_president_rbih.ts` — a worked playthrough as **President of the Presidency
  of RBiH**, with in-character rationales, that then runs the determinism replay
  and asserts byte-identical final-state hashes.

## Run

```bash
npx tsx tools/ai_play/run_president_rbih.ts
```

Expected tail: `=== DETERMINISM: PASS — byte-identical ===`.

The in-process tools (`president_playthrough.ts` and the scripts built on it, `territory_sweep.ts`,
`parity_probe.ts`, `op_launch_diff.ts`, `desktop_calibration_compare.ts`) work from any launch
folder. They import `repo_root_cwd.ts` first, which switches the process to the repo root, as the
desktop app does, because parts of the sim still read data files relative to the cwd. Relative path
arguments (`--out`, `--strategy`, ...) resolve against the folder you launched from. Keep that import
first in any new in-process entry point.

## Wiring an LLM

Replace the static `PRESIDENT_DECISIONS` map in `run_president_rbih.ts` with an
async call: feed `serializeDecisionContext(...)` to the model, require it to
return `{responseId, rationale}` where `responseId` is one of
`decision.options[].id`, then `injectDecision`. Nothing else changes — the
determinism guarantee holds because only the `{eventId, responseId}` primitive is
fed to the sim.

## Determinism

`runTurn` has no RNG/clock, so a fixed decision log replays byte-identically. The
harness never sets `headless_scenario_auto_control = true` (that would bypass the
player path and let the bot auto-resolve decisions).

## Known limitation (pre-existing event-data, not a harness bug)

Choosing the **counterfactual** `pragmatic` branch of `rbih_state_identity` (and
some other non-default branches) produces a non-finite
`recruitment_modifiers[].pool_multiplier`, which then fails `serializeGameState`
shape validation. The authored historical-default playthrough does not hit this.
This is an event-effects data defect in a counterfactual branch and is out of
scope for this prototype (no engine changes); flagged for follow-up.


## Calibration execution profiles (owner-approved 2026-10-27)

| Profile | Execution and interpretation |
|---|---|
| `definitive-harness-regression-v1` | Original definitive scenario through `scenario_runner.runScenario`, retaining generated baseline_ops and original targets/receipts. Historical regression evidence; its score alone does not qualify native gameplay. |
| `live-equivalent-desktop-v1` | Actual `desktop_sim.advanceTurn`, with production startup/canonical load and explicit autonomy, event, authorization and order policy. No harness-only exhaustion/displacement overlays. Basis for gameplay calibration after consistency gates pass. |

`desktop_calibration_compare.ts` emits both profile identities, the scenario hash, startup hash and hashes of declared entrypoints. It explicitly requires a complete source/candidate manifest separately; listed entrypoint hashes alone are insufficient provenance. Its default player/headless decision policies differ, so the artifact remains divergence evidence. Native equivalence requires matched source, input identities, horizon, decisions and mode, plus actual applicable production/native checks.

Retain historical benchmark configuration and references. Never transfer baseline_ops into desktop (FORAWWV H1.9), silently disable it in the historical profile, rebless a target from a new result, or call unmatched-input scores equivalent. Keep canon/determinism, protected cells, health, preservation, independent review, full-suite and native gates. Work incrementally: January1993 first; later checkpoints only after that phase is established. Calibration remains paused until the consistency candidate clears its gates.

Zero-turn provenance inspection (no trajectory):

```bash
node --import tsx tools/ai_play/desktop_calibration_compare.ts --turns 0 --faction RS
```

Nonzero horizons require the approved phase/source-bound run brief after consistency review. Evidence_only output is never automatic baseline adoption or qualification.
