# D2 — RS, full campaign: week 0 to Dayton (188 weeks)

**Date:** 2026-09-01
**Faction:** RS · **Autonomy:** Level 3 (Observer) · **Node:** 22.23.2 (pinned)
**Instrument:** `tools/ai_play/parity_probe.ts --turns 188 --faction RS --play --autonomy 3`
**Base:** `edf69e27d` (PR #490 merged)
**Status:** observation only. No threshold moved, no baseline refreshed, no manifest touched.

## Why this run exists

The D2 diary sequence
([closeout, 2026-07-31](../implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md))
reached 104 weeks as an active RS player. The outstanding piece — the standing 1.0 go/no-go — was a
full campaign to Dayton, and it was not previously possible: a headless playthrough stalled on
decisions and authorizations nobody answered. Measured that morning, RS as the player ended 40 turns
**50 OSIDs short** of the calibration line with 9 frozen authorizations and operations running at a
quarter strength.

**This is the first full campaign, week 0 to Dayton, the project has played.**

The probe advances BOTH paths, so the calibration line is carried alongside as the counterfactual —
distance-from-history per turn rather than a bare endpoint.

## Result

```
PLAY-MODE INVENTORY after 188 turns (faction RS):
  territory  calibration  RBiH:294  RS:319  HRHB:99
             harness      RBiH:292  RS:317  HRHB:103
  live operations: calibration 3, harness 6
  pending event decisions never answered: 0
  unresolved authorization reviews: 0
```

**RS finishes 2 OSIDs from the calibration line.** Nothing stalled at any point in 188 turns.

## Trajectory — and the finding

| week | calibration (RBiH/RS/HRHB) | harness | RS gap |
|---:|---|---|---:|
| 1 | 316 / 294 / 102 | 317 / 292 / 103 | −2 |
| 10 | 276 / 338 / 98 | 294 / 317 / 101 | **−21** |
| 20 | 268 / 351 / 93 | 292 / 323 / 97 | **−28** |
| 39 *(jan1993)* | 255 / 372 / 85 | 255 / 370 / 87 | −2 |
| 60 | 265 / 372 / 75 | 265 / 370 / 77 | −2 |
| 104 *(apr1994)* | 265 / 372 / 75 | 265 / 370 / 77 | −2 |
| 156 *(apr1995)* | 270 / 359 / 83 | 266 / 361 / 85 | +2 |
| 188 *(oct1995)* | 294 / 319 / 99 | 292 / 317 / 103 | −2 |

**The divergence is NOT flat.** It peaks at **−28 OSIDs around week 20** and closes to −2 by week 39.
An earlier reading of this run — taken from the t40-onward window — described a stable 2–4 cell drift
that never compounds. That is true after week 39 and wrong before it. The real shape is a large
opening lag that converges.

**Interpretation, offered as hypothesis not finding:** the player path's opening offensive develops
more slowly. Historical operations now proceed under standing authorization
(`ensureHistoricalOperationAuthorizationReview` creates the review already accepted) rather than
being live in the baked snapshot from turn 0, so the same operations plausibly launch a beat later.
By the January 1993 checkpoint the Drina and Krajina objectives have been taken either way and the
paths reconverge. **This has not been attributed** — it needs the per-turn operation launch order
diffed between paths, not inferred from territory counts.

That the two paths reconverge to within 2 cells by w39 and stay there for 149 more weeks is the
substantive result. It means the opening lag is a timing difference, not an accumulating error.

## What holds through Dayton

- **Zero unanswered decisions and zero unresolved authorizations, all 188 turns.** This was the
  blocking defect; it is gone.
- **The endgame arrives on schedule in the player campaign.** Weeks 184–188 show RBiH 284→294 and
  RS 329→319 in BOTH paths — the late-1995 Federation offensives land in the played war too.
- **The mid-war plateau is reproduced.** Weeks 60–104 are static at 372/370 in both paths, the same
  frozen front the calibration line shows.

## Open, not resolved

**The operations gap.** Harness 6 versus calibration 3 at the endpoint, and the harness has been the
higher of the two since roughly week 40. An earlier phase-timing hypothesis (ops counted in planning
vs execution at the sampling instant) is weakened by the gap persisting at the endpoint. It should
be attributed before anyone reads the operation count as healthy in a player campaign.

**Single faction, single policy.** RS at Level 3 taking authored historical defaults. This is the
BASELINE campaign — evidence that the played war tracks the historical one when the player chooses
historically. It is not evidence about other factions, and says nothing yet about ahistorical play,
which is the point of building the harness.

**Not a calibration result.** The harness path is not the scoring instrument; the four checkpoint
figures in `CALIBRATION_MASTER.md` come from `scenario_runner`. Nothing here blesses or moves a
threshold.

## Companion runs

RBiH and HRHB full campaigns are queued to complete the set. They are run sequentially rather than
in parallel to avoid CPU contention distorting either.
