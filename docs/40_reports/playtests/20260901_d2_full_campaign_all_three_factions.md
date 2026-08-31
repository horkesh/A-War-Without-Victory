# D2 — full campaign, week 0 to Dayton, all three factions

**Date:** 2026-09-01 · **Autonomy:** Level 3 (Observer) · **Node:** 22.23.2 (pinned)
**Instrument:** `tools/ai_play/parity_probe.ts --turns 188 --faction <F> --play --autonomy 3`
**Base:** `edf69e27d` (PR #490 merged)
**Status:** observation only. No threshold moved, no baseline refreshed, no manifest touched.
**Companion:** [RS diary](20260901_d2_rs_188week_full_campaign_diary.md) — the per-turn RS detail.

---

## Verdict: D2 ANSWERED, CONDITIONAL

**The campaign completes.** All three factions run week 0 to Dayton with zero unanswered decisions
and zero unresolved authorizations across all 188 turns. That was the blocking defect and it is
gone — the same campaign that morning ended 40 turns 50 OSIDs short with 9 frozen authorizations.

**One named defect blocks ahistorical use.** The player faction's late-war offensive does not
arrive. Playing RBiH costs 22 OSIDs of your own historical gains before you make a single
ahistorical choice; playing HRHB costs 18. Any "what if this faction played differently" experiment
run today measures that handicap, not the choice — which is exactly the confound observer parity was
built to remove.

---

## Endpoint, all three

Calibration line at t188 for reference: **RBiH 294 / RS 319 / HRHB 99**.

| player | harness endpoint | player faction vs history |
|---|---|---:|
| RS | 292 / 317 / 103 | **−2** |
| RBiH | 272 / 349 / 91 | **−22** |
| HRHB | 289 / 342 / 81 | **−18** |

The player faction always finishes at or below its historical share, and the deficit is large for
RBiH and HRHB while negligible for RS.

## Where it happens: the last 32 weeks, not the opening

| player | gap at t39 | t104 | t156 | **t188** |
|---|---:|---:|---:|---:|
| RS | −2 | −2 | +2 | −2 |
| RBiH | −1 | −3 | −2 | **−22** |
| HRHB | 0 | 0 | −2 | **−18** |

All three track within ~2 cells for **156 of 188 weeks**, then two of them blow out in the final 32.
That window is the late-1995 Federation offensives (Deliberate Force, Storm era).

**The player faction's share of that offensive does not materialise:**

```
                 calibration t156 -> t188      harness
RBiH as player   RBiH +24                      RBiH  +4
HRHB as player   HRHB +16                      HRHB   0
```

**RS converges because RS has no late-war offensive to suppress** — it is losing ground in that
window either way. The handicap is invisible in the RS run, which is why the RS diary alone read as
a clean pass. One faction was the wrong sample.

## Root cause — located, not guessed

```
scenario_runner.ts:2646   applyBotOpportunityDecisions(state, turn, null)   <- null = ALL factions
war_phases.ts:2549        const playerFaction = ...player_faction ?? null
war_phases.ts:2551        applyBotOpportunityDecisions(context.state, ... playerFaction ...)
desktop_sim.ts            (no post-turn opportunity sweep at all)
```

The calibration runner sweeps EVERY faction's opportunities post-turn with an explicit `null`. The
in-pipeline step deliberately skips the player faction — correct, because at Levels 0-2 those are
the player's to decide — and `advanceTurn` never runs the post-turn sweep that would catch them
afterwards. **The player faction's opportunity-driven operations are therefore never decided.**

Late-war Federation offensives are precisely opportunity-driven operations. The evidence matches on
all three axes: the deficit appears only in the last 32 weeks, only for factions that attack late,
and never for RS.

This gap was identified on 2026-08-31 while first diffing the two paths, recorded as one of the
post-turn steps `advanceTurn` omits, and not closed. The D2 run is what showed it has teeth.

## What holds

- **Observer parity remains byte-identical** for all 188 turns. The harness IS the calibration path;
  this is a player-path defect, not a parity defect.
- **The opening is faithful for all three factions** — within 2 cells at the jan1993 checkpoint.
- **The mid-war plateau reproduces** in every run (weeks 60-104 static in both paths).
- **Nothing stalls.** Zero pending decisions, zero unresolved authorizations, 3 factions x 188 turns.

## Queued, NOT done

**Close the opportunity-sweep gap.** `advanceTurn` needs the post-turn sweep that
`scenario_runner` performs — or the Level-3 path needs to pass `null` rather than the player faction
so Observer decides opportunities like any other faction. This is engine behaviour on the player
path: it needs its own lane, a 188w with `control_delta` diffed, and re-running these three
campaigns to confirm the deficit closes. Deliberately not attempted in the same breath as finding
it.

**The three named-operation differences** from the RS launch diff (`Operacija Strijela` /
`Operacija Ihlas` in arbih_3rd_corps, `Operacija Oklop` in vrs_sarajevo_romanija) remain
unattributed. The discriminator they were queued for is now available: run
`tools/ai_play/op_launch_diff.ts` for RBiH and HRHB and see whether 3rd Corps churn appears
regardless of who is playing.

## Limits of this evidence

Three campaigns, one policy each: Level 3 taking authored historical defaults. This is the BASELINE
set — evidence that the played war tracks the historical one when the player chooses historically,
and a measurement of what being the player costs before any choice is made. It says nothing yet
about ahistorical play, which is the point of the harness and is blocked on the defect above.

Not a calibration result. The harness path is not the scoring instrument; the four checkpoint
figures in `CALIBRATION_MASTER.md` come from `scenario_runner`.
