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
node node_modules/tsx/dist/cli.mjs tools/ai_play/run_president_rbih.ts
```

Expected tail: `=== DETERMINISM: PASS — byte-identical ===`.

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
