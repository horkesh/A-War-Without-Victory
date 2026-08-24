# Scenario-tester assessment — n286 (Operation Majevica, zero-delta)

Run `apr1992_definitive_188w__0589220209545186__w188_n286`.
Result: jan1993 675 (+0), apr1994 661 (+0), apr1995 660 (+0), oct1995 648 (+0).
Zero control events in ugljevik/lopare. Teočak holds RBiH at all four checkpoints.

## Scenario definition summary

`apr1992_definitive_188w` — `init_control: apr1992`, `use_harness_bots: true`,
`player_faction: undefined`, `calibration_scenario: true`, 188 weeks,
`firepower_deficit_penalty_enabled` on. The one scenario in the repo that scores.

## (1) Is the diagnosis correct? — CONFIRMED, independently

Verified against source, not prose:

- `injectPrePlannedOperations` (`pre_planned_operations.ts:1163`) carries four
  same-corps guards: `hasActiveOperation(cmd)`, `queued_operations.length > 0`,
  `injectedCorps.has(def.corps)`, `deferredCorps.has(def.corps)`.
- `Operation Koridor` precedes `Operation Majevica` in `ALL_PRE_PLANNED`; both are
  `vrs_east_bosnian`. Koridor injects, `injectedCorps.add('vrs_east_bosnian')` fires,
  Majevica is skipped — and skipped *before* `validateOpAtInjection`, which is why no
  warning was emitted. Silence here is the expected symptom, not an anomaly.
- The per-turn re-injection step `inject-player-pre-planned-operations`
  (`war_phases.ts:1795`) returns early on `headless_scenario_auto_control === true`
  **and** on absent `player_faction`. Both hold for this scenario. Injection therefore
  runs exactly once, at scenario load.
- Follow-on ops reach a corps only through the hardcoded `cmd.queued_operations`
  blocks at `pre_planned_operations.ts:1269-1305`, which exist for `vrs_herzegovina`,
  `vrs_drina`, `vrs_sarajevo_romanija`, `vrs_1st_krajina` — and not for
  `vrs_east_bosnian`.

The diagnosis holds. n286 is a **correctly-executed null**, not a failed experiment:
the change under test never entered the simulation.

## (2) Is `queued_operations` the right mechanism? — YES, and it is the only one

The alternatives are worse:

- A third Koridor axis — rejected correctly. The file's own header documents Koridor's
  multi-axis readiness as order-sensitive (`posavina_flank` firing before
  `brcko_corridor` finished its march produced `zero_eligible_axis`), and Brčko is a
  load-bearing anchor recovered at cost (`dc66c6fc0`).
- Reordering `ALL_PRE_PLANNED` so Majevica precedes Koridor — would displace Koridor
  to the queue and put the Brčko corridor behind an untested op. Unacceptable.
- `available_from` — does nothing. At turn 0 `turn < available_from` skips the def, and
  there is no later pass to catch it.

`queued_operations` is exactly the mechanism the other four corps use.

**Hazard checked and cleared.** Life-lesson 2026-05-26 records that a pre-planned op
added to a corps that already has a *triggered* op causes home-base losses even when the
op never fires (R28: brigades marching to staging vacated Bosanska Krupa, −6). Verified:
`triggered_operations.ts` defines ops for `arbih_3rd_corps`, `hvo_main_staff`,
`hvo_tomislavgrad`, `vrs_1st_krajina`, `vrs_drina`, `vrs_herzegovina` — **none for
`vrs_east_bosnian`**. That failure mode does not apply here. On this criterion it is the
safest corps in the game to add to.

**Sacred Rule 4 compliant:** both objectives are painted RS at all four checkpoints and
the attacker is RS. No painted-opposite-faction objective.

## (3) Risk to Brčko / the Posavina cascade — LOW here, but one prior is serious

Koridor completes all seven objectives by t17 and Majevica is queued behind it, so it
cannot compete with Koridor for brigades during the corridor fight. The three Majevica
brigades are uncommitted to any other op and homed one OSID from the staging cell, so the
march that caused the R28 damage is minimal here.

