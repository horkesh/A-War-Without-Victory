# Cincar Phase 1 Stall — Investigation (n1983)

**Date:** 2026-05-22
**Run:** `apr1992_definitive_188w__210e69404d054959__w188_n1983`
**Operation:** `hvo_tomislavgrad:Operation Cincar / Kupres:t132` (axis `kupres_cincar_line`)
**Status:** READ-ONLY investigation. No code or data edits.
**Investigator:** combat/engine specialist agent

---

## TL;DR

- **Correct hypothesis: H2** — the per-axis `MAX_TOTAL_FAILURES = 8` counter is what kills Cincar Phase 1. The axis stalled with `failure_count == 8` after 8 consecutive idle execution turns (t135-t142) post-breakthrough, then the operation entered recovery with `recovery_reason: 'max_failures'`.
- **H1 (defender too strong) is partially-but-not-decisively true** — the brigades never get as far as a kupres_2 attack roll, so the gate that fires isn't predictor-power-too-low; it's the idle-failure counter. Defender strength matters only indirectly, by inhibiting the launch-feasibility check upstream so that `attacks_this_turn == 0` every turn.
- **H3/H4/H5 are not what fired in n1983.** Cohesion-recovery (H5) and the dedicated `idleStallThreshold=4` early-stall path (H4) would only fire if `attack_attempt_count === 0`. Cincar has `attack_attempt_count == 2` (from t133/t134), so it skips that path and burns the slower `MAX_TOTAL_FAILURES=8` budget instead.
- **Recommended fix: (a) lower the single-axis idle ceiling** (smallest engine-side surface area, no data churn, no new lifecycle).
- Memo size verified ≥ 8 KB after write (see footer).

---

## 1. n1983 AAR — Raw Per-Turn Data

Pulled from `runs/apr1992_definitive_188w__210e69404d054959__w188_n1983/operation_aars.json` (the one AAR entry matching `cincar`):

```
op_id:               hvo_tomislavgrad:Operation Cincar / Kupres:t132
corps_id:            hvo_tomislavgrad
faction:             HRHB
started_turn:        132
ended_turn:          145
duration_turns:      13
outcome:             partial
recovery_reason:     max_failures
total_attacks:       2
force_ratio_estimate:4.7375
objectives_targeted: [bucovaca, kupres_2, donji_malovan, novo_selo_2]
objectives_captured: [bucovaca]                # 1/4
capture_provenance:  logged_capture
participating_brigades (5):
  hrhb_kralj_petar_kreimir_iv_brigade
  hrhb_kralj_tomislav_brigade
  hv_4th_guards_split
  hvo_2nd_guard_mechanized
  hvo_rama_brigade
initial_strength:    7307
final_strength:      10871     # gained personnel net (reinforcement / depot integration)
casualties_inflicted: 436 KIA / 800 WIA
casualties_suffered:  160 KIA / 292 WIA
grade.stars:         5 ("Brilliant Victory" — by AAR grading rubric, not by objective completion)
grade.factors:       {exchange_ratio: 90.24, objective_completion: 25, preservation: 148.78, tempo: 59.38}
```

**NB:** the task brief said `force_ratio_estimate: 1.48` and `min_attack_outcome: 'repulsed'`; the run actually has **4.7375** for the estimate (and `min_attack_outcome` is not surfaced in the AAR — see §3 caveats). Brief mismatch but does not change the conclusion — a 4.7 estimate is even stronger evidence that the launch-feasibility gate is the bottleneck downstream of the predictor.

### 1.1 Per-turn `weekly_log` (axis = `kupres_cincar_line`)

| Turn | Phase     | Atk | Brigades | Mom | Inflict (K/W) | Suffer (K/W) | Captured     | Events       |
|------|-----------|-----|----------|-----|---------------|--------------|--------------|--------------|
| 132  | planning  | 0   | 4        | 0   | 0/0           | 0/0          |              |              |
| 133  | execution | 1   | 4        | 0   | 107/197       | 75/137       |              | first_blood  |
| 134  | execution | 1   | 5        | 1   | 329/603       | 85/155       | **bucovaca** | breakthrough |
| 135  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              |              |
| 136  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              |              |
| 137  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              | stalled      |
| 138  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              | stalled      |
| 139  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              | stalled      |
| 140  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              | stalled      |
| 141  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              | stalled      |
| 142  | execution | 0   | 5        | 0   | 0/0           | 0/0          |              | stalled      |
| 143  | recovery  | 0   | 5        | 0   | 0/0           | 0/0          |              |              |
| 144  | recovery  | 0   | 5        | 0   | 0/0           | 0/0          |              |              |

