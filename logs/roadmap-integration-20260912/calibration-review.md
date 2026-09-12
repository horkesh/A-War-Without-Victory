# April 1994 calibration integration review

Audit date: 2026-09-12
Reviewer scope: independent, read-only review of the calibration branch, retained evidence, and integrated candidate. No scenario campaign or expensive test was run. This file is the only audit write.

## Verdict

**Integration: NO-GO pending two explicit canon decisions.** Candidate merge commit `7382f26f835b06122ebc01c65e675274028d32e8` cleanly combines base `9588876bc58b09adea89e48d9520be427e270f20` and calibration tip `f30ce94c858266bd3afc2c82c48d224cff927d12`. It has no unresolved merge markers or whitespace errors, and the conflict adaptations reviewed below are coherent. However, production behavior directly contradicts the current higher-precedence Engine Invariants at §14.8b and §16.2. The proposed amendment is preserved but unapplied at `logs/roadmap-integration-20260912/proposed-engine-invariant.patch`. Landing requires the owner/canon authority to approve or reject both changes; a code merge cannot silently supersede the invariant.

**Calibration acceptance: NO-GO even if both canon amendments are approved.** The integrated candidate still lacks the required balanced full suite and a clean, full-horizon deterministic pair at this exact commit. Retained week-104 evidence establishes repeatability of an earlier dirty intermediate tree, not provenance or acceptance of `7382f26f8`. The source branch also bundled three final territorial corrections into one measured state, so its artifacts do not independently attribute each change under the one-change-per-measured-run rule.

No third material canon conflict was found in the reviewed production interactions. No FORAWWV file changed, so the automatic FORAWWV §6 panel trigger does not apply. The two Engine Invariant amendments still need explicit canon authority, and territory-moving behavior retains its full protected-anchor and campaign gates.

## Candidate and preservation inventory

- Candidate: `7382f26f8`, merge parents `9588876bc` and `f30ce94c8`; 72 files, +4,822/-242 against first parent. `git diff --check HEAD^1..HEAD` exited 0.
- Calibration source is 20 commits unique to `9588876bc` (19 implementation commits through `4167d2bd4`, plus report/consolidation commit `f30ce94c8`). Its worktree remains dirty only at `data/derived/latest_run_final_save.json`; that user artifact is not in the merge. Dirty file SHA-256: `9B232E...E331`; source-HEAD version: `0B46BF...5429`.
- `runs/` evidence remains ignored and on disk in the source worktree. External drafts/stashes are inventoried in `logs/roadmap-integration-20260912/stashes-before.txt` and `worktree-inventory.json`; this review did not alter them.
- Timeline viewer commit `7634c193` is already ancestral to both base `9588876bc` and candidate `7382f26f8`; it needs no separate merge.

## Integration-specific review

The resolved candidate preserves the intended production composition:

- `war_phases.ts` removes the passive `rear-pocket-consolidation` writer after `paramilitary-advance`; the next production step is ordinary movement. The legacy helper remains callable only by tests/legacy surfaces. Commander planning classifies a deterministic same-controller enemy cluster of at most six OSIDs as `reduce_isolated_position` only when its shared-boundary exterior is entirely controlled by the acting faction. Emission then requires intelligence, reachability, and two combat-ready participants from the same corps, and creates a normal `CorpsOperation`; classification itself does not write control.
- The isolated-position path continues through normal operation eligibility and resolution. The reviewed code does not bypass organized-defense, enclave protection, centralized RBiH-HRHB combat permission, timing, or ceasefire guards. Candidate and neighbor iteration use `strictCompare`.
- `army_reserve_system.ts` defers the ordinary personnel-below-70%, morale-below-35, and cohesion-below-25 recalls while an elite is authored for a historical operation that is live in planning, execution, or recovery in its receiving corps. The permanent personnel-below-50% path remains immediate, marks `permanently_degraded`, recalls the brigade, and prevents re-loan. Thresholds are strict `<`, matching the proposed §16.2 text.
- The historical operation-name reservation implementation is preserved by the merge. Against the calibration second parent, `historical_operation_names.ts` changes only by removal of its final blank line; there is no catalog/import adaptation in the integration diff. The preserved implementation reserves explicit historical labels, normalizes accents, operation prefixes, year suffixes, case, and punctuation, while `operation_names.ts` retains fictional entries so deterministic pool cardinality is unchanged and rejects reserved stems.
- Authored pre-staging, elite reservations, all-axis readiness, HVO subsegment assignment, commander purpose/emit, operation catalogs, state schema, and the removal of the passive writer compose without a second control-writing path found in this review.

