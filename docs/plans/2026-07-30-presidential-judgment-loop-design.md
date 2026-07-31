# Presidential Judgment Loop — 5/5 Design

**Date:** 2026-07-30
**Source:** D2 RBiH owner playtest session 1
**Scope:** `src/ui/map/**`, UI tests, GUI/report documentation only

## Outcome

Make the existing Desk → Decision → Advance loop read as presidential judgment without adding decisions or inventing military recommendations.

## Design

### Desk

The Desk names one of three truthful states:

1. **Your signature is required.** A single live blocker opens its owning decision modal directly. Multiple blockers retain the existing review packet.
2. **Staff recommends review.** Advisory work remains optional and routes to the existing pre-advance review.
3. **No presidential act is required.** The primary action becomes **Advance while holding present policy**, making non-action an explicit judgment.

The Warroom priority pulse follows the same rule. One live required signature opens directly instead of routing through the generic docket and Decision Room.

### Decision

No new decision family, effect preview, or simulation write is introduced. Direct routing uses the already-derived `PresidentialBlocker.action` and `id`, so the owner sees the canonical live modal and its existing historical-default affordance.

### Advance

The confirmation language distinguishes:

- clear desk: advance while holding present policy;
- advisory work: advance with present decisions, with staff review still available;
- blocker: resolve the existing required signature.

### Consequence receipt

The existing Desk consequence strip remains the receipt owner. Its heading becomes **What followed** and continues to expose only filed turn facts and confirmed decision-consequence records.

### Aftermath acknowledgement

An aftermath record already retained by the current UI session is treated as reviewed for pre-advance purposes. Its matching hard-turn card remains available in Decision Room/Records but is removed from the compact pre-advance obligation list for that turn. This uses the existing ephemeral `turnAftermath.turn`; it adds no persisted acknowledgement state.

### Truthful figures

- Territory net remains sourced from `territory_net`.
- Notable gains/losses remain sourced from `notable_flips`.
- When the notable subset does not reconcile to the net, the UI explicitly says that the net includes other changes instead of presenting contradictory totals.
- Opening force totals render **Unreported** unless every brigade contributing to that total reports the metric. Brigade counts remain exact because formation membership is reported.

## Acceptance

- One click from the Warroom resolves a single required signature through its canonical modal.
- The Desk explicitly distinguishes required signature, staff review, and deliberate hold-course.
- Advance copy records deliberate restraint on a clear desk.
- A just-presented aftermath record does not remain a separate pre-advance obligation.
- Territory figures never imply that a partial notable-flip list is the complete breakdown.
- Missing opening-force personnel/equipment never becomes exact zero.
- EN and BCS localization remain in parity.
- No simulation, scenario, save schema, release, package, commit, or push changes.
