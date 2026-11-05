# Bot-parity paramilitary attribution diagnostic — 2026-11-05

**decision_policy=bot_parity_paramilitary_diagnostic: ATTRIBUTION EVIDENCE ONLY, NOT A SCORE.** Run with `--diagnostic-bot-parity-paramilitary on`, a tool-only change (`d44969a88`). It gives the player faction the bot's paramilitary behaviour: there is no pending-decision window and a standing allow is in place from t1. The runs used 39 turns at production autonomy, otherwise historical-default policies, with `AWWV_DEBUG_REASON_CODES=axis_reject`. Runs: `runs/claude-live-jan1993-attribution-v2/` (local, not committed).

## Verdict rule (scenario-tester seat, fixed in advance)

- **PROVEN:** the player branch differs from the no-player branch only at Lupnica.
- **FALSIFIED:** Glamoč, Sopotnica or Prača persist.

## Results (cells differing player vs no-player)

| Player | Player score | Differing cells | Verdict |
|---|---|---|---|
| RBiH | 702 | **none** (Lupnica included) | **PROVEN, and stronger than the rule:** the opening paramilitary split is the entire RBiH live gap |
| RS | 700 | Glamoč, Sopotnica, Lupnica, Volari (Šipovo) | **FALSIFIED** for RS: another player-only cause remains |
| HRHB | 703 | Lupnica | Lupnica only (separate cause, under investigation) |

**RBiH chronology under parity** (identical to the no-player branch):
- Bukvik Gornji and Obadi at t1, Biljesevo and Olovci at t2 (all paramilitary);
- Prača at t25 (RS, combat), Sopotnica at t26 and Glamoč at t27 (RBiH, combat).

## Correction to an earlier reading

The first diagnostic run (`runs/claude-live-jan1993-attribution/`) applied parity *before* the turn's event decisions. Resolving the opening state-identity decision re-enables the paramilitary policy event, so the t1 window stayed shut, and parity was one turn late. That run showed RS at 703 with only Lupnica differing; the result was an artefact of the late parity, and **it is withdrawn**. The corrected run is the one in the table.

## What follows

- **RBiH:** the January 1993 live gap is a design decision, not an operations bug. The panel's lane B, a lawful TO/local-consolidation route through ordinary combat, is the route to close it.
- **RS:** look for a player-only mechanism other than paramilitaries. The candidates are the opening decision at t0, player-only negotiation/patron setup, and staff-control paths.
- **Lupnica:** investigation pending.
