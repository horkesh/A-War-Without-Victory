# Alliance 0.55 Root Cause Investigation — n1962 / n1961

**Date:** 2026-05-22
**Author:** scenario-creator-runner-tester (re-investigation, ground-truth from run dirs + source)
**Run dirs:**
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1962/` (commit 7d43c5b5, Wave 3G data fix applied)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1961/` (immediate predecessor, no Wave 3G)

**Hashes:** Both runs share `final_state_hash = a76b9f8b85fdf24e` — BYTE-IDENTICAL.

This re-investigation discards the prior SCRT memo's ic_rbih_restraint_post_washington attribution. Below is the ground-truth, mechanism-level reconstruction.

---

## 1. What the data says (verified by node JSON.parse on final_save.json)

### 1.1 Where alliance lives

The alliance value is stored as a **scalar** on the state node `political`:

- **JSON path:** `state.political.war_alliance_rbih_hrhb`
- **n1962 final value:** `0.55`
- **n1961 final value:** `0.55` (identical, as expected from byte-identical hash)

Verification:
```
node -e "const s=JSON.parse(require('fs').readFileSync('runs/.../n1962/final_save.json','utf8')); console.log(s.political.war_alliance_rbih_hrhb)" -> 0.55
```

### 1.2 Washington bookkeeping at w188

`state.political.rbih_hrhb_state` (verified):
- `washington_signed: true`
- `washington_turn: 85`
- `war_started_turn: 36`
- `ceasefire_active: true`
- `ceasefire_since_turn: 81`

### 1.3 alliance_locks at w188

`state.military.alliance_locks`:
```
[ { "expires_turn": 10084, "mode": "floor", "value": 0.8 } ]
```

ONLY ONE active lock — the floor=0.80 with expires_turn=10084 (= washington_turn 85 + 9999, matches washington_agreement.ts:302).

### 1.4 Silent-drift flag IS set, drift event DID fire

`state.military.event_flags.alliance_silent_drift = true`
`state.military.event_fire_counts.csq_alliance_drift_silent_w20 = 1`, `event_last_fired_turn = 20`

### 1.5 csq_separate_track_recovery fired at t86 in BOTH runs

`state.military.event_fire_counts.csq_separate_track_recovery = 1`
`state.military.event_last_fired_turn.csq_separate_track_recovery = 86`

Identical in n1961 and n1962. **Wave 3G's added `flag_not_set: washington_signed` gate had zero effect.**

### 1.6 washington_agreement_1994 fired at t102

`state.military.event_fire_counts.washington_agreement_1994 = 1`
`state.military.event_last_fired_turn.washington_agreement_1994 = 102`

NB: This is the EVENT firing (with `alliance_change delta=+0.8`). It is DISTINCT from `applyWashingtonEffects` (the engine-side WA processor in `src/sim/early_war/washington_agreement.ts`) which fired at turn 85 setting `rbih_hrhb_state.washington_signed=true` and `washington_turn=85`. Two different code paths — both write to alliance state.

### 1.7 Per-turn alliance-relevant event timeline

| Turn | Event ID | Effect that touches alliance |
|------|----------|------------------------------|
| 4 | `hrhb_political_goal` | (none on alliance value) |
| 20 | `csq_alliance_drift_silent_w20` | `alliance_lock mode=ceiling value=0.45 duration=30` + sets `alliance_silent_drift` flag (consequences.json:1635-1641) |
| **85** | (engine, not event) | `applyWashingtonEffects` writes `war_alliance=0.80`, pushes `floor=0.80` lock, evicts ceiling<0.80 (no-op — none active), sets `washington_signed=true` (washington_agreement.ts:271-303) |
| 86 | `csq_extended_truce_streak_*` | morale/cohesion only |
| 86 | `csq_separate_track_recovery` | `alliance_lock mode=ceiling value=0.55 duration=20` (consequences.json:2278) |
| 90 | `visit_to_front_*` | morale only |
| 92 | `strategic_posture_review_hrhb` | none on alliance |
| 95 | `zagreb_orders_hrhb_ceasefire` | ceasefire morale |
| **102** | `washington_agreement_1994` | `effect: { kind: alliance_change, delta: 0.8 }` (war_1994.json:290-293) — applied via `applyAllianceChange` (apply_effects.ts:170) |
| 105 | `gorazde_crisis_1994`, `csq_back_channel_communication_HRHB` | morale / patron_pressure |
| 106 | `ic_rbih_restraint_post_washington` | dimension_shifts only — **NO alliance_change or alliance_lock effects** (war_1994.json:373+) |

