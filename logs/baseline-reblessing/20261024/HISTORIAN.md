# Independent Historian review — current eight-pin baseline reblessing

Date: 2026-10-24  
Seat: Historian, with the canon-compliance lens limited to historical claims and the Sensitive History Design Gate  
Scope: owner-authorized baseline-manifest adoption only; no source, painted-reference, scenario, gameplay, canon, calibration-threshold, or protected-guard change

## Verdict

**GO for the accepted n93 source-state historical claims to be carried into the current baseline, subject to the run conditions below.** This seat does not qualify the new campaign artifacts, engine behavior, final eight hashes, native/package status, or global calibration. Those decisions remain with the distinct scenario/calibration and Engine/systems seats and the exact update/CI gates in the controlling packet.

The retained historical and canon reviews are legitimate for this narrow reuse. The proposed baseline refresh changes the expected bytes of eight generated artifacts; it does not add a historical proposition. Reuse is valid only while the new run reproduces the already reviewed source state and keeps the claim boundaries below explicit.

## Source and approval basis

### Toljenak / BEHAR-I

- The retained regional review supports a **medium-confidence aggregate allocation** that `op:vares:toljenak` passed to RBiH control in the 5–7 November 1994 Nišići/Crnoriječka plateau fighting. The 1st Corps monograph names Toljenak among the 5–6 November gains and describes firm defence on the new line; Delić identifies BEHAR-I on 6–7 November and names Toljenak; *Balkan Battlegrounds* independently corroborates the 6 November clearing of the remaining VRS salient and immediate retained gains at regional scale (*Prvi korpus ARBiH*, printed p.279/PDF p.281; Rasim Delić vol. 2 pp.68–69; BB1 pp.237–238, source note p.258). The retained review is `tmp/toljenak-nisici-20261023/REVIEW.md`.
- Those sources do **not** establish one common capture date for all 14 constituent settlements, a village-by-village route, an exact capturing brigade, or independently documented uninterrupted possession of every constituent through October 1995. The approved catalog therefore correctly treats the 162nd/164th entries as current-model regional allocations, not historical capturing-unit identifications. This boundary is stated in `tmp/behar-i-toljenak-20261023/review/PRE_IMPLEMENTATION_VERDICT.md` and preserved by `docs/40_reports/implemented/20261023_BEHAR_I_TOLJENAK_CANDIDATE.md`.
- Retained implementation and campaign review establish ordinary combat causality rather than a scripted historical transfer: the accepted state has Toljenak RS through t134, an operation-owned BEHAR-I combat flip at t135, and RBiH retention through t188. The retained n92 repaint final review and n93 regression review preserve the exact operation identity, attacker-set boundary, joined battle/control event, diagnostics, and AAR without claiming those model formations as the historical actors (`tmp/behar-i-toljenak-20261023/repaint-review/FINAL_REVIEW.md`; `tmp/r8-operation-release-regression-20261024/review/FINAL_REVIEW.md`).

### April 1995 reference

- The April Toljenak value is an **explicit owner-approved calibration reference allocation**, not a newly discovered fact of continuous historical possession. `data/source/calibration/painted_control_apr1995.json` records exactly one scoped Toljenak change, RS to RBiH, and labels it medium confidence with the same constituent-date, actor-attribution, and continuous-possession limitations.
- The retained repaint review verifies that the reference has 712 stable keys, exactly one semantic controller delta, and corrected normalized SHA-256 `5ea9bc9a00ebfb80eb7611468340e604e155f24b225f39b06f7178c0937293ff`. Historical n91/n92 metadata truthfully retains the prior reference hash; it is not relabelled current-exact. The owner decision resolved the old April contradiction and supersedes the earlier no-reference-edit premise for this one cell (`tmp/behar-i-toljenak-20261023/repaint-review/QUALIFICATION_REVIEW.md`; `tmp/behar-i-toljenak-20261023/repaint-review/FINAL_REVIEW.md`).

### Retained HVO outcomes

