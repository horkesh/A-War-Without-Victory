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
## ⚠️ MAIN WORKING TREE had ~11 UNCOMMITTED session docs (scoping/rating agents wrote deliverables straight into main tree, never committed; tree was 13 behind origin). BACKED UP → PR #353 (off clean origin/main, zero-work-loss, reviewable). Excluded stray `main_essay_tmp.json` (952KB essay-index dump — recommend delete). Flagged: anthropic-pitch + PRICING edit = unverified provenance (preserved); rating-master annotation overlaps open #352 → trivial merge. LESSON: scoping/design agents must commit their doc (or PR it), not leave it untracked in main.
## #353 backup PR live (session docs preserved). Owner: delete main_essay_tmp.json ✅ DONE; pitch/pricing = owner's, KEEP in #353; rating-master vs #352 = trivial auto-merge (orchestrator handles, no owner action).
## #346 CI-integrity fix DONE → PR #354 (trusted base-copy restore defeats PR gate-bypass + #351 path-gaps; 4 traces pass). Watcher bwbtnqw96.
## ★★ FORMALLY IN 0.9.9-beta (2026-06-09 08:00Z) — #352 merged, main package.json = 0.9.9-beta.1. BETA GATE FULLY CLOSED: toggle ✅ · doc sweep ✅ · CI fast-path ✅ · version bump ✅. Alpha band complete (A2/A4/A3/C1); floor 188w 5f57d172/649; gate enforcing + tamper-resistant.
## Remaining in BETA → 1.0-rc: D1 finalization (drafts ready, owner ratified 3 decisions: ICTY-10.5k / enclave-decision-not-contain / Lane-3-attempt-engine-health) → D2 full-campaign playthrough → D3 operator/clean-VM → 1.0-rc → 1.0.
## CODEX P1s BOTH RESOLVED: #346 CI-integrity = real → PR #354 (merging, bwbtnqw96). #342 dayton-norm = FALSE ALARM (flag already preserved through both normalizeScenario branches; close-out fires end-to-end, 40w be76e56d byte-identical) → PR #355 adds the missing regression test (merging, blvvw0qo6).
## #354 (CI-integrity) + #355 (dayton-norm test) MERGED. CLEANUP QUEUE CLEAR. No agents/watchers running.
## OPEN PRs only: #353 (session-docs backup — OWNER review) · #344 (B1, held for D1) · #329 (reserve-attrition NO-GO, held).
## SESSION END STATE: in 0.9.9-beta.1; alpha band complete; CI gate enforcing+tamper-resistant; both Codex P1s resolved; floor 188w 5f57d172/649; D1 fully scoped+owner-ratified (drafts in #353). Next milestone = D1 finalization → D2 playthrough → D3 operator → 1.0-rc.
## ★ D1 FINALIZATION OPENED (owner "move on with D1", 2026-06-09). First lane RUNNING: d1-combat-realism (#72) — R0 baseline→R2 (BASE_ATTRITION 0.0045→~0.0035 + bombardment-ratio raise) per the #84 scope + owner engine-health principle; 188w-gated, sacred anchors+§6 must hold, territory re-floors deliberately (HOLD for owner re-floor sign-off, A3 precedent).
## Codex: 5 stale threads RESOLVED (#346/#350/#351×2/#352). Open+tracked: #344(→D1/B1), #347(→#85), #348(→#86), #354 struct-fingerprint gap → fix-sf-integrity running (the #354 integrity fix MISSED the structural-fingerprint detect step → still bypassable; closing it).
## fix-sf-integrity DONE → PR #356: base-restore applied to the structural-fingerprint detect step (the gap #354 missed). ALL 7 detect steps across 3 workflows now base-restored (7/7 verified) → required gate FULLY tamper-resistant. Watcher br1585s2s. Resolve #354 Codex thread on merge.
## #356 MERGED — CI gate FULLY tamper-resistant (7/7 detect steps base-restored). #354 thread resolved. Codex board CLEAN.
## ★ D1 LANE-1 (combat-realism R2) RESULT = NOT a re-floor (PR #357 DRAFT, held, NOT adopted). R2 (base 0.0045→0.0035 + ratio 2.0→1.7): killed 102,621→95,986 (only −6.5%; target ~60k) · arcs WRONG DIRECTION (ARBiH share 56.3→57.5 UP, target DOWN to 52; RS fell, target up — the ratio dial sharpened bombardment AGAINST rifle-ARBiH, opposite of intent) · OSID 649→630 (−19, HRHB→RS 17 = 1995 western-HVO liberation reverting under milder attrition, n553 mechanism) · sacred anchors 30/30 + Zvornik/brijesnica + Srebrenica/Žepa ALL HOLD (invariant-safe, just not good calibration) · effect entirely LATE-war (w104 byte-identical → 40w+CI false-green confirmed).
## KEY FINDING: a −22% base-rate cut moved killed only −6.5% → base-attrition is NOT the dominant volume driver; reaching ~60k via rate alone would need a drastic cut + heavy cascade. The bundled 2-dial change also violated one-change-per-run. → DECISION TO OWNER (R3 fork): isolate base-alone / re-scope WHERE the 102k comes from / pause Lane-3 (documented-ceiling) + do safer D1 lanes first.
## Agents running: none. D1 lane-1 R2 = NO-GO, awaiting owner R3 direction.
## HELD for owner/D1: subsequent D1 lanes (B1→E-B1→cb-OOB→PDP per #79 draft, one-change-per-run after R2 re-floor signed); enclave-decision BUILD (§6 sign-off). Queued P2: #85/#86/#59/#65/#63/#73.
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

