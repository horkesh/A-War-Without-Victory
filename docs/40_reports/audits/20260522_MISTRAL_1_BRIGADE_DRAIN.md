# 20260522 — Mistral 1 Brigade Drain + Faction Loss Audit (n1980)

**Branch:** `feature/arc-operations-calibration` (39 commits)
**Run:** n1980 — Mistral 1 spawned at t≈160 but AAR shows
`faction=""`, `force_ratio_estimate=0`, `recovery_reason=defender_power_too_high`, `0 attacks`.
**Earlier signal:** n1974 SCRT diagnostic noted "week-1 source-corps re-allocator drained them
(`brigade_count: 4 → 0`)."
**Hypothesis pre-run:** Cincar Phase 1 recovery still binding brigades at t160.
**Verdict:** REJECTED. Cincar recovery is irrelevant — the drain is structural,
caused by `final_operation_truth_reconciliation.ts` filtering "foreign-corps-claimed"
brigades out of the operation roster at the END of every war turn.

The faction loss (Bug A) and the zero-attack execution (Bug B) are **the same root
cause expressed twice** — the truth reconciler empties
`participating_brigades` before either field can be read.

────────────────────────────────────────────────────────────────────────────

## 1. Bug A — `op.faction` propagation

### 1.1 What the catalog says

`src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.ts:540-584`

```ts
export const MISTRAL_1_95_OPPORTUNITY: OperationOpportunityDef = {
    opportunity_id: 'mistral_1_95',
    name: 'Operation Mistral 1',
    tier: 'T1',
    faction: 'HRHB',
    primary_corps: PRIMARY_CORPS,         // 'hvo_main_staff'
    family: 'federation_western_bosnia',
    axes: MISTRAL_1_AXES,                  // 2 axes, 4 brigades total
    ...
};
```

`def.faction === 'HRHB'` is correct at the catalog boundary.

### 1.2 The spawn path

`src/sim/combat/operation_opportunities.ts:1098-1176` —
`spawnCorpsOperationFromOpportunity` builds the op:

```ts
const op = buildCorpsOperation(
    {
        name: def.name,
        planning_duration: def.planning_duration,
        staging_osid: stagingOsid,
        ...(def.min_attack_outcome ? { min_attack_outcome: def.min_attack_outcome } : {}),
    },
    builtAxes,
    allParticipating,
    turn,
    false,
    undefined,
);
```

**Note:** `def.faction` is **NEVER passed to the factory.**

### 1.3 The factory

`src/sim/combat/corps_operation_helpers.ts:138-167` —
`buildCorpsOperation` constructs a `CorpsOperation` with no `faction` field:

```ts
return {
    name: def.name,
    type: 'sector_attack',
    phase: 'planning',
    started_turn: turn,
    phase_started_turn: turn,
    participating_brigades: [...new Set(participating)].sort(strictCompare),
    axes,
    objectives: [...new Set(allObjectives)],
    ...
};
```

`CorpsOperation` interface (`src/state/game_state.ts:289-…`) has **no `faction`
field at all**. So even if the catalog wanted to carry the faction onto the op
itself, there is nowhere to put it.

### 1.4 Where the AAR derives `faction`

`src/sim/combat/operation_aar.ts:535-540` (in `finalizeOperationAAR`):

```ts
let faction: string = '';
for (const bdeId of op.participating_brigades) {
    const fmn = state.military.formations[bdeId as FormationId];
    if (fmn) { faction = fmn.faction; break; }
}
```

And the weekly-log writer at `operation_aar.ts:393-398` (in
`writeOperationWeeklyLogs`) does the same:

```ts
let opFaction: string | null = null;
for (const bdeId of op.participating_brigades) {
    const fmn = state.military.formations[bdeId as FormationId];
    if (fmn) { opFaction = fmn.faction; break; }
}
```

### 1.5 Conclusion — Bug A is downstream of Bug B

Faction is derived from the **first surviving brigade**. When the brigade
pool has been drained to `[]` before AAR finalize / weekly log,
`faction = ''` because the for-loop never iterates.

