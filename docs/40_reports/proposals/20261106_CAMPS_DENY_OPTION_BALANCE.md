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

## §6 chain (2026-11-06): CONFIRM the numbers, with copy in the same edit and one correction

**Historian seat.** Supports all three zeroes on `concentration_camps_revealed_1992`: neither Stakić (IT-97-24-T) nor Brđanin (IT-99-36-T) attributes any internal closing of ranks to the denial, and the actual RS response (Karadžić admitting ITN and the Guardian on 5–6 August 1992; Omarska and Keraterm closed; ICRC at Trnopolje and Manjača) carried no recorded VRS credibility or cohesion cost. **Correction:** the row's historical default is mislabelled. The real response was rhetorical denial plus controlled access while detainees were moved and hidden (Korićanske Stijene, 21 August 1992, Stakić); that is the `obstruct` option, not `deny`. Siblings: `hrhb_camp_exposure_response_1993` deny +5 cohesion has no basis (→ 0), deny +5 patron confidence contradicts the record (Prlić, IT-04-74-T: closures under international pressure with Zagreb involved; → 0 or negative), cooperate −30 cohesion has no basis (→ 0); `rs_paramilitary_policy_1992` always_allow +5 cohesion contradicts 1992 Main Staff reports (→ 0), always_deny −10 has no basis (→ 0 or at most −3). On every other number the record is silent, so the design rule decides.

**Narrative Designer seat: REVISE.** The numbers are right, but the decision modal shows each option's deltas, so copy and numbers must agree in the same edit. Deny's text never mentions a rally, so 0 aligns it. Cooperate's description promises a "sharp internal-cohesion cost" and a Main Staff reading of "institutional weakness", repeated in the RBiH and HRHB notification bodies; with both costs at 0 the copy must change: replace the description's last sentence with "Access slows the further loss of international standing; it does not undo what the cameras have already recorded.", and the two notification bodies from "registers a credibility recovery move…" to "registers the access; what the inspectors find enters the international record." No hardliner backlash on cooperate unless the Historian grounds one (none found); drop the −10 military credibility in every case, since what the copy describes is political, not military. Siblings: HRHB deny +5/+5 → 0 (rewards the text never mentions); HRHB cooperate −30 cohesion with no cost named in copy → cut or ground; RS always_allow +5 → 0; always_deny −10 matches its copy ("the hardline base is alienated") and may stay.

**Scope added by the event-art panel (Game Designer):** rows without options that still pay the perpetrator: `csq_hvo_central_bosnia_offensive_1993` (HRHB +10 military credibility, +10 patron confidence under the Ahmići narrative), `vrs_cerska_offensive_1993` (RS morale +5, military credibility +5, territorial legitimacy +3), `kravica_attack_1993` (RBiH morale +3).

## Revised packet for the owner's go

1. `concentration_camps_revealed_1992`: deny cohesion +5 → 0; cooperate military_credibility −10 → 0, cohesion −5 → 0; cooperate description and the two notification bodies reworded as above (EN and BCS); **decide** whether `historical_default_response_id` moves from `deny` to `obstruct` per the Historian (this changes the historical bot's path and is the calibration-moving part).
2. `hrhb_camp_exposure_response_1993`: deny cohesion +5 → 0, patron confidence +5 → 0; cooperate cohesion −30 → 0 (no grounded cost; copy names none).
3. `rs_paramilitary_policy_1992`: always_allow cohesion +5 → 0; always_deny −10 stays (copy matches) or −3 (Historian ceiling); owner's call.
4. The three perpetrator-paying consequence rows: Game Designer to propose splits in a follow-up note before any edit.
5. One bundle branch, one measured 188-week run with the attribution harness and a verdict diff, serial with the calibration session; provenance manifest and ledger updated.

## Applied and measured (owner go 2026-11-06; branch `claude/camps-rebalance`)

Edit: items 1–3 of the revised packet, including the historical default moving to `obstruct` with the deny description restated and the cooperate copy and notification bodies reworded. Item 4 (the three perpetrator-paying consequence rows) and the HRHB deny patron-confidence residual are the sibling run.

One 188-week run against the main baseline (`tools/verify_checkpoints.cjs`; `tools/diagnostics/verdict_diff.ts`, new, grades two final saves with the game's own `computeFactionVerdict`):

| Figure | Baseline (main) | Rebalance |
|---|---|---|
| jan1993 / apr1994 / apr1995 / oct1995 matched | 702 / 704 / 701 / 691 | 702 / 704 / 701 / 692 |
| HRHB western-Bosnia cascade | 43 | 43 |
| RS Pyrrhic score / grade / outcome | 32.9 / D / failure, genocide_condemnation | 34.8 / D / failure, genocide_condemnation |
| RS internal_cohesion | 13 | 3 |
| RS patron_confidence | 33.5 | 46.5 |
| RS negotiating_leverage | 22.2 | 31.0 |
| RS military_credibility | 56.6 | 54.9 |
| HRHB Pyrrhic score / grade | 73.1 / A | 72.3 / A |
| HRHB internal_cohesion | 71.2 | 66.2 |
| RBiH | 72.8 / A | 72.8 / A |

**Scenario-tester seat (GO).** Event path: paramilitary policy t2 always_allow in both; camps t17, deny in the baseline, obstruct on the branch; HRHB exposure t63 deny in both. Only on the branch: `csq_back_channel_communication_RS` (t119) and `csq_patron_equipment_delivery_confirmed` (t165), both gated on RS patron confidence above 50–55, which the baseline's five-point deficit kept out of reach. Battles identical through t89. Attribution: RS cohesion −10 is all direct (paramilitary +5 and camps +5 removed); patron confidence +13 is +5 direct and +8 from the two newly firing events; leverage +8.8 is +5 from the back-channel shift and the rest derived; military credibility −1.7 is path noise after t90; the oct1995 +1 is one cell, `op:gradacac:pelagicevo`, captured by HVO Operacija Baklja at t186 in the baseline and left RS on the branch where only an uncapturable ARBiH probe reached it: path variance, not a gain. All four floors (694/674/668/641) met; enclave guard 9/9; Srebrenica and Žepa on schedule; eastern provenance clean.

**Game Designer seat (intent met for the RS row; KEEP obstruct's costs).** Per-option nets now: cooperate 0.0, obstruct −1.0, deny −1.5; obstruct is the documented response and sits in the middle. The +1.9 RS score under the historical path is not a payment for the default change (old default netted −1.0, new default nets −1.0); it is 188-week drift on one run with grade and condemnation unchanged. Residuals for the sibling run: HRHB deny still beats obstruct by 0.5 because its +10 patron pressure has no confidence cost (add HRHB patron_confidence −5 to deny); the three perpetrator-paying consequence rows.
