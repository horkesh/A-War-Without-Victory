## 2026-11-14 — Council fix 4: developer text stripped from player copy; noun and diacritics pass

R8 Player Experience Council fix 4 (items C1, C4, C5, C7, C11, C13, C14 in
`docs/40_reports/playtests/20261114_r8_dry_rbih_council_diary.md`). Copy and display only: no
simulation change, and strings stored in saves are corrected at display time.

**What changed**
- Developer text (C1, C7, C14). Dossier source lines show the first citation free of developer text
  and hide authoring notes (`resolveEventSourceLine`, `src/ui/shared/developerText.ts`). "Trigger
  evidence" is now "Why now" / "Zašto sada". Event prose loses internal ids, turn windows,
  worksheet codes and calibration voice. Opportunity receipts drop "not applicable" and evaluator
  bullets, and the commander's assessment reads as words. Officer bios lose scenario-setup voice
  through an English display map. Future-consequence labels and explanations written as authoring
  notes no longer reach the Turn Aftermath receipt.
- Nouns (C4, C11). Effect lines name the army for army attributes (ARBiH, VRS, HVO) and the state
  for state attributes (RBiH, RS, HRHB). Alliance and offensive-drive values read as whole points.
  "Int'l Standing" is now "International Standing". Negotiating-capital lines are labelled as such.
- Diacritics (C13). Person and place names are restored in event data (non-persisted fields) and
  Codex essays (927 strings). Persisted titles and notifications, and the two hash-pinned reviewed
  opening events, are corrected at display time through `restoreBosnianProperNames`. The pins are
  unchanged, so saves with a pending opening decision still resolve.
- Sensitive copy (C5). A three-seat §4 panel (historian, narrative-designer, sensitive-history)
  gave a unanimous GO in two rounds. The Ahmići title, the late-1995 source note and the Srebrenica
  Chronicle card were reworded. The Ahmići event's HVO gains are recorded as OPEN for the owner.
  The record is in `docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md` §6.

**Guard.** `tests/ui/player_copy_developer_terms_guard.test.ts` scans every message, event display
string, officer line and Codex essay for a developer-term denylist, with a narrow allowlist. It
also fails on ASCII-stripped names and pins the hidden pinned-event wording.

**Not done.** The Verdict and Dayton strings belong to the fix-1 lane, and the Mrkonjić Grad /
Mistral 2 error is not corrected. Nor is the Codex Srebrenica `ghost_summary`, and the pinned-event
explanation wording waits for a catalog-versioning lane. All are listed in the §6 record.
