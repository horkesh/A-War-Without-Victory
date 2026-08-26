# `tools/playtest/` — open items

## 1. No crash resilience (found 2026-08-26, self-inflicted repro)

A 188-turn `counterfactual` run died at turn 81. Cause was mine — I `rm -rf`'d
`tmp-playtest/` while the process was still writing into it — but the failure mode
it exposed is real and would recur on any mid-run crash:

- `FindingsRecorder` opens its run log once at construction and appends for the
  whole run. If that path becomes unwritable, `record()` throws from inside a probe
  loop and takes the whole run down.
- `mergeIntoLedger()` only runs at the very end of `main()`. A run that dies at
  turn 181 of 188 contributes **nothing** to the permanent ledger — 181 turns of
  findings discarded because the process didn't reach its last line.

Fix: wrap the run body in `try/finally`, merge into the ledger in the `finally`,
and make `record()` non-fatal (swallow + count write failures rather than throw).
A findings harness that loses its findings on failure is the one outcome it exists
to prevent.

**Do not apply while a comparison batch is running** — the three policies must
execute identical harness code to be comparable.

## 2. Electron driver not built yet

Headless cannot see the UI. Most friction is UI friction. `run_electron.ts` is the
other half of this lane; the salvage base is
`tools/ai_play/electron_playthrough_rs_ahistorical.mjs` (real Electron via
Playwright, drives `window.awwv.*`) plus the UI-reading parts of
`tools/ui/paradox_local_qa.cjs`.

## 3. Only RBiH exercised

RS and HRHB have not been run at all. HRHB especially — see the standing
`hvo_passivity_analysis` note — may behave differently enough that probes tuned on
RBiH miss things.

## 4. Dayton is never resolved — off-by-one in the driver (found 2026-08-26)

Measured, not inferred: for the desktop campaign `war_start_turn = 0` and
`DAYTON_TRIGGER_WEEK = 188`, so `shouldInitiateDayton` becomes true exactly when
`meta.turn` reaches 188 — i.e. during the LAST advance of a 188-turn run.

The driver checks `pending_dayton` at the TOP of each turn, before advancing. So the
packet is created by the final advance and the loop then exits without ever seeing
it. Every run has been ending with an unresolved Dayton menu, `game_over: false`,
and the whole endgame/verdict/cost-ledger path untested.

This is why adding `resolveDayton` to the loop changed nothing and the final state
hash stayed byte-identical.

Fix: after the loop ends, if `military.negotiation.pending_dayton` is set, resolve
it and re-run the end-of-run probes. Do NOT simply run 189 turns — that hides the
bug rather than fixing it.

## 5. Command-Authority probe still false-positives (found 2026-08-26)

The `leverAttempts` gate added earlier is not sufficient. `resolveProposal` and
`localSupport` cost NO Command Authority, so a policy that only accepts operation
authorizations reports `lever_attempts: 2` and still trips "CA never spent" — which
is what `historical` did, twice, at HIGH and MEDIUM.

Fix: count only CA-COSTING attempts (`request_op`, `stop_op`, `replace_co`,
`force_launch`, `elite_deploy`) toward the gate. Free levers must not count.

Until this lands, treat both `engine:command_authority` findings in the current
ledger as UNCONFIRMED.
