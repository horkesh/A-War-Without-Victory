# A War Without Victory — Master Roadmap

**Status:** IN AUTONOMOUS EXECUTION; R1/R2/R3/R4 are complete (R4 closed 2026-08-03 on integrated Phase 5 proof). R5 (engine quality/performance/stability) is next per the dependency sequence and owner directive.

**Last updated:** 2026-08-04

**Execution branch:** `codex/master-roadmap-execution` (integration target: `main` after all workstreams are green)

**Authority:** This file is the sole source of truth for unfinished product work.

**Execution view:** [COMMAND_BOARD.md](COMMAND_BOARD.md) is a derived convenience view; this roadmap wins if they differ.

**Plan index:** [README.md](README.md)

## 1. Outcome

Ship a historically grounded, deterministic, polished 1.0 in which the player can move through:

`Desk -> Decision Room -> evidence/map/Army HQ -> decision or explicit hold -> Advance`

without hidden required work, long unexplained decision droughts, map-entry stalls, duplicate operational systems, unsupported historical claims, or release-only surprises.

The program is now finite:

- nine executable workstreams, R1–R9;
- one plan per workstream;
- one dependency order;
- no unresolved owner, product, design, or canon choices;
- evidence-led adopt-or-retire branches where an experiment may legitimately fail;
- external signing credentials and publication authority treated as inputs, not design questions.

Prior roadmap history remains in Git before this consolidation and in [PROJECT_LEDGER.md](../PROJECT_LEDGER.md), [PROJECT_LEDGER_KNOWLEDGE.md](../PROJECT_LEDGER_KNOWLEDGE.md), and the [D2 owner-diary closeout](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md). It is not duplicated here.

## 2. Authority and Activation

The owner activated the complete roadmap on 2026-07-31 and subsequently authorized implementation, commits, remote pushes, final merge to `main`, documentation propagation, and repository/worktree/branch cleanup. That explicit instruction supersedes the planning-pass restriction on commits and pushes for this execution program.

Signing, store upload, public release creation, and a public `1.0` tag remain unauthorized until the owner separately says `Publish 1.0` (or equally explicit wording). Transient local/directory Electron builds and immutable release-candidate evidence remain authorized where R8/R9 require them.

| Owner instruction | Autonomous authority granted |
|---|---|
| `Execute the master roadmap` | Implement R1–R9 in dependency order; create/reuse isolated `codex/` worktrees; edit source/docs/tests/data; run research and verification; make local commits; create transient unpacked/directory Electron builds needed for R8 and release dry-runs. |
| An explicit named workstream, such as `Execute R3` | Perform that workstream and its required prerequisite checks only. |
| `Publish 1.0` or equally explicit wording | After R9 readiness is green, use supplied secure credentials, sign/notarize, upload, push the release branch/tag, and change public release state. |

`Execute the master roadmap` does **not** authorize a remote push, public tag, signing, store upload, installer publication, or public release. Those remain behind the separate publication instruction because they affect external systems and are difficult to undo.

## 3. What “No Gates” Means

The old queue repeatedly stopped for an owner verdict even when research, canon, code, or a bounded experiment could resolve the issue. Those pauses are removed.

The following are no longer allowed:

- “ask the owner which design option to use” when this roadmap already chooses one;
- “wait for historian approval” with no stated evidence rule;
- “tune until it feels right” with no adoption criteria;
- “refresh the baseline” merely because output changed;
- “invent a decision” to fill a quiet historical interval;
- keeping a residual lane alive after it has an adopt-or-retire result.

The following safeguards remain mandatory:

- failing tests, determinism, conservation, migration, accessibility, security, historical-substantiation, or clean-package criteria stop the faulty change;
- unexplained baseline drift is investigated, never re-blessed automatically;
- unsupported historical claims and identities are omitted;
- secrets and signing credentials never enter the repository;
- external publication waits for `Publish 1.0`;
- `docs/10_canon/FORAWWV.md` is not edited by this roadmap.

These are verification barriers and authority boundaries, not unresolved product choices.

## 4. Program Sequence

```text
R1 Map transition
  -> R2 RS Desk/Decision/Advance friction
       -> R4 Command/event/Codex convergence

R3 Tactical Group convergence
  -> R5 Engine quality/performance/stability
       -> R6 Historical gameplay depth/final calibration

R4 + R6 + stable R1/R2 UI
  -> R7 Content/history/localization/audio

R1–R7 green
  -> R8 Full packaged-Electron validation

Two clean 5/5 R8 diaries + all barriers green
  -> R9 Release candidate/gold/publication readiness
```

Execute serially in the order R1, R2, R3, R4, R5, R6, R7, R8, R9 unless file-ownership inspection proves two packets are independent. Serial execution is the default because the known collisions are more expensive than the saved wall time.

## 5. Workstream Register

