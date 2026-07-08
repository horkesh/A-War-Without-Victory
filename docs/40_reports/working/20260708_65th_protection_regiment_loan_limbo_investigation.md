# 65th Protection Regiment Loan-Limbo Investigation

Date: 2026-07-08
Packet: RR2-2
Status: Investigation complete; lifecycle and final-sector repair implemented

## Verdict

The finding is real. In the 2-week campaign slice the 65th was not permanently unresolvable, but the later 52w baseline run proved there was a second class: recent sector-exempt active loans could surface as routine unresolved warning noise while still in their loan lifecycle window.

The 65th starts correctly as an unloaned VRS Main Staff elite at Han Pijesak. On turn 1 the army reserve system auto-accepts a Sarajevo-Romanija Corps critical reserve request and loans the 65th to `vrs_sarajevo_romanija`. The final sector warning fires twice while the brigade is still at its Main Staff home OSID and marching toward the receiving corps. By turn 2 the same brigade is assigned into `sector:vrs_sarajevo_romanija:5`.

The implemented repair has two layers. Final unresolved diagnostics suppress legitimate in-flight transitions when a loan starts on the current turn, when a recent sector-exempt active loan is still inside the minimum loan window, or when an active loaned elite has a column deployment order, while stale/no-column failures remain reportable. Late/final sector reconciliation rescues loaned elites that have reached receiving-corps territory before unresolved warnings are collected. A dynamic redeploy-order variant was tested, but rejected because it pushed 188w engine health red.

## Short-Run Evidence

Command:

```powershell
npx.cmd tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_40w.json --weeks 2 --unique --out runs > docs/40_reports/working/20260708_rr2_65th_2w_console.log 2>&1
```

Result:

- Exit code: 0
- Run dir: `runs/apr1992_definitive_40w__c410759aa651b613__w2_n47`
- Final hash: `337e1e0bd753bf26`
- Captured final-pass warnings: 2
- Warning rows: both are `UNRESOLVED rs_65th_protection_motorized_regiment (1200 pers): fell through sector pipeline, corps=vrs_main_staff`

65th state:

| Save/log | Turn | Loan state | Location | Sector | Operation |
|---|---:|---|---|---|---|
| `initial_save.json` | 0 | `on_loan=false`, `loaned_to_corps=null` | `op:hanpijesak:han_pijesak_2` | none | none |
| `brigade_temporal_log.jsonl` | 1 | active loan begins | `op:hanpijesak:han_pijesak_2` | none | `vrs_sarajevo_romanija:Operation Prsten:t0` |
| `brigade_temporal_log.jsonl` | 2 | active loan | `op:sokolac:sokolac_2` | `sector:vrs_sarajevo_romanija:5` | `vrs_sarajevo_romanija:Operation Prsten:t0` |
| `final_save.json` | 2 | `on_loan=true`, `loaned_to_corps=vrs_sarajevo_romanija` | `op:sokolac:sokolac_2` | assignment kind `sector`, role `front` | active |

Other loaned exempt-corps formations in the same final save:

- `rs_1st_guards_motorized`: VRS Main Staff, loaned to `vrs_drina`, assigned by turn 1 and turn 2.
- `rs_65th_protection_motorized_regiment`: VRS Main Staff, loaned to `vrs_sarajevo_romanija`, unresolved at turn 1 only, assigned by turn 2.

## Code Receipts

- `src/sim/combat/corps_front_sectors_constants.ts` exempts `vrs_main_staff` from normal sector assignment.
- `src/sim/combat/brigade_assignment.ts` intentionally skips exempt-corps formations only when they are not loaned; loaned exempt-corps formations are expected to resolve into receiving-corps sector truth.
- `src/sim/combat/army_reserve_system.ts` generates one pending reserve request per eligible non-exempt corps, selects same-faction available elites by nearest distance, and deploys accepted loans through `deployEliteLoan`.
- `src/sim/combat/army_reserve_system.ts` records the 65th loan as `offensive_support`, `approval_by=army_ai`, and issues deployment movement.
- `src/sim/combat/pre_planned_operations.ts` also has a path for explicitly named exempt-corps elites in preplanned operations, but the run evidence for the 65th came from the reserve-request path, not from explicit Operation Prsten brigade listing.

