## 2026-11-26 — Autonomy panel: the staff force estimate shows as a band, not a raw ratio

Authority: the orchestrator's freeze-inventory rulings 2026-11-26 §11 (c). Hash-neutral (UI only; no `src/sim` change).

**Change.**
- `AutonomyPanel.tsx` (reached from Army HQ → Personnel → Autonomy) printed an operation proposal's `force_ratio_estimate` as `toFixed(1)` + ":1". A thin enclave defence can put the planner's estimate in the hundreds (Sana 678), so the card could read "678.0:1".
- It now shows the player-safe band from `getPlayerSafeOperationBalancePresentation` (CLEAR EDGE / FAVORABLE / CONTESTED / UNFAVORABLE, with its summary as the tooltip), the same reader that the Corps Front panel and the Army HQ operations section already use.
- The unused `autonomy.proposal.forceRatio` key goes from both message files, and the local `ratioClass` with it.
- Test: `tests/player_safe_operation_force_balance.test.ts` pins that the panel never formats the estimate as a number and reads it through the band.