| ID | Workstream | Status | Executable plan | Complete when |
|---|---|---|---|---|
| R1 | Seamless Command Room ↔ Tactical Map | **COMPLETE — CLOSED 2026-08-01** | [Map-transition plan](2026-07-31-seamless-command-room-map-transition-plan.md) | Warm switch shows current-turn/current-fingerprint truth without renderer reconstruction, static refetch, WebGL error, or visible wait; cold entry meets the measured plan budget. |
| R2 | RS Desk → Decision → Advance friction | **COMPLETE — CLOSED 2026-08-03 (v14 clean pass)** | [RS friction plan](2026-07-31-rs-104week-friction-remediation-plan.md) | Five diary findings close; no contradictory urgency; sourced opportunity/positive-hold cadence is intelligible; ultrawide and map handoff pass Electron proof. |
| R3 | Operational/Tactical Group convergence | **COMPLETE** | [TG closeout plan](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) | One offensive task-organization path, synchronized lifecycle/AHQ receipts, terminal telemetry, unique sourced promotions, locked exhaustion constants, and aligned Standing-OG doctrine. |
| R4 | Command, event, and Dynamic Codex convergence | **COMPLETE — CLOSED 2026-08-03 (Phase 5 integrated proof)** | [Command/event/Codex plan](2026-07-31-command-event-codex-convergence-plan.md) | Five presidential levers remain; Decision Room owns action; Desk owns triage; events, Chronicle, Cost Ledger, and Codex share deterministic receipts and priority truth. |
| R5 | Engine quality, performance, and stability | **IN PROGRESS — PHASE 2D TASK 8A RETAINED; PHASE 2E TASK 4 STEP 5 LANDED FOR 2 OF 3 PRODUCTION CALL SITES (`final_sector_truth_reconciliation.ts`, `scenario_runner.ts` startup), both 188w-validated byte-identical to the documented baseline; two real capture-fidelity bugs found+fixed along the way (unresolved_sector_brigades, entrenchment_turns); THIRD call site (`war_phases.ts`'s per-turn `partition-corps-front-sectors` phase step, likely the most-executed of the three, passes a real live SpatialContext) identified and deliberately deferred** | [Engine-quality plan](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c/2d packet](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) / [Phase 2e pure solve](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md) | Optional state is classified, measured hot paths improve without byte drift, save/replay contracts are stable, generated artifacts have owners, and local/CI release checks match. |
| R6 | Historical gameplay depth and final calibration | **IN PROGRESS — GORAŽDE EVENT-STATE BUG CLOSED; TASK 0.3 (ZVORNIK/DOBOJ/GRAČANICA FIX) AND PHASE 0.2 WAIT ON R5 FLOOR** | [Historical-gameplay plan](2026-07-31-historical-gameplay-depth-calibration-plan.md) | Calendar/weak-predicate events cannot manufacture control; every behavior experiment is adopted or retired by predeclared criteria; Sarajevo and fall-1995 work is historically bounded; final 40/104/188-turn evidence is deterministic; RS holds Zvornik, `op:doboj:boljanic_2`, and `op:gracanica:petrovo_2` for the historical duration. |
| R7 | Content, attribution, Bosnian localization, and audio | **IN PROGRESS — PHASE 0 CORRECTED AND REVIEWED; REMEDIATION OPEN** | [Content/localization/audio plan](2026-07-31-content-history-localization-audio-plan.md) | Claims, identities, strings, and audio are machine-auditable; unsupported content is absent; `bs`/legacy migration, pseudolocale, licensing, accessibility, and Electron proof pass. |
| R8 | Full-campaign packaged-Electron validation and diaries | READY AFTER R1–R7 | [Electron-validation plan](2026-07-31-full-campaign-electron-validation-plan.md) | Fresh historical-policy RBiH, RS, and HRHB campaigns cover full duration and required surfaces; bugs and friction are separately routed; final two diaries score 5/5 with clean diagnostics. |
| R9 | Release candidate, gold, and publication | READY AFTER R8 | [Release plan](2026-07-31-release-candidate-gold-publication-plan.md) | One immutable RC passes clean-machine/security/license/store proofs; artifacts are reproducible; signing/upload inputs are documented; publication awaits only the explicit instruction. |

The linked plan is the task-level contract for each row. A workstream may not gain a second active plan; amend the linked plan and this register together.

### 2026-08-01 R4 Phase 1 closure amendment

R4 Phase 1 is independently approved and integrated. Desk, Inbox, toolbar, Decision Room, and Records share blocker/urgency/source/deadline/destination truth; ordinary proposal history is durable and fail-closed; player-only Electron projection preserves only the player faction's receipts; recurring same-event/same-response consequences require the exact decision turn; and BCS receipts use structured localized copy. The committed desktop regression executes full `advanceTurn`, proves turn 2 → 3, serializes/deserializes canonical state, and reaches the player Records projection. The final committee matrix passes 18 files / 341 tests and the player journeys pass 44 files / 770 tests. Phase 2 source-backed cadence and positive holds is next; later R4 phases remain open. Evidence: [implementation report](../40_reports/implemented/20260801_R4_PHASE1_PRIORITY_AND_RECEIPT_CONVERGENCE.md).

### 2026-08-01 R4 Phase 2 source checkpoint amendment

R4 Task 2.1 is source-complete. The accepted BB1/BB2 audit supports zero additional RBiH, RS, or HRHB presidential initiatives, so the APR1992 registry truthfully contains zero rows and an explicit positive-hold disposition. Validation admits only the existing five levers, requires exact costs and source support, permits at most one pending optional initiative, and fails closed before any future row can reach runtime without its existing action owner. The accepted zero-row registry is validated at module initialization and does not register a war phase; a real `runTurn` regression proves no phase name, report key, state key, action, blocker, receipt, cost, or simulation mutation is added. The shared cadence selector projects one live faction/Authority Desk monitor row. Source/cadence/timing evidence passes `8` files / `85` tests, the focused UI/Advance matrix passes `3` files / `86` tests, an actual TypeScript run and determinism static checks pass, and the `57` strict sensitive-history findings remain inherited R7 event-catalog debt. Task 2.2 remains open for fresh three-faction 104-week evidence after the R5 exclusive runtime lease is released. Evidence: [implementation report](../40_reports/implemented/20260801_R4_PHASE2_SOURCE_BOUNDED_CADENCE.md).

### 2026-08-01 R4 Phase 2 runtime closure amendment

R4 Task 2.2 is complete. Three independent, serial, headless campaigns designated RBiH, RS, and HRHB reached exact turn 104 under one exclusive runtime lease. Fourteen substantive artifacts are byte-identical; final-save SHA-256 is `afbe45d807e19e8bd098af0b7dcd9be92b3f51caedffd85ca6b30af3149ede0b` and corrected cadence-report SHA-256 is `1e4a61efcdae342f5e7e9f6400af8a57e838dd5e909ba833a1fb0e577cb9e1c2`. Actual decision gaps remain RBiH `18`, RS `23`, and HRHB `15` turns; all `11` unsupported long intervals carry source-attested positive holds bound to exact endpoint turns and receipt-ID sets, with zero unresolved/invalid holds and zero optional initiative rows. The RBiH `82-97` hold correctly ends on the turn-97 NATO ultimatum response, not the turn-102 Washington response. Ordinary activity and notices do not close decision gaps, generic Authority-spend matches are zero, and Authority coverage remains explicitly unreported without weekly owner observations. Manifest process/stdout rows are attestations without retained raw snapshots/logs; retained end reports still expose three simulation-anomaly warning classes distinct from cadence bugs. The focused matrix, TypeScript, and check-only baseline regression pass; no baseline was refreshed. R4 proceeds to Phase 3. Evidence: [runtime report](../40_reports/implemented/20260801_R4_PHASE2_RUNTIME_CADENCE_PROOF.md) and [machine manifest](../40_reports/audits/20260801_R4_PHASE2_RUNTIME_REPLAY_MANIFEST.json).

### 2026-08-01 R4 Phase 3 closure amendment

R4 Phase 3 is complete. The dead process-only notification gate is removed from ordinary event evaluation, player resolution, and packaged foundational decisions; notifications remain deterministic monitor-only information. Historical/unset AI resolution uses authored defaults only when event data supplies one, while missing authored defaults use the existing deterministic political/v1 policy without a false `bot_ai_default` receipt. All `76` required-response events retain one canonical respondent. The existing HRHB Washington Agreement row now carries HRHB/Mostar copy to its actual nonresponding recipients, RBiH and RS; no event, trigger, effect, or response was invented. The residual is `2` rows / `4` blocks, all classified `blocked-sensitive` for R7. Focused event/UI proof passes `11` files / `137` tests, packaged startup/surfacing passes `2` files / `12` tests, TypeScript passes, and the presidential diagnostic is READY at `46/46/46` with zero failures/stuck decisions. The orchestrator-owned canonical refresh changed exactly `final_save.json` and `run_summary.json` for the three baseline scenarios. Byte-exhaustive review classified `272 + 1` changed leaves in `apr1992_52w` and `18 + 1` in each four-week save as notification delivery plus truthful bot source attribution only, with no effects/control/combat or other simulation drift. Fresh no-refresh baseline and canon gates pass. The unrelated schema-v37 fixture omission remains routed to R5 and is repaired there pending integration. R4 proceeds to Phase 4. Evidence: [implementation report](../40_reports/implemented/20260801_R4_PHASE3_EVENT_REACHABILITY_CHECKPOINT.md).

### 2026-08-01 R4 Phase 4 canonical acceptance amendment

R4 Phase 4 is canonically accepted. Every dynamic Codex record names a state or receipt predicate and calendar values are context only. The twenty Campaign Codex records are discriminated as `14` genuine paths, `5` divergence contexts, and `1` audit context; only genuine paths carry a distinct evaluated missed-condition predicate. One pure strict-sorted projector gives Codex, Chronicle, Records, and Cost Ledger the same selected-player-bound receipt id, record id, five-operand proof, and chronology. EN/BCS surfaces use authored localization without leaking unavailable English-only future-consequence prose. Seven inventory-identified safe essays received source-note metadata without body changes or copied prose; only the Srebrenica finding retains rupture ownership, and atrocity remains consequence rather than lever. Committee corrections closed ownership, proof, order, presentation, and false-classification defects. On integrated parent `638805ea4`, the full changed/dependent-surface matrix passes `14` files / `262` tests, TypeScript passes, every no-refresh baseline scenario matches, and `canon:check` exits `0`. No baseline was refreshed. The corrected live inventory is `405` claims / `227` files / `325` stop-gated rows; the separate R7 Phase 0 `406` snapshot remains historical evidence. The inherited sensitive player-choice queue and legacy Srebrenica presentation remain routed to R7. R4 proceeds to Phase 5. Evidence: [implementation report](../40_reports/implemented/20260801_R4_PHASE4_DYNAMIC_CODEX_CONVERGENCE_CHECKPOINT.md).

### 2026-08-01 R6 Goražde event-state amendment

R6 Task 0.1 is closed. `gorazde_pocket_consolidation_1992` now observes exact live control of Glamoč and Kamen and never creates it. Red-first coverage, a matched 40-week comparison, a causally reviewed 52-week golden-baseline update, strict rerun, and independent historian/canon review all passed. The 52-week cascade improves the core anchor gate from 30/31 to 31/31 while leaving six bot bands green, critical anomalies at zero, and warnings unchanged at three. The still-unsupported source/prose is an explicit R7 remediation row, not a reason to restore the territorial mutation. Evidence: [implementation report](../40_reports/implemented/20260801_R6_GORAZDE_CURRENT_STATE_TRUTH.md).

### 2026-08-03 R6 Task 0.3 owner directive: Zvornik/Doboj/Gračanica ahistorical 188w losses

Owner ruling, given during R4 Phase 5 closeout: RS losing Zvornik (`op:zvornik:zvornik`), `op:doboj:boljanic_2`, and `op:gracanica:petrovo_2` by week 188 is unacceptable and ahistorical. Root causes are already diagnosed and documented (full bisection trace in `PROJECT_LEDGER.md` and `docs/40_reports/CALIBRATION_MASTER.md`, both dated 2026-08-03): Zvornik falls because its capturing brigade (`rs_1st_zvornik`) is later committed to a string of losing fights at Kalesija/Šekovići and is never reinforced, leaving the town undefended by week 76; the removed atrocity-reward mechanic (commit `3c2e8a47f`, a correct Section 6 fix) is implicated in that brigade's weakened combat power but must not be restored as a fix. Doboj/Gračanica fall to a much older, structural garrison-priority gap (`vrs_1st_krajina` has no `hold_osids` directive for the Doboj OSIDs) that a later, unrelated commit (`34edff214`) tipped from "barely holds" to "falls for good."

**Owner directive: finish R5 (the engine) first, then execute this fix.** New Task 0.3 is added to the R6 plan (`2026-07-31-historical-gameplay-depth-calibration-plan.md`), positioned in Phase 0 before comparison-truth freezing, carrying the full root-cause writeup so the fix doesn't require re-investigation. Explicitly blocked until R5's Workstream Register row reads complete. `0fd36157b` (R5 Phase 2d Task 8A) was investigated as a possible cause, reverted, found ineffective, and un-reverted — it is confirmed innocent and is not part of this fix's scope.

### 2026-08-01 R7 Phase 0 acceptance amendment

All four deterministic R7 inventory implementations are independently accepted. The integrated census is 3,651 owner-routed prose claims across 227 files (1,466 documented; 1,574 source-note, 489 tier, 108 floor, and 14 actor-specificity rows open), zero event/essay year mismatches, passing September-1993 chronology but blocked authored provenance for both Neretva/Grabovica/Uzdol anchors, 5,542 EN keys, one explicit Bosnian fallback, and 971 source-review findings across 385 player-surface files. Source tiers share the loader vocabulary and `pending` remains unresolved. The two genuine refused-choice subjects remain remediated into policy/accountability framing with historical consequence rows preserved. Fourteen bounded semantic corrections now fail closed without phrase-specific production exceptions; exact paramilitary permission remains option-bounded. Integrated review also assigned reviewed tiers to seven R4 safe essays and removed a neutral operational-symmetry false positive. The combined R7/R4 dependent matrix passes 23 files / 659 tests, TypeScript passes, and the actual strict CLI is 0 CRITICAL / 0 WARNING / 1 nonblocking INFO. Phase 1 historical/source remediation is active; integrated baseline/canon proof remains serialized behind R5's runtime lane. Evidence: [historical/localization audit](../40_reports/audits/20260801_R7_HISTORICAL_CLAIM_LOCALIZATION_INVENTORIES.md) and [identity/audio audit](../40_reports/audits/20260801_R7_OFFICER_AUDIO_PROVENANCE_INVENTORY.md).

### 2026-08-02 R7 Ring-3 baseline causal acceptance

The previously red integrated baseline is causally closed. An exact clean-commit bisect proves `3c2e8a47f` is the first changed commit after accepted baseline `6c02edcaf`; its exact parent passes, and the same mismatch reproduces on Task 8A's exact control, exonerating R5 and toolchain drift. The deterministic bot keeps the same response ids, but the turn-11 Drina accountability response correctly removes the former war-crimes, morale, and cohesion rewards. That first weekly power-ratio movement deterministically cascades through seven `apr1992_52w` artifacts while `formation_delta.json` and all four-week hashes remain exact. The reviewed manifest refresh changed only those seven hashes; a fresh no-refresh baseline and `canon:check` pass. Evidence: [causal refresh report](../40_reports/implemented/20260802_R7_RING3_BASELINE_CAUSAL_REFRESH.md).

### 2026-08-01 R5 Phase 2 checkpoint amendment

R5 Phases 0 and 1 are complete. Three independently reviewed Phase 2 reuse checkpoints are accepted: operational graph, runtime-hardened immutable adjacency, and caller-owned operational data. The turn-local final-sector receipt checkpoint is correctness-repaired after committee review found mixed-receipt stage masking and unreported roster location writebacks. The historical corrected packet's apparent 18.155% regression is superseded by same-parent evidence. Phase 2c now adds an accepted fourth measured reuse/index checkpoint: dense call-scoped formation occupancy. Its fully captured exact-parent replay improves mean throughput from `1,183.549` to `1,122.123 ms/turn` (`-5.190%`) with all three pairs faster and exact `5,070,902`-byte saves at SHA-256 `b28225e47b8e7ba563c4e836151fc8699f3cd191f4912c6c13ac7c099719fbd5`. The current floor is `1,122.123 ms/turn` (`11.2212x` target). R5 Phase 2 and the workstream remain open.

### 2026-08-01 R5 Phase 2c static design amendment

The corrected receipt lineage has an executable measured next-owner plan. [Phase 2c](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) completed its corrected-source owner selection and accepted its first bounded candidate under the exclusive runtime lease. A red-first canonical status-result reuse spike preserved semantics and bytes but showed no owner reduction and was fully reverted. The retained call-scoped dense occupancy index replaces eight repeated active-brigade location scans inside `ensureMinimumSectorCoverage(...)`, updates its mirror at the same location-write owner, and never crosses an invocation or enters `GameState`.

Committee correction separated the two claims the original matrix had conflated. The corrected sector gate passes 6 files / 47 tests in `617.81s`: the existing fixed-point property passes 300 complete-state comparisons, and a new independent dense-index/legacy-scan property passes another 300 comparisons over 100 real-save variants in each production mode. The latter compares all returned sector fields and the entire cloned `GameState`; the legacy path rebuilds occupancy at all eight historical scan sites. Focused brigade, schema-v37 fixture, dense-index, TypeScript, and no-refresh baseline gates pass. The authoritative timing replay is unchanged: candidate P50/P95 `1,118.922` / `1,163.315 ms/turn`, `5.178%` lower mean simulation time, a `48.055%` inclusive reduction in `ensureMinimumSectorCoverage`, an `8.693%` inclusive reduction in `buildCorpsFrontSectors`, and exact bytes in warmup/profile/V8 and every measured mode. The candidate profile still spends `337.325 ms/turn` in the three sector phases; perfect removal leaves about `767.026 ms/turn`. After independent review, the next executable action is Task 3's red-first reachability/sector-fact equivalence. A receipt-scoped incremental solver remains conditional on that safer packet and another fresh profile still ranking full builds first.

### 2026-08-01 R5 Phase 2c reachability no-go amendment

Task 3 completed and is rejected. Its invocation-local component and per-sector fact context passed focused tests, TypeScript, determinism checks, approved baselines without refresh, and 300 complete-sector/complete-state comparisons across all three production modes. Every valid save was byte-identical at `5,085,842` bytes and SHA-256 `95be2c9e8975a12face36e9777e54882c757ee8adb23b1cd91a06b2f546319b7`.

Retention failed. Alternating pair deltas were `-10.950%`, `+1.917%`, and `+4.718%`; the arithmetic mean's `-1.944%` movement is outlier-sensitive and contradicted by two pair regressions. `ensureMinimumSectorCoverage` worsened `20.772%` inclusive and `buildCorpsFrontSectors` worsened `9.724%` inclusive. Candidate source and candidate-specific tests are fully reverted. The accepted `1,122.123 ms/turn` occupancy floor is unchanged. At this no-go checkpoint, R5's next executable packet was a fresh full-profile owner handoff from accepted source; the amendment below completes it. Incremental topology and reuse of the rejected context remain unauthorized.

### 2026-08-02 R5 fresh accepted-source owner amendment

The mandatory owner handoff is complete from exact integrated source `e017d3ec14a8fff1697a9bbed69b39335c1bed2a`. Warmup, phase+sector, and same-process V8 modes all reproduced the exact `5,085,842`-byte save and SHA-256 `95be2c9e8975a12face36e9777e54882c757ee8adb23b1cd91a06b2f546319b7`. V8 ranks `buildCorpsFrontSectors` as the largest named causal application owner at `330.300 ms/turn` inclusive (`27.871%` sampled); independent sector instrumentation records `340.789 ms/turn` across `99` calls (`2.475` per turn). The next R5 packet is a new bounded red-first sector-reconstruction design. The rejected reachability context remains retired, and Task 6 incremental topology is not inferred from this profile alone.

### 2026-08-02 R5 Phase 2d executable reconstruction design amendment

The bounded design review is complete at exact integrated parent `ed06eddc3c5448c7cb960f65aa99403a8de2b289`. The `99` builds are one startup projection, 40 pre-combat partitions, 40 first post-combat geometry reconciliations, 17 location-writeback fixed points, and one final-save projection. Phase, V8, and sector-sidecar figures overlap and remain separate attribution views.

Phase 2d Task 8A is the next executable R5 packet: build one invocation-local standard and strict Case-B front-edge relation per active faction, then serve exact stable-order subset queries to the existing construction, splitting, and consolidation paths. The unchanged subset builders remain the independent test-only legacy oracle; factionless/synthetic or out-of-universe inputs fail closed to that path. The candidate owns no state, sector, formation, receipt, control-status, reachability, or cross-turn cache and changes no truth pass, threshold, or write order.

Pure full-solve/faction extraction is deferred because faction construction reads all formation locations/personnel and coverage can relocate a formation before later faction/recovery readers. Task 6 remains unauthorized until a separate pure full-solve/serial-commit proof exists. The rejected reachability context stays retired, and `computeFrontEdges`/control-status work remains outside this builder packet. Task 8A has exact file ownership, RED relation/order/fallback surfaces, 300 complete-sector/complete-state/byte comparisons across all production modes, explicit receipt/build-count parity, fail-closed gates, and a three-pair lease-backed retention protocol in the Phase 2c/2d plan. Its measured combined adjacency ceiling is about `46.394 ms/turn` inclusive, so acceptance must be followed by a fresh owner profile.

### 2026-08-02 R5 Phase 2d retention and Phase 2e amendment

Phase 2d Task 8A is `PASS_RETAIN` at integrated candidate `0fd36157bd7b92241ac48b8a9e4d94d69f8d2141` against exact parent `5987daea518501745bc94be3939589ea5e767c23`. All 14 saves are exactly `5,085,892` bytes with SHA-256 `9d2a59dc1097ff3b69d3cec2d19962af32b7199de9f0b311d1dea4c562a596b4`; unexpected canonical fallbacks remain zero. Combined adjacency inclusive time falls `81.610253%`, builder inclusive time falls `7.075305%`, two of three wall pairs improve, median pair improves `2.599063%`, maximum regression is `1.766058%`, and mean improves `1.782383%` to `1,086.311 ms/turn`. The authoritative manifest SHA-256 is `50b78332ebae96f4dd767da61c89e398c1bead91a246e1a945d657b36cea138d`.

Peak heap movement `215.046 -> 291.752 MB`, with a fresh retained-source sample of `281.242 MB`, remains an explicit watch. The fresh profile still ranks `buildCorpsFrontSectors` first at `295.866225 ms/turn` and `26.224914%` sampled. R5 therefore advances to the separate [Phase 2e pure full-solve/serial-commit plan](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md): capture an explicit immutable input, solve the full legacy sequence against detached working state, emit an ordered mutation journal, prevalidate it, and replay it serially in exact faction/recovery/fixed-point write order. Task 8A relation reuse and dense occupancy stay retained. This is enabling architecture only; Task 6 remains unauthorized until Phase 2e is accepted and a fresh profile satisfies the plan's exact dominance, equivalence, memory, timing, and documentation gate.

### 2026-08-03 R5 Phase 2e Tasks 1-2 complete, Task 3 groundwork amendment

Phase 2e Task 1 (mutation-journal write-order characterization) and Task 2 (complete immutable snapshot capture) are both complete and committed (`08973f266`, `4bbf81917`). Task 1 finished threading the recorder through the 6 remaining in-scope `ensureMinimumSectorCoverage` call sites plus a previously-undiscovered second `syncSectorAssignmentsToFormations` call site, verified byte-identical against the real save with and without a recorder, and wrote the RED/GREEN characterization test. Task 2's snapshot type/capture function were built only after directly reading `commander_override.ts` and `officer_system.ts` in full (not trusting the plan's own prose summary), which found the officer-profile read surface is 5 fields total, not the full officer interfaces, and that `commanderReviewAssignment` takes no `GameState` parameter at all.