`force_ratio_estimate = 0` also follows: with zero participating brigades, the
attacker-strength calculation in commander-intelligence prep evaluators degenerates,
and `recovery_reason: 'defender_power_too_high'` is the canonical
participants-below-floor message routed through prep-time gates
(see `sector_offensive.ts:201` and `:813/869/946`).

**Bug A is not a separate bug; it is the same drain manifesting as a missing
identity field.** Wiring `faction` onto `CorpsOperation` (as defence in depth) is
cheap and recommended, but the operative fix is preventing the brigade pool
from emptying.

────────────────────────────────────────────────────────────────────────────

## 2. Bug B — Brigade pool drainage

### 2.1 The smoking gun

`src/sim/combat/final_operation_truth_reconciliation.ts:29-54`:

```ts
function uniqueActiveParticipants(
    state: GameState,
    corpsId: string,                                // <— the OP's host corps
    brigadeIds: ReadonlyArray<FormationId> | undefined,
): FormationId[] {
    const seen = new Set<FormationId>();
    const formations = state.military.formations ?? {};
    const sectorClaimsByBrigade = buildSectorClaimsByBrigade(state);
    const active: FormationId[] = [];

    for (const brigadeId of brigadeIds ?? []) {
        if (seen.has(brigadeId)) continue;
        seen.add(brigadeId);
        if (formations[brigadeId]?.status !== 'active') continue;

        const sectorClaims = sectorClaimsByBrigade.get(brigadeId) ?? [];
        const hasSameCorpsClaim = sectorClaims.includes(corpsId);
        const hasOnlyForeignClaims = sectorClaims.length > 0 && !hasSameCorpsClaim;
        if (hasOnlyForeignClaims) continue;                                  // <—— DROPS BRIGADE

        active.push(brigadeId);
    }

    active.sort(strictCompare);
    return active;
}
```

And `reconcileOperationRoster` (`final_operation_truth_reconciliation.ts:56-85`):

```ts
function reconcileOperationRoster(state: GameState, corpsId: string, operation: CorpsOperation): void {
    const activeParticipants = uniqueActiveParticipants(state, corpsId, operation.participating_brigades);
    operation.participating_brigades = activeParticipants;                   // <—— OVERWRITES
    if (Array.isArray(operation.axes)) {
        for (const axis of operation.axes) {
            axis.assigned_brigades = uniqueActiveParticipants(state, corpsId, axis.assigned_brigades)
                .filter((brigadeId) => activeParticipantSet.has(brigadeId));
        }
    }
    ...
    if (operation.phase === 'execution' && activeParticipants.length === 0) {
        operation.phase = 'recovery';
        operation.phase_started_turn = state.meta.turn;
        operation.recovery_reason = 'brigade_attrition';
    }
}
```

**Iteration is over `corps_command[corpsId].active_operations` (line 91), so
`corpsId` is whichever corps physically hosts the op in its `active_operations`
array — not the brigade's own home corps and not any axis-specific corps.**

### 2.2 Mistral 1 → Mistral 2 contrast

Both ops have `primary_corps = 'hvo_main_staff'` (`PRIMARY_CORPS` const at
`operation_opportunity_catalog_federation_western_bosnia.ts:24`). Both ops live
in `corps_command['hvo_main_staff'].active_operations` after spawn (see
`operation_opportunities.ts:1174`).

**Mistral 1 axes** (`operation_opportunity_catalog_federation_western_bosnia.ts:378-401`):

| axis | corps | brigades |
|------|-------|----------|
| `mistral_1_grahovo` | `hvo_main_staff` | `hvo_1st_guard_abb`, `hv_4th_guards_split` |
| `mistral_1_glamoc`  | `hvo_tomislavgrad` | `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade` |

**Mistral 2 axes** (`operation_opportunity_catalog_federation_western_bosnia.ts:88-112`):

