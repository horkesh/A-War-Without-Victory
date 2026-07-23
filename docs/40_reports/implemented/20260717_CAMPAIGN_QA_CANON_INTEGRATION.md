# Campaign QA Canon Integration - 2026-07-17

## Status

Implementation complete and deterministic locally. Publication is through PR #477; packaging, tagging, and release publication are not authorized by this packet.

## Scope

This packet closes the long-horizon engine findings that remained after the RBiH and RS 52-week player-experience passes. It corrects engine truth, operation diagnostics, historical-default negotiation behavior, and late-war integration without weakening the canonical brigade-dissolution rule.

## Implemented Corrections

- COHA now suppresses operation attack/posture orders with explicit receipts, preserves legal movement, and pauses the affected operation lifecycle clock.
- Battle receipts carry exact attacker brigade and contributing operation ids. Scenario diagnostics no longer infer operation causality from a shared target.
- Bot uncontested occupation is restored only inside the assigned sector/subsegment or an explicit directive target, with defender, nearby-defense, operation, disruption, cooldown, enclave, and connectivity guards.
- Commander objective, fallback, reachability, and stale-target checks use the deterministic primary sector.
- Historical operation opportunities filter authored participants through live corps, lifecycle, personnel, disruption, and transit eligibility while preserving authored order.
- Forming formations are excluded from both elite-loan rescue roster paths and every operation participant path.
- Cincar staging requires explicit HRHB control. HV integration uses deterministic all-or-nothing legal placement and records one truthful BiH station/home location.
- Paramilitary spawning uses local faction organizational penetration and dominance after exact and adjacent organized-defense exclusions, with deterministic per-mode, per-faction, and per-municipality caps instead of a pseudo-random rate.
- Historical-default peace plans use explicit faction dispositions. Cutileiro receives a one-time first-War-turn catch-up while preserving offer turn 0; Dayton remains owned by its dedicated resolver.
- Rear-pocket consolidation now applies the centralized RBiH-HRHB combat-permission gate before any flip. Active definitive April 1992 scenarios and runtime fallbacks share the canonical turn-40 earliest-war floor, eliminating three turn-21 allied seizures found during pre-publication review.

## Calibration Contract

Fresh definitive run:

- Runs: `runs/eh_local_canon40_a_20260717/apr1992_definitive_188w__63a3a0858050b865__w188_n0` and `runs/eh_local_canon40_b_20260717/...`
- Final-state hash: `aa4302e694a6482e`
- Matched OSIDs: `622/712`
- Zero-eligible operations: `0`
- Dead operations: `3`
- Ghost destroyed formations: `0`
- Stranded brigades: `3`
- Consistency failures: `0`
- K:W: `3.813` (`105,931` killed / `403,878` wounded)
- Endpoint anchors: `31/31`
- Pre-turn-40 RBiH-HRHB control events: `0`

The pair is byte-identical across initial save (`3E0D781E6E5A232BE9646690F862837EC1D0905AF2AFA70A0AC429EA6623763D`), final save (`AA4302E694A6482E22AE2EE3548F862BAAC10D54D858CBBB503F3A869293B51F`), run summary (`AA77351C4B70882A4C5EA73A7012890621F5869AA6887E45C0414EBCA9FD825F`), control delta (`8C5B29F55B3694C0B31D897AD2F3FE2CA46DAB928BFAA401E4FEE5F6EFCE01A1`), and formation delta (`0F0A10A5B17BEDFC9DE521997E49D6D624C0B076E426F94D5B02993895240C61`).

The provisional `628` / `d0ed71eb11ef99fe` lane is rejected because it used a different initial military state and admitted illegal allied captures. Pre-publication review then found that the first `622` pair still allowed three turn-21 RBiH seizures of HRHB territory through rear-pocket consolidation. That pair is retained only as diagnostic lineage. Applying the centralized bilateral gate and synchronizing definitive scenarios to the canonical turn-40 floor keeps the accepted fit at `622/712`, removes all pre-war bilateral control events, and closes both Brcko endpoint misses. The prior `646` floor predates the accepted canonical two-of-three brigade-dissolution correction and local organizational-penetration policy. Restoring non-canon survival or pseudo-random spawn guards to recover it would contradict the Engine Invariants and Systems Manual.

