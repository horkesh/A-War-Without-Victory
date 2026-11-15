# The Patriarch Paper date, and counterfactual defaults out of the distance-from-history measure

## 1. Patriarch Paper: 29 August 1995

The Pale leadership agreed on 29 August 1995 at Dobanovci, near Belgrade, that a six-member joint delegation led by Milošević would negotiate for the Bosnian Serbs (ICTY, Karadžić, IT-95-5/18-T, para. 424; Balkan Battlegrounds Vol. I p. 391). The event, essay and event text said 30 August (NATO's Deliberate Force began on 30 August, which is likely where it came from; that date stays correct for the air campaign). The name "Patriarch Paper" is kept.

Fixed in: the Dayton acceptance event (`rs_dayton_acceptance_1995`) narrative and hidden source note, its Codex essay and the index entry, the `dayton_talks_begin_1995` note, and the `rs_strategic_goals` option explanations. The event now has a visible source note, EN and BCS.

| File | Shows |
| --- | --- |
| `dayton_before_1280x720_modal.webp` (main) | "...granted by the Pale leadership on 30 August 1995" and a source line "The Patriarch Paper of 30 August 1995 granted Milošević joint-delegation authority..." |
| `dayton_after_1280x720_modal.webp` | "...on 29 August 1995" and "ICTY, Karadžić (IT-95-5/18-T), Trial Judgment, 24 March 2016, para. 424: at Dobanovci, near Belgrade, on 29 August 1995 ..." |

**Holbrooke is not verified.** The historian seat confirmed the date from the ICTY judgment and Balkan Battlegrounds, but could not retrieve Holbrooke's text (lending-restricted). The visible note therefore names Holbrooke, To End a War (1998), as further reading only: no date, chapter or page is attributed to him. A search summary suggests his account may place the handover on 30-31 August; someone with the book should read ch. 8, around pp. 130-132, before any date is credited to it. The player-visible Patriarch Pavle detail is also left out: the judgment's list of those present at Dobanovci does not include him, and his presence is only commonly reported.

## 2. Distance from history

`distanceFromHistory` (the "Your War vs History" block in the Codex) counted every decision whose event carries a `historical_default_response_id`, including design-counterfactual events whose default is a design default. Those events are now left out of the measure, so it only compares against documented defaults. Display only: the read-model reads `event_decision_log` and changes nothing; the `historical_default` marker is untouched.

| File | Codex block (turn-40 RBiH save; log holds Vance-Owen "Reject" and Patron Recovery Offer "Refuse") |
| --- | --- |
| `dist_before_1280x720_codex.webp` (main) | "You authored 2 departures from history. 2 of 2 decisions diverged ... (100%)", with a Patron Recovery Offer row "(history: Accept the terms)" |
| `dist_after_1280x720_codex.webp` | "You authored 1 departure from history. 1 of 1 decision diverged ... (100%)"; only the documented Vance-Owen row |

## Headless artifacts

Two 188-week headless runs (clean tree at the #662 tip versus this branch): final state hash `e44c77f5b41052f8` in both; 14 of 15 artifacts byte-identical; `run_meta.json` differs only in the input digests of the edited event/essay files, `git_commit` and `git_dirty`. Raw numbers only.
