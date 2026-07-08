# Pending Queue Growth Audit

**Date:** 2026-07-08
**Packet:** RR2-5A from `docs/plans/2026-07-08-release-review-round2-findings-plan.md`
**Scope:** Original read-only audit of `military.pending_officer_events` and `military.narrative_queue`; followed by one accepted lifecycle cap and one rejected prune experiment in the RR2 execution pass.

## Summary

Both audited arrays grow materially between the existing w2 and w188 saves. `pending_officer_events` has a real consumer and a real prune path, but the prune path only removes acknowledged rows. The w188 sample contains 303 unacknowledged rows, including historical/bot-faction army-directive pushbacks, so the queue is **UNBOUNDED in non-player/headless runs unless a separate acknowledgment or archival policy handles those rows**.

`narrative_queue` has a producer and save-shape validation, but this audit found no source consumer or prune path under `src/`, `tests/`, or `tools/`. It should be treated as **UNBOUNDED / likely never-consumed** until a follow-up proves an external consumer.

## Implementation Addendum

RR2 implemented only the safe bounded lifecycle guard in `src/sim/turn_phases/war_phases.ts`:

- `narrative_queue`: retained as a recent historical/AAR substrate, capped deterministically to the latest 128 entries with stable array order.

The attempted `pending_officer_events` prune for stale non-player/headless unacknowledged rows was reverted. A 188w comparison showed it was not cosmetic queue cleanup: pruning reduced pending rows from the passing run's 304-range to 9, removed offensive suppression/dedupe state, and produced a hard engine-health failure (`dead_ops=30` vs max 15; `matched_osids=643` vs min 646). Restoring unacknowledged rows returned the fresh 188w gate to green (`dead_ops=12`, `matched_osids=646`, `pass=true`). Focused coverage in `tests/sim/combat/phase3_reliability_decay.test.ts` now pins stale acknowledged pruning, stale unacknowledged player/non-player/headless retention, and the 128-entry narrative cap.

## Measurements

| Run save | Field | Count | JSON bytes | Acknowledged | Unacknowledged/actionable-shaped |
|---|---:|---:|---:|---:|---:|
| `runs/apr1992_definitive_40w__c410759aa651b613__w2/final_save.json` | `military.pending_officer_events` | 2 | 1,461 | 0 | 2 |
| `runs/apr1992_definitive_40w__c410759aa651b613__w2/final_save.json` | `military.narrative_queue` | 13 | 4,844 | n/a | 13 |
| `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json` | `military.pending_officer_events` | 303 | 237,133 | 0 | 303 |
| `runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json` | `military.narrative_queue` | 528 | 196,257 | n/a | 528 |

Measurement command used:

```powershell
node -e "const fs=require('fs'); const paths=['runs/apr1992_definitive_40w__c410759aa651b613__w2/final_save.json','runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39/final_save.json']; for (const p of paths){ const j=JSON.parse(fs.readFileSync(p,'utf8')); const m=j.military||{}; for (const k of ['pending_officer_events','narrative_queue']) { const v=m[k]; const count=Array.isArray(v)?v.length:'not-array'; const bytes=Buffer.byteLength(JSON.stringify(v??null)); const ack=Array.isArray(v)?v.filter(x=>x&&x.acknowledged===true).length:''; const unresolved=Array.isArray(v)?v.filter(x=>x&&x.resolved!==true&&x.acknowledged!==true).length:''; console.log([p,k,count,bytes,'ack='+ack,'unresolved='+unresolved].join('\t')); }}"
```

## Lifecycle Table

