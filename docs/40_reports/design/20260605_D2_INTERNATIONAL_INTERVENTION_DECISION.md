# D2 — International Intervention (NATO / Deliberate Force) Player Agency — DECISION

**Date:** 2026-06-05
**Status:** RULED — **Option A (event-only for 1.0)**
**Owner ruling:** Owner thumbed-up the Pyrrhic panel recommendation (A).
**Source packet:** `docs/40_reports/20260605_FORAWWV_OPEN_DECISIONS_PACKET.md` (D2)
**Roadmap refs:** MASTER_ROADMAP Q2; resolution-plan Task 2.
**Class:** design-decision report (game-designer + historian + product-manager lane). No code, no calibration impact.

---

## The question

Is NATO air intervention — culminating in Operation Deliberate Force (Aug–Sep 1995) —
a single scripted event, a temporary combat modifier the player can nudge, or a multi-turn
campaign the player can influence (timing / intensity / targeting)?

## The adopted ruling — Option A

**International intervention remains EVENT-ONLY for 1.0.** NATO/Deliberate Force stays a
conditioned event (with its conditions and consequences). There is **no player targeting,
escalation, or intensity lever**: the player does not command, time, or aim NATO action.
The player **earns or forfeits** intervention indirectly, through conduct and the conditions
the events already read — never by issuing it as an order.

Any expansion (temporary combat modifier — panel Option B; influenceable multi-turn campaign —
panel Option C) is **deferred to the v1.6 "Deliberate Force" milestone**, and is gated behind
`docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` review because intervention triggers are
atrocity-linked (causation adjacent to sensitive events).

## Rationale

- **Soul (negative-sum / constrained agency).** Intervention in this war happened *to* the
  belligerents; it was imposed from outside, not commanded from inside. Giving the president a
  NATO-targeting lever would convert an externally-imposed historical fact into a player
  power-fantasy lever — directly contradicting the game's negative-sum, constrained-agency thesis.
  Option A keeps the player at the political-strategic altitude: you shape the *conditions* that
  invite or forfeit intervention; you never aim the bombs.
- **Historical fidelity.** Event-only is the most faithful representation. Player control over
  NATO timing/intensity/targeting would be ahistorical (the belligerents did not command NATO).
- **Scope.** Option A is the status-quo posture; it requires no build for 1.0 and removes a
  scope-creep magnet from the critical path.
- **Sensitive-history.** Options B/C trigger the sensitive-history gate (atrocity-linked
  causation); Option A does not. Deferring B/C to v1.6 keeps that review where it belongs.
- **Calibration.** Option A = **zero** calibration impact. B/C would add RS combat/supply
  modifiers that move late-war territory and would require a 188w A/B re-anchor; avoiding that
  before 1.0 protects the baseline.

## What this forecloses (for 1.0)

- No player lever to **request, escalate, time, or target** NATO air action.
- No Deliberate Force "intensity" or "targeting minigame."
- No diplomatic-posture knob that *nudges* NATO escalation as a combat modifier.

These are not rejected forever — they are **moved to v1.6**, not deleted.

## Deferral note (v1.6 / post-1.0)

Expansion of intervention into a player-influenceable surface is assigned to the **v1.6
"Deliberate Force" milestone**. Any such work:

1. MUST pass `SENSITIVE_HISTORY_DESIGN_GATE.md` review (atrocity-linked trigger causation), and
2. MUST run a 188w A/B baseline and re-anchor per the calibration discipline if it adds RS
   combat/supply modifiers, and
3. MUST preserve the rule that the player **earns/forfeits** intervention through conduct and
   never **commands** it.

## Canon scope sentence added

- `docs/10_canon/Game_Bible_v0_9_0.md` §15 (Negotiation, intervention, and war termination) —
  one binding sentence: intervention is event-only for 1.0; the player earns or forfeits it
  through conduct and never commands its timing, intensity, or targeting; expansion is deferred
  to v1.6 behind the sensitive-history gate.

`docs/10_canon/FORAWWV.md` is **NOT** touched (no new systemic invariant under Option A).

---

*Cites the Pyrrhic decision-prep panel, packet `20260605_FORAWWV_OPEN_DECISIONS_PACKET.md` §D2.*
