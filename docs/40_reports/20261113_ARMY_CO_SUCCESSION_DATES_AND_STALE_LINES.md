# Army CO succession dates, and stale history lines (docs-only, 2026-11-13)

Status: research note for a later calibration lane. **No data, code or test changed.** `data/scenarios/army_co_roster.json` is untouched; the corrections below are proposals.

## Epoch

Week 0 is 6 April 1992 (`docs/40_reports/audits/20260905_EVENT_TIMING_HISTORIAN_ADJUDICATION.md` §0, `scenario_runner.ts:1963`). Week = floor(days since 6 Apr 1992 / 7).

## Army CO schedule against history

| Officer | Roster `tenure_start` | Historical date | Correct week | Verdict |
|---|---|---|---|---|
| Delić (ARBiH) | 61 | Appointed Main Staff commander 8 Jun 1993 (428 days) | **61** | Roster correct. FORAWWV text still says w60+. |
| Praljak (HVO) | 64 | Replaced Petković as Chief of the HVO Main Staff on 24 Jul 1993 (474 days) | **67** | Roster 3 weeks early. |
| Roso (HVO) | 80 | BB1 p.13 (KB BB1_p0050) chronology: "12 November [1993] Boban replaces Slobodan Praljak with General Ante Roso" (585 days). ICTY puts Praljak's departure at 9 Nov 1993 (582 days). | **83** either way | Roster 3 weeks early. FORAWWV says w130+, which matches neither. |
| Petković again (`hvo_petkovic_2`) | 100 (= 6 Mar 1994) | Not in the KB. Roso is still "HVO commander" on 10-23 Feb 1994 and signs the Zagreb ceasefire on 23 Feb (BB2 p.450, KB BB2_p0469). So the return is **after** 23 Feb 1994. | **Unresolved, >= 98** | Needs the ICTY *Prlić* judgment (Main Staff chapter) before anyone sets a week. Do not trust 100 or 120 (`hvo_blaskic_2`) without a source. |

Delić's own date also settles the OOB master: Halilović left the staff in November 1993; Delić was Commander from 8 Jun 1993.

## Citations and confidence

- Delić 8 Jun 1993: ICTY/standard record; matches the DC handover to week 61 (#588). High.
- Praljak 24 Jul 1993: ICTY *Prlić et al.* (IT-04-74) findings on the HVO Main Staff. **Not verifiable from the repo KB** (BB pages 13 and 450 do not give the date). From the lane's knowledge of the judgment; Medium-high. A historian check of the *Prlić* text should confirm before the data edit.
- Roso 12 Nov 1993: BB1 chronology, printed p.13 (KB BB1_p0050). BB1 p.162 n.31 (KB BB1_p0198) calls Roso "later HVO commander". High on the week (83) because both candidate days fall in it.
- Roso as HVO commander in Feb 1994: BB2 p.450 (KB BB2_p0469).
- Source hierarchy: ICTY first; BB second. Where they differ by three days (9 vs 12 Nov), the week does not move.

## For the calibration lane

Proposed roster edits, to measure one change per run: Praljak 64 -> 67; Roso 80 -> 83; Petković_2 and Blaškić_2 left alone until sourced. Both HVO shifts move officer scalars (`stubbornness` 3 and 2) by three weeks, so they can move HVO behaviour at weeks 64-83. Run the full-suite, 188-week and anchor gates per `CLAUDE.md`.

## FORAWWV stale lines (panel-gated, NOT edited)

`docs/10_canon/FORAWWV.md`:

- **L307** `Delić (w60+)` should read w61+ (8 Jun 1993 is week 61; the roster already says 61).
- **L308** `Praljak (w64+)` should read w67+.
- **L308** `Roso (w130+)` should read w83+ (and disagrees with the roster's 80).
- **L308** the HVO chain omits the Petković return and Blaškić entries the roster carries (`hvo_petkovic_2` at 100, `hvo_blaskic_2` at 120), both unsourced.
- **L305** cites the roster hash `93c75b1d` and the schema is `a4-2026-05-06`; re-check the hash before relying on it (not edited, not verified here).
- **L350** persona chain (Halilović -> Delić / Petković -> Praljak -> Roso) is consistent with history; no change.

No FORAWWV line mentions the 6th or 7th Corps, Domet or Srebrenica rupture timing.

## Other findings

- SC12: the only "in the July 1995 window" rupture claim was in `SENSITIVE_HISTORY_DESIGN_GATE.md` (fixed in #584). The remaining hits are accurate: `rupture_consequences.ts` fires from turn >= 160 with no upper bound, and docs that say "July 1995" describe the historical fall, not the trigger. `CALIBRATION_MASTER.md` L5640 and `20260826_S6_REFERRAL_ENCLAVE_GUARD_VACUITY.md` L346 call the territorial fall "between w156 and w188 ... the July 1995 window": historical records about the map, loosely worded (w188 is not July), left as written.
- The 7th Corps lane (#590) already fixed the 7th Corps, Domet-1, Jajce and 370th items in the OOB master; the Domet date there is 20-24 Mar 1995 (historian pairs note), not 20-25.
