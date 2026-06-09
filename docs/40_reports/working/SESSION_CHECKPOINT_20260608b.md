# Session checkpoint — 2026-06-08 (continued)

**Floor of record:** 188w 649/712 hash `d311eeac18492683` (30/30, 0 crit) · 40w `235c61f408dc3d95` · 52w `515e0e07ab32db82`. **Calibration is LAST** — 649 is a regression guard, do not push match-% until systems are built.

> **Merge mechanics:** repo base-branch policy requires ALL checks green; auto-merge is DISABLED repo-wide. → must `gh pr merge --squash --delete-branch` manually once each PR is green. No admin bypass (gate = safety). `--delete-branch` is blocked while a stale worktree holds the branch (cosmetic; prune later).

## Merge queue (poll CI, merge on green)
- **#333** Pyrrhic roster-refresh (16 role-skills, `.claude/skills/**` only) — ✅ roster work DONE (#56); MERGEABLE, checks running; merge on green. No SKILL.md hardcoded a floor/PR (grep-clean) — fix was missing live-source pointers + durable lessons + post-CALIBRATION-LAST framing. Fixed one stale path (narrative-designer GAME_BIBLE.md → Game_Bible_v0_9_0.md).
- **#330** Free-War signals (A2a foundation) — ✅ MERGED to main (squash). Branch-delete blocked by stale worktree only.
- **#331** Dayton war-endgame — both Pyrrhic reviews GO-WITH-NOTES (Historian + Game-Designer). `test` running; merge on green. Follow-ups → #57 (Annex-7 "as-implemented" relabel before any UI surfaces "historical default = voluntary return"; Brčko = condominium district not "third state"; engine-enforce player budget + fix false docstring @line 144; pre-sign dysfunction forecast).
- **#332** doc-sync — `test` + desktop-probe running; merge on green.
- **#327** force-launch patron cost — 3 stale pins FIXED + pushed (`2c201d89d`: step 187→188, optional-field 511→512/sim 329, cmd! → if-guard). Fresh CI running; merge on green. (Codex follow-up #54: surface cost in DirectiveCard preview.)
- **#329** reserve-attrition (Phase B defect) — NO-GO −18 OSID; HELD for finalization-pass pairing (#50).
- **#326** convergence — green; HELD for owner in-app review.

## MERGED to main this session
- #330 Free-War signals (A2a) · #331 Dayton war-endgame (both reviews GO-WITH-NOTES) · #332 doc-sync. (Local-branch deletes blocked by stale worktrees — cosmetic; prune in a quiet beat.)

## Still gated on CI (manual-merge on green)
- #333 roster-refresh · #327 force-launch · #334 codex-A1c — all MERGEABLE, just finishing CI (`scenarios`/`test`). Merge each on green.
- **#334 hist-review = GO-WITH-NOTES** (all 8 essay sections independently verified; §6-safe; calibration-inert). Notes → #59 (377 count, US-halt Croat-led framing). Approved to merge.
- **#335 freewar-1b (#55) = byte-identical at BOTH horizons** (40w `235c61f408dc3d95`, 188w `d311eeac18492683`). Status CONFLICTING = PROJECT_LEDGER append-collision → rebase on main once review-335 returns. review-335 (code-review/tech-arch) in flight — key check = historical path cannot reach the 120 URGENT threshold.