A safe, verified subset of Task 3's "narrow read interfaces" mandate also landed (`4c5f83610`): `getCorpsArmyPriorities`, `buildCorpsCommanderProfiles`, `getCorpsCommander`, `mapOsidsToCorps`, and `getPoliticalControllerOSID` now accept structural narrow types instead of full `GameState`, which `GameState` itself still satisfies — zero call-site changes, zero possible runtime behavior change, `tsc` clean, 126/126 relevant tests pass. Task 3's actual orchestrator extraction (the pure `solveCorpsFrontSectorsPure` over a detached working projection) has **not** started; scoping work this session found it requires the same narrow-interface treatment cascaded through `ensureMinimumSectorCoverage`, `sealMergedSectorTruth`, `recoverDroppedFrontEdges`, `applyFinalSectorOwnerTruthPass`, `buildFactionSectors`, and `buildCorpsFrontSectors` itself — a materially larger, separately-scoped effort. Full detail in the Phase 2e plan doc's Task 3 checkpoint note.

Also noted and left untouched (confirmed pre-existing, unrelated): `sector_partition_buildCorpsFrontSectors_integration.test.ts`'s "fixed-point shortcuts preserve every sector field" test fails at "mode war, seed 5, byte 39183" independent of any Phase 2e change (isolated via `git stash` against the pre-session `060eb9b2e` state, identical failure). This is a Task 8A / Phase 2d fixed-point-shortcut surface issue, not a Phase 2e regression; flagged for whoever next touches that area.

