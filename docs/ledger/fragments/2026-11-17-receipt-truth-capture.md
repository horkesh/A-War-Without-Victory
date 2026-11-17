## 2026-11-17 — The staff-action receipt says "counts against your side" only when the action took its target

**Why.** Codex found on #740 (`GameStateAdapter.ts`, reproduced) that a paramilitary action dissolving WITHOUT taking its target (target already friendly, combat blocked, organized defence, the week-20 fade cutoff) still got a "Carried out" receipt saying it counts against the player's side, because `dissolveParamilitary` keeps the target and the creation turn. A receipt that reports civilian harm that never happened is a §6 truth defect.

**Engine check (no change needed).** `src/sim/combat/paramilitary_sweep.ts`: the war-crime count (`recordWarCrime`) and the civilian-casualty and displacement bookings happen only after the control flip, i.e. only for an action that took its target. Every non-capturing dissolve books nothing (the defended retreat records only the action's own casualties). So the §2a flag and the war-crime tally were already correct; only the receipt was wrong. Proved by running the engine for each dissolve cause (new test).

**Change** (UI only, no simulation state, hash unchanged):
- `deriveParamilitaryUnrequested` (adapter): an action is `captured` only when a matching `paramilitary` control event to the player's side exists on that target within the march window (created turn to created turn + 2, each event consumed once); an action still `active` gets no receipt yet.
- Ledger: a captured action keeps "Carried out ... It counts against your side."; any other gets its own outcome line, "Dissolved", "Paramilitary action dissolved without taking its target ... No harm to civilians was recorded and it does not count against your side." EN and native BCS (narrative seat); still municipality scale, still "an event of the simulated war".
- Canon SHDG §3 (receipt rule) amended to say so.
- Tests: `tests/ui/paramilitary_unrequested_receipt_truth.test.ts` (engine plus adapter plus ledger for a capture and each of four dissolve causes), `tests/ui_adapter_boundary.test.ts` (captured classification, the march window, no receipt while active), ledger fixtures.

**Not done.** Nothing else; the hash is unchanged by construction (read-only view over existing state).
