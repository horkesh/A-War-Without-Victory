# Brigade Lifecycle Investigation — Mistral 2 Cascade Block

**Date:** 2026-05-23
**Branch:** `feature/arc-operations-calibration` (n1992, 81.18% match_ratio)
**Investigator:** AWWV engine specialist (read-only)
**Scope:** Why brigades spent in early ops (e.g. Cincar t132-141) never re-activate, blocking Mistral 2 Šipovo/Mrkonjić cascade (10/11 OSIDs missed) and Jajce ring (7 OSIDs).

---

## TL;DR (jump to bottom for full reportback)

- **active → inactive happens at 8 source sites**; only one — `brigade_dissolution.ts` — is a "cohesion/morale/personnel" demotion. The rest are explicit lifecycle terminators (forced retreat with no friendly territory, OG dissolution, lifecycle events, paramilitary, stranded, JNA phantoms, minority erosion).
- **There is exactly ONE reactivation path**: `brigade_reconstitution.ts` lifts brigades from `status='inactive' + lifecycle_status='destroyed'` back to `status='active'`. **It requires `destruction_turn` to be set** and waits `RECONSTITUTION_DELAY_TURNS = 5` turns.
- **Per-turn brigade recovery is conditional on `status === 'active'`**: `runCohesionDrift` (cohesion_drift.ts:139), `reinforceBrigadesFromPools` (formation_spawn.ts via `isEligibleForReinforcement` at formation_constants.ts:176), `applyWiaTrickleback` (formation_spawn.ts:804-840) all skip inactive formations.
- **Smoking gun for Mistral 2 block**: `brigade_dissolution.ts:240-244` sets `status='inactive'`, `lifecycle_status='destroyed'`, `personnel=0`, AND `destruction_turn=turn` together — meaning a "spent-in-Cincar" brigade IS in fact eligible for reconstitution 5 turns later **only if** it dissolved via this path. If it went inactive any OTHER way (force-retreat dispersal, etc.) it stays inactive forever.
- **Recommended fix (e)**: Don't mark them inactive at all when the only failed criterion is cohesion/morale. Promote them to a `readiness='degraded'` brigade with personnel > 0 that natural cohesion drift + reinforcement can recover. This is the smallest-surface-area unblock for the Mistral 2 cascade and preserves all existing destruction paths.

---

## (a) active → inactive transition sites (8 sites)

Found by `Grep status\s*=\s*['\"]inactive['\"]` across `src/`.

### 1. `src/sim/combat/brigade_dissolution.ts:240`
**The cohesion/personnel/morale demotion site.** This is the suspected culprit for Cincar-spent brigades.

Trigger (`dissolveCombatIneffectiveBrigades`, lines 111-250):
- For each ACTIVE brigade/OG (line 124: `if (!f || f.status !== 'active') continue;`)
- Evaluate `lowPersonnel = personnel < personnelThreshold(400) || personnel < absFloor(150)`
- `lowCohesion = cohesion <= 20`
- `lowMorale = morale <= 15`
- Personnel cap: brigades **≥ 800 personnel** are immune to morale-only dissolution (line 154)
- Enclave brigades require ALL THREE; others need TWO of three (line 135)
- **Also**: morale-collapse override after 8 turns of morale ≤ 15 (gated by env flag, default off)
- On dissolution: removes from active op, sets `status='inactive'`, `lifecycle_status='destroyed'`, `personnel=0`, `destruction_turn=turn`. Half remaining personnel → strategic reserve. Equipment 70% salvaged to same-corps brigade.

**Important**: faction-keyed `dissolution_personnel_threshold`/`dissolution_cohesion_threshold`/`dissolution_morale_threshold` step-curves in the war_timeline can shift these thresholds per faction per turn (Krivaja Phase 1).

### 2. `src/sim/combat/attack_retreat_displacement.ts:452`
`forceRetreatWithPenalties` — last-resort dispersal when no friendly OSID exists for retreat. Sets `status='inactive'` and `destruction_turn=turn`. **Does NOT set `lifecycle_status='destroyed'`** → potentially blocks reconstitution (see Section 4 below).