After t106 the ceiling=0.55 from csq_separate_track_recovery expires (86 + 20 = 106). No further alliance-touching events fire turns 107–188.

---

## 2. Mechanism — exactly how value becomes 0.55

### 2.1 Engine-side WA fire at t85 (washington_agreement.ts:applyWashingtonEffects)

```
state.political.war_alliance_rbih_hrhb = WASH_ALLIANCE_LOCK_VALUE   // = 0.80
state.military.alliance_locks = filter(lock =>
    !(lock.mode === 'ceiling' && lock.value < 0.80)
)                                                                    // evicts ceiling<0.80
state.military.alliance_locks.push({ mode: 'floor', value: 0.80,
    expires_turn: state.meta.turn + 9999 })                          // floor=0.80, expires_turn=10084
rhs.washington_signed = true
rhs.washington_turn = 85
```

State of locks at t85 BEFORE eviction:
- t20 ceiling=0.45, expires_turn=50 → already expired by t85, may or may not have been GC'd by `cleanupExpiredEventModifiers` (active_modifiers.ts:158). Either way not "active" by `getActiveAllianceBounds` filter (`expires_turn <= currentTurn` skipped).

So Wave 3F's eviction at t85 was a **no-op** — there were no ceiling locks below 0.80 still active at t85 to evict. The eviction did not "do anything" against the eventual 0.55 problem because the offending ceiling lock had not yet been installed.

State of locks at end of t85: `[{floor=0.80, expires=10084}]`. Alliance value = 0.80.

### 2.2 csq_separate_track_recovery fires at t86 (event JSON)

`flag_not_set: washington_signed` gate (added by Wave 3G in consequences.json:2266) checks `state.military.event_flags.washington_signed`. The engine-side WA processor writes `rbih_hrhb_state.washington_signed = true` but DOES NOT write `event_flags.washington_signed`. There is no record of `event_flags.washington_signed` anywhere in `state.military.event_flags` in either final_save.json — the only event_flags writers are the events themselves (via `sets_flags`), and no event in the catalog sets `washington_signed` as an event_flag.

Therefore the gate `flag_not_set: washington_signed` evaluates TRUE (flag absent in event_flags). The other three gates also pass:
- `alliance_above 0.25`: TRUE (alliance is 0.80 at this point)
- `flag_at_least alliance_silent_drift >= 1`: TRUE (set at t20)
- `flag_not_set rbih_hrhb_war_active`: TRUE

Event fires. Effects applied (consequences.json:2278):
- Push `alliance_lock { mode:'ceiling', value:0.55, expires_turn: 86+20=106 }`

End of t86 locks: `[{floor=0.80, expires=10084}, {ceiling=0.55, expires=106}]`. Alliance value still 0.80 (no alliance_change was applied — only alliance_lock).

### 2.3 washington_agreement_1994 event fires at t102 — THE CLAMP

The event runs `effect: { kind: alliance_change, delta: 0.8 }` through `applyAllianceChange` (apply_effects.ts:170-178):

```
const current = state.political.war_alliance_rbih_hrhb ?? 0;       // 0.80
let next = clamp(current + delta, -1, 1);                          // clamp(1.6, -1, 1) = 1.0
const currentTurn = state.meta.turn ?? 0;                          // 102
const bounds = getActiveAllianceBounds(state, currentTurn);
// At t=102: floor=0.80 (active), ceiling=0.55 (active, expires_turn=106 > 102)
// → bounds = { floor: 0.80, ceiling: 0.55 }
if (bounds.floor != null && next < bounds.floor) next = bounds.floor;       // 1.0 < 0.80? no
if (bounds.ceiling != null && next > bounds.ceiling) next = bounds.ceiling; // 1.0 > 0.55? YES
                                                                            //   next = 0.55
state.political.war_alliance_rbih_hrhb = next;                              // 0.55
```

**This is the moment value drops from 0.80 to 0.55.**

The clamp order is: floor first, ceiling second. Ceiling is **applied after** the floor, so a ceiling below the floor can (and does) push the value below the floor. There is no second floor-pass to repair the violation, and the locks list is internally contradictory (`{floor=0.80, ceiling=0.55}` — a ceiling LOWER than a floor) which `getActiveAllianceBounds` does not detect or normalize.

### 2.4 t106–t188: no further re-clamp