**2026-08-03 continued — Task 3 `state` narrowing sweep completed across the entire sector-builder call graph.** Extended the narrow-read-interface work through `brigade_assignment.ts` (9 functions), `sector_territory.ts` + `sector_building.ts` (3 functions), and finally `corps_front_sectors.ts` itself (15 functions, including `buildCorpsFrontSectors` and `buildFactionSectors`) — every `state: GameState` parameter actually reachable from the sector-topology solve is now retyped to a narrow structural interface, verified function-by-function by reading each body (not inferred), with zero call-site changes and zero possible runtime behavior difference (types erase at compile time). One real gap was caught mid-sweep: `getFactions(state)` was itself still full-`GameState`-typed and not covered by the narrow type, which only included `meta|political|military` — plan section 6 explicitly lists `factions` as its own input family, so the shared type was extended and `getFactions` narrowed too; `tsc` went clean immediately after. The widest test sweep of the session (22 files, 361 tests, matching the entire touched surface) passed 361/361; `determinism_static_scan_r1_5` and `git diff --check` both clean. Five commits landed this increment (`4c5f83610`, `ced5233a7`, `30c8b9d02`, `c65c547c2`, plus the two roadmap-sync commits), for seven total Phase 2e commits this session.

**Explicitly not done, and not to be assumed mechanical:** the `formations: Record<FormationId, FormationState>` parameter across these same functions is untouched and needs the identical read-the-body-first narrowing treatment (Task 2's snapshot uses a deliberately narrow `SectorTopologyFormation`, not full `FormationState`), plus — unlike the read-only `state` narrowing — a detached *mutable* working-formation projection whose every write routes through Task 1's mutation recorder. Both remain before `solveCorpsFrontSectorsPure` itself can be built. Full detail in the Phase 2e plan doc's Task 3 checkpoint.

**2026-08-03 continued — the `formations` half is also complete.** Built `SectorTopologyWorkingFormation` (deliberately mutable, unlike Task 2's read-only snapshot type, since the call graph both reads and writes formation fields directly) and retyped the parameter across 13 files (44 initial occurrences — roughly triple the `state` sweep's scale). The `tsc`-cascade discovery pattern caught two real gaps: `name` (a field the initial grep census missed because the read used a different variable name) and, most importantly, Task 1's own `sector_topology_mutation_journal.ts`, whose `record*` methods still required full `FormationState` — narrowing it directly serves what Task 3 needs the recorder for. Converged after two iterative `tsc`-guided fix batches (~60 errors → ~17 → 0). Verified with the widest test sweep of the session: 29 files, 438 tests, all pass; `determinism_static_scan_r1_5` and `git diff --check` both pass. **Both narrowing prerequisites for the orchestrator extraction are now complete** — every function in the call graph already accepts the narrow types (`GameState`/`FormationState` both structurally satisfy them, so no further signature churn is needed). Ten Phase 2e commits landed this session total. The orchestrator extraction itself (`solveCorpsFrontSectorsPure`, the detached mutable working-formation projection, the new commit-to-detached-state mutation-recorder strategy, the RED equivalence test) has not started and remains the genuinely large, separately-budgeted piece.

**2026-08-03 session 3 — third narrowing dimension (`spatial: SpatialContext`) completed, a reasoning error caught and corrected, and the read-state adapter built.** After `spatial` was narrowed the same way (12 sites in `corps_front_sectors.ts` plus `spatialFriendlyDistance`/`unboundedGraphDistance`), a self-correction landed: an earlier note in this amendment chain wrongly concluded that narrowing `.military`/`.political` recursively "does not terminate cleanly," because `Pick<GameState, 'military'>` leaves `.military` at full `MilitaryState` width. That conclusion was wrong — a hand-written interface (not `Pick`-derived) that lists only the fields actually read terminates immediately at any nesting depth, since real wide objects always structurally satisfy an interface requiring fewer/optional fields. `sector_topology_narrow_reads.ts` was rewritten from a `Pick`-based alias to a fully hand-written nested type family on this corrected basis, and `officer_system.ts`'s `getCorpsCommander` made generic so its return type still resolves to the full `NamedOfficer`/`NamedOfficerState` shape for real-`GameState` callers. With that, `src/sim/combat/sector_topology_detached_state.ts` (new) was built: `buildDetachedNarrowReadState(input, workingFormations?)` reshapes a captured `SectorTopologySolveInput` into a genuine (non-cast) `SectorTopologyNarrowReadState` — Maps to Records, `directive_priority_sector_id` un-flattened back into nested `directive`, `military.formations` threaded through by reference when a working-formation projection is supplied. Two real type gaps surfaced and were fixed: `elite_loan_state` needed the same hand-written-narrow-value override (`SectorTopologyWorkingEliteLoanState`) as the `.military`/`.political` correction above, and `SectorTopologyOperationAxisRow` was missing `objectives` even though the real `OperationAxis.objectives: string[]` is genuinely read — added to the row type and to `captureOperation`'s capture-side mapping (it had been silently dropping the field). `npx tsc --noEmit` clean. New adapter-fidelity test (`tests/sector_topology_detached_state.test.ts`, 6 tests) compares the detached state against the SOURCE `GameState` directly (not just the capture snapshot), with two positive guards against a vacuous pass; combined with the existing snapshot/journal suites, 17/17 pass. **Every narrowing prerequisite and the read-state adapter are now done.** Remaining: port `buildCorpsFrontSectors`'s/`buildFactionSectors`'s bodies into `solveCorpsFrontSectorsPure` against this adapter's output, a new detached-projection mutation-recorder strategy, and the RED equivalence test — still the largest remaining piece.

### 2026-08-01 R1 closure amendment

R1 is closed locally after independent approval and three layers of evidence. The authoritative 72-sample performance artifact records cold current-state p50/p95 70.7/78.8 ms and warm interactive p50/p95 114.45/139.515 ms; all warm cycles create/release zero MapLibre/Deck owners and request zero static resources. The supplemental three-launch player packet proves actual camera movement, exact formation/settlement inspection, hidden-map input exclusion, catalog-backed historical-default choice, visible Advance, neutral/read-only post-advance handling, exact current-turn/fingerprint truth, unchanged repository saves, clean diagnostics, and verified process exit. Task 4.3 optional module splitting was not eligible because cold p95 had already passed at 125.2 ms after Phase 3. R2 may now rebase its shared map/shell files on R1. Evidence and full scope: [implementation report](../40_reports/implemented/20260801_SEAMLESS_COMMAND_ROOM_MAP_TRANSITION.md).

### 2026-08-01 R2 source-closeout amendment

All six R2 source packets are implemented and independently reviewed. FR-03 now routes the exact historical-operation dossier through the retained current-revision tactical map, exact objective/staging/participant evidence, and back to the same dossier without map-side authorization or renderer churn. FR-06 now uses full semantic labels, one chip plus deterministic `+N` below 1600 px and at most two plus `+N` above it, with complete accessible popover truth. Rejected packaged runs reached turn 104 but exposed retired stack-badge, post-Army-HQ route-restoration, and adaptive counter-target harness defects; all remain negative evidence. The repaired harness emits an explicit stack not-applicable receipt, restores the exact current-revision War Map before field toolbar use, freezes counter proof to its declared initial identities, and measures document/strip/OOB/Situation/branch geometry. R2 remains open until a new package and fresh no-resume RS run complete with clean final diagnostics and materialized geometry receipts. Evidence and exact scope: [source closeout report](../40_reports/implemented/20260801_R2_RS_FRICTION_FR03_FR06_AND_RUNTIME_HARDENING.md).

Fresh packaged runs v5-v7 extended that negative lineage without lowering the gate. V5 found four real readability/classifier defects, v6 isolated one ARIA-hidden decorative false positive, and v7 proved one residual live Desk occlusion caused by nested vertical scroll ownership. The current repair makes the outer Desk the sole vertical scroller above the fixed status dock. A new package and a brand-new no-resume run are still required; no rejected campaign can be resumed into acceptance.

V8 (hard-clipped Desk viewport + Army HQ contrast) reached exact turn 104 and closed its own six duplicate-checkpoint observations, but a fresh no-resume v9 against the rebuilt package still failed readability: the President's Desk `aside` occluded WarroomStatusBar's WAR/REQUIRED/SIGNATURE-REQUIRED badges — a different mechanism than v8's fix targeted (two independent bottom-right-anchored siblings, not a scroll-containment escape). A same-day attempted fix (ResizeObserver-measured dynamic Desk clearance) was reverted after v10/v11 packaged runs appeared to show it broke a materially more serious check: RS's `sarajevo_siege_begins_1992` historical anchor never fired.

**2026-08-03 correction:** that attribution was a false positive. A differently-shaped fix (static `bottom-28`, zero new state/effects/renders) reproduced the identical failure (v12); a control run rebuilding the exact pre-fix, `v9`-equivalent code unmodified and re-running it fresh (v13-control, isolated) *also* failed identically — proving the regression is unrelated to any R2 UI change. The static occlusion fix was re-landed (`524bb7937`).

**Second correction, same day:** the apparent `sarajevo_siege_begins_1992` "non-determinism" was itself a reproduction error, not an engine bug. `v9`'s own recorded command included `--strategic --auto-recruit`; `v10`/`v11`/`v12`/`v13-control` all omitted both, so none of them actually reproduced `v9`'s run — they played a materially different early game (those flags gate real turn-1 recruitment/proposal decisions). No non-determinism, no Sacred Rules concern.

**R2 CLOSED 2026-08-03:** `v14`, run against the re-landed fix using `v9`'s exact flag set, passed clean — exact turn 104, zero console messages/page errors/network failures, no readability diagnostic, all five historical anchors (`jna_withdrawal_1992`, `sarajevo_siege_begins_1992`, `operation_corridor_1992`, `srebrenica_enclave_forms_1992`, `jajce_falls_1992`) fired exactly once. Full v5-v14 lineage and evidence in the PROJECT_LEDGER. R4 may now proceed (its dependency is R1 + stable R2 UI, both satisfied).

### 2026-08-03 R4 closure amendment

R4 is closed after Phase 5 integrated proof. Two independent fresh 104-turn runs on current `HEAD` are byte-identical across every substantive artifact, confirming engine determinism (non-identity against the retained Phase-2 artifacts is expected: 41 files legitimately changed since Phase 2). `engine_health_gate.cjs` passes at `matched_osids` 638/712. The player-experience gate passes on all four locally/CI-reachable sub-steps (`electron-runtime-contracts`, `player-journeys` on CI; `live-surface:browser` verified locally); the CI-only `first-hour:browser` Linux-runner timeout is logged as a known environment gap, not chased further per owner decision. Dual-resolution visual inspection (1920×1080, 3440×1440) of Decision Room, evidence map, Records, Chronicle, Codex, and endgame is 12/12 clean.

Phase 5's baseline/engine-health proof surfaced a pre-existing 188-week anchor finding — three named anchors (`op:zvornik:zvornik`, `op:doboj:boljanic_2`, `op:gracanica:petrovo_2`) fall to RBiH by week 188, contrary to history. An 11-probe git-worktree bisection (including one documented false start: `0fd36157b` was wrongly blamed, reverted, found ineffective via a clean-worktree test, and un-reverted — it is confirmed innocent) traced this to two separate, legitimate, already-shipped commits: `3c2e8a47f` (an R7 Section 6 canon-compliance fix removing a prohibited atrocity-reward) and `34edff214` (this same R4 Phase 3's own event-reachability fix, whose 52-week-only validation missed a real 188-week combat-power cascade). Neither is an R4 defect and neither should be reverted. The owner ruled the resulting territorial outcome unacceptable and directed a fix, now tracked as R6 Task 0.3 and explicitly blocked until R5 closes. Full trace: `PROJECT_LEDGER.md` and `CALIBRATION_MASTER.md`, both 2026-08-03.

