# Initial clean-freeze coverage map

Review snapshot: `HEAD 81a65d76fce4936ea39c6d4b4d5df144139c8ba5`, branch `codex/october-calibration-continuation-20261003`.

## Scope inventory

- 28 modified tracked files: 13 governance/canon/process documents, five production files, nine existing tests, and one QA harness.
- 124 untracked files: five intended source/test additions plus two curated portable evidence roots (`logs/r8-native-calibration-parity-20261024/` and `logs/r8-warroom-collection-v3-20261024/`).
- No staged files. No changes under `data/`, `refs/`, root configuration, dependency manifests, baseline pins, or `docs/10_canon/FORAWWV.md`.
- `git diff --check` exits 0; its stderr consists only of repository line-ending warnings.

## Coverage by change group

| Group | Current files | Review/evidence coverage | Initial status |
|---|---|---|---|
| Desktop canonical load and resume route | `src/desktop/electron-main.cjs`, `src/ui/map/components/MainMenu.tsx`, `src/ui/map/desktop/useIPC.ts`; persistence/replay/menu/lifecycle tests | `canon-review/INDEPENDENT_REPAIR_REVIEW.md` binds current production hashes `3d994d…`, `ae65d9…`, `c171db…`; focused 221/221 plus replay 16/16, typecheck/syntax/diff checks. Current harness/test later changes are separately reviewed below. | Covered |
| Warroom campaign-replacement ownership | `src/ui/warroom/warroom.ts`; lifecycle/owner tests | Same canonical load/host repair chain and focused ownership tests; no state/schema/simulation change. | Covered, final hash binding still required |
| Native comparator and retained failed player result | `tools/diagnostics/native_calibration_outcome_compare.cjs`, its test, portable native log tree | Native outcome/readers reviews and final portable/docs review. Retained result is explicitly FAILED at t39: 700/712, seven n91 and seven n92 losses, 188/Farz/later checkpoints unreached; Save/load and 12 measured infrastructure gates do not constitute calibration acceptance. | Covered |
| CDP diagnostic collector | `tools/ui/cdp_network_collector.cjs`, its test, opt-in harness wiring, portable collector log tree | `logs/r8-warroom-collection-v3-20261024/INDEPENDENT_REVIEW.md` final targeted verification; diagnostic-only, fail-closed, frozen classifiers/readers, no allowance/admission. | Covered |
| Officer inbox/succession harness | `tools/ui/paradox_local_qa.cjs`, `tests/paradox_local_qa_harness.test.ts` | Inbox repair review, succession review plus `EVIDENCE_CORRECTION.json` and batch-3 settled corrections. Current hashes exactly match `9a1bef…` and `580178…`; 98/98 harness contract evidence. Default `keep` is preserved; historical is explicit normal-UI choice. | Covered |
| Army HQ selected-faction producer | `src/sim/turn_phases/war_phases.ts`, new routing test | `hq-gathering-repair/INDEPENDENT_REVIEW.md`; current hashes exactly match `0d11a7…` and `dee244…`; 10 new tests and 145/145 focused pass. Literal mutation order `RS -> RBiH -> HRHB` remains. No policy/history/data/reference/pin change. | Covered for source/focused review; 188/full-suite gates remain open |
| Sarajevo fixture preservation | `.gitignore`, `tests/sarajevo_override_regression.test.ts` | Canon batch-3 review: one focused pass and exact 45-file legacy preservation. | Covered |
| Canon/IPC/determinism/repository/UI documentation | Systems Manual, desktop IPC contract, determinism matrix, repository map, UI ownership matrix, QA napkin | Prior canonical load, player-evidence, collector, and HQ review findings supply the underlying facts. Changes add the already-established delegation/ownership/evidence contracts; no sensitive-history thesis edit. | Covered in principle; final integrated docs must be re-read after root's supplement |
| Active plans, board, roadmap, calibration master, ledgers, plan index | seven governance files | Native portable/player-evidence integration reviews cover the retained negative result and revised player contract. Current files do not yet contain the new dirty-tree HQ refusal/supplement promised for finalization. | Pending final writes and governance checks |

## Freeze-specific findings

1. The failed HQ `campaign-01` is not acceptance evidence. Its child result records failures `campaign_zero`, `exactly_one_run`, and `readers_zero`; the wrapper refused before any turn because the source tree was dirty. The outer/child/wrapper exits (`126`, `1`, `2`) must remain visible in the final supplement. No campaign reader was reached.
2. The freeze checkpoint may include reviewed source, docs, and portable evidence so a later clean-source run can qualify. It must not say the HQ candidate passed 188 weeks, the full suite, calibration, or release acceptance.
3. n91-n94, existing telemetry, source references, and baseline pins remain preserved. n94 at `HEAD 81a65d…` remains the accepted no-player benchmark. The native t39 700 result and the turn-44 policy probes remain diagnostic evidence only.
4. No source scope is presently unreviewed. Final GO remains conditional on the promised supplement/ledger/plan updates, exact final source/evidence hashes, focused governance receipts, and a final status/diff/secret/raw-artifact pass.

## Fresh clean-qualification helper review

`tmp/player-bot-capability-parity-20261024/hq-clean-validation/` is suitable for post-commit qualification preparation:

- `--expected-head` is supplied dynamically as an exact 40-character commit and is checked against actual `HEAD`; no pre-commit SHA is baked into the helper.
- The outer invoker calls `assertCleanWorktree(expectedHead)` before testing or creating either attempt path. The child entrypoints repeat clean/HEAD checks before scenario or suite dispatch.
- Freeze remains one-shot (`wx`) and is unavailable until the reviewed checkpoint is committed and clean. The resulting workspace inventory and 61-file runtime-authority manifest are checked before and after the expensive gates.
- Candidate evaluation requires provenance `git_commit === expectedHead`, `git_dirty === false`, 32 consumed inputs, exact digest, and zero current-input mismatches.
- Cheap evidence is coherent: ten syntax checks, packet self-test, and clean-contract self-test exit 0; the actual production dirty negative exits 1 in 445 ms with no output directory/new run; the outer dirty negative exits 3 and creates no `campaign-01`.
- No freeze, inventory, `HASHES.json`, campaign, or full-suite attempt exists. The old rejected packet and its failed attempt remain unchanged.

Verdict for this ignored helper packet: **GO to the one clean post-commit freeze only after final source/docs integration review passes.** This is not a campaign/full-suite/calibration pass and does not itself authorize a commit or push.

