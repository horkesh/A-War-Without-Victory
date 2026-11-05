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

## Engine change: player staff runs rear-pocket consolidation like bot staff (owner directive)

The owner directed on 2026-11-05 ("this is calibration work now... efficient and quick") that live play must reproduce the calibrated headless result, waiving the panel gate. At autonomy >= 1 the player's staff now consolidates rear pockets exactly as bot staff do. The policy answer governs only a manual player (autonomy 0). Live January 1993, production autonomy, historical-default policies (no diagnostic flag):

| Player | Before | After | No-player | Cells differing player vs no-player |
|---|---|---|---|---|
| RBiH | 698 | **702** | 702 | **none** |
| RS | 701 | 700 | 702 | Glamoč, Sopotnica, Lupnica, Volari |
| HRHB | 703 | 703 | 702 | Lupnica |

- Headless 188w is byte-identical to the manifest.
- Full suite exit 0.
- Lupnica (Lupnica investigator): a knife-edge cell. Headless captures it at t40, one turn after the checkpoint, and player games tip it 1–3 turns earlier. It needs no lever.
- Next: the player staff's army-reserve requests are never auto-assigned (`army_reserve_system.ts:1297-1301`, at every autonomy). The RS-player Goražde gap has a further unidentified cause.

## Engine change: player staff auto-assigns army reserve requests (owner directive)

Live January 1993, same policies:

| Player | Before | After | No-player | Cells differing |
|---|---|---|---|---|
| RBiH | 702 | 702 | 702 | none |
| RS | 700 | 700 | 702 | Glamoč, Sopotnica, Lupnica, Volari |
| HRHB | 703 | 702 | 702 | Lupnica, Donji Koričani (both timing-sensitive at t39) |

Headless 188w is byte-identical; the full suite exits 0. Next, the RS-player divergence investigation.

## MILESTONE: live play = headless for every faction (commit 93d3fd122)

After the three war-phase gates (shared order pass, no live-only re-injection, no staff truce break), live January 1993 at production autonomy with historical-default policies scores:

| Player | Live | No-player | Cells differing |
|---|---|---|---|
| RBiH | 702 | 702 | none |
| RS | 702 | 702 | none |
| HRHB | 702 | 702 | none |

- Headless 188w is byte-identical to the manifest; the full suite exits 0.
- Codex CX-20261105-011: the 709 desktop results were all-AI observers (player_faction null) on pre-W3 source. Headless/no-player January fell 709 → 702 with W3 no-teleport (handover measurement C vs B). Recovering those cells lawfully is the next calibration lane.
