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

**HYPOTHESIS FALSIFIED — see the launch-order diff below.** This diary originally recorded, as an
unattributed hypothesis, that the opening offensive develops more slowly because historical
operations now proceed under standing authorization rather than sitting live in the baked snapshot
from turn 0. `tools/ai_play/op_launch_diff.ts` was built to test exactly that, and it is wrong.

That the two paths reconverge to within 2 cells by w39 and stay there for 149 more weeks is the
substantive result. It means the opening lag is a timing difference, not an accumulating error.

## What holds through Dayton

- **Zero unanswered decisions and zero unresolved authorizations, all 188 turns.** This was the
  blocking defect; it is gone.
- **The endgame arrives on schedule in the player campaign.** Weeks 184–188 show RBiH 284→294 and
  RS 329→319 in BOTH paths — the late-1995 Federation offensives land in the played war too.
- **The mid-war plateau is reproduced.** Weeks 60–104 are static at 372/370 in both paths, the same
  frozen front the calibration line shows.

## Operation launch-order diff — what actually differs

`node_modules/.bin/tsx tools/ai_play/op_launch_diff.ts --turns 45 --faction RS` records the first
turn each `(corps, operation)` appears in `active_operations` on each path and diffs them.

**Named historical operations launch essentially on time.** 45 launch on the SAME turn. Only four
differ at all, and they go BOTH directions — which is what kills the "standing authorization delays
the opening" story:

```
LATER    +1  vrs_herzegovina  :: Operation Herzegovina Consolidation   t27 -> t28
         +7  vrs_east_bosnian :: Operation Majevica                     t11 -> t18
EARLIER  -1  vrs_1st_krajina  :: Operation Jajce                        t19 -> t18
         -3  vrs_1st_krajina  :: Operation Posavina Corridor            t19 -> t16
```

**The divergence is almost entirely PROBES.**

```
calibration-only:  42 probes + 1 named operation
harness-only:      57 probes + 2 named operations
```

Probes are auto-named `probe_<corps>_t<N>`, so a probe firing on a different turn reads as a
different operation. This also explains the operations-count gap flagged below: the played war runs
roughly 15 more probe instances, and **probes can never capture ground**. A higher live-operation
count in a player campaign is therefore mostly probe noise, not more fighting — a distinction worth
holding onto before anyone reads the number as "the player fights more".

**Three named operations genuinely differ:**

```
Operacija Strijela   arbih_3rd_corps         calibration t29 — never in the played war
Operacija Ihlas      arbih_3rd_corps         harness t34    — only in the played war
Operacija Oklop      vrs_sarajevo_romanija   harness t22    — only in the played war
```

**Two of the three are ARBiH 3rd Corps — a faction the player is not commanding.** So the divergence
is not in RS's own behaviour under standing authorization; it is downstream, in how the other
factions respond to a marginally different board. Whether Strijela/Ihlas is a substitution within
one corps or two independent differences is NOT established here and is deliberately not chased: the
queued RBiH and HRHB campaigns are the free discriminator. If all three factions show 3rd Corps
churn it is ambient bot variation; if it appears only when RS is the player, it earns a lane.

## Open, not resolved

**The operations gap is now explained but not fully closed.** Harness 6 versus calibration 3 at the
endpoint. The launch diff attributes the bulk of it to probe instances rather than fighting
operations, at 45 turns. It has NOT been re-measured at the 188-turn endpoint, so the endpoint ratio
is explained by inference from the opening, not by direct measurement there.

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
