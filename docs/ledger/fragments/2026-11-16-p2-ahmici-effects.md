## 2026-11-16 — P2: the Ahmići massacre card carries only costs; Mostar's April 1993 orders carry the HVO's readiness (historical guard intact; scores unchanged)

- **Why.** P2 was open since Council fix 4 (2026-11-14): `csq_hvo_central_bosnia_offensive_1993` recorded the Ahmići massacre and, on the same turn, gave the HVO morale +15, cohesion +10, aggression +0.25 for 14 weeks, military credibility +10 and patron confidence +10, listed as plus figures. Its dimension shifts netted HRHB **+1.75** on its own Pyrrhic score (VICTORY_AND_PYRRHIC_SCORING §3.1). That breaches "atrocity is never rewarded" (SENSITIVE_HISTORY_DESIGN_GATE Ring 3 #4; Scoring §6 non-goals 1 and 3). The orchestrator ruled it a pre-freeze must-fix.
- **Panel.** Broader bright-line panel, eight independent seats (historian, scenario-tester, engine/systems, red-team, game designer, narrative designer, canon compliance, operations), no war-or-game. Two rounds, **unanimous GO** on option (c) as measured (B2-minus).
- **Change** (`data/scenarios/events/consequences.json`).
  - **Massacre card** keeps: alliance −1, ceiling 0.0 for 60 turns, flags `hvo_arbih_war_active` and `ahmici_1993`, HRHB international standing −15. Its narrative (EN/BCS) loses the orders sentences, and its effect text names the massacre.
  - **Dropped:** aggression +0.25 (no reader; realism audit F6), HRHB military credibility +10 and patron confidence +10, RBiH military credibility −5, and RBiH international standing +10 (Ring 3 #4: an atrocity never improves a graded dimension for any side).
  - **New non-atrocity consequence `csq_hvo_april_1993_offensive_orders`** ("Mostar's Orders for Central Bosnia" / "Naređenja Mostara za srednju Bosnu"; narrative-seat EN/BCS text). It fires at t53, the April ultimatum with its 15 April deadline (Prlić IT-04-74-T; Blaškić IT-95-14-T; Kordić IT-95-14/2-T).
    - Gate: requires `croat_bosniak_war_begins_1993`, `hrhb_political_goal = croat_republic`, alliance below 0.2, and H6 (`hrhb_central_bosnia_defense`) not `evacuate` or `federate_early`. No mutex.
    - Effects: the central-Bosnia objective shift (15 turns, expiring at t68 as before), HRHB morale +15, cohesion +10, and `hvo_arbih_war_active`. It models readiness before the offensive, not success: the 3rd Corps took Travnik in June and Bugojno in July 1993.
- **Measured** (historical 188w, `tools/verify_checkpoints.cjs`; main 709/709/708/681; logs `C:/Pyrrhic/AWWV-worktrees/_logs/b5-scorer-20261116/p2*`).

  | Variant | Scores | Guard |
  |---|---|---|
  | A: no readiness lift anywhere | 709/708/707/672 | BREACHED: Farz 0/4; unwarranted Petrovo t168, Makljenovac t183 |
  | A′: A + RBiH +10 | same as A | breached |
  | B: cohesion +10 on the orders card | 709/709/707/675 | breached |
  | B2: morale + cohesion on the orders card, RBiH +10 kept | 709/709/708/681 | intact |
  | **B2-minus (shipped)** | **709/709/708/681** | **intact**: cascade 31, Farz receipts on base's turns; hash `c88796667041051a`. Emergent 709/709/708/680, intact (`990b39cc1df19c0d`) |

  The operations seat explains why the lift is load-bearing: without it the 1993 HVO is weaker, 2nd Corps allocation shifts in 1995, and unwarranted captures appear. It is the existing magnitude moved one turn earlier, not a new lever.
- **Tests** (`tests/consequence_chains.test.ts`).
  - The Issue #9 block is rewritten, recording why the 2026-04-23 rationale no longer holds.
  - An allowlist guard: the massacre card's effects may only be alliance_change, alliance_lock or narrative, and its dimension shifts must all be negative.
  - The orders card fires at t53 with the shift, morale and cohesion, is not fired under H6 evacuate or federate, and is independent of the massacre (no shared turn, mutex or cross-reference).
  - `tests/codex_sensitive_claim_inventory.test.ts`: consequence claims 552 → 558.
- **Canon.** `SENSITIVE_HISTORY_DESIGN_GATE.md` gains an amended-date line and the P2 record row; the Council fix 4 and B5 Ahmići gate rows gain closure notes. No Systems Manual change (no new effect kind). P2 is closed; the owner is informed.
- **Registered (findings, not fixed here).**
  - The massacre trigger lacks the H6 evacuate/federate_early exclusions (a separate §6 change).
  - The orders window is t53 only, so a war that starts later gets the massacre's costs and never the orders.
  - Check whether `effect.text` shows untranslated in BCS mode (an existing pattern).
  - The 1995 Farz chain is a knife-edge on 1993 HVO morale.
- **P2b** (other atrocity cards that buff the perpetrator, all factions): the complete inventory is being built for the same panel.
