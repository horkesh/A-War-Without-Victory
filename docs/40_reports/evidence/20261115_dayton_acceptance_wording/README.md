# rs_dayton_acceptance_1995 says what happened

The event was titled "Pale Ratifies the Patriarch Paper", with options "Ratify the Patriarch Paper Signature" and "Repudiate the Delegation — Declare Independence", and said the RS National Assembly must vote. The historian seat (second pass, reading Karadžić IT-95-5/18-T paras 424 and 431-437 and Balkan Battlegrounds Vol. I p. 391) found:

- The Patriarch Paper (29 August 1995, Dobanovci) only delegated negotiating authority to a Milošević-led joint delegation. It is not what Pale accepted.
- What the Bosnian Serb leadership accepted in late November 1995 was the Dayton Agreement: members of the delegation and Karadžić signed a statement that the RS leadership had accepted it (para. 436; no date, sources of 28 November 1995).
- The delegation did not initial anything: Milošević, Tuđman and Izetbegović initialled it on 21 November; the RS delegation stayed away from the final plenary and the initialling (paras 435-436).
- Not in the judgment, so removed: an RS National Assembly vote, an independence declaration, "Karadžić's December internal alternative", "eastern enclaves lost" (Srebrenica and Žepa had fallen in July 1995), "entity inside BiH rather than annexed to FRY", "Mladić's reservations". What para. 435 does record is the delegation's dissatisfaction over Sarajevo (61% of the pre-war city to the Federation), the Posavina, Brčko and Goražde corridors, no sea access and the military annex.
- The name "Patriarch Paper" is in neither the judgment nor Balkan Battlegrounds (it is attested in Holbrooke, which could not be retrieved). It stays in the narrative as the game's label and is left out of the visible source note that cites them.

## What changed (wording only)

Title, narrative, trigger evidence, effect text, staff assessment, both option labels and descriptions, the four notification headlines and bodies, the hidden `source_note` and `historical_source`, the visible source note (EN and BCS), and the Codex essay (title, one sentence of paragraph 1, and the sentences the historian corrected in paragraphs 2 and 3). The narrative-designer seat reviewed the copy; "Accept the Dayton Agreement" / "Reject the Dayton Agreement" and the headlines follow its pass, with the historian's corrections applied on top. The hardline option is now a plain-rejection counterfactual, and `historical_marker: counterfactual` stays.

Ids, flags, option effects, dimension shifts, the bot default (`accept`) and the trigger window are pinned by `tests/ui/rs_dayton_acceptance_wording.test.ts`.

| File | Shows |
| --- | --- |
| `before_1280x720_modal.webp` (main) | "Pale Ratifies the Patriarch Paper"; the 30 August date; the National Assembly vote |
| `after_1280x720_modal.webp` | "Pale Accepts the Dayton Agreement"; Milošević, Tuđman and Izetbegović initialling; the RS delegation's absence; the new source dossier citing paras 424 and 431-437 |

## Headless artifacts

This event triggers at turn 190 or later (`ceasefire_1995` required), after the 188-week scenario ends, so its text cannot reach the hashed save. Verified rather than assumed: two 188-week runs (clean tree at the #662 tip vs this branch), final state hash `e44c77f5b41052f8` in both; 14 of 15 artifacts byte-identical; `run_meta.json` differs only in the output-directory suffix, `git_commit`, `git_dirty` and the input digests of the edited event/essay files. Nothing to re-bless.

## Left alone, for other lanes

- The event's `image` is `event_political_session.webp`, a session image that implies an Assembly sitting (Codex asset lane).
- Two hidden Karadžić ranges in other events (`rs_strategic_goals` and others) are handled in the citation-sweep PR.