## Agents running
- dayton-followups (#57) — last one in flight.

## MERGED to main (running tally)
#330 · #331 · #332 · **#327** (force-launch, pins fixed). Local-branch deletes blocked by stale worktrees only (prune in a quiet beat).

## Reviewed-GO, merge-on-green
- **#335 free-war Phase-1b** — review-335 = **GO** (load-bearing check: `emergent` short-circuit gates BEFORE weight read — authored weights 130/150 DO exceed 120, mode gate fires first). Rebased onto main (PROJECT_LEDGER append-collision resolved + reviewer wording fix folded in). ⚠️ LESSON: when resolving a conflict via Edit, remove ALL THREE markers — I missed the opening `<<<<<<< HEAD`, caught it via `grep -c` before merge, amended. Fresh CI running.
- **#334 codex-A1c** — hist-review = GO-WITH-NOTES (notes → #59). CI finishing.
- **#333 roster-refresh** — CI finishing.

## 1.0 DEFINITION-OF-DONE — RATIFIED (owner, 2026-06-08)
Doc: `docs/plans/2026-06-08-v1.0-definition-of-done.md` (4-lens Pyrrhic synthesis). Version reality CORRECTED: package.json = **0.9.6-alpha.1** (not 0.8.1; memory fixed).
- **Headline:** substrate built across all domains; 1.0 = finish-work + process gates, NOT new systems. TRUE blocker = **no full campaign played start→Dayton yet** (D2 playtest = go/no-go).
- **Ratified (1):** staged path **alpha → 0.9.9-beta (feature-complete) → 1.0-rc → 1.0**. 1.0 is two named gates away.
- **Ratified (2):** VRS strangle-not-capture = **BUILD contain-posture NOW** (owner §6 approval). HARD INVARIANT: release must fire → Srebrenica/Žepa still fall + rupture records. → task #61, agent **vrs-contain** (default-off, 188w flag-on proof, STOP-gate).
- **Ratified (3):** immediate next lane = **Decision-Room convergence (#326)** → agent **conv-audit-326** (verify no duplicate lever affordances remain, then merge).
- Must-haves NOT this round (queued): B1 casualty-magnitude scoping (calibration-orthogonal), #6 symmetry-sentence remediation (before 1.0 regardless), A2 Dayton-as-ending, A3 codex coverage, A4 onboarding, C1 CI-enforce-188w + structural fingerprint, D1 single finalization re-floor (LAST) → then C3 hash+schema freeze.

## Agents running
- conv-audit-326 (#326 completeness) · vrs-contain (#61 §6 build).

## Merge queue (manual-on-green)
- **#335 free-war Phase-1b MERGED** (task #55 done). #336 Dayton #57 notes on final `scenarios` — merge on green (closes #57).
- Main now carries: #330/#331/#332/#327/#333/#334/#335.

## Codex sweep (2026-06-08, post-merge) — 5 P2 threads, all legitimate (none stale)
- **#326 CONVERGENCE COMPLETE** (`4e1442d76`): force-launch modal read-only + proposal approvals folded into Decision Room; re-grep confirms every lever-IPC invocation lives ONLY in DirectiveCard; 207 UI tests green. Merge on CI green (re-running).
- **#336 MERGED** (Dayton #57 notes; both OHR sources verified). Main now: #330–#336 (excl. #329 held).
- Fix lanes dispatched: **codex-doc-hygiene** (#333 portable skill live-source paths [my own regression] + #332 de-stale COMMAND_BOARD Lane-3 row) · **codex-334-s6** (#334 §6-governance gap: sensitive-claim inventory skips essay_index.json → A1c sensitive prose bypasses source-check; make the diagnostic cover the runtime-served morphing).
- **Queued task #62**: #330+#335 Free-War emergent signal correctness (target-vs-friendly supply; require actual boost not just weight≥120) — emergent-only, calibration-orthogonal.

## vrs-contain (#61) DONE → PR #339: §6 release-reliability invariant HELD (flag-ON 188w: Srebrenica w162/Žepa w164 fall RS + genocide rupture RECORDED @t162, identical to flag-off; flag-OFF byte-identical 40w/188w). In §6 review (s6-review-339) before merge. NOTE: on the current historical path the posture changes trajectory but NOT net territory (eastern enclaves taken via Krivaja TRIGGERED ops, correctly un-suppressed) — flag-flip is a separate calibration-LAST+owner decision.
## **#326 MERGED** — single-surface presidential command on main (GD #1 must-fix). Main now: #330–#336 + #326.
## #339 §6 review = GO (s6-review-339, all 4 gates confirmed by code-read; release backstop turn≥160 empties contained set before ALL fall paths open ≥160 → enclaves cannot be stranded; default-off provably byte-identical). Cleared to merge (inert). Flag-flip = separate calibration-LAST + owner decision (re-run 188w; flag-ON hash cb00dd310cc04a29). Post-activation canon note → task #63 (NO auto-edit canon).
## Agents running: freewar-signal-fix (#62) — last one.
## Merge-on-green: #337 (doc-hygiene) · #338 (§6 diagnostic) · #339 (VRS contain, §6-GO).
## Now-unblocked / queued: #54 force-launch cost in DirectiveCard (unblocked by #326 merge) · #59 hostage-377 (trivial). Dispatch when a slot frees.

## ⚠️ RECONCILIATION (owner caught a scoping miss, 2026-06-08): contain was ALWAYS faction-agnostic
Design doc `docs/plans/2026-06-07-contain-enclave-faction-agnostic-design.md` = ONE unified mechanic, TWO lanes; doc says land **Lane A FIRST** (calibration value), Lane V last (§6). I built **only Lane V (VRS, #339)** — which is §6-clean but CALIBRATION-NEUTRAL on the current path (eastern enclaves fall via Krivaja triggered ops). The owner correctly remembered the calibration value is in **Lane A**: ARBiH contains HVO enclaves (kiseljak/lasva/zepce), Washington-release → closes the 13-OSID Central-Bosnia/Žepče ceiling (`calibration_central_bosnia_hrhb_ceiling`) that CC events can't fix. → **Lane A dispatched (#64, agent contain-lane-a)**, default-off, flag-ON 188w measures ceiling-closure + western-cascade scope risk (R24 was +6/−6). Machinery already faction-generic so it's an extension not a rebuild. CALIBRATION-LAST: build+measure now, activation folds into finalization.
## #339 = Lane V only (VRS, §6-GO). Task #61 ≠ the whole contain mechanic — Lane A (#64) is the other half.

## Lane A (#64 / PR #341) DONE — HONEST RESULT: net ZERO at calibration horizon, does NOT close the ceiling.
- Flag-OFF byte-identical (40w `235c61f408dc3d95` / 188w `d311eeac18492683`). Flag-ON 188w `cb00dd310cc04a29` → **649/712, control_delta byte-identical (0/712 control diffs)**; western cascade SAFE (0 regression).
- **Root cause (my framing + the design-doc premise were WRONG):** the Žepče cores + Central-Bosnia over-captures are ALREADY at painted-HRHB end-state in the flag-off 649 baseline. The over-capture Lane A targets is a **pre-Washington mid-game TRANSIENT** that the existing Washington-freeze already resolves by oct1995 → invisible to the end-state snapshot calibration measures. The "13-OSID ceiling closes" claim (design doc + my framing) does not hold at 649.
- Built correctly + safely: AWWV_ARBIH_CONTAIN_POSTURE (default-off), faction/enclave-pair-aware release (HRHB→washington_signed, VRS-side unchanged), #339 P2 default-off-purity fix folded in (per-faction flag-gated planner read), 588 tests green.
- **DISPOSITION = owner decision:** keep as default-off path-fidelity, or shelve pending a mid-game (pre-Washington) calibration target. NOT a calibration win. Real central-Bosnia headroom (if any remains at 649) = OOB, not contain (per `calibration_central_bosnia_hrhb_ceiling` memo's own "needs OOB rebalance" note).
## ⚠️ #339 was RED (not slow) — `test` job FAILED on stale pin `tests/strict_null_inventory_progress.test.ts` (contain build added optional `last_contained_osids_by_faction` → inventory count moved; focused-suite run missed the full-suite pin = the "gate on full vitest" lesson AGAIN). Fix dispatched (fix-339-pin) — verify ratchet-vs-escape, bump pin, full strict-null green, push. Merge #339 on green (owner directive), then rebase+merge #341 (will need same pin bump for the ARBiH field).
## OOB scoping #66 DONE: central-Bosnia = 10 open (HVO over-holds), real ~+5-10 HVO-side lever (cap hvo_central_bosnia bilateral stance + trim 4 enclave-list tiles), calibration-LAST. Captured in [[calibration-central-bosnia-hrhb-ceiling]].
## Lessons persisted: [[feedback-consult-memory-before-dispatching-a-lane]] (consult topic-memory before dispatching; measured-memory beats design-doc; measure before claiming; scope to owner intent).
## #339 pin FIXED (`29de39613`, clean ratchet 512→513/state 174, zero new escapes, 95/95 green). CI re-running. Background watcher `bmuwz9314` merges #339 on all-green (bails if any check fails). THEN: rebase #341 onto main (Lane-A commits via `git rebase --onto main feat/vrs-contain-posture`), it'll need the SAME strict-null pin bump (+ARBiH field → 513→514) → fix + watcher + merge per owner directive.
## Recurring lesson: 3rd stale-pin slip this session (#327, #339) from agents running FOCUSED suites. FIX FORWARD: name `strict_null_inventory_progress` + `war_phase_step_order` explicitly in every engine/sim dispatch gate.
## #339 (Lane V) MERGED. #341 (Lane A) rebased onto main clean (`029c7ebb9`, pin unchanged 513/174 — reuses existing field, 40w byte-identical 235c61f408dc3d95, base retargeted to main) → watcher `bbuauev63` merges on green. Both #339/#341 directives fully automated; nothing owner-blocking.
## BETA BAND OPENED (owner greenlit, 2026-06-09) on the Pyrrhic panel's recommendation (4-lens, #67).
**Panel synthesis:** D1 (single calibration-finalization re-floor) is the one-way door, LAST; three independent parallel tracks must precede it — C1 (gate it), playtest (prove it holds), B1 (fold integrity in). Owner chose "dispatch C1 + B1 + instrumented proxy." Per-lens picks: Tech-Arch=C1-first; Ops+GD=playtest-first; Historian=B1. Reconciled = all three parallel.
**Tracks dispatched (#68/#69/#70):** c1-ci-gate (full-vitest + structural fingerprint) · b1-casualty (WIA:KIA re-anchor + missing-fix, default-off, measure, HOLD for D1, + orthogonality verdict) · playtest-proxy (headless start→Dayton audit → A2/A3/A4 punch-list).
**Then:** A2→A4→A3 scoped by the playtest punch-list, under the C1 gate → D1 (gated by C1, informed by playtest, absorbs B1 + central-Bosnia OOB lever) → C3 freeze → D2 formal playtest gate → D3 operator → 1.0.
**Queued:** symmetry-sentence soften (Historian "before 1.0 regardless" — soften ONE clause "scars on both communities", don't rewrite the sound essay).

## PLAYTEST PROXY (#70) DONE — headline result of the session. Loop holds ~138w then thins to near-silence through the climax. Floor held byte-identical (d311eeac). Punch-list `docs/40_reports/playtest/20260609_INSTRUMENTED_CAMPAIGN_AUDIT.md`:
- **A2:** Dayton menu opens at t188 but TERMINATES unresolved (no verdict, game_over:false = freeze-frame); DAYTON_TRIGGER_WEEK=188 fires on last turn (no turns to negotiate). → **A2 dispatched (#71, a2-dayton-close)**: trigger→~180 + resolve to Pyrrhic verdict + game_over + headless terminal proxy; calibration-aware (verdict layer, no OSID re-paint; gate any IEBL re-paint for D1).
- **A3:** dead bridge — vance_owen/owen_stoltenberg accept never set the flags the codex ghosts read (early_peace_accepted/enclave_defended/alliance_held can't fire); buildDynamicSections() returns [] (Phase 0). 45% of weeks fire 0 events; w140-160 (Srebrenica window) near-total decision void. → A3 queued (panel order: after A2): fix flag bridge + build buildDynamicSections, wire the 23 load-bearing events.
- **A4:** teach negative-sum-not-conquest + president/propose-approve + war-cost scoreboard. Queued after A2.

## #341 (Lane A) MERGE SNAG: post-rebase force-push didn't trigger CI → empty check rollup → branch-protection blocked. Fixed: empty-commit `73a88448e` re-triggers; corrected watcher `bstqxlslv` (SKIPPED/NEUTRAL=pass — the prior watcher bug that timed out). LESSON: force-push after rebase may not fire workflows; watcher success-check must treat SKIPPED as pass.
## A2 (#71) HARVESTED (agent wait-looped): design sound — default-off scenario flag `dayton_close_out`, trigger→180 + resolvePendingDaytonCloseOut (game_over+Pyrrhic verdict), resolveDaytonNegotiation does NOT repaint OSID control = inert verdict layer; 204 dayton tests pass. Committed `a47f31138`, pushed, PR open. My byte-identity gate `bk33ys2dr` (188w flag-off → expect d311eeac + flag-on close → expect game_over+verdict). Merge on confirm. TODO: PROJECT_LEDGER entry for A2 (real flag-on feature; pre-commit hook flagged none for 2026-06-09).
## #341 (Lane A) MERGED (2026-06-09, corrected watcher, 8 checks green). Both contain lanes V+A on main, default-off. Contain arc CLOSED.
## B1 (#69/PR #344) DONE+HELD: flag-off byte-identical; flag-on orthogonal (0 OSID move); improved missing/captured −22% (54k→42k). HONEST: WIA:KIA already fixed by PR-1 v2 (1:3.73); the headline killed ×2.4 is GROSS attrition = Lane 3 (#72, territory-coupled, D1, NOT orthogonal). Durable-missing target = owner band-decision at D1 (~2-4k vs ICTY-DU ~10.5k). AAR-layer split inconsistency → #73.
## A2 (#71 / PR #342) WORKS + gated: harvested (a47f31138). 188w flag-OFF = d311eeac18492683 (== floor, byte-identical). Flag-ON close-out (apr1992_definitive_188w_dayton_close) = game_over:true + outcome:"dayton" + dayton_result verdict → THE CLIMAX NOW CLOSES (was a freeze-frame). Strict-null pin pre-empted (StateMeta.dayton_close_out: 513→514/state 175, `f236c8ce3`). Watcher brnaiw9j5 merges #342 on green. TODO: A2 PROJECT_LEDGER entry.
## C1 (#68 / PR #343) DONE, CI-GREEN: full-suite job (1044 files, ~20m, catches stale pins regardless of slicing) + structural-fingerprint job (platform-stable: OSID-control/anchors/benchmarks; brigade tallies EXCLUDED = non-deterministic snapshot; Win expected==Linux CI). Root cause was test/scenarios slicing with NO full-suite job. Watcher b43a8q7lu merges on green.
## ⚠️ C1 ACTIVATION = owner decision (the operative step): merging lands the jobs but they only GATE once marked REQUIRED in branch protection (admin). Tradeoff: full-suite +20m/PR. c1 agent rec = path-filtered required (skip doc/UI-only per 2026-06-05 CI-batching policy) + treat path-skipped-as-pass (or merge queue). AWAITING owner.
## C1 (#343) MERGED 04:43Z — full-suite + structural-fingerprint gate LIVE on main. Activation pending: owner marks `full-suite`+`structural-fingerprint` required in branch protection; I OFFERED a skip→success shim for clean path-filtered-required (awaiting owner). #68 stays in_progress until required-marked.
## A2 (#342) MERGED 05:09Z — passed ALL 10 checks incl. the new full-suite + structural-fingerprint gates (first PR validated through C1 end-to-end; gate works). The campaign now CLOSES to a Pyrrhic verdict on main. Main floor held (A2 flag-off byte-identical d311eeac).
## A4 (#74, a4-onboarding) DISPATCHED — panel's next-in-order; teaches negative-sum/president-command/war-cost-climax from the playtest punch-list. UI/content, calibration-neutral.
## NEXT after A4 = A3 (codex coverage + the dead-bridge fix: vance_owen/owen_stoltenberg flags + buildDynamicSections). Then alpha→ 0.9.9-beta gate (D4 doc sweep) → D1 single finalization re-floor (absorbs B1 + Lane-3 #72 + central-Bosnia OOB + contain/PDP activations + durable-missing target) → C3 freeze → D2 playtest gate → 1.0-rc → 1.0.
## A4 (#74 / PR #345) DONE: thesis onboarding (3 beats × 8-step deck + opening-brief footer, EN+BCS), UI/content only, no new persisted field, pin untouched, 162 tests green. Watcher b30cu5o3w. ⚠️ OWNER DECISION: full deck is opt-in only ("Restart Tutorial" in Settings; Track-D removed auto-mount) — only the opening-brief footer fires unprompted. Auto-mount the deck on first run? (separate additive mount, guarded by existing track-D test).
## A3 (#75 / a3-codex-coverage) DISPATCHED — dead-bridge flags + buildDynamicSections (authorship loop); Srebrenica-fall codex DEFERRED to §6 lane.
## OPEN OWNER DECISIONS: (1) C1 activation — mark `full-suite`+`structural-fingerprint` required in branch protection; I offered a skip→success shim for clean path-filtered-required. (2) A4 deck auto-mount on first run. (3) D1-time: durable-missing target band, Lane-3 sequencing, contain/PDP activations.
## A4 (#345) MERGED 05:25Z. Owner greenlit both shims: c1-skip-shim (#76, always-report gate jobs → mark required cleanly) + a4-automount (#77, deck auto-shows on first run, off clean main). Both dispatched.
## On main now (alpha): A2 campaign-ends · A4 onboarding · C1 gate · + all prior. REMAINING alpha: A3 (#75 in flight) + the 2 shims. Then 0.9.9-beta line.
## c1-skip-shim (#76) DONE → PR #346 (CI-only, always-run-then-short-circuit, path set unchanged, self-validating). Watcher bpcaonimn. After it merges → owner marks `full-suite`+`structural-fingerprint` REQUIRED in branch protection (the activation that closes the leak).
## a4-automount (#77) DONE → PR #347 (App.tsx mount re-wire + track-D test; reuses meta.tutorial_state, no new field; deck-first; 131 green). Watcher bce5th1i1.
## ALPHA TAIL — merge-on-green: #346 (skip-shim, bpcaonimn) · #347 (auto-mount, bce5th1i1). In flight: A3 (#75, a3-codex-coverage) = LAST alpha piece.
## After A3 + #346 + #347 land → ALPHA COMPLETE → 0.9.9-beta gate: (1) owner marks full-suite+structural-fingerprint REQUIRED (post-#346), (2) D4 doc sweep, (3) team scopes D1 finalization sequencing.
## A3 (#75) scenario-tester verdict = GO as a CALIBRATION-FLAT re-floor. Territory BIT-IDENTICAL (control_delta byte-identical both horizons, 30/30 anchors, formation/activity identical) — hash moves ONLY via 2 codex read-model flags (vance_owen_accepted/owen_stoltenberg_accepted). **OWNER SIGNED OFF the re-floor (2026-06-09).** Same class as the accepted observer-flag re-floors. NEW FLOOR (pending exact 52w): 188w `d311eeac`→`5f57d172`, 40w `235c61f408dc3d95`→`be76e56d`, 52w→new. Agent finalizing: refresh 40w+52w golden manifests (UPDATE_BASELINES), update CALIBRATION_MASTER + memory floor, PR. structural_fingerprint_40w.json UNCHANGED (control/anchors identical → C1 fingerprint passes). Srebrenica-fall codex DEFERRED to §6 lane.
## #347 (auto-mount) CI caught a 2nd stale "no-auto-mount" pin: `tests/warroom_shell_layer.test.ts` asserts App.tsx must NOT contain OnboardingOverlayWrapper (the auto-mount adds it). Stale OLD-intent pin in a different file than the track-D test the agent fixed. Re-prodded a4-automount to flip it + grep for a 3rd. (C1 gate working as designed — caught a missed test pre-merge.) #347 watcher re-arm after the fix pushes.
## #346 (skip-shim) MERGED 05:52Z → C1 NOW FULLY READY. **OWNER ACTION UNBLOCKED:** mark `full-suite` + `structural-fingerprint` REQUIRED in branch protection (Settings→Branches→main) — doc PRs now report green-fast (no jam). This = the leak-closing activation.
## #347 auto-mount: agent fixed THREE stale "no-onboarding-mount" pins (warroom_shell_layer + ui_presidential_toolbar_summary_click + the earlier track-D), grep-confirmed no 4th, 206 tests green, pushed `60a85df58`. Watcher bp3e1uqao re-armed. (C1 gate caught the 1st; grep caught the rest — the intent-change pin cluster.)
## A3 (#75 / PR #348) FINALIZED — calibration-flat re-floor, owner-signed. **NEW FLOOR OF RECORD (on #348 merge):** 188w `5f57d17287b87dfb` · 40w `be76e56dd9d288c2` · 52w golden final_save `9b426732af4bacccd8f71244867e3e4fbfae098e56a75e442903bc7a9ad2ed1c`. Calibration-FLAT: control_delta byte-identical both horizons (0/712), 30/30 anchors, Srebrenica/Žepa fall §6-intact; golden manifests refreshed (only 52w final_save/run_summary moved); structural_fingerprint_40w.json UNTOUCHED; pin tests green. CALIBRATION_MASTER updated by agent. **TODO on merge: update MEMORY.md floor line `d311eeac`→`5f57d172`.** Srebrenica-fall §6 codex → task #78 (gated).
## While-waiting dispatches (non-overlapping): codex-54-directivecard (#54 force-launch cost preview, UI) · d1-scope (#79 read-only D1 finalization dependency-map + recommended order, DRAFT for ratification → docs/plans/2026-06-09-d1-finalization-sequence-DRAFT.md).
## D1-scope (#79) DONE → `docs/plans/2026-06-09-d1-finalization-sequence-DRAFT.md` (DRAFT for ratification). Order: re-confirm→Lane-3→B1(batch)→E-B1(keystone)→cb-OOB A+B(~+10, ceil ~659)→PDP intl+cohesion→reserve/ambush(opt)→contain DO-NOT-ACTIVATE. SPINE=Lane-3→E-B1→reserve/intel (shared defender-power surface, serial-solo); INDEPENDENT=cb-OOB+PDP. **KEY: shelve contain V/A (inert+§6); if Lane-3 also shelved→spine=E-B1 SOLO→low-risk D1.** Top-3 owner decisions @ D1: durable-missing band / contain shelve / Lane-3 risk. Stale-doc fix queued: backlog lists op:zvornik:zvornik open but RECOVERED (#279) → beta doc sweep.
## #54 DONE → PR #349 (force-launch cost preview; cost matches engine RS-10/RBiH-5/HRHB-2, shown-objection-only; UI/test only). 
## Combined watcher b4vp2l73m merges #347 (auto-mount) + #348 (A3 re-floor d311eeac→5f57d172) + #349 (#54) as each greens. (Supersedes individual watchers.) All 3 green-so-far, only full-suite finishing.
## ON #348 MERGE: update MEMORY.md floor line d311eeac→5f57d172 + CALIBRATION_MASTER already done by agent.
## ✅ ALPHA BAND COMPLETE (2026-06-09). On main: A2 Dayton-closes (#342) · A4 thesis-onboarding (#345) + deck auto-mount (#347) · A3 authorship-loop + re-floor (#348) · C1 full-suite+structural-fingerprint gate (#343) + skip-shim (#346). NEW FLOOR: 188w `5f57d172` / 40w `be76e56d` / 52w golden `9b426732…` (territory unchanged 649; MEMORY.md + CALIBRATION_MASTER updated).
## #349 (#54 force-launch cost preview) — last PR, landing via watcher b4vp2l73m (not core alpha; Codex backlog).
## === AT THE 0.9.9-BETA GATE ===  Next: (1) OWNER marks full-suite+structural-fingerprint REQUIRED in branch protection (skip-shim merged → safe). (2) D4 doc-staleness sweep (reconcile COMMAND_BOARD/MASTER_ROADMAP/memory to new floor + alpha shipments + the zvornik-recovered/version fixes). (3) version bump alpha→0.9.9-beta. (4) team ratifies D1 finalization sequence (draft ready).
## ✅ C1 GATE NOW ENFORCING (owner toggled branch protection 2026-06-09). main required checks = test · typecheck · scenario-anchors · **full-suite · structural-fingerprint**. Stale-pin leak MACHINE-CLOSED.
## #349 (#54) MERGED 06:39Z. Alpha band + force-launch extra 100% on main. Only OPEN PRs = #344 (B1, held for D1) + #329 (reserve-attrition NO-GO, held).
## BETA-GATE PROGRESS: (1) branch-protection toggle ✅ DONE. (2) D4 doc sweep — d4-doc-sweep running (first doc-only PR through the required gate → live skip-shim test). (3) version bump alpha→0.9.9-beta (pending). (4) D1 sequence ratification (draft ready, pending).
## #350 (D4 doc sweep) — board/roadmap/backlog/napkin reconciled to new floor + alpha-complete; skip-shim LIVE-VALIDATED (full-suite 39s / structural-fingerprint 42s green-fast on the docs PR). Merging via watcher b2r1r7abz (held only by the non-path-filtered `test` + `desktop-packaged-runtime-probe` — see #81).
## #81 (ci-pathfilter-rest) DISPATCHED — extend skip→success to test/desktop-probe/scenario-anchors so docs/process PRs short-circuit all heavy checks. Then docs PRs merge <1min.
## Beta gate: toggle ✅ · doc sweep ⏳(#350) · version bump alpha→0.9.9-beta.1 (next, after #350) · D1 ratification (draft ready).
## #81 (ci-pathfilter-rest) DONE → PR #351: generic detect-changed-paths.sh path-filters test/scenario-anchors/scenarios/desktop-release-check/desktop-packaged-runtime-probe (code/sim/desktop sets); always-report preserved (no branch-protection change); no coverage shrink. After merge → docs/process PRs short-circuit ALL heavy checks (<1min). Watcher b9ttkrqdo.
## #350 (D4 doc sweep) MERGED — docs reconciled to new floor + alpha-complete on main.
## version-bump (#82) DISPATCHED → package.json 0.9.6-alpha.1 → 0.9.9-beta.1 (formal feature-complete-beta entry per ratified DoD). PR pending.
## version-bump (#82) DONE → PR #352 (package.json+lock+2 src constants+4 current-version docs; historical refs untouched; tsc clean). 0.9.6-alpha.1→0.9.9-beta.1.
## Walked owner through the 3 D1 decisions (durable-missing target [rec ICTY ~10.5k] · contain shelve-or-activate [rec shelve] · Lane-3 risk appetite [the weighty one — accept-as-ceiling shrinks D1 to E-B1 solo]). Captured in the conversation; doc = `docs/plans/2026-06-09-d1-finalization-sequence-DRAFT.md`.
## No agents running. Watchers: b9ttkrqdo (#351 ci-fastpath) · bgp5sfy5t (#352 version bump). Both ~20min full gate.
## BETA GATE: toggle ✅ · doc sweep ✅ · version bump ⏳(#352) · ci-fastpath ⏳(#351). On both merges → FORMALLY IN 0.9.9-beta.

## ★ OWNER RESOLVED THE 3 D1 DECISIONS (2026-06-09):
## 1. Durable-missing target = **ICTY ~10,500**. (sets B1/casualty target; orthogonal.)
## 2. Contain lanes = **SHELVE** (#339/#341 inert) BUT build a real solution: a **presidential ENCLAVE DECISION** — OVERRUN (assault at heavy military + civilian-displacement/death cost + atrocity awareness → verdict taint, never rewarded) vs CONTAIN (siege/squeeze). The player-authored "authorship of the tragedy" choice. → §6 DESIGN dispatched (#83, enclave-decision-design) — design-doc for owner+§6 sign-off, NOT built.
## 3. Lane-3 = **ATTEMPT** — reframed as ENGINE-HEALTH realism (equipment asymmetry dominant, opposite VRS/ARBiH casualty arcs); calibrate a HEALTHY engine, floor follows realism (principle → [[feedback-calibrate-a-healthy-engine-not-the-floor]]). → combat-realism SCOPING dispatched (#84, combat-realism-scope) for D1. Sacred anchors + §6 still hold.
## #351 (CI fast-path) MERGED 07:26Z — docs/process PRs now short-circuit ALL heavy checks. Only #352 (version bump → 0.9.9-beta.1) left to formally enter beta (watcher bgp5sfy5t).
## #83 enclave-decision DESIGN done → `docs/plans/2026-06-09-presidential-enclave-decision-DESIGN.md` (DESIGN-DRAFT, owner+§6 sign-off REQUIRED before build). OVERRUN vs CONTAIN Decision-Room card in Conscience&Atrocity category; reuses isEnclaveContainable + existing combat/displacement/rupture paths; §6 bright-lines enforced (rupture locked — player can delay not erase the fall, guarded by build-time test; score never inverts; no civilian-targeting tunable). Eastern(full-§6, non-delegable) vs ARBiH-HVO(Ring-2) split. 3 owner ratification Qs (below).
## #84 combat-realism scope done → `docs/plans/2026-06-09-combat-realism-lane3-SCOPING.md`. Key: faction-arc divergence is ALREADY emergent in the ln(incoming/own-FP) bombardment term — Lane-3 = lower BASE_ATTRITION (0.0045→~0.0035) + raise bombardment:base ratio → ~60k killed + real arcs (VRS ~38% front-loaded, ARBiH ~52% rising, HVO ~10%). 188w-gated (n553 cascade risk). KIA/WIA untouched (1:3.73 already right).
## #352 version bump: `test` slice FAILED on a stale appVersion pin (error_boundary_isolation.test.ts:55 asserts 0.9.6-alpha.1 → now 0.9.9-beta.1). Version-bump agent re-prodded to fix (constant-compare preferred) + re-grep. Re-arm watcher on push.
## #352 pin FIXED bump-proof (constant-compare CRASH_DIAGNOSTICS_APP_VERSION, `2d1aa19ab`, 9/9 green). Watcher bfaj23mjo re-armed → on merge = FORMALLY IN 0.9.9-beta.
## #351 (CI fast-path) MERGED. No agents running. Watcher: bfaj23mjo (#352).
## D1 DRAFTS READY for owner: enclave-decision (#83), combat-realism (#84), D1-sequence (#79). All gated post-beta.
## ★ ENCLAVE-DECISION OWNER RATIFIED (2026-06-09) → [[presidential_enclave_decision]]: Q3 ahistorical atrocity = YES; OVERRUN of never-fell enclaves (Goražde/Bihać) = ATTACK ORDER via normal combat, NOT auto-fall (can be repulsed; player eats cost+condemnation, engine decides outcome); SYMMETRIC ARBiH-vs-HVO after contain-to-historical-limits. Emergent-only → calibration byte-identical. Build pending §6 sign-off.
## CODEX SWEEP (2026-06-09, post-alpha): main CI green. 10 threads triaged:
## - P1 #346 (skip-logic PR-controllable → gate bypassable) + #351 path-gaps (package-lock/scenario-tests) → FIXING (codex-ci-integrity).
## - P1 #342 (dayton_close_out may be dropped by normalizeScenario → A2 close-out inert via normal harness) → FIXING (codex-342-dayton-norm).
## - P2 #347 onboarding edges → task #85. P2 #348 rbih_state_identity empty dynsec → task #86. P2 #344 surrender-cascade split under V2 flag → folds into B1/D1 (#344 held). 
## - STALE/resolved: #352 crash-fixture (already fixed by the constant-compare pin-fix); #350 #54-shipped-before-#349 (now correct, #349 merged).
## Agents running: codex-ci-integrity · codex-342-dayton-norm. Watcher: bfaj23mjo (#352 version bump).
## RECURRING: agents wait-loop on background 188w (harvest worktree, don't re-prod) — #62, #341-pin, A2 all needed harvest. Engine dispatches should commit BEFORE launching the gate run, so harvest is trivial.
## Agents running: none (watcher bbuauev63 only).
## #62 (freewar signal correctness) — agent looped on premature-return; I HARVESTED its worktree: verified both fixes emergent-gated (historical-inert by construction), committed `4c601f100`, pushed, opened **PR #340**. Gating with my own 188w (bg b9dssrovb) → merge when == d311eeac. (Lesson reaffirmed: re-prodding a wait-looping agent resets its wait; harvest the worktree instead.)
## Merged: #337 (doc-hygiene) · #338 (§6 diagnostic). Merge-on-green: #339 (Lane V VRS, §6-GO) · #340 (#62 — 188w gate CONFIRMED byte-identical `d311eeac18492683`).

## GitHub sweep (2026-06-09): main healthy (Event-System CI + Desktop Guard green; Baseline Regression running). #329 red = known NO-GO (held). 3 Codex threads triaged:
- **#326 P1 — FALSE POSITIVE (verified).** `addStopOpDirectiveCards` (presidentialDecisionRoom.ts:702) reads state.operations, filters phase==='execution', emits issue-able stop_op→stageOpHaltOrder. Codex analyzed the briefing/toTargetView path + missed the dedicated builder. Executing ops ARE haltable. No fix.
- **#339 P2 (real, LATENT — flag never flipped so no flag-on save exists): default-off not a no-op for a resumed flag-on→off save** (planner reads stale serialized last_contained_osids). → FOLDED into #64 (gate the planner read per-faction on the contain flag; faction-generic). #339 can merge as-is.
- **#338 P2 (real): dynamic-section claims bypass the two-source floor exception** (essayFloorStatus only runs for surface==='essay'). → task #65 (tooling-only follow-up).

## #326 convergence — owner rulings folded in
Audit found 1 surviving duplicate (OperationBriefingModal force-launch via CorpsFrontPanel "Review Briefing", 2 clicks). Owner ALSO ruled YES on folding AutonomyPanel proposal-accept into the Decision Room. conv-audit-326 now applying BOTH in the same PR → final #326 = force-launch modal read-only + ALL approvals (incl. autonomy review queue) issue ONLY from Decision Room = true single-surface. Merge on green after.

## Systems program — dispatched (3 agents, cap ~3)
- **roster-refresh** (#56) → `chore/pyrrhic-roster-refresh-20260608`: high-impact role-skills get live-source pointers (CALIBRATION_MASTER/COMMAND_BOARD/memory) replacing hardcoded volatile state + durable lessons. PR-for-review.
- **freewar-1b** (#55) → `feat/freewar-phase1b-consume-signals`: consume #330's emergent signals at army-HQ overrides; emergent-only, historical byte-identical (40w/188w gate).
- **codex-a1c** (#58) → `feat/codex-a1c-response-morphing`: per-response codex morphing (authorship payoff); read-time, emergent-only, sim-inert.

## Standing duties each checkpoint
CI + Codex sweep · doc-sync · dispatch to NAMED specialists · code-review/QA gate before merge · poll GitHub for failures/codex comments.
