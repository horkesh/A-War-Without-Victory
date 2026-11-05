# Pyrrhic panel: the opening paramilitary split (2026-11-05)

**Packet:** `../PARAMILITARY-DIVERGENCE.md` (frozen copy sha256 prefix `6b7b444dd25f3bad`).
**Seats (blind, independent):** historian, game designer, systems programmer, scenario-runner-tester. Their reports are in this folder.
**Integrator:** the orchestrator (Claude), named in advance.

## What the panel agrees on (4/4)

1. **The divergence mechanism is real.**
   - In the no-player game, bot RBiH paramilitaries take four Serb-majority interior villages in weeks 1–2: Bukvik Gornji, Obadi, Biljesevo and Olovci.
   - A live RBiH player cannot, because its policy decision is pending in t1–t2 and the historical default then denies.
   - The code claims are proven (systems seat).
2. **The packet overclaimed (tester seat).**
   - The split explains about 5 of the 6 RBiH-player cells. Biljesevo and Olovci return by combat at t23, and Bukvik and Obadi stay lost. The Goražde and Prača knock-on is a strong hypothesis, not proven past t26.
   - It does **not** explain Lupnica: RS takes it in every player branch and in no no-player branch.
   - It does **not** explain the RS-player Goražde miss. In that branch, RS's own paramilitaries run two weeks late behind the same pending gate.
3. **The player's pending suppression stays** (designer and systems seats). Under "authorship of the tragedy", no atrocity-class act happens in the player's name before the player chooses.
4. **A "bot-parity" paramilitary mode is a diagnostic only, never a calibration result** (tester, systems and designer seats). It must be:
   - labelled `decision_policy=bot_parity_paramilitary_diagnostic`;
   - written to a separate runs directory and refused as a qualifier;
   - byte-inert when off.
5. **Ownership transfer is never the lever.** Any fix acts through ordinary formations and combat.

## Where seats differed, and the integrated ruling

- **Is the outcome or the mechanism wrong?** The historian finds the January 1993 outcome **mostly right**. Villages like these were disarmed or taken in 1992 by the municipal TO and police, with the Patriotic League and Green Berets absorbed into the TO. That is the state's chain of command, not the parallel Caco/Celo track that `always_deny` refuses. What is wrong is the *label* ("paramilitary") and the *timing* (weeks 1–2 instead of over 1992).
- **Should the bot obey its own policy?** The designer calls it a defect to fix now. The historian says fix it only after a lawful route exists, otherwise historically correct outcomes are deleted from the baseline. The systems seat notes that obeying from t4 would not remove the four cells anyway.
  - **Ruling:** the defect is recorded and the fix is deferred. It lands only together with, or after, the lawful route, as one measured 188w change with panel sign-off.
- **Bukvik Gornji:** no source names it. It is the only cell that may be a front-line Serb salient.
  - **Ruling:** owner repaint check against the BB2 Brčko maps and Court of BiH material. It is not a combat lever.

## Decision

1. **Design lane B (queued; needs a plan):** a lawful RBiH TO / organised local-consolidation route.
   - It runs through ordinary formations and combat, can fail or be delayed, and is staggered over 1992. It is never a control write.
   - It carries the full displacement and civilian-harm accounting and can never improve the grade. "Lawful" means chain of command, not conduct.
   - The existing consolidation sweep (default OFF) may be its vehicle only with a faction/period constraint as **data**.
   - First measure whether the existing `reduce_isolated_position` commander path (`commander/plan.ts` ~1523-1643) already reaches these cells.
   - This is a sensitive-history mechanic, so it needs a unanimous §6 Pyrrhic panel on the concrete design, with owner visibility, before any adoption.
2. **The bot obeys its own policy:** deferred and coupled to lane B, as above.
3. **Safe now, live-only, inert headless:** give a staff-controlled player faction its political directive. Today `political_directive_producer.ts:290-292` returns null for the player at every autonomy level. One change, one measured live run.
4. **Measurement aid now:** the bot-parity diagnostic mode, labelled as above, to measure operations work without this confound. Next diagnostic: 39 weeks, all three factions, with `axis_reject` reason codes.
   - PROVEN if the player branches differ from the no-player branch only at Lupnica.
   - FALSIFIED if Glamoč, Sopotnica or Prača persist.
5. **New investigation (queued):** Lupnica. RS takes it in every player game and never in the no-player game.

No calibration was adopted. The bar (≥700/712 plus eight named captures) and the target (707) are unchanged.
