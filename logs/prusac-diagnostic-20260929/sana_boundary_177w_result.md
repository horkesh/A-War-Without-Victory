# Operation Sana t176 boundary: one-prefix diagnostic result (2026-10-02)

**Verdict:** the n30 Sanski-axis prefix loss is reproduced and its immediate selector input is established. This is a diagnostic of a rejected configuration, not an accepted calibration or a production correction.

## Run integrity

- The sole dispatched 177-week replay exited **0**. Raw trace and campaign output: `sana_boundary_177w_once.stdout.log`; errors: `.stderr.log`; start and exact exit: `.started.txt`, `.exit.txt`.
- The guarded helper restored `src/sim/combat/operation_opportunity_catalog_5th_corps.ts` byte for byte. Original and restored SHA-256 are both `3B693087C9A4C4727802BF02FB90A7F01CEAB1CA168E096DDBCB4A6E0341C6CD`; see `.catalog.restore.txt`. The temporary Otoka replay is not retained in source.
- Unique prefix: `runs/apr1992_definitive_188w__d1672a0eaaf899ff__w177_n31`. All 177 raw `weekly_report.jsonl` rows exactly match the first 177 rows of retained `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n30`; there is no divergent row. The observation trace did not change those reports.
- The first `powershell.exe` launcher attempt failed before backup, source change, or campaign dispatch because that shell lacked `Get-FileHash`. The corrected `pwsh` launcher dispatched the **one** prefix. See `sana_boundary_prefix_plan.md` and `sana_boundary_run_opencode_corrected.log`.

## Boundary mechanism

At **t176 before planning reconciliation**, the `sana_sanski_most_kljuc` axis still listed all 14 authored objectives. The first 11, from Donji Dubovik through Sanica, were RS controlled and each yielded an empty `collectObjectiveApproachOsids` set. The first reachable objective was index 11, `op:kljuc:hadzici`, with approach `op:titov_drvar:prekaja_2`.

The actual live front edge was `op:kljuc:hadzici__op:titov_drvar:prekaja_2`: Hadžići **RS**, Prekaja **HRHB**. The adjacency is bidirectional; the approach helper treats allied HRHB control as friendly to the RBiH operation. No matching 5th Corps subsegment or static graph edge appeared in this trace call. `pruneUnreachablePlanningObjectivePrefix` therefore sliced from index 11. The t176 post-reconciliation receipt returned `valid` and retained only **Hadžići, Ključ, Krasulje**. The t177 pre/post receipts still show those three. This is the immediate reason the n30 Sana operation could complete its Ključ tail while never attempting the four Sanski belt objectives.

The early Prekaja control arose from an ordinary HRHB combat win by the Kralj Petar Krešimir IV brigade in **Operacija Kamen at t175**, recorded in n30's `weekly_report.jsonl`. Kamen ran planning t171, execution t172–174, recovery t175. Retained n29 has no Kamen diagnostic or Prekaja battle at t169–177; retained n25 won Prekaja at t178 under Mistral 2, after this t176 boundary. Thus Kamen's early capture supplied the HRHB approach at the exact n30 prune boundary. The broader upstream reason Kamen differed between runs is not established here.

The 506th and 517th were still at Bihać, moving to Otoka, at t176; both arrived at Otoka at t177. Their physical positions were not inputs to this prefix selector. The axis staging value itself is also not read by `pruneUnreachablePlanningObjectivePrefix`; this replay proves the n30 boundary mechanism, **not that Otoka staging alone caused Kamen or the early Prekaja win**. The earlier synthetic fixture's Jasenovac–Hadžići example was a selector demonstration; the actual n30 approach used the **Prekaja–Hadžići** edge.

An independent Sol reviewer checked the selector implementation, all four trace receipts, raw-run equality, Kamen's battle and control event, and the n29 contrast. It confirmed the immediate n30 mechanism and the above limits. It also verified that live front adjacency is bidirectional; the named edge does not imply a directed route.

## Scope and next decision

This prefix stops at t177 and cannot establish October checkpoint acceptance, restore the four Sanski belt gains, or resolve the separate two-turn Mistral 2/Southern Move delays and inherited Varošluk loss. Retained n29 does not serialize its exact t176 planning-boundary front state, so its exact first-reachable index is unknown.

Recommended smallest next scope: test a focused policy for an RBiH operation's authored Sanski sequence when an allied HRHB contact makes a later Ključ objective reachable first. The test should preserve lawful allied combat approaches while preventing that later contact from silently deleting the unattempted Sanski prefix. Check the existing operation-specific sequence/approach rules and their canon authority before changing production logic; a global `preserve_objective_sequence` toggle may strand unrelated operations. Reuse this diagnostic and require targeted tests and independent review before proposing one new measured candidate. No new full suite or 188-week run is authorized by this diagnostic. Farz P-A §6 remains **NO-MERGE**; n30 remains unadopted.
