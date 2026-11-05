# Independent actual-result review — combat-fatigue prefix 39

Date: 2026-10-26  
Verdict: **VALID `STOP_NO_RETRY`; the candidate is not prefix-39 qualified.**  
Scope consequence: no 188-week, full-suite, native, package, build, retry, baseline adoption, or calibration-tuning step is authorized by this result.

## Execution authenticity

- Frozen candidate HEAD: `0278c956d3fce3cdb62161a282f3936eaa0c66c1`; tracked worktree remains clean.
- Actual receipt SHA-256: `951084e9f8064fa2ab6e6e896ff63d78e9f0260f7073baa29615675303ac42a6`.
- Result SHA-256: `cb1ffb514bed77ccb1f9380601687687a55231afb08c549b8741c2b327ac8f00`.
- Wrapper/qualification child/outer exits: `2/2/2`, correctly reflecting a completed rejecting qualification rather than a process crash.
- Production campaign child: exit 0, status `PASS`, no signal, spawn error, or timeout.
- Elapsed: 58,142 ms under the 300,000 ms cap.
- Simulation count: 1; retries: 0.
- Entry script remained byte-identical before/after at reviewed SHA-256 `97019c6d0a133c9d54ef99574b052ebfb0d954da17f5de79b235af226cd9f6f3`.
- Receipt artifact contract: pass. Exactly 25 allowed artifacts are retained, with none missing or unexpected. All 25 artifacts plus stdout, stderr, and the entry snapshot match their receipt-declared byte counts and SHA-256 values.
- The production argv is the frozen Node 22.23.2 / TSX scenario command for 39 turns, one unique output child, and `--save-weeks 15,16,33,34`. The launch diagnostic environment includes the reviewed `battle_power` addition and otherwise matches the frozen config.

The actual preflight passed at clean HEAD with Node `v22.23.2`, all 26 source/test/tool/data bindings, the exact control manifest, and both control signatures. `run_meta.json` independently records the same commit, `git_dirty: false`, Node `v22.23.2`, the expected scenario, 39 weeks, and 29 consumed inputs with no current hash mismatch in the save-provenance reader.

## Rejecting results

### Scoring gate — failed

The candidate scored **703/712**, below the required 707, and lost four formerly-correct settlements against both n91 and n92:

| OSID | Reference / retained baseline | Candidate |
|---|---|---|
| `op:donji_vakuf:korenici` | RS | RBiH |
| `op:foca:donje_zesce` | RBiH | RS |
| `op:gorazde:kolovarice` | RS | RBiH |
| `op:trnovo:tosici` | RBiH | RS |

Scoring artifact SHA-256: `09f3ec2bd87e8e3922012ebcdc907c84e208ee594ff8146d5b2a9f70a8c6c3c5`.

The preceding reviewed prefix candidate scored 704 with Korenici, Donje Zesce, and Tosici as its three losses. This candidate adds Kolovarice as a fourth loss and is one point worse. The observation is a valid deterministic candidate rejection; by itself it does not isolate which changed gameplay consequence caused Kolovarice or prove a new engine defect.

The frozen controls remained exact:

- n101: 707/712, n91/n92 losses `0/0`, pass.
- n102: 705/712, exact n91/n92 losses `2/2` at Donje Zesce and Tosici, correctly rejected.

### Strict 40-week health gate — failed

The health reader exited 1 because `stranded_brigades` was **13**, above the unchanged maximum **3**. Its other hard checks passed: zero eligible operations 0/4, invalid operation weeks 0/4, ghost destroyed 0/4, matched OSIDs 703/655, and consistency failures 0/3. Killed-to-wounded ratio 3.917 remained inside its advisory band. This is the same independently gated health category that the plan explicitly refused to waive.

## Passing required gates

The other five required gates passed:

- **Consistency:** exit 0; no peak-personnel, assignment, ghost, reserve-cap, ownership, faction-side, geometry, actionable gap, or actionable adjacent-exposure violations. Four below-floor sectors had no legal same-corps donor and were reported as such.
- **Movement:** exit 0; 7,410 receipts, all 39 expected inactive boundaries for `hvo_1st_guard_abb`, no inconsistencies or missing expected boundary.
- **Graph/roster:** 291 front edges, 69 sectors, 232 rostered formations; no invalid endpoints, duplicate edges, missing sector edges, malformed rosters, roster mismatches, or duplicate membership.
- **Save provenance:** turn-15, turn-16, turn-33, turn-34, and final turn-39 saves are present at their exact turns; 39 weekly rows are ordered; commit/clean provenance is exact; all 29 consumed inputs remain matched.
- **Control attribution:** 39 valid mirrored weekly rows, no failures; totals reconcile as 85 combat + 34 paramilitary + 0 consolidation + 0 abandoned + 23 initialization overrides + 1 other = 143 total changes.

The horizon record correctly marks the April 1994, April 1995, October 1995, Toljenak turn 135, Prisoje turn 188, Donji Vrbljani turn 188, protected-late-outcome, and full-188-operation checks as `UNREACHED_HORIZON` with `pass: null` and `retired: false`. No later-horizon pass is implied.

## Preservation and stop-rule compliance

Opening and closing preservation manifests each contain the same 14 configured roots and are byte-for-byte identical, both SHA-256 `ef660fe60a6ab37b537044116c039d5db93a6ffe58571df593c9f405dbd2c614`. The inventories cover the retained n91–n102 roots plus the two protected fractional-fatigue evidence roots. The qualification therefore made no change to protected evidence.

`result.json` reports `STOP_NO_RETRY`, `simulation_count: 1`, `retries: 0`, `full_188_executed: false`, and `full_suite_executed: false`. No second attempt is present in this packet. The campaign's successful process exit does not override the two failed acceptance gates.

## Interpretation limit

The single-owner fatigue implementation and REQUEST-OP personnel-floor fix remain independently source-reviewed and locally verified. This trajectory establishes that their combined clean candidate does **not** meet the agreed prefix-39 calibration qualification. It does not invalidate the correctness of either bounded fix, establish a causal explanation for any of the four control differences, or support tuning/reverting source solely to improve this proxy.

No simulation, retry, engine API, test, new reader, source edit, or additional inventory was performed by this reviewer.
