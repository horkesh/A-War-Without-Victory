# 1993 HVO-ARBiH event cards made truthful (Option A)

**Date:** 2026-11-14
**Lane:** non-calibration N-lane, owner decision 2026-11-14 (Option A of `docs/40_reports/proposals/20261114_HVO_ARBIH_WAR_DIAGNOSIS.md`).
**Scope:** player-visible copy only, EN and BCS, plus the war-room ticker. No trigger, effect, flag or state change.
**Panel:** gate §6 "change to atrocity event content": historian and narrative-designer seats, independent, implementer excluded. Record in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6.

## 1. What the map shows when the cards fire

Baseline 188w run, `origin/main` 29f1be7, hash `0ec6d6112fd0e954`. Snapshots were taken with `--save-weeks 41,46,49,54,57,60,63,66,70,76,81,83`. t1 is 6 Apr 1992.

| Card (fire turn) | What the card said | What the map shows at that turn | Action |
|---|---|---|---|
| `gornji_vakuf_clashes_1993` (t41, HRHB decision) | "Heavy fighting breaks out … tanks, artillery and infantry"; title "HVO-ARBiH Fighting Erupts at Gornji Vakuf"; notification "HVO reinforces Gornji Vakuf fight" | No HVO-ARBiH battle anywhere until t52. The town cell is RBiH and three cells are HRHB. The first Gornji Vakuf battle is at t63 (ARBiH). | Rewritten as the 15 January ultimatum. Display title "Ultimatum at Gornji Vakuf". Options are now orders. |
| `croat_bosniak_war_begins_1993` (t49) | "The wider central-Bosnia offensive follows in April." | The alliance breaks and the factions are at war. No HVO offensive follows. | The forecast is removed and the antecedents are put in the record register. |
| `central_bosnia_fighting_1993` (t50) | "local HVO-ARBiH fighting … before the wider April offensive" | Interleaved lines with no battles. | Rewritten as new lines through mixed villages. |
| `hrhb_central_bosnia_defense_1993` (t52, HRHB decision) | The war has "boiled over"; Mostar's west bank is an encircled pocket; "Tihofil" Blaškić commands from Kiseljak; a sustaining "airbridge"; breakout notification "Casualties mount on both sides" | The Vitez/Busovača, Kiseljak and Žepče HRHB cells are at critical supply from t41. Mostar west has adequate supply. No option moves any unit. | Pockets corrected; Tihomir Blaškić in Vitez; airbridge claim dropped; options and notifications are orders. |
| `csq_hvo_central_bosnia_offensive_1993` (t54, consequence) | "Viteška, Busovača … brigades move against ARBiH positions … the HVO has the initiative for a season" | The card issues real bot orders (aggression +0.25 and ten priority municipalities for 14 turns). The Lašva brigades are at cohesion ~0, and the only HVO attacks of the war are 2 at Prozor at t73. | Rewritten as the Ahmići massacre plus the orders. The text says the brigades' state decides whether the orders can be carried out. |
| `sovici_doljani_attack_1993` (t54) | "Coordinated HVO operations strike from Jablanica to the Lašva Valley" | The Doljani cell is HVO-held until about t74. A village attack inside held ground fits the map; coordinated operations do not. | Dated record kept; the coordination claim removed. |
| `vitez_kiseljak_pockets_1993` (t55) | "fight with the desperation of encirclement" | The pockets are cut off (critical supply). There is no fighting there. | The effect text no longer claims fighting. |
| `east_mostar_siege_1993` (t57) | Title "HVO Besieges East Mostar"; "complete blockade … 55,000 Bosniaks are trapped" | Mostar is split 5 RBiH / 3 HRHB / 1 RS cells. Every cell has adequate supply from t41 to t83. There is no battle in Mostar for the whole war. | Display title "Mostar Divided". The division is stated as the present; the siege moves to the record register with the ICTY finding. |
| `maglaj_enclave_blockade_1993` (t65) | "complete blockade … nine months … US airdrops" | The RBiH cells have strained supply, not cut. The VRS holds 2 cells; the HVO holds neighbouring Žepče. | Display title "Maglaj Between the VRS and the HVO". Present tense describes the pressure; the blockade moves to the record register. |
| `operation_neretva_93_1993` (t76) | "a separate 17 September attack from East Mostar" | No Mostar battle. The operation attacks east of Prozor. | The East Mostar attack moves to the record register. |