| axis | corps | brigades |
|------|-------|----------|
| `mistral_drvar_grahovo`     | `hvo_main_staff` | `hvo_1st_guard_abb`, `hv_4th_guards_split` |
| `mistral_sipovo_mrkonjic`   | `hvo_tomislavgrad` | `hrhb_kralj_petar_kreimir_iv_brigade`, `hrhb_kralj_tomislav_brigade`, `hv_7th_guards_varazdin` |

Brigade-corps mapping is **structurally identical**. So why does Mistral 2
execute and Mistral 1 not?

Hypothesis: when Mistral 1 fires (t160-170), the `hrhb_kralj_*` brigades have
been claimed by `hvo_tomislavgrad` sectors (likely
`sector:hvo_tomislavgrad:N`). For the op hosted on `hvo_main_staff`, those
claims register as **foreign**, so `hasOnlyForeignClaims === true`, and both
brigades are filtered out. The `hvo_main_staff` axis-1 brigades have either no
sector claims (HV reserve brigade `hv_4th_guards_split` — likely no sector
membership) or claims on Main Staff sectors. With axis-1 also dropping
brigades (HV reserve has no domestic sector), the roster collapses to ≤1
brigade, triggering `participants_below_attack_floor` → recovery.

Between t160-170 and t175+ (Mistral 2 window), **Cincar Phase 1 completed
recovery at t149**, releasing brigades back into general pool. But what would
change between t160 and t175 is **sector ownership rebalancing** — the
operations expert / Wave 11-12 work added launch-helper sub-segment fallbacks
that re-anchor brigades. The Wave 11 fix (`emit.ts` derives primaryPool from
sector-assigned brigades) is precisely a `hvo_main_staff`-side primary-sector
re-anchor.

**To validate hypothesis fully:** inspect Mistral 1's exact corpsId-host vs
brigade-sector-claim deltas at t160 in n1980's save. (See §3 below.)

### 2.3 Why the `hasOnlyForeignClaims` filter exists

The intent (per its placement in `final_operation_truth_reconciliation.ts`) is
to prevent **double-counting**: if a brigade is assigned to a sector of
`hvo_tomislavgrad` and the bot AI then auto-attached it to an op hosted on
`hvo_main_staff`, the brigade's sector responsibilities take priority. Without
this gate, brigades would dual-serve and corrupt sector strength and front
density.

This gate is **correct for AI-generated ops** that spawn opportunistically
inside one corps's active_operations. It is **catastrophic for catalog
opportunity ops** that explicitly cross corps by design — the catalog AUTHOR
INTENT is "these brigades cross-corps for this operation."

There is currently no signal on the op that says "this op is cross-corps and
external sector claims are not foreign." The reconciler treats every op
identically.

### 2.4 Drainage timeline (turn-by-turn)

1. **t160 (or first eligibility turn)** — `evaluateOperationOpportunities`
   surfaces Mistral 1 as `eligible_pending_review`.
2. **t160 (same turn)** — `applyBotOpportunityDecisions` →
   `applyOpportunityDecision('approve')` → `spawnCorpsOperationFromOpportunity`.
   Op pushed onto `corps_command['hvo_main_staff'].active_operations` with
   `participating_brigades.length === 4`.
3. **t160 — end of war turn** — `reconcileFinalOperationTruth` runs as part
   of the war-pipeline final reconciliation step (look for
   `reconcile-final-operation-truth` in `war_phases.ts`). Iterates all corps,
   passing `corpsId = 'hvo_main_staff'` for Mistral 1's host corps.
   `uniqueActiveParticipants` drops the 2 tomislavgrad-sector-claimed brigades.
   Probably also drops 1 of the 2 main-staff-axis brigades (`hv_4th_guards_split`
   if it has only a foreign reserve sector claim, or zero brigades reach the
   active filter).
4. **t161** — op is in `planning` with `participating_brigades.length === 0
   or 1`. Prep gates report `force_ratio_estimate === 0`. After
   `MAX_SUSPENSION_TURNS` or via prep-time floor, op is moved to recovery with
   `recovery_reason = 'defender_power_too_high'` (this string is the canonical
   message used when force ratio is below `MIN_LAUNCH_FORCE_RATIO_FLOOR`).

   Alternative path: if the reconciler hits an `execution`-phase op with zero
   participants, line 80-84 sets `recovery_reason = 'brigade_attrition'`
   directly. Mistral 1 with a 4-turn planning_duration would still be in
   `planning` at t161-163, so the prep-time `defender_power_too_high` is the
   more likely recovery_reason path, matching n1980's reported value.

