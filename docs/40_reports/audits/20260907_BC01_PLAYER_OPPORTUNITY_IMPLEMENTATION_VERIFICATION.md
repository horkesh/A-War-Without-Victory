# BC01 player opportunity implementation verification

2026-09-07. Candidate `3ad5ed25a835ef37a607ca3d0ba33f9cec7e9b15`.
**Implemented and behavior verified; BC01 ACTIVE: endpoint-convergence expectation unmet, explicit owner disposition required.**

## Implemented behavior

Opportunity decisions create advisory human reviews at L0/L1 and resolve automatically without a
review queue at L2/L3. Existing review expiry, commander-loop exactly-L1 authorization and
historical-operation authorization at every level are unchanged. No blanket player sweep,
scenario adjustment, baseline refresh, floor change or calibration tuning was introduced.

The actual App-mounted Presidential Decision Room shows factual launch/axis/commander evidence
and routes Stop-op through the existing DirectiveCard. A live action requires exact
proposal/opportunity/response identity and a unique executing own operation with matching name,
start turn and authored owning corps. Defensive-only, failed, completed and unavailable receipts
are truthful; resolved receipts do not inflate pending reviews.

The desktop sim bundle exports identity-only metadata from the canonical catalog. Snapshot,
broadcast and replay projections enrich cloned owned DTOs, rejecting raw spoofed host fields and
ambiguous ownership. The renderer imports no catalog; canonical saves gain no field. Missing
metadata fails closed. Independent review caught and corrected wrong-corps binding, an orphan
component route, false pending-review counts, dropped IPC proposals/receipts and renderer catalog
coupling. Final regressions cover the actual projection-to-mounted-UI chain.

## Verification and limits

- Final focused candidate tests: six files / 111 tests pass; final typecheck and desktop sim/map builds pass.
- Canonical full suite: **raw exit 1**, 27m21s, **13,427 passed, one failed, 31 skipped assertions**.
  The only real failure was five missing Bosnian keys. Only those translations changed afterward;
  localization and mounted-panel tests pass 29/29 and a fresh map build passes. Independent QA
  verified the remaining diff unchanged and accepted focused verification for this bounded delta.
  The original full-suite run is not relabeled green.
- Four wholly skipped files are a separate coverage limit; their hidden assertions are not included
  in the 31. The worktree scanner also omitted 216 dependency-CSS checks because dependencies are
  junctioned. Authored CSS checks ran; an unchanged shared-dependency supplement passes 222/222,
  exit 0. Suite-count equality is not claimed.
- Final isolated development Electron cases `dto-l0-01`, `dto-l2-01`, `dto-t3-01`, `dto-failed-01`
  all pass, actual exit 0, with visual inspection. Synthetic controlled prerequisites/roster on a
  copied canonical save are not natural campaign or packaged-release acceptance. L0 persists
  approve with no CA spend; L2 persists the exact Operation Sana pending halt and CA 100 -> 75.
  Operation removal occurs in the following engine halt step. Defensive/failed cases offer no
  action and spend no CA. Host metadata is visible in renderer DTOs but absent from persisted
  L0/L2 autosaves. These four final cases supersede earlier live attempts.

Two prior suite attempts were interrupted for discovered boundary defects; neither is completed
acceptance evidence. Independent Systems, privacy, Process QA and BCS reviews approved the bounded
implementation evidence, not endpoint convergence or BC01 closure.

## Controlled campaign results

Fresh canonical PRE at `534d86bd8` and clean POST at `3ad5ed25a` both complete 188 weeks, exit 0.
Six principal artifacts are byte-identical to n392; all 31 consumed inputs and the input digest match.
Final-state SHA-256: `723726ab301b0b8483a13e014f67535bb18f4a4c56176e328efa1440f4cbe301`.
This establishes no-player neutrality on this lineage, retaining the accepted n392 Farz P-A
carveout, not general engine closure. Observer comparison reaches 188 weeks and MATCH/PASS.

Matched PRE and POST player/control runs all reach 188 weeks, exit 0, with zero unresolved reviews
and events. Direct controls equal 287/335/90 cells (RBiH/RS/HRHB). Matched own-faction gaps are:

| Player | PRE gap | POST gap | Absolute PRE -> POST | Result |
| --- | ---: | ---: | --- | --- |
| RBiH | -9 | +24 | 9 -> 24 | Worsens by 15; signed change +33 |
| HRHB | -9 | +9 | 9 -> 9 | Absolute gap unchanged; signed change +18 |
| RS | -16 | -16 | 16 -> 16 | Unchanged; all 189 printed rows identical |

POST played endpoints are RBiH 311/301/100, HRHB 294/319/99 and RS 289/319/104. Historical
22/18/approximately-2 gaps are not these matched controls. RS's measured gap is pre-existing.
The repair does **not** meet the written endpoint-convergence expectation: RBiH worsens in
absolute gap, HRHB does not narrow, and RS remains unchanged.

Unchanged pre-implementation launch probes found six missing RBiH and four missing HRHB catalog
launches. Post-repair diagnostics restore all ten corps-plus-name identities at the same first-seen turns as their controls:
RBiH Operation Donji Vakuf 95 at 177, Jajce Recovery 178, Vlasic Ridge 152, APWB Pressure 113, Operation Grmeč 94 at 133, Sana 175;
HRHB Cincar/Kupres 132, Mistral 1 160, Mistral 2 175, Southern Move 182. First printed paired
changes occur at turns 113/132 respectively with one additional live operation. This verifies
catalog presence/timing; aggregate territory endpoints do not establish detailed launch-to-cell causality.
The post diagnostic is an external copy with only added same-key output. Its corps-plus-name
first-seen identities collapse same-name recurrences; they are not globally unique operation names
and do not prove first attack timing.

## Disposition and next action

BC01 remains ACTIVE. Owner/PM with independent Systems/QA must explicitly dispose of the unmet
endpoint expectation: retain it and authorize a bounded causal investigation, or explicitly retire
that acceptance proxy with evidence and rationale. No waiver is inferred from the restored launches,
neutral canonical run or terminal completion. No further mechanics/calibration change is authorized
by this report. BC02-BC07 retain D1; BC08 is unchanged. Final behavior and calibration closure remain open.

## Evidence

Machine-local/gitignored root evidence: `runs/bc01_20260907_attribution` and
`runs/bc01_20260907_post_attribution` (raw launch crosswalks and instrument provenance); `runs/bc01_20260907_acceptance` (campaign/provenance receipts),
`runs/bc01_20260907_pre_player_controls/final-endpoint-adjudication.json`,
`runs/bc01_checks_20260907/test_vitest_dto_boundary`, `desktop_map_build_bcs_fix` and
`shared_dependency_css_receipt.json`; `runs/bc01_ui_proof_20260907/INDEPENDENT_UI_QA_DTO_FINAL.md`,
`final-dto-ui-summary.json` and the four final DTO case directories. Sibling `runs/bc01_focused`
contains focused/typecheck receipts. Metadata distinguishes raw redirected logs from summaries
transcribed from actual tool output. These are retained local evidence, not committed release artifacts.
