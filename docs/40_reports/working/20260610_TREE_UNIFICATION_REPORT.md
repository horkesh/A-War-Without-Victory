# Tree Unification Report — 2026-06-10

Repository hygiene pass: worktree/branch sprawl unification. Follows the 2026-06-09 safe pass (71→26 worktrees).
All hard safety rules honored: no dirty worktree removed, no stash touched, every deleted branch SHA verified recoverable from origin (`git branch -r --contains` or `merge-base --is-ancestor origin/main`), main checkout untouched, junction-safe removal procedure used throughout.

## Before / After

| Metric | Before | After | Delta |
|---|---|---|---|
| Worktrees (incl. main) | 43 | 30 | **−17 removed** (+4 NEW live agent worktrees spawned mid-cleanup) |
| Local branches | 135 | 67 | **−74 deleted** (+6 new live branches appeared mid-cleanup) |
| Stashes | 17 | 17 | 0 (report-only, per rules) |

Mid-cleanup churn: while this pass ran, live agents created 4 new worktrees (`agent-a08369c08417a1490`, `agent-a6b850ac2a678340b`, `agent-ace4c2222c3c45e30` — all locked, at main HEAD — and `plan-art-wiring` on `feat/art-plan-wiring`) and 6 new branches. These are ACTIVE and were not touched. This is exactly why a standing policy is needed (see bottom).

## Worktrees REMOVED (17, all verified clean + quiet ≥2h + SHA on origin)

Junction-safe procedure: `cmd /c rmdir "<wt>\node_modules"` on the 7 worktrees that had a node_modules junction (link removed, target untouched; main `node_modules` verified intact — 708 packages), then non-forced `git worktree remove`.