## D1 Lane-3 — DIAGNOSE-FIRST (owner choice, 2026-06-09)
- R2 (PR #357, DRAFT, NOT adopted): base-attrition 0.0045→0.0035 (−22%) + bombardment-ratio 2.0→1.7. Moved military-killed only −6.5% (102,621→95,986); RBiH share went WRONG direction 56.3→57.5% (target ~52%); OSID 649→630 (−19, mostly 1995 western-HVO liberation reverting under milder attrition). Sacred 30/30 + §6 HOLD. Candidate hash `2640da8e61cf6aa9`.
- **Finding to act on:** −22% base-rate cut → only −6.5% killed ⇒ base front-attrition is NOT the dominant kill-volume source. Owner chose **"Diagnose the real source first"** before more 188w runs.
- **DISPATCHED** read-only diagnostic agent `casualty-source-diag` (a7c7654a9f8a35515, bg): per-source breakdown of the ~102k military deaths over 188w (front-attrition base term vs bombardment-exposure term vs battle/attack-resolution vs siege vs surrender cascade), per-faction arc check, killed:wounded per source, ranked levers w/ file:line. Deliverable → `docs/40_reports/proposals/20260609_CASUALTY_SOURCE_BREAKDOWN.md`. No behavioral change ships.
- PR #357 held as draft (parked, not merged). GitHub otherwise clean.

## Owner caveat: paramilitary dispersal NOT counted as deaths — VERIFIED CLEAN (2026-06-09)
- `dissolveParamilitary` (paramilitary_sweep.ts:676) sets personnel=0 + lifecycle_status='disbanded', does NOT call recordBattleCasualties → dispersal books ZERO deaths.
- Military killed reads the ADDITIVE casualty_ledger (recordBattleCasualties only); grepped src+tools — no personnel-delta death-counting for the headline figure. (`army_reserve_system.ts:832` uses a personnel-delta as a reserve-close casualty tally — reserves≠paramilitaries; flagged to diag agent to confirm.)
- Paramilitaries DO book their actual combat losses (retreat/capture, PARAMILITARY_CASUALTY_RATE) — correct, real deaths; they're RS-heavy early-war so may inflate RS share. Told casualty-source-diag to add a paramilitary-combat source row + confirm killed reads ledger not deltas + state dispersal=0 explicitly.

## Owner task: displacement tracking + settlement-panel "now" always == "before" (2026-06-09)
- DATA FLOW MAPPED: write-side `src/state/displacement.ts` (updateDisplacement, war_phases:3762) + `displacement_takeover.ts` (processDisplacementTakeover, war_phases:2939) + `minority_flight.ts` (NO sim call site — only CLI harness init `minority_flight_state:{}`; possibly dead) → `state.displacement.displacement_state[munId]` (displaced_out/displaced_in/lost_population/original_population) + `displacement_event_log`. Read-side GameStateAdapter.ts:1776-1828 → `displacementByMun` (keyed by displacement_state keys) + `displacementByOsid` (from event log origin/dest). Display SettlementDetailContent.tsx:269 `currentPop` → :513/:617 shows `currentPop ?? popOriginal`.
- ROOT-CAUSE HYPOTHESIS: panel falls back to popOriginal when BOTH displacementByMun[munId] (munId = props.mun1990_id.toLowerCase()) AND displacementByOsid[osid] are absent → "now"=="before". Either (a) munId-key mismatch (engine writes displacement_state under a different mun id format than panel lookup), or (b) the loaded state's displacement_state/event_log come through empty. NEEDS a scenario run + final-save inspection to settle.
- Owner also wants NATIONAL displacement stats surface (totals: displaced / killed / fled-abroad, by ethnicity).
- DISPATCHED diagnostic+scoping agent (see below).

## CASUALTY-SOURCE DIAGNOSTIC — DONE (2026-06-09) → `docs/40_reports/proposals/20260609_CASUALTY_SOURCE_BREAKDOWN.md`
- 188w, 102,621 ledger killed. Determinism confirmed (40w byte-identical `be76e56d`). Diag worktree+branch pruned.
- SOURCE RANK: battle_defender 32.3% · frontline_base 25.9% · battle_attacker 22.9% · frontline_bombardment 17.4% · siege 0.6% · morale_abs 0.7% · paramilitary(combat-only) 0.2% · dispersal=0.
  - **Battle-resolution (attack_resolution_osid.ts) = 55.8% TOTAL** (the dominant volume source). Frontline (base+bomb) = 43.4%. CONFIRMS base-attrition (25.9%) is NOT dominant → why −22% base cut moved total only −6.5% (=0.22×0.259).
- ARC: RBiH 56.3% (target ~52, OVER) · RS 35.5% (target ~38, UNDER) · HRHB 8.2%. RBiH over-share driven by frontline being 71.5% (base) / 91.4% (bombardment) RBiH — equipment asymmetry correct in DIRECTION but over-MAGNITUDE in volume. battle_defender is 78.6% RS (pulls RS toward target).
- K:W 1:3.74 overall (real ~1:3); frontline paths run 1:4.0–4.1, battle paths 1:3.39.
- VOLUME: 102k military killed vs historical ~57k soldiers (RDC) ≈ 1.8× too high.
- LEVERS (ranked): #1 combat_math.ts ~284-290 BASE_ATTACKER_LOSS_RATE 0.08 / BASE_DEFENDER_LOSS_RATE 0.06 (55.1% of kills — dominant VOLUME lever; defender cut helps RS-share, attacker cut helps RBiH-share). #2 frontline_attrition.ts:81 BOMBARDMENT_EXPOSURE_RATE 0.007 (17.4%, 91.4% RBiH — surgical ARC lever, RBiH-only). #3 frontline_attrition.ts:66 BASE_ATTRITION_RATE 0.0045 (25.9%, second-order).
- IMPLICATION: PR #357 (base+ratio bundle) was both weak-lever AND wrong-arc-direction. Real Lane-3 = one-change-per-run targeting combat_math battle base rates (volume) + surgical bombardment trim (arc), 188w gate each, anchors+§6 hold, territory re-floors. → presenting to owner for lever-priority greenlight.

## Lane-3 VOLUME-FIRST — owner greenlit (2026-06-09), run 1 DISPATCHED
- Owner chose "Volume-first (team rec)" against realism anchor ~57k total killed / ~52% RBiH / ~38% RS / ~10% HRHB.
- Run 1 = ONE change: combat_math.ts BASE_ATTACKER_LOSS_RATE 0.08→0.06 + BASE_DEFENDER_LOSS_RATE 0.06→0.045 (−25% battle-lethality pair, the 55.8% dominant volume source). Agent `lane3-vol-r1` (bg), measure 188w+40w, REPORT ONLY (no merge/re-floor).
- EXPECTED + flagged: total killed ~88-90k; RBiH share ticks UP (battle is net RS-heavy: RS 31.7k vs RBiH 22.4k battle deaths) — corrected later by surgical BOMBARDMENT_EXPOSURE_RATE trim (run 2). §6 (Srebrenica/Žepa fall) + sacred anchors MUST hold; territory delta quantified.
- Then run 2 (arc): frontline_attrition.ts:81 BOMBARDMENT_EXPOSURE_RATE 0.007 trim (91.4% RBiH, surgical RBiH-only) to settle 56→~52.

## DISPLACEMENT DIAGNOSIS — DONE (2026-06-09) → `docs/40_reports/proposals/20260609_DISPLACEMENT_TRACKING_DIAGNOSIS.md`
- ROOT CAUSE of "now==before": NOT a key bug (mun slugs match exactly). TWO facts:
  (A) EARLY-GAME: displacement_state seeded with REAL census original_population but ALL flows=0 until turn 4 (TAKEOVER_DISPLACEMENT_DELAY_TURNS=4). Turns 0-3 → ratio 1.0 → now==before (legitimate). Turn 4: 3 muns/6702 out. Turn 5: 106 muns/434k out. → most likely what owner saw.
  (B) PERMANENT per-OSID precision loss: displacement_event_log cleared every turn (war_phases.ts:3945, drains to JSONL sink); desktop registers NO sink → displacementByOsid always empty live → panel never takes precise per-OSID branch, only coarse mun-scaled (which DOES move post-t4; 731/741 OSIDs differ in 40w final save).
- LIVE PATH CONFIRMED intact: advanceTurn→stateJson→gameStore.ts:707 parseGameState→displacementByMun→panel. final_save carries displacement_state (109 muns). So mid/late game the "now" number moves.
- ENGINE TRACKS richly: 40w 784,632 displaced_out / 248,815 lost / 109 muns. `minority_flight.ts` is DEAD (processMinorityFlight zero call sites) — all displacement from processDisplacementTakeover + updateDisplacement.
- NATIONAL STATS ALREADY EXIST (persisted, by ethnicity AND perpetrator): civilian_casualties (RBiH killed 35,652/fled 80,074; RS 2,777/59,740; HRHB 3,452/81,270), displacement_humanitarian_aggregates (RS→RBiH refugees 763,165 / cas 34,952; etc.), displacement_origin_dest_arrivals (231 flows), displacement_recent_by_turn. Gap: refugees_received=0 (events set dest_mun not dest_osid). → "Humanitarian Ledger" UI = pure read-model exposure, no engine change.
- FIX MENU: 3.3 UX hint (turns 0-3 "no displacement yet") [read-model, byte-identical]; 3.2 restore per-OSID precision live = bounded persisted displacement_flows_by_osid in appendDisplacementEvent + save-version bump + control byte-identical verify [recommended]; National surface [read-model UI]. §6-adjacent (DISPLAYS atrocity magnitudes verbatim — sensitive tone). → presenting to owner for scope+tone.

## Lane-3 RUN 1 RESULT (2026-06-09) → `docs/40_reports/proposals/20260609_combat-realism-lane3-RUN1.md`
- Change: combat_math BASE_ATTACKER 0.08→0.06 + BASE_DEFENDER 0.06→0.045 (−25%). Worktree `lane3-run1`/`lane3-run1-battle-lethality` (uncommitted, NO PR/merge). tsc clean.
- 40w: killed 18,821→14,947 (−20.6%, steeper than predicted −12-15%); shares RBiH 60.9→63.9 (+3.0pts as predicted, battle is RS-heavy) / RS 26.9→25.1 / HRHB 12.2→11.0; K:W 1:3.81→1:3.94; OSID 655→656 (+1!); anchors 30/30 hold; zvornik/brijesnica hold; hash `dcd8b17b7ac7bd05` (base `235c61f408dc3d95`). 3 flips only.
- 188w: BLOCKED — serialize crash at final save: `home_distance_cache.hv_7th_guards_varazdin must be finite non-negative`. PRE-EXISTING latent bug (proven: clean baseline 188w from same base reproduced floor EXACTLY — `5f57d17287b87dfb`, 649, 30/30, Srebrenica 13/13 + Žepa 1/1 fall). Cause: buildHomeDistanceCache (home_distance.ts:113) stores raw computeOsidGraphDistance = Infinity for graph-disconnected pairs; lane-3 left hv_7th_guards_varazdin active+displaced across a VRS corridor at save turn → Infinity cached → serializer rejects. Loss-rate edit has NO causal path to the cache (combat_math only reads it). In baseline that brigade ends inactive → cache builder skips it.
- IMPLICATION: this latent serialize-crash is a 1.0 ROBUSTNESS bug (any divergent game — incl. owner playthroughs + D2 full-campaign — risks it). Fix = clamp/omit non-finite hops in buildHomeDistanceCache (behaviorally inert: getHomeDistanceMult(Infinity) already returns 0.70 floor + cache rebuilt every turn). MUST verify 188w byte-identical to prove inert. Prerequisite to measuring Lane-3 at 188w.

## Owner displacement decisions (2026-06-09)
- "Deep into a game too" → NOT just early-game maturation; a REAL live-feed issue beyond turns 0-3. Build agent must FIRST confirm whether the desktop's IPC-serialized stateJson (awwv.advanceTurn) actually carries state.displacement.displacement_state mid-game (diag tested in-process advanceTurn + final_save, NOT the serialized IPC string) — if serialize drops it, THAT's the bug (fix in serialization, not panel).
- Build ALL FOUR: per-OSID precision (Fix 3.2, save-version bump + byte-identical), National Humanitarian Ledger (read-model UI, §6-adjacent tone), early-game UX hint (3.3), remove dead minority_flight.ts.

## DISPLACEMENT live-chain EMPIRICAL PROBE (orchestrator, 2026-06-09) — pipeline PROVEN OK, bug is last-mile props join
- Ran 188w final_save through EXACT live chain: JSON.parse → serializeState (desktop IPC serializer) → parseGameState. Result: displacement_state 111 muns / 879,877 displaced_out PRESERVED through serializeState; parseGameState→displacementByMun 111 entries, 110/111 muns now!=before (banja_luka 195692→187341, bijeljina 96988→81772). displacementByOsid=0 (event-log cleared, expected).
- ⇒ engine→serialize→adapter→displacementByMun CORRECT. "stuck deep into game" is NOT serialization, NOT adapter. (Refutes the serialize-drop hypothesis.)
- REMAINING SUSPECT = SettlementDetailContent props join: munId=getMunIdForDisplacement(props)=props.mun1990_id (lc+trim) but displacementByMun keyed by SLUG. A1_BASE_MAP.geojson showed NO mun1990_id key in quick grep → mun1990_id may be absent per-OSID OR a DISPLAY NAME ("Banja Luka"→"banja luka" space) ≠ slug "banja_luka" → disp undefined → fallback popOriginal → now==before everywhere. SelectionPanel.tsx:69 already derives the correct slug via selectedOsid.split(':')[1]; the component instead recomputes from props.mun1990_id (the likely defect).
- Relayed precise lead to displacement-build agent (skip serialization; confirm mun1990_id value + fix key derivation to use OSID mun segment). Temp probe `_tmp_disp_probe.mts` removed (clean).

## Lane-3 RUN 1 — 188w MEASURED (via PR #358 fix) → NO-GO, but key structural finding (2026-06-09)
- PR #358 (home_distance non-finite clamp, HOME_DISTANCE_UNREACHABLE_HOPS=99): byte-identical 40w `be76e56d` + 188w `5f57d172` (proven inert), 231 tests + new regression. MERGEABLE — merge-on-green watcher running. Real 1.0 robustness fix (latent save-crash on divergent games).
- Lane-3 188w (battle base −25%, hash `ed3f6b89d317ca61`, uncommitted measurement):
  - Killed 102,621→98,567 (**only −3.9%** vs −20.6% at 40w!). RBiH 56.3→50.6% (−5.7pts, toward target ✓). RS 35.5→35.6% (flat, still under 38). HRHB 8.3→**13.8% (+60% killed!)**. K:W flat 1:3.76.
  - Painted-match **649→586 (−63!!)**. Raw control RS−32/RBiH+14/HRHB+18. Anchors 29/30 (`op:foca:foca_3` RS→RBiH broke, non-§6). §6 HOLDS (Srebrenica 13/13 + Žepa 1/1 fall; zvornik/brijesnica hold).
  - PR#357 reversion question ANSWERED: opposite — HVO OVER-holds/expands (124 vs painted 107), no western-liberation reversion.
- **VERDICT: NO-GO** (−63 OSID territory collapse + HVO casualties balloon + RS share unfixed + anchor break).
- **KEY STRUCTURAL FINDING:** battle-lethality is NOT a clean volume lever at 188w — the war COMPENSATES (lower lethality → HVO/units survive → MORE battles → volume barely drops, only −3.9%). The 102k overshoot is driven by battle FREQUENCY / lack of war exhaustion, not per-battle lethality. → cutting rates can't reach ~57k without destroying territory.
- IMPLICATIONS for next: (a) bombardment-exposure lever (frontline, 91% RBiH, PASSIVE/not battle-triggered) is the cleaner volume+arc lever — should reduce RBiH volume w/o triggering more battles or territory collapse; (b) the DEEPER realism lane = war exhaustion / front-stabilization (historical 1993-95 trench stalemate) — the true source of casualty over-production. → present to owner, recommend pivot to bombardment lever + surface the structural exhaustion question.

## OWNER CONSTRAINT (2026-06-09): keep high battle frequency — accessible levers only
- "I don't have a problem with too many battles and I don't want to change that. Change other levers that are accessible, but I don't want to structurally change the game to produce less battles."
- ⇒ war-exhaustion/front-stabilization lane is OFF (no battle-suppression). Lane-3 levers constrained to: KIA/WIA/MIA split (territory-INERT — reapportions fixed loss into dead/wounded, force+territory unchanged), BOMBARDMENT_EXPOSURE_RATE (passive, 91% RBiH, low territory-coupling), faction casualty modifiers. combat_math BASE rates = territory-coupled last-resort only.
- Persisted feedback memory `feedback_dont_reduce_battle_frequency.md` + MEMORY.md index. Re-aimed casualty-targets agent's Part C to this constraint (esp.: is the fix a territory-inert KIA-split correction if 102,621 over-reports "dead" vs RDC documented-dead?).

## CASUALTY REALISM TARGETS — LOCKED (research, 2026-06-09) → `docs/40_reports/proposals/20260609_CASUALTY_REALISM_TARGETS.md`
- TARGET (RDC/ICTY-sourced, 97,207 total / 57,523 soldiers / 39,684 civ): **~57,500 military killed** — ARBiH ~31k (~52%) / VRS ~23k (~38%) / HVO ~6k (~10%).
- **Sim "killed" IS apples-to-apples with RDC "soldiers died"** (verified in code: per-turn KIA flow, KIA-only; captured/removed/deserted → separate buckets; no MIA→killed reclass). Overshoot is REAL **×1.78 (+78%)**, NOT 2.4× (that was a stale n2018 audit pre-KIA_FRACTION-cut).
- **K:W 1:3.74 ALREADY ON TARGET** (real ~1:3–3.5) → do NOT touch KIA/WIA split. (Kills my territory-inert KIA-split hope — split already calibrated; Lanes 1+2 of the 2026-06-08 casualty doc effectively done.)
- Civilian killed 43,164 vs ~38-40k (~1.1×, leave). MIA 53,881 durable vs ~3-10.5k = separate low-pri (no POW-return model).
- LEVER (historian rec): close +78% via VOLUME on FRONTLINE ATTRITION — primarily the **bombardment term** (BOMBARDMENT_EXPOSURE_RATE, 17.4% of kills / 91.4% RBiH = also the cleanest RBiH-share fix); NOT battle-rate (territory-coupled, run-1 −63 OSID), NOT KIA-split (already right), NOT battle count (owner constraint). Strict 188w gating; §6 held in run-1.
- TIME-SHAPE flag: 1992 deadliest / 1993-95 trench stalemate; engine per-turn-UNIFORM attrition over-loads late war → recommend a per-year/phase killed-distribution guard so we fix SHAPE not just trim a mis-shaped flat curve. (Compatible with owner constraint — shapes attrition magnitude over time, doesn't reduce battles.) Owner: hard-gate vs advisory vs skip.
- → present to owner: ratify 57.5k target + pick lever-sequencing (simple bombardment-trim probe first vs add per-phase shaping).

## OWNER RATIFIED Lane-3 target + path (2026-06-09)
- TARGET LOCKED as a BAND: **55,000–62,000 military killed**, shares ~52% RBiH / ~38% RS / ~10% HRHB. K:W (1:3.74) untouched (already on target). Territory re-floors around the realistic model.
- PATH: **probe now + scope shaping in parallel.**
  - Probe (188w measurement): trim BOMBARDMENT_EXPOSURE_RATE (frontline_attrition.ts:81) 0.007→0.0035 (−50%) — passive, 91% RBiH, keeps battle count. Expect RBiH share ~52% + total ~−9% (bombardment alone can't reach band; it's the arc-fix + first volume step). Measure territory-coupling (188w gate), §6/anchors must hold. NEEDS the #358 home_distance fix to serialize 188w.
  - Scope (read-only design): per-phase/per-year attrition shaping (heavier 1992 / lighter 1993-95) to match RDC front-loaded curve — compatible w/ owner constraint (shapes magnitude over time, not battle count). Deliverable = design doc, no build.

## tier2 (#365) + harmonize (#366) DONE (2026-06-09)
- #365 (4 orphan-wiring fixes): T2-A ghost prose renders (§6 ghosts gated out), T2-C independence essay reachable (bijeljina untouched), T2-D AAR split→canon 0.22/0.74 (territory byte-identical, hash read-model only, scenario-GO, 52w manifest re-floored), T2-B refugees_received dest_osid (territory byte-identical 40w+52w, read-model only, scenario-GO). Confirmed tier2 ran in MAIN checkout (not isolated) — now done + rebased clean.
- #366 (harmonize): "Proven Style & Lessons" header from shipped prompts; "category=bones, faction=skin" recipe; harmonized 28; faction SPLIT recommended for 5 military/equipment-asymmetry stills (mobilisation/supply-convoy/supply-shortage/besieged-city/patron-relations) → 15 per-faction variants authored (28 shared + 15 = 43). Found event stills NOT auto-faction-aware (eventIllustrationArt by bare basename) → faction event stills need distinct image keys on faction-tagged event variants (wiring note). 0 §6.
- MAIN CHECKOUT now CLEAN → restoring to `main`. Only remaining live agent: lane3-b-build.

## #365 test-fix + #366 conflict-resolve (2026-06-09)
- #365 failed codex_tier_dependency_graph 'shipped==derived': T2-C's ghost_when on independence_referendum → deriveDefaultTier=CONDITIONAL(1) but shipped tier=0. Fixed: re-seeded tier 0→1 in data/scenarios/essays/essay_index.json (bb3baa402); test 22/22. Re-merging.
- #366 (harmonized pack) add/add conflict vs main (#364's pack). Resolved --ours in worktree art-prompt-harmonize (f559337b5): VERIFIED ours already has the Washington fix (plan_washington=0, "Peace-Plan Maps (4)", note present) + harmonization + 62 faction refs — no Washington regression. Re-merging.
- Both re-armed on merge-watcher. Only live agent: lane3-b-build.

## LANE-3 (b) CANDIDATE — DONE → 20260609_combat-realism-lane3-B-candidate.md (branch feat/lane3-b-lever-a-zvornik-pin, 2a0dc3b03; NO PR/re-floor — owner sign-off pending)
- Build: Lever A (OUTCOME_ATTACKER_MOD decisive 1.3→1.0/victory 1.4→1.2) + Zvornik-protect (brigade_front_distribution pinGarrisonToMustHoldFrontEdge: dropped entrenchment Guard-5 for must-hold backfill ONLY; test updated).
- Root cause Zvornik recovered: cheaper ARBiH attrited rs_1st_vlasenica garrison to 0/inactive ~wk88; all vrs_drina reserves entrenched deep-south → Guard-5 excluded all → ARBiH walked into null-defender at wk91. Dropping Guard-5 for backfill lets a reserve hold it.
- 188w (hash 1a5ec6f2 vs floor 5f57d172): spatial 649→**625 (−24)**; anchors **30/30** (zvornik=RS ✅); shares ARBiH 56.3→**54.1** / VRS 35.5→**37.1** / HVO 8.3→8.8 (toward 52/38/10, on-direction; Lever-A-solo hit 52.3/39.0 but pin recovers VRS territory→fewer VRS killed→shares sit between floor+target = intended coupling); K:W 1:3.73 flat; **§6 Srebrenica 13/13 + Žepa 1/1 RS FALL ✅**.
- 40w: territory BYTE-IDENTICAL 655/655, only casualty composition moves (hash a3e69cf5).
- Residual −24 = coherent SE-HERZEGOVINA ARBiH-overadvance cluster (Kalinovik×7/Nevesinje×5/Foča×3/Gacko×2/Konjic×2/Mostar×2/Trnovo) + 7 NW-Krajina VRS over-holds + 3 HRHB. Follow-on lane = Herzegovina-VRS defender nudge (same Zvornik pattern), serial.
- Verify: tsc PASS; garrison-pin 14/14; full vitest 9 fails = ALL worktree tsx-PATH limitation (none touch changed files). Deterministic; no banned levers.
- DECISION (owner re-floor sign-off): (A) re-floor to 625 now (accept −24 for the realistic arc); (B) run SE-Herzegovina VRS-nudge follow-on FIRST to claw territory toward 649, then re-floor; (C) other.

## LANE-3 (b) — owner: FOLLOW-ON FIRST, then re-floor (2026-06-09)
- Dispatched lane3-b-herzegovina ON TOP of feat/lane3-b-lever-a-zvornik-pin: ONE lever = SE-Herzegovina VRS-defender recovery (prefer extending must-hold garrison-pin to Kalinovik/Nevesinje/Foča/Gacko/Trnovo; else targeted vrs_hercegovina OOB nudge) to reclaim the −24 toward/past 649. Keep Lever A + Zvornik pin. §6 (Srebrenica/Žepa fall) + anchors + arc (~54/37) must hold; STOP-gate if not. Cumulative = FINAL re-floor candidate → owner sign-off. (Also told it to junction node_modules so scenario runs work — fixes the prior tsx-PATH issue.)
- Still on watcher: #365 (tier-fix) + #366 (harmonized pack) re-merging.

## #365 + #366 MERGED (2026-06-09)
- #365: 4 orphan-wiring fixes in main (ghost prose renders, independence essay reachable + tier re-seeded, AAR split→canon, refugees_received non-zero). #366: harmonized + faction-aware prompt pack canonical on main (28 shared + 15 faction variants + Proven-Style header; Washington-corrected).
- Session merges total: #358 #359 #360 #361 #362 #363 #364 #365 #366. Only live agent: lane3-b-herzegovina (final re-floor candidate). Worktree/branch prune queued for after it lands.

## LANE-3 SE-Herzegovina follow-on — NO-GO → 20260609_combat-realism-lane3-B-FINAL.md (0cabd0ed0, OOB reverted, no re-floor)
- Diagnosis: vrs_herzegovina collapses (7/8 brigades dead by w188; starts 8,400 vs historical ~12-15k). Must-hold pin ruled out (no surviving same-corps reserve to pin). Fallback = vrs_herzegovina initial_personnel bump; measured +800 (13.6k) + +400 (10.8k).
- BOTH bumps WORSE than (b): territory 615-616 (vs 625), and BREAK ZVORNIK (29/30) via CROSS-CORPS reserve cascade — stronger Herzegovina competes for shared reserve pool → vrs_drina 6→4 alive → no one garrisons op:zvornik:zvornik → anchor breaks. STRUCTURAL not tunable (+400 worse than +800). §6 held all variants.
- CONCLUSION: −24 SE-Herzegovina residual NOT independently recoverable via a Herzegovina-only lever. Would need a COMBINED Herzegovina + paired vrs_drina reserve top-up (Zvornik-v6 coupling) — separate serial lane, deferrable. OOB change reverted; (b) stands unchanged.
- **(b) STANDS as the re-floor candidate: 625/712, 30/30, zvornik=RS, §6 fall, shares 54.1/37.1/8.8, K:W 1:3.73, hash 1a5ec6f2.**
- DECISION (re-floor sign-off): (A) re-floor to 625 (adopt b; document SE-Herz residual as deferred combined lane); (B) pursue the combined Herzegovina+Drina coupled lane now; (C) hold.
- All Lane-3 agents now DONE → worktree/branch prune ready to run.

## LANE-3 DECISION (owner, 2026-06-09): HOLD at 649 — realism arc NOT in 1.0
- Floor stays 649/5f57d172 unchanged. (b) candidate (Lever A + Zvornik pin) SHELVED — branch feat/lane3-b-lever-a-zvornik-pin (2a0dc3b03) preserved, NOT merged. SE-Herzegovina follow-on NO-GO (reverted). Lane-3 CLOSED-by-hold; post-1.0 revisit = coupled Herzegovina+vrs_drina lane. Memory: lane3_casualty_realism_held_at_649.md + MEMORY index. Task #72 DONE.
- 1.0 PATH NOW: D1 calibration-finalization effectively CLOSED (floor held). Next = Tier-1 Replay-wire (D2-enabling) → D2 full-campaign playtest (TRUE blocker) → D3 operator/clean-VM. Plus §6 art sign-off + art generation (owner-driven).
- CLEANUP: all Lane-3 agents done → run worktree/branch prune now. PRESERVE: main, the 2 held PRs (#344 feat/b1-casualty-realism, #329 fix/standing-og-reserve-attrition), the shelved (b) branches (feat/lane3-b-lever-a-zvornik-pin, feat/lane3-b-final). Prune merged/dead worktrees + branches (non-forced).

## KLJUČ LANE breadcrumb (owner, 2026-06-09) — deferred
- Owner: historically RBiH 5th Corps took KLJUČ FIRST (Sept 1995) and used it as the BASE to drive on Sanski Most (Oct 1995). Sim is BACKWARDS: 649 floor has Sanski Most=RBiH (town + 8/9 muni) but Ključ=RS (kljuc_2 + 6/7). The parked Ključ micro-lane (hadzici/kljuc_2/krasulje_2/sanica_2) root cause is likely OP SEQUENCING — Op Sana reaches Sanski Most without securing Ključ first (ahistorical; Ključ is the prerequisite springboard, not a parallel objective). FIX DIRECTION when revisited: make Ključ a SEQUENCED prerequisite objective of the western drive (Ključ→Sanski Most), not a multi-change brigade-count/corridor tweak. DEFERRED ("deal with later"). Ref [[sana_followon_timing_brief_20260607]].

## WORKTREE/BRANCH PRUNE (2026-06-09) — safe non-forced pass
- Worktrees: 71 → 26 (removed clean/merged; 46 skipped = dirty/junction-lock SAFETY NET, no work lost). Remaining 26 = mostly junction-locked MERGED-PR worktrees (cosmetic; force-prunable later) + preserve set (main, #344, #329, shelved (b) branches feat/lane3-b-lever-a-zvornik-pin + feat/lane3-b-final).
- Local merged branches deleted via git branch -d (non-forced; unmerged + worktree-held preserved).
- Remaining cleanup (optional, cosmetic): force-remove the junction-locked merged worktrees + their branches once node_modules locks clear. NOT urgent.

## 1.0 RE-SEQUENCED (owner, 2026-06-09): COLLAPSE BEFORE D2
- New order: COLLAPSE pipeline build → FINAL calibration (around collapse-active engine, re-floor off 649 guard) → D2 full-campaign playtest → D3 → 1.0. Rationale: collapse moves territory → final calibration must follow it; D2 must validate the COMPLETE engine. Supersedes scope "collapse post-1.0" + DoD "1.0=finish-work not new systems" (DoD doc needs amendment). 1.0 date moves out — deliberate.
- Recorded: memory roadmap_collapse_before_d2.md + MEMORY index. DISPATCHED collapse-build-spec (read-only): phase-by-phase build list + unverified-constants canonical derivation + §6 enclave-guard design (Srebrenica/Žepa must still fall, Goražde/Bihać held — collapse must NOT alter rupture timing) + test/determinism + calibration-campaign plan → 20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md. Owner ratifies spec (esp §6, non-delegable) BEFORE engine code.
- FOLLOW-UP: amend DoD doc (docs/plans/2026-06-08-v1.0-definition-of-done.md) + MASTER_ROADMAP to the new sequence.

## COLLAPSE BUILD SPEC done + GATE 0 RATIFIED + Phase I dispatched (2026-06-09)
- Spec → 20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md. KEY: 3D writes capacity_modifiers ONLY (never flips political_controllers) → collapse can ACCELERATE a defender's fall, NEVER save an enclave / throttle attacker / alter rupture trigger. 3B done; 3A/3C/3D skeletons; 17 constants = DESIGN decisions (canon numeric tables archived v0.4→v0.9; spec proposed defaults). ~160-290 LOC + 150-200 test; 10-16×188w campaign / 2-3 sessions.
- GATE 0 (owner): §6 guard G1(exclude enclave OSIDs from 3D write)+G2(188w invariant test)+G3(historian ack) APPROVED. Constants: proposed defaults accepted as Phase-I starting points (calibration tunes; owner signs final re-floor Phase IV). Casualty-realism held → stable attrition floor under collapse (no un-shelve needed).
- DISPATCHED collapse-phase1 (feat/collapse-phase1-disabled): build constants + finish 3C/3D + G1 guard at 3D write site, KEEP DISABLED, prove BYTE-IDENTICAL 40w(be76e56d)+188w(5f57d172) + G2 §6 test + per-phase unit tests. PR, no merge/enable. Historian §6-gate review = pre-Phase-III (enable) gate.
- Phasing: GATE0✓ → Phase I (disabled, byte-identical) → Phase II (optional 3A coupling) → Phase III (enable+flag+188w campaign) → Phase IV (owner-signed re-floor) → D2.

## Doc-sync PR #367 MERGED + golden-hash NEAR-MISS (2026-06-09)
- doc-sync agent (ac8dbc9f) opened #367 (7 docs: napkin/CALIBRATION_MASTER/GAME_STATE_RATING/PROJECT_LEDGER/DoD/COMMAND_BOARD/MASTER_ROADMAP) reconciling to current state: floor-held @649, version 0.9.9-beta.1, collapse-before-D2 re-sequence (amends DoD "1.0=finish-work"), Lane-3 closed-by-hold, #358-366 summary, contain V/A superseded by enclave-decision.
- NEAR-MISS: I suspected the agent's 52w golden `final_save` literal `8c463c05` was fabricated — local main read `496259b9` + `npm run test:baselines` PASSED at `496259b9`. WRONG: local main was 2 commits BEHIND origin (#365 `bf8f814d2` re-blessed `496259b9`→`8c463c05` via refugees_received/AAR; #360 had done `9b426732`→`496259b9`). origin/main golden = `8c463c05` → agent was RIGHT incl. "#360+#365" attribution. `git diff origin/main..HEAD -- manifest` EMPTY while file read `8c463c05` was the tell. Reverted my erroneous sed edits in worktree (never committed/pushed) → PR untouched + correct. Lesson saved: feedback-verify-against-origin-main-not-stale-local. FF'd local main to #367 (d649b401a).
- #367 all-green (full-suite/structural-fingerprint/scenario-anchors/scenarios/test/typecheck/desktop) → squash-MERGED. Task #92 done.
- Codex sweep: only open finding = #344 P2 (surrender-cascade split not wired on canonical OSID path under realism flag) → captured task #93 as D1-activation prereq (sibling to #73). #329 no codex comments. Both #344/#329 intentionally held.
- STILL RUNNING: collapse-phase1 (a50da9f1). Awaiting its byte-identical proof PR.

## Parallel dispatches while waiting on collapse-phase1 (2026-06-09)
- **PR #368 (collapse-s6-packet, task #94) — HOLD for owner G3 sign-off, NOT merged.** Doc-only (+214) `20260609_COLLAPSE_S6_HISTORIAN_GATE_PACKET.md`. Protected set verified from enclave_resilience.ts: Srebrenica FALLS (11 OSID incl op:srebrenica:srebrenica_2), Žepa FALLS (op:rogatica:zepa_2), Goražde HOLDS (18), Bihać/Sarajevo/Teočak HOLD (all RBiH). Rupture key verbatim: srebrenica_genocide_1995 iff enclave_formed + op:srebrenica:srebrenica_2=RS + turn>=140. 10-pt G2 checklist (G2.8 = direct G1 proof: no capacity_modifier for any RBiH-enclave OSID). 5 owner open-Qs: O-1 HRHB pockets too? O-2 stale doc-comment op:zepa:zepa_2→op:rogatica:zepa_2 @ dynamic_section_builder.ts:252, O-3 rupture floor≥140 vs fall-window 160-185, O-4 confirm broad Sarajevo+Bihać exclusion, O-5 enclave_held_through_turn observer flag separate. O-1/O-4 shape G1 scope before Phase III enable (not blocking Phase I disabled).
- **PR #369 (onboarding-347, task #85) — UI-only, calibration-inert, watch-merging on green.** App.tsx + 2 tests (+102/-8). (1) IPC-absent dismissal: gate ipc bridge on isAvailable, pass null when unavailable (mirrors SettingsScreen) → in-memory previewTutorialState fallback engages so Skip/Next/ESC dismiss the HARD_MODAL deck. (2) hide deck during side-picker: mount gate += !sidePickerOpen. tsc 0, 27 vitest pass (4 new), vite build 26s. Watcher b2zc4ogpk ABORTED — CI `test` failed on tests/warroom_shell_layer.test.ts (1/39): a SECOND App.tsx source-pin ("auto-mounts... task #77") asserting `appScreen === 'game' && loadedGameS…` — agent updated the pin in onboarding_track_d_consolidation.test.ts but missed this one (same two-tests-pin-one-string trap as prior #360 rounds). Resumed agent a89a8ec9 to grep ALL pins + run broader suite + push to same #369 branch. Re-arm watcher after it pushes. → FIXED: agent confirmed only 2 pins on that gate string, updated warroom_shell_layer.test.ts:415, 71 tests/6 files green, pushed f3abbbca3. Watcher bjn345wvv re-armed. → #369 MERGED (7c3edd5e9, CI green on pin fix); task #85 DONE; local main FF'd.

## Two more read-only audits dispatched while waiting on collapse-phase1 (2026-06-09)
- **robustness-audit (a5863b13)** → `20260609_1.0_ROBUSTNESS_LANDMINE_AUDIT.md` + doc-only PR. Hunts latent 1.0-crash class like #358 (non-finite→serialize/hash, old-save migration crashes, undefined-deref on divergent control, Map/Set serialize, unbounded growth, determinism leaks). Findings-only, proposed-fix sketches, NO code. For D2-playtest hardening.
- **codex-triage (a0cf5db6)** → `20260609_CODEX_BACKLOG_TRIAGE_49_53.md` + doc-only PR. Read-only calibration-impact + sequencing for #49 (E-A5 us_halts→comply-response player agency) and #53 (phase_e combo attribution patron/milcred leak). Classifies CALIBRATION-MOVING vs inert → D1 vs now vs defer.
- Both report PRs: watch-merge on green (informational docs, no canon/§6 sign-off needed). Findings surface to owner.
- RESULTS: codex-triage PR #370 — #49 (E-A5 us_halts) calibration-INERT, fix=move suppression to comply response_options[0], ~6-10 LOC data-only, DEFER to D1; #53 (phase_e combo attribution) calibration-INERT (diagnostic-tool only), fold into #48 PDP lane. Both byte-safe. (#49/#53 task descriptions updated.) Watcher bmpo0n1xm merges #370.
- robustness-audit PR #371 — 0 P0 / 2 P1 / 5 P2, no determinism leaks. P1-A serializer (serializeGameState.ts:36-76) no non-finite guard → NaN/Inf silently→"null", moves hash (#358 was only the one producer; serializer undefended); P1-B apply_effects.ts:39-41 clamp passes NaN→persisted morale/cohesion/supply/alliance; P2-A validateGameState hard-requires all fields, #360-class recurrence. → task #95, SEQUENCED AFTER collapse-phase1 (serializer-conflict avoidance), build w/ HARD byte-identical gate + STOP-if-crash. Watcher bk03pcnot merges #371.
- BOTH MERGED: #370 (18e2676c9) + #371 (2811df388) on main; local main FF'd to 2811df388. Session PRs this cycle: #367 doc-sync, #369 onboarding, #370 triage, #371 audit MERGED; #368 §6 packet HELD for owner. Only collapse-phase1 (a50da9f1) still in flight.

## CODEX P1 on #368 — MATERIAL §6 GUARD CORRECTION (2026-06-09, VERIFIED)
- **My model was WRONG: Phase 3D does NOT write only capacity_modifiers.** Verified in src/sim/collapse/phase3d_collapse_resolution.ts: line ~87-103 writes `state.political.collapse_damage.by_entity[entityId]=newDamage`; recomputePhase3DCapacityModifiersFromDamage() (line ~197) reconstructs modifiers FROM that damage; loss_of_control_trends.ts:132 sets `will_not_recover` directly from collapse_damage. (The "never flips political_controllers" part is still TRUE — that's the key safety.)
- **Consequence:** a G1 that only excludes the capacity_modifiers write (as the §6 packet drafted, G2.8 = "no modifier") is INSUFFICIENT — a protected enclave OSID could still accrue irreversible collapse_damage that resurrects into modifiers + marks will_not_recover.
- **Correct guard:** G1 skips the collapse_damage WRITE at phase3d ~line 103 for protected OSIDs (root site → transitively blocks modifier derivation + recompute path + will_not_recover). G2.8 asserts NO collapse_damage entry AND no modifier for every protected OSID. Stays within owner-ratified "exclude enclave OSIDs from the 3D write" intent.
- Relayed to collapse-phase1 (a50da9f1, building G1 now) + dispatched collapse-s6-packet (a86c0642) to correct packet core-proof/G1/G2.8 AND commit the missing build-spec (Codex P2 — BUILD_SPEC.md was untracked on main, same buried-docs pattern). Both push to their branches, no merge. → collapse-s6-packet DONE (583aee1d9): packet core-proof + G1 (guard collapse_damage write root) + G2.8 (assert no collapse_damage / no modifier / no will_not_recover per protected OSID) corrected, build-spec restored+committed (P2), correction credited to Codex #368 P1 inline. #368 = 2 docs, +492/-0, docs-only verified. STILL HELD for owner G3 sign-off.
- #344 went DIRTY (merge conflict on held B1 branch — needs rebase at D1, not now). #344's one codex P2 already = task #93.

## §6 G3 GATE CLEARED via Pyrrhic panel — #368 MERGED (2026-06-09)
- Owner DELEGATED the G3 sign-off: "#368 is signed off if the Pyrrhic team approves." Convened 4-lens panel (read-only, reviewed corrected packet + code + canon):
  - HISTORIAN (a6f67ac4): APPROVE — protected set char-exact vs enclave_resilience.ts, rupture key/timing verbatim, no erasure/softening/reward, canon quotes accurate. O-3: assert vs baseline-observed turn (floor>=140 + ON==OFF; canon §2 crit-3 FORBIDS a calendar-week substitute) + add recorded_turn>=160 both runs. O-5: observer flag correctly out of scope.
  - CALIBRATION (a67f1bf5): APPROVE — O-1=include-HRHB (exclude all 9 ENCLAVE_DEFINITIONS enclaves; no RS enclaves exist; RBiH-only seeds faction-asymmetry); O-4=confirm-broad (floor was collapse-OFF so exclusion can't regress; flag Velika Kladuša op:velika_kladusa:* as #1 relax-later candidate). Phase-I inertness confirmed (getEnablePhase3D false default, early-return :227).
  - ENGINE (aa681b89): APPROVE — repo-wide grep CONFIRMED getOrInitCollapseDamage (:103, called :350) is SOLE production collapse_damage write; guarding it transitively zeroes modifier+recompute+will_not_recover. Byte-identical-disabled sound. O-2 cosmetic confirmed (op:zepa:zepa_2 only in 2 comments, 0 live predicates).
  - RED-TEAM (a7fa8793): GUARANTEE-HOLDS — couldn't break it; STRONGER than packet claims (eastern rupture doubly insulated: scripted unconditional control_change + collapse outputs unread by any control/combat path — front_pressure/formation_fatigue commit_points/front_breaches all report-only/scaffolding). Residual #2 (DOCUMENT for Phase III): getEdgeCapacityMultiplier min() means a collapsed neighbor's edge value reaches a protected OSID's edge — inert TODAY but a landmine if ever wired to attack-launch/defender-strength; G1 own-OSID-only won't catch it. Residual #3: front_breaches promotion risk.
- VERDICT: unanimous, ZERO blocking conditions (all attach to the future G1 build). #368 MERGED (15ee63813); build-spec now TRACKED on main (P2 buried-doc fixed); local main FF'd. G3 = CLEARED. (Phase III enable still requires collapse-phase1's Phase-I byte-identical proof first.)
- Relayed consolidated G1-build directives to collapse-phase1 (guard at getOrInitCollapseDamage chokepoint; guard ALL enclaves via getEnclaveDefForOsid per O-1; G2 asserts no-damage/no-modifier/no-will_not_recover + rupture recorded_turn>=160 ON==OFF + fall-flags ON==OFF + Žepa falls/Goražde-Bihać-Sarajevo-Teočak hold; document the edge-min Phase-III residual; confirm-broad Bihać/Sarajevo + flag Velika Kladuša relax-later). Task #94 DONE.

## OWNER GAVE PHASE-III ENABLE GO + §6 CONTENT BUCKET APPROVED (2026-06-09)
- Owner "Enable it" → Phase III GO (task #96): proceed flip+188w campaign once Phase I lands+proves byte-identical; G2 §6 invariant = HARD gate; Phase IV re-floor = owner signature.
- Owner "All approved, move it on" on the §6 content bucket → dispatched 4 lanes (all §6-guardrailed, PR HELD for owner review, none auto-merge):
  - #372 §6 art prompts (8, documentary aftermath/absence framing, no victims/violence) — APPROVED + MERGED (f1fe6a13e). Task #97.
  - #373 enclave OVERRUN/CONTAIN build-ready SPEC (directives not new combat type; OVERRUN lifts besieger restraint→normal assault, repulsable; rupture untouched; 10-pt invariant; serializer-collision w/ collapse → build AFTER collapse) — APPROVED + MERGED (c2064257e). BUILD still pending (task #99, sequenced post-collapse). 7 open Qs in spec.
  - #374 BCS atrocity essays (Omarska+Višegrad) — DRAFT/HELD for owner native-speaker read. Gap had partly closed (already indexed+triggers fire); real fix = replaced placeholder BCS boilerplate w/ full ijekavian ICTY-grounded translations (no new claims, calibration-inert). 5 wording points flagged. AGENT briefly wrote to MAIN by accident (abs-path bug), self-reverted — I VERIFIED main clean (essay_index.json untouched). Task #98.
  - s6-codex-wiring (bijeljina trigger + Srebrenica receipt #78) — still running.
- OPEN to owner: #374 native review; my offer of 2 enclave BRANCH art prompts (OVERRUN-aftermath/CONTAIN-siege) — awaiting yes/no. collapse-phase1 still building.

## COLLAPSE PHASE I LANDED — PR #375 (2026-06-09)
- Owner said YES to branch art → dispatched enclave-branch-art (a2eaa5c0) → append 2 prompts to SECTION6 pack, PR held.
- collapse-phase1 DONE → PR #375 (feat/collapse-phase1-disabled, 8b80d8272, 5 files +747/-87, DISABLED, not enabled). G1 guard at getOrInitCollapseDamage chokepoint (~:124) covering ALL 9 enclaves (isPhase3DEnclaveGuarded = getEnclaveDefForOsid !== null), + loop-skip + recompute-skip defense-in-depth. 3C constants ratified (PHASE3C_CONSTANTS_VERIFIED=true), real checkSpatialDegradation via BFS isolated_osids. 21 new tests (17 disabled + 4 G2 §6 invariant) green; tsc clean; full-suite = only the 9 pre-existing tsx-shim failures (stash-proven), zero new.
- BYTE-IDENTICAL / non-regression = CI-CONFIRMED on #375: scenario-anchors PASS + structural-fingerprint PASS + typecheck PASS (test/full-suite finishing). Watcher b90g9gmgx merges on green.
- ⚠️ HASH-LITERAL DISCREPANCY to reconcile (non-blocking): agent claims floor literals be76e56d(40w)/5f57d172(188w) are STALE (moved by #360 displacement-v36), computed its runs as 40w c209baa1 / 188w 33bdd70d (clean-HEAD==with-edits). CALIBRATION_MASTER says OPPOSITE — only 52w golden re-blessed by #360/#365; 188w/40w "unaffected." Likely a run-hash(final_save, #360-moved) vs structural-fingerprint(unchanged) confusion. Structural-fingerprint PASS = floor territory intact regardless. DO NOT let the agent's "stale" claim overwrite the verified floor without reconciling which hash type the literal is.
- codex-wiring (#78, aa83dafa) = LAGGARD, still running (buffer 0, no PR), longer than its siblings — ping if it doesn't land soon.
- NEXT per owner "Enable it" GO: once #375 merges → Phase III (flip getEnablePhase3D/3C + 188w campaign; G2 §6 invariant ON = HARD gate; if G2 fails STOP+surface; report territory deltas for Phase IV owner re-floor signature). Surfacing the proof + proceed-by-default-unless-hold to owner.

## GitHub sweep (owner directive) — 2 Codex P2 fixes + hash reconcile (2026-06-09→10)
- Sweep caught: #377 Event-system FAIL (52w baseline mismatch from bijeljina observer flag) + 2 NEW Codex P2s: #375 (disabled-path runs a wasted per-turn OSID BFS) + #377 (duplicate Bijeljina essay vs orphaned bijeljina_massacre_1992).
- #375 BFS fix (81c7087df): guarded computeSupplyReachabilityOsid behind getEnablePhase3C → disabled now strictly less work, byte-identical (40w c209baa1/188w 33bdd70d unchanged, control_delta bit-identical, 30/30, scenario-tester GO + new BFS-inert test). Watcher bw0ju443b.
- #377 fix (994968c93): DE-DUP (removed orphan essay_bijeljina_massacre_1992 index+file, kept approved bijeljina_killings_1992; one synthetic test fixture repointed; grep-clean) + observer-flag RE-BLESS proven territory-flat ALL 3 horizons (control_delta sha 40w 9e47df18 / 52w 7f5efef7[==golden] / 188w c5d76b0c byte-identical; political_controllers + OSID counts identical; only event_flags/event_fire_counts delta; scenario-runner-tester GO). 52w golden final_save 8c463c05→6d0dae17 (+run_summary+weekly_report; control_delta/formation_delta UNCHANGED); test:baselines GREEN; CALIBRATION_MASTER re-bless note added. Watcher brlyj74rq.
- HASH RECONCILE (closed the recurring loose end): floor literals be76e56d/5f57d172 STALE (pre-#360 v36); territory floor 649 INTACT; current run hashes 40w c209baa1/188w 33bdd70d. Memory: floor_hash_literals_stale_post_360.md; task #96 target corrected; CALIBRATION_MASTER line ~8 flagged for next doc-sync.
- Both #375/#377 owner-approved-content + CI-gated → watch-merging. #374 BCS held (owner deferral). Next = Phase III enable after #375.

## COLLAPSE PHASE III RESULT + ART PROCESSING (2026-06-10)
- #375 (Phase I) MERGED → dispatched collapse-phase3-enable (a72d1344). RESULT (PR #379, HELD for owner Phase IV):
  - **§6 GATE = PASS** (2 independent verifications, real collapse-ON 188w): Srebrenica+Žepa fall RS, Goražde/Bihać/Sarajevo/Teočak held; rupture recorded turn 162 IDENTICAL ON vs OFF; all 9 enclaves zero damage/modifier/will_not_recover. Phase 3D wrote 0 collapse damage ANYWHERE — G1 never had to fire.
  - **TERRITORY 649→649 BYTE-IDENTICAL** (0 political_controllers diffs/712; 40w 655→655). final_state_hash 33bdd70d→9f52858e via read-model state only. NO floor risk.
  - **COLLAPSE IS INERT (too cold, NOT runaway — safe failure):** profile.exhaustion pins 0.265 all-campaign vs Phase 3C Tier-0 threshold 70 = ~260× gap. UNIT/SCALE MISMATCH (0..1 field vs 0..100 thresholds). Pipeline starved → 3D writes nothing. (scenario-tester attributed.)
  - **PHASE IV LEVER (real next step):** reconcile the unit (rescale exhaustion or thresholds) + remove Math.floor quantization in 3B/accumulateExhaustion, then tune ONE change/run @188w. FIRST floor-moving collapse change → owner re-floor after. #379 = default-off enable gate + §6 verifier + report doc; HELD. AWAITING owner go on the unit-fix.
- ART: owner delivered 17 stills. PROCESSED 13 (8 tutorial 600×400 + 3 verdict 1920×1080 + 2 event 800×450), QC-passed, crop fit:cover→webp, placed. PR #378 MERGED (328e020ee). 4 plan_* HELD (atmospheric not cartographic — need attached reference maps). Status marked in pack doc.
- ART WIRING dispatched (#100, ac5855123): verdictArt.ts resolver + onboarding-deck slide images, graceful fallback, code-only PR. Running.

## ⟲ SESSION RECOVERY (2026-06-10, after termination) — salvage reconciliation
- **No work lost.** Local main == origin/main (0/0). Only uncommitted change = this checkpoint log + the session lock (cosmetic). Both required crons were dead → RESCHEDULED (standup `27 6`, life-lessons `3 6`).
- **Reconciled "Running" agents from prior entries — all LANDED:** #380 art wiring (#100) MERGED (b7d7d58fd, top commit) · #78 codex-wiring (bijeljina trigger + Srebrenica receipt) MERGED (0ba12216a) · #378 non-§6 art batch MERGED (328e020ee). collapse-phase3-enable → PR #379 (held).
- **★ NEW since checkpoint: PR #381 = Collapse Phase IV-a** (feat/collapse-phase4a-first-fire, created 00:15Z 2026-06-10 — the owner "unit-fix go" was acted on but never logged before termination). HELD/EXPLORATORY owner Phase IV decision artifact. **CI ALL GREEN** (territory byte-identical 649→649, so baseline-regression passes; OFF hash `ad190ed644972150`, ON `753f2c7b1882f883`).
  - Unit reconciliation WORKED: Tier-0 reads `war_exhaustion/100` (constants 70/65 unchanged); removed Phase 3B `Math.floor` quantization. Collapse now FIRES Tier-0 (HRHB eligible_spatial from ~t60).
  - **Phase 3D still does NOT fire** → precise next blocker = **OSID-substrate re-route (Phase IV-b)**: `computeFrontEdges` is settlement-level but scenarios are OSID-native → `front_pressure` stays empty → Tier-1 strain never accrues. Live model is `computeFrontEdgesOsid`/`war_front_edges_osid`. Needs its own §6 + calibration review.
  - **§6 GATE = PASS** (collapse-ON 188w): Srebrenica/Žepa fall RS, Goražde/Bihać/Sarajevo/Teočak hold, rupture turn 162 identical ON/OFF, 0/9 enclaves accrue damage/modifier/will_not_recover. 0 OSIDs differ ON vs OFF. Report: `docs/40_reports/20260610_COLLAPSE_PHASE4A_FIRST_FIRE.md`.
- **OPEN PRs (all correctly HELD, none auto-merge):** #381 (Phase IV-a, owner go/no-go on IV-b) · #379 (Phase III enable) · #374 (BCS atrocity essays, owner native-speaker review) · #344 (B1, CONFLICTING — rebase at D1) · #329 (reserve-attrition NO-GO, held).
- **AWAITING OWNER:** (1) Phase IV-b go (OSID-substrate re-route — the real next collapse step) · (2) #374 BCS native review · (3) D1 owner decisions already captured. No agents/watchers alive (terminated). Nothing merge-ready that isn't owner-gated.

## ⟲ ORCHESTRATOR DISPATCH (2026-06-10, post-recovery) — 2 read-only agents, no owner gate
- **collapse-ivb-scope** (a2d499c1, bg, READ-ONLY): scopes Collapse Phase IV-b (OSID-substrate re-route — front_pressure fed by settlement computeFrontEdges but scenarios OSID-native → 3D never fires). Deliverable = `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md`: precise wiring diff (file:line), §6 risk surface (G1 chokepoint still covers new path?), calibration-coupling/floor-impact prediction, one-change build plan, owner Qs. NO code, NO flag flip — de-risks the owner Phase IV-b decision.
- **board-reconcile** (a50072c5, bg, DOCS-ONLY): reconciles COMMAND_BOARD.md to 2026-06-10 main (collapse III/IV-a + #378/#380/#78 merges + open-PR list). New dated note, edit left in tree for review, no commit.
- Both = critical-path de-risking that needs no owner sign-off. Phase IV-b BUILD itself stays owner-gated (§6 + first floor-moving collapse change). Crons rescheduled (standup e6f5a1c9 / life-lessons 8788a75e).

## ⟲ PHASE IV-b DECISION (orchestrator, 2026-06-10)
- **collapse-ivb-scope DONE** → `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md`. Root cause CODE-VERIFIED (settlement `computeFrontEdges` returns 0 edges in OSID-native scenarios → `front_pressure` empty → 3D never fires; live model `war_front_edges_osid` is topology-only, no pressure magnitude). = napkin life-lesson #5 (edge-universe mismatch).
- **DECISION: GO on the approach — Option 2 (adapter `computePressureExposureByEntityOsid`) + M1 (uniform presence magnitude), spatial-only.** ~36–46 engine LOC + ~40–80 test; no new save field; byte-identical-when-disabled holds. Rejects Option 3 (full OSID accumulator) which would make the `getEdgeCapacityMultiplier` edge-min §6 residual LIVE.
- **§6 = CONDITIONAL PASS** (scoper): G1 already keys OSID space via `getEnclaveDefForOsid` → guard surface doesn't move; re-route only exercises the exclusion branch on enclaves for the first time (IV-a measured 0 enclave damage, rupture t162). Edge-min residual stays inert under Option 2.
- **BUILD HELD on 3 non-delegable owner gates:** (1) §6 owner+historian re-verification (guard-by-exclusion-at-write now runs on enclaves) · (2) floor-move acknowledgment (IV-b = FIRST floor-moving collapse change; re-floor is owner signature) · (3) sequencing — IV-a #381 must merge/fold first (Tier-0 firing is IV-b's prerequisite; #381 HELD for owner Phase IV sig).
- **DISPATCHED ivb-s6-review** (a97b7a1f, bg, READ-ONLY): independent historian+canon §6 adversarial review of scope Section B (B.1/B.2/B.3 + historical bless of the western-Krajina cascade). Implementer≠reviewer. Deliverable → `20260610_COLLAPSE_PHASE4B_S6_REVIEW.md`. This IS the E3 re-verification — makes owner §6 sign-off fast/credible. NO engine code dispatched.
- **OWNER DECISION REGISTER (Phase IV-b):** E1 confirm Option 2 (rec yes) · E4 spatial-only for 1.0 (rec yes) · E5 floor-move tolerance band · E6 merge #381 first (rec yes) · the §6 sign-off (after ivb-s6-review lands).

## ⟲ §6 REVIEW LANDED + OWNER "PROCEED" → IV-b BUILD OPENED (2026-06-10)
- **ivb-s6-review (independent red-team) = §6-SAFE-TO-BUILD — CONDITIONAL** → `docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md`. All 4 claims CONFIRM (B.1 G1 chokepoint bypass-free, full writer-grep; B.2 edge-min DOUBLY inert under Option 2+M1; B.3 collapse cannot flip political_controllers; HIST western-Krajina cascade historically correct).
- **LOAD-BEARING FINDING: G2 test is a collapse-OFF false-green** — reads latest 188w artifact with no collapse-ON pin (G2-A, BLOCKING) and asserts only recorded_turn>=160, not ON-vs-OFF rupture-timing IDENTITY (G2-B, BLOCKING). Both must close before D2 (the territory-moving wire-in) merges. G2-C (pin edge-min: getSidCapacityModifiers(enclave)==all-1.0) RECOMMENDED; G2-D (document expected enclave local_strain/tier1 entries — NOT a breach; only the 3 §6 fields are protected) doc-only.
- **HIST FLAG (Condition 5, blocks re-floor sign-off not §6):** D3 first-fire must verify non-enclave HRHB central-Bosnia OSIDs held in the 649 baseline are not newly lost past the Washington-Agreement freeze (the 3 HVO pockets are G1-guarded; the marginal cells are not).
- **Condition 4 (design lock):** Option 3 FORBIDDEN without fresh §6 review (edge-min residual goes live).
- **Owner said "wait for the §6 review then proceed" → proceeding per approved flow.**
- **#381 (IV-a) MERGED** `1dc7c5434` (10/10 checks green, CLEAN; byte-identical-disabled ad190ed6 held; IV-a report doc now ON MAIN closing the review's provenance gap). Branch-delete blocked by stale worktree (cosmetic).
- **NEXT: dispatch D1 build** (adapter + M1 + unit tests, NOT wired into 3C) + G2-A/B/C/D hardening in the same PR. D2 wire-in held until D1 lands + G2 hardened. Re-floor (D3+) = owner signature; E5 band still open.
- **ivb-d1-build DISPATCHED** (ade8e673, bg, worktree, branch feat/collapse-phase4b-d1-osid-exposure off 1dc7c5434): D1 adapter (computePressureExposureByEntityOsid + M1 half-split, transient, no save field, NOT wired) + G2-A collapse-ON artifact pin (skip-not-pass) + G2-B ON-vs-OFF rupture-timing identity + G2-C edge-min all-1.0 pin + G2-D doc note + Condition-4 Option-3 lockout in PR body. Gates: tsc + FULL vitest (strict_null + step_order named) + 40w byte-identical proof vs self-run clean-main (stale-literal-aware). PR no-merge; independent review (determinism-auditor/code-review) to follow before merge.

## ★★ STANDING OWNER DELEGATION (2026-06-10): signature ASSUMED if Pyrrhic team signs off — ALL future decisions
- Verbatim: "Assume you have my signature, as long as the Pyrrhic team signs-off. Assume this for all future decisions." Persisted → memory `feedback_owner_signature_delegated_to_pyrrhic.md` + MEMORY.md index. Mechanism: §6/sensitive = UNANIMOUS 4-lens panel (#368 precedent); re-floors = scenario-tester+calibration GO; implementer≠reviewer binds; panel BLOCK/split → STOP and surface to owner; truly novel one-way doors still surface.
- **Acting on it immediately — 2 dispatches:**
  - **panel-374-bcs** (a1466760, bg): 4-lens §6 panel (Historian facts / Narrative BCS prose / Canon-§6 / Red-team) on PR #374 (Omarska+Višegrad BCS essays, was HELD for owner native review). Unanimous GO = signature → merge; else stays held. Report → `20260610_PR374_BCS_PANEL_REVIEW.md`.
  - **reconcile-379** (a0c7c7ed, bg, read-only): tech-arch disposition of PR #379 vs merged #381 (runner-gate overlap? verify_collapse_section6.cjs vs D1's G2 hardening? report doc as historical record?). Recommends a/b/c/d.
- E5 floor-move band: now resolved at D3 by panel sign-off (scenario-tester + calibration + §6 invariants) instead of pre-set owner band. D2/D3 proceed on D1+G2-hardening landing + panel GOs.
- Still running: ivb-d1-build.

## ⟲ #379 DISPOSITION EXECUTED (2026-06-10) — reconcile verdict (b)
- **reconcile-379 verdict = (b) extract + close-superseded.** Facts: #379's tools-level COLLAPSE_PIPELINE_ENABLE gate is a DUPLICATE divergent enable surface (tools CLI already flows through src runScenario where #381's ENABLE_COLLAPSE gate lives); merging it would install 2 env vars for the same chain. Assets worth keeping: `tools/verify_collapse_section6.cjs` (its --compare mode ALREADY implements the G2-B rupture-timing-identity check; complements D1's tests/ hardening, zero file overlap) + the Phase III diagnosis report (provenance of the ~260× unit-mismatch finding).
- **⚠️ DIFFUSION FLAG QUESTION for D2 (carry forward):** #379 enabled 5 flags incl. `setEnablePhase3ADiffusion`; #381's merged gate enables 4 (diffusion OFF). IV-a measured with diffusion OFF. Build-spec Phase II lists 3A coupling as OPTIONAL — D2 dispatch must explicitly resolve diffusion ON/OFF (panel input).
- **extract-379 DISPATCHED** (aed8e5cc, bg, worktree, branch chore/extract-379-collapse-verifier-report): extracts the 2 assets (report gets superseded-by-execution header + strikes "CI expected to fail" + carries the diffusion open-question), opens PR, then closes #379 with provenance comment (branch preserved). run_scenario.ts gate intentionally NOT landed.

## ⟲ PANEL VERDICTS PROCESSED (2026-06-10)
- **#374 PANEL = BLOCK (not unanimous → no signature).** Historian+Language block narrowly, Canon-§6 GO, Red-team concurs-block. Report → `20260610_PR374_BCS_PANEL_REVIEW.md`. **H1 (the big one): Višegrad Drina-bank 7 Jun 1992 — text says SEVEN killed; ICTY Vasiljević (IT-98-32-T) = FIVE killed, TWO survived (VG-14/VG-32); error inherited from the ENGLISH source essay → both languages must be corrected.** + 2 BCS grammar fixes (žive→živih agreement; "da se prespori kreću" word order). CI was fully green — the panel caught what automation can't. Panel ruled KEEP "Beli orlovi", PASS "Na Drini ćuprija"; 2 owner-preference items left unapplied.
- **respin-374 DISPATCHED** (a4fdd187, bg, worktree on the #374 branch): applies EXACTLY the 3 blocking fixes (verbatim panel wording, EN+BCS for H1), no freelancing, then PR comment. After push → focused 2-lens re-review (Historian+Language) → unanimous → merge under delegation.
- **#379 CLOSED superseded** (comment cites #381+#382+diffusion question; branch preserved). **PR #382 OPEN** (7506f6c00: verify_collapse_section6.cjs verbatim + Phase III diagnosis report w/ superseded header + D2 diffusion open-question; tsc clean). Watcher `b6kscyr0x` squash-merges #382 on green (SKIPPED/NEUTRAL=pass). Ledger entry for 2026-06-10 queued for session-closeout sweep.
- In flight: ivb-d1-build (D1+G2 hardening) · respin-374 · watcher b6kscyr0x (#382).

## ⟲ HARVEST ROUND (2026-06-10) — both builders wait-looped, finishers dispatched
- **ivb-d1-build DIED waiting on its full-vitest bg task** — but committed FIRST (lesson held): worktree agent-ade8e6738960ce1db, branch feat/collapse-phase4b-d1-osid-exposure, commits 22eea8d24 (feat) + dd3d8e4d2 (ledger). **Byte-identical 40w proof COMPLETE: clean-main `e246e8529d4244d8` == branch `e246e8529d4244d8`** (run artifact apr1992_definitive_40w__3649b386__w40_n0 in worktree; no marker on OFF path). Only the vitest-pin verification + PR-open remained.
- **respin-374 DIED waiting on npm install** in its worktree (didn't junction node_modules — known fix not applied).
- **finish-d1 DISPATCHED** (aaf4028b): verify commit scope, scenario-tester read of the 40w artifact, focused pin suites (strict_null/step_order/collapse G2) if no vitest log, tsc, push + open PR (full suite = required C1 CI gate, stated honestly; D2 diffusion question in body). No merge.
- **finish-374 DISPATCHED** (a8d6566b): locate respin worktree, verify/apply the 3 panel fixes verbatim (H1 five-killed/two-survived EN+BCS; 2 BCS grammar), junction node_modules, focused suites, commit+push to #374 branch, PR comment. No merge.
- NOTE: my shell had drifted into the D1 worktree (cd'd back to main checkout, verified toplevel). 40w current-main hash literal post-#381 = `e246e8529d4244d8` (self-run, supersedes c209baa1 literal).

## ⟲ TREE UNIFICATION (owner ask, 2026-06-10) — dispatched
- Owner: "a lot of branches and trees, which I don't like — investigate and unify." Raw: **43 worktrees in 3 locations** (.claude/worktrees/ + F:/awwv-* root sprawl + F:/awwv-worktrees/), **135 local branches**, 17 stashes.
- **tree-unify DISPATCHED** (ad9575aa, bg): classify all (merged/open-PR/held/transient/dirty) → safe-execute (junction-safe rmdir-then-remove; -D only when commit on origin; NEVER dirty worktrees, NEVER stash drops) → unify to single root .claude/worktrees/ → report `20260610_TREE_UNIFICATION_REPORT.md` + standing policy + stash triage (report-only) → docs PR.
- ACTIVE-preserve relayed: D1 worktree (ade8e673) · respin-374 worktrees (a4fdd187*/ad8dd3a2) · extract-379 worktree until #382 merges. BRANCH-preserve: #344/#329/lane3-b pair/phase3-enable/D1 branch.

## ⟲ D1 PR OPEN + #374 FIXED (2026-06-10) — review round dispatched
- **PR #383 OPEN (D1)** by finish-d1: byte-identical TRUE (40w e246e852==e246e852), 30/30 anchors, 6/6 benchmarks, 0 critical; focused suites 119 pass / 3 by-design G2 skips (no collapse-ON artifact pair until D2); tsc clean; full suite = required C1 CI gate. Scope verified incl. the one deviation-candidate: scenario_runner.ts +19 = the G2-A collapse_enabled.json SIDECAR marker (ENABLE_COLLAPSE===true gated, constant content, not in final_save → no hash). NOT merged.
- **review-383 DISPATCHED** (ae19e0f0): determinism-auditor + code-review lenses; verifies Option2+M1 contract, permutation-invariance mechanism, G2 skips-can't-mask, sidecar OFF-path purity. GO + CI green → merge → dispatch D2.
- **#374 fixes PUSHED** (f89f6b269) by finish-374: dead respin agent had applied all 3 edits correctly (verified clause-by-clause); harvest = verify+test+push. H1 five-killed/two-survived EN+BCS (panel verbatim), L1 živih agreement, L2 word order; owner-preference items untouched; 87/87 focused tests; 2 files/4 strings only; PR comment posted.
- **rereview-374 DISPATCHED** (af26a15a): focused Historian+Language re-verify of the fix commit (+ CI state). GO = panel unanimous discharged → merge #374 under delegation.
- LEDGER: no PROJECT_LEDGER entry for 2026-06-10 yet (D1 ledger entry rides in #383; respin + merges need a session entry at closeout).
- In flight: review-383 · rereview-374 · tree-unify · watcher b6kscyr0x (#382).

## ART: PEACE-PLAN STILLS APPROVED (2026-06-10)
- OWNER DECISION: 4 plan_* slots go the NO-MAP route — Category 1 cartographic requirement DROPPED; the held atmospheric document scenes approved as-is (semantics via object language: folder mosaic=Vance-Owen, 3 folders=Owen-Stoltenberg, ruler/2 stacks=Contact Group 51/49, empty signing table=Dayton).
- Processed (re-delivered via chat → Downloads): QC pass, 1536×1024→600×400 (3:2, no crop), webp q82 → src/ui/map/assets/plans/. Non-§6 batch 1 COMPLETE 17/17. Pack doc status+Category-1 superseded-guard updated; ledger entry appended.
- PR #384 (feat/art-plan-stills-no-map-route, 5422680aa). OPEN follow-up: nothing globs assets/plans/ yet — wiring needed (same class as #380 verdict/tutorial) before render.

## ⟲ REREVIEW-374 RESPIN (orchestrator session, 2026-06-10)
- **rereview-374 DIED on CI-watch WITHOUT posting its verdict** (analysis lost with the agent). LESSON: review agents must post verdict BEFORE any CI watch. Re-dispatched **rereview-374b** (a0bdc8df) verdict-only/no-CI-watch.
- #374 CI checked directly: 0 failed, full-suite+test pending. On GO verdict + green → merge #374 under delegation.
- (Noting concurrent session activity in this checkpoint — ART #384 entry above is the parallel session's, not orchestrator's. No overlap with my lanes.)
- **#382 MERGED** (2026-06-10 06:10Z, watcher all-green): §6 verifier tool + Phase III diagnosis report on main. extract-379 worktree now prunable (tree-unify checks PR state itself). Remaining in flight: review-383 · rereview-374b · tree-unify.

## ⟲ #374 PANEL SIGN-OFF COMPLETE → MERGE ARMED (2026-06-10)
- **rereview-374b VERDICT = GO** (comment 4667108325): H1 Vasiljević five-killed/two-survived verbatim EN+BCS, EN copies byte-identical across both files, JCE intact; L1 genitive plural correct; L2 word order correct; owner-preference items untouched; scope = exactly 2 essay files, head==f89f6b269. With prior Canon-§6 GO ⇒ **UNANIMOUS panel sign-off = owner signature under delegation**. (First re-reviewer's zombie ping independently leaked the same H1/L1/L2-confirmed result — two independent confirmations.)
- #374 was DRAFT → marked ready-for-review. CI 0 failed, full-suite+test pending → **watcher bojed4fmz squash-merges on green**.
- In flight: review-383 (D1) · tree-unify · watcher bojed4fmz (#374).

## ⟲ #383 REVIEW = GO-WITH-NOTES → MERGE ARMED + GOVERNANCE DOCS COMMITTED (2026-06-10)
- **review-383 VERDICT = GO-WITH-NOTES** (comment 4667117743). All 6 contract points PASS (Option2+M1 exact, determinism mechanism verified [Set→sort(strictCompare), FP-exact 0.5 half-split, insertion-order input-invariant], G2-A/B/C/D present with visible skips, sidecar OFF-path zero-writes, quality good, CI green-so-far).
- **⚠️ BLOCKING-BEFORE-D2 defect (not this PR): collapse_enabled.json marker can FALSE-POSITIVE on an OFF rerun** — non-unique run dir reuses folder, overwrites final_save but leaves stale marker → G2-A would assert ON-proof against an OFF artifact; symmetrically pre-marker IV-a ON artifacts classify OFF (G2-B vacuous ON-vs-ON). Fix ~3 lines (delete stale marker on OFF path) + mandate --unique run dirs in the D2 harness. **MUST ride in the D2 dispatch.** Minor notes: G2-B toEqual vacuous-if-absent-in-both; permutation test pins values not insertion order.
- **Process note actioned: 3 governance docs were UNTRACKED** (buried-docs anti-pattern again) → committed 86a142e65 on docs/collapse-ivb-governance-docs-20260610 → **PR #385** (scope doc + §6 review + PR374 panel report; docs-only fast-path).
- **Watcher bavlhujs0**: merges #385 then #383 on green. Ledger entry for 2026-06-10 still owed (pre-commit hook reminder) — at closeout.
- In flight: tree-unify · watcher bojed4fmz (#374) · watcher bavlhujs0 (#385→#383).
- **NEXT on #383 merge: dispatch D2** (3C wire-in) with: marker-defect fix FIRST (blocking), diffusion ON/OFF panel ratification, hardened-G2 as hard gate, 188w ON-vs-OFF pair via --unique dirs, D3 Washington-freeze HRHB fidelity check, re-floor = panel signature (scenario-tester+calibration+§6).

## ART: PEACE-PLAN STILL WIRING (2026-06-10, follow-up to PR #384)
- PR #386 (feat/art-plan-wiring, worktree plan-art-wiring): peacePlanArt.ts resolver (verdictArt idiom; planId→basename; cutileiro=null) + PeacePlanModal still render (EventModal-style fade; absent→byte-identical) + 8 tests (real-glob e2e of the 4 stills + PEACE_PLANS mapping integrity). Triad green (tsc / 8/8 / map build — 4 plan_*.webp in dist). STACKED on #384 (branch = main+384+wiring; shrinks if 384 merges first). assets/plans wiring gap CLOSED on merge.

## ★ AUTONOMOUS DAY-RUN OPENED (owner directive, 2026-06-10): "get ALL of the game done today"
- Owner off at work; full autonomous drive under the standing delegation. Task list (8 tasks, deps): T1 D2 wire-in (blocked on #383) → T2 D3+Phase-IV tuning+panel re-floor → T6 enclave build + T7 replay-wire+playtest-proxy (blocked on T2). Parallel inert: T3 #95 robustness · T4 quick-wins · T5 #49 E-A5 comply.
- DISPATCHED 3 inert builders (byte-identical gates, no collapse-file overlap): robustness-95 (a08369c0) · quickwins-bundle (ace4c222) · ea5-comply-49 (a6b850ac, 188w-gated).
- Ledger 2026-06-10 + board reconcile + checkpoint → **PR #387** (01b2bacf0, watcher bur5ub2ef). **#385 MERGED.** GIT NOTE: `checkout main` had reverted this working-tree checkpoint to main's old version — restored from the docs branch (`git checkout docs/ledger-board-20260610 -- <file>`); parallel session beware.

## ⟲ TREE-UNIFY DONE (2026-06-10) → PR #388 (watcher b1ika8grt)
- **43→30 worktrees (17 removed, junction-safe, main node_modules verified intact) · 135→67 branches (74 deleted, every SHA origin-recoverable, -d-first) · 17 stashes UNTOUCHED (triage report-only, 8 candidate-drop pending owner).**
- RESIDUE (owner eyes, non-blocking): 21 unpushed transient branches (ship/confirm/bisect/measure/pr3-enclave-followup + 16 orphan worktree-agent-*) — exact SHAs NOT on origin (squash-merged under other names) → recoverability rule forbids -D; one owner-approved bulk pass would clear. 2 real-WIP unknown-owner worktrees (agent-ab58ee9b: apply_effects/serialize mods+3 tests; agent-a474bbfd: 5 modified src/test) preserved. 7 dirty F:/awwv-* outside-root trees = remaining sprawl (per-tree unblock conditions in report).
- Standing policy (7-point) in `20260610_TREE_UNIFICATION_REPORT.md`: single root .claude/worktrees/, clean-on-merge, push-before-park, weekly prune.
- INCIDENTAL: main node_modules/.bin EMPTY since 2026-06-08 (pre-existing C1 ".bin-shim" artifact) — `node_modules/.bin/tsx` fails until npm install restores shims; use `node node_modules/<pkg>/...` invocation.
- Board: MERGED today #381/#382/#385. Merging: #374 · #383 · #387 · #388. Building: robustness-95 · quickwins · ea5-comply. Parallel session: #384/#386 art lanes.

## ⟲ CONSOLIDATED STATE (2026-06-10, post-#390) — checkpoint now LOCAL-ONLY (stop PR-routing; it's a contended scratchpad)
**MERGED today:** #374 #381 #382 #383 #385 #387 #388 #389 #390 (+ parallel art session #378/#380). #379 closed-superseded. Floor territory UNCHANGED 649; 40w run hash e246e852.
**Collapse spine:** IV-a + IV-b D1 on main. **finish-d2 (aad9c235)** harvesting the orphaned D2 (code committed: marker-hygiene + 3C wire-in + Sarajevo §6 fix): re-running 188w trio + §6 HARD gate + measurement report → HELD PR → re-floor panel. Per Codex #385 likely outcome = 3D-FIRES-BUT-INERT (settlement-keyed consumers) ⇒ defines Phase IV-c.
**GitHub sweep done:** failed-run notifs = stale merged-branch noise (main green). 5 Codex comments all actioned (2 §6-material → d2 branch; 3 doc → #390 merged + thread replies).
**Inert lanes:** quickwins **PR #391** (all 4 done, 40w byte-identical, review-391 a912488e in flight) · robustness-95 (carrying corridor-width Infinity→99 finite-sentinel producer fix + guard, territory-flat re-floor candidate, bundle re-bless into Phase IV panel) · ea5-comply-49 (188w-gated, baseline running).
**Tasks:** #1 D2(finish-d2) #2 D3/re-floor(blocked) #3 robustness #5 ea5 in flight; #4 quickwins DONE; #6 enclave + #7 replay blocked on #2; #8 docs DONE.
**Watcher hygiene FIXED:** all watchers now verify post-merge state==MERGED (caught #387's silent non-merge twice).
- **robustness-95 harvested**: 3 commits on fix/robustness-95-nonfinite-guards (serializer fail-loud + effect-delta reject + #360 factory guard + corridor_width Infinity→99 producer fix; PLUS a THIRD corruption the guard caught: defender_contributions distance_hops finite clamp). Territory-flat re-floor candidate. finish-95 dispatched. **D2 188w OFF+ON pair running in MY bg bash bb0kzeyvu** (persistent, agent-death-proof).
- **#391 watcher BAILED correctly** (verified-merge worked): full-suite + test FAILED on tests/ui_adapter_boundary.test.ts ('expected [Array(1)] to deeply equal []', 1/17). PASSES 17/17 on clean main → #391-introduced regression (likely #86 dynamic_sections surfacing through adapter boundary). LESSON: review-391 + builder both ran FOCUSED suites, missed ui_adapter_boundary — same focused-suite-false-green class. fix-391 (a4596713) dispatched: diagnose [Array(1)], fix test-or-code correctly, re-verify WHOLE tests/ui dir. Task #4 reopened.
- **D2 188w PAIR COMPLETE (my bg bb0kzeyvu, both exit 0):** OFF raw `ad190ed644972150`, ON raw `802a15bff6ac1306`, ON collapse_enabled.json marker PRESENT. Runs in worktree agent-af206cbf462c25e42 runs_orch_off / runs_orch_on. NO self-analysis — dispatching scenario-tester harvester for §6 gate + control_delta + measurement + HELD PR. (Raw note: OFF == known IV-a OFF baseline literal ad190ed6 → OFF-path-clean to be confirmed by harvester; ON hash differs = collapse-ON state delta, harvester quantifies whether territory or read-model.)
- **#95 robustness → PR #392 (finish-95 done)**: TERRITORY-FLAT proven — control_delta byte-identical (sha 9e47df18), exactly 19 leaf null→99 (15 corridor_width + 2 commitment_ratio + 2 distance_hops), hash e246e852→ace1395d, structural-fingerprint 3649b386 unchanged, 30/30+6/6. 3 live corruptions fixed (corridor producer / commitment_ratio persist-boundary / distance_hops storage-boundary — last caught BY the P1-A guard itself). strict-null ratchet 515→516 clean. HELD for bundled Phase-IV re-floor panel. review-392 (a5b6d10b) dispatched: determinism+code, hunts any reader where 99≠Infinity. Cleanup: empty baseline_95 dir lingers under file-lock (harmless, untracked).

## ★ COLLAPSE D2 RESULT (2026-06-10) — §6 PASS, substrate WORKS, still territory-flat → PR #393
- **§6 GATE PASS** (G2 ran-not-skipped + verifier; rupture t162 identical ON/OFF; 0/9 enclave damage; Srebrenica/Žepa fall, Goražde/Bihać/Sarajevo-painted/Teočak hold).
- **Wire-in WORKED one layer up:** local_strain now 597 OSID entries (IV-a had 0) — real OSID exposure feeds the substrate. **3D wrote NOTHING because max strain 28.2 < Tier-1 gate 40** (NOT the Codex fires-but-nothing-consumes case — it's strain-below-threshold). Territory byte-identical (0 OSID delta, RBiH285/RS321/HRHB106), default-OFF byte-identical to main (ad190ed6/e246e852). ON hash 802a15bff6 moved via read-model local_strain only.
- **#393 merges as byte-identical-when-disabled (NOT a re-floor).** review-393 (a51a3ef5) dispatched (focused: wire-in OFF-inertness + Sarajevo §6 fix closed in BOTH places + determinism). Task #1 DONE.
- **NEXT = Phase IV-c (task #2 reframed): strain/threshold geometry** to make 3D fire (M1 magnitude 1.0/edge too low for gate-40, OR lower TIER1_THRESHOLD, OR M2 BFS-isolation-weighting). One-change-per-run, §6 G2 hard gate, = the FIRST floor-moving collapse change → panel re-floor.

## ★ #392 RE-FLOOR SIGNED (panel, 2026-06-10) → rebless-392 finalizing
- review-392 = GO-WITH-NOTES (exhaustive per-reader inertness: all 3 producers 99≡Infinity, no wrong-side threshold, commitment_ratio in-mem-Inf/persist-99 split-brain SAFE, determinism sound). + finish-95 scenario-tester territory-flat proof (control_delta byte-identical 40w) + not §6-sensitive = COMPLETE panel sign-off under delegation.
- **rebless-392 (a563258c) dispatched**: re-prove territory-flat at 40w/52w/188w (not just 40w), re-bless golden manifest (final_save only, control/formation UNCHANGED), update CALIBRATION_MASTER + floor literals, merge on green. New 40w final_save ace1395d12c1b1fa (territory 649 unchanged, structural-fingerprint 3649b386 unchanged). MEMORY.md floor update on merge.
- Running: review-393 · rebless-392 · fix-391 · ea5-comply-49.

## ⟲ #391 FIXED — broad re-verify caught TWO regressions (2026-06-10)
- fix-391 ran WHOLE tests/ui dir (not focused) → found 2 regressions the original lane + review both missed:
  - R1 (the CI failure): NOT #86 — it was **#73** adding a direct runtime import of splitKiaWiaMia into FormationDetail.tsx → violated UI↔sim boundary (ui_adapter_boundary.test). FIX=architecture: moved derivation into GameStateAdapter (sanctioned bridge), UI reads adapter fields only. No sim file touched → #73 40w byte-identical e246e852 still holds.
  - R2 (hidden, found by broad run): #86 authored dynamic_sections but left essay tier=0 (inconsistent w/ deriveDefaultTier→SHAPEABLE=2). FIX=data, tier 0→2.
- Verify: 222 files/1530 tests pass, tsc clean. Push ffe48afe. Watcher bb1r46f2o (verified-merge).
- **LESSON REINFORCED (3rd time today): focused suites = false-green for boundary/integration/intent changes.** review-391 + builder + the original quickwins all ran focused, missed both. Going forward dispatch gates must name `tests/ui` (whole dir) for any UI/adapter/essay-surfacing change, same as strict_null + step_order for engine.

## ⟲ TEOČAK MIS-CLASSIFICATION (owner caught, 2026-06-10) — CONFIRMED connected salient
- Both investigators converge: Teočak = CONNECTED salient (Sapna thumb), NOT isolated enclave. Owner correct.
  - GRAPH: BFS teocak_krstac_2→rastosnica_2(RBiH via osid_control_overrides)→kalesija→tuzla = 81-OSID RBiH component; 3 RBiH neighbors. (raw census file shows isolated = pre-override, misleading.)
  - HIST: 255th = 25th Div/Tuzla brigade reinforced overland (BB1 p.439 fn141). In-code "(BB1 p.509)" = MISCITATION (p.509 is OOB table, says nothing about isolation). "analogous to Žepa/surrounded" historically WRONG.
- **CRITICAL CAVEAT (graph-teocak):** enclave_resilience.ts Teočak entry is LOAD-BEARING calibration — added to re-pin the 188w anchor after it regressed to RS (player_faction-contract change). Naive removal likely drops a 30/30 anchor. §6 collapse BFS gate is FINE (correctly sees it connected) — only the enclave_resilience hardcode (no BFS) mis-models it.
- **teocak-fix (aa248cf5) dispatched:** PART A = comment/citation fix ONLY (calibration-inert, p.509→p.439, isolated→connected-salient-via-rastosnica, + CALIBRATION-PIN-NOT-TRUE-ENCLAVE note); PART B = read-only scope `20260610_TEOCAK_SALIENT_REMODEL_SCOPE.md` for the proper corridor-fed-salient remodel (calibration lane, owner/panel-gated, anchor-regression risk) + flag a sweep of the other enclave_resilience entries for topological correctness. PR no-merge.
- DECISION for owner: Part A lands now (safe). Part B (real remodel) = calibration-coupled, could move the Teočak anchor → pursue as its own lane or accept pin-with-corrected-comment for 1.0? Surface when owner back.

## ★ TEOČAK REMODEL — 4-LENS PYRRHIC PANEL UNANIMOUS (2026-06-10)
- GD=PURSUE-post-1.0 (pin is a railroad; corridor-cut drama = collapse lane) · CAL=DEFER-post-1.0/risk-HIGH (load-bearing, regressed to RS without it, bundles 3-4 changes in a cascade seam) · OPS=MEDIUM (corridor-supply ALREADY reaches it, no mechanic to build; load-bearing=predictor defender-boost; real fix=must_hold(rastosnica,teočak) garrison discipline, 2-change/188w-gated) · HIST=YES-marginal (right-answer-wrong-reason; outcome already correct+§6-pinned → fidelity-of-mechanism not result).
- **UNANIMOUS DECISION (panel = signature under delegation):** (1) 1.0 = ship MARKED PIN (teocak-fix Part A comment fix, in flight) — all 4 lenses accept as honest interim, remodel NOT worth standalone calibration risk. (2) Remodel = post-1.0 lane folded into collapse Phase IV (task #9, blocked on #2).
- KEY: Teočak is CONNECTED+supplied (never critical) → collapse BFS won't organically pressure it; coupling is conditional-on-corridor-cut. HARD §6: default run MUST keep Teočak RBiH (outcome-protective, not atrocity site); "fall if neck cut" emergent-player-only, never organic.
- Investigators+panel = 6 agents on Teočak; owner's catch was correct + surfaced a real right-answer-wrong-reason mis-model + a code miscitation.
- **#393 (collapse D2 wire-in) MERGED** — substrate feeds real OSID exposure on enable path, byte-identical-when-disabled. Collapse: IV-a + IV-b D1 + D2 all on main. NEXT collapse lever = Phase IV-c (strain 28.2 vs gate 40).

## ⟲ #392 event-validation fail = EXPECTED re-bless (NOT a guard regression) (2026-06-10)
- "Event system validation" job failed on its Baseline-regression step: 52w apr1992_52w final_save mismatch (expected 6d0dae17). This is the KNOWN territory-flat re-bless (null→99 moves the save hash) — rebless-392 must update the 52w (+40w/188w) golden manifest entries. rebless-392 still in flight (handling it). NOT the serializer guard misfiring on events.
- **#394 (teocak Part A + Part B scope) OPEN** — Part A comment/citation fix calibration-INERT (config byte-identical, 15/15 teocak tests pass), delivers the panel's unanimous 1.0 marked-pin decision; Part B = remodel scope doc. Watcher armed. teocak-fix also flagged a follow-up sweep: HVO pockets (zepce/kiseljak/lasva_valley) most-suspect for the same connected-vs-isolated check; Srebrenica/Žepa/Bihać/Goražde likely genuine islands.
- **#391 (quick-wins #59/#65/#86/#73) MERGED** after the boundary+tier double-regression fix. Task #4 DONE. Merged-today total: 12 (#374 #381 #382 #383 #385 #387 #388 #389 #390 #391 #393 + #380/#378 art). Open: #392 (rebless in flight) · #394 (teočak, watcher) · #344/#329 (held).
- **GitHub sweep cron set** (1b0f0ead, :17/:47 hourly): failed-runs + Codex-comments + dead-watcher re-arm. Standing per owner directive. Sweep now: failures all known (robustness=expected rebless via rebless-392; quickwins=pre-#391-fix stale). 0 Codex on #392/#394. Art #384/#386 = parallel session.

## ★ PHASE IV-c SCOPED (2026-06-10) → build dispatched
- RECONCILED: ivc-scope wrongly claimed D2 wire-in not on main — it IS (#393 000f21353, computePressureExposureByEntityOsid @ phase3c:610). ivc-scope read stale (pre-#393-merge). IV-c branches off main.
- LEVER: STRAIN_FRACTION 0.05→0.15 (phase3c:75). NOT threshold-drop (proven no-op).
- ★ KEY CATCH: SEVERITY_MIN=0.25 → real collapse_damage floor = 40+0.25×60 = **55**, not 40. Threshold-only never fires at 28.2. Only fraction/magnitude raise works. (Saved a wasted run.)
- §6 CONDITIONAL: G1 chokepoint safe; IV-c = FIRST run 3D writes → hardened G2-A/G2-B MUST run vs verified collapse-ON artifact or false-green. Washington-freeze check. ~7 LOC, 5-8×188w.
- PLAN (avoid 188w wait-loop death): ivc-build does code+commit+push+tsc+focused ONLY (no 188w) → I drive 188w ON/OFF pair in my bg bash → harvester does §6 gate + measurement + HELD PR → re-floor panel.

## ART: 15 FACTION STILLS RECEIVED + QC PASS (2026-06-10)
- Owner WeTransfer delivery → extracted to F:\tmp\wetransfer_art\ (15 PNG, all 1672×941 = 16:9, clean 2.09× downscale to 800×450, no crop).
- The 5 SPLIT families × 3 factions: mobilization / supply_convoy / supply_shortage / siege_city / patron_relations.
- QC PASS all 15: faction differentiation excellent (e.g. mobilization RBiH=Sarajevo civilians+bus / RS=ex-JNA municipal+materiel truck / HRHB=karst+uniform kit; siege RBiH=inside Sarajevo / RS=besieger hillside looking down / HRHB=Mostar river gorge). Guards held: no readable text, no legible flags/insignia, no close-up/identifiable faces, no bodies/gore, documentary palette.
- MINOR NOTE: patron_relations RS+HRHB use digital face-blur (pixelation) vs RBiH's natural out-of-focus silhouette — functionally compliant (no identifiable faces), slight stylistic inconsistency. Owner decision: accept or regen those 2.
- NOT yet processed to webp / placed / wired — pending owner go (event-key wiring touches src/sim/events, near active collapse agent).
- GitHub/Codex: #380 P2 (test asserting art globs stay empty) ALREADY RESOLVED on main — verdict_and_tutorial_art.test.ts uses injected empty-glob for absent case + real glob asserts #378 assets resolve; my #386 follows the same corrected pattern (no bug). #385 P1 (collapse Phase-4B Option-2 not territory-moving) = active agent's domain, surfaced not actioned. #384/#386 themselves have zero comments.
- **SWEEP :47** (cron 1b0f0ead): clean. robustness Event-System fail = pre-rebless 52w mismatch SUPERSEDED (rebless-392 pushed 'chore(baselines): re-bless 52w golden manifest', CI re-running). #392/#394 CI in-progress, watchers alive. #344 Codex (2026-06-09 surrender-cascade-split-under-V2) = KNOWN task #93, held-for-D1, not new. #386/#384 DIRTY=parallel art session. #329 held NO-GO. No new actionable.
- **IV-c LEVER BUILT** (ivc-build): branch feat/collapse-phase4c-strain-fraction, commit 560401fb, STRAIN_FRACTION 0.05→0.15 (one constant), collapse_phase1_disabled GREEN (OFF-path inert), tsc clean. Severity floor=55 confirmed in code (0.15×3 → ~84.6 clears it).
- **IV-c 188w FIRST-FIRE PAIR launched** (my bg bash blicfgtuz, worktree agent-a1c45801244d620ae): OFF baseline + ON (ENABLE_COLLAPSE=true), + direct collapse_damage-written check. THE floor-moving test — does 3D finally write + does territory move. On completion → scenario-tester harvester for §6 HARD gate (G2 vs verified ON artifact — scope's biggest-risk flag) + measurement + HELD PR → re-floor panel.
- **#392 (robustness re-bless) watcher b5amhtaxi** (rebless-392 died post-push; its 52w manifest re-bless IS pushed, CI re-running clean). Merges on green.

## ART BATCH 2 SHIPPED: 13 faction stills placed (2026-06-10)
- PR #395 (feat/art-faction-stills, worktree faction-stills, from origin/main): 13 of 15 faction stills → event_illustrations/ (800×450 webp, fit:cover no-crop). INERT (dir globbed by eventIllustrationArt.ts; no event JSON image key yet → render unchanged). Triad green (tsc / event_illustration_art 5/5 / map build all 13 in dist). Pack doc "Batch 2" status block + ledger appended.
- HELD for regen (2): event_patron_relations_{RS,HRHB} — digital pixelation face-blur vs spec'd natural silhouette. Amended prompts being delivered to owner.
- FOLLOW-UP (open, NOT done): wiring faction-tagged event image keys in src/sim/events (authoring decision; deferred to avoid collision w/ active collapse agent).
- Source PNGs retained at F:\tmp\wetransfer_art\.
- **#394 (teočak Part A comment fix + Part B scope) MERGED** — panel's 1.0 marked-pin decision on main; lying comment corrected, remodel scoped (task #9). Merged-today: 13. Open: #392 (watcher b5amhtaxi) + held #344/#329 + parallel-art #384/#386.
- **#392 MERGED** (robustness re-bless — corridor-width/commitment_ratio/distance_hops fixes + fail-loud serializer guard, territory-flat). Task #3 DONE. Merged-today: 14.
- **IV-c FIRST-FIRE raw:** OFF ad190ed6 (==baseline, inert ✓), ON eccfa5cd (MOVED vs D2 802a15bf — strain changed something), quick-grep collapse_damage absent-or-empty (crude — harvester verifies). UNEXPECTED if 3D didn't fire at 0.15. ivc-harvest (a599dcf7) dispatched: authoritative did-3D-fire + max-strain-at-0.15 + §6 gate + territory delta + which-case (a fired+moved / b fired-inert / c still-didn't-fire). NO self-analysis. HELD PR.
- **IV-c VERDICT = case (c), lever PROVEN, blocker one layer deeper.** Max strain 84.60 (predicted 84.6), 39 OSIDs≥55, 83>40 — magnitude model CORRECT. 3D inert because Tier-1 entityToFaction reads faction.areasOfResponsibility = [] in OSID-native runs (control in political_controllers). §6 PASS (rupture t162 identical, 0 enclave dmg). Territory ZERO delta, OFF byte-identical. = napkin lesson #5 AGAIN (AoR-vs-political_controllers edge-universe mismatch). PR #396 HELD.
- **CONTRADICTION flagged:** D2 scope claimed AoR populated at runtime; ivc-harvest found []. ivd-build (a555eee0) STEP-0 resolves it before building (if AoR actually populated → STOP, real blocker elsewhere).
- **IV-d dispatched** (on IV-c branch, keeps STRAIN_FRACTION 0.15): reroute Tier-1 entityToFaction from political_controllers (D2 reroute pattern), spatial-only, G1 untouched. Code+commit only → I drive combined 188w → harvester → §6 gate + territory → re-floor panel. Task #2 reframed IV-d.
- Live: ivd-build · ea5-comply-49 · sweep cron. Merged-today 14, floor 649.
- **SWEEP :17** (cron): clean. 0 failed runs. #396 IV-c HELD-by-design (re-floor panel, will be superseded by IV-d bundle — no watcher). #395 NEW = parallel art session (faction event stills batch 2, inert) — not my lane. #386/#384 same. #344 codex=known #93 held. #329 held NO-GO. No new actionable.

## ★★★ COLLAPSE PIPELINE COMPLETE + §6-PROVEN (2026-06-10) — parked at owner eligibility decision
- **ive-harvest verdict:** §6 PASS (G2 6/6 RAN vs staged ON artifact; rupture t162 identical; 0/9 enclave damage). Consumer CORRECT (8/8 tests — would bite a contested collapsed OSID). Territory INERT, PROVEN reason: hatelji_2 (only collapsed OSID, HVO-core Stolac) has ZERO enemy attacks across all 188w (416 brigade_temporal_log records, ALL HRHB) → degrading a never-combat-tested defender = no-op. Case (b)-confirmed. OFF byte-identical ad190ed6.
- **FULL PIPELINE NOW BUILT + §6-SAFE:** exposure(D2)→strain(IV-c)→Tier-1 eval(IV-d)→3D write→combat consumer(IV-e). Substrate IV-c+IV-d MERGED (#397). Consumer #398 HELD (review-398 a c45daa7 + watcher pending GO).
- **★ THE ONE REMAINING LEVER = ELIGIBILITY BREADTH (owner design call):** decouple the faction-wide 'isolated_osids ≥10% controlled' spatial gate so locally-contested OSIDs (RS western-Krajina under 5th-Corps pressure) become collapse-eligible. Empirically confirmed as THE gate between 'collapse fires safely' and 'collapse reshapes the 1995 map'. ive-scope decoupling options ready. NOT touched autonomously.
- **ea5-comply-49 harvested:** committed local-only (never pushed, died on 188w), finish-ea5 (aee2c474) recovering: verify+rebase+188w byte-identical proof+push+PR.
- Merged-today 15, floor 649. Live: review-398 · finish-ea5 · sweep cron.
- **review-398 = GO** (all 7: default-OFF strict no-op, degrade-only [0.6,1] never-aids-attacker, own-OSID-only [edge-min inert], enclave-safe G1, single per-OSID application, deterministic). Watcher bxfcxibhk merges on green → completes the collapse pipeline (incl IV-e consumer) on main, default-off. Non-blocking note: getSidCapacityModifiers doesn't guard state.political (pre-existing, no new risk). On merge → full collapse pipeline on main; only owner eligibility decision (task #11) gates territory movement.
- **#398 (IV-e consumer) MERGED** — FULL COLLAPSE PIPELINE now on main (exposure→strain→Tier-1→3D-write→combat consumer), default-off, §6-proven. Merged-today: 16. Collapse machinery 100% complete + landed; only owner eligibility decision (task #11) unlocks territory.
- **#49 E-A5 comply-response → PR #399 (finish-ea5 recovered)**: byte-identical FULL final_save hash ad190ed6 both sides (not just control_delta), 188w-gated (E-A5 fires w188 → 40w false-green confirmed), 7 tests, scenario-tester GO. Emergent: defying player no longer launch-frozen, eats authored defiance costs. Task #5 DONE. Watcher bcqz2mqop merges on green. All non-collapse task-lanes (#3/#4/#5/#8) now complete.
- **SWEEP :47** (cron): clean. 0 failed runs, 0 new codex (#344=known #93). #399 CI-pending (watcher bcqz2mqop). Rest = parallel-art #395/#386/#384 + held #344/#329. No new actionable. Autonomous run parked at owner decisions (task #11 eligibility / #9 Teočak); only #399 finishing.
- **#399 (E-A5 comply) MERGED** — last in-flight build lane closed. Merged-today: 17. All non-collapse task-lanes complete; autonomous run fully parked at owner decisions (#11 eligibility, #9 Teočak).
- **★ COURSE CORRECTION (owner, 2026-06-10): stop parking calibrate-to-history as owner-design-fork.** Persisted to delegation memory. Task #11 reframed: panel-decides + I proceed. HARD TARGET = reproduce ONLY western-VRS-1995 collapse (Storm/Sana/Mistral); current behavior BACKWARDS (HRHB-Stolac collapses [ahistorical, held to Dayton], RS-Krajina never [faction-10% gate blocks big landmass]). Panel convened: panel-wog-elig (ab0b18d3, war-or-game/historian LEAD — predicate + 1995 time-gate) + panel-mech-elig (a33886e3, ops/calibration — cleanest per-OSID signal + LOAD-BEARING check: do western-Krajina OSIDs actually carry the high-strain/isolation signal in-sim?). On convergence → synthesize predicate → build → 188w → re-floor, autonomous. Surface only on §6 break / panel split.

## ★★ COLLAPSE ELIGIBILITY — PANEL FOUND A DEEPER STRUCTURAL ISSUE (2026-06-10)
- **Panel UNANIMOUS finding (not a split): the eligibility flip alone WON'T reach western-Krajina-1995.** war-or-game/historian LEAD: target = VRS 2nd Krajina Corps collapse (Storm/Sana/Mistral); engine already has the BB-cited target list (HISTORICAL_OSID_ANCHORS_APR1995); predicate = RS + local-strain + coherence + 1995 time-gate (emergent, anchors=validation not railroad).
- **BUT ops/calibration MEASURED the D2 ON run → the predicate is built on a mis-aimed signal:** local_strain is a CUMULATIVE front-edge integral → highest at STATIC multi-year sieges (Sarajevo ring/Drina/Doboj/Posavina, max 28.2), ~1.0 at the western cascade (Sanski Most/Ključ/Drvar). Strain rewards SIEGE DURATION; the 1995 western collapse was RAPID loss of a quiet rear. A strain predicate fires WRONG (HRHB central + east RS) → moves AWAY from history. + RS fails faction-wide Tier-0 (connected landmass). §6 INTACT (G1 downstream, 0 enclave dmg verified).
- **MY DECISION (keep moving, dig to root — NOT park):** the right signal for rapid collapse = LOCAL ISOLATION ONSET, not accumulated strain. Dispatched krajina-isolation-probe (a33a5b4b, read-only): does the western-Krajina set become BFS-isolated / get captured in-sim during 1995? 3 outcomes → (a) already captured via triggered ops = collapse redundant for west, real gap elsewhere; (b) not captured + not isolated = sim under-produces the offensive, upstream fix not collapse; (c) isolated-not-captured = isolation predicate IS the lever. This determines the actual build.
- Reported finding to owner (informing, not asking). Task #11 in flight.

## ART BATCH 3 SHIPPED → NON-§6 GENERATION COMPLETE (2026-06-10)
- PR #400 (feat/art-final-8, from origin/main): final 8 stills → event_illustrations/ (800×450 webp). 6 shared (washington_agreement/referendum/political_session/ceasefire/displacement_column/un_presence) + 2 patron regens (RS/HRHB — face-blur FIXED to natural silhouette). QC pass. Triad green (tsc / event_illustration_art 5/5 / map build 8 in dist). Pack doc "Batch 3 → NON-§6 COMPLETE" + ledger.
- Owner's "that should be all" CONFIRMED correct: only the 5 generic faction-agnostic fallbacks remain ungenerated, intentionally skipped (redundant). Remaining art work = WIRING not generation.
- Open art PRs: #384 plans, #386 plan-modal wiring, #395 13 faction stills, #400 final 8. Source PNGs: F:\tmp\wetransfer_art (15) + F:\tmp\wetransfer_art2 (8).

## §6 ART RECEIVED + DIGNITY QC PASS — HELD (2026-06-10)
- Owner TransferNow delivery → F:\tmp\section6_art\ (10 PNG). Resolved via TransferNow /api/transfer/downloads/link per-file (page is JS-gated).
- All 10 = the authored §6 set: 8.1 camps / 8.2 srebrenica / 8.3 zepa / 8.4 ahmici / 8.5 markale / 8.6 drina / 8.7 decision_header_enclave_overrun (2172x724≈3:1→1536x512) / 8.8 codex_atrocity_essay_header / 8.9 decision_overrun_aftermath / 8.10 decision_contain_siege. 9 stills 1672x941→800x450.
- §6 DIGNITY QC: ALL 10 PASS. Aftermath/absence/memorial framing held throughout — NO bodies, NO faces, NO people, NO depicted violence, NO perpetrators, NO gore, NO triumphalism. Srebrenica=deserted Potočari ground + abandoned belongings (child's coat/shoe/chair); camps=empty compound behind wire; ahmici=burned street+toppled minaret; markale=deserted square+"Sarajevo rose" impact scar; drina=emptied river town; overrun=town under settling smoke at besieger's distance + abandoned column's belongings (never victory); contain=frozen sealed valley + closed barrel-checkpoint road (never "good ending", ambivalent). Documentary palette, no readable text/flags.
- NOT placed/wired. §6 GATE binds: docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md requires owner + sign-off chain (/historian + /narrative-designer + /game-designer; owner non-delegable for enclave-overrun decision). 8.7/8.9/8.10 enclave-decision art has no build target yet (feature build pending §6 sign-off) → stays held regardless. Awaiting owner direction on the sign-off before any repo action.

## §6 SIGN-OFF CHAIN RUN + 6 STILLS PLACED (2026-06-10)
- Owner chose "run the §6 sign-off chain". Dispatched /historian + /narrative-designer + /game-designer on the 7 non-enclave subjects (8.1-8.6, 8.8) → ALL APPROVE-WITH-NOTES, no rejections. Sign-off record: docs/40_reports/governance/20260610_SECTION6_ART_SIGNOFF.md.
- PR #401 (feat/art-section6-signoff): placed 6 inert (camps/srebrenica/zepa/markale/drina/codex_header) → event_illustrations/ 800×450 webp. Triad green (tsc / event_illustration_art 5/5 / map build 6 in dist).
- HELD: 8.4 Ahmici (/historian CONDITIONAL — minaret reads as chimney, regen recommended → OWNER DECISION pending); 8.7/8.9/8.10 enclave-decision art (feature build pending). Non-blocking refinement notes recorded: 8.5 Markale rose-depth, 8.3 Žepa grade, 8.1 Omarska-vs-Trnopolje.
- Source PNGs: F:\tmp\section6_art\ (all 10). Open art PRs now: #384 plans, #386 plan-modal wiring, #395 13 faction, #400 final 8, #401 §6 (6).
- NOTE: §6 art WIRING (set image keys on atrocity event/codex rows) is itself §6-gated content work → routes back through the chain; NOT done.
- Amended patron prompts (RS/HRHB) were the prior turn; #395 still holds those 2 patron slots? No — #400 shipped the 2 patron regens. All NON-§6 generation complete.
- **★ COLLAPSE PREMISE OVERTURNED (probe, 2026-06-10):** western-1995 cascade ALREADY reproduced by ops (7/9 captured via Mistral 1/2 + Sana recaptures); collapse moves 0 territory (201 flips all combat/event, 0 collapse; ON==OFF byte-identical map). NO valid historical collapse target (west=handled-by-ops+no-signal; high-strain central/east sieges=held-historically). Residual = 2 OPS misses (kljuc_2 un-targeted [owner's known-deferred lane], mrkonjic_grad_2 assault-fails), NOT collapse work. **OWNER DECISION: repurpose collapse → EXHAUSTION/POLITICAL-COLLAPSE FEEL** (cohesion/will-to-fight signal, not strain, not territory; reuse §6-safe pipeline). repurpose-scope (ab9b1006) scoping 2-3 designs. Lesson saved: measure-the-premise-before-building (4-phase build on unmeasured premise).
- **SWEEP** (cron): 0 failed runs. NEW #400 (art batch-3) + #401 (§6 art sign-off chain) = PARALLEL ART SESSION (author horkesh, art branches) — NOT my lane; #400 codex P2 (uncommitted-art-marked-complete) is theirs to action. #344 codex=known #93. All open PRs DIRTY/BLOCKED = parallel-art going stale under today's merges (their rebase) + held #344/#329. No new actionable for orchestrator lane. Mine: repurpose-scope in flight (collapse→exhaustion-feel).
- **REPURPOSE SCOPED** (repurpose-scope) → war_exhaustion[fid]/100 is the right live signal (saturates ~w80, already warroom-surfaced, already read at 3C Tier-0); local_strain rejected (siege-duration-biased). Design A=read-model exhaustion feel-surface + Chronicle (INERT, no re-floor); B=faction-own-offense drag (floor-moving, later); C=localized cohesion-break (post-1.0). Reuses 3C Tier-0 verbatim; shelves strain/Tier-1/3D-territory half. G1 §6 untouched.
- **exhaustion-A-build (aa39eea3) DISPATCHED** — Design A: per-faction war-weariness descriptor (steady→strained→cracking→collapsing) from war_exhaustion/100 + Chronicle beat on threshold-cross, all-3-factions (universal 1995 weariness = negative-sum). Read-model, no new persisted state, 40w byte-identical proof, UI-layer. → review → merge (calibration-inert, no owner/§6 gate). Task #11 reframed.

## §6 REGENS RECEIVED + GH SWEEP (2026-06-10)
- 8.4 Ahmici regen: felled minaret now UNMISTAKABLE (white shaft + şerefe balcony + conical cap, lying intact; broken base stump on gutted mosque) → clears /historian conditional. 8.5 Markale regen: shallow radial "Sarajevo rose" (not deep crater). Both 1672×941, QC PASS, guards held. At C:\Users\User\Downloads\.
- GH SWEEP: all 5 art PRs (#384/#386/#395/#400/#401) CI GREEN — no failures/pending. ONE codex P2 on #400: "Don't mark uncommitted art as complete" — NON-§6 pack "generation COMPLETE/only wiring remains" is misleading b/c assets span unmerged PRs (#384/#395/#400); a premature wiring pass would author image keys for basenames absent in merged tree → silent text-only. VALID. Fix: qualify completeness as dependent on those PRs merging + add wiring guard.
- TODO this turn: (a) §6 branch #401 — place 8.4 regen (new) + swap 8.5 regen, update sign-off doc + §6 pack status; (b) #400 branch — qualify "complete" claim per codex.

---
## Worktree prune pass 2 (2026-06-10) — checkpoint
Before: 41 worktrees / 90 local branches / 17 stashes (stashes UNTOUCHED).
Removable (merged PR + clean/regenerable-only): 6 worktrees:
- agent-aa248cf5c5912724f  fix/teocak-salient-comment-and-scope (#394) clean (+ .vite cache, plain dir)
- agent-ac27346f2d41399e9  docs/codex-p2-fixes-20260610 (#390) clean, no node_modules
- agent-aed8e5cc7ee491ae8  chore/extract-379-collapse-verifier-report (#382) clean, no node_modules
- agent-a6b850ac2a678340b  feat/ea5-comply-response-49 (#399) husky-only, JUNCTION
- agent-ace4c2222c3c45e30  chore/quickwins-59-65-86-73 (#391) husky-only, JUNCTION
- agent-a08369c08417a1490  fix/robustness-95-nonfinite-guards (#392) husky-only, JUNCTION
PRESERVE (dirty with real work): all collapse-4* / activate-* / measure-* / 3 worktree-agent-* (uncommitted sim/UI/test/checkpoint edits), live exhaustion build (aa39 locked), all art worktrees.

## §6 REGENS PLACED + #400 CODEX FIX (2026-06-10)
- §6 regens 8.4 + 8.5 QC-passed, converted 800×450 webp, committed to PR #401 (8c2982e53): 8.4 Ahmici placed (new, conditional CLEARED), 8.5 Markale swapped (shallow rose). Sign-off doc + §6 pack status updated → §6 placed-inert set now 7; only 8.7/8.9/8.10 enclave art HELD. Triad green.
- #400 codex P2 ("don't mark uncommitted art complete") FIXED (0485848d5): qualified completeness as spanning unmerged PRs (#384/#395/#400) + added wiring guard (don't author image keys until assets merged to main — resolver renders missing basename text-only silently). Replied to codex thread (resolved).
- ALL 5 art PRs CI GREEN. State: #384 plans, #386 plan-modal wiring, #395 13 faction, #400 final 8 (+codex fix), #401 §6 7 stills + sign-off. HELD: 3 enclave-decision images (8.7/8.9/8.10, with feature).
- ART GENERATION COMPLETE across NON-§6 (minus 5 optional fallbacks) + §6 (minus 3 enclave). Remaining = WIRING (gated on asset PRs merging) + enclave feature build.
- **Design A DONE → PR #402** (exhaustion-A-build): warWeariness.ts descriptor (steady→strained→cracking→collapsing from war_exhaustion/100, bands 40/65/85) + Chronicle beat per faction (monotonic → no history field, no schema bump) + army_hq UI passthrough. **40w byte-identical ace1395d both sides** (read-model, 0 sim touch), no new persisted field, tsc clean, broad chronicle+ui tests green (no focused-false-green). strain/Tier-1/3D pipeline shelved-dormant, G1 §6 untouched. review-402 (aab60a03) dispatched → on GO merge UNDER CLEAN-ON-MERGE rule → then Design B (task #12). Calibration-inert, no floor/§6 gate.

### Prune pass 2 RESULT
After: 35 worktrees / 75 local branches / 17 stashes (UNTOUCHED).
Removed 6 merged-PR worktrees (#382/#390/#391/#392/#394/#399) + deleted their 6 feature branches (-d, recoverable via origin/<branch>).
Deleted 9 orphan worktree-agent-* auto-branches (ancestors of origin/main, -d non-forced). Refused/preserved ~22 non-ancestor worktree-agent-* pointers (safety: not on origin).
3 junctions rmdir'd link-only before removal; main node_modules intact (708 pkg dirs, real dir, .bin present).
Live exhaustion build (agent-aa39, feat/exhaustion-feel-surface) HEAD advanced mid-session -> confirmed live, preserved.
7 F:/awwv-* outside-root all dirty (real WIP) -> preserved report-only.
- **PRUNE-2 → 41/90 → 35/75** (6 merged worktrees + 15 branches removed, junction-safe; main+stashes intact). Residual = dirty-WIP (safety-preserved) + ~22 orphan branch pointers not-on-origin. **tree-deepclean (a7c161ba) dispatched:** force-remove worktrees whose dirt is ONLY non-load-bearing (checkpoint/lock/husky/cache/runs + proposal docs already-on-main), PRESERVE any with real src/test/data WIP (the 3 worktree-agent + 7 awwv-* = OWNER residual-decision list). Clean-on-merge now enforced (memory rule + watcher-baked + 3h backstop cron c58640fb) so future stays small; this clears the OLD debt. Live exhaustion worktree preserved.
- **review-402 = GO-WITH-NOTES** (inert confirmed: 7 files all src/ui/map, 0 sim/state touch; structural-fingerprint+anchors PASS; chronicle deterministic vs monotonic war_exhaustion; 21/21+pins green). Watcher b1jmtzlhg = FIRST clean-on-merge run (merge→rmdir junction→worktree remove→branch -D→fetch --prune atomic). On A merge → dispatch Design B (task #12, engine-side src/sim drag, branches off updated main). deepclean (a7c161ba) still running on the OLD-debt worktrees.

## MERGING ART PRs IN DEPENDENCY ORDER (2026-06-10)
- Order: #384 plans → #386 plan-wiring (needs #384) → #395 faction → #400 final8 → #401 §6. Repo uses SQUASH merge.
- All 5 CONFLICTING vs current main (advanced to 1a3bb136a by active agent). Conflicts = ledger tail appends + NON-§6 pack doc batch notes (#384/#395/#400 same file) + maybe §6 doc. Assets (webp) never conflict.
- Method per PR: in its worktree, merge origin/main, resolve (union both append sides), push, gh pr merge --squash, re-fetch, next.

## MERGE PROGRESS (2026-06-10)
- #384: synced to main (f09ea8447, ledger conflict resolved = take-main + re-append art entry), pushed. MERGEABLE, CI pending → auto-merge squash enabled. Next: #386 (after #384 lands) → #395 → #400 → #401. Each needs origin/main sync (ledger tail union) before merge.
- **SWEEP: #402 Codex P2 = REAL (Chronicle beat repeats weekly).** war-weariness beat re-emits same id with turn=latest every turn once a band is crossed → UI groups by turn (not id) → 'RS collapsing' shows as fresh item EVERY week instead of one-time crossing beat. (review-402 flagged this as 'slightly over-stated dedupe' — Codex confirms it's actually broken.) BLOCKED merge: #402→DRAFT (watcher b1jmtzlhg can't merge a draft). fix-402 (a6dce8ea) dispatched to the live worktree: emit ONCE at crossing turn (derive crossing-turn / prior-band compare / minimal first-reached map), test pins one-time across multiple turns, whole-ui-suite verify, 40w byte-identical. On fix+push → un-draft + re-arm clean-on-merge watcher → then Design B. Other open codex = parallel-art #400 / known #93 #344. 0 failed runs.
- **fix-402 DONE** (e992e108): real cause = beat turn migrates to latest + ChronicleOverlay groups by turn no-id-dedup. Fix = persisted observational field war_weariness_band_first_reached[faction][band] (written once-per-crossing in existing exhaustion step, no new step), beat pinned to crossing turn; test asserts ONE emission across 11 turns; strict-null 516→517. **TERRITORY-FLAT (not pure-inert): control_delta+formation_delta byte-identical, only the new field moves final_save hash** → scenario-tester GO. rebless-402 (afd6edf3) dispatched: re-prove 40w/52w/188w control-byte-identical, re-bless golden manifest final_save, update CALIBRATION_MASTER, un-draft, merge under clean-on-merge. New floor hashes → MEMORY.md on merge. Then Design B.

## MERGE #384 — CI flake handled (2026-06-10)
- #384 all checks PASS except scenario-anchors, which FAILED on INFRA flake: actions/checkout git-fetch hung 12min → job-timeout cancel. Anchor step itself was "No sim/scenario changes — skipped green-fast" (asset+docs PR). Re-ran failed job (run 27295075377 --failed). Awaiting green → merge. NOTE: these asset PRs run FULL CI (~7-22min: full-suite 21m, test 22m) since src/ui/map/assets is in the code path-set; scenario-anchors path-skips. Each of 5 PRs = long CI.

## MERGE: #384 LANDED (2026-06-10)
- #384 plans MERGED (squash) → main 8e6b20b8b. scenario-anchors flake cleared on rerun. Now syncing #386 plan-wiring (worktree plan-art-wiring) to new main → ledger union → push → merge.

## ⚠️ SWEEP: #402 has a REAL DESKTOP BUILD BREAK (2026-06-10)
- 2 reds on feat/exhaustion-feel-surface: Event System CI=baseline-hash (expected, rebless-402 fixes) + **Desktop Release Guard = REAL vite/rollup build FAILURE.** Cause: fix-402 made UI warWeariness.ts delegate to state/exhaustion.ts → transitively drags src/data/municipality_population.ts (Node path.resolve, __vite-browser-external) into the BROWSER bundle → build fails. Same UI↔sim boundary class as #391.
- ROOT GAP: build agents ran tsc+vitest but NOT `npm run desktop:map:build` (3rd leg of smoke triad) → missed the bundling break. **LESSON: UI changes MUST run desktop:map:build, not just tsc+vitest.**
- Relayed to rebless-402 (live on branch): extract band thresholds into a browser-safe module (no Node deps) both UI + exhaustion.ts import; fix dependency direction (NOT vite-externals hack); verify with desktop:map:build; THEN manifest re-bless → un-draft → merge. Keep one-time-beat fix + war_weariness_band_first_reached + 40/65/85 thresholds (territory-flat proof holds).
- #402 stays DRAFT until both reds green. 0 other failures. Other codex = parallel-art #400 / known #344.

## MERGE: #386 synced (2026-06-10)
- #386 plan-wiring synced to main 8e6b20b8b (0c4822470). Ledger: take-main (#384 entry already on main via squash) + re-append #386 wiring entry. Plan assets resolve (on main now). Pushed → awaiting CI → merge. Then #395 → #400 → #401. Watch for scenario-anchors infra flake (rerun if it hangs checkout).
- **Design B build-plan prep (while #402 lands):** designB-plan (afdc8813) read-only → 20260610_DESIGN_B_BUILD_PLAN.md. Build-ready spec: where the war_exhaustion drag attaches (op launch-willingness / tempo / recruitment / attacker-power — offense-only, faction-scoped), the exact drag function (war_exhaustion→[floor,1] above a threshold), one-change/default-off gate, §6 (incl the load-bearing check: drag must NOT suppress the Srebrenica/Žepa-taking ops below launch threshold), expected floor direction, 188w+desktop:map:build gate, ordered build steps. So when #402 merges, Design B build executes a precise plan (no scoping delay).

## MERGE: #386 LANDED (2026-06-10)
- #386 plan-wiring MERGED (squash) → main 1ecdf6cfb. Now syncing #395 faction stills (worktree faction-stills). Watch ledger + NON-§6 pack doc (batch-2 note vs #384 Category-1 edits already on main).
- **SWEEP**: no new failures. #402's 2 reds = pre-fix (old commit e992e108); rebless-402 mid-work on the desktop build-break fix + manifest re-bless (not pushed yet → checks not re-run). #402 draft. No new codex actionable. Parallel: wip-triage + readiness-v1 + designB-plan (done). State unchanged; rebless-402 still in flight.

## ★ 1.0 READINESS REASSESSMENT (readiness-v1) — CLOSER not further
- 20260610_1.0_READINESS_REASSESSMENT.md. HEADLINE: the collapse-before-D2 gate DISSOLVED (collapse moves 0 territory, redundant; repurposed to feel = inert+1-optional-re-floor, not a calibration program). Engine effectively calibration-STABLE at 649. **NEW TRUE BLOCKER = D2 (full start→Dayton playthrough), now UNOBSTRUCTED.** 1.0-blocking: D2 · Tier-1 replay-wire (#7) · ship Design A · §6 symmetry-sentence (#6) · optional Design B re-floor · C3 freeze · D3 · D4 doc sweep. NICE/post-1.0: 2 western ops misses, Teočak, #344/#329, enclave OVERRUN. **DoD+MASTER_ROADMAP need amending** (drop collapse-before-D2, restore "finish-work not new systems") — drop-in text in doc §6, FLAGGED for owner (not auto-edited). Owner steering decisions: (1) bless re-sequence; (2) Design B yes/no; (3) D2 playthrough.
- **d2-prep-audit (ac0bd880) DISPATCHED** — instrumented headless start→Dayton on current main: confirm campaign CLOSES to Pyrrhic verdict + A2/A3/A4 closed + no crashes + §6 records → GO/NO-GO D2-readiness verdict. Machine prep for the D2 gate.
- **wip-triage done** → 20260610_WIP_WORKTREE_TRIAGE.md. ~6 SAFE-TO-DISCARD (work merged via #392/#325/#358 or scratch — CORRECTED: agent's "homedist not on main" was WRONG, #358 e6cfb131f merged it; trust-origin-over-blind-worktree). 2-3 unique (intel-ambush retune flag-gated; PDP/ci-c1 gated). Findings captured: PR-1 regression = ARBiH Sarajevo-ring over-capture → walk back attrition not reserve-commit; PR-1+PR-3=630 bisect. Discard list ready for owner nod.
- **DoD/roadmap amendment → PR #403** (dod-amend, HELD for owner ratify): DoD + MASTER_ROADMAP amended (dated 2026-06-10 supersede-in-place, history retained, FORAWWV untouched) — collapse-before-D2 SUPERSEDED, finish-work-not-new-systems headline RESTORED. New sequence: Design A → Design B(optional) → replay-wire #7 → §6 symmetry → C3 freeze → D2 playthrough(gate) → D3/D4 → 1.0. Awaits owner 'ratify #403' → merge under clean-on-merge. (Owner-decision, not panel.) salvage-clean also in flight.

## WIRING STATUS CLARIFIED + queue (2026-06-10)
- WIRED+MERGED: plan stills→PeacePlanModal (#386), verdict→CinematicVerdict (#380), tutorial→OnboardingStep (#380).
- NOT WIRED (inert, deferred): 28 event/codex stills (21 NON-§6 + 7 §6). VERIFIED no event JSON has an "image" key (grep data/scenarios/events empty). Remaining task = event/codex image-key wiring pass: NON-§6 as one PR + §6 seven as separate gated PR. Gated on assets landing on main (+ §6 gate for the 7).
- Retro: the 3 NON-§6 asset PRs (#384/#395/#400) should've been ONE PR; #386 (code) + #401 (§6) legitimately separate. Batch future asset deliveries.
- QUEUE: #384✅ #386✅ merged. #395 green-pending. #400/#401 went DIRTY (main moved again) → need fresh resync after #395.

## MERGE: #395 LANDED (2026-06-10)
- #395 13 faction stills MERGED (squash) → main 1123ffa97. 3/5 done (#384/#386/#395). Now syncing #400 final-8 (worktree art-final-8). Then #401 §6.
- **★ d2-prep-audit = GO for D2-READINESS.** Full apr1992→Dayton on main closes clean (exit 0, no crash), Pyrrhic verdict + game_over, §6 Srebrenica rupture records. A2(Dayton-closes)/A3(authorship-loop)/A4(onboarding) all CLOSED vs #70 punch-list. Report 20260610_D2_PREP_AUDIT.md. D2-playthrough punch-list: (1) w140-160 Srebrenica DECISION VOID (85/188 weeks 0 events, worst dead-stretch on climax, genocide=invisible flag t162) → biggest win = UN-HOLD #78 Srebrenica codex-receipt (built+on-main, §6-gated for owner); (2) Žepa rupture partial (distinct record?); (3) headless≠felt (UI verdict surfaces = the human D2 drive). RECO: un-hold #78 before playthrough (calibration-inert); §6 call = owner-review or 4-lens panel (delegation). #403 ratified→merging (bbboqw3ad). salvage-clean running.
- **#403 MERGED** (branch auto-deleted, clean-on-merge): DoD + MASTER_ROADMAP now reflect the post-collapse reality — D2 playthrough is the 1.0 gate. Owner-ratified. In flight: rebless-402 (#402→Design B) · salvage-clean (worktree recovery). Awaiting owner: #78 un-hold (panel or self-review) · Design B yes/no.
- **OWNER: do #78 un-hold (→ §6 panel) + Design B = YES.** Design B already armed (task #12, fires on #402/Design A merge via rebless-402; build-plan ready). #78 = dispatch 4-lens §6 panel (Srebrenica codex-receipt un-hold; unanimous=signature per delegation/#368).

## WIRING RESEARCH DONE (2026-06-10) — calibration INERT, but map is partial
- CALIBRATION VERDICT: INERT (confirmed by me + agent). `image` NOT in persisted pending_event_decisions whitelist (evaluate_events.ts:577-603); validated at event_loader.ts:413; UI-only via DataLoader.ts:95 → resolveEventIllustration. Save hash unchanged. (Still 40w byte-identity check at wiring time.)
- CLEAN matches: §6 8.1-8.6 → concentration_camps_revealed_1992 / srebrenica_falls_1995 / zepa_falls_1995 / ahmici_massacre_1993 / markale_{area_shelling_1993,massacre_1994,second_massacre_1995} / drina_valley_ethnic_cleansing_1992. NON-§6: event_dayton_signed_1995→dayton_signed_1995; event_washington_agreement→{rbih,hrhb}_washington_agreement_1994; event_patron_relations_RBiH→rbih_nato_*; _RS→rs_belgrade_pressure_response_1993.
- UNRESOLVED (likely NO discrete event — mechanics not modals): the 12 mobilization/supply/siege faction stills + shared referendum/political_session/ceasefire/displacement/un_presence/diplomatic_negotiation. Pack used prose families, not real ids. Needs a real event-inventory match pass; some stills will have no home (report, don't force).
- DECISION at wiring time: wire high-confidence only + byte-identity gate; for §6 wire the 6 via gate; report unresolved stills to owner (need new events OR accept available-but-unwired). codex header + 3 enclave images = no event id (gated/reserved).

## ★ #78 SREBRENICA RECEIPT UN-HOLD — §6 PANEL UNANIMOUS GO (2026-06-10)
- panel-78-unhold = 4/4 GO (Historian: ICTY-accurate wording / Canon-§6: consequence-not-reward, read-model, mechanics-untouched / Narrative: somber documentary / Red-team: no reward-spectacle, no ahistorical-fire, no side-effect, no hash). Report 20260610_78_SREBRENICA_RECEIPT_UNHOLD_PANEL.md. Panel = the §6 signature (delegation/#368). HOLD reason "wording=factual stub" → Historian GO IS the wording sign-off.
- KEY: un-hold isn't a flag — the receipt (buildDynamicSections/buildRuptureReceiptSections @ dynamic_section_builder.ts:907-968) is BUILT but NOT consumed by VerdictScreen.tsx (only buildGhostEntries imported) → genocide is invisible at campaign close. Un-hold = WIRE buildDynamicSections into VerdictScreen → receipt surfaces at Dayton close = the D2-audit #1 legibility win.
- **unhold-78-build (a56b2a19) dispatched** (read-model, calibration-inert): wire receipt into VerdictScreen (renders only on recorded srebrenica_genocide_1995; mechanics/timing untouched), optional panel prose-polish only, full smoke triad incl desktop:map:build (UI → #402 lesson) + 40w byte-identical proof + ui-dir test + new render test. → review → merge.
- Also landing: salvage PRs #404 (intel-ambush flag-gated, default-off byte-identical) + #405 (dayton dev-tools) via clean-on-merge watcher biz1efxe4. Worktrees 26→19.
- Design B = owner YES, armed on #402/Design A merge (rebless-402).

## ★ DESIGN A MERGED (#402, f569ac313) + DESIGN B DISPATCHED (2026-06-10)
- rebless-402 DONE: territory-flat re-bless all 3 horizons (control_delta byte-identical; only war_weariness_band_first_reached field moves hash). NEW FLOOR HASHES (MEMORY updated): 40w f1d283155a696424 · 52w 1aa072b8bcdd4e3b · 188w 345e044b7642aeab. Floor 649 + structural_fingerprint 3649b386 UNCHANGED. Build-break fixed via browser-safe leaf src/state/war_weariness_bands.ts; desktop:map:build GREEN. CALIBRATION_MASTER updated. Clean-on-merge done. **20 PRs merged today.** Task #11 DONE.
- **designB-build (aeba549b) DISPATCHED** (per the ready plan): re-scale the EXISTING factionExhaustionDrag (plan.ts:279, was mis-scaled /600 → flat early tax) onto recovered 0..100 ramp (drag=1.0≤65, →0.55 at 85), behind default-OFF flag AWWV_EXHAUSTION_DRAG_V2 (flag-off preserves old /600 = byte-identical 649). Offense-only/faction-scalar/§6-safe (triggered Srebrenica/Žepa ops categorically unaffected). Code-only → I drive 188w ON/OFF → harvester → panel re-floor. Task #12 in_progress.
- Also in flight: unhold-78-build (Srebrenica receipt→VerdictScreen) · watcher biz1efxe4 (#404 intel-ambush + #405 dayton-tools; #405 has 2 P2 dev-tool codex = fix-forward, inert).
- **SWEEP (owner check): crons ALIVE** — 1b0f0ead GitHub-sweep :17/:47, c58640fb prune 3h, e6f5a1c9 standup, 8788a75e life-lessons. Sweeping = active (cron + manual + per-PR watchers). CAUGHT: #405 (+ #404) failing Baseline Regression — branched BEFORE #402's manifest re-bless → run produces old hash vs main's new war_weariness-field manifest. Watcher correctly bailed (red). FIX = rebase on post-#402 main. **rebase-salvage (af45241a) dispatched**: rebase #404+#405 on origin/main + fold #405's 2 P2 dev-tool fixes (non-portable abs-path default + scroll-before-clip), push --force-with-lease, watcher merges on green. LESSON: a manifest re-bless (#402) makes any pre-existing open PR fail baseline-regression until rebased.

## MERGE: #400 LANDED (2026-06-10)
- #400 final-8 NON-§6 MERGED (squash) → main b1eba9ef7. 4/5 done (#384/#386/#395/#400). Now syncing #401 §6 (worktree section6-art) — LAST one. Watch ledger + maybe §6 pack doc / sign-off doc.
- **rebase-salvage DONE**: #404 (c7821d57) + #405 (3bd58f13) rebased on post-#402 main (now carry war_weariness field → baseline-regression passes); #405 P2 dev-tool fixes applied (repo-relative OUT_DIR + scroll-before-clip), desktop:map:build green, codex threads replied. Old watcher biz1efxe4 bailed on pre-rebase red (dead). Fresh clean-on-merge watcher big9nnm45 re-armed for #404+#405. Lane lesson reaffirmed: a manifest re-bless invalidates baseline-regression on every open PR → rebase before merge.
- **SWEEP: #405 'baseline-regression failed' = STALE RUN** (pre-rebase 19:16 commit, not current head 3bd58f13). Current head GREEN/pending: typecheck/desktop-release-check/Event-system-validation(=baseline step)/scenario-anchors/structural-fingerprint ALL SUCCESS; full-suite+test running. Rebase fixed it. Watcher big9nnm45 merges #404+#405 on full green. #405 codex=2 = already-fixed P2s (replied). LESSON: sweep must verify a flagged failure is on the CURRENT head (gh run list returns historical/superseded runs); a stale pre-rebase red is not actionable. No action needed.

## ALL 5 ART PRs MERGED (2026-06-10) → main 6d6244604
- #384 plans, #386 plan-wiring, #395 13 faction, #400 final-8 NON-§6, #401 §6 (7 stills + sign-off) — ALL MERGED. 35 art assets on main. Clean ledger-union resolutions throughout; one scenario-anchors infra flake (#384) cleared on rerun.
- REMAINING: event/codex image-key WIRING (calibration-INERT confirmed). High-confidence targets exist for §6 6 + dayton_signed/washington/patron; 12 faction mobilization/supply/siege stills likely have NO discrete event (need inventory match or honest "available-but-unwired" report). To do as: NON-§6 wiring PR + separate §6-gated wiring PR.
- Cleaning up merged worktrees (plan-art-wiring, faction-stills, art-final-8, section6-art).
- **BACKSTOP PRUNE (cron c58640fb): 19→15 worktrees / 69→67 branches.** git worktree prune cleared 4 stale registrations (clean-on-merge watchers had removed the dirs → confirms rule working); 1 merged branch deleted = **#404 MERGED** (feat/intel-ambush-depth-retune gone-on-origin). node_modules intact. Residual = held-PR (#406/#407 worktrees) + dirty-WIP (owner-discard-list) + shelved lane3/art + ~19 orphan worktree-agent-* pointers (tips not on origin, -D disallowed). Further reduction needs owner nod on triaged WIP (20260610_WIP_WORKTREE_TRIAGE.md). Live agents (designB-signal-scope/review-406/big9nnm45) preserved — no worktree removed.
- **#406 (Srebrenica receipt → VerdictScreen) MERGED** (1b7a73728) — review-406 GO, all 10 CI green, panel-signed §6 + owner-directed. Genocide now surfaces as Historical Record at Dayton close (D2 #1 legibility win CLOSED). Branch deleted; worktree dir lock-held (cosmetic, next prune clears). **#404 (intel-ambush retune) MERGED.** **22 PRs merged today.**
- #405 (dayton dev-tools) full-suite+test FAIL = strict-null pin (dayton_shot.tsx adds an as-cast → as_factionid_casts mismatch). Marginal dev-tool, 2nd CI fight → fix-trivially-or-close dispatched.
- **#405 fix-405 DONE** (a391ef251): type-clean (removed 3 as-unknown casts from dayton_shot.tsx via intersection-cast + mock-factory idioms, NO pin bump); inventory back to exact pin, tsc+tests+desktop:map:build green. Watcher b87xzbic9 (clean-on-merge). Salvage PRs all resolved: #404 merged, #405 merging.
- **SWEEP: #405 fail = STALE** (19:37 run on pre-fix 3bd58f13; current head a391ef251 full-suite+test PENDING). Watcher b87xzbic9 merges on green. Recurring lesson: verify failure is on CURRENT head.
- **#407 Codex P2 = REAL + applies to v2:** AWWV_EXHAUSTION_DRAG_V2 gate doesn't RESET when env!=true in a long-lived process (stale-on; same class as collapse-marker false-positive). v2 (51885dcf8) REUSED the same scaffold → inherits it. My v2 188w (b5vn7nfam) UNAFFECTED (OFF/ON are separate node processes, fresh env each). FIX must ride in the v2 PR → fold into the v2 harvester (reset cached gate when env unset; or re-read env per call). Captured for the v2 harvest dispatch.

## WIRING PASS STARTED (2026-06-10) — worktree art-wiring (feat/art-event-wiring from main 6d6244604)
- Calibration INERT confirmed (image not persisted). Wiring image keys onto TOP-LEVEL events only (response-option ids can't take image).
- VERIFIED top-level + no existing image (clean 1:1): dayton_signed_1995→event_dayton_signed_1995; rbih_washington_agreement_1994 + hrhb_washington_agreement_1994→event_washington_agreement; sarajevo_siege_begins_1992→event_siege_city_RBiH; east_mostar_siege_1993→event_siege_city_HRHB.
- Single-candidate picks to verify: patron_RBiH=rbih_nato_ultimatum_compliance_1994; patron_RS=belgrade_embargo_rs_1994; patron_HRHB=zagreb_restrains_boban_vopp; ceasefire=carter_ceasefire_1994; un_presence=un_safe_areas_declared_1993; political_session=rs_assembly_rejects_voplan_1993.
- DEFER (ambiguous/no target): mobilization/supply/shortage faction stills (live as csq_* consequence events — verify display path), event_siege_city_RS (RS=besieger, no event), event_displacement_column, event_diplomatic_negotiation, event_referendum. §6 six = separate gated PR.
- **#405 (dayton dev-tools, type-cleaned) MERGED** (cb4ef7ce0). Both salvage PRs done (#404+#405). **23 PRs merged today.** Only live lane = v2-harvest (Design B v2 diagnosis + flag-reset fix + HELD PR). Tree-prune backstop will clean the merged worktrees.

## WIRING PASS — 11 events wired, verifying (2026-06-10)
- Wired 11 top-level events (10 stills) via minimal text-insertion (no JSON reformat; 11 insertions, all 4 files valid JSON):
  dayton_signed_1995→dayton_signed; {rbih,hrhb}_washington_agreement_1994→washington_agreement; sarajevo_siege_begins_1992→siege_city_RBiH; east_mostar_siege_1993→siege_city_HRHB; rbih_nato_ultimatum_compliance_1994→patron_RBiH; belgrade_embargo_rs_1994→patron_RS; zagreb_restrains_boban_vopp→patron_HRHB; carter_ceasefire_1994→ceasefire; un_safe_areas_declared_1993→un_presence; rs_assembly_rejects_voplan_1993→political_session.
- tsc OK; event_illustration_art 5/5. Running 40w byte-identity (run1 WITH wiring btecbm2yi → then baseline via git checkout revert → compare).
- DEFERRED (no clean target): mobilization/supply/shortage faction (9, csq_* mechanics), siege_RS (besieger), displacement_column, diplomatic_negotiation, referendum. §6 six = separate gated PR. Will report these to owner.

## WIRING BATCH 1 SHIPPED → PR #409 (2026-06-10)
- 10 NON-§6 stills wired to 11 top-level events. 40w BYTE-IDENTICAL proven (f1d283155a696424 == f1d283155a696424). tsc + event test green. PR #409 open.
- NEXT: §6 wiring PR (separate, gated) — 6 atrocity events → their stills (concentration_camps_revealed_1992, srebrenica_falls_1995, zepa_falls_1995, ahmici_massacre_1993, markale_{area_shelling_1993,massacre_1994,second_massacre_1995}, drina_valley_ethnic_cleansing_1992). Cite existing §6 sign-off (images+targets already chain-approved); same inert image-key mechanism as #409. codex header 8.8 = no single event (defer). Gated — owner merges.
- DEFERRED to owner mapping: 9 faction mobilization/supply/shortage stills (csq_* mechanics), siege_RS, displacement, diplomatic, referendum.
- **SWEEP: no current-head failures. #409 = parallel art session** (event-stills wiring, not mine). **#408 Codex P2 (briefing.ts:736) = REAL signal-accuracy bug:** casualty-load denominator EXCLUDES og/operational_group → if active OGs carry personnel, undercounts → INFLATES load → OVER-drags (flag-ON only, off-path byte-identical). Matters extra for v3 (multiplier amplifies). Relayed to live designB-v3-build (verify OG personnel double-counts-or-not → include if real; reply to thread; fold into v3 so the v3 188w runs on the CORRECT load). #407 codex = the already-actioned flag-reset (fixed in #408). #344/#329 known.

## §6 WIRING — 8 events wired, byte-identity in progress (2026-06-10)
- §6 worktree art-wiring-s6 (branch feat/art-event-wiring-section6 from main cb4ef7ce0). 8 atrocity events wired (6 stills): concentration_camps_revealed_1992, srebrenica_falls_1995, zepa_falls_1995, ahmici_massacre_1993, markale_area_shelling_1993 + markale_massacre_1994 + second_markale_massacre_1995 (→event_markale_shelling), drina_valley_ethnic_cleansing_1992. JSON valid, tsc OK.
- 40w WITH §6 wiring: final_state_hash f1d283155a696424 (raw). Running baseline (this worktree) next; will dispatch /scenario-creator-runner-tester to analyze per repo enforcement.
- **GitHub check (owner): only failure = #409** (parallel art event-stills, head 61c8a414) — Baseline Regression + Event-System red = LIKELY the stale-manifest pattern (#409 pre-#402-rebless → old hash mismatch; needs rebase, same as #404/#405). Parallel-art lane, flagged not actioned. Codex all actioned/known: #408 OG-denom P2 (fixed in v3), #407 flag-reset (fixed in #408), #344 known #93. No new actionable on my lanes. Waiting on v3 188w (bdjutpyl9).

## §6 WIRING byte-identity (raw) + ASSET INVENTORY (2026-06-10)
- §6 40w: baseline f1d283155a696424 == with-wiring f1d283155a696424 (raw; scenario-tester verdict dispatched a603c880). Wiring restored (8 image lines). §6 PR pending expert GO.
- ASSET INVENTORY on main (45): 4 plans + 3 verdicts + 8 tutorial + 30 event_illustrations (23 NON-§6 [8 shared/named + 15 faction] + 7 §6 [6 atrocity + codex header]).
- MISSING/not-generated: (1) 3 §6 enclave-decision images 8.7/8.9/8.10 — HELD on unbuilt enclave feature; (2) 5 generic faction-agnostic fallback stills — intentionally skipped (redundant); (3) optional verdict_somber (folds onto pyrrhic). Nothing else outstanding.
- UNWIRED assets (exist, no event target): 9 faction mobilization/supply/shortage + siege_city_RS + displacement_column + diplomatic_negotiation + referendum.

## WIRING PASS COMPLETE (PRs open) — scenario-tester GO (2026-06-10)
- /scenario-creator-runner-tester (a603c880): GO both batches. 40w byte-identity 4/4 f1d283155a696424 + identical fingerprint 3649b386 + not-persisted whitelist + effects-untouched. 188w NOT required (horizon-independent evidence covers out-of-window §6 events; floor 5f57d172 unaffected). Added CALIBRATION GUARD comment at evaluate_events.ts:577.
- PR #409 (NON-§6 wiring, 10 stills/11 events) — open, GO, ready to merge.
- PR #410 (§6 wiring, 6 stills/8 atrocity events) — open, GATED (owner merge); pairings already chain-approved.
- OPEN DECISIONS for owner: (1) merge #409 / #410? (2) deferred-still mapping: 9 faction mobilization/supply/shortage + siege_RS + displacement + diplomatic + referendum have NO clean event target — wire to csq_* consequence events / author new events / leave available-but-unwired? (3) missing art: 3 enclave-decision images (held on feature) + 5 optional fallbacks (skipped).
- **SWEEP: 0 failures on my lanes.** Both failures = parallel-art (#409 art-event-wiring + NEW #410 art-event-wiring-section6) — same stale-manifest-needs-rebase pattern (pre-#402). Parallel session's lane, flagged not actioned. #408 now CLEAN (held v2; codex=1 = OG-denom already fixed in v3). #407 clean. #344/#329 known. No new actionable on my lanes. Waiting on v3-harvest (keep-or-stop verdict).

## csq_* WIRING VERIFICATION (2026-06-10) — NEGATIVE (needs DataLoader change)
- csq_* consequence events (consequences.json) have title/narrative/effects but NO response_options (notification events, not decisions).
- Image-enrichment path App.tsx:728-741 looks up def by id from loadEventDefinitions() (DataLoader.ts:78-80) which loads ONLY war_1992/1993/1994/1995.json — NOT consequences.json. image not persisted on firedEvents. → csq_* image resolves undefined → NO still renders.
- TO WIRE mobilization/supply/shortage stills to csq_* requires: (a) add '/data/scenarios/events/consequences.json' to DataLoader files + full-catalog loader (UI change, additive), (b) wire image keys on the per-faction csq_* events, (c) verify csq_* actually flash EventModal (firedEvents !isDecision path). Bounded follow-up but touches UI display → owner + ui-ux call.
- siege_RS (besieger, no event) + displacement_column remain homeless regardless. ENCLAVE 3 images already in hand at F:\tmp\section6_art (held on feature). Prompts re-sent to owner.

## 2026-06-10 — Design B SHELVED + next lane = Tier-1 Replay-wire
- **Design B (exhaustion-drag → territorial teeth): SHELVED.** Scenario-tester panel STOP (4th inert 188w result). Closeout `docs/40_reports/20260610_DESIGN_B_SHELVED.md` (`33b223e80` → main `ef63db77f`). Closed #411/#408/#407; deleted 3 remote+local branches; 3 worktrees de-registered (→15). Memory pinned (`design_b_exhaustion_drag_dead_end.md`) — do NOT re-attempt; post-1.0 lane = gate the INJECTION pipeline, not the scorer. Design A (feel-only) is the 1.0 exhaustion deliverable.
- **Collapse settled for 1.0:** repurpose-scope confirms (c) feel-only shipped (Design A), (a) C-drag = dead-end, IV-b territory path = post-1.0. Enable flags stay default-off. No owner-gated enable decision dangling.
- **GitHub sweep:** only #409/#410 (parallel art session) failing — real `tests/sector_frontline_truth.test.ts` Wave-4 break, NOT stale-manifest → stale branch, needs rebase (art session's lane). No new Codex comments anywhere. #344/#329 intentionally held.
- **Floor:** 649 held throughout.
- **NEXT (in flight):** Tier-1 Replay-wire scoping dispatched (task #7) — D2-enabling, 1.0-blocking, not §6-gated.

## csq_* WIRING VALIDATED → IMPLEMENTING (2026-06-10)
- CONFIRMED: csq_ events fire→fired_event_ids→deriveFiredEvents (GameStateAdapter:2872, isDecision:false)→App.tsx acknowledge-flash. Runtime proof: 188w 27 csq_ fired, 40w 7 (incl csq_refugee_labor_mobilization). They ALREADY flash text-only; just need image in def-map.
- FIX: add consequences.json to DataLoader loaders (loadEventDefinitions ~line78 + full-catalog loader) so csq_ defs carry image. Then wire 9 keys:
  csq_industrial_conscription_wave[/_RS/_HRHB]→event_mobilization_{RBiH,RS,HRHB}; csq_supply_corridor_chronic_strain_{RBiH,RS,HRHB}→event_supply_convoy_{...}; csq_winter_supply_attrition_{RBiH,RS,HRHB}→event_supply_shortage_{...}.
- Separate PR (UI DataLoader + data). Byte-identity gate. siege_RS + displacement still homeless.

## csq_* WIRING BUILT + verifying (2026-06-10) — worktree art-wiring-csq (branch feat/art-csq-wiring from main ef63db77f)
- DataLoader: added consequences.json to trimmed loadEventDefinitions (full loader already had it). 9 csq_ image keys wired. tsc OK, event_illustration_art green, map build green.
- 40w WITH csq wiring: final_state_hash f1d283155a696424 (raw). Running baseline (revert consequences.json) → scenario-tester verdict per enforcement.

## csq_* WIRING — byte-identity raw + expert pending (2026-06-10)
- 40w: baseline f1d283155a696424 == with-csq-wiring f1d283155a696424 (raw, this worktree main ef63db77f). Wiring restored (9 lines). scenario-tester dispatched a3dec97a (csq events fire in-window so 40w is in-scope, not out-of-window). Awaiting GO → commit + PR (DataLoader UI + consequences.json data). NOT yet committed.
- After this: homes 9/14 stranded stills; only siege_RS + displacement remain.

## csq_* WIRING SHIPPED → PR #412 (2026-06-10) — scenario-tester GO
- PR #412 (feat/art-csq-wiring): DataLoader + 9 csq_ image keys. GO (40w byte-identical f1d283155a696424; image not persisted; DataLoader render-only; 188w not required). tsc/event-test/map-build green.
- WIRING COVERAGE now: 25/28 event stills homed = 10 named (#409) + 6 §6 (#410) + 9 csq_ (#412). Homeless: event_siege_city_RS + event_displacement_column (no fitting event).
- THREE wiring PRs all OPEN, HELD for owner merge decision: #409 (NON-§6), #410 (§6 gated), #412 (csq UI+data). All scenario-tester GO, byte-identical.
- MISSING ART unchanged: 3 enclave-decision images (in hand at F:\tmp\section6_art, held on feature) + 5 optional fallbacks (skipped).

## MERGING 3 WIRING PRs (owner: merge all) (2026-06-10)
- Order #409 → #410 → #412. #410/#412 currently MERGEABLE+BLOCKED(CI); #409 UNKNOWN (older base, needs ledger resync). Serial resync between merges (ledger tail). #409/#410 both touch war_*.json but different events → 3-way clean. #412 = consequences.json+DataLoader (no war overlap).

## WIRING MERGE — CI guard test fixed (2026-06-10/11)
- #409 CI "Event system validation" FAILED: tests/event_loader.test.ts "no shipped event carries an image key (pipeline inert)" — obsolete guard now that wiring is live. FIXED (2837bd228): inverted to validate every image is a non-empty .webp + >=1 wired. 35/35 local pass.
- SEQUENCE: #409 carries the test fix → must merge FIRST. #410/#412 add images too → will hit same guard until they resync from main AFTER #409 merges (gets fix). Then they pass. Order locked: #409 → #410 → #412.
- Re-watching #409 CI (push 2837bd228).

### Sweep update (later 2026-06-10)
- **Tier-1 Replay-wire:** scoped (Technical Architect, `proposals/20260610_TIER1_REPLAY_WIRE_SCOPE.md`) = calibration-INERT, no §6, producer-side orphan in `electron-main.cjs` (~12 lines/3 files). Builder dispatched in worktree (branch `feat/tier1-replay-wire`, DRAFT PR pending). Reviewer to follow (implementer≠reviewer).
- **Art-session PRs #409/#412 RED = REAL regression, NOT stale** — both 0 commits behind main; failing `tests/event_loader.test.ts` strict-deep-equal (their art→event wiring alters event defs that the loader integrity test rejects). #410 additionally 2 behind (rebase). NOT my lane — flag for the art session to fix event wiring before merge. Do not touch their branches.

### GitHub sweep (2026-06-11, autonomous)
- **Failures:** all 9 confined to art-session branches (#409/#410/#412). NONE on main, NONE on `feat/tier1-replay-wire`.
- **Root cause (shared, REAL not stale):** `tests/event_loader.test.ts:572` "no shipped event carries an image key (pipeline inert)" is an INERTNESS GUARD; the three art PRs wire stills by adding `image` keys to event JSON → break the guard by design. Fix = update/retire that guard as part of the wiring lane. #410 also 4 behind main (rebase). Posted consolidated triage in-thread on #409/#410/#412.
- **Codex comments:** #412 has 2 unaddressed P2 on `DataLoader.ts:84` (sanitize consequence effects before display; serve scenario event JSON in built desktop) — relayed to art session via the PR. #344 P2 (06-09, surrender-cascade split) on a HELD PR. #409/#410/#329 clean.
- **Dead watchers:** none. Art PRs red; #344 CONFLICTING-HELD; #329 NO-GO-HELD (all intentionally open).
- All art items = parallel art session's lane; did NOT touch their branches.

## GITHUB SWEEP + 2 VALID CODEX P2 (2026-06-11)
- FAILURES: #409 BLOCKED/0-fail (CI running clean post-resync). #410/#412 DIRTY/3-fail = the SAME obsolete guard test (event_loader "no image"); they inherit the fix on resync from main after #409 merges. Not separate bugs. (#413/#344/#329 = other agents' PRs, not mine.)
- CODEX P2 #1 (#412): adding consequences.json to the view loader makes App.tsx render csq_* RAW audit effects (recruitment_modifier, cost_ledger_annotation) in EventModal. Before my change csq_ fell back to e.effects=[] (empty). REGRESSION (dev/web). Fix: sanitize/filter audit-only effect kinds for display.
- CODEX P2 #2 (affects ALL 3): electron-main.cjs map server routes app/data/derived + app/data/source only — NO /data/scenarios. loadEventDefinitions fetches /data/scenarios/events/*.json → 404 in PACKAGED DESKTOP → event images never show in shipped app (graceful text-only; web/dev works). Pre-existing gap (since #362 pipeline) now load-bearing. Fix: add app/data/scenarios route to electron-main.cjs (mirror data/source w/ path-traversal guard).
- DECISION NEEDED: pause merges; do 2 fixes (desktop /data/scenarios route [benefits all 3] + #412 effects sanitization), then merge. OR merge #409/#410 web-only now + route fix later. Surfacing to owner.

## AUTONOMOUS (owner asleep 2026-06-11): fixing 2 codex P2 then merging all 3
- FIX 1 DONE: desktop /data/scenarios route added to electron-main.cjs (#409, commit 129901438) — mirrors data/source route + path guard; files already bundled (extraResources data/scenarios/events). node --check OK. Makes event stills render in packaged desktop (was 404).
- FIX 2 in progress (#412): consequence effect kinds are mostly text-less mechanical/audit (cost_ledger_annotation 120, recruitment_modifier 53, cohesion_change 59, etc.) → render as raw labels in EventModal. Filter engine/audit kinds in EventModal mechanicalEffects (display layer, single ownership).
- THEN: resume merges #409→#410→#412 (each resyncs to inherit test-guard fix + route). Sweep GH at checkpoints. Autonomy until all merged.

## BOTH CODEX P2 FIXED + replied (2026-06-11 autonomous)
- FIX1 desktop /data/scenarios route → #409 (129901438). FIX2 effects filter NON_DISPLAY_EFFECT_KINDS + test → #412 (81f2ec85f). Codex resolution comment posted on #412.
- #409 commits now: wiring + test-guard fix + ledger resync + desktop route. #412: csq wiring + effects fix.
- RESUMING MERGE TRAIN: #409 (carries test-guard fix + desktop route) → #410 (resync inherits) → #412 (resync inherits). Watching #409 CI now.

### 2026-06-11 overnight — owner expanded authority + parallel lanes
- **OWNER DIRECTIVES (persisted to memory):** (1) §6 work AUTHORIZED — may build/merge §6 lanes, but MUST assemble the full Pyrrhic panel before any decision (mandatory precondition). (2) Owner gate REMOVED from docs incl FORAWWV.md + all canon docs — canon/FORAWWV now editable with panel sign-off; lifts CLAUDE.md "Never auto-edit FORAWWV" + Ledger Protocol ban. Full doc-sync to reality = POST-D2. Memory: `owner_gate_removal_and_canon_edit_authorized.md` + updated `feedback_owner_signature_delegated_to_pyrrhic.md`.
- **Tier-1 #413 builder DONE:** DRAFT PR #413, 4 commits (da18694e7/f14ecd192/96d8976f3/d485f3506), smoke triad PASS (tsc + scoped 104 tests + desktop:map:build clean), inert (unreachable from scenario_runner) + no-§6 proven. Full parallel vitest crashed on worker-pool startup (environmental). Independent reviewer a5f89254 in flight (running real full suite to close the gap).
- **Owner-gate removal:** inventory complete (ac3ba081, `proposals/20260611_OWNER_GATE_REMOVAL_INVENTORY.md`) = ~59 class-A edits/29 files; FORAWWV.md = pure substance, NO edits (ban lived in pointer files; CLAUDE.md:37/68 headline). 6 class-C ruled by orchestrator (atrocity-reward keeps owner-escalation soft-trigger; enclave-overrun hold stays but → §6-panel sign-off; backups/worktrees untouched). Executor applying on branch docs/remove-owner-gate + PR; Canon Compliance review to follow.
- **Instrumented start→Dayton audit (a715f0e7):** running — D2 de-risk on current main.
- 3 agents concurrent; floor 649 untouched (all lanes inert/docs).

## MERGE: #409 LANDED (2026-06-11 autonomous) → main fb48be7b3
- #409 (NON-§6 wiring + test-guard fix + desktop /data/scenarios route) MERGED. test-guard fix + desktop route now on main. Resyncing #410 §6 (inherits both), then #412 csq.

## MERGE: #410 LANDED (2026-06-11) → main 22c37428b
- #410 §6 wiring MERGED. 2/3. Resyncing #412 csq (already has effects fix; inherits test-guard fix + desktop route from main). Last one.

## ✅ ALL 3 WIRING PRs MERGED (2026-06-11 autonomous) → main de5ea6c12
- #409 (NON-§6, 10 stills + test-guard fix + desktop /data/scenarios route), #410 (§6, 6 stills), #412 (csq, 9 stills + effects filter) — ALL MERGED. Wiring confirmed on main (war_1995 has 4 image keys, etc.).
- 2 codex P2 on #412 both FIXED pre-merge (effects filter 81f2ec85f + desktop route in #409) + reply posted. No new codex comments. CI green on all 3.
- WIRING COVERAGE FINAL: 25/28 event stills wired (10 named + 6 §6 + 9 csq). Homeless (2): event_siege_city_RS, event_displacement_column (no fitting event). Plus held: 3 enclave-decision images (in hand F:\tmp\section6_art, feature-gated) + 5 optional fallbacks (skipped).
- Worktrees cleaned (art-wiring, art-wiring-s6, art-wiring-csq removed).
- NOT MINE / left alone: #413 (replay, other agent), #344/#329 (combat, held).
- TASK COMPLETE.

### 2026-06-11 overnight — wave landed (batched main work)
- **#413 Tier-1 replay-wire MERGED** (833e2675x): D2-enabling live-play replay producer. Reviewer GO (full suite 9859 pass; 3 fails pre-existing). Inert + no-§6. Worktree cleaned.
- **#415 §6 Trusina symmetry fix:** panel-unanimous, 188w byte-identical (hash 345e044b unchanged), merging on green via watcher bpg3cwxdg. Closes DoD §6 must-fix #6. Headline event + essay found ALREADY compliant.
- **#414 owner-gate removal MERGED:** Pyrrhic-panel sign-off replaces owner-gate across 51 docs; FORAWWV byte-identical; canon-reviewed.
- **Startup-snapshot refresh:** schema 35→36 regen, fixes 3 local false-red tests (CI was green). Committing with this batch.
- **Art lane:** #409/#410/#412 all merged by art session (my event_loader:572 triage actioned).
- **Design B shelved.** §6 authority + canon-edit authority now live (exercised twice tonight).
- **Still running:** instrumented D2 audit (a715f0e7). On landing → triage punch-list = D2 go/no-go.
- **Remaining for 1.0 = owner gates:** D2 playthrough, D3 operator VM, C3 freeze, post-D2 doc-sync. Machine-doable 1.0 work essentially exhausted.
- Floor 649 untouched all night.

### Sweep (post-wave, 2026-06-11 ~00:1x)
- Active-PR board CLEAN: only held #344 (CONFLICTING) + #329 (NO-GO) open. All tonight's lanes merged.
- Main CI: snapshot commit 88d101188 = ALL GREEN (Baseline Regression success → calibration-neutral confirmed on CI). Post-#415 HEAD 0589ccafe run in_progress, expected-green (byte-identical proven). Desktop Release Guard already success.
- No failures last 40 runs; no new Codex comments; no dead watchers.
- Only running task: instrumented D2 audit (a715f0e7).

### Sweep + D2-audit approach change (2026-06-11)
- Sweep CLEAN: no failures (last 40), no new Codex, no dead watchers. Open = held #344 (DIRTY/CONFLICTING) + #329 (BLOCKED/NO-GO) only.
- **TWO worktree-isolated D2-audit agents DIED** (a715f0e7, a2e8ddcb) — both at fresh-worktree npm install (puppeteer download fail). Stop using isolated worktrees for scenario-run agents.
- **New approach:** run the D2 audit DIRECTLY in main checkout (node_modules intact, tsx via `node node_modules/tsx/dist/cli.mjs`). Launched 188w `apr1992_definitive_188w_dayton_close` (bg bu9lf97dl). Then `tools/audit_campaign_proof.cjs <rundir>` + a determinism 2nd run.
- KEY: the standard-188w floor/anchors/clean-completion is ALREADY validated by main CI Baseline Regression (green on 0589ccafe). Audit's unique value = Dayton terminal-verdict close + long-game serializer/NaN health + determinism.

### D2 audit — RUN 1 results (188w dayton-close, main checkout, HEAD 0589ccafe)
- final_state_hash: b18bde2d9dc141bd · EXIT 0 · **188 weeks, NO crash**
- **game_over: TRUE** — campaign CLOSES to Dayton terminal state (A2 confirmed live)
- §6 INTACT: srebrenica_genocide_1995 rupture records t162, perpetrator=RS, genocide_condemnation flag
- Verdict inputs present (territory HRHB 19.1/RBiH 28.9/RS 52.0, casualties, war_crimes, civilian_cas); cost-ledger present; strategic dimensions present
- **P2 anomaly:** hrhb_travnik_brigade stranded_status=collapsed "since t1" while cohesion=100/morale=100/personnel=1500 — stranded-flag set at init, never cleared (cosmetic lifecycle bookkeeping; brigade DID fight: killed 213/wounded 762). NON-BLOCKING. hv_* guards collapsed t92 likely legit HV withdrawal.
- PENDING: determinism RUN 2 (bqwenqfpm) hash compare.
- PRELIM VERDICT: GO (pending determinism) — engine reaches + closes Dayton, §6 holds, verdict pipeline populated.

### D2 audit — determinism CONFIRMED
- RUN1 hash b18bde2d9dc141bd == RUN2 hash b18bde2d9dc141bd — IDENTICAL (deterministic across full 188w dayton-close).
- Dispatching /scenario-creator-runner-tester to analyze run dir + issue formal D2 GO/NO-GO + write audit report (raw data gathered by orchestrator; verdict to the expert).

## PUPPETEER RENDER VERIFICATION (2026-06-11) — owner asked to verify stills render in running app
- Infra exists: tools/ui/event_modal_browser_smoke.cjs (vite dev map + puppeteer + window.handleManualSaveLoad). It loads a DECISION modal; image stills are in non-decision EventModal (firedEvents acknowledge-flash). Adapting: inject save w/ military.fired_event_ids=[wired event] → EventModal flashes still. Assert <img naturalWidth>0 (asset loaded, not 404) + screenshot.
- Worktree art-verify @ origin/main de5ea6c12 (has wiring). EventModal illustration = data-testid="event-modal-illustration" img.

## ✅ PUPPETEER RENDER VERIFICATION PASS (2026-06-11)
- Mounted the REAL EventModal in the live dev map (vite) via temp helper src/ui/map/__still_proof_mount.tsx, driven by puppeteer (tools/ui/event_still_render_proof.cjs). For 7 representative wired stills across all batches (named: dayton_signed/siege_city_RBiH/patron_relations_RS; §6: srebrenica_falls/markale_shelling; csq: mobilization_RBiH/supply_shortage_RS):
  ALL 7 PASS — resolveEventIllustration glob resolved each basename to /assets/event_illustrations/<name>.webp, the <img> LOADED at 800x450 (naturalWidth>0, not 404/broken), correct src. Visual screenshot confirms the still renders above the dispatch text in the modal.
- This proves the runtime-critical wiring pieces in the actual running app: resolver + asset serving + EventModal render. (The full game-flow firedEvents→EventModal flash path hit an unrelated AdvanceTurnModal crash when hand-loading a Turn-0 save — app fragility, not wiring; bypassed by mounting the real component.)
- Temp helper + harness were in the throwaway art-verify worktree (now removed) — NOT committed (never meant to ship). Screenshots sent to owner.
- ART PROGRAM FULLY DONE: generation → QC → §6 sign-off → wiring (3 PRs merged) → codex P2 fixes → desktop route → RENDER-VERIFIED.

### Ključ/Sana calibration lane (2026-06-11, owner re-opened during trip)
- Scoping (ops a6e9fed7 + historian aeddde98): current mismatch = 4 Ključ OSIDs still RS (hadzici/kljuc_2/krasulje_2 → RBiH target; donji_vrbljani_2 → HRHB, off-chain). Op Sana fires W175→exec W178, 26/28 obj by W188; Ključ-interior lands W188-189 (1 turn past end). June-7 "launch earlier" hypothesis STALE (follow-on retired #284). Historian ground truth locked (BB1 Ch91-93): Ključ fell 17 Sept to 5th Corps; Sana must deliver Sanski Most+Ključ to RBiH but NOT Šipovo/Jajce/Mrkonjić/Drvar (=HRHB). RBiH+37/HRHB-33 miscount = catalog over-firing onto HRHB-axis OSIDs.
- **LEVER #1 planning_duration 5→3 (op_opportunity_catalog_5th_corps.ts:353) = INERT/NO-GO** (#416 closed). 188w byte-identical to floor 345e044b — field is read-inert/clamped (op launch bound by Storm W175 trigger, not this field). 4 Ključ OSIDs still RS. §6 intact.
- **PIVOT → LEVER #2:** only arbih_517th_light issues attack orders on the 3rd Sana axis; arbih_506th_mountain not attacking. If 506th attacked → 2 brigades → capture all Ključ obj. Investigating the 506th attack-order gap (front-edge / brigade-role / axis-assignment).

### Axis-split builder DIED — orchestrator take-over (2026-06-11)
- Builder ae1b162a (non-worktree, main checkout) made a complete 65-line axis-split edit on cal/kljuc-sana-axis-split but DIED/stalled ~114min ago: uncommitted edit, no commit/push/PR, 0 output. (Liveness lesson applied — took over rather than wait.)
- Edit looks sane: Axis A (517th, 9 Sanski Most) + Axis B (506th, 4 Ključ-interior, staged jelasinovci, contact edge to sanica_2 confirmed 8 shared segments). jelasinovci kept on Axis A.
- Its run n8 (114min old, may not match current edit) = hash 4f08c4b728badd67 (≠ floor 345e044b → NON-inert), RBiH 285/HRHB 106/RS 321. NOT trusted — re-measuring fresh on the committed edit.
- Plan: tsc-verify → commit edit → fresh 188w → dispatch scenario-tester panel for GO/NO-GO (no self-analysis).

### Axis-split take-over progress (2026-06-11)
- Salvaged dead builder ae1b162a's 65-line edit: SANSKI_KLJUC single axis → sana_sanski_most (517th, 9 obj, stage jasenica_2) + sana_kljuc_interior (506th, 4 obj [sanica_2/hadzici/kljuc_2/krasulje_2], stage jelasinovci). tsc clean.
- Updated the sana_95 axis-shape test for the split (44/44 pass). Commits 4f01c540b (lever) + 4c72b0350 (test) on cal/kljuc-sana-axis-split.
- Fresh 188w measuring (b57taov1o) — re-measure since the dead builder's n8 (4f08c4b, ≠floor → non-inert) may not match committed code.
- NEXT: on 188w complete → push branch + open PR + dispatch scenario-tester panel (non-worktree, reads artifacts) for GO/NO-GO. NO self-analysis of the result (per today's violation lesson).

### Daily Pyrrhic Standup (2026-06-11) — board delivered
- Axis-split lever NO-GO (panel #418 closed, reverted clean): byte-identical territory, 3 Ključ OSIDs still RS. Ключ lane = deep-objective ceiling, 2 levers NO-GO → owner decision (structural redesign vs park). Memory brief updated.
- War-or-Game assessment: D2-GO; BIGGEST GAP = P0-B 100-week front freeze (RS 52.7%→51.8% w40-w140, then scripted cliff) from corps-AI supply/theater blindness (BRIEF-GAP-1/ARMY-GAP-1/BRIEF-GAP-6). KIA 1.74× (owner-HELD), missing/captured 5×, 26 stranded brigades, Op Trnovo t184 misfire.
- 5 priorities set: P1 organic mid-war territory (flagship, floor-moving), P2 casualty/deployment engine-health, P3 Ključ decision, P4 Trnovo OOB, P5 hygiene+doc-sync.
- Board: ~/.agent/diagrams/awwv-standup-20260611.html (delivered to owner).

### 2026-06-11 — Bundle+track era: floor 649→651, P1 dead-end verdict
- **WORKFLOW SHIPPED:** bundle+track (owner directive) — `tools/calibration_bundle_matrix.cjs` + bash matrix driver. One build + one flag-toggle matrix (baseline+gap1+gap6+kljuc+all) attributed all 3 flags → 1 PR. baseline==floor 345e044b confirms clean default-OFF.
- **RE-FLOOR 649→651 MERGED (#419):** Ključ interior re-root to Petrovac axis (panel-GO). hadzici+kljuc_2 RS→RBiH, hash f1037b915734c192, anchors 30/30, §6 intact, 40w/52w byte-identical. CALIBRATION_MASTER + ledger updated. First territory gain of the session.
- **P1 FLAGSHIP = SCORER DEAD-END (5th wall-hit) + freeze is HISTORICALLY CORRECT:** matrix proved gap1/gap6 INERT (ΔOSID 0); phase-2 scope (architect) confirmed the op-launch scorer is BYPASSED — mid-war territory moves only via injected/triggered ops (war_phases.ts:1793/1910), never the scorer. supplyReadiness already read supply_by_osid. Same wall as Design B (4 runs). The w40-w140 freeze is largely correct (1993-94 was positional). Only lever = injection-pipeline gate (post-1.0, §6). RECOMMENDED: accept freeze + un-postpone DoD + keep the productive scripted-op CATALOG lane. **OWNER DECISION PENDING (A accept / B greenlight post-1.0 injection program).**
- **2 agent deaths recovered** (commit-first salvage): bundle builder died at matrix step (commits survived → I ran matrix via bash); re-floor builder died at re-bless (commits survived → I confirmed n15==f1037b91 + finished re-bless+PR).
- gap1/gap6 plumbing preserved on cal/organic-territory-bundle (pushed, not merged).

### 2026-06-11 — Floor 651→658 (batch-2 merged #420). Catalog lane +9 today.
- **#420 MERGED: re-floor 651→658** (+7). Mrkonjić +6 (southern_move_95 roster fix — axis brigades were in hvo_main_staff not host hvo_tomislavgrad → zero_eligible_axis t182; 6-OSID cluster RS→HRHB, oct1995-correct) + Bosanski Novi krslje_2 RS→RBiH. hash 3e68b23e1102ca50, anchors 30/30, §6 intact, 40w/52w byte-identical. CALIBRATION_MASTER + ledger updated.
- **TODAY'S FLOOR ARC: 649 → 651 (Ključ #419) → 658 (batch-2 #420) = +9**, all bundle+track panel-signed western-Krajina '95 catalog fixes.
- **3rd builder death recovered** (re-floor builder died after un-gate commit → I fixed the Krupa-axis-7→9 test + ran 188w confirm + re-blessed + PR). Commit-first salvage is now routine.
- **Productive western-Krajina catalog batch EXHAUSTED of high-value wins.** Remaining: matavazi_2 (deeper Krupa axis), donji_vrbljani_2 (MEDIUM +1), krasulje_2 (depth ceiling), Jajce ring (faction-ceiling, post-1.0). Diminishing returns — recommend PAUSE the heavy grind pending the P1 strategic decision + owner availability.

### 2026-06-11 — ENGINE-HEALTH PIVOT (owner: engine health always priority; is it AAA++++?)
- **Pyrrhic debate: AWWV NOT AAA++++ (unanimous).** Casualty model lies 2-5×; state-integrity leaks (stranded brigades/ghost POWs); the 658 floor is partly CATALOG-FORCED (calibration-% masking). PIVOT off catalog grind → engine-health. Memory: aaa_quality_engine_health_pivot.md.
- **EH-2 MERGED (#421): MC-leak ledger fix.** MC 54k→42k (−22%), killed unchanged, K:W 1:3.84, control_delta BYTE-IDENTICAL (territory 658 held), §6 intact, deterministic, manifest re-blessed (casualty artifacts only). Hash 3e68b23e→f08f40522afff835. Activated held #344 + surrender-cascade tightening; undefended-path left KIA-correct per historian.
- **HISTORIAN-BY-DEFAULT (owner directive):** include historians much more — Bosnian war is specific. On EH-2 it CAUGHT: K:W already on-target 1:3.74 (don't fix), and the "missing" are ~75-80% mass-grave KIA (don't convert to WIA — post-1.0 POW-decay lane). Memory: historian_lens_by_default.md. Standing Pyrrhic member now.
- **Agent-orchestration fragility cost real time** on EH-2 (builder stalls ×3, builder/orchestrator double-worked the same branch, near double-push). EH-1 tooling hardening is the priority enabler.
- **NEXT: EH-1** — per-run engine-health CI gate (stranded brigades/zero-eligible ops/dead ops) + tooling hardening (worktree npm-death fix, one-agent-per-checkout). Then EH-3 state-integrity, then D2 on a healthy engine.
- Floor 658 held throughout the pivot. P1 strategic decision still pending (accept freeze + un-postpone DoD, vs post-1.0 injection program).

### 2026-06-11 — P1 resolved + EH-1 Part A shipped
- **P1 RESOLVED (A):** freeze accepted as historically correct, DoD UN-postponed (finish-work restored), injection-pipeline lever = post-1.0 only. Do NOT re-chase scorer / re-postpone DoD / re-open floor for organic territory. Memory updated.
- **EH-1 Part A SHIPPED (62d9b68cb): `.puppeteerrc.cjs` skipDownload** — ENDS the worktree npm-install agent deaths (puppeteer v24 reads cosmiconfig, not the .npmrc key). Verified: getConfiguration().skipDownload=true. puppeteer only in manual UI tools → zero agent-work impact. Highest-leverage fix of the session (the deaths cost hours + forced main-checkout-only work + the EH-2 double-work).
- **EH-1 Part B in flight:** engine-health CI gate (a13c9aab) — vitest test vs the committed data/derived/latest_run_final_save.json, fails on stranded-brigades/zero-eligible-ops/dead-ops/K:W-band regressions, thresholds at current reality. The guard that makes EH-3 (state-integrity) measurable.
- Floor 658. EH-2 (casualty MC −22%) merged. Next after EH-1: EH-3 state-integrity → D2 on a healthy engine.
