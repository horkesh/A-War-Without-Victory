# Proposal — the camps decision rewards denial (Game Designer seat, 2026-11-06)

**Origin:** condition 4 of the Game Designer seat in the [D8 panel](../governance/20261106_SECTION6_D8_DECISION_HEADER_PANEL.md). Investigated read-only by the Game Designer seat on main at `edd4b2d67`. **No data changed.** This is a proposal for the owner, routed through the §6 chain and one measured run, because the row is in the gated sensitive-history set and the change moves the verdict.

## Finding

`concentration_camps_revealed_1992` (`data/scenarios/events/war_1992.json`, options at lines 4887–4983) gives every option the same event-level costs (international standing −15, war-crimes record +3, patron pressure +15, line 4879). What separates the options:

| Option | internal_cohesion | military_credibility | patron_confidence | Net Pyrrhic-score change (RS weights) |
|---|---|---|---|---|
| deny (historical default) | **+5** | 0 | −10 | **−1.5** |
| obstruct | 0 | 0 | … | −1.0 |
| cooperate (permit ICRC and press) | −5 | **−10** | … | **−3.4** |

- The +5 cohesion for denial feeds the RS grade-A test `cohesion >= 30` (`src/sim/scoring.ts:561`), and measured RS cohesion sits at that line (~29.7 at turn 40, `sector_offensive.ts:446–449`). Deny (+5) against cooperate (−5) is a ten-point swing across the line, in denial's favour.
- Military credibility carries the heaviest score weight (0.25, `strategic_dimensions.ts:59`), so cooperate's −10 makes the humane option score worst.
- `patron_pressure` raises patron support in `apply_effects.ts:404–412`, cancelling deny's −10 patron confidence. Whether that sign is intended is a catalog-wide question, outside this proposal.
- The same shape recurs: `hrhb_camp_exposure_response_1993` (deny +5 cohesion, +5 patron confidence; cooperate −30 cohesion) and `rs_paramilitary_policy_1992` (always_allow +5 cohesion; always_deny −10).

This contradicts the design rule that atrocity-adjacent choices never reward (gate §1), even though "closing ranks under exposure" is a fair historical story. No mechanism models that story; the number simply pays the player.

## Recommendation (Game Designer seat)

- deny: internal_cohesion +5 → 0.
- cooperate: military_credibility −10 → 0; internal_cohesion −5 → 0.
- Resulting net: cooperate +0.1, obstruct −1.0, deny −1.5; deny and cooperate equal on the grade test.
- If the Historian keeps a hardliner backlash on cooperate, deny takes the same cohesion cost.
- Review `hrhb_camp_exposure_response_1993` and `rs_paramilitary_policy_1992` with the same lens.

## What a change touches

- **Verdict-moving, not territory-moving.** The historical bot picks deny, so the baseline loses RS +5 cohesion; that can flip the RS A test and change the Pyrrhic score. One measured 188-week run with a verdict diff, serial with the other calibration lanes (one change per measured run).
- **Provenance:** the events-file hash in the provenance manifest changes.
- **Tests:** none pin these numbers; the loader checks option ids only.
- **Gate:** §6 chain sign-off before the edit, because the row is gated.

## Route

1. Historian + Narrative Designer + Game Designer notes on the rebalance (§6 chain).
2. Owner go.
3. One 188-week run on a bundle branch with the attribution harness; verdict diff recorded.
4. Ledger and provenance update; the two sibling rows follow in their own measured run.
