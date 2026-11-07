# RD closeout — settlement and end map (2026-11-07)

Lane plan: [docs/plans/2026-11-07-rd-dayton-settlement-lane.md](../plans/2026-11-07-rd-dayton-settlement-lane.md). Handoff to the Dayton conference redesign: [handoffs/20261107_dayton_end_map_to_conference.md](../../handoffs/20261107_dayton_end_map_to_conference.md). Branch `claude/loving-knuth-pmx3hi`.

## 1. Maximum territory, re-measured under the settlement rules

Harness: `tools/ai_play/territory_sweep.ts` (live-equivalent desktop `advanceTurn`, production autonomy). Each faction's best strategy from the [earlier sweep](20261107_PLAYER_MAX_TERRITORY_SWEEP.md) (`rbih_aggr_req`, `rs_delay_martial`, `baseline_HRHB`), with Dayton signed on the map and no table demands, so the numbers do not depend on the interim table rules the conference redesign owns. Strategy files: scratch `remeasure/rd_<faction>_<sign|decline>_map.json` (base strategy + `"dayton": "sign" | "decline", "dayton_table": "map"`).

| Run | Dayton | Ends | Player's wartime share | Settled RBiH / RS / HRHB | Player grade |
|---|---|---|---|---|---|
| RBiH best, on time | signed wk 188 | 188 | RBiH 38.09% | 32.46 / 47.96 / 19.58 | A |
| RBiH best, declined | imposed by the US, wk 196 | 196 | RBiH 39.16% | 32.59 / 47.83 / 19.58 | A |
| RS best, on time | signed wk 188 | 188 | RS 48.49% | 31.77 / 48.76 / 19.47 | D (genocide condemnation) |
| RS best, declined | imposed by Belgrade, wk 196 | 196 | RS 45.64% | 32.09 / 48.44 / 19.47 | D (genocide condemnation) |
| HRHB baseline, on time | signed wk 188 | 188 | HRHB 20.74% | 32.18 / 48.35 / 19.47 | A |
| HRHB baseline, declined | imposed by Zagreb, wk 196 | 196 | HRHB 21.09% | 32.30 / 48.23 / 19.47 | A |

Peace-plan settlements (measured earlier the same day; the RD contiguity pass and package fixes apply only to Dayton, so these stand): RS accepting the Contact Group plan settles at RS 51.24% (grade B, capped by the plan's terms); RS accepting Vance–Owen settles at 44.83% (grade C).

At the table, with the interim rules (decline campaign v8, RBiH demands its captured ground, patron rules in force): RS concedes Gračanica and Kalinovik in its counter-offer, Belgrade forces nothing (Prijedor, Bosanski Novi and Doboj are protected), settled RBiH 32.75 / RS 47.78 / HRHB 19.47.

**Findings.**
- Once Dayton is signed the map decides the settlement: every strategy lands within about 1 point of RBiH 32 / RS 48.4 / HRHB 19.5. Wartime gains above the map (RBiH up to 39%) do not carry; wartime shortfalls (RS 45.6% after a decline) are restored by the map.
- The maximum settled share per faction is therefore set by the plan chosen, not by fighting: RS 51.24% (Contact Group, capped at B), RBiH ≈ 32.6–32.8% (Dayton map, or a little more by winning unprotected captured ground at the table), HRHB ≈ 19.5%.
- No settled map has a detached piece outside the Posavina canton.

## 2. Reviews

| Review | Seat(s) | Verdict | Disposition |
|---|---|---|---|
| Independent code + canon review of the branch | independent reviewer | GO-WITH-FIXES | F1 (Federation-internal fixed packages) fixed; F2 (final split vs settled share) fixed; F4, F5, F6, F8, F9 fixed; F3 canon fixed; F7, F10 recorded as known limitations in the handoff. Tests: `tests/dayton_review_fixes.test.ts`. |
| Sensitive-history gate | gate seat | Coercion events PASS-WITH-CONDITIONS; continuation operations PASS-WITH-CONDITIONS; RS re-anchor PASS. No panel required. | Applied: "In this campaign, …" register on the coercion events; neutral image for the US event; camp-site exclusion enforced by test (`op:prijedor:omarska_2`, `op:prijedor:kamicani`); BCS "zatražite"; "heartland" wording replaced. Advisory for the owner: US strikes on ARBiH have no historical analogue (Washington's pressure at Dayton was diplomatic); a grounded alternative is Equip-and-Train withdrawal plus Zagreb closing the supply corridor. |
| Scoring anchors + verdict copy (§8) | game designer, war-or-game, narrative designer, historian | GO / GO-WITH-CHANGES | Applied; recorded in `VICTORY_AND_PYRRHIC_SCORING.md` §8. Known dead band: RS A+ (>55%) unreachable. |
| Run artifacts | scenario-creator-runner-tester | see §3 | — |

## 3. Run artifact review

Pending at the time of writing; recorded in the ledger entry that closes RD.

## 4. Calibration

Every engine change in RD was followed by the pinned baseline gate: `npm run test:baselines` — "Baseline regression: all scenarios match." (steps 2 and 3, and after the contiguity pass). 712/711/712/710 unchanged; the 188-week calibration scenario never resolves Dayton.