### 3. `src/sim/combat/brigade_assignment.ts:268`
`dissolvePocketDestroyableBrigade` — dissolves brigades in destroyable pockets when no friendly territory remains. Same complete demotion as #1: sets `lifecycle_status='destroyed'`, `personnel=0`, `destruction_turn=turn`.

### 4. `src/sim/combat/operational_groups.ts:286`
OG dissolution when cohesion < OG_DISSOLVE_COHESION or `turnsActive >= maxDur`. **Does NOT set `lifecycle_status='destroyed'`** — only `status='inactive'` and `destruction_turn=turn`. OGs return personnel to donor brigades and are removed from `corps_command.active_ogs`.

### 5. `src/sim/formation_lifecycle_events.ts:102, 114`
Scheduled lifecycle events (`disband` / `merge`):
- `disband` at line 102: sets `status='inactive'`, `lifecycle_status='destroyed'`, `personnel=0`, `destruction_turn=turn`.
- `merge` at line 114: transfers personnel to target, sets `status='inactive'`, `lifecycle_status='merged'`, `personnel=0`. **No `destruction_turn`** — blocks reconstitution.

### 6. `src/sim/combat/jna_phantom_brigades.ts:469, 624`
JNA phantom departure / fade. Sets `status='inactive'`. Phantoms are explicit data — not subject to reconstitution.

### 7. `src/sim/combat/paramilitary_sweep.ts:680`
Paramilitaries disband after the sweep window — sets `status='inactive'`. Not a reactivation candidate by design.

### 8. `src/sim/combat/stranded_brigade_lifecycle.ts:249`
Stranded brigade lifecycle. Sets `status='inactive'`, `personnel=0`.

### 9. `src/sim/early_war/minority_erosion.ts:137`
When minority militia falls below viable threshold in a municipality, formations there are demoted: `status='inactive'`, `lifecycle_status='displaced'`. **No `destruction_turn`** — blocks reconstitution.

---

## (b) Reactivation path

**ONE reactivation site**: `src/sim/combat/brigade_reconstitution.ts:350`

`reconstituteBrigades()` (lines 256-385). Requirements (all must hold):

1. `f.status === 'inactive'` (line 271)
2. `f.lifecycle_status === 'destroyed'` (line 272) — **excludes `'merged'`, `'displaced'`, or undefined**
3. `f.kind === 'brigade' || 'og'` (line 273)
4. `f.destruction_turn` MUST be set (line 280-287; if absent, formation is skipped permanently)
5. `turn - destruction_turn >= RECONSTITUTION_DELAY_TURNS(5)` (line 282)
6. `f.corps_id` set (line 292)
7. Corps cap: `RECONSTITUTION_MAX_PER_CORPS = 1` per turn (line 296)
8. Home municipality controlled (Path A) or refugee dest available (Path B) AND
9. Pool available ≥ `RECONSTITUTION_MIN_POOL = 200` (line 316)
10. After scaling: `poolDraw = min(maxPers × 0.40, pool.available) ≥ 200` (lines 338-341)

On success: `status='active'`, `lifecycle_status=undefined`, `personnel=poolDraw`, `cohesion=30`, `morale=faction baseline (45-55) +5 refugee bonus`, `readiness='forming'`, `destruction_turn=undefined`, `officer_quality -= 0.10`.

**Implications for Mistral 2**:
- A brigade dissolved by `brigade_dissolution.ts` IS eligible for reconstitution 5 turns later — **at home OSID** if home is still HRHB-controlled and the pool has ≥ 200 manpower.
- A brigade taken offline by `forceRetreatWithPenalties` dispersal (`status='inactive'` but `lifecycle_status` never set to `'destroyed'`) is **permanently dead**.
- An OG (operational_group) hits line 273's kind filter (must be 'brigade' or 'og') so they qualify — but the OG dissolution path (operational_groups.ts:286) does NOT set `lifecycle_status='destroyed'`, so OG reconstitution is also blocked.
- Reconstituted brigades spawn at 40% max_personnel and cohesion=30 — they re-enter the eligible-for-operation pool, but they're degraded for several more turns.

---

## (c) Per-turn brigade recovery mechanisms

All gated by `status === 'active'`. Inactive brigades receive ZERO recovery:

### Cohesion regen — `src/sim/combat/cohesion_drift.ts:139`
```ts
if (!f || f.status !== 'active') continue;
```
Faction-keyed ambient drift (RBiH +0.3 to +0.4 early war, HRHB +0.05 mid-war, RS slow decay). Skipped for inactive — they never recover cohesion.

### Personnel reinforcement — `src/sim/formation_spawn.ts` `reinforceBrigadesFromPools`
Gated by `isEligibleForReinforcement(f)` in `src/state/formation_constants.ts:175-181`:
```ts
export function isEligibleForReinforcement(f): boolean {
    if (f.status === 'inactive') return false;  // ← line 176
    if (f.kind === 'paramilitary') return false;
    if (f.readiness === 'degraded' || f.readiness === 'forming') return false;
    if (Array.isArray(f.tags) && f.tags.includes('enclave')) return false;
    return true;
}
```
Rate: `REINFORCEMENT_RATE = 400/turn` (formation_constants.ts:254), `COMBAT_REINFORCEMENT_RATE = 200/turn` (line 260). Active brigades at home pool gain up to 400 personnel/turn until cap. **Inactive brigades skip the entire loop.**

Also note: `readiness === 'forming'` is gated too — so reconstituted brigades (which spawn with `readiness='forming'`) ALSO skip reinforcement until they're promoted past forming. Need to verify how/when forming → ready transitions.

### WIA trickleback — `src/sim/formation_spawn.ts:804-840`
```ts
if (f.posture === 'attack' || f.disrupted) continue;
```
Returns up to `WIA_TRICKLE_RATE = 80/week` from `f.wounded_pending`. **Does not check `status` explicitly** — but the function only iterates brigades (line 811), and a dead brigade has `wounded_pending` cleared on dissolution (well, actually it doesn't — `brigade_dissolution.ts:240-244` doesn't touch `wounded_pending`). Worth verifying separately; probably not the cohesion-recovery angle though.

### Fatigue recovery — `src/state/formation_fatigue.ts` (via war_phases.ts:357 `applyFatigueRecovery`)
Not investigated in depth here, but `applyFatigueRecovery(context.state, engagedIds)` is gated by engagement set, not by status. Likely also skips inactive in implementation.

**Verdict**: A brigade flagged inactive is a black hole. Nothing brings it back except `brigade_reconstitution.ts`, which has narrow eligibility (`lifecycle_status === 'destroyed'` AND `destruction_turn` set).

---

## (d) Smallest-surface-area fix proposal

Five candidates were considered. Decision: **(e) with light modification** — described below.

### (a) Per-turn personnel regen for active brigades at home OSID
Already exists (`reinforceBrigadesFromPools`, REINFORCEMENT_RATE=400/turn from `formation_spawn.ts:331`). This isn't the bottleneck — active brigades at home already regen. The bug is they're not ACTIVE.

### (b) Reactivation: lift inactive → active when personnel exceeds threshold
Would require new code path AND would conflict with the dissolution → reconstitution semantics (destroyed + 5-turn delay + 40% spawn). Surface area: ~30 lines new logic, plus tests, plus delicate interaction with `lifecycle_status` semantics. **Not minimal.**

### (c) Op-completion cohesion bonus
Helps prevent the cohesion side of the 2-of-3 dissolution criterion from triggering, but doesn't address brigades that already crossed into inactive. Partial fix only.

### (d) Status=inactive shouldn't propagate from cohesion=0; require personnel=0 OR explicit dissolution
This is the **doctrinal correct fix** but bigger surface area:
- Must change `brigade_dissolution.ts:177-182` criteria logic.
- Must verify the personnel-cap exit (line 154) already handles "big brigade with collapsed cohesion".
- Risk: many callers and tests assume the current 2-of-3 semantics.

### (e) [RECOMMENDED] Don't dissolve; downgrade to `readiness='degraded'` when only cohesion+morale fail
**Smallest surface area for the Mistral 2 unblock specifically.**

