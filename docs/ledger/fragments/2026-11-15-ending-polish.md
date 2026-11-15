## 2026-11-15 — Ending polish: one source for the paramilitary record, source line, legibility, contrast, word breaks

Five findings from the ending truth pass render check (PR #635), fixed together.

- **Truth: the Verdict said both "N deployments authorized" and "Sustained Refusal".** The cost-ledger
  line ("This campaign recorded 4 paramilitary deployments authorized by RBiH command") reads the running
  deployment total that `paramilitary_sweep` books in `paramilitary_deployment_count`. The Codex ghost
  card "The Sustained Refusal" (`paramilitary_streak_refused`) read only two event flags
  (`paramilitary_authorization_refused`, `clean_record`), which stay set after a refusal even when the
  side authorised deployments later. The ghost's gate now also requires a deployment count of zero for
  the player faction (`paramilitaryDeploymentsZeroOperand` in `dynamic_section_builder.ts`; a missing
  count is none). Both surfaces now read `paramilitary_deployment_count`; the state decided it: the side
  that authorised 4 deployments did not refuse continuously. The change only narrows when the card
  appears: no new claim, no §6 surface, no text change to the entry. Test in
  `tests/codex_ghost_entries_wave_2.test.ts`.
- **Source note for `us_halts_federation_advance_1995`.** Its `source_note` and `historical_source` carry
  authoring provenance, which the player-copy filter hides, so the historical default showed no source.
  The event now carries `localizations.en.source_note` and `localizations.bcs.source_note` (Balkan
  Battlegrounds Vol. I p. 462 and endnote 823, Vol. II Ch. 15, Holbrooke, from the event's own
  `historical_source`). Display copy only; persisted strings and the save hash are unchanged. The render
  tour's source-note leniency is removed. `tests/ui/event_historical_default_source_line.test.ts` pins
  that every historical default shows a source line in en and bcs, with four events recorded as known
  gaps (see below).
- **Legibility.** Signing-plate lettering (date, cost, signature captions, notes) has a 12 px floor
  (`max(12px, Ncqw)`), and the notes wrap under the rule. Below 640 px the plate is too small for that:
  its lines are hidden there and the same date, cost and notes show as text in the panel
  (`dayton-signing-facts`); the panel's actions are sticky so Continue is always in view (375×812:
  fully inside, bottom edge 785 px).
- **Contrast.** The delegation folder's share bar uses `SPLIT_BAR_COLORS`, the board hues 2–6% darker
  (white labels 4.79, 4.67 and 4.68:1; were 4.31 and 4.36 on RBiH and HRHB). Test in
  `tests/ui/delegation_folder_contrast.test.ts`. The render tour's exemption for the folder chips and the
  plate captions is removed: every readability finding now fails the run.
- **Word breaks.** The Verdict faction tiles at 375 px no longer break "Hercegovina" mid-word: the rail
  items drop their gap and use less padding below 640 px, and the name is 14 px there.
- **Evidence.** Before and after renders (EN and BCS; 1280×720, 1920×1080, 375×812; also 768×1024)
  and the packaged tour are in `C:/Pyrrhic/AWWV-worktrees/_logs/ending-polish-20261115/`.
- **Not done.** Four events have a historical default with no visible source line:
  `csq_patron_recovery_offer`, `gornji_vakuf_clashes_1993`, `hrhb_1992_graz_cooperation_collapse` and
  `rbih_late_war_offensive_1995` (their citations are developer text). Listed in the guard test; the event
  lane writes their player-facing source notes.
