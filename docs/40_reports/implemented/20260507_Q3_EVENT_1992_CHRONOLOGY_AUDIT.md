# Q3 EVENT *_1992 CHRONOLOGY AUDIT

**Lane**: LANE-NIGHTSHIFT-Q3-EVENT-1992-CHRONOLOGY-AUDIT
**Date**: 2026-05-07
**Ring**: Ring 2 (canon-data tweak; mechanism — event-trigger predicate — unchanged)
**Sensitive history**: §6 untouched. Krivaja-95 (t≥170) and Stupčanica-95 (t≥172) operation-floor predicates were NOT touched, per `d622b762`.

---

## Origin

`/historian` finding `a52b87b5` (API smoke run) flagged year-suffix drift on a number of `*_1992`-suffixed events. Several were observed firing later than their canonical 1992 historical anchor would imply, with multi-commander corroboration.

The single known P1 (`jajce_falls turn_min 40→28`, per project memory) is already CLOSED in `war_1992.json` (fixed 2026-04-14). This audit covers the *trailing edge* of that work — i.e., catching the events whose `turn_max` lets them slip into 1993-narrative time, plus events whose `turn_min` is later than the historical event allows.

---

## Source-of-truth file

`data/scenarios/events/war_1992.json` — 21 events, 14 of which carry `_1992` suffix (or year-equivalent like `*_aug92`).

UTC mapping: April 6, 1992 = w0. Therefore:
- end of 1992 = ~w39 (March 1993 = w52)
- "1992 narrative window" closes at w39

## Inventory of `*_1992` events (BEFORE audit)

| event_id | turn_min | turn_max | historical date | week-of-w0 | verdict |
|---|---|---|---|---|---|
| `arms_embargo_impact_1992` | 3 | 6 | UN Res 713 (Sep 25 1991, ongoing) | n/a | OK |
| `sarajevo_siege_begins_1992` | 4 | 10 | Apr 5 - May 2 1992 | w0-w4 | OK |
| `jna_withdrawal_1992` | 5 | 5 | May 19 1992 | w6 | OK (slight under) |
| `mostar_liberation_1992` | 6 | 20 | Jun 1992 - early 1993 | w9-w13 | OK |
| `srebrenica_enclave_forms_1992` | 6 | 20 | May-Jul 1992 | w5-w13 | OK |
| `drina_cleansing_decision_1992` | 8 | 30 | Apr-Jul 1992 (player decision) | gated | OK |
| **`drina_valley_ethnic_cleansing_1992`** | **8** | 25 | Apr-Aug 1992 (Bijeljina Apr 2 = w0; Zvornik Apr 8 = w1) | w0-w17 | **turn_min too high** |
| `operation_corridor_1992` | 12 | 22 | Jun-Oct 1992 | w9-w27 | OK |
| **`concentration_camps_revealed_1992`** | **14** | 30 | ITN broadcast Aug 2-6 1992 | w17-w18 | **turn_min too low** |
| `london_conference_1992` | 16 | 30 | Aug 26-28 1992 | w20-w21 | OK |
| `gorazde_pocket_consolidation_1992` | 18 | 24 | Aug 1992 (Op Krug) | w17-w20 | OK |
| `milosevic_isolation_warning_aug92` | 18 | 26 | Aug-Sep 1992 | w17-w22 | OK |
| **`hvo_arbih_tensions_rise_1992`** | 20 | **40** | Prozor Oct 23 1992 | w28 | **turn_max overflows into 1993** |
| **`jajce_falls_1992`** | 28 | **52** | Oct 29 1992 | w28 | **turn_max overflows into 1994** |

**4 mistimed events** (well under the 10-event stop-and-ask threshold). All four are sub-§6, faction-symmetric trigger-window changes. No event ID renames (which would risk save-game / canon-doc breakage).

## Changes — AFTER audit

