# Decision Room Walkthrough Lane B

**Date:** 2026-05-17
**Surface:** `http://127.0.0.1:3002`
**Evidence mode:** In-app browser DOM smoke with concise observations.

## Summary

- Walked the Decision Room from the dev map for all three factions: `RBiH`, `RS`, and `HRHB`.
- Verified the Decision Room renders from the Army HQ briefing context with command-loop rows, product-loop heartbeat rows, priority dossier, inspect-next rows, source handoffs, and review-before-advance rows.
- No blank panel, no viewport blocker, and no panel crash was observed during the walkthrough.

## Faction Observations

| Faction | Session Source | Decision Room Result |
|---|---|---|
| `RBiH` | Fresh side-picker start, turn 0 | Rendered. Advanced view showed `Brief`, `Inspect`, `Decide`, `Execute`, `Report`, `Cost`, `Judge`, and `Next`; disabled zero-count rows were explicit (`No pending decision`, `No turn records yet`, `No campaign cost yet`, `No campaign memory yet`). Source handoff routed to `Army HQ Summary`. |
| `RS` | Fresh 40w/latest-run save, turn 40 | Rendered. Advanced view showed all eight product-loop steps, five command-loop cards, source handoffs to Inbox, War Summary, Turn Aftermath Records, Army HQ Records, and Chronicle. War Summary deep-link probe returned to the live War Summary surface without blanking the panel. |
| `HRHB` | Fresh side-picker start, turn 0 | Rendered. Advanced view matched the turn-0 RBiH shape with operational SITREP-driven priorities, explicit disabled zero-count rows, `Army HQ Summary` source handoff, and review-before-advance rows. |

## Deep-Link Notes

- `RS` `Operational SITREP -> War Summary` was clicked from the Decision Room and routed back to the map War Summary/SITREP surface without crash or blank panel.
- After that handoff, the Decision Room modal was closed by the route change, so the attempted `Open Turn Record` click was not completed in the same pass. This is recorded as a walkthrough limitation, not a failed route.
- `RBiH` and `HRHB` turn-0 sessions had no turn-record/campaign-cost history, and those product-loop rows were correctly disabled with visible reasons.

## Verification Commands

| Command | Result |
|---|---|
| Browser smoke against `http://127.0.0.1:3002` | PASS for all factions; no blank Decision Room panels observed. |
| `npm.cmd run sim:scenario:run:40w` | PASS; produced `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1869`, hash `583aaa2f33875d8c`. |

## Follow-Up

- A future browser pass should exercise `Open Turn Record` before routing away through War Summary, or reopen Decision Room after the War Summary handoff and then test Turn Aftermath routing.