**Left unchanged, judged consistent with the map:**
- Ahmići, Stupni Do and the camps happen inside ground the perpetrator holds.
- Trusina, Grabovica/Uzdol, camp exposure and Stari Most are unchanged.
- Bugojno and Travnik fire on a capture.
- "Croatia Tightens Control" is unchanged.

**War-room ticker** (`src/ui/warroom/content/ticker_events.ts`, EN only):
- **Removed:** four rows that claimed Mostar sieges or battles, or heavy fighting at Vitez and Travnik, none of which the map produces.
- **Gated on the event receipt:** six rows. Two are reworded and gated: Gornji Vakuf and the alliance breakdown. One is reworded to "MOSTAR DIVIDED BETWEEN HVO AND ARBIH" and gated. Three keep their text and are gated: Ahmići, Stupni Do and Stari Most. The Codex essays remain unlocked from the start (gate §5), so only the "now" headline is conditional.
- **Reworded:** "CROAT-BOSNIAK FIGHTING …" (it named peoples) and "… CAPTURES VARES" (dated before the map capture).

## 2. Card text that is simulation state

The brief assumed card text is not state. It partly is:
- **Titles.** The engine writes `title` into `turn_summaries[].events_fired` (`evaluate_events.ts` `getNarrativeText`). That ends up in the hashed `final_save.json` and in `weekly_report.jsonl`, and both are pinned in `data/derived/scenario/baselines/manifest.json`.
- **Notifications.** When a bot resolves a decision, the notification headline and body of its response are copied into `state.military.pending_event_notifications` (for example, the Gornji Vakuf `escalate` text at t42).
- **Player decisions.** A player's pending decision persists title, narrative and options in that player's save, but not in a bot run.

Changing those strings in place would move the 188w hash (`0ec6d611…`) that the RF calibration lanes measure against. So they are left as they were. Their corrected English is authored in `localizations.en`, the existing display-only localization block. `src/ui/map/data/eventDisplayCopy.ts` resolves it at display time in this order: the active locale, then `en`, then the persisted text. Every surface that shows these titles or notifications goes through it: turn aftermath, chronicle, historical events and fired events, pending decisions, notifications, Wrapped divergences and decision receipts. Old saves also show the corrected copy. Every other field (narrative, staff assessment, trigger evidence, option text, narrative-effect text, non-default notifications) is never persisted by a bot run and is edited in place.

## 3. Panel

Seats: historian and narrative designer, independent. The implementer drafted and integrated and did not vote.

- **Round 1.** Both seats voted GO-WITH-AMENDMENTS.
  - Historian:
    - the Gornji Vakuf ultimatum covered every province Herceg-Bosna claimed, and the Vance-Owen plan did not "assign" provinces to a people;
    - Kordić was a vice-president of HZ HB;
    - Kiseljak and Žepče also bordered VRS lines;
    - the "airbridge" claim is unverified;
    - East Mostar: the ICTY found terror shelling and sniping of civilians and obstruction of aid, not that all shelling targeted civilians;
    - US airdrops onto Maglaj are unverified;
    - Zagreb's support did not "now flow openly";
    - an attack is not "tried"; crimes are.
  - Narrative designer:
    - the unchanged staff assessment and the persisted defend_pocket notifications contradicted the map;
    - a non-default notification still claimed fighting;
    - the Ahmići massacre must be named;
    - BCS grammar fixes;
    - two ticker rows;
    - two English display paths (Wrapped, receipts) bypassed the override.
- **Reconciliation.** Facts follow the historian's wording. Voice and naming follow the narrative designer. The narrative designer's "forced removal" sentence was not adopted because the historian could not verify it.
- **Round 2.**
  - Historian: GO.
  - Narrative designer: GO after one BCS word. "u provincijama koje je svojatao" became "u provincijama na koje je polagao pravo", because "svojatati" passes a judgement that the English "claimed" does not. The seat's optional item was also applied: the Vitez pockets "are cut off", not "become increasingly cut off", because the map has them cut off from t41.
- **Unanimous GO.**

## 4. Verification