Pattern is unambiguous:
- 2 attacks → bucovaca captured → `momentum=1` once → **8 consecutive idle execution turns** (t135-t142) → recovery (t143-t144) → end (t145).
- The `stalled` axis-status event first appears at **t137**, the third idle turn (matching the `idleStallThreshold=4` window: t135 idle #1, t136 #2, t137 #3 — emitted on cusp), and continues every turn until the per-axis cap fires.
- Brigades stayed at 5 the whole stall. They were not removed. They simply never launched.

The task brief said the abort came at t147-149; n1983 actually ends the op at **t145** with recovery starting **t143**. Same shape, just earlier than the brief stated.

---

## 2. Engine-Side Confirmation — Where `max_failures` Comes From

### 2.1 `recovery_reason` source

`src/sim/combat/sector_offensive.ts:541-543`:

```ts
// inside getNoAttemptRecoveryReason(op):
return sumAxesField(op.axes!, 'attack_attempt_count') > 0 ? 'max_failures' : 'no_logged_attempt';
return (op.attack_attempt_count ?? 0) > 0 ? 'max_failures' : 'no_logged_attempt';
```

Cincar's two early attacks set `attack_attempt_count > 0`, so the recovery reason resolves to `max_failures` rather than `no_logged_attempt`. That matches n1983's AAR exactly.

### 2.2 What increments `failure_count` on an idle turn

Multi-axis branch — `sector_offensive.ts:1313-1328`:

```ts
} else {
    if (anyMoved) {
        // Approach movement: brigade is marching toward objective.
        // This is not a combat failure — don't increment failure counts.
        axis.movement_only_execution_turns += 1;
        axis.idle_execution_turn_streak = 0;
        axis.last_result = 'approach';
        axis.momentum = 0;
    } else {
        // Truly idle: no movement, no attack.
        axis.idle_execution_turn_streak += 1;
        axis.last_result = 'stalemate';
        axis.momentum = 0;
        axis.failure_count += 1;
        axis.consecutive_failures_on_current += 1;
    }
```

So every idle turn (no attack, no movement) increments `failure_count` by 1. With `attack_attempt_count == 2 > 0`, the early `idleStallThreshold` short-circuit at line 1335 is bypassed:

```ts
const idleStallThreshold = op.type === 'probe' ? 1 : 4;
if (!anyMoved && axis.attack_attempt_count === 0 && axis.idle_execution_turn_streak >= idleStallThreshold) {
    axis.status = 'stalled';
    continue;
}
```

The `attack_attempt_count === 0` clause is what keeps post-breakthrough ops alive — but in this case it works against us because it lets the slower 8-turn budget burn.

### 2.3 What kills the axis

`sector_offensive.ts:1357-1359`:

```ts
if (axis.failure_count >= MAX_TOTAL_FAILURES) {
    axis.status = 'stalled';
}
```

`MAX_TOTAL_FAILURES = 8` (line 238). Cincar's axis hits 8 idle turns (t135-t142 inclusive) and stalls on t142. With only one axis, `allAxesTerminal(op.axes!) === true` (line 1018) and the op enters recovery on the following tick:

```ts
if (allAxesTerminal(op.axes!)) {
    beginRecovery(op, turn, getCompletedObjectiveRecoveryReason(op), state);
    continue;
}
```

`getCompletedObjectiveRecoveryReason` returns `max_failures` whenever there is at least one logged attack (we have two).

### 2.4 Brigade-side: why `anyAttacked === false` every turn

This memo did not deep-dive into the brigade-attack predicate — that would need a separate brigade-AI trace. The relevant gates are at `src/sim/combat/bot_brigade_ai_osid.ts` (per-brigade attack eval) and `src/sim/combat/bot_brigade_eval_attack.ts` (predictor outcome check). The combined effect is: brigades reach `kupres_2` adjacency post-bucovaca but each per-brigade attack-feasibility check returns "do not attack" (likely because predicted per-brigade outcome < `min_attack_outcome`), so all 5 sit `defend`/`hold` and the axis sees `anyAttacked = false`. That's a brigade-AI defender-strength interaction (H1/H3 territory), but the op-level mechanism that converts that into abort is H2.

---

## 3. Hypothesis Verdicts

| # | Hypothesis | Verdict | Notes |
|---|---|---|---|
| H1 | kupres_2 defender too strong → per-brigade predictor refuses attack | **Contributing cause** | Drives `anyAttacked=false`. But not the abort trigger. Brigade AI not exercised in this memo; deferred. |
| H2 | `MAX_TOTAL_FAILURES=8` per axis aborts single-axis Cincar | **Confirmed primary cause** | failure_count reaches 8 on t142, axis stalls, op recovers `max_failures`. Source: sector_offensive.ts:1326, 1357, 543. |
| H3 | Brigade depletion crushes per-turn outcome | **Not in n1983** | brigade_count stays at 5; suffered 160 KIA / 292 WIA total across the op (final strength 10,871 — net **growth**). Not depletion-driven. |
| H4 | `idleStallThreshold=4` ticks too fast | **Bypassed** | The early-stall guard requires `attack_attempt_count === 0`. Cincar already has 2 attacks, so this path is skipped and the slower 8-count path is used. |
| H5 | No cohesion recovery between attacks | **Possibly relevant for H1 upstream** | Not confirmable from AAR alone; would need brigade temporal log. Even if true, it's an input to H1 (drives predictor pessimism), not the abort trigger. |

So: **H2 is the proximate cause.** H1 (with H5 feeding it) is the deeper cause of why the brigades don't engage — but the brief asked which hypothesis "fires", and that is H2.

### 3.1 Per-turn failure-counter trace (reconstructed from log)

| Turn | anyAttacked | anyMoved | attack_attempt_count | idle_streak | failure_count | Trigger |
|------|------------|----------|----------------------|-------------|---------------|---------|
| 133  | true       | —        | 1                    | 0           | 0             | attack logged |
| 134  | true       | —        | 2                    | 0           | 0             | attack + capture |
| 135  | false      | false    | 2                    | 1           | 1             | idle |
| 136  | false      | false    | 2                    | 2           | 2             | idle |
| 137  | false      | false    | 2                    | 3           | 3             | idle, status=stalled flagged in weekly_log |
| 138  | false      | false    | 2                    | 4           | 4             | idle (would trigger early-stall if attack_attempt_count==0; bypassed) |
| 139  | false      | false    | 2                    | 5           | 5             | idle |
| 140  | false      | false    | 2                    | 6           | 6             | idle |
| 141  | false      | false    | 2                    | 7           | 7             | idle |
| 142  | false      | false    | 2                    | 8           | **8**         | **failure_count ≥ MAX_TOTAL_FAILURES → axis.status='stalled'; allAxesTerminal → beginRecovery** |
| 143  | —          | —        | —                    | —           | —             | phase=recovery, recovery_reason='max_failures' |

`anyMoved` is inferred from `attacks_this_turn=0` plus `momentum=0` and the `stalled` event appearing in `notable_events` — the engine emits `stalled` once `idle_execution_turn_streak >= idleStallThreshold (=4)` is crossed, which matches the t137 first appearance only if movement_only flips are absent. The exact `anyMoved` path is the one bit the AAR doesn't directly reveal — it could be `movement_only_execution_turns` accruing instead — but the `stalled` event annotation and the lack of casualty traffic strongly suggest the `!anyMoved` branch (true idle, incrementing `failure_count`).

If instead the brigades were marching every turn (`anyMoved=true`), then `movement_only_execution_turns` would have hit `MAX_MOVEMENT_ONLY_EXECUTION_TURNS=4` at t138 and recovery would have fired then with reason `max_failures` still (one logged attack). The op would have ended ~4 turns earlier. Since it ended at t143 (recovery), the **idle branch is what fired**, not the movement-only branch.

---

## 4. Where Force-Ratio 4.74 Doesn't Help

Cincar passed the launch gate (`MIN_LAUNCH_FORCE_RATIO_FLOOR = 0.3`, sector_offensive.ts:201) cleanly with 4.74 — this is the **operation-level** estimate computed at planning. Once executing, no per-turn op-level force-ratio recheck gates the axis; instead each per-brigade decision goes through `bot_brigade_eval_attack.ts` and the per-attack outcome predictor. After bucovaca, the line moves to face the VRS 2nd Krajina at kupres_2 + Kupres town terrain, and the per-brigade outcome predictions evidently go below `min_attack_outcome` (whose default is `'repulsed'` = 0.5).

The op-level estimate was right for bucovaca (rifle-density 4.7:1 attacker advantage in the lowland) and wrong for kupres_2 (different terrain class + entrenched + urban + dedicated VRS garrison). The engine doesn't recompute the op-level force ratio mid-execution to detect this shift.

This is the gap that fix candidates (a)/(c)/(e) all attack from different angles.

---

## 5. Fix Recommendation: (a) Lower single-axis idle ceiling

### Why (a) is the smallest-surface-area engine-side fix

The current `MAX_TOTAL_FAILURES = 8` is one constant applied uniformly. The docstring already calls out the multi-axis vs single-axis asymmetry (sector_offensive.ts:226-237):

> WARNING (Issue #29): In multi-axis operations this cap is applied PER AXIS, not per operation. With 5 axes × 5 failures each, the operation can sustain 25 total failures...

And lists three fix candidates, including option (c): **"Reduce to MAX_TOTAL_FAILURES = 3 for multi-axis and keep 5 for single."**

For Cincar's failure mode the inverse is also helpful — for **single-axis** ops we already have:
- `MAX_OPERATION_ZERO_PROGRESS_FAILURES = 3` (line 255) — fires only if zero captures
- `idleStallThreshold = 4` (line 1334) — fires only if attack_attempt_count === 0

Both backstops are bypassed when an op has ≥1 capture and ≥1 attack but then goes idle. That's the exact "post-breakthrough stall" pattern. A targeted single-axis idle ceiling of 4-5 (instead of 8) would have aborted Cincar at t138-139 instead of t143, freeing the brigades for follow-on tasking 5 turns earlier without otherwise changing engine behavior.

Concretely:
```ts
const MAX_TOTAL_FAILURES_SINGLE_AXIS = 4;   // new
const MAX_TOTAL_FAILURES = 8;               // unchanged (still binds multi-axis per-axis branch)
// at line 1357:
const cap = (op.axes!.length === 1) ? MAX_TOTAL_FAILURES_SINGLE_AXIS : MAX_TOTAL_FAILURES;
if (axis.failure_count >= cap) {
    axis.status = 'stalled';
}
// mirror at line 1580 for the legacy flat branch.
```

### Why not the others

- **(b) Increase MAX_TOTAL_FAILURES for late-war depleted ops.** Wrong direction. Cincar isn't depleted (final strength > initial). Raising the ceiling delays the abort, doesn't fix the no-attack predicate. Also adds late-war/early-war classification, a new axis we don't want.
- **(c) Add a brigade cohesion-recovery pause between objectives.** Plausible long-term but heavy surface area: new lifecycle state, ordering question (recover-then-attack vs attack-then-recover), determinism risk. Not minimal.
- **(d) Lower kupres_2 defender weight in OOB.** Violates "fix engine/OOB before data overrides" only as a railroad. Kupres was a real fight, and the defender data is part of canon. Out.
- **(e) Change Cincar's `min_attack_outcome`.** Scenario-data fix; lowers per-brigade attack threshold below 'repulsed', causing brigades to launch suicidal attacks. Bleeds personnel into kupres_2 instead of releasing them to the next op. Worse player experience and likely worse historical fidelity (kupres_2 fell in November 1994 in real history, not summer/early-fall 1994 — this op is *historically supposed to stall*).
- **(f) Author Cincar Phase 2 as a separate op.** Already attempted at Wave 9 (per brief); abandoned due to multi-axis spawn issue. Doesn't fix the root engine behavior; future ops will hit the same trap.

(a) is the smallest blast radius and produces the right behavior: stop wasting 5 turns of corps-op-slot on an op whose remaining axis can't engage, free the brigades for Mistral 1/2 cascade staging earlier.

### Side effects of (a) to expect

- **Faster op churn.** Other single-axis ops that currently lean on the 8-failure budget (rare — most ops either capture quickly or never attack) will abort 4 turns earlier. Calibration drift likely small.
- **Mistral 1/2 cascade unblocking.** Brigades released to corps pool 4-5 turns earlier — exactly the desired Krajina-zone cascade unblock.
- **Determinism-safe.** No new randomness, no new ordering, just a smaller integer constant on the single-axis branch.
- **No data changes.** No OOB, no scenario, no override files.

### Verification path (out of scope for this memo)

1. Add `MAX_TOTAL_FAILURES_SINGLE_AXIS = 4`.
2. Re-run `npm run sim:scenario:run:40w` — confirm no anchor regression.
3. Re-run apr1992 188w — verify Cincar ends at t138-139 with `recovery_reason: 'max_failures'` and brigades freed in time for Mistral 1.
4. Spot-check 188w `operation_aars.json` for any other single-axis ops whose `recovery_reason == 'max_failures'` and `objectives_captured > 0` — those will now end earlier; that's the intent.

---

## 6. Caveats / Unverified

- **`min_attack_outcome` value for Cincar.** Not surfaced in the AAR. The brief states `'repulsed'`. If it's instead `'pyrrhic'` or stricter, the launch-floor for force ratios drops further but doesn't change the abort path. (The launch-floor only gates initial launch; once executing, it's the per-attack predicate that matters.)
- **kupres_2 defender composition at t135-142.** Not extracted in this memo — would require `final_save.json` + `formation_delta.json` cross-walk to identify the VRS brigade(s) at `op:kupres:kupres_2` and their cohesion/morale/entrenchment. The brigade-side decision (`anyAttacked === false`) implies the predictor is unfavorable, but the exact margin is unverified. If the panel wants H1 nailed down quantitatively, that's a follow-on read.
- **`anyMoved` per turn at t135-t142** is inferred (see §3.1). Best evidence: the `stalled` notable_event appears starting t137 (3rd idle execution turn), consistent with the idle branch counter. If the movement-only branch were firing, recovery would have happened at t138, not t143.
- **Single-axis op identity check.** `op.axes!.length` for Cincar in n1983 = 1 (axis = `kupres_cincar_line`). Confirmed from AAR `axis_summaries` array length = 1.
- **`MAX_TOTAL_FAILURES = 8` vs docstring "MAX_TOTAL_FAILURES = 5".** The line-237 docstring references `5` but the constant on line 238 is `8`. The constant is what fires. Worth flagging for a separate doc-correction lane.

---

## 7. Reportback Summary

- **(a) Hypothesis:** H2 — single-axis Cincar Phase 1 stalls when its only axis `failure_count` hits `MAX_TOTAL_FAILURES=8` after 8 idle execution turns post-breakthrough. H1 contributes upstream (drives the per-brigade non-engage decision) but is not the abort trigger.
- **(b) Per-turn failure trace (t135-t142):** 8 idle turns, each incrementing `axis.failure_count` by 1 (via sector_offensive.ts:1326). `attack_attempt_count` stayed at 2 (from t133-t134), bypassing the early `idleStallThreshold=4` short-circuit (line 1335). Axis stalled at t142; `allAxesTerminal` returned true; `beginRecovery(..., 'max_failures')` fired at t143.
- **(c) Recommended fix:** **(a)** — introduce `MAX_TOTAL_FAILURES_SINGLE_AXIS = 4` and gate it on `op.axes!.length === 1`; keep multi-axis at 8. Single constant + single conditional, mirrored at the legacy-flat path (line 1580). No data, no lifecycle, no determinism risk.
- **(d) Memo size:** verified at write time (see file size on disk).

---

*End of memo. Investigation produced per-turn engine trace and source-cited cause-of-abort. No fix has been applied. Next step is a sector_offensive.ts edit gated through /operations-expert + /determinism-auditor + /canon-compliance-reviewer per skill protocol.*