| Field | Producers | Consumers/readers | Prune path | w2 -> w188 | Verdict | Recommended next packet |
|---|---|---|---|---:|---|---|
| `military.pending_officer_events` | Corps interpretation pushes events at `src/sim/combat/order_interpretation.ts:433-437`; shared push helper at `src/sim/combat/order_interpretation.ts:836-840`; relief events at `src/sim/combat/order_interpretation.ts:953-967`; army directive/proposal helper at `src/sim/combat/army_order_interpretation.ts:748-752`; officer arrival/replacement events at `src/sim/combat/officer_system.ts:567-586` and `src/sim/combat/officer_system.ts:633-635`. | Decision manifest declares the family at `src/state/player_decision_manifest.ts:103-106` and filters unacknowledged rows at `src/state/player_decision_manifest.ts:276-281`; UI adapter filters unacknowledged/player-faction rows at `src/ui/map/data/GameStateAdapter.ts:2997-3025`; desktop IPC acknowledges selected events at `src/desktop/electron-main.cjs:3351-3356` and replacement accepts at `src/desktop/electron-main.cjs:3406-3410`; briefing reads pending rows at `src/sim/briefing/collect_briefing.ts:391`. | `src/sim/turn_phases/war_phases.ts:1816-1821` removes only rows where `acknowledged === true` and older than 8 turns. | 2 / 1.4 KB -> 303 / 237 KB | **UNBOUNDED but load-bearing for unacknowledged rows.** The stale non-player/headless prune experiment caused 188w engine-health regression, so unacknowledged rows must be treated as command lifecycle/dedupe state rather than disposable UI queue. | Add a sim-touching follow-up that separates actionable player pending rows from historical/bot advisory rows, or archives non-player rows deterministically while preserving dedupe/tombstone semantics. Stable-order pruning and save-compat tests required; run 188w comparison and `npm run test:baselines`. |
| `military.narrative_queue` | Significant battle rows are appended at `src/sim/combat/attack_resolution_osid.ts:1368-1378`. | Save validation only in audited source: row validation at `src/state/validateGameState.ts:2577-2592`, and validation dispatch at `src/state/validateGameState.ts:3685-3687`. Field is typed at `src/state/game_state.ts:2783`. | None found under `src/`, `tests/`, or `tools/`. | 13 / 4.8 KB -> 528 / 196 KB | **UNBOUNDED / likely never-consumed.** Name implies pending work, but no consumer or drain was found. | First prove whether an external/non-source AAR generator consumes it. If not, replace with bounded historical battle-narrative ledger or deterministic cap/prune at producer boundary. This is sim/persisted-output touching and needs save compatibility plus baseline proof. |

## Sampled w188 Rows

- First `pending_officer_events` rows are `army:RBiH:directive:1` and `army:RBiH:directive:2`, both unacknowledged `army_directive_pushback` rows with `overridable: true`.
- Last sampled `pending_officer_events` rows are `army:RS:directive:187` and `army:RS:directive:188`, also unacknowledged army directive pushbacks.
- First `narrative_queue` entries are battle AAR prompt inputs for VRS attacks at Bratunac and Ilidza.
- Last sampled `narrative_queue` entries are late-war battle AAR prompt inputs for HRHB at Drvar and RBiH at Vogosca.

## Follow-Up Constraints

Do not delete either field as a cleanup step. `pending_officer_events` is player-decision load-bearing. `narrative_queue` may still be intended as a future/offline AAR substrate even though no source consumer was found.

Implemented fix constraints:

1. Define whether retained entries are actionable pending work or historical receipts.
2. Preserve save compatibility for older saves with large arrays.
3. Use stable ordering for pruning/capping.
4. Prove player-facing decision rows do not disappear before acknowledgement.
5. Run `npm run test:baselines` and a 188w health comparison before re-bless.

Closeout note: strict `npm.cmd run test:baselines` initially exposed later 52w loan-diagnostic drift, not a queue-only defect. The RR2 continuation repaired the 65th diagnostic/final-sector path, rejected active-loan redeploy after engine-health regression, then ran `UPDATE_BASELINES=1 npm.cmd run test:baselines` for the intentional persisted-output movement. Strict `npm.cmd run test:baselines` now passes with no `UNRESOLVED rs_65th`, no `ENOENT`, and no baseline mismatch. Fresh 188w engine health is green (`dead_ops=12`, `matched_osids=646`, `pass=true`).