| Worktree | Branch | Class | Why removable |
|---|---|---|---|
| .claude/worktrees/agent-a0cf5db6cf139095b | worktree-agent-a0cf5db6cf139095b | (a) merged | PR #370 merged; branch on origin |
| .claude/worktrees/agent-a210a468ed3c4f307 | worktree-agent-a210a468ed3c4f307 | (a) merged | PR #373 merged; branch on origin |
| .claude/worktrees/agent-a2eaa5c06863112bc | docs/enclave-decision-branch-art | (a) merged | PR #376 merged |
| .claude/worktrees/agent-a49be3df438833924 | (detached f88b8ada5) | (d) transient | SHA on origin (retune/pr1-pathA et al.); junction removed first |
| .claude/worktrees/agent-a535b9cece73e9d3f | worktree-agent-a535b9cece73e9d3f | (a) merged | PR #372 merged |
| .claude/worktrees/agent-a5863b135de5687d5 | worktree-agent-a5863b135de5687d5 | (a) merged | PR #371 merged |
| .claude/worktrees/agent-a72d1344517da819d | feat/collapse-phase3-enable-188w | (c) held branch | Worktree clean; **branch KEPT** (#379 closed-preserved); junction removed first |
| .claude/worktrees/agent-a86c0642047535da8 | docs/collapse-s6-historian-gate-packet | (a) merged | PR #368 merged |
| .claude/worktrees/agent-a89a8ec9818c470cd | worktree-agent-a89a8ec9818c470cd | (a) merged | PR #369 merged; junction removed first |
| .claude/worktrees/agent-aa83dafa4c9712d5a | worktree-agent-aa83dafa4c9712d5a | (a) merged | PR #377 merged |
| .claude/worktrees/agent-aafc50791d250c42a | worktree-agent-aafc50791d250c42a | (a) merged | PR #295 content; SHA is ancestor of origin/main; was LOCKED — unlocked first |
| .claude/worktrees/agent-ac5855123ad0d06a0 | feat/wire-verdict-tutorial-art-resolvers | (a) merged | PR #380 merged |
| .claude/worktrees/agent-ad271ff82db760530 | feat/collapse-phase4a-first-fire | (a) merged | PR #381 merged (current main HEAD); junction removed first |
| F:/awwv-b1-casualty | feat/b1-casualty-realism | (b) open PR | Worktree clean; **branch KEPT** (open PR #344); junction removed first |
| F:/awwv-collapse-phase1 | feat/collapse-phase1-disabled | (a) merged | PR #375 merged; junction removed first |
| F:/awwv-lane3b | feat/lane3-b-lever-a-zvornik-pin | (c) held branch | Worktree clean; **branch KEPT** (owner-shelved Lane-3 (b) candidate); junction removed first |
| F:/awwv-worktrees/docs-sync | docs/sync-current-state-20260609 | (a) merged | PR #367 merged |

## Branches DELETED (74, every SHA verified recoverable from origin)

**Class (a) — squash-merged PR heads, remote branch still exists (65):**
chore/codex-refinement-sweep (#314), chore/command-card-address-decorate-art (#311), chore/phase0-byte-identical-cleanup (#306), chore/retire-adr0007-phase-c (#323), chore/version-0.9.9-beta (#352), ci/c1-skip-shim (#346), ci/pathfilter-prereq-checks (#351), ci/sf-integrity-followup (#356), ci/skip-logic-integrity (#354), claude/canon-forawwv-promotions (#268), claude/dayton-build-p1-3 (#277), claude/dayton-institutional-expansion-p1 (#290), codex/command-route-cohesion-20260606 (#244), docs/beta-gate-sweep-20260609 (#350), docs/board-reconcile-20260608 (#318), docs/collapse-s6-historian-gate-packet (#368), docs/enclave-decision-branch-art (#376), docs/full-sync-20260608b (#332), docs/reconcile-board-roadmap-20260607 (#291), docs/session-artifacts-20260609 (#359), docs/session-artifacts-rescue-20260609 (#363), docs/sync-current-state-20260609 (#367), feat/a2-dayton-endgame-close (#342), feat/a3-codex-coverage (#348), feat/a4-deck-auto-mount (#347), feat/a4-onboarding-thesis (#345), feat/activate-pdp-ea5-combined (#325), feat/art-event-illustration-pipeline (#362), feat/codex-a1c-response-morphing (#334), feat/codex-tiers-dependency-graph (#328), feat/collapse-phase1-disabled (#375), feat/collapse-phase4a-first-fire (#381), feat/contain-lane-a-arbih (#341), feat/dayton-endgame-verify (#331), feat/decision-room-full-convergence (#326), feat/displacement-tracking (#360), feat/event-trigger-predicates (#321), feat/freewar-phase1b-consume-signals (#335), feat/vrs-contain-posture (#339), feat/wire-verdict-tutorial-art-resolvers (#380), fix/codex-334-sensitive-inventory-coverage (#338), fix/codex-54-force-launch-cost-preview (#349), fix/codex-followups-303-304 (#309), fix/codex-p2-batch-59-65-86 (#361), fix/command-card-routing-batch-a (#296), fix/command-friction-stakes-preview (#319), fix/dayton-331-review-followups (#336), fix/dayton-close-out-normalization (#355), fix/force-launch-patron-cost (#327), fix/i18n-bcs-diacritic-typos-lqa (#301), fix/review-backlog-batch-d-event-data (#299), harmonize/art-prompt-pack-20260609 (#366), worktree-agent-a0cf5db6cf139095b (#370), worktree-agent-a210a468ed3c4f307 (#373), worktree-agent-a35791a925e031468 (#282), worktree-agent-a50443948c879a198 (#287), worktree-agent-a535b9cece73e9d3f (#372), worktree-agent-a5863b135de5687d5 (#371), worktree-agent-a89a8ec9818c470cd (#369), worktree-agent-a8d8725e30a3cf88b (#293), worktree-agent-aa83dafa4c9712d5a (#377), worktree-agent-ac4fe6fbc5428b4fb (#295), worktree-agent-ae2ff377631c4798a (#286), worktree-agent-af124aede7b851903 (#281), worktree-agent-af5e92da8add06340 (#288)

**Class (d) — stale orphan auto-branches, worktree gone, SHA reachable from origin (9):**
worktree-agent-a2eaa5c06863112bc, worktree-agent-a4f9a34dc7a6f7a09, worktree-agent-a72d1344517da819d, worktree-agent-a80c0a0e0e3c6c964, worktree-agent-a86c0642047535da8, worktree-agent-a9ff7c539173b47a3, worktree-agent-aafc50791d250c42a, worktree-agent-ac5855123ad0d06a0, worktree-agent-ad271ff82db760530

## Surviving worktrees (29 non-main) — WHY each survives + unblock condition

### Preserve set (live/PR — do not touch)
| Worktree | Branch | Why | Unblock |
|---|---|---|---|
| agent-ade8e6738960ce1db | feat/collapse-phase4b-d1-osid-exposure | LIVE D1 agent | D1 PR merged + agent done |
| agent-ad8dd3a2d4d0a640c | content/bcs-atrocity-essays-omarska-visegrad | LIVE respin (PR #374); commit moved during this pass | #374 merged |
| agent-aed8e5cc7ee491ae8 | chore/extract-379-collapse-verifier-report | PR #382 still OPEN at audit time | #382 merges → clean worktree removable |
| agent-ade30920a9d65f359 | fix/standing-og-reserve-attrition | Open PR #329; dirty (working doc) | #329 merged + discard SARAJEVO_CONSTANT_INVENTORY.md mod |
| agent-a08369c08417a1490, agent-a6b850ac2a678340b, agent-ace4c2222c3c45e30 | (auto, locked, at main HEAD) | NEW — spawned during this pass | agent completes |
| plan-art-wiring | feat/art-plan-wiring | NEW — spawned during this pass | agent completes |

### Dirty — preserved by hard rule (uncommitted changes)
| Worktree | Branch | Dirt | Unblock removal |
|---|---|---|---|
| agent-a05a0d53bfa8ada7b | bisect/pr1-pr3 | BISECT_CHECKPOINT.md + run save | Owner confirms bisect dead → discard WIP; branch NOT on origin |
| agent-a19b0d8b1d1601498 | feat/activate-ea5-launch-halt | working doc mod | Discard 1-file doc mod (branch pushed) |
| agent-a34a550fe59fc7760 | measure/pr1-solo | _MEASURE_NOTES.md | Confirm measurement archived → discard note |
| agent-a34d504ecd2c6f7d6 | feat/freewar-military-signals (merged #330) | 4 untracked scratch files (PR_BODY.md etc.) | Delete scratch → remove worktree + branch |
| agent-a474bbfd0e3ee2b05 | worktree-agent-a474bbfd0e3ee2b05 | 5 modified src/test files (real WIP, unknown owner) | Owner triage: commit or discard |
| agent-a613502963343898a | worktree-agent-a613502963343898a | 3 untracked dayton-shot UI files | Owner triage |
| agent-aa1bd20beb42cc3c4 | feat/intel-ambush-retune | intel_ambush_depth.ts modified (real WIP) | Owner triage: retune lane still wanted? |
| agent-ab58ee9b9e03febbf | worktree-agent-ab58ee9b9e03febbf | apply_effects/serialize mods + 3 new tests (looks like in-flight robustness work) | Likely live — leave alone |
| agent-ac27af2f143135be3 | feat/command-friction-stopop-zagreb (merged #313) | run-save artifact only | Discard latest_run_final_save.json → removable |
| agent-ac999cdd1dab9d94b | measure/activation-sweep | war_1995.json mod + scripts | Measurement complete → discard |
| agent-aebc3f034722e692e | feat/activate-pdp | 13 files (PDP gate WIP — held program) | Owner decision on PDP guarded channels |
| freewar-signal-correctness | fix/freewar-signal-correctness (merged #340) | working doc mod | Discard 1-file doc mod → removable |
| lane3-run1 | lane3-run1-battle-lethality | combat_math.ts mod | Lane-3 closed-by-hold: discard after owner confirms |
| lane3-run4-leverA | lane3-run4-leverA | combat_math.ts + proposal doc + run save | Same — proposal doc may be worth rescuing first |

### OUTSIDE canonical root (F:/awwv-*) — the remaining location sprawl (7, ALL dirty → cannot move/remove)
| Worktree | Branch | Dirt | Disposition |
|---|---|---|---|
| F:/awwv-ci-c1 | ci/c1-full-vitest-structural-fingerprint (merged #343) | 1 working-doc mod | Discard 1 file → worktree AND branch removable. Easiest win. |
| F:/awwv-d1-lane3 | cal/d1-combat-realism-lane3 (pushed, HOLD) | 3 untracked lane3 tools | Lane-3 held: rescue tools or discard, then removable (branch stays) |
| F:/awwv-disp-diag | (detached, on-main SHA) | diagnosis doc + run save | Rescue proposals/20260609_DISPLACEMENT_TRACKING_DIAGNOSIS.md if wanted, then removable |
| F:/awwv-wt-baseline | (detached, on-main SHA) | 1 untracked tool script | Discard → removable |
| F:/awwv-wt-homedist | fix/home-distance-cache-nonfinite (merged #358) | combat_math.ts mod + run save | Owner triage of combat_math mod, then removable |
| F:/awwv-wt-lane3run2 | lane3-run2-bombardment | frontline_attrition.ts mod + script | Lane-3 held: discard after owner confirms |
| F:/awwv-wt-lane3run3 | lane3-run3-shape-trim | frontline_attrition.ts mod + proposal doc | Rescue proposal doc if wanted, then removable |

Do NOT `git worktree move` any of these while dirty; once each is cleaned, prefer remove (content recoverable from origin) over move.

## Surviving branches (67) — classification

- **main** (1)
- **Open PR (4):** chore/extract-379-collapse-verifier-report (#382), content/bcs-atrocity-essays-omarska-visegrad (#374), feat/b1-casualty-realism (#344), fix/standing-og-reserve-attrition (#329)
- **Held/preserved (16):** feat/collapse-phase3-enable-188w (#379-preserved), feat/lane3-b-lever-a-zvornik-pin, feat/lane3-b-final (owner-shelved), feat/collapse-phase4b-d1-osid-exposure (D1), feat/eb1-corps-coherence-v2 (PARKED), feat/pdp-activate-patron-credibility, feat/pdp-activation-guards, feat/pr1-casualty-model-adr0007-phaseb (PR-1/PR-4 parked), feat/activate-pdp, feat/activate-ea5-launch-halt, feat/intel-ambush-retune, docs/canon-adr0007-phasec-unblock, docs/preserve-session-artifacts-20260609 (backup), retune/pr1-pathA, integration/calib-cluster-20260608, cal/d1-combat-realism-lane3 (HOLD)
- **Merged but checked out in dirty worktrees (5)** — deletable once worktree cleaned: ci/c1-full-vitest-structural-fingerprint, feat/command-friction-stopop-zagreb, feat/freewar-military-signals, fix/freewar-signal-correctness, fix/home-distance-cache-nonfinite
- **New live (6):** docs/collapse-ivb-governance-docs-20260610, feat/art-plan-stills-no-map-route, feat/art-plan-wiring, worktree-agent-a08369c08417a1490, worktree-agent-a6b850ac2a678340b, worktree-agent-ace4c2222c3c45e30
- **Transient, NOT recoverable from origin — kept per safety rule, candidates for owner-approved force-delete (24):** bisect/pr1-pr3, confirm/pr3-solo, measure/pr1-solo, pr3-enclave-followup, ship/pr3 (PR #312 merged but local SHA unreachable — remote deleted), and 19 orphan `worktree-agent-*` whose SHAs exist nowhere on origin (their content was squash-merged under different head names): a0df57de196a59b32, a13781b5a9211acb2, a2f97bced5e6bbc7b, a4970944fa1c9b3ec, a5740b42f4836ab69, a654f8784b2833fd9, a69973eaea30117bf, a6af4b0f6aed4446b, a87b4dc3fb57dbb40, a8c39b601ba317d83, a932f88bae7e51173, aa94dbe633895c913, abf870a82c1c791c6, acc29f06f801ea423, ace9b0136e46d3690, ad1bd6c90e0493509, add0c793603709e32, add715c66ab3d0427, ae5a9492602bb1136. These hold pre-squash commit history only; the merged content is on main. Owner may bulk `-D` these in one approved pass.
- **Checked out in surviving worktrees / measurement (11):** lane3-run1..4, measure/activation-sweep, worktree-agent-a474bbfd0e3ee2b05, worktree-agent-a613502963343898a, worktree-agent-ab58ee9b9e03febbf, worktree-agent-ad8dd3a2d4d0a640c, worktree-agent-ade8e6738960ce1db, worktree-agent-aed8e5cc7ee491ae8

## Stash triage (17 — REPORT ONLY, nothing dropped)

| Id | Branch context | Age | Content hint | Recommendation |
|---|---|---|---|---|
| stash@{0} | feat/art-event-illustration-pipeline | 16h | audit-docs-and-art WIP preserve | KEEP — fresh, likely active art lane |
| stash@{1} | main | 17h | pre-art-task-local | KEEP — fresh |
| stash@{2} | feat/a2-dayton-endgame-close | 25h | WIP strict-null pin (#71) | KEEP — A2 recently merged; verify content landed, then candidate-drop |
| stash@{3} | feat/eb1-corps-coherence | 2d | eb1-temp2 | KEEP — E-B1 PARKED, may resume |
| stash@{4} | codex/no-data-military-credibility | 5d | last-briefing validate WIP | Candidate-drop (lane merged #177 long ago) — owner confirm |
| stash@{5} | worktree-agent-aae9c5e98b245123b | 8d | BATCH-A restash "preserve; not mine" | KEEP — explicitly marked preserve |
| stash@{6} | worktree-agent-ad22f09c1e1e2fd64 | 8d | FOREIGN BatchD VerdictScreen leak | KEEP — explicitly marked preserve |
| stash@{7} | codex/roadmap-noncalibration-2026-05-22 | 11d | replay_save_sequence deletion + final_save mod | Candidate-drop after owner verifies nothing pending — has explicit recovery note |
| stash@{8} | main | 4w | front-edge strict-order worktree preserve | Candidate-drop — owner confirm lane dead |
| stash@{9} | main | 5w | pre-existing non-lane engine WIP | Candidate-drop — owner confirm |
| stash@{10} | main | 5w | lane-V094-pre-baseline | Candidate-drop — superseded baselines |
| stash@{11} | main | 5w | pre-bisect | Candidate-drop — bisect era closed |
| stash@{12} | main | 5w | WIP on reverted audits commit | Candidate-drop — base commit REVERTED |
| stash@{13} | main | 5w | a11y Lane A WIP | KEEP — v0.9.3 a11y may resume |
| stash@{14} | main | 5w | codex Wave 4 essays WIP | KEEP — codex content program active |
| stash@{15} | main | 5w | Wave 8 propagation WIP | Candidate-drop — owner confirm shipped |
| stash@{16} | main | 6w | 45 essay dynamic_sections + napkin v0.9 | KEEP — essay content possibly unshipped; verify before any drop |

## Incidental finding

Main checkout `node_modules/.bin` is EMPTY (since 2026-06-08, predates this pass — matches the known ".bin-shim artifact" note from C1). `node_modules` itself is intact (708 packages). `npm run` scripts resolve via npm's own path handling, but direct `node_modules/.bin/tsx` invocation (per CLAUDE.md) will fail until an `npm install`/rebuild restores shims. Flagging for owner.

## Recommended STANDING POLICY

1. **Single canonical worktree root:** `F:/A-War-Without-Victory/.claude/worktrees/` — nothing else. No new `F:/awwv-*` root-level worktrees; the 7 surviving ones are grandfathered until their WIP is triaged, then removed (not moved).
2. **Agent-must-clean-on-merge:** the agent (or the merging session) removes its worktree and deletes its branch immediately after its PR merges. A merged PR with a surviving worktree is a process defect.
3. **Junction discipline:** worktree node_modules is always a junction to the main checkout; removal is always `cmd /c rmdir "<wt>\node_modules"` then `git worktree remove` (non-forced). Never recursive-delete, never `--force` through dirt.
4. **Push-before-park:** any branch held >24h must be pushed to origin. Unpushed = undeletable under the recoverability rule = permanent sludge (see the 21 stranded transients above).
5. **Measurement worktrees are disposable by construction:** bisect/measure/confirm/lane3-run trees must keep ALL artifacts in committed (or origin-pushed) form, never as loose dirt — loose dirt is what blocked 14 removals in this pass.
6. **Periodic prune cadence:** weekly — `git fetch --prune`, `git worktree prune`, remove merged-PR worktrees/branches per rules above, stash triage report. Trigger also after any multi-agent burst.
7. **Stash hygiene:** stashes are not storage. Anything worth keeping >1 week gets a pushed branch; stash triage table reviewed at each prune.