Modify `brigade_dissolution.ts` at lines 184-247: when `lowPersonnel === false` and personnel ≥ DISSOLUTION_PERSONNEL_CAP (800) is also false (i.e. mid-strength 400-799 brigades), and the only triggers are cohesion+morale (not absolute floor breach), instead of dissolution:
- Set `readiness = 'degraded'`
- Don't touch status; don't set lifecycle_status; don't set destruction_turn
- Don't transfer equipment or personnel to reserve
- Leave the brigade alive but ineligible for operations until its cohesion/morale recover via normal drift

Then in `isEligibleForReinforcement` (formation_constants.ts:178), the existing `f.readiness === 'degraded'` gate ALREADY filters degraded brigades from pool reinforcement — but **cohesion drift still applies** (cohesion_drift.ts skips inactive but not degraded). So the brigade slowly recovers cohesion via RBiH/HRHB positive drift, eventually crosses back to ready, then becomes eligible for reinforcement, then back to op pool.

**Required edits (cite file:line):**
1. `src/sim/combat/brigade_dissolution.ts:184` (after `if (!moraleCollapseTrigger && criteriaCount < requiredCriteria) continue;` and before "Dissolve" block): add a branch for "cohesion/morale only" failure that sets `f.readiness = 'degraded'` and continues.
2. Possibly relax the gate in `isEligibleForReinforcement` (formation_constants.ts:178) to allow degraded brigades to recover personnel at half rate so they can climb out faster. **Optional** — not strictly required for the cascade unblock.
3. Add a test: spent brigade with cohesion=15, morale=10, personnel=600 should become `readiness='degraded'` and recover cohesion over ~30 turns at RBiH/HRHB drift rate, then re-enter the op pool.

**Why this is the right call:**
- Surface area: ~10 lines new logic in one file.
- Preserves the absolute-floor and personnel<400 paths (those still dissolve — historically accurate).
- Preserves the morale-collapse override (still bypasses).
- Preserves reconstitution semantics for genuinely destroyed units.
- Mistral 2 cascade brigades (which still have personnel — they "spent" cohesion in Cincar, not bodies) get to recover and rejoin the cascade.

**Alternative if (e) feels too clever**: choose (d) but scope tightly — add a 4th criterion that personnel < some floor (say 600) is also required for dissolution. One-line change: `if (personnel >= 600 && !moraleCollapseTrigger) { f.readiness = 'degraded'; continue; }`. Same effect, narrower expression.

---

## (e) `hrhb_kralj_petar_kreimir_iv_brigade` post-Cincar trajectory in n1992

Inspected `data/derived/latest_run_final_save.json` (n1992 final save, turn 188).

### `hrhb_kralj_petar_kreimir_iv_brigade` at t188:
```
status:           inactive
lifecycle_status: destroyed
personnel:        0 (max 1800)
cohesion:         12
morale:           75
readiness:        active
location_osid:    op:glamoc:vidimlije_2
home_osid:        op:livno:livno_2
corps_id:         hvo_tomislavgrad
destruction_turn: 165
created_turn:     0
disrupted_turns:  1
faction:          HRHB
```

### Two other Cincar-spent brigades:
```
hrhb_kralj_tomislav_brigade
  status/lifecycle: inactive / destroyed
  destruction_turn: 165   (created t8, home op:duvno:dobrici)
  personnel: 0 / cohesion 12 / morale 64

hv_7th_guards_varazdin
  status/lifecycle: inactive / destroyed
  destruction_turn: 104   (created t91, home op:tomislavgrad:tomislavgrad_2)
  personnel: 0 / cohesion 27 / morale 52
```

### Trajectory verdict
- All three brigades **were properly dissolved** by `brigade_dissolution.ts` — they have the canonical `lifecycle_status='destroyed'` + `destruction_turn` set.
- `kralj_petar_kreimir_iv` and `kralj_tomislav` both destroyed at **t165** (post-Cincar). `hv_7th_guards_varazdin` destroyed at **t104** (84 turns of post-destruction silence!).
- All three have a valid `corps_id`, valid `home_osid`, and at t188 are 23+ turns past destruction — well beyond the `RECONSTITUTION_DELAY_TURNS=5` gate.
- All three have `lifecycle_status='destroyed'` — they pass `brigade_reconstitution.ts:272`.
- **They never briefly recovered.** No re-degrade cycle. Single dissolution at one turn, then 23+ (or 84) turns of `personnel=0, status=inactive` stasis.