## OOB And Historical Receipts

- `data/source/oob_brigades.json` defines `rs_65th_protection_motorized_regiment` as `corps=vrs_main_staff`, `home_osid=op:hanpijesak:han_pijesak_2`, `is_elite=true`, initial personnel 1200.
- `docs/knowledge/VRS_ORDER_OF_BATTLE_MASTER.md` lists Main Staff VRS at Han Pijesak/Mount Zep and lists the 65th Protection Motorized Regiment under Main Staff VRS, not under Sarajevo-Romanija Corps.
- `data/derived/knowledge_base/balkan_battlegrounds/extractions/20260224_HISTORIAN_BASELINE_CONTROL_START_20W_52W.md` cites Han Pijesak as RS with VRS Main Staff rear bases/HQ evidence (BB1 p.496, p.501).
- `data/derived/knowledge_base/balkan_battlegrounds/pages/BB2_p0559.json` contains a later-war source note that elements of the 65th Protection Motorized Regiment participated in VRS composite operations in western Bosnia, supporting the general concept that Main Staff elements could be detached, but not specifically proving an April 1992 Sarajevo-Romanija loan.

## Risk Assessment

The original 2-week warning was not evidence of a permanently stranded formation. It showed that final-pass unresolved diagnostics could not distinguish a loaned elite in a legitimate deployment/march window from a genuinely stranded loaned elite.

Changing the loan target or making the 65th organic to Sarajevo-Romanija would conflict with the OOB receipts. Removing the loan path would suppress legitimate army-reserve behavior and would need broader balance review. The chosen repair keeps the OOB and loan target intact: diagnostics suppress legitimate recent/in-flight loans, unreachable active loans still recall through the existing lifecycle path, and sector reconciliation rescues loaned elites already inside receiving-corps territory before unresolved warnings.

## Next Actionable Repair

Implemented follow-up:

1. Added focused regressions in `tests/army_reserve_system.test.ts` for same-turn loan handoff, column assembly movement before operation attachment, operation-owned staging movement, and the paired non-column negative case.
2. Implemented `isMovementOwnedActiveLoanDeployment()` in `src/sim/combat/brigade_assignment.ts` and wired it into final unresolved collection.
3. Re-ran the 2-week scenario proof:
   - Run dir: `runs/apr1992_definitive_40w__c410759aa651b613__w2_n52`
   - Final hash: `337e1e0bd753bf26`
   - Console check: no `UNRESOLVED rs_65th_protection_motorized_regiment` lines.

Continuation proof:

1. Added `tests/final_sector_truth_reconciliation.test.ts` coverage proving recent sector-exempt active loans are diagnostic-owned during the minimum loan window.
2. Added `tests/final_sector_truth_reconciliation.test.ts` coverage proving final seal rescues loaned elites in receiving-corps territory before warning collection, plus a static order guard for the final seal.
3. Rejected the dynamic reachable-loan redeploy variant after 188w engine health failed (`dead_ops=30`, `matched_osids=643`).
4. Ran adjacent focused proof: `npx.cmd vitest run tests/sim/combat/phase3_reliability_decay.test.ts tests/final_sector_truth_reconciliation.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/loaned_elite_rescue_reserve_cap.test.ts tests/army_reserve_system.test.ts tests/command_authority_economy.test.ts tests/ui/audio_preferences.test.ts tests/sandbox_slice_determinism.test.ts --pool=forks --reporter=dot` passed, 8 files / 100 tests.
5. Ran `UPDATE_BASELINES=1 npm.cmd run test:baselines` to refresh the intentional `apr1992_52w` artifact movement caused by diagnostic/final-sector output changes.
6. Ran strict `npm.cmd run test:baselines`; it passed with `Baseline regression: all scenarios match`, no `UNRESOLVED rs_65th`, no `ENOENT`, and no baseline mismatch.
7. Ran fresh 188w engine health on `runs/eh_rr2/apr1992_definitive_188w__acb538b04d79af3c__w188_n4`; gate passed with `dead_ops=12`, `matched_osids=646`, `pass=true`.
