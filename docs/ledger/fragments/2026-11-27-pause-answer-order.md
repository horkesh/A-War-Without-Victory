## 2026-11-27 — PAUSE-ANSWER-ORDER: an answer given in person at the pause lands at its card's slot, in firing order

Authority: orchestrator ruling §69 (pre-freeze MUST-FIX; §58.2 is not closed by #905), with the §68 bot-label guard riding in the same change. Hash-neutral for headless (no pause runs there).

**Site.** The PARITY-EMER sweep pe2 (main da0f06a2c, final checker 90ed9fcc8) found HRHB a0, a1, a2 and production differing from headless only in the order of two `military.event_aggression_modifiers` rows. At t94 two cards fire (war_1993.json): `strategic_posture_review_rbih` (the RBiH bot answers `accept_ceasefire_terms`: RBiH −0.1 for 12 turns), then `visit_to_front_hrhb` (HRHB's card, `visit_posavina_hrhb`: HRHB +0.05 for 6 turns). The bot_equivalent harness answers HRHB's card in person at the PAUSE BEFORE COMBAT, and `settlePlayerEventDecisionsThisTurn` ran the pause hook on the working state before `settleAnswers()`, so that answer's effects landed ahead of every settle slot. Headless lands the bot's answer to the same card at its slot. At a3 (Observer) there is no pause answer, and the run was EQUAL. With a clamped value the same order change is a value split (the #905 class).

**Change.**
- The pause hook answers on a copy of the working state, so the paused screen still shows each answer and its effect at once and the card leaves its queue there. The answers are the `player` rows the copy appended to the decision log (every in-person path writes exactly one).
- Each answer lands on the working state at its card's player slot, in firing order, through `TurnInput.resolvePausedDecision` (new, optional; default `resolveEventDecision`; the desktop passes `resolveDesktopEventDecisionInPlace`, forwarded by `desktop_sim.advanceTurn`). The decision-log row now sits where the bot's row sits headless. An answer to a card with no slot this pass lands right after the pause, as before, unless a slot answer opened that card (then after the slots).
- `PrimaryEventsPass.hasPlayerSlot(eventId)` is new. No GameState field, no schema change.
- Tests (written first): `tests/sim/pause_answer_order.test.ts` (red on main 4/6, incl. a clamp case: 98 live vs 100 headless, and a resolver that swaps the whole state). §68: `tests/decision_source_bot_label_guard.test.ts` fails if any src reader compares `decision_source` with a bot label (writers, type unions and validateGameState.ts exempt); the OBSERVER-LABEL comment in `tools/ai_play/full_save_parity.cjs` names it.
- Systems seat (independent): FIX OK. The paused-turn controller only reads and answers on the hook's state; nothing reads the pipeline's working state during the pause.

**Measured** (on 6e174b169, i.e. main d2bb727b7 plus this change; full-save checker from #907):
- PARITY-EMER (emergent, bot_equivalent), 15 runs: all EQUAL, 0 paths. That covers RBiH, RS and HRHB at a0, a1, a2, a3 and production, and includes HRHB a0, a1, a2 and production, which showed 6 paths each on main.
- Historical sweep at a2 (defer): RS, HRHB and RBiH EQUAL, 0 paths.
- The entrypoint `desktop_sim.ts` hash in every compare JSON is the fix tree's.
- 188w pair pao1: hist `ec4b1d2161c31a1d` / emer `3e3f947f0c0a2f7f`, the same as main's pins. Headless is unchanged, so nothing is re-pinned.
  - Consistency, strict health and Washington pass in both modes. Idle is 35 hist and 31 emer.
  - Emergent `verify` shows main's own SHAPE rows (t174 Plamičak 2 and Lavina 2, §67); the run is byte-identical to main's.
- Structural fingerprint unchanged at `9f30ec0eafb7667b`.
- Main then moved to #903 (records-only, new pins). This branch merged it, and CI's Baseline pins confirm the merged hashes.
