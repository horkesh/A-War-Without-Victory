## 2026-11-14 — Velika Kladuša date corrected in the Bihać 5th Corps event card

Follow-up to #602 (realism audit errata). Display copy only; no trigger, option, effect or state change.

- `data/scenarios/events/war_1994.json`, event `bihac_5th_corps_offensive_1994`:
  - `staff_assessment` said the APWB was liquidated "briefly" at Velika Kladuša "in late October 1994". It now
    says the 5th Corps captured APWB-held Velika Kladuša on 21 August 1994 and Abdić retook it on 17 December 1994.
  - `historical_source` listed an "October high-water mark at Grabez and Velika Kladuša". Velika Kladuša is
    dropped from that phrase and the two dates are cited: Balkan Battlegrounds Vol. II p.516 (21 August) and
    p.535 (17 December), from repo extracts `BB2_p0535` and `BB2_p0554` (extract numbers run 19 above the
    printed page).
- Neither field is persisted in the save. Evidence: 40w branch vs main, 14 of 15 artifacts byte-identical
  (`final_save.json`, `run_summary.json`, `control_delta.json`, `weekly_report.jsonl` among them); only
  `run_meta.json` differs, by output directory and the `war_1994.json` input digest. Event-system CI suite
  26 files, 507 passed and 5 skipped; event taxonomy, acceptance and codex essay tests 96/96.
- Not changed: the event's premise (an autumn 1994 decision to "overrun" Velika Kladuša, which the 5th Corps had
  already taken in August) lives in the title, narrative, response options and persisted notification bodies.
  Rewriting it is a narrative and §6 decision, and the notification text sits in the hashed save.
