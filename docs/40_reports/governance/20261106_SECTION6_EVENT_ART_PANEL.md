# §6 chain — gated event rows and the existing §6 stills (2026-11-06)

**Question:** of the 36 §6-gated event rows without art ([event-art packet](../proposals/20261106_EVENT_ART_AUTHORING_PACKET.md), "§6 rows"), which may carry one of the seven June-approved stills ([sign-off](20260610_SECTION6_ART_SIGNOFF.md)) as record on their own subject, which stay text-only, and what the two flagged Srebrenica rows take.
**Seats:** Historian, Narrative Designer, Game Designer (the §6 chain), read-only, in parallel, on main at `a2b482322`. Integrator: Claude. Unanimity per row.

## Verdicts

| Row | Historian | Narrative | Game Designer | Outcome |
|---|---|---|---|---|
| `omarska_camp_1992` | WIRE camps still (the compound the sign-off says "best represents Omarska"; area-level caption stays true) | WIRE (record row grounded in ICTY findings) | WIRE (no options, no shifts, pure record; the one row whose site the still shows) | **WIRED** in this PR |
| `keraterm_camp_1992` | TEXT-ONLY (different named site; same weeks) | TEXT-ONLY (three camp rows fire together; one still three times is wallpaper) | TEXT-ONLY (one camp's image on another breaks "only the event's own still") | **TEXT-ONLY** |
| `trnopolje_camp_1992` | TEXT-ONLY (a school with loose fencing; the wire perimeter is the wrong place) | TEXT-ONLY | TEXT-ONLY | **TEXT-ONLY** |
| `csq_accelerated_camps_discovery_1992` | WIRE (same subject as the parent; only the timing is counterfactual) | TEXT-ONLY (speculative prose; a documentary still presents the counterfactual as record and repeats the camps still before Omarska) | WIRE (effects only cost RS) | **TEXT-ONLY** (not unanimous) |
| `drina_cleansing_decision_1992` | WIRE Drina still (field reports describe what the still records; both options are accountability postures) | TEXT-ONLY (framed as "how the world sees your cause"; a still above that choice makes the emptied houses the reputational subject, next to Ring 3 #1) | TEXT-ONLY (a decision on operations still running: the still would show the player's own act while deciding it; also missing `historical_default_response_id`, so the bot takes `options[0]` by position, and a legacy option id `systematic` remains) | **TEXT-ONLY**; data defect recorded for the events lane |
| `csq_hvo_central_bosnia_offensive_1993` | WIRE Ahmići still (narrative is the 16 April 1993 attack; caption matches exactly) | CONDITIONAL (the closing sentence puts the massacre in momentum language and the row raises HRHB morale and cohesion; rewrite first) | TEXT-ONLY (the card pays HRHB +10 military credibility and +10 patron confidence under "116 civilians killed": record laid over a reward) | **TEXT-ONLY** until the gain is split out and the sentence rewritten; then reconvene |
| `srebrenica_demilitarization_1993` ⚑ | WIRE `event_un_presence` (weapons handed over under UNPROFOR supervision is what the still shows) | — | — | **WIRED** in this PR (non-§6 still; caption does not name Srebrenica) |
| `un_resolution_819_srebrenica_1993` ⚑ | B2 Security Council plate acceptable (the Council's act in New York) | — | — | takes B2 when Codex lands it; B2 shows no Srebrenica townscape, map, civilians or wounded |
| `hvo_detention_camps_1993` (and the HRHB exposure response row) | NEW §6 plate: Heliodrom/Dretelj (ICTY Prlić et al., IT-04-74) | NEW §6 plate: the exterior of the Heliodrom near Mostar, 1993, for `hvo_detention_camps_1993` only | — | **briefed for the §6 pack; not generated** until owner and §6 sign-off, as in June |
| all other §6 rows | TEXT-ONLY (each has its own site; a shared still is decoration; enclave art stays HELD; paramilitary rows never carry emblems) | TEXT-ONLY (paramilitary rows above all: a still there reads as a lever) | — | **TEXT-ONLY** |

## Defect found by the panel, fixed in this PR

`EventModal.tsx` rendered every still with `alt=""` and `aria-hidden`, and never consulted `section6StillAlt`, so the six §6 stills wired in #410 rendered as decoration in the event modal (the decision modal was fixed in #526). EventModal now gives a gated still its factual alt and leaves it visible to assistive technology; non-gated stills stay decorative. Pinned in `tests/ui/event_illustration_art.test.ts`.

## Conditions carried forward

1. One still per site: a still goes only on rows whose subject is that site; the three Markale rows share one still because they are one site (June sign-off), and that is the only such sharing.
2. Captions (alt) are per still and unchanged; no per-option variants. The integrator checks that a parent row and its `csq_` counterfactual do not both show the same still in one run before any counterfactual row is wired.
3. Any wired row that later gains options, or a net-positive effect for the perpetrator, returns to this chain (Game Designer D8 rules 1–3 hold).
4. Heliodrom plate bright lines: the exterior of a former JNA airbase hangar or barracks seen from outside; no detainees, faces, bodies, insignia or HVO emblems; must not reuse the Prijedor compound look; caption "Heliodrom, near Mostar, 1993"; never reused on another row; full §6 sign-off before generation.
5. `event_un_presence` and B2 must show no Srebrenica townscape, map, civilians or wounded, and their captions never name Srebrenica.

## Recorded for other lanes

- **Rows whose options reward the atrocity-adjacent choice** (Game Designer): `hrhb_camp_exposure_response_1993` (deny: cohesion +5, patron confidence +5; cooperate: cohesion −30, military credibility −10, patron confidence −15); `rs_paramilitary_policy_1992` (always_allow cohesion +5; always_deny −10); `rbih_paramilitary_policy_1992` has no reward.
- **Rows without options that still pay the perpetrator:** `csq_hvo_central_bosnia_offensive_1993` (HRHB +10 military credibility, +10 patron confidence), `vrs_cerska_offensive_1993` (RS morale +5, military credibility +5, territorial legitimacy +3), `kravica_attack_1993` (RBiH morale +3). These join the rebalance proposal's scope.
- `drina_cleansing_decision_1992`: add `historical_default_response_id`; retire the legacy option id `systematic`.