### Required canon decisions

1. **Engine Invariants §14.8b:** current text requires deterministic passive rear-pocket consolidation immediately after `paramilitary-advance`; candidate production deliberately removes it. The proposed replacement, titled **Post-paramilitary isolated positions**, accurately describes the code: topology may supply an operational purpose, but only the existing attack/operation resolver may change control, with all existing defense, enclave, bilateral-permission, timing, ceasefire, and determinism guards. It adds no policy beyond retiring the passive exception.
2. **Engine Invariants §16.2:** current text mandates forced recall at its listed thresholds without an authored-operation exception and omits the already implemented cohesion trigger. The proposed replacement accurately states ordinary recalls at `<70%` loan-start personnel, morale `<35`, or cohesion `<25`; deferral only for an authored historical operation during planning/execution/recovery; permanent degradation and immediate recall at `<50%`; no re-loan; unchanged four-turn cooldown and six-turn minimum voluntary duration.

The full proposed wording is in `logs/roadmap-integration-20260912/proposed-engine-invariant.patch`. It remains unapplied so the owner's decision is reviewable.

## Existing evidence and its limits

Cheap integrated checks retained in this directory:

- `typecheck.log`: `npm.cmd run typecheck`, exit 0.
- `cheap-merge-tests.log`: six focused files, 221/222 passed, exit 1. The sole failure was an integration expectation error: phase count expected 191 but runtime correctly had 190 because one pre-stage step replaces the removed consolidation step.
- `war-phase-order-recheck.log`: targeted corrected file, 6/6 passed, exit 0.

The initial focused failure is resolved at `7382f26f8`; it is not a behavioral campaign failure. These checks are not the balanced full suite.

Retained source evidence:

- Report: `docs/40_reports/implemented/20260902_APRIL_1994_OPERATIONAL_CALIBRATION.md`.
- Repeat runs: `F:/AWWV-worktrees/apr1994-calibration-investigation/runs/apr1994_three_fixes_v72/apr1992_definitive_188w__1db784e85c2e6de0__w104` and corresponding `v73` directory.
- Each run has 15 files, about 36.6 MB. Initial save SHA-256 is `a536e7bbb8e9de7b30abf979ce5f5e8c720473006c851df5ba30891c99effd0a`; final save SHA-256 is `d6095cb8408ddfa85a52223cc6c4c5eb7ae46165cbb2b25fbe438d88c7245148`; final-state hash is `d6095cb8408ddfa8`.
- Both stop at week 104, score April at 703/712, and pass 32/32 April checkpoint anchors. Diagnostics record 479 attack orders, 328 battles, zero invalid operations, zero zero-eligible operations, zero movement-only operations, and zero recovery-without-attempt cases.
- Control attribution: 124 combat, 33 paramilitary, 23 initial overrides, one other, zero consolidation, zero abandoned.
- Both anomaly reports retain 1 CRITICAL and 2 warnings: HVO Central Bosnia has 7/12 brigades below 400 personnel; four low-density sectors; `hrhb_travnik_brigade` is unreachable/far-home and unassigned. These are unresolved acceptance categories, not erased by the April score.
- Provenance limitation: both `run_meta.json` files identify commit `68e5d22e84907dcd42d88a589041f743158c404b`, `git_dirty: true`, Node `v22.23.2`, and consumed-input digest `68b1248bd319b34c9f3a7fe057c260935bc5073b63bf14e28f8c23a8a31127c4`. They predate final implementation tip `4167d2bd4` and integrated candidate `7382f26f8`.
- The older week-188 run `...6898d6...w188_n0` is superseded/rejected because it still included passive bilateral transfers. It cannot accept this candidate.
- Source focused claims are 98/98 final package, 166/166 isolated surface, 302/302 surrounding Srebrenica surface, plus consistency/diff and 744 hover regions. No retained raw exit receipts were found for all of these claims; the report/ledger are the available evidence.