- The Prisoje and Donji Vrbljani values being carried forward are qualified **modeled week-188 outcomes**: n91 records HRHB Prisoje after an operation-owned Mistral 2 combat result and HRHB Donji Vrbljani after an operation-owned Southern Move combat result. The portable closeout and independent review accept the two-target implementation validation while keeping global calibration NO-GO (`docs/provenance/october-calibration-20261019/two-hvo-881-portable-result.json`, SHA-256 `ec39f251b4776de47bbb9e3167cb7c361592a988be369f9d448feb065001f222`; `logs/claude-channel-20261023/881-final-results-independent-review.json`, SHA-256 `580a14776358f2e204c185e37492726ce8c47ff3cf2b7c1f83bcba9528dc5216`).
- Reuse must preserve the existing historical limitation: the regional panels support the opportunities and constraints, but do not establish that the modeled Rama Brigade historically captured Donji Vrbljani. A baseline pin may record the model output; it must not be cited as new actor or route evidence.

## Canon mapping and §6 trigger audit

- Engine Invariants §§6.3, 9.6, 9.8, 14.1, and 14.11 require attributable, operation-owned ordinary combat for the reviewed territorial changes and prohibit a calibration-only control receipt. The accepted Toljenak and HVO outcomes were reviewed on that basis; the manifest refresh does not alter those mechanics.
- FORAWWV §IX.6 requires explicit cause and attributable control flips. Reblessing generated hashes after the same qualifying causes is consistent with that rule; the manifest itself is not historical authority.
- Sensitive History Design Gate §6 requires additional seats for new or changed rupture/atrocity content, condemnation, paramilitary policy, enclave mechanics, sensitive-history narrative, or an atrocity-reward risk. None is present in the current tracked diff or the authorized eight-pin scope. The current tracked changes are `.gitignore`, the reblessing packet, and the ledger; the planned production change is the baseline manifest only.
- **No new §6 panel is triggered.** The existing Toljenak and HVO outcomes are ordinary territorial combat outside the sensitive-history gate, and no enclave, rupture, atrocity, condemnation, narrative, or reward surface changes. If any protected sensitive-history/enclave guard, event/content, or acceptance meaning changes during the run or update, this GO ends: stop adoption and obtain the applicable §6 sign-off before proceeding.

## Conditions the new run and adoption must pass

1. Run from the clean frozen descendant authorized by the packet, with Node 22.23.2, no provenance override, and all 32 current normalized inputs exact. No source, painted reference, scenario, artifact-list/schema, gameplay, threshold, or protected-guard byte may change.
2. Preserve scores **707/707/706/706** and zero formerly-correct losses separately against n91 and n92 at every governed checkpoint.
3. Preserve Toljenak RS through t134, the ordinary operation-owned BEHAR-I combat change at t135, and RBiH through t188, with the same bounded historical wording. Any different timing, cause, actor claim, or continuity claim requires a new review and cannot be explained by changing the historical narrative after the run.
4. Preserve the approved April reference at the exact current one-cell allocation and hash above. Historical n91/n92 provenance must retain its original reference stamp; no metadata may be rewritten to pretend those runs consumed the new reference.
5. Preserve Prisoje and Donji Vrbljani as HRHB at t188 through their qualified operation-owned combat chains. Continue to state modeled actors as model allocations; do not infer historical Rama-Brigade capture, a new route, or a new village-level claim from the output.
6. Preserve all protected anchors, enclave schedule/provenance, health and consistency gates. Any protected sensitive-history/enclave guard change stops this reuse and triggers the review rule above.
7. The update must change exactly the eight manifest hashes expected by the packet and nothing in scenario content, calibration/reference data, canon, protected guards, artifact schema/list, or production behavior. The clean update artifacts must agree with the independently reproduced Linux CI hashes, including the default-observer weekly-report profile explained in `tmp/baseline-rebless-20261024/REPORT_DIAGNOSIS.md`.
8. Keep scope labels intact: this reblessing does not close R8 warroom/native/package gates, inherited global calibration gates, or any retained raw suite failure. Passing baseline pins is regression fingerprint acceptance for the already accepted gameplay state, not fresh historical proof and not global acceptance.

## Disposition

Historian seat: **GO WITH THE CONDITIONS ABOVE.** There is no historical-source blocker and no current §6 panel trigger. Final adoption remains contingent on the distinct scenario/calibration and Engine/systems verdicts plus the clean run, eight-hash update, preservation, and pushed-CI proof required by the owner-authorized packet.