R5 is next per the dependency sequence and the owner's explicit "finish the engine first" directive. Evidence: [implementation report](../40_reports/implemented/20260731_COMMAND_EVENT_CODEX_CONVERGENCE.md).

## 6. Locked Product and Historical Decisions

### 6.1 Presidential role and cadence

- The final player command model has five levers. Do not add a sixth.
- The Decision Room is the only action owner. The Desk triages; map/Army HQ supplies evidence; Chronicle, Cost Ledger, and Codex hold receipts.
- The president does not assign brigades, draw axes, select tactical targets, or manage operational timing.
- A quiet week may be a truthful positive hold. It is better than a fabricated choice.
- Optional initiatives require a cited authored row, deterministic conditions, an existing presidential lever, a once/cooldown rule, and non-blocking presentation.
- The former “Free War” residual is absorbed into R4 as event/command/Codex texture; it is not a new system or lever.

### 6.2 Tactical and Standing Operational Groups

- `CorpsOperation.phase` is the sole offensive lifecycle clock.
- Donor-backed Tactical Groups are the only new offensive task-organization path; legacy `kind: 'og'` production becomes compatibility-only.
- Phase 3 constants are final: maximum 12 turns, cohesion drain 4 per engaged turn, dissolve at cohesion 15, Army-HQ cap recovery tail 4 turns.
- Promotion identities require an explicit verified `(corps_id, ordinal) -> division_number` mapping. Unknown means no promotion, never a guessed number.
- Corps sectors remain standing OGs. Actual contributors share the immediate combat cost already produced by the live path; downstream aftermath remains primarily owned by the primary defender.
- ADR-0007 Phase C stays retired. R3 aligns ADR-0006/0007, the Systems Manual, and Rulebook to live behavior; it does not resurrect broader shared defense.