`updateAllianceValue` (alliance_update.ts:260):
```
if (rhs.washington_signed) {
    return { locked: true, delta: 0, ... };   // exits early, no write
}
```

So the per-turn drift function never re-applies the floor=0.80 lock to the existing value of 0.55. The only way the floor would re-apply is via another `alliance_change` event triggering `applyAllianceChange`. None occur in t107–t188 (no alliance_change events in the per-turn `events_fired` lists for those turns).

Result: `war_alliance_rbih_hrhb` sits at 0.55 from t102 through w188.

---

## 3. Reconstruction of war_alliance trajectory (turn-by-turn)

The exact per-turn value is not persisted in turn_summaries, but it can be reconstructed from the mechanics:

| Turn | Event(s) | war_alliance after this turn | Notes |
|------|----------|------------------------------|-------|
| 0 | scenario init | 0.75 (DEFAULT_INIT_ALLIANCE, alliance_update.ts:68) | |
| 1–19 | per-turn drift (`updateAllianceValue`) | drifts (patron_drag, refugee_pressure, incident_penalty) down to <0.40 by t20 to trigger drift event | |
| 20 | csq_alliance_drift_silent_w20 fires | ceiling=0.45 lock pushed; value continues drifting | clamped to ≤0.45 by ceiling |
| 21–49 | drift continues under ceiling=0.45 | value oscillates around 0.30–0.45 | |
| 50 | ceiling=0.45 expires | | |
| 51–80 | drift, ceasefire boost starts at t81 | gradually recovering | |
| 81 | ceasefire activated | +0.015/turn boost | |
| 85 | applyWashingtonEffects (engine) | **value = 0.80** (forced write); floor=0.80 lock pushed | floor=0.80 expires 10084 |
| 86 | csq_separate_track_recovery fires | value unchanged (no alliance_change in effect list); ceiling=0.55 lock pushed | locks now {floor=0.80, ceiling=0.55} |
| 86 | per-turn updateAllianceValue called | early-return (washington_signed=true); value unchanged 0.80 | |
| 87–101 | per-turn updates all early-return | value frozen at 0.80 (no event alliance_change) | locks {floor=0.80, ceiling=0.55} both active |
| **102** | washington_agreement_1994 fires `alliance_change delta=+0.8` | **value = 0.55** (clamp logic: 0.80+0.8=1.6 → clamp 1.0 → floor OK → ceiling clamps to 0.55) | |
| 103–105 | per-turn updates early-return | value frozen at 0.55 | |
| 106 | ceiling=0.55 expires; `ic_rbih_restraint_post_washington` fires (no alliance write) | value still 0.55 | locks now {floor=0.80} only |
| 107–188 | per-turn updates early-return; no alliance_change events | value frozen at 0.55 | floor=0.80 never re-applied |
| **188** | end of run | **0.55** (observed) | |

---

## 4. Wave 3F eviction post-mortem

Wave 3F (washington_agreement.ts:293-298) evicts ceiling locks with value < 0.80 **at the moment of WA fire**. At t85, the only candidate ceiling lock would have been the t20 ceiling=0.45 — already expired at t50. **No active ceiling lock existed for Wave 3F to evict.**

The ceiling=0.55 lock that ultimately caused the 0.55 clamp at t102 was installed by csq_separate_track_recovery at t86 — **AFTER Wave 3F's one-shot eviction at t85**. Wave 3F cannot evict locks installed after it ran.

**Wave 3F's eviction did nothing on the actual problem.** It would only help if a ceiling<0.80 lock were ALREADY active at t85. On this run it wasn't.

## 5. Wave 3G gate post-mortem

Wave 3G (commit 7d43c5b5) added `flag_not_set: washington_signed` to the trigger of csq_separate_track_recovery (consequences.json:2266). The intent: block this event from firing after WA signs.

**The gate is inert** because:
- `flag_not_set` evaluates against `state.military.event_flags` (the event-system flag namespace)
- `washington_signed` is written to `state.political.rbih_hrhb_state.washington_signed` by the engine processor (washington_agreement.ts:304), NOT to `event_flags`
- No event in the catalog `sets_flags: { washington_signed: true }`
- So `event_flags.washington_signed` is always absent → `flag_not_set` is always TRUE → gate never blocks

Confirmed by byte-identical hashes n1961 vs n1962: the gate had zero behavioral effect.

---

## 6. Reportback

### (a) Did csq_separate_track_recovery fire in n1961?

