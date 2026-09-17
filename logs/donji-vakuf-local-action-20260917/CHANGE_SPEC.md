# Change specification — Donji Vakuf Local Action (bounded operation-configuration experiment)

**Written:** 2026-09-17, BEFORE any edit.
**Branch/HEAD:** `codex/january-1993-operations-20260914` @ `b9024b97b`.
**Owner packet:** 2026-09-17 — ONE bounded local operation-configuration experiment through an EXISTING,
LIVE operation-admission and combat-resolution path. Target `op:donji_vakuf:donji_vakuf_2`. It authorizes
an attempt to take and hold the target, **not its guaranteed capture**. No ownership writer, no
personnel/equipment/combat-multiplier/global-threshold change in this experiment.

---

## 1. Definition / path

Add **one** `TriggeredOpDef` to `TRIGGERED_OPS_RAW` in `src/sim/combat/triggered_operations.ts`. This is the
existing schema whose own header calls these "offers", with the existing creation path
(`checkTriggeredOperations`) and normal local admission conditions (`def.trigger` → `hasAvailableSlot` →
`opStillHasEnemyObjectives` → live axes → `validateOpAtInjection` → authorization → `buildOperation` →
`evaluateLaunchFeasibility`). Nothing else in the engine changes.

- **name:** `Donji Vakuf Local Action` — an authored abstraction, **not** a historical codename.
- **faction:** `RS`; **primary_corps:** `vrs_1st_krajina`.
- **insert position:** immediately after `Operation Kotor Varos` in the array — i.e. after
  `Operation Posavina Corridor` and `Operation Herzegovina Consolidation`. **This is deliberate, not
  cosmetic:** the shared `makeState(5)` fixture in `tests/triggered_operations.test.ts` has only one free
  slot (10 brigades → `getMaxOperationSlots = 1`), so a def placed before Posavina would win the slot and
  break those tests. Placed after Posavina, the window below never competes with another def in the same
  turn.
- **planning_duration:** `2` (mirrors `Operation Kotor Varos`).
- **staging_osid:** `op:donji_vakuf:jemanlici` (RS at t0, adjacent to the town).
- **`min_attack_outcome: 'repulsed'`** — mirrors the authored `Operation Donji Vakuf` on the same
  objective and corps (`pre_planned_operations.ts:1064`). It is a per-operation attack-admission threshold,
  **not** a striking-power bonus, immunity or victory multiplier, and it changes no engine-wide threshold.
  Stated explicitly because it is the one field that makes this op no stricter than the op it pre-empts.
- **omitted deliberately:** `execution_attack_power_mult` (the late op's 1.65 is NOT imported),
  `require_all_axes_ready`, `prestage_from`, `army_hq_op_id`, `army_hq_only`.

## 2. Participants

One axis (`donji_vakuf_local`), brigades in authored order:

1. `rs_19th_krajina_light_infantry` — anchor. Home Donji Vakuf; at `op:donji_vakuf:jemanlici` at t0
   (adjacent to the town); personnel 1000, active, not disrupted, no movement state at t2.
2. `rs_31st_light_infantry` — home Donji Vakuf; at `op:jajce:grdovo` at t0; personnel 1000; marches the
   legal RS route (`grdovo → babin_potok_2 → kutanja → pribraca_2 → jemanlici`). Expected to become a
   delayed donor for the opening attack; the anchor opens.

Both are the repository's own authored **Donji Vakuf sector** brigades (`pre_planned_operations.ts`
Operation Donji Vakuf block comment; BB2 printed p.330 places "the 19th at Donji Vakuf"). The 16th Krajina
Motorized is **excluded** (Banja Luka formation, not placed in this sector in 1992, and only available
because of engine timing after Corridor).

## 3. Eligibility / window

```
trigger: (state, turn) => turn >= 2 && turn <= 6
    && hasEnemyObjective(state, 'RS', ['op:donji_vakuf:donji_vakuf_2'])
```

- Turn 2 = 20 April 1992; turn 6 = 18 May 1992 — the **authored opportunity window** around the documented
  17 April town takeover and the start of the documented May–September municipality window. The window and
  the 19th+31st pairing are themselves the authored abstraction of a police-led local action; the record
  dates the *town* to 17 April and attests the two brigades from a June-1992-span OOB, so this is a
  deliberately labelled approximation, not a claim of the exact police action.
- **One-shot** via `triggered_operations_accepted`. If the town is already RS, or no slot / no legal force /
  infeasible launch exists in the window, the offer does **not** fire. It cannot guarantee a launch.
- Bounded so it never competes with `Operation Kotor Varos` (t≥10) or any later def.

## 4. Intended mission

A single objective, `op:donji_vakuf:donji_vakuf_2`. The operation is a normal `sector_attack`
(`buildCorpsOperation(..., isPrePlanned=false, ...)`), occupies on a resolved `decisive_victory` /
`victory` / `costly_victory` outcome, and writes control only through the ordinary resolver
(`attack_resolution_osid.ts`). No `occupies_on_victory:false` (that is the probe path).

## 5. Expected causal effect