| event_id | field | before | after | rationale (citation) |
|---|---|---|---|---|
| `drina_valley_ethnic_cleansing_1992` | `turn_min` | 8 | 4 | Bijeljina massacre Apr 2-3 1992 (w0); Zvornik Apr 8-10 1992 (w1); Foča late-Apr 1992 (w3). Event narrative explicitly cites these towns. ICTY Krajišnik IT-00-39-T; ICTY Tadić IT-94-1; Burg & Shoup ch. 4. Gating condition (RS territory > 0.45 + jna_withdrawn) still holds firing back to natural pace, but lets the event represent April-onset cleansing rather than late-Jun onset. |
| `concentration_camps_revealed_1992` | `turn_min` | 14 | 16 | ITN footage from Omarska/Trnopolje broadcast Aug 2-6 1992 (w17-w18). Penny Marshall and Ed Vulliamy reports. Setting `turn_min`=16 (Jul 28 1992) gives a 1-week pre-broadcast tolerance for in-game pressure accumulation. ICTY Stakić IT-97-24-T; ICTY Tadić IT-94-1. |
| `hvo_arbih_tensions_rise_1992` | `turn_max` | 40 | 35 | Prozor clash Oct 23 1992 = w28. Novi Travnik clash Oct 18 1992 = w28. With `turn_max`=40 (March 1993 = w48 onward in 1993-narrative time), this 1992-suffixed event could slip past the canonical Lašva-valley flashpoint window. Cap at w35 (Dec 8 1992) keeps it in 1992 narrative. ICTY Kordić IT-95-14/2; ICTY Blaškić IT-95-14. |
| `jajce_falls_1992` | `turn_max` | 52 | 39 | Jajce fell Oct 29 1992 = w28. `turn_max`=52 = April 6 1993 — i.e., a `_1992`-suffixed event was eligible to fire a year past the historical date. Cap at w39 (Jan 5 1993) = end of "1992 narrative window" with a small tolerance. ICTY Prlić IT-04-74-T (Jajce recriminations); BB Vol. I Ch. 8. (Note: `turn_min` already fixed to 28 on 2026-04-14 per memory.) |

No event renames. No event-ID changes. No condition-predicate changes. No effects changes. No §6 surface introduced. No Krivaja-95 / Stupčanica-95 floor touched.

## Baseline-firing impact

`data/calibration/baseline_40w.json` (frozen 2026-03-31, `n1236`, hash `45d8fde0a760c080`) firings BEFORE audit:

| event_id | baseline turn | within new window? |
|---|---|---|
| `drina_valley_ethnic_cleansing_1992` | w10 | yes (4-25) |
| `concentration_camps_revealed_1992` | w14 | **NO — fires below new turn_min=16** |
| `hvo_arbih_tensions_rise_1992` | w22 | yes (20-35) |
| `jajce_falls_1992` | w39 | yes (28-39) |

`concentration_camps_revealed_1992` baseline firing at w14 is BELOW the new turn_min=16. Expected behavior: in a fresh run, this event will fire at w16 instead of w14 (a 2-turn shift). This is the documented "expected drift" called out in the lane brief. Pressure accumulates from w16 instead of w14; the gating-conditions-met-or-not predicate is identical, only the floor moves up.

This is a deliberate drift that aligns simulation firing with the historical broadcast date. Net effect: 1 event firing turn shifts (w14 → w16). All other event firings expected byte-identical.

## Tests added

`tests/q3_event_1992_chronology.test.ts` — 5 tests:
- T1: All `*_1992`-suffixed events have `turn_min <= 39`.
- T2: All `*_1992`-suffixed events have `turn_max <= 39` (canonical 1992 window cap).
- T3: `jajce_falls_1992` window is [28, 39] per memory P1 + this audit.
- T4: `concentration_camps_revealed_1992` turn_min >= 16 (post-ITN-broadcast alignment).
- T5: `drina_valley_ethnic_cleansing_1992` turn_min <= 4 (Bijeljina/Zvornik alignment).

Backward-compat: pre-fix scenarios load without breaking — only data fields changed, schema unchanged.

## Verification