### 6.3 Behavior experiments

- Political-dimension isolation runs `intl_only` first, then `cohesion_only`. Each is adopted only if its predeclared historical and engine-health bounds pass; otherwise it is retired.
- Intel ambush runs only after the combat floor is stable and is adopted or retired by the R6 criteria.
- Supply work improves comprehension only. It creates no new presidential authority and reveals no hidden enemy truth.
- Sarajevo becomes a continuous supply/lifeline condition. It is not an atrocity-management lever.
- Fall 1995: E-A5 is already shipped; implement E-B1. Add E-A6 only if the post-E-B1 residual evidence still requires it; otherwise retire E-A6.
- Failed experiments leave a report, removed/reverted implementation, and a closed no-go row. They do not wait for another owner decision.

### 6.4 Sensitive history and chronology

- Sensitive outcomes are informational consequences, not player choices or optimization rewards.
- Every claim uses the source hierarchy and claim ledger in R7. Unsupported claims are omitted.
- Named officer/OOB identities require exact sourced mappings. Unknown identities are omitted, not inferred.
- Zvornik and Foča takeover chronology belongs to April 1992. Neretva/Grabovica/Uzdol belongs to 1993; Uzdol is dated 14 September 1993 in the local source extraction. No June-1992 fallback may carry those 1993 events.
- Sarajevo history is bounded by tribunal evidence; Srebrenica content is bounded by tribunal and UN evidence.

