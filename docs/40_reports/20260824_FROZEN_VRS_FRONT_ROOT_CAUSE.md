# Frozen VRS front — root cause: the corps AI stops issuing capture-capable attacks

Measured 2026-08-24 from `apr1992_definitive_188w__...__w188_n290`.

## The symptom

RS territorial captures by combat: **63 from operations starting at or before t28, and
1 in the remaining 160 weeks.** Every VRS corps' front is effectively frozen from late 1992.

## Three wrong explanations, ruled out with evidence

1. **"The VRS goes idle."** False. It runs 29 operations, spread across the whole war
   (`Operacija Grom` t36, `Pauk` t80, `Zvijezda` t126, `Vihor` t130, `Lukavac` t160).
2. **"RS attack volume collapses because of a bug."** False and already settled: the
   decline is authored. `apr1992.json` `doctrine_phases.aggression_modifier` has RS falling
   +0.15 → +0.05 ("Targeted Operations… constrained") while RBiH climbs to "Full
   counteroffensives". Matches the real war's arc. **Do not re-open** — see also the settled
   cohesion-floor ruling (owner, 2026-08-12).
3. **"Authored VRS brigades never enter the war."** False. The never-spawn rate is 2–3% for
   *every* faction (RS 2/83, RBiH 3/126, HRHB 1/37). Symmetric and unremarkable.

## The actual cause

`attack_resolution_osid.ts:1397`:

    let flip = (outcome === 'decisive_victory' || outcome === 'victory' || outcome === 'costly_victory')
        && !isProbeOp;

**A probe operation can never capture an OSID.** That is by construction and is fine on its
own. The defect is what the corps AI issues after the pre-planned catalogue runs out.

Share of each faction's attacks that are probes, and therefore incapable of taking ground:

    period      RS              RBiH            HRHB
    w  0- 28    26/116 = 22%    13/26  = 50%    6/10  = 60%
    w 29- 60    16/25  = 64%    23/32  = 72%    3/3   = 100%
    w 61-100     9/12  = 75%    66/76  = 87%    —
    w101-140     9/9   = 100%   73/80  = 91%    20/25 = 80%
    w141-188     5/5   = 100%   77/122 = 63%    19/44 = 43%

Probes dominate for everyone, so probe-heaviness is not itself the bug. **The RS-specific
failure is the denominator: after t28 the VRS gets 12 capture-capable attacks in 160 weeks,
against RBiH's 71 — and from w101 onward it gets none at all.** RBiH's real-op count recovers
late (45 real attacks in w141–188, driving Farz/Sana); RS's never does.

## The smoking gun

Two cells absorb most of the VRS's post-t28 offensive effort and never change hands:

    w 30  donji_vakuf:jemanlici  decisive_victory  ratio 3.57   probe_vrs_1st_krajina_t29
    w 31  donji_vakuf:jemanlici  decisive_victory  ratio 3.66   probe_vrs_1st_krajina_t29
    w 32  donji_vakuf:jemanlici  decisive_victory  ratio 3.54   probe_vrs_1st_krajina_t29
    w 35-47  jemanlici  decisive ×4 more (2.2–3.33)             probe_..._t34 / _t44
    w 63  bugojno:medini         decisive_victory  ratio 4.96   probe_vrs_1st_krajina_t62
    w 64  bugojno:medini         decisive_victory  ratio 6.10   probe_vrs_1st_krajina_t62
    w 65  bugojno:medini         decisive_victory  ratio 7.34   probe_vrs_1st_krajina_t62
    w 95  bugojno:medini         decisive_victory  ratio 4.86   probe_vrs_1st_krajina_t94
    w119  bugojno:medini         decisive_victory  ratio 2.32   probe_vrs_1st_krajina_t118

**`op:donji_vakuf:jemanlici` and `op:bugojno:medini` have ZERO control events in 188 weeks.**
A 7.34:1 decisive victory takes nothing, ten times over, because the attack is a probe. The
control case is `op:rogatica:brcigovo`: same corps era, one decisive victory at ratio 2.52 —
but issued under `Operation Pracha River`, a real operation — and it flipped.

Probes are not recorded in `operation_history` (only the 52 `sector_attack` entries are),
which is why an operation-type audit does not reveal this.

## Two corrections to earlier analysis in this repo

- **"An OSID flips only on `decisive_victory` (ratio 2.0)" is WRONG.** Three outcomes flip;
  morale absorption may then cancel it, and `decisive_victory` is never absorbed (Engine
  Invariants §9.6). Corrected in `20260824_JAN1993_FROZEN_CELL_ANALYSIS.md`.
- **"Frozen = never contested" is WRONG for at least two cells.** `jemanlici` was classified
  frozen because it had no control events; it was in fact attacked ten times and won ten
  times. The correct reading of a frozen cell is "never *flipped*", which splits into
  never-attacked and attacked-but-unflippable. The distinction matters: coverage fixes the
  first, and cannot touch the second.

## What this does NOT claim

The Lukavac 93 timing fix in this same run (`Operation Trnovo` t141 → t69) is a genuine
correctness fix, but it did **not** move RS captures: 1 after t28 both before and after.
The run's +6 comes from unrelated turn-ordering jitter, not from this mechanism.

## Proposed next step (not yet done)

Find why the corps AI selects a probe rather than a real operation for `vrs_1st_krajina`
from w101, in `bot_corps_ai.ts` / `bot_corps_operations.ts` — specifically whether the
real-operation path is gated on something RS loses late (manpower, cohesion, equipment,
aggression modifier) such that it can only ever fall through to a probe. Fixing the
*selection* is the lever; probes' inability to capture is correct and should stay.