- `npx tsc --noEmit`: pass. This host needs `NODE_OPTIONS=--max-old-space-size=8192`; the default heap runs out of memory.
- Affected tests pass:
  - `tests/event_timeline_integrity.test.ts`, `events_evaluate*.test.ts`, `codex_sensitive_*`, `event_notification_content_backfill`, `event_taxonomy_report`, `event_acceptance_report`, `event_decisions`, `sensitive_history_player_choice_content`, `events_owed_followups_termination`;
  - `tests/ui/warroom_ticker_event_receipts`, `consequence_receipts`, and 39 chronicle, Wrapped, aftermath, inbox, notification and timeline UI files;
  - the new `tests/ui/hvo_arbih_1993_truthful_cards.test.ts`. It covers the map-truth wording guard, the persisted-title contract, the resolver and ticker gating.
  - `codex_sensitive_claim_inventory` was updated from 549 to 551 consequence claims. The two new claims are the csq card's BCS title and narrative, both `documented` / `design_counterfactual`.
- Full suite: FULL_SUITE_PENDING
- **40w** (`npm run sim:scenario:run:40w`): hash `d26098607271f8c2` before and after. `final_save.json`, `weekly_report.jsonl`, `run_summary.json`, `control_delta.json` and `displacement_event_log.jsonl` are byte-identical. None of the rewritten cards fires within 40 weeks.
- **188w** (`npm run sim:scenario:run:188w`): hash `0ec6d6112fd0e954` before and after. Every artifact is byte-identical (`final_save.json`, `weekly_report.jsonl`, `run_summary.json`, `end_report.md`, `displacement_event_log.jsonl`, `operation_aars.json`, `brigade_temporal_log.jsonl` and the rest), except `run_meta.json`. That file differs only in `out_dir` and in the input-file digests for the two edited event files. The baselines manifest therefore still matches.
- The tracked `data/derived/latest_run_final_save.json` that `--map` overwrites was restored after each run.
- **Not produced:** rendered screenshots. The UI change is text resolution only, with no layout change; the resolver and every call site are covered by unit tests.

## 5. Reported, not changed (out of scope)

1. **Diagnosis §8.3 is wrong.** The Ahmići card does carry `humanitarian_impact` (`war_crimes_delta` 3). Its primary `effect` is always applied, because `collectEffects` prepends `def.effect` to `effects`. `tests/event_timeline_integrity.test.ts` pins it.
2. **Triggers and effects that do not match the map** (simulation behaviour; belongs to the HVO-ARBiH war lane, Options B/C):
   - `east_mostar_siege_1993` books `war_crimes_delta` 2, supply −5 and patron pressure +5 to HRHB for a siege the engine does not run. It fires on `mostar_liberated` (a 1992 flag) and the war-begins receipt.
   - `mostar_bridge_destroyed_1993` requires that receipt.
   - `gornji_vakuf_clashes_1993` fires on a friction flag and alliance < 0.45, with no battle.
   - `maglaj_enclave_blockade_1993` and `sovici_doljani_attack_1993` are calendar-only.
   - `csq_hvo_central_bosnia_offensive_1993` issues HRHB orders that brigades at cohesion ~0 cannot carry out.
3. **1992 card `hvo_arbih_tensions_rise_1992`** (t23, "HVO forces attack Bosniak civilians and ARBiH positions" at Prozor). The baseline has no HVO-ARBiH battle before t52. It is the same defect, but outside the 1993 scope.
4. **The war-room ticker epoch** counts 4 turns a month, so ungated rows drift up to about 8 weeks ahead of the calendar. This is general and not specific to the HVO.
5. **Notifications have no BCS display path.** Authored notification copy is EN only. `localizations.<locale>.notifications_to_other_factions` is now typed and resolved, but nothing is authored in BCS yet.
6. **`hrhb_central_bosnia_defense_1993` `source_note` and `historical_source`** still carry the unverified "Tudjman-Susak airbridge" provenance prose. The decision dossier shows `source_note`. That needs a provenance pass under §10.
7. **Historian follow-ups:**
   - the Gornji Vakuf Codex essay dates the outbreak to 11 January, against the 15/18 January in Prlić;
   - `mostar_bridge_destroyed_1993` "UNESCO-recognized" is anachronistic (the bridge was inscribed in 2005);
   - `croatia_herceg_bosna_control_1993` "Tudjman's inner circle … annexation" overstates the appeal judgment on a named person (§10).
8. **Persisted titles as a general debt.** Any future title correction must use `localizations.en` or move the hash in a lane allowed to. Persisting event ids only, and resolving titles at display, would remove the trap. That needs a hash-moving lane.
