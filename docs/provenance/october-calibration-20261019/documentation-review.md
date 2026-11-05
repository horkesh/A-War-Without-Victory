# 724 independent preservation-checkpoint review

**Verdict: PASS_SCOPED_CHECKPOINT_DOCS.** `writes_closed: true`.

The seven checkpoint documents now match the retained implementation and evidence at their stated scope. This verdict permits root to continue the preservation checkpoint; it is not production acceptance, calibration adoption, a full-suite pass, or proof that ignored raw evidence has been pushed.

Two blocking wording defects were found and corrected before this verdict:

1. The new calibration-master and ledger summaries now identify consumer exit 2 and fingerprint exit 1 as historical n75 evidence and explicitly state that current n80 consumer/fingerprint are **UNMEASURED**. A first ledger correction touched an old historical line; root restored the exact 722 ledger baseline, retained the intermediate, and changed only the unique new checkpoint-summary phrase. Targeted diff verification passes.
2. `src/scenario/run_provenance.ts` now says the definitive stamp is 32 rows / 17 fixed inputs. This is comment-only and agrees with the live fixed list and `tests/run_provenance_stamp.test.ts`: 17 fixed + scenario + 4 declared + 6 event files + 4 painted references = 32.

Fresh scoped checks pass: `node tools/derive_plan_index.cjs --check` exit 0; `git diff --check` exit 0 (with the existing `PROJECT_LEDGER_KNOWLEDGE.md` CRLF advisory); all 31 n80 native files match the retained 720 inventory; Systems Manual matches its 721 pin; `FORAWWV.md` has no diff; threshold, source-emitter, and C/D telemetry hashes match their retained pins. The post-edit tree remains 106 paths. The precommit no-emit TypeScript check is reused at its exact scope (child/wrapper/capture 0/0/0) because the later changes are documentation and one source comment only.

The documents retain the necessary failures: n80 is 703/712 and unadopted; current n80 consumer/fingerprint are unmeasured; suite 718 timed out with child/wrapper/capture 1/124/124, 3/5 groups green, 10,152 passed, 30 skipped, shard 1 incomplete at 325/342, serial 74 unreached, and zero observed genuine failures. The 122 STOP, historical 473 loss, 604/632/668/670 preservation failures, and all inherited unmet or unmeasured gates remain open.

`core.hooksPath` is configured as `.husky/_`, but that path is absent in this worktree, so no hook-run claim is made. Root's explicit checks are the evidence. The approximately 109 GB ignored evidence estate plus approximately 8 GB under `runs/` is still not assumed Git-backed or pushed. Archive disposition, exact staged inventory, secret review, commits/pushes, and remote-SHA verification remain root closeout work.

Exact current hashes and evidence paths are in `724-independent-review.json`.