**YES.** `state.military.event_fire_counts.csq_separate_track_recovery = 1`, `event_last_fired_turn = 86`. Identical in n1962. Wave 3G's `flag_not_set: washington_signed` gate failed to block because the gate reads `state.military.event_flags` while the writer (washington_agreement.ts:304) writes to `state.political.rbih_hrhb_state.washington_signed` — different namespaces. The prior SCRT memo's attribution to `ic_rbih_restraint_post_washington` was wrong: that event has no alliance_lock or alliance_change effect in war_1994.json:373+.

### (b) Where does the actual 0.55 plateau come from? List locks active at w188 AND alliance trajectory from t85.

**Active locks at w188:** `[{ mode:'floor', value:0.8, expires_turn:10084 }]` (the single floor lock pushed by applyWashingtonEffects at t85).

**Trajectory from t85 onward:**

| Turn | Mechanism | Value |
|------|-----------|-------|
| 85 (engine WA) | forced write to 0.80; floor=0.80 lock pushed | 0.80 |
| 86 | csq_separate_track_recovery pushes ceiling=0.55 lock (no value change yet) | 0.80 |
| 87–101 | per-turn update early-returns (washington_signed) | 0.80 |
| **102** | washington_agreement_1994 event `alliance_change delta=+0.8`; applyAllianceChange clamps 1.0 → 0.55 (ceiling beats floor in apply_effects.ts:175-177) | **0.55** |
| 103–105 | per-turn early-returns | 0.55 |
| 106 | ceiling=0.55 expires; ic_rbih_restraint_post_washington has no alliance write | 0.55 |
| 107–188 | per-turn early-returns; no alliance_change events; floor never re-applied | 0.55 |

**The 0.55 plateau is the result of applyAllianceChange in apply_effects.ts:170-178 applying ceiling AFTER floor**, so the ceiling=0.55 lock (still active at t102) overrode the floor=0.80 lock when washington_agreement_1994's `alliance_change delta=+0.8` was processed at t102. After t106 (ceiling expiry) there are no further alliance_change events and `updateAllianceValue` early-returns when `washington_signed=true`, so the value never gets re-clamped against the floor.

### (c) Is applyAllianceChange's floor-clamp actually applying? Did WA write 0.80 to the value field at t85?

**At t85** the engine-side applyWashingtonEffects (washington_agreement.ts:271) DID write 0.80 directly: `state.political.war_alliance_rbih_hrhb = 0.80`. This is a hard set, not via applyAllianceChange. The floor-clamp logic is not invoked at this step.

**At t102** the EVENT washington_agreement_1994 (war_1994.json:290-293) fires `alliance_change delta=+0.8` through applyAllianceChange. The floor-clamp IS evaluated (apply_effects.ts:175): `if (bounds.floor != null && next < bounds.floor) next = bounds.floor`. With current=0.80, delta=+0.8: next becomes clamp(1.6,-1,1)=1.0. Floor check: 1.0 < 0.80? FALSE — no floor adjustment. Ceiling check: 1.0 > 0.55? TRUE — next = 0.55.

The floor-clamp logic is wired correctly for the case where the input would fall below the floor. But the clamp ORDER (floor then ceiling) lets a ceiling LOWER than the floor pull the value below the floor with no second floor-pass. This is the structural flaw.

### (d) One-sentence true root cause

`applyAllianceChange` in apply_effects.ts:175-177 applies the floor clamp before the ceiling clamp with no final floor re-pass, so when washington_agreement_1994 (war_1994.json:290) fires its `alliance_change delta=+0.8` at t102 while the csq_separate_track_recovery ceiling=0.55 lock (consequences.json:2278) is still active, the value gets pulled from 0.80 down to 0.55 in violation of the active floor=0.80 lock — and `updateAllianceValue` early-returns on `washington_signed=true` thereafter so the floor never gets a chance to re-apply.

### (e) Smallest-surface-area fix

Three options, ordered by surface area:

1. **Data-only (smallest)** — Change csq_separate_track_recovery's trigger gate in consequences.json:2266 from `flag_not_set: washington_signed` to `flag_not_set: separate_track_recovery_active` (the flag the event ALREADY sets in `sets_flags`, line 2284). This makes the gate use a flag namespace that actually exists (event_flags). Better still, add a `turn_max: 101` to ensure the ceiling lock cannot still be active when washington_agreement_1994 fires at t102. ~2 line changes, no source edits, no recalibration risk on n1961-only paths.

