# WIP Worktree Triage — 2026-06-10

READ-ONLY triage of residual real-WIP worktrees. **No worktree was modified, removed, or committed.** Inspect-and-report only.

origin/main HEAD at inspection: `1ecdf6cfb` (fetched). Local main: `661715918`.

Classification key:
- **SUPERSEDED** — change already on origin/main (via merged PR) or obviously obsolete → safe to discard.
- **UNIQUE-VALUABLE** — real work not on main, worth recovering into a PR.
- **STALE-EXPERIMENT** — measurement/bisect scratch, no shippable code; the *finding* may be worth a note before discard.
- **STALE-BASE** — committed branch work whose base is far behind main; the giant negative diff is main's later merged work showing as deletions, NOT real deletions. Real code exists but needs rebase/extract to recover.

---

## Triage Table

| Worktree | Branch | Key files | Classification | Evidence | Recommendation |
|---|---|---|---|---|---|
| agent-ab58ee9b | worktree-agent-ab58ee9b | apply_effects.ts, serializeGameState.ts + 3 new tests | **SUPERSEDED** | origin/main #392 (`bbea18a15`) has the **fuller** version (`recordNonFiniteEffectAnomaly` + per-writer guards, 11 refs). Worktree working-tree has the **earlier/simpler** clamp-only version (0 refs to the anomaly recorder). `diff origin/main` shows main's richer impl as `-` lines. Its 3 tests cover the same #95 robustness already merged. | **DISCARD** |
| agent-a474bbfd | worktree-agent-a474bbfd | brigade_front_distribution.ts (+126), triggered_operations.ts, apr1992_188w.json + 2 tests | **MOSTLY SUPERSEDED** (1 unique bit) | Core garrison-pin (`pinGarrisonToMustHoldFrontEdge` + `must_hold_osids_by_corps: {vrs_drina:[op:zvornik:zvornik]}`) is **already on origin/main** (evolved 4-arg signature). Base `c124a87ba` is **116 commits behind** main. UNIQUE bit: removing `rs_1st_zvornik` from the kamenica triggered-op axis (main still has it). | **DISCARD worktree**; SAVE-NOTE the kamenica-axis `rs_1st_zvornik` removal rationale (ICTY Popović §247 — Zvornik garrison shouldn't drain south to op:srebrenica:osmace_2) as a calibration backlog item if not already captured. |
| agent-a613502963 | worktree-agent-a613502963 | dayton_shot.html/.tsx, tools/ui/dayton_modal_shots.cjs (all untracked) | **UNIQUE-VALUABLE (minor)** | Dev-only screenshot harness for `DaytonNegotiationModal` (PR #280) — mounts the modal in isolation with the PENDING packet for owner visual review. Self-describes "NOT shipped — dev-only." Not on main. | **SAVE or PR (low priority)** — small dev tool; useful for owner review of the Dayton surface. PR as a dev-tools-only commit, or discard if Dayton UI is already signed off. |
| agent-aebc3f03 | feat/activate-pdp | political_dimension_propagation_gate.ts (default-ON flip) + 6 tests, snapshot tool | **UNIQUE-VALUABLE but CALIBRATION-GATED** | Flips PDP to **default-ON** (unset env → ON, opt-out via `'0'/'false'`). 1 commit ahead. MEMORY warns PDP activation is a calibration-moving serial ON-vs-OFF lane ("don't flip a default"; global_only confirmed byte-identical no-op). Untracked `runs_ic/ runs_off/ runs_pm/ tmp_extract.cjs` = measurement scratch. | **NEEDS-DECISION** — real activation work but must go through the serial per-channel calibration gate, not a blind default-flip. Keep branch (it's committed) pending owner PDP-activation decision; discard the worktree's untracked run dirs. |
| agent-aa1bd20b | feat/intel-ambush-retune | intel_ambush_depth.ts (`INTEL_EXECUTION_AMBUSH_DEPTH_GAIN` 0.5→0.06) | **UNIQUE-VALUABLE (uncommitted)** | Retune is **UNCOMMITTED** (branch is 0 commits ahead; change is working-tree only). Self-documented: flag-ON 188w 0.5 over-bit to 617/712; **0.06 holds the 649 floor exactly (30/30, Zvornik RS, §6 fall) while still differing from flag-OFF**. Flag-OFF default unaffected. | **PR-WORTHY** — a measured, floor-safe constant retune behind the existing `AWWV_INTEL_AMBUSH_DEPTH` flag. Recover into a one-line PR (constant + comment). Verify the cited 649/30-30 result before merge. |
| agent-a34d504e | feat/freewar-military-signals | WORKNOTE + apr1992_188w_emergent.json + PR_BODY (all untracked); committed code on branch | **STALE-BASE** | Branch `2579a4a19` is 1 commit ahead but `diff origin/main` = **291 files / -19185 lines** = base far behind main (deletions are main's later work). WORKNOTE: emergent-gated bot_strategy priority multipliers (supply + campaign-plan + territory-trend); **40w historical byte-identical `235c61f4`** confirmed. | **SAVE-NOTE + needs rebase to recover** — the emergent-divergence feature is real and historical-safe, but the branch base is too stale to PR as-is. Capture WORKNOTE finding; re-implement on fresh main if Free-War Phase-1 is still wanted. |
| agent-ac999cdd | measure/activation-sweep | war_1995.json (`us_halts` turn_max 184→188) + extract_metrics.cjs, run_one.ps1 (untracked) | **SUPERSEDED / STALE-EXPERIMENT** | The exact `turn_max 184→188` edit for `us_halts_federation_advance_1995` is **already on main** (MEMORY: #325 E-A5 activation "turn_max 184→188" shipped). 0 commits ahead; working-tree edit duplicates merged work. Untracked files are measurement scratch. | **DISCARD** (edit already on main). |
| agent-a34a550f | measure/pr1-solo | _MEASURE_NOTES.md (untracked) | **STALE-EXPERIMENT (valuable finding)** | No shippable code — pure measurement. **Finding "INVERTS HYPOTHESIS"**: PR-1's −5 at 188w is dominated by **ARBiH over-capturing the Sarajevo inner siege ring** (18/22 regressions RS→RBiH), NOT RS over-hold. Ablation: reserve-commit HELPS (+10) — walk back the **attrition rates**, not reserve-commit. PR-1 cuts military killed −33% (102k→101k, real realism gain to preserve). | **SAVE-NOTE then DISCARD** — capture the inverted-hypothesis + attribution finding into the lane-3 / PR-1 calibration record before discarding. Worktree itself discardable. |
| agent-a05a0d53 | bisect/pr1-pr3 | BISECT_CHECKPOINT.md (untracked) + latest_run_final_save.json (regenerated) | **STALE-EXPERIMENT (valuable finding)** | No shippable code. **BISECT result**: PR-1+PR-3 (no PR-4) = 188w **630/712** (< 634 floor, −4), 30/30 anchors, Zvornik holds, Srebrenica+Žepa fall. scenario-tester NO-GO standalone; deficit is PR-1-driven not PR-4 knife-edge; recommend ship PR-3 solo. (Consistent with MEMORY's #312 PR-3-solo ship.) | **SAVE-NOTE then DISCARD** — finding already largely reflected in MEMORY/#312; capture the 630-hash bisect datum if not recorded. Worktree discardable. |

### Outside-root worktrees (F:/awwv-*)

| Worktree | Branch | Key files | Classification | Evidence | Recommendation |
|---|---|---|---|---|---|
| awwv-ci-c1 | ci/c1-full-vitest-structural-fingerprint | 3 commits (CI gate workflow) + SARAJEVO_CONSTANT_INVENTORY.md (M) | **UNIQUE-VALUABLE but likely SUPERSEDED** | 3 commits ahead of origin/main add a `full-vitest + structural-fingerprint` CI gate. MEMORY says "C1 full-suite/structural-fingerprint CI gate" **already shipped** as part of ALPHA-BAND-COMPLETE; main log search for "C1/structural-fingerprint" found no matching merge commit on origin/main, so the committed gate may not have landed under this branch. | **NEEDS-DECISION** — verify whether the CI gate on origin/main equals this branch; if main already has an equivalent gate → discard, else PR the workflow. The `.md` (M) edit is a shared inventory doc touched in many worktrees (ignore). |
| awwv-d1-lane3 | cal/d1-combat-realism-lane3 | _LANE3_R2_NOTE.md + tools/_lane3_*.cjs (untracked); committed tip 188 files | **STALE-BASE + STALE-EXPERIMENT** | Committed tip `7116c2c5d` base `60a1f3a9e` is **40 commits behind** main (−11386-line diff = main's later work). Note: lane-3 R2 base-attrition cut, HELD for owner re-floor. R0 baseline repro confirms **649/712, 30/30, killed 102,621**. | **SAVE-NOTE** (R2 lane-3 measurements) **+ discard worktree**; the committed branch is too stale to PR — re-do lane-3 on fresh main (the live lane-3 hold decision is already in MEMORY). |
| awwv-disp-diag | (detached) | 20260609_DISPLACEMENT_TRACKING_DIAGNOSIS.md (untracked) + regenerated final_save | **STALE-EXPERIMENT (valuable finding)** | Display-only diagnosis: settlement panel "now == pre-war" root cause = displacement_state seeded all-zero until ~turn 4–5 + permanent loss of per-OSID precision. No engine change proposed. (Note: same-named proposal doc was also deleted-from-main-view in lane3/freewar stale diffs — confirm canonical copy.) | **SAVE-NOTE** — preserve the diagnosis doc (UI/display bug, 1.0-relevant) if not already in `docs/40_reports/proposals/`. Worktree discardable. |
| awwv-wt-baseline | (detached @ origin/main) | tools/lane3run3_extract.cjs (untracked) | **STALE-EXPERIMENT** | Detached baseline-comparison worktree for lane-3 run3; only an extract script. No source changes. | **DISCARD** (scratch tooling). |
| awwv-wt-homedist | fix/home-distance-cache-nonfinite | combat_math.ts (M, uncommitted) + committed home_distance fix; regenerated final_save | **MIXED: committed fix UNIQUE-VALUABLE; uncommitted change STALE-EXPERIMENT** | Committed `a64559dbb` (1 ahead) = clamp non-finite `home_distance_cache` hops — a **genuine 1.0 robustness bug** (Infinity cached for graph-severed brigade → serializer crash on divergent/player games). NOT on main (1 commit ahead). The **uncommitted** combat_math edit (BASE_ATTACKER 0.08→0.06, BASE_DEFENDER 0.06→0.045) is an unrelated lane-3 attrition probe. | **PR the committed home-distance fix** (clean, valuable robustness fix). **Discard** the uncommitted combat_math attrition probe (belongs to lane-3, measure-only). |
| awwv-wt-lane3run2 | lane3-run2-bombardment | frontline_attrition.ts (M, +2/-1, uncommitted) + extract_metrics.cjs | **STALE-EXPERIMENT** | 0 commits ahead; tiny uncommitted bombardment-rate probe. Part of the lane-3 measurement series (held). | **DISCARD** (measure-only; lane-3 held per MEMORY). |
| awwv-wt-lane3run3 | lane3-run3-shape-trim | frontline_attrition.ts (M, uncommitted) + RUN3 proposal doc + extract.cjs | **STALE-EXPERIMENT (finding)** | 0 commits ahead. Proposal doc self-labels "MEASUREMENT ONLY, NO merge, NO re-floor." Per-phase attrition shaping + bombardment trim → 188w killed 99,149 (−3.4% vs 102,621 floor). | **SAVE-NOTE** (RUN3 measurement table for lane-3 record) **+ discard worktree**. |

---

## Counts

- **SUPERSEDED / safe-to-discard (evidence-backed):** 3 — agent-ab58ee9b, agent-ac999cdd, awwv-wt-baseline.
- **MOSTLY-SUPERSEDED (discard worktree, save 1 note):** 1 — agent-a474bbfd.
- **UNIQUE-VALUABLE → PR:** 2 clear — agent-aa1bd20b (intel-ambush retune, uncommitted), awwv-wt-homedist (committed home-distance fix). Plus 1 minor — agent-a613502963 (Dayton screenshot dev-tool).
- **NEEDS-DECISION (calibration/CI-gated):** 2 — agent-aebc3f03 (PDP default-ON), awwv-ci-c1 (CI gate; verify vs main).
- **STALE-BASE (real code, needs rebase to recover):** 2 — agent-a34d504e (freewar signals), awwv-d1-lane3 (lane-3 R2).
- **STALE-EXPERIMENT (save finding, then discard):** 4 — agent-a34a550f, agent-a05a0d53, awwv-disp-diag, awwv-wt-lane3run3. Plus awwv-wt-lane3run2 (no finding → discard).

---

## SAFE-TO-DISCARD list (evidence-backed, no recovery needed)

1. **agent-ab58ee9b** — non-finite guards already on main via #392 (`bbea18a15`), in a *fuller* form. Tests duplicated.
2. **agent-ac999cdd** — `us_halts` turn_max 184→188 already on main via #325.
3. **awwv-wt-baseline** — detached baseline scratch, only an extract script.
4. **awwv-wt-lane3run2** — uncommitted bombardment probe, lane-3 held, no finding doc.

## DISCARD after saving a one-line note

5. **agent-a474bbfd** — garrison-pin already on main; save only the kamenica `rs_1st_zvornik`-removal rationale.
6. **agent-a34a550f** — save the "INVERTS HYPOTHESIS" finding (Sarajevo siege-ring over-capture; walk back attrition not reserve-commit; −33% killed = real gain).
7. **agent-a05a0d53** — save the 630/712 PR-1+PR-3 bisect datum (largely in MEMORY already).
8. **awwv-disp-diag** — preserve DISPLACEMENT_TRACKING_DIAGNOSIS.md (UI display bug).
9. **awwv-wt-lane3run3** — save the RUN3 measurement table.
10. **awwv-d1-lane3** — save the lane-3 R2 note; branch too stale to PR.

## NEEDS-OWNER-DECISION (do not discard yet)

- **awwv-wt-homedist** — PR the committed home-distance non-finite fix (genuine 1.0 robustness bug, not on main). Discard the unrelated uncommitted attrition probe.
- **agent-aa1bd20b** — PR the intel-ambush 0.5→0.06 retune (floor-safe, behind existing flag; re-verify 649/30-30 first).
- **agent-aebc3f03** — PDP default-ON; route through serial per-channel calibration gate, not a blind flip.
- **awwv-ci-c1** — verify the CI gate vs what's on main; PR if main lacks an equivalent.
- **agent-a613502963** — Dayton screenshot dev-tool; PR as dev-tools-only or discard if Dayton UI signed off.
- **agent-a34d504e** — freewar emergent signals; real + historical-safe but stale base → rebase to recover, don't PR as-is.

---

## SALVAGE EXECUTION — verify-then-act (2026-06-10, origin/main `1ecdf6cfb`)

Re-verified every Part-1 candidate against current origin/main before acting:

- **agent-aa1bd20b [feat/intel-ambush-retune]** — CONFIRMED UNIQUE. `INTEL_EXECUTION_AMBUSH_DEPTH_GAIN` is still `0.5` on origin/main; retune to `0.06` is uncommitted working-tree only. Flag `AWWV_INTEL_AMBUSH_DEPTH` is default-OFF (gate returns `false` when env unset). The constant is read ONLY when the flag is ON, so flag-OFF is byte-identical **by construction**. → **RECOVERED**: re-applied on fresh branch off current main, PR opened.

- **agent-aebc3f03 [feat/activate-pdp]** — RECLASSIFIED **SUPERSEDED** (triage was wrong; this is NOT a unique-further-activation). The branch's two committed "unique" guards are ALREADY on origin/main: `INTL_STANDING_OPS_HESITATION_MIN_TURN = 100` (sector_offensive.ts:297) and `COHESION_CAUTION_BIAS_THRESHOLD = 15` (sector_offensive.ts:365). The branch base (`a5e7e4e3f`, #319) predates #325, so its working-tree edits actually REVERT the merged patron_confidence/military_credibility default-ON back to default-OFF — a regression, not new activation. → **DISCARD** (Part 2).

- **awwv-ci-c1 [ci/c1-full-vitest-structural-fingerprint]** — RECLASSIFIED **SUPERSEDED**. Every artifact (full-suite-and-fingerprint.yml, both fingerprint .cjs, structural_fingerprint.test.ts, structural_fingerprint_40w.json, the #C1 closeout report) is already on origin/main. origin/main's workflow is the FULLER version (task #76 2026-06-09 "ALWAYS-REPORT shim") that explicitly FIXES the path-filtered "required check never reports" gotcha this branch still has. → **DISCARD** (Part 2).

- **agent-a613502963** — CONFIRMED UNIQUE (minor). `dayton_shot.html/.tsx` + `tools/ui/dayton_modal_shots.cjs` not on origin/main; clean self-contained dev-only screenshot harness for DaytonNegotiationModal. → **RECOVERED**: committed + PR opened as a dev-tools chore.

### Final disposition (2026-06-10)

**PRs opened (recovered unique work):**
- **PR #404** `feat(combat): intel-ambush depth retune (flag-gated, default-off)` — recovers agent-aa1bd20b's 0.5→0.06 retune.
- **PR #405** `chore(dev-tools): Dayton negotiation modal screenshot harness` — recovers agent-a613502963's dev tool.

**Worktrees force-discarded (8) + branches deleted (7):**
1. agent-ab58ee9b (worktree-agent-ab58ee9b…) — #392 guards on main, 0 ahead.
2. agent-ac999cdd (measure/activation-sweep) — #325 us_halts, 0 ahead.
3. agent-a474bbfd (worktree-agent-a474bbfd…) — garrison-pin on main, 0 ahead; kamenica `rs_1st_zvornik` note already captured above.
4. agent-aebc3f03 (feat/activate-pdp) — RECLASSIFIED SUPERSEDED: its committed guards `INTL_STANDING_OPS_HESITATION_MIN_TURN=100` + `COHESION_CAUTION_BIAS_THRESHOLD=15` are already on origin/main; working-tree edits would REGRESS the merged default-ON.
5. awwv-ci-c1 (ci/c1-full-vitest-structural-fingerprint) — RECLASSIFIED SUPERSEDED: all artifacts on origin/main; main's workflow is the fuller task-#76 ALWAYS-REPORT version.
6. awwv-wt-homedist (fix/home-distance-cache-nonfinite) — committed fix is byte-identical to #358 (e6cfb131f) already on main.
7. awwv-wt-baseline (detached) — scratch.
8. awwv-wt-lane3run2 (lane3-run2-bombardment) — scratch; branch tip was #358, on main.

(awwv-wt-baseline was detached → no branch to delete; the other 7 branches deleted with -D, all work verified on origin.)

**PRESERVED (untouched):** exhaustion (agent-aa39eea3), collapse-phase4d, all art worktrees, bcs-atrocity, lane3-run1, lane3-run4-leverA, stale-base (freewar-military-signals, awwv-d1-lane3), findings worktrees (agent-a34a550f, agent-a05a0d53, awwv-disp-diag, awwv-wt-lane3run3), awwv-rebless-parent.

**Main node_modules intact** (711 dirs / 708 pkgs). Worktrees 26→19; local branches reduced by 7.