Local source anchors:

- [Early-war territorial progression](../../data/derived/knowledge_base/balkan_battlegrounds/extractions/EARLY_WAR_TERRITORIAL_PROGRESSION_APR_JAN1993.md)
- [Balkan Battlegrounds Volume II page 453 extraction](../../data/derived/knowledge_base/balkan_battlegrounds/pages/BB2_p0453.json)
- [Balkan Battlegrounds Volume II page 454 extraction](../../data/derived/knowledge_base/balkan_battlegrounds/pages/BB2_p0454.json)

Official corroboration:

- [IRMCT: Sarajevo](https://www.irmct.org/en/mip/features/sarajevo)
- [ICTY/IRMCT: Prosecutor v. Sefer Halilović judgment summary](https://r.irmct.org/en/press/judgement-case-prosecutor-v-sefer-halilovic)
- [ICTY/IRMCT: Krstić appeal judgment summary](https://aomenduchangnvrenshuqian.irmct.org/en/press/appeals-chamber-judgement-case-prosecutor-v-radislav-krstic)
- [United Nations A/54/549: The fall of Srebrenica](https://documents.un.org/api/symbol/access?l=en&s=A%2F54%2F549&t=pdf)

### 6.5 Localization and audio

- Canonical Bosnian locale is `bs`; formatting uses `bs-BA`. Legacy `bcs` preferences migrate/alias to `bs`.
- Pseudolocalization and automated completeness checks run before visual LQA.
- If native review is unavailable, English remains default and Bosnian is visibly labeled “Preview”; lack of a reviewer does not block all other work.
- Audio priority: first-party/generated UI sound, then CC0, then explicitly approved CC BY with title/author/source/license and checksum.
- Do not use CC BY-NC, unverified anthem/folk recordings, speeches, screams, or gunfire/atrocity spectacle.

Standards and licensing references:

- [W3C language-tag overview](https://www.w3.org/International/articles/language-tags/Overview.en)
- [Unicode CLDR Bosnian summary](https://unicode.org/cldr/charts/49/summary/bs.html)
- [Microsoft pseudolocalization method](https://learn.microsoft.com/en-us/globalization/methodology/pseudolocalization)
- [W3C WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Creative Commons CC0](https://creativecommons.org/public-domain/)
- [Creative Commons attribution/TASL guidance](https://creativecommons.org/reusing-cc-licensed-content/)
- [Freesound licensing FAQ](https://freesound.org/help/faq/)

### 6.6 Map, Electron, and release architecture

- Measure cold and warm map entry before optimizing.
- Keep campaign-scoped map renderers mounted; visibility is not lifecycle.
- Cache immutable static resources per renderer session; current campaign/control/decision/fog truth remains live.
- Defer noncritical enrichment until after the meaningful current-state frame.
- Preserve Electron isolation/security while optimizing; never trade security for startup time.
- Steam is the primary store. Direct artifacts are signed Windows, notarized macOS, and Linux AppImage.
- Windows signing uses Microsoft Artifact Signing/SignTool; macOS uses Developer ID and `notarytool`.
- Credentials are secure injected inputs, never repository content or a reason to leave product planning unresolved.

Primary references:

- [Electron performance guide](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security)
- [MapLibre GL JS documentation](https://maplibre.org/maplibre-gl-js/docs)
- [Microsoft SmartScreen and Artifact Signing](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
- [Microsoft SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [SteamPipe](https://partner.steamgames.com/doc/sdk/uploading)

## 7. Experiment Outcome Matrix

| Experiment | Adopt when | Retire when | Always preserve |
|---|---|---|---|
| Political `intl_only` | Historical direction, faction separation, engine health, determinism, and control/casualty bounds all pass the R6 thresholds | Any hard criterion fails or the effect is materially redundant | Recorded seed/config/baseline and a concise result report |
| Political `cohesion_only` | Same criteria, evaluated only after the first branch is dispositioned | Same failure rule | Same evidence |
| Intel ambush | Adds readable uncertainty and historically plausible cost without hidden-truth leakage or destabilizing calibration | Fails comprehension, determinism, or historical/calibration bounds | Focused test/report and clean revert |
| Fall-1995 E-A6 | E-B1 evidence leaves the exact named residual and E-A6 corrects it without breaking other bounds | E-B1 closes the residual or E-A6 causes collateral drift | E-B1 remains; E-A6 row closes as not needed |
| Performance optimization | Profiled bottleneck improves materially and byte/state/render truth is unchanged | Noise, regression, stale truth, or complexity exceeds benefit | Characterization and before/after measurements |
| Sourced cadence initiative | Source, existing lever, deterministic eligibility, optionality, and cadence value all pass | No source-backed lever exists | Explicit positive-hold interval |

No experiment remains “partial” after evaluation.

## 8. Cross-Workstream Collision Rules

| Shared surface | Ownership order |
|---|---|
| `App.tsx`, `MapContainer.tsx`, `shellNavigation.ts`, `gameStore.ts` | R1 first; R2 FR-03 rebases on R1. |
| Decision priority/cadence read models and authored initiatives | R2 first; R4 consumes and generalizes the accepted contract. |
| Tactical Group/GameState lifecycle | R3 first; R5 persistence work rebases on R3 schema. |
| Combat resolution and calibration | R3 floor, then R5 stability proof, then R6 experiments serially. |
| Event/essay authored rows | R4 inventory/convergence first; R7 attribution/content pass second. |
| Map/Desk layout strings | R1/R2 layout first; R7 localization sweep second. |
| Package/release configuration | R8 may create transient local validation builds; R9 owns release configuration and immutable RC artifacts. |

Before each workstream:

1. inspect `git status --short`, current branch, and worktrees;
2. inspect the preceding workstream closeout and shared-file diff;
3. rebase/merge only through normal non-destructive Git operations;
4. update the master and command board together if evidence changes ordering;
5. never delete, clean, reset, or overwrite an unrelated dirty worktree.

## 9. Legacy 30-Lane Disposition

The former command board had duplicate, closed, paused, and owner-gated rows. Every row now has one finite home.

| # | Former lane | Disposition |
|---:|---|---|
| 1 | Seamless map transition | R1 |
| 2 | Operational/Tactical Group closeout | R3 |
| 3 | Presidential Command Model | R4 |
| 4 | Presidential Surface | Closed foundation; R4 regression coverage only |
| 5 | Free War | Absorbed into R4 texture/cadence; no new system |
| 6 | Branch protection / CI / release blockers | R5 CI parity and R9 release proof |
| 7 | GUI polish | Closed foundation; new diary findings route through R2/R8 |
| 8 | Army-arc calibration | Closed historical packet; final bounded calibration belongs to R6 |
| 9 | Standing OG no-go | R3 doctrine convergence; R6 preserves Phase C retirement |
| 10 | Tactical Groups duplicate row | Merged into R3 |
| 11 | Event core | R4 |
| 12 | Dynamic Codex | R4 |
| 13 | Optional GameState cleanup | R5 |
| 14 | Sector performance | R5 |
| 15 | Save/load/replay determinism | R5 |
| 16 | Bosnian localization/LQA | R7 |
| 17 | Casualty model | Closed foundation; R6 regression only |
| 18 | Intel ambush | R6 adopt-or-retire experiment |
| 19 | Supply comprehension | R6 explanation-only slice |
| 20 | Officer/OOB depth | R7 exact-source inventory |
| 21 | Soundscape | R7 licensed bounded audio |
| 22 | Telemetry/playtest | R8 |
| 23 | Cohesion divisor | Closed; retained as regression |
| 24 | Political dimensions | R6 serialized adopt-or-retire experiments |
| 25 | Patron/military credibility | Closed; R4/R6 regression only |
| 26 | Ring 3 content | R7 |
| 27 | Sarajevo continuous condition | R6 |
| 28 | Packaging/signing/store/press/trailer | R9 |
| 29 | FORAWWV owner decisions | Waiting lane retired; decisions are locked here; FORAWWV remains untouched |
| 30 | Fall-1995 combat | R6 E-B1, then evidence-conditional E-A6 |

Closed rows are not carried as active status rows. Their history lives in Git, the ledger, and implementation reports.

## 10. Finding Routing

During R8 and R9:

| Finding | Route |
|---|---|
| Incorrect result, broken control, crash, diagnostic error, stale save/map truth, determinism or migration failure | **Bug** -> owning R1–R7 plan -> fix/test -> restart affected fresh campaign |
| Understandable but slow, unclear, repetitive, badly prioritized, or unpolished flow | **Friction** -> R2 for Desk/Decision/map loop, R4 for command/event truth, R7 for content/localization/audio, otherwise owning lane |
| Historically unsupported or misplaced content | **Bug** if factual/chronological; **friction** if sourcing is correct but presentation is unclear -> R6/R7 |
| Optional improvement outside 1.0 outcome and not required for 5/5 | Record in post-1.0 backlog; do not expand this roadmap |

Bugs are fixed before friction. A repaired packaged-Electron session restarts from a clean campaign; it is never continued across a source-changing fix.

## 11. Global Verification Barriers

Each plan contains focused commands. Before a workstream closes, run its focused suite plus every applicable global command:

```powershell
npm.cmd run typecheck
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run test:vitest -- --pool=forks --reporter=dot
git diff --check
```

Additional rules:

- Run two byte-identical long scenarios after any deterministic simulation/output change.
- Run save migration and round-trip tests after any persisted-state change.
- Run packaged/local-Electron console, network, renderer, WebGL, accessibility, and screenshot proof after player-facing or shell changes.
- Do not refresh a baseline until the changed behavior is explained, accepted by this roadmap’s locked criteria, and recorded in the ledger.
- Test commands must pass from the documented supported Windows entrypoint.
- R9 adds clean-machine, malware/security, license/SBOM, checksum, signing/notarization, install/uninstall, offline-start, store-depot, and rollback proof.

## 12. Definition of Program Completion

The roadmap is complete only when:

- R1–R7 acceptance criteria and plan checklists are green;
- R8 completes fresh full-duration RBiH, RS, and HRHB coverage and the final two owner-style diaries score 5/5;
- every R8 finding is either fixed and reverified or explicitly proven outside the 1.0 definition of done;
- bugs and friction remain separately reported;
- deterministic, migration, canon, accessibility, security, and clean-runtime barriers are green;
- R9 creates a reproducible immutable RC and complete publication packet;
- the command board, plan index, documentation index, ledger, and knowledge ledger match this state;
- no stale active lane, duplicate plan, unresolved design choice, or unexplained baseline drift remains.

Public release is complete only after the owner separately says `Publish 1.0` and the R9 signing/upload/tag/push steps succeed.

## 13. Orchestrator Closeout Contract

For each workstream, the orchestrator records:

```text
Workstream:
Plan:
Base and final commit:
Tasks completed:
Focused verification:
Long-run/package evidence:
Behavior/baseline disposition:
Historical/source review:
Bug findings:
Friction findings:
Ledger/canon/docs propagation:
Remaining dependency:
Next workstream:
```

At program close, append one final ledger entry, link the R8 diaries and R9 manifest, mark R1–R9 complete here and on the command board, and run the full verification set. Do not publish implicitly.