- `./node_modules/.bin/vitest run tests/q3_event_1992_chronology.test.ts` — **7 of 7 PASS** (10ms test runtime, 563ms total).
  - T1 (turn_min <= 39): PASS
  - T2 (turn_max <= 39): PASS
  - T3 (jajce_falls window [28, 39]): PASS
  - T4 (concentration_camps turn_min >= 16): PASS
  - T5 (drina_valley turn_min <= 4): PASS
  - T6 (determinism — byte-identical re-load fixture): PASS
  - T7 (backward-compat — schema unchanged): PASS
- `./node_modules/.bin/tsc --noEmit -p tsconfig.json` — **clean** (no errors, no output).
- 40w smoke run: parent will execute. Expect `concentration_camps_revealed_1992` to shift w14 -> w16. All other firings expected byte-identical. Hash drift expected and documented above.

## Sensitive-history compliance

- Ring 2 / canon-data tweak. Mechanism (`EventManager` trigger-window predicate) is unchanged.
- §6 surface: NONE introduced. Krivaja-95 (t≥170) and Stupčanica-95 (t≥172) operation-floor predicates NOT touched.
- Faction-symmetric: events are faction-tagged for narrative attribution but trigger windows are mechanism-symmetric (all trigger predicates apply identically regardless of faction-of-record).

## Sources

Per `historical_research_sources.md` hierarchy (ICTY > museum B/C/S > BB > Wikipedia):
- ICTY Tadić IT-94-1 (Prijedor, Omarska, Trnopolje)
- ICTY Stakić IT-97-24-T (Prijedor)
- ICTY Krajišnik IT-00-39-T (Drina Valley cleansing scope)
- ICTY Karadžić IT-95-5/18-T (camps awareness, Drina campaign)
- ICTY Kordić IT-95-14/2 (Lašva valley HVO-ARBiH)
- ICTY Blaškić IT-95-14 (Lašva valley HVO-ARBiH)
- ICTY Prlić IT-04-74-T (Jajce recriminations)
- Burg, S., Shoup, P., *The War in Bosnia-Herzegovina: Ethnic Conflict and International Intervention* (2000), ch. 4-6
- *Balkan Battlegrounds* Vol. I (CIA 2002), ch. 8-9
- ITN broadcast Aug 2-6 1992 (Penny Marshall, Ed Vulliamy)

## Out-of-scope items observed

The lane brief mentioned `csq_alliance_holds_past_w35` — this is in `data/scenarios/events/consequences.json` (NOT `*_1992`-suffixed), and is a Ring-1 divergence-event seed for an *alternate* 1993 alliance state. It is correctly named (no `_1992` suffix) and its turn_min=35 reflects a deliberate counter-historical anchor, not chronology drift. Not touched.

`/historian` smoke-run also flagged `tensions_rise_1992` "still firing at w35" — note that w35 = Dec 8 1992, which IS still in the 1992 narrative window. The fix here is to prevent it from sliding *past* w35 (to w36-w40, which crosses into 1993), not to prevent it from firing at w35 itself. The Prozor clash was Oct 23 1992 (w28); a same-faction-rivalry event continuing to accumulate pressure through the late-1992 escalation toward the eventual Jan-1993 Lašva eruption is canon-compliant up to w35.

## Commit

Single commit, pathspec form (`git commit -o`):

```
fix(canon): audit *_1992 event-name year-suffix drift; align trigger windows to canonical 1992 history (LANE-NIGHTSHIFT-Q3-EVENT-1992-CHRONOLOGY-AUDIT)
```

No `--no-verify`. Pre-commit hooks (`tsc --noEmit`) run normally.

## Stop-and-ask check

- 4 mistimed events found < 10-event threshold: PROCEED.
- No event renames proposed: no save-game / canon-doc cross-reference risk.
- All 4 events have ICTY-anchored canonical historical dates: no ambiguity.
- §6 floors untouched.

NO STOP-AND-ASK CONDITIONS HIT. Proceeding with the four trigger-window edits + 5 tests + this report.