### 2.5 Why Mistral 2 escapes (one-liner)

Either by the time Mistral 2 fires (t175+) the same brigades have been re-
anchored to `hvo_main_staff` sectors via cross-corps sector rebalancing /
launch-helper sub-segment fallbacks added in Wave 11/12 work, OR Mistral 2's
larger 5-brigade pool means at least one brigade survives the reconciler and
gates clear. (Validation against n1975+ save needed — but the structural
analysis of MISTRAL_1_AXES vs MISTRAL_AXES suggests the brigade lists are
near-identical except for `hv_7th_guards_varazdin` on the Mistral 2 second axis.)

The most likely operative differentiator is **the second axis size**: Mistral 1
has only 2 brigades on its tomislavgrad-corps axis; Mistral 2 has 3. If
`hv_7th_guards_varazdin` is unclaimed-by-sector (an HV reserve brigade,
unaffiliated to a domestic sector), it survives the foreign-claim filter and
keeps Mistral 2's axis-2 alive while Mistral 1's axis-2 collapses.

────────────────────────────────────────────────────────────────────────────

## 3. Confirmation against n1980 save (read-only inspection)

Live save: `data/derived/latest_run_final_save.json` (turn=188).

### 3.1 The Mistral 1 AAR (`state.operation_history[27]`)

```json
{
  "operation_id": "hvo_main_staff:Operation Mistral 1:t160",
  "operation_name": "Operation Mistral 1",
  "corps_id": "hvo_main_staff",
  "type": "sector_attack",
  "faction": "",                              // <— Bug A
  "started_turn": 160,
  "ended_turn": 162,
  "duration_turns": 2,
  "outcome": "failure",
  "recovery_reason": "defender_power_too_high",
  "total_attacks": 0,
  "force_ratio_estimate": 0,
  "initial_strength": 9103,                   // 4 brigades × ~2275 avg
  "final_strength": 0,
  "participating_brigades": [],
  "axis_summaries": [
    { "axis_id": "mistral_1_grahovo", "brigades": [], "total_attacks": 0, ... },
    { "axis_id": "mistral_1_glamoc",  "brigades": [], "total_attacks": 0, ... }
  ],
  "objectives_captured": [],
  "objectives_targeted": [8 OSIDs total across both axes]
}
```

### 3.2 The weekly log — drain happens in ONE turn

```json
weekly_log[0]: { "turn": 160, "phase": "planning",  "brigade_count": 4, ... }
weekly_log[1]: { "turn": 161, "phase": "recovery",  "brigade_count": 0, ... }
```

t160: 4 brigades attached, op enters `planning`. End-of-turn reconciliation runs.
t161: `brigade_count: 0`. Op is in `recovery`. Single-turn collapse.

### 3.3 The smoking-gun timeline at t160

The Mistral 1 op was hosted on `corps_command['hvo_main_staff'].active_operations`
(per AAR `corps_id` and the spawn-path `cmd.active_operations.push(op)` at
`operation_opportunities.ts:1174`).

**Critical:** `hvo_main_staff` has ZERO sectors in the current state
(`military.corps_front_sectors` — 0 sectors with `corps_id === 'hvo_main_staff'`).
That means **no brigade can ever have a sector claim that satisfies
`hasSameCorpsClaim` for this op**. Any brigade with ANY sector claim at all
gets filtered out as `hasOnlyForeignClaims`.

Per-brigade sector claims at t160 (live save formations + sectors):