The week-104 source result still has nine April mismatches: `op:ilijas:krivajevici`, `op:maglaj:jablanica`, `op:donji_vakuf:donji_vakuf_2`, `op:donji_vakuf:korenici`, `op:kalesija:seher_2`, `op:konjic:glavaticevo_2`, `op:konjic:ljuta`, `op:mostar:vranjevici_2`, and `op:stolac:pjesivac_kula_2`. Donji Vakuf and Korenići regress relative to v63/v64 and are the first remaining calibration debt.

## Smallest remaining validation

Do not launch a campaign until both canon questions are answered and the approved invariant text, if any, is committed. Then:

1. Run `npm.cmd run test:vitest:balanced` once on the clean integrated commit. Pass criterion: every inventoried suite/test passes. Reuse the existing typecheck and focused receipts unless subsequent edits touch their surfaces.
2. Run one clean `npm.cmd run sim:scenario:run:188w` on that exact commit. Expected host cost is about 5-6 minutes: current clean n392 took about 5m06s; source week-104 timing was about 3m08s, projecting about 5m40s. The launcher's ~55-minute comment is stale.
3. Validate the resulting directory with:
   - `node tools/engine_health_gate.cjs <run-dir> --horizon 188w`
   - `node tools/validate_run_consistency.cjs <run-dir>`
   - `node tools/verify_checkpoints.cjs <run-dir>`
   Preserve launcher output; live `FINAL_SEAL unresolved=0` is required because serialized consistency alone may report transient assignment completeness as not established.
4. Stop before a repeat on any new hard-floor, 31-anchor, enclave/§6, checkpoint, health, consistency, unresolved-seal, or provenance failure. The inherited Farz P-A discriminator (`op:sanski_most:stari_majdan_2`, turn 168, `arbih_327th_vitezka_mountain`, 3rd Corps) is an existing owner-carved exception; it may keep `verify_checkpoints.cjs` nonzero, but any additional discriminator is a hard stop.
5. If run 1 clears those gates, preserve the existing `data/derived/scenario/_baseline_tmp/apr1992_188w` reference and run `npm.cmd run canon:check` as the second deterministic execution. It performs the static determinism scan and baseline regression and regenerates `_baseline_tmp/apr1992_188w`. Its process may remain nonzero solely for unchanged accepted manifest pin mismatches; record the exact mismatch list rather than refreshing the manifest.
6. Compare the two same-horizon runs across all corresponding nonmetadata outputs. Inspect, rather than byte-compare, `run_meta.json`: both must identify the same clean commit, `git_dirty:false`, Node version, scenario/weeks, consumed-input digest, and input file hashes. The manifest's eight outputs are sufficient to enumerate pin mismatches, but insufficient for the strongest whole-run identity claim. The earlier count of 14 applied to the retained branch's week-104 inventory and must not be assumed for the new full-horizon output set.

Because main's baseline was refreshed after the calibration branch diverged, the candidate must be remeasured here. A passing aggregate pair can accept the integrated candidate if the owner treats this merge as one measured candidate; it cannot retroactively prove separate causal attribution for Derventa, Liše, and Prozor. Do not update baseline pins without separate baseline authority.

## Remaining calibration roadmap

1. Resolve and commit the two canon decisions; reject or revise code if either amendment is refused.
2. Complete the balanced suite, clean 188-week pair, protected anchors, health/consistency/seal/provenance review, and explicit disposition of retained anomaly categories.
3. Keep the nine April mismatches open. Investigate the Donji Vakuf/Korenići regression first with one logical change and one measured run at a time; then prioritize the remaining seven by historical/operational impact.
4. Keep the HVO Central Bosnia personnel collapse and unreachable Travnik brigade as engine-health debt. Do not tune them away through a territorial proxy.
5. Preserve the existing accepted baseline mismatch and Farz P-A exception as explicit open authority items. Re-bless only by separate owner decision with the exact old/new eight-artifact delta.

## Targeted final-document review

Reviewed the 2026-09-12 closure/reconciliation edits without reopening unchanged implementation:

- **#517 closure is supported.** The WR01 design closeout explicitly records the owner-approved reduction from 45 captures to six: three faction captures at 1920×1080, two HRHB dark-plate captures, and the 1280×720 minimum-viewport capture. It also discloses that the two later-year plate captures retain turn-68 territory and therefore are presentation evidence only. `open_gates.yml`, the roadmap, and command board preserve that limitation and do not use these images as calibration evidence.
- **#518 stale-pin closure is supported for its measured main source.** `CALIBRATION_MASTER.md` and the ledger record clean `2a8eb4244`, Node 22.23.2, checkpoints 702/678/672/667, unchanged floors, all 31 anchors unchanged from n392, enclave guard 9/9, eastern provenance clean, the same six-of-eight pin movement, and independent CI hash reproduction. The new gate note correctly keeps the Farz P-A discriminator disclosed and explicitly excludes the April candidate from that closure.
- **Remaining-work mapping is coherent.** `R6-CALIBRATION-INTEGRATION` blocks R8/R9; R7 audio and broader acceptance remain open; R8 retains optional-AI, package/shakedown, final-campaign and diary work; R9 remains blocked. The plan index reopens R6 only for calibration, while retaining the earlier historical slice as closed evidence. `npm.cmd run gates:validate` exits 0 and reports 16 total gates, 10 open.
- **Candidate receipt is materially accurate** on commit topology, 20 unique commits, two canon blockers, cheap receipts, dirty week-104 provenance, preservation boundary, and acceptance hold. Its historical-name statement is precise: the implementation is preserved and the only second-parent merge delta is the trailing blank line.
- **One command label needs correction before the receipt is final:** it calls `npm.cmd run test:vitest` the “balanced full suite.” The repository's named balanced complete-suite entrypoint is `npm.cmd run test:vitest:balanced` (`DETERMINISM_TEST_MATRIX.md` and `package.json`). Use that exact command, or describe `test:vitest` as the default runner rather than the balanced runner.

## Canon decision follow-up — 2026-09-12

The initial integration NO-GO above records the state before the owner decided the two canon questions. The owner's follow-up, “Also amend the engine invariants doc too,” explicitly approves both proposed clauses. Targeted review of the resulting documentation-only diff gives **CANON GO to proceed with the already planned validation; this is not calibration acceptance**.

- Engine Invariants §14.8b now matches production. `war_phases.ts` runs `paramilitary-advance` and then ordinary movement, with no `rear-pocket-consolidation` phase. `consolidateRearPockets` has no production caller; remaining callers are legacy-focused tests. `isBoundedIsolatedEnemyPosition` performs deterministic, sorted topology classification, while commander emission requires a normal reachable same-corps operation and control remains owned by existing attack/operation resolution and its defense, enclave, bilateral-permission, timing, and ceasefire guards.
- Engine Invariants §16.2 now matches the exact strict predicates in `army_reserve_system.ts`: ordinary recall at personnel `< 70%` of loan-start strength, morale `< 35`, or cohesion `< 25`; those three checks are skipped only while an authored historical operation in the receiving corps is in planning, execution, or recovery. Personnel `< 50%` is checked first, always sets `permanently_degraded`, immediately recalls, and makes the brigade ineligible for later loans. The four-turn cooldown and six-turn minimum voluntary-loan duration are unchanged.
- Systems Manual §7.7, `PIPELINE_ENTRYPOINTS.md`, and the current `context.md` note propagate the same strict ordinary/deferred/permanent distinction. The context note identifies §16.2 as current authority and marks its older OOB summary as historical.
- The ledger records the owner's authority, exact strict thresholds, unchanged runtime, preserved historical backups/reports, and remaining full-suite/clean-pair gates. No source behavior, baseline, floor, initial-control data, save schema, FORAWWV, or release state is amended by this canon propagation.
- Targeted verification reported with the amendment: 69/69 focused army-reserve, paramilitary-canon, and determinism-scan checks pass; data-prerequisite check exits 0. These focused results clear the approved canon correction for commit and the planned expensive gates; they do not replace the balanced full suite or full-horizon pair.

The former canon blockers are resolved. Proceed with the balanced full suite and first clean 188-week run under the recorded cost and stop plan. A second run remains conditional on the first run clearing every hard gate. Determinism comparison must cover all corresponding nonmetadata outputs produced by the two full-horizon runs; it is not capped at the retained week-104 inventory's 14-output count.
