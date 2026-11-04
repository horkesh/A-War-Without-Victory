# Farz 95 has no Tactical Group: root cause (Operations Expert, read-only)

Run: `apr1992_definitive_188w__6deb5845c150c196__w188_n3` (git_commit dfbab5f43, clean). The worktree's current HEAD has the same `src` as dfbab5f43.

## Measured facts
1. Farz was injected through the Army HQ path. `final_save.military.army_hq_operations` contains `ahq:RBiH:3:farz_95`, formed on t178, with `recovery_started_turn` 185 and status `completed`. `army_hq_last_op_turn.RBiH` is 178. The op's AAR id is `arbih_3rd_corps:Operation Farz 95:t178`. It was in planning from t178 to t180 and in execution from t181 to t187, and it captured all 3 objectives. It has no `army_hq_telemetry`.
2. RBiH already had 2 live TGs before Farz was injected: `tg:arbih_5th_corps:Operation Sana:arbih_505th…` and `…:arbih_510th…`. Both formed on t176 and were still `engaged` at t188. In the final save they are the only RBiH TGs.
3. No other RBiH TG existed in t178–188. Every dissolved TG writes `tg_recent_compositions[hash] = dissolve_turn + 6` (`tactical_group_lifecycle.ts:344`, `TG_DONOR_COOLDOWN_TURNS=6`). The highest RBiH value is 167. `arbih_2nd_corps` never appears in `tg_formations_by_corps`.
4. The `tg_formation_decline` key appears 0 times across all 71 AARs. The decline is written only when the reason-code topic `tg_formation` is on (`operation_preparation.ts:1112`). In a default run its absence tells us nothing. When `formTacticalGroup` rejects a TG, the code drops the rejection reason without recording it (`operation_preparation.ts:1196`, `:1317`).
5. Uragan 95 is a pre-planned op (`pre_planned_operations.ts:1915`) and has no `army_hq_op_id`. It can never carry `army_hq_telemetry`.
6. Between 81a65d76f and dfbab5f43, the only change to the TG, AAR, preparation and triggered files is in `triggered_operations.ts`: the trigger moved from 160 to 178 (line 605), and the primary-corps check now uses slot capacity.

## Causal chain
- `injectArmyHqOperations` records the Army HQ op with status `planning` (`triggered_operations.ts:1584-1595`).
- From then on, `factionHasActiveArmyHqOp` returns true for RBiH (`tactical_group_lifecycle.ts:569-588`), and `checkConcurrencyCaps` lowers the RBiH faction cap from 4 to 4−2=2 (`:560-561`).
- At the ready transition (t180/181), `formTgForSingleAxis` reaches `formTacticalGroup` (`operation_preparation.ts:1189`). Its cap check at `tactical_group_lifecycle.ts:144` counts the 2 Sana TGs, sees 2 ≥ 2, and returns `faction_tg_cap_reached`.
- So no TG is formed, `enterOperationRecovery` has nothing to snapshot (`:491-497`), and `buildArmyHqTelemetry` returns undefined (`operation_aar.ts:626-637`).
- `farz_objective_gate.cjs:8` identifies the authored Farz AAR only by `army_hq_telemetry.army_hq_op_id`, so it counts 0.
- The cap stays reduced until t189 (185+4), which also keeps Jajce Recovery, Donji Vakuf 95 and Uragan without TGs.

**Inference, not yet measured:** that the rejection happened at the cap check rather than at an earlier silent exit (no anchor, or donation below readiness). Given the state, the cap check fails deterministically, so any attempt that gets that far is rejected. A run with the `tg_formation` topic on would rule the earlier exits in or out.

## Verdict: a genuine engine defect, exposed by the t178 date
ADR-0005 §231 says the cap reduction "forces other ops to go quiet during the major effort". As written, the reduction also counts against the Army HQ op's own TG, so the op blocks itself. At t160 (the baseline), the Sana TGs (t176) did not exist yet, so Farz's TG fit under the reduced cap of 2. The 178 date is historically correct (ICTY Delić §285). It overlaps the real Sana timing, which uncovers the self-blocking.

## Smallest legal fix
In `checkConcurrencyCaps`, skip the reduction for the Army HQ op's own TG and keep it for every other op. Pass `params.army_hq_op_id` from `tactical_group_lifecycle.ts:144`. In `factionHasActiveArmyHqOp`, skip the entry whose `id === params.army_hq_op_id`.

The fix leaves the following unchanged:
- the base faction cap (4) and the corps cap (2)
- dates and the scorer
- ownership writes
- the CorpsOperation attack path

**Optional diagnostic, a separate change:** at `operation_preparation.ts:1196`/`1317`, record `formed.rejection_reason` under the `tg_formation` topic.

## Focused test (RED, then GREEN)
Add it to `tests/army_hq_op_lifecycle.test.ts` (flag-on):
- **Setup:** an RBiH Army HQ op `ahq:RBiH:3:x` with status `planning`, and 2 RBiH TGs already live in other corps.
- **Assertion 1:** `formTacticalGroup({ …, army_hq_op_id: 'ahq:RBiH:3:x' })` returns a non-null `tg_id`. Today it returns `faction_tg_cap_reached` (RED).
- **Assertion 2:** the same call without `army_hq_op_id` (or with a different id) still returns `faction_tg_cap_reached`.

The existing cap tests (`tg_fidelity.test.ts:255-298`, `army_hq_op_lifecycle.test.ts:230-245, 348-382`) use candidates without an id, so they must stay GREEN. After the fix, gate with a 188w re-run plus `verify_checkpoints` P-A.
