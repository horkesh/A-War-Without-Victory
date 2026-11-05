# Independent implementation review — combat-fatigue single owner

Date: 2026-10-26  
Reviewed base: `33f99fc5aac9a620a7bb0000cf233d86f270ce24`  
Verdict: **GO for the bounded combat-fatigue correction.** No blocking correctness, canon, determinism, or delta-scope finding was found.

## Reviewed delta and file identities

- `src/sim/combat/attack_resolution_osid.ts`: `ff8992ab13f54f7f5b2aea79adc1c2a2a6a4d1f9cb58acd21ed27726ea6069ab`
- `src/sim/combat/attack_resource_aftermath.ts`: `0cad82788378de0c6d1a82d5228eb5c8deac9d5b79263c7cfd860e63f3eab4b4`
- `tests/combat_fatigue_owner.test.ts`: `3125267ee44e1695ef41ca3b948e523c37cf950b8f07f85068b5fa2ea2f15901`
- `tests/attack_resource_aftermath.test.ts`: `61f76235330d2c6dcda189d0f7761e7ca78101a885abc1bd11b60eea8e3a534b`

The only production combat edits are the two files above. The other production diff, `src/sim/turn_phases/war_phases.ts`, is the previously reviewed request-personnel-floor correction and is outside this review.

## Correctness, canon, and determinism

The implementation matches the prior independent canon decision in `review-001/PREIMPLEMENTATION_CANON_DETERMINISM_REVIEW.md` (`bf5b2ec78618c278a8faeb2f88eb362ff70bbf5501e4d6cc5850192e17a7c4ad`):

- The resolver's earlier inline attacker and primary-defender fatigue writes and the now-unused `recordFormationFatigue` import are removed.
- `applyCombatFatigue` remains the single fatigue owner in the OSID resolver and is called once per resolved battle.
- Each attacker receives `+2` when a defending formation exists, or the preserved `+0.5` for an undefended sweep; the primary defender receives `+1`.
- Existing initialization (`ops = { fatigue: 0, last_supplied_turn: null }`) and the cap at 30 are unchanged and covered directly.
- Shared-battle attackers are handled by the existing stable `attackerFormations` traversal. The change adds no random source, timestamp, unordered selection, state field, or serialization surface.
- Moving ownership to the existing aftermath helper does not affect normal-path computations: no intervening resolver code reads formation fatigue before the helper call. Combat outcome, casualties, control-flip logic, retreat/advance, equipment, supply, enclave handling, command authority, and recovery formulas are unchanged.

The maintained resolver fixtures call the real `resolveAttackOrdersOsid` path and cover one defended battle, a shared battle with two attackers, and an undefended target. The helper tests cover defended/undefended deltas, primary-defender-only ownership, missing-`ops` initialization, and cap 30.

## Retained execution evidence

All receipt-declared stdout, stderr, entry-script snapshots, and Vitest JSON files present for attempts 001–007 and 009 match their recorded SHA-256 values. Receipts bind the current C-worktree as `cwd`; Vitest's JSON binds the maintained test files under that same worktree. `node_modules` is the disclosed junction to the prior dependency installation, so Vitest stack frames name that dependency path while the tests and source imports remain rooted in this worktree.

| Attempt | Child/wrapper | Retained result | Classification |
|---|---:|---|---|
| 001 | 1/1 | launcher root-normalization assertion | setup failure; resolver did not run |
| 002 | 1/1 | no test files found for the tmp fixture | discovery failure; resolver did not run |
| 003 | 2/2 | Windows absolute ESM URL rejection | loader failure; resolver did not run |
| 004 | 1/1 | 1 total, 0 passed, 1 failed; actual attacker/defender fatigue `4/2` | meaningful real-resolver RED |
| 005 | 1/1 | 21 total, 17 passed, 4 failed; defended `4/2`, both shared attackers `4`, undefended attacker `2.5`, helper null case `2` | extended meaningful RED |
| 006 | 0/0 | 21/21 passed | focused GREEN |
| 007 | 0/0 | 51/51 passed across four affected test files | affected regression GREEN |
| 009 | 0/0 | nonincremental TypeScript check; empty stdout/stderr; about 49.2 seconds | typecheck GREEN |

Attempts 004–005 precede the production edits; attempts 006–009 use the final production and test file timestamps/hashes listed above. The RED failures therefore demonstrate the duplicate owner, including the undefended `2.5` regression, rather than merely restating the corrected helper.

## Evidence and coverage limits

- No `attempt-008` directory or receipt exists under this diagnosis root. The reported `{evidenceDir}` wrapper pre-spawn rejection therefore has no retained file here and cannot be independently hash-verified. It launched no child and does not weaken the source or GREEN evidence, but closeout must describe it as an unretained pre-spawn rejection rather than a retained attempt.
- The real-resolver fixture is strongly capture-capable and runs through the resolver's control-flip section before the fatigue helper, but it asserts battle count and fatigue values, not the resulting controller or a capture receipt. The retained evidence therefore proves the real normal resolver path and fatigue ownership; it is not standalone proof of a control flip. No capture-behavior claim is needed for this fix.
- `DIAGNOSIS.md` and `MACHINE_RECEIPT.json` are preserved early-stop records ending at attempt 002. They must not be cited as the final implementation receipt; the later raw attempts are the controlling evidence.
- This review does not qualify the full suite, package/native build, a 188-turn campaign, or global calibration criteria 704/707. No such run or claim is required for this bounded source verdict.

`git diff --check` for the tracked fatigue delta is clean. No test, engine API, query, campaign, package, or native run was executed by this reviewer.
