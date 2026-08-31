# ARBiH Maglaj and Visoko Early Operations Design

## Decision

Keep the April 1992 RS political control of `op:maglaj:jablanica` and
`op:visoko:gornja_vratnica_2`. Give ARBiH a historically bounded opportunity to take them
through two ordinary CorpsOperations, staggered so they do not become one synchronized
calibration device.

## Operation design

- **Visoko–Breza Line Clearing** belongs to ARBiH 1st Corps, becomes available at week 8,
  stages at `op:visoko:visoko_2`, and targets only
  `op:visoko:gornja_vratnica_2`. The 165th Mountain Brigade provides the viable local core;
  the 146th Light, 164th Mountain, and later-forming Guards Brigade support it if they are active
  and can assemble.
- **Maglaj Local Counterattack** belongs to ARBiH 3rd Corps, becomes available at week 14,
  stages at `op:maglaj:maglaj_2`, and targets only `op:maglaj:jablanica`. The 327th Viteška
  Mountain Brigade is the local core; the nearby 372nd Viteška Mountain and 328th Mountain
  Brigades provide a bounded Maglaj–Tešanj–Zavidovići concentration against the resident 1st
  Ozren Light Infantry and the wider VRS sector defense.

The names are simulation labels, not claims of documented historical codenames. Both plans
use the existing pre-planned-operation pipeline, movement, readiness, prediction, combat,
casualty, retreat, and control-flip rules. Neither plan transfers control directly or guarantees
success. Both require a predicted victory before launch and have an eight-week marching/assembly
budget, preventing an authored order to attack into a known repulse. Fog and execution friction can
still make the realized result worse than the prediction. AWWV remains deterministic: differing
outcomes arise from differing game state, not randomness.

## Bounded behavioral evidence

The first 24-week run with a permissive `repulsed` threshold proved that both definitions injected
and attacked, but also proved the order was unsound: Visoko realized 0.54/0.35 power ratios and
Maglaj 0.16/0.13. That version was not retained.

With the stricter threshold and bounded local reinforcement, the canonical master scenario run for
26 weeks produced a stalemate and then a costly victory at Visoko (0.81, then 1.42), transferring
Gornja Vratnica through attack resolution. At Maglaj, stale intelligence still preceded two
catastrophic realized attacks (0.46/0.49), and Jablanica remained RS. This is an intentional
fallible result, not an invitation to add enough distant brigades to force the checkpoint. An
identical repeat produced the same final-state hash, `219936a8c769d73e`.

## Compliance and acceptance

This design follows Engine Invariants §6.3 (ops-only attacks), §6 (one target OSID per
resolution), and §9.6 (attack resolution as an authorized control-change mechanism), plus Game
Bible §§5 and 7. It introduces no mechanic, state field, event receipt, or checkpoint-conditioned
effect.

Acceptance requires catalog tests for corps ownership, availability, staging, participants, and
single-objective scope; operation validation with the operational graph; and bounded scenario
evidence showing that each operation can inject and attempt its objective without a 188-week run.
