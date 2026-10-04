# [072] Retained 737th admission evidence — result (Claude f75b0a11, read-only)

Verdict: **EXPLICIT MISSING-INPUT GATE** — no directly bound admission discriminator. No speculative correction.

## Measured (retained n25 vs n37, `runs/apr1992_definitive_188w__6deb5845c150c196__w188_{n25,n37}`)
Extraction: `072-extract.cjs` (exit 0), `072-plamicak.cjs` (exit 0), `072-weekly.cjs` (0), `072-diag.cjs` (0); outputs `072-*-out.json`, `072-diag-compact.txt`. Source: `brigade_temporal_log.jsonl` (week_index; turn=week+1), `operation_aars.json`, `weekly_report.jsonl.operation_diagnostics`.

737 (`arbih_737th_muslim_light`) path, change points only:
- w130–134 both: Gornja Rovna, Udurlije dest; w135 both dest cleared.
- **w137 (completed t138): n37 re-acquires Udurlije dest; n25 does not** (matches Convergence report; consistent with n42 helper write).
- w149–153 both: admitted to Operation Vlasic Ridge:t150 (both AARs list 737 as participant) → Paklarevo.
- **After Vlasic: n25** stays Paklarevo, dest Turbe_2 w161, at Turbe_2 w163; **n37** dest Medini w154 → at Medini w156, later Brizina by w179 (dest Udurlije again; sector 3→4→5→0→1 drift; dest Komar w186, Gornje Krčevine w187). Writer of the n37 Medini/Brizina/Udurlije destinations is **unreported**.
- **Plamičak admission (n25 only):** w178 sector 2 → w178/179 `sector:arbih_3rd_corps:1`, subseg 1:0, at Turbe_2. w179 `active_op=arbih_3rd_corps:Operacija Plamičak:t180`, phase planning. `operation_diagnostics` w180: `Operacija Plamičak | sector_attack | planning | obj op:travnik:varosluk | parts [737 only]`. AAR: 1 axis, 1 attack, captured Varošluk, `capture_provenance=logged_capture`, ended t182.
- **n37: no Plamičak anywhere** (0 hits in AAR/weekly/temporal). n37 w178–180 3rd-Corps ops = Donji Vakuf 95, Jajce Recovery (+probe w178); 737 is at Brizina, not Turbe_2, and is a participant of none.

## Source (static; NOT an executed-branch claim)
- Admission pool = `primaryPool ∪ attachedPool` (primary-sector brigades + adjacent-sector attachments), min `baseMinForOp` (2 anchored / MIN_BRIGADES_FOR_PLAN else) scaled by political/embargo multipliers, objectives must be reachable enemy OSIDs, then `isBrigadeEligibleForOperationObjectives` (`src/sim/combat/commander/emit.ts:1385–1522`).
- Single-brigade `sector_attack` like Plamičak is not obviously produced by that min-2 path; the other creation site is `sector_offensive.ts:2581` (`pickOperationName`, after `MIN_BRIGADES_FOR_OFFENSIVE`). Name pool: `operation_names.ts:170`. Which site created Plamičak is **unreported** (no creation-site/briefing receipt retained).

## Missing inputs (unreported, not zero)
1. Creation-site/briefing receipt at t180 (primaryPool/attachedPool, primary sector, min/multipliers, objectives before/after reachability and enclave filters) for n25; and n37's equivalent for 3rd Corps.
2. Writer/predicate of n37's 737 destinations at w154 (Medini), w179+ (Udurlije, Komar, Krčevine) and of n25's Turbe_2 (w161).
3. Why n37's 737 is in sector 3→5→0 (not sector 1) at w179–185 — sector assignment writer/trace.
4. Original dirty-517 and Jajce/Barevo/Lupnica/Majdan remain separate; no Varošluk gain proposed to satisfy them. n42/n41 final state not used to infer cause.

## Cheapest next check (needs authorization; not run)
Opt-in diagnostic receipt at the operation-creation sites (emit.ts ~1385 and sector_offensive ~2581) recording pool/min/objective-filter inputs for 3rd Corps, plus sector-assignment/destination writer receipt for 737 — bounded to weeks 137–181 only if a prefix run from a retained save at ≤t137 exists; otherwise a ≥139-turn run is again required. Chronology alone does not connect the t138 Udurlije churn to Plamičak; the retained data shows both runs share Vlasic admission and diverge at w154–163 (Medini vs Turbe_2), 17+ weeks after the t138 churn.
