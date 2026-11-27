## 2026-11-27 — PARITY-ORDER: the full-save parity checker compares non-player decision rows in order

Authority: orchestrator ruling §65 (Codex r4720444796 on #905). Tool-only, hash-neutral.

- **The hole.** `tools/ai_play/full_save_parity.cjs` compared the event decision log by sorted answers, and it checked non-player rows only by Set membership. So two bot rows swapped in the player save, the firing order #905 fixed, still read EQUAL, and so did a duplicated row.
- **The change.** The live player's in-person rows (`decision_source === 'player'`) are removed from the headless log one for one by (event, faction, response). The remaining headless rows must equal the player save's non-player rows exactly and in order. The answer multisets must still match.
- **Tests** (`tests/full_save_parity_tool.test.ts`):
  - Codex's repro: two rows reversed gives DIFFERS;
  - a duplicated non-player row gives DIFFERS;
  - an in-person row at another turn or position passes, while the bot rows around it out of order give DIFFERS;
  - an in-person row with no headless answer gives DIFFERS.
- **Re-check.** With the fixed checker, every saved t188 compare on main da0f06a2c and on the #906 and #901 trees is EQUAL. That covers RS, HRHB and RBiH a2 historical, RBiH a2 emergent, and the PARITY-EMER runs so far.
- **OBSERVER-LABEL** (found by the PARITY-EMER sweep: RBiH autonomy 3, emergent).
  - The player save logs the live seat's automatic answers as `bot_ai_default`, where headless logs `bot_political` for the same answer, turn and position. Twenty rows differ this way; nothing else in the save differs.
  - Every src reader of `decision_source` tests only `=== 'player'`.
  - So on the live faction's rows the three bot labels are compared as one class. Other factions, the `player` label, and a save with no player faction are compared exactly.
  - Systems seat: ALLOWLIST OK.