**The serious prior is different and must be checked explicitly.** Life-lesson
2026-05-26: R23/R24/R25/R27/R28 — five consecutive *additive* pre-planned op changes —
all regressed or were zero-delta, and the recorded mechanism is that **any new combat
op, regardless of corps or geography, disrupted the HRHB western-Bosnia cascade**
(bosansko_grahovo / Šipovo). That damage lands far from Ugljevik and would not appear in
a sector check. The n287 verification must read western Bosnia explicitly.

Caveat on that prior's weight: it was recorded at a ~600–630 floor, before the
firepower-deficit mechanic, before exhaustion de-saturation, and before the 50 owner
reference corrections. It is a warning to test, not a settled verdict.

## (4) 'Corps idle after t17' — YES, this is a systemic engine-health defect

Measured from n286 combat-mechanism control events, attributed by brigade to corps:

    corps                     captures  first  last   idle tail
    vrs_1st_krajina                 40    t1    t28    160 turns
    vrs_2nd_krajina                  3    t3     t4    184 turns
    vrs_drina                       14    t1    t18    170 turns
    vrs_east_bosnian                 3    t1     t5    183 turns
    vrs_herzegovina                  4    t3    t11    177 turns
    vrs_main_staff                   2   t10    t45    143 turns
    hvo_southeast_herzegovina        4    t3    t16    172 turns
    arbih_2nd_corps                  4   t19    t61    127 turns
    arbih_3rd_corps                 13   t16   t188      0
    arbih_5th_corps                 25  t178   t188      0

**Every VRS corps stops taking ground within the first 28 turns and never takes another
settlement for the remaining 160–184.** The VRS front is frozen from roughly mid-1992
onward while the ARBiH is still capturing at t188.

Two consequences that matter more than this run:

- It is only half-right historically. VRS conquest *was* front-loaded into 1992, but the
  VRS kept mounting offensives after it — Lukavac 93, and Srebrenica and Žepa in 1995.
  The engine has no path to any of them.
- **It bounds the entire coverage lane.** The 18 frozen `RBiH→RS` cells can only be taken
  inside that first ~28-turn window; an operation scheduled later has no mechanism to
  gain ground. Any coverage plan must place its objectives early or not at all.

This deserves its own lane, separate from jan1993 calibration.

## Flags

- CALIBRATION_MASTER's headline figures (637 / 638 / 639) predate the 50 owner reference
  corrections and are **stale against today's painted files**. The live run reports
  oct1995 648. The gate floor `188w.matched_osids_min: 622` is unaffected, but those
  narrative numbers should not be quoted as current.
- `ilijas:krivajevici` was *removed* as an objective in R29 for a Sacred Rule 4 violation,
  and that removal was the largest single gain of the calibration arc (+9). It is painted
  RBiH at oct1995 but RS at the first three checkpoints — the original audit was
  oct1995-only. Re-adding it would re-open a closed, high-value finding. **Do not.**
- n286's emitted checkpoint figures must not be blessed into the gate: the run is a null,
  and `_baseline_tmp` is stale (emits jan1993 673 against a pre-correction reference;
  replays to 675 against current files).

## Proposals

1. **Verify n287 against western Bosnia, not just totals** — the R23–R29 cascade site is
   the documented blast radius of additive ops. (scenario-tester; staged.)
2. **If n287 gains, bless checkpoint floors; if it regresses western Bosnia, revert and
   record the cascade prior as still-live at the current floor.** Either result earns the
   run. (scenario-tester)
3. **Open a separate engine-health lane for the frozen-VRS-front defect.** Every VRS corps
   idle for 160+ turns is a larger finding than any single checkpoint cell, and it caps the
   coverage lane. (engine/systems + game-designer)
4. **Do not pursue further additive ops until (3) is understood.** With the VRS front frozen
   after t28, an op placed late is structurally incapable of gaining ground — the same wall
   the six Goražde runs hit, seen from the other side.
