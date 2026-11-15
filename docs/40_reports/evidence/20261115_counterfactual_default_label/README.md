# Default-option label for design-counterfactual events, and corrected hidden citations

## Display fix

`csq_patron_recovery_offer` is a design counterfactual (`source_tier: design_counterfactual`) whose default option still carries the authored `historical_default` marker, which bots read, so the marker is unchanged. The card told the player that option was "the historically attested choice" directly under a source line reading "Not a documented offer". For a design-counterfactual event the card now says:

| | chip | sentence |
| --- | --- | --- |
| EN | Default option | This is the default option. You are free to choose any option. It is not documented history. |
| BCS | Zadana opcija | Ovo je zadana opcija. Slobodno možete izabrati bilo koju. Nije historijski potvrđena. |

The Records panel badge for such an event reads "Default" / "Other choice" (BCS "Zadano" / "Drugi izbor") instead of "Historical" / "Diverged". Every documented event keeps "Historical default" and its sentence. The wording was reviewed by the narrative-designer seat, which asked for "Default option" over the first draft "Default staff choice" because "staff" blurs with the existing "Staff recommendation" chip.

- `before_1280x720_modal.webp`: "Accept the terms [Historical default]", "This is the historically attested choice ... Source: Not a documented offer ..."
- `after_1280x720_modal.webp`: "Accept the terms [Default option]", "This is the default option. You are free to choose any option. It is not documented history. Source: Not a documented offer ..."

BCS is pinned by `tests/ui/event_counterfactual_default_label.test.ts` (it renders the decision card in both locales for every counterfactual event that has an authored default).

## Hidden developer citations

The hidden `source_note` and `historical_source` of the four events no longer carry the citations the historian seat found wrong: `rbih_late_war_offensive_1995` (BB Vol. I ch. 91-93 not Vol. II ch. 15-16; Karadžić para. 424 and 29 August 1995 not "§§4985-5067" and the 30 August "Patriarch Paper"; "advancing from the Bihać area", not "breaking out of the pocket"), `hrhb_1992_graz_cooperation_collapse` (Prlić Vol. 1 para. 439, not "§§490-525"; the unsupported Prozor/Novi Travnik/Vitez attribution marked), `gornji_vakuf_clashes_1993` (Prlić Vol. 2 paras 336-355, BB pp. 448 and 452 dropped, Appeals Judgment not checked), `csq_patron_recovery_offer` (design counterfactual, not a documented offer). Paragraph ranges the historian did not re-verify are marked as such rather than kept as if confirmed.

## Headless artifacts (precedent #630)

Two 188-week headless runs, clean tree at the #662 tip versus this branch. Final state hash `e44c77f5b41052f8` in both. 14 of 15 artifacts are byte-identical (`activity_summary`, `brigade_temporal_log`, `control_delta`, `destroyed_brigades`, `displacement_event_log`, `end_report`, `final_save`, `formation_delta`, `initial_save`, `operation_aars`, `replay_save_manifest`, `run_summary`, `watched_operations`, `weekly_report`). `run_meta.json` differs only in the output directory suffix (`_n0` / `_n1`) and the input digests of the four edited event files (`war_1992`, `war_1993`, `war_1995`, `consequences`) and the combined input digest. Raw numbers only; no calibration reading is made here.