### Why reconstitution NEVER fired — **NEW ROOT CAUSE**

Inspecting militia pools for HRHB at the brigades' home municipalities:
```
duvno:HRHB           available 0     committed 1358    exhausted 846
livno:HRHB           available 0     committed 9206    exhausted 1064
prozor:HRHB          available 0     committed 800     exhausted 900
citluk:HRHB          available 0     committed 1061    exhausted 368
grude:HRHB           available 0     committed 1194    exhausted 1045
mostar:HRHB          available 0     committed 9579    exhausted 1768

HRHB FACTION TOTAL   available 217   committed 65907   exhausted 11778
```

**HRHB has 217 manpower available across ALL of Bosnia.** `RECONSTITUTION_MIN_POOL=200` (brigade_reconstitution.ts:56). The only HRHB pool with available ≥200 is `zepce:HRHB` (217). For comparison:
- RBiH: 77,249 available
- RS: 19,235 available
- HRHB: 217 available

This isn't a brigade lifecycle bug — **this is a pool starvation crisis**. The 33 still-active HRHB brigades hold 58,738 personnel (essentially the entire HRHB pool baked into living brigades). When the 8 dead HRHB brigades try to reconstitute, there's no manpower anywhere for the Path A (home OSID) **or** Path B (refugee fallback) to satisfy `pool.available >= 200`.

**Root cause cascade**:
1. Mistral 2 (and Cincar before it) drained HRHB into operations.
2. Combat losses dissolved brigades at t165.
3. `ongoing_mobilization.ts` per-turn HRHB pool growth is faction-scaled at 0.12 with surge factor declining from 1.2× (t≤52) → 0.3× (t≤78) → 0.15× (t≤104) → 0.1× (t>104). At t188 the surge is 0.1× — effectively flat.
4. Active brigades aggressively absorb every milligram of new mobilization via `reinforceBrigadesFromPools` at 200-400/turn each.
5. Reconstitution at 40% (≥200 minimum) of a 1800-max brigade requires drawing 720 from the home pool that's been at 0 available for 23+ turns.
6. Result: brigades sit in destroyed-limbo forever; Mistral 2 cascade halts.

### Implications for the fix recommendation

Section (d)'s recommendation **changes**. Fix (e) (don't dissolve, downgrade to degraded) is still smallest-surface but **still wouldn't help these three brigades** because they're already destroyed and the bottleneck has now moved upstream to pool starvation.

**Revised recommendation: a HYBRID approach**:

**(e-prime) Two-line change with biggest leverage:**

1. **Preserve the brigade rather than dissolve it** when personnel ≥ 400 and only cohesion+morale fail:
   - `src/sim/combat/brigade_dissolution.ts:182-184`: insert a check before the dissolve block: if `personnel > DISSOLUTION_PERSONNEL_THRESHOLD(400) && !moraleCollapseTrigger && !lowPersonnel`, set `f.readiness='degraded'` and continue.
   - This prevents the t165 dissolutions in future runs — the cohesion-12 brigades stay alive.

2. **Reduce reconstitution pool requirement OR add a per-faction strategic-reserve fallback**:
   - `src/sim/combat/brigade_reconstitution.ts:326` (Path B refugee fallback): add a third path that draws from `state.military.strategic_reserves[faction]` when pool starvation persists across N turns and home OSID is friendly. Cost: ~15 lines in `reconstituteBrigades()`.
   - This rescues already-dead brigades and gives them a second life when faction-wide manpower exists in the reserve.

**Why both**: (1) alone prevents future dissolution but doesn't reactivate the existing dead ones (kralj_petar, kralj_tomislav, varazdin). (2) alone gives them a path back but doesn't fix the over-eager dissolution that creates the problem in the first place.

**If we must pick one**: (1) only — `brigade_dissolution.ts:182` insertion. It's ~5 lines, prevents recurrence, and the existing dead brigades are sunk cost. The Mistral 2 cascade for FUTURE runs starting from a corrected baseline will not produce these orphan brigades.

---

## (f) Memo size

19.5 KB (wc -c = 19,497 bytes). Above the 10 KB floor.