The 19th, already adjacent, is offered a **capturing mission** (an attempt, not a capture) against the town
in the turn-2..6 window, instead of the town being left to the w30 authored sweep. Whether it launches and
then takes and holds is resolved by the ordinary admission gates and combat.

**What the admission gate actually sees (corrected).** `evaluateLaunchFeasibility` derives defenders only
from `getStandingOgDefenseBrigadeIds(sector)` = `sector.assigned_brigade_ids` (`standing_og_defense.ts:13-17`).
At scenario load the town sits in an ARBiH sector whose only assigned brigade is `arbih_705th_slavna_mountain`
(≈440 personnel at `op:bugojno:kula_2`) — **not** the militia that the n396 w5 battle log records as the
defender (`defender_kind:'militia'`). The gate therefore scores a named ARBiH brigade; a
`defender_power_too_high` refusal is a **normal, acceptable outcome**, and the militia observation is
context for what a resolved battle may look like, not the gate input. This is the intended early,
contingent, ordinary action path the withdrawal left OPEN.

## 6. Failure conditions (all acceptable, all reported)

- No free slot, or `evaluateLaunchFeasibility` returns `defender_power_too_high` → **no launch**; a trace row
  is recorded.
- Fewer than 2 eligible participants → `build_insufficient_participants` → no launch.
- Attack repulsed / stalemate → no capture.
- Capture then loss → reported.
- Failure to launch in the window is a **failed hypothesis**, not a reason to escalate.

### 6a. Commitment risk — disclosed, evidenced, and tested (required by review)

`buildOperation` screens only Army-HQ elites against already-committed formations
(`triggered_operations.ts:947`); for ordinary brigades it checks eligibility/personnel/disruption/in-transit
(`:970-981`) but **not** membership in another live operation. `validateOpAtInjection` Check F detects only a
shared **objective**, not a shared brigade. So if a bot probe already held the 19th or 31st when
`checkTriggeredOperations` runs, the post-turn `assertOperationLifecycle` would emit
`operation.participant_double_committed` and abort the run. This exposure is pre-existing and is shared by
`Operation Kotor Varos`; no engine change is made or permitted.

Mitigating facts, verified rather than assumed:

1. **Order.** `check-triggered-operations` (`war_phases.ts:2075`) runs **before**
   `generate-bot-brigade-orders` (`:2625`) in the same turn, so the triggered op claims its brigades before
   the commander/probe path selects; committed brigades are then excluded from that path.
2. **Evidence.** In the comparison run `n403` (`operation_aars.json`), the 19th and 31st appear in **no**
   1KK operation through t39. The early emergent 1KK ops use other brigades (`rs_1st_gradika`,
   `rs_11th_dubica`, `rs_11th_mrkonji`, `rs_6th_sanske`, etc.). The 19th/31st are committed only to the
   authored Operation Donji Vakuf (w30), which is sequential and screens committed brigades at injection.

The focused test adds an assertion that, after `checkTriggeredOperations` admits the new op from a
representative state, `assertOperationLifecycle(state)` reports **no** `participant_double_committed`,
`participant_missing` or `participant_inactive` issue. If the run ever aborts on that invariant, it is a
reported failure, not a reason to weaken the check.

## 7. Allowed files / fields

| File | Change |
|---|---|
| `src/sim/combat/triggered_operations.ts` | **one** new `TriggeredOpDef` object in `TRIGGERED_OPS_RAW` |
| `tests/triggered_operations.test.ts` | reconcile the hard catalog pin: count `7 → 8` and the ordered name list |
| `tests/donji_vakuf_local_action.test.ts` (new) | focused admission / non-admission assertions via the production entry point |

**Not touched:** `pre_planned_operations.ts`, combat math, occupation policy, probes, events, references,
initial control, personnel, equipment, multipliers, thresholds, baselines, `main`, tags, viewer.

## 8. Boundaries confirmed up front

- No event `control_change` / flag / initial-control repaint / scripted surrender / target-specific
  multiplier or immunity / new corps / new formation / new slot / probe-occupation change.
- The event-flip guard `tests/donji_vakuf_no_authored_takeover.test.ts` is untouched and must keep passing.
- The authored 1KK queue (Prijedor → Corridor → Jajce → Donji Vakuf) is not reordered or accelerated; the
  town is not removed from the later op. Any change to later progression is reported.

## 9. Known reconciliation / residual (from the specialist consultation)

- Hard pin `tests/triggered_operations.test.ts:127-139` must be reconciled (count + name).
- The 31st is a delayed donor; launch feasibility counts it at full value regardless of distance (existing
  engine semantics, not introduced here).
- **Baseline-hash scope (corrected).** `recordWatchedOperationTrace` writes on the blocked paths too
  (`triggered_operations.ts:1285-1288`, `:1332-1335`, `:1350-1354`, `:1358-1363`, `:1384-1388`), and
  `watched_operations` is serialized. Because the trigger is true for every turn in 2–6, serialized state
  changes in that window **whether or not the operation launches**. The 8 advisory `apr1992_188w` baseline
  hashes will therefore move if the change is run at 188w. Per packet: **no refresh** — the drift is
  owner-visible and accepted for this experiment, not blessed.
- Later territorial outcomes are **NOT MEASURED / DEFERRED**.
