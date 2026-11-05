# Independent Engine/systems and determinism preflight

Date: 2026-10-24  
Seat: Engine/systems with determinism review  
Scope: owner-authorized eight-pin baseline reblessing only; no gameplay, calibration, threshold, scenario, serializer, comparator, or production-code change

## Verdict

**GO to freeze the reviewed packet in one checkpoint commit and execute stage 1 once, subject to the conditions below.** This is not yet a GO to mutate the baseline manifest. Stage 2 remains blocked until the preserved stage-1 campaign and all readers pass, the current 32-input provenance and actual artifact hashes are confirmed, and the required independent seats accept that evidence.

No determinism risks were found in the reviewed packet after correction. The packet measures and adopts existing deterministic output; it does not change simulation ordering, state, save serialization, control writers, or artifact comparison. This is consistent with `docs/10_canon/Engine_Invariants_v0_9_0.md` §§10-12 (no nondeterministic APIs, stable output ordering, identical-input reconstruction), §§14.1-14.2 (settlement control and brigade-operation determinism), and §14.11 (operation/AAR causality), plus `docs/20_engineering/CODE_CANON.md` Determinism Contract and `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` Byte-identical reruns / scenario provenance gates.

## Evidence reviewed

- HEAD is the authorized source `d71bf4e79fde7f1f75eb339d6f2127c474095ac9`; the current staged plan/evidence changes contain no production code. The long run must use the clean descendant created by the checkpoint commit and pass that exact new HEAD through `--expected-head`.
- Node is `v22.23.2`. The fixed `data/derived/scenario/_baseline_tmp/apr1992_188w` target contains zero files. The frozen pre-update manifest is byte-identical to the current manifest at SHA-256 `67774c275f206633a931d1d1aa3990336d1dd0e0877ebaaf924feb6f75378888`.
- `logs/baseline-reblessing/20261024/PRESERVATION_BEFORE.json` retains all 3,210 original binding rows plus 16 exact helper bindings (3,226 total). Fresh verification passed 3,226/3,226, allowing append-only old-prefix preservation only for the two named telemetry streams.
- `logs/baseline-reblessing/20261024/PACKET_DEPENDENCIES.json` binds the exact bytes of all five ignored runtime scripts. All five source files and all five portable snapshots match their recorded byte counts and SHA-256 values. Both entry scripts reject a dependency mismatch before any child launch.
- The added `.gitignore` entries equal the 34 exact legacy generated/helper paths plus the two exact current evidence roots. There is no broad production ignore, and a single tracked-files search found zero references to the 16 ignored helper paths.
- The retained n93 hashes independently recompute to the seven accepted CI hashes for the non-weekly artifacts. Its diagnostic weekly artifact is `08b8e8cc...`; removal of only `movement_phase_diagnostics`, `attacker_brigades`, and `defender_contributions` is separately gated to produce the accepted default-observer weekly hash `b7024560...`. The candidate evaluator now rejects any mismatch in those seven actual hashes or the projected weekly hash. It does not alter the comparator.
- Node-22 syntax checks passed for every packet CJS file. `packet_selftest.cjs` passed 33/33, including positive and negative exact-hash checks and mutation controls proving that either entry rejects a changed dependency before writing a campaign/update launch receipt.

## Execution guarantees

Stage 1 launches exactly one `run_scenario_with_preflight.ts` 188-week child with the frozen n93 debug selectors and save weeks. Campaign plus readers share a 35-minute deadline; the outer preserved-process cap is 36 minutes only to retain timeout cleanup and receipts. The wrapper removes provenance override/update variables, requires clean Git and exact HEAD, captures exact argv, refuses a nonempty fixed baseline target, requires exactly one new run directory, and preserves tracked source plus the 3,226 bindings.

Stage 1 acceptance binds the current 32 normalized input hashes and digest, 40-file/save inventory, 707/707/706/706 floors, zero formerly-correct losses against n91/n92, Toljenak t135 operation-owned battle/event/diagnostic/AAR causality and retention, Prisoje/Donji Vrbljani outcomes, 16 protected anchors, enclave/protected checks, consistency, health, producer proof, movement coverage, and the exact accepted artifact hashes. Any nonzero category, timeout, extra run, hash/input/provenance mismatch, source movement, protected-gate movement, or preservation failure is a stop with no automatic retry.

Stage 2 is one direct `UPDATE_BASELINES=1` invocation of `run_baseline_regression.ts`, with optional debug/playtest diagnostics removed, normal telemetry retained by exact old prefix, no provenance override, and the same 35-minute cap. Its wrapper requires the frozen manifest prehash, an empty fixed target, exact current 32-input provenance, all eight actual output hashes equal to the accepted Linux CI hashes, exactly eight changed manifest hash values, no other manifest-shape or tracked-file change, and preserved evidence outside the manifest.

## Conditions

1. Commit the staged plan, ledger, exact ignore rules, portable inventory, dependency manifest/snapshots, diagnosis, Historian review, and this review as one checkpoint. Do not launch while `git status --porcelain` is nonempty.
2. Regenerate neither dependency manifest nor preservation inventory after that checkpoint. If any bound script or preserved file changes, stop and re-review rather than updating the inventory around it.
3. Run only the frozen commands in `logs/baseline-reblessing/20261024/PACKET_PLAN.md`, using a fresh attempt directory, the checkpoint HEAD, Node 22.23.2, the 3,226-binding preservation inventory, and the dependency inventory. Preserve all stdout, stderr, receipts, child artifacts, and failures.
4. After stage 1, return the preserved summaries and candidate path for this seat's post-run review. Do not launch stage 2 until Engine/systems, scenario/calibration, and Historian conditions are all satisfied. Any protected-history change ends this GO and triggers the applicable separate review.
5. After stage 2, return the manifest diff, update result, target hashes, provenance, health/protected evidence, and preservation receipts. Final Engine/systems acceptance requires that the production diff contain only the eight authorized hash values and that pushed Linux CI reproduces all eight actual hashes.

Engine/systems preflight: **GO FOR ONE STAGE-1 INVOCATION AFTER THE CLEAN CHECKPOINT COMMIT; STAGE 2 REMAINS GATED.**
