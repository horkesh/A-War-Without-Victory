# HVO Opportunity-Catalog Op Execution — Deep Audit

**Date:** 2026-05-22
**Scope:** Read-only investigation. Why HVO opportunity-catalog operations spawn,
attach 5 brigades, pass force-ratio gates (~2.24), pass all 10 axis launch
predicates — and then execute zero attacks for 8+ turns, ending with
`recovery_reason: no_logged_attempt` and `capture_provenance: no_objectives_held`.

**Forensic runs:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1972/`
(failure case) and `…__n1968/` (Cincar Phase 1 partial-success comparison).

**Spec target:** identify the engine mechanism that decides "this turn produced no
attack", the contract a brigade must satisfy to issue an attack inside an op,
whether the engine moves brigades during execution, and the smallest-surface fix.

---

## 1. Pattern recap (forensics)

From `operation_aars.json` for n1972 (extracted programmatically):

| Op | t_start | t_end | Δt | force_ratio | Σ attacks | outcome | recovery_reason | capture_provenance |
|---|---:|---:|---:|---:|---:|---|---|---|
| Operation Jackal (HRHB) | 8 | 14 | 6 | 2.42 | 2 | success | completed | logged_capture |
| Operation Jajce (VRS) | 7 | 15 | 8 | 4.32 | 1 | partial | max_failures | logged_capture |
| Cincar / Kupres P1 (HRHB) | 132 | 149 | 17 | 1.48 | 2 | partial | max_failures | logged_capture |
| **Cincar Phase 2 (HRHB)** | **148** | **156** | **8** | **2.24** | **0** | **failure** | **no_logged_attempt** | **no_objectives_held** |
| **Mistral 1 (HRHB)** | **160** | **163** | **3** | n/a | **0** | **failure** | **brigade_attrition** | **no_objectives_held** |
| **Jajce Recovery (HRHB)** | **178** | **185** | **7** | **3.00** | **0** | **failure** | **no_approach_osid** | **no_objectives_held** |

Key new evidence: **Jajce Recovery's `recovery_reason` is literally
`no_approach_osid`**, not `no_logged_attempt`. The string maps 1:1 to the
launch-gate failure at `sector_offensive_launch_helpers.ts:594/693/717`. So at
least one of the failing HVO ops never even cleared the *opening-attack
feasibility gate* — it failed silently inside the launch helper while the
catalog spawn step had already pushed it into `phase: 'execution'`.

Cincar Phase 2 and Mistral 1 are the more interesting cases — they cleared the
opening-attack gate (no `no_approach_osid` reason), but produced zero attacks
across their entire execution window.

`final_strength == initial_strength` for Cincar Phase 2 (10,900 → 10,900) and
nearly so for Jajce Recovery (5,839 → 8,905, the rise being reinforcement /
replacement inflow, not combat). Mistral 1 collapsed (8,690 → 2,800) but that's
attrition charged elsewhere — not combat under this op's flag.

---

## 2. "Stalled" classifier — where it lives

Two distinct uses of the word "stalled":

### 2.a Axis-level `status = 'stalled'` (the real classifier)

`src/sim/combat/sector_offensive.ts` lines **998, 1276, 1322, 1328, 1343, 1372,
1996**. Every site sets `axis.status = 'stalled'` from inside
`updateMultiAxisResults()` / its legacy-flat sibling.

The five distinct triggers in order of relevance to HVO ops:

| Line | Trigger | Plain English |
|---:|---|---|
| 998 | `axis.launch_blocker = 'recent_catastrophic_losses_at_objective'` | Last engagement on this axis was a wipe-out; refuse another assault. |
| 1276 | `consecutive_catastrophic_on_current >= MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT` | Three catastrophic outcomes in a row on current objective. |
| 1322 | `!anyMoved && attack_attempt_count === 0 && idle_execution_turn_streak >= idleStallThreshold (4 for non-probe)` | **THIS IS THE HVO FAILURE MODE.** No movement, no attack ever attempted, four idle turns in a row. |
| 1328 | `movement_only_execution_turns >= MAX_MOVEMENT_ONLY_EXECUTION_TURNS` | Brigades marching but never attacking objectives within the cap. |
| 1343 | `failure_count >= MAX_TOTAL_FAILURES` | Backstop after many attacks all failed. |
| 1372 | `axisFailures >= MAX_OPERATION_ZERO_PROGRESS_FAILURES && axisAttempts >= 1` | Per-axis early abort, but only if AT LEAST ONE attempt was logged. |
| 1996 | Axis brigades all destroyed / left → axis stalls to keep aggregation honest. | Brigade attrition. |

The HVO Phase-2/Mistral-1 failure mode matches **line 1322 exactly**: zero
moves, zero attack attempts, idle_streak ≥ 4. This is also the reason the AAR
recovery_reason resolves to `no_logged_attempt` via
`sector_offensive.ts:526/528` (`attack_attempt_count > 0 ? 'max_failures' :
'no_logged_attempt'`).

### 2.b Notable-events `'stalled'` tag in AAR

`src/sim/combat/operation_aar.ts:484` — a per-turn audit tag, fires when
`op.phase === 'execution' && attacksThisTurn === 0` for 3 turns in a row. This
is the AAR notation seen on every execution row for Phase 2/Mistral 1/Jajce
Recovery. **Cosmetic; does not change op state.** The real classifier is 2.a.

---

## 3. What produces an attack — the brigade contract

`updateMultiAxisResults()` at `sector_offensive.ts:1226–1244` reads the brigades
in `axis.assigned_brigades` and decides on the turn what happened. The four
predicate evaluations:

```ts
const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
const anyAttackedObjective = axis.assigned_brigades.some(bid => {
    const b = state.military.formations?.[bid];
    if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
    return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
});
const anyAttackedAnything = axis.assigned_brigades.some(bid => {
    const b = state.military.formations?.[bid];
    return b != null && (b.posture === 'attack' || b.posture === 'assault');
});
const anyAttacked = anyAttackedObjective || anyAttackedAnything;
const anyResolvedAxisBattle = (axis.battles_this_turn ?? 0) > 0;
const anyMoved = axis.assigned_brigades.some(bid => {
    const movState = state.military.brigade_movement_state?.[bid];
    return movState?.status === 'in_transit' || movState?.status === 'packing';
});
```

So for THIS axis to register **anyAttackedObjective** on a given turn, **at least
one assigned brigade** must satisfy:

1. **`brigade.posture === 'attack' || 'assault'`** (set by an earlier order
   from `bot_brigade_eval_attack.ts` / `bot_brigade_eval_hold.ts` —
   counter-attack at line 563, opportunistic at 639, uncontested walk-in at
   840, **sector-attack participation at 317 (`evaluateSectorAttack` direct
   attack on current objective) and 439 (attack-through fallback)**).
2. **`brigade.location_osid`** is in `adjacentFriendlyOsids` for the current
   objective — i.e. the brigade is standing on an OSID that some sub-segment
   of one of THIS CORPS's front sectors lists as a friendly_osid where the
   sub-segment's enemy_osids include `currentObjective`.
3. **`axis.battles_this_turn > 0`** — confirms an actual attack resolution
   landed (not just a posture flag).

`anyAttackedAnything` is the looser tier: posture=attack/assault anywhere, even
on an intermediate target. Pairs with `anyResolvedAxisBattle` (which requires
`axis.battles_this_turn > 0`) to mark **"approach"** turns. These count as
movement-only progress, do not increment `failure_count`, and don't fire the
idle-stall.

**Conclusion:** the contract a brigade must hit to get the engine to recognize
"this op attacked this turn" is **(posture set to attack/assault by the brigade
bot)** AND **(brigade physically standing on a friendly OSID listed in the
parent corps's front sector sub-segment that touches the objective)** AND
**(an attack resolution actually landed)**. All three are required.

---

## 4. Movement during execution — is it the engine's job?

**Yes, but indirectly, and gated heavily.** The op-execution phase does not
dispatch movement directly. Instead, every turn `executeFactionDirectives()`
runs in the brigade-bot loop (`bot_brigade_ai_osid.ts`), which routes
op-assigned brigades through `evaluateSectorAttack()` in
`bot_brigade_eval_attack.ts:152–453`. That evaluator is what emits
`column_march_orders` (the only movement type the stall-detector recognizes
via `anyMoved`).

The three execution-phase decisions for an op brigade in `evaluateSectorAttack`
(line 229–449):

### 4.a If `tacticallyAdjacentToObjective` is true (line 241–243)

`getTacticalAdjacentOsids(state, loc, adjacency).includes(currentObjective)`.

The brigade is already on an OSID one tactical-graph hop from the objective.
Run combat predictor → if `predicted_outcome ≥ probeThreshold` (default
costly_victory) → **emit posture='attack' or 'assault' (cohesion ≥ 60) and
`attack_orders[brigade.id] = currentObjective`**. The brigade now attacks.

If not adjacent → fall through.

### 4.b March toward an approach OSID (line 336–367)

`getSectorOffensiveApproachOsids(state, activeOp, faction, adjacency,
reverseMap, brigade.id)` — defined at `bot_brigade_ai_osid.ts:299–323`.

This iterates objectives starting at `axis.current_objective_index` and for
each one collects the **tactical-graph neighbors that are
faction-controlled-or-allied**. Breaks at the first objective with at least
one friendly neighbor. Returns the set.

If non-empty: Dijkstra `findNearestFriendlyOsidDestination` through friendly
territory to the nearest approach OSID. Sets `column_march_orders[brigade.id]
= approachDest` and posture='defend'. The brigade now marches via the column
system, `brigade_movement_state` flips to `in_transit`, and the next turn's
`anyMoved` predicate sees it. Idle-stall does not fire while marching, but the
movement-only counter `movement_only_execution_turns` ticks toward
`MAX_MOVEMENT_ONLY_EXECUTION_TURNS`.

If `approachOsids.size === 0`: fall through.

### 4.c Attack-through fallback (line 370–448)

Only if no friendly approach exists. Build `objectivePathDistances` — the
shortest hop count from each OSID controlled by `objectiveController` to the
objective. Find the brigade's distance to the objective. Filter
`predictAllAdjacentTargets` to (a) OSIDs controlled by the same faction as the
objective AND (b) one hop closer than current location AND (c) below
MAX_ATTACKERS_PER_TARGET AND (d) prediction passes intermediateThreshold. If
any qualify → posture='attack'/'assault', attack the intermediate. Else →
**posture='defend' only**. No move. No attack. Brigade stands.

### 4.d The hidden failure path for HVO opportunity-catalog ops

For HVO Kupres-zone and Glamoč-zone ops:

- Objectives include `op:kupres:donji_malovan`, `op:kupres:kupres_2`,
  `op:kupres:goravci`, `op:kupres:novo_selo_2`. These are deep inside RS
  territory.
- HVO friendly OSIDs in Tomislavgrad / Livno area do not have a *tactical-graph
  edge* (osid_adjacency + war_front_edges_osid) directly into any of these
  objectives until a sub-segment is built.
- The launch gate at `sector_offensive_launch_helpers.ts:338` uses the same
  `buildOsidAdjacencyFromFrontEdges(state)` — which scans **front edges only**.
  If the HVO front against RS in this zone has zero authored front edges at
  spawn time, the gate falls through to `collectSectorSubsegmentApproachOsids`
  (line 322). That helper passes as soon as **any** sub-segment of any HVO
  corps lists the objective in `enemy_osids`. The sector framework is fed by
  brigade presence, so once 5 brigades pile into Tomislavgrad and the sector
  system extends its sub-segments to enemy-adjacent OSIDs, that gate passes.
- But then per-turn `evaluateSectorAttack` calls
  `getSectorOffensiveApproachOsids` which uses **`getTacticalAdjacentOsids`**,
  which is `adjacency.get(objective) ∪ war_front_edges_osid` — **not** the
  sector sub-segment view. If `adjacency.get('op:kupres:donji_malovan')` only
  yields enemy-controlled neighbors, the set is empty.
- The op then sits in 4.c (attack-through), but `objectivePathDistances` only
  finds friendly-path distances from OSIDs controlled by RS (objectiveController),
  and the brigade is at livno_2 (HRHB-controlled), so `locObjectiveDistance` is
  `undefined`. The intermediate filter on line 423 (`locObjectiveDistance !==
  undefined`) drops every candidate. `intermediateTargets.length === 0`. Brigade
  receives posture='defend' (line 447). No move, no attack.
- All 5 brigades do this same thing every turn. `anyAttacked = false`,
  `anyMoved = false`, `axis.idle_execution_turn_streak += 1` four times, axis
  stalls. Op ends in `no_logged_attempt`.

This explains why Op Jackal **works**: it targets `op:mostar:hodbina_2` and
`op:stolac:rotimlja_2` from staging in the southeast Herzegovina corps zone
where the HVO-VRS sector framework already has authored front sub-segments
**with friendly_osids on the HVO side touching those exact objectives**. Phase
4.a fires from turn 1 (`tacticallyAdjacentToObjective === true`) and the
brigades attack directly. Force ratio 2.42 plus direct adjacency = 2 captures in
6 turns.

Cincar Phase 1 (n1968 partial success) captured `op:kupres:bucovaca` because
bucovaca was the closest objective and one HRHB brigade was already at a Kupres
sub-segment friendly_osid adjacent to bucovaca. Once bucovaca fell the next
objectives (`kupres_2`, `donji_malovan`, `novo_selo_2`) sit further inland and
the same approach-set-empty pattern kicked in — hence partial outcome.

---

## 5. Why launch-gate ≠ execution-gate

This is the structural bug. Three different adjacency views are involved:

| Code site | Source | Used for |
|---|---|---|
| `collectObjectiveApproachOsids` (launch-helper:338) | `buildOsidAdjacencyFromFrontEdges` → `state.military.war_front_edges_osid` | Opening-attack feasibility gate (the launch test that returns `no_approach_osid`) |
| `collectSectorSubsegmentApproachOsids` (launch-helper:322, fallback inside 338) | `state.military.corps_front_sectors[*].sub_segments[*]` | Fallback when no front edges exist for this corps |
| `collectAdjacentFriendlyOsids` (sector_offensive.ts:1406) | Same sub-segment view, but scoped to the op's `corpsId` only | Per-turn "did this brigade attack the objective?" — the `anyAttackedObjective` predicate |
| `getSectorOffensiveApproachOsids` (bot_brigade_ai_osid.ts:299) → `getTacticalAdjacentOsids` (tactical_adjacency.ts:14) | `osid_adjacency` graph ∪ `war_front_edges_osid` | Per-turn "which OSIDs should this brigade march to" — controls movement |

Notice the asymmetry: the launch gate can pass via the **sub-segment fallback**,
and per-turn "did you attack the objective" reads the **sub-segment view**. But
per-turn "where should you march to attack it" reads the **tactical adjacency
graph**, which does **not** include sub-segment friendly_osids. If the
sub-segment system has lit up an approach OSID that has no corresponding
osid_adjacency edge or front-edge edge to the objective, the brigade brain
cannot reason about it as an approach. So it never marches. So it never gets
into a tactical-adjacent position. So it never attacks. So no battle resolves.
So axis.battles_this_turn is 0. So idle_streak ticks. So the op stalls.

---

## 6. Probable root causes (HVO-specific)

1. **HVO front edges into RS-controlled Kupres / Glamoč / Bosansko Grahovo are
   absent or under-authored** in `war_front_edges_osid`. The Federation–RS
   front in mid-Bosnia and the corridor zone is heavily wired, but the HVO
   western salient against RS in this region is thinner (because most HVO ops
   in spec history were against ARBiH or were RBiH-coalition ops). Sector
   sub-segments fire because brigade presence triggers them, but no underlying
   front edge wires the objective into the tactical graph that the brigade
   brain reads.
2. **OSID adjacency graph (`osid_adjacency.ts`) does not contain a "soft"
   adjacency edge** between, say, `op:livno:livno_2` and `op:kupres:donji_malovan`.
   It cannot — those are different operational settlements separated by
   contested terrain. The whole point of front_edges is to inject the missing
   connections. If they're not authored, the brigade brain sees a dead end.
3. **Catalog ops use objectives the live front cannot reach.** Cincar Phase 2's
   four objectives all sit inland of the front line that opened in Phase 1.
   Phase 2 essentially says "now do the deep push" — but no mechanism extends
   the front to the next layer in lock-step with the op. The front-edge
   advance system (if any) does not auto-extend on objective capture; it's
   driven by the sector framework's reaction to brigade presence on the
   captured OSID. If brigades don't advance onto bucovaca before being
   reassigned to Phase 2, Phase 2 inherits the launch contract with no
   approach.
4. **Jajce Recovery's `no_approach_osid` recovery_reason proves the
   non-fallback path can also fail**: the front-edge graph alone yielded no
   friendly neighbor for any of those 8 objectives, and the sub-segment
   fallback also returned nothing. So that op never even passed the launch
   gate — it spawned, drained brigades into staging, then got
   `recovery_reason = no_approach_osid` at first execution turn.

---

## 7. Recommendation matrix — smallest-surface fix

### 7.a Engine fix (largest blast radius, most correct)

Unify the per-turn brigade approach view with the launch-gate sub-segment
fallback. In `getSectorOffensiveApproachOsids` (`bot_brigade_ai_osid.ts:299`),
augment the per-objective neighbor lookup so that when
`getTacticalAdjacentOsids` returns no friendly neighbors, fall through to a
sub-segment scan equivalent to `collectAdjacentFriendlyOsids` (sector_offensive
.ts:1406). That gives the brigade brain the SAME approach set the launch gate
used.

Concretely: read `state.military.corps_front_sectors[*].sub_segments[*]` where
the sub-segment touches the objective; for each `friendly_osid`, only add it to
`approachOsids` if it is faction-controlled-or-allied. Keep the existing
tactical-adjacency path as the primary, sub-segment as fallback — matches the
launch gate's logic exactly.

Risk: medium. This widens the set of legitimate approach OSIDs for every
op-execution brigade decision, potentially changing march behavior for ops
that previously were silently stuck. Will need a 40w calibration validation.
Also need to consider whether the brigade can actually *reach* the
sub-segment-derived approach OSID — `findNearestFriendlyOsidDestination` is a
Dijkstra on faction-controlled OSIDs, so disconnected approach sets will be
silently filtered. That's fine: it means the brigade still stalls, but at
least we expanded the search space honestly.

### 7.b Catalog tweak (smallest blast radius)

Author front edges in `war_front_edges_osid` for the HVO–VRS interface in the
Kupres / Glamoč / Bosansko Grahovo / Jajce zones. Specifically wire each
catalog op's objectives to at least one HVO-controlled OSID via a front edge
at the moment the op spawns. This is a data fix in
`operation_opportunity_catalog_*.ts` or in the front-edge authoring layer.

Risk: low for the named ops, but each new op needs the same hand-wiring →
brittle. Doesn't fix Jajce Recovery (objectives are too far from front).

### 7.c Different op-design pattern (medium blast radius, structurally cleanest)

For "deep push" opportunity-catalog ops, require that the catalog spec includes
an **explicit approach_osid sequence** per axis. The catalog already has
`staging_osid` — add `approach_path: [osid, osid, …]` where the first element
is a tactically-adjacent friendly OSID to the first objective at spawn time.
Validate at spawn that approach_path[0] is tactically adjacent to objectives[0]
using `getTacticalAdjacentOsids`. If not, the op spawns into a `pre_approach`
sub-phase that runs a deterministic column march to approach_path[0] for N
turns before transitioning to execution.

This is the correct long-term fix because it makes the catalog reflect the
real-war operational logic: HVO Phase 2 against Kupres town required first
*advancing the front* (Phase 1 captures bucovaca, secures the approach), then
launching the city assault. The current engine pretends Phase 2 launches from
the same staging as Phase 1.

### 7.d Recommended ordering

1. **Author front edges (7.b)** for the four named failing ops as the
   immediate unblock. Get HVO opportunity-catalog ops actually firing in
   calibration.
2. **Implement engine unification (7.a)** so future catalog ops don't fail
   silently when the catalog author forgets to wire front edges. The engine
   should match its own gate's permissiveness.
3. **Long-term, evolve to (7.c)** — make multi-phase catalog ops express their
   approach sequence explicitly. Multi-axis already encodes this for
   simultaneous prongs; multi-phase needs the equivalent for sequential
   pushes.

---

## 8. Reportback fields

(a) **What determines "stalled" vs "attack" per turn**:
`updateMultiAxisResults` in `src/sim/combat/sector_offensive.ts` lines
1226–1330. Three predicates per axis per turn: `anyAttackedObjective` (posture
∈ {attack, assault} + brigade at adjacent friendly OSID per
`collectAdjacentFriendlyOsids` sector_offensive.ts:1406), `anyAttackedAnything`
(posture ∈ {attack, assault} anywhere), `anyMoved` (`brigade_movement_state`
status `in_transit` or `packing`). When all three are false for 4 consecutive
turns, line 1322 sets `axis.status = 'stalled'`.

(b) **Required state for an op to issue an attack**: at least one brigade in
`axis.assigned_brigades` must (i) have `posture === 'attack' || 'assault'`,
(ii) be at a `location_osid` listed in `friendly_osids` of a sub-segment of
THIS CORPS's front sectors where the sub-segment lists the objective in
`enemy_osids`, AND (iii) the per-turn attack resolution must actually land
(`axis.battles_this_turn > 0`).

(c) **Movement during execution**: yes, but indirect. The engine does not
move op brigades — instead, every turn `executeFactionDirectives()`
(bot_brigade_ai_osid.ts) runs `evaluateSectorAttack` (bot_brigade_eval_attack
.ts:152–453) for each op-assigned brigade. That evaluator emits
`column_march_orders` toward an approach OSID computed by
`getSectorOffensiveApproachOsids` (bot_brigade_ai_osid.ts:299), which uses
`getTacticalAdjacentOsids` (tactical_adjacency.ts:14). If the approach set is
empty AND the attack-through intermediate filter rejects all candidates, the
brigade gets `posture='defend'` and stays put (bot_brigade_eval_attack.ts:447).

(d) **Root cause one-liner**: HVO catalog ops pass the launch gate via the
sub-segment fallback (sector_offensive_launch_helpers.ts:322) but fail
per-turn movement because the brigade brain only reads the tactical-graph
view (`osid_adjacency` ∪ `war_front_edges_osid`), and HVO–VRS front edges
into Kupres/Glamoč/Jajce-deep are under-authored — so brigades have no
march target and `posture='defend'` for the entire execution window.

(e) **Smallest-surface-area fix**: tier 1 — author the four missing
HVO-VRS front edges (catalog/data tweak, ≤30 lines). Tier 2 — unify
`getSectorOffensiveApproachOsids` with the sub-segment fallback so the brigade
brain sees what the launch gate sees (engine fix, ~30 lines in
`bot_brigade_ai_osid.ts`). Tier 3 — add `approach_path` to catalog op
schema for sequential phase ops (medium-term refactor).

(f) **Memo size**: see `wc -c` after write.

---

## 9. Files cited

- `src/sim/combat/sector_offensive.ts` — 998, 1226–1330, 1322, 1406, 526/528,
  505–528
- `src/sim/combat/sector_offensive_launch_helpers.ts` — 322, 338–362, 594, 693,
  715–718, 771–773
- `src/sim/combat/bot_brigade_ai_osid.ts` — 299–323
- `src/sim/combat/bot_brigade_eval_attack.ts` — 152–453, 241–243, 336–367,
  370–448, 447
- `src/sim/combat/brigade_posture.ts` — 135–215
- `src/sim/combat/tactical_adjacency.ts` — 14–25
- `src/sim/combat/operation_aar.ts` — 484
- `src/state/game_state.ts` — 281, 361
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1972/operation_aars.json`
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1968/operation_aars.json`

End of memo.