## Focused Verification

- Combined combat integration: 14 files / 266 tests passed.
- Commander and uncontested-occupation integration: 7 files / 65 tests passed.
- Historical peace-plan suites: 6 files / 109 tests passed.
- Opportunity catalog suites: 130 tests passed; adjacent opportunity suites: 70 tests passed.
- Paramilitary suite: 57 tests passed.
- Consistency validator: enclave movement legality mirrors all nine canonical enclave geometries; the exact 188-week save passes with zero actionable failures.
- Forming-loan and dissolution regressions: 24 tests passed.
- Typecheck passed before final documentation reconciliation.
- Two exact 188-week runs were byte-identical and the re-blessed engine-health gate passed.
- Bilateral consolidation red proof failed 2 assertions before the fix; the green timing/consolidation pack passed 9 files / 91 tests with 4 intentional skips.
- Current 40-week structural proof is HRHB/RBiH/RS `85/251/376`, final hash `b4411ca087401148`, fingerprint `4fcdb21ab4bcff14`, 31/31 anchors, and 6/6 benchmarks.

## Final Local Verification

- Full Vitest suite: 1,204 files passed, 4 skipped; 11,683 tests passed, 29 skipped; 0 failed.
- `npm run qa:player-experience`: passed, including typecheck, desktop release builds, 8 files / 81 Electron-runtime tests, 44 files / 756 player-journey tests, first-hour browser proof, live-surface browser proof with all 42 screenshots, and output scan.
- `npm run desktop:startup-snapshot:check`: passed at SHA-256 `FCB9AFD6CA6C5E8AC4B5DDB635B5F103624EFDE053F323DEB5B1C1BCF1EA93F0`.
- `npm run ci:structural-fingerprint:check`: passed at `4fcdb21ab4bcff14`.
- `npm run test:baselines`: passed with all scenarios matching.
- `npm run canon:check`: passed, including the determinism static scan and baseline regression.
- `npm run typecheck` and `npm run build`: passed.
- The live-surface proof was rerun cleanly after one transient Windows localhost `ERR_NO_BUFFER_SPACE`; the final aggregate player-experience run completed without that error.

## Residual Balance Advisories

These are non-gating balance and deployment observations from the accepted 188-week run, not hidden correctness failures:

- 139 of 186 battles (74.7%) were decisive victories, above the current 70% warning line.
- Three loaned elite/general-staff brigades, one active-operation participant, 66 sector-front brigades, three reserve/rear-support brigades, and two sector-rear brigades recorded no battle.
- Out-of-area formation rates remain high for ARBiH 3rd Corps (71%), HVO Southeast Herzegovina (79%), VRS 1st Krajina (83%), VRS 2nd Krajina (63%), and VRS Herzegovina (63%).
- Attributed combat casualties were 19,008 attacker to 28,945 defender (0.66); 2,886 frontline-friction casualties are excluded from that ratio.
- One four-brigade stack remained at `op:brcko:krepsic`.
- Three RBiH sectors remained low-density: `sector:arbih_1st_corps:7`, `sector:arbih_2nd_corps:6`, and `sector:arbih_2nd_corps:8`.
- 17 of 207 eligible brigades (8.2%) finished more than six graph hops from home while their home ownership remained live.

## Documentation

Synchronized:

- Engine Invariants and Systems Manual.
- War Termination Spec and Determinism Test Matrix.
- C3 freeze manifest and required CI workflow wording.
- Calibration Master, Game State Rating Master, Command Board, and Master Roadmap.
- Reports indexes, project ledger, reusable knowledge ledger, and repository napkin.

`docs/10_canon/FORAWWV.md` is unchanged.
