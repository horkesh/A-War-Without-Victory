# A War Without Victory — Master Roadmap

**Status:** IN AUTONOMOUS EXECUTION; R1-R6 and the narrow pre-1.0 RC collapse packet are complete. R7 is the current critical path, followed by R8 and R9.

**Last updated:** 2026-08-15

**Execution branch:** `codex/master-roadmap-execution` (integration target: `main` after all workstreams are green)

**Authority:** This file is the sole source of truth for unfinished product work.

**Execution view:** [COMMAND_BOARD.md](COMMAND_BOARD.md) is a derived convenience view; this roadmap wins if they differ.

**Plan index:** [README.md](README.md)

## Current Execution Snapshot (2026-08-15)

- **Complete:** R1, R2, R3, R4, R5, and the defined pre-1.0 scope of R6.
- **Complete RC narrow packet:** the default-OFF v3 selector plus reversible D-shape is retained. Paired 188-week runs produced hash `70d5e04c6f49e041`, fingerprint `22cf3c5d8884bfb8`, 31/31 anchors, 6/6 bot benchmarks, 7/7 health gates, one live non-enclave HRHB damage/capacity write, and full Section 6 pass. Bucovaca peaked at strain 62 and recovered to 37; Sipovo/Drvar peaks remained 11/7.5. D-topology neighbour cascade remains owner-reserved and is post-1.0.
- **Current lane / next action:** R7 Phase 2 officer/OOB provenance is complete: all 334 playable identities are exact-supported, 40 unresolved candidates are audit-only, and startup/save/read-model persistence is covered. Execute Phase 4 bounded audio next, then English accessibility/readability, opening screens, and packaged proof. Unfinished multilingual localization remains post-1.0.
- **After R7:** R8 packaged full-campaign validation, then R9 release-candidate readiness.
- **Publication boundary:** signing, store upload, public release creation, and a public `1.0` tag still require a separate explicit `Publish 1.0` instruction.

This snapshot governs any older status or "next" wording retained later in long workstream-history cells. Detailed evidence remains in the linked reports and project ledger; the derived command board must mirror this snapshot.

## 1. Outcome

Ship a historically grounded, deterministic, polished 1.0 in which the player can move through:

`Desk -> Decision Room -> evidence/map/Army HQ -> decision or explicit hold -> Advance`

without hidden required work, long unexplained decision droughts, map-entry stalls, duplicate operational systems, unsupported historical claims, or release-only surprises.

The program is now finite:

- nine executable product workstreams, R1–R9, plus the reactivated RC collapse gate;
- one plan per R1–R9 workstream, with the RC scope/build/gate packet linked from the register;
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
       -> RC Pressure/exhaustion/COLLAPSE pipeline
            -> R6 Historical gameplay depth/final calibration

