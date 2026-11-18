## 2026-11-16 — Three-President Authority re-measure after G1, plus a harness fix (tooling only)

- **Harness fix** (`tools/ai_play/desktop_calibration_compare.ts`).
  - The `bot_equivalent` event policy chose from the event's full catalog of options, not from the options the queued decision offers.
  - A player-initiated gesture is queued with its options filtered by fire number and reach (`responseOptionsForFire`).
  - After G1 (#756) the engaged and meddler Presidents' first front visit falls at week 86. The harness then chose `visit_press_rbih`, which that decision does not carry, and `resolveEventDecision` threw.
  - The policy now narrows to the offered options. This does not change any choice that was already offered (selection is a deterministic pick over the options), so hands-off is unaffected.
- **Re-measure** (appendix C: RBiH, 104 weeks, main `b524f3bfe` with #756; `--autonomy-level production --event-policy bot_equivalent --paramilitary-policy deny --historical-operation-policy accept`):
  - **A, hands-off:** at cap 100% (78/78 turns after week 26), minimum 100.
  - **B, engaged:**
    - at cap 13% (10/78), minimum 6.5 at week 86 (after its first gestures at weeks 86, 90 and 94);
    - 30 refusals for lack of Authority (21 in 1993, 9 in 1994);
    - 11 requests, 6 stops, 3 clashes.
  - **C, meddler:**
    - at cap 0%, minimum 3.25 at week 64;
    - 43 refusals (32 in 1993, 11 in 1994);
    - 18 requests, 1 stop.
- **Held tuning order:** NOT triggered. The trigger to tighten further (remove the 15-point reserve, then the income) was "the engaged President never falls below 25". B now falls to 6.5, and B's at-cap share of 13% is inside the ≤25% target. The earlier run, with gestures open from week 0 and priced at 10, had B at a minimum of 65.5.
- **Logs:** `C:/Pyrrhic/AWWV-worktrees/_logs/three-president-20261116/`.
