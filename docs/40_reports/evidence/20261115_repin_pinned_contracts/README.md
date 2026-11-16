# Re-pin of the two reviewed-contract events (citation audit follow-up)

`rbih_state_identity` and `rbih_paramilitary_policy_1992` are pinned by reviewed-contract hashes in `src/sim/events/opening_policy_transition.ts`: they cannot change without review. The citation audit left a short list in them. This change clears that list, with the same three seats as the first identity re-pin (#684): historian, narrative designer and canon-compliance, each on the whole event as it will stand.

## What changed (9 strings; nothing structural)

| Event | Strings | Change |
| --- | --- | --- |
| `rbih_state_identity` | 3 visible explanations (ro0.fc5, ro1.fc4, ro2.fc4) | UN A/54/549 §§57-98 becomes "paras 59-65 and 69" and Krstić §§16-28 becomes "paras 19-25" (historian: A/54/549 ¶¶57-98 is mostly Security Council politics; ¶¶59-62 hold the 18 April agreement, ¶61 about 300 mostly unserviceable weapons handed over, ¶¶63-65 and 69 the 8 May terms; Krstić ¶¶19-25 hold the demilitarization and the nominal compliance, ¶15 is Morillon's visit) |
| `rbih_state_identity` | 3 consequence labels (F3 from the canon seat) | "Owen-Stoltenberg Assembly-rejection path (September 1993)" becomes "Owen-Stoltenberg response decision (September 1993)": the event it opens (`os_rbih_tactical_acceptance_1993`) is a player Accept or Resist decision, and the old label gave away the choice. Narrative seat: keep (sibling labels end in "response decision") |
| `rbih_paramilitary_policy_1992` | 3 provenance notes | each cited UN A/54/549 §35, which is the Srebrenica enclave before the safe-area resolutions, not the ARBiH chain of command. The two hidden notes record the correction; the one note a player can see (`source_note`) drops the paragraph |

New pins (computed with the repo's method, canonical JSON with sorted keys and FNV-1a 64; verified independently by the canon seat):
- `rbih_state_identity`: length 70817 to **70844**, hash `a5cda75445f4eff3` to **`acbebbba72173a81`**.
- `rbih_paramilitary_policy_1992`: length 10911 to **11239**, hash `4db9c9795b1abb6d` to **`3aa51be73b2cdda0`**.

Canon seat verdict: **APPROVE** both. Exactly 6 string leaves differ in the identity event and 3 in the policy event; zero structural, key, type, option id or order, effect, flag, dimension shift, default, notification or localization-structure differences. Reported by the seat and not changed here: the policy event's visible source note still cites A/54/549 as a whole document (no paragraph), and its narrative mentions the 7th Muslim Brigade and The Hague in a spring 1992 scene (a content question for the historian; queued, not a citation).

## Save compatibility (the F2 check, extended)

A pending decision copies display text into the save when it fires. The identity card was already judged on structure in #684. This change adds two things:
- the identity check now also ignores **consequence labels** (the label change above would otherwise have stranded an unanswered identity card saved with the old label);
- the **policy** decision, which copies `historical_source`, `source_note` and `source` into the save, ignores exactly those three developer provenance fields (`withoutProvenanceText`), so a save made before the correction can still be answered. Its narrative, notifications, option text and every mechanic are still compared with the reviewed catalog, as before.

`tests/pre_first_advance_paramilitary_policy.test.ts`: the "forged descriptive source" row is removed from the rejected list (a provenance note is now tolerated; the canon seat judged that justified) and "forged narrative" and "forged option description" rows are added (still rejected). `tests/identity_pending_text_drift.test.ts` gains a consequence-label drift and two policy cases: a policy decision with older provenance notes is answered, and a policy decision with an altered narrative, option label or notifications is refused.

## Allowlists emptied

`tests/ui/event_icty_other_citation_ranges.test.ts`: the three `rbih_state_identity` strings leave the known list, which is now empty.

## Verification

188-week headless run against a clean `origin/main` run at the same commit: see the PR description. `tsc` clean; the reviewed-contract tests (`pre_first_advance_paramilitary_policy`, `browser_campaign_start_fallback`, `identity_pending_text_drift`) and all citation guard tests green.

## Files changed

`data/scenarios/events/war_1992.json` (9 strings), `src/sim/events/opening_policy_transition.ts` (both pins, `withoutProvenanceText`, consequence-label tolerance), `tests/identity_pending_text_drift.test.ts`, `tests/pre_first_advance_paramilitary_policy.test.ts`, `tests/ui/event_icty_other_citation_ranges.test.ts`, this README and `docs/ledger/fragments/2026-11-15-repin-pinned-contracts.md`.