R4 + R6 + stable R1/R2 UI
  -> R7 Content/history/audio/accessibility/opening

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
| R4 | Command, event, and Dynamic Codex convergence | **COMPLETE — CLOSED 2026-08-06 (Phase 6 merged, PR #481 → main `40d3c5452`).** Phase 5 integrated proof + Phase 6 regression fixes from the 12-specialist RS-ahistorical-playthrough panel (`docs/40_reports/20260805_RS_PLAYTHROUGH_PYRRHIC_PANEL_SYNTHESIS.md`): 6.1 `pending_dayton` game-over terminal-state deadlock (4-specialist converged), 6.2 `op_directive_rejection` surfaced as a record-band Desk card (+ `OperationAAR.requested_by_president`), 6.3 stop charging CA for unbuildable directives, 6.4 Main Staff (`kind: army_hq`) filtered from corps levers, 6.5 IPC mutation serialization (serialize-by-default mutex, single-point interception). Calibration byte-identical; 232 tests green; independent Code Review + QA both GO (implementer≠reviewer). Non-blocking fast-follow: optional live double-click smoke + narrative-seat CO-voice prose pass. | [Command/event/Codex plan](2026-07-31-command-event-codex-convergence-plan.md) (Phase 6) | Five presidential levers remain; Decision Room owns action; Desk owns triage; events, Chronicle, Cost Ledger, and Codex share deterministic receipts and priority truth. |
| R5 | Engine quality, performance, and stability | **COMPLETE — CLOSED 2026-08-05 at the current performance floor (~1,086 ms/turn fresh).** Every self-executable item is done (Phases 0/1/3/4.1, Phase 2e Tasks 1-10, Task 7 baseline gate). Phase 2e's pure-solve/serial-commit extraction was proven correct but FAIL_REVERTED for a 3-7% wall-clock + ~45% heap regression; production uses the direct `buildCorpsFrontSectors` call. **Task 6 (incremental-reuse toward 100 ms/turn) is DECLINED, not deferred:** its only user-facing motivation was the warroom->map delay, which is R1's domain and already solved (~4.3 s -> ~114 ms warm; the map reads pre-computed sectors and never calls the builder). ~1 s/turn sim throughput is acceptable for a strategic game; the 100 ms/turn target is retired as aspirational. The reverted Phase 2e pipeline and its characterization suite are preserved for an optional future re-attempt (its flaky pure-solve `sectors_rebuilt` divergence test is skipped) | [Engine-quality plan](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c/2d packet](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) / [Phase 2e pure solve](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md) | Optional state is classified, measured hot paths improve without byte drift, save/replay contracts are stable, generated artifacts have owners, and local/CI release checks match. |
| R6 | Historical gameplay depth and final calibration | **PRE-1.0 SCOPE COMPLETE — CLOSED 2026-08-09.** Final R6 re-floor `n163`: 634 matched OSIDs, 30/31 anchors (Brčko debt only), Section 6 correct, 40-week fingerprint `5cfcf1c8` golden-match, and all seven engine-health checks passing. Later RC-base fixes moved current HEAD to 629 matched and 31/31 anchors; do not conflate that newer integration baseline with the R6 closeout snapshot. Remaining Brčko/force-density, exhaustion re-pacing, casualty-grade, combat-earned-cohesion, and institutional-veto work is recorded post-1.0 debt unless explicitly reactivated. | [Historical-gameplay plan](2026-07-31-historical-gameplay-depth-calibration-plan.md) · [exhaustion/scoring plan](2026-08-06-exhaustion-scoring-redesign-plan.md) | Calendar/weak-predicate events cannot manufacture control; experiments close by predeclared criteria; long-run evidence remains deterministic and Section 6-safe. |
| RC | Pressure → exhaustion → **COLLAPSE** pipeline | **PRE-1.0 NARROW SCOPE COMPLETE — CLOSED 2026-08-15.** Retained v3 selection plus reversible D-shape (`4.0` shock / `0.5` recovery) produced one live non-enclave HRHB write while remaining deterministic and trajectory-flat: hash `70d5e04c6f49e041`, fingerprint `22cf3c5d8884bfb8`, 31/31 anchors, 6/6 benchmarks, 7/7 health gates, and full Section 6 pass. Bucovaca peaked 62 and recovered to 37; Sipovo/Drvar peaks 11/7.5. D-topology is explicitly post-1.0/reserved. | [Scope](../40_reports/proposals/20260609_SCOPE_collapse_pipeline.md) · [build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) · [measurement plan](2026-08-15-collapse-d-selection-measurement-plan.md) · [D-shape design](2026-08-15-collapse-d-shape-design.md) · [Stage 0/2 panel record](../40_reports/20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md) | The default-OFF local collapse model measures historically discriminating combat pressure, recovers on quiet turns, reaches a bounded live writer, preserves Section 6, and leaves neighbour cascade to an explicit post-1.0 topology packet. |
| R7 | Content, historical attribution, audio, accessibility, and opening experience | **IN PROGRESS — PHASE 2 COMPLETE.** Phase 0 inventories, Phase 1.1 sensitive-history repair, Phase 1.2 retained Ring-2 closeout, and Phase 2 officer/OOB attribution are complete. The claim inventory reports 3,642 documented rows, 12 explicitly non-player-facing deposits, and zero unresolved player-facing claims. The identity inventory reports 334 exact-supported playable rows (68 officers, 19 corps, 244 brigades, 3 elite-command links), 40 audit-only omitted candidates, and zero blockers. Next: Phase 4 audio provenance/assets, then English accessibility/readability, integrated packaged proof, and the owner-directed launch/opening-screens rework with historian/Section 6 image-and-copy gates. **Localization Phase 3 is deferred post-1.0 by owner decision 2026-08-15**; existing translations and compatibility remain but multilingual completeness, `bs` migration, pseudolocalization, native LQA, and locale-specific proof do not gate 1.0. | [Content/history/audio plan](2026-07-31-content-history-localization-audio-plan.md) · [launch/opening-screens design](2026-08-05-launch-opening-screens-design.md) | Claims, identities, English strings, and audio are machine-auditable; unsupported content is absent; licensing, accessibility, opening experience, and Electron proof pass. |
| R8 | Full-campaign packaged-Electron validation and diaries | **WAITING ON RC AND R1–R7 GREEN.** The existing Electron playthrough prototype remains a short IPC-contract smoke tool; R8 full-campaign logic belongs on the determinism-proven `tools/ai_play/president_playthrough.ts` harness. | [Electron-validation plan](2026-07-31-full-campaign-electron-validation-plan.md) | Fresh historical-policy RBiH, RS, and HRHB campaigns cover full duration and required surfaces; bugs and friction are separately routed; final two diaries score 5/5 with clean diagnostics. |
| R9 | Release candidate, gold, and publication | READY AFTER R8 | [Release plan](2026-07-31-release-candidate-gold-publication-plan.md) | One immutable RC passes clean-machine/security/license/store proofs; artifacts are reproducible; signing/upload inputs are documented; publication awaits only the explicit instruction. |

The linked plan is the task-level contract for each row. A workstream may not gain a second active plan; amend the linked plan and this register together.

> **Closed-phase amendment logs** (R1–R7 phase-closure notes, Aug 2026) are archived in [MASTER_ROADMAP_ARCHIVE.md](MASTER_ROADMAP_ARCHIVE.md) to keep this file within the conciseness guard. The Workstream Register above is the live authority.

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

### 6.5 Post-1.0 localization and pre-1.0 audio

- **Owner decision 2026-08-15:** unfinished multilingual localization no longer gates 1.0. English is the only required release language for 1.0; existing translated/compatibility work remains in place but is not represented as production-complete.
- Post-1.0 localization retains the settled contract: canonical Bosnian locale `bs`, formatting `bs-BA`, legacy `bcs` migration/alias, deterministic pseudolocalization before visual LQA, and explicit Preview labeling until native review is complete.
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
| Map/Desk English layout strings | R1/R2 layout first; R7 accessibility/readability proof second. Multilingual expansion is post-1.0. |
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
| 16 | Bosnian localization/LQA | Post-1.0 backlog; R7 Phase 3 retained as the executable packet |
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
| Understandable but slow, unclear, repetitive, badly prioritized, or unpolished flow | **Friction** -> R2 for Desk/Decision/map loop, R4 for command/event truth, R7 for content/audio/accessibility, otherwise owning lane; multilingual expansion routes post-1.0 |
| Historically unsupported or misplaced content | **Bug** if factual/chronological; **friction** if sourcing is correct but presentation is unclear -> R6/R7 |
| Optional improvement outside 1.0 outcome and not required for 5/5 | Record in post-1.0 backlog; do not expand this roadmap |

Bugs are fixed before friction. A repaired packaged-Electron session restarts from a clean campaign; it is never continued across a source-changing fix.

### Post-1.0 / non-blocking backlog

Optional improvements identified outside the 1.0 outcome, per the routing rule above: recorded here, not folded into an active R-lane.

| Date | Item | Design doc | Status |
|---|---|---|---|
| 2026-08-15 | Collapse D-topology: add an explicitly reviewed neighbour-loss/cascade mechanism only if post-1.0 thesis-depth work requires territorial propagation beyond the retained local selection/shape model. Must reopen ordinary Section 6 review and fresh 188-week re-floor; do not reopen struck breadth tuning. | [RC panel synthesis](../40_reports/20260813_RC_COLLAPSE_PANEL_RECONCILER_SYNTHESIS.md#option-d--address-the-model-three-variants-priced-very-differently) | **RESERVED POST-1.0**; narrow RC lanes 1-3 are complete and this does not gate R7, R8, R9, or 1.0 |
| 2026-08-15 | Multilingual localization: canonicalize `bs`/`bs-BA`, migrate legacy `bcs`, add deterministic pseudolocalization, complete Bosnian strings, obtain native linguistic/in-product review, and run locale-specific packaged visual proof. Existing translations/compatibility remain; English is the sole required 1.0 language. | [R7 plan Phase 3](2026-07-31-content-history-localization-audio-plan.md#phase-3----deferred-post-10----bosnian-locale-contract-and-localizability) | **DEFERRED POST-1.0 by owner decision**; does not gate R7, R8, R9, or the 1.0 release |
| 2026-08-05 | Faction-wide current equipment totals visibility (Warroom Faction Overview MILITARY quadrant + Army HQ corps-list rollup) | [Design note](2026-08-05-faction-equipment-totals-visibility-design.md) | Proposed — not implemented; does not gate any R1–R9 lane |
| 2026-08-05 | Local Support presidential lever reads as a mandatory free weekly click rather than a real decision — Game Designer's Pyrrhic panel review confirms the underlying mechanic (single expiring weekly slot, no CA cost) is intentional two-tier lever design, not a bug, but there's currently never a reason not to fire it. Candidate (not approved): 4-week commitment lock-in instead of a per-turn overwrite. | `docs/40_reports/20260805_RS_PLAYTHROUGH_PYRRHIC_PANEL_SYNTHESIS.md` | Proposed — not implemented; canon-silent per Game Designer's own review; does not gate any R1–R9 lane |
| 2026-08-06 | Rename player-facing "sector" → "Operational Group" (OG) and auto-name EVERY OG with a real historical name (attested OG/TG/OZ verbatim where known — the existing `ATTESTED_OG_NAMES`/`resolveAttestedOgName` in `GameStateAdapter.ts`; geographic `"{dominant_mun} OG"` fallback for the rest). DISPLAY-LAYER ONLY per ADR-0006 (engine `sector_id` unchanged, no sector-removal refactor). Zero calibration/engine risk; deterministic; §6-safe (attested names historian-sourced, place-name fallback). | [Design](2026-08-06-sectors-to-og-naming-design.md) | SCOPED (owner-requested 2026-08-06, tackle eventually) — not implemented; schedulable any time, no lane dependency |

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

- RC and R1–R7 acceptance criteria and plan checklists are green;
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