2. **Logic fix in apply_effects.ts (one line)** — Re-apply the floor AFTER the ceiling in applyAllianceChange (apply_effects.ts:175-177):
   ```
   if (bounds.floor != null && next < bounds.floor) next = bounds.floor;
   if (bounds.ceiling != null && next > bounds.ceiling) next = bounds.ceiling;
   if (bounds.floor != null && next < bounds.floor) next = bounds.floor;   // ← re-clamp
   ```
   Or, equivalently, detect contradiction in `getActiveAllianceBounds` and clamp ceiling = max(ceiling, floor) before returning. Either way the floor wins on contradictory locks. Semantically: "the WA floor=0.80 is a stronger commitment than any active sub-0.80 ceiling".

3. **Eviction extension in applyAllianceLock (apply_effects.ts:390)** — when pushing a ceiling lock with value < any active floor, refuse the push (or evict the offending floor — depends on intent). Heavier, harder to reason about cross-system.

**Recommended: option 1** (data-only, no engine edit, no calibration risk). Replace the `flag_not_set: washington_signed` gate with `flag_not_set: separate_track_recovery_active` AND add `turn_max: 101`. The first prevents re-fire; the second ensures the event can't push a lock that washington_agreement_1994's clamp would then trip on. Hand off to canon-compliance-reviewer / game-designer for the consequence-event re-author.

If the team also wants the symmetric protection in code, option 2 is one line and faction-agnostic (it can only ever increase alliance, never decrease). But it would change the golden hash on any run where contradictory locks exist, so it requires a calibration re-run.

### (f) Memo size in KB

Verified below via `wc -c`.

---

## 7. Source citations

Run data (final_save.json paths, both n1961 and n1962):
- `state.political.war_alliance_rbih_hrhb` → 0.55
- `state.political.rbih_hrhb_state.{washington_signed,washington_turn}` → true, 85
- `state.military.alliance_locks` → [{floor, 0.8, 10084}]
- `state.military.event_flags.alliance_silent_drift` → true
- `state.military.event_fire_counts.{csq_separate_track_recovery, washington_agreement_1994, csq_alliance_drift_silent_w20, ic_rbih_restraint_post_washington}` → 1 each
- `state.military.event_last_fired_turn.*` → 86, 102, 20, 106 respectively
- `state.turn_summaries[i].events_fired` → per-turn timeline (above)

Source files:
- `src/sim/early_war/washington_agreement.ts:271-303` — engine-side WA fire at t85 (Wave 3F eviction lives here)
- `src/sim/early_war/alliance_update.ts:260-271` — early-return when washington_signed
- `src/sim/events/apply_effects.ts:170-178` — `applyAllianceChange` (the clamp-order bug)
- `src/sim/events/apply_effects.ts:388-405` — `applyAllianceLock` (lock push, no contradiction check)
- `src/sim/events/active_modifiers.ts:62-79` — `getActiveAllianceBounds` (returns both bounds even when contradictory)
- `src/sim/events/active_modifiers.ts:158-160` — alliance_locks GC

Event JSON:
- `data/scenarios/events/consequences.json:2253-2287` — csq_separate_track_recovery (ceiling=0.55 lock)
- `data/scenarios/events/consequences.json:1612-1643` — csq_alliance_drift_silent_w20 (ceiling=0.45 lock + silent_drift flag)
- `data/scenarios/events/war_1994.json:274-342` — washington_agreement_1994 (alliance_change delta=+0.8 at turn 102)
- `data/scenarios/events/war_1994.json:373+` — ic_rbih_restraint_post_washington (no alliance write)

---

## 8. Implication for n1963+ and prior memo

- **Prior memo's attribution** to `ic_rbih_restraint_post_washington` at turn 106 was wrong. That event has zero alliance writes; it only adjusts patron_confidence/negotiating_leverage dimensions.
- **Wave 3G** added a gate using a flag name that lives in the wrong namespace; byte-identical hashes confirm zero behavioral effect.
- **Wave 3F** evicts ceiling locks at WA fire moment, but the actual offending ceiling lock is installed AFTER WA fires; eviction at t85 found no active locks below 0.80 to evict.
- **The structural flaw is in apply_effects.ts:175-177** — ceiling clamp can pull value below an active floor lock with no repair pass. Plus the early-return in alliance_update.ts:260 prevents the per-turn drift loop from healing the contradiction post-WA.

For the next iteration: choose option 1 (data fix on csq_separate_track_recovery's trigger gate) for smallest surface area, no engine touch, no calibration risk. Verify by re-running and confirming `event_fire_counts.csq_separate_track_recovery === 0`.