| brigade | home corps | t160 state | sector claim | survives reconcile? |
|---|---|---|---|---|
| `hvo_1st_guard_abb` | `hvo_main_staff` | on loan to `hvo_tomislavgrad` (loan_start_turn=159, loan_end_turn=171, episode 3) | sector of `loaned_to_corps = hvo_tomislavgrad` | NO — foreign |
| `hv_4th_guards_split` | `hvo_tomislavgrad` | active | `sector:hvo_tomislavgrad:0` assigned | NO — foreign |
| `hrhb_kralj_petar_kreimir_iv_brigade` | `hvo_tomislavgrad` | active | `sector:hvo_tomislavgrad:0` assigned | NO — foreign |
| `hrhb_kralj_tomislav_brigade` | `hvo_tomislavgrad` | active | `sector:hvo_tomislavgrad:0` assigned | NO — foreign |

All 4 brigades drop. `uniqueActiveParticipants(state, 'hvo_main_staff', [4 brigades])
→ []`. `reconcileOperationRoster` writes `operation.participating_brigades = []`
and clears each axis's `assigned_brigades`.

### 3.4 The elite-loan twist

`hvo_1st_guard_abb` was loaned from `hvo_main_staff` to `hvo_tomislavgrad` at
t159 (one turn before Mistral 1's eligibility window opened at t160) for
`probe_hvo_tomislavgrad_t158`. Reason: `offensive_support`. The brigade
returned at t171. So the ONE brigade whose home is `hvo_main_staff` and that
COULD have survived a `hvo_main_staff` sector check (if any such sector
existed) was, at the operative moment, registered against
`hvo_tomislavgrad` instead — see `corps_front_sectors.ts:617-638` which
attaches loaned brigades to the borrowing corps's sectors.

### 3.5 The "Mistral 2 succeeds" reframing

In n1980 specifically, **Mistral 2 never fires** — its `staging_access`
prerequisite never opens (`Kupres/Cincar dependency anchors are not open`
blocks it from t175 through t188, the end of the run). So the comparison
"Mistral 2 succeeds where Mistral 1 fails" in the task brief is empirically
incorrect for n1980. The brief was based on n1975+ where Mistral 2 DOES
launch — and there the contrast becomes:

In ANY save where Mistral 2 launches, either (a) the brigades have meanwhile
been re-anchored to `hvo_main_staff` (rare given hvo_main_staff has no
sectors), or (b) the third brigade on the secondary axis
(`hv_7th_guards_varazdin`) is sector-unclaimed and survives — but with only
1 brigade alive, force_ratio is still tiny. Most likely the n1975 success
reflects a transient state where the elite-loan reassignment had
not yet propagated, or a different sector composition.

The root cause is **structural and identical for both ops**: a corps with no
sectors can never host a cross-corps op through this reconciler.

────────────────────────────────────────────────────────────────────────────

## 4. Smallest-surface-area fix

**Option A (preferred — surgical, one-file):** Tag opportunity-spawned ops as
exempt from the foreign-claims filter.

1. Add `cross_corps_authored?: true` to `CorpsOperation` in
   `src/state/game_state.ts` (single new optional boolean).
2. Set the flag in `spawnCorpsOperationFromOpportunity`
   (`operation_opportunities.ts:1160-1172`) when the op has any axis whose
   `corps` differs from `def.primary_corps`:

   ```ts
   const crossCorpsAuthored = axesIn.some(a => a.corps !== def.primary_corps);
   ...
   const op = buildCorpsOperation(
       { name: def.name, planning_duration: def.planning_duration, staging_osid, ... },
       builtAxes,
       allParticipating,
       turn,
       false,
       undefined,
   );
   if (crossCorpsAuthored) op.cross_corps_authored = true;
   ```
3. In `reconcileOperationRoster`
   (`final_operation_truth_reconciliation.ts:56`), pass the flag through:

   ```ts
   function reconcileOperationRoster(state, corpsId, operation) {
       const allowForeignClaims = operation.cross_corps_authored === true;
       const activeParticipants = uniqueActiveParticipants(
           state, corpsId, operation.participating_brigades, allowForeignClaims,
       );
       ...
   }
   ```
   And in `uniqueActiveParticipants` (`final_operation_truth_reconciliation.ts:29`):
   ```ts
   if (!allowForeignClaims && hasOnlyForeignClaims) continue;
   ```

Surface: 1 type field, 1 spawn-site flag, 1 reconciler conditional.
Behavior preserved for all bot/AI ops; cross-corps catalog ops survive.

**Option B (defence in depth — also worth doing):** Also wire `faction` onto
`CorpsOperation`:

1. Add `faction?: FactionId` to `CorpsOperation` interface.
2. Pass `def.faction` through `buildCorpsOperation` into the returned op
   (extend `PrePlannedOpDef` to carry it).
3. In `finalizeOperationAAR` and the weekly-log writer, prefer
   `op.faction` over the brigade-derived fallback.

This makes faction identity a property of the op itself, not derived state.
Catches the symptom even if a brigade-drain bug recurs.

**Combined patch surface:** ~25 lines across 3 files.

**Tests to add:**
- `tests/operation_opportunities_cross_corps_drain.test.ts` — spawn a 2-corps
  opportunity, advance a turn, assert participating_brigades and axes[*].assigned_brigades
  retain their roster.
- `tests/operation_aar_faction_after_drain.test.ts` — drain brigades, finalize
  AAR, assert `aar.faction === op.faction === 'HRHB'` (after Option B).

────────────────────────────────────────────────────────────────────────────

## 5. Report-back summary

(a) **Where does `op.faction` propagate from catalog to AAR?**
    It doesn't. `CorpsOperation` interface
    (`src/state/game_state.ts:289-…`) has no `faction` field;
    `buildCorpsOperation` (`corps_operation_helpers.ts:138-167`) does
    not accept or carry `def.faction`; the AAR (`operation_aar.ts:535-540`)
    and weekly-log writer (`operation_aar.ts:393-398`) DERIVE faction from
    the first surviving brigade. With brigades drained to 0, both produce
    `faction = ''`.

(b) **What drains Mistral 1's brigade pool?**
    `final_operation_truth_reconciliation.ts:44-47`:
    ```ts
    const hasOnlyForeignClaims = sectorClaims.length > 0 && !hasSameCorpsClaim;
    if (hasOnlyForeignClaims) continue;
    ```
    The reconciler drops brigades whose only sector claims are on a corps
    OTHER than the op's host corps. Mistral 1 is hosted on `hvo_main_staff`,
    which has ZERO sectors in n1980 — so NO brigade can satisfy
    `hasSameCorpsClaim` and ANY brigade with a sector claim gets dropped.
    All 4 Mistral 1 brigades are claimed by `sector:hvo_tomislavgrad:0` (or
    its corps) — including the elite `hvo_1st_guard_abb` which was loaned
    OUT to `hvo_tomislavgrad` at t159, one turn before Mistral 1 became
    eligible. `participating_brigades` goes from 4 → 0 in one turn
    (weekly_log[0].brigade_count = 4 at t160 planning, [1] = 0 at t161 recovery).
    Op falls below participant floor; prep-time gate emits
    `recovery_reason: 'defender_power_too_high'`.

(c) **Why Mistral 2 succeeds where Mistral 1 fails:**
    In n1980 specifically, Mistral 2 NEVER fires — its `staging_access`
    axis is blocked all turns 175-188 by Kupres/Cincar dependency
    anchors. So the brief's premise is empirically wrong for n1980. The
    root-cause drain is structural and identical for both ops: a corps
    (`hvo_main_staff`) with zero sectors can never host a cross-corps
    op through this reconciler. When Mistral 2 launches in other runs,
    it's because of transient sector-claim state — not because anything
    in the engine is correctly handling the cross-corps case.

(d) **Smallest-surface-area fix:** Tag opportunity-spawned ops with
    `cross_corps_authored: true` when any axis has `corps !== def.primary_corps`,
    and gate the foreign-claims filter in the reconciler off that flag.
    Optional Option B: add `faction?: FactionId` to `CorpsOperation` and have
    AAR prefer `op.faction` over brigade derivation. ~25 lines, 3 files.

(e) **Memo size in KB:** 23.3 KB (23,283 bytes).
